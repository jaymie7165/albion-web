// garaz.js — extracted view module

const { baseStyles, ledgerEmpty } = require('./styles');
const { renderNav } = require('./nav');

function renderGaraz(req) {
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Garáž</title>
  ${baseStyles()}
  <style>
    .garage-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.6rem}
    .car-card{
      background:var(--bg-card);border:1px solid var(--border);border-radius:6px;
      overflow:hidden;transition:border-color 0.2s,transform 0.2s;box-shadow:var(--shadow-card);
      position:relative;display:flex;flex-direction:column;
    }
    .car-card:hover{border-color:var(--border-hover);transform:translateY(-3px)}
    .car-photo{
      width:100%;aspect-ratio:16/10;background:var(--bg-mid);
      position:relative;overflow:hidden;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;
    }
    .car-photo img{width:100%;height:100%;object-fit:cover;display:block}
    .car-photo-empty{
      display:flex;flex-direction:column;align-items:center;gap:0.5rem;
      color:var(--text-muted);font-family:var(--font-mono);font-size:0.66rem;letter-spacing:0.08em;text-transform:uppercase;
    }
    .car-photo-empty svg{width:32px;height:32px;opacity:0.4}
    .car-plate{
      position:absolute;left:0.9rem;bottom:0.9rem;
      background:var(--vellum-bright);color:#15110C;
      font-family:var(--font-mono);font-weight:700;font-size:0.92rem;letter-spacing:0.08em;
      padding:0.35rem 0.8rem;border-radius:3px;
      border:2px solid #15110C;
      box-shadow:0 4px 14px rgba(0,0,0,0.5);
    }
    .car-body{padding:1.3rem 1.4rem 1.5rem;display:flex;flex-direction:column;gap:0.7rem;flex:1}
    .car-name{font-family:var(--font-display);font-weight:600;font-size:1.15rem;color:var(--vellum-bright);line-height:1.2}
    .car-price{font-family:var(--font-mono);font-size:0.95rem;color:var(--brass);font-weight:600}
    .car-price .car-price-tag{font-size:0.6rem;color:var(--text-muted);letter-spacing:0.08em;text-transform:uppercase;margin-left:0.4rem}
    .car-meta-row{display:flex;justify-content:space-between;font-size:0.78rem;color:var(--text-dim);padding:0.25rem 0;border-top:1px solid var(--border)}
    .car-meta-row span:first-child{color:var(--text-muted);font-family:var(--font-mono);font-size:0.66rem;letter-spacing:0.06em;text-transform:uppercase}
    .car-purpose{font-size:0.84rem;color:var(--text-dim);line-height:1.6;margin-top:0.2rem;flex:1}
    .car-actions{display:flex;gap:0.5rem;margin-top:0.6rem}
    .car-action-btn{
      flex:1;padding:0.5rem;background:transparent;border:1px solid var(--border-hover);
      color:var(--text-dim);font-family:var(--font-mono);font-size:0.62rem;letter-spacing:0.08em;text-transform:uppercase;
      cursor:pointer;border-radius:3px;transition:all 0.15s;
    }
    .car-action-btn:hover{border-color:var(--brass);color:var(--brass-bright)}
    .car-action-btn.danger:hover{border-color:var(--blood);color:var(--blood);box-shadow:0 0 12px var(--blood-glow)}

    /* ── Upload zone — drop / paste / click ── */
    .upload-zone{
      border:1.5px dashed var(--border-hover);border-radius:6px;
      padding:1.6rem;text-align:center;cursor:pointer;
      transition:border-color 0.2s,background 0.2s;position:relative;
      background:var(--input-bg);min-height:140px;
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.6rem;
      overflow:hidden;
    }
    .upload-zone:hover,.upload-zone.drag-over{border-color:var(--brass);background:var(--gold-dim)}
    .upload-zone svg{width:28px;height:28px;color:var(--text-muted);flex-shrink:0}
    .upload-zone-text{font-family:var(--font-mono);font-size:0.68rem;letter-spacing:0.04em;color:var(--text-muted);line-height:1.6}
    .upload-zone-text strong{color:var(--brass)}
    .upload-preview{width:100%;height:100%;position:absolute;inset:0;object-fit:cover}
    .upload-clear{
      position:absolute;top:0.5rem;right:0.5rem;z-index:2;
      width:26px;height:26px;border-radius:50%;background:rgba(0,0,0,0.65);
      color:#fff;border:1px solid rgba(255,255,255,0.3);cursor:pointer;
      display:none;align-items:center;justify-content:center;font-size:0.9rem;line-height:1;
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
        <p class="page-sub">Vozový park, jeho SPZ, hodnota a určení</p>
      </div>
      <button class="quick-btn primary" onclick="openCarModal()" style="flex-shrink:0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M12 5v14M5 12h14"/></svg>
        <span>Přidat vůz</span>
      </button>
    </div>
    <p class="folio-footnote"><strong>Vozový park.</strong> Každý záznam nese SPZ, model, cenu pořízenou v obchodě PDM (San Andreas Dollar), kdo vůz koupil a k čemu organizaci slouží. Záznamy vidí všichni členové a lze je upravovat nebo mazat.</p>

    <div id="garage-loading" class="ledger-loading">Načítám vozový park…</div>
    <div id="garage-grid" class="garage-grid"></div>
  </main>

  <!-- ── CAR MODAL ── -->
  <div class="modal-overlay" id="carModal">
    <div class="modal-box" id="carModalBox" style="max-width:480px">
      <div class="modal-title" id="carModalTitle">Přidat vůz</div>
      <div class="modal-subtitle">Vyplň údaje o vozu. Fotku vlož přes Ctrl+V (screenshot) nebo ji nahraj ze souboru.</div>

      <div class="form-group" style="margin-bottom:1rem">
        <label>Fotka vozu</label>
        <div class="upload-zone" id="uploadZone" tabindex="0">
          <button type="button" class="upload-clear" id="uploadClear" onclick="clearCarImage(event)">✕</button>
          <img class="upload-preview" id="uploadPreview" style="display:none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          <div class="upload-zone-text"><strong>Klikni</strong> pro výběr souboru<br>nebo <strong>Ctrl+V</strong> pro vložení screenshotu</div>
        </div>
        <input type="file" id="carImageFile" accept="image/*" style="display:none">
      </div>

      <div class="form-row">
        <div class="form-group"><label>SPZ</label><input type="text" id="car-spz" placeholder="ABC 123" maxlength="12"></div>
        <div class="form-group"><label>Cena (SAD)</label><input type="number" id="car-cena" min="0" placeholder="250000"></div>
      </div>
      <div class="form-group" style="margin-bottom:0.85rem"><label>Model / název vozu</label><input type="text" id="car-nazev" placeholder="Obey Tailgater, Pegassi Zentorno…"></div>
      <div class="form-group" style="margin-bottom:0.85rem"><label>Kdo vůz koupil</label><input type="text" id="car-kupil" placeholder="IC jméno"></div>
      <div class="form-group" style="margin-bottom:0.5rem"><label>K čemu slouží</label><textarea id="car-ucel" placeholder="Krátký popis využití vozu…" rows="3"></textarea></div>

      <div class="modal-actions">
        <button class="modal-btn-cancel" onclick="closeCarModal()">Zrušit</button>
        <button class="modal-btn-confirm" id="carModalConfirmBtn" onclick="submitCar()">Uložit vůz</button>
      </div>
    </div>
  </div>
  <div class="toast" id="toast"></div>

  <script>
    // Bezpečné globální wrappery — button onclick je zaregistruje hned,
    // skutečné funkce se napojí po DOMContentLoaded.
    var _garageHandlers = {};
    window.openCarModal  = function()  { _garageHandlers.open  && _garageHandlers.open(); };
    window.closeCarModal = function()  { _garageHandlers.close && _garageHandlers.close(); };
    window.editCar       = function(id){ _garageHandlers.edit  && _garageHandlers.edit(id); };
    window.deleteCar     = function(id){ _garageHandlers.del   && _garageHandlers.del(id); };
    window.submitCar     = function()  { _garageHandlers.submit&& _garageHandlers.submit(); };
    window.clearCarImage = function(e) { _garageHandlers.clearImg && _garageHandlers.clearImg(e); };

    document.addEventListener('DOMContentLoaded', function() {
    let CARS = [];
    let editingCarId = null;
    let pendingImageData = null; // base64 data URL, null = no change, '' = cleared

    function esc(s) { return (s==null?'':String(s)).replace(/</g,'&lt;'); }
    function money(n) { return '$' + Math.round(n||0).toLocaleString('cs-CZ'); }

    function carCardHtml(car) {
      const photo = car.image
        ? '<img src="' + esc(car.image) + '" alt="' + esc(car.nazev) + '" loading="lazy">'
        : '<div class="car-photo-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>Bez fotky</div>';
      return '<div class="car-card">' +
        '<div class="car-photo">' + photo + '<div class="car-plate">' + esc(car.spz) + '</div></div>' +
        '<div class="car-body">' +
          '<div class="car-name">' + esc(car.nazev) + '</div>' +
          '<div class="car-price">' + money(car.cena) + '<span class="car-price-tag">PDM · SAD</span></div>' +
          '<div class="car-meta-row"><span>Koupil</span><span>' + esc(car.kupil) + '</span></div>' +
          (car.ucel ? '<div class="car-purpose">' + esc(car.ucel) + '</div>' : '<div class="car-purpose" style="color:var(--text-muted);font-style:italic">Účel nezadán</div>') +
          '<div class="car-actions">' +
            '<button class="car-action-btn" onclick="editCar(&quot;' + car.id + '&quot;)">Upravit</button>' +
            '<button class="car-action-btn danger" onclick="deleteCar(&quot;' + car.id + '&quot;)">Smazat</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    function renderGarage() {
      const grid = document.getElementById('garage-grid');
      if (!CARS.length) { grid.innerHTML = ledgerEmptyHTML('Garáž je prázdná — zatím žádný vůz nebyl zapsán'); return; }
      grid.innerHTML = CARS.map(carCardHtml).join('');
    }

    async function loadGarage() {
      try {
        const res = await fetch('/api/garage', { cache: 'no-store' });
        const data = await res.json();
        document.getElementById('garage-loading').style.display = 'none';
        CARS = data.cars || [];
        renderGarage();
      } catch (e) {
        document.getElementById('garage-loading').textContent = 'Chyba načtení: ' + e.message;
      }
    }

    // ── Modal open/close ──
    function resetCarForm() {
      document.getElementById('car-spz').value = '';
      document.getElementById('car-cena').value = '';
      document.getElementById('car-nazev').value = '';
      document.getElementById('car-kupil').value = '';
      document.getElementById('car-ucel').value = '';
      pendingImageData = null;
      setUploadPreview(null);
      editingCarId = null;
    }
    function openCarModal() {
      resetCarForm();
      document.getElementById('carModalTitle').textContent = 'Přidat vůz';
      document.getElementById('carModalConfirmBtn').textContent = 'Uložit vůz';
      document.getElementById('carModal').classList.add('open');
    }
    function closeCarModal() {
      document.getElementById('carModal').classList.remove('open');
    }
    function editCar(id) {
      const car = CARS.find(c => c.id === id);
      if (!car) return;
      resetCarForm();
      editingCarId = id;
      document.getElementById('car-spz').value = car.spz || '';
      document.getElementById('car-cena').value = car.cena || '';
      document.getElementById('car-nazev').value = car.nazev || '';
      document.getElementById('car-kupil').value = car.kupil || '';
      document.getElementById('car-ucel').value = car.ucel || '';
      if (car.image) setUploadPreview(car.image);
      document.getElementById('carModalTitle').textContent = 'Upravit vůz';
      document.getElementById('carModalConfirmBtn').textContent = 'Uložit změny';
      document.getElementById('carModal').classList.add('open');
    }
    async function deleteCar(id) {
      const car = CARS.find(c => c.id === id);
      if (!car) return;
      if (!confirm('Smazat vůz ' + car.spz + ' (' + car.nazev + ') z garáže?')) return;
      const res = await fetch('/api/garage/' + id, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) { showToast('Vůz odstraněn z garáže'); loadGarage(); }
      else showToast(data.error || 'Chyba mazání', true);
    }

    // ── Image handling: file picker, drag&drop, and Ctrl+V paste ──
    function setUploadPreview(src) {
      const zone = document.getElementById('uploadZone');
      const img = document.getElementById('uploadPreview');
      if (src) {
        img.src = src; img.style.display = 'block';
        zone.classList.add('has-image');
      } else {
        img.src = ''; img.style.display = 'none';
        zone.classList.remove('has-image');
      }
    }
    function clearCarImage(e) {
      e.stopPropagation();
      pendingImageData = '';
      setUploadPreview(null);
    }
    function fileToDataUrl(file, cb) {
      if (!file || !file.type || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => cb(reader.result);
      reader.readAsDataURL(file);
    }
    // Napojíme handlery na skutečné funkce
    _garageHandlers.open     = openCarModal;
    _garageHandlers.close    = closeCarModal;
    _garageHandlers.edit     = editCar;
    _garageHandlers.del      = deleteCar;
    _garageHandlers.submit   = submitCar;
    _garageHandlers.clearImg = clearCarImage;

    const uploadZone = document.getElementById('uploadZone');
    const carImageFile = document.getElementById('carImageFile');
    uploadZone.addEventListener('click', (e) => {
      // Klik na uploadClear se zastaví pomocí stopPropagation — sem se tedy nedostane.
      // Spustíme file picker jen pokud je modal otevřený (obrana před bubbling edge-cases).
      if (document.getElementById('carModal').classList.contains('open')) {
        carImageFile.click();
      }
    });
    carImageFile.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      fileToDataUrl(file, (dataUrl) => { pendingImageData = dataUrl; setUploadPreview(dataUrl); });
    });
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault(); uploadZone.classList.remove('drag-over');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      fileToDataUrl(file, (dataUrl) => { pendingImageData = dataUrl; setUploadPreview(dataUrl); });
    });
    uploadZone.addEventListener('paste', (e) => handlePaste(e));
    document.addEventListener('paste', (e) => {
      if (document.getElementById('carModal').classList.contains('open')) handlePaste(e);
    });
    function handlePaste(e) {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const item of items) {
        if (item.type && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          fileToDataUrl(file, (dataUrl) => { pendingImageData = dataUrl; setUploadPreview(dataUrl); });
          e.preventDefault();
          break;
        }
      }
    }

    async function submitCar() {
      const spz = document.getElementById('car-spz').value.trim();
      const cena = document.getElementById('car-cena').value;
      const nazev = document.getElementById('car-nazev').value.trim();
      const kupil = document.getElementById('car-kupil').value.trim();
      const ucel = document.getElementById('car-ucel').value.trim();
      if (!spz) return showToast('Vyplň SPZ vozu', true);
      if (!nazev) return showToast('Vyplň model / název vozu', true);
      if (!cena || parseFloat(cena) <= 0) return showToast('Vyplň platnou cenu v SAD', true);

      const btn = document.getElementById('carModalConfirmBtn');
      btn.disabled = true;
      btn.textContent = 'Ukládám…';

      const payload = { spz, cena, nazev, kupil, ucel };
      // pendingImageData === null  → beze změny (nový vůz bez fotky, nebo edit bez změny fotky)
      // pendingImageData === ''    → uživatel smazal fotku přes ✕ → pošleme prázdný řetězec
      // pendingImageData === 'data:...' → nová fotka
      if (pendingImageData !== null) payload.image = pendingImageData;

      try {
        const url = editingCarId ? '/api/garage/' + editingCarId : '/api/garage';
        const method = editingCarId ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.ok) {
          showToast(editingCarId ? 'Vůz upraven' : 'Vůz zapsán do garáže');
          closeCarModal();
          loadGarage();
        } else {
          showToast(data.error || 'Chyba ukládání', true);
        }
      } catch (e) {
        showToast('Chyba sítě: ' + e.message, true);
      }
      btn.disabled = false;
      btn.textContent = editingCarId ? 'Uložit změny' : 'Uložit vůz';
    }

    document.getElementById('carModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeCarModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.getElementById('carModal').classList.contains('open')) closeCarModal(); });

    loadGarage();
    // Nasloucháme garageUpdate přes sdílený evtSource z renderNav (window.evtSource),
    // abychom nevytvářeli druhé SSE připojení k /api/events.
    (window.evtSource || new EventSource('/api/events')).addEventListener('garageUpdate', () => setTimeout(loadGarage, 400));
    }); // end DOMContentLoaded
  </script>
  </body></html>`;
}

module.exports = { renderGaraz };

