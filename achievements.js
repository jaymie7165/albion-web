// achievements.js — definice odznaků a logika udělování
const db = require('./db');

const ACHIEVEMENTS = {
  first_action:   { label: 'První čin',     desc: 'Provedl první zápis do systému' },
  hundred_ops:    { label: '100 operací',   desc: 'Dosáhl 100 zápisů celkem' },
  first_month:    { label: 'První měsíc',   desc: 'Členem organizace déle než 30 dní' },
  veteran:        { label: 'Veterán',       desc: 'Členem organizace déle než 180 dní' },
  logistics:      { label: 'Logistika',     desc: 'Více než 50 vkladů do skladu' },
};

// Voláno po každém úspěšném zápisu do skladu
function checkActionAchievements(userId, totalActsForUser) {
  if (totalActsForUser === 1) db.addAchievement(userId, 'first_action');
  if (totalActsForUser === 100) db.addAchievement(userId, 'hundred_ops');
}

function checkTenureAchievements(userId, createdAtIso) {
  const days = (Date.now() - new Date(createdAtIso).getTime()) / 86400000;
  if (days >= 30) db.addAchievement(userId, 'first_month');
  if (days >= 180) db.addAchievement(userId, 'veteran');
}

module.exports = { ACHIEVEMENTS, checkActionAchievements, checkTenureAchievements };
