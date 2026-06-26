// sklad.js — Albion v3 · Heraldický sklad

const { baseStyles, ledgerEmpty } = require('../styles');
const { renderNav } = require('../nav');

function renderDashboard(req, data) {
  const { zbrane, weed, drogy, chemky, ucet, recentUcet } = data;
  const icName = req.session.icName;

  const formatSklad = (obj, ceny) => {
    const entries = Object.entries(obj).filter(([,q]) => q > 0);
    if (!entries.length) return ledgerEmpty('Sklad prázdný', true);
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
      return `<div class="sklad-row">
        <span style="display:flex;align-items:center;gap:0.6rem">
          <span style="width:4px;height:4px;background:${isIn?'#6FBF52':'var(--oxblood-bright)'};flex-shrink:0"></span>
          ${pozn||'—'}
        </span>
        <span style="color:${isIn?'#6FBF52':'var(--oxblood-bright)'}">
          ${symbol}${castka} <em style="color:var(--ivory-faint);font-style:normal;font-size:0.8em">${valuta.replace('USD','SAD')}</em>
        </span>
      </div>`;
    }).join('');
  };

  const totalValue = (() => {
    const W={"Žlutý kanabis":150,"Zelený kanabis":150,"Kanabis":150,"Červený kanabis":150,"Modrý kanabis":150};
    let t=0;
    Object.entries(weed).forEach(([k,q])=>{if(q>0&&W[k])t+=q*W[k];});
    return t;
  })();

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Albion — Sklad</title>
  ${baseStyles()}
  <style>
    /* ── SKLAD OPENER — záhlaví stránky ── */
    .sklad-opener{
      padding:3rem 0 2.5rem;margin-bottom:0;
      border-bottom:1px solid var(--border-brass);
      display:flex;align-items:flex-end;justify-content:space-between;gap:2rem;
    }
    .sklad-opener-tag{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.32em;text-transform:uppercase;color:var(--brass);margin-bottom:1rem;font-weight:500}
    .sklad-opener h1{font-family:var(--font-display);font-weight:700;font-style:italic;font-size:clamp(2.2rem,5vw,3.4rem);color:var(--ivory);line-height:1}
    .sklad-opener p{font-family:var(--font-body);color:var(--ivory-faint);margin-top:0.6rem;font-size:0.9rem;max-width:480px;font-weight:300}

    /* ── TALLY STRIP — přehledová lišta čísel ── */
    .tally-strip{
      display:grid;grid-template-columns:repeat(6,1fr);
      gap:1px;background:var(--border-brass);
      margin:2.5rem 0;
    }
    .tally-cell{
      background:var(--panel2);padding:1.4rem 1.2rem;text-align:center;
      transition:background 0.2s;border-top:2px solid transparent;
    }
    .tally-cell:hover{background:var(--panel3);border-top-color:var(--brass)}
    .tally-cell-label{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--brass);margin-bottom:0.55rem}
    .tally-cell-val{font-family:var(--font-display);font-weight:700;font-style:italic;font-size:1.5rem;color:var(--ivory);line-height:1}

    /* ── ASYNC GRID — účetnictví nahoře, ostatní pod ── */
    .sklad-grid{
      display:grid;
      grid-template-columns:1.4fr 1fr;
      grid-template-areas:
        "ucet ucet"
        "zbrane weed"
        "drogy chemky";
      gap:1.5rem;
    }
    .area-ucet{grid-area:ucet}
    .area-zbrane{grid-area:zbrane}
    .area-weed{grid-area:weed}
    .area-drogy{grid-area:drogy}
    .area-chemky{grid-area:chemky}

    /* Zvýraznění účetní karty */
    .card-finance{
      border-top:2px solid var(--brass);
      background:linear-gradient(160deg,rgba(182,138,78,0.06) 0%,var(--panel2) 50%);
    }
    .card-finance .card-title{font-size:0.82rem}

    /* Hodinky */
    .sklad-clock{font-family:var(--font-mono);font-size:1.2rem;color:var(--ivory-dim);letter-spacing:0.08em}
    .sklad-clock-date{font-family:var(--font-label);font-size:0.54rem;color:var(--ivory-faint);letter-spacing:0.12em;text-transform:uppercase;margin-top:0.3rem}

    @media(max-width:900px){
      .tally-strip{grid-template-columns:repeat(3,1fr)}
      .sklad-grid{grid-template-columns:1fr;grid-template-areas:"ucet""zbrane""weed""drogy""chemky"}
      .sklad-opener{flex-direction:column;align-items:flex-start;gap:0.8rem}
    }
    @media(max-width:600px){.tally-strip{grid-template-columns:repeat(2,1fr)}}
  </style>
  </head><body>
  ${renderNav(req, 'sklad')}
  <main>

    <div class="sklad-opener">
      <div>
        <div class="sklad-opener-tag">Centrální sklad organizace</div>
        <h1>Vítej, ${icName}</h1>
        <p>Eviduj pohyb zbraní, weedu, drog, chemikálií a financí. Každý zápis se ihned promítne do tabulky a odešle na Discord.</p>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="sklad-clock" id="live-clock">--:--:--</div>
        <div class="sklad-clock-date" id="live-date"></div>
      </div>
    </div>

    <!-- Tally strip -->
    <div class="tally-strip">
      <div class="tally-cell">
        <div class="tally-cell-label">Zůstatek SAD</div>
        <div class="tally-cell-val" style="color:var(--brass-bright)">$${ucet.usd.toLocaleString('cs-CZ')}</div>
      </div>
      <div class="tally-cell">
        <div class="tally-cell-label">Pesos</div>
        <div class="tally-cell-val">₱${ucet.pesos.toLocaleString('cs-CZ')}</div>
      </div>
      <div class="tally-cell">
        <div class="tally-cell-label">Weed</div>
        <div class="tally-cell-val" style="color:#7A9A4A">${Object.values(weed).filter(q=>q>0).reduce((a,b)=>a+b,0)} ks</div>
      </div>
      <div class="tally-cell">
        <div class="tally-cell-label">Drogy</div>
        <div class="tally-cell-val" style="color:var(--oxblood-bright)">${Object.values(drogy).filter(q=>q>0).reduce((a,b)=>a+b,0)} ks</div>
      </div>
      <div class="tally-cell">
        <div class="tally-cell-label">Chemikálie</div>
        <div class="tally-cell-val" style="color:#6FA8C9">${Object.values(chemky||{}).filter(q=>q>0).reduce((a,b)=>a+b,0)} ks</div>
      </div>
      <div class="tally-cell">
        <div class="tally-cell-label">Hodnota weedu</div>
        <div class="tally-cell-val" style="color:var(--brass)">$${totalValue.toLocaleString('cs-CZ')}</div>
      </div>
    </div>

    <!-- Karty skladu -->
    <div class="sklad-grid">

      <!-- Účetnictví -->
      <div class="card card-finance area-ucet">
        <div class="card-header">
          <span class="card-title">Účetnictví organizace</span>
          <span class="card-badge">Finance · vede rejstřík</span>
        </div>
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
          <div class="form-group" style="margin-bottom:0.5rem"><label>Poznámka</label><input type="text" id="ucet-poznamka" placeholder="Prodej zboží, plat…"></div>
          <button class="btn-submit" onclick="submitUcet()">Potvrdit transakci</button>
        </div>
      </div>

      <!-- Zbraně -->
      <div class="card area-zbrane">
        <div class="card-header"><span class="card-title">Zbraně &amp; Střelivo</span><span class="card-badge">Sklad</span></div>
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
            <div class="form-group" id="zbrane-ucel-wrap" style="display:none"><label>Účel výběru</label><input type="text" id="zbrane-ucel" placeholder="Mise, ochrana…"></div>
          </div>
          <button class="btn-submit" onclick="submitZbrane()">Potvrdit akci</button>
        </div>
      </div>

      <!-- Weed -->
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

      <!-- Drogy -->
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

      <!-- Chemky -->
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

  <!-- MODAL -->
  <div class="modal-overlay" id="confirmModal">
    <div class="modal-box" id="modalBox">
      <div class="seal-stamp" id="sealStamp"><span>A</span></div>
      <div class="modal-title" id="modalTitle">Potvrdit akci</div>
      <div class="modal-subtitle" id="modalSubtitle">Opravdu chceš provést tuto operaci?</div>
      <dl class="modal-detail" id="modalDetail"></dl>
      <div class="modal-actions">
        <button class="modal-btn-cancel" onclick="closeModal()">Zrušit</button>
        <button class="modal-btn-confirm" id="modalConfirmBtn">Potvrdit</button>
      </div>
    </div>
  </div>
  <div class="toast" id="toast"></div>

  <script>
    // Hodiny
    function updateClock(){
      const now=new Date();
      document.getElementById('live-clock').textContent=now.toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
      document.getElementById('live-date').textContent=now.toLocaleDateString('cs-CZ',{weekday:'long',day:'numeric',month:'long'});
    }
    updateClock();setInterval(updateClock,1000);

    // Modal
    let _pendingAction=null;
    let _audioCtx=null;
    function playSealThud(){
      try{
        _audioCtx=_audioCtx||new(window.AudioContext||window.webkitAudioContext)();
        const ctx=_audioCtx;if(ctx.state==='suspended')ctx.resume();
        const now=ctx.currentTime;
        const osc=ctx.createOscillator();osc.type='sine';osc.frequency.setValueAtTime(180,now);osc.frequency.exponentialRampToValueAtTime(48,now+0.16);
        const gain=ctx.createGain();gain.gain.setValueAtTime(0.0001,now);gain.gain.exponentialRampToValueAtTime(0.5,now+0.012);gain.gain.exponentialRampToValueAtTime(0.0001,now+0.32);
        osc.connect(gain);const master=ctx.createGain();master.gain.value=0.9;gain.connect(master);master.connect(ctx.destination);osc.start(now);osc.stop(now+0.34);
      }catch(e){}
    }
    function showModal(title,subtitle,details,actionFn){
      document.getElementById('modalTitle').textContent=title;
      document.getElementById('modalSubtitle').textContent=subtitle;
      const dl=document.getElementById('modalDetail');
      dl.innerHTML=details.map(([k,v])=>'<dt>'+k+'</dt><dd>'+v+'</dd>').join('');
      _pendingAction=actionFn;
      document.getElementById('confirmModal').classList.add('open');
      document.getElementById('modalConfirmBtn').textContent='Potvrdit';
      const seal=document.getElementById('sealStamp');
      seal.className='seal-stamp';
      document.getElementById('modalBox').classList.remove('stamped','thud');
    }
    function closeModal(){document.getElementById('confirmModal').classList.remove('open');_pendingAction=null;}
    document.getElementById('modalConfirmBtn').addEventListener('click',async()=>{
      if(!_pendingAction)return;
      const btn=document.getElementById('modalBox');
      const seal=document.getElementById('sealStamp');
      const confirmBtn=document.getElementById('modalConfirmBtn');
      confirmBtn.disabled=true;confirmBtn.textContent='Pečetím…';
      btn.classList.add('stamped','thud');seal.classList.add('slam');
      setTimeout(playSealThud,340);
      await new Promise(r=>setTimeout(r,560));
      confirmBtn.textContent='Odesílám…';
      await _pendingAction();
      seal.classList.add('fade-out');
      await new Promise(r=>setTimeout(r,260));
      confirmBtn.disabled=false;closeModal();
    });
    document.getElementById('confirmModal').addEventListener('click',(e)=>{if(e.target===e.currentTarget)closeModal();});
    document.addEventListener('keydown',(e)=>{if(e.key==='Escape')closeModal();});

    // Sklad logika
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
      if(badge)badge.textContent=items.length;
    }
    updateZbraneItems();

    function setTyp(prefix,typ,btn){
      document.getElementById(prefix+'-typ').value=typ;
      btn.parentElement.querySelectorAll('.typ-btn').forEach(b=>b.className='typ-btn');
      btn.className='typ-btn '+(typ==='VKLAD'||typ==='PŘÍJEM'?'active-vklad':'active-vyber');
      if(prefix==='zbrane')document.getElementById('zbrane-ucel-wrap').style.display=typ==='VÝBĚR'?'flex':'none';
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
        'Potvrzením zapečetíš zápis do rejstříku.',
        [['Typ',typ],['Položka',polozka],['Množství',mnozstvi+' ks'],['Kategorie',kategorie],...(ucel?[['Účel',ucel]]:[])],
        async()=>{
          const r=await post('/api/zbrane',{typ,polozka,mnozstvi,kategorie,ucel});
          if(r.ok){showToast('Zápis uložen');setTimeout(()=>location.reload(),1500);}
          else showToast(r.error,true);
        }
      );
    }

    function updateWeedInfo(){
      const odruda=document.getElementById('weed-odruda').value;
      const qty=parseInt(document.getElementById('weed-mnozstvi').value)||1;
      const c=WEED_CENY[odruda];if(!c)return;
      const box=document.getElementById('weed-info');
      box.style.display='block';
      box.innerHTML='Výroba: ~$'+(c.vyroba*qty)+'&ensp;·&ensp;Prodej: $'+(c.prodej*qty);
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
        typ==='VKLAD'?'Vložit weed':'Vybrat weed',
        'Potvrzením zapečetíš zápis do rejstříku.',
        [['Typ',typ],['Odrůda',odruda],['Množství',mnozstvi+' ks'],['Výroba','~$'+(c.vyroba*mnozstvi)],['Prodej','$'+(c.prodej*mnozstvi)]],
        async()=>{
          const r=await post('/api/weed',{typ,odruda,mnozstvi});
          if(r.ok){showToast('Weed uložen — Výroba: ~$'+r.celkVyroba+' · Prodej: $'+r.celkProdej);setTimeout(()=>location.reload(),2000);}
          else showToast(r.error,true);
        }
      );
    }

    async function submitDrogy(){
      const typ=document.getElementById('drogy-typ').value;
      const droga=document.getElementById('drogy-droga').value;
      const mnozstvi=document.getElementById('drogy-mnozstvi').value;
      showModal(
        typ==='VKLAD'?'Vložit drogy':'Vybrat drogy',
        'Potvrzením zapečetíš zápis do rejstříku.',
        [['Typ',typ],['Droga',droga],['Množství',mnozstvi+' ks']],
        async()=>{
          const r=await post('/api/drogy',{typ,droga,mnozstvi});
          if(r.ok){showToast('Drogy uloženy');setTimeout(()=>location.reload(),1500);}
          else showToast(r.error,true);
        }
      );
    }

    async function submitUcet(){
      const typ=document.getElementById('ucet-typ').value;
      const castka=document.getElementById('ucet-castka').value;
      const valuta=document.getElementById('ucet-valuta').value;
      const poznamka=document.getElementById('ucet-poznamka').value;
      if(!castka||!poznamka)return showToast('Vyplň všechna pole',true);
      const sym=valuta==='USD'?'$':'₱';
      showModal(
        typ==='PŘÍJEM'?'Zaznamenat příjem':'Zaznamenat výdaj',
        'Tato transakce bude zapsána do účetnictví organizace.',
        [['Typ',typ],['Částka',sym+castka],['Valuta',valuta],['Poznámka',poznamka]],
        async()=>{
          const r=await post('/api/ucet',{typ,castka,valuta,poznamka});
          if(r.ok){showToast('Transakce zaznamenána');setTimeout(()=>location.reload(),1500);}
          else showToast(r.error,true);
        }
      );
    }

    async function submitChemky(){
      const typ=document.getElementById('chemky-typ').value;
      const chemikalie=document.getElementById('chemky-chemikalie').value;
      const mnozstvi=document.getElementById('chemky-mnozstvi').value;
      showModal(
        typ==='VKLAD'?'Vložit chemikálii':'Vybrat chemikálii',
        'Potvrzením zapečetíš zápis do rejstříku.',
        [['Typ',typ],['Chemikálie',chemikalie],['Množství',mnozstvi+' ks']],
        async()=>{
          const r=await post('/api/chemky',{typ,chemikalie,mnozstvi});
          if(r.ok){showToast('Chemikálie uložena');setTimeout(()=>location.reload(),1500);}
          else showToast(r.error,true);
        }
      );
    }
  </script>
  </body></html>`;
}

module.exports = { renderDashboard };
