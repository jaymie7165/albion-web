// views/leaderboard.js — CALEDONIA · Aktivita (redesign, stejné /api/leaderboard)

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderLeaderboard(req) {
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Aktivita</title>
  ${baseStyles()}
  <style>
    .lb-row{display:grid;grid-template-columns:2.2rem 1fr auto;gap:1rem;align-items:center;padding:0.85rem 0;border-bottom:1px solid var(--border)}
    .lb-row:last-child{border-bottom:none}
    .lb-rank{font-family:var(--font-display);font-size:1.1rem;color:var(--brass);opacity:0.6}
    .lb-row:nth-child(1) .lb-rank,.lb-row:nth-child(2) .lb-rank,.lb-row:nth-child(3) .lb-rank{opacity:1;color:var(--brass-bright)}
    .lb-name{font-family:var(--font-display);font-size:1rem;color:var(--ivory)}
    .lb-track{height:2px;background:var(--border);margin-top:0.4rem;position:relative}
    .lb-fill{height:100%;background:var(--oxblood-bright)}
    .lb-count{font-family:var(--font-mono);font-size:0.8rem;color:var(--ivory-dim);white-space:nowrap}
  </style>
  </head><body>
  ${renderNav(req, 'leaderboard')}
  <main>
    <div class="page-header">
      <div><div class="page-label">Organizace Caledonia</div><h1 class="page-title">Aktivita členů</h1><p class="page-sub">Kdo nejvíc pracuje pro frakci — bez ohledu na finance</p></div>
    </div>
    <p class="folio-footnote"><strong>Žebříček aktivity.</strong> Počet zápisů do skladu (zbraně, weed, drogy, chemikálie) za celou historii.</p>
    <div id="lb-loading" class="ledger-loading">Načítám žebříček…</div>
    <div id="lb-list"></div>
  </main>
  <script>
    function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    async function loadLB(){
      const res=await fetch('/api/leaderboard',{cache:'no-store'});
      const d=await res.json();
      document.getElementById('lb-loading').style.display='none';
      const wrap=document.getElementById('lb-list');
      if(!d.leaderboard||!d.leaderboard.length){wrap.innerHTML=ledgerEmptyHTML('Zatím žádná aktivita');return;}
      const max=d.leaderboard[0].acts||1;
      wrap.innerHTML=d.leaderboard.map((m,i)=>
        '<div class="lb-row"><span class="lb-rank">'+String(i+1).padStart(2,'0')+'</span>'+
        '<div><span class="lb-name">'+esc(m.member)+'</span><div class="lb-track"><div class="lb-fill" style="width:'+Math.max(1.5,(m.acts/max)*100)+'%"></div></div></div>'+
        '<span class="lb-count">'+m.acts+' akcí</span></div>'
      ).join('');
    }
    loadLB();
  </script>
  </body></html>`;
}

module.exports = { renderLeaderboard };
