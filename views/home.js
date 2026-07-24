// home.js — Albion v4 · "Executive Noir" Dashboard
// Nové rozvržení inspirované referenčním návrhem (čistý horní pruh stat karet,
// aktivita + interní oznámení vedle sebe, rychlé akce, portál do Caledonia
// World, stav trezoru). Stejný podpis renderHome(req, data) a stejné klíče
// v `data` jako dřív — server.js se nemusí nijak měnit.

const { ledgerEmpty } = require('../styles');
const { renderNav } = require('../nav');
const { canAccess } = require('../roles');
const { escapeHtml } = require('../utils');

function renderHome(req, data) {
  const { zbrane, weed, drogy, chemky, ucet, recentUcet, recentZbrane, recentWeed, recentDrogy, recentChemky } = data;
  const icName = req.session.icName;
  const accessLevel = req.session.accessLevel || 3;
  const isRestricted = accessLevel >= 3;

  const WEED_P = { "Žlutý kanabis": 165, "Fialový kanabis": 165, "Kanabis": 165, "Červený kanabis": 165, "Modrý kanabis": 165 };

  let totalValue = 0;
  Object.entries(weed).forEach(([k, q]) => { if (q > 0 && WEED_P[k]) totalValue += q * WEED_P[k]; });

  const totalWeed = Object.values(weed).filter(q => q > 0).reduce((a, b) => a + b, 0);
  const totalDrogy = Object.values(drogy).filter(q => q > 0).reduce((a, b) => a + b, 0);
  const totalZbrane = Object.values(zbrane).filter(q => q > 0).reduce((a, b) => a + b, 0);
  const totalChemky = Object.values(chemky || {}).filter(q => q > 0).reduce((a, b) => a + b, 0);

  const topItems = (obj, limit = 5) => Object.entries(obj)
    .filter(([, q]) => q > 0).sort((a, b) => b[1] - a[1]).slice(0, limit)
    .map(([item, qty]) => ({ item, qty }));

  const topWeed = topItems(weed);
  const topDrogy = topItems(drogy);
  const topZbrane = topItems(zbrane);

  const manifestRows = (items, fallback) => items.length
    ? items.map(({ item, qty }) => `
      <div class="manifest-row">
        <span class="mr-name">${item}</span>
        <span class="mr-dots"></span>
        <span class="mr-val">${qty} ks</span>
      </div>`).join('')
    : `<div class="manifest-row"><span class="mr-name" style="color:var(--ivory-faint);font-style:italic">${fallback}</span><span class="mr-dots"></span><span class="mr-val">—</span></div>`;

  const allRecent = [
    ...recentZbrane.map(r => ({ sekce: 'Zbraně', typ: r[1] || '', detail: `${r[2] || '?'} · ${r[3] || '?'} ks`, kdo: r[5] || '—', cas: r[0] || '' })),
    ...recentWeed.map(r => ({ sekce: 'Weed', typ: r[1] || '', detail: `${r[2] || '?'} · ${r[3] || '?'} ks`, kdo: r[6] || r[5] || '—', cas: r[0] || '' })),
    ...recentDrogy.map(r => ({ sekce: 'Drogy', typ: r[1] || '', detail: `${r[2] || '?'} · ${r[3] || '?'} ks`, kdo: r[6] || r[5] || '—', cas: r[0] || '' })),
    ...(recentChemky || []).map(r => ({ sekce: 'Chemky', typ: r[1] || '', detail: `${r[2] || '?'} · ${r[3] || '?'} ks`, kdo: r[4] || '—', cas: r[0] || '' })),
    ...recentUcet.map(r => {
      const sym = (r[3] || '') === 'USD' ? 'SAD ' : '₱';
      return { sekce: 'Finance', typ: r[1] || '', detail: `${sym}${r[2] || '?'} — ${r[4] || '—'}`, kdo: r[5] || '—', cas: r[0] || '' };
    }),
  ].sort((a, b) => b.cas.localeCompare(a.cas)).slice(0, 7);

  const SEKCE_ICONS = { 'Zbraně': '🔫', 'Weed': '🌿', 'Drogy': '💊', 'Chemky': '⚗️', 'Finance': '💰' };
  const activityHtml = allRecent.length ? allRecent.map(ev => {
    const isIn = /VKLAD|PŘÍJEM/.test((ev.typ || '').toUpperCase());
    return `<div class="dash-activity-item">
      <div class="dash-activity-left">
        <div class="dash-activity-icon">${SEKCE_ICONS[ev.sekce] || '·'}</div>
        <div>
          <div class="dash-activity-text"><strong style="color:${isIn ? '#66D485' : 'var(--oxblood-bright)'};font-weight:600">${ev.typ}</strong> · ${ev.detail} <span style="color:var(--ivory-faint)">— ${ev.kdo}</span></div>
        </div>
      </div>
      <div class="dash-activity-time">${ev.cas}</div>
    </div>`;
  }).join('') : ledgerEmpty('Rejstřík dosud beze zápisu', true);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Dobré ráno' : greetingHour < 18 ? 'Dobrý den' : 'Dobrý večer';
  const today = new Date();
  const dateStr = today.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });

  const ICONS = {
    cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="1"/><circle cx="12" cy="12" r="3"/></svg>',
    pesos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 4h7a4 4 0 0 1 0 8H6"/><path d="M6 12v8M4 8h8M4 12h6"/></svg>',
    weed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2C9 6 8 9 8 12a4 4 0 0 0 8 0c0-3-1-6-4-10Z"/><path d="M12 12v10"/></svg>',
    stock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="10" width="4" height="10"/><rect x="10" y="5" width="4" height="15"/><rect x="17" y="13" width="4" height="7"/></svg>',
    vault: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="1"/><circle cx="12" cy="12" r="3.2"/><path d="M12 9.5v0M7 4v2M17 4v2"/></svg>',
  };

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Rejstřík</title>
  ${require('../styles').baseStyles()}
  </head><body>
  ${renderNav(req, 'home')}
  <main>

    <div id="weekly-banner" style="display:none;background:var(--brass-faint);border:1px solid var(--border-brass);padding:1rem 1.6rem;margin-bottom:1.6rem;font-family:var(--font-body);font-size:0.9rem;text-align:center"></div>

    <!-- ── HERO ── -->
    <div class="dash-hero">
      <div>
        <div class="dash-hero-eyebrow">Los Santos · Interní rejstřík</div>
        <div class="dash-hero-title">${greeting}, ${escapeHtml(icName)}</div>
        <div class="dash-hero-sub">Vítej zpět v operačním centru Caledonie.</div>
      </div>
      <div class="dash-hero-time">
        <div class="dash-hero-clock" id="live-clock-hero">--:--:--</div>
        <div class="dash-hero-date">${dateStr}</div>
      </div>
    </div>

    <!-- ── PORTÁL DO ALBION WORLD ── -->
    <a href="/albion" class="dash-portal">
      <div class="dash-portal-left">
        <div class="dash-portal-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>
        </div>
        <div>
          <div class="dash-portal-eyebrow">Immersivní zážitek</div>
          <div class="dash-portal-title">Vstup do Caledonia World</div>
          <div class="dash-portal-sub">Interaktivní kancelář organizace — projdi prostorem a otevři jednotlivé sekce přímo odsud.</div>
        </div>
      </div>
      <span class="dash-portal-btn">
        Vstoupit
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </span>
    </a>

    ${isRestricted ? `
    <div class="dash-widget">
      <div class="dash-widget-title">Přístup</div>
      <p style="font-family:var(--font-body);font-size:0.9rem;color:var(--ivory-dim);line-height:1.8">Finance a sklad jsou viditelné jen od hodnosti Senior Member výš. Pokud potřebuješ přístup, obrať se na Council nebo Foundera.</p>
    </div>
    <div class="folio-rule"></div>
    <div class="marginalia" style="border-left:none;max-width:260px;margin:1.5rem auto 0;text-align:center">
      <div class="dash-hero-clock" id="live-clock" style="text-align:center;font-size:1rem">--:--:--</div>
      <div class="dash-hero-date" style="text-align:center;margin-top:0.3rem">${dateStr}</div>
    </div>
    ` : `
    <!-- ── STAT ŘÁDEK ── -->
    <div class="dash-stat-grid">
      <div class="dash-stat-card">
        <div class="dash-stat-icon">${ICONS.cash}</div>
        <div class="dash-stat-label">Zůstatek · SAD</div>
        <div class="dash-stat-value" id="tally-usd">$${ucet.usd.toLocaleString('cs-CZ')}</div>
        <div class="dash-stat-sub">hotovost organizace</div>
      </div>
      <div class="dash-stat-card">
        <div class="dash-stat-icon">${ICONS.pesos}</div>
        <div class="dash-stat-label">Pesos</div>
        <div class="dash-stat-value" id="tally-pesos">₱${ucet.pesos.toLocaleString('cs-CZ')}</div>
        <div class="dash-stat-sub">sekundární účet</div>
      </div>
      <div class="dash-stat-card">
        <div class="dash-stat-icon">${ICONS.weed}</div>
        <div class="dash-stat-label">Hodnota weedu</div>
        <div class="dash-stat-value" id="tally-weed-value">$${totalValue.toLocaleString('cs-CZ')}</div>
        <div class="dash-stat-sub">dle prodejní ceny</div>
      </div>
      <div class="dash-stat-card">
        <div class="dash-stat-icon">${ICONS.stock}</div>
        <div class="dash-stat-label">Zásoby celkem</div>
        <div class="dash-stat-value">${(totalWeed + totalDrogy + totalZbrane + totalChemky).toLocaleString('cs-CZ')}</div>
        <div class="dash-stat-sub">ks ve skladu</div>
      </div>
    </div>

    <!-- ── AKTIVITA + OZNÁMENÍ ── -->
    <div class="dash-grid-2">
      <div class="dash-widget">
        <div class="dash-widget-title"><span>Poslední zápisy do rejstříku</span></div>
        <div id="activity-stream">${activityHtml}</div>
      </div>
      <div>
        <div class="dash-notice-card" style="margin-bottom:1.2rem">
          <div class="dash-notice-eyebrow">Rychlý přehled</div>
          <div class="dash-notice-title">Stav skladu</div>
          <div class="dash-notice-text">
            Weed <strong style="color:var(--brass-bright)">${totalWeed} ks</strong> · Drogy <strong style="color:var(--brass-bright)">${totalDrogy} ks</strong><br>
            Zbraně <strong style="color:var(--brass-bright)">${totalZbrane} ks</strong> · Chemikálie <strong style="color:var(--brass-bright)">${totalChemky} ks</strong>
          </div>
          ${canAccess(accessLevel, 'sklad-view') ? '<a href="/sklad" class="dash-notice-btn">Otevřít sklad →</a>' : ''}
        </div>
        <div class="dash-vault-card">
          <div class="dash-widget-title" style="margin-bottom:0.4rem">Stav trezoru</div>
          <div class="dash-vault-value">$${ucet.usd.toLocaleString('cs-CZ')}</div>
          <div class="dash-vault-track"><div class="dash-vault-fill" style="width:${Math.min(100, Math.round((ucet.usd / 60000) * 100))}%"></div></div>
          <div class="dash-vault-caption"><span>Odhad. hodnota weedu</span><span>$${totalValue.toLocaleString('cs-CZ')}</span></div>
        </div>
      </div>
    </div>

    <!-- ── RYCHLÉ AKCE ── -->
    <div class="dash-widget" style="margin-bottom:1.4rem">
      <div class="dash-widget-title">Rychlé akce</div>
      <div class="dash-quick-grid">
        ${canAccess(accessLevel, 'sklad') ? `<a href="/sklad" class="dash-quick-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="10" width="4" height="10"/><rect x="10" y="5" width="4" height="15"/><rect x="17" y="13" width="4" height="7"/></svg>Sklad</a>` : ''}
        <a href="/garaz" class="dash-quick-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 13l2-6h14l2 6"/><rect x="2" y="13" width="20" height="6" rx="1"/><circle cx="7" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg>Garáž</a>
        ${canAccess(accessLevel, 'blackbook') ? `<a href="/blackbook" class="dash-quick-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3Z"/><path d="M4 4v13a3 3 0 0 0 3 3"/></svg>Blackbook</a>` : ''}
        ${canAccess(accessLevel, 'audit') ? `<a href="/audit" class="dash-quick-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Audit</a>` : ''}
        <a href="/bazar" class="dash-quick-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 8l1.5-4h13L20 8"/><path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/><path d="M9 12a3 3 0 0 0 6 0"/></svg>Bazar</a>
      </div>
    </div>

    <div class="folio-rule tight"></div>

    <!-- ── MANIFEST SKLADU ── -->
    <div class="folio-label">Stav skladu</div>
    <div style="height:1.6rem"></div>
    <div class="manifest-grid" style="margin-bottom:2rem">
      <div class="manifest-col">
        <div class="manifest-col-head"><span class="manifest-col-title">Weed</span><span class="manifest-col-count">${totalWeed} ks</span></div>
        ${manifestRows(topWeed, 'Sklad prázdný')}
      </div>
      <div class="manifest-col">
        <div class="manifest-col-head"><span class="manifest-col-title">Drogy</span><span class="manifest-col-count">${totalDrogy} ks</span></div>
        ${manifestRows(topDrogy, 'Sklad prázdný')}
      </div>
      <div class="manifest-col">
        <div class="manifest-col-head"><span class="manifest-col-title">Zbraně</span><span class="manifest-col-count">${totalZbrane} ks</span></div>
        ${manifestRows(topZbrane, 'Sklad prázdný')}
      </div>
    </div>
    `}

  </main>
  <div class="modal-overlay" id="onboardModal">
    <div class="modal-box" style="max-width:560px;text-align:left">
      <div class="modal-title">Vítej v Caledonii</div>
      <div class="modal-subtitle" id="onb-step-content" style="line-height:1.8"></div>
      <div style="display:flex;justify-content:center;gap:0.4rem;margin:1rem 0">
        <span class="onb-dot" data-i="0"></span><span class="onb-dot" data-i="1"></span><span class="onb-dot" data-i="2"></span><span class="onb-dot" data-i="3"></span>
      </div>
      <div class="modal-actions">
        <button class="modal-btn-cancel" onclick="onbPrev()" id="onbBackBtn">Zpět</button>
        <button class="modal-btn-confirm" onclick="onbNext()" id="onbNextBtn">Další</button>
      </div>
    </div>
  </div>
  <div class="toast" id="toast"></div>

  <script>
    // Live hodiny
    (function clock(){
      const c=document.getElementById('live-clock');
      const ch=document.getElementById('live-clock-hero');
      function tick(){
        const n=new Date();
        const t=n.toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
        if(c) c.textContent=t;
        if(ch) ch.textContent=t;
      }
      tick();setInterval(tick,1000);
    })();

    // SSE — živé aktualizace
    const evtHome = new EventSource('/api/events');
    function bumpLive(msg) { showToast(msg); }
    const RESTRICTED_HOME = ${isRestricted ? 'true' : 'false'};
    evtHome.addEventListener('skladUpdate', (e) => {
      if (RESTRICTED_HOME) return;
      const d = JSON.parse(e.data);
      const label = d.sekce==='zbrane'?'Zbraně':d.sekce==='weed'?'Weed':'Drogy';
      bumpLive(label + ' · ' + d.typ + ' — ' + (d.polozka||d.odruda||d.droga) + ' (' + d.qty + ' ks)');
    });
    evtHome.addEventListener('ucetUpdate', (e) => {
      if (RESTRICTED_HOME) return;
      const d = JSON.parse(e.data);
      bumpLive('Finance · ' + d.typ + ' — ' + (d.valuta==='USD'?'SAD ':'₱') + d.castka);
    });
    evtHome.addEventListener('nastenska', (e) => {
      if (RESTRICTED_HOME) return;
      const d = JSON.parse(e.data);
      bumpLive('Oznámení: ' + d.title);
    });

    // ── TÝDENNÍ SOUHRN ──
    ${!isRestricted ? `
    fetch('/api/weekly-summary').then(r=>r.json()).then(d=>{
      if(!d.ok)return;
      const el=document.getElementById('weekly-banner');
      const netTxt=(d.net>=0?'vydělala':'prodělala')+' $'+Math.abs(Math.round(d.net)).toLocaleString('cs-CZ');
      el.innerHTML='<strong style="color:var(--brass-bright)">Tento týden Caledonia</strong> '+netTxt+' a provedl '+d.ops+' finančních operací.';
      el.style.display='block';
    }).catch(()=>{});` : ''}

    // ── ONBOARDING ──
    const ONB_STEPS = [
      '<strong style="color:var(--brass-bright)">Krátká historie.</strong><br>Caledonia vznikla krátce po příchodu Christophera Sinclaira do Los Santos — organizace postavená na důvěře, ne na strachu. <a href="/lore" style="color:var(--brass)">Číst celou kroniku →</a>',
      '<strong style="color:var(--brass-bright)">Kodex.</strong><br>Deset principů, které jsou závazné pro každého člena bez výjimky — loajalita, diskrétnost, profesionalita. <a href="/kodex" style="color:var(--brass)">Přečíst kodex →</a>',
      '<strong style="color:var(--brass-bright)">Hierarchie.</strong><br>Pět úrovní členství — od Associate po Foundera. Postup závisí na loajalitě, schopnostech a přínosu organizaci. <a href="/hierarchy" style="color:var(--brass)">Zobrazit hierarchii →</a>',
      '<strong style="color:var(--brass-bright)">První kroky.</strong><br>Sleduj Nástěnku pro oznámení, drž se Kodexu a v případě dotazů kontaktuj svého Senior Membera nebo Council. Caledonia roste — staň se její součástí.',
    ];
    let onbStep=0;
    function onbRender(){
      document.getElementById('onb-step-content').innerHTML=ONB_STEPS[onbStep];
      document.querySelectorAll('.onb-dot').forEach((d,i)=>d.classList.toggle('active',i===onbStep));
      document.getElementById('onbBackBtn').style.visibility=onbStep===0?'hidden':'visible';
      document.getElementById('onbNextBtn').textContent=onbStep===ONB_STEPS.length-1?'Začít':'Další';
    }
    function onbNext(){
      if(onbStep<ONB_STEPS.length-1){onbStep++;onbRender();}
      else{document.getElementById('onboardModal').classList.remove('open');fetch('/api/me/onboarding/seen',{method:'POST'});}
    }
    function onbPrev(){if(onbStep>0){onbStep--;onbRender();}}
    fetch('/api/me/onboarding').then(r=>r.json()).then(d=>{
      if(d.ok && !d.seen){onbRender();document.getElementById('onboardModal').classList.add('open');}
    }).catch(()=>{});

    // ── PŘÍSAHA PŘI POVÝŠENÍ ──
    const OATH_TEXT = 'PŘÍSAHÁM';
    fetch('/api/me/promotions/pending').then(r=>r.json()).then(d=>{
      if(d.ok && d.pending){
        const overlay=document.createElement('div');
        overlay.className='modal-overlay open';
        overlay.innerHTML='<div class="modal-box" style="text-align:center;max-width:460px">'+
          '<div class="seal-stamp slam" style="position:static;transform:scale(1.3);opacity:1;margin:0 auto 1rem"><span>A</span></div>'+
          '<div class="modal-title">Povýšení!</div>'+
          '<div class="modal-subtitle">Byl jsi povýšen na novou hodnost: <strong style="color:var(--brass-bright)">'+d.toLabel+'</strong><br><br>'+
            'Než tvá pečeť vejde v platnost, stvrď přísahu věrnosti Caledonii. Napiš do pole níže slovo <strong style="color:var(--brass-bright)">'+OATH_TEXT+'</strong> a přilož svou pečeť.</div>'+
          '<input type="text" id="oathInput" placeholder="'+OATH_TEXT+'" style="text-align:center;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:1rem">'+
          '<button class="modal-btn-confirm" style="width:100%" id="oathBtn" disabled>Složit přísahu</button>'+
        '</div>';
        document.body.appendChild(overlay);
        const input=overlay.querySelector('#oathInput');
        const btn=overlay.querySelector('#oathBtn');
        input.addEventListener('input',()=>{ btn.disabled = input.value.trim().toUpperCase() !== OATH_TEXT; });
        input.addEventListener('keydown',(e)=>{ if(e.key==='Enter' && !btn.disabled) btn.click(); });
        btn.addEventListener('click',()=>{
          if(window.albionSealThud)window.albionSealThud();
          overlay.remove();
          fetch('/api/me/promotions/ack',{method:'POST'});
          setTimeout(()=>showToast('Přísaha složena. Vítej ve své nové hodnosti.'),300);
        });
        setTimeout(()=>input.focus(),200);
      }
    }).catch(()=>{});
  </script>
  </body></html>`;
}

module.exports = { renderHome };
