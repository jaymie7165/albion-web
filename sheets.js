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
}

async function getRows(sheetName) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: `${sheetName}!A:Z`,
  });
  return res.data.values || [];
}

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

module.exports = { appendRow, getRows, getStockSummary, getRecentRows, getAccountingSummary, timestamp };
