// achievements.js — definice odznaků a logika udělování
const db = require('./db');
const discord = require('./discord');
 
const ACHIEVEMENTS = {
  first_action:   { label: 'První čin',     desc: 'Provedl první zápis do systému', icon: '✒' },
  hundred_ops:    { label: '100 operací',   desc: 'Dosáhl 100 zápisů celkem', icon: '⚙' },
  first_month:    { label: 'První měsíc',   desc: 'Členem organizace déle než 30 dní', icon: '☾' },
  veteran:        { label: 'Veterán',       desc: 'Členem organizace déle než 180 dní', icon: '⚔' },
  logistics:      { label: 'Logistika',     desc: 'Více než 50 vkladů do skladu', icon: '⬡' },
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
 
// Voláno POUZE po VKLADU do skladu (ne po výběru) — logistics odznak
// sleduje konkrétně počet vkladů, ne všechny akce obecně. Dřív popisek
// odznaku sliboval "50 vkladů", ale kontrolovalo se to na celkovém počtu
// akcí (VKLAD i VÝBĚR dohromady) — teď se počítá samostatný čítač vkladů.
function checkDepositAchievements(userId, totalDepositsForUser) {
  if (totalDepositsForUser === 50) grant(userId, 'logistics');
}
 
function checkTenureAchievements(userId, createdAtIso) {
  const days = (Date.now() - new Date(createdAtIso).getTime()) / 86400000;
  if (days >= 30) grant(userId, 'first_month');
  if (days >= 180) grant(userId, 'veteran');
}
 
module.exports = { ACHIEVEMENTS, checkActionAchievements, checkDepositAchievements, checkTenureAchievements };
 
