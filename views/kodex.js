// kodex.js — Albion v3

const { baseStyles } = require('./styles');
const { renderNav } = require('./nav');

function renderKodex(req) {
  const articles = [
    { num: 'I',    title: 'Loajalita',      text: 'Albion stojí na důvěře. Člen, který jedná proti zájmům organizace nebo vědomě poškozuje její jméno, jedná proti všem jejím členům.' },
    { num: 'II',   title: 'Diskrétnost',    text: 'Interní záležitosti Albionu zůstávají uvnitř Albionu. Informace, kontakty, plány ani záležitosti organizace nejsou určeny pro veřejnost.' },
    { num: 'III',  title: 'Reprezentace',   text: 'Každý člen reprezentuje Albion svým jednáním. Respekt si budujeme chováním, ne hlasitými slovy.' },
    { num: 'IV',   title: 'Profesionalita', text: 'Impulzivní rozhodnutí vytváří problémy. Každý člen je povinen přemýšlet nad následky svých činů a jednat s rozvahou.' },
    { num: 'V',    title: 'Jednota',        text: 'Vnitřní spory se řeší uvnitř organizace. Osobní konflikty nesmí ohrozit společné zájmy Albionu.' },
    { num: 'VI',   title: 'Ambice',         text: 'Albion není místem pro lidi bez cílů. Každý člen by měl usilovat o vlastní rozvoj i rozvoj celé organizace.' },
    { num: 'VII',  title: 'Důvěra',         text: 'Důvěra není právo. Je to výsada, kterou si člověk získává svými činy.' },
    { num: 'VIII', title: 'Respekt',        text: 'Respekt je základ každého vztahu. Ať už jde o spojence, obchodní partnery nebo konkurenci, Albion jedná s úctou a profesionálním přístupem.' },
    { num: 'IX',   title: 'Odpovědnost',    text: 'Každý člen nese odpovědnost za své činy. Výhody členství přichází společně s povinnostmi.' },
    { num: 'X',    title: 'Albion nade vše', text: 'Osobní zájmy nesmí ohrozit stabilitu organizace. Dlouhodobý úspěch Albionu je důležitější než krátkodobý prospěch jednotlivce.' },
  ];

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Albion — Kodex</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'kodex')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Albion</div>
        <h1 class="page-title">Kodex</h1>
        <p class="page-sub">Principy a zásady, které definují každého člena Albionu</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Závazný řád organizace.</strong> Kodex Albionu je souborem deseti základních principů, které jsou závazné pro každého člena bez výjimky. Porušení kodexu může vést k disciplinárnímu řízení nebo vyloučení.</p>

    <div class="lore-grid">
      <div class="chapters">
        ${articles.map((a, i) => `
          <div class="chapter">
            <div class="chapter-meta">Článek ${a.num}</div>
            <div class="chapter-title">${a.title}</div>
            <div class="chapter-text${i === 0 ? ' with-dropcap' : ''}">${a.text}</div>
          </div>`).join('')}
      </div>
      <div class="sidebar">
        <div class="sidebar-title">Obsah kodexu</div>
        ${articles.map(a => `
          <div class="toc-item">
            <span class="toc-num">${a.num}</span>
            <span>${a.title}</span>
          </div>`).join('')}
        <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border);font-family:var(--font-display);font-style:italic;font-size:0.95rem;color:var(--ivory-faint);line-height:1.9">
          Kodex Albionu je závazný pro každého člena bez výjimky.
        </div>
      </div>
    </div>
  </main>
  </body></html>`;
}

module.exports = { renderKodex };
