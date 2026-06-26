// statistiky.js — Albion v3

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderStatistiky(req) {
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Albion — Statistiky</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'statistiky')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Albion</div>
        <h1 class="page-title">Statistiky členů</h1>
        <p class="page-sub">Detailní přehled příspěvků každého člena organizace</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Individuální spisy.</strong> Každý člen má svou kartu — celkové vklady, výběry a finanční pohyby. Zelená (+) jsou vklady, červená (–) výběry.</p>
    <div id="stats-container" class="stats-grid">
      <div class="ledger-loading">Načítám statistiky…</div>
    </div>
  </main>

  <script>
    function renderItemGroup(obj){
      const keys=[...new Set([...Object.keys(obj.vklad||{}),...Object.keys(obj.vyber||{})])];
      if(!keys.length)return '<div style="font-family:var(--font-mono);font-size:0.72rem;color:var(--ivory-faint);padding:0.2rem 0 0.4rem">— žádné záznamy —</div>';
      return keys.map(k=>{
        const v=obj.vklad[k]||0,b=obj.vyber[k]||0;
        return '<div class="stat-row stat-item-group">'+
          '<span>'+k+'</span>'+
          '<span style="display:flex;gap:0.5rem">'+
            (v?'<strong style="color:#6FBF52">+'+v+'</strong>':'')+
            (b?'<strong style="color:var(--oxblood-bright)">-'+b+'</strong>':'')+
          '</span></div>';
      }).join('');
    }

    async function loadStats(){
      const res=await fetch('/api/stats',{cache:'no-store'});
      const data=await res.json();
      const container=document.getElementById('stats-container');
      const stats=data.stats||{};
      const users=Object.keys(stats);
      if(!users.length){container.innerHTML=ledgerEmptyHTML('Žádná data');return;}
      container.innerHTML=users.map((icName,idx)=>{
        const s=stats[icName];
        const hasZbrane=Object.keys({...s.zbrane.vklad,...s.zbrane.vyber}).length>0;
        const hasNaboje=Object.keys({...s.naboje.vklad,...s.naboje.vyber}).length>0;
        const hasAkce=Object.keys({...s.akce.vklad,...s.akce.vyber}).length>0;
        const hasWeed=Object.keys({...s.weed.vklad,...s.weed.vyber}).length>0;
        const hasDrogy=Object.keys({...s.drogy.vklad,...s.drogy.vyber}).length>0;
        const hasChemky=s.chemky&&Object.keys({...s.chemky.vklad,...s.chemky.vyber}).length>0;
        const hasUcet=s.ucet.prijem_usd||s.ucet.vydaj_usd||s.ucet.prijem_pesos||s.ucet.vydaj_pesos;
        return '<div class="stat-card">'+
          '<div class="stat-card-tab">SPIS č. '+String(idx+1).padStart(3,'0')+'</div>'+
          '<div class="stat-card-header">'+
            '<div>'+
              '<div class="stat-card-name">'+icName+'</div>'+
            '</div>'+
          '</div>'+
          (hasZbrane?'<div class="stat-section-label">Zbraně</div>'+renderItemGroup(s.zbrane):'')+
          (hasNaboje?'<div class="stat-section-label">Střelivo</div>'+renderItemGroup(s.naboje):'')+
          (hasAkce?'<div class="stat-section-label">Akce</div>'+renderItemGroup(s.akce):'')+
          (hasWeed?'<div class="stat-section-label">Weed</div>'+renderItemGroup(s.weed):'')+
          (hasDrogy?'<div class="stat-section-label">Drogy</div>'+renderItemGroup(s.drogy):'')+
          (hasChemky?'<div class="stat-section-label">Chemikálie</div>'+renderItemGroup(s.chemky):'')+
          (hasUcet?
            '<div class="stat-section-label">Účetnictví</div>'+
            (s.ucet.prijem_usd?'<div class="stat-row"><span>Příjmy USD</span><strong style="color:#6FBF52">$'+s.ucet.prijem_usd.toLocaleString('cs-CZ')+'</strong></div>':'')+
            (s.ucet.vydaj_usd?'<div class="stat-row"><span>Výdaje USD</span><strong style="color:var(--oxblood-bright)">$'+s.ucet.vydaj_usd.toLocaleString('cs-CZ')+'</strong></div>':'')+
            (s.ucet.prijem_pesos?'<div class="stat-row"><span>Příjmy Pesos</span><strong style="color:#6FBF52">₱'+s.ucet.prijem_pesos.toLocaleString('cs-CZ')+'</strong></div>':'')+
            (s.ucet.vydaj_pesos?'<div class="stat-row"><span>Výdaje Pesos</span><strong style="color:var(--oxblood-bright)">₱'+s.ucet.vydaj_pesos.toLocaleString('cs-CZ')+'</strong></div>':''):'')+
          (!hasZbrane&&!hasNaboje&&!hasAkce&&!hasWeed&&!hasDrogy&&!hasChemky&&!hasUcet?ledgerEmptyHTML('Zatím žádná aktivita',true):'')+
        '</div>';
      }).join('');
    }
    loadStats();
    const evtStats=new EventSource('/api/events');
    ['skladUpdate','ucetUpdate'].forEach(ev=>evtStats.addEventListener(ev,()=>setTimeout(loadStats,1500)));
    setInterval(loadStats,30000);
  </script>
  </body></html>`;
}

module.exports = { renderStatistiky };
