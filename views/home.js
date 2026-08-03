// views/home.js — Albion v5 · "Crimson & Cream" Dashboard
// Oproti v4 přibyl widget "Rychlý zápis" (Weed/Drogy/Chemky/Účetnictví —
// čtyři sekce, které se používají denně) přímo na Dashboardu, ať pro
// nejběžnější zápisy není potřeba chodit na /sklad a hledat správný tab.
// Portál do Caledonia World byl na přání odstraněn z Home (appku nikdo
// neotevíral) — routa /albion a její kód v projektu zůstávají beze změny,
// jen sem už nevede odkaz.
// Stejný podpis renderHome(req, data) a stejné klíče v `data` jako dřív —
// server.js se nemusí nijak měnit.

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

  const WEED_P = { "Žlutý kanabis": 165, "Zelený kanabis": 165, "Kanabis": 165, "Červený kanabis": 165, "Modrý kanabis": 165 };

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
          <div class="dash-activity-text"><strong style="color:${isIn ? '#7BD69B' : 'var(--oxblood-bright)'};font-weight:600">${ev.typ}</strong> · ${ev.detail} <span style="color:var(--ivory-faint)">— ${ev.kdo}</span></div>
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

    ${(!isRestricted && canSklad) ? `
    <!-- ── RYCHLÝ ZÁPIS — denní sekce (Weed/Drogy/Chemky/Účetnictví) bez chození na /sklad ── -->
    <div class="quick-entry" id="quickEntryCard">
      <div class="dash-widget-title"><span>Rychlý zápis</span><span style="font-family:var(--font-mono);font-size:0.6rem;color:var(--ivory-faint);text-transform:none;letter-spacing:0.02em">denní sklad &amp; finance</span></div>
      <div class="quick-entry-tabs" id="qeTabs">
        <button class="qe-tab active" data-tab="weed" onclick="qeTab('weed')">Weed</button>
        <button class="qe-tab" data-tab="drogy" onclick="qeTab('drogy')">Drogy</button>
        <button class="qe-tab" data-tab="chemky" onclick="qeTab('chemky')">Chemky</button>
        <button class="qe-tab" data-tab="ucet" onclick="qeTab('ucet')">Účetnictví</button>
      </div>

      <div class="qe-typetoggle" id="qeTypeToggle"></div>

      <div id="qePanelSklad">
        <div class="qe-row">
          <div class="form-group"><label id="qeItemLabel">Odrůda</label><select id="qeItem"></select></div>
          <div class="form-group"><label>Množství</label><input type="number" id="qeQty" min="1" max="500" value="1"></div>
          <button class="qe-submit" id="qeSubmitBtn" onclick="qeSubmitSklad()">Zapsat</button>
        </div>
      </div>

      <div id="qePanelUcet" style="display:none">
        <div class="qe-row" style="grid-template-columns:110px 1fr 1fr auto">
          <div class="form-group"><label>Valuta</label><select id="qeValuta"><option value="USD">SAD</option><option value="PESOS">Pesos</option></select></div>
          <div class="form-group"><label>Částka</label><input type="number" id="qeCastka" min="1" placeholder="1000"></div>
          <div class="form-group"><label>Poznámka</label><input type="text" id="qePoznamka" placeholder="Prodej zboží, plat…"></div>
          <button class="qe-submit" id="qeSubmitUcetBtn" onclick="qeSubmitUcet()">Zapsat</button>
        </div>
      </div>

      <div class="qe-hint" id="qeHint"></div>
    </div>
    ` : ''}

    ${isRestricted ? `
    <div class="dash-notice-card" id="memberQuoteCard" style="margin-bottom:1.4rem">
      <div class="dash-notice-eyebrow">Citát dne</div>
      <div class="dash-notice-title" id="memberQuoteText" style="font-style:italic">„…"</div>
      <div class="dash-notice-text" style="margin-bottom:0">Caledonia — organizace postavená na ambicích, loajalitě a důvěře.</div>
    </div>

    <div class="dash-grid-2">
      <div class="dash-widget">
        <div class="dash-widget-title"><span>Tvůj profil</span></div>
        <div id="memberProfileBox"><div class="ledger-loading">Načítám…</div></div>
      </div>
      <div class="dash-widget">
        <div class="dash-widget-title"><span>Weed sázení</span></div>
        <div id="memberWeedBox"><div class="ledger-loading">Načítám…</div></div>
        <a href="/weed-sazeni" class="dash-notice-btn" style="margin-top:1rem">Otevřít weed sázení →</a>
      </div>
    </div>

    <div class="dash-widget" style="margin-bottom:1.4rem">
      <div class="dash-widget-title">Rychlý přístup</div>
      <div class="dash-quick-grid">
        <a href="/kodex" class="dash-quick-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>Kodex</a>
        <a href="/lore" class="dash-quick-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3v4M16 3v4M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"/></svg>Historie</a>
        <a href="/hierarchy" class="dash-quick-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="5" r="2.2"/><path d="M12 7.2V12M5 19v-2a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="12" cy="19" r="2"/></svg>Hierarchie</a>
        <a href="/garaz" class="dash-quick-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 13l2-6h14l2 6"/><rect x="2" y="13" width="20" height="6" rx="1"/><circle cx="7" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg>Garáž</a>
        <a href="/bazar" class="dash-quick-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 8l1.5-4h13L20 8"/><path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/><path d="M9 12a3 3 0 0 0 6 0"/></svg>Bazar</a>
        <a href="/mentoring" class="dash-quick-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="7" r="3"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><path d="M16 4.5c1.7.4 3 2 3 3.9 0 1.9-1.3 3.5-3 3.9M22 20c0-3-2.2-5.4-5-6"/></svg>Mentoring</a>
        <a href="/leaderboard" class="dash-quick-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0Z"/><path d="M7 6H4v1a4 4 0 0 0 4 4M17 6h3v1a4 4 0 0 1-4 4"/></svg>Aktivita</a>
        <a href="/karta" class="dash-quick-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M13 10h6M13 14h4"/></svg>Trading karta</a>
        <a href="/profil" class="dash-quick-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5"/></svg>Profil</a>
      </div>
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
      <div class="dash-widget" id="activityWidget">
        <div class="dash-widget-title"><span>Poslední zápisy do rejstříku</span></div>
        <div id="activity-stream">${activityHtml}</div>
      </div>
      <div>
        <div class="dash-notice-card" style="margin-bottom:1.2rem">
          <div class="dash-notice-eyebrow">Rychlý přehled</div>
          <div class="dash-notice-title">Stav skladu</div>
          <div class="dash-notice-text">
            Weed <strong style="color:var(--brass-bright)" id="qs-weed">${totalWeed} ks</strong> · Drogy <strong style="color:var(--brass-bright)" id="qs-drogy">${totalDrogy} ks</strong><br>
            Zbraně <strong style="color:var(--brass-bright)">${totalZbrane} ks</strong> · Chemikálie <strong style="color:var(--brass-bright)" id="qs-chemky">${totalChemky} ks</strong>
          </div>
          ${canAccess(accessLevel, 'sklad-view') ? '<a href="/sklad" class="dash-notice-btn">Otevřít sklad →</a>' : ''}
        </div>
        <div class="dash-vault-card">
          <div class="dash-widget-title" style="margin-bottom:0.4rem">Stav trezoru</div>
          <div class="dash-vault-value" id="qs-usd-big">$${ucet.usd.toLocaleString('cs-CZ')}</div>
          <div class="dash-vault-track"><div class="dash-vault-fill" id="qs-vault-fill" style="width:${Math.min(100, Math.round((ucet.usd / 60000) * 100))}%"></div></div>
          <div class="dash-vault-caption"><span>Odhad. hodnota weedu</span><span id="qs-weed-value">$${totalValue.toLocaleString('cs-CZ')}</span></div>
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

    // ── RYCHLÝ ZÁPIS ──────────────────────────────────────────────────────
    (function quickEntry(){
      const card = document.getElementById('quickEntryCard');
      if (!card) return;

      const WEED_ITEMS = ["Žlutý kanabis","Zelený kanabis","Kanabis","Červený kanabis","Modrý kanabis"];
      const DROGY_ITEMS = ["Kapky","Kokain","Extáze","Metamfetamin","Benzo","Joyka","Heroin","Speed","LSD"];
      const CHEMKY_ITEMS = ["Aceton","Peroxid vodíku","Potravinářský kofein","Propylenglykol","Toluen","Technický benzín","Bismut","Kyselina fosforečná","Kerosen","Pekáč","Genkadon","Amanita Genkia","Kapátka","Forma","Lithiová baterie","Semínko","Cukr","Nadrcené listy"];
      const LABELS = { weed: 'Odrůda', drogy: 'Droga', chemky: 'Chemikálie' };
      const ENDPOINTS = { weed: '/api/weed', drogy: '/api/drogy', chemky: '/api/chemky' };
      const ITEMS = { weed: WEED_ITEMS, drogy: DROGY_ITEMS, chemky: CHEMKY_ITEMS };

      let qeCurrentTab = 'weed';
      let qeTyp = 'VKLAD';

      function renderTypeToggle(){
        const wrap = document.getElementById('qeTypeToggle');
        if (qeCurrentTab === 'ucet') {
          wrap.innerHTML =
            '<button class="qe-type-btn on-in" id="qeTypePrijem" onclick="qeSetUcetTyp(\\'PŘÍJEM\\')">Příjem</button>' +
            '<button class="qe-type-btn" id="qeTypeVydaj" onclick="qeSetUcetTyp(\\'VÝDAJ\\')">Výdaj</button>';
          window._qeUcetTyp = 'PŘÍJEM';
        } else {
          wrap.innerHTML =
            '<button class="qe-type-btn on-in" id="qeTypeVklad" onclick="qeSetTyp(\\'VKLAD\\')">Uložit</button>' +
            '<button class="qe-type-btn" id="qeTypeVyber" onclick="qeSetTyp(\\'VÝBĚR\\')">Vybrat</button>';
          qeTyp = 'VKLAD';
        }
      }

      window.qeSetTyp = function(t){
        qeTyp = t;
        document.getElementById('qeTypeVklad').className = 'qe-type-btn' + (t==='VKLAD' ? ' on-in' : '');
        document.getElementById('qeTypeVyber').className = 'qe-type-btn' + (t==='VÝBĚR' ? ' on-out' : '');
      };
      window.qeSetUcetTyp = function(t){
        window._qeUcetTyp = t;
        document.getElementById('qeTypePrijem').className = 'qe-type-btn' + (t==='PŘÍJEM' ? ' on-in' : '');
        document.getElementById('qeTypeVydaj').className = 'qe-type-btn' + (t==='VÝDAJ' ? ' on-out' : '');
      };

      window.qeTab = function(tab){
        qeCurrentTab = tab;
        document.querySelectorAll('.qe-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        const isUcet = tab === 'ucet';
        document.getElementById('qePanelSklad').style.display = isUcet ? 'none' : 'block';
        document.getElementById('qePanelUcet').style.display = isUcet ? 'block' : 'none';
        if (!isUcet) {
          document.getElementById('qeItemLabel').textContent = LABELS[tab];
          document.getElementById('qeItem').innerHTML = ITEMS[tab].map(i => '<option>'+i+'</option>').join('');
        }
        renderTypeToggle();
        document.getElementById('qeHint').textContent = '';
      };

      window.qeSubmitSklad = async function(){
        const btn = document.getElementById('qeSubmitBtn');
        const qty = parseInt(document.getElementById('qeQty').value);
        if (!Number.isInteger(qty) || qty < 1 || qty > 500) { showToast('Množství musí být 1–500', true); return; }
        const item = document.getElementById('qeItem').value;
        const payload = { typ: qeTyp, mnozstvi: qty };
        if (qeCurrentTab === 'weed') payload.odruda = item;
        else if (qeCurrentTab === 'drogy') payload.droga = item;
        else payload.chemikalie = item;
        btn.disabled = true;
        try {
          const res = await fetch(ENDPOINTS[qeCurrentTab], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const d = await res.json();
          if (d.ok) {
            if (window.albionSealThud) window.albionSealThud();
            if (window.rewardFlash) window.rewardFlash(card);
            showToast(qeTyp + ' — ' + item + ' (' + qty + ' ks) zapsáno');
            document.getElementById('qeHint').textContent = 'Naposledy zapsáno: ' + item + ' · ' + qty + ' ks';
          } else showToast(d.error, true);
        } catch (e) { showToast('Zápis se nepodařil', true); }
        btn.disabled = false;
      };

      window.qeSubmitUcet = async function(){
        const btn = document.getElementById('qeSubmitUcetBtn');
        const castka = document.getElementById('qeCastka').value;
        const poznamka = document.getElementById('qePoznamka').value.trim();
        if (!castka || parseFloat(castka) <= 0) { showToast('Vyplň platnou částku', true); return; }
        if (!poznamka) { showToast('Poznámka je povinná', true); return; }
        const valuta = document.getElementById('qeValuta').value;
        btn.disabled = true;
        try {
          const res = await fetch('/api/ucet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ typ: window._qeUcetTyp, castka, valuta, poznamka }) });
          const d = await res.json();
          if (d.ok) {
            if (window.albionSealThud) window.albionSealThud();
            if (window.rewardFlash) window.rewardFlash(card);
            showToast('Zaznamenáno — ' + (valuta === 'USD' ? 'SAD ' : '₱') + castka);
            document.getElementById('qeCastka').value = '';
            document.getElementById('qePoznamka').value = '';
          } else showToast(d.error, true);
        } catch (e) { showToast('Zápis se nepodařil', true); }
        btn.disabled = false;
      };

      qeTab('weed');
    })();

    // SSE — živé aktualizace
    const evtHome = new EventSource('/api/events');
    function bumpLive(msg) { showToast(msg); }
    const RESTRICTED_HOME = ${isRestricted ? 'true' : 'false'};
    const SEKCE_ICONS_HOME = { 'Zbraně': '🔫', 'Weed': '🌿', 'Drogy': '💊', 'Chemky': '⚗️', 'Finance': '💰' };

    function prependActivity(sekce, typ, detail, kdo, cas){
      const stream = document.getElementById('activity-stream');
      if (!stream) return;
      const isIn = /VKLAD|PŘÍJEM/.test((typ||'').toUpperCase());
      const row = document.createElement('div');
      row.className = 'dash-activity-item';
      row.innerHTML =
        '<div class="dash-activity-left">' +
          '<div class="dash-activity-icon">' + (SEKCE_ICONS_HOME[sekce] || '·') + '</div>' +
          '<div><div class="dash-activity-text"><strong style="color:' + (isIn ? '#7BD69B' : 'var(--oxblood-bright)') + ';font-weight:600">' + typ + '</strong> · ' + detail + ' <span style="color:var(--ivory-faint)">— ' + kdo + '</span></div></div>' +
        '</div>' +
        '<div class="dash-activity-time">' + cas + '</div>';
      const emptyState = stream.querySelector('.ledger-empty');
      if (emptyState) stream.innerHTML = '';
      stream.prepend(row);
      if (window.rewardFlash) window.rewardFlash(row);
      while (stream.children.length > 7) stream.lastElementChild.remove();
    }

    async function refreshHomeStats(){
      try {
        const res = await fetch('/api/sklad/summary', { cache: 'no-store' });
        const d = await res.json();
        if (!d.ok) return;
        const WEED_P = { "Žlutý kanabis": 165, "Zelený kanabis": 165, "Kanabis": 165, "Červený kanabis": 165, "Modrý kanabis": 165 };
        let totalValue = 0; Object.entries(d.weed).forEach(([k, q]) => { if (q > 0 && WEED_P[k]) totalValue += q * WEED_P[k]; });
        const totalWeed = Object.values(d.weed).filter(q => q > 0).reduce((a, b) => a + b, 0);
        const totalDrogy = Object.values(d.drogy).filter(q => q > 0).reduce((a, b) => a + b, 0);
        const totalChemky = Object.values(d.chemky || {}).filter(q => q > 0).reduce((a, b) => a + b, 0);
        const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
        set('tally-usd', '$' + d.ucet.usd.toLocaleString('cs-CZ'));
        set('tally-pesos', '₱' + d.ucet.pesos.toLocaleString('cs-CZ'));
        set('tally-weed-value', '$' + totalValue.toLocaleString('cs-CZ'));
        set('qs-weed', totalWeed + ' ks');
        set('qs-drogy', totalDrogy + ' ks');
        set('qs-chemky', totalChemky + ' ks');
        set('qs-usd-big', '$' + d.ucet.usd.toLocaleString('cs-CZ'));
        set('qs-weed-value', '$' + totalValue.toLocaleString('cs-CZ'));
        const fill = document.getElementById('qs-vault-fill');
        if (fill) fill.style.width = Math.min(100, Math.round((d.ucet.usd / 60000) * 100)) + '%';
      } catch (e) {}
    }

    evtHome.addEventListener('skladUpdate', (e) => {
      if (RESTRICTED_HOME) return;
      const d = JSON.parse(e.data);
      const sekceLabel = d.sekce==='zbrane'?'Zbraně':d.sekce==='weed'?'Weed':d.sekce==='chemky'?'Chemky':d.sekce==='undo'?null:'Drogy';
      const item = d.polozka||d.odruda||d.droga||d.chemikalie||'';
      if (sekceLabel) {
        bumpLive(sekceLabel + ' · ' + d.typ + ' — ' + item + ' (' + d.qty + ' ks)');
        prependActivity(sekceLabel, d.typ, item + ' · ' + d.qty + ' ks', d.uzivatel, d.cas);
      }
      refreshHomeStats();
    });
    evtHome.addEventListener('ucetUpdate', (e) => {
      if (RESTRICTED_HOME) return;
      const d = JSON.parse(e.data);
      bumpLive('Finance · ' + d.typ + ' — ' + (d.valuta==='USD'?'SAD ':'₱') + d.castka);
      const sym = d.valuta === 'USD' ? 'SAD ' : '₱';
      prependActivity('Finance', d.typ, sym + d.castka + ' — ' + (d.poznamka || '—'), d.uzivatel, d.cas);
      refreshHomeStats();
    });
    evtHome.addEventListener('nastenska', (e) => {
      if (RESTRICTED_HOME) return;
      const d = JSON.parse(e.data);
      bumpLive('Oznámení: ' + d.title);
    });

    // ── MEMBER DASHBOARD — citát dne, profil, weed timery ──
    ${isRestricted ? `
    (function memberDash(){
      const QUOTES = [
        '„Nechtějí být známí tím, jak hlasitě o sobě dávají vědět, ale tím, čeho dokážou dosáhnout."',
        '„Důvěra se nedává. Důvěra se vydobývá, čin po činu."',
        '„Caledonia nestaví na strachu. Staví na slovu, které platí."',
        '„Kdo nemá ambice, nemá v Caledonii místo."',
      ];
      const day = Math.floor(Date.now() / 86400000);
      const q = document.getElementById('memberQuoteText');
      if (q) q.textContent = QUOTES[day % QUOTES.length];

      const RANK_LABEL = { 1: 'Founder/Council', 2: 'Senior Member', 3: 'Member/Associate' };
      Promise.all([
        fetch('/api/me/session').then(r=>r.json()).catch(()=>null),
        fetch('/api/me/achievements').then(r=>r.json()).catch(()=>null),
      ]).then(([session, ach]) => {
        const box = document.getElementById('memberProfileBox');
        if (!box) return;
        if (!session || !session.ok) { box.innerHTML = '<div style="color:var(--ivory-faint)">Nelze načíst profil</div>'; return; }
        const earnedCount = (ach && ach.ok) ? ach.earned.length : 0;
        box.innerHTML =
          '<div class="manifest-row"><span class="mr-name">Hodnost</span><span class="mr-dots"></span><span class="mr-val" style="color:var(--brass-bright)">' + (RANK_LABEL[session.accessLevel] || '—') + '</span></div>' +
          '<div class="manifest-row"><span class="mr-name">Odznaky</span><span class="mr-dots"></span><span class="mr-val">' + earnedCount + '×</span></div>';
      }).catch(() => {});

      fetch('/api/weed-timers').then(r=>r.json()).then(d => {
        const box = document.getElementById('memberWeedBox');
        if (!box || !d.ok) return;
        const now = d.now || Date.now();
        const ready = (d.timers || []).filter(t => t.endsAt <= now).length;
        const growing = (d.timers || []).length - ready;
        box.innerHTML =
          '<div class="manifest-row"><span class="mr-name">Dorostlé kytky</span><span class="mr-dots"></span><span class="mr-val" style="color:' + (ready ? '#7BD69B' : 'var(--ivory-faint)') + '">' + ready + '</span></div>' +
          '<div class="manifest-row"><span class="mr-name">Právě rostou</span><span class="mr-dots"></span><span class="mr-val">' + growing + '</span></div>';
      }).catch(() => {
        const box = document.getElementById('memberWeedBox');
        if (box) box.innerHTML = '<div style="color:var(--ivory-faint)">Nelze načíst</div>';
      });
    })();
    ` : ''}

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
