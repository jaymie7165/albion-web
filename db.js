// db.js — jednoduchá JSON databáze (bez nativních závislostí)
const fs   = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'users.json');

function load() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function save(users) {
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

const db = {
  prepare: (sql) => ({
    get: (...params) => {
      const users = load();
      if (sql.includes('discord_id = ?')) {
        return users.find(u => u.discord_id === params[0]) || null;
      }
      if (sql.includes('id = ?')) {
        return users.find(u => u.id === params[0]) || null;
      }
      return null;
    },
    run: (...params) => {
      const users = load();
      if (sql.includes('INSERT')) {
        const newUser = {
          id: Date.now(),
          discord_id: params[0],
          discord_username: params[1],
          ic_name: params[2],
          password_hash: params[3],
          created_at: new Date().toISOString(),
        };
        users.push(newUser);
        save(users);
        return newUser;
      }
    },
    all: () => load(),
  }),
};

// Zaznamenání posledního přihlášení uživatele (aktivita na webu)
db.setLastLogin = (id, iso) => {
  const users = load();
  const u = users.find(x => x.id === id);
  if (u) { u.last_login_at = iso; save(users); return true; }
  return false;
};


// Uloží pole discord aliasů (jména co bot zapisuje do sheetu) jako JSON string
db.setAliases = (id, aliasesArray) => {
  const users = load();
  const u = users.find(x => x.id === id);
  if (u) { u.discord_aliases = JSON.stringify(aliasesArray); save(users); return true; }
  return false;
};

// Aktualizuje IC jméno uživatele
db.updateIcName = (id, ic_name) => {
  const users = load();
  const u = users.find(x => x.id === id);
  if (u) { u.ic_name = ic_name; save(users); return true; }
  return false;
};
// ── PORTRÉT ČLENA ──
db.setAvatar = (id, avatarUrl) => {
  const users = load();
  const u = users.find(x => x.id === id);
  if (u) { u.avatar_url = avatarUrl || null; save(users); return true; }
  return false;
};

// ── HISTORIE POVÝŠENÍ ──
// Voláno z requireDiscordMember v server.js, když se accessLevel sníží (= vyšší práva)
db.addPromotion = (id, fromLevel, toLevel, fromLabel, toLabel) => {
  const users = load();
  const u = users.find(x => x.id === id);
  if (!u) return false;
  if (!Array.isArray(u.promotions)) u.promotions = [];
  u.promotions.push({
    fromLevel, toLevel, fromLabel, toLabel,
    at: new Date().toISOString(),
  });
  u.pendingPromotionAck = true; // pro gratulační banner při dalším loginu
  save(users);
  return true;
};

db.ackPromotion = (id) => {
  const users = load();
  const u = users.find(x => x.id === id);
  if (u) { u.pendingPromotionAck = false; save(users); return true; }
  return false;
};

// ── ACHIEVEMENTY ──
db.addAchievement = (id, achievementId) => {
  const users = load();
  const u = users.find(x => x.id === id);
  if (!u) return false;
  if (!Array.isArray(u.achievements)) u.achievements = [];
  if (u.achievements.some(a => a.id === achievementId)) return false; // už má
  u.achievements.push({ id: achievementId, at: new Date().toISOString() });
  save(users);
  return true;
};

// ── ČÍTAČ AKCÍ (pro achievementy) ──
db.incrementActionCount = (id) => {
  const users = load();
  const u = users.find(x => x.id === id);
  if (!u) return 0;
  u.action_count = (u.action_count || 0) + 1;
  save(users);
  return u.action_count;
};

// ── ONBOARDING ──
db.markOnboardingSeen = (id) => {
  const users = load();
  const u = users.find(x => x.id === id);
  if (u) { u.onboarding_seen = true; save(users); return true; }
  return false;
};

// ── VYHLEDÁNÍ PODLE IC JMÉNA (pro trading kartu) ──
db.findByIcName = (icName) => {
  const users = load();
  return users.find(u => u.ic_name === icName) || null;
};

module.exports = db;
