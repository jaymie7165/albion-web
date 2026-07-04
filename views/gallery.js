// gallery.js — Albion v3 · Galerie organizace

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderGallery(req) {
  const canManage = (req.session.realAccessLevel || req.session.accessLevel) === 1;
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Albion — Galerie</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'galerie')}
  <main>
    <div class="page-header"><div>
      <div class="page-label">Organizace Albion</div>
      <h1 class="page-title">Galerie</h1>
      <p class="page-sub">Kronika frakce ve fotografiích</p>
    </div></div>
    ${canManage ? `<div class="card" style="margin-bottom:2rem">
      <div class="card-header"><span class="card-title">Přidat fotografii</span></div>
      <input type="file" id="gal-file" accept="image/*" style="margin-bottom:0.8rem">
      <input type="text" id="gal-caption" placeholder="Popisek…" style="margin-bottom:0.8rem">
      <button class="btn-submit" onclick="uploadGalleryImage()">Nahrát</button>
    </div>` : ''}
    <div id="gal-loading" class="ledger-loading">Načítám galerii…</div>
    <div id="gal-grid" class="gal-grid"></div>
  </main>
  <div class="toast" id="toast"></div>
  <script>
    const CAN_MANAGE=${canManage};
    async function loadGallery(){
      const res=await fetch('/api/gallery',{cache:'no-store'});
      const d=await res.json();
      document.getElementById('gal-loading').style.display='none';
      const grid=document.getElementById('gal-grid');
      if(!d.ok||!d.items.length){grid.innerHTML=ledgerEmptyHTML('Galerie je zatím prázdná');return;}
      grid.innerHTML=d.items.map(it=>
        '<div class="gal-item">'+(CAN_MANAGE?'<button class="gal-del" onclick="delGalleryItem(&quot;'+it.id+'&quot;)">✕</button>':'')+
        '<img src="'+it.image+'" loading="lazy">'+
        '<div class="gal-caption">'+(it.caption||'')+'</div>'+
        '<div class="gal-meta">'+it.pridal+' · '+new Date(it.createdAt).toLocaleDateString('cs-CZ')+'</div>'+
      '</div>').join('');
    }
    async function uploadGalleryImage(){
      const f=document.getElementById('gal-file').files[0];
      if(!f)return showToast('Vyber soubor',true);
      const reader=new FileReader();
      reader.onload=async()=>{
        const res=await fetch('/api/gallery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:reader.result,caption:document.getElementById('gal-caption').value})});
        const d=await res.json();
        if(d.ok){if(window.albionSealThud)window.albionSealThud();showToast('Fotka přidána');loadGallery();}else showToast(d.error,true);
      };
      reader.readAsDataURL(f);
    }
    async function delGalleryItem(id){
      if(!confirm('Smazat fotku?'))return;
      const res=await fetch('/api/gallery/'+id,{method:'DELETE'});
      const d=await res.json();
      if(d.ok)loadGallery();else showToast(d.error,true);
    }
    loadGallery();
  </script>
  </body></html>`;
}

module.exports = { renderGallery };
