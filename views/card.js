// card.js — Albion v3 · Trading karta člena

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderCard(req, icName) {
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Albion — Karta člena</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, '')}
  <main>
    <div id="card-wrap"><div class="ledger-loading">Načítám kartu…</div></div>
  </main>
  <script>
    async function loadCard(){
      const res=await fetch('/api/card/${encodeURIComponent(icName || '')}');
      const d=await res.json();
      const wrap=document.getElementById('card-wrap');
      if(!d.ok){wrap.innerHTML='<p style="text-align:center;color:var(--ivory-faint)">'+d.error+'</p>';return;}
      const c=d.card;
      wrap.innerHTML='<div class="trading-card">'+
        '<div class="tc-header">'+
          '<img class="tc-avatar" src="'+(c.avatar_url||'/logo.png')+'">'+
          '<div class="tc-name">'+c.ic_name+'</div>'+
          '<div class="tc-discord">@'+(c.discord_username||'—')+'</div>'+
        '</div>'+
        '<div class="tc-body">'+
          '<div class="tc-stat"><span>Členem od</span><strong>'+new Date(c.created_at).toLocaleDateString('cs-CZ')+'</strong></div>'+
          '<div class="tc-stat"><span>Celkem akcí</span><strong>'+c.action_count+'</strong></div>'+
          '<div class="tc-stat"><span>Povýšení</span><strong>'+c.promotions.length+'×</strong></div>'+
          '<div class="folio-label" style="margin-top:1rem">Odznaky</div>'+
          '<div class="tc-badges">'+(c.achievements.length?c.achievements.map(a=>'<span class="tc-badge">'+a.id+'</span>').join(''):'<span style="color:var(--ivory-faint);font-size:0.8rem">žádné zatím</span>')+'</div>'+
        '</div>'+
      '</div>';
    }
    loadCard();
  </script>
  </body></html>`;
}

module.exports = { renderCard };
