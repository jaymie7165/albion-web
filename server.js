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
    <link rel="icon" type="image/png" href="/logo.png">
    <link rel="apple-touch-icon" href="/logo.png">
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}

      :root{
        --crimson:#8B1A1A;
        --crimson-light:#C0282D;
        --crimson-glow:rgba(192,40,45,0.15);
        --crimson-bright:#E03030;
        --silver:#B0B0C0;
        --silver-bright:#E0E0EC;
        --silver-dim:rgba(200,200,220,0.08);
        --bg:#060608;
        --bg-soft:#0A0A0E;
        --bg-mid:#0E0E16;
        --bg-card:#0C0C14;
        --bg-card2:#111118;
        --bg-card3:#141420;
        --text:#F0F0FA;
        --text-dim:#B8B8D0;
        --text-muted:#555568;
        --text-label:#666678;
        --border:rgba(255,255,255,0.06);
        --border-hover:rgba(255,255,255,0.12);
        --border-silver:rgba(200,200,230,0.16);
        --border-gold:rgba(201,168,76,0.18);
        --gold:#C9A84C;
        --gold-dim:rgba(201,168,76,0.09);
        --input-bg:#0E0E16;
        --shadow:0 8px 40px rgba(0,0,0,0.85);
        --shadow-card:0 2px 24px rgba(0,0,0,0.65);
        --red-glow:0 0 32px rgba(192,40,45,0.22);
        --nav-h:64px;
      }
      body.light{
        --bg:#F2F0F7;
        --bg-soft:#EAE8F2;
        --bg-mid:#E2DFEE;
        --bg-card:#FAFAFF;
        --bg-card2:#F4F2FC;
        --bg-card3:#EDEAF7;
        --silver:#5A5878;
        --silver-bright:#2A2850;
        --silver-dim:rgba(60,55,100,0.07);
        --text:#0E0C1E;
        --text-dim:#282545;
        --text-muted:#7A7898;
        --text-label:#5A5878;
        --border:rgba(60,50,100,0.09);
        --border-hover:rgba(60,50,100,0.18);
        --border-silver:rgba(80,70,130,0.18);
        --border-gold:rgba(160,120,40,0.22);
        --gold:#A07828;
        --gold-dim:rgba(160,120,40,0.08);
        --input-bg:#E8E5F2;
        --shadow:0 4px 24px rgba(30,20,70,0.12);
        --shadow-card:0 2px 14px rgba(30,20,70,0.08);
        --red-glow:0 0 28px rgba(192,40,45,0.14);
        --crimson-glow:rgba(192,40,45,0.10);
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
        animation:pageFadeIn 0.4s cubic-bezier(0.22,1,0.36,1);
        position:relative;
      }

      /* ── AMBIENT BACKGROUND ── */
      body::before{
        content:'';
        position:fixed;inset:0;
        background:
          radial-gradient(ellipse 70% 45% at 15% 15%, rgba(192,40,45,0.055) 0%, transparent 65%),
          radial-gradient(ellipse 55% 35% at 85% 80%, rgba(130,25,30,0.04) 0%, transparent 60%);
        pointer-events:none;z-index:0;
      }
      body.light::before{
        background:
          radial-gradient(ellipse 70% 45% at 15% 15%, rgba(192,40,45,0.06) 0%, transparent 65%),
          radial-gradient(ellipse 55% 35% at 85% 80%, rgba(140,100,200,0.04) 0%, transparent 60%);
      }

      @keyframes pageFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

      /* ── SCROLLBAR ── */
      ::-webkit-scrollbar{width:5px;height:5px}
      ::-webkit-scrollbar-track{background:var(--bg-soft)}
      ::-webkit-scrollbar-thumb{background:rgba(192,40,45,0.45);border-radius:3px}
      ::-webkit-scrollbar-thumb:hover{background:rgba(192,40,45,0.72)}

      /* ── NAV ── */
      nav{
        background:rgba(6,6,8,0.93);
        border-bottom:1px solid rgba(192,40,45,0.18);
        padding:0 2rem;
        display:flex;
        align-items:center;
        justify-content:space-between;
        position:sticky;
        top:0;
        z-index:200;
        height:var(--nav-h);
        backdrop-filter:blur(28px) saturate(180%);
        -webkit-backdrop-filter:blur(28px) saturate(180%);
        transition:background 0.4s;
      }
      nav::after{
        content:'';
        position:absolute;
        bottom:0;left:0;right:0;
        height:1px;
        background:linear-gradient(90deg,transparent,var(--crimson-light) 25%,var(--crimson-light) 75%,transparent);
        opacity:0.38;
        pointer-events:none;
      }
      body.light nav{
        background:rgba(242,240,247,0.95);
        border-bottom-color:rgba(192,40,45,0.22);
        box-shadow:0 1px 20px rgba(30,20,70,0.08);
      }

      .nav-logo{
        font-family:'Cinzel',serif;
        letter-spacing:0.38em;
        font-size:1.1rem;
        text-decoration:none;
        color:var(--text);
        display:flex;
        align-items:center;
        gap:0.85rem;
        flex-shrink:0;
        transition:opacity 0.2s;
      }
      .nav-logo:hover{opacity:0.8}
      .nav-logo-img{
        width:32px;height:32px;
        object-fit:contain;
        filter:drop-shadow(0 0 10px rgba(192,40,45,0.6));
        transition:filter 0.3s,transform 0.3s;
      }
      .nav-logo:hover .nav-logo-img{
        filter:drop-shadow(0 0 18px rgba(192,40,45,0.95));
        transform:scale(1.05);
      }
      .nav-logo-text .b-red{
        color:var(--crimson-light);
        text-shadow:0 0 18px rgba(192,40,45,0.55);
      }

      .nav-menu{display:flex;gap:0;list-style:none;height:100%}
      .nav-menu li{height:100%}
      .nav-menu a{
        display:flex;align-items:center;flex-direction:column;justify-content:center;
        padding:0 1.1rem;
        height:100%;
        font-size:0.68rem;
        letter-spacing:0.16em;
        text-transform:uppercase;
        font-weight:500;
        color:var(--text-muted);
        text-decoration:none;
        border-bottom:2px solid transparent;
        transition:color 0.2s,border-color 0.2s,background 0.2s;
        white-space:nowrap;
        position:relative;
        gap:0.2rem;
      }
      .nav-menu a::before{
        content:'';
        position:absolute;
        inset:0;
        background:var(--crimson-glow);
        opacity:0;
        transition:opacity 0.2s;
      }
      .nav-menu a:hover{color:var(--silver-bright)}
      .nav-menu a:hover::before{opacity:0.55}
      .nav-menu a.active{
        color:var(--text);
        border-bottom-color:var(--crimson-light);
        background:rgba(192,40,45,0.07);
      }
      body.light .nav-menu a.active{color:var(--text)}
      .nav-menu a .nav-desc{
        font-size:0.52rem;letter-spacing:0.07em;
        color:var(--text-muted);opacity:0.7;
        font-weight:300;line-height:1;
      }

      .nav-right{display:flex;align-items:center;gap:0.75rem;flex-shrink:0}
      .nav-user{font-size:0.72rem;color:var(--text-muted);letter-spacing:0.05em;white-space:nowrap}
      .nav-user strong{color:var(--silver-bright);font-weight:500}
      .nav-logout{
        font-size:0.62rem;letter-spacing:0.16em;text-transform:uppercase;font-weight:500;
        color:var(--crimson-light);text-decoration:none;
        padding:0.38rem 0.9rem;
        border:1px solid rgba(192,40,45,0.28);
        transition:all 0.2s;
      }
      .nav-logout:hover{background:var(--crimson-glow);border-color:var(--crimson-light)}
      .theme-toggle{
        background:none;border:1px solid var(--border-hover);
        color:var(--text-muted);width:32px;height:32px;cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        transition:all 0.2s;
      }
      .theme-toggle svg{width:15px;height:15px;transition:transform 0.3s}
      .theme-toggle:hover{border-color:var(--silver);color:var(--silver)}
      .theme-toggle:hover svg{transform:rotate(20deg)}
      .notif-bell{
        position:relative;cursor:pointer;background:none;border:none;
        color:var(--text-muted);padding:0.3rem;transition:color 0.2s;
        display:flex;align-items:center;
      }
      .notif-bell svg{width:18px;height:18px;transition:transform 0.2s}
      .notif-bell:hover{color:var(--crimson-bright)}
      .notif-bell:hover svg{transform:rotate(-12deg) scale(1.1)}
      .notif-badge{
        position:absolute;top:-3px;right:-5px;
        background:var(--crimson-light);color:white;
        font-size:0.5rem;min-width:14px;height:14px;
        border-radius:7px;display:none;align-items:center;justify-content:center;padding:0 3px;
      }
      .notif-badge.visible{display:flex}

      /* ── LAYOUT ── */
      main{max-width:1480px;margin:0 auto;padding:2.5rem 2rem 5rem;position:relative;z-index:1}

      /* ── PAGE HEADER ── */
      .page-header{
        margin-bottom:2.5rem;
        padding-bottom:1.8rem;
        border-bottom:1px solid var(--border-silver);
        position:relative;
        display:flex;
        align-items:flex-end;
        justify-content:space-between;
        gap:2rem;
      }
      .page-header::after{
        content:'';
        position:absolute;
        bottom:-1px;left:0;
        width:120px;height:2px;
        background:linear-gradient(90deg,var(--crimson-light),transparent);
      }
      .page-label{
        font-size:0.6rem;letter-spacing:0.5em;text-transform:uppercase;
        color:var(--crimson-light);margin-bottom:0.65rem;opacity:0.9;font-weight:500;
      }
      .page-title{
        font-family:'Cinzel',serif;
        font-size:2.1rem;color:var(--text);font-weight:500;letter-spacing:0.02em;
      }
      .page-sub{
        font-family:'Cormorant Garamond',serif;
        font-style:italic;color:var(--text-dim);
        margin-top:0.5rem;font-size:1.1rem;
      }

      /* ── PAGE INFO BOX ── */
      .page-info{
        background:linear-gradient(135deg,rgba(192,40,45,0.08),rgba(192,40,45,0.03));
        border:1px solid rgba(192,40,45,0.22);
        border-left:3px solid var(--crimson-light);
        padding:1.2rem 1.5rem;
        margin-bottom:2rem;
        display:flex;
        align-items:flex-start;
        gap:1rem;
      }
      body.light .page-info{
        background:linear-gradient(135deg,rgba(192,40,45,0.06),rgba(192,40,45,0.02));
        border-color:rgba(192,40,45,0.18);
      }
      .page-info-icon{
        flex-shrink:0;margin-top:0.1rem;
        color:var(--crimson-light);
        opacity:0.85;
      }
      .page-info-icon svg{width:20px;height:20px}
      .page-info-body{}
      .page-info-title{
        font-family:'Cinzel',serif;
        font-size:0.78rem;letter-spacing:0.12em;text-transform:uppercase;
        color:var(--crimson-light);margin-bottom:0.4rem;
      }
      .page-info-text{
        font-size:0.85rem;color:var(--text-dim);line-height:1.8;
      }

      /* ── CARDS ── */
      .card{
        background:var(--bg-card);
        border:1px solid var(--border);
        padding:1.8rem;
        transition:border-color 0.3s,box-shadow 0.3s,transform 0.25s;
        box-shadow:var(--shadow-card);
        position:relative;
        overflow:hidden;
      }
      .card::before{
        content:'';position:absolute;top:0;left:0;right:0;height:1px;
        background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent);
        pointer-events:none;
      }
      body.light .card::before{
        background:linear-gradient(90deg,transparent,rgba(192,40,45,0.08),transparent);
      }
      /* Corner accent */
      .card::after{
        content:'';position:absolute;top:0;right:0;
        width:0;height:0;
        border-style:solid;
        border-width:0 22px 22px 0;
        border-color:transparent rgba(192,40,45,0.12) transparent transparent;
        pointer-events:none;
        transition:border-color 0.3s;
      }
      .card:hover{
        border-color:var(--border-silver);
        box-shadow:var(--shadow-card),var(--red-glow);
        transform:translateY(-1px);
      }
      .card:hover::after{border-color:transparent rgba(192,40,45,0.28) transparent transparent}
      .card-header{
        display:flex;align-items:center;justify-content:space-between;
        margin-bottom:1.4rem;padding-bottom:1rem;
        border-bottom:1px solid var(--border);
      }
      .card-title{
        font-family:'Cinzel',serif;
        font-size:0.88rem;letter-spacing:0.1em;color:var(--text);
        display:flex;align-items:center;gap:0.6rem;
      }
      .card-title svg{width:14px;height:14px;color:var(--crimson-light);flex-shrink:0}
      .card-badge{
        font-size:0.54rem;letter-spacing:0.22em;text-transform:uppercase;
        color:var(--silver);background:var(--silver-dim);
        padding:0.2rem 0.65rem;border:1px solid var(--border-silver);
      }

      /* ── FORMS ── */
      .form-section{margin-top:1.6rem;padding-top:1.4rem;border-top:1px solid var(--border)}
      .form-row{display:grid;grid-template-columns:1fr 1fr;gap:0.85rem;margin-bottom:0.85rem}
      .form-group{display:flex;flex-direction:column;gap:0.4rem}
      label{
        font-size:0.62rem;letter-spacing:0.16em;text-transform:uppercase;
        color:var(--silver);font-weight:500;
      }
      select,input[type=text],input[type=number],textarea{
        background:var(--input-bg);
        border:1px solid var(--border-hover);
        color:var(--text);
        padding:0.75rem 1rem;
        font-family:'Inter',sans-serif;
        font-size:0.9rem;
        width:100%;outline:none;
        transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;
        appearance:none;-webkit-appearance:none;
      }
      textarea{resize:vertical;min-height:100px}
      select:focus,input:focus,textarea:focus{
        border-color:var(--crimson-light);
        box-shadow:0 0 0 3px var(--crimson-glow);
        background:var(--bg-card);
      }
      select option{background:var(--bg-mid)}
      .btn-submit{
        background:linear-gradient(135deg,var(--crimson) 0%,var(--crimson-light) 100%);
        color:#FFFFFF;border:none;
        padding:0.85rem 1.5rem;
        font-family:'Inter',sans-serif;
        font-size:0.7rem;letter-spacing:0.24em;text-transform:uppercase;font-weight:600;
        cursor:pointer;width:100%;margin-top:0.6rem;
        transition:opacity 0.2s,transform 0.15s,box-shadow 0.2s;
        box-shadow:0 2px 18px rgba(139,26,26,0.38);
        position:relative;overflow:hidden;
      }
      .btn-submit::after{
        content:'';
        position:absolute;inset:0;
        background:linear-gradient(135deg,transparent 30%,rgba(255,255,255,0.08) 50%,transparent 70%);
        transform:translateX(-100%);
        transition:transform 0.5s;
      }
      .btn-submit:hover::after{transform:translateX(100%)}
      .btn-submit:hover{opacity:0.92;box-shadow:0 4px 28px rgba(192,40,45,0.58);transform:translateY(-1px)}
      .btn-submit:active{transform:scale(0.99)}
      .typ-toggle{display:flex;gap:0.4rem;margin-bottom:1rem}
      .typ-btn{
        flex:1;padding:0.6rem;background:transparent;
        border:1px solid var(--border-hover);
        color:var(--text-muted);font-family:'Inter',sans-serif;
        font-size:0.65rem;letter-spacing:0.14em;text-transform:uppercase;font-weight:500;cursor:pointer;
        transition:all 0.2s;
      }
      .typ-btn:hover{color:var(--silver-bright);border-color:var(--border-silver)}
      .typ-btn.active-vklad{background:rgba(0,200,100,0.09);border-color:rgba(0,200,100,0.35);color:#00D97A}
      .typ-btn.active-vyber{background:rgba(220,50,50,0.09);border-color:rgba(220,50,50,0.35);color:#FF5555}
      .info-box{
        background:var(--gold-dim);border:1px solid var(--border-gold);
        padding:0.85rem 1.1rem;font-size:0.82rem;color:var(--text-dim);margin-top:0.9rem;display:none;
      }

      /* ── TOP STATS STRIP ── */
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2rem}
      .stat{
        background:var(--bg-card);border:1px solid var(--border);
        padding:1.6rem 1.8rem;
        transition:all 0.3s;
        position:relative;overflow:hidden;
        box-shadow:var(--shadow-card);
        cursor:default;
      }
      .stat::after{
        content:'';position:absolute;top:0;left:0;right:0;height:2px;
        background:linear-gradient(90deg,var(--crimson),var(--crimson-light) 50%,transparent);
      }
      /* Animated shimmer line */
      .stat::before{
        content:'';position:absolute;
        bottom:0;left:-60%;width:40%;height:1px;
        background:linear-gradient(90deg,transparent,rgba(192,40,45,0.35),transparent);
        transition:left 0.6s ease;
      }
      .stat:hover::before{left:120%}
      .stat:hover{
        border-color:var(--border-silver);
        transform:translateY(-3px);
        box-shadow:var(--shadow-card),var(--red-glow);
      }
      .stat-label{font-size:0.62rem;letter-spacing:0.28em;text-transform:uppercase;color:var(--silver);margin-bottom:0.65rem;font-weight:500}
      .stat-value{font-family:'Cinzel',serif;font-size:2rem;color:var(--text);line-height:1}
      .stat-sub{font-size:0.72rem;color:var(--text-dim);margin-top:0.55rem}

      /* ── SKLAD ── */
      .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem}
      .sklad-row{
        display:flex;justify-content:space-between;align-items:center;
        padding:0.7rem 0;border-bottom:1px solid var(--border);
        font-size:0.88rem;
        transition:background 0.15s,padding 0.15s;
      }
      .sklad-row:last-child{border-bottom:none}
      .sklad-row:hover{background:rgba(192,40,45,0.04);margin:0 -0.5rem;padding-left:0.5rem;padding-right:0.5rem}
      .sklad-row em{color:var(--gold);font-style:normal;margin-left:0.5rem;font-size:0.7rem;opacity:0.85}

      /* ── TOAST ── */
      .toast{
        position:fixed;bottom:1.5rem;right:1.5rem;
        background:var(--bg-card3);
        border:1px solid var(--border-hover);
        border-left:3px solid #00FF88;
        padding:0.9rem 1.4rem;font-size:0.8rem;
        transform:translateY(120px) scale(0.95);opacity:0;
        transition:all 0.35s cubic-bezier(0.22,1,0.36,1);
        z-index:999;max-width:340px;
        box-shadow:var(--shadow);
      }
      .toast.show{transform:translateY(0) scale(1);opacity:1}
      .toast.error{border-left-color:#FF5555}

      /* ── TABULKY ── */
      .table-wrap{overflow-x:auto}
      table{width:100%;border-collapse:collapse;font-size:0.88rem}
      th{
        font-size:0.62rem;letter-spacing:0.2em;text-transform:uppercase;font-weight:600;
        color:var(--silver);padding:0.85rem 1.1rem;text-align:left;
        border-bottom:1px solid var(--border-silver);background:rgba(255,255,255,0.018);
      }
      body.light th{background:rgba(60,50,100,0.04)}
      td{padding:0.82rem 1.1rem;border-bottom:1px solid var(--border);color:var(--text-dim);font-size:0.88rem}
      tr:last-child td{border-bottom:none}
      tr:hover td{background:rgba(192,40,45,0.035);color:var(--text)}
      .badge{
        font-size:0.6rem;padding:0.22rem 0.7rem;
        letter-spacing:0.12em;text-transform:uppercase;font-weight:500;
      }
      .badge.vklad{background:rgba(0,200,100,0.09);color:#00D97A;border:1px solid rgba(0,200,100,0.25)}
      .badge.vyber{background:rgba(220,50,50,0.09);color:#FF5555;border:1px solid rgba(220,50,50,0.25)}
      .badge.prijem{background:rgba(0,200,100,0.09);color:#00D97A;border:1px solid rgba(0,200,100,0.25)}
      .badge.vydaj{background:rgba(220,50,50,0.09);color:#FF5555;border:1px solid rgba(220,50,50,0.25)}

      /* ── NÁSTĚNKA ── */
      .nastenska-list{display:flex;flex-direction:column;gap:1rem}
      .nastenska-item{
        background:var(--bg-card);border:1px solid var(--border);
        border-left:3px solid var(--border-silver);
        padding:1.5rem 1.8rem;transition:all 0.25s;
        position:relative;overflow:hidden;
      }
      .nastenska-item::before{
        content:'';position:absolute;
        top:0;left:0;bottom:0;width:3px;
        background:linear-gradient(180deg,transparent,var(--silver),transparent);
        opacity:0;transition:opacity 0.3s;
      }
      .nastenska-item:hover{border-left-color:var(--silver);background:var(--bg-card2)}
      .nastenska-item:hover::before{opacity:0.5}
      .nastenska-item.new{border-left-color:var(--crimson-light);animation:pulseCard 2s ease}
      @keyframes pulseCard{0%,100%{box-shadow:none}50%{box-shadow:var(--red-glow)}}
      .nastenska-meta{font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.6rem;font-weight:500}
      .nastenska-title{font-family:'Cinzel',serif;font-size:1.05rem;margin-bottom:0.55rem;color:var(--text);font-weight:500}
      .nastenska-content{font-size:0.92rem;color:var(--text-dim);line-height:1.85;white-space:pre-wrap}
      .new-badge{
        display:inline-block;font-size:0.55rem;letter-spacing:0.14em;text-transform:uppercase;
        background:var(--crimson-light);color:white;padding:0.16rem 0.55rem;margin-left:0.55rem;vertical-align:middle;font-weight:600;
      }

      /* ── KODEX ── */
      .kodex-section{margin-bottom:2.5rem}
      .kodex-number{font-family:'Cinzel',serif;font-size:3.5rem;color:var(--crimson-light);opacity:0.09;float:left;line-height:1;margin-right:1.2rem;margin-top:-0.3rem;font-weight:700}
      .kodex-rule{font-size:0.92rem;line-height:2;color:var(--text-dim);overflow:hidden}
      .kodex-rule strong{color:var(--text);font-weight:500}
      .kodex-divider{
        height:1px;
        background:linear-gradient(90deg,var(--crimson-light),var(--border),transparent);
        margin:1.8rem 0;
        opacity:0.4;
      }

      /* ── STATISTIKY ── */
      .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1.5rem}
      .stat-card{
        background:var(--bg-card);border:1px solid var(--border);
        padding:1.8rem;transition:all 0.3s;box-shadow:var(--shadow-card);
        position:relative;overflow:hidden;
      }
      .stat-card::after{
        content:'';position:absolute;top:0;left:0;right:0;height:2px;
        background:linear-gradient(90deg,var(--crimson),transparent 60%);
        opacity:0;transition:opacity 0.3s;
      }
      .stat-card:hover::after{opacity:1}
      .stat-card:hover{border-color:var(--border-silver);box-shadow:var(--shadow-card),var(--red-glow);transform:translateY(-2px)}
      .stat-card-header{
        display:flex;justify-content:space-between;align-items:flex-start;
        margin-bottom:1.2rem;padding-bottom:1rem;border-bottom:1px solid var(--border-silver);
      }
      .stat-card-name{font-family:'Cinzel',serif;font-size:1rem;color:var(--text);font-weight:500}
      .stat-card-discord{font-size:0.68rem;letter-spacing:0.08em;color:var(--text-muted);margin-top:0.25rem}
      .stat-row{display:flex;justify-content:space-between;font-size:0.86rem;padding:0.35rem 0;color:var(--text-dim)}
      .stat-row strong{color:var(--text);font-weight:500}
      .stat-section-label{
        font-size:0.6rem;letter-spacing:0.22em;text-transform:uppercase;color:var(--silver);font-weight:600;
        margin-top:0.9rem;margin-bottom:0.4rem;
        padding-top:0.65rem;border-top:1px solid var(--border);
      }
      .stat-section-label:first-of-type{border-top:none;margin-top:0}
      .stat-item-group{margin-left:0.5rem}

      /* ── LORE / HIERARCHY ── */
      .lore-grid{display:grid;grid-template-columns:1fr 320px;gap:3rem;align-items:start}
      .chapters{display:flex;flex-direction:column;gap:3rem}
      .chapter{
        border-left:2px solid var(--border-silver);
        padding-left:2rem;position:relative;
        transition:border-color 0.3s;
      }
      .chapter:hover{border-left-color:rgba(192,40,45,0.4)}
      .chapter::before{
        content:'';position:absolute;left:-5px;top:2px;
        width:8px;height:8px;
        background:var(--crimson-light);opacity:0.65;
        transform:rotate(45deg);
        transition:opacity 0.3s,transform 0.3s;
      }
      .chapter:hover::before{opacity:1;transform:rotate(45deg) scale(1.2)}
      .chapter-meta{font-size:0.6rem;letter-spacing:0.36em;text-transform:uppercase;color:var(--crimson-light);margin-bottom:0.8rem;font-weight:500}
      .chapter-title{font-family:'Cinzel',serif;font-size:1.35rem;color:var(--text);margin-bottom:1rem;font-weight:500}
      .chapter-text{font-family:'Cormorant Garamond',serif;font-size:1.12rem;line-height:2;color:var(--text-dim)}
      .sidebar{
        background:var(--bg-card);border:1px solid var(--border-silver);
        padding:2rem;position:sticky;top:calc(var(--nav-h) + 1.5rem);
        box-shadow:var(--shadow-card);
      }
      .sidebar-title{
        font-family:'Cinzel',serif;font-size:0.75rem;letter-spacing:0.28em;text-transform:uppercase;
        margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid var(--border);color:var(--silver);
      }
      .toc-item{
        font-size:0.82rem;padding:0.65rem 0;border-bottom:1px solid var(--border);
        color:var(--text-dim);display:flex;gap:0.8rem;align-items:center;
        transition:color 0.2s,padding-left 0.2s;cursor:default;
      }
      .toc-item:last-child{border-bottom:none}
      .toc-item:hover{color:var(--text);padding-left:0.3rem}
      .toc-num{color:var(--crimson-light);font-weight:600;min-width:1.5rem;font-family:'Cinzel',serif;font-size:0.82rem}
      .rank-list{display:flex;flex-direction:column;gap:0}
      .rank-item{
        display:flex;align-items:flex-start;gap:1.5rem;
        padding:1.8rem 2rem;
        background:var(--bg-card);border:1px solid var(--border);
        border-top:none;transition:all 0.25s;
        position:relative;
      }
      .rank-item:first-child{border-top:1px solid var(--border-silver)}
      .rank-item:hover{
        background:var(--bg-card2);
        border-left:3px solid var(--crimson-light);
        padding-left:calc(2rem - 2px);
      }
      .rank-item.founder{
        border-top:2px solid var(--crimson-light)!important;
        background:linear-gradient(135deg,var(--bg-card),var(--bg-card2));
      }
      .rank-num{font-family:'Cinzel',serif;font-size:1.6rem;color:var(--crimson-light);opacity:0.35;min-width:2.5rem;line-height:1}
      .rank-item.founder .rank-num{opacity:0.85}
      .rank-info h3{font-family:'Cinzel',serif;font-size:1rem;color:var(--text);margin-bottom:0.25rem;font-weight:500}
      .rank-info .rank-member{font-size:0.84rem;color:var(--silver-bright);margin-bottom:0.5rem}
      .rank-info p{font-size:0.88rem;color:var(--text-dim);line-height:1.8}
      .rank-rights{margin-top:0.8rem;display:flex;flex-wrap:wrap;gap:0.35rem}
      .rank-right-tag{
        font-size:0.62rem;letter-spacing:0.08em;padding:0.25rem 0.7rem;
        background:var(--silver-dim);border:1px solid var(--border-silver);
        color:var(--silver);white-space:nowrap;font-weight:500;
        transition:border-color 0.2s,color 0.2s;
      }
      .rank-right-tag:hover{border-color:var(--crimson-light);color:var(--text)}

      /* ── SÁZENÍ EXTRA ── */
      .sazeni-hero{
        background:linear-gradient(135deg,rgba(0,80,30,0.14),rgba(0,40,15,0.06));
        border:1px solid rgba(0,200,80,0.14);
        padding:2rem;margin-bottom:2rem;position:relative;overflow:hidden;
      }
      body.light .sazeni-hero{
        background:linear-gradient(135deg,rgba(0,100,30,0.08),rgba(0,60,15,0.04));
        border-color:rgba(0,150,60,0.18);
      }
      .cost-table{width:100%;border-collapse:collapse;margin:1rem 0}
      .cost-table th{font-size:0.62rem;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;color:var(--silver);padding:0.8rem 1rem;text-align:left;border-bottom:1px solid var(--border-silver)}
      .cost-table td{padding:0.75rem 1rem;border-bottom:1px solid var(--border);color:var(--text-dim);font-size:0.9rem}
      .cost-table tr:last-child td{border-bottom:none;font-weight:600;color:var(--text)}
      .cost-table .total-row td{border-top:2px solid rgba(0,200,80,0.22);color:var(--text);font-family:'Cinzel',serif}
      .cost-amount{color:var(--gold);font-weight:600}
      .kalk-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-top:1.5rem}
      .kalk-block{background:var(--bg-mid);border:1px solid var(--border-hover);padding:1.5rem;position:relative}
      .kalk-block-label{font-size:0.62rem;letter-spacing:0.25em;text-transform:uppercase;font-weight:600;color:var(--silver);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem}
      .kalk-block-label::before{content:'';display:inline-block;width:3px;height:13px;background:var(--crimson-light)}
      .kalk-input{
        background:var(--input-bg);border:1px solid var(--border-hover);
        color:var(--text);padding:0.9rem 1rem;
        font-family:'Cinzel',serif;font-size:1.5rem;
        width:100%;outline:none;transition:border-color 0.2s,box-shadow 0.2s;text-align:center;
      }
      .kalk-input:focus{border-color:rgba(0,200,80,0.4);box-shadow:0 0 0 3px rgba(0,200,80,0.08)}
      .kalk-result{margin-top:1rem;padding:1rem;background:rgba(0,200,80,0.05);border:1px solid rgba(0,200,80,0.14);text-align:center}
      .kalk-result-num{font-family:'Cinzel',serif;font-size:2.1rem;color:#00C853;line-height:1.1}
      .kalk-result-label{font-size:0.62rem;letter-spacing:0.18em;text-transform:uppercase;font-weight:500;color:var(--text-muted);margin-top:0.35rem}
      .kalk-arrow{text-align:center;font-size:1.5rem;display:flex;align-items:center;justify-content:center;color:var(--text-muted);opacity:0.35}
      .breakdown-row{display:flex;justify-content:space-between;padding:0.45rem 0;font-size:0.88rem;color:var(--text-dim);border-bottom:1px solid var(--border)}
      .breakdown-row:last-child{border-bottom:none;color:var(--text);padding-top:0.7rem;margin-top:0.3rem}
      .breakdown-row .green{color:#00C853}
      .bd-label{display:flex;align-items:center;gap:0.4rem}
      .slider-wrap{margin:1.5rem 0}
      .slider{-webkit-appearance:none;width:100%;height:4px;background:linear-gradient(90deg,rgba(0,200,80,0.5) var(--pct,50%),var(--border-hover) var(--pct,50%));outline:none}
      .slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;background:var(--crimson-light);cursor:pointer;border:2px solid var(--bg);box-shadow:0 0 8px rgba(192,40,45,0.4)}
      .slider-labels{display:flex;justify-content:space-between;font-size:0.66rem;color:var(--text-muted);letter-spacing:0.08em;margin-top:0.4rem}
      .profit-bar{height:5px;background:var(--border);margin-top:1rem;position:relative;overflow:hidden}
      .profit-fill{height:100%;background:linear-gradient(90deg,rgba(0,200,80,0.5),#00C853);transition:width 0.4s}

      @media(max-width:1200px){.nav-menu a .nav-desc{display:none}}
      @media(max-width:900px){.grid,.stats{grid-template-columns:1fr}.lore-grid{grid-template-columns:1fr}.sidebar{position:static}}
      @media(max-width:768px){.kalk-grid{grid-template-columns:1fr}.kalk-arrow{transform:rotate(90deg)}main{padding:1.5rem 1rem}}
    </style>
  `;
}

function renderNav(req, active) {
  const ic = req.session.icName;
  return `
    <nav>
      <a href="/dashboard" class="nav-logo">
        <img src="/logo.png" class="nav-logo-img" alt="Albion">
        <span class="nav-logo-text">AL<span class="b-red">B</span>ION</span>
      </a>
      <ul class="nav-menu">
        <li><a href="/dashboard" class="${active==='dashboard'?'active':''}">Sklad<span class="nav-desc">Zbraně · Weed · Drogy</span></a></li>
        <li><a href="/nastenska" class="${active==='nastenska'?'active':''}">Nástěnka<span class="nav-desc">Oznámení & Discord</span></a></li>
        <li><a href="/kodex" class="${active==='kodex'?'active':''}">Kodex<span class="nav-desc">Pravidla organizace</span></a></li>
        <li><a href="/audit" class="${active==='audit'?'active':''}">Audit<span class="nav-desc">Záznamy akcí</span></a></li>
        <li><a href="/statistiky" class="${active==='statistiky'?'active':''}">Statistiky<span class="nav-desc">Přehled členů</span></a></li>
        <li><a href="/lore" class="${active==='lore'?'active':''}">Historie<span class="nav-desc">Příběh Albionu</span></a></li>
        <li><a href="/hierarchy" class="${active==='hierarchy'?'active':''}">Hierarchie<span class="nav-desc">Ranky & pozice</span></a></li>
        <li><a href="/sazeni" class="${active==='sazeni'?'active':''}">Sázení<span class="nav-desc">Weed kalkulačka</span></a></li>
      </ul>
      <div class="nav-right">
        <button class="notif-bell" id="notifBell" title="Notifikace" onclick="window.location='/nastenska'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span class="notif-badge" id="notifBadge">0</span>
        </button>
        <button class="theme-toggle" id="themeBtn" onclick="toggleTheme()" title="Přepnout téma">
          <svg id="iconMoon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <svg id="iconSun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:none"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </button>
        <span class="nav-user">přihlášen jako <strong>${ic}</strong></span>
        <a href="/logout" class="nav-logout">Odhlásit</a>
      </div>
    </nav>
    <script>
      const savedTheme = localStorage.getItem('albion_theme') || 'dark';
      if (savedTheme === 'light') {
        document.body.classList.add('light');
        document.getElementById('iconMoon').style.display = 'none';
        document.getElementById('iconSun').style.display = 'block';
      }
      function toggleTheme() {
        const isLight = document.body.classList.toggle('light');
        localStorage.setItem('albion_theme', isLight ? 'light' : 'dark');
        document.getElementById('iconMoon').style.display = isLight ? 'none' : 'block';
        document.getElementById('iconSun').style.display = isLight ? 'block' : 'none';
      }
      let newCount = 0;
      const evtSource = new EventSource('/api/events');
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
        const label = d.sekce === 'zbrane' ? '[Zbraně]' : d.sekce === 'weed' ? '[Weed]' : '[Drogy]';
        showToast(label + ' ' + (d.polozka || d.odruda || d.droga) + ' — ' + d.uzivatel);
      });
      evtSource.addEventListener('ucetUpdate', (e) => {
        const d = JSON.parse(e.data);
        showToast('[Finance] ' + d.typ + ' — ' + (d.valuta === 'USD' ? '$' : '₱') + d.castka);
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
    if (!entries.length) return '<p style="color:var(--text-muted);font-size:0.8rem;padding:0.5rem 0">Sklad je prázdný</p>';
    return entries.map(([item, qty]) => {
      const hodnota = ceny && ceny[item] ? qty * ceny[item].prodej : null;
      return `<div class="sklad-row"><span>${item}</span><span>${qty} ks${hodnota ? ` <em>$${hodnota}</em>` : ''}</span></div>`;
    }).join('');
  };

  const formatUcet = (rows) => {
    if (!rows.length) return '<p style="color:var(--text-muted);font-size:0.8rem;padding:0.5rem 0">Žádné záznamy</p>';
    return rows.map(r => {
      const [cas, typ, castka, valuta, pozn] = r;
      const isIn = typ === 'PŘÍJEM';
      const symbol = valuta === 'USD' ? '$' : '₱';
      return `<div class="sklad-row"><span style="display:flex;align-items:center;gap:0.5rem"><span style="width:6px;height:6px;border-radius:50%;background:${isIn?'#00FF88':'#FF5555'};flex-shrink:0"></span>${pozn||'—'}</span><span style="${isIn?'color:#00CC66':'color:#FF5555'}">${symbol}${castka} <em style="color:var(--text-muted)">${valuta}</em></span></div>`;
    }).join('');
  };

  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Dashboard</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'dashboard')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Albion — Systém</div>
        <h1 class="page-title">Vítej, ${icName}</h1>
        <p class="page-sub">Přehled skladu a účetnictví organizace</p>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div id="live-clock" style="font-family:'Cinzel',serif;font-size:1.3rem;color:var(--silver-bright);letter-spacing:0.1em"></div>
        <div id="live-date" style="font-size:0.68rem;letter-spacing:0.16em;color:var(--text-dim);text-transform:uppercase;margin-top:0.3rem"></div>
      </div>
    </div>
    <div class="page-info">
      <div class="page-info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div>
      <div class="page-info-body">
        <div class="page-info-title">Centrální sklad organizace</div>
        <div class="page-info-text">Zde eviduješ pohyb zbraní, weedu, drog a financí. Každý vklad nebo výběr se automaticky zaznamená do Google Sheets a odešle notifikaci na Discord. Přepínač <strong>Uložit / Vybrat</strong> určuje směr pohybu zásob. U výběru zbraní nezapomeň vyplnit účel.</div>
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
    <div class="stats">
      <div class="stat"><div class="stat-label">Zůstatek USD</div><div class="stat-value">$${ucet.usd.toLocaleString('cs-CZ')}</div><div class="stat-sub">Americké dolary</div></div>
      <div class="stat"><div class="stat-label">Zůstatek Pesos</div><div class="stat-value">₱${ucet.pesos.toLocaleString('cs-CZ')}</div><div class="stat-sub">Mexické peso</div></div>
      <div class="stat"><div class="stat-label">Položky Weed</div><div class="stat-value">${Object.values(weed).filter(q=>q>0).reduce((a,b)=>a+b,0)}</div><div class="stat-sub">Kusů celkem</div></div>
      <div class="stat"><div class="stat-label">Položky Drogy</div><div class="stat-value">${Object.values(drogy).filter(q=>q>0).reduce((a,b)=>a+b,0)}</div><div class="stat-sub">Kusů celkem</div></div>
    </div>
    <div class="grid">
      <div class="card">
        <div class="card-header"><span class="card-title">Zbraně & Střelivo</span><span class="card-badge">Sklad</span></div>
        ${formatSklad(zbrane, null)}
        <div class="form-section">
          <div class="typ-toggle">
            <button class="typ-btn active-vklad" onclick="setTyp('zbrane','VKLAD',this)">Uložit</button>
            <button class="typ-btn" onclick="setTyp('zbrane','VÝBĚR',this)">Vybrat</button>
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
          <button class="btn-submit" onclick="submitZbrane()">Potvrdit akci</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Weed</span><span class="card-badge">Sklad</span></div>
        ${formatSklad(weed, {"Žlutý kanabis":{prodej:150},"Zelený kanabis":{prodej:150},"Kanabis":{prodej:150},"Červený kanabis":{prodej:150},"Modrý kanabis":{prodej:150}})}
        <div class="form-section">
          <div class="typ-toggle">
            <button class="typ-btn active-vklad" onclick="setTyp('weed','VKLAD',this)">Uložit</button>
            <button class="typ-btn" onclick="setTyp('weed','VÝBĚR',this)">Vybrat</button>
          </div>
          <input type="hidden" id="weed-typ" value="VKLAD">
          <div class="form-row">
            <div class="form-group"><label>Odrůda</label><select id="weed-odruda"><option>Žlutý kanabis</option><option>Zelený kanabis</option><option>Kanabis</option><option>Červený kanabis</option><option>Modrý kanabis</option></select></div>
            <div class="form-group"><label>Množství</label><input type="number" id="weed-mnozstvi" min="1" value="1"></div>
          </div>
          <div class="info-box" id="weed-info"></div>
          <button class="btn-submit" onclick="submitWeed()">Potvrdit akci</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Drogy</span><span class="card-badge">Sklad</span></div>
        ${formatSklad(drogy, null)}
        <div class="form-section">
          <div class="typ-toggle">
            <button class="typ-btn active-vklad" onclick="setTyp('drogy','VKLAD',this)">Uložit</button>
            <button class="typ-btn" onclick="setTyp('drogy','VÝBĚR',this)">Vybrat</button>
          </div>
          <input type="hidden" id="drogy-typ" value="VKLAD">
          <div class="form-row">
            <div class="form-group"><label>Droga</label><select id="drogy-droga"><option>Kapky</option><option>Kokain</option><option>Extáze</option><option>Metamfetamin</option><option>Benzo</option><option>Joyka</option><option>Heroin</option><option>Speed</option><option>LSD</option></select></div>
            <div class="form-group"><label>Množství</label><input type="number" id="drogy-mnozstvi" min="1" value="1"></div>
          </div>
          <button class="btn-submit" onclick="submitDrogy()">Potvrdit akci</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Účetnictví</span><span class="card-badge">Finance</span></div>
        ${formatUcet(recentUcet)}
        <div class="form-section">
          <div class="typ-toggle">
            <button class="typ-btn active-vklad" onclick="setTyp('ucet','PŘÍJEM',this)">Příjem</button>
            <button class="typ-btn" onclick="setTyp('ucet','VÝDAJ',this)">Výdaj</button>
          </div>
          <input type="hidden" id="ucet-typ" value="PŘÍJEM">
          <div class="form-row">
            <div class="form-group"><label>Částka</label><input type="number" id="ucet-castka" min="1" placeholder="1000"></div>
            <div class="form-group"><label>Valuta</label><select id="ucet-valuta"><option value="USD">USD</option><option value="PESOS">Pesos</option></select></div>
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
      if(r.ok){showToast('OK Záznam uložen');setTimeout(()=>location.reload(),1500);}
      else showToast(' '+r.error,true);
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
      const r=await post('/api/weed',{typ,odruda,mnozstvi});
      if(r.ok){showToast('OK Weed uložen — Výroba: ~$'+r.celkVyroba+' | Prodej: $'+r.celkProdej);setTimeout(()=>location.reload(),2000);}
      else showToast(' '+r.error,true);
    }
    async function submitDrogy(){
      const typ=document.getElementById('drogy-typ').value;
      const droga=document.getElementById('drogy-droga').value;
      const mnozstvi=document.getElementById('drogy-mnozstvi').value;
      const r=await post('/api/drogy',{typ,droga,mnozstvi});
      if(r.ok){showToast('OK Drogy uloženy');setTimeout(()=>location.reload(),1500);}
      else showToast(' '+r.error,true);
    }
    async function submitUcet(){
      const typ=document.getElementById('ucet-typ').value;
      const castka=document.getElementById('ucet-castka').value;
      const valuta=document.getElementById('ucet-valuta').value;
      const poznamka=document.getElementById('ucet-poznamka').value;
      if(!castka||!poznamka)return showToast(' Vyplň všechna pole',true);
      const r=await post('/api/ucet',{typ,castka,valuta,poznamka});
      if(r.ok){showToast('OK Transakce zaznamenána');setTimeout(()=>location.reload(),1500);}
      else showToast(' '+r.error,true);
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
        <p class="page-sub">Oznámení z Discord kanálu — synchronizováno v reálném čase</p>
      </div>
    </div>
    <div class="page-info">
      <div class="page-info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></div>
      <div class="page-info-body">
        <div class="page-info-title">Oznámení organizace</div>
        <div class="page-info-text">Nástěnka zobrazuje zprávy přímo z interního Discord kanálu Albionu a aktualizuje se každých 30 sekund. Nová oznámení jsou označena červeně. Zprávu zde lze i odeslat — automaticky se publikuje na Discord a upozorní ostatní členy.</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:2rem;align-items:start">
      <div>
        <div id="nastenska-list" class="nastenska-list">
          <div style="color:var(--text-muted);font-size:0.84rem;text-align:center;padding:3rem">Načítám oznámení...</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Nové oznámení</span></div>
        <div class="form-group" style="margin-bottom:0.8rem"><label>Název</label><input type="text" id="ann-title" placeholder="Důležité oznámení..."></div>
        <div class="form-group" style="margin-bottom:1rem"><label>Obsah</label><textarea id="ann-content" placeholder="Napište oznámení..." rows="5"></textarea></div>
        <button class="btn-submit" onclick="sendAnnouncement()">Zveřejnit</button>
        <p style="font-size:0.68rem;color:var(--text-muted);margin-top:0.8rem;text-align:center">Oznámení se odešle i do Discord kanálu</p>
      </div>
    </div>
  </main>
  <script>
    const LAST_ID_KEY = 'albion_last_ann_id';
    let lastSeenId = localStorage.getItem(LAST_ID_KEY) || '0';

    async function loadAnnouncements() {
      const res = await fetch('/api/nastenska');
      const data = await res.json();
      const list = document.getElementById('nastenska-list');
      if (!data.messages || !data.messages.length) {
        list.innerHTML = '<div style="color:var(--text-muted);font-size:0.84rem;text-align:center;padding:3rem">Žádná oznámení</div>';
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
        showToast('OK Oznámení odesláno na Discord');
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
    <div class="page-info">
      <div class="page-info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
      <div class="page-info-body">
        <div class="page-info-title">Závazný řád organizace</div>
        <div class="page-info-text">Kodex Albionu je souborem deseti základních principů, které jsou závazné pro každého člena bez výjimky. Neznalost pravidel není omluvou. Porušení kodexu může vést k disciplinárnímu řízení nebo vyloučení z organizace.</div>
      </div>
    </div>
    <div class="lore-grid">
      <div class="chapters">
        ${articles.map(a => `
        <div class="chapter">
          <div class="chapter-meta">Článek ${a.num}</div>
          <div class="chapter-title">${a.title}</div>
          <div class="chapter-text">${a.text}</div>
        </div>
        `).join('')}
      </div>
      <div class="sidebar">
        <div class="sidebar-title">Obsah</div>
        ${articles.map(a => `<div class="toc-item"><span class="toc-num">${a.num}</span><span>${a.title}</span></div>`).join('')}
        <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border);font-family:'Cormorant Garamond',serif;font-style:italic;font-size:0.92rem;color:var(--text-muted);line-height:1.9">
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
    <div class="page-info">
      <div class="page-info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
      <div class="page-info-body">
        <div class="page-info-title">Přehled všech transakcí</div>
        <div class="page-info-text">Audit zobrazuje chronologicky seřazené záznamy všech akcí v systému — vklady a výběry ze skladu, finanční pohyby i jejich autory. Záznamy lze filtrovat podle sekce. Nahoře je zobrazen také finanční souhrn per člen, viditelný u filtrů Vše a Účetnictví.</div>
      </div>
    </div>

    <div id="ucet-souhrn-wrap" style="display:none;margin-bottom:2rem">
      <div style="font-size:0.55rem;letter-spacing:0.35em;text-transform:uppercase;color:var(--gold);margin-bottom:0.8rem;opacity:0.85">Účetnictví — souhrn per člen</div>
      <div id="ucet-souhrn-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem"></div>
    </div>

    <div class="card">
      <div style="display:flex;gap:0.4rem;margin-bottom:1.5rem;flex-wrap:wrap">
        <button class="typ-btn active-vklad" onclick="filterAudit('vse')" id="filter-vse" style="flex:none;padding:0.4rem 1rem">Vše</button>
        <button class="typ-btn" onclick="filterAudit('Zbraně')" id="filter-zbrane" style="flex:none;padding:0.4rem 1rem">Zbraně</button>
        <button class="typ-btn" onclick="filterAudit('Weed')" id="filter-weed" style="flex:none;padding:0.4rem 1rem">Weed</button>
        <button class="typ-btn" onclick="filterAudit('Drogy')" id="filter-drogy" style="flex:none;padding:0.4rem 1rem">Drogy</button>
        <button class="typ-btn" onclick="filterAudit('Účetnictví')" id="filter-ucet" style="flex:none;padding:0.4rem 1rem">Účetnictví</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Čas</th><th>Sekce</th><th>Typ</th><th>Člen</th><th>Detail</th></tr></thead>
          <tbody id="audit-body"><tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2.5rem">Načítám...</td></tr></tbody>
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
          <div style="display:flex;justify-content:space-between;font-size:0.77rem;padding:0.25rem 0">
            <span style="color:var(--text-muted)">USD příjmy / výdaje</span>
            <span><strong style="color:#00CC66">$\${s.prijem_usd.toLocaleString('cs-CZ')}</strong> / <strong style="color:#FF5555">$\${s.vydaj_usd.toLocaleString('cs-CZ')}</strong></span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.74rem;padding:0.2rem 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--text-muted)">Net USD</span>
            <strong style="color:\${netUsd>=0?'#00CC66':'#FF5555'}">\${netUsd>=0?'+':''}\$\${netUsd.toLocaleString('cs-CZ')}</strong>
          </div>\` : ''}
          \${s.prijem_pesos || s.vydaj_pesos ? \`
          <div style="display:flex;justify-content:space-between;font-size:0.77rem;padding:0.25rem 0">
            <span style="color:var(--text-muted)">Pesos příjmy / výdaje</span>
            <span><strong style="color:#00CC66">₱\${s.prijem_pesos.toLocaleString('cs-CZ')}</strong> / <strong style="color:#FF5555">₱\${s.vydaj_pesos.toLocaleString('cs-CZ')}</strong></span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.74rem;padding:0.2rem 0">
            <span style="color:var(--text-muted)">Net Pesos</span>
            <strong style="color:\${netPesos>=0?'#00CC66':'#FF5555'}">\${netPesos>=0?'+':''}₱\${netPesos.toLocaleString('cs-CZ')}</strong>
          </div>\` : ''}
        </div>\`;
      }).join('');
    }

    function renderTable(events) {
      const tbody = document.getElementById('audit-body');
      if (!events.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2.5rem">Žádné záznamy</td></tr>'; return; }
      tbody.innerHTML = events.map(e => {
        const typCls = e.typ === 'VKLAD' || e.typ === 'PŘÍJEM' ? 'vklad' : 'vyber';
        return \`<tr>
          <td style="white-space:nowrap;color:var(--text-muted);font-size:0.82rem">\${e.cas}</td>
          <td style="font-weight:500">\${e.sekce}</td>
          <td><span class="badge \${typCls}">\${e.typ}</span></td>
          <td style="color:var(--silver-bright);font-weight:500">\${e.uzivatel}</td>
          <td style="color:var(--text-dim)">\${e.detail}</td>
        </tr>\`;
      }).join('');
    }

    function filterAudit(sekce) {
      activeFilter = sekce;
      document.querySelectorAll('[id^=filter-]').forEach(b => b.className = 'typ-btn');
      const btnId = sekce === 'vse' ? 'filter-vse' : 'filter-' + sekce.toLowerCase().replace('ě','e').replace('í','i');
      const btn = document.getElementById(btnId);
      if (btn) btn.className = 'typ-btn active-vklad';
      const filtered = sekce === 'vse' ? allEvents : allEvents.filter(e => e.sekce === sekce);
      renderTable(filtered);
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
      <div>
        <div class="page-label">Organizace Albion</div>
        <h1 class="page-title">Statistiky členů</h1>
        <p class="page-sub">Detailní přehled příspěvků každého člena organizace</p>
      </div>
    </div>
    <div class="page-info">
      <div class="page-info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
      <div class="page-info-body">
        <div class="page-info-title">Individuální aktivita členů</div>
        <div class="page-info-text">Statistiky zobrazují celkové příspěvky každého člena — kolik čeho vložil nebo vybral ze skladu a jak se pohybovaly jeho finance. Zelená čísla (+) označují vklady, červená (–) výběry. Data jsou načítána přímo z Google Sheets.</div>
      </div>
    </div>
    <div id="stats-container" class="stats-grid">
      <div style="color:var(--text-muted);font-size:0.84rem">Načítám statistiky...</div>
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
      if (!users.length) { container.innerHTML = '<div style="color:var(--text-muted)">Žádná data</div>'; return; }
      container.innerHTML = users.map(icName => {
        const s = stats[icName];
        const hasZbrane = Object.keys({...s.zbrane.vklad,...s.zbrane.vyber}).length > 0;
        const hasNaboje = Object.keys({...s.naboje.vklad,...s.naboje.vyber}).length > 0;
        const hasAkce   = Object.keys({...s.akce.vklad,...s.akce.vyber}).length > 0;
        const hasWeed   = Object.keys({...s.weed.vklad,...s.weed.vyber}).length > 0;
        const hasDrogy  = Object.keys({...s.drogy.vklad,...s.drogy.vyber}).length > 0;
        const hasUcet   = s.ucet.prijem_usd || s.ucet.vydaj_usd || s.ucet.prijem_pesos || s.ucet.vydaj_pesos;
        return \`<div class="stat-card">
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
          \${hasUcet ? \`<div class="stat-section-label">Účetnictví</div>
            \${s.ucet.prijem_usd  ? \`<div class="stat-row"><span>Příjmy USD</span><strong style="color:#00CC66">$\${s.ucet.prijem_usd.toLocaleString('cs-CZ')}</strong></div>\` : ''}
            \${s.ucet.vydaj_usd   ? \`<div class="stat-row"><span>Výdaje USD</span><strong style="color:#FF5555">$\${s.ucet.vydaj_usd.toLocaleString('cs-CZ')}</strong></div>\` : ''}
            \${s.ucet.prijem_pesos? \`<div class="stat-row"><span>Příjmy Pesos</span><strong style="color:#00CC66">₱\${s.ucet.prijem_pesos.toLocaleString('cs-CZ')}</strong></div>\` : ''}
            \${s.ucet.vydaj_pesos ? \`<div class="stat-row"><span>Výdaje Pesos</span><strong style="color:#FF5555">₱\${s.ucet.vydaj_pesos.toLocaleString('cs-CZ')}</strong></div>\` : ''}
          \` : ''}
          \${!hasZbrane && !hasNaboje && !hasAkce && !hasWeed && !hasDrogy && !hasUcet
            ? '<div style="font-size:0.77rem;color:var(--text-muted);padding:0.5rem 0">Zatím žádná aktivita</div>'
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
    <div class="page-info">
      <div class="page-info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>
      <div class="page-info-body">
        <div class="page-info-title">Kronika Albionu</div>
        <div class="page-info-text">Historie zaznamenává vznik a vývoj organizace Albion od prvních dnů Christophera Sinclaira v Los Santos po současnost. Každá kapitola popisuje klíčové momenty, které formovaly organizaci do podoby, jakou má dnes.</div>
      </div>
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
        <div class="toc-item"><span class="toc-num">—</span><span>Počátky · Vznik</span></div>
        <div class="toc-item"><span class="toc-num">01</span><span>Formování organizace</span></div>
        <div class="toc-item"><span class="toc-num">02</span><span>Působení v Los Santos</span></div>
        <div class="toc-item"><span class="toc-num">03</span><span>Současnost</span></div>
        <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border);font-family:'Cormorant Garamond',serif;font-style:italic;font-size:0.94rem;color:var(--text-muted);line-height:1.85">
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
    <div class="page-info">
      <div class="page-info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 11 3 20 21 20 21 11"/><path d="M3 11L12 3l9 8"/><line x1="9" y1="20" x2="9" y2="14"/><line x1="15" y1="20" x2="15" y2="14"/></svg></div>
      <div class="page-info-body">
        <div class="page-info-title">Struktura organizace</div>
        <div class="page-info-text">Hierarchie definuje pět úrovní členství v Albionu — od zakladatele po Associate. Každý rank nese specifické pravomoci a odpovědnosti. Postup v hierarchii závisí na prokazování loajality, schopností a přispívání k rozvoji organizace.</div>
      </div>
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
  const errMsg = error && errors[error] ? `<div class="auth-alert">${errors[error]}</div>` : '';
  const successReg = page === 'login' ? `<script>if(location.search.includes('success=registered')){const a=document.createElement('div');a.className='auth-alert auth-success';a.textContent='Registrace proběhla úspěšně. Přihlaš se.';document.querySelector('.auth-box').prepend(a);}<\/script>` : '';

  const style = `
    <link rel="icon" type="image/png" href="/logo.png">
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Inter:wght@300;400&display=swap" rel="stylesheet">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{
        background:#050508;color:#ECEEF6;
        font-family:'Inter',sans-serif;font-weight:300;
        min-height:100vh;display:flex;align-items:center;justify-content:center;
        position:relative;overflow:hidden;
      }
      /* Ambient light layers */
      body::before{
        content:'';position:fixed;inset:0;
        background:radial-gradient(ellipse 80% 50% at 50% -10%,rgba(192,40,45,0.14) 0%,transparent 70%);
        pointer-events:none;
      }
      body::after{
        content:'';position:fixed;inset:0;
        background:radial-gradient(ellipse 60% 40% at 50% 110%,rgba(192,40,45,0.07) 0%,transparent 70%);
        pointer-events:none;
      }
      /* Animated subtle grid */
      .bg-grid{
        position:fixed;inset:0;
        background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),
          linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);
        background-size:60px 60px;
        pointer-events:none;
        animation:gridDrift 30s linear infinite;
      }
      @keyframes gridDrift{from{background-position:0 0}to{background-position:60px 60px}}
      .auth-box{
        width:100%;max-width:420px;
        padding:3rem 2.5rem;
        background:rgba(10,10,16,0.95);
        border:1px solid rgba(180,180,220,0.12);
        backdrop-filter:blur(20px);
        box-shadow:0 16px 80px rgba(0,0,0,0.85),0 0 0 1px rgba(192,40,45,0.06);
        position:relative;z-index:1;
        animation:boxIn 0.5s cubic-bezier(0.22,1,0.36,1);
      }
      @keyframes boxIn{from{opacity:0;transform:translateY(16px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
      .auth-box::before{
        content:'';position:absolute;top:0;left:10%;right:10%;height:1px;
        background:linear-gradient(90deg,transparent,rgba(192,40,45,0.7),transparent);
      }
      .auth-logo{text-align:center;margin-bottom:2.5rem}
      .auth-logo-img{
        width:68px;height:68px;object-fit:contain;margin-bottom:1rem;
        filter:drop-shadow(0 0 24px rgba(192,40,45,0.55));
        animation:logoFloat 4s ease-in-out infinite;
      }
      @keyframes logoFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
      .auth-logo h1{font-family:'Cinzel',serif;font-size:2rem;letter-spacing:0.4em;font-weight:400}
      .auth-logo .b-red{color:#C0282D;text-shadow:0 0 18px rgba(192,40,45,0.65)}
      .auth-logo p{font-size:0.64rem;letter-spacing:0.3em;text-transform:uppercase;color:#3A3A50;margin-top:0.5rem}
      .auth-btn{
        display:block;width:100%;padding:0.9rem;
        background:linear-gradient(135deg,#8B1A1A,#C0282D);
        color:#F5F3EF;border:none;
        font-family:'Inter',sans-serif;font-size:0.72rem;
        letter-spacing:0.22em;text-transform:uppercase;
        cursor:pointer;text-decoration:none;text-align:center;
        margin-top:0.8rem;
        transition:all 0.2s;
        box-shadow:0 2px 20px rgba(139,26,26,0.35);
      }
      .auth-btn:hover{box-shadow:0 4px 30px rgba(192,40,45,0.55);transform:translateY(-1px)}
      .auth-btn:active{transform:translateY(0)}
      .auth-btn.secondary{
        background:transparent;border:1px solid rgba(180,180,220,0.12);
        color:#404050;box-shadow:none;
      }
      .auth-btn.secondary:hover{color:#ECEEF6;border-color:rgba(180,180,220,0.3);background:rgba(180,180,220,0.04);box-shadow:none;transform:none}
      .auth-input{
        display:block;width:100%;
        padding:0.85rem 1rem;
        background:#0D0D14;border:1px solid rgba(180,180,220,0.1);
        color:#ECEEF6;font-family:'Inter',sans-serif;font-size:0.84rem;
        margin-bottom:0.8rem;outline:none;
        transition:border-color 0.2s,box-shadow 0.2s;
      }
      .auth-input:focus{border-color:#C0282D;box-shadow:0 0 0 2px rgba(192,40,45,0.12)}
      .auth-label{display:block;font-size:0.58rem;letter-spacing:0.22em;text-transform:uppercase;color:#3A3A50;margin-bottom:0.4rem}
      .auth-alert{
        padding:0.8rem 1rem;
        background:rgba(192,40,45,0.1);
        border:1px solid rgba(192,40,45,0.25);
        border-left:3px solid #C0282D;
        font-size:0.78rem;margin-bottom:1.5rem;color:#EEA0A0;
      }
      .auth-success{background:rgba(0,255,136,0.06);border-color:rgba(0,255,136,0.2);border-left-color:#00FF88;color:#00CC66}
      .auth-divider{
        text-align:center;font-size:0.62rem;letter-spacing:0.2em;
        text-transform:uppercase;color:#222230;margin:1.4rem 0;
        position:relative;
      }
      .auth-divider::before,.auth-divider::after{
        content:'';position:absolute;top:50%;width:42%;height:1px;
        background:rgba(180,180,220,0.07);
      }
      .auth-divider::before{left:0}.auth-divider::after{right:0}
      .auth-sep{height:1px;background:rgba(180,180,220,0.06);margin:1.2rem 0}
    </style>
  `;

  const logoHtml = `<div class="auth-logo"><img src="/logo.png" class="auth-logo-img" alt="Albion"><h1>AL<span class="b-red">B</span>ION</h1>`;

  if (page === 'login') return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Albion — Přihlášení</title>${style}</head><body><div class="bg-grid"></div><div class="auth-box">${logoHtml}<p>Přihlášení do systému</p></div>${errMsg}<a href="/auth/discord?action=login" class="auth-btn">Přihlásit se přes Discord</a><div class="auth-divider">nebo</div><a href="/register" class="auth-btn secondary">Registrovat se</a></div>${successReg}</body></html>`;
  if (page === 'register') return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Albion — Registrace</title>${style}</head><body><div class="bg-grid"></div><div class="auth-box">${logoHtml}<p>Registrace nového člena</p></div>${errMsg}<p style="font-size:0.78rem;color:#3A3A50;line-height:1.75;margin-bottom:1.5rem">Pro registraci musíš být členem Discord serveru Albion.</p><a href="/auth/discord?action=register" class="auth-btn">Pokračovat přes Discord</a><div class="auth-sep"></div><a href="/login" class="auth-btn secondary">Zpět na přihlášení</a></div></body></html>`;
  if (page === 'register_complete') return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Albion — Registrace</title>${style}</head><body><div class="bg-grid"></div><div class="auth-box">${logoHtml}<p>Dokončení registrace</p></div>${errMsg}<p style="font-size:0.78rem;color:#3A3A50;margin-bottom:1.5rem">Discord: <strong style="color:#ECEEF6">${data?.username||''}</strong></p><form method="POST" action="/register/complete"><label class="auth-label">IC jméno (ve hře)</label><input class="auth-input" type="text" name="ic_name" placeholder="Christopher Sinclair" required><label class="auth-label">Heslo</label><input class="auth-input" type="password" name="password" placeholder="Alespoň 6 znaků" required><label class="auth-label">Heslo znovu</label><input class="auth-input" type="password" name="password2" placeholder="Zopakuj heslo" required><button type="submit" class="auth-btn">Dokončit registraci</button></form></div></body></html>`;
  if (page === 'login_password') return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Albion — Přihlášení</title>${style}</head><body><div class="bg-grid"></div><div class="auth-box">${logoHtml}<p>Zadej heslo</p></div>${errMsg}<p style="font-size:0.78rem;color:#3A3A50;margin-bottom:1.5rem">Discord: <strong style="color:#ECEEF6">${data?.username||''}</strong></p><form method="POST" action="/login/password"><label class="auth-label">Heslo</label><input class="auth-input" type="password" name="password" placeholder="Tvoje heslo" required autofocus><button type="submit" class="auth-btn">Přihlásit se</button></form></div></body></html>`;
  return '<h1>404</h1>';
}

// ── RENDER SÁZENÍ ─────────────────────────────────────────────────────────────
function renderSazeni(req) {
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Sázení</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'sazeni')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Albion — Produkce</div>
        <h1 class="page-title">Sázení trávy</h1>
        <p class="page-sub">Kalkulačka nákladů na pěstování cannabisu</p>
      </div>
    </div>

    <div class="sazeni-hero">
      <div style="font-size:0.55rem;letter-spacing:0.38em;text-transform:uppercase;color:rgba(0,200,80,0.7);margin-bottom:0.5rem">Informace o produkci</div>
      <div style="font-family:'Cinzel',serif;font-size:1.1rem;margin-bottom:0.5rem">Náklady na jednu kytku</div>
      <div style="font-size:0.8rem;color:var(--text-dim);line-height:1.85">
        Přesný rozpis všeho, co potřebuješ na vypěstování jedné rostliny trávy. Kalkulačka spočítá náklady na libovolný počet kytek nebo zjistí, kolik jich zvládneš za daný rozpočet.
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
      <div class="card">
        <div class="card-header"><span class="card-title">Rozpis nákladů / 1 kytka</span><span class="card-badge">Fixní ceny</span></div>
        <table class="cost-table">
          <thead><tr><th>Položka</th><th>Množství</th><th>Cena / ks</th><th>Celkem</th></tr></thead>
          <tbody>
            <tr><td>Konev s vodou</td><td>1×</td><td class="cost-amount">$20</td><td class="cost-amount">$20</td></tr>
            <tr><td>Semínko</td><td>1×</td><td class="cost-amount">$50</td><td class="cost-amount">$50</td></tr>
            <tr><td>Hnojivo</td><td>1×</td><td class="cost-amount">$25</td><td class="cost-amount">$25</td></tr>
            <tr><td>Kvalitní hnojivo</td><td>4×</td><td class="cost-amount">$50</td><td class="cost-amount">$200</td></tr>
            <tr><td>Výživná voda</td><td>4×</td><td class="cost-amount">$40</td><td class="cost-amount">$160</td></tr>
            <tr class="total-row"><td colspan="3" style="font-size:0.72rem;letter-spacing:0.15em">CELKEM NA KYTKU</td><td class="cost-amount" style="font-size:1.1rem">$455</td></tr>
          </tbody>
        </table>
        <div style="margin-top:1rem;padding:0.8rem 1rem;background:var(--gold-dim);border:1px solid var(--border-gold);font-size:0.76rem;color:var(--text-dim)">
          Cena <strong style="color:var(--gold)">$455</strong> je náklad na jednu rostlinu.
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Rychlá kalkulačka</span><span class="card-badge">Interaktivní</span></div>
        <div class="kalk-grid">
          <div class="kalk-block">
            <div class="kalk-block-label">Počet kytek</div>
            <input type="number" class="kalk-input" id="inputKytky" min="1" max="9999" value="10" oninput="calcFromKytky(this.value)">
            <div class="kalk-result">
              <div class="kalk-result-num" id="outCena">$4 550</div>
              <div class="kalk-result-label">celkový náklad</div>
            </div>
          </div>
          <div class="kalk-arrow">⇄</div>
          <div class="kalk-block">
            <div class="kalk-block-label">Dostupný budget</div>
            <input type="number" class="kalk-input" id="inputBudget" min="0" value="4550" oninput="calcFromBudget(this.value)" style="border-color:rgba(0,200,80,0.18)">
            <div class="kalk-result" style="background:rgba(0,200,80,0.05);border-color:rgba(0,200,80,0.14)">
              <div class="kalk-result-num" id="outKytky" style="color:#00C853">10</div>
              <div class="kalk-result-label">kytek lze zasadit</div>
            </div>
          </div>
        </div>
        <div class="slider-wrap">
          <input type="range" class="slider" id="kytkySlider" min="1" max="200" value="10" oninput="sliderChange(this.value)" style="--pct:4.5%">
          <div class="slider-labels"><span>1</span><span>50</span><span>100</span><span>150</span><span>200 kytek</span></div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:1.5rem">
      <div class="card-header"><span class="card-title">Detailní rozpad nákladů</span><span class="card-badge" id="bdKytkyLabel">10 kytek</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem">
        <div>
          <div style="font-size:0.55rem;letter-spacing:0.24em;text-transform:uppercase;color:var(--silver);margin-bottom:0.8rem">Položky celkem</div>
          <div class="breakdown-row"><div class="bd-label">Konev s vodou <span style="color:var(--text-muted);margin-left:0.3rem" id="bd-konev-qty">(10×)</span></div><div class="green" id="bd-konev">$200</div></div>
          <div class="breakdown-row"><div class="bd-label">Semínko <span style="color:var(--text-muted);margin-left:0.3rem" id="bd-seminko-qty">(10×)</span></div><div class="green" id="bd-seminko">$500</div></div>
          <div class="breakdown-row"><div class="bd-label">Hnojivo <span style="color:var(--text-muted);margin-left:0.3rem" id="bd-hnojivo-qty">(10×)</span></div><div class="green" id="bd-hnojivo">$250</div></div>
          <div class="breakdown-row"><div class="bd-label">Kvalitní hnojivo <span style="color:var(--text-muted);margin-left:0.3rem" id="bd-khnojivo-qty">(40×)</span></div><div class="green" id="bd-khnojivo">$2 000</div></div>
          <div class="breakdown-row"><div class="bd-label">Výživná voda <span style="color:var(--text-muted);margin-left:0.3rem" id="bd-voda-qty">(40×)</span></div><div class="green" id="bd-voda">$1 600</div></div>
          <div class="breakdown-row"><div class="bd-label" style="font-family:'Cinzel',serif">CELKEM</div><div style="font-family:'Cinzel',serif;color:var(--gold)" id="bd-total">$4 550</div></div>
        </div>
        <div>
          <div style="font-size:0.55rem;letter-spacing:0.24em;text-transform:uppercase;color:var(--silver);margin-bottom:0.8rem">Přehled investice</div>
          <div class="breakdown-row"><div class="bd-label">Celkový náklad</div><div style="color:var(--gold)" id="ov-naklad">$4 550</div></div>
          <div class="breakdown-row"><div class="bd-label">Počet kytek</div><div id="ov-kytky">10</div></div>
          <div class="breakdown-row"><div class="bd-label">Náklad / kytka</div><div>$455</div></div>
          <div style="margin-top:1.2rem;padding-top:1rem;border-top:1px solid var(--border)">
            <div style="font-size:0.55rem;letter-spacing:0.24em;text-transform:uppercase;color:var(--silver);margin-bottom:0.6rem">Největší položka</div>
            <div class="profit-bar"><div class="profit-fill" id="profitFill" style="width:44%"></div></div>
            <div style="font-size:0.64rem;color:var(--text-muted);margin-top:0.4rem">Kvalitní hnojivo (44% nákladů)</div>
          </div>
        </div>
      </div>
    </div>

  </main>
  <script>
    const COST_PER = 455;
    const ITEMS = [
      { id:'konev',    qty:1, unit:20 },
      { id:'seminko',  qty:1, unit:50 },
      { id:'hnojivo',  qty:1, unit:25 },
      { id:'khnojivo', qty:4, unit:50 },
      { id:'voda',     qty:4, unit:40 },
    ];

    function fmt(n) { return '$' + Math.round(n).toLocaleString('cs-CZ'); }

    function updateAll(kytky) {
      kytky = Math.max(1, Math.floor(kytky));
      const total = kytky * COST_PER;
      document.getElementById('outCena').textContent = fmt(total);
      document.getElementById('outKytky').textContent = kytky.toLocaleString('cs-CZ');
      document.getElementById('bdKytkyLabel').textContent = kytky + ' kytek';
      ITEMS.forEach(it => {
        const tq = it.qty * kytky;
        document.getElementById('bd-' + it.id).textContent = fmt(tq * it.unit);
        document.getElementById('bd-' + it.id + '-qty').textContent = '(' + tq + '×)';
      });
      document.getElementById('bd-total').textContent = fmt(total);
      document.getElementById('ov-naklad').textContent = fmt(total);
      document.getElementById('ov-kytky').textContent = kytky.toLocaleString('cs-CZ');
      const slider = document.getElementById('kytkySlider');
      const clamped = Math.min(kytky, 200);
      slider.value = clamped;
      slider.style.setProperty('--pct', ((clamped - 1) / 199 * 100).toFixed(1) + '%');
    }

    function calcFromKytky(v) { const k=parseInt(v)||1; document.getElementById('inputBudget').value=k*COST_PER; updateAll(k); }
    function calcFromBudget(v) { const k=Math.max(1,Math.floor((parseFloat(v)||0)/COST_PER)); document.getElementById('inputKytky').value=k; updateAll(k); }
    function sliderChange(v) { document.getElementById('inputKytky').value=v; calcFromKytky(v); }
    updateAll(10);
  </script>
  </body></html>`;
}

app.listen(PORT, () => console.log(`🌐 Albion web běží na http://localhost:${PORT}`));
