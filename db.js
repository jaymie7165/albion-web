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

module.exports = db;
