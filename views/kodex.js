// views/kodex.js — CALEDONIA · Kodex (redesign, obsah beze změny)

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderKodex(req) {
  const articles = [
    { num: 'I',    title: 'Loajalita',      text: 'Caledonia stojí na důvěře. Člen, který jedná proti zájmům organizace nebo vědomě poškozuje její jméno, jedná proti všem jejím členům.' },
    { num: 'II',   title: 'Diskrétnost',    text: 'Interní záležitosti Caledonie zůstávají uvnitř Caledonie. Informace, kontakty, plány ani záležitosti organizace nejsou určeny pro veřejnost.' },
    { num: 'III',  title: 'Reprezentace',   text: 'Každý člen reprezentuje Caledonii svým jednáním. Respekt si budujeme chováním, ne hlasitými slovy.' },
    { num: 'IV',   title: 'Profesionalita', text: 'Impulzivní rozhodnutí vytváří problémy. Každý člen je povinen přemýšlet nad následky svých činů a jednat s rozvahou.' },
    { num: 'V',    title: 'Jednota',        text: 'Vnitřní spory se řeší uvnitř organizace. Osobní konflikty nesmí ohrozit společné zájmy Caledonie.' },
    { num: 'VI',   title: 'Ambice',         text: 'Caledonia není místem pro lidi bez cílů. Každý člen by měl usilovat o vlastní rozvoj i rozvoj celé organizace.' },
    { num: 'VII',  title: 'Důvěra',         text: 'Důvěra není právo. Je to výsada, kterou si člověk získává svými činy.' },
    { num: 'VIII', title: 'Respekt',        text: 'Respekt je základ každého vztahu. Ať už jde o spojence, obchodní partnery nebo konkurenci, Caledonia jedná s úctou a profesionálním přístupem.' },
    { num: 'IX',   title: 'Odpovědnost',    text: 'Každý člen nese odpovědnost za své činy. Výhody členství přichází společně s povinnostmi.' },
    { num: 'X',    title: 'Caledonia nade vše', text: 'Osobní zájmy nesmí ohrozit stabilitu organizace. Dlouhodobý úspěch Caledonie je důležitější než krátkodobý prospěch jednotlivce.' },
  ];

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Kodex</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'kodex')}
  <main>
    <div class="page-header">
      <div><div class="page-label">Organizace Caledonia</div><h1 class="page-title">Kodex</h1><p class="page-sub">Principy a zásady, které definují každého člena Caledonie</p></div>
    </div>
    <p class="folio-footnote"><strong>Závazný řád organizace.</strong> Deset základních principů, závazných pro každého člena bez výjimky.</p>

    <div style="display:grid;grid-template-columns:1fr 220px;gap:2.4rem;align-items:start">
      <div>
        ${articles.map(a => `
          <div style="padding:1.6rem 0;border-bottom:1px solid var(--border)">
            <div style="font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.24em;text-transform:uppercase;color:var(--brass);margin-bottom:0.6rem">Článek ${a.num}</div>
            <div style="font-family:var(--font-display);font-size:1.3rem;color:var(--ivory);margin-bottom:0.7rem">${a.title}</div>
            <div style="font-family:var(--font-body);font-size:0.86rem;line-height:1.85;color:var(--ivory-dim);font-weight:300">${a.text}</div>
          </div>`).join('')}
      </div>
      <div>
        <div class="folio-label" style="margin-bottom:1rem">Obsah</div>
        ${articles.map(a => `<div style="display:flex;gap:0.7rem;padding:0.5rem 0;border-bottom:1px solid var(--border);font-size:0.78rem;color:var(--ivory-dim)"><span style="font-family:var(--font-label);color:var(--brass);font-weight:600;min-width:1.4rem">${a.num}</span><span>${a.title}</span></div>`).join('')}
      </div>
    </div>
  </main>
  </body></html>`;
}

module.exports = { renderKodex };
