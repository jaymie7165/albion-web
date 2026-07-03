// achievements.js — definice odznaků a logika udělování
const db = require('./db');
const discord = require('./discord');

const ACHIEVEMENTS = {
  first_action:   { label: 'První čin',     desc: 'Provedl první zápis do systému' },
  hundred_ops:    { label: '100 operací',   desc: 'Dosáhl 100 zápisů celkem' },
  first_month:    { label: 'První měsíc',   desc: 'Členem organizace déle než 30 dní' },
  veteran:        { label: 'Veterán',       desc: 'Členem organizace déle než 180 dní' },
  logistics:      { label: 'Logistika',     desc: 'Více než 50 vkladů do skladu' },
};

// Udělí odznak. checkTenureAchievements se volá při KAŽDÉM loginu, takže
// bez téhle kontroly by Discord dostával opakované notifikace pro odznaky,
// které už uživatel dávno má — proto nejdřív ověříme, jestli je odznak
// opravdu nový, a teprve pak pošleme zápis do Discordu.
function grant(userId, key) {
  const radek = db.prepare('SELECT achievements, ic_name, discord_username FROM users WHERE id = ?').get(userId);
  const existing = radek?.achievements || [];
  if (existing.includes(key)) return; // odznak už má, žádná další akce

  db.addAchievement(userId, key);

  const info = ACHIEVEMENTS[key];
  discord
    .notifyVyznamenani(info?.label || key, info?.desc || '', radek?.ic_name || 'Neznámý', radek?.discord_username)
    .catch(err => console.error('[ACHIEVEMENTS] Discord notifikace selhala:', err.message));
}

// Voláno po každém úspěšném zápisu do skladu
function checkActionAchievements(userId, totalActsForUser) {
  if (totalActsForUser === 1) grant(userId, 'first_action');
  if (totalActsForUser === 100) grant(userId, 'hundred_ops');
}

function checkTenureAchievements(userId, createdAtIso) {
  const days = (Date.now() - new Date(createdAtIso).getTime()) / 86400000;
  if (days >= 30) grant(userId, 'first_month');
  if (days >= 180) grant(userId, 'veteran');
}

module.exports = { ACHIEVEMENTS, checkActionAchievements, checkTenureAchievements };
