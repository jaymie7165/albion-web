// leaderboard.js — Albion v3 · Žebříček aktivity členů

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderLeaderboard(req) {
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Albion — Leaderboard aktivity</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'leaderboard')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Albion</div>
        <h1 class="page-title">Aktivita členů</h1>
        <p class="page-sub">Kdo nejvíc pracuje pro frakci — bez ohledu na finance</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Žebříček aktivity.</strong> Počítá počet zápisů do skladu (zbraně, weed, drogy, chemikálie) za celou historii. Neukazuje finance ani citlivá data.</p>
    <div id="lb-loading" class="ledger-loading">Načítám žebříček…</div>
    <div id="lb-list"></div>
  </main>
  <script>
    function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    function medalIcon(i){return i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1).padStart(2,'0');}
    async function loadLB(){
      const res=await fetch('/api/leaderboard',{cache:'no-store'});
      const d=await res.json();
      document.getElementById('lb-loading').style.display='none';
      const wrap=document.getElementById('lb-list');
      if(!d.leaderboard||!d.leaderboard.length){wrap.innerHTML=ledgerEmptyHTML('Zatím žádná aktivita');return;}
      const max=d.leaderboard[0].acts||1;
      wrap.innerHTML=d.leaderboard.map((m,i)=>
        '<div class="ledger-bar-row">'+
          '<span class="ledger-bar-name">'+medalIcon(i)+' '+esc(m.member)+'</span>'+
          '<span class="ledger-bar-track"><span class="ledger-bar-fill" style="width:'+Math.max(1.5,(m.acts/max)*100)+'%"></span></span>'+
          '<span class="ledger-bar-val">'+m.acts+' akcí</span>'+
        '</div>'
      ).join('');
    }
    loadLB();
  </script>
  </body></html>`;
}

module.exports = { renderLeaderboard };
