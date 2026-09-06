// roles.js — Albion v3 · Mapování Discord rolí na úroveň přístupu ve webu
//
// Hierarchie (od nejvyšší): Founder > Council > Senior Member > Member > Associate
// Pokud uživatel má víc rolí, použije se ta nejvyšší (nejmenší level číslo).

const ROLE_IDS = {
  FOUNDER:        '1511034407597637712',
  COUNCIL:        '1512329904446771220',
  // GenK (General Koordinátor) — z rozhodnutí vedení má stejné pravomoce
  // jako Founder (level 1), viz LEVELS níže.
  GENERAL_KOORDINATOR: '1512330331343294675',
  SENIOR_MEMBER:  '1512330140401795124',
  MEMBER:         '1511034483015680020',
  ASSOCIATE:      '1512330396547682335',
};

// Úroveň 1 = nejvyšší přístup, vyšší číslo = méně práv
const LEVELS = {
  FOUNDER: 1,
  COUNCIL: 1,
  GENERAL_KOORDINATOR: 1,
  SENIOR_MEMBER: 2,
  MEMBER: 3,
  ASSOCIATE: 3,
};

const ROLE_ID_TO_KEY = Object.fromEntries(Object.entries(ROLE_IDS).map(([k, v]) => [v, k]));

// Z pole Discord role ID (string[]) vrátí nejvyšší úroveň přístupu uživatele (1=nejvíc práv).
// Pokud uživatel nemá žádnou ze sledovaných rolí, vrací nejnižší úroveň (3) — chová se jako Member/Associate.
function levelFromRoleIds(roleIds) {
  if (!Array.isArray(roleIds) || !roleIds.length) return 3;
  let best = 3;
  for (const rid of roleIds) {
    const key = ROLE_ID_TO_KEY[rid];
    if (key && LEVELS[key] < best) best = LEVELS[key];
  }
  return best;
}

// Stránky/sekce vyžadující level <= požadovaná hodnota.
// level 1 = Founder/Council, level 2 = + Senior Member, level 3 = všichni (Member/Associate)
const PAGE_ACCESS = {
  sklad:           2, // Sklad — zápisy zbraně/weed/drogy/chemky/účet/směnárna
  'sklad-view':    3, // Stejná stránka /sklad, ale jen ke čtení Reserve Fondu a Ceníku — vidí každý člen
  audit:           1, // Audit
  statistiky:      2, // Statistiky členů
  blackbook:       1, // Blackbook
  'profit-centrum':1, // Profit centrum
  nastenska:       2, // Nástěnka
  spis:            2, // Osobní spisy členů — Founder/Council/GenK + Senior Member
  bazar:           3, // Bazar — vidí a nakupuje úplně každý přihlášený člen
  mentoring:       3, // Mentorský program — vidí každý, zápisy jen Senior Member výš (řeší se v UI/API)
  // Volně přístupné všem přihlášeným (level 3 = bez omezení):
  garaz:           3,
  nemovitosti:     3, // viditelnost jednotlivých lokací (vsichni/vedeni) se řeší v API, ne na úrovni stránky
  'weed-sazeni':   3,
  kodex:           3,
  lore:            3,
  hierarchy:       3,
  home:            3, // Home má vlastní vnitřní omezení obsahu (ne celé stránky), viz home.js
  profil:          3,
};

function canAccess(level, pageId) {
  const required = PAGE_ACCESS[pageId];
  if (required === undefined) return true; // neznámá stránka — bez omezení
  return level <= required;
}

// Middleware factory — použij jako requireAccess('audit')
function requireAccess(pageId) {
  return (req, res, next) => {
    const level = (req.session && req.session.accessLevel) || 3;
    if (canAccess(level, pageId)) return next();
    const isApi = req.path.startsWith('/api/');
    if (isApi) return res.status(403).json({ ok: false, error: 'Nemáš oprávnění k této sekci' });
    return res.status(403).send(renderForbidden(req));
  };
}

function renderForbidden(req) {
  const { baseStyles } = require('./styles');
  const { renderNav } = require('./nav');
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Přístup odepřen</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, '')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Caledonia</div>
        <h1 class="page-title">Přístup odepřen</h1>
        <p class="page-sub">Tvoje hodnost v organizaci nemá oprávnění k této sekci.</p>
      </div>
    </div>
    <p class="folio-footnote">Pokud věříš, že je to chyba, kontaktuj sekretariát nebo vedení organizace.</p>
  </main>
  </body></html>`;
}

// Vrátí true, pokud uživatel má roli ASSOCIATE (a žádnou vyšší)
function isAssociateOnly(roleIds) {
  if (!Array.isArray(roleIds) || !roleIds.length) return true; // bez rolí = bereme jako nejnižší
  const hasHigher = roleIds.some(rid => ROLE_ID_TO_KEY[rid] && ROLE_ID_TO_KEY[rid] !== 'ASSOCIATE');
  const hasAssociate = roleIds.some(rid => ROLE_ID_TO_KEY[rid] === 'ASSOCIATE');
  return hasAssociate && !hasHigher;
}

// ══════════════════════════════════════════════════════════════════════
// ODDĚLENÍ (department) — Albion v4 · ruční přiřazení na webu
// ══════════════════════════════════════════════════════════════════════
// Nezávislé na Discord rolích — žádná nová Discord role kvůli tomu není
// potřeba. Týká se VÝHRADNĚ Senior Member (accessLevel 2); Founder/Council
// (level 1) mají vždy plný přístup bez ohledu na oddělení, Member/Associate
// (level 3) mají svůj vlastní zjednodušený pohled řešený jinde (memberOnly
// v sklad.js), oddělení se jich netýká.
//
// `skladTabs` — které VEDLEJŠÍ taby Skladu navíc uvidí (nad rámec toho, co
// mají úplně všichni Senior Members — viz SHARED_SENIOR_TABS níže).
// `canManageCenik` — smí upravovat Ceník (jinak jen Founder/Council).
// `fullBlackbook`/`fullStatistiky` — vidí neomezeně, ne jen kurátorovaný
// výsek podle oddělení (zatím jen Head of Financials).
const DEPARTMENTS = {
  weapons: {
    label: 'Head of Weapons',
    skladTabs: ['zbrane'],
  },
  narcotics: {
    label: 'Head of Narcotics',
    skladTabs: ['weed', 'drogy', 'vyroba', 'chemky'],
  },
  members: {
    label: 'Head of Members',
    skladTabs: [],
  },
  financials: {
    label: 'Head of Financials',
    skladTabs: [],
    canManageCenik: true,
    fullBlackbook: true,
    fullStatistiky: true,
  },
};

// Taby Skladu dostupné úplně KAŽDÉMU Senior Member bez ohledu na oddělení
// (dle zadání: Účetnictví, Ceník, Směnárna a Nevyřízené nejsou vázané na
// konkrétní komoditu, takže je vidí každá "hlava").
const SHARED_SENIOR_TABS = ['ucet', 'cenik', 'smena', 'nevyrizene'];

// Taby, které vidí Member/Associate (accessLevel 3) — zjednodušený pohled.
const MEMBER_SKLAD_TABS = ['ucet', 'cenik'];

// Vrátí seznam ID tabů, které smí daný uživatel ve Skladu vidět.
// `null` = bez omezení (Founder/Council vidí úplně všechno).
function getSkladTabsForUser(accessLevel, department) {
  if (accessLevel <= 1) return null;
  if (accessLevel === 2) {
    const dept = DEPARTMENTS[department];
    const extra = dept ? dept.skladTabs : [];
    return [...new Set([...SHARED_SENIOR_TABS, ...extra])];
  }
  return [...MEMBER_SKLAD_TABS];
}

function canAccessSkladTab(accessLevel, department, tabId) {
  const allowed = getSkladTabsForUser(accessLevel, department);
  if (allowed === null) return true;
  return allowed.includes(tabId);
}

// Smí upravovat Ceník? Founder/Council vždy, Head of Financials navíc.
function canManageCenik(accessLevel, department) {
  if (accessLevel === 1) return true;
  if (accessLevel === 2 && department && DEPARTMENTS[department] && DEPARTMENTS[department].canManageCenik) return true;
  return false;
}

function departmentLabel(department) {
  return (DEPARTMENTS[department] && DEPARTMENTS[department].label) || null;
}

module.exports = {
  ROLE_IDS, LEVELS, levelFromRoleIds, canAccess, requireAccess, PAGE_ACCESS, isAssociateOnly,
  DEPARTMENTS, SHARED_SENIOR_TABS, MEMBER_SKLAD_TABS,
  getSkladTabsForUser, canAccessSkladTab, canManageCenik, departmentLabel,
};
