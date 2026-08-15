// views/nastenska.js — CALEDONIA · Nástěnka s kategoriemi
// Kategorie: dulezite / personalni / provozni / ostatni (viz styles.js .cat-pill
// a discord.js PATCH — ANNOUNCEMENT_CATEGORIES). Server posílá `category` v
// POST /api/nastenska a v SSE broadcastu (viz PATCH-server.txt bod 3).

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

const CAT_LABELS = { dulezite: 'Důležité', personalni: 'Personální', provozni: 'Provozní', ostatni: 'Ostatní' };

function renderNastenska(req) {
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Nástěnka</title>
  ${baseStyles()}
  <style>
    .nastenska-layout{display:grid;grid-template-columns:2fr 1fr;gap:2rem;align-items:start}
    @media(max-width:860px){.nastenska-layout{grid-template-columns:1fr}}
    .ann-item{padding:1.3rem 0;border-bottom:1px solid var(--border)}
    .ann-item:last-child{border-bottom:none}
    .ann-meta-row{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;flex-wrap:wrap}
    .ann-author{font-family:var(--font-mono);font-size:0.68rem;color:var(--ivory-faint)}
    .ann-title{font-family:var(--font-display);font-size:1.1rem;color:var(--ivory);margin-bottom:0.4rem}
    .ann-content{font-family:var(--font-body);font-size:0.86rem;color:var(--ivory-dim);line-height:1.75;white-space:pre-wrap;font-weight:300}
  </style>
  </head><body>
  ${renderNav(req, 'nastenska')}
  <main>
    <div class="page-header">
      <div><div class="page-label">Organizace Caledonia</div><h1 class="page-title">Nástěnka</h1><p class="page-sub">Oznámení synchronizovaná s Discordem v reálném čase</p></div>
    </div>

    <div class="nastenska-layout">
      <div id="nastenska-list"><div class="ledger-loading" style="padding:2rem 0">Načítám oznámení…</div></div>
      <div class="card">
        <div class="card-header"><span class="card-title">Nové oznámení</span></div>
        <div class="form-group" style="margin-bottom:0.8rem"><label>Kategorie</label>
          <select id="ann-category">
            <option value="dulezite">🔴 Důležité</option>
            <option value="personalni">🟡 Personální</option>
            <option value="provozni">🔵 Provozní</option>
            <option value="ostatni" selected>⚪ Ostatní</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0.8rem"><label>Název</label><input type="text" id="ann-title" placeholder="Důležité oznámení…"></div>
        <div class="form-group" style="margin-bottom:0.8rem"><label>Obsah</label><textarea id="ann-content" placeholder="Napište oznámení…" rows="5"></textarea></div>
        <div class="form-group" style="margin-bottom:1rem"><label>Naplánovat na (volitelné)</label><input type="datetime-local" id="ann-publish-at"></div>
        <button class="btn-submit" onclick="sendAnnouncement()">Zveřejnit oznámení</button>
        <div id="scheduled-wrap" style="margin-top:1.2rem"></div>
      </div>
    </div>
  </main>
  <div class="toast" id="toast"></div>
  <script>
    const CAT_LABELS = ${JSON.stringify(CAT_LABELS)};
    const LAST_ID_KEY='albion_last_ann_id';
    let lastSeenId=localStorage.getItem(LAST_ID_KEY)||'0';
    function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    function catPill(cat){ cat = cat && CAT_LABELS[cat] ? cat : 'ostatni'; return '<span class="cat-pill '+cat+'">'+CAT_LABELS[cat]+'</span>'; }

    async function loadAnnouncements(){
      const res=await fetch('/api/nastenska',{cache:'no-store'});
      const data=await res.json();
      const list=document.getElementById('nastenska-list');
      if(!data.messages||!data.messages.length){list.innerHTML=ledgerEmptyHTML('Žádná oznámení',false,'photo');return;}
      list.innerHTML=data.messages.map((m)=>{
        const dt=new Date(m.timestamp).toLocaleString('cs-CZ',{timeZone:'Europe/Prague'});
        return '<div class="ann-item">'+
          '<div class="ann-meta-row">'+catPill(m.category)+'<span class="ann-author">'+esc(m.author)+' · '+esc(dt)+'</span></div>'+
          (m.title?'<div class="ann-title">'+esc(m.title.replace(/^[🔴🟡🔵⚪]\\s*[A-ZÁ-Ž]+\\s*·\\s*/,'').replace(/^📢\\s*/,''))+'</div>':'')+
          '<div class="ann-content">'+esc(m.content||'')+'</div>'+
        '</div>';
      }).join('');
    }

    async function sendAnnouncement(){
      const category=document.getElementById('ann-category').value;
      const title=document.getElementById('ann-title').value;
      const content=document.getElementById('ann-content').value;
      const publishAtRaw=document.getElementById('ann-publish-at').value;
      if(!content.trim())return showToast('Obsah nemůže být prázdný',true);
      const publishAt=publishAtRaw?new Date(publishAtRaw).toISOString():undefined;
      const res=await fetch('/api/nastenska',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,content,publishAt,category})});
      const data=await res.json();
      if(data.ok){
        showToast(data.scheduled?'Oznámení naplánováno':'Oznámení odesláno');
        document.getElementById('ann-title').value='';document.getElementById('ann-content').value='';document.getElementById('ann-publish-at').value='';
        setTimeout(loadAnnouncements,2000); loadScheduled();
      }else showToast(data.error||'Chyba',true);
    }
    window.sendAnnouncement = sendAnnouncement;

    async function loadScheduled(){
      const wrap=document.getElementById('scheduled-wrap'); if(!wrap)return;
      try{
        const res=await fetch('/api/nastenska/scheduled');
        const d=await res.json();
        if(!d.ok||!d.items.length){wrap.innerHTML='';return;}
        wrap.innerHTML='<div class="folio-label" style="margin-bottom:0.6rem">Naplánovaná</div>'+
          d.items.map(a=>'<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid var(--border);font-size:0.78rem"><span>'+catPill(a.category)+' '+esc(a.title||'Oznámení')+'</span><span>'+esc(new Date(a.publishAt).toLocaleString('cs-CZ'))+' <button onclick="cancelScheduled(\\''+a.id+'\\')" style="background:none;border:1px solid var(--border-oxblood);color:var(--oxblood-bright);margin-left:0.5rem;cursor:pointer;font-size:0.65rem">✕</button></span></div>').join('');
      }catch(e){}
    }
    window.cancelScheduled = async function(id){
      const res=await fetch('/api/nastenska/scheduled/'+id,{method:'DELETE'});
      const d=await res.json();
      if(d.ok){showToast('Zrušeno');loadScheduled();}else showToast(d.error,true);
    };

    const evtSrc=window.evtSource || new EventSource('/api/events');
    evtSrc.addEventListener('nastenska',()=>{lastSeenId='0';setTimeout(loadAnnouncements,1000);});
    loadAnnouncements();setInterval(loadAnnouncements,30000);
    loadScheduled();setInterval(loadScheduled,60000);
  </script>
  </body></html>`;
}

module.exports = { renderNastenska };
