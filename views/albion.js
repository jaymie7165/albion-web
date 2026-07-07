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
  const lastLoginAt = data.lastLoginAt || null;

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
    { id: 'lamp-left', x: 13.9, y: 51.7, kind: 'lamp', label: 'Stolní lampa' },
    { id: 'lamp-right', x: 87.2, y: 46.9, kind: 'lamp', label: 'Lampa' },
  ];

  const navHotspots = hotspots
    .filter(h => h.kind === 'nav')
    .map(h => ({ ...h, items: h.items.filter(it => can(it.need)) }))
    .filter(h => h.items.length);
  const lampHotspots = hotspots.filter(h => h.kind === 'lamp');
  const allHotspots = [...navHotspots, ...lampHotspots];
  const hotspotsJson = JSON.stringify(allHotspots);

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
    .zoom-wrap{position:fixed;inset:-4%;will-change:transform;transform-origin:50% 50%}
    .albion-stage{
      position:absolute;inset:0;overflow:hidden;
      background:radial-gradient(ellipse 80% 60% at 50% 40%,#12161c 0%,#05070a 75%);
      transition:filter 1.6s ease;
      will-change:transform,filter;
    }
    .bg-layer{position:absolute;inset:0;background-size:cover;background-position:center center;background-repeat:no-repeat;opacity:0;transition:opacity 1.3s ease}
    .bg-layer.active{opacity:1}
    .mood-sunrise{filter:brightness(1.02)}
    .mood-day{filter:brightness(1.06) saturate(1.02)}
    .mood-sunset{filter:brightness(0.98) saturate(1.03)}
    .mood-night{filter:brightness(0.94)}
    .mood-fog{filter:brightness(0.92) saturate(0.85)}
    .mood-winter{filter:brightness(0.96) saturate(0.92)}
    .light-glow{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;z-index:1}
    .glow-spot{position:absolute;border-radius:50%;filter:blur(46px);transform:translate(-50%,-50%);transition:opacity .5s ease}
    .glow-window{position:absolute;filter:blur(70px);transform:translate(-50%,-50%);border-radius:50%;
      background:radial-gradient(circle,rgba(140,175,220,.35) 0%,transparent 72%);opacity:.5;pointer-events:none;transition:opacity .6s ease,background .6s ease}
    .mood-sunrise .glow-window,.mood-sunset .glow-window{opacity:.7;background:radial-gradient(circle,rgba(255,180,120,.4) 0%,transparent 72%)}
    .mood-day .glow-window{opacity:.3}
    .mood-fog .glow-window{opacity:.4;background:radial-gradient(circle,rgba(200,205,215,.35) 0%,transparent 72%)}
    .mood-winter .glow-window{opacity:.45;background:radial-gradient(circle,rgba(170,200,230,.35) 0%,transparent 72%)}
    .weather-mask{position:absolute;inset:0;pointer-events:none;z-index:2;overflow:hidden;
      clip-path:inset(2.0% 17.8% 49.6% 21.3%)}
    #snowCanvas,#rainCanvas{position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity 1.2s}
    .weather-mask.w-snow #snowCanvas{opacity:1}
    .weather-mask.w-fog #rainCanvas{opacity:1}
    .grain-layer{position:fixed;inset:-40px;z-index:4;pointer-events:none;mix-blend-mode:overlay;
      background:url('/albion/grain.png');background-size:220px 220px;opacity:.35;
      animation:grainShift 0.6s steps(4) infinite}
    @keyframes grainShift{0%{transform:translate(0,0)}25%{transform:translate(-6%,4%)}50%{transform:translate(4%,-6%)}75%{transform:translate(-4%,-4%)}100%{transform:translate(0,0)}}
    .vignette{position:fixed;inset:0;pointer-events:none;z-index:5;box-shadow:inset 0 0 22vw rgba(0,0,0,0.75)}
    .lightshaft{position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity 1.6s;
      background:linear-gradient(200deg,rgba(255,225,180,.10) 0%,transparent 40%)}
    .mood-sunrise ~ .lightshaft,.mood-sunset ~ .lightshaft{opacity:1}
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
    .hotspot{position:absolute;z-index:10;transform:translate(-50%,-50%);cursor:pointer}
    .hotspot-dot{width:9px;height:9px;border-radius:50%;background:#E0BD7F;box-shadow:0 0 10px 2px rgba(224,189,127,0.7);
      animation:dotPulse 2.6s ease-in-out infinite;transition:transform .2s}
    .hotspot.lamp .hotspot-dot{background:#8FD3FF;box-shadow:0 0 10px 2px rgba(143,211,255,0.7)}
    @keyframes dotPulse{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}
    .hotspot:hover .hotspot-dot{transform:scale(1.6)}
    .hotspot-card{position:absolute;left:50%;bottom:130%;transform:translateX(-50%) translateY(6px);min-width:190px;
      background:rgba(10,12,10,0.92);border:1px solid rgba(182,138,78,0.4);padding:0.7rem 0.9rem;opacity:0;pointer-events:none;
      transition:opacity .18s,transform .18s;box-shadow:0 12px 30px rgba(0,0,0,0.6)}
    .hotspot:hover .hotspot-card,.hotspot.open .hotspot-card{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:all}
    .hotspot-card .hc-title{font-family:'Cinzel',serif;font-size:0.72rem;letter-spacing:0.08em;color:#E0BD7F;margin-bottom:0.2rem}
    .hotspot-card .hc-sub{font-size:0.62rem;color:#B7AE99;line-height:1.5;margin-bottom:0.4rem}
    .hc-item{display:block;font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.06em;color:#EDE6D4;text-decoration:none;
      padding:0.32rem 0.1rem;border-top:1px solid rgba(182,138,78,0.15)}
    .hc-item:first-of-type{border-top:none}
    .hc-item:hover{color:#E0BD7F}
    .hc-lamp-state{font-size:0.58rem;color:#8FD3FF;letter-spacing:.06em}
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
    .a-settings{position:fixed;bottom:4.6rem;right:2rem;z-index:60;min-width:250px;background:rgba(8,9,8,0.94);
      border:1px solid rgba(182,138,78,0.35);padding:1rem 1.1rem;display:none;flex-direction:column;gap:0.65rem;
      box-shadow:0 16px 40px rgba(0,0,0,.6)}
    .a-settings.open{display:flex}
    .a-settings h4{font-family:'Cinzel',serif;font-size:0.68rem;letter-spacing:0.12em;color:#E0BD7F;margin-bottom:0.2rem}
    .a-settings select,.a-settings input[type=range]{width:100%;background:#15140F;border:1px solid rgba(182,138,78,.4);
      color:#EDE6D4;font-family:'Space Mono',monospace;font-size:0.68rem;padding:0.4rem;outline:none}
    .a-settings select option{background:#15140F;color:#EDE6D4}
    .a-settings .row{display:flex;align-items:center;justify-content:space-between;gap:.5rem}
    .a-settings .row span{font-size:0.58rem;color:#B7AE99;letter-spacing:.06em}
    .a-mini-btns{display:flex;gap:.4rem;flex-wrap:wrap}
    .a-mini-btns button{flex:1;min-width:70px}
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
    <div class="albion-stage mood-night" id="stage">
      <div class="bg-layer active" id="bgA" style="background-image:url('/albion-office.jpg')"></div>
      <div class="bg-layer" id="bgB"></div>
    </div>
    <div class="light-glow" id="lightGlow">
      <div class="glow-window" style="left:51.9%;top:26.2%;width:46vw;height:46vw"></div>
      <div class="glow-spot" id="glowLampLeft" style="left:13.9%;top:51.7%;width:16vw;height:16vw;background:radial-gradient(circle,rgba(255,196,120,.8) 0%,transparent 68%);opacity:.65"></div>
      <div class="glow-spot" id="glowLampRight" style="left:87.2%;top:46.9%;width:12vw;height:12vw;background:radial-gradient(circle,rgba(255,196,120,.8) 0%,transparent 68%);opacity:.65"></div>
    </div>
    <div class="weather-mask" id="weatherMask">
      <canvas id="snowCanvas"></canvas>
      <canvas id="rainCanvas"></canvas>
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
      <div class="a-stat"><span class="lbl">Vzhled</span><b id="stat-weather">—</b></div>
      <div class="a-stat"><span class="lbl">Čas</span><b id="stat-time">--:--</b></div>
      <div class="a-stat"><span class="lbl">Režim</span><b id="stat-mood">Reality</b></div>
      <div class="a-stat"><span class="lbl">Naposledy tu</span><b>${lastLoginAt ? new Date(lastLoginAt).toLocaleString('cs-CZ',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : 'poprvé'}</b></div>
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
      <option value="mood">Manuální</option>
    </select>
    <div id="moodControls" style="display:none">
      <select id="envSelect" onchange="applyMood()">
        <option value="day">Den</option>
        <option value="fog">Mlha</option>
        <option value="sunrise">Východ slunce</option>
        <option value="sunset">Západ slunce</option>
        <option value="winter">Zima</option>
        <option value="night" selected>Noc</option>
      </select>
    </div>
    <h4 style="margin-top:.3rem">Zvuk</h4>
    <div class="row"><span>Hlasitost</span></div>
    <input type="range" id="volumeRange" min="0" max="100" value="50" oninput="setVolume(this.value)">
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
    const state = { env: 'night', mood: 'reality' };
    const lampState = { 'lamp-left': 1, 'lamp-right': 1 };
    const ENV_LABELS = { day:'Den', fog:'Mlha', sunrise:'Východ slunce', sunset:'Západ slunce', winter:'Zima', night:'Noc' };

    const wrap = document.getElementById('hotspots');
    HOTSPOTS.forEach(h => {
      const el = document.createElement('div');
      el.className = 'hotspot' + (h.kind === 'lamp' ? ' lamp' : '');
      el.style.left = h.x + '%';
      el.style.top = h.y + '%';
      if (h.kind === 'nav') {
        const itemsHtml = h.items.map(it => \`<a class="hc-item" href="javascript:void(0)" onclick="event.stopPropagation();this.closest('.hotspot').classList.remove('open');navTo('\${it.href}','\${it.label.replace(/'/g,"\\\\'")}',\${h.x},\${h.y})">\${it.label}</a>\`).join('');
        el.innerHTML = \`<div class="hotspot-dot"></div><div class="hotspot-card"><div class="hc-title">\${h.label}</div><div class="hc-sub">\${h.sub}</div>\${itemsHtml}</div>\`;
        el.addEventListener('click', (e) => {
          if (h.items.length === 1) { navTo(h.items[0].href, h.items[0].label, h.x, h.y); return; }
          e.stopPropagation();
          const wasOpen = el.classList.contains('open');
          document.querySelectorAll('.hotspot.open').forEach(o => o.classList.remove('open'));
          if (!wasOpen) el.classList.add('open');
        });
      } else {
        el.innerHTML = \`<div class="hotspot-dot"></div><div class="hotspot-card"><div class="hc-title">\${h.label}</div><div class="hc-sub hc-lamp-state" id="lampLabel-\${h.id}">Klikni pro změnu intenzity</div></div>\`;
        el.addEventListener('click', () => toggleLamp(h.id));
      }
      wrap.appendChild(el);
    });
    document.addEventListener('click', () => {
      document.querySelectorAll('.hotspot.open').forEach(o => o.classList.remove('open'));
    });

    const snowCv = document.getElementById('snowCanvas'), snowCtx = snowCv.getContext('2d');
    const rainCv = document.getElementById('rainCanvas'), rainCtx = rainCv.getContext('2d');
    let snowFlakes = [], snowRAF = null, rainDrops = [], rainRAF = null;
    function resizeCanvas() {
      snowCv.width = window.innerWidth; snowCv.height = window.innerHeight;
      rainCv.width = window.innerWidth; rainCv.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
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

    // ══════════════════════════ AUDIO — reálné stopy, jedna na vzhled, crossfade ══════════════════════════
    const AUDIO_BY_ENV = {
      day: '/albion/audio/den.mp3',
      fog: '/albion/audio/mlha.mp3',
      sunrise: '/albion/audio/vychod-slunce.mp3',
      sunset: '/albion/audio/zapad-slunce.mp3',
      winter: '/albion/audio/snih.mp3',
      night: '/albion/audio/noc.mp3',
    };
    const audioEls = [new Audio(), new Audio()];
    audioEls.forEach(a => { a.loop = true; a.preload = 'none'; a.volume = 0; });
    let activeAudioIdx = 0, currentAudioUrl = null, soundOn = false, masterVolume = 0.5, audioFadeRAF = null, duckedFactor = 1;

    function crossfadeAudio(url) {
      if (!url || url === currentAudioUrl) return;
      currentAudioUrl = url;
      const nextIdx = 1 - activeAudioIdx;
      const next = audioEls[nextIdx], cur = audioEls[activeAudioIdx];
      next.src = url; next.currentTime = 0;
      if (soundOn) next.play().catch(() => {});
      cancelAnimationFrame(audioFadeRAF);
      const dur = 1400, start = performance.now();
      function step(now) {
        const t = Math.min(1, (now - start) / dur);
        const target = masterVolume * duckedFactor;
        next.volume = soundOn ? target * t : 0;
        cur.volume = soundOn ? target * (1 - t) : 0;
        if (t < 1) { audioFadeRAF = requestAnimationFrame(step); }
        else { cur.pause(); }
      }
      audioFadeRAF = requestAnimationFrame(step);
      activeAudioIdx = nextIdx;
    }
    function toggleSound() {
      soundOn = !soundOn;
      const active = audioEls[activeAudioIdx];
      if (soundOn) {
        if (active.src) { active.play().catch(() => {}); active.volume = masterVolume * duckedFactor; }
      } else {
        audioEls.forEach(a => a.volume = 0);
      }
      document.getElementById('soundBtn').textContent = soundOn ? '🔊 Zvuk zapnut' : '🔈 Zapnout zvuk';
      document.getElementById('soundBtn').classList.toggle('active', soundOn);
    }
    window.toggleSound = toggleSound;
    function setVolume(v) {
      masterVolume = v / 100;
      if (soundOn) audioEls[activeAudioIdx].volume = masterVolume * duckedFactor;
    }
    window.setVolume = setVolume;
    function duckAudio(down) {
      duckedFactor = down ? 0.3 : 1;
      if (soundOn) audioEls[activeAudioIdx].volume = masterVolume * duckedFactor;
    }

    function navTo(href, title, x, y) { navZoom(x, y, () => openFocus(href, title)); }
    window.navTo = navTo;

    function navZoom(x, y, cb) {
      const zw = document.getElementById('zoomWrap');
      if (window.gsap) {
        gsap.to(zw, { scale: 1.32, transformOrigin: x + '% ' + y + '%', duration: 1.05, ease: 'power2.inOut', onComplete: cb });
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
      if (window.gsap) gsap.fromTo(zw, { scale: gsap.getProperty(zw, 'scale') || 1 }, { scale: '+=0.006', duration: .1, yoyo: true, repeat: 1, ease: 'power1.inOut' });
    }
    window.toggleLamp = toggleLamp;

    function toggleSettings() { document.getElementById('settingsPanel').classList.toggle('open'); }
    window.toggleSettings = toggleSettings;

    function onModeChange() {
      const mode = document.getElementById('modeSelect').value;
      state.mood = mode;
      document.getElementById('moodControls').style.display = mode === 'mood' ? 'block' : 'none';
      document.getElementById('stat-mood').textContent = mode === 'mood' ? 'Manuální' : 'Reality';
      if (mode === 'reality') applyReality();
      else applyMood();
    }
    window.onModeChange = onModeChange;

    const BG_BY_ENV = {
      day: '/albion/kancelar-den.png',
      fog: '/albion/kancelar-mlha.png',
      sunrise: '/albion/kancelar-vychod-slunce.png',
      sunset: '/albion/kancelar-zapad-slunce.png',
      winter: '/albion/kancelar-zima.png',
      night: '/albion-office.jpg',
    };
    let bgToggle = false, currentBg = '/albion-office.jpg';
    const bgPreloaded = {};
    function preloadImg(url) {
      if (bgPreloaded[url]) return bgPreloaded[url];
      bgPreloaded[url] = new Promise(res => {
        const img = new Image();
        img.onload = () => res(url);
        img.onerror = () => { console.error('[ALBION] Obrázek pozadí se nepodařilo načíst:', url); res(url); };
        img.src = url;
      });
      return bgPreloaded[url];
    }
    async function setBackground(url) {
      if (url === currentBg) return;
      await preloadImg(url);
      const a = document.getElementById('bgA'), b = document.getElementById('bgB');
      const nextEl = bgToggle ? a : b, curEl = bgToggle ? b : a;
      nextEl.style.backgroundImage = "url('" + url + "')";
      requestAnimationFrame(() => { nextEl.classList.add('active'); curEl.classList.remove('active'); });
      bgToggle = !bgToggle; currentBg = url;
    }
    Object.values(BG_BY_ENV).forEach(preloadImg);

    function setEnv(env) {
      state.env = env;
      document.getElementById('stage').className = 'albion-stage mood-' + env;
      document.getElementById('stat-weather').textContent = ENV_LABELS[env];
      const mask = document.getElementById('weatherMask');
      mask.className = 'weather-mask' + (env === 'fog' ? ' w-fog' : env === 'winter' ? ' w-snow' : '');
      manageSnow(env === 'winter');
      manageRain(env === 'fog');
      crossfadeAudio(AUDIO_BY_ENV[env]);
      setBackground(BG_BY_ENV[env] || BG_BY_ENV.night);
    }
    function applyMood() {
      setEnv(document.getElementById('envSelect').value);
    }
    window.applyMood = applyMood;

    function envFromHour(h) {
      if (h >= 5 && h < 7) return 'sunrise';
      if (h >= 7 && h < 17) return 'day';
      if (h >= 17 && h < 21) return 'sunset';
      return 'night';
    }
    function applyReality() { setEnv(envFromHour(new Date().getHours())); }
    function tickClock() {
      const now = new Date();
      document.getElementById('stat-time').textContent = now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
      if (state.mood === 'reality') setEnv(envFromHour(now.getHours()));
    }
    tickClock(); setInterval(tickClock, 30000);
    applyReality();

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
