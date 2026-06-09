// server.js — Albion Web Dashboard v2
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt  = require('bcryptjs');
const axios   = require('axios');
const path    = require('path');

const db      = require('./db');
const sheets  = require('./sheets');
const discord = require('./discord');
const { requireAuth } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || process.env.WEB_PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
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
};

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
app.get('/', requireAuth, (req, res) => res.redirect('/dashboard'));
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
  req.session.pendingDiscord = null;
  res.redirect('/dashboard');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

// ── API — SKLADY ──────────────────────────────────────────────────────────────
app.post('/api/zbrane', requireAuth, async (req, res) => {
  const { typ, polozka, mnozstvi, kategorie, ucel } = req.body;
  const qty = parseInt(mnozstvi);
  if (!polozka || !qty || qty <= 0) return res.json({ ok: false, error: 'Chybné údaje' });
  const cas = sheets.timestamp();
  const uzivatel = req.session.icName;
  const discordUser = req.session.discordUsername;
  await sheets.appendRow('Zbraně', [cas, typ, polozka, qty, kategorie, uzivatel, ucel || '-']);
  await discord.notifyAudit('Zbraně', uzivatel, discordUser, `${typ} — ${polozka} (${qty} ks) [${kategorie}]${ucel ? ' | Účel: ' + ucel : ''}`);
  broadcastSSE('skladUpdate', { sekce: 'zbrane', typ, polozka, qty, uzivatel, cas });
  res.json({ ok: true });
});

app.post('/api/weed', requireAuth, async (req, res) => {
  const { typ, odruda, mnozstvi } = req.body;
  const qty = parseInt(mnozstvi);
  if (!odruda || !qty || qty <= 0) return res.json({ ok: false, error: 'Chybné údaje' });
  const ceny = CONFIG.weedCeny[odruda] || { vyroba: 100, prodej: 150 };
  const cas = sheets.timestamp();
  const uzivatel = req.session.icName;
  const discordUser = req.session.discordUsername;
  await sheets.appendRow('Weed', [cas, typ, odruda, qty, ceny.vyroba, ceny.prodej, uzivatel]);
  await discord.notifyAudit('Weed', uzivatel, discordUser, `${typ} — ${odruda} (${qty} ks) | Výroba: ~$${ceny.vyroba * qty} | Prodej: $${ceny.prodej * qty}`);
  broadcastSSE('skladUpdate', { sekce: 'weed', typ, odruda, qty, uzivatel, cas });
  res.json({ ok: true, celkVyroba: ceny.vyroba * qty, celkProdej: ceny.prodej * qty });
});

app.post('/api/drogy', requireAuth, async (req, res) => {
  const { typ, droga, mnozstvi } = req.body;
  const qty = parseInt(mnozstvi);
  if (!droga || !qty || qty <= 0) return res.json({ ok: false, error: 'Chybné údaje' });
  const cas = sheets.timestamp();
  const uzivatel = req.session.icName;
  const discordUser = req.session.discordUsername;
  await sheets.appendRow('Drogy', [cas, typ, droga, qty, '-', '-', uzivatel]);
  await discord.notifyAudit('Drogy', uzivatel, discordUser, `${typ} — ${droga} (${qty} ks)`);
  broadcastSSE('skladUpdate', { sekce: 'drogy', typ, droga, qty, uzivatel, cas });
  res.json({ ok: true });
});

app.post('/api/ucet', requireAuth, async (req, res) => {
  const { typ, castka, valuta, poznamka } = req.body;
  const amount = parseFloat(castka);
  if (!amount || amount <= 0 || !valuta || !poznamka) return res.json({ ok: false, error: 'Chybné údaje' });
  const cas = sheets.timestamp();
  const uzivatel = req.session.icName;
  const discordUser = req.session.discordUsername;
  await sheets.appendRow('Účetnictví', [cas, typ, amount, valuta, poznamka, uzivatel]);
  await discord.notifyAudit('Účetnictví', uzivatel, discordUser, `${typ} — ${valuta === 'USD' ? '$' : '₱'}${amount} | ${poznamka}`);
  broadcastSSE('ucetUpdate', { typ, castka: amount, valuta, poznamka, uzivatel, cas });
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
    const [zbraneRows, weedRows, drogyRows, ucetRows] = await Promise.all([
      sheets.getRows('Zbraně').catch(() => []),
      sheets.getRows('Weed').catch(() => []),
      sheets.getRows('Drogy').catch(() => []),
      sheets.getRows('Účetnictví').catch(() => []),
    ]);

    // Sestavit obousměrné mapy: ic_name <-> discord_username
    const allUsers = db.prepare('SELECT * FROM users').all();
    const icToDiscord = {};
    const discordToIc = {};
    allUsers.forEach(u => {
      if (u.ic_name && u.discord_username) {
        icToDiscord[u.ic_name] = u.discord_username;
        discordToIc[u.discord_username] = u.ic_name;
      }
    });

    // Normalizace: discord_username → ic_name (aby se záznamy nesčítaly zvlášť)
    const normalizeUser = (name) => discordToIc[name] || name;

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
    const [zbraneRows, weedRows, drogyRows, ucetRows] = await Promise.all([
      sheets.getRows('Zbraně').catch(() => []),
      sheets.getRows('Weed').catch(() => []),
      sheets.getRows('Drogy').catch(() => []),
      sheets.getRows('Účetnictví').catch(() => []),
    ]);

    // Normalizace jmen: discord_username → ic_name
    const allUsersAudit = db.prepare('SELECT * FROM users').all();
    const discordToIcAudit = {};
    allUsersAudit.forEach(u => {
      if (u.ic_name && u.discord_username) discordToIcAudit[u.discord_username] = u.ic_name;
    });
    const normAudit = (name) => discordToIcAudit[name] || name;

    const events = [];

    const addRows = (rows, sekce, icon) => {
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r[0]) continue;
        let detail = '';
        if (sekce === 'Zbraně') detail = `${r[2]} (${r[3]} ks) [${r[4]}]${r[6] && r[6] !== '-' ? ' | Účel: '+r[6] : ''}`;
        else if (sekce === 'Weed') detail = `${r[2]} (${r[3]} ks) | Výroba: ~$${(parseFloat(r[4])||0)*(parseInt(r[3])||0)} | Prodej: $${(parseFloat(r[5])||0)*(parseInt(r[3])||0)}`;
        else if (sekce === 'Drogy') detail = `${r[2]} (${r[3]} ks)`;
        else if (sekce === 'Účetnictví') { const sym = (r[3]||'') === 'USD' ? '$' : '₱'; detail = `${sym}${r[2]} | ${r[4]}`; }
        const rawUzivatel = r[sekce === 'Účetnictví' ? 5 : (sekce === 'Zbraně' ? 5 : 6)] || '—';
        events.push({
          cas: r[0],
          sekce,
          icon,
          typ: (r[1]||'').toUpperCase(),
          uzivatel: normAudit(rawUzivatel),
          detail,
        });
      }
    };

    addRows(zbraneRows, 'Zbraně', '🔫');
    addRows(weedRows, 'Weed', '🌿');
    addRows(drogyRows, 'Drogy', '💊');
    addRows(ucetRows, 'Účetnictví', '💱');

    // Souhrn účetnictví per uživatel (normalizovaný)
    const ucetSouhrn = {};
    for (let i = 1; i < ucetRows.length; i++) {
      const r = ucetRows[i];
      const uz = normAudit(r[5]); if (!uz) continue;
      if (!ucetSouhrn[uz]) ucetSouhrn[uz] = { prijem_usd: 0, vydaj_usd: 0, prijem_pesos: 0, vydaj_pesos: 0 };
      const typ = (r[1]||'').toUpperCase();
      const castka = parseFloat((r[2]||'0').replace(',','.')) || 0;
      const valuta = (r[3]||'USD').toUpperCase();
      const s = ucetSouhrn[uz];
      if (typ === 'PŘÍJEM') { if (valuta === 'USD') s.prijem_usd += castka; else s.prijem_pesos += castka; }
      else                  { if (valuta === 'USD') s.vydaj_usd += castka; else s.vydaj_pesos += castka; }
    }

    events.sort((a, b) => b.cas.localeCompare(a.cas));

    res.json({ ok: true, events: events.slice(0, 200), ucetSouhrn });
  } catch (e) {
    console.error('[AUDIT]', e);
    res.json({ ok: false, events: [], ucetSouhrn: {} });
  }
});

// ── STRÁNKY ───────────────────────────────────────────────────────────────────
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const [zbrane, weed, drogy, ucet, recentUcet] = await Promise.all([
      sheets.getStockSummary('Zbraně').catch(() => ({})),
      sheets.getStockSummary('Weed').catch(() => ({})),
      sheets.getStockSummary('Drogy').catch(() => ({})),
      sheets.getAccountingSummary().catch(() => ({ usd: 0, pesos: 0 })),
      sheets.getRecentRows('Účetnictví', 5).catch(() => []),
    ]);
    res.send(renderDashboard(req, { zbrane, weed, drogy, ucet, recentUcet }));
  } catch (e) {
    res.send(renderDashboard(req, { zbrane: {}, weed: {}, drogy: {}, ucet: { usd: 0, pesos: 0 }, recentUcet: [] }));
  }
});

app.get('/nastenska', requireAuth, (req, res) => res.send(renderNastenska(req)));
app.get('/kodex', requireAuth, (req, res) => res.send(renderKodex(req)));
app.get('/audit', requireAuth, (req, res) => res.send(renderAudit(req)));
app.get('/statistiky', requireAuth, (req, res) => res.send(renderStatistiky(req)));
app.get('/lore', requireAuth, (req, res) => res.send(renderLore(req)));
app.get('/hierarchy', requireAuth, (req, res) => res.send(renderHierarchy(req)));
app.get('/sazeni', requireAuth, (req, res) => res.send(renderSazeni(req)));

// ── BASE STYLES ───────────────────────────────────────────────────────────────
function baseStyles() {
  return `
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}

      /* ── TÉMA ── */
      :root{
        --crimson:#8B1A1A;--crimson-light:#B22222;--crimson-glow:rgba(139,26,26,0.18);
        --silver:#B8B8C2;--silver-bright:#D2D2DC;--silver-dim:rgba(184,184,200,0.12);
        --gold:#C9A84C;--gold-dim:rgba(201,168,76,0.1);
        --bg:#07070A;--bg-soft:#0C0C10;--bg-mid:#131318;--bg-card:#0E0E13;
        --bg-card2:#111116;
        --text:#EDEEF4;--text-dim:#B4B4C4;--text-muted:#46464E;--text-label:#646470;
        --border:rgba(200,200,230,0.06);--border-hover:rgba(200,200,230,0.14);
        --border-silver:rgba(180,180,210,0.22);--border-gold:rgba(201,168,76,0.14);
        --input-bg:#131318;
        --shadow:0 4px 28px rgba(0,0,0,0.75);
        --shadow-card:0 2px 14px rgba(0,0,0,0.55);
      }
      body.light{
        --bg:#E6E6EE;--bg-soft:#DCDCE6;--bg-mid:#D0D0DC;--bg-card:#F2F2F8;--bg-card2:#EAEAF2;
        --silver:#606070;--silver-bright:#404050;--silver-dim:rgba(80,80,120,0.1);
        --text:#16161E;--text-dim:#2C2C38;--text-muted:#888898;--text-label:#606070;
        --border:rgba(0,0,0,0.07);--border-hover:rgba(0,0,0,0.16);--border-silver:rgba(80,80,120,0.2);
        --input-bg:#DCDCE8;--shadow:0 4px 20px rgba(0,0,0,0.1);--shadow-card:0 2px 8px rgba(0,0,0,0.08);
      }

      body{background:var(--bg);color:var(--text);font-family:'Montserrat',sans-serif;font-weight:300;min-height:100vh;transition:background 0.3s,color 0.3s}

      /* ── NAV ── */
      nav{background:var(--bg-soft);border-bottom:1px solid var(--border-silver);padding:0 2rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;height:64px;transition:background 0.3s;backdrop-filter:blur(8px)}
      .nav-logo{font-family:'Cinzel',serif;letter-spacing:0.35em;font-size:1.1rem;text-decoration:none;color:var(--text);display:flex;align-items:center;gap:0.6rem}
      .nav-logo-dot{width:6px;height:6px;background:var(--crimson-light);border-radius:50%;flex-shrink:0}
      .nav-logo span{color:var(--silver-bright)}
      .nav-menu{display:flex;gap:0;list-style:none;height:100%}
      .nav-menu a{display:flex;align-items:center;gap:0.3rem;padding:0 0.9rem;font-size:0.6rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--text-muted);text-decoration:none;height:100%;border-bottom:2px solid transparent;transition:all 0.2s;white-space:nowrap}
      .nav-menu a:hover{color:var(--text-dim)}
      .nav-menu a.active{color:var(--silver-bright);border-bottom-color:var(--crimson)}
      .nav-right{display:flex;align-items:center;gap:0.8rem}
      .nav-user{font-size:0.68rem;color:var(--text-muted);letter-spacing:0.05em}
      .nav-user strong{color:var(--text);font-weight:400}
      .nav-logout{font-size:0.6rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--crimson-light);text-decoration:none;padding:0.3rem 0.7rem;border:1px solid rgba(139,26,26,0.3);transition:all 0.2s}
      .nav-logout:hover{background:var(--crimson-glow)}
      .theme-toggle{background:none;border:1px solid var(--border-hover);color:var(--text-muted);width:32px;height:32px;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;justify-content:center;transition:all 0.2s;border-radius:2px}
      .theme-toggle:hover{border-color:var(--silver);color:var(--silver)}
      .notif-bell{position:relative;cursor:pointer;background:none;border:none;color:var(--text-muted);font-size:1rem;padding:0.3rem;transition:color 0.2s}
      .notif-bell:hover{color:var(--silver-bright)}
      .notif-badge{position:absolute;top:-2px;right:-4px;background:var(--crimson-light);color:white;font-size:0.5rem;min-width:14px;height:14px;border-radius:7px;display:flex;align-items:center;justify-content:center;padding:0 3px;display:none}
      .notif-badge.visible{display:flex}

      /* ── LAYOUT ── */
      main{max-width:1440px;margin:0 auto;padding:2.5rem 2rem}
      .page-header{margin-bottom:2.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border-silver);position:relative}
      .page-header::before{content:'';position:absolute;bottom:-1px;left:0;width:60px;height:2px;background:var(--crimson-light)}
      .page-label{font-size:0.58rem;letter-spacing:0.5em;text-transform:uppercase;color:var(--silver);margin-bottom:0.8rem;opacity:0.9}
      .page-title{font-family:'Cinzel',serif;font-size:2rem;color:var(--text);font-weight:400}
      .page-sub{font-family:'Cormorant Garamond',serif;font-style:italic;color:var(--text-muted);margin-top:0.5rem;font-size:1rem}

      /* ── CARDS ── */
      .card{background:var(--bg-card);border:1px solid var(--border);padding:1.5rem;transition:background 0.3s,border 0.3s,box-shadow 0.3s;box-shadow:var(--shadow-card)}
      .card:hover{border-color:var(--border-hover)}
      .card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid var(--border)}
      .card-title{font-family:'Cinzel',serif;font-size:0.85rem;letter-spacing:0.1em;color:var(--text-dim)}
      .card-badge{font-size:0.57rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--silver-bright);background:var(--silver-dim);padding:0.25rem 0.65rem;border:1px solid var(--border-silver)}

      /* ── FORMS ── */
      .form-section{margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border)}
      .form-row{display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;margin-bottom:0.8rem}
      .form-group{display:flex;flex-direction:column;gap:0.3rem}
      label{font-size:0.58rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--text-label)}
      select,input[type=text],input[type=number],textarea{background:var(--input-bg);border:1px solid var(--border-hover);color:var(--text);padding:0.65rem 0.85rem;font-family:'Montserrat',sans-serif;font-size:0.82rem;width:100%;outline:none;transition:border-color 0.2s,box-shadow 0.2s}
      textarea{resize:vertical;min-height:80px}
      select:focus,input:focus,textarea:focus{border-color:var(--crimson-light);box-shadow:0 0 0 2px var(--crimson-glow)}
      select option{background:var(--bg-mid)}
      .btn-submit{background:linear-gradient(135deg,var(--crimson),var(--crimson-light));color:#F5F3EF;border:none;padding:0.75rem 1.5rem;font-family:'Montserrat',sans-serif;font-size:0.68rem;letter-spacing:0.25em;text-transform:uppercase;cursor:pointer;width:100%;margin-top:0.5rem;transition:opacity 0.2s,transform 0.1s;box-shadow:0 2px 12px rgba(139,26,26,0.3)}
      .btn-submit:hover{opacity:0.9}
      .btn-submit:active{transform:scale(0.99)}
      .typ-toggle{display:flex;gap:0.4rem;margin-bottom:1rem}
      .typ-btn{flex:1;padding:0.5rem;background:transparent;border:1px solid var(--border-hover);color:var(--text-muted);font-family:'Montserrat',sans-serif;font-size:0.62rem;letter-spacing:0.15em;text-transform:uppercase;cursor:pointer;transition:all 0.2s}
      .typ-btn:hover{color:var(--text-dim);border-color:var(--border-silver)}
      .typ-btn.active-vklad{background:rgba(0,255,136,0.08);border-color:rgba(0,255,136,0.3);color:#00FF88}
      .typ-btn.active-vyber{background:rgba(255,68,68,0.08);border-color:rgba(255,68,68,0.3);color:#FF4444}
      .info-box{background:var(--gold-dim);border:1px solid var(--border-gold);padding:0.8rem 1rem;font-size:0.78rem;color:var(--text-dim);margin-top:0.8rem;display:none}

      /* ── STATS TOP ── */
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2rem}
      .stat{background:var(--bg-card);border:1px solid var(--border);border-top:2px solid var(--crimson);padding:1.5rem;transition:background 0.3s;position:relative;overflow:hidden;box-shadow:var(--shadow-card)}
      .stat::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--crimson-light),transparent)}
      .stat-label{font-size:0.57rem;letter-spacing:0.35em;text-transform:uppercase;color:var(--text-label);margin-bottom:0.6rem}
      .stat-value{font-family:'Cinzel',serif;font-size:1.75rem;color:var(--text)}
      .stat-sub{font-size:0.65rem;color:var(--silver);margin-top:0.4rem;opacity:0.9}

      /* ── SKLAD ── */
      .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem}
      .sklad-row{display:flex;justify-content:space-between;align-items:center;padding:0.55rem 0;border-bottom:1px solid var(--border);font-size:0.82rem}
      .sklad-row:last-child{border-bottom:none}
      .sklad-row em{color:var(--gold);font-style:normal;margin-left:0.5rem;font-size:0.72rem;opacity:0.8}

      /* ── TOAST ── */
      .toast{position:fixed;bottom:2rem;right:2rem;background:var(--bg-card2);border:1px solid var(--border-hover);border-left:3px solid #00FF88;padding:1rem 1.5rem;font-size:0.82rem;transform:translateY(100px);opacity:0;transition:all 0.3s;z-index:999;max-width:320px;box-shadow:var(--shadow)}
      .toast.show{transform:translateY(0);opacity:1}
      .toast.error{border-left-color:#FF4444}

      /* ── TABULKY ── */
      .table-wrap{overflow-x:auto}
      table{width:100%;border-collapse:collapse;font-size:0.8rem}
      th{font-size:0.57rem;letter-spacing:0.22em;text-transform:uppercase;color:var(--silver-bright);padding:0.75rem 0.9rem;text-align:left;border-bottom:1px solid var(--border-silver);opacity:0.9}
      td{padding:0.7rem 0.9rem;border-bottom:1px solid var(--border);color:var(--text-dim)}
      tr:last-child td{border-bottom:none}
      tr:hover td{background:rgba(201,168,76,0.03)}
      .badge{font-size:0.58rem;padding:0.2rem 0.6rem;letter-spacing:0.1em;text-transform:uppercase;border-radius:1px}
      .badge.vklad{background:rgba(0,255,136,0.08);color:#00FF88;border:1px solid rgba(0,255,136,0.2)}
      .badge.vyber{background:rgba(255,68,68,0.08);color:#FF4444;border:1px solid rgba(255,68,68,0.2)}
      .badge.prijem{background:rgba(0,255,136,0.08);color:#00FF88;border:1px solid rgba(0,255,136,0.2)}
      .badge.vydaj{background:rgba(255,68,68,0.08);color:#FF4444;border:1px solid rgba(255,68,68,0.2)}

      /* ── NÁSTĚNKA ── */
      .nastenska-list{display:flex;flex-direction:column;gap:1rem}
      .nastenska-item{background:var(--bg-card);border:1px solid var(--border);border-left:3px solid var(--border-silver);padding:1.4rem 1.6rem;transition:all 0.3s}
      .nastenska-item:hover{border-left-color:var(--silver);background:var(--bg-card2)}
      .nastenska-item.new{border-left-color:var(--crimson-light);animation:pulse 2s ease}
      @keyframes pulse{0%,100%{box-shadow:none}50%{box-shadow:0 0 20px rgba(178,34,34,0.25)}}
      .nastenska-meta{font-size:0.6rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.5rem}
      .nastenska-title{font-family:'Cinzel',serif;font-size:0.95rem;margin-bottom:0.5rem;color:var(--text);font-weight:400}
      .nastenska-content{font-size:0.85rem;color:var(--text-dim);line-height:1.75;white-space:pre-wrap}
      .new-badge{display:inline-block;font-size:0.52rem;letter-spacing:0.15em;text-transform:uppercase;background:var(--crimson);color:white;padding:0.15rem 0.5rem;margin-left:0.5rem;vertical-align:middle}

      /* ── KODEX ── */
      .kodex-section{margin-bottom:2.5rem}
      .kodex-number{font-family:'Cinzel',serif;font-size:3.5rem;color:var(--silver);opacity:0.1;float:left;line-height:1;margin-right:1.2rem;margin-top:-0.3rem;font-weight:700}
      .kodex-rule{font-size:0.85rem;line-height:1.95;color:var(--text-dim);overflow:hidden}
      .kodex-rule strong{color:var(--text);font-weight:500}
      .kodex-divider{height:1px;background:var(--border);margin:1.8rem 0}

      /* ── STATISTIKY ── */
      .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1.5rem}
      .stat-card{background:var(--bg-card);border:1px solid var(--border);padding:1.8rem;transition:all 0.3s;box-shadow:var(--shadow-card)}
      .stat-card:hover{border-color:var(--border-silver);box-shadow:0 4px 20px rgba(0,0,0,0.5)}
      .stat-card-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.2rem;padding-bottom:1rem;border-bottom:1px solid var(--border-silver)}
      .stat-card-name{font-family:'Cinzel',serif;font-size:1rem;color:var(--text);font-weight:400}
      .stat-card-discord{font-size:0.62rem;letter-spacing:0.1em;color:var(--text-muted);margin-top:0.2rem}
      .stat-row{display:flex;justify-content:space-between;font-size:0.78rem;padding:0.3rem 0;color:var(--text-dim)}
      .stat-row strong{color:var(--text);font-weight:400}
      .stat-section-label{font-size:0.58rem;letter-spacing:0.22em;text-transform:uppercase;color:var(--silver);margin-top:0.9rem;margin-bottom:0.3rem;opacity:0.85;padding-top:0.6rem;border-top:1px solid var(--border)}
      .stat-section-label:first-of-type{border-top:none;margin-top:0}
      .stat-item-group{margin-left:0.5rem}

      /* ── LORE / HIERARCHY ── */
      .lore-grid{display:grid;grid-template-columns:1fr 320px;gap:3rem;align-items:start}
      .chapters{display:flex;flex-direction:column;gap:3rem}
      .chapter{border-left:2px solid var(--border-silver);padding-left:2rem;position:relative}
      .chapter::before{content:'';position:absolute;left:-5px;top:0;width:8px;height:8px;background:var(--silver);opacity:0.5;transform:rotate(45deg)}
      .chapter-meta{font-size:0.58rem;letter-spacing:0.35em;text-transform:uppercase;color:var(--silver);margin-bottom:0.8rem;opacity:0.85}
      .chapter-title{font-family:'Cinzel',serif;font-size:1.3rem;color:var(--text);margin-bottom:1rem;font-weight:400}
      .chapter-text{font-family:'Cormorant Garamond',serif;font-size:1.08rem;line-height:2;color:var(--text-dim)}
      .sidebar{background:var(--bg-card);border:1px solid var(--border-silver);padding:2rem;position:sticky;top:84px;box-shadow:var(--shadow-card)}
      .sidebar-title{font-family:'Cinzel',serif;font-size:0.75rem;letter-spacing:0.25em;text-transform:uppercase;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid var(--border);color:var(--silver)}
      .toc-item{font-size:0.75rem;padding:0.6rem 0;border-bottom:1px solid var(--border);color:var(--text-dim);display:flex;gap:0.8rem;align-items:center}
      .toc-item:last-child{border-bottom:none}
      .toc-num{color:var(--silver-bright);font-weight:500;min-width:1.5rem;font-family:'Cinzel',serif;font-size:0.8rem}
      .rank-list{display:flex;flex-direction:column;gap:0}
      .rank-item{display:flex;align-items:flex-start;gap:1.5rem;padding:1.4rem 1.6rem;background:var(--bg-card);border:1px solid var(--border);border-top:none;transition:all 0.2s}
      .rank-item:first-child{border-top:1px solid var(--border);border-top-color:var(--border-silver)}
      .rank-item:hover{background:var(--bg-card2);border-left-color:var(--silver)}
      .rank-item.founder{border-top:2px solid var(--silver);background:linear-gradient(135deg,var(--bg-card),var(--bg-card2))}
      .rank-num{font-family:'Cinzel',serif;font-size:1.4rem;color:var(--silver);opacity:0.5;min-width:2rem;line-height:1}
      .rank-info h3{font-family:'Cinzel',serif;font-size:0.88rem;color:var(--text);margin-bottom:0.2rem;font-weight:400}
      .rank-info .rank-member{font-size:0.75rem;color:var(--silver-bright);margin-bottom:0.4rem;opacity:0.95}
      .rank-info p{font-size:0.78rem;color:var(--text-muted);line-height:1.7}
      .rank-rights{margin-top:0.6rem;display:flex;flex-wrap:wrap;gap:0.3rem}
      .rank-right-tag{font-size:0.58rem;letter-spacing:0.1em;padding:0.2rem 0.55rem;background:var(--silver-dim);border:1px solid var(--border-silver);color:var(--silver-bright);white-space:nowrap}
    </style>
  `;
}

function renderNav(req, active) {
  const ic = req.session.icName;
  return `
    <nav>
      <a href="/dashboard" class="nav-logo"><div class="nav-logo-dot"></div>AL<span>B</span>ION</a>
      <ul class="nav-menu">
        <li><a href="/dashboard" class="${active==='dashboard'?'active':''}">Sklad</a></li>
        <li><a href="/nastenska" class="${active==='nastenska'?'active':''}">Nástěnka</a></li>
        <li><a href="/kodex" class="${active==='kodex'?'active':''}">Kodex</a></li>
        <li><a href="/audit" class="${active==='audit'?'active':''}">Audit</a></li>
        <li><a href="/statistiky" class="${active==='statistiky'?'active':''}">Statistiky</a></li>
        <li><a href="/lore" class="${active==='lore'?'active':''}">Historie</a></li>
        <li><a href="/hierarchy" class="${active==='hierarchy'?'active':''}">Hierarchie</a></li>
        <li><a href="/sazeni" class="${active==='sazeni'?'active':''}">🌱 Sázení</a></li>
      </ul>
      <div class="nav-right">
        <button class="notif-bell" id="notifBell" title="Notifikace" onclick="window.location='/nastenska'">🔔<span class="notif-badge" id="notifBadge">0</span></button>
        <button class="theme-toggle" id="themeBtn" onclick="toggleTheme()" title="Přepnout téma">🌙</button>
        <span class="nav-user">přihlášen jako <strong>${ic}</strong></span>
        <a href="/logout" class="nav-logout">Odhlásit</a>
      </div>
    </nav>
    <script>
      const savedTheme = localStorage.getItem('albion_theme') || 'dark';
      if (savedTheme === 'light') { document.body.classList.add('light'); document.getElementById('themeBtn').textContent = '☀️'; }
      function toggleTheme() {
        const isLight = document.body.classList.toggle('light');
        localStorage.setItem('albion_theme', isLight ? 'light' : 'dark');
        document.getElementById('themeBtn').textContent = isLight ? '☀️' : '🌙';
      }
      let newCount = 0;
      const evtSource = new EventSource('/api/events');
      evtSource.addEventListener('nastenska', (e) => {
        const d = JSON.parse(e.data);
        newCount++;
        const badge = document.getElementById('notifBadge');
        badge.textContent = newCount;
        badge.classList.add('visible');
        showToast('📢 ' + d.title + ' — ' + d.uzivatel);
      });
      evtSource.addEventListener('skladUpdate', (e) => {
        const d = JSON.parse(e.data);
        const label = d.sekce === 'zbrane' ? '🔫' : d.sekce === 'weed' ? '🌿' : '💊';
        showToast(label + ' ' + (d.polozka || d.odruda || d.droga) + ' — ' + d.uzivatel);
      });
      evtSource.addEventListener('ucetUpdate', (e) => {
        const d = JSON.parse(e.data);
        showToast('💱 ' + d.typ + ' — ' + (d.valuta === 'USD' ? '$' : '₱') + d.castka);
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
    </script>
  `;
}

// ── RENDER DASHBOARD ──────────────────────────────────────────────────────────
function renderDashboard(req, data) {
  const { zbrane, weed, drogy, ucet, recentUcet } = data;
  const icName = req.session.icName;

  const formatSklad = (obj, ceny) => {
    const entries = Object.entries(obj).filter(([,q]) => q > 0);
    if (!entries.length) return '<p style="color:var(--text-muted);font-size:0.8rem">Sklad je prázdný</p>';
    return entries.map(([item, qty]) => {
      const hodnota = ceny && ceny[item] ? qty * ceny[item].prodej : null;
      return `<div class="sklad-row"><span>${item}</span><span>${qty} ks${hodnota ? ` <em>$${hodnota}</em>` : ''}</span></div>`;
    }).join('');
  };

  const formatUcet = (rows) => {
    if (!rows.length) return '<p style="color:var(--text-muted);font-size:0.8rem">Žádné záznamy</p>';
    return rows.map(r => {
      const [cas, typ, castka, valuta, pozn] = r;
      const icon = typ === 'PŘÍJEM' ? '💚' : '🔴';
      const symbol = valuta === 'USD' ? '$' : '₱';
      return `<div class="sklad-row"><span>${icon} ${pozn||'—'}</span><span>${symbol}${castka} <em>${valuta}</em></span></div>`;
    }).join('');
  };

  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Dashboard</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'dashboard')}
  <main>
    <div style="margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border-gold);position:relative">
      <div style="font-size:0.58rem;letter-spacing:0.5em;text-transform:uppercase;color:var(--gold);margin-bottom:0.6rem;opacity:0.8">Albion — Systém</div>
      <h2 style="font-family:'Cinzel',serif;font-size:1.5rem;font-weight:400">Vítej, ${icName}</h2>
      <p style="font-family:'Cormorant Garamond',serif;font-style:italic;color:var(--text-muted);margin-top:0.3rem;font-size:1rem">Přehled skladu a účetnictví organizace</p>
    </div>
    <div class="stats">
      <div class="stat"><div class="stat-label">Zůstatek USD</div><div class="stat-value">$${ucet.usd.toLocaleString('cs-CZ')}</div><div class="stat-sub">Americké dolary</div></div>
      <div class="stat"><div class="stat-label">Zůstatek Pesos</div><div class="stat-value">₱${ucet.pesos.toLocaleString('cs-CZ')}</div><div class="stat-sub">Mexické peso</div></div>
      <div class="stat"><div class="stat-label">Položky Weed</div><div class="stat-value">${Object.values(weed).filter(q=>q>0).reduce((a,b)=>a+b,0)}</div><div class="stat-sub">Kusů celkem</div></div>
      <div class="stat"><div class="stat-label">Položky Drogy</div><div class="stat-value">${Object.values(drogy).filter(q=>q>0).reduce((a,b)=>a+b,0)}</div><div class="stat-sub">Kusů celkem</div></div>
    </div>
    <div class="grid">
      <div class="card">
        <div class="card-header"><span class="card-title">🔫 Zbraně & Střelivo</span><span class="card-badge">Sklad</span></div>
        ${formatSklad(zbrane, null)}
        <div class="form-section">
          <div class="typ-toggle">
            <button class="typ-btn active-vklad" onclick="setTyp('zbrane','VKLAD',this)">➕ Uložit</button>
            <button class="typ-btn" onclick="setTyp('zbrane','VÝBĚR',this)">➖ Vybrat</button>
          </div>
          <input type="hidden" id="zbrane-typ" value="VKLAD">
          <div class="form-row">
            <div class="form-group"><label>Kategorie</label><select id="zbrane-kat" onchange="updateZbraneItems()"><option value="Zbraň">Zbraně</option><option value="Střelivo">Střelivo</option><option value="Akce">Akce</option></select></div>
            <div class="form-group"><label>Položka</label><select id="zbrane-polozka"></select></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Množství</label><input type="number" id="zbrane-mnozstvi" min="1" value="1"></div>
            <div class="form-group" id="zbrane-ucel-wrap" style="display:none"><label>Účel výběru</label><input type="text" id="zbrane-ucel" placeholder="Mise, ochrana..."></div>
          </div>
          <button class="btn-submit" onclick="submitZbrane()">Potvrdit</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">🌿 Weed</span><span class="card-badge">Sklad</span></div>
        ${formatSklad(weed, {"Žlutý kanabis":{prodej:150},"Zelený kanabis":{prodej:150},"Kanabis":{prodej:150},"Červený kanabis":{prodej:150},"Modrý kanabis":{prodej:150}})}
        <div class="form-section">
          <div class="typ-toggle">
            <button class="typ-btn active-vklad" onclick="setTyp('weed','VKLAD',this)">➕ Uložit</button>
            <button class="typ-btn" onclick="setTyp('weed','VÝBĚR',this)">➖ Vybrat</button>
          </div>
          <input type="hidden" id="weed-typ" value="VKLAD">
          <div class="form-row">
            <div class="form-group"><label>Odrůda</label><select id="weed-odruda"><option>Žlutý kanabis</option><option>Zelený kanabis</option><option>Kanabis</option><option>Červený kanabis</option><option>Modrý kanabis</option></select></div>
            <div class="form-group"><label>Množství</label><input type="number" id="weed-mnozstvi" min="1" value="1"></div>
          </div>
          <div class="info-box" id="weed-info"></div>
          <button class="btn-submit" onclick="submitWeed()">Potvrdit</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">💊 Drogy</span><span class="card-badge">Sklad</span></div>
        ${formatSklad(drogy, null)}
        <div class="form-section">
          <div class="typ-toggle">
            <button class="typ-btn active-vklad" onclick="setTyp('drogy','VKLAD',this)">➕ Uložit</button>
            <button class="typ-btn" onclick="setTyp('drogy','VÝBĚR',this)">➖ Vybrat</button>
          </div>
          <input type="hidden" id="drogy-typ" value="VKLAD">
          <div class="form-row">
            <div class="form-group"><label>Droga</label><select id="drogy-droga"><option>Kapky</option><option>Kokain</option><option>Extáze</option><option>Metamfetamin</option><option>Benzo</option><option>Joyka</option><option>Heroin</option><option>Speed</option><option>LSD</option></select></div>
            <div class="form-group"><label>Množství</label><input type="number" id="drogy-mnozstvi" min="1" value="1"></div>
          </div>
          <button class="btn-submit" onclick="submitDrogy()">Potvrdit</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">💱 Účetnictví</span><span class="card-badge">Finance</span></div>
        ${formatUcet(recentUcet)}
        <div class="form-section">
          <div class="typ-toggle">
            <button class="typ-btn active-vklad" onclick="setTyp('ucet','PŘÍJEM',this)">💚 Příjem</button>
            <button class="typ-btn" onclick="setTyp('ucet','VÝDAJ',this)">🔴 Výdaj</button>
          </div>
          <input type="hidden" id="ucet-typ" value="PŘÍJEM">
          <div class="form-row">
            <div class="form-group"><label>Částka</label><input type="number" id="ucet-castka" min="1" placeholder="1000"></div>
            <div class="form-group"><label>Valuta</label><select id="ucet-valuta"><option value="USD">💵 USD</option><option value="PESOS">💴 Pesos</option></select></div>
          </div>
          <div class="form-group" style="margin-bottom:0.5rem"><label>Poznámka</label><input type="text" id="ucet-poznamka" placeholder="Prodej zboží, plat..."></div>
          <button class="btn-submit" onclick="submitUcet()">Potvrdit transakci</button>
        </div>
      </div>
    </div>
  </main>
  <div class="toast" id="toast"></div>
  <script>
    const ZBRANE=["Pump Shotgun","Pistol MK2","Pistol","Combat Pistol","Double Action Revolver","Navy Revolver","Vintage Pistol","Gusenberg","Dlouhé"];
    const NABOJE=["9mm","9mm Mk2",".75cal",".50cal","12-gauge"];
    const AKCE=["Malá C4","Velká C4","Přístupová karta","Pokročilá zvláštní karta","EMP zařízení","Řezací laser","Cable Cutter","Zvláštní karta"];
    const WEED_CENY={"Žlutý kanabis":{vyroba:100,prodej:150},"Zelený kanabis":{vyroba:100,prodej:150},"Kanabis":{vyroba:100,prodej:150},"Červený kanabis":{vyroba:100,prodej:150},"Modrý kanabis":{vyroba:100,prodej:150}};
    function updateZbraneItems(){
      const kat=document.getElementById('zbrane-kat').value;
      const sel=document.getElementById('zbrane-polozka');
      const items=kat==='Zbraň'?ZBRANE:kat==='Střelivo'?NABOJE:AKCE;
      sel.innerHTML=items.map(i=>'<option>'+i+'</option>').join('');
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
      const r=await post('/api/zbrane',{typ,polozka,mnozstvi,kategorie,ucel});
      if(r.ok){showToast('✅ Záznam uložen');setTimeout(()=>location.reload(),1500);}
      else showToast('❌ '+r.error,true);
    }
    function updateWeedInfo(){
      const odruda=document.getElementById('weed-odruda').value;
      const qty=parseInt(document.getElementById('weed-mnozstvi').value)||1;
      const c=WEED_CENY[odruda];
      if(!c)return;
      const box=document.getElementById('weed-info');
      box.style.display='block';
      box.innerHTML='💸 Výroba: ~$'+(c.vyroba*qty)+' &nbsp;|&nbsp; 💰 Doporučená prodejní: $'+(c.prodej*qty);
    }
    document.getElementById('weed-odruda').addEventListener('change',updateWeedInfo);
    document.getElementById('weed-mnozstvi').addEventListener('input',updateWeedInfo);
    updateWeedInfo();
    async function submitWeed(){
      const typ=document.getElementById('weed-typ').value;
      const odruda=document.getElementById('weed-odruda').value;
      const mnozstvi=document.getElementById('weed-mnozstvi').value;
      const r=await post('/api/weed',{typ,odruda,mnozstvi});
      if(r.ok){showToast('✅ Weed uložen. Výroba: ~$'+r.celkVyroba+' | Prodej: $'+r.celkProdej);setTimeout(()=>location.reload(),2000);}
      else showToast('❌ '+r.error,true);
    }
    async function submitDrogy(){
      const typ=document.getElementById('drogy-typ').value;
      const droga=document.getElementById('drogy-droga').value;
      const mnozstvi=document.getElementById('drogy-mnozstvi').value;
      const r=await post('/api/drogy',{typ,droga,mnozstvi});
      if(r.ok){showToast('✅ Drogy uloženy');setTimeout(()=>location.reload(),1500);}
      else showToast('❌ '+r.error,true);
    }
    async function submitUcet(){
      const typ=document.getElementById('ucet-typ').value;
      const castka=document.getElementById('ucet-castka').value;
      const valuta=document.getElementById('ucet-valuta').value;
      const poznamka=document.getElementById('ucet-poznamka').value;
      if(!castka||!poznamka)return showToast('❌ Vyplň všechna pole',true);
      const r=await post('/api/ucet',{typ,castka,valuta,poznamka});
      if(r.ok){showToast('✅ Transakce zaznamenána');setTimeout(()=>location.reload(),1500);}
      else showToast('❌ '+r.error,true);
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
      <div class="page-label">Organizace Albion</div>
      <div class="page-title">📢 Nástěnka</div>
      <div class="page-sub">Oznámení z Discord kanálu — synchronizováno v reálném čase</div>
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:2rem;align-items:start">
      <div>
        <div id="nastenska-list" class="nastenska-list">
          <div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:2rem">Načítám oznámení...</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">✏️ Nové oznámení</span></div>
        <div class="form-group" style="margin-bottom:0.8rem"><label>Název</label><input type="text" id="ann-title" placeholder="Důležité oznámení..."></div>
        <div class="form-group" style="margin-bottom:1rem"><label>Obsah</label><textarea id="ann-content" placeholder="Napište oznámení... Bude odesláno na Discord i zobrazeno zde." rows="5"></textarea></div>
        <button class="btn-submit" onclick="sendAnnouncement()">📢 Zveřejnit</button>
        <p style="font-size:0.7rem;color:var(--text-muted);margin-top:0.8rem;text-align:center">Oznámení se odešle i do Discord kanálu</p>
      </div>
    </div>
  </main>
  <script>
    const LAST_ID_KEY = 'albion_last_ann_id';
    let lastSeenId = localStorage.getItem(LAST_ID_KEY) || '0';
    let loadedIds = new Set();

    async function loadAnnouncements() {
      const res = await fetch('/api/nastenska');
      const data = await res.json();
      const list = document.getElementById('nastenska-list');
      if (!data.messages || !data.messages.length) {
        list.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:2rem">Žádná oznámení</div>';
        return;
      }
      const newest = data.messages[0]?.id || '0';
      const hasNew = newest > lastSeenId && lastSeenId !== '0';
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
      if (!content.trim()) return showToast('❌ Obsah nemůže být prázdný', true);
      const res = await fetch('/api/nastenska', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,content})});
      const data = await res.json();
      if (data.ok) {
        showToast('✅ Oznámení odesláno na Discord');
        document.getElementById('ann-title').value = '';
        document.getElementById('ann-content').value = '';
        setTimeout(loadAnnouncements, 2000);
      } else showToast('❌ ' + (data.error || 'Chyba'), true);
    }

    // SSE — refresh nástěnky při novém oznámení
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
      <div class="page-label">Organizace Albion</div>
      <div class="page-title">Kodex</div>
      <div class="page-sub">Principy a zásady, které definují každého člena Albionu</div>
    </div>
    <div class="lore-grid">
      <div class="chapters">
        ${articles.map((a, i) => `
        <div class="chapter">
          <div class="chapter-meta">Článek ${a.num}</div>
          <div class="chapter-title">${a.title}</div>
          <div class="chapter-text">${a.text}</div>
        </div>
        ${i < articles.length - 1 ? '' : ''}
        `).join('')}
      </div>
      <div class="sidebar">
        <div class="sidebar-title">Obsah</div>
        ${articles.map(a => `<div class="toc-item"><span class="toc-num">${a.num}</span><span>${a.title}</span></div>`).join('')}
        <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border);font-size:0.72rem;color:var(--text-muted);line-height:1.9;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:0.9rem">
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
      <div class="page-label">Organizace Albion</div>
      <div class="page-title">Audit</div>
      <div class="page-sub">Kompletní záznam všech akcí — posledních 200 záznamů</div>
    </div>

    <div id="ucet-souhrn-wrap" style="display:none;margin-bottom:2rem">
      <div style="font-size:0.6rem;letter-spacing:0.3em;text-transform:uppercase;color:var(--gold);margin-bottom:0.8rem;opacity:0.8">Účetnictví — souhrn per člen</div>
      <div id="ucet-souhrn-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem"></div>
    </div>

    <div class="card">
      <div style="display:flex;gap:0.4rem;margin-bottom:1.5rem;flex-wrap:wrap">
        <button class="typ-btn active-vklad" onclick="filterAudit('vse')" id="filter-vse" style="flex:none;padding:0.4rem 0.9rem">Vše</button>
        <button class="typ-btn" onclick="filterAudit('Zbraně')" id="filter-zbrane" style="flex:none;padding:0.4rem 0.9rem">🔫 Zbraně</button>
        <button class="typ-btn" onclick="filterAudit('Weed')" id="filter-weed" style="flex:none;padding:0.4rem 0.9rem">🌿 Weed</button>
        <button class="typ-btn" onclick="filterAudit('Drogy')" id="filter-drogy" style="flex:none;padding:0.4rem 0.9rem">💊 Drogy</button>
        <button class="typ-btn" onclick="filterAudit('Účetnictví')" id="filter-ucet" style="flex:none;padding:0.4rem 0.9rem">💱 Účetnictví</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Čas</th><th>Sekce</th><th>Typ</th><th>Člen</th><th>Detail</th></tr></thead>
          <tbody id="audit-body"><tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem">Načítám...</td></tr></tbody>
        </table>
      </div>
    </div>
  </main>
  <script>
    let allEvents = [];
    let ucetSouhrn = {};
    let activeFilter = 'vse';

    async function loadAudit() {
      const res = await fetch('/api/audit');
      const data = await res.json();
      allEvents = data.events || [];
      ucetSouhrn = data.ucetSouhrn || {};
      renderTable(allEvents);
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
          <div style="font-family:'Cinzel',serif;font-size:0.85rem;margin-bottom:0.8rem;color:var(--text)">\${uz}</div>
          \${s.prijem_usd || s.vydaj_usd ? \`
          <div style="display:flex;justify-content:space-between;font-size:0.78rem;padding:0.25rem 0">
            <span style="color:var(--text-muted)">USD příjmy / výdaje</span>
            <span><strong style="color:#00CC66">$\${s.prijem_usd.toLocaleString('cs-CZ')}</strong> / <strong style="color:#FF5555">$\${s.vydaj_usd.toLocaleString('cs-CZ')}</strong></span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;padding:0.2rem 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--text-muted)">Net USD</span>
            <strong style="color:\${netUsd>=0?'#00CC66':'#FF5555'}">\${netUsd>=0?'+':''}\$\${netUsd.toLocaleString('cs-CZ')}</strong>
          </div>\` : ''}
          \${s.prijem_pesos || s.vydaj_pesos ? \`
          <div style="display:flex;justify-content:space-between;font-size:0.78rem;padding:0.25rem 0">
            <span style="color:var(--text-muted)">Pesos příjmy / výdaje</span>
            <span><strong style="color:#00CC66">₱\${s.prijem_pesos.toLocaleString('cs-CZ')}</strong> / <strong style="color:#FF5555">₱\${s.vydaj_pesos.toLocaleString('cs-CZ')}</strong></span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;padding:0.2rem 0">
            <span style="color:var(--text-muted)">Net Pesos</span>
            <strong style="color:\${netPesos>=0?'#00CC66':'#FF5555'}">\${netPesos>=0?'+':''}₱\${netPesos.toLocaleString('cs-CZ')}</strong>
          </div>\` : ''}
        </div>\`;
      }).join('');
    }

    function renderTable(events) {
      const body = document.getElementById('audit-body');
      if (!events.length) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem">Žádné záznamy</td></tr>';
        return;
      }
      body.innerHTML = events.map(e => {
        const typClass = (e.typ === 'VKLAD' || e.typ === 'PŘÍJEM') ? 'vklad' : 'vyber';
        return \`<tr>
          <td style="font-size:0.72rem;white-space:nowrap;color:var(--text-muted)">\${e.cas}</td>
          <td style="white-space:nowrap">\${e.icon} \${e.sekce}</td>
          <td><span class="badge \${typClass}">\${e.typ}</span></td>
          <td style="color:var(--text);font-weight:400">\${e.uzivatel}</td>
          <td style="font-size:0.75rem">\${e.detail}</td>
        </tr>\`;
      }).join('');
    }

    function filterAudit(sekce) {
      activeFilter = sekce;
      document.querySelectorAll('[id^="filter-"]').forEach(b => b.className = 'typ-btn');
      const btnId = sekce === 'vse' ? 'filter-vse' : sekce === 'Zbraně' ? 'filter-zbrane' : sekce === 'Weed' ? 'filter-weed' : sekce === 'Drogy' ? 'filter-drogy' : 'filter-ucet';
      document.getElementById(btnId).className = 'typ-btn active-vklad';
      const filtered = sekce === 'vse' ? allEvents : allEvents.filter(e => e.sekce === sekce);
      renderTable(filtered);
      // Souhrn účetnictví zobrazit jen pokud filter je "Účetnictví" nebo "vše"
      document.getElementById('ucet-souhrn-wrap').style.display = (sekce === 'vse' || sekce === 'Účetnictví') ? 'block' : 'none';
    }

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
      <div class="page-label">Organizace Albion</div>
      <div class="page-title">Statistiky členů</div>
      <div class="page-sub">Detailní přehled příspěvků každého člena organizace</div>
    </div>
    <div id="stats-container" class="stats-grid">
      <div style="color:var(--text-muted);font-size:0.85rem">Načítám statistiky...</div>
    </div>
  </main>
  <script>
    function renderItemGroup(obj, labelVklad, labelVyber) {
      const keys = [...new Set([...Object.keys(obj.vklad||{}), ...Object.keys(obj.vyber||{})])];
      if (!keys.length) return '<div style="font-size:0.75rem;color:var(--text-muted);padding:0.2rem 0 0.4rem">— žádné záznamy —</div>';
      return keys.map(k => {
        const v = obj.vklad[k] || 0;
        const b = obj.vyber[k] || 0;
        return \`<div class="stat-row stat-item-group">
          <span style="color:var(--text-dim)">\${k}</span>
          <span style="display:flex;gap:0.6rem">
            \${v ? \`<strong style="color:#00CC66">+\${v}</strong>\` : ''}
            \${b ? \`<strong style="color:#FF5555">-\${b}</strong>\` : ''}
          </span>
        </div>\`;
      }).join('');
    }

    async function loadStats() {
      const res = await fetch('/api/stats');
      const data = await res.json();
      const container = document.getElementById('stats-container');
      const stats = data.stats || {};
      const users = Object.keys(stats);
      if (!users.length) {
        container.innerHTML = '<div style="color:var(--text-muted)">Žádná data</div>';
        return;
      }
      container.innerHTML = users.map(icName => {
        const s = stats[icName];
        const discord = s.discordUsername;

        const hasZbrane = Object.keys({...s.zbrane.vklad,...s.zbrane.vyber}).length > 0;
        const hasNaboje = Object.keys({...s.naboje.vklad,...s.naboje.vyber}).length > 0;
        const hasAkce   = Object.keys({...s.akce.vklad,...s.akce.vyber}).length > 0;
        const hasWeed   = Object.keys({...s.weed.vklad,...s.weed.vyber}).length > 0;
        const hasDrogy  = Object.keys({...s.drogy.vklad,...s.drogy.vyber}).length > 0;
        const hasUcet   = s.ucet.prijem_usd || s.ucet.vydaj_usd || s.ucet.prijem_pesos || s.ucet.vydaj_pesos;

        return \`<div class="stat-card">
          <div class="stat-card-header">
            <div>
              <div class="stat-card-name">👤 \${icName}</div>
              \${discord ? \`<div class="stat-card-discord">Discord: \${discord}</div>\` : ''}
            </div>
          </div>

          \${hasZbrane ? \`<div class="stat-section-label">🔫 Zbraně</div>\${renderItemGroup(s.zbrane,'Vloženo','Vybráno')}\` : ''}
          \${hasNaboje ? \`<div class="stat-section-label">🔴 Střelivo</div>\${renderItemGroup(s.naboje,'','')}\` : ''}
          \${hasAkce   ? \`<div class="stat-section-label">⚡ Akce & Vybavení</div>\${renderItemGroup(s.akce,'','')}\` : ''}
          \${hasWeed   ? \`<div class="stat-section-label">🌿 Weed</div>\${renderItemGroup(s.weed,'','')}\` : ''}
          \${hasDrogy  ? \`<div class="stat-section-label">💊 Drogy</div>\${renderItemGroup(s.drogy,'','')}\` : ''}
          \${hasUcet   ? \`<div class="stat-section-label">💱 Účetnictví</div>
            \${s.ucet.prijem_usd  ? \`<div class="stat-row"><span>Příjmy USD</span><strong style="color:#00CC66">$\${s.ucet.prijem_usd.toLocaleString('cs-CZ')}</strong></div>\` : ''}
            \${s.ucet.vydaj_usd   ? \`<div class="stat-row"><span>Výdaje USD</span><strong style="color:#FF5555">$\${s.ucet.vydaj_usd.toLocaleString('cs-CZ')}</strong></div>\` : ''}
            \${s.ucet.prijem_pesos? \`<div class="stat-row"><span>Příjmy Pesos</span><strong style="color:#00CC66">₱\${s.ucet.prijem_pesos.toLocaleString('cs-CZ')}</strong></div>\` : ''}
            \${s.ucet.vydaj_pesos ? \`<div class="stat-row"><span>Výdaje Pesos</span><strong style="color:#FF5555">₱\${s.ucet.vydaj_pesos.toLocaleString('cs-CZ')}</strong></div>\` : ''}
          \` : ''}

          \${!hasZbrane && !hasNaboje && !hasAkce && !hasWeed && !hasDrogy && !hasUcet
            ? '<div style="font-size:0.78rem;color:var(--text-muted);padding:0.5rem 0">Zatím žádná aktivita</div>'
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
      <div class="page-label">Organizace Albion</div>
      <div class="page-title">Historie & Původ</div>
      <div class="page-sub">Kronika organizace — od počátků po současnost</div>
    </div>
    <div class="lore-grid">
      <div class="chapters">
        <div class="chapter">
          <div class="chapter-meta">Počátky</div>
          <div class="chapter-title">Vznik organizace</div>
          <div class="chapter-text">Albion vznikl krátce po příchodu Christophera Sinclaira do Los Santos. Po přesunu ze Spojeného království se Sinclair snažil začlenit do místního prostředí a navázat kontakty, které by mu umožnily vybudovat vlastní podnikatelské zázemí. Během prvních měsíců ve městě však zjistil, že samotné vzdělání, zkušenosti ani kapitál často nestačí. Los Santos fungovalo na osobních vazbách, vzájemných službách a důvěře mezi jednotlivci, kteří byli schopni táhnout za jeden provaz.

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
        <div class="toc-item"><span class="toc-num">—</span><span>Počátky · Vznik organizace</span></div>
        <div class="toc-item"><span class="toc-num">01</span><span>Formování organizace</span></div>
        <div class="toc-item"><span class="toc-num">02</span><span>Působení v Los Santos</span></div>
        <div class="toc-item"><span class="toc-num">03</span><span>Současnost</span></div>
        <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border);font-family:'Cormorant Garamond',serif;font-style:italic;font-size:0.95rem;color:var(--text-muted);line-height:1.85">
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
      rights: ['Absolutní rozhodovací pravomoc','Jmenování a odvolávání členů','Schvalování významných projektů','Správa financí a majetku organizace'],
    },
    {
      rank: 'Council', num: '02', member: 'Monica Williams', isFounder: false,
      desc: 'Nejužší vedení organizace. Tvoří jej lidé, kteří si získali nejvyšší důvěru zakladatele. Podílejí se na vedení organizace, rozhodování o důležitých záležitostech a koordinaci jednotlivých aktivit. Počet míst je omezený.',
      rights: ['Přístup k interním informacím','Účast na strategických rozhodnutích','Návrhy na přijetí nových členů','Dohled nad chodem organizace'],
    },
    {
      rank: 'Senior Member', num: '03', member: 'Henry Williams', isFounder: false,
      desc: 'Zkušení a prověření členové. Jedná se o dlouhodobé členy Albionu, kteří již prokázali svou loajalitu a schopnosti. Často zastupují organizaci při obchodních jednáních a podílejí se na rozvoji projektů.',
      rights: ['Přístup k většině interních informací','Možnost doporučovat nové členy','Vedení menších projektů','Reprezentace organizace'],
    },
    {
      rank: 'Member', num: '04', member: null, isFounder: false,
      desc: 'Plnohodnotný člen Albionu. Člověk, který prošel zkušebním obdobím a stal se oficiální součástí organizace. Od člena se očekává aktivita, reprezentace organizace a dodržování kodexu.',
      rights: ['Přístup do interních prostor organizace','Účast na schůzkách','Zapojení do projektů a aktivit'],
    },
    {
      rank: 'Associate', num: '05', member: null, isFounder: false,
      desc: 'Kandidát na členství. Osoba, která s Albionem spolupracuje a buduje si důvěru organizace. Associate ještě není považován za plnohodnotného člena a nemá přístup ke všem informacím. Tato hodnost slouží jako zkušební období.',
      rights: ['Omezený přístup k organizaci','Účast na vybraných aktivitách','Možnost získat plné členství'],
    },
  ];
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Hierarchie</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'hierarchy')}
  <main>
    <div class="page-header">
      <div class="page-label">Organizace Albion</div>
      <div class="page-title">Hierarchie</div>
      <div class="page-sub">Struktura a řád organizace Albion</div>
    </div>
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

// ── RENDER AUTH ───────────────────────────────────────────────────────────────
function renderAuth(page, error, data) {
  const errors = {
    no_code: 'Discord autorizace selhala.',
    not_on_server: 'Nejsi členem Discord serveru Albion.',
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
  const errMsg = error && errors[error] ? `<div class="alert">${errors[error]}</div>` : '';
  const successMsg = page === 'login' && data === undefined && error === undefined ? '' :
    (page === 'login' && typeof error === 'undefined' ? '' : '');
  const successReg = page === 'login' ? `<script>if(location.search.includes('success=registered')){const a=document.createElement('div');a.className='alert success';a.textContent='Registrace proběhla. Přihlaš se.';document.querySelector('.box').prepend(a);}<\/script>` : '';

  const style = `
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Montserrat:wght@300;400&display=swap" rel="stylesheet">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{background:#0A0A0A;color:#F5F3EF;font-family:'Montserrat',sans-serif;font-weight:300;min-height:100vh;display:flex;align-items:center;justify-content:center}
      .box{width:100%;max-width:400px;padding:3rem 2.5rem;background:#111;border:1px solid rgba(192,192,192,0.08)}
      .logo{text-align:center;margin-bottom:2.5rem}
      .logo h1{font-family:'Cinzel',serif;font-size:2rem;letter-spacing:0.4em}
      .logo p{font-size:0.7rem;letter-spacing:0.2em;text-transform:uppercase;color:#666;margin-top:0.5rem}
      .btn{display:block;width:100%;padding:0.9rem;background:#8B1A1A;color:#F5F3EF;border:none;font-family:'Montserrat',sans-serif;font-size:0.75rem;letter-spacing:0.2em;text-transform:uppercase;cursor:pointer;text-decoration:none;text-align:center;margin-top:1rem;transition:background 0.2s}
      .btn:hover{background:#B22222}
      .btn.secondary{background:transparent;border:1px solid rgba(192,192,192,0.2);color:#888}
      .btn.secondary:hover{color:#F5F3EF;border-color:rgba(192,192,192,0.4)}
      input{display:block;width:100%;padding:0.8rem 1rem;background:#1A1A1A;border:1px solid rgba(192,192,192,0.1);color:#F5F3EF;font-family:'Montserrat',sans-serif;font-size:0.85rem;margin-bottom:1rem;outline:none;transition:border-color 0.2s}
      input:focus{border-color:#8B1A1A}
      label{display:block;font-size:0.65rem;letter-spacing:0.2em;text-transform:uppercase;color:#888;margin-bottom:0.4rem}
      .alert{padding:0.8rem 1rem;background:rgba(139,26,26,0.2);border-left:3px solid #8B1A1A;font-size:0.8rem;margin-bottom:1.5rem}
      .alert.success{background:rgba(0,255,136,0.1);border-left-color:#00FF88;color:#00FF88}
      .divider{text-align:center;font-size:0.65rem;letter-spacing:0.2em;text-transform:uppercase;color:#444;margin:1.5rem 0}
      .sep{height:1px;background:rgba(192,192,192,0.06);margin:1.5rem 0}
    </style>
  `;

  if (page === 'login') return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Albion — Přihlášení</title>${style}</head><body><div class="box"><div class="logo"><h1>ALBION</h1><p>Přihlášení do systému</p></div>${errMsg}<a href="/auth/discord?action=login" class="btn">🔐 Přihlásit se přes Discord</a><div class="divider">nebo</div><a href="/register" class="btn secondary">Nemáš účet? Zaregistruj se</a></div>${successReg}</body></html>`;
  if (page === 'register') return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Albion — Registrace</title>${style}</head><body><div class="box"><div class="logo"><h1>ALBION</h1><p>Registrace nového člena</p></div>${errMsg}<p style="font-size:0.8rem;color:#888;line-height:1.7;margin-bottom:1.5rem">Pro registraci musíš být členem Discord serveru Albion.</p><a href="/auth/discord?action=register" class="btn">🔗 Pokračovat přes Discord</a><div class="sep"></div><a href="/login" class="btn secondary">Zpět na přihlášení</a></div></body></html>`;
  if (page === 'register_complete') return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Albion — Dokončení registrace</title>${style}</head><body><div class="box"><div class="logo"><h1>ALBION</h1><p>Dokončení registrace</p></div>${errMsg}<p style="font-size:0.8rem;color:#888;margin-bottom:1.5rem">Discord: <strong style="color:#F5F3EF">${data?.username||''}</strong></p><form method="POST" action="/register/complete"><label>Tvoje IC jméno (ve hře)</label><input type="text" name="ic_name" placeholder="Christopher Sinclair" required><label>Heslo</label><input type="password" name="password" placeholder="Alespoň 6 znaků" required><label>Heslo znovu</label><input type="password" name="password2" placeholder="Zopakuj heslo" required><button type="submit" class="btn">✅ Dokončit registraci</button></form></div></body></html>`;
  if (page === 'login_password') return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Albion — Heslo</title>${style}</head><body><div class="box"><div class="logo"><h1>ALBION</h1><p>Zadej heslo</p></div>${errMsg}<p style="font-size:0.8rem;color:#888;margin-bottom:1.5rem">Discord: <strong style="color:#F5F3EF">${data?.username||''}</strong></p><form method="POST" action="/login/password"><label>Heslo</label><input type="password" name="password" placeholder="Tvoje heslo" required autofocus><button type="submit" class="btn">🔓 Přihlásit se</button></form></div></body></html>`;
  return '<h1>404</h1>';
}

// ── RENDER SÁZENÍ ─────────────────────────────────────────────────────────────
function renderSazeni(req) {
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Sázení trávy</title>
  ${baseStyles()}
  <style>
    /* ── SÁZENÍ EXTRA STYLES ── */
    .sazeni-hero{background:linear-gradient(135deg,rgba(0,60,20,0.18),rgba(0,30,10,0.08));border:1px solid rgba(0,200,80,0.12);padding:2rem;margin-bottom:2rem;position:relative;overflow:hidden}
    .sazeni-hero::before{content:'🌱';position:absolute;right:2rem;top:50%;transform:translateY(-50%);font-size:5rem;opacity:0.08;pointer-events:none}
    .cost-table{width:100%;border-collapse:collapse;margin:1rem 0}
    .cost-table th{font-size:0.57rem;letter-spacing:0.22em;text-transform:uppercase;color:var(--silver-bright);padding:0.75rem 1rem;text-align:left;border-bottom:1px solid var(--border-silver)}
    .cost-table td{padding:0.7rem 1rem;border-bottom:1px solid var(--border);color:var(--text-dim);font-size:0.82rem}
    .cost-table tr:last-child td{border-bottom:none;font-weight:500;color:var(--text)}
    .cost-table .total-row td{border-top:2px solid rgba(0,200,80,0.25);color:var(--text);font-family:'Cinzel',serif}
    .cost-table .item-icon{margin-right:0.4rem}
    .cost-amount{color:var(--gold);font-weight:500}
    .cost-multi{color:var(--text-muted);font-size:0.75rem;margin-left:0.3rem}

    /* ── KALKULAČKA CARD ── */
    .kalk-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-top:1.5rem}
    .kalk-block{background:var(--bg-mid);border:1px solid var(--border-hover);padding:1.5rem;position:relative}
    .kalk-block-label{font-size:0.58rem;letter-spacing:0.3em;text-transform:uppercase;color:var(--silver);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem}
    .kalk-block-label::before{content:'';display:inline-block;width:3px;height:14px;background:var(--crimson-light)}
    .kalk-input-wrap{display:flex;align-items:center;gap:0.5rem}
    .kalk-input{background:var(--input-bg);border:1px solid var(--border-hover);color:var(--text);padding:0.9rem 1rem;font-family:'Cinzel',serif;font-size:1.4rem;width:100%;outline:none;transition:border-color 0.2s,box-shadow 0.2s;text-align:center}
    .kalk-input:focus{border-color:rgba(0,200,80,0.4);box-shadow:0 0 0 2px rgba(0,200,80,0.08)}
    .kalk-unit{font-size:0.65rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--text-muted);white-space:nowrap}
    .kalk-result{margin-top:1rem;padding:1rem;background:rgba(0,200,80,0.06);border:1px solid rgba(0,200,80,0.15);text-align:center}
    .kalk-result-num{font-family:'Cinzel',serif;font-size:2rem;color:#00C853;line-height:1.1}
    .kalk-result-label{font-size:0.6rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--text-muted);margin-top:0.3rem}
    .kalk-arrow{text-align:center;font-size:1.5rem;display:flex;align-items:center;justify-content:center;color:var(--text-muted);opacity:0.4}
    .breakdown-row{display:flex;justify-content:space-between;padding:0.4rem 0;font-size:0.8rem;color:var(--text-dim);border-bottom:1px solid var(--border)}
    .breakdown-row:last-child{border-bottom:none;color:var(--text);font-weight:500;padding-top:0.7rem;margin-top:0.3rem}
    .breakdown-row .green{color:#00C853}
    .bd-label{display:flex;align-items:center;gap:0.4rem}

    /* ── SLIDER ── */
    .slider-wrap{margin:1.5rem 0}
    .slider{-webkit-appearance:none;width:100%;height:4px;background:linear-gradient(90deg,rgba(0,200,80,0.5) var(--pct,50%),var(--border-hover) var(--pct,50%));outline:none;border-radius:2px}
    .slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--crimson-light);cursor:pointer;border:2px solid var(--bg);box-shadow:0 0 6px rgba(0,200,80,0.3)}
    .slider-labels{display:flex;justify-content:space-between;font-size:0.6rem;color:var(--text-muted);letter-spacing:0.1em;margin-top:0.4rem}

    /* ── PROFIT INDICATOR ── */
    .profit-bar{height:6px;background:var(--border);margin-top:1rem;position:relative;overflow:hidden}
    .profit-fill{height:100%;background:linear-gradient(90deg,rgba(0,200,80,0.6),#00C853);transition:width 0.4s}

    @media(max-width:768px){.kalk-grid{grid-template-columns:1fr}.kalk-arrow{transform:rotate(90deg)}}
  </style>
  </head><body>
  ${renderNav(req, 'sazeni')}
  <main>
    <div class="page-header">
      <div class="page-label">Albion — Produkce</div>
      <div class="page-title">Sázení trávy</div>
      <div class="page-sub">Kalkulačka nákladů na pěstování cannabisu</div>
    </div>

    <!-- HERO INFO -->
    <div class="sazeni-hero">
      <div style="font-size:0.58rem;letter-spacing:0.35em;text-transform:uppercase;color:rgba(0,200,80,0.7);margin-bottom:0.5rem">Informace o produkci</div>
      <div style="font-family:'Cinzel',serif;font-size:1.1rem;margin-bottom:0.5rem">Náklady na jednu kytku</div>
      <div style="font-size:0.82rem;color:var(--text-dim);line-height:1.8">
        Níže vidíš přesný rozpis všeho, co potřebuješ na vypěstování jedné rostliny trávy. Kalkulačka ti pomůže spočítat náklady na libovolný počet kytek nebo zjistit, kolik jich zvládneš za daný rozpočet.
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">

      <!-- COST BREAKDOWN -->
      <div class="card">
        <div class="card-header"><span class="card-title">📋 Rozpis nákladů / 1 kytka</span><span class="card-badge">Fixní ceny</span></div>
        <table class="cost-table">
          <thead><tr><th>Položka</th><th>Množství</th><th>Cena / ks</th><th>Celkem</th></tr></thead>
          <tbody>
            <tr><td><span class="item-icon">💧</span>Konev s vodou</td><td>1×</td><td class="cost-amount">$20</td><td class="cost-amount">$20</td></tr>
            <tr><td><span class="item-icon">🌱</span>Semínko</td><td>1×</td><td class="cost-amount">$50</td><td class="cost-amount">$50</td></tr>
            <tr><td><span class="item-icon">🧪</span>Hnojivo</td><td>1×</td><td class="cost-amount">$25</td><td class="cost-amount">$25</td></tr>
            <tr><td><span class="item-icon">💊</span>Kvalitní hnojivo</td><td>4×</td><td class="cost-amount">$50</td><td class="cost-amount">$200</td></tr>
            <tr><td><span class="item-icon">🫙</span>Výživná voda</td><td>4×</td><td class="cost-amount">$40</td><td class="cost-amount">$160</td></tr>
            <tr class="total-row"><td colspan="3" style="font-size:0.75rem;letter-spacing:0.15em">CELKEM NA KYTKU</td><td class="cost-amount" style="font-size:1.1rem">$455</td></tr>
          </tbody>
        </table>
        <div style="margin-top:1rem;padding:0.8rem 1rem;background:rgba(201,168,76,0.06);border:1px solid var(--border-gold);font-size:0.78rem;color:var(--text-muted)">
          💡 Cena <strong style="color:var(--gold)">$455</strong> je náklad na <strong style="color:var(--text)">jednu rostlinu</strong>. Při prodeji za $150/ks je zisk <strong style="color:#00C853">−$305</strong> (ztráta bez započtení finálního prodeje celé sklizně).
        </div>
      </div>

      <!-- RYCHLÁ KALKULAČKA -->
      <div class="card">
        <div class="card-header"><span class="card-title">🧮 Rychlá kalkulačka</span><span class="card-badge">Interaktivní</span></div>
        <div class="kalk-grid">
          <div class="kalk-block">
            <div class="kalk-block-label">Počet kytek</div>
            <input type="number" class="kalk-input" id="inputKytky" min="1" max="9999" value="10" oninput="calcFromKytky(this.value)">
            <div class="kalk-result" id="resultCena">
              <div class="kalk-result-num" id="outCena">$4,550</div>
              <div class="kalk-result-label">celkový náklad</div>
            </div>
          </div>
          <div class="kalk-arrow">⇄</div>
          <div class="kalk-block">
            <div class="kalk-block-label">Dostupný budget</div>
            <input type="number" class="kalk-input" id="inputBudget" min="0" value="4550" oninput="calcFromBudget(this.value)" style="border-color:rgba(0,200,80,0.2)">
            <div class="kalk-result" id="resultKytky" style="background:rgba(0,200,80,0.06);border-color:rgba(0,200,80,0.2)">
              <div class="kalk-result-num" id="outKytky" style="color:#00C853">10</div>
              <div class="kalk-result-label">kytek lze zasadit</div>
            </div>
          </div>
        </div>
        <div class="slider-wrap">
          <input type="range" class="slider" id="kytkySlider" min="1" max="200" value="10" oninput="sliderChange(this.value)" style="--pct:4.5%">
          <div class="slider-labels"><span>1 kytka</span><span>50</span><span>100</span><span>150</span><span>200 kytek</span></div>
        </div>
      </div>
    </div>

    <!-- DETAILNÍ ROZPAD -->
    <div class="card" style="margin-top:1.5rem">
      <div class="card-header"><span class="card-title">📊 Detailní rozpad nákladů</span><span class="card-badge" id="bdKytkyLabel">10 kytek</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem">
        <div>
          <div style="font-size:0.6rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--silver);margin-bottom:0.8rem">Položky celkem</div>
          <div class="breakdown-row"><div class="bd-label">💧 Konev s vodou <span style="color:var(--text-muted);margin-left:0.3rem" id="bd-konev-qty">(10×)</span></div><div class="green" id="bd-konev">$200</div></div>
          <div class="breakdown-row"><div class="bd-label">🌱 Semínko <span style="color:var(--text-muted);margin-left:0.3rem" id="bd-seminko-qty">(10×)</span></div><div class="green" id="bd-seminko">$500</div></div>
          <div class="breakdown-row"><div class="bd-label">🧪 Hnojivo <span style="color:var(--text-muted);margin-left:0.3rem" id="bd-hnojivo-qty">(10×)</span></div><div class="green" id="bd-hnojivo">$250</div></div>
          <div class="breakdown-row"><div class="bd-label">💊 Kvalitní hnojivo <span style="color:var(--text-muted);margin-left:0.3rem" id="bd-khnojivo-qty">(40×)</span></div><div class="green" id="bd-khnojivo">$2,000</div></div>
          <div class="breakdown-row"><div class="bd-label">🫙 Výživná voda <span style="color:var(--text-muted);margin-left:0.3rem" id="bd-voda-qty">(40×)</span></div><div class="green" id="bd-voda">$1,600</div></div>
          <div class="breakdown-row"><div class="bd-label" style="font-family:'Cinzel',serif">CELKEM</div><div style="font-family:'Cinzel',serif;color:var(--gold)" id="bd-total">$4,550</div></div>
        </div>
        <div>
          <div style="font-size:0.6rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--silver);margin-bottom:0.8rem">Přehled investice</div>
          <div class="breakdown-row"><div class="bd-label">💰 Celkový náklad</div><div style="color:var(--gold)" id="ov-naklad">$4,550</div></div>
          <div class="breakdown-row"><div class="bd-label">🌿 Počet kytek</div><div id="ov-kytky">10</div></div>
          <div class="breakdown-row"><div class="bd-label">📦 Náklad / kytka</div><div>$455</div></div>
          <div style="margin-top:1.2rem;padding-top:1rem;border-top:1px solid var(--border-silver)">
            <div style="font-size:0.6rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--silver);margin-bottom:0.6rem">Investice na položku</div>
            <div class="profit-bar"><div class="profit-fill" id="profitFill" style="width:50%"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--text-muted);margin-top:0.4rem">
              <span>Největší náklad: <strong style="color:var(--text)" id="biggestItem">Kvalitní hnojivo (44%)</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>

  </main>
  <script>
    const COST_PER = 455;
    const ITEMS = [
      { id:'konev',   label:'Konev s vodou',   qty:1, unit:20 },
      { id:'seminko', label:'Semínko',          qty:1, unit:50 },
      { id:'hnojivo', label:'Hnojivo',          qty:1, unit:25 },
      { id:'khnojivo',label:'Kvalitní hnojivo', qty:4, unit:50 },
      { id:'voda',    label:'Výživná voda',     qty:4, unit:40 },
    ];

    function fmt(n) { return '$' + Math.round(n).toLocaleString('cs-CZ'); }

    function updateAll(kytky) {
      kytky = Math.max(1, Math.floor(kytky));
      const total = kytky * COST_PER;

      // rychlá kalk
      document.getElementById('outCena').textContent = fmt(total);
      document.getElementById('outKytky').textContent = kytky.toLocaleString('cs-CZ');

      // breakdown
      document.getElementById('bdKytkyLabel').textContent = kytky + ' kytek';
      ITEMS.forEach(it => {
        const totalQty = it.qty * kytky;
        const totalCost = totalQty * it.unit;
        document.getElementById('bd-' + it.id).textContent = fmt(totalCost);
        document.getElementById('bd-' + it.id + '-qty').textContent = '(' + totalQty + '×)';
      });
      document.getElementById('bd-total').textContent = fmt(total);
      document.getElementById('ov-naklad').textContent = fmt(total);
      document.getElementById('ov-kytky').textContent = kytky.toLocaleString('cs-CZ');

      // slider
      const slider = document.getElementById('kytkySlider');
      const clampedSlider = Math.min(kytky, 200);
      slider.value = clampedSlider;
      const pct = ((clampedSlider - 1) / 199 * 100).toFixed(1);
      slider.style.setProperty('--pct', pct + '%');

      // profit bar (biggest = khnojivo = 200/455 = 44%)
      document.getElementById('profitFill').style.width = '44%';
    }

    function calcFromKytky(v) {
      const k = parseInt(v) || 1;
      const budget = k * COST_PER;
      document.getElementById('inputBudget').value = budget;
      updateAll(k);
    }

    function calcFromBudget(v) {
      const b = parseFloat(v) || 0;
      const k = Math.floor(b / COST_PER);
      document.getElementById('inputKytky').value = Math.max(1, k);
      updateAll(Math.max(1, k));
    }

    function sliderChange(v) {
      document.getElementById('inputKytky').value = v;
      calcFromKytky(v);
    }

    // init
    updateAll(10);
  </script>
  </body></html>`;
}

app.listen(PORT, () => console.log(`🌐 Albion web běží na http://localhost:${PORT}`));
