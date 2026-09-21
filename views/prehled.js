// views/prehled.js — CALEDONIA · Rozcestník
//
// Nová stránka. Odkaz "Rozcestník" v postranním menu (nav.js, href
// '/prehled') existoval už dřív, ale žádná route/view pro něj v serveru
// nebyla — proto po kliknutí spadla defaultní Express chyba (Cannot GET
// /prehled). Struktura sekcí + viditelnost podle role kopíruje přesně
// logiku z nav.js (GROUPS), jen navíc s krátkým popiskem ke každé položce.

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');
const { canAccess } = require('../roles');

function renderPrehled(req) {
  const accessLevel = req.session.accessLevel || 3;
  const can = (pageId) => canAccess(accessLevel, pageId);
  const isAssociate = !!req.session.isAssociate;
  const isStaff = accessLevel <= 2;

  const SECTIONS = [
    {
      label: 'Dashboard',
      items: [
        { href: '/home', title: 'Dashboard', desc: 'Přehled organizace, vysílačka, nedávná aktivita a Index Caledonie.' },
      ],
    },
    {
      label: 'Evidence',
      items: [
        isStaff && can('sklad-view') && { href: '/sklad', title: 'Sklad', desc: 'Zápisy zbraní, weedu, drog, chemikálií, financí a směn.' },
        { href: '/weed-sazeni', title: 'Weed', desc: 'Sázení a sklizeň kytek, časovače růstu.' },
        { href: '/garaz', title: 'Garáž', desc: 'Vozový park organizace.' },
        can('nemovitosti') && { href: '/nemovitosti', title: 'Nemovitosti', desc: 'Přehled lokací a nemovitostí organizace.' },
      ].filter(Boolean),
    },
    {
      label: 'Finance',
      items: [
        can('blackbook') && { href: '/blackbook', title: 'Blackbook', desc: 'Finanční přehled organizace.' },
        can('profit-centrum') && { href: '/profit-centrum', title: 'Profit centrum', desc: 'Evidence zisků a obratu.' },
        !isStaff && { href: '/sklad', title: 'Reserve Fund', desc: 'Tvůj týdenní povinný odvod a ceník.' },
        !isStaff && { href: '/home#deposit', title: 'Vklad', desc: 'Rychlý vklad do pokladny.' },
      ].filter(Boolean),
    },
    {
      label: 'Organizace',
      items: [
        can('nastenska') && { href: '/nastenska', title: 'Nástěnka', desc: 'Oznámení vedení organizace.' },
        can('informace') && { href: '/informace', title: 'Informace', desc: 'Interní informace organizace.' },
        { href: '/mentoring', title: 'Mentoring', desc: 'Mentorský program pro nové členy.' },
        { href: '/kodex', title: 'Kodex', desc: 'Pravidla a řád organizace.' },
        { href: '/lore', title: 'Historie', desc: 'Historie a příběh Caledonie.' },
        { href: '/hierarchy', title: 'Hierarchie', desc: 'Struktura organizace a vztahy mezi členy.' },
        can('bazar') && { href: '/bazar', title: 'Bazar', desc: 'Nabídky a poptávky mezi členy.' },
        !isAssociate && { href: '/galerie', title: 'Galerie', desc: 'Fotky a momentky organizace.' },
      ].filter(Boolean),
    },
    {
      label: 'Analytika',
      items: [
        can('audit') && { href: '/audit', title: 'Audit', desc: 'Kompletní historie zápisů všech členů.' },
        !isStaff && { href: '/audit-me', title: 'Moje aktivita', desc: 'Tvoje vlastní historie zápisů.' },
        can('statistiky') && { href: '/statistiky', title: 'Statistiky', desc: 'Statistiky členů organizace.' },
        { href: '/leaderboard', title: 'Aktivita', desc: 'Žebříček aktivity členů.' },
        { href: '/vyznamenani', title: 'Vyznamenání', desc: 'Katalog odznaků a tvůj postup.' },
      ].filter(Boolean),
    },
  ].filter(s => s.items.length);

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Rozcestník</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'navigator')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Caledonia</div>
        <h1 class="page-title">Rozcestník</h1>
        <p class="page-sub">Všechny sekce, na které máš přístup, na jednom místě</p>
      </div>
    </div>
    ${SECTIONS.map(s => `
      <div class="page-label" style="margin-bottom:0.9rem">${s.label}</div>
      <div class="nav-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem;margin-bottom:2rem">
        ${s.items.map(i => `
          <a href="${i.href}" class="nav-card">
            <div class="nav-card-cat">${s.label}</div>
            <div class="nav-card-title">${i.title}</div>
            <div class="nav-card-desc">${i.desc}</div>
          </a>`).join('')}
      </div>`).join('')}
  </main>
  </body></html>`;
}

module.exports = { renderPrehled };
