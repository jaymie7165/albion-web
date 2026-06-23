// sklad.js — extracted view module

const { baseStyles, ledgerEmpty } = require('./styles');
const { renderNav } = require('./nav');

function renderDashboard(req, data) {
  const { zbrane, weed, drogy, chemky, ucet, recentUcet } = data;
  const icName = req.session.icName;

  const formatSklad = (obj, ceny) => {
    const entries = Object.entries(obj).filter(([,q]) => q > 0);
    if (!entries.length) return ledgerEmpty('Sklad je prázdný', true);
    return entries.map(([item, qty]) => {
      const hodnota = ceny && ceny[item] ? qty * ceny[item].prodej : null;
      return `<div class="sklad-row"><span>${item}</span><span>${qty} ks${hodnota ? ` <em>$${hodnota}</em>` : ''}</span></div>`;
    }).join('');
  };

  const formatUcet = (rows) => {
    if (!rows.length) return ledgerEmpty('Žádné záznamy', true);
    return rows.map(r => {
      const [cas, typ, castka, valuta, pozn] = r;
      const isIn = typ === 'PŘÍJEM';
      const symbol = valuta === 'USD' ? 'SAD ' : '₱';
      return `<div class="sklad-row"><span style="display:flex;align-items:center;gap:0.5rem"><span style="width:6px;height:6px;border-radius:50%;background:${isIn?'#6FBF52':'var(--seal-bright)'};flex-shrink:0"></span>${pozn||'—'}</span><span style="${isIn?'color:#6FBF52':'color:var(--seal-bright)'}">${symbol}${castka} <em style="color:var(--text-muted)">${valuta.replace('USD','SAD')}</em></span></div>`;
    }).join('');
  };

  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Sklad</title>
  ${baseStyles()}
  <style>
    .sklad-opener{
      display:flex;align-items:flex-end;justify-content:space-between;gap:2rem;
      padding-bottom:2rem;margin-bottom:2.2rem;border-bottom:1px solid var(--border);
    }
    .sklad-opener-tag{font-family:var(--font-mono);font-size:0.6rem;letter-spacing:0.36em;text-transform:uppercase;color:var(--blood);margin-bottom:0.9rem;font-weight:700;text-shadow:0 0 16px var(--blood-glow)}
    .sklad-opener h1{font-family:var(--font-display);font-weight:700;font-size:clamp(2.3rem,5.5vw,3.6rem);color:var(--vellum-bright);line-height:1}
    .sklad-opener p{font-family:'Inter',sans-serif;color:var(--text-dim);margin-top:0.7rem;font-size:0.95rem;max-width:540px}
    .ledger-tally{display:flex;gap:2.4rem;flex-wrap:wrap;margin:0 0 2.4rem}
    .tally-item{padding-right:2.4rem;border-right:1px solid var(--border)}
    .tally-item:last-child{border-right:none;padding-right:0}
    .tally-label{font-family:var(--font-mono);font-size:0.58rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.5rem}
    .tally-value{font-family:var(--font-display);font-weight:700;font-size:2.1rem;color:var(--vellum);line-height:1}
    @media(max-width:768px){.sklad-opener{flex-direction:column;align-items:flex-start;gap:0.8rem}.ledger-tally{gap:1.2rem 1.6rem}.tally-item{padding-right:1.4rem}.tally-value{font-size:1.7rem}}
    .sklad-asym{
      display:grid;
      grid-template-columns:1.4fr 1fr;
      grid-template-areas:
        "ucet ucet"
        "zbrane weed"
        "drogy chemky";
      gap:1.5rem;
    }
    .sklad-asym .area-ucet{grid-area:ucet}
    .sklad-asym .area-zbrane{grid-area:zbrane}
    .sklad-asym .area-weed{grid-area:weed}
    .sklad-asym .area-drogy{grid-area:drogy}
    .sklad-asym .area-chemky{grid-area:chemky}
    .card.card-lead{
      border-top:2px solid var(--brass);
      background:linear-gradient(135deg,var(--gold-dim) 0%,var(--bg-card) 45%);
    }
    .card.card-lead .card-title{font-size:1.05rem}
    @media(max-width:900px){
      .sklad-asym{grid-template-columns:1fr;grid-template-areas:"ucet" "zbrane" "weed" "drogy" "chemky"}
    }
  </style>
  </head><body>
  ${renderNav(req, 'sklad')}
  <main>
    <div class="sklad-opener">
      <div>
        <div class="sklad-opener-tag">Centrální sklad organizace</div>
        <h1>Vítej, ${icName}</h1>
        <p>Eviduj pohyb zbraní, weedu, drog, chemikálií a financí. Každý zápis se ihned promítne do tabulka a odešle se na Discord.</p>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div id="live-clock" style="font-family:var(--font-mono);font-size:1.3rem;color:var(--vellum);letter-spacing:0.08em"></div>
        <div id="live-date" style="font-size:0.66rem;letter-spacing:0.14em;color:var(--text-dim);text-transform:uppercase;margin-top:0.3rem;font-family:var(--font-mono)"></div>
      </div>
    </div>
    <script>
      function updateClock(){
        const now=new Date();
        document.getElementById('live-clock').textContent=now.toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
        document.getElementById('live-date').textContent=now.toLocaleDateString('cs-CZ',{weekday:'long',day:'numeric',month:'long'});
      }
      updateClock();setInterval(updateClock,1000);
    </script>
    <div class="ledger-tally">
      <div class="tally-item"><div class="tally-label">Zůstatek SAD</div><div class="tally-value" style="color:var(--brass)">$${ucet.usd.toLocaleString('cs-CZ')}</div></div>
      <div class="tally-item"><div class="tally-label">Zůstatek Pesos</div><div class="tally-value">₱${ucet.pesos.toLocaleString('cs-CZ')}</div></div>
      <div class="tally-item"><div class="tally-label">Weed</div><div class="tally-value" style="color:#7A9A4A">${Object.values(weed).filter(q=>q>0).reduce((a,b)=>a+b,0)} ks</div></div>
      <div class="tally-item"><div class="tally-label">Drogy</div><div class="tally-value" style="color:var(--seal-bright)">${Object.values(drogy).filter(q=>q>0).reduce((a,b)=>a+b,0)} ks</div></div>
      <div class="tally-item"><div class="tally-label">Chemikálie</div><div class="tally-value" style="color:#6FA8C9">${Object.values(chemky||{}).filter(q=>q>0).reduce((a,b)=>a+b,0)} ks</div></div>
      <div class="tally-item"><div class="tally-label">Hodnota skladu</div><div class="tally-value" style="color:var(--brass)">$${(() => {
            const WEED_P = {"Žlutý kanabis":150,"Zelený kanabis":150,"Kanabis":150,"Červený kanabis":150,"Modrý kanabis":150};
            const DROGY_P = {"Kapky":200,"Kokain":500,"Extáze":350,"Metamfetamin":450,"Benzo":300,"Joyka":250,"Heroin":600,"Speed":280,"LSD":400};
            const ZBRANE_P = {"Pump Shotgun":8000,"Pistol MK2":12000,"Pistol":5000,"Combat Pistol":7000,"Double Action Revolver":15000,"Navy Revolver":14000,"Vintage Pistol":6000,"Gusenberg":18000,"Dlouhé":25000,"9mm":100,"9mm Mk2":150,".75cal":300,".50cal":250,"12-gauge":200};
            let total = 0;
            Object.entries(weed).forEach(([k,q]) => { if(q>0 && WEED_P[k]) total += q * WEED_P[k]; });
            Object.entries(drogy).forEach(([k,q]) => { if(q>0 && DROGY_P[k]) total += q * DROGY_P[k]; });
            Object.entries(zbrane).forEach(([k,q]) => { if(q>0 && ZBRANE_P[k]) total += q * ZBRANE_P[k]; });
            return total.toLocaleString('cs-CZ');
          })()}</div></div>
    </div>
    <div class="sklad-asym">
      <div class="card card-lead area-ucet">
        <div class="card-header"><span class="card-title">Účetnictví organizace</span><span class="card-badge">Finance · vede rejstřík</span></div>
        ${formatUcet(recentUcet)}
        <div class="form-section">
          <div class="typ-toggle">
            <button class="typ-btn active-vklad" onclick="setTyp('ucet','PŘÍJEM',this)">Příjem</button>
            <button class="typ-btn" onclick="setTyp('ucet','VÝDAJ',this)">Výdaj</button>
          </div>
          <input type="hidden" id="ucet-typ" value="PŘÍJEM">
          <div class="form-row">
            <div class="form-group"><label>Částka</label><input type="number" id="ucet-castka" min="1" placeholder="1000"></div>
            <div class="form-group"><label>Valuta</label><select id="ucet-valuta"><option value="USD">SAD</option><option value="PESOS">Pesos</option></select></div>
          </div>
          <div class="form-group" style="margin-bottom:0.5rem"><label>Poznámka</label><input type="text" id="ucet-poznamka" placeholder="Prodej zboží, plat..."></div>
          <button class="btn-submit" onclick="submitUcet()">Potvrdit transakci</button>
        </div>
      </div>
      <div class="card area-zbrane">
        <div class="card-header"><span class="card-title">Zbraně & Střelivo</span><span class="card-badge">Sklad</span></div>
        ${formatSklad(zbrane, null)}
        <div class="form-section">
          <div class="typ-toggle">
            <button class="typ-btn active-vklad" onclick="setTyp('zbrane','VKLAD',this)">Uložit</button>
            <button class="typ-btn" onclick="setTyp('zbrane','VÝBĚR',this)">Vybrat</button>
          </div>
          <input type="hidden" id="zbrane-typ" value="VKLAD">
          <div class="form-row">
            <div class="form-group select-wrap"><label>Kategorie</label><select id="zbrane-kat" class="select-expandable" onchange="updateZbraneItems()"><option value="Zbraň">Zbraně</option><option value="Střelivo">Střelivo</option><option value="Akce">Akce</option></select><span class="select-count-badge">3</span></div>
            <div class="form-group select-wrap"><label>Položka</label><select id="zbrane-polozka" class="select-expandable"></select><span class="select-count-badge" id="zbrane-polozka-count">9</span></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Množství</label><input type="number" id="zbrane-mnozstvi" min="1" value="1"></div>
            <div class="form-group" id="zbrane-ucel-wrap" style="display:none"><label>Účel výběru</label><input type="text" id="zbrane-ucel" placeholder="Mise, ochrana..."></div>
          </div>
          <button class="btn-submit" onclick="submitZbrane()">Potvrdit akci</button>
        </div>
      </div>
      <div class="card area-weed">
        <div class="card-header"><span class="card-title">Weed</span><span class="card-badge">Sklad</span></div>
        ${formatSklad(weed, {"Žlutý kanabis":{prodej:150},"Zelený kanabis":{prodej:150},"Kanabis":{prodej:150},"Červený kanabis":{prodej:150},"Modrý kanabis":{prodej:150}})}
        <div class="form-section">
          <div class="typ-toggle">
            <button class="typ-btn active-vklad" onclick="setTyp('weed','VKLAD',this)">Uložit</button>
            <button class="typ-btn" onclick="setTyp('weed','VÝBĚR',this)">Vybrat</button>
          </div>
          <input type="hidden" id="weed-typ" value="VKLAD">
          <div class="form-row">
            <div class="form-group select-wrap"><label>Odrůda</label><select id="weed-odruda" class="select-expandable"><option>Žlutý kanabis</option><option>Zelený kanabis</option><option>Kanabis</option><option>Červený kanabis</option><option>Modrý kanabis</option></select><span class="select-count-badge">5</span></div>
            <div class="form-group"><label>Množství</label><input type="number" id="weed-mnozstvi" min="1" value="1"></div>
          </div>
          <div class="info-box" id="weed-info"></div>
          <button class="btn-submit" onclick="submitWeed()">Potvrdit akci</button>
        </div>
      </div>
      <div class="card area-drogy">
        <div class="card-header"><span class="card-title">Drogy</span><span class="card-badge">Sklad</span></div>
        ${formatSklad(drogy, null)}
        <div class="form-section">
          <div class="typ-toggle">
            <button class="typ-btn active-vklad" onclick="setTyp('drogy','VKLAD',this)">Uložit</button>
            <button class="typ-btn" onclick="setTyp('drogy','VÝBĚR',this)">Vybrat</button>
          </div>
          <input type="hidden" id="drogy-typ" value="VKLAD">
          <div class="form-row">
            <div class="form-group select-wrap"><label>Droga</label><select id="drogy-droga" class="select-expandable"><option>Kapky</option><option>Kokain</option><option>Extáze</option><option>Metamfetamin</option><option>Benzo</option><option>Joyka</option><option>Heroin</option><option>Speed</option><option>LSD</option></select><span class="select-count-badge">9</span></div>
            <div class="form-group"><label>Množství</label><input type="number" id="drogy-mnozstvi" min="1" value="1"></div>
          </div>
          <button class="btn-submit" onclick="submitDrogy()">Potvrdit akci</button>
        </div>
      </div>
      <div class="card area-chemky">
        <div class="card-header"><span class="card-title">Chemikálie</span><span class="card-badge">Sklad</span></div>
        ${formatSklad(chemky||{}, null)}
        <div class="form-section">
          <div class="typ-toggle">
            <button class="typ-btn active-vklad" onclick="setTyp('chemky','VKLAD',this)">Uložit</button>
            <button class="typ-btn" onclick="setTyp('chemky','VÝBĚR',this)">Vybrat</button>
          </div>
          <input type="hidden" id="chemky-typ" value="VKLAD">
          <div class="form-row">
            <div class="form-group select-wrap"><label>Chemikálie</label><select id="chemky-chemikalie" class="select-expandable"><option>Aceton</option><option>Peroxid vodíku</option><option>Kofein</option><option>Propylenglykol</option><option>Toluen</option><option>Benzín</option><option>Bismut</option><option>Kyselina fosforečná</option></select><span class="select-count-badge">8</span></div>
            <div class="form-group"><label>Množství</label><input type="number" id="chemky-mnozstvi" min="1" value="1"></div>
          </div>
          <button class="btn-submit" onclick="submitChemky()">Potvrdit akci</button>
        </div>
      </div>
    </div>
  </main>
  <!-- ── CONFIRM MODAL ── -->
  <div class="modal-overlay" id="confirmModal">
    <div class="modal-box" id="modalBox">
      <div class="seal-stamp" id="sealStamp"><span>A</span></div>
      <div class="modal-title" id="modalTitle">Potvrdit akci</div>
      <div class="modal-subtitle" id="modalSubtitle">Opravdu chceš provést tuto operaci se skladem?</div>
      <dl class="modal-detail" id="modalDetail"></dl>
      <div class="modal-actions">
        <button class="modal-btn-cancel" onclick="closeModal()">Zrušit</button>
        <button class="modal-btn-confirm" id="modalConfirmBtn">Potvrdit</button>
      </div>
    </div>
  </div>
  <div class="toast" id="toast"></div>
  <script>
    // ── MODAL ──────────────────────────────────────────────────────────────
    let _pendingAction = null;
    let _sealAudioCtx = null;
    function playSealThud() {
      try {
        _sealAudioCtx = _sealAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const ctx = _sealAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        // Low thud body
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(48, now + 0.16);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.5, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        osc.connect(gain);
        // Brief noise burst for the wax "press" texture
        const bufferSize = ctx.sampleRate * 0.06;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 900;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.22, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
        noise.connect(noiseFilter).connect(noiseGain);
        const master = ctx.createGain();
        master.gain.value = 0.9;
        gain.connect(master);
        noiseGain.connect(master);
        master.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.34);
        noise.start(now);
      } catch (e) { /* audio not available — silent fail, purely decorative */ }
    }
    function showModal(title, subtitle, details, actionFn) {
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalSubtitle').textContent = subtitle;
      const dl = document.getElementById('modalDetail');
      dl.innerHTML = details.map(([k,v]) => '<dt>'+k+'</dt><dd>'+v+'</dd>').join('');
      _pendingAction = actionFn;
      document.getElementById('confirmModal').classList.add('open');
      document.getElementById('modalConfirmBtn').textContent = 'Potvrdit';
      const seal = document.getElementById('sealStamp');
      seal.className = 'seal-stamp';
      document.getElementById('modalBox').classList.remove('stamped','thud');
    }
    function closeModal() {
      document.getElementById('confirmModal').classList.remove('open');
      _pendingAction = null;
    }
    document.getElementById('modalConfirmBtn').addEventListener('click', async () => {
      if (!_pendingAction) return;
      const btn = document.getElementById('modalBox');
      const seal = document.getElementById('sealStamp');
      const confirmBtn = document.getElementById('modalConfirmBtn');
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Pečetím…';
      // Slam the wax seal down onto the ledger entry
      btn.classList.add('stamped','thud');
      seal.classList.add('slam');
      setTimeout(playSealThud, 340); // synced to the impact point of the slam keyframe (~55% of 620ms)
      await new Promise(r => setTimeout(r, 560));
      confirmBtn.textContent = 'Odesílám…';
      await _pendingAction();
      seal.classList.add('fade-out');
      await new Promise(r => setTimeout(r, 260));
      confirmBtn.disabled = false;
      closeModal();
    });
    document.getElementById('confirmModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    // ── END MODAL ──────────────────────────────────────────────────────────
    const ZBRANE=["Pump Shotgun","Pistol MK2","Pistol","Combat Pistol","Double Action Revolver","Navy Revolver","Vintage Pistol","Gusenberg","Dlouhé"];
    const NABOJE=["9mm","9mm Mk2",".75cal",".50cal","12-gauge"];
    const AKCE=["Malá C4","Velká C4","Přístupová karta","Pokročilá zvláštní karta","EMP zařízení","Řezací laser","Cable Cutter","Zvláštní karta"];
    const WEED_CENY={"Žlutý kanabis":{vyroba:100,prodej:150},"Zelený kanabis":{vyroba:100,prodej:150},"Kanabis":{vyroba:100,prodej:150},"Červený kanabis":{vyroba:100,prodej:150},"Modrý kanabis":{vyroba:100,prodej:150}};
    function updateZbraneItems(){
      const kat=document.getElementById('zbrane-kat').value;
      const sel=document.getElementById('zbrane-polozka');
      const items=kat==='Zbraň'?ZBRANE:kat==='Střelivo'?NABOJE:AKCE;
      sel.innerHTML=items.map(i=>'<option>'+i+'</option>').join('');
      const badge=document.getElementById('zbrane-polozka-count');
      if(badge) badge.textContent=items.length;
    }
    updateZbraneItems();
    function setTyp(prefix,typ,btn){
      document.getElementById(prefix+'-typ').value=typ;
      btn.parentElement.querySelectorAll('.typ-btn').forEach(b=>b.className='typ-btn');
      btn.className='typ-btn '+(typ==='VKLAD'||typ==='PŘÍJEM'?'active-vklad':'active-vyber');
      if(prefix==='zbrane') document.getElementById('zbrane-ucel-wrap').style.display=typ==='VÝBĚR'?'flex':'none';
    }
    async function post(url,data){
      const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      return res.json();
    }
    async function submitZbrane(){
      const typ=document.getElementById('zbrane-typ').value;
      const polozka=document.getElementById('zbrane-polozka').value;
      const mnozstvi=document.getElementById('zbrane-mnozstvi').value;
      const kategorie=document.getElementById('zbrane-kat').value;
      const ucel=document.getElementById('zbrane-ucel').value;
      showModal(
        typ==='VKLAD'?'Vložit do skladu':'Vybrat ze skladu',
        typ==='VKLAD'?'Potvrzením přidáš tuto položku do skladu organizace.':'Potvrzením odeberete tuto položku ze skladu.',
        [['Typ', typ],['Položka', polozka],['Množství', mnozstvi+' ks'],['Kategorie', kategorie],...( ucel?[['Účel', ucel]]:[])],
        async () => {
          const r=await post('/api/zbrane',{typ,polozka,mnozstvi,kategorie,ucel});
          if(r.ok){showToast('✓ Záznam uložen');setTimeout(()=>location.reload(),1500);}
          else showToast('✗ '+r.error,true);
        }
      );
    }
    function updateWeedInfo(){
      const odruda=document.getElementById('weed-odruda').value;
      const qty=parseInt(document.getElementById('weed-mnozstvi').value)||1;
      const c=WEED_CENY[odruda];
      if(!c)return;
      const box=document.getElementById('weed-info');
      box.style.display='block';
      box.innerHTML='Výroba: ~$'+(c.vyroba*qty)+'&ensp;|&ensp;Prodej: $'+(c.prodej*qty);
    }
    document.getElementById('weed-odruda').addEventListener('change',updateWeedInfo);
    document.getElementById('weed-mnozstvi').addEventListener('input',updateWeedInfo);
    updateWeedInfo();
    async function submitWeed(){
      const typ=document.getElementById('weed-typ').value;
      const odruda=document.getElementById('weed-odruda').value;
      const mnozstvi=document.getElementById('weed-mnozstvi').value;
      const c=WEED_CENY[odruda]||{vyroba:100,prodej:150};
      showModal(
        typ==='VKLAD'?'Vložit weed do skladu':'Vybrat weed ze skladu',
        'Zkontroluj detaily operace a potvrd.',
        [['Typ',typ],['Odrůda',odruda],['Množství',mnozstvi+' ks'],['Výroba celkem','~$'+(c.vyroba*mnozstvi)],['Prodej celkem','$'+(c.prodej*mnozstvi)]],
        async () => {
          const r=await post('/api/weed',{typ,odruda,mnozstvi});
          if(r.ok){showToast('✓ Weed uložen — Výroba: ~$'+r.celkVyroba+' | Prodej: $'+r.celkProdej);setTimeout(()=>location.reload(),2000);}
          else showToast('✗ '+r.error,true);
        }
      );
    }
    async function submitDrogy(){
      const typ=document.getElementById('drogy-typ').value;
      const droga=document.getElementById('drogy-droga').value;
      const mnozstvi=document.getElementById('drogy-mnozstvi').value;
      showModal(
        typ==='VKLAD'?'Vložit drogy do skladu':'Vybrat drogy ze skladu',
        'Zkontroluj detaily operace a potvrd.',
        [['Typ',typ],['Droga',droga],['Množství',mnozstvi+' ks']],
        async () => {
          const r=await post('/api/drogy',{typ,droga,mnozstvi});
          if(r.ok){showToast('✓ Drogy uloženy');setTimeout(()=>location.reload(),1500);}
          else showToast('✗ '+r.error,true);
        }
      );
    }
    async function submitUcet(){
      const typ=document.getElementById('ucet-typ').value;
      const castka=document.getElementById('ucet-castka').value;
      const valuta=document.getElementById('ucet-valuta').value;
      const poznamka=document.getElementById('ucet-poznamka').value;
      if(!castka||!poznamka)return showToast('✗ Vyplň všechna pole',true);
      const sym=valuta==='USD'?'$':'₱';
      showModal(
        typ==='PŘÍJEM'?'Zaznamenat příjem':'Zaznamenat výdaj',
        'Tato transakce bude zapsána do účetnictví organizace.',
        [['Typ',typ],['Částka',sym+castka],['Valuta',valuta],['Poznámka',poznamka]],
        async () => {
          const r=await post('/api/ucet',{typ,castka,valuta,poznamka});
          if(r.ok){showToast('✓ Transakce zaznamenána');setTimeout(()=>location.reload(),1500);}
          else showToast('✗ '+r.error,true);
        }
      );
    }
    async function submitChemky(){
      const typ=document.getElementById('chemky-typ').value;
      const chemikalie=document.getElementById('chemky-chemikalie').value;
      const mnozstvi=document.getElementById('chemky-mnozstvi').value;
      showModal(
        typ==='VKLAD'?'Vložit chemikálii do skladu':'Vybrat chemikálii ze skladu',
        'Zkontroluj detaily operace a potvrd.',
        [['Typ',typ],['Chemikálie',chemikalie],['Množství',mnozstvi+' ks']],
        async () => {
          const r=await post('/api/chemky',{typ,chemikalie,mnozstvi});
          if(r.ok){showToast('✓ Chemikálie uložena');setTimeout(()=>location.reload(),1500);}
          else showToast('✗ '+r.error,true);
        }
      );
    }
  </script>
  </body></html>`;
}

module.exports = { renderDashboard };

