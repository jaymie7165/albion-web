// views/prehled.js — CALEDONIA · Rozcestník ("Directory")
// Samostatná stránka. Ukazuje jen sekce, na které má uživatel přístup
// (žádné zamčené/zašedlé položky — dle schváleného zadání).

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');
const { canAccess } = require('../roles');

function renderPrehled(req) {
  const accessLevel = req.session.accessLevel || 3;
  const can = (id) => canAccess(accessLevel, id);
  const isAssociate = !!req.session.isAssociate;

  const SECTIONS = [
    {
      cat: 'Dashboard',
      items: [
        { title: 'Dashboard', desc: 'Přehled aktivity, financí a operací organizace na jednom místě.', href: '/home', ok: true },
      ],
    },
    {
      cat: 'Evidence',
      items: [
        { title: 'Sklad', desc: 'Zbraně, weed, drogy, chemikálie, účetnictví a směnárna organizace.', href: '/sklad', ok: can('sklad-view') },
        { title: 'Weed sázení', desc: 'Ceník, kalkulačka materiálu a sdílené odpočty růstu kytek.', href: '/weed-sazeni', ok: true },
        { title: 'Garáž', desc: 'Vozový park organizace — SPZ, hodnota a určení každého vozu.', href: '/garaz', ok: true },
        { title: 'Nemovitosti', desc: 'Evidence lokací a nemovitostí organizace.', href: '/nemovitosti', ok: can('nemovitosti') },
      ],
    },
    {
      cat: 'Finance',
      items: [
        { title: 'Blackbook', desc: 'Analytické reporty — finance, aktivita, sklad, zbraně, drogy, bezpečnost.', href: '/blackbook', ok: can('blackbook') },
        { title: 'Profit centrum', desc: 'Přehled ziskovosti, žebříčky dealerů a nejvýdělečnějšího zboží.', href: '/profit-centrum', ok: can('profit-centrum') },
        { title: 'Reserve Fund', desc: 'Povinný týdenní odvod, dobrovolné vklady a stav rezervního fondu.', href: '/sklad', ok: true },
      ],
    },
    {
      cat: 'Organization',
      items: [
        { title: 'Nástěnka', desc: 'Oznámení organizace synchronizovaná s Discordem, tříděná dle kategorie.', href: '/nastenska', ok: can('nastenska') },
        { title: 'Osobní spisy', desc: 'Důvěrné poznámky o lidech uvnitř i vně organizace.', href: '/spis', ok: can('spis') },
        { title: 'Mentorský program', desc: 'Strukturovaný proces růstu členů — cíle, checkpointy, hodnocení.', href: '/mentoring', ok: true },
        { title: 'Kodex', desc: 'Deset závazných principů organizace.', href: '/kodex', ok: true },
        { title: 'Historie', desc: 'Kronika organizace od jejího vzniku po současnost.', href: '/lore', ok: true },
        { title: 'Hierarchie', desc: 'Struktura organizace a vztahy mezi členy.', href: '/hierarchy', ok: true },
        { title: 'Bazar', desc: 'Vnitřní tržiště — nabídky, poptávky, obchody mezi členy.', href: '/bazar', ok: can('bazar') },
        { title: 'Galerie', desc: 'Fotokronika organizace.', href: '/galerie', ok: !isAssociate },
      ],
    },
    {
      cat: 'Analytics',
      items: [
        { title: 'Audit', desc: 'Kompletní chronologický záznam všech akcí v systému.', href: '/audit', ok: can('audit') },
        { title: 'Statistiky', desc: 'Detailní přehled příspěvků každého člena organizace.', href: '/statistiky', ok: can('statistiky') },
        { title: 'Aktivita', desc: 'Žebříček aktivity členů — kdo pro frakci pracuje nejvíc.', href: '/leaderboard', ok: true },
        { title: 'Vyznamenání', desc: 'Katalog odznaků, vitrína úspěchů a udílení od vedení.', href: '/vyznamenani', ok: true },
      ],
    },
  ];

  const visibleSections = SECTIONS.map(s => ({ ...s, items: s.items.filter(i => i.ok) })).filter(s => s.items.length);

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Rozcestník</title>
  ${baseStyles()}
  <style>.nav-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem}</style>
  </head><body>
  ${renderNav(req, 'navigator')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Caledonia Private Network</div>
        <h1 class="page-title">Rozcestník</h1>
        <p class="page-sub">Vše, k čemu máš přístup — na jednom místě</p>
      </div>
    </div>

    ${visibleSections.map(s => `
      <div class="folio-label" style="margin-bottom:1rem">${s.cat}</div>
      <div class="nav-grid" style="margin-bottom:2.4rem">
        ${s.items.map(i => `
          <a href="${i.href}" class="nav-card">
            <div class="nav-card-cat">${s.cat}</div>
            <div class="nav-card-title">${i.title}</div>
            <div class="nav-card-desc">${i.desc}</div>
          </a>`).join('')}
      </div>
    `).join('')}
  </main>
  </body></html>`;
}

module.exports = { renderPrehled };
