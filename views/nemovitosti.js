// views/nemovitosti.js — Albion v5 · Nemovitosti · "Crimson & Cream"
// Beze změny logiky — jen barvy ve stažitelné kartě (canvas export) přepnuté
// na stejnou paletu jako zbytek webu (styles.js).

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderNemovitosti(req) {
  const canManage = req.session.accessLevel === 1; // úprava/mazání jen Founder/Council
  const isVedeni = (req.session.accessLevel || 3) <= 2; // smí označit lokaci jako "jen vedení"
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Nemovitosti</title>
  ${baseStyles()}
  <style>
    .nem-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1.6rem}
    .nem-card{background:var(--panel2);border:1px solid var(--border);overflow:hidden;transition:border-color .2s,transform .2s;box-shadow:var(--shadow-card);position:relative;display:flex;flex-direction:column}
    .nem-card::before{content:'';position:absolute;top:0;left:0;width:14px;height:14px;border-top:1px solid var(--brass-dim);border-left:1px solid var(--brass-dim);z-index:2}
    .nem-card::after{content:'';position:absolute;bottom:0;right:0;width:14px;height:14px;border-bottom:1px solid var(--brass-dim);border-right:1px solid var(--brass-dim);z-index:2}
    .nem-card:hover{border-color:var(--border-brass);transform:translateY(-3px)}
    .nem-photo{width:100%;aspect-ratio:16/10;background:var(--panel3);position:relative;overflow:hidden;flex-shrink:0}
    .nem-photo img{width:100%;height:100%;object-fit:cover;display:block}
    .nem-photo-empty{display:flex;align-items:center;justify-content:center;height:100%;color:var(--ivory-faint);font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.12em;text-transform:uppercase}
    .nem-photo-count{position:absolute;bottom:0.6rem;right:0.6rem;background:rgba(0,0,0,0.65);color:var(--ivory);font-family:var(--font-mono);font-size:0.66rem;padding:0.15rem 0.5rem;border:1px solid rgba(255,222,173,0.4)}
    .nem-postal{position:absolute;left:0.8rem;bottom:0.8rem;background:#F6EEE4;color:#15110C;font-family:var(--font-label);font-weight:700;font-size:0.78rem;letter-spacing:0.08em;padding:0.28rem 0.7rem;border:2px solid #15110C;box-shadow:0 4px 16px rgba(0,0,0,0.5)}
    .nem-vedeni-tag{position:absolute;top:0.6rem;left:0.6rem;background:var(--oxblood);color:var(--ivory);font-family:var(--font-label);font-size:0.5rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.2rem 0.55rem;z-index:3}
    .nem-body{padding:1.2rem 1.3rem 1.3rem;display:flex;flex-direction:column;gap:0.55rem;flex:1}
    .nem-name{font-family:var(--font-display);font-weight:600;font-style:italic;font-size:1.08rem;color:var(--ivory)}
    .nem-price{font-family:var(--font-display);font-size:0.95rem;color:var(--brass);font-weight:700;font-style:italic}
    .nem-desc{font-family:var(--font-body);font-size:0.82rem;color:var(--ivory-dim);line-height:1.6;flex:1}
    .nem-meta{display:flex;justify-content:space-between;gap:0.6rem;font-family:var(--font-mono);font-size:0.64rem;color:var(--ivory-faint);border-top:1px solid var(--border);padding-top:0.5rem}
    .nem-actions{display:flex;gap:0.5rem;margin-top:0.4rem;flex-wrap:wrap}
    .nem-btn{flex:1;padding:0.5rem;background:transparent;border:1px solid var(--border-brass);color:var(--ivory-dim);font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:all .15s;min-width:100px}
    .nem-btn:hover{border-color:var(--brass);color:var(--brass-bright)}
    .nem-btn.danger:hover{border-color:var(--oxblood-bright);color:var(--oxblood-bright)}

    .nem-upload-zone{border:1px dashed var(--border-brass);padding:1.4rem;text-align:center;cursor:pointer;background:var(--input-bg);min-height:100px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.5rem;transition:border-color .2s,background .2s}
    .nem-upload-zone:hover{border-color:var(--brass);background:var(--brass-faint)}
    .nem-upload-zone svg{width:24px;height:24px;color:var(--ivory-faint)}
    .nem-thumbs{display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.8rem}
    .nem-thumb{position:relative;width:76px;height:76px;border:1px solid var(--border-brass);overflow:hidden}
    .nem-thumb img{width:100%;height:100%;object-fit:cover;display:block}
    .nem-thumb button{position:absolute;top:2px;right:2px;width:18px;height:18px;background:rgba(0,0,0,0.7);color:#fff;border:none;cursor:pointer;font-size:0.6rem;line-height:1}
  </style>
  </head><body>
  ${renderNav(req, 'nemovitosti')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Caledonia — Majetek</div>
        <h1 class="page-title">Nemovitosti</h1>
        <p class="page-sub">Evidence lokací organizace — fotky, postal, cena a popis na jednom místě</p>
      </div>
      <button class="quick-btn primary" onclick="openNemModal()">+ Přidat nemovitost</button>
    </div>
    <p class="folio-footnote"><strong>Viditelnost.</strong> Každá lokace může být viditelná pro <strong>všechny členy</strong>, nebo označená jako <strong>jen pro vedení</strong> (Senior Member a výš) — v tom případě ji uvidí pouze oni. Kartu lze kdykoliv stáhnout jako obrázek pro sdílení na Discordu.</p>

    <div id="nem-loading" class="ledger-loading">Načítám nemovitosti…</div>
    <div id="nem-grid" class="nem-grid"></div>
  </main>

  <div class="modal-overlay" id="nemModal">
    <div class="modal-box" id="nemModalBox" style="max-width:560px">
      <div class="modal-title" id="nemModalTitle">Přidat nemovitost</div>
      <div class="modal-subtitle">Fotky vlož přes Ctrl+V nebo klikni a vyber soubory (lze víc najednou).</div>

      <div class="form-group" style="margin-bottom:1rem">
        <label>Fotky</label>
        <div class="nem-upload-zone" id="nemUploadZone" tabindex="0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          <div style="font-family:var(--font-mono);font-size:0.62rem;color:var(--ivory-faint)">Klikni / Ctrl+V — lze přidat víc fotek</div>
        </div>
        <input type="file" id="nemImageFile" accept="image/*" multiple style="display:none">
        <div class="nem-thumbs" id="nemThumbs"></div>
      </div>

      <div class="form-row">
        <div class="form-group"><label>Název</label><input type="text" id="nem-nazev" placeholder="Např. Vila na kopci…"></div>
        <div class="form-group"><label>Postal</label><input type="text" id="nem-postal" placeholder="1234" maxlength="20"></div>
      </div>
      <div class="form-group" style="margin-bottom:0.85rem"><label>Cena (SAD)</label><input type="number" id="nem-cena" min="0" placeholder="250000"></div>
      <div class="form-group" style="margin-bottom:0.85rem"><label>Popis</label><textarea id="nem-popis" rows="3" placeholder="Stav, výhody, poznámky…"></textarea></div>
      ${isVedeni ? `
      <div class="form-group" style="margin-bottom:0.5rem">
        <label>Viditelnost</label>
        <select id="nem-viditelnost">
          <option value="vsichni">Všichni členové</option>
          <option value="vedeni">Jen vedení (Senior Member a výš)</option>
        </select>
      </div>` : `<input type="hidden" id="nem-viditelnost" value="vsichni">`}

      <div class="modal-actions">
        <button class="modal-btn-cancel" onclick="closeNemModal()">Zrušit</button>
        <button class="modal-btn-confirm" id="nemSubmitBtn" onclick="submitNem()">Uložit nemovitost</button>
      </div>
    </div>
  </div>
  <div class="toast" id="toast"></div>

  <script>
    const CAN_MANAGE = ${canManage ? 'true' : 'false'};
    let ITEMS = [];
    let pendingImages = [];
    let editingId = null;

    function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
    function money(n){return '$'+Math.round(n||0).toLocaleString('cs-CZ');}

    async function loadNem(){
      const res = await fetch('/api/nemovitosti', { cache:'no-store' });
      const d = await res.json();
      document.getElementById('nem-loading').style.display='none';
      ITEMS = d.items||[];
      renderGrid();
    }

    function cardHtml(it){
      const photo = (it.images && it.images.length)
        ? '<img src="'+esc(it.images[0])+'" loading="lazy">'
        : '<div class="nem-photo-empty">Bez fotky</div>';
      const countBadge = (it.images && it.images.length>1) ? '<div class="nem-photo-count">+'+(it.images.length-1)+' foto</div>' : '';
      const vedeniTag = it.viditelnost==='vedeni' ? '<div class="nem-vedeni-tag">Jen vedení</div>' : '';
      return '<div class="nem-card">'+
        vedeniTag+
        '<div class="nem-photo">'+photo+'<div class="nem-postal">'+esc(it.postal)+'</div>'+countBadge+'</div>'+
        '<div class="nem-body">'+
          '<div class="nem-name">'+esc(it.nazev)+'</div>'+
          '<div class="nem-price">'+money(it.cena)+'</div>'+
          (it.popis?('<div class="nem-desc">'+esc(it.popis)+'</div>'):'')+
          '<div class="nem-meta"><span>Přidal '+esc(it.pridal)+'</span><span>'+esc(it.createdAtText||'')+'</span></div>'+
          '<div class="nem-actions">'+
            '<button class="nem-btn" onclick="downloadNemCard(&quot;'+it.id+'&quot;)">Stáhnout kartu</button>'+
            (CAN_MANAGE ? (
              '<button class="nem-btn" onclick="editNem(&quot;'+it.id+'&quot;)">Upravit</button>'+
              '<button class="nem-btn danger" onclick="deleteNem(&quot;'+it.id+'&quot;)">Smazat</button>'
            ) : '')+
          '</div>'+
        '</div>'+
      '</div>';
    }

    function renderGrid(){
      const grid = document.getElementById('nem-grid');
      if(!ITEMS.length){ grid.innerHTML = ledgerEmptyHTML('Zatím žádná evidovaná nemovitost', false, 'stock'); return; }
      grid.innerHTML = ITEMS.map(cardHtml).join('');
    }

    // ── UPLOAD (víc fotek) ──
    function renderThumbs(){
      const wrap = document.getElementById('nemThumbs');
      wrap.innerHTML = pendingImages.map(function(src,i){
        return '<div class="nem-thumb"><img src="'+src+'"><button type="button" onclick="removeNemImage('+i+')">✕</button></div>';
      }).join('');
    }
    function removeNemImage(i){ pendingImages.splice(i,1); renderThumbs(); }
    window.removeNemImage = removeNemImage;

    // Zmenší obrázek (screenshoty a fotky z mobilu bývají řádově MB) na rozumnou
    // velikost pro web, ať se pak zbytečně neposílají desítky MB v JSON body.
    function resizeImage(file, maxDim, quality){
      maxDim = maxDim || 1600; quality = quality || 0.82;
      return new Promise(function(resolve){
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = function(){
          let { width, height } = img;
          if(width > maxDim || height > maxDim){
            const scale = maxDim / Math.max(width, height);
            width = Math.round(width*scale); height = Math.round(height*scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = function(){ URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
      });
    }

    async function addFilesToPending(files){
      for(const f of [...files]){
        if(!f||!f.type||!f.type.startsWith('image/'))continue;
        if(pendingImages.length>=8){ showToast('Max 8 fotek na nemovitost', true); break; }
        const resized = await resizeImage(f);
        if(resized){ pendingImages.push(resized); renderThumbs(); }
        else showToast('Fotku se nepodařilo zpracovat, zkus jinou', true);
      }
    }
    const nemZone = document.getElementById('nemUploadZone');
    const nemFile = document.getElementById('nemImageFile');
    nemZone.addEventListener('click', function(){ nemFile.click(); });
    nemFile.addEventListener('change', function(e){ addFilesToPending(e.target.files); nemFile.value=''; });
    nemZone.addEventListener('paste', function(e){
      const items = e.clipboardData && e.clipboardData.items; if(!items)return;
      for(const item of items){ if(item.type && item.type.startsWith('image/')){ addFilesToPending([item.getAsFile()]); e.preventDefault(); } }
    });
    document.addEventListener('paste', function(e){
      if(!document.getElementById('nemModal').classList.contains('open'))return;
      const items=e.clipboardData&&e.clipboardData.items; if(!items)return;
      for(const item of items){ if(item.type&&item.type.startsWith('image/')){ addFilesToPending([item.getAsFile()]); } }
    });

    function openNemModal(){
      editingId = null;
      pendingImages = [];
      document.getElementById('nemModalTitle').textContent = 'Přidat nemovitost';
      document.getElementById('nem-nazev').value='';
      document.getElementById('nem-postal').value='';
      document.getElementById('nem-cena').value='';
      document.getElementById('nem-popis').value='';
      const vid = document.getElementById('nem-viditelnost'); if(vid) vid.value='vsichni';
      renderThumbs();
      document.getElementById('nemModal').classList.add('open');
    }
    window.openNemModal = openNemModal;
    function closeNemModal(){ document.getElementById('nemModal').classList.remove('open'); }
    window.closeNemModal = closeNemModal;

    function editNem(id){
      const it = ITEMS.find(function(x){return x.id===id;}); if(!it)return;
      editingId = id;
      pendingImages = (it.images||[]).slice();
      document.getElementById('nemModalTitle').textContent = 'Upravit nemovitost';
      document.getElementById('nem-nazev').value = it.nazev||'';
      document.getElementById('nem-postal').value = it.postal||'';
      document.getElementById('nem-cena').value = it.cena||'';
      document.getElementById('nem-popis').value = it.popis||'';
      const vid = document.getElementById('nem-viditelnost'); if(vid) vid.value = it.viditelnost||'vsichni';
      renderThumbs();
      document.getElementById('nemModal').classList.add('open');
    }
    window.editNem = editNem;

    async function submitNem(){
      const nazev = document.getElementById('nem-nazev').value.trim();
      const postal = document.getElementById('nem-postal').value.trim();
      const cena = document.getElementById('nem-cena').value;
      const popis = document.getElementById('nem-popis').value.trim();
      const vidEl = document.getElementById('nem-viditelnost');
      const viditelnost = vidEl ? vidEl.value : 'vsichni';
      if(!nazev) return showToast('Vyplň název nemovitosti', true);
      if(!postal) return showToast('Vyplň postal', true);
      if(!cena||parseFloat(cena)<0) return showToast('Vyplň platnou cenu', true);

      const btn = document.getElementById('nemSubmitBtn');
      btn.disabled = true; btn.textContent = 'Ukládám…';
      const payload = { nazev, postal, cena, popis, viditelnost, images: pendingImages };
      const url = editingId ? ('/api/nemovitosti/'+editingId) : '/api/nemovitosti';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      btn.disabled = false; btn.textContent = 'Uložit nemovitost';
      if(!res.ok){ showToast('Server odmítl požadavek (moc velké fotky?), zkus jich přidat méně', true); return; }
      const d = await res.json();
      if(d.ok){ if(window.albionSealThud) window.albionSealThud(); showToast(editingId?'Nemovitost upravena':'Nemovitost zapsána'); closeNemModal(); loadNem(); }
      else showToast(d.error, true);
    }
    window.submitNem = submitNem;

    async function deleteNem(id){
      const it = ITEMS.find(function(x){return x.id===id;}); if(!it)return;
      if(!confirm('Smazat nemovitost "'+it.nazev+'"?')) return;
      const res = await fetch('/api/nemovitosti/'+id, { method:'DELETE' });
      const d = await res.json();
      if(d.ok){ showToast('Nemovitost smazána'); loadNem(); } else showToast(d.error, true);
    }
    window.deleteNem = deleteNem;

    document.getElementById('nemModal').addEventListener('click', function(e){ if(e.target===e.currentTarget) closeNemModal(); });

    // ── STAŽITELNÁ KARTA (canvas) — jasný přehled pro Discord ──
    function loadImg(src){
      return new Promise(function(resolve){
        const img = new Image(); img.crossOrigin='anonymous';
        img.onload = function(){ resolve(img); };
        img.onerror = function(){ resolve(null); };
        img.src = src;
      });
    }
    async function downloadNemCard(id){
      const it = ITEMS.find(function(x){return x.id===id;}); if(!it)return;
      const W=560, H=760, SCALE=2;
      const canvas = document.createElement('canvas'); canvas.width=W*SCALE; canvas.height=H*SCALE;
      const ctx = canvas.getContext('2d'); ctx.scale(SCALE,SCALE);

      ctx.fillStyle = '#150F10'; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle = '#C9A671'; ctx.lineWidth = 2; ctx.strokeRect(1,1,W-2,H-2);

      const photoArea = { x:16, y:16, w:W-32, h:300 };
      const imgs = (it.images||[]).slice(0,4);
      if(imgs.length){
        const loaded = await Promise.all(imgs.map(loadImg));
        const cols = loaded.length>1?2:1, rows = loaded.length>2?2:1;
        const cw = photoArea.w/cols, ch = photoArea.h/rows;
        loaded.forEach(function(img,i){
          if(!img)return;
          const cx = photoArea.x + (i%cols)*cw, cy = photoArea.y + Math.floor(i/cols)*ch;
          const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
          const scale = Math.max(cw/iw, ch/ih);
          const sw=cw/scale, sh=ch/scale, sx=(iw-sw)/2, sy=(ih-sh)/2;
          ctx.save(); ctx.beginPath(); ctx.rect(cx,cy,cw-2,ch-2); ctx.clip();
          ctx.drawImage(img, sx,sy,sw,sh, cx,cy,cw-2,ch-2);
          ctx.restore();
        });
      } else {
        ctx.fillStyle='#1B1314'; ctx.fillRect(photoArea.x,photoArea.y,photoArea.w,photoArea.h);
        ctx.font='12px monospace'; ctx.fillStyle='#8C7C6E'; ctx.textAlign='center';
        ctx.fillText('Bez fotky', W/2, photoArea.y+photoArea.h/2);
      }
      ctx.strokeStyle='#C9A671'; ctx.lineWidth=1; ctx.strokeRect(photoArea.x,photoArea.y,photoArea.w,photoArea.h);

      let y = photoArea.y + photoArea.h + 42;
      ctx.textAlign='left';
      ctx.font='700 24px Georgia'; ctx.fillStyle='#F6EEE4';
      ctx.fillText(it.nazev, 24, y);
      y += 30;
      ctx.font='700 18px Georgia'; ctx.fillStyle='#FFDEAD';
      ctx.fillText('$'+Math.round(it.cena).toLocaleString('en-US').replace(/,/g,' '), 24, y);
      y += 34;

      ctx.font='11px monospace'; ctx.fillStyle='#8C7C6E';
      ctx.fillText('POSTAL', 24, y); y+=18;
      ctx.font='16px monospace'; ctx.fillStyle='#F6EEE4';
      ctx.fillText(it.postal, 24, y); y+=32;

      if(it.popis){
        ctx.font='11px monospace'; ctx.fillStyle='#8C7C6E'; ctx.fillText('POPIS', 24, y); y+=18;
        ctx.font='13px Georgia'; ctx.fillStyle='#C9BBAD';
        const words = it.popis.split(' ');
        let line=''; const maxW=W-48;
        words.forEach(function(w){
          const test = line+w+' ';
          if(ctx.measureText(test).width>maxW && line){ ctx.fillText(line, 24, y); y+=18; line=w+' '; }
          else line = test;
        });
        if(line){ ctx.fillText(line, 24, y); y+=18; }
      }

      ctx.font='600 10px Georgia'; ctx.fillStyle='#8C7C6E'; ctx.textAlign='center';
      ctx.fillText('CALEDONIA — NEMOVITOSTI', W/2, H-20);

      if(window.albionSealThud) window.albionSealThud();
      const a = document.createElement('a');
      a.download = (it.nazev||'nemovitost').replace(/[^a-z0-9]+/gi,'_')+'_karta.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    }
    window.downloadNemCard = downloadNemCard;

    loadNem();
    (window.evtSource || new EventSource('/api/events')).addEventListener('nemovitostiUpdate', function(){ setTimeout(loadNem, 400); });
  </script>
  </body></html>`;
}

module.exports = { renderNemovitosti };
