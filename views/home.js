// views/home.js — CALEDONIA PRIVATE NETWORK · Dashboard v6 (CZ)
//
// Staff (level 1-2) dashboard: Caledonia Index (reálný vzorec přes
// /api/caledonia-index), Live Pulse (tep vázaný na stejná data),
// minimalistické finanční statistiky, Denní hlášení, Nedávná aktivita jako
// tichá časová osa, dlaždice Rychlého přístupu. Member/Associate dashboard
// má svůj vlastní layout (dle schváleného mocku): hlavička
// hodnost/operace/loajalita, karta "Tvoje operace" (napojená na weed
// timery), zůstatky, mřížka Rychlého přístupu (Garáž/Nemovitosti/Weed/Weed
// Timer/Vklad/Reserve Fund), Nedávná aktivita. Stejná signatura
// renderHome(req, data) jako dřív — server.js nepotřebuje žádnou změnu.

const { ledgerEmpty } = require('../styles');
const { renderNav } = require('../nav');
const { canAccess } = require('../roles');
const { escapeHtml } = require('../utils');

function renderHome(req, data) {
  const { zbrane, weed, drogy, chemky, ucet, recentUcet, recentZbrane, recentWeed, recentDrogy, recentChemky } = data;
  const icName = req.session.icName;
  const accessLevel = req.session.accessLevel || 3;
  const isRestricted = accessLevel >= 3;
  const canSklad = canAccess(accessLevel, 'sklad');
  const RANK_LABEL = { 1: 'Founder / Council', 2: 'Senior Member', 3: 'Member / Associate' };

  const WEED_P = { "Žlutý kanabis": 150, "Zelený kanabis": 150, "Kanabis": 150, "Červený kanabis": 150, "Modrý kanabis": 150 };
  let totalValue = 0;
  Object.entries(weed).forEach(([k, q]) => { if (q > 0 && WEED_P[k]) totalValue += q * WEED_P[k]; });
  const totalWeed = Object.values(weed).filter(q => q > 0).reduce((a, b) => a + b, 0);
  const totalDrogy = Object.values(drogy).filter(q => q > 0).reduce((a, b) => a + b, 0);
  const totalZbrane = Object.values(zbrane).filter(q => q > 0).reduce((a, b) => a + b, 0);
  const totalChemky = Object.values(chemky || {}).filter(q => q > 0).reduce((a, b) => a + b, 0);

  const allRecent = [
    ...recentZbrane.map(r => ({ sekce: 'Zbraně', typ: r[1] || '', title: `${r[1]} — ${r[2] || '?'}`, sub: `${r[3] || '?'} ks · ${r[5] || '—'}`, cas: r[0] || '' })),
    ...recentWeed.map(r => ({ sekce: 'Weed', typ: r[1] || '', title: `${r[1]} — ${r[2] || '?'}`, sub: `${r[3] || '?'} ks · ${r[6] || r[5] || '—'}`, cas: r[0] || '' })),
    ...recentDrogy.map(r => ({ sekce: 'Drogy', typ: r[1] || '', title: `${r[1]} — ${r[2] || '?'}`, sub: `${r[3] || '?'} ks · ${r[6] || r[5] || '—'}`, cas: r[0] || '' })),
    ...(recentChemky || []).map(r => ({ sekce: 'Chemky', typ: r[1] || '', title: `${r[1]} — ${r[2] || '?'}`, sub: `${r[3] || '?'} ks · ${r[4] || '—'}`, cas: r[0] || '' })),
    ...recentUcet.map(r => {
      const sym = (r[3] || '') === 'USD' ? 'SAD ' : '₱';
      const isIn = r[1] === 'PŘÍJEM';
      return { sekce: 'Finance', typ: r[1] || '', title: (r[1] || '') + ' — ' + (r[4] || '—'), sub: r[5] || '—', cas: r[0] || '', amount: (isIn ? '+' : '-') + sym + r[2] };
    }),
  ].sort((a, b) => b.cas.localeCompare(a.cas)).slice(0, 8);

  const timelineHtml = allRecent.length ? allRecent.map(ev => {
    const isIn = /VKLAD|PŘÍJEM/.test((ev.typ || '').toUpperCase());
    const timePart = (ev.cas.match(/\d{1,2}:\d{2}(:\d{2})?/) || [ev.cas])[0];
    return `<div class="qt-row">
      <div class="qt-time">${timePart}</div>
      <div class="qt-main"><div class="qt-title">${ev.title}</div><div class="qt-sub">${ev.sub}</div></div>
      <div class="qt-amount ${isIn ? 'pos' : 'neg'}">${ev.amount || (isIn ? '+' : '−')}</div>
    </div>`;
  }).join('') : `<div style="padding:1.4rem 0">${ledgerEmpty('Rejstřík dosud beze zápisu', true)}</div>`;

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Dobré ráno' : greetingHour < 18 ? 'Dobré odpoledne' : 'Dobrý večer';
  const firstName = (icName || '').split(' ')[0] || icName;
  const today = new Date();
  const dateStr = today.toLocaleDateString('cs-CZ', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Dashboard</title>
  ${require('../styles').baseStyles()}
  <style>
    .dash-top-row{display:flex;align-items:flex-start;justify-content:space-between;gap:2rem;margin-bottom:2.4rem;flex-wrap:wrap}
    .dash-greet-eyebrow{font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--ivory-faint);margin-bottom:0.5rem}
    .dash-greet-title{font-family:var(--font-display);font-weight:600;font-size:clamp(2.2rem,4.4vw,3.2rem);color:var(--ivory);line-height:1}
    .dash-greet-title .dot{color:var(--oxblood-bright)}
    .dash-rank-row{display:flex;align-items:center;gap:0.8rem;margin-top:0.7rem;font-family:var(--font-label);font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--brass)}
    .dash-rank-rule{flex:1;height:1px;background:var(--border);max-width:220px}
    .dash-clock-box{text-align:right}
    .dash-clock{font-family:var(--font-mono);font-size:1rem;color:var(--ivory-dim)}
    .dash-date{font-family:var(--font-label);font-size:0.5rem;color:var(--ivory-faint);letter-spacing:0.1em;margin-top:0.3rem}

    .dash-top-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:1.4rem;margin-bottom:1.4rem}
    @media(max-width:980px){.dash-top-grid{grid-template-columns:1fr}}

    .finance-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);margin-bottom:1.4rem}
    .finance-tile{background:var(--panel2);padding:1.3rem 1.4rem}
    .finance-tile-label{font-family:var(--font-label);font-size:0.5rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--brass);margin-bottom:0.6rem}
    .finance-tile-val{font-family:var(--font-display);font-size:1.5rem;color:var(--ivory);font-weight:600;line-height:1}
    .finance-tile-sub{font-family:var(--font-mono);font-size:0.6rem;color:var(--ivory-faint);margin-top:0.4rem}
    .finance-tile-sub.pos{color:#7CC79A}
    @media(max-width:760px){.finance-strip{grid-template-columns:repeat(2,1fr)}}

    .dash-lower-grid{display:grid;grid-template-columns:1.6fr 1fr;gap:1.4rem}
    @media(max-width:980px){.dash-lower-grid{grid-template-columns:1fr}}

    .quote-strip{margin-top:1.6rem;padding:1rem 1.4rem;border-top:1px solid var(--border);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;font-family:var(--font-display);font-style:italic;font-size:1rem;color:var(--ivory-dim)}
    .quote-strip .sig{font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.14em;color:var(--oxblood-bright);text-transform:uppercase;font-style:normal}

    .op-card{background:var(--panel2);border:1px solid var(--border);padding:1.5rem 1.7rem}
    .op-card-label{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--brass);margin-bottom:0.7rem}
    .op-card-title{font-family:var(--font-display);font-size:1.35rem;color:var(--ivory);margin-bottom:1.1rem}
    .op-track{height:4px;background:var(--border);position:relative;margin-bottom:0.6rem}
    .op-fill{height:100%;background:var(--oxblood-bright)}
    .op-meta-row{display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:0.68rem;color:var(--ivory-faint)}

    .balance-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);margin:1.6rem 0}
    .balance-tile{background:var(--panel2);padding:1.2rem 1.3rem;text-align:center}
    .balance-label{font-family:var(--font-label);font-size:0.5rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--brass);margin-bottom:0.5rem}
    .balance-val{font-family:var(--font-display);font-size:1.4rem;color:var(--ivory);font-weight:600}
  </style>
  </head><body>
  ${renderNav(req, 'home')}
  <main>

    <div id="weekly-banner" style="display:none;background:var(--brass-faint);border:1px solid var(--border-brass);padding:0.9rem 1.4rem;margin-bottom:1.6rem;font-family:var(--font-body);font-size:0.86rem;text-align:center"></div>

    <div class="dash-top-row">
      <div>
        <div class="dash-greet-eyebrow">${isRestricted ? 'Nástěnka člena' : 'Organizace Caledonia'}</div>
        <div class="dash-greet-title">${greeting},<br>${escapeHtml(firstName)}<span class="dot">.</span></div>
        <div class="dash-rank-row">${RANK_LABEL[accessLevel]}<span class="dash-rank-rule"></span></div>
      </div>
      <div class="dash-clock-box">
        <div class="dash-clock" id="live-clock-hero">--:--:--</div>
        <div class="dash-date">${dateStr}</div>
      </div>
    </div>

    ${!isRestricted ? renderStaffDashboard() : renderMemberDashboard()}

  </main>
  <div class="modal-overlay" id="onboardModal">
    <div class="modal-box" style="max-width:560px;text-align:left">
      <div class="modal-title">Vítej v Caledonii</div>
      <div class="modal-subtitle" id="onb-step-content" style="line-height:1.8"></div>
      <div style="display:flex;justify-content:center;gap:0.4rem;margin:1rem 0">
        <span class="onb-dot" data-i="0" style="width:6px;height:6px;border-radius:50%;background:var(--border-brass);display:inline-block"></span>
        <span class="onb-dot" data-i="1" style="width:6px;height:6px;border-radius:50%;background:var(--border-brass);display:inline-block"></span>
        <span class="onb-dot" data-i="2" style="width:6px;height:6px;border-radius:50%;background:var(--border-brass);display:inline-block"></span>
        <span class="onb-dot" data-i="3" style="width:6px;height:6px;border-radius:50%;background:var(--border-brass);display:inline-block"></span>
      </div>
      <div class="modal-actions">
        <button class="modal-btn-cancel" onclick="onbPrev()" id="onbBackBtn">Zpět</button>
        <button class="modal-btn-confirm" onclick="onbNext()" id="onbNextBtn">Další</button>
      </div>
    </div>
  </div>
  <div class="toast" id="toast"></div>
  <script>
    (function clock(){
      const ch=document.getElementById('live-clock-hero');
      function tick(){ if(ch) ch.textContent=new Date().toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); }
      tick();setInterval(tick,1000);
    })();
    const RESTRICTED_HOME = ${isRestricted ? 'true' : 'false'};

    // ── VYSÍLAČKA — čtení existujícího Discord kanálu, viditelné pro úplně
    // každého na hlavním dashboardu (viz /api/vysilacka/latest v server.js) ──
    function vysEsc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    async function loadVysilacka(){
      const freqEl = document.getElementById('vysilacka-frekvence');
      const platEl = document.getElementById('vysilacka-platnost');
      if(!freqEl) return;
      try{
        const res = await fetch('/api/vysilacka/latest');
        const d = await res.json();
        if(!d.ok || !d.frekvence){ freqEl.textContent = '—'; if(platEl) platEl.textContent = 'Zatím žádná frekvence.'; return; }
        freqEl.textContent = d.frekvence;
        if(platEl) platEl.textContent = d.platnost || '';
      }catch(e){}
    }
    loadVysilacka();
    setInterval(loadVysilacka, 20000);
    ${!isRestricted ? staffDashboardScript() : memberDashboardScript()}

    // ── ONBOARDING (beze změny chování) ──
    const ONB_STEPS = [
      '<strong style="color:var(--brass-bright)">Krátká historie.</strong><br>Caledonia vznikla krátce po příchodu Christophera Sinclaira do Los Santos. <a href="/lore" style="color:var(--brass)">Číst kroniku →</a>',
      '<strong style="color:var(--brass-bright)">Kodex.</strong><br>Deset principů závazných pro každého člena. <a href="/kodex" style="color:var(--brass)">Přečíst kodex →</a>',
      '<strong style="color:var(--brass-bright)">Hierarchie.</strong><br>Pět úrovní členství. <a href="/hierarchy" style="color:var(--brass)">Zobrazit hierarchii →</a>',
      '<strong style="color:var(--brass-bright)">První kroky.</strong><br>Sleduj Nástěnku, drž se Kodexu a v případě dotazů kontaktuj Senior Membera.',
    ];
    let onbStep=0;
    function onbRender(){
      document.getElementById('onb-step-content').innerHTML=ONB_STEPS[onbStep];
      document.querySelectorAll('.onb-dot').forEach((d,i)=>{ d.style.background = i===onbStep ? 'var(--oxblood-bright)' : 'var(--border-brass)'; });
      document.getElementById('onbBackBtn').style.visibility=onbStep===0?'hidden':'visible';
      document.getElementById('onbNextBtn').textContent=onbStep===ONB_STEPS.length-1?'Začít':'Další';
    }
    function onbNext(){ if(onbStep<ONB_STEPS.length-1){onbStep++;onbRender();} else {document.getElementById('onboardModal').classList.remove('open');fetch('/api/me/onboarding/seen',{method:'POST'});} }
    function onbPrev(){if(onbStep>0){onbStep--;onbRender();}}
    fetch('/api/me/onboarding').then(r=>r.json()).then(d=>{ if(d.ok && !d.seen){onbRender();document.getElementById('onboardModal').classList.add('open');} }).catch(()=>{});

    ${!isRestricted ? `fetch('/api/weekly-summary').then(r=>r.json()).then(d=>{
      if(!d.ok)return;
      const el=document.getElementById('weekly-banner');
      const netTxt=(d.net>=0?'vydělala':'prodělala')+' $'+Math.abs(Math.round(d.net)).toLocaleString('cs-CZ');
      el.innerHTML='<strong style="color:var(--brass-bright)">Tento týden Caledonia</strong> '+netTxt+' napříč '+d.ops+' finančními operacemi.';
      el.style.display='block';
    }).catch(()=>{});` : ''}
  </script>
  </body></html>`;

  // ── ZNAČENÍ STAFF DASHBOARDU ────────────────────────────────────────────
  function renderStaffDashboard() {
    return `
    <div class="dash-top-grid">
      <div class="index-card">
        <div class="index-eyebrow">Index Caledonie</div>
        <div class="index-value"><span id="idx-value">—</span><span class="index-delta" id="idx-delta"></span></div>
        <div class="index-health">Provozní stav<strong id="idx-health">—</strong></div>
      </div>
      <div class="pulse-card">
        <div class="pulse-title"><span class="pulse-dot"></span>Živý puls</div>
        <svg class="pulse-svg" viewBox="0 0 400 60" preserveAspectRatio="none" style="width:100%;height:52px"><path id="pulse-path" d="M0 30 L400 30"/></svg>
        <div class="pulse-stats">
          <div><div class="pulse-stat-num" id="pulse-ops">—</div><div class="pulse-stat-label">Aktivní členové</div></div>
          <div><div class="pulse-stat-num" id="pulse-members">—</div><div class="pulse-stat-label">Celkem členů</div></div>
          <div><div class="pulse-stat-num" id="pulse-moved">—</div><div class="pulse-stat-label">Reserve $ dnes</div></div>
          <div><div class="pulse-stat-num" id="pulse-tx">—</div><div class="pulse-stat-label">Skladové jednotky</div></div>
        </div>
      </div>
    </div>

    <div class="dash-widget" style="margin-bottom:1.4rem">
      <div class="dash-widget-title"><span>📻 Vysílačka</span></div>
      <div style="padding-top:0.7rem">
        <div style="font-family:var(--font-label);font-size:0.5rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--brass);margin-bottom:0.4rem">Aktuální frekvence</div>
        <div id="vysilacka-frekvence" style="font-family:var(--font-display);font-weight:700;font-size:2.4rem;color:var(--oxblood-bright);letter-spacing:0.04em;line-height:1">—</div>
        <div id="vysilacka-platnost" style="font-family:var(--font-mono);font-size:0.66rem;color:var(--ivory-faint);margin-top:0.5rem"></div>
      </div>
    </div>

    <div class="finance-strip">
      <div class="finance-tile"><div class="finance-tile-label">Hotovostní rezerva</div><div class="finance-tile-val" id="tally-usd">$${ucet.usd.toLocaleString('cs-CZ')}</div><div class="finance-tile-sub">SAD</div></div>
      <div class="finance-tile"><div class="finance-tile-label">Vedlejší rezerva</div><div class="finance-tile-val" id="tally-pesos">₱${ucet.pesos.toLocaleString('cs-CZ')}</div><div class="finance-tile-sub">Pesos</div></div>
      <div class="finance-tile"><div class="finance-tile-label">Sklad</div><div class="finance-tile-val" id="qs-stock">${(totalWeed + totalDrogy + totalZbrane + totalChemky).toLocaleString('cs-CZ')}</div><div class="finance-tile-sub">kusů na skladě</div></div>
      <div class="finance-tile"><div class="finance-tile-label">Odhad hodnoty weedu</div><div class="finance-tile-val" id="tally-weed-value">$${totalValue.toLocaleString('cs-CZ')}</div><div class="finance-tile-sub">v prodejní ceně</div></div>
    </div>

    <div class="dash-lower-grid">
      <div>
        <div class="dash-widget">
          <div class="dash-widget-title"><span>Nedávná aktivita</span></div>
          <div class="quiet-timeline" id="activity-stream">${timelineHtml}</div>
        </div>
        <div class="quote-strip"><span>"Kázeň. Loajalita. Výsledky."</span><span class="sig">— Caledonia</span></div>
      </div>
      <div>
        <div class="briefing-card" style="margin-bottom:1.2rem">
          <div class="briefing-eyebrow">Denní hlášení</div>
          <div class="briefing-title" id="briefing-title">${greeting}, ${escapeHtml(firstName)}.</div>
          <div class="briefing-text" id="briefing-text">Načítám provozní souhrn…</div>
          <a href="/blackbook" class="briefing-link">Zobrazit celé hlášení →</a>
        </div>
        <div class="quick-tile-grid">
          ${canAccess(accessLevel, 'sklad') ? `<a href="/sklad" class="quick-tile">${svgIcon('sklad')}<div><div class="quick-tile-label">Sklad</div><div class="quick-tile-sub">Evidence</div></div></a>` : ''}
          <a href="/garaz" class="quick-tile">${svgIcon('garaz')}<div><div class="quick-tile-label">Garáž</div><div class="quick-tile-sub">Vozový park</div></div></a>
          ${canAccess(accessLevel, 'blackbook') ? `<a href="/blackbook" class="quick-tile">${svgIcon('blackbook')}<div><div class="quick-tile-label">Blackbook</div><div class="quick-tile-sub">Reporty</div></div></a>` : ''}
          ${canAccess(accessLevel, 'audit') ? `<a href="/audit" class="quick-tile">${svgIcon('audit')}<div><div class="quick-tile-label">Audit</div><div class="quick-tile-sub">Historie</div></div></a>` : ''}
        </div>
      </div>
    </div>
    `;
  }

  function svgIcon(name) {
    const map = {
      sklad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="10" width="4" height="10"/><rect x="10" y="5" width="4" height="15"/><rect x="17" y="13" width="4" height="7"/></svg>',
      garaz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 13l2-6h14l2 6"/><rect x="2" y="13" width="20" height="6" rx="1"/><circle cx="7" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg>',
      blackbook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3Z"/></svg>',
      audit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
      properties: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
      weed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2C9 6 8 9 8 12a4 4 0 0 0 8 0c0-3-1-6-4-10Z"/><path d="M12 12v10"/></svg>',
      timer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 2h6"/></svg>',
      deposit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="14" rx="1"/><path d="M2 10h20"/></svg>',
      reserve: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 21V9l8-5 8 5v12"/><path d="M9 21v-6h6v6"/></svg>',
    };
    return map[name] || '';
  }

  function staffDashboardScript() {
    return `
    async function loadIndex(){
      try{
        const res=await fetch('/api/caledonia-index');
        const d=await res.json();
        if(!d.ok)return;
        document.getElementById('idx-value').textContent=d.index;
        const deltaEl=document.getElementById('idx-delta');
        deltaEl.textContent=(d.deltaPct>=0?'↑ ':'↓ ')+Math.abs(d.deltaPct)+'%';
        deltaEl.className='index-delta '+(d.deltaPct>=0?'up':'down');
        document.getElementById('idx-health').textContent=d.health;
        document.getElementById('pulse-ops').textContent=d.activniPocet;
        document.getElementById('pulse-members').textContent=d.celkemClenu;
        document.getElementById('pulse-moved').textContent='$'+Math.round(d.pokladnaUsd).toLocaleString('cs-CZ');
        document.getElementById('pulse-tx').textContent=d.skladCelkem.toLocaleString('cs-CZ');
        drawPulse(d.index);
      }catch(e){}
    }
    function drawPulse(index){
      const path=document.getElementById('pulse-path');
      if(!path)return;
      const amp = 6 + (index/100)*18;
      let d='M0 30 ';
      for(let x=0;x<400;x+=40){
        d += 'L'+(x+14)+' 30 L'+(x+18)+' '+(30-amp)+' L'+(x+22)+' '+(30+amp*0.6)+' L'+(x+26)+' 30 L'+(x+40)+' 30 ';
      }
      path.setAttribute('d', d);
    }
    loadIndex();
    setInterval(loadIndex, 60000);

    async function loadBriefing(){
      try{
        const res=await fetch('/api/weekly-summary');
        const d=await res.json();
        const el=document.getElementById('briefing-text');
        if(d.ok) el.textContent='Caledonia zaznamenala '+d.ops+' finančních pohybů tento týden, čistě '+(d.net>=0?'+':'')+'$'+Math.round(d.net).toLocaleString('cs-CZ')+'.';
        else el.textContent='Zatím nejsou dostupná žádná finanční data.';
      }catch(e){}
    }
    loadBriefing();

    const evtHome = window.evtSource || new EventSource('/api/events');
    function prependActivity(title, sub, amount, isIn){
      const stream = document.getElementById('activity-stream');
      if (!stream) return;
      const row = document.createElement('div');
      row.className = 'qt-row';
      row.innerHTML = '<div class="qt-time">'+new Date().toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'})+'</div>'+
        '<div class="qt-main"><div class="qt-title">'+title+'</div><div class="qt-sub">'+sub+'</div></div>'+
        '<div class="qt-amount '+(isIn?'pos':'neg')+'">'+amount+'</div>';
      stream.prepend(row);
      if (window.rewardFlash) window.rewardFlash(row);
      while (stream.children.length > 8) stream.lastElementChild.remove();
    }
    evtHome.addEventListener('skladUpdate', (e) => {
      const d = JSON.parse(e.data);
      const label = d.sekce==='zbrane'?'Zbraně':d.sekce==='weed'?'Weed':d.sekce==='chemky'?'Chemky':d.sekce==='undo'?null:'Drogy';
      const item = d.polozka||d.odruda||d.droga||d.chemikalie||'';
      if (label) prependActivity(d.typ+' — '+item, (d.qty||'')+' ks · '+d.uzivatel, /VKLAD/.test(d.typ)?'+':'−', /VKLAD/.test(d.typ));
      loadIndex();
    });
    evtHome.addEventListener('ucetUpdate', (e) => {
      const d = JSON.parse(e.data);
      const sym = d.valuta === 'USD' ? 'SAD ' : '₱';
      const isIn = d.typ==='PŘÍJEM';
      prependActivity(d.typ+' — '+(d.poznamka||'—'), d.uzivatel, (isIn?'+':'-')+sym+d.castka, isIn);
      loadIndex();
    });
    `;
  }

  // ── ZNAČENÍ MEMBER DASHBOARDU (dle schváleného mocku) ────────────────────
  function renderMemberDashboard() {
    return `
    <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:1.6rem;align-items:start" id="memberGrid">
      <div>
        <div style="display:flex;gap:2rem;margin-bottom:1.6rem;flex-wrap:wrap">
          <div><div style="font-family:var(--font-label);font-size:0.5rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--ivory-faint);margin-bottom:0.3rem">Hodnost</div><div style="font-family:var(--font-display);font-size:1.1rem;color:var(--ivory)" id="member-rank">—</div></div>
          <div><div style="font-family:var(--font-label);font-size:0.5rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--ivory-faint);margin-bottom:0.3rem">Loajalita</div><div style="font-family:var(--font-display);font-size:1.1rem;color:var(--ivory)" id="member-badges">—</div></div>
        </div>

        <div class="op-card" style="margin-bottom:1.6rem">
          <div class="op-card-label">Pěstování</div>
          <div class="op-card-title" id="op-title">Načítám operaci…</div>
          <div class="op-track"><div class="op-fill" id="op-fill" style="width:0%"></div></div>
          <div class="op-meta-row"><span id="op-progress">—</span><span id="op-next">—</span></div>
        </div>

        <div class="balance-strip">
          <div class="balance-tile"><div class="balance-label">Zásoba weedu</div><div class="balance-val" id="member-weed">${totalWeed}</div></div>
          <div class="balance-tile"><div class="balance-label">Připraveno</div><div class="balance-val" id="member-ready" style="color:#7CC79A">—</div></div>
          <div class="balance-tile"><div class="balance-label">Roste</div><div class="balance-val" id="member-growing">—</div></div>
        </div>

        <div class="dash-widget" id="deposit" style="margin-bottom:1.4rem">
          <div class="dash-widget-title">Vklad — hotovost v kufru vozu</div>
          <div style="font-family:var(--font-body);font-size:0.8rem;color:var(--ivory-dim);margin-bottom:0.9rem;font-weight:300">Nech hotovost v kufru a nahlas to tady, ať má vedení potvrzení.</div>
          <div style="display:grid;grid-template-columns:1fr auto;gap:0.6rem">
            <div class="form-group"><label>Částka (SAD)</label><input type="number" id="kufrCastka" min="1" placeholder="1000"></div>
            <button class="btn-submit" id="kufrVkladBtn" onclick="kufrVklad()" style="margin-top:1.5rem;width:auto;padding:0.7rem 1.3rem">Nahlásit</button>
          </div>
          <div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--ivory-faint);margin-top:0.6rem" id="kufrVkladHint"></div>
        </div>

        <div class="dash-widget">
          <div class="dash-widget-title">Žlutý kanabis — rychlý výběr</div>
          <div style="display:grid;grid-template-columns:1fr auto;gap:0.6rem">
            <div class="form-group"><label>Množství (sáčky)</label><input type="number" id="yellowTakeQty" min="1" max="500" value="1"></div>
            <button class="btn-submit" id="yellowTakeBtn" onclick="yellowTake()" style="margin-top:1.5rem;width:auto;padding:0.7rem 1.3rem">Vzít</button>
          </div>
          <div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--ivory-faint);margin-top:0.6rem" id="yellowTakeHint"></div>
        </div>
      </div>

      <div>
        <div class="dash-widget" style="margin-bottom:1.4rem">
          <div class="dash-widget-title"><span>📻 Vysílačka</span></div>
          <div style="padding-top:0.7rem">
            <div style="font-family:var(--font-label);font-size:0.5rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--brass);margin-bottom:0.4rem">Aktuální frekvence</div>
            <div id="vysilacka-frekvence" style="font-family:var(--font-display);font-weight:700;font-size:2.4rem;color:var(--oxblood-bright);letter-spacing:0.04em;line-height:1">—</div>
            <div id="vysilacka-platnost" style="font-family:var(--font-mono);font-size:0.66rem;color:var(--ivory-faint);margin-top:0.5rem"></div>
          </div>
        </div>

        <div class="folio-label" style="margin-bottom:1rem">Rychlý přístup</div>
        <div class="quick-tile-grid" style="margin-bottom:1.6rem">
          <a href="/garaz" class="quick-tile">${svgIcon('garaz')}<div><div class="quick-tile-label">Garáž</div><div class="quick-tile-sub">Tvoje vozidla</div></div></a>
          <a href="/nemovitosti" class="quick-tile">${svgIcon('properties')}<div><div class="quick-tile-label">Nemovitosti</div><div class="quick-tile-sub">Tvoje nemovitosti</div></div></a>
          <a href="/weed-sazeni" class="quick-tile">${svgIcon('weed')}<div><div class="quick-tile-label">Weed</div><div class="quick-tile-sub">Tvoje rostliny</div></div></a>
          <a href="/weed-sazeni#timers" class="quick-tile">${svgIcon('timer')}<div><div class="quick-tile-label">Časovač weedu</div><div class="quick-tile-sub">Zkontrolovat časovače</div></div></a>
          <a href="/home#deposit" class="quick-tile">${svgIcon('deposit')}<div><div class="quick-tile-label">Vklad</div><div class="quick-tile-sub">Vložit peníze</div></div></a>
          <a href="/sklad" class="quick-tile">${svgIcon('reserve')}<div><div class="quick-tile-label">Reserve Fund</div><div class="quick-tile-sub">Tvůj zůstatek</div></div></a>
        </div>

        <div class="dash-widget">
          <div class="dash-widget-title"><span>Nedávná aktivita</span></div>
          <div class="quiet-timeline" id="member-activity-stream"><div class="ledger-loading">Načítám…</div></div>
        </div>
      </div>
    </div>
    <div class="quote-strip"><span>"Kázeň. Loajalita. Výsledky."</span><span class="sig">— Caledonia</span></div>
    `;
  }

  function memberDashboardScript() {
    return `
    window.yellowTake = async function(){
      const btn = document.getElementById('yellowTakeBtn');
      const hint = document.getElementById('yellowTakeHint');
      const qty = parseInt(document.getElementById('yellowTakeQty').value);
      if (!Number.isInteger(qty) || qty < 1 || qty > 500) { showToast('Množství musí být 1–500', true); return; }
      btn.disabled = true;
      try {
        const res = await fetch('/api/weed/yellow-take', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mnozstvi: qty }) });
        const d = await res.json();
        if (d.ok) { showToast('Žlutý kanabis — VÝBĚR (' + qty + ' ks) zapsáno'); hint.textContent = 'Naposledy vzato: ' + qty + ' ks'; }
        else showToast(d.error, true);
      } catch (e) { showToast('Zápis se nepodařil', true); }
      btn.disabled = false;
    };
    window.kufrVklad = async function(){
      const btn = document.getElementById('kufrVkladBtn');
      const hint = document.getElementById('kufrVkladHint');
      const castka = document.getElementById('kufrCastka').value;
      if (!castka || parseFloat(castka) <= 0) { showToast('Vyplň platnou částku', true); return; }
      btn.disabled = true;
      try {
        const res = await fetch('/api/kufr/vklad', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ castka }) });
        const d = await res.json();
        if (d.ok) { showToast('Vklad nahlášen — SAD ' + castka); hint.textContent = 'Naposledy nahlášeno: SAD ' + castka; document.getElementById('kufrCastka').value = ''; }
        else showToast(d.error, true);
      } catch (e) { showToast('Nahlášení se nepodařilo', true); }
      btn.disabled = false;
    };

    const RANK_LABEL = { 1: 'Founder / Council', 2: 'Senior Member', 3: 'Associate' };
    Promise.all([
      fetch('/api/me/session').then(r=>r.json()).catch(()=>null),
      fetch('/api/me/achievements').then(r=>r.json()).catch(()=>null),
    ]).then(([session, ach]) => {
      if (session && session.ok) document.getElementById('member-rank').textContent = RANK_LABEL[session.accessLevel] || '—';
      if (ach && ach.ok) document.getElementById('member-badges').textContent = ach.earned.length + ' odznaků';
    }).catch(() => {});

    fetch('/api/weed-timers').then(r=>r.json()).then(d => {
      if (!d.ok) return;
      const now = d.now || Date.now();
      const timers = d.timers || [];
      const ready = timers.filter(t => t.endsAt <= now).length;
      const growing = timers.length - ready;
      document.getElementById('member-ready').textContent = ready;
      document.getElementById('member-growing').textContent = growing;
      const active = timers.find(t => t.endsAt > now) || timers[0];
      if (active) {
        const totalMs = active.endsAt - active.startedAt;
        const doneMs = Math.min(totalMs, now - active.startedAt);
        const pct = totalMs > 0 ? Math.round((doneMs / totalMs) * 100) : 0;
        const doneHours = Math.round(doneMs / 3600000);
        const totalHours = Math.round(totalMs / 3600000);
        document.getElementById('op-title').textContent = active.icName + ' — ' + active.plants + ' kytek';
        document.getElementById('op-fill').style.width = pct + '%';
        document.getElementById('op-progress').textContent = doneHours + ' / ' + totalHours + ' hodin';
        const remainMs = Math.max(0, active.endsAt - now);
        const remainH = Math.floor(remainMs/3600000), remainM = Math.floor((remainMs%3600000)/60000);
        document.getElementById('op-next').textContent = remainMs > 0 ? ('Připraveno za ' + remainH + 'h ' + remainM + 'm') : 'Připraveno nyní';
      } else {
        document.getElementById('op-title').textContent = 'Žádné aktivní pěstování';
        document.getElementById('op-progress').textContent = '—';
        document.getElementById('op-next').textContent = '—';
      }
    }).catch(() => {});

    fetch('/api/me/history').then(r=>r.json()).then(d=>{
      const stream = document.getElementById('member-activity-stream');
      if (!stream) return;
      const items = [];
      (d.zbrane||[]).forEach(r=>items.push({cas:r[0],title:(r[1]||'')+' — '+(r[2]||''),sub:(r[3]||'')+' ks'}));
      (d.weed||[]).forEach(r=>items.push({cas:r[0],title:(r[1]||'')+' — '+(r[2]||''),sub:(r[3]||'')+' ks'}));
      items.sort((a,b)=>(b.cas||'').localeCompare(a.cas||''));
      if (!items.length) { stream.innerHTML = '<div style="padding:1rem 0;color:var(--ivory-faint);font-family:var(--font-mono);font-size:0.78rem">Zatím žádná aktivita</div>'; return; }
      stream.innerHTML = items.slice(0,8).map(ev => '<div class="qt-row"><div class="qt-time">'+((ev.cas||'').match(/\\d{1,2}:\\d{2}/)||[''])[0]+'</div><div class="qt-main"><div class="qt-title">'+ev.title+'</div><div class="qt-sub">'+ev.sub+'</div></div><div class="qt-amount"></div></div>').join('');
    }).catch(()=>{});
    `;
  }
}

module.exports = { renderHome };
