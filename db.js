// db.js — jednoduchá JSON databáze (bez nativních závislostí)
const fs   = require('fs');
const path = require('path');
const { writeJsonAtomic } = require('./utils');

// DŮLEŽITÉ: dřív bylo DB_FILE v __dirname (kód appky) — to Railway při
// KAŽDÉM redeployi přepíše čerstvým buildem z gitu, takže se veškerá data
// (uživatelé, achievementy, povýšení, přístupové úrovně) nenávratně
// resetovala. Stejně jako server.js (ceník, katalog, milestones) teď
// ukládáme do trvalého Railway Volume.
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, 'users.json');
const OLD_DB_FILE = path.join(__dirname, 'users.json'); // staré, nepersistentní umístění

// Jednorázová migrace: pokud na novém (trvalém) místě ještě nic není, ale
// na starém místě existující data ano, zkopírujeme je — jinak bychom o ně
// přišli přesně při tomhle redeployi, který má problém opravit.
if (!fs.existsSync(DB_FILE) && fs.existsSync(OLD_DB_FILE)) {
  try {
    fs.copyFileSync(OLD_DB_FILE, DB_FILE);
    console.log('[DB] Migrace users.json do trvalého úložiště (Railway Volume) proběhla úspěšně.');
  } catch (err) {
    console.error('[DB] Migrace users.json selhala:', err.message);
  }
}

function load() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function save(users) {
  writeJsonAtomic(DB_FILE, users);
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

// ── ČÍTAČ VKLADŮ (samostatně od celkových akcí — pro odznak "Logistika") ──
db.incrementDepositCount = (id) => {
  const users = load();
  const u = users.find(x => x.id === id);
  if (!u) return 0;
  u.deposit_count = (u.deposit_count || 0) + 1;
  save(users);
  return u.deposit_count;
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

// ── IC ÚDAJE PRO TRADING KARTU ──
db.setCardData = (id, data) => {
  const users = load();
  const u = users.find(x => x.id === id);
  if (!u) return false;
  if (data.phone !== undefined) u.card_phone = data.phone || null;
  if (data.birthdate !== undefined) u.card_birthdate = data.birthdate || null;
  if (data.bank !== undefined) u.card_bank = data.bank || null;
  if (data.photo !== undefined) u.card_photo = data.photo || null;
  save(users);
  return true;
};

// ── PRO ZOBRAZENÍ HODNOSTI NA TRADING KARTĚ (persistuje poslední známý level) ──
db.setAccessLevel = (id, level) => {
  const users = load();
  const u = users.find(x => x.id === id);
  if (u) { u.access_level = level; save(users); return true; }
  return false;
};

// ── ASSOCIATE STATUS (persistuje se, aby ho server znal i mimo aktivní session —
// potřeba např. pro výjimku z Reserve Fondu, který kontroluje všechny uživatele v DB) ──
db.setIsAssociate = (id, isAssociate) => {
  const users = load();
  const u = users.find(x => x.id === id);
  if (u) { u.is_associate = !!isAssociate; save(users); return true; }
  return false;
};

// ── SOUKROMÍ TRADING KARTY ──
db.setCardPrivate = (id, isPrivate) => {
  const users = load();
  const u = users.find(x => x.id === id);
  if (u) { u.card_private = !!isPrivate; save(users); return true; }
  return false;
};

module.exports = db;
