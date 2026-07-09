// bazar.js — Albion v4 · Vnitřní bazar organizace
// Viditelné pro úplně každou hodnost (level 3 = bez omezení, viz roles.js).
// Položka: foto + popis + cena. Kdokoliv se může přihlásit se zájmem a svou
// nabídnutou cenou. Když prodávající PŘIJME zájemce a zájemce zápis
// POTVRDÍ (obě strany), obchod se uzavře, položka dostane pečeť "PRODÁNO"
// a zmizí z aktivní nabídky. Nová položka i uzavřený obchod jdou i do
// Discord kanálu #bazar (server.js / discord.js).

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderBazar(req) {
  const icName = req.session.icName;
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Bazar</title>
  ${baseStyles()}
  <style>
    .bazar-toolbar{display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;margin-bottom:1.6rem;flex-wrap:wrap}
    .bazar-filter{display:flex;gap:0.4rem}
    .bazar-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.4rem}
    .bazar-item{background:var(--panel2);border:1px solid var(--border);overflow:hidden;position:relative;display:flex;flex-direction:column;transition:border-color .2s,transform .2s}
    .bazar-item:hover{border-color:var(--border-brass);transform:translateY(-2px)}
    .bazar-item.sold{opacity:0.7}
    .bazar-photo{width:100%;aspect-ratio:4/3;background:var(--panel3);overflow:hidden;display:flex;align-items:center;justify-content:center;position:relative}
    .bazar-photo img{width:100%;height:100%;object-fit:cover;display:block}
    .bazar-photo-empty{color:var(--ivory-faint);font-family:var(--font-mono);font-size:0.66rem}
    .bazar-body{padding:1.1rem 1.2rem 1.3rem;display:flex;flex-direction:column;gap:0.5rem;flex:1}
    .bazar-name{font-family:var(--font-display);font-weight:600;font-style:italic;font-size:1.05rem;color:var(--ivory)}
    .bazar-price{font-family:var(--font-display);font-size:1.2rem;color:var(--brass);font-weight:700;font-style:italic}
    .bazar-desc{font-family:var(--font-body);font-size:0.82rem;color:var(--ivory-dim);line-height:1.6;flex:1}
    .bazar-meta{font-family:var(--font-mono);font-size:0.64rem;color:var(--ivory-faint);border-top:1px solid var(--border);padding-top:0.5rem;margin-top:0.2rem}
    .bazar-actions{display:flex;gap:0.5rem;margin-top:0.4rem}
    .bazar-btn{flex:1;padding:0.55rem;background:transparent;border:1px solid var(--border-brass);color:var(--ivory-dim);font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:all .15s}
    .bazar-btn:hover{border-color:var(--brass);color:var(--brass-bright)}
    .bazar-btn.danger:hover{border-color:var(--oxblood-bright);color:var(--oxblood-bright)}
    .bazar-seal{position:absolute;top:50%;right:0.8rem;transform:translateY(-50%) rotate(-9deg);width:76px;height:76px;
      background-image:url('/pecet.png');background-size:contain;background-repeat:no-repeat;background-position:center;
      filter:drop-shadow(0 8px 16px rgba(0,0,0,.5));opacity:0;pointer-events:none;z-index:3}
    .bazar-item.sold .bazar-seal{opacity:1;animation:contSealStamp .5s cubic-bezier(.3,.05,.5,1) 1}
    .bazar-sold-tag{position:absolute;top:0.6rem;left:0.6rem;background:var(--oxblood);color:var(--ivory);font-family:var(--font-label);font-size:0.52rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.2rem 0.55rem;z-index:3}
    .zajemci-list{margin-top:0.6rem;display:flex;flex-direction:column;gap:0.4rem}
    .zajemce-row{display:flex;justify-content:space-between;align-items:center;gap:0.6rem;padding:0.4rem 0.6rem;background:var(--panel3);border:1px solid var(--border);font-family:var(--font-mono);font-size:0.72rem}
    .zajemce-row .accept-btn{background:none;border:1px solid rgba(58,125,45,.4);color:#6FBF52;font-size:0.6rem;padding:0.2rem 0.5rem;cursor:pointer;font-family:var(--font-label);letter-spacing:.06em;text-transform:uppercase}
    .upload-zone{border:1px solid var(--border-brass);padding:1.4rem;text-align:center;cursor:pointer;position:relative;background:var(--input-bg);min-height:110px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;overflow:hidden}
    .upload-zone:hover{border-color:var(--brass);background:var(--brass-faint)}
    .upload-zone svg{width:24px;height:24px;color:var(--ivory-faint)}
    .upload-preview{width:100%;height:100%;position:absolute;inset:0;object-fit:cover}
    .upload-zone.has-image svg,.upload-zone.has-image .uz-text{display:none}
  </style>
  </head><body>
  ${renderNav(req, 'bazar')}
  <main>
    <div class="bazar-toolbar">
      <div>
        <div class="page-label">Caledonia — Vnitřní tržiště</div>
        <h1 class="page-title">Bazar</h1>
        <p class="page-sub">Nabídni něco k prodeji nebo se přihlas o koupi — vidí a nakupuje kdokoliv v organizaci</p>
      </div>
      <button class="quick-btn primary" onclick="openNewModal()">+ Nabídnout k prodeji</button>
    </div>
    <p class="folio-footnote"><strong>Jak to funguje.</strong> Zájemce se přihlásí s vlastní nabídkou ceny. Prodávající vybere zájemce, kterého přijímá — obchod se ale uzavře <strong>až po potvrzení obou stran</strong>. Poté je nabídka označena razítkem <strong>PRODÁNO</strong>. Nové nabídky se automaticky posílají i do interního kanálu bazaru.</p>

    <div id="bazar-loading" class="ledger-loading">Načítám bazar…</div>
    <div id="bazar-grid" class="bazar-grid"></div>
  </main>

  <div class="modal-overlay" id="bazarModal">
    <div class="modal-box" style="max-width:480px">
      <div class="modal-title">Nabídnout k prodeji</div>
      <div class="modal-subtitle">Fotku vlož přes Ctrl+V nebo klikni a vyber soubor.</div>
      <div class="form-group" style="margin-bottom:1rem">
        <div class="upload-zone" id="bazarUploadZone" tabindex="0">
          <img class="upload-preview" id="bazarPreview" style="display:none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          <div class="uz-text" style="font-family:var(--font-mono);font-size:0.62rem;color:var(--ivory-faint)">Klikni / Ctrl+V</div>
        </div>
        <input type="file" id="bazarFile" accept="image/*" style="display:none">
      </div>
      <div class="form-group" style="margin-bottom:0.85rem"><label>Název položky</label><input type="text" id="bz-nazev" placeholder="Např. Sportovní vůz…"></div>
      <div class="form-group" style="margin-bottom:0.85rem"><label>Cena (SAD)</label><input type="number" id="bz-cena" min="0" placeholder="15000"></div>
      <div class="form-group" style="margin-bottom:0.5rem"><label>Popis</label><textarea id="bz-popis" rows="3" placeholder="Stav, důvod prodeje…"></textarea></div>
      <div class="modal-actions">
        <button class="modal-btn-cancel" onclick="closeNewModal()">Zrušit</button>
        <button class="modal-btn-confirm" id="bazarSubmitBtn" onclick="submitBazarItem()">Zveřejnit nabídku</button>
      </div>
    </div>
  </div>
  <div class="toast" id="toast"></div>

  <script>
    const ME = ${JSON.stringify(icName)};
    let ITEMS = [];
    function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    function money(n){return '$'+Math.round(n||0).toLocaleString('cs-CZ');}

    async function loadBazar(){
      const res = await fetch('/api/bazar', { cache:'no-store' });
      const d = await res.json();
      document.getElementById('bazar-loading').style.display='none';
      ITEMS = d.items||[];
      renderGrid();
    }

    function itemHtml(it){
      const isMine = it.prodavajici === ME;
      const photo = it.image ? '<img src="'+esc(it.image)+'" loading="lazy">' : '<div class="bazar-photo-empty">Bez fotky</div>';
      const zajemHtml = (it.zajemci||[]).map(function(z){
        const jeAcc = it.vybranyZajemce === z.jmeno;
        return '<div class="zajemce-row"><span>'+esc(z.jmeno)+' — '+money(z.nabidka)+(jeAcc?' <strong style="color:var(--brass-bright)">(vybráno)</strong>':'')+'</span>'+
          (isMine && !it.prodano ? '<button class="accept-btn" onclick="vyberZajemce(\\''+it.id+'\\',\\''+z.jmeno.replace(/\'/g,"&#39;")+'\\')">'+(jeAcc?'Vybráno':'Vybrat')+'</button>' : '')+
        '</div>';
      }).join('');
      let actionHtml = '';
      if (it.prodano) {
        actionHtml = '<div class="bazar-meta">Prodáno '+esc(it.dohodnutaCena!=null?money(it.dohodnutaCena):'')+' — '+esc(it.kupec||'')+'</div>';
      } else if (isMine) {
        actionHtml = '<div class="zajemci-list">'+(zajemHtml || '<div style="color:var(--ivory-faint);font-family:var(--font-mono);font-size:0.68rem">Zatím nikdo neprojevil zájem</div>')+'</div>'+
          (it.vybranyZajemce ? '<button class="bazar-btn" style="margin-top:0.5rem" onclick="potvrditProdej(\\''+it.id+'\\')">Potvrdit prodej (prodávající)</button>' : '')+
          '<button class="bazar-btn danger" style="margin-top:0.4rem" onclick="zrusitNabidku(\\''+it.id+'\\')">Stáhnout nabídku</button>';
      } else {
        const mujZajem = (it.zajemci||[]).find(function(z){return z.jmeno===ME;});
        actionHtml = mujZajem
          ? ('<div class="bazar-meta">Tvůj zájem: '+money(mujZajem.nabidka)+(it.vybranyZajemce===ME?' — <strong style="color:var(--brass-bright)">vybráno prodávajícím</strong>':'')+'</div>'+
             (it.vybranyZajemce===ME ? '<button class="bazar-btn" onclick="potvrditProdej(\\''+it.id+'\\')">Potvrdit koupi (kupující)</button>' : ''))
          : ('<div class="form-group" style="margin-bottom:0.4rem"><input type="number" id="nab-'+it.id+'" placeholder="Tvoje nabídka $" min="0"></div>'+
             '<button class="bazar-btn" onclick="projevitZajem(\\''+it.id+'\\')">Mám zájem</button>');
      }
      return '<div class="bazar-item'+(it.prodano?' sold':'')+'">'+
        (it.prodano ? '<div class="bazar-sold-tag">PRODÁNO</div>' : '')+
        '<div class="bazar-photo">'+photo+(it.prodano?'<div class="bazar-seal"></div>':'')+'</div>'+
        '<div class="bazar-body">'+
          '<div class="bazar-name">'+esc(it.nazev)+'</div>'+
          '<div class="bazar-price">'+money(it.cena)+'</div>'+
          (it.popis?('<div class="bazar-desc">'+esc(it.popis)+'</div>'):'')+
          '<div class="bazar-meta">Nabízí '+esc(it.prodavajici)+'</div>'+
          actionHtml+
        '</div>'+
      '</div>';
    }

    function renderGrid(){
      const grid = document.getElementById('bazar-grid');
      if(!ITEMS.length){ grid.innerHTML = ledgerEmptyHTML('Bazar je zatím prázdný', false, 'stock'); return; }
      const active = ITEMS.filter(function(i){return !i.prodano;});
      const sold = ITEMS.filter(function(i){return i.prodano;});
      grid.innerHTML = active.map(itemHtml).join('') + sold.map(itemHtml).join('');
    }

    let pendingImage = null;
    function setPreview(src){
      const zone=document.getElementById('bazarUploadZone'), img=document.getElementById('bazarPreview');
      if(src){ img.src=src; img.style.display='block'; zone.classList.add('has-image'); }
      else { img.src=''; img.style.display='none'; zone.classList.remove('has-image'); }
    }
    function fileToDataUrl(file,cb){
      if(!file||!file.type||!file.type.startsWith('image/'))return;
      const reader=new FileReader(); reader.onload=function(){cb(reader.result);}; reader.readAsDataURL(file);
    }
    const bazarZone=document.getElementById('bazarUploadZone');
    const bazarFile=document.getElementById('bazarFile');
    bazarZone.addEventListener('click', function(){ bazarFile.click(); });
    bazarFile.addEventListener('change', function(e){ const f=e.target.files&&e.target.files[0]; fileToDataUrl(f,function(d){pendingImage=d;setPreview(d);}); });
    bazarZone.addEventListener('paste', function(e){
      const items=e.clipboardData&&e.clipboardData.items; if(!items)return;
      for(const item of items){ if(item.type&&item.type.startsWith('image/')){ const f=item.getAsFile(); fileToDataUrl(f,function(d){pendingImage=d;setPreview(d);}); e.preventDefault(); break; } }
    });

    function openNewModal(){
      pendingImage=null; setPreview(null);
      document.getElementById('bz-nazev').value='';
      document.getElementById('bz-cena').value='';
      document.getElementById('bz-popis').value='';
      document.getElementById('bazarModal').classList.add('open');
    }
    window.openNewModal = openNewModal;
    function closeNewModal(){ document.getElementById('bazarModal').classList.remove('open'); }
    window.closeNewModal = closeNewModal;

    async function submitBazarItem(){
      const nazev=document.getElementById('bz-nazev').value.trim();
      const cena=document.getElementById('bz-cena').value;
      const popis=document.getElementById('bz-popis').value.trim();
      if(!nazev) return showToast('Vyplň název položky', true);
      if(!cena||parseFloat(cena)<=0) return showToast('Vyplň platnou cenu', true);
      const btn=document.getElementById('bazarSubmitBtn'); btn.disabled=true; btn.textContent='Zveřejňuji…';
      const res=await fetch('/api/bazar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nazev,cena,popis,image:pendingImage})});
      const d=await res.json();
      btn.disabled=false; btn.textContent='Zveřejnit nabídku';
      if(d.ok){ if(window.albionSealThud)window.albionSealThud(); showToast('Nabídka zveřejněna'); closeNewModal(); loadBazar(); }
      else showToast(d.error, true);
    }
    window.submitBazarItem = submitBazarItem;

    async function projevitZajem(id){
      const input=document.getElementById('nab-'+id);
      const nabidka=input?input.value:'';
      if(!nabidka||parseFloat(nabidka)<=0) return showToast('Vyplň částku své nabídky', true);
      const res=await fetch('/api/bazar/'+id+'/zajem',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nabidka})});
      const d=await res.json();
      if(d.ok){ showToast('Zájem zaznamenán'); loadBazar(); } else showToast(d.error, true);
    }
    window.projevitZajem = projevitZajem;

    async function vyberZajemce(id, jmeno){
      const res=await fetch('/api/bazar/'+id+'/vyber',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jmeno})});
      const d=await res.json();
      if(d.ok){ showToast('Zájemce vybrán — čeká se na jeho potvrzení'); loadBazar(); } else showToast(d.error, true);
    }
    window.vyberZajemce = vyberZajemce;

    async function potvrditProdej(id){
      if(!confirm('Potvrdit obchod? Po potvrzení obou stran se nabídka uzavře a orazítkuje.')) return;
      const res=await fetch('/api/bazar/'+id+'/potvrdit',{method:'POST'});
      const d=await res.json();
      if(d.ok){
        if(d.item && d.item.prodano && window.albionSealThud) window.albionSealThud();
        showToast(d.item && d.item.prodano ? 'Obchod uzavřen — prodáno!' : 'Potvrzeno, čeká se na druhou stranu');
        loadBazar();
      } else showToast(d.error, true);
    }
    window.potvrditProdej = potvrditProdej;

    async function zrusitNabidku(id){
      if(!confirm('Stáhnout tuto nabídku z bazaru?')) return;
      const res=await fetch('/api/bazar/'+id,{method:'DELETE'});
      const d=await res.json();
      if(d.ok){ showToast('Nabídka stažena'); loadBazar(); } else showToast(d.error, true);
    }
    window.zrusitNabidku = zrusitNabidku;

    document.getElementById('bazarModal').addEventListener('click', function(e){ if(e.target===e.currentTarget) closeNewModal(); });
    loadBazar();
    (window.evtSource || new EventSource('/api/events')).addEventListener('bazarUpdate', function(){ setTimeout(loadBazar, 400); });
  </script>
  </body></html>`;
}

module.exports = { renderBazar };
