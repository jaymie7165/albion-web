// achievements.js — CALEDONIA · katalog vyznamenání + logika udělování
//
// Rozšířeno o kategorie a plný katalog dle zadání. Struktura ACHIEVEMENTS
// zůstává objekt klíč->info (stejné jako dřív), jen navíc s polem
// `cat` (kategorie) a `manual: true` u odznaků, které NEJDOU udělit
// automaticky (udílí je výhradně Founder/Council přes /api/admin/achievements/grant).
//
// BUGFIX (bod 22 v zadání): "First Month" se dřív ukazoval znovu při každém
// loginu, protože checkTenureAchievements() se volala TAKY ze /login/password
// při KAŽDÉM přihlášení, ale grant() sám o sobě je proti duplicitám
// chráněný (viz existing.includes(key) check) — problém byl v Discord
// notifikaci: ta se posílala správně jen jednou, ale front-end (achievements
// widget na kartě/profilu) si stav needo cachoval a UI ho po každém loginu
// "znovu animoval", protože se pořád znovu volal checkTenureAchievements a
// grant() dělal zbytečný lookup. Řešení: grant() teď rovnou vrací false a
// NEPOKRAČUJE (žádné psaní, žádná notifikace) pokud odznak už člen má —
// to už dřív fungovalo — ALE navíc se čítač volání checkTenureAchievements
// přesunul jen na PRVNÍ přihlášení dne (ne každé), aby se to zbytečně
// nekontrolovalo pořád dokola a nezatěžovalo DB zápisy.

const db = require('./db');
const discord = require('./discord');

const ACHIEVEMENTS = {
  // 💰 Finance & obchod
  elite_dealer:    { label: 'Elite Dealer',     desc: 'Vysoký celkový obrat z prodeje',              icon: '💰', cat: 'finance' },
  golden_deal:     { label: 'Golden Deal',      desc: 'Největší uskutečněný obchod',                 icon: '🥇', cat: 'finance', manual: true },
  trezor:          { label: 'Trezor',           desc: 'Vysoký jednorázový vklad',                    icon: '🏦', cat: 'finance' },
  pokladnik:       { label: 'Pokladník',        desc: 'Vysoký kumulativní vklad do pokladny',        icon: '💵', cat: 'finance' },
  midas:           { label: 'Midas',            desc: 'Vysoký celkový zisk',                         icon: '✨', cat: 'finance', manual: true },
  velkoobchodnik:  { label: 'Velkoobchodník',   desc: 'Velké množství prodaného zboží',              icon: '📦', cat: 'finance' },
  prvni_milion:    { label: 'První milion',     desc: 'Dosažení 1M v obratu',                        icon: '💎', cat: 'finance' },
  investor:        { label: 'Investor',         desc: 'Významný příspěvek do společných prostředků', icon: '📈', cat: 'finance', manual: true },
  deal_maker:      { label: 'Deal Maker',       desc: 'Vysoký počet úspěšných obchodů',              icon: '🤝', cat: 'finance' },

  // 🔥 Aktivita & operace
  first_action:    { label: 'První čin',        desc: 'Provedl první zápis do systému',              icon: '✒', cat: 'aktivita' },
  hundred_ops:     { label: '100 operací',      desc: 'Dosáhl 100 zápisů celkem',                    icon: '⚙', cat: 'aktivita' },
  first_month:     { label: 'První měsíc',      desc: 'Členem organizace déle než 30 dní',           icon: '☾', cat: 'aktivita' },
  veteran:         { label: 'Veterán',          desc: 'Členem organizace déle než 180 dní',          icon: '⚔', cat: 'aktivita' },
  logistics:       { label: 'Logistika',        desc: 'Více než 50 vkladů do skladu',                icon: '⬡', cat: 'aktivita' },
  heavy_hitter:    { label: 'Heavy Hitter',     desc: 'Velmi vysoký počet operací',                  icon: '💥', cat: 'aktivita' },
  flawless:        { label: 'Flawless',         desc: 'Dlouhá série úspěšných operací',              icon: '🎯', cat: 'aktivita', manual: true },
  iron_man:        { label: 'Iron Man',         desc: 'Extrémní série aktivity bez vynechání',       icon: '🦾', cat: 'aktivita', manual: true },
  maratonec:       { label: 'Maratonec',        desc: 'Velké množství akcí během jediného dne',      icon: '🏃', cat: 'aktivita' },
  night_owl:       { label: 'Night Owl',        desc: 'Vysoký počet nočních operací',                icon: '🦉', cat: 'aktivita' },
  early_bird:      { label: 'Early Bird',       desc: 'Vysoký počet ranních operací',                icon: '🌅', cat: 'aktivita' },
  weekend_warrior: { label: 'Weekend Warrior',  desc: 'Výrazná víkendová aktivita',                  icon: '🗓', cat: 'aktivita' },
  perfect_attendance:{ label:'Perfect Attendance',desc:'X dní nepřetržité aktivity',                 icon: '📅', cat: 'aktivita' },
  no_days_off:     { label: 'No Days Off',      desc: 'Aktivita během X různých dní v období',       icon: '🔁', cat: 'aktivita' },

  // 👥 Lidé & tým
  recruiter:       { label: 'Recruiter',        desc: 'Přivedení nového člena',                      icon: '🧲', cat: 'lide', manual: true },
  talent_scout:    { label: 'Talent Scout',     desc: 'Přivedení recruita, který se udrží',          icon: '🔎', cat: 'lide', manual: true },
  mentor_badge:    { label: 'Mentor',           desc: 'Pomoc novým členům',                          icon: '🎓', cat: 'lide', manual: true },
  team_player:     { label: 'Team Player',      desc: 'Velké množství společných operací',           icon: '🤲', cat: 'lide', manual: true },
  loyalist:        { label: 'Loyalist',         desc: 'Dlouhodobá aktivita bez odchodu',             icon: '🛡', cat: 'lide', manual: true },
  wingman:         { label: 'Wingman',          desc: 'Vysoký počet asistencí ostatním',             icon: '🕊', cat: 'lide', manual: true },
  connector:       { label: 'Connector',        desc: 'Úspěšné zprostředkování kontaktu',            icon: '🔗', cat: 'lide', manual: true },
  first_responder: { label: 'First Responder',  desc: 'Rychlá pomoc členovi během akce',             icon: '🚨', cat: 'lide', manual: true },
  comeback:        { label: 'Comeback',         desc: 'Úspěch po předchozím neúspěchu',              icon: '↩', cat: 'lide', manual: true },
  perfect_streak:  { label: 'Perfect Streak',   desc: 'Určitý počet úspěchů za sebou',               icon: '🔥', cat: 'lide', manual: true },

  // 🏴 Caledonia / status
  founding_member: { label: 'Founding Member',  desc: 'Člen od začátku / rané fáze',                 icon: '🏴', cat: 'status', manual: true },
  inner_circle:    { label: 'Inner Circle',     desc: 'Speciální podmínka spojená s důvěrou/pozicí', icon: '⭘', cat: 'status', manual: true },
  made_man:        { label: 'Made Man',         desc: 'Dosažení určitého interního statusu',         icon: '♜', cat: 'status', manual: true },
  right_hand:      { label: 'Right Hand',       desc: 'Dlouhodobá podpora vedení',                   icon: '✋', cat: 'status', manual: true },
  old_guard:       { label: 'Old Guard',        desc: 'Historicky významný člen',                    icon: '🗿', cat: 'status', manual: true },

  // 🏆 Milníky
  ops_100:         { label: '100 Ops',          desc: '100 operací',                                 icon: '💯', cat: 'milniky' },
  ops_500:         { label: '500 Ops',          desc: '500 operací',                                 icon: '🔟', cat: 'milniky' },
  ops_1000:        { label: '1000 Ops',         desc: '1000 operací',                                icon: '🏅', cat: 'milniky' },
  quarter_million:  { label: 'Quarter Million', desc: '250 000 obratu',                              icon: '💰', cat: 'milniky' },
  half_million:    { label: 'Half Million',     desc: '500 000 obratu',                              icon: '💰', cat: 'milniky' },
  one_million:     { label: 'One Million',      desc: '1 000 000 obratu',                            icon: '💰', cat: 'milniky' },
  ten_million:     { label: 'Ten Million',      desc: '10 000 000 obratu',                           icon: '👑', cat: 'milniky' },

  // 🎲 Speciální / vzácné
  trendsetter:     { label: 'Trendsetter',      desc: 'Splnění unikátní podmínky poprvé v historii', icon: '🌊', cat: 'special', manual: true },
  lucky_number:    { label: 'Lucky Number',     desc: 'Dosažení konkrétního vzácného čísla',         icon: '🍀', cat: 'special', manual: true },
  completionist:   { label: 'Completionist',    desc: 'Získání všech běžných odznaků',               icon: '🧩', cat: 'special', manual: true },
  collector:       { label: 'Collector',        desc: 'Získání určitého počtu unikátních odznaků',   icon: '🗃', cat: 'special', manual: true },
  elite_cat:       { label: 'Elite',            desc: 'Získání všech odznaků určité kategorie',      icon: '⭐', cat: 'special', manual: true },
  legend:          { label: 'Legend',           desc: 'Získání většiny achievementů',                icon: '🐉', cat: 'special', manual: true },
  hall_of_fame:    { label: 'Hall of Fame',     desc: 'Historický achievement za výjimečný výkon',    icon: '🏛', cat: 'special', manual: true },
};

const CATEGORY_LABELS = {
  finance: 'Finance & obchod',
  aktivita: 'Aktivita & operace',
  lide: 'Lidé & tým',
  status: 'Caledonia / status',
  milniky: 'Milníky',
  special: 'Speciální / vzácné',
};

// Udělí odznak (automaticky i ručně). `udelil` — pokud je vyplněné (IC jméno
// Founder/Council), jde o RUČNÍ udělení a Discord notifikace to zřetelně
// označí jako rozhodnutí vedení (viz discord.notifyVyznamenaniRucne).
function grant(userId, key, udelil) {
  const radek = db.prepare('SELECT achievements, ic_name, discord_username FROM users WHERE id = ?').get(userId);
  const existing = (radek?.achievements || []).map(a => (typeof a === 'string' ? a : a.id));
  if (existing.includes(key)) return false; // odznak už má — žádná další akce, žádná duplicitní notifikace

  db.addAchievement(userId, key);
  const info = ACHIEVEMENTS[key];
  if (!info) return false;

  if (udelil) {
    try {
      const p = discord.notifyVyznamenaniRucne(info.label, info.desc, radek?.ic_name || 'Neznámý', radek?.discord_username, udelil);
      if (p && typeof p.catch === 'function') {
        p.catch(err => console.error('[ACHIEVEMENTS] Discord notifikace (ruční) selhala:', err.message));
      }
    } catch (err) {
      // Pokud discord.notifyVyznamenaniRucne neexistuje / hodí synchronní chybu,
      // dřív to shodilo celý request ještě PŘED odpovědí klientovi (viz .catch()
      // volané na undefined) — odznak se tiše uložil, ale web nikdy nedostal
      // potvrzení a na Discord se nic neposlalo. Teď se to jen zaloguje a
      // pokračuje se dál, ať klient vždy dostane odpověď.
      console.error('[ACHIEVEMENTS] Discord notifikace (ruční) selhala synchronně — zkontroluj, že discord.notifyVyznamenaniRucne existuje:', err.message);
    }
  } else {
    try {
      const p = discord.notifyVyznamenani(info.label, info.desc, radek?.ic_name || 'Neznámý', radek?.discord_username);
      if (p && typeof p.catch === 'function') {
        p.catch(err => console.error('[ACHIEVEMENTS] Discord notifikace selhala:', err.message));
      }
    } catch (err) {
      console.error('[ACHIEVEMENTS] Discord notifikace selhala synchronně:', err.message);
    }
  }
  return true;
}

function checkActionAchievements(userId, totalActsForUser) {
  if (totalActsForUser === 1) grant(userId, 'first_action');
  if (totalActsForUser === 100) { grant(userId, 'hundred_ops'); grant(userId, 'ops_100'); }
  if (totalActsForUser === 500) grant(userId, 'ops_500');
  if (totalActsForUser === 1000) grant(userId, 'ops_1000');
  if (totalActsForUser >= 300) grant(userId, 'heavy_hitter');
}

function checkDepositAchievements(userId, totalDepositsForUser) {
  if (totalDepositsForUser === 50) grant(userId, 'logistics');
}

// BUGFIX: dřív se volalo z /login/password při KAŽDÉM přihlášení, což u
// grant() samo o sobě nezpůsobovalo duplicitní zápis (existing.includes
// kontrola už fungovala), ale zbytečně to při každém loginu znovu počítalo
// datum a dělalo DB lookup. Teď se navíc kontroluje `achievements_checked_at`
// (den v ISO) a mimo první login daného dne se vůbec nevolá — viz server.js
// úprava v `/login/password`.
function checkTenureAchievements(userId, createdAtIso) {
  const days = (Date.now() - new Date(createdAtIso).getTime()) / 86400000;
  if (days >= 30) grant(userId, 'first_month');
  if (days >= 180) grant(userId, 'veteran');
}

// Finanční milníky — voláno z checkFinanceAchievements(userId, celkovyObratUsd)
// po zápisu do Účetnictví/Skladu s dopočítaným kumulativním obratem člena.
function checkFinanceAchievements(userId, celkovyObrat) {
  if (celkovyObrat >= 250_000) grant(userId, 'quarter_million');
  if (celkovyObrat >= 500_000) grant(userId, 'half_million');
  if (celkovyObrat >= 1_000_000) { grant(userId, 'one_million'); grant(userId, 'prvni_milion'); }
  if (celkovyObrat >= 10_000_000) grant(userId, 'ten_million');
}

module.exports = {
  ACHIEVEMENTS, CATEGORY_LABELS,
  grant, checkActionAchievements, checkDepositAchievements, checkTenureAchievements, checkFinanceAchievements,
};
