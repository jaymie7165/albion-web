// views/audit-me.js — CALEDONIA · Moje aktivita
//
// Nová stránka. Odkaz "Moje aktivita" v postranním menu (nav.js, href
// '/audit-me', vidí ho jen Member/Associate — Senior Member+ má místo toho
// plný "Audit") existoval už dřív, ale route/view chyběly — proto se
// nenačetla vůbec. Data bere z /api/me/history (server.js), který teď
// pokrývá Zbraně, Weed, Drogy, Chemky i Účetnictví filtrované na icName
// přihlášeného člena.

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderAuditMe(req) {
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Moje aktivita</title>
  ${baseStyles()}
  <style>
    .am-section{margin-bottom:2.2rem}
    .am-row{display:flex;justify-content:space-between;gap:1rem;padding:0.6rem 0;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:0.8rem}
    .am-row:last-child{border-bottom:none}
    .am-cas{color:var(--ivory-faint);white-space:nowrap;flex:0 0 auto}
    .am-mid{color:var(--ivory);flex:1 1 auto;text-align:left;padding:0 0.8rem}
    .am-qty{color:var(--brass-bright);white-space:nowrap;flex:0 0 auto;text-align:right}
  </style>
  </head><body>
  ${renderNav(req, 'history')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Caledonia</div>
        <h1 class="page-title">Moje aktivita</h1>
        <p class="page-sub">Tvoje vlastní historie zápisů</p>
      </div>
    </div>
    <div id="am-root"></div>
  </main>
  <script>
    function esc(s){return(s==null?'':String(s)).replace(/</g,'&lt;');}

    const SECTIONS = [
      { key: 'zbrane', label: 'Zbraně a střelivo', cols: [0,1,2,3], icon: 'Zbraně: cas, typ, položka, množství' },
      { key: 'weed',   label: 'Weed',               cols: [0,1,2,3] },
      { key: 'drogy',  label: 'Drogy',               cols: [0,1,2,3] },
      { key: 'chemky', label: 'Chemikálie',          cols: [0,1,2,3] },
      { key: 'ucet',   label: 'Účetnictví',          cols: [0,1,2,3,4] },
    ];

    function rowHtml(key, r){
      if(key === 'ucet'){
        // [cas, typ, castka, valuta, poznamka, uzivatel]
        const sym = (r[3]||'') === 'USD' ? 'SAD ' : '₱';
        return '<div class="am-row"><span class="am-cas">'+esc(r[0])+'</span><span class="am-mid">'+esc(r[1])+' · '+esc(r[4]||'—')+'</span><span class="am-qty">'+(r[1]==='PŘÍJEM'?'+':'-')+sym+esc(r[2])+'</span></div>';
      }
      // [cas, typ, položka, množství, ...]
      return '<div class="am-row"><span class="am-cas">'+esc(r[0])+'</span><span class="am-mid">'+esc(r[1])+' · '+esc(r[2])+'</span><span class="am-qty">'+esc(r[3])+' ks</span></div>';
    }

    async function loadHistory(){
      const root = document.getElementById('am-root');
      root.innerHTML = skeletonRows(5, [1,3,1]);
      try{
        const res = await fetch('/api/me/history');
        const d = await res.json();
        if(!d.ok){ root.innerHTML = '<p style="color:var(--ivory-faint)">Nepodařilo se načíst historii.</p>'; return; }
        const anyData = SECTIONS.some(s => (d[s.key]||[]).length);
        if(!anyData){ root.innerHTML = ledgerEmptyHTML('Zatím žádné zápisy', false); return; }
        root.innerHTML = SECTIONS.map(s => {
          const rows = d[s.key] || [];
          if(!rows.length) return '';
          return '<div class="am-section"><div class="page-label" style="margin-bottom:0.6rem">'+s.label+'</div><div class="card">'+
            rows.map(r => rowHtml(s.key, r)).join('') + '</div></div>';
        }).join('');
      }catch(e){ root.innerHTML = '<p style="color:var(--ivory-faint)">Nepodařilo se načíst historii.</p>'; }
    }
    loadHistory();
  </script>
  </body></html>`;
}

module.exports = { renderAuditMe };
