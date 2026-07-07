// utils.js — sdílené helpery napříč appkou
// Vzniklo sloučením logiky, která byla dřív zkopírovaná na několika místech
// (escapování HTML výstupu, atomický zápis JSON úložišť, normalizace jmen
// členů z Discord bota na jejich IC jméno).
const fs = require('fs');
const path = require('path');

// ── ESCAPOVÁNÍ HTML ─────────────────────────────────────────────────────────
// Použij VŽDY, když se uživatelský vstup (IC jméno, poznámka, obsah oznámení…)
// vkládá do HTML řetězce — brání stored XSS.
function escapeHtml(s) {
  return (s == null ? '' : String(s))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── ATOMICKÝ ZÁPIS JSON ──────────────────────────────────────────────────────
// Zapíše do dočasného souboru ve stejné složce (rename je na stejném
// filesystému atomická operace) a teprve pak ho přejmenuje na cílový název.
// Pád procesu uprostřed zápisu tak nikdy nezanechá poškozený/nekompletní JSON.
function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.tmp-${path.basename(filePath)}-${process.pid}-${Date.now()}`);
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

// ── NORMALIZACE JMEN ČLENŮ ───────────────────────────────────────────────────
// Sestaví mapu (lowercase alias -> ic_name) z uživatelů v DB. Sjednocuje
// logiku dřív duplikovanou v /api/stats, /api/audit, /api/leaderboard,
// /api/blackbook a /api/profit-centrum.
function buildNameMap(users) {
  const map = {};
  const icToDiscord = {};
  users.forEach(u => {
    if (!u.ic_name) return;
    map[u.ic_name.toLowerCase()] = u.ic_name;
    if (u.discord_username) { map[u.discord_username.toLowerCase()] = u.ic_name; icToDiscord[u.ic_name] = u.discord_username; }
    if (u.discord_display_name) map[u.discord_display_name.toLowerCase()] = u.ic_name;
    if (u.global_name) map[u.global_name.toLowerCase()] = u.ic_name;
    if (u.discord_aliases) {
      try { JSON.parse(u.discord_aliases).forEach(a => { if (a) map[a.toLowerCase()] = u.ic_name; }); } catch {}
    }
  });
  return { map, icToDiscord };
}

function normalizeName(name, map) {
  if (!name || name === '—' || name === '-') return null;
  const trimmed = name.toString().trim();
  const lower = trimmed.toLowerCase();
  if (map[lower]) return map[lower];
  for (const [key, ic] of Object.entries(map)) {
    if (key.includes(lower) || lower.includes(key)) return ic;
  }
  return trimmed; // neznámý — vrátíme jak je
}

module.exports = { escapeHtml, writeJsonAtomic, buildNameMap, normalizeName };
