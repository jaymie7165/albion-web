// server.js — Albion Web Dashboard v2
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt  = require('bcryptjs');
const axios   = require('axios');
const path    = require('path');
const fs      = require('fs');

const db      = require('./db');
const sheets  = require('./sheets');

const discord = require('./discord');
const { requireAuth } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || process.env.WEB_PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
// Logo is served from public/logo.png via express.static above
app.use(session({
  secret: process.env.SESSION_SECRET || 'albion_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

const CONFIG = {
  zbrane: ["Pump Shotgun","Pistol MK2","Pistol","Combat Pistol","Double Action Revolver","Navy Revolver","Vintage Pistol","Gusenberg","Dlouhé"],
  naboje: ["9mm","9mm Mk2",".75cal",".50cal","12-gauge"],
  akce:   ["Malá C4","Velká C4","Přístupová karta","Pokročilá zvláštní karta","EMP zařízení","Řezací laser","Cable Cutter","Zvláštní karta"],
  weedOdrudy: ["Žlutý kanabis","Zelený kanabis","Kanabis","Červený kanabis","Modrý kanabis"],
  weedCeny: {
    "Žlutý kanabis":  { vyroba: 100, prodej: 150 },
    "Zelený kanabis": { vyroba: 100, prodej: 150 },
    "Kanabis":        { vyroba: 100, prodej: 150 },
    "Červený kanabis":{ vyroba: 100, prodej: 150 },
    "Modrý kanabis":  { vyroba: 100, prodej: 150 },
  },
  drogyTypy: ["Kapky","Kokain","Extáze","Metamfetamin","Benzo","Joyka","Heroin","Speed","LSD"],
  chemkyTypy: ["Aceton","Peroxid vodíku","Kofein","Propylenglykol","Toluen","Benzín","Bismut","Kyselina fosforečná"],
  drogyCeny: {
    "Kapky":       { prodej: 200 },
    "Kokain":      { prodej: 500 },
    "Extáze":      { prodej: 350 },
    "Metamfetamin":{ prodej: 450 },
    "Benzo":       { prodej: 300 },
    "Joyka":       { prodej: 250 },
    "Heroin":      { prodej: 600 },
    "Speed":       { prodej: 280 },
    "LSD":         { prodej: 400 },
  },
  zbraneCeny: {
    "Pump Shotgun":           { prodej: 8000 },
    "Pistol MK2":             { prodej: 12000 },
    "Pistol":                 { prodej: 5000 },
    "Combat Pistol":          { prodej: 7000 },
    "Double Action Revolver": { prodej: 15000 },
    "Navy Revolver":          { prodej: 14000 },
    "Vintage Pistol":         { prodej: 6000 },
    "Gusenberg":              { prodej: 18000 },
    "Dlouhé":                 { prodej: 25000 },
    "9mm":                    { prodej: 100 },
    "9mm Mk2":                { prodej: 150 },
    ".75cal":                 { prodej: 300 },
    ".50cal":                 { prodej: 250 },
    "12-gauge":               { prodej: 200 },
  },
};

// ── WEED SÁZENÍ — recept a ceny na jednu kytku ────────────────────────────────
// Každá položka: kolik kusů je potřeba na 1 kytku a kolik to celkem stojí.
const WEED_PLANT = {
  // qty = počet kusů na 1 kytku, unit = cena za 1 kus
  items: [
    { key: 'seed',            name: 'Seed',             qty: 1, unit: 50 },
    { key: 'hnojivo',         name: 'Hnojivo',          qty: 1, unit: 25 },
    { key: 'konev',           name: 'Konev s vodou',    qty: 1, unit: 20 },
    { key: 'kvalitniHnojivo', name: 'Kvalitní hnojivo', qty: 4, unit: 50 },
    { key: 'vyzivovaVoda',    name: 'Výživová voda',    qty: 4, unit: 40 },
  ],
  bagsPerPlant: 4,    // z 1 kytky vznikají 4 sáčky
  bagPrice:     150,  // prodejní hodnota 1 sáčku
  growHours:    20,   // doba růstu jedné kytky
};
WEED_PLANT.items.forEach(it => { it.cost = it.qty * it.unit; });                          // cena za danou položku na 1 kytku
WEED_PLANT.costPerPlant    = WEED_PLANT.items.reduce((a, it) => a + it.cost, 0);          // 455
WEED_PLANT.revenuePerPlant = WEED_PLANT.bagsPerPlant * WEED_PLANT.bagPrice;               // 600
WEED_PLANT.profitPerPlant  = WEED_PLANT.revenuePerPlant - WEED_PLANT.costPerPlant;        // 145
WEED_PLANT.growMs          = WEED_PLANT.growHours * 60 * 60 * 1000;

// ── ÚLOŽIŠTĚ ODPOČTŮ PĚSTOVÁNÍ (sdílené pro všechny uživatele) ─────────────────
const WEED_TIMERS_FILE = path.join(__dirname, 'weed-timers.json');

function loadWeedTimers() {
  try {
    if (!fs.existsSync(WEED_TIMERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(WEED_TIMERS_FILE, 'utf8')) || [];
  } catch { return []; }
}
function saveWeedTimers(timers) {
  try { fs.writeFileSync(WEED_TIMERS_FILE, JSON.stringify(timers, null, 2)); } catch (e) { console.error('[WEED-TIMERS]', e.message); }
}

// ── SSE — živé notifikace ─────────────────────────────────────────────────────
const sseClients = new Set();

function broadcastSSE(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(msg); } catch {}
  }
}

app.get('/api/events', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`event: ping\ndata: ok\n\n`);
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// ── DISCORD OAUTH ─────────────────────────────────────────────────────────────
const DISCORD_AUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}&response_type=code&scope=identify`;

app.get('/auth/discord', (req, res) => {
  req.session.authAction = req.query.action || 'login';
  res.redirect(DISCORD_AUTH_URL);
});

app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect('/login?error=no_code');
  try {
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const accessToken = tokenRes.data.access_token;
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const discordUser = userRes.data;
    const onServer = await discord.isUserOnServer(discordUser.id);
    if (!onServer) return res.redirect('/login?error=not_on_server');
    req.session.pendingDiscord = { id: discordUser.id, username: discordUser.username };
    const action = req.session.authAction || 'login';
    if (action === 'register') {
      const existing = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordUser.id);
      if (existing) return res.redirect('/login?error=already_registered');
      return res.redirect('/register/complete');
    } else {
      const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordUser.id);
      if (!user) return res.redirect('/register?error=not_registered');
      return res.redirect('/login/password');
    }
  } catch (err) {
    console.error('[AUTH]', err.response?.data || err.message);
    res.redirect('/login?error=auth_failed');
  }
});

// ── AUTH STRÁNKY ──────────────────────────────────────────────────────────────
app.get('/manifest.webmanifest', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.json({
    name: 'Albion',
    short_name: 'Albion',
    description: 'Albion — interní rejstřík organizace',
    start_url: '/home',
    display: 'standalone',
    background_color: '#0A0908',
    theme_color: '#0A0908',
    icons: [
      { src: '/logo.png', sizes: '192x192', type: 'image/png' },
      { src: '/logo.png', sizes: '512x512', type: 'image/png' },
    ],
  });
});

app.get('/', requireAuth, (req, res) => res.redirect('/home'));
app.get('/login', (req, res) => res.send(renderAuth('login', req.query.error)));
app.get('/register', (req, res) => res.send(renderAuth('register', req.query.error)));

app.get('/register/complete', (req, res) => {
  if (!req.session.pendingDiscord) return res.redirect('/register');
  res.send(renderAuth('register_complete', null, req.session.pendingDiscord));
});

app.post('/register/complete', async (req, res) => {
  if (!req.session.pendingDiscord) return res.redirect('/register');
  const { ic_name, password, password2 } = req.body;
  const dUser = req.session.pendingDiscord;
  if (!ic_name || !password) return res.redirect('/register/complete?error=missing');
  if (password !== password2) return res.redirect('/register/complete?error=password_mismatch');
  if (password.length < 6) return res.redirect('/register/complete?error=password_short');
  const hash = await bcrypt.hash(password, 10);
  try {
    db.prepare('INSERT INTO users (discord_id, discord_username, ic_name, password_hash) VALUES (?, ?, ?, ?)').run(dUser.id, dUser.username, ic_name, hash);
    req.session.pendingDiscord = null;
    res.redirect('/login?success=registered');
  } catch { res.redirect('/register/complete?error=exists'); }
});

app.get('/login/password', (req, res) => {
  if (!req.session.pendingDiscord) return res.redirect('/login');
  res.send(renderAuth('login_password', req.query.error, req.session.pendingDiscord));
});

app.post('/login/password', async (req, res) => {
  if (!req.session.pendingDiscord) return res.redirect('/login');
  const { password } = req.body;
  const dUser = req.session.pendingDiscord;
  const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(dUser.id);
  if (!user) return res.redirect('/login?error=not_found');
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.redirect('/login/password?error=wrong_password');
  req.session.userId = user.id;
  req.session.icName = user.ic_name;
  req.session.discordUsername = user.discord_username;
  req.session.discordId = dUser.id;
  req.session.pendingDiscord = null;
  try { db.setLastLogin(user.id, new Date().toISOString()); } catch (e) { console.error('[LOGIN]', e.message); }
  res.redirect('/home');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

// ── DISCORD MEMBERSHIP CHECK ──────────────────────────────────────────────────
// Každý request na chráněné routy ověří, že uživatel je stále na Discord serveru.
// Kontrola probíhá max. jednou za 5 minut (cache v session), aby se nevolalo API
// při každém requestu.
const DISCORD_CHECK_INTERVAL_MS = 5 * 60 * 1000;

async function requireDiscordMember(req, res, next) {
  // Přeskočit, pokud není přihlášen (requireAuth to vyřeší zvlášť)
  if (!req.session || !req.session.userId || !req.session.discordId) return next();

  const now = Date.now();
  const lastCheck = req.session.discordCheckedAt || 0;

  // Vrátit z cache, pokud jsme kontrolovali nedávno
  if (now - lastCheck < DISCORD_CHECK_INTERVAL_MS) return next();

  try {
    const onServer = await discord.isUserOnServer(req.session.discordId);
    if (!onServer) {
      req.session.destroy(() => {});
      const isApi = req.path.startsWith('/api/');
      if (isApi) return res.json({ ok: false, error: 'Přístup odepřen — nejsi na Discord serveru' });
      return res.redirect('/login?error=not_on_server');
    }
    req.session.discordCheckedAt = now;
    return next();
  } catch (err) {
    // Při chybě Discord API raději pustíme dál (fail-open), aby výpadek Discord API
    // nevyhodil všechny uživatele.
    console.error('[DISCORD CHECK]', err.message);
    return next();
  }
}

app.use(requireDiscordMember);

// ── VALIDAČNÍ HELPERY ─────────────────────────────────────────────────────────
function inEnum(value, allowed) { return allowed.includes((value || '').toString().toUpperCase()); }
function isQty(n, max = 500) { return Number.isInteger(n) && n > 0 && n <= max; }
function isAmount(n, max = 1_000_000) { return typeof n === 'number' && isFinite(n) && n > 0 && n <= max; }
function inList(value, list) { return list.includes((value || '').toString().trim()); }
function sanitizeText(value, max = 300) {
  const s = (value || '').toString().trim();
  return s.length > 0 && s.length <= max ? s : null;
}

const TYP_SKLAD = ['VKLAD', 'VÝBĚR'];
const TYP_UCET  = ['PŘÍJEM', 'VÝDAJ'];
const VALUTY    = ['USD', 'PESOS'];

// ── API — SKLADY ──────────────────────────────────────────────────────────────
app.post('/api/zbrane', requireAuth, async (req, res) => {
  const { typ, polozka, mnozstvi, kategorie, ucel } = req.body;
  const typUp = (typ || '').toString().toUpperCase();
  const qty = parseInt(mnozstvi);
  const polozkaTrim = (polozka || '').toString().trim();
  const polozkyVse = [...CONFIG.zbrane, ...CONFIG.naboje, ...CONFIG.akce];

  if (!inEnum(typUp, TYP_SKLAD))          return res.json({ ok: false, error: 'Neplatný typ pohybu (VKLAD nebo VÝBĚR)' });
  if (!inList(polozkaTrim, polozkyVse))    return res.json({ ok: false, error: 'Nepovolená položka' });
  if (!isQty(qty))                         return res.json({ ok: false, error: 'Neplatné množství (max 500 ks)' });
  const ucelSafe = ucel ? sanitizeText(ucel) : null;
  if (ucel && ucelSafe === null)           return res.json({ ok: false, error: 'Účel je příliš dlouhý (max 300 znaků)' });

  const cas = sheets.timestamp();
  const uzivatel = req.session.icName;
  const discordUser = req.session.discordUsername;
  await sheets.appendRow('Zbraně', [cas, typUp, polozkaTrim, qty, kategorie, uzivatel, ucelSafe || '-']);
  await discord.notifyAudit('Zbraně', uzivatel, discordUser, `${typUp} — ${polozkaTrim} (${qty} ks) [${kategorie}]${ucelSafe ? ' | Účel: ' + ucelSafe : ''}`);
  broadcastSSE('skladUpdate', { sekce: 'zbrane', typ: typUp, polozka: polozkaTrim, qty, uzivatel, cas });
  res.json({ ok: true });
});

app.post('/api/weed', requireAuth, async (req, res) => {
  const { typ, odruda, mnozstvi } = req.body;
  const typUp = (typ || '').toString().toUpperCase();
  const qty = parseInt(mnozstvi);
  const odruda_trim = (odruda || '').toString().trim();

  if (!inEnum(typUp, TYP_SKLAD))              return res.json({ ok: false, error: 'Neplatný typ pohybu (VKLAD nebo VÝBĚR)' });
  if (!inList(odruda_trim, CONFIG.weedOdrudy)) return res.json({ ok: false, error: 'Nepovolená odrůda' });
  if (!isQty(qty))                             return res.json({ ok: false, error: 'Neplatné množství (max 500 ks)' });

  const ceny = CONFIG.weedCeny[odruda_trim] || { vyroba: 100, prodej: 150 };
  const cas = sheets.timestamp();
  const uzivatel = req.session.icName;
  const discordUser = req.session.discordUsername;
  await sheets.appendRow('Weed', [cas, typUp, odruda_trim, qty, ceny.vyroba, ceny.prodej, uzivatel]);
  await discord.notifyAudit('Weed', uzivatel, discordUser, `${typUp} — ${odruda_trim} (${qty} ks) | Výroba: ~$${ceny.vyroba * qty} | Prodej: $${ceny.prodej * qty}`);
  broadcastSSE('skladUpdate', { sekce: 'weed', typ: typUp, odruda: odruda_trim, qty, uzivatel, cas });
  res.json({ ok: true, celkVyroba: ceny.vyroba * qty, celkProdej: ceny.prodej * qty });
});

app.post('/api/drogy', requireAuth, async (req, res) => {
  const { typ, droga, mnozstvi } = req.body;
  const typUp = (typ || '').toString().toUpperCase();
  const qty = parseInt(mnozstvi);
  const drogaTrim = (droga || '').toString().trim();

  if (!inEnum(typUp, TYP_SKLAD))              return res.json({ ok: false, error: 'Neplatný typ pohybu (VKLAD nebo VÝBĚR)' });
  if (!inList(drogaTrim, CONFIG.drogyTypy))    return res.json({ ok: false, error: 'Nepovolená droga' });
  if (!isQty(qty))                             return res.json({ ok: false, error: 'Neplatné množství (max 500 ks)' });

  const cas = sheets.timestamp();
  const uzivatel = req.session.icName;
  const discordUser = req.session.discordUsername;
  await sheets.appendRow('Drogy', [cas, typUp, drogaTrim, qty, '-', '-', uzivatel]);
  await discord.notifyAudit('Drogy', uzivatel, discordUser, `${typUp} — ${drogaTrim} (${qty} ks)`);
  broadcastSSE('skladUpdate', { sekce: 'drogy', typ: typUp, droga: drogaTrim, qty, uzivatel, cas });
  res.json({ ok: true });
});

app.post('/api/ucet', requireAuth, async (req, res) => {
  const { typ, castka, valuta, poznamka } = req.body;
  const typUp = (typ || '').toString().toUpperCase();
  const amount = parseFloat(castka);
  const valutaUp = (valuta || '').toString().toUpperCase();
  const poznamkaSafe = sanitizeText(poznamka);

  if (!inEnum(typUp, TYP_UCET))          return res.json({ ok: false, error: 'Neplatný typ pohybu (PŘÍJEM nebo VÝDAJ)' });
  if (!isAmount(amount))                  return res.json({ ok: false, error: 'Neplatná částka (max 1 000 000)' });
  if (!inEnum(valutaUp, VALUTY))          return res.json({ ok: false, error: 'Neplatná valuta (USD nebo PESOS)' });
  if (!poznamkaSafe)                      return res.json({ ok: false, error: 'Poznámka je povinná (max 300 znaků)' });

  const cas = sheets.timestamp();
  const uzivatel = req.session.icName;
  const discordUser = req.session.discordUsername;
  await sheets.appendRow('Účetnictví', [cas, typUp, amount, valutaUp, poznamkaSafe, uzivatel]);
  await discord.notifyAudit('Účetnictví', uzivatel, discordUser, `${typUp} — ${valutaUp === 'USD' ? 'SAD ' : '₱'}${amount} | ${poznamkaSafe}`);
  broadcastSSE('ucetUpdate', { typ: typUp, castka: amount, valuta: valutaUp, poznamka: poznamkaSafe, uzivatel, cas });
  res.json({ ok: true });
});

app.post('/api/chemky', requireAuth, async (req, res) => {
  const { typ, chemikalie, mnozstvi } = req.body;
  const typUp = (typ || '').toString().toUpperCase();
  const qty = parseInt(mnozstvi);
  const chemikalieTrim = (chemikalie || '').toString().trim();

  if (!inEnum(typUp, TYP_SKLAD))                        return res.json({ ok: false, error: 'Neplatný typ pohybu (VKLAD nebo VÝBĚR)' });
  if (!inList(chemikalieTrim, CONFIG.chemkyTypy))        return res.json({ ok: false, error: 'Nepovolená chemikálie' });
  if (!isQty(qty))                                       return res.json({ ok: false, error: 'Neplatné množství (max 500 ks)' });

  const cas = sheets.timestamp();
  const uzivatel = req.session.icName;
  const discordUser = req.session.discordUsername;
  await sheets.appendRow('Chemky', [cas, typUp, chemikalieTrim, qty, uzivatel]);
  await discord.notifyChemky(typUp, chemikalieTrim, qty, uzivatel);
  await discord.notifyAudit('Chemky', uzivatel, discordUser, `${typUp} — ${chemikalieTrim} (${qty} ks)`);
  broadcastSSE('skladUpdate', { sekce: 'chemky', typ: typUp, chemikalie: chemikalieTrim, qty, uzivatel, cas });
  res.json({ ok: true });
});

// ── API — WEED SÁZENÍ (odpočty růstu, sdílené pro všechny) ────────────────────
app.get('/api/weed-timers', requireAuth, (req, res) => {
  const timers = loadWeedTimers().sort((a, b) => a.endsAt - b.endsAt);
  res.json({ ok: true, timers, now: Date.now(), growMs: WEED_PLANT.growMs });
});

app.post('/api/weed-timers', requireAuth, (req, res) => {
  let { icName, postal, plants } = req.body;
  icName = (icName || '').toString().trim();
  postal = (postal || '').toString().trim();
  const pocet = Math.max(1, parseInt(plants) || 1);
  if (!icName) return res.json({ ok: false, error: 'Vyplň IC jméno' });
  if (!/^\d{4}$/.test(postal)) return res.json({ ok: false, error: 'Postal musí být 4 číslice' });

  const now = Date.now();
  const timer = {
    id: `${now}-${Math.floor((now % 100000))}-${(loadWeedTimers().length + 1)}`,
    icName,
    postal,
    plants: pocet,
    startedAt: now,
    endsAt: now + WEED_PLANT.growMs,
    createdBy: req.session.icName,
  };
  const timers = loadWeedTimers();
  timers.push(timer);
  saveWeedTimers(timers);
  broadcastSSE('weedTimer', { action: 'add', timer });
  res.json({ ok: true, timer });
});

app.post('/api/weed-timers/remove', requireAuth, (req, res) => {
  const { id } = req.body;
  let timers = loadWeedTimers();
  const before = timers.length;
  timers = timers.filter(t => t.id !== id);
  if (timers.length === before) return res.json({ ok: false, error: 'Odpočet nenalezen' });
  saveWeedTimers(timers);
  broadcastSSE('weedTimer', { action: 'remove', id });
  res.json({ ok: true });
});

// ── API — NÁSTĚNKA ────────────────────────────────────────────────────────────
app.get('/api/nastenska', requireAuth, async (req, res) => {
  try {
    const msgs = await discord.getAnnouncementMessages(20);
    const formatted = msgs
      .filter(m => m.content || (m.embeds && m.embeds.length))
      .map(m => ({
        id: m.id,
        author: m.author?.username || 'Albion',
        content: m.content || (m.embeds[0]?.description || ''),
        title: m.embeds?.[0]?.title || null,
        timestamp: m.timestamp,
        color: m.embeds?.[0]?.color || null,
      }));
    res.json({ ok: true, messages: formatted });
  } catch (e) {
    res.json({ ok: false, messages: [] });
  }
});

app.post('/api/nastenska', requireAuth, async (req, res) => {
  const { title, content } = req.body;
  if (!content || content.trim().length < 3) return res.json({ ok: false, error: 'Obsah je příliš krátký' });
  const uzivatel = req.session.icName;
  await discord.sendAnnouncement(title || 'Oznámení', content, uzivatel);
  broadcastSSE('nastenska', { title: title || 'Oznámení', content, uzivatel, timestamp: new Date().toISOString() });
  res.json({ ok: true });
});

// ── API — STATISTIKY ──────────────────────────────────────────────────────────
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const [zbraneRows, weedRows, drogyRows, ucetRows, chemkyRows] = await Promise.all([
      sheets.getRows('Zbraně').catch(() => []),
      sheets.getRows('Weed').catch(() => []),
      sheets.getRows('Drogy').catch(() => []),
      sheets.getRows('Účetnictví').catch(() => []),
      sheets.getRows('Chemky').catch(() => []),
    ]);
    const allUsers = db.prepare('SELECT * FROM users').all();
    const nameMapStats = {};
    allUsers.forEach(u => {
      if (u.ic_name) {
        nameMapStats[u.ic_name.toLowerCase()] = u.ic_name;
        if (u.discord_username) nameMapStats[u.discord_username.toLowerCase()] = u.ic_name;
        if (u.discord_display_name) nameMapStats[u.discord_display_name.toLowerCase()] = u.ic_name;
        if (u.global_name) nameMapStats[u.global_name.toLowerCase()] = u.ic_name;
      }
    });
    const icToDiscord = {};
    allUsers.forEach(u => { if (u.ic_name && u.discord_username) icToDiscord[u.ic_name] = u.discord_username; });

    const normalizeUser = (name) => {
      if (!name) return name;
      const lower = name.trim().toLowerCase();
      if (nameMapStats[lower]) return nameMapStats[lower];
      for (const [key, icName] of Object.entries(nameMapStats)) {
        if (key.includes(lower) || lower.includes(key)) return icName;
      }
      return name.trim();
    };

    const stats = {};

    const ensureUser = (icName) => {
      if (!icName) return;
      if (!stats[icName]) stats[icName] = {
        discordUsername: icToDiscord[icName] || null,
        zbrane: { vklad: {}, vyber: {} },
        naboje: { vklad: {}, vyber: {} },
        akce:   { vklad: {}, vyber: {} },
        weed:   { vklad: {}, vyber: {} },
        drogy:  { vklad: {}, vyber: {} },
        chemky: { vklad: {}, vyber: {} },
        ucet:   { prijem_usd: 0, vydaj_usd: 0, prijem_pesos: 0, vydaj_pesos: 0 },
      };
    };

    const addItemQty = (obj, key, qty) => { obj[key] = (obj[key] || 0) + qty; };

    for (let i = 1; i < zbraneRows.length; i++) {
      const r = zbraneRows[i];
      const uzivatelRaw = r[5]; if (!uzivatelRaw) continue;
      const uzivatel = normalizeUser(uzivatelRaw);
      ensureUser(uzivatel);
      const typ = (r[1]||'').toUpperCase();
      const polozka = r[2] || '?';
      const qty = parseInt(r[3]) || 0;
      const kat = (r[4]||'').toLowerCase();
      let bucket = 'zbrane';
      if (kat === 'střelivo') bucket = 'naboje';
      else if (kat === 'akce') bucket = 'akce';
      if (typ === 'VKLAD') addItemQty(stats[uzivatel][bucket].vklad, polozka, qty);
      else addItemQty(stats[uzivatel][bucket].vyber, polozka, qty);
    }

    for (let i = 1; i < weedRows.length; i++) {
      const r = weedRows[i];
      const uzivatelRaw = r[6]; if (!uzivatelRaw) continue;
      const uzivatel = normalizeUser(uzivatelRaw);
      ensureUser(uzivatel);
      const typ = (r[1]||'').toUpperCase();
      const odruda = r[2] || '?';
      const qty = parseInt(r[3]) || 0;
      if (typ === 'VKLAD') addItemQty(stats[uzivatel].weed.vklad, odruda, qty);
      else addItemQty(stats[uzivatel].weed.vyber, odruda, qty);
    }

    for (let i = 1; i < drogyRows.length; i++) {
      const r = drogyRows[i];
      const uzivatelRaw = r[6]; if (!uzivatelRaw) continue;
      const uzivatel = normalizeUser(uzivatelRaw);
      ensureUser(uzivatel);
      const typ = (r[1]||'').toUpperCase();
      const droga = r[2] || '?';
      const qty = parseInt(r[3]) || 0;
      if (typ === 'VKLAD') addItemQty(stats[uzivatel].drogy.vklad, droga, qty);
      else addItemQty(stats[uzivatel].drogy.vyber, droga, qty);
    }

    for (let i = 1; i < chemkyRows.length; i++) {
      const r = chemkyRows[i];
      const uzivatelRaw = r[4]; if (!uzivatelRaw) continue;
      const uzivatel = normalizeUser(uzivatelRaw);
      ensureUser(uzivatel);
      const typ = (r[1]||'').toUpperCase();
      const chem = r[2] || '?';
      const qty = parseInt(r[3]) || 0;
      if (typ === 'VKLAD') addItemQty(stats[uzivatel].chemky.vklad, chem, qty);
      else addItemQty(stats[uzivatel].chemky.vyber, chem, qty);
    }

    for (let i = 1; i < ucetRows.length; i++) {
      const r = ucetRows[i];
      const uzivatelRaw = r[5]; if (!uzivatelRaw) continue;
      const uzivatel = normalizeUser(uzivatelRaw);
      ensureUser(uzivatel);
      const typ = (r[1]||'').toUpperCase();
      const castka = parseFloat((r[2]||'0').replace(',','.')) || 0;
      const valuta = (r[3]||'USD').toUpperCase();
      const s = stats[uzivatel].ucet;
      if (typ === 'PŘÍJEM') { if (valuta === 'USD') s.prijem_usd += castka; else s.prijem_pesos += castka; }
      else                  { if (valuta === 'USD') s.vydaj_usd += castka; else s.vydaj_pesos += castka; }
    }

    res.json({ ok: true, stats });
  } catch (e) {
    console.error('[STATS]', e);
    res.json({ ok: false, stats: {} });
  }
});

// ── API — AUDIT ───────────────────────────────────────────────────────────────
app.get('/api/audit', requireAuth, async (req, res) => {
  try {
    const [zbraneRows, weedRows, drogyRows, ucetRows, chemkyRows] = await Promise.all([
      sheets.getRows('Zbraně').catch(() => []),
      sheets.getRows('Weed').catch(() => []),
      sheets.getRows('Drogy').catch(() => []),
      sheets.getRows('Účetnictví').catch(() => []),
      sheets.getRows('Chemky').catch(() => []),
    ]);

    // Normalizace jmen — mapujeme vše co bot může napsat na ic_name
    const allUsersAudit = db.prepare('SELECT * FROM users').all();
    const nameMap = {};
    allUsersAudit.forEach(u => {
      if (u.ic_name) {
        nameMap[u.ic_name.toLowerCase()] = u.ic_name;
        if (u.discord_username) nameMap[u.discord_username.toLowerCase()] = u.ic_name;
        if (u.discord_display_name) nameMap[u.discord_display_name.toLowerCase()] = u.ic_name;
        if (u.global_name) nameMap[u.global_name.toLowerCase()] = u.ic_name;
      }
    });
    const normAudit = (name) => {
      if (!name || name === '—') return name || '—';
      const trimmed = name.trim();
      const lower = trimmed.toLowerCase();
      if (nameMap[lower]) return nameMap[lower];
      for (const [key, icName] of Object.entries(nameMap)) {
        if (key.includes(lower) || lower.includes(key)) return icName;
      }
      return trimmed;
    };

    // Detekuje zdroj záznamu: web zapíše timestamp v prvním sloupci ve formátu DD.MM.YYYY,
    // Discord bot může psát jiný formát nebo ponechat prázdné
    const detectSource = (r) => {
      const ts = (r[0] || '').toString().trim();
      if (!ts) return 'discord';
      // Web timestamp: "12.6.2025, 14:30:00" nebo podobné CZ formáty
      if (/\d{1,2}\.\s?\d{1,2}\.\s?\d{4}/.test(ts)) return 'web';
      // ISO formát — může být bot nebo web
      if (/^\d{4}-\d{2}-\d{2}/.test(ts)) return 'bot';
      return 'discord';
    };

    const events = [];

    const addRows = (rows, sekce, icon) => {
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const hasContent = r && r.some(cell => cell && cell.toString().trim() !== '');
        if (!hasContent) continue;

        let detail = '';
        let rawUzivatel = '—';
        const source = detectSource(r);

        if (sekce === 'Zbraně') {
          // Web: [cas, typ, polozka, qty, kategorie, uzivatel, ucel]
          // Bot: může mít různé pořadí — hledáme inteligentně
          const polozka = r[2] || '?';
          const qty = r[3] || '?';
          const kat = r[4] || '?';
          const ucel = r[6] && r[6] !== '-' ? r[6] : '';
          detail = `${polozka} (${qty} ks) [${kat}]${ucel ? ' | Účel: '+ucel : ''}`;
          rawUzivatel = r[5] || '—';
        } else if (sekce === 'Weed') {
          // Web: [cas, typ, odruda, qty, vyroba, prodej, uzivatel]
          const qty = parseInt(r[3]) || 0;
          const vyrobaCena = parseFloat(r[4]) || 0;
          const prodejCena = parseFloat(r[5]) || 0;
          detail = `${r[2] || '?'} (${qty} ks)${vyrobaCena ? ` | Výroba: ~$${vyrobaCena * qty}` : ''}${prodejCena ? ` | Prodej: $${prodejCena * qty}` : ''}`;
          // Pokud r[6] je číslo, uživatel je na r[7]; jinak r[6]
          rawUzivatel = (r[6] && isNaN(r[6])) ? r[6] : (r[7] || r[6] || '—');
        } else if (sekce === 'Drogy') {
          // Web: [cas, typ, droga, qty, '-', '-', uzivatel]
          const qty = r[3] || '?';
          detail = `${r[2] || '?'} (${qty} ks)`;
          rawUzivatel = (r[6] && isNaN(r[6])) ? r[6] : (r[7] || r[6] || '—');
        } else if (sekce === 'Chemky') {
          // Web: [cas, typ, chemikalie, qty, uzivatel]
          const qty = r[3] || '?';
          detail = `${r[2] || '?'} (${qty} ks)`;
          rawUzivatel = r[4] || '—';
        } else if (sekce === 'Účetnictví') {
          // Web: [cas, typ, castka, valuta, poznamka, uzivatel]
          const sym = (r[3]||'') === 'USD' ? 'SAD ' : '₱';
          detail = `${sym}${r[2] || '?'} | ${r[4] || '—'}`;
          rawUzivatel = r[5] || '—';
        }

        // Fallback: projdi sloupce odzadu a najdi první non-numerický text = jméno
        if (!rawUzivatel || rawUzivatel === '—' || rawUzivatel === '-') {
          for (let ci = r.length - 1; ci >= 0; ci--) {
            const v = (r[ci] || '').toString().trim();
            if (v && isNaN(v) && v !== '-' && v !== '—' && v.length > 1 &&
                !/^\d{1,2}\.\d{1,2}\.\d{4}/.test(v) && !/^(VKLAD|VÝBĚR|PŘÍJEM|VÝDAJ|USD|PESOS)$/i.test(v)) {
              rawUzivatel = v;
              break;
            }
          }
        }

        const cas = r[0] && r[0].toString().trim() ? r[0] : (new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' }));
        const typ = (r[1]||'').toString().toUpperCase();

        events.push({
          cas,
          sekce,
          icon,
          typ: typ || 'NEZNÁMÝ',
          uzivatel: normAudit(rawUzivatel),
          detail,
          source, // 'web' nebo 'discord'/'bot'
          _raw: r,
        });
      }
    };

    addRows(zbraneRows, 'Zbraně', '🔫');
    addRows(weedRows, 'Weed', '🌿');
    addRows(drogyRows, 'Drogy', '💊');
    addRows(chemkyRows, 'Chemky', '⚗️');
    addRows(ucetRows, 'Účetnictví', '💱');

    // Souhrn účetnictví per uživatel (normalizovaný)
    const ucetSouhrn = {};
    for (let i = 1; i < ucetRows.length; i++) {
      const r = ucetRows[i];
      const uz = normAudit(r[5]); if (!uz || uz === '—') continue;
      if (!ucetSouhrn[uz]) ucetSouhrn[uz] = { prijem_usd: 0, vydaj_usd: 0, prijem_pesos: 0, vydaj_pesos: 0 };
      const typ = (r[1]||'').toUpperCase();
      const castka = parseFloat((r[2]||'0').replace(',','.')) || 0;
      const valuta = (r[3]||'USD').toUpperCase();
      const s = ucetSouhrn[uz];
      if (typ === 'PŘÍJEM') { if (valuta === 'USD') s.prijem_usd += castka; else s.prijem_pesos += castka; }
      else                  { if (valuta === 'USD') s.vydaj_usd += castka; else s.vydaj_pesos += castka; }
    }

    // Parsuje CZ timestamp "9. 6. 2026, 18:12:26" nebo ISO "2026-06-09T18:12:26" na ms
    const parseCas = (cas) => {
      if (!cas) return 0;
      const s = cas.toString().trim();
      // ISO formát (bot)
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s).getTime() || 0;
      // CZ formát: "D. M. YYYY, HH:MM:SS" nebo "D.M.YYYY, HH:MM:SS"
      const m = s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4}),?\s*(\d{1,2}):(\d{2}):(\d{2})/);
      if (m) return new Date(+m[3], +m[2]-1, +m[1], +m[4], +m[5], +m[6]).getTime();
      return 0;
    };

    events.sort((a, b) => parseCas(b.cas) - parseCas(a.cas));

    res.json({ ok: true, events: events.slice(0, 200), ucetSouhrn });
  } catch (e) {
    console.error('[AUDIT]', e);
    res.json({ ok: false, events: [], ucetSouhrn: {} });
  }
});

// ── API — IC JMÉNA ──────────────────────────────────────────────────────────
app.get('/api/ic-names', requireAuth, (req, res) => {
  try {
    const users = db.prepare('SELECT ic_name FROM users WHERE ic_name IS NOT NULL ORDER BY ic_name ASC').all();
    res.json({ ok: true, names: users.map(u => u.ic_name) });
  } catch (e) {
    res.json({ ok: false, names: [] });
  }
});

// ── API — DEBUG SHEETS (dočasný endpoint pro diagnostiku) ─────────────────────
app.get('/api/debug-sheets', requireAuth, async (req, res) => {
  try {
    const sheet = req.query.sheet || 'Weed';
    const rows = await sheets.getRows(sheet).catch(e => ({ error: e.message }));
    // Vrátí prvních 10 řádků (včetně hlavičky) s indexy sloupců viditelně popsanými
    const preview = Array.isArray(rows)
      ? rows.slice(0, 15).map((r, i) => ({ rowIndex: i, cols: r }))
      : rows;
    res.json({ sheet, totalRows: Array.isArray(rows) ? rows.length : '?', preview });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// ── API — BLACKBOOK (reporty z dostupných dat: sheets + web/discord účty) ──────
app.get('/api/blackbook', requireAuth, async (req, res) => {
  try {
    const [zbraneRows, weedRows, drogyRows, ucetRows, chemkyRows] = await Promise.all([
      sheets.getRows('Zbraně').catch(() => []),
      sheets.getRows('Weed').catch(() => []),
      sheets.getRows('Drogy').catch(() => []),
      sheets.getRows('Účetnictví').catch(() => []),
      sheets.getRows('Chemky').catch(() => []),
    ]);

    // ── Normalizace jmen (web/discord účty) ──
    const allUsers = db.prepare('SELECT * FROM users').all();
    const nameMap = {};
    const icToDiscord = {};
    allUsers.forEach(u => {
      if (u.ic_name) {
        nameMap[u.ic_name.toLowerCase()] = u.ic_name;
        if (u.discord_username) { nameMap[u.discord_username.toLowerCase()] = u.ic_name; icToDiscord[u.ic_name] = u.discord_username; }
        if (u.discord_display_name) nameMap[u.discord_display_name.toLowerCase()] = u.ic_name;
        if (u.global_name) nameMap[u.global_name.toLowerCase()] = u.ic_name;
      }
    });
    const norm = (name) => {
      if (!name || name === '—' || name === '-') return null;
      const lower = name.toString().trim().toLowerCase();
      if (nameMap[lower]) return nameMap[lower];
      for (const [key, ic] of Object.entries(nameMap)) { if (key.includes(lower) || lower.includes(key)) return ic; }
      return name.toString().trim();
    };

    const parseCas = (cas) => {
      if (!cas) return 0;
      const s = cas.toString().trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s).getTime() || 0;
      const m = s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4}),?\s*(\d{1,2}):(\d{2}):(\d{2})/);
      if (m) return new Date(+m[3], +m[2]-1, +m[1], +m[4], +m[5], +m[6]).getTime();
      const m2 = s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
      if (m2) return new Date(+m2[3], +m2[2]-1, +m2[1]).getTime();
      return 0;
    };

    // ── Ceníky ──
    const WEED_SELL = 150;
    const DROGY_P = {}; Object.entries(CONFIG.drogyCeny).forEach(([k,v]) => DROGY_P[k] = v.prodej);
    const ZBRANE_P = {}; Object.entries(CONFIG.zbraneCeny).forEach(([k,v]) => ZBRANE_P[k] = v.prodej);

    // ── Sjednocený proud událostí ──
    const ev = []; // {ts, cas, sekce, typ, member, item, qty, kat, castka, valuta, hodnota, pozn, ucel}
    const push = (o) => ev.push(o);

    for (let i = 1; i < zbraneRows.length; i++) {
      const r = zbraneRows[i]; if (!r || !r.some(c => c && c.toString().trim())) continue;
      const member = norm(r[5]); const qty = parseInt(r[3]) || 0;
      const kat = (r[4]||'').toString().toLowerCase();
      push({ ts: parseCas(r[0]), cas: r[0]||'', sekce: 'Zbraně', typ: (r[1]||'').toUpperCase(), member, item: r[2]||'?', qty, kat, ucel: (r[6] && r[6] !== '-') ? r[6] : '', hodnota: (ZBRANE_P[r[2]]||0)*qty });
    }
    for (let i = 1; i < weedRows.length; i++) {
      const r = weedRows[i]; if (!r || !r.some(c => c && c.toString().trim())) continue;
      const member = norm((r[6] && isNaN(r[6])) ? r[6] : (r[7] || r[6])); const qty = parseInt(r[3]) || 0;
      push({ ts: parseCas(r[0]), cas: r[0]||'', sekce: 'Weed', typ: (r[1]||'').toUpperCase(), member, item: r[2]||'?', qty, hodnota: WEED_SELL*qty });
    }
    for (let i = 1; i < drogyRows.length; i++) {
      const r = drogyRows[i]; if (!r || !r.some(c => c && c.toString().trim())) continue;
      const member = norm((r[6] && isNaN(r[6])) ? r[6] : (r[7] || r[6])); const qty = parseInt(r[3]) || 0;
      push({ ts: parseCas(r[0]), cas: r[0]||'', sekce: 'Drogy', typ: (r[1]||'').toUpperCase(), member, item: r[2]||'?', qty, hodnota: (DROGY_P[r[2]]||0)*qty });
    }
    for (let i = 1; i < chemkyRows.length; i++) {
      const r = chemkyRows[i]; if (!r || !r.some(c => c && c.toString().trim())) continue;
      const member = norm(r[4]); const qty = parseInt(r[3]) || 0;
      push({ ts: parseCas(r[0]), cas: r[0]||'', sekce: 'Chemky', typ: (r[1]||'').toUpperCase(), member, item: r[2]||'?', qty });
    }
    for (let i = 1; i < ucetRows.length; i++) {
      const r = ucetRows[i]; if (!r || !r.some(c => c && c.toString().trim())) continue;
      const member = norm(r[5]); const castka = parseFloat((r[2]||'0').toString().replace(',','.')) || 0;
      push({ ts: parseCas(r[0]), cas: r[0]||'', sekce: 'Účetnictví', typ: (r[1]||'').toUpperCase(), member, item: r[4]||'', castka, valuta: (r[3]||'USD').toUpperCase(), pozn: r[4]||'' });
    }

    const now = Date.now();
    const DAY = 86400000;
    const inWindow = (ts, days) => ts > 0 && (now - ts) <= days * DAY;
    const isVklad = (t) => t === 'VKLAD' || t === 'PŘÍJEM';
    const stockSekce = ['Zbraně','Weed','Drogy','Chemky'];

    // ════════ 1) FINANČNÍ REPORT ════════
    const emptyFin = () => ({ prijem_usd:0, vydaj_usd:0, prijem_pesos:0, vydaj_pesos:0 });
    const finance = { day: emptyFin(), week: emptyFin(), month: emptyFin(), total: emptyFin() };
    const ucetEv = ev.filter(e => e.sekce === 'Účetnictví');
    ucetEv.forEach(e => {
      const buckets = ['total'];
      if (inWindow(e.ts, 1)) buckets.push('day');
      if (inWindow(e.ts, 7)) buckets.push('week');
      if (inWindow(e.ts, 30)) buckets.push('month');
      buckets.forEach(b => {
        const f = finance[b];
        const usd = e.valuta === 'USD';
        if (e.typ === 'PŘÍJEM') f[usd?'prijem_usd':'prijem_pesos'] += e.castka;
        else f[usd?'vydaj_usd':'vydaj_pesos'] += e.castka;
      });
    });

    // Časová osa zůstatku účtu (kumulativně, USD)
    const balanceTimeline = [];
    let runUsd = 0, runPesos = 0;
    ucetEv.filter(e => e.ts > 0).sort((a,b) => a.ts - b.ts).forEach(e => {
      const sign = e.typ === 'PŘÍJEM' ? 1 : -1;
      if (e.valuta === 'USD') runUsd += sign * e.castka; else runPesos += sign * e.castka;
      balanceTimeline.push({ ts: e.ts, cas: e.cas, usd: runUsd, pesos: runPesos });
    });

    // Časová osa hodnoty skladu (kumulativně)
    const stockTimeline = [];
    let runStock = 0;
    ev.filter(e => stockSekce.includes(e.sekce) && e.ts > 0 && e.hodnota).sort((a,b) => a.ts - b.ts).forEach(e => {
      runStock += (isVklad(e.typ) ? 1 : -1) * (e.hodnota || 0);
      stockTimeline.push({ ts: e.ts, cas: e.cas, value: runStock });
    });

    // Kdo vydělal nejvíc (příjem USD)
    const earnAgg = {};
    ucetEv.forEach(e => {
      if (!e.member) return;
      if (!earnAgg[e.member]) earnAgg[e.member] = { prijem_usd:0, vydaj_usd:0, prijem_pesos:0, vydaj_pesos:0 };
      const usd = e.valuta === 'USD';
      if (e.typ === 'PŘÍJEM') earnAgg[e.member][usd?'prijem_usd':'prijem_pesos'] += e.castka;
      else earnAgg[e.member][usd?'vydaj_usd':'vydaj_pesos'] += e.castka;
    });
    const topEarners = Object.entries(earnAgg).map(([member, s]) => ({ member, ...s, net: s.prijem_usd - s.vydaj_usd }))
      .sort((a,b) => b.prijem_usd - a.prijem_usd).slice(0, 15);

    // Týdenní výkonnost — příjmy vs. výdaje (SAD) za posledních 8 týdnů
    const WEEK = 7 * DAY;
    const weekBuckets = {};
    ucetEv.filter(e => e.valuta === 'USD' && e.ts > 0).forEach(e => {
      const wAgo = Math.floor((now - e.ts) / WEEK);
      if (wAgo < 0 || wAgo > 7) return;
      if (!weekBuckets[wAgo]) weekBuckets[wAgo] = { income: 0, expense: 0 };
      if (e.typ === 'PŘÍJEM') weekBuckets[wAgo].income += e.castka; else weekBuckets[wAgo].expense += e.castka;
    });
    const weeklyTrend = [];
    for (let w = 7; w >= 0; w--) {
      const b = weekBuckets[w] || { income: 0, expense: 0 };
      weeklyTrend.push({ label: w === 0 ? 'tento týden' : `-${w}t`, income: b.income, expense: b.expense, net: b.income - b.expense });
    }

    // Odkud plynou tržby — rozpad podle kategorie zboží (na základě prodejní hodnoty)
    const revenueAgg = {};
    ev.filter(e => stockSekce.includes(e.sekce) && !isVklad(e.typ) && e.hodnota).forEach(e => {
      revenueAgg[e.sekce] = (revenueAgg[e.sekce] || 0) + e.hodnota;
    });
    const revenueByCategory = Object.entries(revenueAgg).map(([sekce, value]) => ({ sekce, value }))
      .sort((a,b) => b.value - a.value);

    // ── TIPY NA VYLEPŠENÍ (výkonnost / investice / spoření) — odvozeno z reálných dat výše ──
    const tips = [];
    const lastW = weeklyTrend[weeklyTrend.length - 1], prevW = weeklyTrend[weeklyTrend.length - 2];
    if (lastW && prevW && prevW.net !== 0) {
      const change = ((lastW.net - prevW.net) / Math.abs(prevW.net)) * 100;
      if (change <= -25) {
        tips.push({ type: 'warning', cat: 'Výkonnost', text: `Čistý zisk tento týden klesl o ${Math.abs(Math.round(change))} % oproti minulému týdnu ($${Math.round(prevW.net).toLocaleString('cs-CZ')} → $${Math.round(lastW.net).toLocaleString('cs-CZ')}). Stojí za to zkontrolovat, co se změnilo ve výdajích nebo výrobě.` });
      } else if (change >= 25) {
        tips.push({ type: 'good', cat: 'Výkonnost', text: `Čistý zisk tento týden vzrostl o ${Math.round(change)} % oproti minulému týdnu. Frakce jede dobře — vyplatí se udržet aktuální tempo výroby a prodeje.` });
      }
    }
    const monthIncome = finance.month.prijem_usd, monthNet = finance.month.prijem_usd - finance.month.vydaj_usd;
    const savingsRate = monthIncome > 0 ? (monthNet / monthIncome) * 100 : null;
    if (savingsRate !== null) {
      if (savingsRate < 10) {
        tips.push({ type: 'warning', cat: 'Spoření', text: `Za poslední měsíc frakci zbylo jen ${Math.max(0,Math.round(savingsRate))} % příjmů jako rezerva, zbytek šel na výdaje. Doporučujeme nastavit minimální rezervu (např. 20–30 % příjmů) a hlídat větší jednotlivé výdaje.` });
      } else if (savingsRate >= 40) {
        tips.push({ type: 'good', cat: 'Spoření', text: `Frakce si za poslední měsíc nechává ${Math.round(savingsRate)} % příjmů jako rezervu — zdravá míra úspor, je z čeho investovat dál.` });
      }
    }
    if (revenueByCategory.length >= 2 && revenueByCategory[0].value > 0) {
      const top = revenueByCategory[0];
      const podilTop = (top.value / revenueByCategory.reduce((a,r) => a + r.value, 0)) * 100;
      tips.push({ type: 'info', cat: 'Investice', text: `Nejvíc tržeb (${Math.round(podilTop)} %) generuje kategorie „${top.sekce}“ ($${Math.round(top.value).toLocaleString('cs-CZ')}). Pokud chcete zvýšit zisk frakce, vyplatí se investovat čas a materiál právě sem — případně prověřit, zda jiné kategorie nemají skrytý potenciál.` });
    }
    const last30PerDay = monthNet / 30;
    if (last30PerDay < 0) {
      const lastBalance = balanceTimeline.length ? balanceTimeline[balanceTimeline.length - 1].usd : 0;
      if (lastBalance > 0) {
        const daysLeft = Math.round(lastBalance / Math.abs(last30PerDay));
        tips.push({ type: 'warning', cat: 'Výkonnost', text: `Při současném tempu výdajů (přibližně $${Math.round(Math.abs(last30PerDay)).toLocaleString('cs-CZ')}/den) by zůstatek na účtu ($${Math.round(lastBalance).toLocaleString('cs-CZ')}) vydržel zhruba ${daysLeft} dní. Doporučujeme zvýšit příjmy nebo dočasně omezit výdaje.` });
      }
    }
    if (!tips.length) {
      tips.push({ type: 'info', cat: 'Info', text: 'Pro podrobnější doporučení je potřeba víc finančních dat — alespoň pár týdnů pohybů na účtu.' });
    }

    // ════════ 2) AKTIVITA ČLENŮ ════════
    const memberActivity = {};
    const ensureMA = (m) => { if (m && !memberActivity[m]) memberActivity[m] = { member: m, discord: icToDiscord[m]||null, lastTs: 0, lastCas: '', lastWebLoginTs: 0, lastWebLoginCas: '', pohyby: 0, vklady: 0, vybery: 0, ucetVkladUsd: 0 }; };
    // registrovaní bez aktivity ať jsou taky vidět + poslední webové přihlášení
    allUsers.forEach(u => {
      if (!u.ic_name) return;
      ensureMA(u.ic_name);
      const ma = memberActivity[u.ic_name];
      const loginTs = u.last_login_at ? (new Date(u.last_login_at).getTime() || 0) : 0;
      if (loginTs) {
        ma.lastWebLoginTs = loginTs;
        ma.lastWebLoginCas = new Date(loginTs).toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' });
      }
    });
    ev.forEach(e => {
      if (!e.member) return; ensureMA(e.member);
      const ma = memberActivity[e.member];
      ma.pohyby++;
      if (e.ts > ma.lastTs) { ma.lastTs = e.ts; ma.lastCas = e.cas; }
      if (e.sekce !== 'Účetnictví') { if (isVklad(e.typ)) ma.vklady++; else ma.vybery++; }
      else if (e.typ === 'PŘÍJEM' && e.valuta === 'USD') ma.ucetVkladUsd += e.castka;
    });
    // Aktivita = nejnovější z {poslední pohyb v tabulkách, poslední přihlášení na web}
    const aktivita = Object.values(memberActivity).map(ma => {
      let lastTs = ma.lastTs, lastCas = ma.lastCas, lastZdroj = ma.lastTs ? 'sklad/finance' : null;
      if (ma.lastWebLoginTs > lastTs) { lastTs = ma.lastWebLoginTs; lastCas = ma.lastWebLoginCas; lastZdroj = 'web (přihlášení)'; }
      return {
        ...ma,
        lastTs, lastCas, lastZdroj,
        daysSince: lastTs ? Math.floor((now - lastTs) / DAY) : null,
        inactive: !lastTs || (now - lastTs) > 7 * DAY,
      };
    }).sort((a,b) => (b.lastTs||0) - (a.lastTs||0));
    const inactiveCount = aktivita.filter(a => a.inactive).length;

    // ════════ 3) INVENTURA A SKLAD ════════
    const stockByItem = {}; // item -> {sekce, current, vklad, vyber}
    ev.filter(e => stockSekce.includes(e.sekce)).forEach(e => {
      const k = e.sekce + '|' + e.item;
      if (!stockByItem[k]) stockByItem[k] = { item: e.item, sekce: e.sekce, current: 0, vklad: 0, vyber: 0 };
      const s = stockByItem[k];
      if (isVklad(e.typ)) { s.current += e.qty; s.vklad += e.qty; } else { s.current -= e.qty; s.vyber += e.qty; }
    });
    const stockList = Object.values(stockByItem).sort((a,b) => b.current - a.current);

    // Kdo nejvíc vkládal / vybíral (kusy napříč skladem)
    const moveAgg = {};
    ev.filter(e => stockSekce.includes(e.sekce) && e.member).forEach(e => {
      if (!moveAgg[e.member]) moveAgg[e.member] = { member: e.member, vklad: 0, vyber: 0 };
      if (isVklad(e.typ)) moveAgg[e.member].vklad += e.qty; else moveAgg[e.member].vyber += e.qty;
    });
    const topVklad = Object.values(moveAgg).filter(m => m.vklad).sort((a,b) => b.vklad - a.vklad).slice(0, 10);
    const topVyber = Object.values(moveAgg).filter(m => m.vyber).sort((a,b) => b.vyber - a.vyber).slice(0, 10);

    // Predikce došlých zásob (na základě čisté spotřeby za posledních 30 dní)
    const predikce = Object.values(stockByItem).map(s => {
      const recent = ev.filter(e => e.sekce === s.sekce && e.item === s.item && inWindow(e.ts, 30));
      let net = 0; recent.forEach(e => { net += (isVklad(e.typ) ? 1 : -1) * e.qty; });
      const perDay = net / 30; // záporné = ubývá
      let daysLeft = null;
      if (perDay < 0 && s.current > 0) daysLeft = Math.max(0, Math.round(s.current / Math.abs(perDay)));
      return { item: s.item, sekce: s.sekce, current: s.current, perDay: +perDay.toFixed(2), daysLeft };
    }).filter(p => p.daysLeft !== null).sort((a,b) => a.daysLeft - b.daysLeft);

    // Podezřelé pohyby skladu: výběr výrazně nad průměr, nebo výběr přes dostupné množství
    const qtyBySekce = {};
    ev.filter(e => stockSekce.includes(e.sekce) && !isVklad(e.typ)).forEach(e => {
      (qtyBySekce[e.sekce] = qtyBySekce[e.sekce] || []).push(e.qty);
    });
    const avgVyber = {}; Object.entries(qtyBySekce).forEach(([s, arr]) => avgVyber[s] = arr.reduce((a,b)=>a+b,0)/arr.length);
    const podezreleSklad = ev.filter(e => stockSekce.includes(e.sekce) && !isVklad(e.typ))
      .filter(e => e.qty >= Math.max(10, (avgVyber[e.sekce]||0) * 3))
      .sort((a,b) => b.ts - a.ts).slice(0, 20)
      .map(e => ({ cas: e.cas, sekce: e.sekce, item: e.item, qty: e.qty, member: e.member, duvod: `Velký výběr (${e.qty} ks, průměr ${Math.round(avgVyber[e.sekce]||0)})` }));

    const recentMoves = ev.filter(e => stockSekce.includes(e.sekce)).sort((a,b) => b.ts - a.ts).slice(0, 25)
      .map(e => ({ cas: e.cas, sekce: e.sekce, typ: e.typ, item: e.item, qty: e.qty, member: e.member }));

    // ════════ 4) ZBRANĚ ════════
    const onlyZbrane = ev.filter(e => e.sekce === 'Zbraně' && (e.kat === 'zbraň' || e.kat === 'zbrane' || e.kat === '' || e.kat === 'střelivo' || e.kat === 'akce'));
    const zbWeapons = ev.filter(e => e.sekce === 'Zbraně' && (e.kat === 'zbraň' || e.kat === 'zbrane'));
    const zbVyberAgg = {};
    zbWeapons.filter(e => !isVklad(e.typ)).forEach(e => { zbVyberAgg[e.member] = (zbVyberAgg[e.member]||0) + e.qty; });
    const zbTopVyber = Object.entries(zbVyberAgg).filter(([m]) => m).map(([member, qty]) => ({ member, qty })).sort((a,b) => b.qty - a.qty).slice(0, 10);
    const zbHistorie = ev.filter(e => e.sekce === 'Zbraně' && !isVklad(e.typ)).sort((a,b) => b.ts - a.ts).slice(0, 30)
      .map(e => ({ cas: e.cas, item: e.item, qty: e.qty, member: e.member, ucel: e.ucel, kat: e.kat }));
    // Nevrácené: člen × zbraň, čistý zůstatek (výběr - vklad) > 0
    const zbNet = {};
    zbWeapons.forEach(e => {
      if (!e.member) return;
      const k = e.member + '|' + e.item;
      if (!zbNet[k]) zbNet[k] = { member: e.member, item: e.item, vyber: 0, vklad: 0 };
      if (isVklad(e.typ)) zbNet[k].vklad += e.qty; else zbNet[k].vyber += e.qty;
    });
    const zbNevraceno = Object.values(zbNet).map(z => ({ ...z, outstanding: z.vyber - z.vklad })).filter(z => z.outstanding > 0).sort((a,b) => b.outstanding - a.outstanding);

    // ════════ 5) DROGY A VÝROBY ════════
    const drogyEv = ev.filter(e => e.sekce === 'Drogy');
    const weedEv  = ev.filter(e => e.sekce === 'Weed');
    const drugProd = {}, drugVyber = {}, drugZisk = {};
    drogyEv.forEach(e => {
      if (isVklad(e.typ)) { drugProd[e.item] = (drugProd[e.item]||0) + e.qty; }
      else { drugVyber[e.item] = (drugVyber[e.item]||0) + e.qty; drugZisk[e.item] = (drugZisk[e.item]||0) + e.hodnota; }
    });
    let weedProd = 0, weedVyber = 0, weedZisk = 0;
    weedEv.forEach(e => { if (isVklad(e.typ)) weedProd += e.qty; else { weedVyber += e.qty; weedZisk += e.hodnota; } });
    const chemSpotreba = {};
    ev.filter(e => e.sekce === 'Chemky' && !isVklad(e.typ)).forEach(e => { chemSpotreba[e.item] = (chemSpotreba[e.item]||0) + e.qty; });
    const variciAgg = {};
    [...drogyEv, ...weedEv].filter(e => isVklad(e.typ) && e.member).forEach(e => { variciAgg[e.member] = (variciAgg[e.member]||0) + e.qty; });
    const topVarici = Object.entries(variciAgg).map(([member, qty]) => ({ member, qty })).sort((a,b) => b.qty - a.qty).slice(0, 10);

    // ════════ 6) AUDIT A BEZPEČNOST ════════
    // Podezřelé finanční transakce: velký výdaj (nad 3× průměr výdajů)
    const vydaje = ucetEv.filter(e => e.typ === 'VÝDAJ').map(e => e.castka);
    const avgVydaj = vydaje.length ? vydaje.reduce((a,b)=>a+b,0)/vydaje.length : 0;
    const podezreleTransakce = ucetEv.filter(e => e.typ === 'VÝDAJ' && e.castka >= Math.max(5000, avgVydaj * 3))
      .sort((a,b) => b.ts - a.ts).slice(0, 20)
      .map(e => ({ cas: e.cas, member: e.member, castka: e.castka, valuta: e.valuta, pozn: e.pozn, duvod: `Velký výdaj (průměr ${Math.round(avgVydaj)})` }));

    // Dlužníci: hodnota vybraných drog+weedu vs. vložené peníze (USD příjem)
    const dluhAgg = {};
    [...drogyEv, ...weedEv].filter(e => !isVklad(e.typ) && e.member).forEach(e => {
      if (!dluhAgg[e.member]) dluhAgg[e.member] = { member: e.member, goodsValue: 0, deposited: 0 };
      dluhAgg[e.member].goodsValue += e.hodnota;
    });
    ucetEv.filter(e => e.typ === 'PŘÍJEM' && e.valuta === 'USD' && e.member).forEach(e => {
      if (!dluhAgg[e.member]) dluhAgg[e.member] = { member: e.member, goodsValue: 0, deposited: 0 };
      dluhAgg[e.member].deposited += e.castka;
    });
    const dluznici = Object.values(dluhAgg).map(d => ({ ...d, dluh: Math.round(d.goodsValue - d.deposited) }))
      .filter(d => d.dluh > 0).sort((a,b) => b.dluh - a.dluh);

    res.json({
      ok: true,
      generatedAt: sheets.timestamp(),
      recipe: WEED_PLANT,
      finance: { periods: finance, balanceTimeline, stockTimeline, topEarners, weeklyTrend, revenueByCategory, tips },
      aktivita: { members: aktivita, inactiveCount, total: aktivita.length },
      sklad: { stockList, topVklad, topVyber, predikce, podezrele: podezreleSklad, recent: recentMoves },
      zbrane: { topVyber: zbTopVyber, historie: zbHistorie, nevraceno: zbNevraceno },
      drogy: { drugProd, drugVyber, drugZisk, weedProd, weedVyber, weedZisk, chemSpotreba, topVarici },
      bezpecnost: { podezreleTransakce, dluznici },
    });
  } catch (e) {
    console.error('[BLACKBOOK]', e);
    res.json({ ok: false, error: e.message });
  }
});

// ── API — PROFIT CENTRUM ────────────────────────────────────────────────────
// Report se počítá výhradně z reálných dat: Účetnictví (peníze) + Drogy/Weed (sklad).
app.get('/api/profit-centrum', requireAuth, async (req, res) => {
  try {
    const [weedRows, drogyRows, ucetRows] = await Promise.all([
      sheets.getRows('Weed').catch(() => []),
      sheets.getRows('Drogy').catch(() => []),
      sheets.getRows('Účetnictví').catch(() => []),
    ]);

    // ── Normalizace jmen (web/discord účty -> IC jméno) ──
    const allUsers = db.prepare('SELECT * FROM users').all();
    const nameMap = {};
    allUsers.forEach(u => {
      if (u.ic_name) {
        nameMap[u.ic_name.toLowerCase()] = u.ic_name;
        if (u.discord_username) nameMap[u.discord_username.toLowerCase()] = u.ic_name;
        if (u.discord_display_name) nameMap[u.discord_display_name.toLowerCase()] = u.ic_name;
        if (u.global_name) nameMap[u.global_name.toLowerCase()] = u.ic_name;
      }
    });
    const norm = (name) => {
      if (!name || name === '—' || name === '-') return null;
      const lower = name.toString().trim().toLowerCase();
      if (nameMap[lower]) return nameMap[lower];
      for (const [key, ic] of Object.entries(nameMap)) { if (key.includes(lower) || lower.includes(key)) return ic; }
      return name.toString().trim();
    };

    const parseCas = (cas) => {
      if (!cas) return 0;
      const s = cas.toString().trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s).getTime() || 0;
      const m = s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4}),?\s*(\d{1,2}):(\d{2}):(\d{2})/);
      if (m) return new Date(+m[3], +m[2]-1, +m[1], +m[4], +m[5], +m[6]).getTime();
      const m2 = s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
      if (m2) return new Date(+m2[3], +m2[2]-1, +m2[1]).getTime();
      return 0;
    };

    const WEED_SELL = 150;
    const DROGY_P = {}; Object.entries(CONFIG.drogyCeny).forEach(([k,v]) => DROGY_P[k] = v.prodej);
    const isVklad = (t) => t === 'VKLAD' || t === 'PŘÍJEM';
    const now = Date.now();
    const DAY = 86400000;
    const inWindow = (ts, days) => ts > 0 && (now - ts) <= days * DAY;

    // ── Prodeje (výběry ze skladu) z Drogy + Weed — reálné tržby dle ceníku ──
    const sales = [];
    for (let i = 1; i < drogyRows.length; i++) {
      const r = drogyRows[i]; if (!r || !r.some(c => c && c.toString().trim())) continue;
      const typ = (r[1]||'').toUpperCase();
      if (isVklad(typ)) continue; // počítáme jen výběry (prodej), ne výrobu
      const member = norm((r[6] && isNaN(r[6])) ? r[6] : (r[7] || r[6]));
      const qty = parseInt(r[3]) || 0;
      const item = r[2] || '?';
      sales.push({ ts: parseCas(r[0]), member, droga: item, qty, hodnota: (DROGY_P[item]||0) * qty });
    }
    for (let i = 1; i < weedRows.length; i++) {
      const r = weedRows[i]; if (!r || !r.some(c => c && c.toString().trim())) continue;
      const typ = (r[1]||'').toUpperCase();
      if (isVklad(typ)) continue;
      const member = norm((r[6] && isNaN(r[6])) ? r[6] : (r[7] || r[6]));
      const qty = parseInt(r[3]) || 0;
      const item = r[2] || '?';
      const price = (CONFIG.weedCeny[item] && CONFIG.weedCeny[item].prodej) || WEED_SELL;
      sales.push({ ts: parseCas(r[0]), member, droga: item, qty, hodnota: price * qty });
    }

    // ── Účetnictví — skutečné peníze organizace ──
    const ucetEv = [];
    for (let i = 1; i < ucetRows.length; i++) {
      const r = ucetRows[i]; if (!r || !r.some(c => c && c.toString().trim())) continue;
      const member = norm(r[5]);
      const castka = parseFloat((r[2]||'0').toString().replace(',','.')) || 0;
      ucetEv.push({ ts: parseCas(r[0]), typ: (r[1]||'').toUpperCase(), member, castka, valuta: (r[3]||'USD').toUpperCase() });
    }

    // ════════ Kolik vydělala frakce (dnes / týden / měsíc / celkem) ════════
    const periodDays = { day: 1, week: 7, month: 30 };
    const emptyP = () => ({ prijem_usd: 0, vydaj_usd: 0, prijem_pesos: 0, vydaj_pesos: 0, trzby_sklad: 0 });
    const periods = { day: emptyP(), week: emptyP(), month: emptyP(), total: emptyP() };
    ucetEv.forEach(e => {
      const buckets = ['total'];
      Object.entries(periodDays).forEach(([k, d]) => { if (inWindow(e.ts, d)) buckets.push(k); });
      buckets.forEach(b => {
        const p = periods[b];
        const usd = e.valuta === 'USD';
        if (e.typ === 'PŘÍJEM') p[usd ? 'prijem_usd' : 'prijem_pesos'] += e.castka;
        else p[usd ? 'vydaj_usd' : 'vydaj_pesos'] += e.castka;
      });
    });
    sales.forEach(s => {
      const buckets = ['total'];
      Object.entries(periodDays).forEach(([k, d]) => { if (inWindow(s.ts, d)) buckets.push(k); });
      buckets.forEach(b => { periods[b].trzby_sklad += s.hodnota; });
    });
    Object.values(periods).forEach(p => { p.zisk = Math.round((p.prijem_usd - p.vydaj_usd) * 100) / 100; });

    // ════════ Žebříčky: nejlepší dealer / nejvýdělečnější droga / nejvýdělečnější člen ════════
    function buildLeaderboards(days) {
      const inP = (ts) => days == null ? true : inWindow(ts, days);

      // Nejlepší dealer — souhrn tržeb z prodeje drog+weedu podle člena
      const dealerAgg = {};
      sales.filter(s => inP(s.ts) && s.member).forEach(s => {
        if (!dealerAgg[s.member]) dealerAgg[s.member] = { member: s.member, qty: 0, trzby: 0 };
        dealerAgg[s.member].qty += s.qty;
        dealerAgg[s.member].trzby += s.hodnota;
      });
      const dealers = Object.values(dealerAgg).sort((a, b) => b.trzby - a.trzby);

      // Nejvýdělečnější droga — souhrn tržeb podle položky
      const drugAgg = {};
      sales.filter(s => inP(s.ts)).forEach(s => {
        if (!drugAgg[s.droga]) drugAgg[s.droga] = { droga: s.droga, qty: 0, trzby: 0 };
        drugAgg[s.droga].qty += s.qty;
        drugAgg[s.droga].trzby += s.hodnota;
      });
      const drugs = Object.values(drugAgg).sort((a, b) => b.trzby - a.trzby);

      // Nejvýdělečnější člen — čistý přínos (příjem - výdaj) v Účetnictví
      const memberAgg = {};
      ucetEv.filter(e => inP(e.ts) && e.member && e.valuta === 'USD').forEach(e => {
        if (!memberAgg[e.member]) memberAgg[e.member] = { member: e.member, prijem: 0, vydaj: 0 };
        if (e.typ === 'PŘÍJEM') memberAgg[e.member].prijem += e.castka;
        else memberAgg[e.member].vydaj += e.castka;
      });
      const members = Object.values(memberAgg).map(m => ({ ...m, net: m.prijem - m.vydaj })).sort((a, b) => b.net - a.net);

      return { dealers, drugs, members };
    }

    const leaderboards = {
      day: buildLeaderboards(1),
      week: buildLeaderboards(7),
      month: buildLeaderboards(30),
      total: buildLeaderboards(null),
    };

    res.json({ ok: true, generatedAt: sheets.timestamp(), periods, leaderboards });
  } catch (e) {
    console.error('[PROFIT-CENTRUM]', e);
    res.json({ ok: false, error: e.message });
  }
});


app.get('/home', requireAuth, async (req, res) => {
  try {
    const [zbrane, weed, drogy, chemky, ucet, recentUcet, recentZbrane, recentWeed, recentDrogy, recentChemky] = await Promise.all([
      sheets.getStockSummary('Zbraně').catch(() => ({})),
      sheets.getStockSummary('Weed').catch(() => ({})),
      sheets.getStockSummary('Drogy').catch(() => ({})),
      sheets.getStockSummary('Chemky').catch(() => ({})),
      sheets.getAccountingSummary().catch(() => ({ usd: 0, pesos: 0 })),
      sheets.getRecentRows('Účetnictví', 5).catch(() => []),
      sheets.getRecentRows('Zbraně', 3).catch(() => []),
      sheets.getRecentRows('Weed', 3).catch(() => []),
      sheets.getRecentRows('Drogy', 3).catch(() => []),
      sheets.getRecentRows('Chemky', 3).catch(() => []),
    ]);
    res.send(renderHome(req, { zbrane, weed, drogy, chemky, ucet, recentUcet, recentZbrane, recentWeed, recentDrogy, recentChemky }));
  } catch (e) {
    res.send(renderHome(req, { zbrane: {}, weed: {}, drogy: {}, chemky: {}, ucet: { usd: 0, pesos: 0 }, recentUcet: [], recentZbrane: [], recentWeed: [], recentDrogy: [], recentChemky: [] }));
  }
});

app.get('/dashboard', requireAuth, async (req, res) => res.redirect('/home'));


app.get('/sklad', requireAuth, async (req, res) => {
  try {
    const [zbrane, weed, drogy, chemky, ucet, recentUcet] = await Promise.all([
      sheets.getStockSummary('Zbraně').catch(() => ({})),
      sheets.getStockSummary('Weed').catch(() => ({})),
      sheets.getStockSummary('Drogy').catch(() => ({})),
      sheets.getStockSummary('Chemky').catch(() => ({})),
      sheets.getAccountingSummary().catch(() => ({ usd: 0, pesos: 0 })),
      sheets.getRecentRows('Účetnictví', 5).catch(() => []),
    ]);
    res.send(renderDashboard(req, { zbrane, weed, drogy, chemky, ucet, recentUcet }));
  } catch (e) {
    res.send(renderDashboard(req, { zbrane: {}, weed: {}, drogy: {}, chemky: {}, ucet: { usd: 0, pesos: 0 }, recentUcet: [] }));
  }
});

app.get('/weed-sazeni', requireAuth, (req, res) => res.send(renderWeedSazeni(req)));
app.get('/blackbook', requireAuth, (req, res) => res.send(renderBlackbook(req)));
app.get('/profit-centrum', requireAuth, (req, res) => res.send(renderProfitCentrum(req)));
app.get('/nastenska', requireAuth, (req, res) => res.send(renderNastenska(req)));
app.get('/kodex', requireAuth, (req, res) => res.send(renderKodex(req)));
app.get('/audit', requireAuth, (req, res) => res.send(renderAudit(req)));
app.get('/statistiky', requireAuth, (req, res) => res.send(renderStatistiky(req)));
app.get('/lore', requireAuth, (req, res) => res.send(renderLore(req)));
app.get('/hierarchy', requireAuth, (req, res) => res.send(renderHierarchy(req)));


// ── LEDGER EMPTY STATE — shared "unwritten page" illustration ──────────────────
function ledgerEmpty(text, compact) {
  return `<div class="ledger-empty${compact ? ' compact' : ''}">
    <svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="2" width="58" height="44" rx="2" stroke="var(--border-brass)" stroke-width="1.5"/>
      <line x1="12" y1="14" x2="44" y2="14" stroke="var(--border)" stroke-width="1.5"/>
      <line x1="12" y1="22" x2="52" y2="22" stroke="var(--border)" stroke-width="1.5"/>
      <line x1="12" y1="30" x2="38" y2="30" stroke="var(--border)" stroke-width="1.5"/>
      <line x1="12" y1="38" x2="48" y2="38" stroke="var(--border)" stroke-width="1.5"/>
    </svg>
    <div class="ledger-empty-text">${text}</div>
  </div>`;
}

// ── BASE STYLES ───────────────────────────────────────────────────────────────
function baseStyles() {
  return `
    <link rel="icon" type="image/png" href="/logo.png">
    <link rel="apple-touch-icon" href="/logo.png">
    <link rel="manifest" href="/manifest.webmanifest">
    <meta name="theme-color" content="#0A0908">
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;0,9..144,900;1,9..144,500;1,9..144,600&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}

      :root{
        /* ── LEDGER — operational mode (the working register) ── */
        --ink:#0A0908;
        --ink-soft:#0E0C0A;
        --leather:#15120F;
        --leather2:#1A1613;
        --leather3:#211C17;
        --leather4:#272019;
        --seal:#8B1A1A;
        --seal-bright:#B23B3B;
        --seal-glow:rgba(139,26,26,0.20);
        --seal-deep:#5C0F0F;
        --brass:#C9A227;
        --brass-bright:#E0BC4A;
        --brass-dim:rgba(201,162,39,0.14);
        --brass-line:rgba(201,162,39,0.30);
        --vellum:#EAE3D3;
        --vellum-bright:#F5F0E4;
        --parchment-dim:#9C9484;
        --text:#E8E2D5;
        --text-dim:#9C9484;
        --text-muted:#6B6358;
        --text-label:#5A5346;
        --border:rgba(201,162,39,0.12);
        --border-hover:rgba(201,162,39,0.26);
        --border-seal:rgba(139,26,26,0.32);
        --border-brass:rgba(201,162,39,0.30);
        --gold-dim:rgba(201,162,39,0.10);
        --true-gold:#C9A227;
        --true-gold-dim:rgba(201,162,39,0.14);
        --input-bg:#100D0B;
        --shadow:0 12px 40px rgba(0,0,0,0.65);
        --shadow-card:0 2px 18px rgba(0,0,0,0.45);
        --nav-h:68px;
        --font-display:'Fraunces',serif;
        --font-mono:'JetBrains Mono',monospace;
        /* legacy aliases kept so untouched inline styles still resolve */
        --crimson:var(--seal);
        --crimson-light:var(--seal-bright);
        --crimson-glow:var(--seal-glow);
        --crimson-bright:var(--seal-bright);
        --money:#3A7D2D;
        --silver:var(--text-dim);
        --silver-bright:var(--text);
        --silver-dim:rgba(201,162,39,0.06);
        --bg:var(--ink);
        --bg-soft:var(--ink-soft);
        --bg-mid:var(--leather);
        --bg-card:var(--leather2);
        --bg-card2:var(--leather3);
        --bg-card3:var(--leather4);
        --gold:var(--brass);
        --border-silver:var(--border);
        --border-gold:var(--border-seal);
      }
      body.light{
        /* ── VELLUM — paper documentation mode ── */
        --seal:#A1271F;
        --seal-bright:#BE3A30;
        --seal-glow:rgba(161,39,31,0.10);
        --seal-deep:#7A1812;
        --brass:#8A6A14;
        --brass-bright:#A9821C;
        --brass-dim:rgba(138,106,20,0.10);
        --brass-line:rgba(138,106,20,0.30);
        --ink:#F3EEE3;
        --ink-soft:#ECE5D6;
        --leather:#E6DDC9;
        --leather2:#FBF8F0;
        --leather3:#F1EBDC;
        --leather4:#E9E1CE;
        --text:#241F17;
        --text-dim:#5C5340;
        --text-muted:#8C8264;
        --text-label:#6B6249;
        --border:rgba(36,31,23,0.10);
        --border-hover:rgba(36,31,23,0.22);
        --border-seal:rgba(161,39,31,0.30);
        --border-brass:rgba(138,106,20,0.32);
        --gold-dim:rgba(138,106,20,0.08);
        --true-gold:#8A6A14;
        --true-gold-dim:rgba(138,106,20,0.10);
        --input-bg:#FFFFFF;
        --shadow:0 8px 30px rgba(40,30,10,0.10);
        --shadow-card:0 2px 12px rgba(40,30,10,0.07);
        --crimson:var(--seal);--crimson-light:var(--seal-bright);--crimson-glow:var(--seal-glow);--crimson-bright:var(--seal-bright);
        --silver:var(--text-dim);--silver-bright:var(--text);--silver-dim:rgba(138,106,20,0.05);
        --bg:var(--ink);--bg-soft:var(--ink-soft);--bg-mid:var(--leather);--bg-card:var(--leather2);--bg-card2:var(--leather3);--bg-card3:var(--leather4);
        --gold:var(--brass);--border-silver:var(--border);--border-gold:var(--border-seal);
      }
      body.crystal{
        /* ── OBSIDIAN — encrypted / private channel mode ── */
        --seal:#C23B3B;
        --seal-bright:#DB5252;
        --seal-glow:rgba(194,59,59,0.18);
        --seal-deep:#7E1F1F;
        --brass:#6FA8C9;
        --brass-bright:#8FC2E0;
        --brass-dim:rgba(111,168,201,0.12);
        --brass-line:rgba(111,168,201,0.28);
        --ink:#070B10;
        --ink-soft:rgba(12,18,26,0.6);
        --leather:rgba(14,21,30,0.55);
        --leather2:rgba(16,24,34,0.55);
        --leather3:rgba(20,29,40,0.55);
        --leather4:rgba(24,35,48,0.55);
        --text:#E4EEF5;
        --text-dim:#85A0B3;
        --text-muted:#4D6376;
        --text-label:#5E7A8C;
        --border:rgba(111,168,201,0.16);
        --border-hover:rgba(111,168,201,0.30);
        --border-seal:rgba(194,59,59,0.30);
        --border-brass:rgba(111,168,201,0.28);
        --gold-dim:rgba(111,168,201,0.08);
        --true-gold:#6FA8C9;
        --true-gold-dim:rgba(111,168,201,0.12);
        --input-bg:rgba(7,12,18,0.6);
        --shadow:0 10px 36px rgba(0,4,12,0.55);
        --shadow-card:0 2px 20px rgba(0,8,24,0.40);
        --crystal-blur:14px;
        --crimson:var(--seal);--crimson-light:var(--seal-bright);--crimson-glow:var(--seal-glow);--crimson-bright:var(--seal-bright);
        --silver:var(--text-dim);--silver-bright:var(--text);--silver-dim:rgba(111,168,201,0.07);
        --bg:var(--ink);--bg-soft:var(--ink-soft);--bg-mid:var(--leather);--bg-card:var(--leather2);--bg-card2:var(--leather3);--bg-card3:var(--leather4);
        --gold:var(--brass);--border-silver:var(--border);--border-gold:var(--border-seal);
      }

      html{scroll-behavior:smooth}
      body{
        background:var(--bg);
        color:var(--text);
        font-family:'Inter',sans-serif;
        font-weight:400;
        font-size:15px;
        line-height:1.6;
        min-height:100vh;
        transition:background 0.4s,color 0.4s;
        animation:pageFadeIn 0.5s cubic-bezier(0.22,1,0.36,1);
        position:relative;
      }

      /* ── PAPER GRAIN + VIGNETTE — felt, not rendered ── */
      body::before{
        content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
        background-image:
          radial-gradient(ellipse 90% 70% at 50% -10%, rgba(139,26,26,0.07), transparent 60%),
          radial-gradient(ellipse 70% 60% at 100% 110%, rgba(201,162,39,0.04), transparent 60%);
      }
      body::after{
        content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
        box-shadow:inset 0 0 26vw rgba(0,0,0,0.55);
        opacity:0.85;
      }
      body.light::before{
        background-image:
          radial-gradient(ellipse 90% 70% at 50% -10%, rgba(161,39,31,0.05), transparent 60%),
          radial-gradient(ellipse 70% 60% at 100% 110%, rgba(138,106,20,0.05), transparent 60%);
      }
      body.light::after{box-shadow:inset 0 0 22vw rgba(60,45,20,0.10);opacity:1}

      @keyframes pageFadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeReveal{0%{opacity:0;transform:translateY(3px)}100%{opacity:1;transform:translateY(0)}}
      .glitch-in{animation:fadeReveal 0.55s ease-out 1}

      /* legacy hooks kept inert */
      .hud-scan,.hud-readout,.hud-corner-tr{display:none}

      /* ── SCROLLBAR ── */
      ::-webkit-scrollbar{width:5px;height:5px}
      ::-webkit-scrollbar-track{background:var(--bg-soft)}
      ::-webkit-scrollbar-thumb{background:var(--seal);border-radius:3px;opacity:0.5}
      ::-webkit-scrollbar-thumb:hover{background:var(--seal-bright)}

      /* ── SEAL EMBLEM — signature element ── */
      .seal-mark{
        position:relative;width:1em;height:1em;display:inline-block;flex-shrink:0;
      }
      .seal-emblem{
        display:inline-flex;align-items:center;justify-content:center;
        border-radius:50%;
        border:1.5px solid var(--brass);
        color:var(--brass);
        font-family:var(--font-display);
        position:relative;
        box-shadow:0 0 0 1px var(--ink) inset, 0 0 14px var(--seal-glow);
      }
      .seal-emblem::before{
        content:'';position:absolute;inset:3px;border-radius:50%;
        border:1px solid var(--brass-line);
        opacity:0.6;
      }

      /* ── NAV ── */
      nav{
        background:var(--bg-card);
        border-bottom:1px solid var(--border-brass);
        padding:0 2rem;
        display:flex;
        align-items:center;
        justify-content:space-between;
        position:sticky;
        top:0;
        z-index:200;
        height:var(--nav-h);
        transition:background 0.3s,border-color 0.3s;
        box-shadow:0 1px 0 rgba(0,0,0,0.4), var(--shadow-card);
      }
      body.crystal nav{
        background:var(--bg-card);
        backdrop-filter:blur(var(--crystal-blur));
        -webkit-backdrop-filter:blur(var(--crystal-blur));
      }
      nav::after{
        content:'';position:absolute;left:0;right:0;bottom:-1px;height:1px;
        background:linear-gradient(90deg,transparent,var(--seal) 18%,var(--brass) 50%,var(--seal) 82%,transparent);
        opacity:0.55;
      }

      .nav-logo{
        font-family:var(--font-display);
        letter-spacing:0.1em;
        font-size:1.18rem;
        font-weight:700;
        text-transform:uppercase;
        text-decoration:none;
        color:var(--text);
        display:flex;
        align-items:center;
        gap:0.9rem;
        flex-shrink:0;
        transition:opacity 0.2s;
      }
      .nav-logo:hover{opacity:0.82}
      .nav-logo-img{
        width:34px;height:34px;
        object-fit:contain;
        transition:transform 0.25s;
        filter:drop-shadow(0 0 6px rgba(201,162,39,0.25));
      }
      .nav-logo:hover .nav-logo-img{transform:scale(1.06) rotate(-3deg)}
      .nav-logo-text .b-red{color:var(--seal)}

      .nav-burger{
        display:none;
        flex-direction:column;justify-content:center;gap:5px;
        width:34px;height:34px;background:none;border:1px solid var(--border-brass);
        border-radius:3px;cursor:pointer;flex-shrink:0;padding:0;
        align-items:center;
      }
      .nav-burger span{
        display:block;width:17px;height:1.5px;background:var(--brass);
        transition:transform 0.25s,opacity 0.2s;
      }
      .nav-burger.open span:nth-child(1){transform:translateY(6.5px) rotate(45deg)}
      .nav-burger.open span:nth-child(2){opacity:0}
      .nav-burger.open span:nth-child(3){transform:translateY(-6.5px) rotate(-45deg)}

      .nav-menu{display:flex;gap:0;list-style:none;height:100%}
      .nav-menu li{height:100%}
      .nav-menu a{
        display:flex;align-items:center;flex-direction:column;justify-content:center;
        padding:0 1.15rem;
        height:100%;
        font-size:0.66rem;
        letter-spacing:0.12em;
        text-transform:uppercase;
        font-weight:600;
        color:var(--text-dim);
        text-decoration:none;
        border-bottom:2px solid transparent;
        transition:color 0.2s,border-color 0.2s,background 0.2s;
        white-space:nowrap;
        position:relative;
        gap:0.22rem;
        font-family:'Inter',sans-serif;
      }
      .nav-menu a:hover{color:var(--text);background:var(--silver-dim)}
      .nav-menu a.active{color:var(--brass-bright);border-bottom-color:var(--seal)}
      .nav-menu a .nav-desc{
        font-size:0.54rem;letter-spacing:0.04em;
        color:var(--text-muted);opacity:0.8;
        font-weight:400;line-height:1;
        font-family:var(--font-mono);
      }

      .nav-right{display:flex;align-items:center;gap:0.8rem;flex-shrink:0}
      .nav-user{font-size:0.72rem;color:var(--text-muted);letter-spacing:0.02em;white-space:nowrap;font-family:var(--font-mono)}
      .nav-user strong{color:var(--vellum);font-weight:500;font-family:'Inter',sans-serif}
      .nav-logout{
        font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;
        color:var(--seal-bright);text-decoration:none;
        padding:0.4rem 0.95rem;
        border:1px solid var(--border-seal);
        transition:all 0.2s;
        border-radius:2px;
      }
      .nav-logout:hover{background:var(--seal-glow);border-color:var(--seal)}
      .theme-switcher{display:flex;align-items:center;gap:6px}
      .theme-dot-btn{
        width:13px;height:13px;border-radius:50%;border:2px solid transparent;
        cursor:pointer;transition:transform 0.18s,border-color 0.18s,box-shadow 0.18s;
        flex-shrink:0;outline:none;padding:0;
      }
      .theme-dot-btn:hover{transform:scale(1.25)}
      .theme-dot-btn.active{border-color:var(--vellum);box-shadow:0 0 0 1px var(--bg),0 0 6px rgba(201,162,39,0.3)}
      .nav-shortcut-hint{
        font-family:var(--font-mono);font-size:0.62rem;letter-spacing:0.05em;
        color:var(--text-muted);border:1px solid var(--border);
        padding:0.22rem 0.5rem;border-radius:2px;cursor:default;
        opacity:0.6;transition:opacity 0.2s,border-color 0.2s;
        flex-shrink:0;
      }
      .nav-shortcut-hint:hover{opacity:1;border-color:var(--border-brass)}
      @media(max-width:880px){.nav-shortcut-hint{display:none}}
      .notif-bell{
        position:relative;cursor:pointer;background:none;border:none;
        color:var(--text-muted);padding:0.3rem;transition:color 0.2s;
        display:flex;align-items:center;
      }
      .notif-bell svg{width:18px;height:18px}
      .notif-bell:hover{color:var(--seal-bright)}
      .notif-badge{
        position:absolute;top:-3px;right:-5px;
        background:var(--seal);color:var(--vellum-bright);
        font-size:0.5rem;min-width:14px;height:14px;
        border-radius:7px;display:none;align-items:center;justify-content:center;padding:0 3px;
        font-weight:700;
      }
      .notif-badge.visible{display:flex}

      /* ── MOBILE NAV — overlay + slide panel ── */
      .nav-overlay{
        position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:190;
        opacity:0;pointer-events:none;transition:opacity 0.25s;
        backdrop-filter:blur(2px);
      }
      body.nav-locked{overflow:hidden}
      body.nav-locked .nav-overlay{opacity:1;pointer-events:all}

      @media(max-width:880px){
        .nav-burger{display:flex}
        nav{padding:0 1.1rem}
        .nav-menu{
          display:flex;flex-direction:column;height:auto;gap:0;
          position:fixed;top:var(--nav-h);left:0;right:0;bottom:0;
          background:var(--bg-card);
          border-top:1px solid var(--border-brass);
          padding:0.5rem 0 1rem;
          overflow-y:auto;
          transform:translateY(-8px);
          opacity:0;pointer-events:none;
          transition:opacity 0.2s,transform 0.2s;
          z-index:195;
        }
        .nav-menu.mobile-open{opacity:1;pointer-events:all;transform:translateY(0)}
        .nav-menu li{height:auto;width:100%}
        .nav-menu a,.nav-drop-trigger{
          height:auto;flex-direction:row;justify-content:space-between;
          padding:0.95rem 1.4rem;width:100%;border-bottom:1px solid var(--border);
          border-left:2px solid transparent;
        }
        .nav-menu a.active,.nav-drop-trigger.active{border-bottom:1px solid var(--border);border-left-color:var(--seal)}
        .nav-menu a .nav-desc{display:none}
        .nav-drop-arrow{margin-top:0}
        .nav-dropdown.open .nav-drop-arrow{transform:rotate(180deg)}
        .nav-dropdown-menu{
          position:static;transform:none!important;width:100%;min-width:0;
          margin-top:0;padding-top:0;border-radius:0;border:none;border-top:0;
          box-shadow:none;background:var(--bg-mid);
          max-height:0;overflow:hidden;opacity:1;pointer-events:none;
          transition:max-height 0.25s ease;
        }
        .nav-dropdown.open .nav-dropdown-menu{max-height:340px;pointer-events:all}
        .nav-dropdown-menu a{padding:0.8rem 2.2rem;border-bottom:1px solid var(--border)}

        .nav-right{
          flex-wrap:wrap;justify-content:flex-start;gap:0.7rem 0.9rem;
          width:100%;padding:1.1rem 1.4rem 0.4rem;
          border-top:1px solid var(--border);margin-top:0.4rem;
        }
      }
      @media(min-width:881px){
        .nav-overlay,body.nav-locked .nav-overlay{display:none}
      }

      /* ── LAYOUT ── */
      main{max-width:1480px;margin:0 auto;padding:2.6rem 2rem 5rem;position:relative;z-index:1}

      /* ── PAGE HEADER — register-entry opener ── */
      .page-header{
        margin-bottom:2.6rem;
        padding-bottom:1.9rem;
        border-bottom:1px solid var(--border);
        position:relative;
        display:flex;
        align-items:flex-end;
        justify-content:space-between;
        gap:2rem;
      }
      .page-label{
        font-size:0.66rem;letter-spacing:0.24em;text-transform:uppercase;
        color:var(--brass);margin-bottom:0.7rem;font-weight:600;
        font-family:var(--font-mono);
        display:flex;align-items:center;gap:0.6em;
      }
      .page-label::before{content:'§';color:var(--seal);font-family:var(--font-display);font-size:1.1em}
      .page-title{
        font-family:var(--font-display);
        font-size:clamp(2.2rem,4.2vw,3.1rem);color:var(--vellum-bright);font-weight:600;letter-spacing:0.005em;
        position:relative;line-height:1.05;
      }
      .page-title::after{
        content:'';display:block;width:52px;height:2px;margin-top:0.6rem;
        background:linear-gradient(90deg,var(--seal),var(--brass));
      }
      .page-sub{
        font-family:'Inter',sans-serif;
        color:var(--text-dim);
        margin-top:0.55rem;font-size:0.98rem;
      }

      /* ── PAGE INFO BOX — marginalia / annotation (legacy, used on some pages) ── */
      .page-info{
        background:var(--gold-dim);
        border:1px solid var(--border-brass);
        border-left:3px solid var(--brass);
        padding:1.25rem 1.5rem;
        margin-bottom:2rem;
        display:flex;
        align-items:flex-start;
        gap:1rem;
      }
      .page-info-icon{flex-shrink:0;margin-top:0.1rem;color:var(--brass);opacity:0.9}
      .page-info-icon svg{width:20px;height:20px}
      .page-info-title{
        font-family:var(--font-mono);
        font-size:0.74rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;
        color:var(--brass-bright);margin-bottom:0.4rem;
      }
      .page-info-text{font-size:0.85rem;color:var(--text-dim);line-height:1.85}

      /* ── FOLIO FOOTNOTE — boxless marginal annotation, preferred over .page-info ── */
      .folio-footnote{
        font-family:'Inter',sans-serif;font-size:0.88rem;color:var(--text-dim);line-height:1.85;
        max-width:680px;margin:0 0 2.2rem;padding-left:1rem;border-left:2px solid var(--border-brass);
      }
      .folio-footnote strong{color:var(--vellum);font-weight:600}

      /* ── CARDS — bound ledger pages ── */
      .card{
        background:var(--bg-card);
        border:1px solid var(--border);
        border-radius:6px;
        padding:1.8rem;
        transition:border-color 0.2s,box-shadow 0.2s;
        box-shadow:var(--shadow-card);
        position:relative;
        overflow:hidden;
      }
      .card::before{
        content:'';position:absolute;top:0;left:0;right:0;height:2px;
        background:linear-gradient(90deg,var(--seal),transparent 60%);
        opacity:0.5;
      }
      .card:hover{border-color:var(--border-hover)}
      .card-header{
        display:flex;align-items:center;justify-content:space-between;
        margin-bottom:1.4rem;padding-bottom:1rem;
        border-bottom:1px solid var(--border);
      }
      .card-title{
        font-family:var(--font-display);
        font-size:1rem;letter-spacing:0.01em;color:var(--vellum);font-weight:600;
        display:flex;align-items:center;gap:0.6rem;
      }
      .card-title svg{width:14px;height:14px;color:var(--seal);flex-shrink:0}
      .card-badge{
        font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;
        color:var(--text-dim);background:var(--silver-dim);
        padding:0.22rem 0.65rem;border:1px solid var(--border);border-radius:3px;
        font-family:var(--font-mono);
      }
      body.crystal .card{backdrop-filter:blur(var(--crystal-blur));-webkit-backdrop-filter:blur(var(--crystal-blur))}

      /* ── FORMS ── */
      .form-section{margin-top:1.6rem;padding-top:1.4rem;border-top:1px solid var(--border)}
      .form-row{display:grid;grid-template-columns:1fr 1fr;gap:0.85rem;margin-bottom:0.85rem}
      .form-group{display:flex;flex-direction:column;gap:0.4rem}
      label{
        font-size:0.64rem;letter-spacing:0.1em;text-transform:uppercase;
        color:var(--text-dim);font-weight:700;font-family:var(--font-mono);
      }
      select,input[type=text],input[type=number],textarea{
        background:var(--input-bg);
        border:1px solid var(--border-hover);
        border-radius:3px;
        color:var(--text);
        padding:0.75rem 1rem;
        font-family:'Inter',sans-serif;
        font-size:0.9rem;
        width:100%;outline:none;
        transition:border-color 0.15s,box-shadow 0.15s;
        appearance:none;-webkit-appearance:none;
      }
      textarea{resize:vertical;min-height:100px}
      select:focus,input:focus,textarea:focus{
        border-color:var(--seal);
        box-shadow:0 0 0 3px var(--seal-glow);
        background:var(--bg-card);
      }
      select option{background:var(--bg-mid)}
      .btn-submit{
        background:transparent;
        color:var(--text);border:1px solid var(--seal);
        padding:0.9rem 1.5rem;
        font-family:var(--font-mono);
        font-size:0.7rem;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;
        cursor:pointer;width:100%;margin-top:0.6rem;
        border-radius:3px;
        transition:background 0.15s,color 0.15s;
      }
      .btn-submit:hover{background:var(--seal);color:var(--vellum-bright)}
      .btn-submit:active{opacity:0.85}
      .typ-toggle{display:flex;gap:0.4rem;margin-bottom:1rem}
      .typ-btn{
        flex:1;padding:0.6rem;background:transparent;
        border:1px solid var(--border-hover);
        border-radius:3px;
        color:var(--text-muted);font-family:var(--font-mono);
        font-size:0.64rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;cursor:pointer;
        transition:color 0.15s,border-color 0.15s,background 0.15s;
      }
      .typ-btn:hover{color:var(--text);border-color:var(--border-hover)}
      .typ-btn.active-vklad{background:rgba(58,125,45,0.12);border-color:rgba(58,125,45,0.4);color:#6FBF52}
      .typ-btn.active-vyber{background:var(--seal-glow);border-color:var(--border-seal);color:var(--seal-bright)}
      .info-box{
        background:var(--gold-dim);border:1px solid var(--border-brass);
        padding:0.85rem 1.1rem;font-size:0.82rem;color:var(--text-dim);margin-top:0.9rem;display:none;
      }

      /* ── TOP STATS STRIP ── */
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2rem}
      .stat{
        background:var(--bg-card);
        border:1px solid var(--border);
        border-top:2px solid var(--seal);
        border-radius:4px;
        padding:1.6rem 1.8rem;
        transition:border-color 0.2s,transform 0.2s;
        position:relative;overflow:hidden;
        box-shadow:var(--shadow-card);
        cursor:default;
      }
      .stat:hover{border-top-color:var(--brass);transform:translateY(-2px)}
      .stat-label{font-size:0.6rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.65rem;font-weight:700;font-family:var(--font-mono)}
      .stat-value{font-family:var(--font-display);font-size:2.1rem;font-weight:700;color:var(--vellum);line-height:1}
      .stat-sub{font-size:0.72rem;color:var(--text-dim);margin-top:0.55rem;font-family:var(--font-mono)}

      /* ── SKLAD ── */
      .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem}
      .sklad-row{
        display:flex;justify-content:space-between;align-items:center;
        padding:0.7rem 0;border-bottom:1px solid var(--border);
        font-size:0.88rem;
        transition:background 0.15s,padding 0.15s;
      }
      .sklad-row:last-child{border-bottom:none}
      .sklad-row:hover{background:var(--seal-glow);margin:0 -0.5rem;padding-left:0.5rem;padding-right:0.5rem}
      .sklad-row em{color:var(--brass);font-style:normal;margin-left:0.5rem;font-size:0.7rem;opacity:0.9;font-family:var(--font-mono)}

      /* ── TOAST ── */
      .toast{
        position:fixed;bottom:1.5rem;right:1.5rem;
        background:var(--bg-card3);
        border:1px solid var(--border);
        border-left:3px solid #6FBF52;
        border-radius:4px;
        padding:0.9rem 1.4rem;font-size:0.8rem;
        transform:translateY(20px);opacity:0;
        transition:transform 0.25s ease,opacity 0.25s ease;
        z-index:999;max-width:340px;
        box-shadow:var(--shadow);
        font-family:'Inter',sans-serif;
      }
      .toast.show{transform:translateY(0);opacity:1}
      .toast.error{border-left-color:var(--seal-bright)}

      /* ── TABULKY — ledger rows ── */
      /* ── TABULKY — true ledger with column rules, not zebra-striped UI tables ── */
      .table-wrap{overflow-x:auto}
      table{width:100%;border-collapse:collapse;font-size:0.86rem;border-top:2px solid var(--brass);border-bottom:2px solid var(--brass)}
      th{
        font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;
        color:var(--brass);padding:0.75rem 1rem;text-align:left;
        border-bottom:1px solid var(--border-brass);
        font-family:var(--font-mono);
        background:transparent;
      }
      th + th{border-left:1px solid var(--border)}
      td{padding:0.68rem 1rem;border-bottom:1px solid var(--border);color:var(--text-dim);font-size:0.86rem}
      td + td{border-left:1px solid var(--border)}
      tr:last-child td{border-bottom:none}
      tbody tr:nth-child(even) td{background:transparent}
      tr:hover td{background:var(--seal-glow);color:var(--text)}
      .badge{
        font-size:0.6rem;padding:0.22rem 0.7rem;
        letter-spacing:0.08em;text-transform:uppercase;font-weight:600;
        border-radius:3px;font-family:var(--font-mono);
      }
      .badge.vklad{background:rgba(58,125,45,0.12);color:#6FBF52;border:1px solid rgba(58,125,45,0.3)}
      .badge.vyber{background:var(--seal-glow);color:var(--seal-bright);border:1px solid var(--border-seal)}
      .badge.prijem{background:rgba(58,125,45,0.12);color:#6FBF52;border:1px solid rgba(58,125,45,0.3)}
      .badge.vydaj{background:var(--seal-glow);color:var(--seal-bright);border:1px solid var(--border-seal)}

      /* ── NÁSTĚNKA ── */
      .nastenska-list{display:flex;flex-direction:column;gap:1rem}
      .nastenska-item{
        background:var(--bg-card);border:1px solid var(--border);
        border-left:3px solid var(--border);
        border-radius:4px;
        padding:1.5rem 1.8rem;transition:border-color 0.2s,background 0.2s;
        position:relative;overflow:hidden;
      }
      .nastenska-item:hover{border-left-color:var(--text-dim);background:var(--bg-card2)}
      .nastenska-item.new{border-left-color:var(--seal)}
      .nastenska-meta{font-size:0.66rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.6rem;font-weight:600;font-family:var(--font-mono)}
      .nastenska-title{font-family:var(--font-display);font-size:1.12rem;margin-bottom:0.55rem;color:var(--vellum);font-weight:600}
      .nastenska-content{font-size:0.92rem;color:var(--text-dim);line-height:1.85;white-space:pre-wrap}
      .new-badge{
        display:inline-block;font-size:0.56rem;letter-spacing:0.08em;text-transform:uppercase;
        background:var(--seal);color:var(--vellum-bright);padding:0.16rem 0.55rem;margin-left:0.55rem;vertical-align:middle;font-weight:700;
        border-radius:2px;font-family:var(--font-mono);
      }

      /* ── KODEX ── */
      .kodex-section{margin-bottom:2.5rem}
      .kodex-number{font-family:var(--font-display);font-size:3.5rem;color:var(--seal);opacity:0.18;float:left;line-height:1;margin-right:1.2rem;margin-top:-0.3rem;font-weight:700}
      .kodex-rule{font-size:0.92rem;line-height:2;color:var(--text-dim);overflow:hidden}
      .kodex-rule strong{color:var(--vellum);font-weight:600}
      .kodex-divider{height:1px;background:var(--border);margin:1.8rem 0}

      /* ── STATISTIKY — personnel dossiers, not dashboard cards ── */
      .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:2rem 1.6rem}
      .stat-card{
        background:var(--bg-card);border:1px solid var(--border);border-radius:2px 8px 8px 8px;
        padding:1.7rem 1.7rem 1.5rem;transition:border-color 0.25s,transform 0.25s;
        box-shadow:var(--shadow-card);
        position:relative;overflow:visible;
        margin-top:0.4rem;
      }
      .stat-card::before{
        content:'';position:absolute;left:0;right:0;bottom:-5px;height:5px;
        background:var(--bg-card3);border-radius:0 0 6px 6px;opacity:0.6;
        z-index:-1;
      }
      .stat-card:hover{border-color:var(--border-hover);transform:translateY(-3px)}
      .stat-card-tab{
        position:absolute;top:-0.4rem;right:1.4rem;
        background:var(--seal);color:var(--vellum-bright);
        font-family:var(--font-mono);font-size:0.6rem;font-weight:700;letter-spacing:0.08em;
        padding:0.22rem 0.6rem;border-radius:2px 2px 0 0;
        box-shadow:0 -1px 0 var(--brass) inset;
      }
      .stat-card-header{
        display:flex;justify-content:space-between;align-items:flex-start;
        margin-bottom:1.2rem;padding-bottom:1rem;border-bottom:1px solid var(--border-brass);
        padding-right:2.6rem;
      }
      .stat-card-name{font-family:var(--font-display);font-size:1.18rem;color:var(--vellum-bright);font-weight:600}
      .stat-card-discord{font-size:0.66rem;letter-spacing:0.04em;color:var(--text-muted);margin-top:0.3rem;font-family:var(--font-mono)}
      .stat-row{display:flex;justify-content:space-between;font-size:0.86rem;padding:0.35rem 0;color:var(--text-dim)}
      .stat-row strong{color:var(--text);font-weight:600}
      .stat-section-label{
        font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--brass);font-weight:700;
        margin-top:0.9rem;margin-bottom:0.4rem;
        padding-top:0.65rem;border-top:1px dotted var(--border-hover);
        font-family:var(--font-mono);
      }
      .stat-section-label:first-of-type{border-top:none;margin-top:0}
      .stat-item-group{margin-left:0.5rem}

      /* ── LORE / HIERARCHY — open-book spread with a spine shadow ── */
      .lore-grid{
        display:grid;grid-template-columns:1fr 320px;gap:0;align-items:start;
        position:relative;
      }
      .lore-grid::before{
        content:'';position:absolute;left:calc(100% - 320px - 1.6rem);top:0;bottom:0;width:3rem;
        background:linear-gradient(90deg,transparent,rgba(0,0,0,0.18),transparent);
        pointer-events:none;z-index:1;
      }
      body.light .lore-grid::before{background:linear-gradient(90deg,transparent,rgba(0,0,0,0.05),transparent)}
      .chapters{display:flex;flex-direction:column;gap:3rem;padding-right:3rem}
      .chapter{
        border-left:2px solid var(--border);
        padding-left:2rem;position:relative;
        transition:border-color 0.3s;
      }
      .chapter:hover{border-left-color:var(--seal)}
      .chapter::before{
        content:'';position:absolute;left:-5px;top:6px;
        width:8px;height:8px;border-radius:50%;
        background:var(--seal);opacity:0.6;
        transition:opacity 0.2s;
      }
      .chapter:hover::before{opacity:1}
      .chapter-meta{font-size:0.6rem;letter-spacing:0.3em;text-transform:uppercase;color:var(--seal-bright);margin-bottom:0.8rem;font-weight:600;font-family:var(--font-mono)}
      .chapter-title{font-family:var(--font-display);font-size:1.5rem;color:var(--vellum);margin-bottom:1.1rem;font-weight:600}
      .chapter-text{font-family:'Inter',sans-serif;font-size:0.95rem;line-height:2.05;color:var(--text-dim);white-space:pre-line}
      .chapter-text.with-dropcap::first-letter{
        font-family:var(--font-display);font-weight:700;font-size:3.6em;line-height:0.8;
        float:left;padding:0.06em 0.1em 0 0;color:var(--brass);
      }
      .sidebar{
        background:var(--bg-card);border:1px solid var(--border);border-radius:6px;
        padding:2rem;position:sticky;top:calc(var(--nav-h) + 1.5rem);
        box-shadow:var(--shadow-card);margin-left:1.6rem;
      }
      .sidebar-title{
        font-family:var(--font-mono);font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;
        margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid var(--border);color:var(--brass);
      }
      .toc-item{
        font-size:0.82rem;padding:0.65rem 0;border-bottom:1px solid var(--border);
        color:var(--text-dim);display:flex;gap:0.8rem;align-items:center;
        transition:color 0.2s;cursor:default;
      }
      .toc-item:last-child{border-bottom:none}
      .toc-item:hover{color:var(--text)}
      .toc-num{color:var(--seal);font-weight:700;min-width:1.5rem;font-family:var(--font-mono);font-size:0.8rem}
      .rank-item{
        display:flex;align-items:flex-start;gap:1.5rem;
        padding:1.8rem 2rem;
        background:var(--bg-card);
        border:1px solid var(--border);
        border-top:none;transition:border-color 0.2s,background 0.2s;
        position:relative;
      }
      .rank-item:first-child{border-top:1px solid var(--border)}
      .rank-item::before{
        content:'';position:absolute;left:0;top:0;bottom:0;width:2px;
        background:var(--seal);opacity:0;transition:opacity 0.2s;
      }
      .rank-item:hover::before{opacity:1}
      .rank-item:hover{background:var(--bg-card2)}
      .rank-item.founder{border-top:1px solid var(--border-seal)!important;background:var(--bg-card2)}
      .rank-num{font-family:var(--font-display);font-size:1.7rem;color:var(--seal);opacity:0.35;min-width:2.5rem;line-height:1;font-weight:700}
      .rank-item.founder .rank-num{opacity:0.85;color:var(--brass)}
      .rank-info h3{font-family:var(--font-display);font-size:1.05rem;color:var(--vellum);margin-bottom:0.25rem;font-weight:600}
      .rank-info .rank-member{font-size:0.84rem;color:var(--text-dim);margin-bottom:0.5rem;font-family:var(--font-mono)}
      .rank-info p{font-size:0.88rem;color:var(--text-dim);line-height:1.8}
      .rank-rights{margin-top:0.8rem;display:flex;flex-wrap:wrap;gap:0.35rem}
      .rank-right-tag{
        font-size:0.6rem;letter-spacing:0.08em;padding:0.25rem 0.7rem;
        background:var(--silver-dim);border:1px solid var(--border);
        color:var(--text-dim);white-space:nowrap;font-weight:500;border-radius:2px;
        transition:border-color 0.2s,color 0.2s;font-family:var(--font-mono);
      }
      .rank-right-tag:hover{border-color:var(--seal);color:var(--text)}

      .breakdown-row{display:flex;justify-content:space-between;padding:0.45rem 0;font-size:0.88rem;color:var(--text-dim);border-bottom:1px solid var(--border)}
      .breakdown-row:last-child{border-bottom:none;color:var(--text);padding-top:0.7rem;margin-top:0.3rem}
      .breakdown-row .green{color:#6FBF52}
      .bd-label{display:flex;align-items:center;gap:0.4rem}
      .slider-wrap{margin:1.5rem 0}
      .slider{-webkit-appearance:none;width:100%;height:4px;background:linear-gradient(90deg,rgba(58,125,45,0.5) var(--pct,50%),var(--border-hover) var(--pct,50%));outline:none}
      .slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--brass);cursor:pointer;border:2px solid var(--bg);box-shadow:0 0 8px var(--seal-glow)}
      .slider-labels{display:flex;justify-content:space-between;font-size:0.66rem;color:var(--text-muted);letter-spacing:0.08em;margin-top:0.4rem;font-family:var(--font-mono)}
      .profit-bar{height:5px;background:var(--border);margin-top:1rem;position:relative;overflow:hidden}
      .profit-fill{height:100%;background:linear-gradient(90deg,rgba(58,125,45,0.5),#6FBF52);transition:width 0.4s}
      .profit-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-top:1.5rem}
      .profit-stat{background:var(--bg-card);border:1px solid var(--border);padding:0.9rem 1rem;text-align:center;border-radius:4px}
      .profit-stat-label{font-size:0.56rem;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;color:var(--text-muted);margin-bottom:0.55rem;font-family:var(--font-mono)}
      .profit-stat-num{font-family:var(--font-display);font-size:1.4rem;color:var(--vellum);line-height:1;font-weight:700}

      /* ── CONFIRM MODAL — the wax seal moment ── */
      .modal-overlay{
        position:fixed;inset:0;background:rgba(0,0,0,0.86);z-index:1000;
        display:flex;align-items:center;justify-content:center;
        opacity:0;pointer-events:none;transition:opacity 0.25s;
        backdrop-filter:blur(8px);
      }
      .modal-overlay.open{opacity:1;pointer-events:all}
      .modal-box{
        background:var(--bg-card);
        border:1px solid var(--border-brass);
        border-top:2px solid var(--seal);
        padding:2.5rem;max-width:420px;width:90%;
        box-shadow:var(--shadow);
        transform:translateY(20px) scale(0.97);
        transition:transform 0.25s cubic-bezier(0.22,1,0.36,1);
        position:relative;border-radius:6px;
      }
      .modal-overlay.open .modal-box{transform:translateY(0) scale(1)}
      .modal-title{font-family:var(--font-display);font-size:1.15rem;font-weight:600;margin-bottom:0.6rem;color:var(--vellum)}
      .modal-subtitle{font-size:0.84rem;color:var(--text-dim);line-height:1.7;margin-bottom:1.8rem}
      .modal-detail{
        background:var(--bg-mid);border:1px solid var(--border-hover);
        padding:0.9rem 1.1rem;margin-bottom:1.6rem;font-size:0.83rem;color:var(--text-dim);
        display:grid;grid-template-columns:auto 1fr;gap:0.35rem 1rem;
      }
      .modal-detail dt{font-size:0.6rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--brass);padding-top:0.1rem;font-family:var(--font-mono)}
      .modal-detail dd{color:var(--text);font-weight:500}
      .modal-actions{display:flex;gap:0.75rem}
      .modal-btn-cancel{
        flex:1;padding:0.75rem;background:transparent;border:1px solid var(--border-hover);
        color:var(--text-muted);font-family:var(--font-mono);font-size:0.68rem;
        letter-spacing:0.14em;text-transform:uppercase;cursor:pointer;transition:all 0.2s;
      }
      .modal-btn-cancel:hover{border-color:var(--border-hover);color:var(--text)}
      .modal-btn-confirm{
        flex:2;padding:0.75rem;
        background:var(--seal);
        color:var(--vellum-bright);border:1px solid var(--seal);font-family:var(--font-mono);
        font-size:0.68rem;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;
        cursor:pointer;transition:opacity 0.2s;border-radius:3px;
      }
      .modal-btn-confirm:hover{opacity:0.85}
      .modal-btn-confirm:disabled{cursor:default;opacity:0.7}

      /* ── SEAL STAMP — wax seal slamming down on confirm ── */
      .modal-box{overflow:visible}
      .seal-stamp{
        position:absolute;top:50%;left:50%;
        width:108px;height:108px;border-radius:50%;
        transform:translate(-50%,-50%) translateY(-340px) scale(2.2) rotate(-18deg);
        opacity:0;pointer-events:none;z-index:50;
        display:flex;align-items:center;justify-content:center;
        background:radial-gradient(circle at 35% 30%, var(--seal-bright), var(--seal) 55%, var(--seal-deep) 100%);
        box-shadow:0 18px 40px rgba(0,0,0,0.5), inset 0 0 0 3px rgba(0,0,0,0.18), inset 0 2px 6px rgba(255,255,255,0.12);
      }
      .seal-stamp::before{
        content:'';position:absolute;inset:9px;border-radius:50%;
        border:1.5px solid rgba(0,0,0,0.22);
      }
      .seal-stamp span{
        font-family:var(--font-display);font-weight:700;font-size:2.1rem;
        color:rgba(0,0,0,0.32);letter-spacing:0.02em;
        text-shadow:0 1px 0 rgba(255,255,255,0.08);
      }
      .seal-stamp.slam{
        animation:sealSlam 0.62s cubic-bezier(0.32,0.04,0.5,1) forwards;
      }
      @keyframes sealSlam{
        0%{opacity:0;transform:translate(-50%,-50%) translateY(-340px) scale(2.2) rotate(-18deg)}
        55%{opacity:1;transform:translate(-50%,-50%) translateY(0) scale(1.18) rotate(-6deg)}
        68%{transform:translate(-50%,-50%) translateY(0) scale(0.94) rotate(-9deg)}
        80%{transform:translate(-50%,-50%) translateY(0) scale(1.04) rotate(-7deg)}
        100%{opacity:1;transform:translate(-50%,-50%) translateY(0) scale(1) rotate(-8deg)}
      }
      .seal-stamp.fade-out{
        animation:sealFadeOut 0.3s ease-in forwards;
      }
      @keyframes sealFadeOut{
        0%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(-8deg)}
        100%{opacity:0;transform:translate(-50%,-50%) scale(1.15) rotate(-8deg)}
      }
      .modal-box.stamped .modal-title,.modal-box.stamped .modal-subtitle,.modal-box.stamped .modal-detail,.modal-box.stamped .modal-actions{
        transition:opacity 0.2s;opacity:0.25;
      }
      @keyframes modalThud{
        0%{transform:translateY(0) scale(1)}
        56%{transform:translateY(2px) scale(0.992)}
        100%{transform:translateY(0) scale(1)}
      }
      .modal-box.thud{animation:modalThud 0.62s cubic-bezier(0.32,0.04,0.5,1) 1}

      /* ── ACTIVITY FEED ── */
      .activity-item{
        display:flex;align-items:flex-start;gap:0.9rem;
        padding:0.7rem 0;border-bottom:1px solid var(--border);
        transition:background 0.15s;
      }
      .activity-item:last-child{border-bottom:none}
      .activity-item:hover{background:var(--seal-glow);margin:0 -0.5rem;padding-left:0.5rem;padding-right:0.5rem}
      .activity-icon{
        width:28px;height:28px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:0.75rem;flex-shrink:0;margin-top:0.1rem;
        background:var(--silver-dim);border:1px solid var(--border);
      }
      .activity-body{flex:1;min-width:0}
      .activity-main{font-size:0.86rem;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .activity-meta{font-size:0.68rem;color:var(--text-muted);margin-top:0.2rem;letter-spacing:0.05em;font-family:var(--font-mono)}
      .activity-source-web{color:var(--seal-bright)}
      .activity-source-bot{color:var(--text-dim)}

      /* ── HOME DASHBOARD EXTRA ── */
      .home-hero{
        background:var(--bg-card);
        border:1px solid var(--border-brass);
        border-left:3px solid var(--seal);
        padding:2rem 2.5rem;margin-bottom:2rem;
        position:relative;overflow:hidden;
        display:flex;align-items:center;justify-content:space-between;gap:2rem;
        border-radius:6px;
      }
      .quick-actions{display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:1.5rem}
      .quick-btn{
        display:inline-flex;align-items:center;gap:0.5rem;
        padding:0.6rem 1.2rem;background:rgba(201,162,39,0.03);
        border:1px solid var(--border);color:var(--text-dim);
        font-size:0.64rem;letter-spacing:0.16em;text-transform:uppercase;font-weight:600;
        text-decoration:none;transition:all 0.2s;
        font-family:var(--font-mono);
        border-radius:2px;
      }
      .quick-btn:hover{background:var(--seal-glow);border-color:var(--border-seal);color:var(--text);transform:translateY(-2px)}
      .quick-btn svg{width:13px;height:13px;opacity:0.7}

      /* ── MINI STOCK BARS ── */
      .mini-stock-row{display:flex;align-items:center;gap:0.8rem;padding:0.5rem 0;border-bottom:1px solid var(--border)}
      .mini-stock-row:last-child{border-bottom:none}
      .mini-stock-name{font-size:0.82rem;color:var(--text-dim);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .mini-stock-bar-wrap{width:80px;height:4px;background:var(--border);position:relative;border-radius:2px;flex-shrink:0}
      .mini-stock-bar-fill{height:100%;background:linear-gradient(90deg,var(--seal),var(--brass));border-radius:2px;transition:width 0.6s ease}
      .mini-stock-qty{font-size:0.78rem;color:var(--text);font-weight:500;min-width:36px;text-align:right;flex-shrink:0;font-family:var(--font-mono)}

      @media(max-width:1200px){.nav-menu a .nav-desc{display:none}}
      @media(max-width:900px){.grid,.stats{grid-template-columns:1fr!important}.lore-grid{grid-template-columns:1fr}.lore-grid::before{display:none}.chapters{padding-right:0}.sidebar{margin-left:0}.sidebar{position:static}}
      @media(max-width:768px){.profit-grid{grid-template-columns:repeat(2,1fr)!important}main{padding:1.5rem 1rem}}
      @media(max-width:640px){
        .page-header{flex-direction:column;align-items:flex-start;gap:0.8rem}
        .form-row{grid-template-columns:1fr}
        .stats{grid-template-columns:repeat(2,1fr)!important}
        .profit-grid{grid-template-columns:1fr 1fr!important}
        .modal-box{padding:1.8rem 1.4rem}
        .modal-detail{grid-template-columns:1fr;gap:0.15rem 0}
        .modal-detail dt{padding-top:0.4rem}
        table{font-size:0.78rem}
        th,td{padding:0.6rem 0.7rem}
        .card{padding:1.3rem}
        .nav-logo-text{font-size:0.95rem}
        .typ-toggle{flex-direction:column}
      }
      @media(max-width:420px){
        .stats{grid-template-columns:1fr!important}
      }

      /* ── NAV DROPDOWN ── */
      .nav-dropdown{position:relative;height:100%}
      .nav-drop-trigger{
        display:flex;align-items:center;flex-direction:column;justify-content:center;
        padding:0 1.15rem;height:100%;
        font-size:0.66rem;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;
        color:var(--text-dim);text-decoration:none;
        border-bottom:2px solid transparent;
        transition:color 0.2s,border-color 0.2s,background 0.2s;
        white-space:nowrap;position:relative;gap:0.22rem;cursor:pointer;
        font-family:'Inter',sans-serif;
      }
      .nav-drop-trigger:hover,.nav-dropdown:hover .nav-drop-trigger{color:var(--text);background:var(--silver-dim)}
      .nav-drop-trigger.active{color:var(--brass-bright);border-bottom-color:var(--seal);background:var(--silver-dim)}
      .nav-drop-arrow{width:9px;height:6px;margin-top:2px;opacity:0.4;transition:transform 0.2s,opacity 0.2s;flex-shrink:0}
      .nav-dropdown.open .nav-drop-arrow{transform:rotate(180deg);opacity:0.7}
      .nav-dropdown-menu{
        position:absolute;top:100%;left:50%;
        transform:translateX(-50%) translateY(-4px);
        background:var(--bg-card);
        border:1px solid var(--border-brass);
        border-radius:4px;
        min-width:190px;
        margin-top:0;
        padding-top:8px;
        box-shadow:var(--shadow-card);
        opacity:0;pointer-events:none;
        transition:opacity 0.18s,transform 0.18s;
        z-index:300;
      }
      .nav-dropdown-menu::before{
        content:'';position:absolute;top:-8px;left:0;right:0;height:8px;
      }
      body.crystal .nav-dropdown-menu{backdrop-filter:blur(var(--crystal-blur));-webkit-backdrop-filter:blur(var(--crystal-blur))}
      .nav-dropdown.open .nav-dropdown-menu{opacity:1;pointer-events:all;transform:translateX(-50%) translateY(0)}
      .nav-dropdown-menu a{
        display:block;padding:0.7rem 1.2rem;
        font-size:0.7rem;letter-spacing:0.06em;text-transform:uppercase;font-weight:500;
        color:var(--text-dim);text-decoration:none;
        border-bottom:1px solid var(--border);
        transition:color 0.15s,background 0.15s;
        white-space:nowrap;
      }
      .nav-dropdown-menu a:first-child{border-radius:4px 4px 0 0}
      .nav-dropdown-menu a:last-child{border-bottom:none;border-radius:0 0 4px 4px}
      .nav-dropdown-menu a:hover{color:var(--text);background:var(--silver-dim)}
      .nav-dropdown-menu a.active{color:var(--seal-bright);background:var(--seal-glow)}

      .nav-dropdown-menu.mega{min-width:220px;width:max-content;max-width:96vw;padding:0.4rem}
      .bb-group{position:relative}
      .bb-group-title{
        display:flex;align-items:center;justify-content:space-between;gap:0.5rem;
        font-size:0.7rem;letter-spacing:0.04em;font-weight:600;
        color:var(--text-dim);padding:0.55rem 0.7rem;border-radius:4px;cursor:pointer;white-space:nowrap;
      }
      .bb-group-title:hover,.bb-group.open .bb-group-title{color:var(--text);background:var(--silver-dim)}
      .bb-group-title .bb-arrow{
        width:0;height:0;flex:none;
        border-top:4px solid transparent;border-bottom:4px solid transparent;
        border-left:5px solid currentColor;opacity:0.6;transition:transform 0.15s;
      }
      .bb-group.open .bb-group-title .bb-arrow{transform:rotate(90deg)}
      .bb-submenu{display:none;flex-direction:column;padding:0.2rem 0 0.3rem 0}
      .bb-group.open .bb-submenu{display:flex}
      .nav-dropdown-menu.mega .bb-submenu a{
        padding:0.4rem 0.7rem 0.4rem 1.6rem;
        font-size:0.66rem;letter-spacing:0.03em;text-transform:none;font-weight:400;
        border-bottom:none;color:var(--text-dim);border-radius:4px;
      }
      .nav-dropdown-menu.mega .bb-submenu a:hover{color:var(--text);background:var(--silver-dim)}

      /* ── LEDGER LOADING — ink settling, not a spinner ── */
      .ledger-loading{
        display:flex;align-items:center;gap:0.7rem;
        color:var(--text-dim);font-size:0.85rem;
        padding:0.4rem 0;
      }
      .ledger-loading::before{
        content:'';width:9px;height:9px;border-radius:50%;flex-shrink:0;
        background:var(--seal);
        animation:ledgerInkPulse 1.3s ease-in-out infinite;
      }
      @keyframes ledgerInkPulse{
        0%,100%{box-shadow:0 0 0 0 var(--seal-glow);opacity:0.55}
        50%{box-shadow:0 0 0 6px var(--seal-glow);opacity:1}
      }

      /* ── LEDGER EMPTY STATE — an unwritten page ── */
      .ledger-empty{
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:0.9rem;padding:2.2rem 1.5rem;text-align:center;
      }
      .ledger-empty svg{width:64px;height:48px;opacity:0.5;flex-shrink:0}
      .ledger-empty-text{font-size:0.82rem;color:var(--text-muted);font-family:var(--font-mono);letter-spacing:0.02em}
      .ledger-empty.compact{padding:1.1rem 0.5rem;gap:0.6rem}
      .ledger-empty.compact svg{width:42px;height:32px}
      .ledger-empty.compact .ledger-empty-text{font-size:0.76rem}

      /* ══════════════════════════════════════════════════════════════════
         FOLIO SYSTEM — the page-as-document primitives.
         Not dashboard widgets: a register you read, not a grid you scan.
         ══════════════════════════════════════════════════════════════════ */

      /* ── Oversized figures — the number does the talking ── */
      .folio-mega{
        font-family:var(--font-display);
        font-weight:600;
        font-size:clamp(3.8rem, 11vw, 8.5rem);
        line-height:0.92;
        color:var(--vellum-bright);
        letter-spacing:-0.01em;
        font-variant-numeric:oldstyle-nums;
      }
      .folio-mega .unit{
        font-size:0.32em;font-family:var(--font-mono);font-weight:500;
        color:var(--brass);letter-spacing:0.02em;margin-left:0.15em;
        vertical-align:0.18em;
      }
      .folio-mega.seal-tint{color:var(--seal-bright)}

      /* ── Marginalia — small annotations that live in the margin, not in a box ── */
      .marginalia{
        font-family:var(--font-mono);
        font-size:0.68rem;
        letter-spacing:0.06em;
        color:var(--text-muted);
        line-height:1.9;
        border-left:1px solid var(--border);
        padding-left:1rem;
      }
      .marginalia strong{color:var(--brass);font-weight:600}
      .marginalia .m-line{display:flex;justify-content:space-between;gap:1rem;padding:0.3rem 0;border-bottom:1px solid var(--border)}
      .marginalia .m-line:last-child{border-bottom:none}
      .marginalia .m-line .m-val{color:var(--vellum);font-weight:500}

      /* ── Folio rule — a full-bleed line like a newspaper column break ── */
      .folio-rule{
        height:1px;background:linear-gradient(90deg,var(--seal) 0%,var(--border) 40%,var(--border) 60%,var(--brass) 100%);
        opacity:0.4;margin:2.5rem 0;
      }
      .folio-rule.tight{margin:1.4rem 0;opacity:0.25}

      /* ── Folio label — small caps running head, like a chapter marker ── */
      .folio-label{
        font-family:var(--font-mono);
        font-size:0.64rem;letter-spacing:0.3em;text-transform:uppercase;
        color:var(--seal-bright);font-weight:600;
        display:flex;align-items:center;gap:0.8em;
      }
      .folio-label::after{content:'';flex:1;height:1px;background:var(--border);margin-top:1px}

      /* ── Asymmetric two-column folio — text dominant, figures in margin ── */
      .folio-spread{
        display:grid;
        grid-template-columns:1fr 280px;
        gap:3.5rem;
        align-items:start;
      }
      .folio-spread.reverse{grid-template-columns:280px 1fr}

      /* ── Drop-stat — a number that overlaps its own label, no box around it ── */
      .drop-stat{position:relative;padding-top:0.3rem}
      .drop-stat-label{
        font-family:var(--font-mono);font-size:0.62rem;letter-spacing:0.18em;
        text-transform:uppercase;color:var(--text-muted);margin-bottom:-0.3em;
        position:relative;z-index:2;
      }
      .drop-stat-value{
        font-family:var(--font-display);font-weight:700;
        font-size:clamp(2.2rem,5vw,3.4rem);line-height:1;color:var(--vellum);
        position:relative;z-index:1;
      }
      .drop-stat-sub{font-family:var(--font-mono);font-size:0.66rem;color:var(--text-muted);margin-top:0.4rem}

      /* ── Seal-anchor — the wax seal as a structural element bridging two blocks ── */
      .seal-anchor{
        width:56px;height:56px;border-radius:50%;flex-shrink:0;
        border:1.5px solid var(--brass);
        display:flex;align-items:center;justify-content:center;
        font-family:var(--font-display);font-weight:700;font-size:1.3rem;color:var(--brass);
        background:var(--ink);
        box-shadow:0 0 0 5px var(--bg), 0 0 20px var(--seal-glow);
        position:relative;z-index:3;
      }
      .seal-anchor::before{content:'';position:absolute;inset:5px;border-radius:50%;border:1px solid var(--border-brass)}

      /* ── Manifest row — a ledger line with running dots, like a table of contents ── */
      .manifest-row{
        display:flex;align-items:baseline;gap:0.6rem;
        padding:0.85rem 0;border-bottom:1px solid var(--border);
        font-size:0.92rem;
      }
      .manifest-row:last-child{border-bottom:none}
      .manifest-row .mr-name{color:var(--vellum);font-family:var(--font-display);font-weight:500;flex-shrink:0}
      .manifest-row .mr-dots{flex:1;border-bottom:1px dotted var(--border-hover);transform:translateY(-0.35em);min-width:1rem}
      .manifest-row .mr-val{font-family:var(--font-mono);color:var(--text-dim);flex-shrink:0;font-size:0.85rem}
      .manifest-row:hover .mr-name{color:var(--seal-bright)}

      /* ── Manifest column — the heading above a manifest-row group ── */
      .manifest-col{padding-top:0.2rem}
      .manifest-col-head{
        display:flex;align-items:baseline;justify-content:space-between;
        margin-bottom:0.9rem;padding-bottom:0.7rem;border-bottom:1px solid var(--border-brass);
      }
      .manifest-col-title{font-family:var(--font-display);font-weight:600;font-size:1.15rem;color:var(--vellum)}
      .manifest-col-count{font-family:var(--font-mono);font-size:0.78rem;color:var(--text-muted)}
      .manifest-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0 2.6rem}

      /* ── Folio panel — replaces .card for document-style sections (no box, just rule) ── */
      .folio-panel{position:relative;padding-top:0.5rem}
      .folio-panel + .folio-panel{margin-top:2.2rem}

      /* ── Ledger bar — a hand-ruled bar chart row, not a UI progress bar ── */
      .ledger-bar-row{
        display:grid;grid-template-columns:1fr 2.6fr auto;gap:1rem;
        align-items:baseline;padding:0.55rem 0;border-bottom:1px solid var(--border);
      }
      .ledger-bar-row:last-child{border-bottom:none}
      .ledger-bar-name{font-family:var(--font-display);font-size:0.92rem;color:var(--vellum);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ledger-bar-track{position:relative;height:1px;background:var(--border);align-self:center}
      .ledger-bar-fill{position:absolute;top:-3px;bottom:-3px;left:0;background:linear-gradient(90deg,var(--seal) 0%,var(--brass) 100%);opacity:0.85}
      .ledger-bar-fill::after{content:'';position:absolute;right:-1px;top:0;bottom:0;width:1px;background:var(--brass-bright)}
      .ledger-bar-val{font-family:var(--font-mono);font-size:0.82rem;color:var(--vellum);text-align:right;white-space:nowrap}

      /* ── Report figure row — replaces the 4-box "Today/Week/Month/Total" card strip ── */
      .report-figures{
        display:grid;grid-template-columns:repeat(4,1fr);gap:0;
        border-top:1px solid var(--border-brass);border-bottom:1px solid var(--border-brass);
        margin:1.6rem 0 2.2rem;
      }
      .report-figure{padding:1.2rem 1.5rem;border-left:1px solid var(--border)}
      .report-figure:first-child{border-left:none}
      .report-figure-label{font-family:var(--font-mono);font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.6rem}
      .report-figure-net{font-family:var(--font-display);font-weight:700;font-size:1.5rem;line-height:1;margin-bottom:0.55rem}
      .report-figure-line{display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text-dim);padding:0.12rem 0;font-family:var(--font-mono)}

      /* ── Recommendation entry — replaces the boxed .bb-tip ── */
      .recommendation{
        display:flex;gap:1rem;align-items:flex-start;
        padding:0.9rem 0;border-bottom:1px solid var(--border);
      }
      .recommendation:last-child{border-bottom:none}
      .recommendation-mark{
        font-family:var(--font-display);font-weight:700;font-size:1rem;
        width:1.6rem;height:1.6rem;border-radius:50%;flex-shrink:0;
        display:flex;align-items:center;justify-content:center;border:1px solid currentColor;
        margin-top:0.1rem;
      }
      .recommendation-cat{font-family:var(--font-mono);font-size:0.6rem;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:0.3rem}
      .recommendation-text{font-size:0.86rem;color:var(--vellum);line-height:1.7}

      /* ── Report section — replaces tab-button bar with a folio running-head selector ── */
      .report-nav{display:flex;flex-wrap:wrap;gap:0 2rem;margin-bottom:0.4rem;border-bottom:1px solid var(--border)}
      .report-nav-item{
        font-family:var(--font-mono);font-size:0.66rem;letter-spacing:0.1em;text-transform:uppercase;
        color:var(--text-muted);padding:0.7rem 0;cursor:pointer;background:none;border:none;
        border-bottom:2px solid transparent;transition:color 0.2s,border-color 0.2s;
        white-space:nowrap;
      }
      .report-nav-item:hover{color:var(--text-dim)}
      .report-nav-item.active{color:var(--seal-bright);border-bottom-color:var(--seal)}
      .report-section{display:none}
      .report-section.active{display:block;animation:fadeReveal 0.35s ease-out 1}

      @media(max-width:900px){
        .folio-spread,.folio-spread.reverse{grid-template-columns:1fr;gap:1.8rem}
        .folio-mega{font-size:clamp(2.6rem,14vw,4.5rem)}
        .report-figures{grid-template-columns:1fr 1fr}
        .report-figure:nth-child(3){border-left:none}
      }
      @media(max-width:640px){
        .ledger-bar-row{grid-template-columns:1fr;gap:0.3rem}
        .ledger-bar-track{display:none}
        .report-figures{grid-template-columns:1fr 1fr}
      }

      /* ── SELECT EXPANDABLE ── */
      .form-group{position:relative}
      .select-expandable{padding-right:2.8rem!important;cursor:pointer;border-color:var(--border-brass)!important}
      .select-expandable:hover{border-color:var(--seal)!important;box-shadow:0 0 0 2px var(--seal-glow)}
      .select-wrap{position:relative;display:flex;flex-direction:column;gap:0.4rem}
      .select-wrap::after{
        content:'';position:absolute;right:1rem;bottom:0.95rem;
        width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
        border-top:6px solid var(--seal);pointer-events:none;opacity:0.85;
        transition:transform 0.2s,opacity 0.2s;
      }
      .select-wrap:focus-within::after{transform:rotate(180deg);opacity:1}
      .select-count-badge{
        position:absolute;right:2.2rem;bottom:0.72rem;
        font-size:0.54rem;letter-spacing:0.06em;color:var(--seal-bright);
        background:var(--seal-glow);border:1px solid var(--border-seal);
        padding:0.08rem 0.38rem;pointer-events:none;line-height:1.4;font-weight:600;opacity:0.9;
        font-family:var(--font-mono);
      }

    </style>
  `;
}
function renderNav(req, active) {
  const ic = req.session.icName;
  const skladPages = ['sklad','weed-sazeni'];
  const blackbookPages = ['blackbook','profit-centrum'];
  const infoPages  = ['nastenska','kodex','lore','hierarchy'];
  const dataPages  = ['audit','statistiky'];

  return `
    <nav>
      <a href="/dashboard" class="nav-logo">
        <img src="/logo.png" class="nav-logo-img" alt="Albion">
        <span class="nav-logo-text">AL<span class="b-red">B</span>ION</span>
      </a>
      <button class="nav-burger" id="navBurger" aria-label="Menu" title="Menu">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-menu" id="navMenu">
        <li><a href="/home" class="${active==='home'?'active':''}">Přehled<span class="nav-desc">Rejstřík</span></a></li>

        <li class="nav-dropdown ${skladPages.includes(active)?'open':''}">
          <a href="/sklad" class="nav-drop-trigger ${skladPages.includes(active)?'active':''}">
            Sklad
            <span class="nav-desc">Zbraně · Weed · Drogy · Chemky</span>
            <svg class="nav-drop-arrow" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="1 1 5 5 9 1"/></svg>
          </a>
          <div class="nav-dropdown-menu">
            <a href="/sklad" class="${active==='sklad'?'active':''}">Správa skladu</a>
            <a href="/weed-sazeni" class="${active==='weed-sazeni'?'active':''}">Weed sázení</a>
          </div>
        </li>

        <li class="nav-dropdown ${blackbookPages.includes(active)?'open':''}">
          <a href="/blackbook" class="nav-drop-trigger ${blackbookPages.includes(active)?'active':''}">
            Blackbook
            <span class="nav-desc">Reporty &amp; analýzy</span>
            <svg class="nav-drop-arrow" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="1 1 5 5 9 1"/></svg>
          </a>
          <div class="nav-dropdown-menu">
            <a href="/blackbook" class="${active==='blackbook'?'active':''}">Blackbook</a>
            <a href="/profit-centrum" class="${active==='profit-centrum'?'active':''}">Profit centrum</a>
          </div>
        </li>

        <li class="nav-dropdown ${dataPages.includes(active)?'open':''}">
          <a href="/audit" class="nav-drop-trigger ${dataPages.includes(active)?'active':''}">
            Záznamy
            <span class="nav-desc">Audit · Statistiky</span>
            <svg class="nav-drop-arrow" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="1 1 5 5 9 1"/></svg>
          </a>
          <div class="nav-dropdown-menu">
            <a href="/audit" class="${active==='audit'?'active':''}">Audit</a>
            <a href="/statistiky" class="${active==='statistiky'?'active':''}">Statistiky</a>
          </div>
        </li>

        <li class="nav-dropdown ${infoPages.includes(active)?'open':''}">
          <a href="#" class="nav-drop-trigger ${infoPages.includes(active)?'active':''}">
            Organizace
            <span class="nav-desc">Nástěnka · Kodex · Lore</span>
            <svg class="nav-drop-arrow" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="1 1 5 5 9 1"/></svg>
          </a>
          <div class="nav-dropdown-menu">
            <a href="/nastenska" class="${active==='nastenska'?'active':''}">Nástěnka</a>
            <a href="/kodex" class="${active==='kodex'?'active':''}">Kodex</a>
            <a href="/lore" class="${active==='lore'?'active':''}">Historie</a>
            <a href="/hierarchy" class="${active==='hierarchy'?'active':''}">Hierarchie</a>
          </div>
        </li>

      </ul>
      <div class="nav-right" id="navRight">
        <button class="notif-bell" id="notifBell" title="Notifikace" onclick="window.location='/nastenska'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span class="notif-badge" id="notifBadge">0</span>
        </button>
        <div class="theme-switcher" title="Přepnout vrstvu archivu">
          <button class="theme-dot-btn" id="td-dark"    style="background:#0A0908;border:1.5px solid #8B1A1A" onclick="setTheme('dark')"    title="Kožená vazba"></button>
          <button class="theme-dot-btn" id="td-light"   style="background:#F3EEE3;border:1.5px solid #A1271F" onclick="setTheme('light')"   title="Pergamen"></button>
          <button class="theme-dot-btn" id="td-crystal" style="background:#070B10;border:1.5px solid #6FA8C9;box-shadow:0 0 6px rgba(111,168,201,0.5)" onclick="setTheme('crystal')" title="Šifrovaný kanál"></button>
        </div>
        <span class="nav-shortcut-hint" title="Zkratky: g+h Přehled · g+s Sklad · g+b Blackbook · g+a Audit · g+t Statistiky · g+n Nástěnka · g+k Kodex · g+l Historie · g+o Hierarchie · g+w Weed sázení · / Hledat v auditu">g·_</span>
        <span class="nav-user">člen <strong>${ic}</strong></span>
        <a href="/logout" class="nav-logout">Odhlásit</a>
      </div>
    </nav>
    <div class="nav-overlay" id="navOverlay"></div>
    <script>
      // ── MOBILE NAV ──
      const navBurger = document.getElementById('navBurger');
      const navMenu = document.getElementById('navMenu');
      const navOverlay = document.getElementById('navOverlay');
      const navRight = document.getElementById('navRight');
      const navEl = document.querySelector('nav');
      let navRightInMenu = false;
      function placeNavRight() {
        const mobile = window.innerWidth <= 880;
        if (mobile && !navRightInMenu) { navMenu.appendChild(navRight); navRightInMenu = true; }
        else if (!mobile && navRightInMenu) { navEl.appendChild(navRight); navRightInMenu = false; }
      }
      placeNavRight();
      function closeMobileNav() {
        navBurger.classList.remove('open');
        navMenu.classList.remove('mobile-open');
        document.body.classList.remove('nav-locked');
      }
      function toggleMobileNav() {
        const willOpen = !navMenu.classList.contains('mobile-open');
        navBurger.classList.toggle('open', willOpen);
        navMenu.classList.toggle('mobile-open', willOpen);
        document.body.classList.toggle('nav-locked', willOpen);
        if (!willOpen) document.querySelectorAll('.nav-dropdown').forEach(dd => dd.classList.remove('open'));
      }
      navBurger.addEventListener('click', toggleMobileNav);
      navOverlay.addEventListener('click', closeMobileNav);
      window.addEventListener('resize', () => { placeNavRight(); if (window.innerWidth > 880) closeMobileNav(); });
      document.querySelectorAll('.nav-dropdown').forEach(dd => {
        const trigger = dd.querySelector('.nav-drop-trigger');
        let closeTimer = null;
        trigger.addEventListener('click', (e) => {
          // Only intercept the click if it's on the trigger itself (not a child link with href)
          const href = trigger.getAttribute('href');
          if (href && href !== '#') {
            if (window.innerWidth <= 880) { e.preventDefault(); dd.classList.toggle('open'); return; }
            return; // let normal navigation happen on desktop
          }
          e.preventDefault();
          dd.classList.toggle('open');
        });
        // hover open (desktop only) — close is delayed so a brief cursor wobble
        // between the trigger and the menu doesn't slam the dropdown shut.
        dd.addEventListener('mouseenter', () => {
          if (window.innerWidth <= 880) return;
          clearTimeout(closeTimer);
          dd.classList.add('open');
        });
        dd.addEventListener('mouseleave', () => {
          if (window.innerWidth <= 880) return;
          clearTimeout(closeTimer);
          closeTimer = setTimeout(() => dd.classList.remove('open'), 300);
        });
      });
      // Close dropdowns on outside click
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-dropdown')) {
          document.querySelectorAll('.nav-dropdown').forEach(dd => dd.classList.remove('open'));
        }
      });
      // Closing the mobile panel when an actual nav link is followed
      navMenu.querySelectorAll('a[href]:not([href="#"])').forEach(a => a.addEventListener('click', closeMobileNav));

      const THEMES = ['dark','light','crystal'];
      let currentTheme = localStorage.getItem('albion_theme') || 'dark';
      function applyTheme(t) {
        THEMES.forEach(c => document.body.classList.remove(c));
        if (t !== 'dark') document.body.classList.add(t);
        currentTheme = t;
        localStorage.setItem('albion_theme', t);
        THEMES.forEach(th => {
          const btn = document.getElementById('td-' + th);
          if (btn) btn.classList.toggle('active', th === t);
        });
      }
      applyTheme(currentTheme);
      function setTheme(t) { applyTheme(t); }
      function toggleBBGroup(el) {
        const group = el.parentElement;
        const wasOpen = group.classList.contains('open');
        group.parentElement.querySelectorAll('.bb-group.open').forEach(g => g.classList.remove('open'));
        if (!wasOpen) group.classList.add('open');
      }
      document.addEventListener('click', () => {});
      let newCount = 0;
      const evtSource = new EventSource('/api/events');
      window.evtSource = evtSource;
      evtSource.addEventListener('nastenska', (e) => {
        const d = JSON.parse(e.data);
        newCount++;
        const badge = document.getElementById('notifBadge');
        badge.textContent = newCount;
        badge.classList.add('visible');
        showToast('[Oznámení] ' + d.title + ' — ' + d.uzivatel);
      });
      evtSource.addEventListener('skladUpdate', (e) => {
        const d = JSON.parse(e.data);
        const label = d.sekce === 'zbrane' ? '[Zbraně]' : d.sekce === 'weed' ? '[Weed]' : d.sekce === 'chemky' ? '[Chemky]' : '[Drogy]';
        showToast(label + ' ' + (d.polozka || d.odruda || d.droga || d.chemikalie) + ' — ' + d.uzivatel);
      });
      evtSource.addEventListener('ucetUpdate', (e) => {
        const d = JSON.parse(e.data);
        showToast('[Finance] ' + d.typ + ' — ' + (d.valuta === 'USD' ? 'SAD ' : '₱') + d.castka);
      });
      evtSource.addEventListener('weedTimer', (e) => {
        const d = JSON.parse(e.data);
        if (d.action === 'add' && d.timer) showToast('[Weed sázení] Nová sázenice — ' + d.timer.icName + ' (' + d.timer.postal + ')');
      });
      function showToast(msg, isError) {
        let t = document.getElementById('toast');
        if (!t) { t = document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
        t.textContent = msg;
        t.className = 'toast show' + (isError ? ' error' : '');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.className = 'toast', 3500);
      }
      window.showToast = showToast;
      window.ledgerEmptyHTML = function(text, compact) {
        return '<div class="ledger-empty' + (compact ? ' compact' : '') + '">' +
          '<svg viewBox="0 0 64 48" fill="none">' +
          '<rect x="3" y="2" width="58" height="44" rx="2" stroke="var(--border-brass)" stroke-width="1.5"/>' +
          '<line x1="12" y1="14" x2="44" y2="14" stroke="var(--border)" stroke-width="1.5"/>' +
          '<line x1="12" y1="22" x2="52" y2="22" stroke="var(--border)" stroke-width="1.5"/>' +
          '<line x1="12" y1="30" x2="38" y2="30" stroke="var(--border)" stroke-width="1.5"/>' +
          '<line x1="12" y1="38" x2="48" y2="38" stroke="var(--border)" stroke-width="1.5"/>' +
          '</svg><div class="ledger-empty-text">' + text + '</div></div>';
      };

      // ── RITUAL SHORTCUTS — g+letter to navigate, / to search ──
      (function(){
        const ROUTES = {
          h: '/home', s: '/sklad', b: '/blackbook', p: '/profit-centrum',
          a: '/audit', t: '/statistiky', n: '/nastenska', k: '/kodex',
          l: '/lore', o: '/hierarchy', w: '/weed-sazeni',
        };
        let awaitingSecond = false;
        let chordTimer = null;
        function isTyping(el) {
          if (!el) return false;
          const tag = el.tagName;
          return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
        }
        document.addEventListener('keydown', (e) => {
          if (e.metaKey || e.ctrlKey || e.altKey) return;
          if (isTyping(e.target)) {
            if (e.key === 'Escape') e.target.blur();
            return;
          }
          if (awaitingSecond) {
            awaitingSecond = false;
            clearTimeout(chordTimer);
            const dest = ROUTES[e.key.toLowerCase()];
            if (dest) { e.preventDefault(); window.location.href = dest; }
            return;
          }
          if (e.key.toLowerCase() === 'g') {
            awaitingSecond = true;
            clearTimeout(chordTimer);
            chordTimer = setTimeout(() => { awaitingSecond = false; }, 900);
            return;
          }
          if (e.key === '/') {
            const target = document.getElementById('audit-search');
            if (target) { e.preventDefault(); target.focus(); }
          }
        });
      })();
    </script>
  `;
}

// ── RENDER HOME (Main Dashboard) ─────────────────────────────────────────────
function renderHome(req, data) {
  const { zbrane, weed, drogy, chemky, ucet, recentUcet, recentZbrane, recentWeed, recentDrogy, recentChemky } = data;
  const icName = req.session.icName;

  // ── Výpočet hodnoty skladu
  const WEED_P = {"Žlutý kanabis":150,"Zelený kanabis":150,"Kanabis":150,"Červený kanabis":150,"Modrý kanabis":150};
  const DROGY_P = {"Kapky":200,"Kokain":500,"Extáze":350,"Metamfetamin":450,"Benzo":300,"Joyka":250,"Heroin":600,"Speed":280,"LSD":400};
  const ZBRANE_P = {"Pump Shotgun":8000,"Pistol MK2":12000,"Pistol":5000,"Combat Pistol":7000,"Double Action Revolver":15000,"Navy Revolver":14000,"Vintage Pistol":6000,"Gusenberg":18000,"Dlouhé":25000,"9mm":100,"9mm Mk2":150,".75cal":300,".50cal":250,"12-gauge":200};

  let totalValue = 0;
  Object.entries(weed).forEach(([k,q]) => { if(q>0 && WEED_P[k]) totalValue += q * WEED_P[k]; });

  const totalWeed   = Object.values(weed).filter(q=>q>0).reduce((a,b)=>a+b,0);
  const totalDrogy  = Object.values(drogy).filter(q=>q>0).reduce((a,b)=>a+b,0);
  const totalZbrane = Object.values(zbrane).filter(q=>q>0).reduce((a,b)=>a+b,0);
  const totalChemky = Object.values(chemky||{}).filter(q=>q>0).reduce((a,b)=>a+b,0);

  const topItems = (obj, priceMap, limit=5) => Object.entries(obj)
    .filter(([,q])=>q>0)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,limit)
    .map(([item,qty]) => ({ item, qty, value: priceMap[item] ? qty*priceMap[item] : 0 }));

  const topWeed   = topItems(weed, WEED_P);
  const topDrogy  = topItems(drogy, {});
  const topZbrane = topItems(zbrane, {});

  const manifestRows = (items, fallback) => items.length
    ? items.map(({item,qty,value}) => `
      <div class="manifest-row">
        <span class="mr-name">${item}</span>
        <span class="mr-dots"></span>
        <span class="mr-val">${qty} ks${value?' · $'+value.toLocaleString('cs-CZ'):''}</span>
      </div>`).join('')
    : `<div class="manifest-row"><span class="mr-name" style="color:var(--text-muted);font-style:italic">${fallback}</span><span class="mr-dots"></span><span class="mr-val">—</span></div>`;

  // ── Poslední aktivity (kept as a thin stream, not a card)
  const allRecent = [
    ...recentZbrane.map(r => ({ sekce:'Zbraně', typ:r[1]||'', detail:`${r[2]||'?'} · ${r[3]||'?'} ks`, kdo:r[5]||'—', cas:r[0]||'' })),
    ...recentWeed.map(r => ({ sekce:'Weed', typ:r[1]||'', detail:`${r[2]||'?'} · ${r[3]||'?'} ks`, kdo:r[6]||r[5]||'—', cas:r[0]||'' })),
    ...recentDrogy.map(r => ({ sekce:'Drogy', typ:r[1]||'', detail:`${r[2]||'?'} · ${r[3]||'?'} ks`, kdo:r[6]||r[5]||'—', cas:r[0]||'' })),
    ...(recentChemky||[]).map(r => ({ sekce:'Chemky', typ:r[1]||'', detail:`${r[2]||'?'} · ${r[3]||'?'} ks`, kdo:r[4]||'—', cas:r[0]||'' })),
    ...recentUcet.map(r => {
      const sym=(r[3]||'')==='USD'?'SAD ':'₱';
      return { sekce:'Finance', typ:r[1]||'', detail:`${sym}${r[2]||'?'} — ${r[4]||'—'}`, kdo:r[5]||'—', cas:r[0]||'' };
    }),
  ].sort((a,b)=>b.cas.localeCompare(a.cas)).slice(0,5);

  const activityHtml = allRecent.length ? allRecent.map((ev,i) => {
    const isIn = /VKLAD|PŘÍJEM/.test((ev.typ||'').toUpperCase());
    return `<div class="stream-entry">
      <span class="stream-num">${String(i+1).padStart(2,'0')}</span>
      <span class="stream-typ" style="color:${isIn?'#6FBF52':'var(--seal-bright)'}">${ev.typ}</span>
      <span class="stream-detail">${ev.detail}</span>
      <span class="stream-who">${ev.kdo}</span>
      <span class="stream-cas">${ev.cas}</span>
    </div>`;
  }).join('') : ledgerEmpty('Rejstřík dosud beze zápisu', true);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Dobré ráno' : greetingHour < 18 ? 'Dobrý den' : 'Dobrý večer';
  const today = new Date();
  const dateStr = today.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Albion — Rejstřík</title>
  ${baseStyles()}
  <style>
    /* ── OPENING FOLIO — a title page, not a hero banner ── */
    .opening-folio{
      display:flex;align-items:flex-start;justify-content:space-between;
      gap:2.5rem;padding-bottom:2.4rem;margin-bottom:2.4rem;
      border-bottom:1px solid var(--border);
      position:relative;
    }
    .opening-left{flex:1;min-width:0}
    .opening-tag{
      font-family:var(--font-mono);font-size:0.64rem;letter-spacing:0.34em;
      text-transform:uppercase;color:var(--seal-bright);margin-bottom:1.1rem;font-weight:600;
    }
    .opening-name{
      font-family:var(--font-display);font-weight:600;
      font-size:clamp(2.4rem,6vw,4.2rem);line-height:1.02;color:var(--vellum-bright);
      letter-spacing:-0.005em;
    }
    .opening-name em{font-style:italic;color:var(--seal-bright);font-weight:500}
    .opening-sub{
      font-family:'Inter',sans-serif;color:var(--text-dim);font-size:1rem;
      margin-top:1rem;max-width:480px;line-height:1.7;
    }
    .opening-right{
      flex-shrink:0;text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:1rem;
    }
    .opening-seal{
      width:88px;height:88px;border-radius:50%;
      border:1.5px solid var(--brass);
      display:flex;align-items:center;justify-content:center;flex-direction:column;
      box-shadow:0 0 0 6px var(--bg),0 0 28px var(--seal-glow);
      position:relative;
    }
    .opening-seal::before{content:'';position:absolute;inset:7px;border-radius:50%;border:1px solid var(--border-brass)}
    .opening-seal .os-letter{font-family:var(--font-display);font-weight:700;font-size:1.7rem;color:var(--brass);line-height:1}
    .opening-seal .os-sub{font-family:var(--font-mono);font-size:0.42rem;letter-spacing:0.2em;color:var(--brass);opacity:0.8;margin-top:0.15rem}
    .opening-seal.live-pulse{animation:heroSealPulse 1.1s ease-out 1}
    .opening-clock{font-family:var(--font-mono);font-size:0.92rem;color:var(--text-dim);letter-spacing:0.04em}
    .opening-date{font-family:var(--font-mono);font-size:0.64rem;color:var(--text-muted);letter-spacing:0.1em;text-transform:uppercase}

    /* ── THE LEDGER LINE — quick actions as a single typographic row, not buttons ── */
    .ledger-line{
      display:flex;flex-wrap:wrap;gap:0 1.6rem;margin-top:1.6rem;
    }
    .ledger-line a{
      font-family:var(--font-mono);font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;
      color:var(--text-dim);text-decoration:none;padding:0.3rem 0;
      border-bottom:1px solid transparent;transition:color 0.2s,border-color 0.2s;
    }
    .ledger-line a:hover{color:var(--seal-bright);border-color:var(--seal-bright)}
    .ledger-line a::before{content:'→ ';color:var(--brass);opacity:0.7}

    /* ── PRIMARY FIGURE — the one number that owns the page ── */
    .primary-figure{margin-bottom:3rem}
    .pf-label{
      font-family:var(--font-mono);font-size:0.66rem;letter-spacing:0.3em;text-transform:uppercase;
      color:var(--text-muted);margin-bottom:0.4rem;
    }
    .pf-value{
      font-family:var(--font-display);font-weight:600;
      font-size:clamp(3.6rem,10vw,7.5rem);line-height:0.9;color:var(--brass);
      letter-spacing:-0.01em;display:flex;align-items:baseline;gap:0.3rem;
    }
    .pf-value .pf-currency{font-size:0.4em;color:var(--text-muted);font-family:var(--font-mono)}
    .pf-footnote{
      font-family:'Inter',sans-serif;font-size:0.86rem;color:var(--text-dim);
      margin-top:0.7rem;max-width:520px;line-height:1.7;
    }
    .pf-footnote strong{color:var(--vellum);font-weight:600}

    /* ── STOCK MANIFEST GRID — three-column layout, home-page specific weighting ── */
    .stock-manifest{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:0 3rem}

    /* ── THE STREAM — recent activity as a typed log, no card ── */
    .stream{margin-top:0.5rem}
    .stream-entry{
      display:grid;grid-template-columns:1.6rem auto 1fr auto auto;
      gap:0.9rem;align-items:baseline;
      padding:0.7rem 0;border-bottom:1px solid var(--border);
      font-size:0.86rem;
    }
    .stream-entry:last-child{border-bottom:none}
    .stream-num{font-family:var(--font-mono);color:var(--text-muted);font-size:0.74rem}
    .stream-typ{font-family:var(--font-mono);font-size:0.66rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:600}
    .stream-detail{color:var(--vellum);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .stream-who{font-family:var(--font-mono);color:var(--text-dim);font-size:0.78rem;white-space:nowrap}
    .stream-cas{font-family:var(--font-mono);color:var(--text-muted);font-size:0.72rem;white-space:nowrap}

    @media(max-width:900px){
      .opening-folio{flex-direction:column;gap:1.6rem}
      .opening-right{flex-direction:row;align-items:center;width:100%;justify-content:space-between}
      .stock-manifest{grid-template-columns:1fr;gap:1.8rem}
      .stream-entry{grid-template-columns:1.4rem auto 1fr;gap:0.5rem 0.7rem}
      .stream-who,.stream-cas{grid-column:2 / -1;font-size:0.7rem}
    }
    @media(max-width:480px){
      .opening-seal{width:64px;height:64px}
      .opening-seal .os-letter{font-size:1.2rem}
      .ledger-line{gap:0.5rem 1.1rem}
    }
  </style>
  </head><body>
  ${renderNav(req, 'home')}
  <main>

    <!-- ── OPENING FOLIO ── -->
    <div class="opening-folio">
      <div class="opening-left">
        <div class="opening-tag glitch-in">Rejstřík Albionu · otevřeno</div>
        <h1 class="opening-name glitch-in">${greeting}, <em>${icName}</em></h1>
        <p class="opening-sub">Zásoby a finance organizace se zapisují v reálném čase. Toto je dnešní strana rejstříku, ${dateStr}.</p>
        <div class="ledger-line">
          <a href="/sklad">Správa skladu</a>
          <a href="/audit">Audit zápisů</a>
          <a href="/nastenska">Nástěnka</a>
          <a href="/statistiky">Statistiky</a>
          <a href="/lore">Historie rodu</a>
        </div>
      </div>
      <div class="opening-right">
        <div class="opening-seal" id="heroSeal"><span class="os-letter">A</span><span class="os-sub">LOS SANTOS</span></div>
        <div>
          <div class="opening-clock" id="live-clock">--:--:--</div>
          <div class="opening-date" id="live-date"></div>
        </div>
      </div>
    </div>

    <script>
      (function clock(){
        const c=document.getElementById('live-clock');
        const d=document.getElementById('live-date');
        function tick(){
          const n=new Date();
          if(c) c.textContent=n.toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
          if(d) d.textContent=n.toLocaleDateString('cs-CZ',{weekday:'long'});
        }
        tick();setInterval(tick,1000);
      })();
    </script>

    <!-- ── PRIMARY FIGURE + MARGINALIA — the dominant number, not a KPI tile ── -->
    <div class="folio-spread">
      <div class="primary-figure">
        <div class="pf-label">Hotovostní zůstatek organizace</div>
        <div class="pf-value">$${ucet.usd.toLocaleString('cs-CZ')}<span class="pf-currency">SAD</span></div>
        <p class="pf-footnote">Vedle vede frakce účet i v <strong>₱${ucet.pesos.toLocaleString('cs-CZ')} pesos</strong>. Hodnota skladu (jen weed, dle prodejních cen) činí <strong>$${totalValue.toLocaleString('cs-CZ')}</strong>.</p>
      </div>
      <div class="marginalia">
        <div class="m-line"><span>Weed v skladu</span><span class="m-val">${totalWeed} ks</span></div>
        <div class="m-line"><span>Drogy v skladu</span><span class="m-val">${totalDrogy} ks</span></div>
        <div class="m-line"><span>Zbraně v skladu</span><span class="m-val">${totalZbrane} ks</span></div>
        <div class="m-line"><span>Chemikálie</span><span class="m-val">${totalChemky} ks</span></div>
        <div class="m-line"><span>Odrůd weedu</span><span class="m-val">${Object.keys(weed).filter(k=>weed[k]>0).length}</span></div>
        <div class="m-line"><span>Typů drog</span><span class="m-val">${Object.keys(drogy).filter(k=>drogy[k]>0).length}</span></div>
      </div>
    </div>

    <div class="folio-rule"></div>

    <!-- ── STOCK MANIFEST — three unequal ledger columns ── -->
    <div class="folio-label">Stav skladu</div>
    <div style="height:1.6rem"></div>
    <div class="stock-manifest">
      <div class="manifest-col">
        <div class="manifest-col-head">
          <span class="manifest-col-title">Weed</span>
          <span class="manifest-col-count">${totalWeed} ks celkem</span>
        </div>
        ${manifestRows(topWeed, 'Sklad prázdný')}
      </div>
      <div class="manifest-col">
        <div class="manifest-col-head">
          <span class="manifest-col-title">Drogy</span>
          <span class="manifest-col-count">${totalDrogy} ks celkem</span>
        </div>
        ${manifestRows(topDrogy, 'Sklad prázdný')}
      </div>
      <div class="manifest-col">
        <div class="manifest-col-head">
          <span class="manifest-col-title">Zbraně</span>
          <span class="manifest-col-count">${totalZbrane} ks celkem</span>
        </div>
        ${manifestRows(topZbrane, 'Sklad prázdný')}
      </div>
    </div>

    <div class="folio-rule"></div>

    <!-- ── THE STREAM — last entries in the register ── -->
    <div class="folio-label">Poslední zápisy</div>
    <div style="height:1.6rem"></div>
    <div class="stream" id="activity-stream">${activityHtml}</div>

  </main>
  <div class="toast" id="toast"></div>
  <script>
    // ── Live SSE — re-stamps the seal and nudges a toast, nothing more ──
    const evtHome = new EventSource('/api/events');
    function bumpLive(msg) {
      showToast(msg);
      const seal = document.getElementById('heroSeal');
      if (seal) {
        seal.classList.remove('live-pulse');
        void seal.offsetWidth;
        seal.classList.add('live-pulse');
      }
    }
    evtHome.addEventListener('skladUpdate', (e) => {
      const d = JSON.parse(e.data);
      const label = d.sekce==='zbrane'?'Zbraně':d.sekce==='weed'?'Weed':'Drogy';
      bumpLive(label + ' ' + d.typ + ' — ' + (d.polozka||d.odruda||d.droga) + ' (' + d.qty + ' ks)');
    });
    evtHome.addEventListener('ucetUpdate', (e) => {
      const d = JSON.parse(e.data);
      bumpLive('Finance — ' + d.typ + ' — ' + (d.valuta==='USD'?'SAD ':'₱') + d.castka);
    });
    evtHome.addEventListener('nastenska', (e) => {
      const d = JSON.parse(e.data);
      bumpLive('Nové oznámení: ' + d.title);
    });
    function showToast(msg, isError) {
      let t=document.getElementById('toast');
      if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t);}
      t.textContent=msg;
      t.className='toast show'+(isError?' error':'');
      clearTimeout(t._timer);
      t._timer=setTimeout(()=>t.className='toast',3500);
    }
    window.showToast=showToast;
  </script>
  </body></html>`;
}

// ── RENDER DASHBOARD (Sklad) ──────────────────────────────────────────────────
function renderDashboard(req, data) {
  const { zbrane, weed, drogy, chemky, ucet, recentUcet } = data;
  const icName = req.session.icName;

  const formatSklad = (obj, ceny) => {
    const entries = Object.entries(obj).filter(([,q]) => q > 0);
    if (!entries.length) return ledgerEmpty('Sklad je prázdný', true);
    return entries.map(([item, qty]) => {
      const hodnota = ceny && ceny[item] ? qty * ceny[item].prodej : null;
      return `<div class="sklad-row"><span>${item}</span><span>${qty} ks${hodnota ? ` <em>$${hodnota}</em>` : ''}</span></div>`;
    }).join('');
  };

  const formatUcet = (rows) => {
    if (!rows.length) return ledgerEmpty('Žádné záznamy', true);
    return rows.map(r => {
      const [cas, typ, castka, valuta, pozn] = r;
      const isIn = typ === 'PŘÍJEM';
      const symbol = valuta === 'USD' ? 'SAD ' : '₱';
      return `<div class="sklad-row"><span style="display:flex;align-items:center;gap:0.5rem"><span style="width:6px;height:6px;border-radius:50%;background:${isIn?'#6FBF52':'var(--seal-bright)'};flex-shrink:0"></span>${pozn||'—'}</span><span style="${isIn?'color:#6FBF52':'color:var(--seal-bright)'}">${symbol}${castka} <em style="color:var(--text-muted)">${valuta.replace('USD','SAD')}</em></span></div>`;
    }).join('');
  };

  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Sklad</title>
  ${baseStyles()}
  <style>
    .sklad-opener{
      display:flex;align-items:flex-end;justify-content:space-between;gap:2rem;
      padding-bottom:1.8rem;margin-bottom:2rem;border-bottom:1px solid var(--border);
    }
    .sklad-opener-tag{font-family:var(--font-mono);font-size:0.64rem;letter-spacing:0.3em;text-transform:uppercase;color:var(--seal-bright);margin-bottom:0.7rem;font-weight:600}
    .sklad-opener h1{font-family:var(--font-display);font-weight:600;font-size:clamp(1.9rem,4vw,2.6rem);color:var(--vellum-bright)}
    .sklad-opener p{font-family:'Inter',sans-serif;color:var(--text-dim);margin-top:0.5rem;font-size:0.95rem;max-width:540px}
    .ledger-tally{display:flex;gap:2.2rem;flex-wrap:wrap;margin:0 0 2.4rem}
    .tally-item{padding-right:2.2rem;border-right:1px solid var(--border)}
    .tally-item:last-child{border-right:none;padding-right:0}
    .tally-label{font-family:var(--font-mono);font-size:0.6rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.45rem}
    .tally-value{font-family:var(--font-display);font-weight:700;font-size:1.5rem;color:var(--vellum);line-height:1}
    @media(max-width:768px){.sklad-opener{flex-direction:column;align-items:flex-start;gap:0.8rem}.ledger-tally{gap:1.2rem 1.6rem}.tally-item{padding-right:1.4rem}}
    .sklad-asym{
      display:grid;
      grid-template-columns:1.4fr 1fr;
      grid-template-areas:
        "ucet ucet"
        "zbrane weed"
        "drogy chemky";
      gap:1.5rem;
    }
    .sklad-asym .area-ucet{grid-area:ucet}
    .sklad-asym .area-zbrane{grid-area:zbrane}
    .sklad-asym .area-weed{grid-area:weed}
    .sklad-asym .area-drogy{grid-area:drogy}
    .sklad-asym .area-chemky{grid-area:chemky}
    .card.card-lead{
      border-top:2px solid var(--brass);
      background:linear-gradient(135deg,var(--gold-dim) 0%,var(--bg-card) 45%);
    }
    .card.card-lead .card-title{font-size:1.05rem}
    @media(max-width:900px){
      .sklad-asym{grid-template-columns:1fr;grid-template-areas:"ucet" "zbrane" "weed" "drogy" "chemky"}
    }
  </style>
  </head><body>
  ${renderNav(req, 'sklad')}
  <main>
    <div class="sklad-opener">
      <div>
        <div class="sklad-opener-tag">Centrální sklad organizace</div>
        <h1>Vítej, ${icName}</h1>
        <p>Eviduj pohyb zbraní, weedu, drog, chemikálií a financí. Každý zápis se ihned promítne do tabulka a odešle se na Discord.</p>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div id="live-clock" style="font-family:var(--font-mono);font-size:1.3rem;color:var(--vellum);letter-spacing:0.08em"></div>
        <div id="live-date" style="font-size:0.66rem;letter-spacing:0.14em;color:var(--text-dim);text-transform:uppercase;margin-top:0.3rem;font-family:var(--font-mono)"></div>
      </div>
    </div>
    <script>
      function updateClock(){
        const now=new Date();
        document.getElementById('live-clock').textContent=now.toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
        document.getElementById('live-date').textContent=now.toLocaleDateString('cs-CZ',{weekday:'long',day:'numeric',month:'long'});
      }
      updateClock();setInterval(updateClock,1000);
    </script>
    <div class="ledger-tally">
      <div class="tally-item"><div class="tally-label">Zůstatek SAD</div><div class="tally-value" style="color:var(--brass)">$${ucet.usd.toLocaleString('cs-CZ')}</div></div>
      <div class="tally-item"><div class="tally-label">Zůstatek Pesos</div><div class="tally-value">₱${ucet.pesos.toLocaleString('cs-CZ')}</div></div>
      <div class="tally-item"><div class="tally-label">Weed</div><div class="tally-value" style="color:#7A9A4A">${Object.values(weed).filter(q=>q>0).reduce((a,b)=>a+b,0)} ks</div></div>
      <div class="tally-item"><div class="tally-label">Drogy</div><div class="tally-value" style="color:var(--seal-bright)">${Object.values(drogy).filter(q=>q>0).reduce((a,b)=>a+b,0)} ks</div></div>
      <div class="tally-item"><div class="tally-label">Chemikálie</div><div class="tally-value" style="color:#6FA8C9">${Object.values(chemky||{}).filter(q=>q>0).reduce((a,b)=>a+b,0)} ks</div></div>
      <div class="tally-item"><div class="tally-label">Hodnota skladu</div><div class="tally-value" style="color:var(--brass)">$${(() => {
            const WEED_P = {"Žlutý kanabis":150,"Zelený kanabis":150,"Kanabis":150,"Červený kanabis":150,"Modrý kanabis":150};
            const DROGY_P = {"Kapky":200,"Kokain":500,"Extáze":350,"Metamfetamin":450,"Benzo":300,"Joyka":250,"Heroin":600,"Speed":280,"LSD":400};
            const ZBRANE_P = {"Pump Shotgun":8000,"Pistol MK2":12000,"Pistol":5000,"Combat Pistol":7000,"Double Action Revolver":15000,"Navy Revolver":14000,"Vintage Pistol":6000,"Gusenberg":18000,"Dlouhé":25000,"9mm":100,"9mm Mk2":150,".75cal":300,".50cal":250,"12-gauge":200};
            let total = 0;
            Object.entries(weed).forEach(([k,q]) => { if(q>0 && WEED_P[k]) total += q * WEED_P[k]; });
            Object.entries(drogy).forEach(([k,q]) => { if(q>0 && DROGY_P[k]) total += q * DROGY_P[k]; });
            Object.entries(zbrane).forEach(([k,q]) => { if(q>0 && ZBRANE_P[k]) total += q * ZBRANE_P[k]; });
            return total.toLocaleString('cs-CZ');
          })()}</div></div>
    </div>
    <div class="sklad-asym">
      <div class="card card-lead area-ucet">
        <div class="card-header"><span class="card-title">Účetnictví organizace</span><span class="card-badge">Finance · vede rejstřík</span></div>
        ${formatUcet(recentUcet)}
        <div class="form-section">
          <div class="typ-toggle">
            <button class="typ-btn active-vklad" onclick="setTyp('ucet','PŘÍJEM',this)">Příjem</button>
            <button class="typ-btn" onclick="setTyp('ucet','VÝDAJ',this)">Výdaj</button>
          </div>
          <input type="hidden" id="ucet-typ" value="PŘÍJEM">
          <div class="form-row">
            <div class="form-group"><label>Částka</label><input type="number" id="ucet-castka" min="1" placeholder="1000"></div>
            <div class="form-group"><label>Valuta</label><select id="ucet-valuta"><option value="USD">SAD</option><option value="PESOS">Pesos</option></select></div>
          </div>
          <div class="form-group" style="margin-bottom:0.5rem"><label>Poznámka</label><input type="text" id="ucet-poznamka" placeholder="Prodej zboží, plat..."></div>
          <button class="btn-submit" onclick="submitUcet()">Potvrdit transakci</button>
        </div>
      </div>
      <div class="card area-zbrane">
        <div class="card-header"><span class="card-title">Zbraně & Střelivo</span><span class="card-badge">Sklad</span></div>
        ${formatSklad(zbrane, null)}
        <div class="form-section">
          <div class="typ-toggle">
            <button class="typ-btn active-vklad" onclick="setTyp('zbrane','VKLAD',this)">Uložit</button>
            <button class="typ-btn" onclick="setTyp('zbrane','VÝBĚR',this)">Vybrat</button>
          </div>
          <input type="hidden" id="zbrane-typ" value="VKLAD">
          <div class="form-row">
            <div class="form-group select-wrap"><label>Kategorie</label><select id="zbrane-kat" class="select-expandable" onchange="updateZbraneItems()"><option value="Zbraň">Zbraně</option><option value="Střelivo">Střelivo</option><option value="Akce">Akce</option></select><span class="select-count-badge">3</span></div>
            <div class="form-group select-wrap"><label>Položka</label><select id="zbrane-polozka" class="select-expandable"></select><span class="select-count-badge" id="zbrane-polozka-count">9</span></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Množství</label><input type="number" id="zbrane-mnozstvi" min="1" value="1"></div>
            <div class="form-group" id="zbrane-ucel-wrap" style="display:none"><label>Účel výběru</label><input type="text" id="zbrane-ucel" placeholder="Mise, ochrana..."></div>
          </div>
          <button class="btn-submit" onclick="submitZbrane()">Potvrdit akci</button>
        </div>
      </div>
      <div class="card area-weed">
        <div class="card-header"><span class="card-title">Weed</span><span class="card-badge">Sklad</span></div>
        ${formatSklad(weed, {"Žlutý kanabis":{prodej:150},"Zelený kanabis":{prodej:150},"Kanabis":{prodej:150},"Červený kanabis":{prodej:150},"Modrý kanabis":{prodej:150}})}
        <div class="form-section">
          <div class="typ-toggle">
            <button class="typ-btn active-vklad" onclick="setTyp('weed','VKLAD',this)">Uložit</button>
            <button class="typ-btn" onclick="setTyp('weed','VÝBĚR',this)">Vybrat</button>
          </div>
          <input type="hidden" id="weed-typ" value="VKLAD">
          <div class="form-row">
            <div class="form-group select-wrap"><label>Odrůda</label><select id="weed-odruda" class="select-expandable"><option>Žlutý kanabis</option><option>Zelený kanabis</option><option>Kanabis</option><option>Červený kanabis</option><option>Modrý kanabis</option></select><span class="select-count-badge">5</span></div>
            <div class="form-group"><label>Množství</label><input type="number" id="weed-mnozstvi" min="1" value="1"></div>
          </div>
          <div class="info-box" id="weed-info"></div>
          <button class="btn-submit" onclick="submitWeed()">Potvrdit akci</button>
        </div>
      </div>
      <div class="card area-drogy">
        <div class="card-header"><span class="card-title">Drogy</span><span class="card-badge">Sklad</span></div>
        ${formatSklad(drogy, null)}
        <div class="form-section">
          <div class="typ-toggle">
            <button class="typ-btn active-vklad" onclick="setTyp('drogy','VKLAD',this)">Uložit</button>
            <button class="typ-btn" onclick="setTyp('drogy','VÝBĚR',this)">Vybrat</button>
          </div>
          <input type="hidden" id="drogy-typ" value="VKLAD">
          <div class="form-row">
            <div class="form-group select-wrap"><label>Droga</label><select id="drogy-droga" class="select-expandable"><option>Kapky</option><option>Kokain</option><option>Extáze</option><option>Metamfetamin</option><option>Benzo</option><option>Joyka</option><option>Heroin</option><option>Speed</option><option>LSD</option></select><span class="select-count-badge">9</span></div>
            <div class="form-group"><label>Množství</label><input type="number" id="drogy-mnozstvi" min="1" value="1"></div>
          </div>
          <button class="btn-submit" onclick="submitDrogy()">Potvrdit akci</button>
        </div>
      </div>
      <div class="card area-chemky">
        <div class="card-header"><span class="card-title">Chemikálie</span><span class="card-badge">Sklad</span></div>
        ${formatSklad(chemky||{}, null)}
        <div class="form-section">
          <div class="typ-toggle">
            <button class="typ-btn active-vklad" onclick="setTyp('chemky','VKLAD',this)">Uložit</button>
            <button class="typ-btn" onclick="setTyp('chemky','VÝBĚR',this)">Vybrat</button>
          </div>
          <input type="hidden" id="chemky-typ" value="VKLAD">
          <div class="form-row">
            <div class="form-group select-wrap"><label>Chemikálie</label><select id="chemky-chemikalie" class="select-expandable"><option>Aceton</option><option>Peroxid vodíku</option><option>Kofein</option><option>Propylenglykol</option><option>Toluen</option><option>Benzín</option><option>Bismut</option><option>Kyselina fosforečná</option></select><span class="select-count-badge">8</span></div>
            <div class="form-group"><label>Množství</label><input type="number" id="chemky-mnozstvi" min="1" value="1"></div>
          </div>
          <button class="btn-submit" onclick="submitChemky()">Potvrdit akci</button>
        </div>
      </div>
    </div>
  </main>
  <!-- ── CONFIRM MODAL ── -->
  <div class="modal-overlay" id="confirmModal">
    <div class="modal-box" id="modalBox">
      <div class="seal-stamp" id="sealStamp"><span>A</span></div>
      <div class="modal-title" id="modalTitle">Potvrdit akci</div>
      <div class="modal-subtitle" id="modalSubtitle">Opravdu chceš provést tuto operaci se skladem?</div>
      <dl class="modal-detail" id="modalDetail"></dl>
      <div class="modal-actions">
        <button class="modal-btn-cancel" onclick="closeModal()">Zrušit</button>
        <button class="modal-btn-confirm" id="modalConfirmBtn">Potvrdit</button>
      </div>
    </div>
  </div>
  <div class="toast" id="toast"></div>
  <script>
    // ── MODAL ──────────────────────────────────────────────────────────────
    let _pendingAction = null;
    let _sealAudioCtx = null;
    function playSealThud() {
      try {
        _sealAudioCtx = _sealAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const ctx = _sealAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        // Low thud body
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(48, now + 0.16);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.5, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        osc.connect(gain);
        // Brief noise burst for the wax "press" texture
        const bufferSize = ctx.sampleRate * 0.06;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 900;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.22, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
        noise.connect(noiseFilter).connect(noiseGain);
        const master = ctx.createGain();
        master.gain.value = 0.9;
        gain.connect(master);
        noiseGain.connect(master);
        master.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.34);
        noise.start(now);
      } catch (e) { /* audio not available — silent fail, purely decorative */ }
    }
    function showModal(title, subtitle, details, actionFn) {
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalSubtitle').textContent = subtitle;
      const dl = document.getElementById('modalDetail');
      dl.innerHTML = details.map(([k,v]) => '<dt>'+k+'</dt><dd>'+v+'</dd>').join('');
      _pendingAction = actionFn;
      document.getElementById('confirmModal').classList.add('open');
      document.getElementById('modalConfirmBtn').textContent = 'Potvrdit';
      const seal = document.getElementById('sealStamp');
      seal.className = 'seal-stamp';
      document.getElementById('modalBox').classList.remove('stamped','thud');
    }
    function closeModal() {
      document.getElementById('confirmModal').classList.remove('open');
      _pendingAction = null;
    }
    document.getElementById('modalConfirmBtn').addEventListener('click', async () => {
      if (!_pendingAction) return;
      const btn = document.getElementById('modalBox');
      const seal = document.getElementById('sealStamp');
      const confirmBtn = document.getElementById('modalConfirmBtn');
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Pečetím…';
      // Slam the wax seal down onto the ledger entry
      btn.classList.add('stamped','thud');
      seal.classList.add('slam');
      setTimeout(playSealThud, 340); // synced to the impact point of the slam keyframe (~55% of 620ms)
      await new Promise(r => setTimeout(r, 560));
      confirmBtn.textContent = 'Odesílám…';
      await _pendingAction();
      seal.classList.add('fade-out');
      await new Promise(r => setTimeout(r, 260));
      confirmBtn.disabled = false;
      closeModal();
    });
    document.getElementById('confirmModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    // ── END MODAL ──────────────────────────────────────────────────────────
    const ZBRANE=["Pump Shotgun","Pistol MK2","Pistol","Combat Pistol","Double Action Revolver","Navy Revolver","Vintage Pistol","Gusenberg","Dlouhé"];
    const NABOJE=["9mm","9mm Mk2",".75cal",".50cal","12-gauge"];
    const AKCE=["Malá C4","Velká C4","Přístupová karta","Pokročilá zvláštní karta","EMP zařízení","Řezací laser","Cable Cutter","Zvláštní karta"];
    const WEED_CENY={"Žlutý kanabis":{vyroba:100,prodej:150},"Zelený kanabis":{vyroba:100,prodej:150},"Kanabis":{vyroba:100,prodej:150},"Červený kanabis":{vyroba:100,prodej:150},"Modrý kanabis":{vyroba:100,prodej:150}};
    function updateZbraneItems(){
      const kat=document.getElementById('zbrane-kat').value;
      const sel=document.getElementById('zbrane-polozka');
      const items=kat==='Zbraň'?ZBRANE:kat==='Střelivo'?NABOJE:AKCE;
      sel.innerHTML=items.map(i=>'<option>'+i+'</option>').join('');
      const badge=document.getElementById('zbrane-polozka-count');
      if(badge) badge.textContent=items.length;
    }
    updateZbraneItems();
    function setTyp(prefix,typ,btn){
      document.getElementById(prefix+'-typ').value=typ;
      btn.parentElement.querySelectorAll('.typ-btn').forEach(b=>b.className='typ-btn');
      btn.className='typ-btn '+(typ==='VKLAD'||typ==='PŘÍJEM'?'active-vklad':'active-vyber');
      if(prefix==='zbrane') document.getElementById('zbrane-ucel-wrap').style.display=typ==='VÝBĚR'?'flex':'none';
    }
    async function post(url,data){
      const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      return res.json();
    }
    async function submitZbrane(){
      const typ=document.getElementById('zbrane-typ').value;
      const polozka=document.getElementById('zbrane-polozka').value;
      const mnozstvi=document.getElementById('zbrane-mnozstvi').value;
      const kategorie=document.getElementById('zbrane-kat').value;
      const ucel=document.getElementById('zbrane-ucel').value;
      showModal(
        typ==='VKLAD'?'Vložit do skladu':'Vybrat ze skladu',
        typ==='VKLAD'?'Potvrzením přidáš tuto položku do skladu organizace.':'Potvrzením odeberete tuto položku ze skladu.',
        [['Typ', typ],['Položka', polozka],['Množství', mnozstvi+' ks'],['Kategorie', kategorie],...( ucel?[['Účel', ucel]]:[])],
        async () => {
          const r=await post('/api/zbrane',{typ,polozka,mnozstvi,kategorie,ucel});
          if(r.ok){showToast('✓ Záznam uložen');setTimeout(()=>location.reload(),1500);}
          else showToast('✗ '+r.error,true);
        }
      );
    }
    function updateWeedInfo(){
      const odruda=document.getElementById('weed-odruda').value;
      const qty=parseInt(document.getElementById('weed-mnozstvi').value)||1;
      const c=WEED_CENY[odruda];
      if(!c)return;
      const box=document.getElementById('weed-info');
      box.style.display='block';
      box.innerHTML='Výroba: ~$'+(c.vyroba*qty)+'&ensp;|&ensp;Prodej: $'+(c.prodej*qty);
    }
    document.getElementById('weed-odruda').addEventListener('change',updateWeedInfo);
    document.getElementById('weed-mnozstvi').addEventListener('input',updateWeedInfo);
    updateWeedInfo();
    async function submitWeed(){
      const typ=document.getElementById('weed-typ').value;
      const odruda=document.getElementById('weed-odruda').value;
      const mnozstvi=document.getElementById('weed-mnozstvi').value;
      const c=WEED_CENY[odruda]||{vyroba:100,prodej:150};
      showModal(
        typ==='VKLAD'?'Vložit weed do skladu':'Vybrat weed ze skladu',
        'Zkontroluj detaily operace a potvrd.',
        [['Typ',typ],['Odrůda',odruda],['Množství',mnozstvi+' ks'],['Výroba celkem','~$'+(c.vyroba*mnozstvi)],['Prodej celkem','$'+(c.prodej*mnozstvi)]],
        async () => {
          const r=await post('/api/weed',{typ,odruda,mnozstvi});
          if(r.ok){showToast('✓ Weed uložen — Výroba: ~$'+r.celkVyroba+' | Prodej: $'+r.celkProdej);setTimeout(()=>location.reload(),2000);}
          else showToast('✗ '+r.error,true);
        }
      );
    }
    async function submitDrogy(){
      const typ=document.getElementById('drogy-typ').value;
      const droga=document.getElementById('drogy-droga').value;
      const mnozstvi=document.getElementById('drogy-mnozstvi').value;
      showModal(
        typ==='VKLAD'?'Vložit drogy do skladu':'Vybrat drogy ze skladu',
        'Zkontroluj detaily operace a potvrd.',
        [['Typ',typ],['Droga',droga],['Množství',mnozstvi+' ks']],
        async () => {
          const r=await post('/api/drogy',{typ,droga,mnozstvi});
          if(r.ok){showToast('✓ Drogy uloženy');setTimeout(()=>location.reload(),1500);}
          else showToast('✗ '+r.error,true);
        }
      );
    }
    async function submitUcet(){
      const typ=document.getElementById('ucet-typ').value;
      const castka=document.getElementById('ucet-castka').value;
      const valuta=document.getElementById('ucet-valuta').value;
      const poznamka=document.getElementById('ucet-poznamka').value;
      if(!castka||!poznamka)return showToast('✗ Vyplň všechna pole',true);
      const sym=valuta==='USD'?'$':'₱';
      showModal(
        typ==='PŘÍJEM'?'Zaznamenat příjem':'Zaznamenat výdaj',
        'Tato transakce bude zapsána do účetnictví organizace.',
        [['Typ',typ],['Částka',sym+castka],['Valuta',valuta],['Poznámka',poznamka]],
        async () => {
          const r=await post('/api/ucet',{typ,castka,valuta,poznamka});
          if(r.ok){showToast('✓ Transakce zaznamenána');setTimeout(()=>location.reload(),1500);}
          else showToast('✗ '+r.error,true);
        }
      );
    }
    async function submitChemky(){
      const typ=document.getElementById('chemky-typ').value;
      const chemikalie=document.getElementById('chemky-chemikalie').value;
      const mnozstvi=document.getElementById('chemky-mnozstvi').value;
      showModal(
        typ==='VKLAD'?'Vložit chemikálii do skladu':'Vybrat chemikálii ze skladu',
        'Zkontroluj detaily operace a potvrd.',
        [['Typ',typ],['Chemikálie',chemikalie],['Množství',mnozstvi+' ks']],
        async () => {
          const r=await post('/api/chemky',{typ,chemikalie,mnozstvi});
          if(r.ok){showToast('✓ Chemikálie uložena');setTimeout(()=>location.reload(),1500);}
          else showToast('✗ '+r.error,true);
        }
      );
    }
  </script>
  </body></html>`;
}

// ── RENDER NÁSTĚNKA ────────────────────────────────────────────────────────────
function renderNastenska(req) {
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Nástěnka</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'nastenska')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Albion</div>
        <h1 class="page-title">Nástěnka</h1>
        <p class="page-sub">Oznámení z aplikace kanálu — synchronizováno v reálném čase</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Oznámení organizace.</strong> Nástěnka zobrazuje zprávy přímo z interního kanálu Albionu a aktualizuje se každých 30 sekund. Nová oznámení jsou orámována pečetní barvou. Zprávu zde lze i odeslat — automaticky se publikuje do kanálu a upozorní ostatní členy.</p>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:2rem;align-items:start">
      <div>
        <div id="nastenska-list" class="nastenska-list">
          <div class="ledger-loading" style="justify-content:center;padding:3rem">Načítám oznámení...</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Nové oznámení</span></div>
        <div class="form-group" style="margin-bottom:0.8rem"><label>Název</label><input type="text" id="ann-title" placeholder="Důležité oznámení..."></div>
        <div class="form-group" style="margin-bottom:1rem"><label>Obsah</label><textarea id="ann-content" placeholder="Napište oznámení..." rows="5"></textarea></div>
        <button class="btn-submit" onclick="sendAnnouncement()">Zveřejnit</button>
        <p style="font-size:0.68rem;color:var(--text-muted);margin-top:0.8rem;text-align:center">Oznámení se odešle i do aplikace kanálu</p>
      </div>
    </div>
  </main>
  <script>
    const LAST_ID_KEY = 'albion_last_ann_id';
    let lastSeenId = localStorage.getItem(LAST_ID_KEY) || '0';

    async function loadAnnouncements() {
      const res = await fetch('/api/nastenska', { cache: 'no-store' });
      const data = await res.json();
      const list = document.getElementById('nastenska-list');
      if (!data.messages || !data.messages.length) {
        list.innerHTML = ledgerEmptyHTML('Žádná oznámení');
        return;
      }
      const newest = data.messages[0]?.id || '0';
      list.innerHTML = data.messages.map((m, i) => {
        const isNew = m.id > lastSeenId && lastSeenId !== '0' && i === 0;
        const dt = new Date(m.timestamp).toLocaleString('cs-CZ', {timeZone:'Europe/Prague'});
        return \`<div class="nastenska-item\${isNew?' new':''}">
          <div class="nastenska-meta">\${m.author} &nbsp;·&nbsp; \${dt}\${isNew ? '<span class="new-badge">NOVÉ</span>' : ''}</div>
          \${m.title ? \`<div class="nastenska-title">\${m.title.replace(/^📢\\s*/,'')}</div>\` : ''}
          <div class="nastenska-content">\${m.content || ''}</div>
        </div>\`;
      }).join('');
      lastSeenId = newest;
      localStorage.setItem(LAST_ID_KEY, newest);
    }

    async function sendAnnouncement() {
      const title = document.getElementById('ann-title').value;
      const content = document.getElementById('ann-content').value;
      if (!content.trim()) return showToast(' Obsah nemůže být prázdný', true);
      const res = await fetch('/api/nastenska', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,content})});
      const data = await res.json();
      if (data.ok) {
        showToast('OK Oznámení odesláno do aplikace');
        document.getElementById('ann-title').value = '';
        document.getElementById('ann-content').value = '';
        setTimeout(loadAnnouncements, 2000);
      } else showToast(' ' + (data.error || 'Chyba'), true);
    }

    const evtSrc = new EventSource('/api/events');
    evtSrc.addEventListener('nastenska', () => { lastSeenId = '0'; setTimeout(loadAnnouncements, 1000); });

    loadAnnouncements();
    setInterval(loadAnnouncements, 30000);
  </script>
  </body></html>`;
}

// ── RENDER KODEX ───────────────────────────────────────────────────────────────
function renderKodex(req) {
  const articles = [
    { num: 'I',    title: 'Loajalita',      text: 'Albion stojí na důvěře. Člen, který jedná proti zájmům organizace nebo vědomě poškozuje její jméno, jedná proti všem jejím členům.' },
    { num: 'II',   title: 'Diskrétnost',    text: 'Interní záležitosti Albionu zůstávají uvnitř Albionu. Informace, kontakty, plány ani záležitosti organizace nejsou určeny pro veřejnost.' },
    { num: 'III',  title: 'Reprezentace',   text: 'Každý člen reprezentuje Albion svým jednáním. Respekt si budujeme chováním, ne hlasitými slovy.' },
    { num: 'IV',   title: 'Profesionalita', text: 'Impulzivní rozhodnutí vytváří problémy. Každý člen je povinen přemýšlet nad následky svých činů a jednat s rozvahou.' },
    { num: 'V',    title: 'Jednota',        text: 'Vnitřní spory se řeší uvnitř organizace. Osobní konflikty nesmí ohrozit společné zájmy Albionu.' },
    { num: 'VI',   title: 'Ambice',         text: 'Albion není místem pro lidi bez cílů. Každý člen by měl usilovat o vlastní rozvoj i rozvoj celé organizace.' },
    { num: 'VII',  title: 'Důvěra',         text: 'Důvěra není právo. Je to výsada, kterou si člověk získává svými činy.' },
    { num: 'VIII', title: 'Respekt',        text: 'Respekt je základ každého vztahu. Ať už jde o spojence, obchodní partnery nebo konkurenci, Albion jedná s úctou a profesionálním přístupem.' },
    { num: 'IX',   title: 'Odpovědnost',    text: 'Každý člen nese odpovědnost za své činy. Výhody členství přichází společně s povinnostmi.' },
    { num: 'X',    title: 'Albion nade vše', text: 'Osobní zájmy nesmí ohrozit stabilitu organizace. Dlouhodobý úspěch Albionu je důležitější než krátkodobý prospěch jednotlivce.' },
  ];

  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Kodex</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'kodex')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Albion</div>
        <h1 class="page-title">Kodex</h1>
        <p class="page-sub">Principy a zásady, které definují každého člena Albionu</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Závazný řád organizace.</strong> Kodex Albionu je souborem deseti základních principů, které jsou závazné pro každého člena bez výjimky. Neznalost pravidel není omluvou. Porušení kodexu může vést k disciplinárnímu řízení nebo vyloučení z organizace.</p>
    <div class="lore-grid">
      <div class="chapters">
        ${articles.map((a,i) => `
        <div class="chapter">
          <div class="chapter-meta">Článek ${a.num}</div>
          <div class="chapter-title">${a.title}</div>
          <div class="chapter-text${i===0?' with-dropcap':''}">${a.text}</div>
        </div>
        `).join('')}
      </div>
      <div class="sidebar">
        <div class="sidebar-title">Obsah</div>
        ${articles.map(a => `<div class="toc-item"><span class="toc-num">${a.num}</span><span>${a.title}</span></div>`).join('')}
        <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border);font-family:var(--font-display);font-style:italic;font-size:0.95rem;color:var(--text-muted);line-height:1.9">
          Kodex Albionu je závazný pro každého člena bez výjimky.
        </div>
      </div>
    </div>
  </main>
  </body></html>`;
}

// ── RENDER AUDIT ───────────────────────────────────────────────────────────────
function renderAudit(req) {
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Audit</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'audit')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Albion</div>
        <h1 class="page-title">Audit</h1>
        <p class="page-sub">Kompletní záznam všech akcí — posledních 200 záznamů</p>
      </div>
    </div>
    <p class="folio-footnote">Audit zobrazuje chronologicky seřazené záznamy všech akcí v systému — vklady a výběry ze skladu, finanční pohyby i jejich autory. Záznamy lze filtrovat podle sekce nebo hledat textem. Finanční souhrn per člen je vidět u filtrů <strong>Vše</strong> a <strong>Účetnictví</strong>.</p>

    <div id="ucet-souhrn-wrap" style="display:none;margin-bottom:2rem">
      <div style="font-size:0.58rem;letter-spacing:0.3em;text-transform:uppercase;color:var(--brass);margin-bottom:0.8rem;opacity:0.9;font-family:var(--font-mono)">Účetnictví — souhrn per člen</div>
      <div id="ucet-souhrn-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem"></div>
    </div>

    <div class="card">
      <div style="display:flex;gap:0.8rem;margin-bottom:1.2rem;flex-wrap:wrap;align-items:center">
        <div class="audit-search-wrap" style="position:relative;flex:1;min-width:220px;max-width:340px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--text-muted);pointer-events:none"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="audit-search" placeholder="Hledat jméno nebo detail…" style="width:100%;padding:0.55rem 0.8rem 0.55rem 2.1rem;font-size:0.82rem">
        </div>
        <span id="audit-result-count" style="font-size:0.66rem;letter-spacing:0.08em;color:var(--text-muted);font-family:var(--font-mono)"></span>
      </div>
      <div style="display:flex;gap:0.4rem;margin-bottom:1.5rem;flex-wrap:wrap">
        <button class="typ-btn active-vklad" onclick="filterAudit('vse')" id="filter-vse" style="flex:none;padding:0.4rem 1rem">Vše</button>
        <button class="typ-btn" onclick="filterAudit('Zbraně')" id="filter-zbrane" style="flex:none;padding:0.4rem 1rem">Zbraně</button>
        <button class="typ-btn" onclick="filterAudit('Weed')" id="filter-weed" style="flex:none;padding:0.4rem 1rem">Weed</button>
        <button class="typ-btn" onclick="filterAudit('Drogy')" id="filter-drogy" style="flex:none;padding:0.4rem 1rem">Drogy</button>
        <button class="typ-btn" onclick="filterAudit('Chemky')" id="filter-chemky" style="flex:none;padding:0.4rem 1rem">Chemky</button>
        <button class="typ-btn" onclick="filterAudit('Účetnictví')" id="filter-ucet" style="flex:none;padding:0.4rem 1rem">Účetnictví</button>
        <span style="margin-left:auto;font-size:0.62rem;letter-spacing:0.1em;color:var(--text-muted);display:flex;align-items:center;gap:0.5rem;font-family:var(--font-mono)">
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--seal-bright)"></span>Web
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--text-dim)"></span>Discord bot
        </span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Čas</th><th>Zdroj</th><th>Sekce</th><th>Typ</th><th>Člen</th><th>Detail</th></tr></thead>
          <tbody id="audit-body"><tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2.5rem">Načítám...</td></tr></tbody>
        </table>
      </div>
    </div>
  </main>
  <script>
    let allEvents = [];
    let ucetSouhrn = {};
    let activeFilter = 'vse';
    let searchTerm = '';

    async function loadAudit() {
      const res = await fetch('/api/audit', { cache: 'no-store' });
      const data = await res.json();
      allEvents = data.events || [];
      ucetSouhrn = data.ucetSouhrn || {};
      applyAuditFilters();
      renderUcetSouhrn();
    }

    function renderUcetSouhrn() {
      const users = Object.keys(ucetSouhrn);
      const wrap = document.getElementById('ucet-souhrn-wrap');
      const grid = document.getElementById('ucet-souhrn-grid');
      if (!users.length) { wrap.style.display = 'none'; return; }
      wrap.style.display = 'block';
      grid.innerHTML = users.map(uz => {
        const s = ucetSouhrn[uz];
        const netUsd = (s.prijem_usd - s.vydaj_usd);
        const netPesos = (s.prijem_pesos - s.vydaj_pesos);
        return \`<div class="card" style="padding:1.2rem">
          <div style="font-family:var(--font-display);font-weight:600;font-size:0.9rem;margin-bottom:0.8rem;color:var(--vellum)">\${uz}</div>
          \${s.prijem_usd || s.vydaj_usd ? \`
          <div style="display:flex;justify-content:space-between;font-size:0.77rem;padding:0.25rem 0">
            <span style="color:var(--text-muted)">USD příjmy / výdaje</span>
            <span><strong style="color:#6FBF52">$\${s.prijem_usd.toLocaleString('cs-CZ')}</strong> / <strong style="color:var(--seal-bright)">$\${s.vydaj_usd.toLocaleString('cs-CZ')}</strong></span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.74rem;padding:0.2rem 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--text-muted)">Net USD</span>
            <strong style="color:\${netUsd>=0?'#6FBF52':'var(--seal-bright)'}">\${netUsd>=0?'+':''}\$\${netUsd.toLocaleString('cs-CZ')}</strong>
          </div>\` : ''}
          \${s.prijem_pesos || s.vydaj_pesos ? \`
          <div style="display:flex;justify-content:space-between;font-size:0.77rem;padding:0.25rem 0">
            <span style="color:var(--text-muted)">Pesos příjmy / výdaje</span>
            <span><strong style="color:#6FBF52">₱\${s.prijem_pesos.toLocaleString('cs-CZ')}</strong> / <strong style="color:var(--seal-bright)">₱\${s.vydaj_pesos.toLocaleString('cs-CZ')}</strong></span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.74rem;padding:0.2rem 0">
            <span style="color:var(--text-muted)">Net Pesos</span>
            <strong style="color:\${netPesos>=0?'#6FBF52':'var(--seal-bright)'}">\${netPesos>=0?'+':''}₱\${netPesos.toLocaleString('cs-CZ')}</strong>
          </div>\` : ''}
        </div>\`;
      }).join('');
    }

    function renderTable(events) {
      const tbody = document.getElementById('audit-body');
      if (!events.length) { tbody.innerHTML = '<tr><td colspan="6" style="padding:1.5rem">' + ledgerEmptyHTML('Žádné záznamy', true) + '</td></tr>'; return; }
      const SEKCE_MONO = {
        'Zbraně':      { letter: 'Z', color: 'var(--brass)' },
        'Weed':        { letter: 'W', color: '#7A9A4A' },
        'Drogy':       { letter: 'D', color: 'var(--seal-bright)' },
        'Chemky':      { letter: 'CH', color: '#6FA8C9' },
        'Účetnictví':  { letter: 'Ú', color: 'var(--brass-bright)' },
      };
      tbody.innerHTML = events.map(e => {
        const typCls = e.typ === 'VKLAD' || e.typ === 'PŘÍJEM' ? 'vklad' : 'vyber';
        const srcLabel = e.source === 'web'
          ? '<span style="font-size:0.58rem;letter-spacing:0.1em;color:var(--seal-bright);border:1px solid var(--border-seal);padding:0.15rem 0.5rem;font-family:var(--font-mono)">WEB</span>'
          : '<span style="font-size:0.58rem;letter-spacing:0.1em;color:var(--text-dim);border:1px solid var(--border);padding:0.15rem 0.5rem;font-family:var(--font-mono)">BOT</span>';
        const mono = SEKCE_MONO[e.sekce] || { letter: '?', color: 'var(--text-muted)' };
        const monoHtml = '<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border:1px solid '+mono.color+';color:'+mono.color+';font-family:var(--font-mono);font-size:0.6rem;font-weight:700;border-radius:2px;margin-right:0.55rem;flex-shrink:0;opacity:0.9">'+mono.letter+'</span>';
        return \`<tr>
          <td style="white-space:nowrap;color:var(--text-muted);font-size:0.82rem;font-family:var(--font-mono)">\${e.cas}</td>
          <td>\${srcLabel}</td>
          <td style="font-weight:500;display:flex;align-items:center">\${monoHtml}\${e.sekce}</td>
          <td><span class="badge \${typCls}">\${e.typ}</span></td>
          <td style="color:var(--vellum);font-weight:500">\${e.uzivatel}</td>
          <td style="color:var(--text-dim)">\${e.detail}</td>
        </tr>\`;
      }).join('');
    }

    function applyAuditFilters() {
      let filtered = activeFilter === 'vse' ? allEvents : allEvents.filter(e => e.sekce === activeFilter);
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        filtered = filtered.filter(e =>
          (e.uzivatel || '').toLowerCase().includes(q) ||
          (e.detail || '').toLowerCase().includes(q)
        );
      }
      renderTable(filtered);
      const countEl = document.getElementById('audit-result-count');
      if (countEl) countEl.textContent = searchTerm ? (filtered.length + ' / ' + allEvents.length + ' záznamů') : '';
    }

    function filterAudit(sekce) {
      activeFilter = sekce;
      document.querySelectorAll('[id^=filter-]').forEach(b => b.className = 'typ-btn');
      let btnId;
      if (sekce === 'vse') btnId = 'filter-vse';
      else if (sekce === 'Chemky') btnId = 'filter-chemky';
      else btnId = 'filter-' + sekce.toLowerCase().replace('ě','e').replace('í','i').replace('č','c').replace('ú','u');
      const btn = document.getElementById(btnId);
      if (btn) btn.className = 'typ-btn active-vklad';
      applyAuditFilters();
      document.getElementById('ucet-souhrn-wrap').style.display = (sekce === 'vse' || sekce === 'Účetnictví') ? 'block' : 'none';
    }

    const auditSearchInput = document.getElementById('audit-search');
    let _auditSearchDebounce = null;
    auditSearchInput.addEventListener('input', (e) => {
      clearTimeout(_auditSearchDebounce);
      _auditSearchDebounce = setTimeout(() => {
        searchTerm = e.target.value.trim();
        applyAuditFilters();
      }, 150);
    });

    loadAudit();
    const evtSrc = new EventSource('/api/events');
    ['skladUpdate','ucetUpdate'].forEach(ev => evtSrc.addEventListener(ev, () => setTimeout(loadAudit, 2000)));
  </script>
  </body></html>`;
}

// ── RENDER STATISTIKY ─────────────────────────────────────────────────────────
function renderStatistiky(req) {
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Statistiky</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'statistiky')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Albion</div>
        <h1 class="page-title">Statistiky členů</h1>
        <p class="page-sub">Detailní přehled příspěvků každého člena organizace</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Individuální aktivita členů.</strong> Statistiky zobrazují celkové příspěvky každého člena — kolik čeho vložil nebo vybral ze skladu a jak se pohybovaly jeho finance. Zelená čísla (+) označují vklady, pečetní červená (–) výběry. Data jsou načítána přímo z tabulka.</p>
    <div id="stats-container" class="stats-grid">
      <div class="ledger-loading">Načítám statistiky...</div>
    </div>
  </main>
  <script>
    function renderItemGroup(obj) {
      const keys = [...new Set([...Object.keys(obj.vklad||{}), ...Object.keys(obj.vyber||{})])];
      if (!keys.length) return '<div style="font-size:0.74rem;color:var(--text-muted);padding:0.2rem 0 0.4rem">— žádné záznamy —</div>';
      return keys.map(k => {
        const v = obj.vklad[k] || 0;
        const b = obj.vyber[k] || 0;
        return \`<div class="stat-row stat-item-group">
          <span>\${k}</span>
          <span style="display:flex;gap:0.5rem">
            \${v ? \`<strong style="color:#6FBF52">+\${v}</strong>\` : ''}
            \${b ? \`<strong style="color:var(--seal-bright)">-\${b}</strong>\` : ''}
          </span>
        </div>\`;
      }).join('');
    }

    async function loadStats() {
      const res = await fetch('/api/stats', { cache: 'no-store' });
      const data = await res.json();
      const container = document.getElementById('stats-container');
      const stats = data.stats || {};
      const users = Object.keys(stats);
      if (!users.length) { container.innerHTML = ledgerEmptyHTML('Žádná data'); return; }
      container.innerHTML = users.map((icName, idx) => {
        const s = stats[icName];
        const hasZbrane = Object.keys({...s.zbrane.vklad,...s.zbrane.vyber}).length > 0;
        const hasNaboje = Object.keys({...s.naboje.vklad,...s.naboje.vyber}).length > 0;
        const hasAkce   = Object.keys({...s.akce.vklad,...s.akce.vyber}).length > 0;
        const hasWeed   = Object.keys({...s.weed.vklad,...s.weed.vyber}).length > 0;
        const hasDrogy  = Object.keys({...s.drogy.vklad,...s.drogy.vyber}).length > 0;
        const hasChemky = s.chemky && Object.keys({...s.chemky.vklad,...s.chemky.vyber}).length > 0;
        const hasUcet   = s.ucet.prijem_usd || s.ucet.vydaj_usd || s.ucet.prijem_pesos || s.ucet.vydaj_pesos;
        return \`<div class="stat-card">
          <div class="stat-card-tab">SPIS Č. \${String(idx+1).padStart(3,'0')}</div>
          <div class="stat-card-header">
            <div>
              <div class="stat-card-name">\${icName}</div>
              \${s.discordUsername ? \`<div class="stat-card-discord">\${s.discordUsername}</div>\` : ''}
            </div>
          </div>
          \${hasZbrane ? \`<div class="stat-section-label">Zbraně</div>\${renderItemGroup(s.zbrane)}\` : ''}
          \${hasNaboje ? \`<div class="stat-section-label">Střelivo</div>\${renderItemGroup(s.naboje)}\` : ''}
          \${hasAkce   ? \`<div class="stat-section-label">Akce</div>\${renderItemGroup(s.akce)}\` : ''}
          \${hasWeed   ? \`<div class="stat-section-label">Weed</div>\${renderItemGroup(s.weed)}\` : ''}
          \${hasDrogy  ? \`<div class="stat-section-label">Drogy</div>\${renderItemGroup(s.drogy)}\` : ''}
          \${hasChemky ? \`<div class="stat-section-label">Chemikálie</div>\${renderItemGroup(s.chemky)}\` : ''}
          \${hasUcet ? \`<div class="stat-section-label">Účetnictví</div>
            \${s.ucet.prijem_usd  ? \`<div class="stat-row"><span>Příjmy USD</span><strong style="color:#6FBF52">$\${s.ucet.prijem_usd.toLocaleString('cs-CZ')}</strong></div>\` : ''}
            \${s.ucet.vydaj_usd   ? \`<div class="stat-row"><span>Výdaje USD</span><strong style="color:var(--seal-bright)">$\${s.ucet.vydaj_usd.toLocaleString('cs-CZ')}</strong></div>\` : ''}
            \${s.ucet.prijem_pesos? \`<div class="stat-row"><span>Příjmy Pesos</span><strong style="color:#6FBF52">₱\${s.ucet.prijem_pesos.toLocaleString('cs-CZ')}</strong></div>\` : ''}
            \${s.ucet.vydaj_pesos ? \`<div class="stat-row"><span>Výdaje Pesos</span><strong style="color:var(--seal-bright)">₱\${s.ucet.vydaj_pesos.toLocaleString('cs-CZ')}</strong></div>\` : ''}
          \` : ''}
          \${!hasZbrane && !hasNaboje && !hasAkce && !hasWeed && !hasDrogy && !hasChemky && !hasUcet
            ? ledgerEmptyHTML('Zatím žádná aktivita', true)
            : ''}
        </div>\`;
      }).join('');
    }
    loadStats();
  </script>
  </body></html>`;
}

// ── RENDER LORE ───────────────────────────────────────────────────────────────
function renderLore(req) {
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Historie</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'lore')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Albion</div>
        <h1 class="page-title">Historie & Původ</h1>
        <p class="page-sub">Kronika organizace — od počátků po současnost</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Kronika Albionu.</strong> Historie zaznamenává vznik a vývoj organizace Albion od prvních dnů Christophera Sinclaira v Los Santos po současnost. Každá kapitola popisuje klíčové momenty, které formovaly organizaci do podoby, jakou má dnes.</p>
    <div class="lore-grid">
      <div class="chapters">
        <div class="chapter">
          <div class="chapter-meta">Počátky</div>
          <div class="chapter-title">Vznik organizace</div>
          <div class="chapter-text with-dropcap">Albion vznikl krátce po příchodu Christophera Sinclaira do Los Santos. Po přesunu ze Spojeného království se Sinclair snažil začlenit do místního prostředí a navázat kontakty, které by mu umožnily vybudovat vlastní podnikatelské zázemí. Během prvních měsíců ve městě však zjistil, že samotné vzdělání, zkušenosti ani kapitál často nestačí. Los Santos fungovalo na osobních vazbách, vzájemných službách a důvěře mezi jednotlivci, kteří byli schopni táhnout za jeden provaz.

Právě během tohoto období se kolem něj začala formovat skupina lidí s podobným pohledem na svět. Nešlo o jedince stejné národnosti ani stejného původu. Někteří pocházeli z Evropy, jiní ze Spojených států a další z úplně odlišných částí světa. Spojovala je především ambice vybudovat si v Los Santos vlastní postavení a nechtít být závislí na cizích organizacích nebo zájmech.

Název Albion navrhl sám Sinclair. Původně měl představovat odkaz na jeho britské kořeny a připomínku místa, odkud přišel. Postupem času však získal širší význam — přestal označovat původ zakladatelů a začal symbolizovat samotnou organizaci a její identitu.</div>
        </div>
        <div class="chapter">
          <div class="chapter-meta">Kapitola 1</div>
          <div class="chapter-title">Formování organizace</div>
          <div class="chapter-text">První měsíce existence Albionu byly zaměřeny především na budování kontaktů a získávání informací o fungování města. Členové organizace se pohybovali v podnikatelském prostředí, navštěvovali společenské akce, seznamovali se s majiteli podniků a postupně si vytvářeli síť známých napříč Los Santos.

Od samého začátku bylo jasné, že Albion nechce fungovat jako pouliční gang. Zakladatelé byli přesvědčeni, že dlouhodobý vliv nelze vybudovat prostřednictvím násilí nebo neustálých konfliktů. Místo toho se soustředili na vytváření vztahů, hledání obchodních příležitostí a budování reputace spolehlivých a schopných lidí.

Organizace si postupně získávala další členy — ne na základě původu nebo národnosti, ale na základě charakteru a schopností. Každý nově příchozí musel prokázat, že dokáže přinést určitou hodnotu nejen sobě, ale i celé skupině.</div>
        </div>
        <div class="chapter">
          <div class="chapter-meta">Kapitola 2</div>
          <div class="chapter-title">Působení v Los Santos</div>
          <div class="chapter-text">V době svého vzniku nebyl Albion známým jménem. Většina obyvatel města o jeho existenci vůbec nevěděla. To však zakladatelům vyhovovalo. Jejich cílem nebylo získat okamžitou pozornost, ale vytvořit stabilní základy pro budoucí rozvoj.

Členové organizace se postupně začali angažovat v různých odvětvích služeb a podnikání. Někteří se zaměřovali na gastronomii, jiní na brigády pro nově příchozí ve městě, kavárny a podobně. Díky tomu získával Albion přístup k novým kontaktům a příležitostem, které by jednotlivci samostatně hledali jen obtížně.

Přestože organizace vystupovala navenek jako skupina zaměstnanců v různých prostorech, její skutečná síla spočívala především v propojení lidí s různými zkušenostmi a schopnostmi. Každý nový kontakt rozšiřoval možnosti celé skupiny a posiloval její postavení ve městě.</div>
        </div>
        <div class="chapter">
          <div class="chapter-meta">Kapitola 3</div>
          <div class="chapter-title">Současnost</div>
          <div class="chapter-text">Albion se v současnosti nachází ve fázi růstu. Organizace nadále rozšiřuje své kontakty, hledá nové příležitosti a snaží se upevnit své postavení v Los Santos. Její členové sdílejí přesvědčení, že úspěch nepřichází okamžitě, ale je výsledkem dlouhodobé práce, správných rozhodnutí a důvěry mezi lidmi.

Přestože je skupina stále relativně mladá, její zakladatelé věří, že mají dostatek času na to, aby vybudovali organizaci, která se stane respektovanou součástí života v Los Santos. Nechtějí být známí tím, jak hlasitě o sobě dávají vědět, ale tím, čeho dokážou dosáhnout.

Albion tak zůstává organizací postavenou na ambicích, loajalitě a společné vizi budoucnosti, kterou její členové budují krok za krokem od okamžiku, kdy se jejich cesty poprvé protnuly v ulicích Los Santos.</div>
        </div>
      </div>
      <div class="sidebar">
        <div class="sidebar-title">Kapitoly</div>
        <div class="toc-item"><span class="toc-num">—</span><span>Počátky · Vznik</span></div>
        <div class="toc-item"><span class="toc-num">01</span><span>Formování organizace</span></div>
        <div class="toc-item"><span class="toc-num">02</span><span>Působení v Los Santos</span></div>
        <div class="toc-item"><span class="toc-num">03</span><span>Současnost</span></div>
        <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border);font-family:var(--font-display);font-style:italic;font-size:0.97rem;color:var(--text-muted);line-height:1.85">
          „Nechtějí být známí tím, jak hlasitě o sobě dávají vědět, ale tím, čeho dokážou dosáhnout."
        </div>
      </div>
    </div>
  </main>
  </body></html>`;
}

// ── RENDER HIERARCHY ──────────────────────────────────────────────────────────
function renderHierarchy(req) {
  const ranks = [
    {
      rank: 'Founder', num: '01', member: 'Christopher Anthony Sinclair', isFounder: true,
      desc: 'Zakladatel Albionu a osoba určující dlouhodobé směřování organizace. Má konečné slovo při zásadních rozhodnutích, přijímání nových členů, navazování významných partnerství a určování budoucnosti organizace.',
      rights: ['Absolutní rozhodovací pravomoc','Jmenování a odvolávání členů','Schvalování projektů','Správa financí'],
    },
    {
      rank: 'Council', num: '02', member: 'Monica Williams', isFounder: false,
      desc: 'Nejužší vedení organizace. Tvoří jej lidé, kteří si získali nejvyšší důvěru zakladatele. Podílejí se na vedení organizace, rozhodování o důležitých záležitostech a koordinaci aktivit.',
      rights: ['Přístup k interním informacím','Strategická rozhodnutí','Návrhy nových členů','Dohled nad chodem'],
    },
    {
      rank: 'Senior Member', num: '03', member: 'Henry Williams', isFounder: false,
      desc: 'Zkušení a prověření členové. Jedná se o dlouhodobé členy Albionu, kteří prokázali loajalitu a schopnosti. Zastupují organizaci při obchodních jednáních a podílejí se na rozvoji projektů.',
      rights: ['Přístup k interním informacím','Doporučování nových členů','Vedení projektů','Reprezentace'],
    },
    {
      rank: 'Member', num: '04', member: null, isFounder: false,
      desc: 'Plnohodnotný člen Albionu. Člověk, který prošel zkušebním obdobím a stal se oficiální součástí organizace. Od člena se očekává aktivita, reprezentace organizace a dodržování kodexu.',
      rights: ['Přístup do interních prostor','Účast na schůzkách','Zapojení do projektů'],
    },
    {
      rank: 'Associate', num: '05', member: null, isFounder: false,
      desc: 'Kandidát na členství. Osoba, která s Albionem spolupracuje a buduje si důvěru. Associate ještě není plnohodnotným členem a nemá přístup ke všem informacím. Tato hodnost je zkušební fází.',
      rights: ['Omezený přístup','Vybrané aktivity','Možnost získat plné členství'],
    },
  ];
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Hierarchie</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'hierarchy')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Albion</div>
        <h1 class="page-title">Hierarchie</h1>
        <p class="page-sub">Struktura a řád organizace Albion</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Struktura organizace.</strong> Hierarchie definuje pět úrovní členství v Albionu — od zakladatele po Associate. Každý rank nese specifické pravomoci a odpovědnosti. Postup v hierarchii závisí na prokazování loajality, schopností a přispívání k rozvoji organizace.</p>
    <div class="rank-list">
      ${ranks.map(r => `
      <div class="rank-item${r.isFounder?' founder':''}">
        <div class="rank-num">${r.num}</div>
        <div class="rank-info" style="flex:1">
          <h3>${r.rank}</h3>
          ${r.member ? `<div class="rank-member">${r.member}</div>` : ''}
          <p>${r.desc}</p>
          <div class="rank-rights">
            ${r.rights.map(right => `<span class="rank-right-tag">${right}</span>`).join('')}
          </div>
        </div>
      </div>`).join('')}
    </div>
  </main>
  </body></html>`;
}

// ── RENDER WEED SÁZENÍ ────────────────────────────────────────────────────────
function renderWeedSazeni(req) {
  const icName = req.session.icName;
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Weed sázení</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'weed-sazeni')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Albion — Sklad</div>
        <h1 class="page-title">Weed sázení</h1>
        <p class="page-sub">Ceník, kalkulačka materiálu a sdílené odpočty růstu</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Pěstování weedu.</strong> Na jednu kytku potřebuješ daný materiál. Z jedné kytky vzniknou <strong>${WEED_PLANT.bagsPerPlant} sáčky</strong> (1 sáček = $${WEED_PLANT.bagPrice}). Kytka roste <strong>${WEED_PLANT.growHours} hodin</strong>. Kalkulačka spočítá materiál i zisk podle počtu kytek nebo rozpočtu. Spuštěné odpočty vidí všichni členové.</p>

    <div class="stats" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat"><div class="stat-label">Náklad / kytka</div><div class="stat-value">$${WEED_PLANT.costPerPlant}</div><div class="stat-sub">materiál</div></div>
      <div class="stat" style="border-top-color:var(--gold)"><div class="stat-label">Tržba / kytka</div><div class="stat-value" style="color:var(--gold)">$${WEED_PLANT.revenuePerPlant}</div><div class="stat-sub">${WEED_PLANT.bagsPerPlant} × $${WEED_PLANT.bagPrice}</div></div>
      <div class="stat" style="border-top-color:#6FBF52"><div class="stat-label">Zisk / kytka</div><div class="stat-value" style="color:#6FBF52">$${WEED_PLANT.profitPerPlant}</div><div class="stat-sub">tržba − náklad</div></div>
      <div class="stat" style="border-top-color:#6FA8C9"><div class="stat-label">Doba růstu</div><div class="stat-value" style="color:#6FA8C9">${WEED_PLANT.growHours}h</div><div class="stat-sub">na 1 kytku</div></div>
    </div>

    <div class="grid" style="grid-template-columns:1fr 1fr">
      <!-- CENÍK -->
      <div class="card">
        <div class="card-header"><span class="card-title">Ceník na 1 kytku</span><span class="card-badge">Materiál</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Položka</th><th style="text-align:center">Množství</th><th style="text-align:right">Cena/ks</th><th style="text-align:right">Celkem</th></tr></thead>
            <tbody>
              ${WEED_PLANT.items.map(it => `<tr><td>${it.name}</td><td style="text-align:center">${it.qty}×</td><td style="text-align:right;color:var(--text-muted)">$${it.unit}</td><td style="text-align:right;color:var(--gold)">$${it.cost}</td></tr>`).join('')}
              <tr style="border-top:2px solid var(--border-gold)"><td style="font-weight:600">Celkem</td><td></td><td></td><td style="text-align:right;font-weight:700;color:var(--gold)">$${WEED_PLANT.costPerPlant}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="info-box" style="display:block;margin-top:1rem">Výnos: 1 kytka → ${WEED_PLANT.bagsPerPlant} sáčky × $${WEED_PLANT.bagPrice} = <strong style="color:var(--gold)">$${WEED_PLANT.revenuePerPlant}</strong> &ensp;|&ensp; čistý zisk <strong style="color:#6FBF52">$${WEED_PLANT.profitPerPlant}</strong></div>
      </div>

      <!-- KALKULAČKA -->
      <div class="card">
        <div class="card-header"><span class="card-title">Kalkulačka</span><span class="card-badge">Výpočet</span></div>
        <div class="form-row">
          <div class="form-group"><label>Počet kytek</label><input type="number" id="calc-plants" min="0" value="1"></div>
          <div class="form-group"><label>Rozpočet $ (volitelné)</label><input type="number" id="calc-budget" min="0" placeholder="napiš peníze"></div>
        </div>
        <div class="table-wrap" style="margin-top:0.5rem">
          <table>
            <thead><tr><th>Materiál</th><th style="text-align:right">Potřeba</th></tr></thead>
            <tbody id="calc-mat"></tbody>
          </table>
        </div>
        <div class="stats" style="grid-template-columns:repeat(3,1fr);margin-top:1rem">
          <div class="stat"><div class="stat-label">Náklad</div><div class="stat-value" id="calc-cost" style="font-size:1.2rem">$0</div></div>
          <div class="stat" style="border-top-color:var(--brass)"><div class="stat-label">Tržba</div><div class="stat-value" id="calc-rev" style="font-size:1.2rem;color:var(--brass)">$0</div></div>
          <div class="stat" style="border-top-color:#6FBF52"><div class="stat-label">Zisk</div><div class="stat-value" id="calc-profit" style="font-size:1.2rem;color:#6FBF52">$0</div></div>
        </div>
        <div class="info-box" id="calc-note" style="display:block;margin-top:1rem"></div>
      </div>
    </div>

    <!-- ODPOČTY -->
    <div class="card" style="margin-top:0.5rem">
      <div class="card-header"><span class="card-title">Odpočty růstu</span><span class="card-badge">Sdílené — vidí všichni</span></div>
      <div class="form-row">
        <div class="form-group"><label>IC jméno</label><input type="text" id="t-icname" value="${icName ? icName.replace(/"/g,'&quot;') : ''}" placeholder="Jméno postavy"></div>
        <div class="form-group"><label>Postal (4 číslice)</label><input type="text" id="t-postal" maxlength="4" inputmode="numeric" placeholder="1234"></div>
        <div class="form-group"><label>Počet kytek</label><input type="number" id="t-plants" min="1" value="1"></div>
      </div>
      <button class="btn-submit" onclick="startTimer()">Spustit odpočet (${WEED_PLANT.growHours}h)</button>
      <div id="timers-list" style="margin-top:1.5rem"><p style="color:var(--text-muted);font-size:0.84rem">Načítám odpočty...</p></div>
    </div>
  </main>
  <div class="toast" id="toast"></div>
  <script>
    const RECIPE = ${JSON.stringify(WEED_PLANT)};
    const money = n => '$' + Math.round(n).toLocaleString('cs-CZ');

    // ── KALKULAČKA ──
    function recalc(source) {
      const plantsInput = document.getElementById('calc-plants');
      const budgetInput = document.getElementById('calc-budget');
      let plants = parseInt(plantsInput.value) || 0;
      if (source === 'budget') {
        const budget = parseFloat(budgetInput.value) || 0;
        plants = Math.floor(budget / RECIPE.costPerPlant);
        plantsInput.value = plants;
      }
      const cost = plants * RECIPE.costPerPlant;
      const rev = plants * RECIPE.revenuePerPlant;
      const profit = rev - cost;
      document.getElementById('calc-mat').innerHTML = RECIPE.items.map(it =>
        \`<tr><td>\${it.name}</td><td style="text-align:right">\${it.qty * plants}× <span style="color:var(--text-muted)">($\${it.cost * plants})</span></td></tr>\`
      ).join('') + \`<tr><td style="color:var(--text-muted)">Sáčky na prodej</td><td style="text-align:right;color:var(--gold)">\${plants * RECIPE.bagsPerPlant}×</td></tr>\`;
      document.getElementById('calc-cost').textContent = money(cost);
      document.getElementById('calc-rev').textContent = money(rev);
      document.getElementById('calc-profit').textContent = money(profit);
      const budgetVal = parseFloat(budgetInput.value) || 0;
      let note = plants + ' kytek · roste ' + RECIPE.growHours + 'h · ' + (plants * RECIPE.bagsPerPlant) + ' sáčků';
      if (source === 'budget' && budgetVal) {
        const zbytek = budgetVal - cost;
        note += ' · z rozpočtu ' + money(budgetVal) + ' zbude ' + money(zbytek);
      }
      document.getElementById('calc-note').textContent = note;
    }
    document.getElementById('calc-plants').addEventListener('input', () => recalc('plants'));
    document.getElementById('calc-budget').addEventListener('input', () => recalc('budget'));
    recalc('plants');

    // ── ODPOČTY ──
    let serverOffset = 0;
    let timers = [];
    function fmtRemain(ms) {
      if (ms <= 0) return 'Hotovo';
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      return (h>0?h+'h ':'') + String(m).padStart(2,'0') + 'm ' + String(s).padStart(2,'0') + 's';
    }
    function renderTimers() {
      const wrap = document.getElementById('timers-list');
      if (!timers.length) { wrap.innerHTML = ledgerEmptyHTML('Žádné probíhající odpočty', true); return; }
      wrap.innerHTML = timers.map(t => {
        const dur = t.endsAt - t.startedAt;
        return \`<div class="card" style="padding:1.1rem;margin-bottom:0.9rem">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap">
            <div>
              <div style="font-family:var(--font-display);font-weight:600;font-size:0.95rem;color:var(--vellum)">\${t.icName} <span style="color:var(--text-muted);font-size:0.8rem">· Postal \${t.postal}</span></div>
              <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.25rem">\${t.plants} kytek · spustil \${t.createdBy||'—'}</div>
            </div>
            <div style="text-align:right">
              <div class="cd-remain" data-ends="\${t.endsAt}" style="font-family:var(--font-mono);font-size:1.25rem;color:var(--brass)">–</div>
              <button onclick="removeTimer('\${t.id}')" style="margin-top:0.4rem;background:none;border:1px solid var(--border);color:var(--text-muted);font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.25rem 0.6rem;cursor:pointer;border-radius:3px">Smazat</button>
            </div>
          </div>
          <div style="height:7px;background:var(--border);border-radius:4px;margin-top:0.9rem;overflow:hidden">
            <div class="cd-bar" data-start="\${t.startedAt}" data-ends="\${t.endsAt}" style="height:100%;width:0%;background:linear-gradient(90deg,#6FBF52,var(--brass));transition:width 1s linear"></div>
          </div>
        </div>\`;
      }).join('');
      tick();
    }
    function tick() {
      const nowS = Date.now() + serverOffset;
      document.querySelectorAll('.cd-remain').forEach(el => {
        const ends = parseInt(el.dataset.ends);
        const rem = ends - nowS;
        el.textContent = fmtRemain(rem);
        el.style.color = rem <= 0 ? '#6FBF52' : 'var(--brass)';
        if (rem <= 0) el.textContent = 'Hotovo';
      });
      document.querySelectorAll('.cd-bar').forEach(el => {
        const start = parseInt(el.dataset.start), ends = parseInt(el.dataset.ends);
        const pct = Math.min(100, Math.max(0, ((nowS - start) / (ends - start)) * 100));
        el.style.width = pct + '%';
      });
    }
    async function loadTimers() {
      try {
        const res = await fetch('/api/weed-timers', { cache: 'no-store' });
        const d = await res.json();
        timers = d.timers || [];
        serverOffset = (d.now || Date.now()) - Date.now();
        renderTimers();
      } catch (e) { /* ignore */ }
    }
    async function startTimer() {
      const icName = document.getElementById('t-icname').value.trim();
      const postal = document.getElementById('t-postal').value.trim();
      const plants = document.getElementById('t-plants').value;
      if (!icName) return showToast('Vyplň IC jméno', true);
      if (!/^\\d{4}$/.test(postal)) return showToast('Postal musí být 4 číslice', true);
      const res = await fetch('/api/weed-timers', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({icName,postal,plants})});
      const d = await res.json();
      if (d.ok) { showToast('Odpočet spuštěn'); document.getElementById('t-postal').value=''; loadTimers(); }
      else showToast(d.error, true);
    }
    async function removeTimer(id) {
      const res = await fetch('/api/weed-timers/remove', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
      const d = await res.json();
      if (d.ok) loadTimers(); else showToast(d.error, true);
    }
    loadTimers();
    setInterval(tick, 1000);
    const evtT = new EventSource('/api/events');
    evtT.addEventListener('weedTimer', () => setTimeout(loadTimers, 300));
  </script>
  </body></html>`;
}

// ── RENDER BLACKBOOK ──────────────────────────────────────────────────────────
function renderBlackbook(req) {
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Blackbook</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'blackbook')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Albion</div>
        <h1 class="page-title">Blackbook</h1>
        <p class="page-sub">Reporty a analýzy z dostupných dat — sklad, finance, členové</p>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div id="bb-generated" style="font-size:0.64rem;letter-spacing:0.1em;color:var(--text-muted);text-transform:uppercase;font-family:var(--font-mono)"></div>
      </div>
    </div>
    <p class="folio-footnote"><strong>Analytické reporty.</strong> Blackbook generuje reporty výhradně z dat dostupných na webu a v tabulkách (Google Sheets) — finance, sklad, zbraně, drogy a aktivita členů. Vyber kapitolu rejstříku níže.</p>

    <div class="report-nav">
      <button class="report-nav-item active" data-sec="finance" onclick="bbTab('finance')">I. Finanční</button>
      <button class="report-nav-item" data-sec="aktivita" onclick="bbTab('aktivita')">II. Aktivita členů</button>
      <button class="report-nav-item" data-sec="sklad" onclick="bbTab('sklad')">III. Inventura a sklad</button>
      <button class="report-nav-item" data-sec="zbrane" onclick="bbTab('zbrane')">IV. Zbraně</button>
      <button class="report-nav-item" data-sec="drogy" onclick="bbTab('drogy')">V. Drogy a výroby</button>
      <button class="report-nav-item" data-sec="bezpecnost" onclick="bbTab('bezpecnost')">VI. Audit a bezpečnost</button>
    </div>

    <div id="bb-loading" class="ledger-loading" style="margin-top:1.5rem">Generuji reporty…</div>
    <div id="bb-finance" class="report-section active"></div>
    <div id="bb-aktivita" class="report-section"></div>
    <div id="bb-sklad" class="report-section"></div>
    <div id="bb-zbrane" class="report-section"></div>
    <div id="bb-drogy" class="report-section"></div>
    <div id="bb-bezpecnost" class="report-section"></div>
  </main>
  <script>
    let D = null;
    const money = n => '$' + Math.round(n||0).toLocaleString('cs-CZ');
    const pesos = n => '₱' + Math.round(n||0).toLocaleString('cs-CZ');
    const esc = s => (s==null?'':String(s)).replace(/</g,'&lt;');

    function bbTab(sec) {
      document.querySelectorAll('.report-nav-item').forEach(b => b.classList.toggle('active', b.dataset.sec === sec));
      document.querySelectorAll('.report-section').forEach(s => s.classList.toggle('active', s.id === 'bb-' + sec));
    }

    // ── Ledger bar — a hand-ruled row, not a progress-bar widget ──
    function ledgerBars(rows, max) {
      if (!rows.length) return ledgerEmptyHTML('Žádná data', true);
      const mx = max || Math.max(...rows.map(r => r.val), 1);
      return rows.map(r => \`<div class="ledger-bar-row">
        <span class="ledger-bar-name">\${esc(r.name)}</span>
        <span class="ledger-bar-track"><span class="ledger-bar-fill" style="width:\${Math.max(1.5,(r.val/mx)*100)}%"></span></span>
        <span class="ledger-bar-val">\${r.label||r.val}</span>
      </div>\`).join('');
    }

    function lineChart(points, key, color, fmt) {
      if (!points || points.length < 2) return ledgerEmptyHTML('Nedostatek dat pro graf', true);
      const W = 760, H = 160, pad = 8;
      const vals = points.map(p => p[key]);
      const min = Math.min(...vals, 0), max = Math.max(...vals, 1);
      const range = (max - min) || 1;
      const n = points.length;
      const x = i => pad + (i / (n - 1)) * (W - 2*pad);
      const y = v => H - pad - ((v - min) / range) * (H - 2*pad);
      const pts = points.map((p,i) => x(i).toFixed(1) + ',' + y(p[key]).toFixed(1)).join(' ');
      const area = 'M' + x(0).toFixed(1) + ',' + (H-pad) + ' L' + pts.split(' ').join(' L') + ' L' + x(n-1).toFixed(1) + ',' + (H-pad) + ' Z';
      const last = vals[vals.length-1];
      return \`<div style="overflow-x:auto"><svg viewBox="0 0 \${W} \${H}" style="width:100%;min-width:480px;height:auto;display:block">
        <path d="\${area}" fill="\${color}" opacity="0.08"/>
        <polyline points="\${pts}" fill="none" stroke="\${color}" stroke-width="1.5"/>
        <line x1="\${pad}" y1="\${y(0).toFixed(1)}" x2="\${W-pad}" y2="\${y(0).toFixed(1)}" stroke="var(--border)" stroke-dasharray="1 4"/>
      </svg></div>
      <div style="display:flex;justify-content:space-between;font-size:0.64rem;color:var(--text-muted);margin-top:0.4rem;font-family:var(--font-mono);border-top:1px solid var(--border);padding-top:0.5rem">
        <span>min \${(fmt||money)(min)}</span><span style="color:var(--brass)">aktuálně \${(fmt||money)(last)}</span><span>max \${(fmt||money)(max)}</span></div>\`;
    }

    function dualLineChart(points, keyA, keyB, colorA, colorB, labelA, labelB) {
      if (!points || points.length < 2) return ledgerEmptyHTML('Nedostatek dat pro graf', true);
      const W = 760, H = 160, pad = 8;
      const allVals = points.flatMap(p => [p[keyA], p[keyB]]);
      const min = Math.min(...allVals, 0), max = Math.max(...allVals, 1);
      const range = (max - min) || 1;
      const n = points.length;
      const x = i => pad + (i / (n - 1)) * (W - 2*pad);
      const y = v => H - pad - ((v - min) / range) * (H - 2*pad);
      const ptsA = points.map((p,i) => x(i).toFixed(1) + ',' + y(p[keyA]).toFixed(1)).join(' ');
      const ptsB = points.map((p,i) => x(i).toFixed(1) + ',' + y(p[keyB]).toFixed(1)).join(' ');
      return \`<div style="overflow-x:auto"><svg viewBox="0 0 \${W} \${H}" style="width:100%;min-width:480px;height:auto;display:block">
        <polyline points="\${ptsA}" fill="none" stroke="\${colorA}" stroke-width="1.5"/>
        <polyline points="\${ptsB}" fill="none" stroke="\${colorB}" stroke-width="1.5" stroke-dasharray="4 3"/>
        <line x1="\${pad}" y1="\${y(0).toFixed(1)}" x2="\${W-pad}" y2="\${y(0).toFixed(1)}" stroke="var(--border)" stroke-dasharray="1 4"/>
      </svg></div>
      <div class="bb-legend" style="display:flex;gap:1.4rem;font-size:0.64rem;color:var(--text-muted);margin-top:0.4rem;font-family:var(--font-mono)">
        <span><span style="display:inline-block;width:14px;border-top:1.5px solid \${colorA};vertical-align:middle;margin-right:5px"></span>\${labelA}</span>
        <span><span style="display:inline-block;width:14px;border-top:1.5px dashed \${colorB};vertical-align:middle;margin-right:5px"></span>\${labelB}</span>
      </div>\`;
    }

    function renderTips(tips) {
      if (!tips || !tips.length) return ledgerEmptyHTML('Žádná doporučení', true);
      const cfg = { good: { icon: '+', color: '#6FBF52' }, warning: { icon: '!', color: 'var(--seal-bright)' }, info: { icon: '§', color: 'var(--brass)' } };
      return tips.map(t => {
        const c = cfg[t.type] || cfg.info;
        return \`<div class="recommendation">
          <span class="recommendation-mark" style="color:\${c.color}">\${c.icon}</span>
          <div><div class="recommendation-cat" style="color:\${c.color}">\${esc(t.cat)}</div><div class="recommendation-text">\${esc(t.text)}</div></div>
        </div>\`;
      }).join('');
    }

    function reportFigure(title, f) {
      const netUsd = f.prijem_usd - f.vydaj_usd, netPesos = f.prijem_pesos - f.vydaj_pesos;
      return \`<div class="report-figure">
        <div class="report-figure-label">\${title}</div>
        <div class="report-figure-net" style="color:\${netUsd>=0?'#6FBF52':'var(--seal-bright)'}">\${netUsd>=0?'+':''}\${money(netUsd)}</div>
        <div class="report-figure-line"><span>Příjem</span><span style="color:#6FBF52">\${money(f.prijem_usd)}</span></div>
        <div class="report-figure-line"><span>Výdaj</span><span style="color:var(--seal-bright)">\${money(f.vydaj_usd)}</span></div>
        \${(f.prijem_pesos||f.vydaj_pesos)?\`<div class="report-figure-line"><span>Net Pesos</span><span style="color:\${netPesos>=0?'#6FBF52':'var(--seal-bright)'}">\${netPesos>=0?'+':''}\${pesos(netPesos)}</span></div>\`:''}
      </div>\`;
    }

    function tbl(headers, rows) {
      if (!rows.length) return ledgerEmptyHTML('Žádné záznamy', true);
      return \`<div class="table-wrap"><table><thead><tr>\${headers.map(h=>'<th'+(h.r?' style="text-align:right"':'')+'>'+h.t+'</th>').join('')}</tr></thead>
        <tbody>\${rows.map(r=>'<tr>'+r.map((c,i)=>'<td'+(headers[i]&&headers[i].r?' style="text-align:right"':'')+'>'+c+'</td>').join('')+'</tr>').join('')}</tbody></table></div>\`;
    }

    function renderFinance() {
      const f = D.finance;
      let h = '<div class="folio-label">Příjmy a výdaje za období</div>';
      h += '<div class="report-figures">' + reportFigure('Dnes', f.periods.day) + reportFigure('Týden', f.periods.week) + reportFigure('Měsíc', f.periods.month) + reportFigure('Celkem', f.periods.total) + '</div>';

      h += '<div class="folio-spread"><div class="folio-panel"><div class="folio-label">Vývoj zůstatku účtu (SAD)</div><div style="height:1rem"></div>' + lineChart(f.balanceTimeline, 'usd', '#C9A227') + '</div>';
      h += '<div class="marginalia"><div class="m-line"><span>Záznamů v historii</span><span class="m-val">' + (f.balanceTimeline.length||0) + '</span></div></div></div>';

      h += '<div class="folio-rule tight"></div>';
      h += '<div class="folio-label">Vývoj hodnoty skladu</div><div style="height:1rem"></div>' + lineChart(f.stockTimeline, 'value', '#6FA8C9');

      h += '<div class="folio-rule tight"></div>';
      h += '<div class="folio-label">Kdo vydělal nejvíc (příjem SAD)</div><div style="height:1rem"></div>';
      h += ledgerBars(f.topEarners.map(e => ({ name: e.member, val: e.prijem_usd, label: money(e.prijem_usd) })));

      h += '<div class="folio-rule tight"></div>';
      h += '<div class="folio-spread"><div class="folio-panel"><div class="folio-label">Výkonnost — příjmy vs. výdaje (8 týdnů)</div><div style="height:1rem"></div>' + dualLineChart(f.weeklyTrend, 'income', 'expense', '#6FBF52', '#B23B3B', 'Příjem', 'Výdaj') + '</div>';
      h += '<div class="folio-panel"><div class="folio-label">Tržby podle kategorie</div><div style="height:1rem"></div>' + ledgerBars(f.revenueByCategory.map(r => ({ name: r.sekce, val: r.value, label: money(r.value) }))) + '</div></div>';

      h += '<div class="folio-rule tight"></div>';
      h += '<div class="folio-label">Doporučení rejstříku</div><div style="height:1rem"></div>' + renderTips(f.tips);
      document.getElementById('bb-finance').innerHTML = h;
    }

    function renderAktivita() {
      const a = D.aktivita;
      let h = \`<div class="report-figures">
        <div class="report-figure"><div class="report-figure-label">Členů celkem</div><div class="report-figure-net" style="color:var(--vellum)">\${a.total}</div></div>
        <div class="report-figure"><div class="report-figure-label">Neaktivní (7+ dní)</div><div class="report-figure-net" style="color:var(--seal-bright)">\${a.inactiveCount}</div></div>
        <div class="report-figure"><div class="report-figure-label">Aktivní</div><div class="report-figure-net" style="color:#6FBF52">\${a.total - a.inactiveCount}</div></div>
        <div class="report-figure"></div>
      </div>\`;
      h += '<div class="folio-label">Členové podle poslední aktivity</div><div style="height:1rem"></div>';
      h += tbl([{t:'Člen'},{t:'Poslední aktivita'},{t:'Zdroj'},{t:'Web login'},{t:'Stav',r:true},{t:'Pohyby',r:true},{t:'Vklady/Výběry',r:true},{t:'Vklad SAD',r:true}],
        a.members.map(m => [
          esc(m.member) + (m.discord?' <span style="color:var(--text-muted);font-size:0.7rem">'+esc(m.discord)+'</span>':''),
          m.lastCas ? esc(m.lastCas) : '<span style="color:var(--text-muted)">nikdy</span>',
          m.lastZdroj ? '<span style="color:var(--text-muted);font-size:0.72rem">'+esc(m.lastZdroj)+'</span>' : '—',
          m.lastWebLoginCas ? '<span style="color:var(--text-dim);font-size:0.74rem">'+esc(m.lastWebLoginCas)+'</span>' : '<span style="color:var(--text-muted)">—</span>',
          m.inactive ? '<span class="badge vyber">'+(m.daysSince!=null?m.daysSince+' dní':'—')+'</span>' : '<span class="badge vklad">aktivní</span>',
          m.pohyby,
          '<span style="color:#6FBF52">'+m.vklady+'</span> / <span style="color:#B23B3B">'+m.vybery+'</span>',
          money(m.ucetVkladUsd)
        ]));
      document.getElementById('bb-aktivita').innerHTML = h;
    }

    function renderSklad() {
      const s = D.sklad;
      const bySekce = {};
      s.stockList.forEach(i => { (bySekce[i.sekce] = bySekce[i.sekce] || []).push(i); });
      let h = '<div class="folio-label">Aktuální stav skladu</div><div style="height:1rem"></div>';
      h += '<div class="manifest-grid">';
      Object.entries(bySekce).forEach(([sek, items]) => {
        h += '<div class="manifest-col"><div class="manifest-col-head"><span class="manifest-col-title">'+sek+'</span></div>' +
          items.map(i => '<div class="manifest-row"><span class="mr-name">'+esc(i.item)+'</span><span class="mr-dots"></span><span class="mr-val" style="color:'+(i.current<=0?'var(--seal-bright)':'var(--text-dim)')+'">'+i.current+' ks</span></div>').join('') + '</div>';
      });
      h += '</div>';

      h += '<div class="folio-rule tight"></div>';
      h += '<div class="folio-spread"><div class="folio-panel"><div class="folio-label">Nejvíc ukládali</div><div style="height:1rem"></div>' + ledgerBars(s.topVklad.map(m=>({name:m.member,val:m.vklad,label:m.vklad+' ks'}))) + '</div>';
      h += '<div class="folio-panel"><div class="folio-label">Nejvíc vybírali</div><div style="height:1rem"></div>' + ledgerBars(s.topVyber.map(m=>({name:m.member,val:m.vyber,label:m.vyber+' ks'}))) + '</div></div>';

      h += '<div class="folio-rule tight"></div>';
      h += '<div class="folio-label">Predikce došlých zásob (dle spotřeby za 30 dní)</div><div style="height:1rem"></div>';
      h += tbl([{t:'Položka'},{t:'Sekce'},{t:'Stav',r:true},{t:'Spotřeba/den',r:true},{t:'Dojde za',r:true}],
        s.predikce.length ? s.predikce.map(p => [esc(p.item), p.sekce, p.current+' ks', p.perDay+' ks', '<span style="color:'+(p.daysLeft<=3?'var(--seal-bright)':p.daysLeft<=7?'var(--brass)':'var(--text-dim)')+'">'+p.daysLeft+' dní</span>']) : []);

      h += '<div class="folio-rule tight"></div>';
      h += '<div class="folio-label">Podezřelé pohyby (velké výběry)</div><div style="height:1rem"></div>';
      h += tbl([{t:'Čas'},{t:'Sekce'},{t:'Položka'},{t:'Množ.',r:true},{t:'Člen'},{t:'Důvod'}],
        s.podezrele.map(p => [esc(p.cas), p.sekce, esc(p.item), p.qty, esc(p.member), '<span style="color:var(--brass)">'+esc(p.duvod)+'</span>']));
      document.getElementById('bb-sklad').innerHTML = h;
    }

    function renderZbrane() {
      const z = D.zbrane;
      let h = '<div class="folio-label">Kdo vybral nejvíc zbraní</div><div style="height:1rem"></div>';
      h += ledgerBars(z.topVyber.map(m=>({name:m.member,val:m.qty,label:m.qty+' ks'})));

      h += '<div class="folio-rule tight"></div>';
      h += '<div class="folio-label">Nevrácené zbraně (čistý zůstatek výběr − vklad)</div><div style="height:1rem"></div>';
      h += tbl([{t:'Člen'},{t:'Zbraň'},{t:'Nevráceno',r:true}],
        z.nevraceno.map(n => [esc(n.member), esc(n.item), '<span class="badge vyber">'+n.outstanding+' ks</span>']));

      h += '<div class="folio-rule tight"></div>';
      h += '<div class="folio-label">Historie vydání zbraní</div><div style="height:1rem"></div>';
      h += tbl([{t:'Čas'},{t:'Položka'},{t:'Množ.',r:true},{t:'Člen'},{t:'Účel'}],
        z.historie.map(e => [esc(e.cas), esc(e.item), e.qty, esc(e.member), esc(e.ucel)||'—']));
      document.getElementById('bb-zbrane').innerHTML = h;
    }

    function renderDrogy() {
      const d = D.drogy;
      const drugs = [...new Set([...Object.keys(d.drugProd), ...Object.keys(d.drugVyber)])];
      let h = '<div class="folio-label">Výroba, prodej a ziskovost drog</div><div style="height:1rem"></div>';
      h += tbl([{t:'Droga'},{t:'Vyrobeno',r:true},{t:'Vybráno/prodáno',r:true},{t:'Hodnota prodeje',r:true}],
        drugs.map(dr => [esc(dr), '<span style="color:#6FBF52">'+(d.drugProd[dr]||0)+'</span>', '<span style="color:#B23B3B">'+(d.drugVyber[dr]||0)+'</span>', '<span style="color:var(--brass)">'+money(d.drugZisk[dr]||0)+'</span>']));

      h += \`<div class="report-figures">
        <div class="report-figure"><div class="report-figure-label">Weed vyrobeno</div><div class="report-figure-net" style="color:#6FBF52">\${d.weedProd}</div></div>
        <div class="report-figure"><div class="report-figure-label">Weed vybráno</div><div class="report-figure-net" style="color:#B23B3B">\${d.weedVyber}</div></div>
        <div class="report-figure"><div class="report-figure-label">Hodnota prodeje</div><div class="report-figure-net" style="color:var(--brass)">\${money(d.weedZisk)}</div></div>
        <div class="report-figure"></div>
      </div>\`;

      h += '<div class="folio-spread"><div class="folio-panel"><div class="folio-label">Kdo nejvíc navařil (drogy + weed)</div><div style="height:1rem"></div>' + ledgerBars(d.topVarici.map(m=>({name:m.member,val:m.qty,label:m.qty+' ks'}))) + '</div>';
      const chem = Object.entries(d.chemSpotreba).map(([k,v])=>({name:k,val:v,label:v+' ks'})).sort((a,b)=>b.val-a.val);
      h += '<div class="folio-panel"><div class="folio-label">Spotřeba chemikálií</div><div style="height:1rem"></div>' + ledgerBars(chem) + '</div></div>';
      document.getElementById('bb-drogy').innerHTML = h;
    }

    function renderBezpecnost() {
      const b = D.bezpecnost;
      let h = '<div class="folio-label">Dlužníci — vybral zboží (weed/drogy), ale nevložil dost peněz</div><div style="height:1rem"></div>';
      h += tbl([{t:'Člen'},{t:'Hodnota vybraného zboží',r:true},{t:'Vložené peníze (SAD)',r:true},{t:'Dluh',r:true}],
        b.dluznici.map(d => [esc(d.member), money(d.goodsValue), money(d.deposited), '<span class="badge vyber">'+money(d.dluh)+'</span>']));

      h += '<div class="folio-rule tight"></div>';
      h += '<div class="folio-label">Podezřelé transakce (velké výdaje)</div><div style="height:1rem"></div>';
      h += tbl([{t:'Čas'},{t:'Člen'},{t:'Částka',r:true},{t:'Poznámka'},{t:'Důvod'}],
        b.podezreleTransakce.map(t => [esc(t.cas), esc(t.member), (t.valuta==='USD'?money(t.castka):pesos(t.castka)), esc(t.pozn), '<span style="color:var(--brass)">'+esc(t.duvod)+'</span>']));
      document.getElementById('bb-bezpecnost').innerHTML = h;
    }

    async function loadBlackbook() {
      try {
        const res = await fetch('/api/blackbook', { cache: 'no-store' });
        D = await res.json();
        if (!D.ok) { document.getElementById('bb-loading').textContent = 'Chyba načtení dat: ' + (D.error||'neznámá'); return; }
        document.getElementById('bb-loading').style.display = 'none';
        document.getElementById('bb-generated').textContent = 'Vygenerováno ' + (D.generatedAt||'');
        renderFinance(); renderAktivita(); renderSklad(); renderZbrane(); renderDrogy(); renderBezpecnost();
      } catch (e) {
        document.getElementById('bb-loading').textContent = 'Chyba: ' + e.message;
      }
    }
    loadBlackbook();
  </script>
  </body></html>`;
}

function renderProfitCentrum(req) {
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Profit centrum</title>
  ${baseStyles()}
  <style>
    .pc-podium{text-align:left;padding:1.6rem 0 1.2rem;border-bottom:2px solid var(--border-brass)}
    .pc-podium-icon{font-family:var(--font-display);font-size:1.3rem;margin-bottom:0.5rem;color:var(--brass);width:2.2rem;height:2.2rem;border:1px solid var(--border-brass);border-radius:50%;display:flex;align-items:center;justify-content:center}
    .pc-podium-name{font-family:var(--font-display);font-weight:600;font-size:1.3rem;color:var(--vellum-bright);margin-bottom:0.3rem;min-height:1.5rem;line-height:1.15}
    .pc-podium-value{font-size:2.1rem;color:var(--brass);font-weight:700;font-family:var(--font-display);line-height:1}
    .pc-podium-sub{font-size:0.64rem;color:var(--text-muted);margin-top:0.5rem;text-transform:uppercase;letter-spacing:0.12em;font-family:var(--font-mono)}
    .pc-rank-row{display:flex;align-items:baseline;gap:0.7rem;font-size:0.84rem;padding:0.55rem 0;border-bottom:1px solid var(--border)}
    .pc-rank-row:last-child{border-bottom:none}
    .pc-rank-num{flex:0 0 1.4rem;color:var(--text-muted);font-size:0.68rem;font-family:var(--font-mono)}
    .pc-rank-name{flex:1;color:var(--vellum);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-display)}
    .pc-rank-val{flex:0 0 auto;color:var(--text-dim);font-weight:600;font-family:var(--font-mono);font-size:0.8rem}
    .pc-leaderboard-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
    .pc-leaderboard-col{padding:0 2rem}
    .pc-leaderboard-col:first-child{padding-left:0}
    .pc-leaderboard-col:last-child{padding-right:0}
    .pc-leaderboard-col + .pc-leaderboard-col{border-left:1px solid var(--border)}
    @media(max-width:900px){
      .pc-leaderboard-grid{grid-template-columns:1fr;border-top:none;border-bottom:none}
      .pc-leaderboard-col{padding:1.4rem 0;border-top:1px solid var(--border)}
      .pc-leaderboard-col + .pc-leaderboard-col{border-left:none}
      .pc-leaderboard-col:first-child{border-top:none}
    }
  </style>
  </head><body>
  ${renderNav(req, 'profit-centrum')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Albion — Blackbook</div>
        <h1 class="page-title">Profit centrum</h1>
        <p class="page-sub">Přehled ziskovosti organizace — počítáno z účetnictví a skladů</p>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div id="pc-generated" style="font-size:0.64rem;letter-spacing:0.1em;color:var(--text-muted);text-transform:uppercase;font-family:var(--font-mono)"></div>
      </div>
    </div>
    <p class="folio-footnote"><strong>Profit centrum.</strong> Report se počítá výhradně z reálných dat z webu — Účetnictví (peníze) a sklady Drogy/Weed. „Zisk frakce“ = příjem − výdaj v Účetnictví za dané období. „Tržby ze skladu“ = hodnota vybraných (prodaných) drog a weedu dle aktuálního ceníku.</p>

    <div id="pc-loading" class="ledger-loading">Generuji report…</div>

    <div id="pc-content" style="display:none">
      <div class="folio-label">Kolik vydělala frakce</div>
      <div class="report-figures" id="pc-earn-cards"></div>

      <div class="folio-rule tight"></div>

      <div class="report-nav" id="pc-period-nav">
        <button class="report-nav-item" data-p="day" onclick="pcTab('day')">Dnes</button>
        <button class="report-nav-item" data-p="week" onclick="pcTab('week')">Tento týden</button>
        <button class="report-nav-item" data-p="month" onclick="pcTab('month')">Tento měsíc</button>
        <button class="report-nav-item active" data-p="total" onclick="pcTab('total')">Celkem</button>
      </div>
      <div style="height:1.6rem"></div>

      <div class="pc-leaderboard-grid">
        <div class="pc-leaderboard-col">
          <div class="pc-podium" id="pc-dealer-top"></div>
          <div id="pc-dealer-list"></div>
        </div>
        <div class="pc-leaderboard-col">
          <div class="pc-podium" id="pc-drug-top"></div>
          <div id="pc-drug-list"></div>
        </div>
        <div class="pc-leaderboard-col">
          <div class="pc-podium" id="pc-member-top"></div>
          <div id="pc-member-list"></div>
        </div>
      </div>
    </div>
  </main>
  <script>
    let PD = null;
    let pcPeriod = 'total';
    const money = n => '$' + Math.round(n||0).toLocaleString('cs-CZ');
    const pesos = n => '₱' + Math.round(n||0).toLocaleString('cs-CZ');
    const esc = s => (s==null?'':String(s)).replace(/</g,'&lt;');

    function earnFigure(title, p) {
      const zisk = p.zisk;
      const color = zisk >= 0 ? '#6FBF52' : '#B23B3B';
      let h = '<div class="report-figure">';
      h += '<div class="report-figure-label">' + esc(title) + '</div>';
      h += '<div class="report-figure-net" style="color:' + color + '">' + (zisk>=0?'+':'') + money(zisk) + '</div>';
      h += '<div class="report-figure-line"><span>Příjem</span><strong style="color:#6FBF52">' + money(p.prijem_usd) + '</strong></div>';
      h += '<div class="report-figure-line"><span>Výdaj</span><strong style="color:#B23B3B">' + money(p.vydaj_usd) + '</strong></div>';
      if (p.prijem_pesos || p.vydaj_pesos) {
        h += '<div class="report-figure-line"><span>Pesos</span><strong>' + pesos(p.prijem_pesos) + ' / ' + pesos(p.vydaj_pesos) + '</strong></div>';
      }
      h += '<div class="report-figure-line" style="border-top:1px dotted var(--border);padding-top:0.3rem;margin-top:0.2rem"><span>Tržby skladu</span><strong style="color:var(--brass)">' + money(p.trzby_sklad) + '</strong></div>';
      h += '</div>';
      return h;
    }

    function rankList(rows, nameKey, valKey, emptyTxt) {
      if (!rows.length) return ledgerEmptyHTML(emptyTxt, true);
      return rows.slice(0, 6).map(function(r, i) {
        return '<div class="pc-rank-row"><span class="pc-rank-num">' + String(i+1).padStart(2,'0') + '</span><span class="pc-rank-name">' + esc(r[nameKey]) + '</span><span class="pc-rank-val">' + money(r[valKey]) + '</span></div>';
      }).join('');
    }

    function podium(icon, name, value, sub) {
      const nameHtml = name ? esc(name) : '<span style="color:var(--text-muted);font-style:italic">— žádná data —</span>';
      return '<div class="pc-podium-icon">' + icon + '</div>' +
        '<div class="pc-podium-name">' + nameHtml + '</div>' +
        '<div class="pc-podium-value">' + value + '</div>' +
        '<div class="pc-podium-sub">' + sub + '</div>';
    }

    function renderEarnCards() {
      const p = PD.periods;
      document.getElementById('pc-earn-cards').innerHTML =
        earnFigure('Dnes', p.day) + earnFigure('Tento týden', p.week) + earnFigure('Tento měsíc', p.month) + earnFigure('Celkem', p.total);
    }

    function renderLeaderboards() {
      const lb = PD.leaderboards[pcPeriod];

      const d0 = lb.dealers[0];
      document.getElementById('pc-dealer-top').innerHTML = podium('§', d0 ? d0.member : null, d0 ? money(d0.trzby) : '—', d0 ? (d0.qty + ' ks prodáno · Nejlepší dealer') : 'Nejlepší dealer');
      document.getElementById('pc-dealer-list').innerHTML = rankList(lb.dealers, 'member', 'trzby', 'Žádné prodeje v tomto období');

      const dr0 = lb.drugs[0];
      document.getElementById('pc-drug-top').innerHTML = podium('◆', dr0 ? dr0.droga : null, dr0 ? money(dr0.trzby) : '—', dr0 ? (dr0.qty + ' ks prodáno · Nejvýdělečnější droga') : 'Nejvýdělečnější droga');
      document.getElementById('pc-drug-list').innerHTML = rankList(lb.drugs, 'droga', 'trzby', 'Žádné prodeje v tomto období');

      const m0 = lb.members[0];
      document.getElementById('pc-member-top').innerHTML = podium('I', m0 ? m0.member : null, m0 ? money(m0.net) : '—', 'Čistý přínos do účtu (SAD)');
      document.getElementById('pc-member-list').innerHTML = rankList(lb.members, 'member', 'net', 'Žádná data v tomto období');
    }

    function pcTab(p) {
      pcPeriod = p;
      document.querySelectorAll('#pc-period-nav .report-nav-item').forEach(function(b){ b.classList.toggle('active', b.dataset.p === p); });
      renderLeaderboards();
    }

    async function loadProfitCentrum() {
      try {
        const res = await fetch('/api/profit-centrum', { cache: 'no-store' });
        PD = await res.json();
        if (!PD.ok) { document.getElementById('pc-loading').textContent = 'Chyba načtení dat: ' + (PD.error||'neznámá'); return; }
        document.getElementById('pc-loading').style.display = 'none';
        document.getElementById('pc-content').style.display = 'block';
        document.getElementById('pc-generated').textContent = 'Vygenerováno ' + (PD.generatedAt||'');
        renderEarnCards();
        renderLeaderboards();
      } catch (e) {
        document.getElementById('pc-loading').textContent = 'Chyba: ' + e.message;
      }
    }
    loadProfitCentrum();
  </script>
  </body></html>`;
}

// ── RENDER AUTH ───────────────────────────────────────────────────────────────
function renderAuth(page, error, data) {
  const errors = {
    no_code: 'Discord autorizace selhala.',
    not_on_server: 'Nejsi členem aplikace serveru Albion.',
    already_registered: 'Tento Discord účet je již registrován.',
    not_registered: 'Nemáš účet. Zaregistruj se nejdřív.',
    auth_failed: 'Přihlášení selhalo. Zkus to znovu.',
    not_found: 'Účet nenalezen.',
    wrong_password: 'Špatné heslo.',
    missing: 'Vyplň všechna pole.',
    password_mismatch: 'Hesla se neshodují.',
    password_short: 'Heslo musí mít alespoň 6 znaků.',
    exists: 'Účet již existuje.',
  };
  const errMsg = error && errors[error] ? `<div class="auth-alert">${errors[error]}</div>` : '';
  const successReg = page === 'login' ? `<script>if(location.search.includes('success=registered')){const a=document.createElement('div');a.className='auth-alert auth-success';a.textContent='Registrace proběhla úspěšně. Přihlaš se.';document.querySelector('.auth-form-col').prepend(a);}<\/script>` : '';

  const style = `
    <link rel="icon" type="image/png" href="/logo.png">
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;0,9..144,900;1,9..144,500;1,9..144,600&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      :root{
        --seal:#8B1A1A;--seal-bright:#B23B3B;--seal-glow:rgba(139,26,26,0.20);
        --brass:#C9A227;--brass-bright:#E0BC4A;
        --border-seal:rgba(139,26,26,0.30);
        --font-display:'Fraunces',serif;
        --font-mono:'JetBrains Mono',monospace;
      }
      html,body{height:100%}
      body{
        background-color:#070605;
        color:#E8E2D5;
        font-family:'Inter',sans-serif;font-weight:300;
        min-height:100vh;
        position:relative;overflow-x:hidden;
        animation:authBodyFlicker 0.7s linear;
      }
      @keyframes authBodyFlicker{0%{opacity:0}6%{opacity:1}10%{opacity:0.4}15%{opacity:1}100%{opacity:1}}

      /* leather-and-candlelight ambient, asymmetric — light source from the left where the seal sits */
      body::before{
        content:'';position:fixed;inset:0;z-index:0;
        background:
          radial-gradient(ellipse 50% 70% at 12% 45%, rgba(201,162,39,0.13) 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 100% 0%, rgba(139,26,26,0.10) 0%, transparent 55%),
          radial-gradient(ellipse 70% 60% at 50% 110%, rgba(5,4,3,0.8) 0%, transparent 65%);
        pointer-events:none;
      }
      .bg-grid{
        position:fixed;inset:0;z-index:0;
        background-image:
          linear-gradient(rgba(201,162,39,0.014) 1px,transparent 1px),
          linear-gradient(90deg,rgba(201,162,39,0.009) 1px,transparent 1px);
        background-size:100px 100px;
        pointer-events:none;
        animation:gridDrift 70s linear infinite;
      }
      @keyframes gridDrift{from{background-position:0 0}to{background-position:100px 100px}}

      /* ── FRONTISPIECE LAYOUT — asymmetric title page, not a centered card ── */
      .frontispiece{
        position:relative;z-index:1;
        min-height:100vh;
        display:grid;
        grid-template-columns:1fr 1px 460px;
        align-items:center;
      }
      .auth-seal-col{
        display:flex;flex-direction:column;align-items:flex-end;justify-content:center;
        padding:3rem 5vw;text-align:right;
        gap:2.2rem;
      }
      .auth-seal-monolith{
        width:min(220px,28vw);height:min(220px,28vw);border-radius:50%;
        border:2px solid var(--brass);position:relative;
        display:flex;align-items:center;justify-content:center;flex-direction:column;
        box-shadow:0 0 0 10px #070605, 0 0 70px var(--seal-glow);
        animation:sealBreathe 3.2s ease-in-out infinite;
      }
      .auth-seal-monolith::before{content:'';position:absolute;inset:14px;border-radius:50%;border:1px solid rgba(201,162,39,0.4)}
      .auth-seal-monolith::after{content:'';position:absolute;inset:26px;border-radius:50%;border:1px dotted rgba(201,162,39,0.25)}
      .auth-seal-letter{font-family:var(--font-display);font-weight:800;font-size:min(5rem,11vw);color:var(--brass);line-height:1}
      .auth-seal-sub{font-family:var(--font-mono);font-size:0.56rem;letter-spacing:0.32em;color:var(--brass);opacity:0.85;margin-top:0.3rem}
      @keyframes sealBreathe{0%,100%{box-shadow:0 0 0 10px #070605,0 0 50px var(--seal-glow)}50%{box-shadow:0 0 0 10px #070605,0 0 90px var(--seal-glow)}}
      .auth-tagline{
        font-family:var(--font-display);font-style:italic;font-weight:500;
        font-size:1.15rem;color:#9C9484;max-width:340px;line-height:1.55;
      }
      .auth-tagline strong{color:var(--brass-bright);font-style:normal;font-weight:600}
      .frontispiece-rule{
        width:1px;height:62vh;background:linear-gradient(180deg,transparent,var(--seal) 20%,var(--brass) 50%,var(--seal) 80%,transparent);
        opacity:0.5;justify-self:center;
      }

      .auth-form-col{padding:3rem 5vw;width:100%;max-width:460px}
      .auth-eyebrow{
        font-family:var(--font-mono);font-size:0.62rem;letter-spacing:0.3em;text-transform:uppercase;
        color:var(--seal-bright);margin-bottom:0.9rem;font-weight:600;
      }
      .auth-h1{
        font-family:var(--font-display);font-weight:700;font-size:clamp(1.8rem,4vw,2.3rem);
        color:#F5F0E4;letter-spacing:0.005em;line-height:1.1;margin-bottom:0.6rem;
      }
      .auth-h1 .b-red{color:var(--seal)}
      .auth-subcopy{font-size:0.86rem;color:#9C9484;line-height:1.7;margin-bottom:2rem;max-width:380px}

      .auth-btn{
        display:block;width:100%;padding:0.9rem;
        background:var(--seal);
        color:#F5F0E4;border:1px solid var(--seal);
        font-family:var(--font-mono);font-size:0.68rem;
        letter-spacing:0.22em;text-transform:uppercase;font-weight:600;
        cursor:pointer;text-decoration:none;text-align:center;
        margin-top:0.8rem;
        transition:opacity 0.2s;border-radius:3px;
        position:relative;overflow:hidden;
      }
      .auth-btn:hover{opacity:0.85}
      .auth-btn:active{opacity:1}
      .auth-btn.secondary{
        background:transparent;border:1px solid rgba(201,162,39,0.18);
        color:#9C9484;
      }
      .auth-btn.secondary:hover{color:#E8E2D5;border-color:rgba(201,162,39,0.32);background:rgba(201,162,39,0.04);opacity:1}
      .auth-input{
        display:block;width:100%;
        padding:0.85rem 1rem;
        background:rgba(0,0,0,0.35);
        border:1px solid rgba(201,162,39,0.16);
        color:#E8E2D5;font-family:'Inter',sans-serif;font-size:0.84rem;
        margin-bottom:0.8rem;outline:none;border-radius:3px;
        transition:border-color 0.2s;
      }
      .auth-input:focus{border-color:rgba(201,162,39,0.5)!important;box-shadow:0 0 0 2px rgba(201,162,39,0.08),0 0 12px rgba(201,162,39,0.12)!important}
      .auth-label{display:block;font-size:0.6rem;letter-spacing:0.2em;text-transform:uppercase;color:#9C9484;margin-bottom:0.4rem;font-family:var(--font-mono);font-weight:600}
      .auth-alert{
        padding:0.8rem 1rem;
        background:var(--seal-glow);
        border:1px solid var(--border-seal);
        border-left:2px solid var(--seal);
        font-size:0.78rem;margin-bottom:1.5rem;color:#D89B9B;
      }
      .auth-success{background:rgba(111,191,82,0.08);border-color:rgba(111,191,82,0.25);border-left-color:#6FBF52;color:#9BD686}
      .auth-divider{
        text-align:left;font-size:0.6rem;letter-spacing:0.26em;
        text-transform:uppercase;color:#5A5346;margin:1.4rem 0;
        position:relative;font-family:var(--font-mono);
        display:flex;align-items:center;gap:1rem;
      }
      .auth-divider::after{content:'';flex:1;height:1px;background:rgba(201,162,39,0.12)}
      .auth-sep{height:1px;background:rgba(201,162,39,0.08);margin:1.2rem 0}

      .auth-status-bar{
        display:inline-flex;align-items:center;gap:0.6rem;margin-bottom:1.8rem;padding:0.5rem 0.85rem;
        background:rgba(201,162,39,0.07);border:1px solid rgba(201,162,39,0.22);
        font-family:var(--font-mono);font-size:0.58rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--brass-bright);
      }
      .auth-status-dot{width:6px;height:6px;border-radius:50%;background:var(--seal);box-shadow:0 0 8px var(--seal);animation:authDotPulse 1.8s ease-in-out infinite;flex-shrink:0}
      @keyframes authDotPulse{0%,100%{box-shadow:0 0 4px var(--seal)}50%{box-shadow:0 0 12px var(--seal),0 0 20px rgba(139,26,26,0.35)}}
      .auth-btn::before{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent);animation:btnSweep 3.2s ease-in-out 2s infinite}
      @keyframes btnSweep{0%,60%{left:-100%}100%{left:220%}}

      @keyframes authReveal{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}
      .auth-h1{animation:authReveal 0.6s ease-out 1}
      .auth-reveal{transition:opacity 0.7s ease}
      body.booting .auth-reveal{opacity:0}

      @media(max-width:900px){
        .frontispiece{grid-template-columns:1fr;display:flex;flex-direction:column;padding:3rem 0 2.5rem}
        .auth-seal-col{align-items:center;text-align:center;padding:1.5rem 6vw 0.5rem}
        .frontispiece-rule{display:none}
        .auth-form-col{margin:0 auto;padding:2rem 6vw}
        .auth-tagline{max-width:100%}
      }

      /* ── SEAL RITUAL — opening of the register, not a hacker boot ── */
      body.booting{overflow:hidden}
      .boot-screen{
        position:fixed;inset:0;z-index:999;background:#050403;
        display:flex;align-items:center;justify-content:center;
        transition:opacity 0.6s ease, visibility 0.6s ease;
      }
      .boot-screen.boot-hidden{opacity:0;visibility:hidden;pointer-events:none}
      .boot-screen::before{
        content:'';position:absolute;inset:0;pointer-events:none;z-index:1;
        background:radial-gradient(ellipse 55% 50% at 50% 42%, rgba(201,162,39,0.12), transparent 70%);
      }
      .boot-screen::after{
        content:'';position:absolute;inset:0;pointer-events:none;z-index:1;
        background:radial-gradient(ellipse 75% 65% at 50% 50%, transparent 35%, rgba(0,0,0,0.88) 100%);
      }
      .boot-stage{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:1.8rem}
      .boot-seal-wax{
        width:84px;height:84px;border-radius:50%;
        border:2px solid var(--brass);
        display:flex;align-items:center;justify-content:center;
        position:relative;
        box-shadow:0 0 0 1px #050403 inset, 0 0 24px var(--seal-glow);
        animation:sealBreatheSm 2.4s ease-in-out infinite;
      }
      .boot-seal-wax::before{content:'';position:absolute;inset:6px;border-radius:50%;border:1px solid rgba(201,162,39,0.4)}
      .boot-seal-wax span{font-family:var(--font-display);font-weight:700;font-size:1.7rem;color:var(--brass);letter-spacing:0.02em}
      @keyframes sealBreatheSm{0%,100%{box-shadow:0 0 0 1px #050403 inset,0 0 16px var(--seal-glow)}50%{box-shadow:0 0 0 1px #050403 inset,0 0 34px var(--seal-glow)}}
      .boot-term{
        width:88%;max-width:560px;color:#C9A227;
        font-family:var(--font-mono);
        font-size:0.78rem;line-height:2.05;letter-spacing:0.03em;
        text-shadow:0 0 8px rgba(201,162,39,0.3);
        text-align:center;
        min-height:7.5em;
      }
      .boot-term .boot-line{white-space:pre-wrap;word-break:break-word;animation:bootLineIn 0.2s ease}
      @keyframes bootLineIn{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:translateY(0)}}
      .boot-line.dim{color:#7A6418;text-shadow:none}
      .boot-line.warn{color:#C9A227;text-shadow:0 0 8px rgba(201,162,39,0.4)}
      .boot-line.white{color:#E8E2D5;text-shadow:none;font-family:var(--font-display);font-style:italic;letter-spacing:0.01em}
      .boot-cursor{display:inline-block;width:7px;height:1em;background:var(--seal-bright);vertical-align:-2px;animation:bootCursor 0.7s steps(1) infinite}
      @keyframes bootCursor{0%,49%{opacity:1}50%,100%{opacity:0}}
      .boot-skip{
        position:absolute;bottom:24px;right:28px;z-index:2;
        color:#5A5346;font-size:0.58rem;letter-spacing:0.14em;text-transform:uppercase;
        font-family:var(--font-mono);
      }
      .boot-progress{width:88%;max-width:280px;height:2px;background:rgba(139,26,26,0.18);position:relative;overflow:hidden;border-radius:1px}
      .boot-progress-fill{height:100%;background:linear-gradient(90deg,var(--seal),var(--brass));box-shadow:0 0 10px var(--seal-glow);transition:width 0.18s linear;width:0%}
    </style>
  `;

  const sealColHtml = `
    <div class="auth-seal-col">
      <div class="auth-seal-monolith">
        <span class="auth-seal-letter">A</span>
        <span class="auth-seal-sub">LOS SANTOS</span>
      </div>
      <p class="auth-tagline">Albion nepotřebuje být <strong>hlasitý</strong>. Stačí, že je <strong>zapečetěný</strong>.</p>
    </div>
    <div class="frontispiece-rule"></div>
  `;

  const bootScreen = `
    <div class="boot-screen" id="bootScreen">
      <div class="boot-stage">
        <div class="boot-seal-wax"><span>A</span></div>
        <div class="boot-term" id="bootTerm">
          <span class="boot-cursor"></span>
        </div>
        <div class="boot-progress"><div class="boot-progress-fill" id="bootBar"></div></div>
      </div>
      <div class="boot-skip">[ klikni / stiskni klávesu — přeskočit ]</div>
    </div>
    <script>
      (function(){
        var boot = document.getElementById('bootScreen');
        var term = document.getElementById('bootTerm');
        var bar  = document.getElementById('bootBar');
        if (!boot || !term) return;
        var lines = [
          { text: 'Otevírání rejstříku rodiny…', cls: 'dim', delay: 90 },
          { text: 'Kodex mlčenlivosti — potvrzen', cls: 'dim', delay: 70 },
          { text: 'Ověřování přísahy…', cls: 'warn', delay: 80 },
          { text: 'Pečeť rodiny přiložena.', cls: 'warn', delay: 70 },
          { text: 'Brána se otevírá.', cls: 'white', delay: 90 },
          { text: 'Vítej, bratře.', cls: 'white', delay: 90 },
        ];
        var cursor = term.querySelector('.boot-cursor');
        var li = 0;
        function nextLine(){
          if (li >= lines.length) { return finish(); }
          var ln = lines[li];
          term.innerHTML = '';
          var div = document.createElement('div');
          div.className = 'boot-line ' + (ln.cls||'dim');
          term.appendChild(div);
          if (bar) bar.style.width = Math.round((li/lines.length)*100) + '%';
          var i = 0, text = ln.text;
          var typer = setInterval(function(){
            div.textContent = text.slice(0,++i);
            if (i >= text.length) { clearInterval(typer); li++; setTimeout(nextLine, ln.delay||120); }
          }, 18);
        }
        function finish(){
          if (bar) bar.style.width = '100%';
          setTimeout(function(){
            boot.classList.add('boot-hidden');
            document.body.classList.remove('booting');
            setTimeout(function(){ boot.remove(); }, 600);
          }, 500);
        }
        function skip(){ finish(); }
        boot.addEventListener('click', skip);
        document.addEventListener('keydown', skip, { once: true });
        nextLine();
      })();
    </script>
  `;

  if (page === 'login') return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Albion — Přihlášení</title>${style}</head><body class="booting">${bootScreen}<div class="bg-grid"></div><div class="frontispiece auth-reveal">${sealColHtml}<div class="auth-form-col">
    <div class="auth-eyebrow">Rejstřík Albionu</div>
    <h1 class="auth-h1">Vstup pro <span class="b-red">členy</span></h1>
    <p class="auth-subcopy">Přihlášení vyžaduje příslušnost k organizaci na Discordu a heslo do interního rejstříku.</p>
    <div class="auth-status-bar"><div class="auth-status-dot"></div><span>Kanál zapečetěn</span></div>
    ${errMsg}
    <a href="/auth/discord?action=login" class="auth-btn">Přihlásit se přes Discord</a>
    <div class="auth-divider">nebo</div>
    <a href="/register" class="auth-btn secondary">Registrovat se</a>
  </div></div>${successReg}</body></html>`;

  if (page === 'register') return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Albion — Registrace</title>${style}</head><body class="booting">${bootScreen}<div class="bg-grid"></div><div class="frontispiece auth-reveal">${sealColHtml}<div class="auth-form-col">
    <div class="auth-eyebrow">Rejstřík Albionu</div>
    <h1 class="auth-h1">Žádost o <span class="b-red">členství</span></h1>
    <p class="auth-subcopy">Pro registraci musíš být členem Discord serveru Albion. Po ověření tě rejstřík vyzve k zápisu jména a heslu.</p>
    ${errMsg}
    <a href="/auth/discord?action=register" class="auth-btn">Pokračovat přes Discord</a>
    <div class="auth-sep"></div>
    <a href="/login" class="auth-btn secondary">Zpět na přihlášení</a>
  </div></div></body></html>`;

  if (page === 'register_complete') return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Albion — Registrace</title>${style}</head><body><div class="bg-grid"></div><div class="frontispiece">${sealColHtml}<div class="auth-form-col">
    <div class="auth-eyebrow">Rejstřík Albionu</div>
    <h1 class="auth-h1">Zápis do <span class="b-red">rejstříku</span></h1>
    <p class="auth-subcopy">Discord: <strong style="color:#E8E2D5">${data?.username||''}</strong></p>
    ${errMsg}
    <form method="POST" action="/register/complete">
      <label class="auth-label">IC jméno (ve hře)</label><input class="auth-input" type="text" name="ic_name" placeholder="Christopher Sinclair" required>
      <label class="auth-label">Heslo</label><input class="auth-input" type="password" name="password" placeholder="Alespoň 6 znaků" required>
      <label class="auth-label">Heslo znovu</label><input class="auth-input" type="password" name="password2" placeholder="Zopakuj heslo" required>
      <button type="submit" class="auth-btn">Dokončit registraci</button>
    </form>
  </div></div></body></html>`;

  if (page === 'login_password') return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Albion — Přihlášení</title>${style}</head><body><div class="bg-grid"></div><div class="frontispiece">${sealColHtml}<div class="auth-form-col">
    <div class="auth-eyebrow">Rejstřík Albionu</div>
    <h1 class="auth-h1">Potvrzení <span class="b-red">totožnosti</span></h1>
    <p class="auth-subcopy">Discord: <strong style="color:#E8E2D5">${data?.username||''}</strong></p>
    ${errMsg}
    <form method="POST" action="/login/password">
      <label class="auth-label">Heslo</label><input class="auth-input" type="password" name="password" placeholder="Tvoje heslo" required autofocus>
      <button type="submit" class="auth-btn">Přihlásit se</button>
    </form>
  </div></div></body></html>`;

  return '<h1>404</h1>';
}


app.listen(PORT, () => console.log(`🌐 Albion web běží na http://localhost:${PORT}`));
