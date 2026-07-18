// sheets.js
const { google } = require('googleapis');

let sheetsClient = null;

async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  let auth;
  if (process.env.GOOGLE_CREDENTIALS) {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } else {
    const path = require('path');
    auth = new google.auth.GoogleAuth({
      keyFile: path.resolve(process.env.GOOGLE_KEY_FILE || './google-credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  const authClient = await auth.getClient();
  sheetsClient = google.sheets({ version: 'v4', auth: authClient });
  return sheetsClient;
}

const SHEET_ID = () => process.env.GOOGLE_SHEET_ID;

function timestamp() {
  return new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' });
}

async function appendRow(sheetName, values) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID(),
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
  invalidateCache(sheetName);
}

// Zapíše VÍCE řádků jedním voláním API — na rozdíl od cyklu appendRow() je
// tohle jedna atomická operace (buď se zapíšou všechny řádky, nebo žádný),
// takže selhání uprostřed nemůže zanechat částečný zápis (viz bulk sklad).
async function appendRows(sheetName, rowsValues) {
  if (!rowsValues || !rowsValues.length) return;
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID(),
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rowsValues },
  });
  invalidateCache(sheetName);
}

// ── ZAPIS S NAVRÁCENÍM ČÍSLA ŘÁDKU ("Zpět" / undo poslední akce) ────────────
// appendRow() nevrací nic, co by šlo použít k dodatečnému smazání konkrétního
// řádku. Google Sheets API v odpovědi na append vrací "updatedRange" (např.
// "Zbraně!A15:G15"), ze kterého se dá vyparsovat přesné číslo řádku — to si
// server.js uloží jako "poslední akce daného člena" a použije v /api/sklad/undo.
async function appendRowTracked(sheetName, values) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID(),
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
  invalidateCache(sheetName);
  let rowIndex = null;
  const range = res.data && res.data.updates && res.data.updates.updatedRange;
  if (range) {
    const m = range.match(/![A-Za-z]+(\d+):/);
    if (m) rowIndex = parseInt(m[1], 10);
  }
  return { rowIndex };
}

// Mapa "název listu -> interní číselné sheetId" — potřebná pro mazání řádků
// (batchUpdate/deleteDimension pracuje s číselným ID listu, ne s názvem).
// Krátce cachovaná v paměti, ať se u každého undo netahá znovu z API.
let sheetIdCacheMap = null;
let sheetIdCacheAt = 0;
const SHEET_ID_CACHE_TTL_MS = 10 * 60 * 1000;

async function getSheetIdMap(force) {
  if (!force && sheetIdCacheMap && (Date.now() - sheetIdCacheAt) < SHEET_ID_CACHE_TTL_MS) return sheetIdCacheMap;
  const sheets = await getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID(), fields: 'sheets.properties' });
  const map = {};
  (meta.data.sheets || []).forEach(s => { map[s.properties.title] = s.properties.sheetId; });
  sheetIdCacheMap = map;
  sheetIdCacheAt = Date.now();
  return map;
}

// Smaže konkrétní řádek (1-indexováno, jak ho vrací appendRowTracked) z daného
// listu. Používá se výhradně pro "Vrátit poslední zápis zpět" — proto se
// vždy maže jen řádek, který appendRowTracked právě vytvořil.
async function deleteRow(sheetName, rowIndex) {
  if (!rowIndex) return false;
  let idMap = await getSheetIdMap();
  let sheetId = idMap[sheetName];
  if (sheetId == null) {
    idMap = await getSheetIdMap(true); // list se mohl mezitím přejmenovat/přidat — zkusit čerstvě
    sheetId = idMap[sheetName];
  }
  if (sheetId == null) return false;
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID(),
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex },
        },
      }],
    },
  });
  invalidateCache(sheetName);
  return true;
}

// ── CACHE ────────────────────────────────────────────────────────────────────
// Sklad/finance stránky (Blackbook, Statistiky, Audit, Profit centrum) dřív
// při KAŽDÉM načtení tahaly celé listy znovu ze Sheets API. S krátkým TTL
// cache se opakované požadavky v rychlém sledu (víc lidí online, refresh
// stránky) obslouží z paměti — a proaktivní "prewarm" níže zajišťuje, že
// první request po nečinnosti nikdy nečeká na živé Sheets volání.
const CACHE_TTL_MS = 20000;
const rowsCache = new Map(); // sheetName -> { data, ts }

function invalidateCache(sheetName) {
  rowsCache.delete(sheetName);
}

async function getRows(sheetName, opts = {}) {
  const cached = rowsCache.get(sheetName);
  if (!opts.noCache && cached && (Date.now() - cached.ts) < CACHE_TTL_MS) return cached.data;
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: `${sheetName}!A:Z`,
  });
  const data = res.data.values || [];
  rowsCache.set(sheetName, { data, ts: Date.now() });
  return data;
}

// Pravidelně na pozadí obnoví cache nejpoužívanějších listů, ať i "studený"
// request po delší nečinnosti serveru dostane data okamžitě z cache.
const PREWARM_SHEETS = ['Zbraně', 'Weed', 'Drogy', 'Chemky', 'Účetnictví'];
function startPrewarm() {
  setInterval(() => {
    PREWARM_SHEETS.forEach(name => { getRows(name, { noCache: true }).catch(() => {}); });
  }, CACHE_TTL_MS);
}
startPrewarm();

async function getStockSummary(sheetName) {
  const rows = await getRows(sheetName);
  if (!rows || rows.length < 2) return {};
  const summary = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const typ  = (row[1] || '').toUpperCase();
    const item = row[2] || '';
    const qty  = parseInt(row[3]) || 0;
    if (!item) continue;
    if (!summary[item]) summary[item] = 0;
    if (typ === 'VKLAD') summary[item] += qty;
    else if (typ === 'VÝBĚR') summary[item] -= qty;
  }
  return summary;
}

async function getRecentRows(sheetName, count = 10) {
  const rows = await getRows(sheetName);
  if (!rows || rows.length < 2) return [];
  return rows.slice(1).slice(-count).reverse();
}

async function getAccountingSummary() {
  const rows = await getRows('Účetnictví');
  if (!rows || rows.length < 2) return { usd: 0, pesos: 0 };
  let usd = 0, pesos = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const typ    = (row[1] || '').toUpperCase();
    const castka = parseFloat((row[2] || '0').replace(',', '.')) || 0;
    const valuta = (row[3] || '').toUpperCase();
    const sign = typ === 'PŘÍJEM' ? 1 : -1;
    if (valuta === 'USD')   usd   += sign * castka;
    if (valuta === 'PESOS') pesos += sign * castka;
  }
  return { usd, pesos };
}

module.exports = {
  appendRow, appendRows, appendRowTracked, deleteRow, getSheetIdMap,
  getRows, getStockSummary, getRecentRows, getAccountingSummary, timestamp,
};
