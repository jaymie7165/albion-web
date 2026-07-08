// roles.js — Albion v3 · Mapování Discord rolí na úroveň přístupu ve webu
//
// Hierarchie (od nejvyšší): Founder > Council > Senior Member > Member > Associate
// Pokud uživatel má víc rolí, použije se ta nejvyšší (nejmenší level číslo).

const ROLE_IDS = {
  FOUNDER:        '1511034407597637712',
  COUNCIL:        '1512329904446771220',
  SENIOR_MEMBER:  '1512330140401795124',
  MEMBER:         '1511034483015680020',
  ASSOCIATE:      '1512330396547682335',
};

// Úroveň 1 = nejvyšší přístup, vyšší číslo = méně práv
const LEVELS = {
  FOUNDER: 1,
  COUNCIL: 1,
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
  audit:           1, // Audit
  statistiky:      2, // Statistiky členů
  blackbook:       1, // Blackbook
  'profit-centrum':1, // Profit centrum
  nastenska:       2, // Nástěnka
  spis:            1, // Osobní spisy členů — jen Founder/Council
  // Volně přístupné všem přihlášeným (level 3 = bez omezení):
  garaz:           3,
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
        <p class="page-sub">Tvoje hodnost na Discordu nemá oprávnění k této sekci.</p>
      </div>
    </div>
    <p class="folio-footnote">Pokud věříš, že je to chyba, kontaktuj Council nebo Foundera organizace.</p>
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

module.exports = { ROLE_IDS, LEVELS, levelFromRoleIds, canAccess, requireAccess, PAGE_ACCESS, isAssociateOnly };
