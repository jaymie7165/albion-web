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
const { levelFromRoleIds, requireAccess, canAccess, isAssociateOnly } = require('./roles');

const { CONFIG, WEED_PLANT } = require('./constants');
const { makeStore } = require('./content-store');
const { renderHome } = require('./views/home');
const { renderDashboard } = require('./views/sklad');
const { renderNastenska } = require('./views/nastenska');
const { renderKodex } = require('./views/kodex');
const { renderAudit } = require('./views/audit');
const { renderStatistiky } = require('./views/statistiky');
const { renderLore } = require('./views/lore');
const { renderHierarchy } = require('./views/hierarchy');
const { renderGaraz } = require('./views/garaz');
const { renderWeedSazeni } = require('./views/weed-sazeni');
const { renderBlackbook } = require('./views/blackbook');
const { renderProfitCentrum } = require('./views/profit-centrum');
const { renderAuth } = require('./views/auth');
const { renderLeaderboard } = require('./views/leaderboard');
const { renderCard } = require('./views/card');
const { renderGallery } = require('./views/gallery');

const app  = express();
const PORT = process.env.PORT || process.env.WEB_PORT || 3000;
app.set('trust proxy', 1); // Railway běží appku za reverse proxy — potřebujeme správně detekovat https pro veřejné URL (např. fotky vozů pro Discord embed)

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use(express.static(path.join(__dirname, 'public')));
// Logo is served from public/logo.png via express.static above
app.use(session({
  secret: process.env.SESSION_SECRET || 'albion_secret',
  resave: false,
  saveUninitialized: false,
  rolling: true, // každý request prodlouží platnost cookie — aktivní uživatel nevyprší
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dní
    // secure=true vyžaduje HTTPS — na Railway (a obecně za proxy s trust proxy) to platí vždy,
    // lokálně (http://localhost) díky tomu zůstane false, takže přihlášení funguje i bez HTTPS.
    secure: !!process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    httpOnly: true,
  },
}));

// DŮLEŽITÉ: requireDiscordMember (definováno níže, function declaration je hoistnutá)
// se registruje hned tady — aby kontrola kicknutí z Discordu platila pro ÚPLNĚ všechny
// routy včetně SSE /api/events a /home. Dřív byla registrace až dole v souboru, takže
// část stránek a živé notifikace kontrolu přeskakovaly.
app.use(requireDiscordMember);
app.use(applyViewAs);

// ── TRVALÉ ÚLOŽIŠTĚ ──────────────────────────────────────────────────────────
// Na Railway je k službě připojený Volume (persistentní disk) — Railway sám
// zpřístupní jeho cestu v proměnné RAILWAY_VOLUME_MOUNT_PATH. Pokud Volume
// není připojený (např. při lokálním vývoji), spadneme zpátky na složku
// ./data v kořeni projektu, ať appka funguje i bez Railway.
// DŮLEŽITÉ: po nastavení Volume na Railway nastav jeho Mount Path na "/app/data",
// aby seděl s touto fallback cestou i v lokálním běhu.
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) { console.error('[DATA_DIR]', e.message); } }
console.log(`[STORAGE] Trvalá data se ukládají do: ${DATA_DIR}${process.env.RAILWAY_VOLUME_MOUNT_PATH ? ' (Railway Volume)' : ' (lokální složka — NEPŘETRVÁ na Railway bez Volume!)'}`);

// ── EDITOVATELNÝ OBSAH (Kodex/Lore/Hierarchy) — zatím bez defaultů z kódu,
// store se naplní prázdným polem dokud nebude proveden refaktor views/*-default.js.
// Endpointy jsou připravené pro budoucí admin UI.
const kodexStore = makeStore(DATA_DIR, 'content-kodex.json', []);
const loreStore  = makeStore(DATA_DIR, 'content-lore.json', []);
const hierStore  = makeStore(DATA_DIR, 'content-hierarchy.json', []);

app.get('/api/content/:key', requireAuth, (req, res) => {
  const stores = { kodex: kodexStore, lore: loreStore, hierarchy: hierStore };
  const store = stores[req.params.key];
  if (!store) return res.status(404).json({ ok: false });
  res.json({ ok: true, data: store.load() });
});

app.post('/api/content/:key', requireAuth, requireAccess('audit'), (req, res) => {
  const stores = { kodex: kodexStore, lore: loreStore, hierarchy: hierStore };
  const store = stores[req.params.key];
  if (!store) return res.status(404).json({ ok: false });
  store.save(req.body.data);
  res.json({ ok: true });
});

// ── SEZÓNNÍ VZHLED ──
const SEASON_FILE = path.join(DATA_DIR, 'season.json');
function loadSeason() { try { return JSON.parse(fs.readFileSync(SEASON_FILE, 'utf8')).season || 'none'; } catch { return 'none'; } }
function saveSeason(season) { try { fs.writeFileSync(SEASON_FILE, JSON.stringify({ season })); } catch(e){} }

app.get('/api/season', requireAuth, (req, res) => res.json({ ok: true, season: loadSeason() }));
app.post('/api/season', requireAuth, requireAccess('audit'), (req, res) => {
  const allowed = ['none','vanoce','halloween','novy-rok'];
  const season = (req.body.season || 'none').toString();
  if (!allowed.includes(season)) return res.json({ ok: false, error: 'Neplatný motiv' });
  saveSeason(season);
  broadcastSSE('seasonChange', { season });
  res.json({ ok: true });
});

// ── GALERIE ORGANIZACE ──
const GALLERY_FILE = path.join(DATA_DIR, 'gallery.json');
const GALLERY_UPLOADS_DIR = path.join(DATA_DIR, 'gallery-uploads');
if (!fs.existsSync(GALLERY_UPLOADS_DIR)) { try { fs.mkdirSync(GALLERY_UPLOADS_DIR, { recursive: true }); } catch(e){ console.error('[GALLERY]', e.message); } }
function loadGallery() { try { return JSON.parse(fs.readFileSync(GALLERY_FILE, 'utf8')) || []; } catch { return []; } }
function saveGallery(items) { try { fs.writeFileSync(GALLERY_FILE, JSON.stringify(items, null, 2)); } catch(e){ console.error('[GALLERY]', e.message); } }

app.get('/gallery-uploads/:filename', (req, res) => {
  const safeName = path.basename(req.params.filename);
  res.sendFile(path.join(GALLERY_UPLOADS_DIR, safeName), (err) => { if (err) res.status(404).end(); });
});

// Fotky vozů servírujeme vlastní route, aby mohly ležet na Volume mimo public/
// a přitom byly dostupné na stejné URL jako dřív (/garage-uploads/soubor.jpg).
app.get('/garage-uploads/:filename', (req, res) => {
  const safeName = path.basename(req.params.filename); // ochrana proti path traversal
  res.sendFile(path.join(DATA_DIR, 'garage-uploads', safeName), (err) => {
    if (err) res.status(404).end();
  });
});


// ── ÚLOŽIŠTĚ ODPOČTŮ PĚSTOVÁNÍ (sdílené pro všechny uživatele) ─────────────────
const WEED_TIMERS_FILE = path.join(DATA_DIR, 'weed-timers.json');

function loadWeedTimers() {
  try {
    if (!fs.existsSync(WEED_TIMERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(WEED_TIMERS_FILE, 'utf8')) || [];
  } catch { return []; }
}
function saveWeedTimers(timers) {
  try { fs.writeFileSync(WEED_TIMERS_FILE, JSON.stringify(timers, null, 2)); } catch (e) { console.error('[WEED-TIMERS]', e.message); }
}

// ── GARÁŽ — vozový park organizace (sdílené pro všechny uživatele) ────────────
const GARAGE_FILE = path.join(DATA_DIR, 'garage.json');
const GARAGE_UPLOADS_DIR = path.join(DATA_DIR, 'garage-uploads');
if (!fs.existsSync(GARAGE_UPLOADS_DIR)) { try { fs.mkdirSync(GARAGE_UPLOADS_DIR, { recursive: true }); } catch (e) { console.error('[GARAGE]', e.message); } }

function loadGarage() {
  try {
    if (!fs.existsSync(GARAGE_FILE)) return [];
    return JSON.parse(fs.readFileSync(GARAGE_FILE, 'utf8')) || [];
  } catch { return []; }
}
function saveGarage(cars) {
  try { fs.writeFileSync(GARAGE_FILE, JSON.stringify(cars, null, 2)); } catch (e) { console.error('[GARAGE]', e.message); }
}
// Uloží base64 obrázek (data URL) na disk a vrátí veřejnou cestu, nebo null při chybě/neplatném vstupu.
const { addWatermark } = require('./watermark');
async function saveGarageImage(dataUrl, existingPath) {
  if (!dataUrl || typeof dataUrl !== 'string') return existingPath || null;
  const match = dataUrl.match(/^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/);
  if (!match) return existingPath || null;
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  let buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 8 * 1024 * 1024) return existingPath || null; // 8MB strop
  const filename = `car_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;
  try {
    buffer = await addWatermark(buffer);
    fs.writeFileSync(path.join(GARAGE_UPLOADS_DIR, filename), buffer);
    // Smaž starý obrázek, pokud existuje a je z naší upload složky
    if (existingPath && existingPath.startsWith('/garage-uploads/')) {
      const oldFile = path.join(GARAGE_UPLOADS_DIR, path.basename(existingPath));
      fs.unlink(oldFile, () => {});
    }
    return `/garage-uploads/${filename}`;
  } catch (e) {
    console.error('[GARAGE] Chyba uložení obrázku:', e.message);
    return existingPath || null;
  }
}

// ── TRADING KARTA — IC fotky ──────────────────────────────────────────────────
const CARD_UPLOADS_DIR = path.join(DATA_DIR, 'card-uploads');
if (!fs.existsSync(CARD_UPLOADS_DIR)) { try { fs.mkdirSync(CARD_UPLOADS_DIR, { recursive: true }); } catch (e) { console.error('[CARD]', e.message); } }

app.get('/card-uploads/:filename', (req, res) => {
  const safeName = path.basename(req.params.filename);
  res.sendFile(path.join(CARD_UPLOADS_DIR, safeName), (err) => { if (err) res.status(404).end(); });
});

async function saveCardImage(dataUrl, existingPath) {
  if (!dataUrl || typeof dataUrl !== 'string') return existingPath || null;
  const match = dataUrl.match(/^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/);
  if (!match) return existingPath || null;
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  let buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 6 * 1024 * 1024) return existingPath || null; // 6MB strop
  const filename = `card_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;
  try {
    fs.writeFileSync(path.join(CARD_UPLOADS_DIR, filename), buffer);
    if (existingPath && existingPath.startsWith('/card-uploads/')) {
      fs.unlink(path.join(CARD_UPLOADS_DIR, path.basename(existingPath)), () => {});
    }
    return `/card-uploads/${filename}`;
  } catch (e) {
    console.error('[CARD IMG]', e.message);
    return existingPath || null;
  }
}

const RANK_LABEL_MAP = { 1: 'Founder/Council', 2: 'Senior Member', 3: 'Member/Associate' };

// ── API — IC ÚDAJE NA TRADING KARTĚ ──
app.get('/api/me/card-data', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  res.json({ ok: true, data: {
    phone: user.card_phone || '',
    birthdate: user.card_birthdate || '',
    bank: user.card_bank || '',
    photo: user.card_photo || null,
  }});
});

app.post('/api/me/card-data', requireAuth, async (req, res) => {
  let { phone, birthdate, bank, photo } = req.body;
  phone = (phone || '').toString().trim();
  birthdate = (birthdate || '').toString().trim();
  bank = (bank || '').toString().trim();

  if (phone && !/^\(\d{3}\)\s\d{3}-\d{3}$/.test(phone)) return res.json({ ok: false, error: 'Telefon musí být ve formátu (458) 627-517' });
  if (birthdate && !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) return res.json({ ok: false, error: 'Neplatné datum narození' });
  if (bank && !/^\d{1,30}$/.test(bank)) return res.json({ ok: false, error: 'Bankovní účet smí obsahovat jen číslice' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  let photoPath = user.card_photo || null;
  if (photo === '') {
    if (photoPath && photoPath.startsWith('/card-uploads/')) fs.unlink(path.join(CARD_UPLOADS_DIR, path.basename(photoPath)), () => {});
    photoPath = null;
  } else if (photo) {
    photoPath = await saveCardImage(photo, photoPath);
  }

  db.setCardData(req.session.userId, { phone, birthdate, bank, photo: photoPath });
  res.json({ ok: true });
});

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
  // Zjistíme Discord role hned při loginu, ať accessLevel sedí od první stránky
  try {
    const roles = await discord.getMemberRoles(dUser.id);
    req.session.accessLevel = levelFromRoleIds(roles);
    req.session.realAccessLevel = req.session.accessLevel;
    req.session.isAssociate = isAssociateOnly(roles);
    req.session.discordCheckedAt = Date.now();
    try { db.setAccessLevel(user.id, req.session.accessLevel); } catch (e) {}
  } catch (e) {
    console.error('[LOGIN ROLES]', e.message);
    req.session.accessLevel = 3; // fail-safe — nejnižší úroveň přístupu
    req.session.realAccessLevel = 3;
    req.session.isAssociate = true;
  }
  try { db.setLastLogin(user.id, new Date().toISOString()); } catch (e) { console.error('[LOGIN]', e.message); }
  try { require('./achievements').checkTenureAchievements(user.id, user.created_at); } catch (e) {}
  res.redirect('/home');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

// ── PROFIL — správa aliasů a IC jména ────────────────────────────────────────
app.get('/profil', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const aliases = user && user.discord_aliases ? JSON.parse(user.discord_aliases) : [];
  res.send(renderProfil(req, user, aliases));
});

app.post('/api/me/aliases', requireAuth, (req, res) => {
  let { aliases } = req.body;
  if (!Array.isArray(aliases)) return res.json({ ok: false, error: 'Neplatný formát' });
  aliases = aliases.map(a => (a||'').toString().trim()).filter(Boolean).slice(0, 10);
  db.setAliases(req.session.userId, aliases);
  res.json({ ok: true, aliases });
});

app.post('/api/me/ic-name', requireAuth, async (req, res) => {
  const { ic_name } = req.body;
  const safe = (ic_name || '').toString().trim();
  if (!safe || safe.length < 3 || safe.length > 80) return res.json({ ok: false, error: 'IC jméno musí mít 3–80 znaků' });
  db.updateIcName(req.session.userId, safe);
  req.session.icName = safe;
  res.json({ ok: true });
});

function renderProfil(req, user, aliases) {
  const { baseStyles } = require('./styles');
  const { renderNav } = require('./nav');
  const aliasesJson = JSON.stringify(aliases);
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Albion — Profil</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, '')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Albion</div>
        <h1 class="page-title">Profil</h1>
        <p class="page-sub">Nastavení IC jména a Discord aliasů pro správné přiřazení záznamů</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Discord aliasy.</strong> Pokud Discord bot zapisuje do tabulky jiné jméno než tvoje IC jméno (např. <code style="background:var(--panel3);padding:0.1rem 0.4rem;font-family:var(--font-mono);font-size:0.85em">j_jakuub</code>), přidej ho sem. Systém pak všechny záznamy pod tímto jménem přiřadí k tvému profilu.</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;align-items:start">

      <div class="card">
        <div class="card-header"><span class="card-title">IC jméno</span><span class="card-badge">Zobrazované jméno</span></div>
        <div class="form-group" style="margin-bottom:0.8rem">
          <label>Jméno postavy (IC)</label>
          <input type="text" id="ic-name-input" value="${(user.ic_name||'').replace(/"/g,'&quot;')}" maxlength="80">
        </div>
        <button class="btn-submit" onclick="saveIcName()">Uložit IC jméno</button>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Discord aliasy</span><span class="card-badge">Jména z bota / sheetu</span></div>
        <p style="font-size:0.84rem;color:var(--ivory-dim);margin-bottom:1rem;line-height:1.7">Přidej všechna jména která bot nebo ostatní používají při zápisu do Google Sheets — discord username, přezdívky, atd.</p>
        <div id="aliases-list" style="margin-bottom:1rem"></div>
        <div style="display:flex;gap:0.5rem">
          <input type="text" id="alias-input" placeholder="j_jakuub, přezdívka…" style="flex:1" onkeydown="if(event.key==='Enter')addAlias()">
          <button class="btn-submit" style="width:auto;padding:0.75rem 1.2rem;margin-top:0" onclick="addAlias()">Přidat</button>
        </div>
        <button class="btn-submit" style="margin-top:0.8rem" onclick="saveAliases()">Uložit aliasy</button>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Historie povýšení</span><span class="card-badge">Růst v organizaci</span></div>
        <div id="promotions-list"><div class="ledger-loading">Načítám…</div></div>
        ${!req.session.isAssociate ? `<a href="/karta" class="btn-submit" style="display:block;text-align:center;text-decoration:none;margin-top:1rem">Moje trading karta</a>` : ''}
      </div>

      ${req.session.realAccessLevel === 1 ? `
      <div class="card">
        <div class="card-header"><span class="card-title">Sezónní vzhled</span><span class="card-badge">Founder/Council</span></div>
        <select id="season-select" onchange="setSeason(this.value)">
          <option value="none">Žádný</option><option value="vanoce">Vánoce</option><option value="halloween">Halloween</option><option value="novy-rok">Nový rok</option>
        </select>
      </div>` : ''}

      <div class="card" style="grid-column:1/-1">
        <div class="card-header"><span class="card-title">Trading karta — IC údaje</span><span class="card-badge">Viditelné na kartě</span></div>
        <p style="font-size:0.84rem;color:var(--ivory-dim);margin-bottom:1.2rem;line-height:1.7">Tyto údaje se zobrazí na tvé trading kartě. Fotku vlož přes <strong style="color:var(--brass-bright)">Ctrl+V</strong> (screenshot) nebo klikni a vyber soubor.</p>

        <div style="display:grid;grid-template-columns:140px 1fr;gap:1.5rem;align-items:start">
          <div class="upload-zone" id="cardPhotoZone" tabindex="0" style="min-height:140px;aspect-ratio:1/1;padding:0.8rem">
            <button type="button" class="upload-clear" id="cardPhotoClear" onclick="clearCardPhoto(event)">✕</button>
            <img class="upload-preview" id="cardPhotoPreview" style="display:none;object-fit:cover">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            <div class="upload-zone-text">Klikni / <strong>Ctrl+V</strong></div>
          </div>
          <input type="file" id="cardPhotoFile" accept="image/*" style="display:none">

          <div>
            <div class="form-row">
              <div class="form-group"><label>Telefonní číslo</label><input type="text" id="card-phone" placeholder="(458) 627-517" maxlength="14"></div>
              <div class="form-group"><label>Datum narození</label><input type="date" id="card-birthdate"></div>
            </div>
            <div class="form-group" style="margin-bottom:0.8rem"><label>Bankovní účet</label><input type="text" id="card-bank" placeholder="1234567890" inputmode="numeric"></div>
            <button class="btn-submit" onclick="saveCardData()">Uložit IC údaje</button>
          </div>
        </div>
      </div>

    </div>


    <div style="margin-top:2rem;padding:1rem 1.4rem;background:var(--panel2);border:1px solid var(--border);font-family:var(--font-mono);font-size:0.72rem;color:var(--ivory-faint)">
      <strong style="color:var(--brass)">Tvůj profil:</strong>
      &nbsp;IC: <strong style="color:var(--ivory)">${user.ic_name||'—'}</strong>
      &nbsp;·&nbsp; Discord: <strong style="color:var(--ivory)">${user.discord_username||'—'}</strong>
      &nbsp;·&nbsp; ID: <strong style="color:var(--ivory)">${user.discord_id||'—'}</strong>
    </div>
  </main>

  <script>
    let aliases = ${aliasesJson};

    function renderAliases() {
      const list = document.getElementById('aliases-list');
      if (!aliases.length) {
        list.innerHTML = '<div style="color:var(--ivory-faint);font-size:0.82rem;font-family:var(--font-mono)">Žádné aliasy</div>';
        return;
      }
      list.innerHTML = aliases.map((a, i) =>
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.45rem 0;border-bottom:1px solid var(--border)">' +
        '<span style="font-family:var(--font-mono);font-size:0.84rem;color:var(--ivory)">' + a + '</span>' +
        '<button onclick="removeAlias(' + i + ')" style="background:none;border:none;color:var(--oxblood-bright);cursor:pointer;font-size:0.8rem;font-family:var(--font-label);letter-spacing:0.08em">✕ odebrat</button>' +
        '</div>'
      ).join('');
    }

    function addAlias() {
      const input = document.getElementById('alias-input');
      const val = input.value.trim();
      if (!val) return;
      if (!aliases.includes(val)) aliases.push(val);
      input.value = '';
      renderAliases();
    }

    function removeAlias(i) {
      aliases.splice(i, 1);
      renderAliases();
    }

    async function saveAliases() {
      const res = await fetch('/api/me/aliases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aliases }) });
      const d = await res.json();
      if (d.ok) showToast('Aliasy uloženy');
      else showToast(d.error, true);
    }

    async function saveIcName() {
      const ic_name = document.getElementById('ic-name-input').value.trim();
      const res = await fetch('/api/me/ic-name', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ic_name }) });
      const d = await res.json();
      if (d.ok) showToast('IC jméno uloženo — stránka se obnoví');
      else showToast(d.error, true);
    }

    renderAliases();

    let pendingCardPhoto = null;

    function setCardPhotoPreview(src){
      const zone=document.getElementById('cardPhotoZone');
      const img=document.getElementById('cardPhotoPreview');
      if(src){img.src=src;img.style.display='block';zone.classList.add('has-image');}
      else{img.src='';img.style.display='none';zone.classList.remove('has-image');}
    }
    function clearCardPhoto(e){e.stopPropagation();pendingCardPhoto='';setCardPhotoPreview(null);}
    function fileToDataUrlProfil(file,cb){
      if(!file||!file.type||!file.type.startsWith('image/'))return;
      const reader=new FileReader();reader.onload=()=>cb(reader.result);reader.readAsDataURL(file);
    }
    const cardPhotoZone=document.getElementById('cardPhotoZone');
    const cardPhotoFile=document.getElementById('cardPhotoFile');
    cardPhotoZone.addEventListener('click',()=>cardPhotoFile.click());
    cardPhotoFile.addEventListener('change',(e)=>{const f=e.target.files&&e.target.files[0];fileToDataUrlProfil(f,(d)=>{pendingCardPhoto=d;setCardPhotoPreview(d);});});
    cardPhotoZone.addEventListener('paste',(e)=>{
      const items=e.clipboardData&&e.clipboardData.items;if(!items)return;
      for(const item of items){if(item.type&&item.type.startsWith('image/')){const f=item.getAsFile();fileToDataUrlProfil(f,(d)=>{pendingCardPhoto=d;setCardPhotoPreview(d);});e.preventDefault();break;}}
    });

    async function loadCardData(){
      const res=await fetch('/api/me/card-data');
      const d=await res.json();
      if(!d.ok)return;
      document.getElementById('card-phone').value=d.data.phone||'';
      document.getElementById('card-birthdate').value=d.data.birthdate||'';
      document.getElementById('card-bank').value=d.data.bank||'';
      if(d.data.photo)setCardPhotoPreview(d.data.photo);
    }
    loadCardData();

    async function saveCardData(){
      const phone=document.getElementById('card-phone').value.trim();
      const birthdate=document.getElementById('card-birthdate').value;
      const bank=document.getElementById('card-bank').value.trim();
      const payload={phone,birthdate,bank};
      if(pendingCardPhoto!==null)payload.photo=pendingCardPhoto;
      const res=await fetch('/api/me/card-data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const d=await res.json();
      if(d.ok){showToast('IC údaje uloženy');pendingCardPhoto=null;}
      else showToast(d.error,true);
    }

    async function loadPromotions(){
      const res=await fetch('/api/me/promotions');
      const d=await res.json();
      const wrap=document.getElementById('promotions-list');
      if(!d.promotions||!d.promotions.length){wrap.innerHTML=ledgerEmptyHTML('Zatím žádné povýšení',true);return;}
      wrap.innerHTML=d.promotions.slice().reverse().map(p=>
        '<div class="manifest-row"><span class="mr-name">'+p.fromLabel+' → '+p.toLabel+'</span><span class="mr-dots"></span><span class="mr-val">'+new Date(p.at).toLocaleDateString('cs-CZ')+'</span></div>'
      ).join('');
    }
    loadPromotions();

    ${req.session.realAccessLevel === 1 ? `
    fetch('/api/season').then(r=>r.json()).then(d=>{const sel=document.getElementById('season-select');if(sel)sel.value=d.season;});
    async function setSeason(season){await fetch('/api/season',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({season})});showToast('Sezónní motiv změněn');}
    ` : ''}
  </script>
  </body></html>`;
}

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
    // Jedno API volání zjistí jak přítomnost na serveru, tak aktuální role —
    // pokud byl uživatel vyhozen, getMemberRoles vrátí null a roli ho odhlásíme.
    const roles = await discord.getMemberRoles(req.session.discordId);
    if (roles === null) {
      req.session.destroy(() => {});
      const isApi = req.path.startsWith('/api/');
      if (isApi) return res.json({ ok: false, error: 'Přístup odepřen — nejsi na Discord serveru' });
      return res.redirect('/login?error=not_on_server');
    }
    const newLevel = levelFromRoleIds(roles);

    // Detekce povýšení (snížení levelu = vyšší práva) → historie + gratulační banner
    if (req.session.realAccessLevel !== undefined && newLevel < req.session.realAccessLevel) {
      const RANK_LABEL = { 1: 'Council', 2: 'Senior Member', 3: 'Member' };
      try { db.addPromotion(req.session.userId, req.session.realAccessLevel, newLevel, RANK_LABEL[req.session.realAccessLevel]||'—', RANK_LABEL[newLevel]||'—'); } catch(e){}
    }

    req.session.realAccessLevel = newLevel;
    req.session.isAssociate = isAssociateOnly(roles);
    try { db.setAccessLevel(req.session.userId, newLevel); } catch (e) {}
    // accessLevel zůstává realAccessLevel, POKUD není aktivní view-as (viz applyViewAs middleware)
    if (!req.session.viewAsLevel) req.session.accessLevel = newLevel;
    req.session.discordCheckedAt = now;
    return next();
  } catch (err) {
    // Při chybě Discord API raději pustíme dál (fail-open), aby výpadek Discord API
    // nevyhodil všechny uživatele.
    console.error('[DISCORD CHECK]', err.message);
    return next();
  }
}

// (Registrace requireDiscordMember byla přesunuta hned za session middleware výše,
// aby platila i pro SSE /api/events a všechny ostatní routy.)

// ── VIEW AS — Founder/Council mohou simulovat nižší roli pro testování ──────
function applyViewAs(req, res, next) {
  if (req.session && req.session.userId) {
    const real = req.session.realAccessLevel ?? req.session.accessLevel ?? 3;
    if (req.session.viewAsLevel && real === 1) {
      // Pouze level 1 (Founder/Council) smí mít aktivní view-as
      req.session.accessLevel = req.session.viewAsLevel;
    } else {
      req.session.viewAsLevel = null;
      req.session.accessLevel = real;
    }
  }
  next();
}

app.post('/api/view-as', requireAuth, (req, res) => {
  const real = req.session.realAccessLevel ?? req.session.accessLevel ?? 3;
  if (real !== 1) return res.status(403).json({ ok: false, error: 'Pouze Founder/Council může používat View As' });
  const { level } = req.body; // 1,2,3 nebo null pro vypnutí
  if (level === null || level === undefined) {
    req.session.viewAsLevel = null;
  } else {
    const lvl = parseInt(level);
    if (![1,2,3].includes(lvl)) return res.json({ ok: false, error: 'Neplatná úroveň' });
    req.session.viewAsLevel = lvl;
  }
  res.json({ ok: true, viewAsLevel: req.session.viewAsLevel });
});

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
app.post('/api/zbrane', requireAuth, requireAccess('sklad'), async (req, res) => {
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
  try { const cnt = db.incrementActionCount(req.session.userId); require('./achievements').checkActionAchievements(req.session.userId, cnt); } catch(e){}
  res.json({ ok: true });
});

app.post('/api/weed', requireAuth, requireAccess('sklad'), async (req, res) => {
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
  try { const cnt = db.incrementActionCount(req.session.userId); require('./achievements').checkActionAchievements(req.session.userId, cnt); } catch(e){}
  res.json({ ok: true, celkVyroba: ceny.vyroba * qty, celkProdej: ceny.prodej * qty });
});

app.post('/api/drogy', requireAuth, requireAccess('sklad'), async (req, res) => {
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
  try { const cnt = db.incrementActionCount(req.session.userId); require('./achievements').checkActionAchievements(req.session.userId, cnt); } catch(e){}
  res.json({ ok: true });
});

app.post('/api/ucet', requireAuth, requireAccess('sklad'), async (req, res) => {
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

app.post('/api/chemky', requireAuth, requireAccess('sklad'), async (req, res) => {
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
  try { const cnt = db.incrementActionCount(req.session.userId); require('./achievements').checkActionAchievements(req.session.userId, cnt); } catch(e){}
  res.json({ ok: true });
});

// ── API — SMĚNÁRNA (SAD ↔ Pesos, kurz 1:1, pouze pro účet organizace Albion) ──
app.post('/api/smena', requireAuth, requireAccess('sklad'), async (req, res) => {
  const { smer, castka } = req.body;
  const smerOk = (smer || '').toString().trim();
  const amount = parseFloat(castka);

  if (!['usd_to_pesos', 'pesos_to_usd'].includes(smerOk)) return res.json({ ok: false, error: 'Neplatný směr směny' });
  if (!isAmount(amount)) return res.json({ ok: false, error: 'Neplatná částka (max 1 000 000)' });

  const cas = sheets.timestamp();
  const uzivatel = req.session.icName;
  const discordUser = req.session.discordUsername;

  const zValuta = smerOk === 'usd_to_pesos' ? 'USD' : 'PESOS';
  const naValuta = smerOk === 'usd_to_pesos' ? 'PESOS' : 'USD';
  const poznamka = `Směna 1:1 — ${zValuta === 'USD' ? 'SAD' : 'Pesos'} → ${naValuta === 'USD' ? 'SAD' : 'Pesos'}`;

  // Dva řádky do Účetnictví: výdaj měny, kterou frakce dává + příjem měny, kterou frakce dostává.
  // Kurz je 1:1, takže částka zůstává stejná, jen se přesouvá mezi měnami.
  await sheets.appendRow('Účetnictví', [cas, 'VÝDAJ', amount, zValuta, poznamka, uzivatel]);
  await sheets.appendRow('Účetnictví', [cas, 'PŘÍJEM', amount, naValuta, poznamka, uzivatel]);

  await discord.notifySmena(smerOk, amount, amount, uzivatel);
  await discord.notifyAudit('Účetnictví', uzivatel, discordUser, `SMĚNA — ${poznamka} | ${zValuta === 'USD' ? '$' : '₱'}${amount} → ${naValuta === 'USD' ? '$' : '₱'}${amount}`);
  broadcastSSE('ucetUpdate', { typ: 'SMĚNA', castka: amount, valuta: zValuta, poznamka, uzivatel, cas });

  res.json({ ok: true, zValuta, naValuta, castka: amount });
});

// ── API — BULK SKLAD (více položek najednou) ──────────────────────────────
const BULK_SEKCE = {
  zbrane: { sheet: 'Zbraně', allowedList: () => [...CONFIG.zbrane, ...CONFIG.naboje, ...CONFIG.akce] },
  weed:   { sheet: 'Weed',   allowedList: () => CONFIG.weedOdrudy },
  drogy:  { sheet: 'Drogy',  allowedList: () => CONFIG.drogyTypy },
  chemky: { sheet: 'Chemky', allowedList: () => CONFIG.chemkyTypy },
};

app.post('/api/sklad/bulk', requireAuth, requireAccess('sklad'), async (req, res) => {
  const { sekce, typ, items } = req.body; // items = [{ polozka, mnozstvi, kategorie?, ucel? }, ...]
  const cfg = BULK_SEKCE[sekce];
  if (!cfg) return res.json({ ok: false, error: 'Neplatná sekce skladu' });

  const typUp = (typ || '').toString().toUpperCase();
  if (!inEnum(typUp, TYP_SKLAD)) return res.json({ ok: false, error: 'Neplatný typ pohybu (VKLAD nebo VÝBĚR)' });

  if (!Array.isArray(items) || !items.length) return res.json({ ok: false, error: 'Žádné položky k zápisu' });
  if (items.length > 30) return res.json({ ok: false, error: 'Max 30 položek najednou' });

  const allowed = cfg.allowedList();
  const validated = [];
  for (const it of items) {
    const polozka = (it.polozka || '').toString().trim();
    const qty = parseInt(it.mnozstvi);
    if (!inList(polozka, allowed)) return res.json({ ok: false, error: `Nepovolená položka: ${polozka}` });
    if (!isQty(qty)) return res.json({ ok: false, error: `Neplatné množství u položky ${polozka}` });
    let ucelSafe = null;
    if (sekce === 'zbrane' && it.ucel) {
      ucelSafe = sanitizeText(it.ucel);
      if (ucelSafe === null) return res.json({ ok: false, error: `Účel je příliš dlouhý u položky ${polozka}` });
    }
    validated.push({ polozka, qty, kategorie: it.kategorie || null, ucel: ucelSafe });
  }

  const cas = sheets.timestamp();
  const uzivatel = req.session.icName;
  const discordUser = req.session.discordUsername;

  for (const v of validated) {
    if (sekce === 'zbrane') {
      await sheets.appendRow('Zbraně', [cas, typUp, v.polozka, v.qty, v.kategorie || '?', uzivatel, v.ucel || '-']);
    } else if (sekce === 'weed') {
      const ceny = CONFIG.weedCeny[v.polozka] || { vyroba: 100, prodej: 150 };
      await sheets.appendRow('Weed', [cas, typUp, v.polozka, v.qty, ceny.vyroba, ceny.prodej, uzivatel]);
    } else if (sekce === 'drogy') {
      await sheets.appendRow('Drogy', [cas, typUp, v.polozka, v.qty, '-', '-', uzivatel]);
    } else if (sekce === 'chemky') {
      await sheets.appendRow('Chemky', [cas, typUp, v.polozka, v.qty, uzivatel]);
    }
  }

  const shrnuti = validated.map(v => `${v.polozka} (${v.qty} ks)`).join(', ');
  await discord.notifyAudit(cfg.sheet, uzivatel, discordUser, `${typUp} (HROMADNĚ ×${validated.length}) — ${shrnuti}`);
  broadcastSSE('skladUpdate', { sekce, typ: typUp, polozka: `${validated.length} položek`, qty: validated.reduce((a,v)=>a+v.qty,0), uzivatel, cas });
  try { const cnt = db.incrementActionCount(req.session.userId); require('./achievements').checkActionAchievements(req.session.userId, cnt); } catch(e){}

  res.json({ ok: true, count: validated.length });
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

// ── API — GARÁŽ (vozový park) ──────────────────────────────────────────────────
app.get('/api/garage', requireAuth, (req, res) => {
  const cars = loadGarage().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  res.json({ ok: true, cars });
});

// ── API — GARÁŽ pro Discord bota (chráněno tajným klíčem, ne Discord session) ──
// Bot běží jako samostatná služba bez přístupu ke stejnému Volume jako web,
// takže si data o garáži stahuje přes tento endpoint místo čtení souboru z disku.
app.get('/api/bot/garage', (req, res) => {
  const key = req.headers['x-bot-key'];
  if (!key || key !== process.env.BOT_API_KEY) {
    return res.status(401).json({ ok: false, error: 'Neautorizováno' });
  }
  const cars = loadGarage().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  res.json({ ok: true, cars });
});

app.post('/api/garage', requireAuth, async (req, res) => {
  let { spz, nazev, cena, kupil, ucel, image } = req.body;
  const ucelRaw = ucel;
  spz = sanitizeText(spz, 12);
  nazev = sanitizeText(nazev, 80);
  ucel = ucelRaw ? sanitizeText(ucelRaw, 400) : null;
  kupil = sanitizeText(kupil, 80) || req.session.icName;
  const cenaNum = parseFloat(cena);

  if (!spz) return res.json({ ok: false, error: 'Vyplň SPZ vozu (max 12 znaků)' });
  if (!nazev) return res.json({ ok: false, error: 'Vyplň název / model vozu' });
  if (!isAmount(cenaNum, 50_000_000)) return res.json({ ok: false, error: 'Neplatná cena v SAD' });
  if (ucelRaw && !ucel) return res.json({ ok: false, error: 'Účel je příliš dlouhý (max 400 znaků)' });

  const imagePath = await saveGarageImage(image, null);

  const cars = loadGarage();
  const car = {
    id: `car_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
    spz: spz.toUpperCase(),
    nazev,
    cena: cenaNum,
    kupil,
    ucel: ucel || '',
    image: imagePath,
    pridal: req.session.icName,
    createdAt: Date.now(),
    createdAtText: sheets.timestamp ? sheets.timestamp() : new Date().toLocaleString('cs-CZ'),
  };
  cars.push(car);
  saveGarage(cars);
  broadcastSSE('garageUpdate', { action: 'add', car: { spz: car.spz, nazev: car.nazev } });

  const imageUrl = car.image ? `${req.protocol}://${req.get('host')}${car.image}` : null;
  discord.notifyGarage(car, req.session.icName, req.session.discordUsername, imageUrl)
    .catch(e => console.error('[DISCORD GARAGE]', e.message));

  res.json({ ok: true, car });
});

app.put('/api/garage/:id', requireAuth, async (req, res) => {
  const cars = loadGarage();
  const car = cars.find(c => c.id === req.params.id);
  if (!car) return res.json({ ok: false, error: 'Vůz nenalezen' });

  let { spz, nazev, cena, kupil, ucel, image } = req.body;
  spz = sanitizeText(spz, 12);
  nazev = sanitizeText(nazev, 80);
  ucel = ucel != null ? sanitizeText(ucel, 400) : '';
  kupil = sanitizeText(kupil, 80);
  const cenaNum = parseFloat(cena);

  if (!spz) return res.json({ ok: false, error: 'Vyplň SPZ vozu (max 12 znaků)' });
  if (!nazev) return res.json({ ok: false, error: 'Vyplň název / model vozu' });
  if (!isAmount(cenaNum, 50_000_000)) return res.json({ ok: false, error: 'Neplatná cena v SAD' });

  car.spz = spz.toUpperCase();
  car.nazev = nazev;
  car.cena = cenaNum;
  car.kupil = kupil || car.kupil;
  car.ucel = ucel || '';
  if (image) car.image = await saveGarageImage(image, car.image);
  else if (image === '') {
    // Uživatel smazal fotku — odstraníme starý soubor a vynulujeme cestu
    if (car.image && car.image.startsWith('/garage-uploads/')) {
      fs.unlink(path.join(GARAGE_UPLOADS_DIR, path.basename(car.image)), () => {});
    }
    car.image = null;
  }
  car.updatedAt = Date.now();

  saveGarage(cars);
  broadcastSSE('garageUpdate', { action: 'edit', car: { spz: car.spz, nazev: car.nazev } });
  res.json({ ok: true, car });
});

app.delete('/api/garage/:id', requireAuth, (req, res) => {
  let cars = loadGarage();
  const car = cars.find(c => c.id === req.params.id);
  if (!car) return res.json({ ok: false, error: 'Vůz nenalezen' });
  if (car.image && car.image.startsWith('/garage-uploads/')) {
    fs.unlink(path.join(GARAGE_UPLOADS_DIR, path.basename(car.image)), () => {});
  }
  cars = cars.filter(c => c.id !== req.params.id);
  saveGarage(cars);
  broadcastSSE('garageUpdate', { action: 'remove', id: req.params.id });
  res.json({ ok: true });
});

// ── API — GALERIE ORGANIZACE ──────────────────────────────────────────────────
app.get('/api/gallery', requireAuth, (req, res) => {
  if (req.session.isAssociate) return res.status(403).json({ ok: false, error: 'Galerie je dostupná od hodnosti Member' });
  res.json({ ok: true, items: loadGallery().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)) });
});

app.post('/api/gallery', requireAuth, requireAccess('audit'), async (req, res) => {
  const { image, caption } = req.body;
  if (!image) return res.json({ ok: false, error: 'Chybí obrázek' });
  const match = image.match(/^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/);
  if (!match) return res.json({ ok: false, error: 'Neplatný formát obrázku' });
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  let buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 8*1024*1024) return res.json({ ok: false, error: 'Obrázek je příliš velký (max 8MB)' });
  const filename = `gal_${Date.now()}_${Math.floor(Math.random()*1e6)}.${ext}`;
  buffer = await addWatermark(buffer);
  fs.writeFileSync(path.join(GALLERY_UPLOADS_DIR, filename), buffer);
  const items = loadGallery();
  const item = { id: filename, image: `/gallery-uploads/${filename}`, caption: (caption||'').toString().slice(0,200), pridal: req.session.icName, createdAt: Date.now() };
  items.push(item);
  saveGallery(items);
  res.json({ ok: true, item });
});

app.delete('/api/gallery/:id', requireAuth, requireAccess('audit'), (req, res) => {
  let items = loadGallery();
  const item = items.find(i => i.id === req.params.id);
  if (!item) return res.json({ ok: false, error: 'Nenalezeno' });
  fs.unlink(path.join(GALLERY_UPLOADS_DIR, path.basename(item.image)), () => {});
  items = items.filter(i => i.id !== req.params.id);
  saveGallery(items);
  res.json({ ok: true });
});

// ── API — NÁSTĚNKA ────────────────────────────────────────────────────────────
app.get('/api/nastenska', requireAuth, requireAccess('nastenska'), async (req, res) => {
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

app.post('/api/nastenska', requireAuth, requireAccess('nastenska'), async (req, res) => {
  const { title, content } = req.body;
  if (!content || content.trim().length < 3) return res.json({ ok: false, error: 'Obsah je příliš krátký' });
  const uzivatel = req.session.icName;
  await discord.sendAnnouncement(title || 'Oznámení', content, uzivatel);
  broadcastSSE('nastenska', { title: title || 'Oznámení', content, uzivatel, timestamp: new Date().toISOString() });
  res.json({ ok: true });
});

// ── API — STATISTIKY ──────────────────────────────────────────────────────────
app.get('/api/stats', requireAuth, requireAccess('statistiky'), async (req, res) => {
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
        if (u.discord_aliases) {
          try { JSON.parse(u.discord_aliases).forEach(a => { if (a) nameMapStats[a.toLowerCase()] = u.ic_name; }); } catch {}
        }
      }
    });
    const icToDiscord = {};
    allUsers.forEach(u => { if (u.ic_name && u.discord_username) icToDiscord[u.ic_name] = u.discord_username; });

    const normalizeUser = (name) => {
      if (!name) return null;
      const lower = name.trim().toLowerCase();
      if (nameMapStats[lower]) return nameMapStats[lower];
      for (const [key, icName] of Object.entries(nameMapStats)) {
        if (key.includes(lower) || lower.includes(key)) return icName;
      }
      return name.trim(); // neznámý — vrátíme jak je
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
app.get('/api/audit', requireAuth, requireAccess('audit'), async (req, res) => {
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
        if (u.discord_aliases) {
          try { JSON.parse(u.discord_aliases).forEach(a => { if (a) nameMap[a.toLowerCase()] = u.ic_name; }); } catch {}
        }
      }
    });
    const normAudit = (name) => {
      if (!name || name === '—' || name === '-') return '—';
      const trimmed = name.trim();
      const lower = trimmed.toLowerCase();
      if (nameMap[lower]) return nameMap[lower];
      for (const [key, icName] of Object.entries(nameMap)) {
        if (key.includes(lower) || lower.includes(key)) return icName;
      }
      // Neznámý uživatel — vrátíme co je v sheetu, ale mohlo by být discord username od bota
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

// ── API — LEADERBOARD AKTIVITY ─────────────────────────────────────────────
app.get('/api/leaderboard', requireAuth, async (req, res) => {
  try {
    const [zbraneRows, weedRows, drogyRows, chemkyRows] = await Promise.all([
      sheets.getRows('Zbraně').catch(() => []),
      sheets.getRows('Weed').catch(() => []),
      sheets.getRows('Drogy').catch(() => []),
      sheets.getRows('Chemky').catch(() => []),
    ]);
    const allUsers = db.prepare('SELECT * FROM users').all();
    const nameMap = {};
    allUsers.forEach(u => {
      if (u.ic_name) {
        nameMap[u.ic_name.toLowerCase()] = u.ic_name;
        if (u.discord_username) nameMap[u.discord_username.toLowerCase()] = u.ic_name;
        if (u.discord_aliases) { try { JSON.parse(u.discord_aliases).forEach(a => { if (a) nameMap[a.toLowerCase()] = u.ic_name; }); } catch {} }
      }
    });
    const norm = (name) => {
      if (!name) return null;
      const lower = name.toString().trim().toLowerCase();
      if (nameMap[lower]) return nameMap[lower];
      for (const [k, ic] of Object.entries(nameMap)) if (k.includes(lower) || lower.includes(k)) return ic;
      return name.toString().trim();
    };

    const parseCas = (cas) => {
      if (!cas) return 0;
      const s = cas.toString().trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s).getTime() || 0;
      const m = s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4}),?\s*(\d{1,2}):(\d{2}):(\d{2})/);
      if (m) return new Date(+m[3], +m[2]-1, +m[1], +m[4], +m[5], +m[6]).getTime();
      return 0;
    };

    const counts = {};
    const bump = (member) => {
      if (!member) return;
      if (!counts[member]) counts[member] = { acts: 0, lastTs: 0 };
      counts[member].acts++;
    };
    const addRows = (rows, memberCol) => {
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i]; if (!r || !r.some(c => c && c.toString().trim())) continue;
        const member = norm(r[memberCol]);
        bump(member);
        if (member) counts[member].lastTs = Math.max(counts[member].lastTs, parseCas(r[0]));
      }
    };
    addRows(zbraneRows, 5);
    addRows(weedRows, 6);
    addRows(drogyRows, 6);
    addRows(chemkyRows, 4);

    const list = Object.entries(counts).map(([member, c]) => ({ member, acts: c.acts, lastTs: c.lastTs }));
    list.sort((a, b) => b.acts - a.acts);

    res.json({ ok: true, leaderboard: list.slice(0, 15), generatedAt: sheets.timestamp() });
  } catch (e) {
    console.error('[LEADERBOARD]', e);
    res.json({ ok: false, leaderboard: [] });
  }
});

// ── API — TÝDENNÍ SOUHRN ───────────────────────────────────────────────────
app.get('/api/weekly-summary', requireAuth, requireAccess('statistiky'), async (req, res) => {
  try {
    const ucetRows = await sheets.getRows('Účetnictví').catch(() => []);
    const now = Date.now(), WEEK = 7*86400000;
    let income=0, expense=0, ops=0;
    for (let i=1;i<ucetRows.length;i++){
      const r=ucetRows[i]; if(!r||!r[0])continue;
      const ts = (()=>{const s=(r[0]||'').toString();const m=s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4}),?\s*(\d{1,2}):(\d{2}):(\d{2})/);return m?new Date(+m[3],+m[2]-1,+m[1],+m[4],+m[5],+m[6]).getTime():0;})();
      if (now-ts>WEEK || ts===0) continue;
      ops++;
      const castka=parseFloat((r[2]||'0').replace(',','.'))||0;
      if((r[1]||'').toUpperCase()==='PŘÍJEM') income+=castka; else expense+=castka;
    }
    res.json({ ok:true, income, expense, net: income-expense, ops });
  } catch(e){ res.json({ ok:false }); }
});

// ── API — PROFIL: PROMOTIONS, ACHIEVEMENTY, ONBOARDING ─────────────────────
app.get('/api/me/promotions', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  res.json({ ok: true, promotions: user?.promotions || [] });
});

// ── ALBION WORLD — expose stávající session dat pro React frontend (žádná nová logika) ──
app.get('/api/me/session', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const photo = (user && (user.card_photo || user.avatar_url)) || '/logo.png';
  const accessLevel = req.session.accessLevel || 3;
  const pages = ['home','garaz','sklad','blackbook','profit-centrum','audit','statistiky','nastenska','hierarchy','kodex','lore','profil','galerie','karta','weed-sazeni'];
  const permissions = pages.filter(p => canAccess(accessLevel, p));
  res.json({ ok: true, icName: req.session.icName, accessLevel, photo, permissions });
});

app.get('/api/me/promotions/pending', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user?.pendingPromotionAck || !user.promotions?.length) return res.json({ ok: true, pending: false });
  const last = user.promotions[user.promotions.length - 1];
  res.json({ ok: true, pending: true, toLabel: last.toLabel });
});

app.post('/api/me/promotions/ack', requireAuth, (req, res) => {
  db.ackPromotion(req.session.userId);
  res.json({ ok: true });
});

app.get('/api/me/achievements', requireAuth, (req, res) => {
  const { ACHIEVEMENTS } = require('./achievements');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const earned = user?.achievements || [];
  res.json({ ok: true, earned, catalog: ACHIEVEMENTS });
});

app.get('/api/me/onboarding', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  res.json({ ok: true, seen: !!user?.onboarding_seen });
});

app.post('/api/me/onboarding/seen', requireAuth, (req, res) => {
  db.markOnboardingSeen(req.session.userId);
  res.json({ ok: true });
});

// ── API — TRADING KARTA ČLENA ──────────────────────────────────────────────
app.get('/api/card/:icName', requireAuth, (req, res) => {
  const user = db.findByIcName(req.params.icName);
  if (!user) return res.json({ ok: false, error: 'Člen nenalezen' });
  const accessLevel = req.session.realAccessLevel || req.session.accessLevel || 3;
  // Associate kartu nevidí — ani vlastní, ani cizí
  if (accessLevel >= 3) return res.json({ ok: false, error: 'Karta je dostupná od hodnosti Member' });
  res.json({
    ok: true,
    card: {
      ic_name: user.ic_name,
      discord_username: user.discord_username,
      avatar_url: user.avatar_url || null,
      created_at: user.created_at,
      achievements: user.achievements || [],
      action_count: user.action_count || 0,
      promotions: user.promotions || [],
      rank: RANK_LABEL_MAP[user.access_level || 3] || 'Member/Associate',
      ic_photo: user.card_photo || null,
      phone: user.card_phone || null,
      birthdate: user.card_birthdate || null,
      bank: user.card_bank || null,
    },
  });
});

app.get('/karta/:icName?', requireAuth, (req, res) => {
  const target = req.query.icName || req.params.icName || req.session.icName;
  res.send(renderCard(req, target));
});

// ── VEŘEJNÁ NÁBOROVÁ STRÁNKA (bez přihlášení) ──────────────────────────────
app.get('/nabor', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Albion — Připoj se</title>
  ${require('./styles').baseStyles()}
  </head><body>
  <main style="text-align:center;padding-top:5rem">
    <img src="/logo.png" style="width:140px;margin-bottom:2rem;filter:drop-shadow(0 0 30px rgba(110,20,35,0.6))">
    <h1 class="page-title" style="font-size:3.5rem">ALBION</h1>
    <p class="page-sub" style="max-width:560px;margin:1rem auto 3rem">Organizace postavená na ambicích, loajalitě a důvěře. Nehledáme hlasité — hledáme schopné.</p>
    <div class="folio-footnote" style="text-align:left;max-width:600px;margin:0 auto 2rem">
      <strong>Poslání.</strong> Budovat dlouhodobý vliv v Los Santos skrze kontakty, důvěru a profesionalitu — ne násilí.
    </div>
    <a href="/register" class="auth-btn" style="max-width:320px;margin:0 auto;display:block">Žádost o členství</a>
  </main>
  </body></html>`);
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
app.get('/api/blackbook', requireAuth, requireAccess('blackbook'), async (req, res) => {
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
        if (u.discord_aliases) {
          try { JSON.parse(u.discord_aliases).forEach(a => { if (a) nameMap[a.toLowerCase()] = u.ic_name; }); } catch {}
        }
      }
    });
    const norm = (name) => {
      if (!name || name === '—' || name === '-') return null;
      const lower = name.toString().trim().toLowerCase();
      if (nameMap[lower]) return nameMap[lower];
      for (const [key, ic] of Object.entries(nameMap)) { if (key.includes(lower) || lower.includes(key)) return ic; }
      return name.toString().trim(); // neznámý — vrátíme jak je
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
app.get('/api/profit-centrum', requireAuth, requireAccess('profit-centrum'), async (req, res) => {
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
        if (u.discord_aliases) {
          try { JSON.parse(u.discord_aliases).forEach(a => { if (a) nameMap[a.toLowerCase()] = u.ic_name; }); } catch {}
        }
      }
    });
    const norm = (name) => {
      if (!name || name === '—' || name === '-') return null;
      const lower = name.toString().trim().toLowerCase();
      if (nameMap[lower]) return nameMap[lower];
      for (const [key, ic] of Object.entries(nameMap)) { if (key.includes(lower) || lower.includes(key)) return ic; }
      return name.toString().trim(); // neznámý — vrátíme jak je
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


app.get('/sklad', requireAuth, requireAccess('sklad'), async (req, res) => {
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
app.get('/blackbook', requireAuth, requireAccess('blackbook'), (req, res) => res.send(renderBlackbook(req)));
app.get('/profit-centrum', requireAuth, requireAccess('profit-centrum'), (req, res) => res.send(renderProfitCentrum(req)));
app.get('/nastenska', requireAuth, requireAccess('nastenska'), (req, res) => res.send(renderNastenska(req)));
app.get('/kodex', requireAuth, (req, res) => res.send(renderKodex(req)));
app.get('/audit', requireAuth, requireAccess('audit'), (req, res) => res.send(renderAudit(req)));
app.get('/statistiky', requireAuth, requireAccess('statistiky'), (req, res) => res.send(renderStatistiky(req)));
app.get('/lore', requireAuth, (req, res) => res.send(renderLore(req)));
app.get('/hierarchy', requireAuth, (req, res) => res.send(renderHierarchy(req)));
app.get('/garaz', requireAuth, (req, res) => res.send(renderGaraz(req)));
app.get('/leaderboard', requireAuth, (req, res) => res.send(renderLeaderboard(req)));
app.get('/galerie', requireAuth, (req, res) => {
  if (req.session.isAssociate) return res.status(403).send('Galerie je dostupná od hodnosti Member. <a href="/home">Zpět</a>');
  res.send(renderGallery(req));
});

// ── ALBION WORLD — samostatná React/R3F frontend aplikace (Vite build),
// servírovaná Expressem jako statické soubory pod /albion-world/.
// Backend/data/session zůstávají beze změny — viz /api/me/session výše.
const ALBION_WORLD_DIST = path.join(__dirname, 'albion-world', 'dist');
app.use('/albion-world', express.static(ALBION_WORLD_DIST));
app.get('/albion-world*', requireAuth, (req, res) => {
  res.sendFile(path.join(ALBION_WORLD_DIST, 'index.html'), (err) => {
    if (err) res.status(503).send('Albion World není sestaven. Spusť: cd albion-world && npm install && npm run build');
  });
});
app.get('/albion', requireAuth, (req, res) => res.redirect('/albion-world/'));


app.listen(PORT, () => console.log(`🌐 Albion web běží na http://localhost:${PORT}`));
