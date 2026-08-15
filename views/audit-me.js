// views/audit-me.js — CALEDONIA · History (member's own activity, quiet timeline)
// Used by the flat member/associate sidebar item "History". Reuses the
// data already gathered by /api/me/export logic — see PATCH-server.txt for
// the small /api/me/history JSON wrapper.

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderAuditMe(req) {
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — History</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'history')}
  <main>
    <div class="page-header">
      <div><div class="page-label">Caledonia</div><h1 class="page-title">History</h1><p class="page-sub">Tvoje vlastní aktivita v systému</p></div>
    </div>
    <div class="dash-widget">
      <div class="dash-widget-title"><span>Všechny záznamy</span></div>
      <div class="quiet-timeline" id="history-stream"><div class="ledger-loading">Načítám…</div></div>
    </div>
  </main>
  <script>
    function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    fetch('/api/me/history').then(r=>r.json()).then(d=>{
      const stream = document.getElementById('history-stream');
      const items = [];
      (d.zbrane||[]).forEach(r=>items.push({cas:r[0],title:'Zbraně — '+(r[1]||'')+' '+(r[2]||''),sub:(r[3]||'')+' ks'}));
      (d.weed||[]).forEach(r=>items.push({cas:r[0],title:'Weed — '+(r[1]||'')+' '+(r[2]||''),sub:(r[3]||'')+' ks'}));
      (d.drogy||[]).forEach(r=>items.push({cas:r[0],title:'Drogy — '+(r[1]||'')+' '+(r[2]||''),sub:(r[3]||'')+' ks'}));
      (d.chemky||[]).forEach(r=>items.push({cas:r[0],title:'Chemky — '+(r[1]||'')+' '+(r[2]||''),sub:(r[3]||'')+' ks'}));
      (d.ucet||[]).forEach(r=>{
        const sym = (r[3]||'')==='USD'?'SAD ':'₱';
        items.push({cas:r[0],title:'Finance — '+(r[1]||'')+' '+sym+(r[2]||''),sub:r[4]||'—'});
      });
      items.sort((a,b)=>(b.cas||'').localeCompare(a.cas||''));
      if(!items.length){ stream.innerHTML = ledgerEmptyHTML('Zatím žádná aktivita', true); return; }
      stream.innerHTML = items.map(ev => '<div class="qt-row"><div class="qt-time">'+esc((ev.cas||'').slice(0,16))+'</div><div class="qt-main"><div class="qt-title">'+esc(ev.title)+'</div><div class="qt-sub">'+esc(ev.sub)+'</div></div><div class="qt-amount"></div></div>').join('');
    }).catch(()=>{ document.getElementById('history-stream').innerHTML = '<div style="color:var(--ivory-faint)">Nelze načíst</div>'; });
  </script>
  </body></html>`;
}

module.exports = { renderAuditMe };
