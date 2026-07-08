// kodex.js — Albion v3

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
  <div class="ink-progress-track"><div class="ink-progress-fill" id="inkProgress"></div></div>
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Caledonia</div>
        <h1 class="page-title">Kodex</h1>
        <p class="page-sub">Principy a zásady, které definují každého člena Caledonie</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Závazný řád organizace.</strong> Kodex Caledonie je souborem deseti základních principů, které jsou závazné pro každého člena bez výjimky. Porušení kodexu může vést k disciplinárnímu řízení nebo vyloučení.</p>

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
          Kodex Caledonie je závazný pro každého člena bez výjimky.
        </div>
      </div>
    </div>
  </main>
  <script>
    (function inkFill(){
      const bar=document.getElementById('inkProgress');
      if(!bar)return;
      function tick(){
        const h=document.documentElement;
        const scrolled=h.scrollTop||document.body.scrollTop;
        const max=(h.scrollHeight||document.body.scrollHeight)-h.clientHeight;
        bar.style.width=(max>0?Math.min(100,(scrolled/max)*100):0)+'%';
      }
      document.addEventListener('scroll',tick,{passive:true});
      tick();
    })();
  </script>
  </body></html>`;
}

module.exports = { renderKodex };
