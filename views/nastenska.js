// nastenska.js — Albion v3
 
const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');
 
function renderNastenska(req) {
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Nástěnka</title>
  ${baseStyles()}
  <style>
    .nastenska-layout{display:grid;grid-template-columns:2fr 1fr;gap:2rem;align-items:start}
    @media(max-width:860px){.nastenska-layout{grid-template-columns:1fr}}
  </style>
  </head><body>
  ${renderNav(req, 'nastenska')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Caledonia</div>
        <h1 class="page-title">Nástěnka</h1>
        <p class="page-sub">Oznámení synchronizovaná s Discord kanálem v reálném čase</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Oznámení organizace.</strong> Nástěnka zobrazuje zprávy přímo z interního kanálu a aktualizuje se každých 30 sekund. Odeslaná oznámení se automaticky publikují na Discord.</p>
 
    <div class="nastenska-layout">
      <div>
        <div id="nastenska-list" class="nastenska-list">
          <div class="ledger-loading" style="padding:3rem 0">Načítám oznámení…</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Nové oznámení</span></div>
        <div class="form-group" style="margin-bottom:0.8rem"><label>Název</label><input type="text" id="ann-title" placeholder="Důležité oznámení…"></div>
        <div class="form-group" style="margin-bottom:0.8rem"><label>Obsah</label><textarea id="ann-content" placeholder="Napište oznámení…" rows="5"></textarea></div>
        <div class="form-group" style="margin-bottom:1rem"><label>Naplánovat na (volitelné)</label><input type="datetime-local" id="ann-publish-at"></div>
        <button class="btn-submit" onclick="sendAnnouncement()">Zveřejnit oznámení</button>
        <p style="font-family:var(--font-mono);font-size:0.62rem;color:var(--ivory-faint);margin-top:0.8rem;text-align:center">Odešle se také do Discord kanálu</p>
        <div id="scheduled-wrap" style="margin-top:1.2rem"></div>
      </div>
    </div>
  </main>
 
  <script>
    const LAST_ID_KEY='albion_last_ann_id';
    let lastSeenId=localStorage.getItem(LAST_ID_KEY)||'0';
    function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
 
    async function loadAnnouncements(){
      const res=await fetch('/api/nastenska',{cache:'no-store'});
      const data=await res.json();
      const list=document.getElementById('nastenska-list');
      if(!data.messages||!data.messages.length){list.innerHTML=ledgerEmptyHTML('Žádná oznámení',false,'photo');return;}
      const newest=data.messages[0]?.id||'0';
      list.innerHTML=data.messages.map((m,i)=>{
        const isNew=m.id>lastSeenId&&lastSeenId!=='0'&&i===0;
        const dt=new Date(m.timestamp).toLocaleString('cs-CZ',{timeZone:'Europe/Prague'});
        return '<div class="nastenska-item'+(isNew?' new':'')+'">'+
          '<div class="nastenska-meta">'+esc(m.author)+' &nbsp;·&nbsp; '+esc(dt)+(isNew?'<span class="new-badge">NOVÉ</span>':'')+'</div>'+
          (m.title?'<div class="nastenska-title">'+esc(m.title.replace(/^📢\s*/,''))+'</div>':'')+
          '<div class="nastenska-content">'+esc(m.content||'')+'</div>'+
        '</div>';
      }).join('');
      lastSeenId=newest;localStorage.setItem(LAST_ID_KEY,newest);
    }
 
    async function sendAnnouncement(){
      const title=document.getElementById('ann-title').value;
      const content=document.getElementById('ann-content').value;
      const publishAtRaw=document.getElementById('ann-publish-at').value;
      if(!content.trim())return showToast('Obsah nemůže být prázdný',true);
      const publishAt=publishAtRaw?new Date(publishAtRaw).toISOString():undefined;
      const res=await fetch('/api/nastenska',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,content,publishAt})});
      const data=await res.json();
      if(data.ok){
        if(window.albionSealThud)window.albionSealThud();
        showToast(data.scheduled?'Oznámení naplánováno':'Oznámení odesláno');
        document.getElementById('ann-title').value='';
        document.getElementById('ann-content').value='';
        document.getElementById('ann-publish-at').value='';
        setTimeout(loadAnnouncements,2000);
        loadScheduled();
      }else showToast(data.error||'Chyba',true);
    }
 
    async function loadScheduled(){
      const wrap=document.getElementById('scheduled-wrap');
      if(!wrap)return;
      try{
        const res=await fetch('/api/nastenska/scheduled');
        const d=await res.json();
        if(!d.ok||!d.items.length){wrap.innerHTML='';return;}
        wrap.innerHTML='<div class="folio-label" style="margin-bottom:0.6rem">Naplánovaná oznámení</div>'+
          d.items.map(a=>'<div class="manifest-row"><span class="mr-name">'+esc(a.title||'Oznámení')+'</span><span class="mr-dots"></span><span class="mr-val">'+esc(new Date(a.publishAt).toLocaleString('cs-CZ'))+' <button onclick="cancelScheduled(\\''+a.id+'\\')" style="background:none;border:1px solid var(--border-oxblood);color:var(--oxblood-bright);margin-left:0.5rem;cursor:pointer;font-size:0.65rem">✕</button></span></div>').join('');
      }catch(e){}
    }
    async function cancelScheduled(id){
      const res=await fetch('/api/nastenska/scheduled/'+id,{method:'DELETE'});
      const d=await res.json();
      if(d.ok){showToast('Naplánované oznámení zrušeno');loadScheduled();}else showToast(d.error,true);
    }
    window.cancelScheduled=cancelScheduled;
 
    const evtSrc=new EventSource('/api/events');
    evtSrc.addEventListener('nastenska',()=>{lastSeenId='0';setTimeout(loadAnnouncements,1000);});
    loadAnnouncements();setInterval(loadAnnouncements,30000);
    loadScheduled();setInterval(loadScheduled,60000);
  </script>
  </body></html>`;
}
 
module.exports = { renderNastenska };
 
