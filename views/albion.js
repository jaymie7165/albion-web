// views/albion.js — ALBION Immersive Office
// Filmová, atmosférická 2D scéna nad statickým artworkem kanceláře.
// Žádné Three.js, žádná 3D geometrie — jen HTML/CSS/Canvas/JS.
// Znovupoužívá existující routy/data. Žádný nový backend, žádná nová databáze.

const { canAccess } = require('../roles');

function renderAlbion(req, data) {
  const icName = req.session.icName;
  const accessLevel = req.session.accessLevel || 3;
  const can = (id) => canAccess(accessLevel, id);
  const photo = data.photo || '/logo.png';

  // ── Definice hotspotů — pozice v % dle referenčního obrázku ALBION_OFFICE_3840x2160 ──
  // Souřadnice odvozeny pixelovou analýzou vyznačených objektů (notebook, telefon, klíče,
  // portrét, knihovna) + doplňkové navigační body na volných plochách scény.
  // kind: 'nav'  = klik spustí cinematic zoom a otevře modul ve focus-panelu
  //       'lamp' = klik přepíná intenzitu osvětlení (ambientní, bez navigace, bez access gatingu)
  const hotspots = [
    {
      id: 'knihovna', x: 5.0, y: 28.0, kind: 'nav', label: 'Hierarchie & Kodex', sub: 'Struktura organizace, pravidla a historie',
      items: [
        { label: 'Hierarchie', href: '/hierarchy', need: 'hierarchy' },
        { label: 'Kodex', href: '/kodex', need: 'kodex' },
        { label: 'Historie', href: '/lore', need: 'lore' },
      ],
    },
    {
      id: 'sklad', x: 5.0, y: 71.0, kind: 'nav', label: 'Sklad', sub: 'Účetnictví, zbraně, drogy, směnárna, weed',
      items: [{ label: 'Správa skladu', href: '/sklad', need: 'sklad' }],
    },
    {
      id: 'dashboard', x: 42.4, y: 61.8, kind: 'nav', label: 'Dashboard', sub: 'Přehled, statistiky, profit centrum, blackbook',
      items: [
        { label: 'Dashboard', href: '/home', need: 'home' },
        { label: 'Profit centrum', href: '/profit-centrum', need: 'profit-centrum' },
        { label: 'Statistiky', href: '/statistiky', need: 'statistiky' },
        { label: 'BlackBook', href: '/blackbook', need: 'blackbook' },
      ],
    },
    {
      id: 'audit', x: 30.0, y: 73.0, kind: 'nav', label: 'Audit', sub: 'Záznamy a logy',
      items: [{ label: 'Audit', href: '/audit', need: 'audit' }],
    },
    {
      id: 'nastenka', x: 60.6, y: 67.3, kind: 'nav', label: 'Nástěnka', sub: 'Oznámení a novinky',
      items: [{ label: 'Nástěnka', href: '/nastenska', need: 'nastenska' }],
    },
    {
      id: 'garaz', x: 69.2, y: 70.7, kind: 'nav', label: 'Garáž', sub: 'Správa vozového parku',
      items: [{ label: 'Garáž', href: '/garaz', need: 'garaz' }],
    },
    {
      id: 'profil', x: 77.1, y: 57.8, kind: 'nav', label: 'Profil', sub: 'Uživatelský profil, fotogalerie, vizitka',
      items: [
        { label: 'Profil', href: '/profil', need: 'profil' },
        { label: 'Fotogalerie', href: '/galerie', need: 'galerie' },
        { label: 'Sdílitelná vizitka', href: '/karta', need: 'karta' },
      ],
    },
    {
      id: 'weed', x: 90.0, y: 68.0, kind: 'nav', label: 'Weed sázení', sub: 'Informace, růst, kalkulačka',
      items: [{ label: 'Weed sázení', href: '/weed-sazeni', need: 'weed-sazeni' }],
    },
    // ── ambientní hotspoty (lampy) — bez access gatingu, jen ovládají osvětlení ──
    { id: 'lamp-left', x: 13.9, y: 51.7, kind: 'lamp', label: 'Stolní lampa' },
    { id: 'lamp-right', x: 87.2, y: 46.9, kind: 'lamp', label: 'Lampa' },
  ];

  // Stránky bez explicitní PAGE_ACCESS položky jsou v roles.js buď volné (level 3),
  // nebo bez omezení -> canAccess vrátí true.
  const navHotspots = hotspots
    .filter(h => h.kind === 'nav')
    .map(h => ({ ...h, items: h.items.filter(it => can(it.need)) }))
    .filter(h => h.items.length);
  const lampHotspots = hotspots.filter(h => h.kind === 'lamp');
  const allHotspots = [...navHotspots, ...lampHotspots];

  const hotspotsJson = JSON.stringify(allHotspots);

  // Okno (červená zóna z referenčního obrázku) — použito pro clip-path počasí/déšť/sníh/bouřku,
  // aby efekty nikdy nepřetekly mimo sklo.
  const WIN = { top: 2.0, right: 17.8, bottom: 49.6, left: 21.3 };

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ALBION — Kancelář</title>
  <link rel="icon" type="image/png" href="/logo.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{height:100%;overflow:hidden;background:#05070a}
    body{font-family:'Space Mono',monospace;color:#EDE6D4;position:relative}

    /* ══ ZOOM WRAP — jediná vrstva, kterou hýbe GSAP při "najetí kamery" ══ */
    .zoom-wrap{position:fixed;inset:-4%;will-change:transform;transform-origin:50% 50%}

    .albion-stage{
      position:absolute;inset:0;
      background:url('/albion-office.jpg') center center / cover no-repeat;
      transition:filter 1.6s ease;
      will-change:transform,filter;
    }
    .mood-dawn{filter:brightness(1.05) saturate(0.85) hue-rotate(-10deg)}
    .mood-morning{filter:brightness(1.18) saturate(0.92) hue-rotate(-6deg)}
    .mood-noon{filter:brightness(1.28) saturate(1.08)}
    .mood-evening{filter:brightness(0.9) saturate(1.15) hue-rotate(6deg)}
    .mood-night{filter:brightness(0.9) saturate(1.05)}

    /* ══ SVĚTELNÉ ZDROJE — lampy + odlesk okna, mix-blend-mode:screen ══ */
    .light-glow{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;z-index:1}
    .glow-spot{position:absolute;border-radius:50%;filter:blur(46px);transform:translate(-50%,-50%);transition:opacity .5s ease}
    .glow-window{position:absolute;filter:blur(70px);transform:translate(-50%,-50%);border-radius:50%;
      background:radial-gradient(circle,rgba(140,175,220,.35) 0%,transparent 72%);opacity:.5;pointer-events:none}
    .mood-dawn .glow-window,.mood-morning .glow-window{opacity:.75;background:radial-gradient(circle,rgba(255,200,150,.4) 0%,transparent 72%)}
    .mood-noon .glow-window{opacity:.35}
    .mood-evening .glow-window{opacity:.6;background:radial-gradient(circle,rgba(255,160,110,.4) 0%,transparent 72%)}

    /* ══ POČASÍ — přísně omezeno clip-path na okenní tabuli ══ */
    .weather-mask{position:absolute;inset:0;pointer-events:none;z-index:2;overflow:hidden;
      clip-path:inset(${WIN.top}% ${WIN.right}% ${WIN.bottom}% ${WIN.left}%)}
    #rainCanvas,#snowCanvas{position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity 1.2s}
    .weather-mask.w-rain #rainCanvas{opacity:1}
    .weather-mask.w-storm #rainCanvas{opacity:1}
    .weather-mask.w-snow #snowCanvas{opacity:1}
    .weather-fog{position:absolute;inset:0;opacity:0;transition:opacity 1.4s;
      background:radial-gradient(ellipse 90% 70% at 50% 45%,rgba(205,210,220,.22),transparent 72%)}
    .weather-mask.w-fog .weather-fog{opacity:1}
    .lightning{position:absolute;inset:0;background:#dfe8ff;opacity:0;transition:opacity .09s linear}
    .lightning.flash{opacity:.8;transition:opacity .04s linear}

    /* ══ FILM GRAIN ══ */
    .grain-layer{position:fixed;inset:-40px;z-index:4;pointer-events:none;mix-blend-mode:overlay;
      background:url('/albion/grain.png');background-size:220px 220px;opacity:.35;
      animation:grainShift 0.6s steps(4) infinite}
    @keyframes grainShift{0%{transform:translate(0,0)}25%{transform:translate(-6%,4%)}50%{transform:translate(4%,-6%)}75%{transform:translate(-4%,-4%)}100%{transform:translate(0,0)}}

    .vignette{position:fixed;inset:0;pointer-events:none;z-index:5;box-shadow:inset 0 0 22vw rgba(0,0,0,0.75)}
    .lightshaft{position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity 1.6s;
      background:linear-gradient(200deg,rgba(255,225,180,.10) 0%,transparent 40%)}
    .mood-dawn ~ .lightshaft,.mood-morning ~ .lightshaft{opacity:1}

    /* ══ TOP NAV ══ */
    .a-nav{position:fixed;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;
      padding:0.9rem 2rem;background:linear-gradient(180deg,rgba(5,7,10,0.82),rgba(5,7,10,0.35) 80%,transparent);backdrop-filter:blur(6px)}
    .a-logo{display:flex;align-items:center;gap:0.7rem;font-family:'Cinzel',serif;letter-spacing:0.24em;font-size:1rem;color:#EDE6D4;text-decoration:none;font-weight:600}
    .a-logo img{width:30px;height:30px;filter:drop-shadow(0 0 8px rgba(182,138,78,.5))}
    .a-menu{display:flex;gap:0.3rem;flex-wrap:wrap}
    .a-menu button{display:flex;flex-direction:column;align-items:center;gap:0.25rem;background:none;border:none;color:#B7AE99;cursor:pointer;
      font-family:'Cinzel',serif;font-size:0.5rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.4rem 0.7rem;transition:color .2s}
    .a-menu button:hover,.a-menu button.active{color:#E0BD7F}
    .a-user{display:flex;align-items:center;gap:0.6rem;font-family:'Cinzel',serif;font-size:0.62rem;letter-spacing:0.08em}
    .a-user img{width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid #B68A4E}
    .a-user-text{line-height:1.3}
    .a-user-text small{display:block;color:#7E7868;font-size:0.5rem;letter-spacing:0.16em}

    /* ══ HOTSPOTY ══ */
    .hotspot{position:absolute;z-index:10;transform:translate(-50%,-50%);cursor:pointer}
    .hotspot-dot{width:9px;height:9px;border-radius:50%;background:#E0BD7F;box-shadow:0 0 10px 2px rgba(224,189,127,0.7);
      animation:dotPulse 2.6s ease-in-out infinite;transition:transform .2s}
    .hotspot.lamp .hotspot-dot{background:#8FD3FF;box-shadow:0 0 10px 2px rgba(143,211,255,0.7)}
    @keyframes dotPulse{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}
    .hotspot:hover .hotspot-dot{transform:scale(1.6)}
    .hotspot-card{position:absolute;left:50%;bottom:130%;transform:translateX(-50%) translateY(6px);min-width:190px;
      background:rgba(10,12,10,0.92);border:1px solid rgba(182,138,78,0.4);padding:0.7rem 0.9rem;opacity:0;pointer-events:none;
      transition:opacity .18s,transform .18s;box-shadow:0 12px 30px rgba(0,0,0,0.6)}
    .hotspot:hover .hotspot-card{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:all}
    .hotspot-card .hc-title{font-family:'Cinzel',serif;font-size:0.72rem;letter-spacing:0.08em;color:#E0BD7F;margin-bottom:0.2rem}
    .hotspot-card .hc-sub{font-size:0.62rem;color:#B7AE99;line-height:1.5;margin-bottom:0.4rem}
    .hc-item{display:block;font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.06em;color:#EDE6D4;text-decoration:none;
      padding:0.32rem 0.1rem;border-top:1px solid rgba(182,138,78,0.15)}
    .hc-item:first-of-type{border-top:none}
    .hc-item:hover{color:#E0BD7F}
    .hc-lamp-state{font-size:0.58rem;color:#8FD3FF;letter-spacing:.06em}

    /* ══ BOTTOM BAR ══ */
    .a-bottom{position:fixed;bottom:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;
      padding:0.9rem 2rem;background:linear-gradient(0deg,rgba(5,7,10,0.85),rgba(5,7,10,0.35) 80%,transparent)}
    .a-stats-row{display:flex;gap:1.6rem}
    .a-stat{display:flex;flex-direction:column;gap:0.15rem}
    .a-stat .lbl{font-size:0.5rem;letter-spacing:0.14em;text-transform:uppercase;color:#7E7868}
    .a-stat b{font-family:'Cinzel',serif;font-size:0.75rem;color:#EDE6D4;letter-spacing:.04em}
    .a-btn{background:rgba(20,22,18,0.75);border:1px solid rgba(182,138,78,0.4);color:#EDE6D4;font-family:'Cinzel',serif;
      font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.55rem 1rem;cursor:pointer;transition:.2s}
    .a-btn:hover{background:rgba(182,138,78,0.2);border-color:#E0BD7F}
    .a-btn.active{background:rgba(182,138,78,0.3);border-color:#E0BD7F;color:#E0BD7F}
    .a-leave{border-color:rgba(200,90,70,.5)}
    .a-leave:hover{background:rgba(200,90,70,.18);border-color:#E08F7F}

    /* ══ SETTINGS PANEL ══ */
    .a-settings{position:fixed;bottom:4.6rem;right:2rem;z-index:60;min-width:250px;background:rgba(8,9,8,0.94);
      border:1px solid rgba(182,138,78,0.35);padding:1rem 1.1rem;display:none;flex-direction:column;gap:0.65rem;
      box-shadow:0 16px 40px rgba(0,0,0,.6)}
    .a-settings.open{display:flex}
    .a-settings h4{font-family:'Cinzel',serif;font-size:0.68rem;letter-spacing:0.12em;color:#E0BD7F;margin-bottom:0.2rem}
    .a-settings select,.a-settings input[type=range]{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(182,138,78,.3);
      color:#EDE6D4;font-family:'Space Mono',monospace;font-size:0.62rem;padding:0.35rem;outline:none}
    .a-settings .row{display:flex;align-items:center;justify-content:space-between;gap:.5rem}
    .a-settings .row span{font-size:0.58rem;color:#B7AE99;letter-spacing:.06em}
    .a-mini-btns{display:flex;gap:.4rem;flex-wrap:wrap}
    .a-mini-btns button{flex:1;min-width:70px}

    /* ══ FOCUS MODE (otevření modulu) ══ */
    .a-focus-overlay{position:fixed;inset:0;background:rgba(3,4,3,0.7);backdrop-filter:blur(3px);z-index:80;opacity:0;pointer-events:none;transition:opacity .3s}
    .a-focus-overlay.open{opacity:1;pointer-events:all}
    .a-focus-panel{position:fixed;left:6vw;right:6vw;top:4vh;bottom:4vh;z-index:81;background:#0B0F0D;border:1px solid rgba(182,138,78,0.4);
      display:flex;flex-direction:column;transform:scale(.96);opacity:0;pointer-events:none;transition:transform .3s,opacity .3s;box-shadow:0 30px 80px rgba(0,0,0,.7)}
    .a-focus-panel.open{transform:scale(1);opacity:1;pointer-events:all}
    .a-focus-bar{display:flex;align-items:center;justify-content:space-between;padding:0.7rem 1rem;border-bottom:1px solid rgba(182,138,78,0.25);background:#0d1210}
    .a-focus-title{font-family:'Cinzel',serif;font-size:0.75rem;letter-spacing:0.1em;color:#E0BD7F}
    .a-focus-close{background:none;border:1px solid rgba(182,138,78,.4);color:#EDE6D4;width:28px;height:28px;cursor:pointer;font-size:.8rem}
    .a-focus-close:hover{background:rgba(200,90,70,.2);border-color:#E08F7F}
    .a-focus-panel iframe{flex:1;border:none;width:100%;background:#0B0F0D}

    @media(max-width:900px){
      .a-menu{display:none}
      .a-stats-row{display:none}
      .a-settings{right:1rem;left:1rem;min-width:0}
      .a-focus-panel{left:2vw;right:2vw;top:1.5vh;bottom:1.5vh}
    }
  </style>
  </head><body>

  <div class="zoom-wrap" id="zoomWrap">
    <div class="albion-stage mood-night" id="stage"></div>
    <div class="light-glow" id="lightGlow">
      <div class="glow-window" style="left:${(WIN.left + (100 - WIN.right)) / 2}%;top:${(WIN.top + (100 - WIN.bottom)) / 2}%;width:46vw;height:46vw"></div>
      <div class="glow-spot" id="glowLampLeft" style="left:13.9%;top:51.7%;width:16vw;height:16vw;background:radial-gradient(circle,rgba(255,196,120,.8) 0%,transparent 68%);opacity:.65"></div>
      <div class="glow-spot" id="glowLampRight" style="left:87.2%;top:46.9%;width:12vw;height:12vw;background:radial-gradient(circle,rgba(255,196,120,.8) 0%,transparent 68%);opacity:.65"></div>
    </div>
    <div class="weather-mask" id="weatherMask">
      <canvas id="rainCanvas"></canvas>
      <canvas id="snowCanvas"></canvas>
      <div class="weather-fog"></div>
      <div class="lightning" id="lightning"></div>
    </div>
  </div>

  <div class="lightshaft"></div>
  <div class="grain-layer"></div>
  <div class="vignette"></div>

  <nav class="a-nav">
    <a href="/home" class="a-logo"><img src="/logo.png" alt="Albion">ALBION</a>
    <div class="a-menu">
      <button onclick="openFocus('/home','Dashboard')">Dashboard</button>
      ${can('garaz') ? `<button onclick="openFocus('/garaz','Garáž')">Garáž</button>` : ''}
      ${can('sklad') ? `<button onclick="openFocus('/sklad','Sklad')">Sklad</button>` : ''}
      ${can('blackbook') ? `<button onclick="openFocus('/blackbook','BlackBook')">BlackBook</button>` : ''}
      ${can('profit-centrum') ? `<button onclick="openFocus('/profit-centrum','Profit centrum')">Profit centrum</button>` : ''}
      ${can('audit') ? `<button onclick="openFocus('/audit','Audit')">Audit</button>` : ''}
      ${can('statistiky') ? `<button onclick="openFocus('/statistiky','Statistiky')">Statistiky</button>` : ''}
      ${can('nastenska') ? `<button onclick="openFocus('/nastenska','Nástěnka')">Nástěnka</button>` : ''}
      <button onclick="openFocus('/hierarchy','Hierarchie')">Hierarchie</button>
      <button onclick="openFocus('/kodex','Kodex')">Kodex</button>
      <button onclick="openFocus('/lore','Historie')">Historie</button>
    </div>
    <div class="a-user">
      <img src="${photo}" alt="${icName || ''}">
      <div class="a-user-text"><small>VÍTEJ ZPĚT,</small>${icName || 'Albion'}</div>
    </div>
  </nav>

  <div id="hotspots"></div>

  <div class="a-bottom">
    <div class="a-stats-row">
      <div class="a-stat"><span class="lbl">Počasí</span><b id="stat-weather">—</b></div>
      <div class="a-stat"><span class="lbl">Čas</span><b id="stat-time">--:--</b></div>
      <div class="a-stat"><span class="lbl">Atmosféra</span><b id="stat-mood">Reality</b></div>
      <div class="a-stat"><span class="lbl">Město</span><b>Živá aktivita</b></div>
    </div>
    <div style="display:flex;gap:0.6rem">
      <button class="a-btn" id="soundBtn" onclick="toggleSound()">🔈 Zapnout zvuk</button>
      <button class="a-btn" onclick="toggleSettings()">Nastavení prostředí</button>
      <button class="a-btn a-leave" onclick="leaveAlbion()">Opustit Albion</button>
    </div>
  </div>

  <div class="a-settings" id="settingsPanel">
    <h4>Atmosféra</h4>
    <select id="modeSelect" onchange="onModeChange()">
      <option value="reality">Reality Mode (reálný čas)</option>
      <option value="mood">Mood Mode (manuální)</option>
    </select>
    <div id="moodControls" style="display:none">
      <div class="row" style="margin-bottom:.4rem">
        <select id="weatherSelect" onchange="applyMood()" style="flex:1">
          <option value="clear">Jasno</option>
          <option value="rain">Déšť</option>
          <option value="fog">Mlha</option>
          <option value="snow">Sníh</option>
          <option value="storm">Bouřka</option>
        </select>
      </div>
      <select id="dayTimeSelect" onchange="applyMood()">
        <option value="dawn">Svítání</option>
        <option value="morning">Ráno</option>
        <option value="noon">Poledne</option>
        <option value="evening">Večer</option>
        <option value="night" selected>Noc</option>
      </select>
    </div>
    <h4 style="margin-top:.3rem">Zvuk</h4>
    <div class="row"><span>Hlasitost</span></div>
    <input type="range" id="volumeRange" min="0" max="100" value="50" oninput="setVolume(this.value)">
    <div class="a-mini-btns">
      <button class="a-btn" id="padBtn" onclick="togglePad()">Lo-fi nálada</button>
    </div>
  </div>

  <div class="a-focus-overlay" id="focusOverlay" onclick="if(event.target===this)closeFocus()"></div>
  <div class="a-focus-panel" id="focusPanel">
    <div class="a-focus-bar">
      <span class="a-focus-title" id="focusTitle">Modul</span>
      <button class="a-focus-close" onclick="closeFocus()">✕</button>
    </div>
    <iframe id="focusFrame" src="about:blank"></iframe>
  </div>

  <script>
  (function(){
    const HOTSPOTS = ${hotspotsJson};
    const state = { weather: 'clear', mood: 'reality', timeOfDay: 'night' };
    const lampState = { 'lamp-left': 1, 'lamp-right': 1 };
    const WEATHER_LABELS = { clear:'Jasno', rain:'Déšť', fog:'Mlha', snow:'Sníh', storm:'Bouřka' };

    // ══════════════════════════ HOTSPOTY ══════════════════════════
    const wrap = document.getElementById('hotspots');
    HOTSPOTS.forEach(h => {
      const el = document.createElement('div');
      el.className = 'hotspot' + (h.kind === 'lamp' ? ' lamp' : '');
      el.style.left = h.x + '%';
      el.style.top = h.y + '%';
      if (h.kind === 'nav') {
        const itemsHtml = h.items.map(it => \`<a class="hc-item" href="javascript:void(0)" onclick="event.stopPropagation();navTo('\${it.href}','\${it.label.replace(/'/g,"\\\\'")}',\${h.x},\${h.y})">\${it.label}</a>\`).join('');
        el.innerHTML = \`<div class="hotspot-dot"></div><div class="hotspot-card"><div class="hc-title">\${h.label}</div><div class="hc-sub">\${h.sub}</div>\${itemsHtml}</div>\`;
        el.addEventListener('click', () => { if (h.items.length === 1) navTo(h.items[0].href, h.items[0].label, h.x, h.y); });
      } else {
        el.innerHTML = \`<div class="hotspot-dot"></div><div class="hotspot-card"><div class="hc-title">\${h.label}</div><div class="hc-sub hc-lamp-state" id="lampLabel-\${h.id}">Klikni pro změnu intenzity</div></div>\`;
        el.addEventListener('click', () => toggleLamp(h.id));
      }
      wrap.appendChild(el);
    });

    // ══════════════════════════ CINEMATIC ZOOM + FOCUS MODE ══════════════════════════
    function navTo(href, title, x, y) {
      navZoom(x, y, () => openFocus(href, title));
    }
    window.navTo = navTo;

    function navZoom(x, y, cb) {
      const zw = document.getElementById('zoomWrap');
      if (window.gsap) {
        gsap.to(zw, {
          scale: 1.32, transformOrigin: x + '% ' + y + '%',
          duration: 1.05, ease: 'power2.inOut',
          onComplete: cb,
        });
      } else { cb(); }
    }
    function navZoomReset() {
      const zw = document.getElementById('zoomWrap');
      if (window.gsap) gsap.to(zw, { scale: 1, duration: 0.9, ease: 'power2.inOut' });
    }

    function openFocus(href, title) {
      document.getElementById('focusTitle').textContent = title;
      document.getElementById('focusFrame').src = href;
      document.getElementById('focusOverlay').classList.add('open');
      document.getElementById('focusPanel').classList.add('open');
      duckAudio(true);
    }
    window.openFocus = openFocus;
    function closeFocus() {
      document.getElementById('focusOverlay').classList.remove('open');
      document.getElementById('focusPanel').classList.remove('open');
      setTimeout(() => { document.getElementById('focusFrame').src = 'about:blank'; }, 350);
      navZoomReset();
      duckAudio(false);
    }
    window.closeFocus = closeFocus;
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeFocus(); });

    function leaveAlbion() { window.location.href = '/home'; }
    window.leaveAlbion = leaveAlbion;

    // ══════════════════════════ LAMPY / OSVĚTLENÍ ══════════════════════════
    function toggleLamp(id) {
      const cur = lampState[id];
      const next = cur >= 1 ? 0 : Math.round((cur + 0.5) * 2) / 2;
      lampState[id] = next;
      const glowId = id === 'lamp-left' ? 'glowLampLeft' : 'glowLampRight';
      const glow = document.getElementById(glowId);
      glow.style.opacity = (0.15 + next * 0.55).toFixed(2);
      const label = document.getElementById('lampLabel-' + id);
      if (label) label.textContent = next === 0 ? 'Vypnuto' : (next === 0.5 ? 'Tlumené světlo' : 'Plný jas');
      const zw = document.getElementById('zoomWrap');
      if (window.gsap) gsap.fromTo(zw, { filter: 'brightness(1)' }, { filter: 'brightness(1)', duration: .01 });
      if (window.gsap) {
        gsap.fromTo(zw, { scale: gsap.getProperty(zw, 'scale') || 1 }, { scale: '+=0.006', duration: .1, yoyo: true, repeat: 1, ease: 'power1.inOut' });
      }
    }
    window.toggleLamp = toggleLamp;

    // ══════════════════════════ SETTINGS / MOOD / DAY-NIGHT ══════════════════════════
    function toggleSettings() { document.getElementById('settingsPanel').classList.toggle('open'); }
    window.toggleSettings = toggleSettings;

    function onModeChange() {
      const mode = document.getElementById('modeSelect').value;
      state.mood = mode;
      document.getElementById('moodControls').style.display = mode === 'mood' ? 'block' : 'none';
      document.getElementById('stat-mood').textContent = mode === 'mood' ? 'Mood' : 'Reality';
      if (mode === 'reality') applyReality();
      else applyMood();
    }
    window.onModeChange = onModeChange;

    function setTimeClass(t) {
      state.timeOfDay = t;
      document.getElementById('stage').className = 'albion-stage mood-' + t;
    }
    function setWeather(w) {
      state.weather = w;
      const mask = document.getElementById('weatherMask');
      mask.className = 'weather-mask' + (w !== 'clear' ? ' w-' + w : '');
      document.getElementById('stat-weather').textContent = WEATHER_LABELS[w];
      applyWeatherAudio(w);
      manageStorm(w === 'storm');
      manageRain(w === 'rain' || w === 'storm');
      manageSnow(w === 'snow');
    }
    function applyMood() {
      const w = document.getElementById('weatherSelect').value;
      const t = document.getElementById('dayTimeSelect').value;
      setWeather(w); setTimeClass(t);
    }
    window.applyMood = applyMood;

    function timeOfDayFromHour(h) {
      if (h >= 5 && h < 7) return 'dawn';
      if (h >= 7 && h < 11) return 'morning';
      if (h >= 11 && h < 17) return 'noon';
      if (h >= 17 && h < 21) return 'evening';
      return 'night';
    }
    function applyReality() {
      const now = new Date();
      setTimeClass(timeOfDayFromHour(now.getHours()));
      setWeather('clear');
    }
    function tickClock() {
      const now = new Date();
      document.getElementById('stat-time').textContent = now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
      if (state.mood === 'reality') setTimeClass(timeOfDayFromHour(now.getHours()));
    }
    tickClock(); setInterval(tickClock, 30000);
    applyReality();

    // ══════════════════════════ POČASÍ — CANVAS ČÁSTICE (jen uvnitř okna) ══════════════════════════
    const rainCv = document.getElementById('rainCanvas'), rainCtx = rainCv.getContext('2d');
    const snowCv = document.getElementById('snowCanvas'), snowCtx = snowCv.getContext('2d');
    let rainDrops = [], snowFlakes = [], rainRAF = null, snowRAF = null;
    function resizeCanvases() {
      [rainCv, snowCv].forEach(cv => { cv.width = window.innerWidth; cv.height = window.innerHeight; });
    }
    window.addEventListener('resize', resizeCanvases);
    resizeCanvases();

    function manageRain(on) {
      if (on && !rainRAF) {
        rainDrops = Array.from({ length: 140 }, () => ({
          x: Math.random() * rainCv.width, y: Math.random() * rainCv.height,
          len: 10 + Math.random() * 16, spd: 9 + Math.random() * 7, drift: -1.2 - Math.random(),
        }));
        const loop = () => {
          rainCtx.clearRect(0, 0, rainCv.width, rainCv.height);
          rainCtx.strokeStyle = 'rgba(200,220,255,0.35)'; rainCtx.lineWidth = 1.1;
          rainDrops.forEach(d => {
            rainCtx.beginPath(); rainCtx.moveTo(d.x, d.y); rainCtx.lineTo(d.x + d.drift * 2, d.y + d.len); rainCtx.stroke();
            d.y += d.spd; d.x += d.drift;
            if (d.y > rainCv.height) { d.y = -20; d.x = Math.random() * rainCv.width; }
          });
          rainRAF = requestAnimationFrame(loop);
        };
        loop();
      } else if (!on && rainRAF) {
        cancelAnimationFrame(rainRAF); rainRAF = null;
        rainCtx.clearRect(0, 0, rainCv.width, rainCv.height);
      }
    }
    function manageSnow(on) {
      if (on && !snowRAF) {
        snowFlakes = Array.from({ length: 90 }, () => ({
          x: Math.random() * snowCv.width, y: Math.random() * snowCv.height,
          r: 1 + Math.random() * 2.4, spd: 0.4 + Math.random() * 1.1, sway: Math.random() * Math.PI * 2,
        }));
        const loop = () => {
          snowCtx.clearRect(0, 0, snowCv.width, snowCv.height);
          snowCtx.fillStyle = 'rgba(255,255,255,0.75)';
          snowFlakes.forEach(f => {
            snowCtx.beginPath(); snowCtx.arc(f.x, f.y, f.r, 0, Math.PI * 2); snowCtx.fill();
            f.y += f.spd; f.sway += 0.01; f.x += Math.sin(f.sway) * 0.4;
            if (f.y > snowCv.height) { f.y = -10; f.x = Math.random() * snowCv.width; }
          });
          snowRAF = requestAnimationFrame(loop);
        };
        loop();
      } else if (!on && snowRAF) {
        cancelAnimationFrame(snowRAF); snowRAF = null;
        snowCtx.clearRect(0, 0, snowCv.width, snowCv.height);
      }
    }

    let stormTimer = null;
    function manageStorm(on) {
      clearInterval(stormTimer); stormTimer = null;
      if (!on) return;
      stormTimer = setInterval(() => {
        if (Math.random() < 0.45) {
          const lg = document.getElementById('lightning');
          lg.classList.add('flash'); thunder();
          setTimeout(() => lg.classList.remove('flash'), 120 + Math.random() * 90);
        }
      }, 3200);
    }

    // ══════════════════════════ PROCEDURÁLNÍ AUDIO (Web Audio API, žádné externí soubory) ══════════════════════════
    let actx = null, master = null, soundOn = false, padOn = false, nodes = {};
    function ensureAudio() {
      if (actx) return;
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain(); master.gain.value = 0; master.connect(actx.destination);
      nodes.rain = makeFilteredNoise(4, 'bandpass', 3200, 0.6, 1200);
      nodes.wind = makeWindNoise();
      nodes.city = makeFilteredNoise(5, 'lowpass', 170, 0.4, null, 0.1);
      nodes.pad = makePad();
    }
    function noiseBuffer(seconds) {
      const len = Math.floor(actx.sampleRate * seconds);
      const buf = actx.createBuffer(1, len, actx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    }
    function makeFilteredNoise(secs, type, freq, q, hpFreq, startGain) {
      const src = actx.createBufferSource(); src.buffer = noiseBuffer(secs); src.loop = true;
      const filt = actx.createBiquadFilter(); filt.type = type; filt.frequency.value = freq; if (q) filt.Q.value = q;
      const g = actx.createGain(); g.gain.value = startGain || 0;
      let last = filt;
      if (hpFreq) { const hp = actx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = hpFreq; filt.connect(hp); last = hp; }
      src.connect(filt); last.connect(g); g.connect(master); src.start();
      return { gain: g };
    }
    function makeWindNoise() {
      const src = actx.createBufferSource(); src.buffer = noiseBuffer(6); src.loop = true;
      const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 480;
      const lfo = actx.createOscillator(); lfo.frequency.value = 0.06;
      const lfoGain = actx.createGain(); lfoGain.gain.value = 200;
      lfo.connect(lfoGain); lfoGain.connect(lp.frequency); lfo.start();
      const g = actx.createGain(); g.gain.value = 0.04;
      src.connect(lp); lp.connect(g); g.connect(master); src.start();
      return { gain: g };
    }
    function makePad() {
      const g = actx.createGain(); g.gain.value = 0;
      [130.81, 164.81, 196.0].forEach(f => {
        const o = actx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const og = actx.createGain(); og.gain.value = 0.3;
        o.connect(og); og.connect(g); o.start();
      });
      const lfo = actx.createOscillator(); lfo.frequency.value = 0.045;
      const lfoGain = actx.createGain(); lfoGain.gain.value = 0.06;
      lfo.connect(lfoGain); lfoGain.connect(g.gain); lfo.start();
      g.connect(master);
      return { gain: g };
    }
    function thunder() {
      if (!actx || !soundOn) return;
      const src = actx.createBufferSource(); src.buffer = noiseBuffer(1.4);
      const lp = actx.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(900, actx.currentTime);
      lp.frequency.exponentialRampToValueAtTime(70, actx.currentTime + 1.3);
      const g = actx.createGain();
      g.gain.setValueAtTime(0.0001, actx.currentTime);
      g.gain.linearRampToValueAtTime(0.85, actx.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 1.4);
      src.connect(lp); lp.connect(g); g.connect(master); src.start();
    }
    function fadeGain(node, target, dur) {
      if (!node || !actx) return;
      const t = actx.currentTime;
      node.gain.cancelScheduledValues(t);
      node.gain.setValueAtTime(node.gain.value, t);
      node.gain.linearRampToValueAtTime(target, t + (dur || 1.1));
    }
    function applyWeatherAudio(w) {
      if (!actx) return;
      fadeGain(nodes.rain.gain, (w === 'rain' || w === 'storm') ? 0.32 : 0);
      fadeGain(nodes.wind.gain, (w === 'fog' || w === 'storm' || w === 'snow') ? 0.16 : 0.04);
    }
    let masterVolume = 0.5;
    function toggleSound() {
      ensureAudio();
      if (actx.state === 'suspended') actx.resume();
      soundOn = !soundOn;
      fadeGain(master, soundOn ? masterVolume : 0, 0.6);
      document.getElementById('soundBtn').textContent = soundOn ? '🔊 Zvuk zapnut' : '🔈 Zapnout zvuk';
      document.getElementById('soundBtn').classList.toggle('active', soundOn);
      if (soundOn) applyWeatherAudio(state.weather);
    }
    window.toggleSound = toggleSound;
    function setVolume(v) {
      masterVolume = v / 100;
      if (soundOn) fadeGain(master, masterVolume, 0.3);
    }
    window.setVolume = setVolume;
    function togglePad() {
      ensureAudio();
      padOn = !padOn;
      fadeGain(nodes.pad.gain, padOn ? 0.06 : 0, 1.5);
      document.getElementById('padBtn').classList.toggle('active', padOn);
    }
    window.togglePad = togglePad;
    function duckAudio(down) {
      if (!actx || !soundOn) return;
      fadeGain(master, down ? masterVolume * 0.3 : masterVolume, 0.5);
    }

    // ══════════════════════════ PARALLAX (subtilní posun scény podle kurzoru) ══════════════════════════
    let px = 0, py = 0, tx = 0, ty = 0;
    document.addEventListener('mousemove', e => {
      px = (e.clientX / window.innerWidth - 0.5) * 2;
      py = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    function parallaxLoop() {
      tx += (px - tx) * 0.04; ty += (py - ty) * 0.04;
      const stage = document.getElementById('stage');
      const glow = document.getElementById('lightGlow');
      const shift = 10;
      stage.style.transform = 'translate(' + (-tx * shift) + 'px,' + (-ty * shift * 0.6) + 'px) scale(1.03)';
      glow.style.transform = 'translate(' + (-tx * shift * 1.4) + 'px,' + (-ty * shift * 0.8) + 'px)';
      requestAnimationFrame(parallaxLoop);
    }
    parallaxLoop();
  })();
  </script>
  </body></html>`;
}

module.exports = { renderAlbion };
