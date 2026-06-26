// garaz.js — Albion v3 · Heraldická garáž

const { baseStyles, ledgerEmpty } = require('./styles');
const { renderNav } = require('./nav');

function renderGaraz(req) {
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Albion — Garáž</title>
  ${baseStyles()}
  <style>
    .garage-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:1.6rem}

    .car-card{
      background:var(--panel2);border:1px solid var(--border);
      overflow:hidden;transition:border-color 0.2s,transform 0.2s;
      box-shadow:var(--shadow-card);position:relative;display:flex;flex-direction:column;
    }
    .car-card::before{content:'';position:absolute;top:0;left:0;width:14px;height:14px;border-top:1px solid var(--brass-dim);border-left:1px solid var(--brass-dim);z-index:2}
    .car-card::after{content:'';position:absolute;bottom:0;right:0;width:14px;height:14px;border-bottom:1px solid var(--brass-dim);border-right:1px solid var(--brass-dim);z-index:2}
    .car-card:hover{border-color:var(--border-brass);transform:translateY(-3px)}

    .car-photo{
      width:100%;aspect-ratio:16/10;background:var(--panel3);
      position:relative;overflow:hidden;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;
    }
    .car-photo img{width:100%;height:100%;object-fit:cover;display:block}
    .car-photo-empty{
      display:flex;flex-direction:column;align-items:center;gap:0.5rem;
      color:var(--ivory-faint);font-family:var(--font-label);font-size:0.56rem;
      letter-spacing:0.12em;text-transform:uppercase;
    }
    .car-photo-empty svg{width:28px;height:28px;opacity:0.3}

    /* SPZ štítek — heraldický styl */
    .car-plate{
      position:absolute;left:0.8rem;bottom:0.8rem;
      background:var(--ivory);color:#15110C;
      font-family:var(--font-label);font-weight:700;font-size:0.88rem;letter-spacing:0.1em;
      padding:0.3rem 0.75rem;
      border:2px solid #15110C;
      box-shadow:0 4px 16px rgba(0,0,0,0.5);
    }

    .car-body{padding:1.3rem 1.4rem 1.4rem;display:flex;flex-direction:column;gap:0.6rem;flex:1}
    .car-name{font-family:var(--font-display);font-weight:600;font-style:italic;font-size:1.1rem;color:var(--ivory);line-height:1.2}
    .car-price{font-family:var(--font-display);font-size:0.95rem;color:var(--brass);font-weight:700;font-style:italic}
    .car-price .tag{font-family:var(--font-label);font-size:0.52rem;color:var(--ivory-faint);letter-spacing:0.1em;text-transform:uppercase;margin-left:0.4rem}
    .car-meta{display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:0.72rem;color:var(--ivory-faint);padding:0.3rem 0;border-top:1px solid var(--border)}
    .car-meta span:first-child{color:var(--brass);font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;font-family:var(--font-label)}
    .car-purpose{font-family:var(--font-body);font-size:0.82rem;color:var(--ivory-dim);line-height:1.6;margin-top:0.2rem;flex:1;font-weight:300}
    .car-actions{display:flex;gap:0.5rem;margin-top:0.6rem}
    .car-action-btn{
      flex:1;padding:0.5rem;background:transparent;
      border:1px solid var(--border-brass);
      color:var(--ivory-dim);font-family:var(--font-label);font-size:0.56rem;
      letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;
      transition:all 0.15s;
    }
    .car-action-btn:hover{border-color:var(--brass);color:var(--brass-bright)}
    .car-action-btn.danger:hover{border-color:var(--oxblood-bright);color:var(--oxblood-bright)}

    /* Upload zone */
    .upload-zone{
      border:1px solid var(--border-brass);
      padding:1.6rem;text-align:center;cursor:pointer;
      transition:border-color 0.2s,background 0.2s;position:relative;
      background:var(--input-bg);min-height:130px;
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.6rem;
      overflow:hidden;
    }
    .upload-zone:hover,.upload-zone.drag-over{border-color:var(--brass);background:var(--brass-faint)}
    .upload-zone svg{width:26px;height:26px;color:var(--ivory-faint);flex-shrink:0}
    .upload-zone-text{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--ivory-faint);line-height:1.8}
    .upload-zone-text strong{color:var(--brass)}
    .upload-preview{width:100%;height:100%;position:absolute;inset:0;object-fit:cover}
    .upload-clear{
      position:absolute;top:0.5rem;right:0.5rem;z-index:2;
      width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,0.7);
      color:var(--ivory);border:1px solid rgba(255,255,255,0.2);cursor:pointer;
      display:none;align-items:center;justify-content:center;font-size:0.85rem;line-height:1;
    }
    .upload-zone.has-image .upload-clear{display:flex}
    .upload-zone.has-image .upload-zone-text,.upload-zone.has-image svg{display:none}

    @media(max-width:640px){.garage-grid{grid-template-columns:1fr}}
  </style>
  </head><body>
  ${renderNav(req, 'garaz')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Albion — Majetek organizace</div>
        <h1 class="page-title">Garáž</h1>
        <p class="page-sub">Vozový park, SPZ, hodnota a určení každého vozu</p>
      </div>
      <button class="quick-btn primary" onclick="openCarModal()" style="flex-shrink:0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><path d="M12 5v14M5 12h14"/></svg>
        <span>Přidat vůz</span>
      </button>
    </div>
    <p class="folio-footnote"><strong>Vozový park.</strong> Každý záznam nese SPZ, model, cenu v San Andreas Dollars (PDM), kdo vůz pořídil a k čemu slouží. Záznamy vidí všichni členové.</p>

    <div id="garage-loading" class="ledger-loading">Načítám vozový park…</div>
    <div id="garage-grid" class="garage-grid"></div>
  </main>

  <!-- Modal -->
  <div class="modal-overlay" id="carModal">
    <div class="modal-box" id="carModalBox" style="max-width:500px">
      <div class="modal-title" id="carModalTitle">Přidat vůz</div>
      <div class="modal-subtitle">Vyplň údaje. Fotku vlož přes Ctrl+V nebo nahraj ze souboru.</div>

      <div class="form-group" style="margin-bottom:1rem">
        <label>Fotka vozu</label>
        <div class="upload-zone" id="uploadZone" tabindex="0">
          <button type="button" class="upload-clear" id="uploadClear" onclick="clearCarImage(event)">✕</button>
          <img class="upload-preview" id="uploadPreview" style="display:none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          <div class="upload-zone-text"><strong>Klikni</strong> pro výběr &nbsp;·&nbsp; <strong>Ctrl+V</strong> screenshot</div>
        </div>
        <input type="file" id="carImageFile" accept="image/*" style="display:none">
      </div>

      <div class="form-row">
        <div class="form-group"><label>SPZ</label><input type="text" id="car-spz" placeholder="ABC 123" maxlength="12"></div>
        <div class="form-group"><label>Cena (SAD)</label><input type="number" id="car-cena" min="0" placeholder="250000"></div>
      </div>
      <div class="form-group" style="margin-bottom:0.85rem"><label>Model / název vozu</label><input type="text" id="car-nazev" placeholder="Obey Tailgater…"></div>
      <div class="form-group" style="margin-bottom:0.85rem"><label>Kdo vůz koupil</label><input type="text" id="car-kupil" placeholder="IC jméno"></div>
      <div class="form-group" style="margin-bottom:0.5rem"><label>K čemu slouží</label><textarea id="car-ucel" placeholder="Krátký popis…" rows="3"></textarea></div>

      <div class="modal-actions">
        <button class="modal-btn-cancel" onclick="closeCarModal()">Zrušit</button>
        <button class="modal-btn-confirm" id="carModalConfirmBtn" onclick="submitCar()">Uložit vůz</button>
      </div>
    </div>
  </div>
  <div class="toast" id="toast"></div>

  <script>
    var _garageHandlers={};
    window.openCarModal=function(){_garageHandlers.open&&_garageHandlers.open();};
    window.closeCarModal=function(){_garageHandlers.close&&_garageHandlers.close();};
    window.editCar=function(id){_garageHandlers.edit&&_garageHandlers.edit(id);};
    window.deleteCar=function(id){_garageHandlers.del&&_garageHandlers.del(id);};
    window.submitCar=function(){_garageHandlers.submit&&_garageHandlers.submit();};
    window.clearCarImage=function(e){_garageHandlers.clearImg&&_garageHandlers.clearImg(e);};

    document.addEventListener('DOMContentLoaded',function(){
      let CARS=[],editingCarId=null,pendingImageData=null;
      function esc(s){return(s==null?'':String(s)).replace(/</g,'&lt;');}
      function money(n){return '$'+Math.round(n||0).toLocaleString('cs-CZ');}

      function carCardHtml(car){
        const photo=car.image
          ?'<img src="'+esc(car.image)+'" alt="'+esc(car.nazev)+'" loading="lazy">'
          :'<div class="car-photo-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>Bez fotky</div>';
        return '<div class="car-card">'+
          '<div class="car-photo">'+photo+'<div class="car-plate">'+esc(car.spz)+'</div></div>'+
          '<div class="car-body">'+
            '<div class="car-name">'+esc(car.nazev)+'</div>'+
            '<div class="car-price">'+money(car.cena)+'<span class="tag">PDM · SAD</span></div>'+
            '<div class="car-meta"><span>Koupil</span><span>'+esc(car.kupil)+'</span></div>'+
            (car.ucel?'<div class="car-purpose">'+esc(car.ucel)+'</div>':'<div class="car-purpose" style="color:var(--ivory-faint);font-style:italic">Účel nezadán</div>')+
            '<div class="car-actions">'+
              '<button class="car-action-btn" onclick="editCar(&quot;'+car.id+'&quot;)">Upravit</button>'+
              '<button class="car-action-btn danger" onclick="deleteCar(&quot;'+car.id+'&quot;)">Smazat</button>'+
            '</div>'+
          '</div>'+
        '</div>';
      }

      function renderGarage(){
        const grid=document.getElementById('garage-grid');
        if(!CARS.length){grid.innerHTML=ledgerEmptyHTML('Garáž je prázdná — žádný vůz nebyl dosud zapsán');return;}
        grid.innerHTML=CARS.map(carCardHtml).join('');
      }

      async function loadGarage(){
        try{
          const res=await fetch('/api/garage',{cache:'no-store'});
          const data=await res.json();
          document.getElementById('garage-loading').style.display='none';
          CARS=data.cars||[];renderGarage();
        }catch(e){document.getElementById('garage-loading').textContent='Chyba načtení: '+e.message;}
      }

      function resetCarForm(){
        ['car-spz','car-cena','car-nazev','car-kupil','car-ucel'].forEach(id=>document.getElementById(id).value='');
        pendingImageData=null;setUploadPreview(null);editingCarId=null;
      }
      function openCarModal(){resetCarForm();document.getElementById('carModalTitle').textContent='Přidat vůz';document.getElementById('carModalConfirmBtn').textContent='Uložit vůz';document.getElementById('carModal').classList.add('open');}
      function closeCarModal(){document.getElementById('carModal').classList.remove('open');}
      function editCar(id){
        const car=CARS.find(c=>c.id===id);if(!car)return;
        resetCarForm();editingCarId=id;
        document.getElementById('car-spz').value=car.spz||'';
        document.getElementById('car-cena').value=car.cena||'';
        document.getElementById('car-nazev').value=car.nazev||'';
        document.getElementById('car-kupil').value=car.kupil||'';
        document.getElementById('car-ucel').value=car.ucel||'';
        if(car.image)setUploadPreview(car.image);
        document.getElementById('carModalTitle').textContent='Upravit vůz';
        document.getElementById('carModalConfirmBtn').textContent='Uložit změny';
        document.getElementById('carModal').classList.add('open');
      }
      async function deleteCar(id){
        const car=CARS.find(c=>c.id===id);if(!car)return;
        if(!confirm('Smazat vůz '+car.spz+' ('+car.nazev+')?'))return;
        const res=await fetch('/api/garage/'+id,{method:'DELETE'});
        const data=await res.json();
        if(data.ok){showToast('Vůz odstraněn');loadGarage();}else showToast(data.error||'Chyba',true);
      }

      function setUploadPreview(src){
        const zone=document.getElementById('uploadZone');
        const img=document.getElementById('uploadPreview');
        if(src){img.src=src;img.style.display='block';zone.classList.add('has-image');}
        else{img.src='';img.style.display='none';zone.classList.remove('has-image');}
      }
      function clearCarImage(e){e.stopPropagation();pendingImageData='';setUploadPreview(null);}
      function fileToDataUrl(file,cb){
        if(!file||!file.type||!file.type.startsWith('image/'))return;
        const reader=new FileReader();reader.onload=()=>cb(reader.result);reader.readAsDataURL(file);
      }

      _garageHandlers.open=openCarModal;_garageHandlers.close=closeCarModal;
      _garageHandlers.edit=editCar;_garageHandlers.del=deleteCar;
      _garageHandlers.submit=submitCar;_garageHandlers.clearImg=clearCarImage;

      const uploadZone=document.getElementById('uploadZone');
      const carImageFile=document.getElementById('carImageFile');
      uploadZone.addEventListener('click',(e)=>{if(document.getElementById('carModal').classList.contains('open'))carImageFile.click();});
      carImageFile.addEventListener('change',(e)=>{const f=e.target.files&&e.target.files[0];fileToDataUrl(f,(d)=>{pendingImageData=d;setUploadPreview(d);});});
      uploadZone.addEventListener('dragover',(e)=>{e.preventDefault();uploadZone.classList.add('drag-over');});
      uploadZone.addEventListener('dragleave',()=>uploadZone.classList.remove('drag-over'));
      uploadZone.addEventListener('drop',(e)=>{e.preventDefault();uploadZone.classList.remove('drag-over');const f=e.dataTransfer.files&&e.dataTransfer.files[0];fileToDataUrl(f,(d)=>{pendingImageData=d;setUploadPreview(d);});});
      function handlePaste(e){const items=e.clipboardData&&e.clipboardData.items;if(!items)return;for(const item of items){if(item.type&&item.type.startsWith('image/')){const f=item.getAsFile();fileToDataUrl(f,(d)=>{pendingImageData=d;setUploadPreview(d);});e.preventDefault();break;}}}
      uploadZone.addEventListener('paste',handlePaste);
      document.addEventListener('paste',(e)=>{if(document.getElementById('carModal').classList.contains('open'))handlePaste(e);});

      async function submitCar(){
        const spz=document.getElementById('car-spz').value.trim();
        const cena=document.getElementById('car-cena').value;
        const nazev=document.getElementById('car-nazev').value.trim();
        const kupil=document.getElementById('car-kupil').value.trim();
        const ucel=document.getElementById('car-ucel').value.trim();
        if(!spz)return showToast('Vyplň SPZ vozu',true);
        if(!nazev)return showToast('Vyplň model / název',true);
        if(!cena||parseFloat(cena)<=0)return showToast('Vyplň platnou cenu',true);
        const btn=document.getElementById('carModalConfirmBtn');
        btn.disabled=true;btn.textContent='Ukládám…';
        const payload={spz,cena,nazev,kupil,ucel};
        if(pendingImageData!==null)payload.image=pendingImageData;
        try{
          const url=editingCarId?'/api/garage/'+editingCarId:'/api/garage';
          const method=editingCarId?'PUT':'POST';
          const res=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
          const data=await res.json();
          if(data.ok){showToast(editingCarId?'Vůz upraven':'Vůz zapsán');closeCarModal();loadGarage();}
          else showToast(data.error||'Chyba',true);
        }catch(e){showToast('Chyba sítě: '+e.message,true);}
        btn.disabled=false;btn.textContent=editingCarId?'Uložit změny':'Uložit vůz';
      }

      document.getElementById('carModal').addEventListener('click',(e)=>{if(e.target===e.currentTarget)closeCarModal();});
      document.addEventListener('keydown',(e)=>{if(e.key==='Escape'&&document.getElementById('carModal').classList.contains('open'))closeCarModal();});

      loadGarage();
      (window.evtSource||new EventSource('/api/events')).addEventListener('garageUpdate',()=>setTimeout(loadGarage,400));
    });
  </script>
  </body></html>`;
}

module.exports = { renderGaraz };
