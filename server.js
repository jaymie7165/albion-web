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

const { CONFIG, WEED_PLANT } = require('./constants');
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
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

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
function saveGarageImage(dataUrl, existingPath) {
  if (!dataUrl || typeof dataUrl !== 'string') return existingPath || null;
  const match = dataUrl.match(/^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/);
  if (!match) return existingPath || null;
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 8 * 1024 * 1024) return existingPath || null; // 8MB strop
  const filename = `car_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;
  try {
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

// ── API — GARÁŽ (vozový park) ──────────────────────────────────────────────────
app.get('/api/garage', requireAuth, (req, res) => {
  const cars = loadGarage().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  res.json({ ok: true, cars });
});

app.post('/api/garage', requireAuth, (req, res) => {
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

  const imagePath = saveGarageImage(image, null);

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

app.put('/api/garage/:id', requireAuth, (req, res) => {
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
  if (image) car.image = saveGarageImage(image, car.image);
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
app.get('/garaz', requireAuth, (req, res) => res.send(renderGaraz(req)));


app.listen(PORT, () => console.log(`🌐 Albion web běží na http://localhost:${PORT}`));
