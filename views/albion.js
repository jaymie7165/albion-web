// albion.js — ALBION Immersive Layer
// Znovupoužívá existující routy/data. Žádný nový backend, žádná nová databáze.
// Pouze prezentační vrstva nad stávající aplikací.

const { canAccess } = require('../roles');

function renderAlbion(req, data) {
  const icName = req.session.icName;
  const accessLevel = req.session.accessLevel || 3;
  const can = (id) => canAccess(accessLevel, id);
  const photo = data.photo || '/logo.png';

  // ── Definice hotspotů — pozice v % dle referenčního obrázku (1536x1024) ──
  // Každý hotspot může mít víc položek (submenu), otevírá se v iframe fokus-módu.
  const hotspots = [
    {
      id: 'nastenka', x: 14.1, y: 29.8, label: 'Nástěnka', sub: 'Oznámení a novinky',
      items: [{ label: 'Nástěnka', href: '/nastenska', need: 'nastenska' }],
    },
    {
      id: 'dashboard', x: 43.1, y: 42.6, label: 'Dashboard', sub: 'Přehled, statistiky, profit centrum, blackbook',
      items: [
        { label: 'Dashboard', href: '/home', need: 'home' },
        { label: 'Profit centrum', href: '/profit-centrum', need: 'profit-centrum' },
        { label: 'Statistiky', href: '/statistiky', need: 'statistiky' },
        { label: 'BlackBook', href: '/blackbook', need: 'blackbook' },
      ],
    },
    {
      id: 'sklad', x: 28.6, y: 53.5, label: 'Sklad', sub: 'Účetnictví, zbraně, drogy, směnárna, weed',
      items: [{ label: 'Správa skladu', href: '/sklad', need: 'sklad' }],
    },
    {
      id: 'garaz', x: 58.9, y: 56.9, label: 'Garáž', sub: 'Správa vozového parku',
      items: [{ label: 'Garáž', href: '/garaz', need: 'garaz' }],
    },
    {
      id: 'hierarchie', x: 71.6, y: 28.4, label: 'Hierarchie & Kodex', sub: 'Struktura organizace, pravidla a kodex',
      items: [
        { label: 'Hierarchie', href: '/hierarchy', need: 'hierarchy' },
        { label: 'Kodex', href: '/kodex', need: 'kodex' },
      ],
    },
    {
      id: 'profil', x: 81.6, y: 55.5, label: 'Profil', sub: 'Uživatelský profil, fotogalerie, vizitka',
      items: [
        { label: 'Profil', href: '/profil', need: 'profil' },
        { label: 'Fotogalerie', href: '/galerie', need: 'galerie' },
        { label: 'Sdílitelná vizitka', href: '/karta', need: 'karta' },
      ],
    },
    {
      id: 'audit', x: 21.7, y: 71.5, label: 'Audit', sub: 'Záznamy a logy',
      items: [{ label: 'Audit', href: '/audit', need: 'audit' }],
    },
    {
      id: 'weed', x: 79.6, y: 74.6, label: 'Weed sázení', sub: 'Informace, růst, kalkulačka',
      items: [{ label: 'Weed sázení', href: '/weed-sazeni', need: 'weed-sazeni' }],
    },
    {
      id: 'historie', x: 92.5, y: 70.2, label: 'Historie', sub: 'Záznamy a události',
      items: [{ label: 'Historie', href: '/lore', need: 'lore' }],
    },
  ];

  // Stránky bez explicitní PAGE_ACCESS položky (garaz, profil, galerie, karta, home, kodex, hierarchy, lore, weed-sazeni)
  // jsou v roles.js buď volné (level 3) nebo bez omezení -> canAccess vrátí true.
  const filteredHotspots = hotspots
    .map(h => ({ ...h, items: h.items.filter(it => can(it.need)) }))
    .filter(h => h.items.length);

  const hotspotsJson = JSON.stringify(filteredHotspots);

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ALBION — Kancelář</title>
  <link rel="icon" type="image/png" href="/logo.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{height:100%;overflow:hidden;background:#05070a}
    body{
      font-family:'Space Mono',monospace;color:#EDE6D4;
      position:relative;
    }
    .albion-stage{
      position:fixed;inset:0;
      background:url('/albion-office.jpg') center center / cover no-repeat;
      transition:filter 1.2s ease, transform 8s ease;
    }
    /* ── MOOD OVERLAYS ── */
    .mood-night{filter:brightness(0.92) saturate(1.05)}
    .mood-morning{filter:brightness(1.15) saturate(0.9) hue-rotate(-6deg)}
    .mood-noon{filter:brightness(1.25) saturate(1.1)}
    .mood-evening{filter:brightness(0.85) saturate(1.15) hue-rotate(6deg)}

    .weather-layer{position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity 1s}
    .weather-rain{opacity:1;background:repeating-linear-gradient(100deg,transparent 0,transparent 2px,rgba(200,220,255,0.06) 3px,transparent 5px);background-size:3px 26px;animation:rainFall .28s linear infinite}
    @keyframes rainFall{from{background-position:0 0}to{background-position:-14px 26px}}
    .weather-fog{opacity:1;background:radial-gradient(ellipse 80% 60% at 50% 40%,rgba(200,200,210,0.14),transparent 70%)}
    .weather-snow{opacity:1;background-image:radial-gradient(2px 2px at 20% 20%,rgba(255,255,255,.6) 0,transparent 50%),radial-gradient(1.5px 1.5px at 60% 60%,rgba(255,255,255,.5) 0,transparent 50%),radial-gradient(1.5px 1.5px at 80% 30%,rgba(255,255,255,.4) 0,transparent 50%);background-size:220px 220px;animation:snowFall 9s linear infinite}
    @keyframes snowFall{from{background-position:0 0}to{background-position:0 220px}}
    .weather-storm{opacity:1;background:rgba(120,140,200,0);animation:stormFlash 7s ease-in-out infinite}
    @keyframes stormFlash{0%,94%,100%{background:rgba(150,170,255,0)}95%{background:rgba(150,170,255,0.18)}96%{background:rgba(150,170,255,0)}97%{background:rgba(150,170,255,0.10)}}

    .vignette{position:fixed;inset:0;pointer-events:none;z-index:2;box-shadow:inset 0 0 22vw rgba(0,0,0,0.75)}

    /* ── TOP NAV ── */
    .a-nav{
      position:fixed;top:0;left:0;right:0;z-index:50;
      display:flex;align-items:center;justify-content:space-between;
      padding:0.9rem 2rem;
      background:linear-gradient(180deg,rgba(5,7,10,0.82),rgba(5,7,10,0.35) 80%,transparent);
      backdrop-filter:blur(6px);
    }
    .a-logo{display:flex;align-items:center;gap:0.7rem;font-family:'Cinzel',serif;letter-spacing:0.24em;font-size:1rem;color:#EDE6D4;text-decoration:none;font-weight:600}
    .a-logo img{width:30px;height:30px;filter:drop-shadow(0 0 8px rgba(182,138,78,.5))}
    .a-menu{display:flex;gap:0.3rem;flex-wrap:wrap}
    .a-menu button{
      display:flex;flex-direction:column;align-items:center;gap:0.25rem;
      background:none;border:none;color:#B7AE99;cursor:pointer;
      font-family:'Cinzel',serif;font-size:0.5rem;letter-spacing:0.1em;text-transform:uppercase;
      padding:0.4rem 0.7rem;transition:color .2s;
    }
    .a-menu button svg{width:16px;height:16px;opacity:0.8}
    .a-menu button:hover,.a-menu button.active{color:#E0BD7F}
    .a-user{display:flex;align-items:center;gap:0.6rem;font-family:'Cinzel',serif;font-size:0.62rem;letter-spacing:0.08em}
    .a-user img{width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid #B68A4E}
    .a-user-text{line-height:1.3}
    .a-user-text small{display:block;color:#7E7868;font-size:0.5rem;letter-spacing:0.16em}

    /* ── HOTSPOTS ── */
    .hotspot{position:absolute;z-index:10;transform:translate(-50%,-50%);cursor:pointer}
    .hotspot-dot{
      width:9px;height:9px;border-radius:50%;
      background:#E0BD7F;box-shadow:0 0 10px 2px rgba(224,189,127,0.7);
      animation:dotPulse 2.6s ease-in-out infinite;
      transition:transform .2s;
    }
    @keyframes dotPulse{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}
    .hotspot:hover .hotspot-dot{transform:scale(1.6)}
    .hotspot-card{
      position:absolute;left:50%;bottom:130%;transform:translateX(-50%) translateY(6px);
      min-width:190px;background:rgba(10,12,10,0.92);border:1px solid rgba(182,138,78,0.4);
      padding:0.7rem 0.9rem;opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;
      box-shadow:0 12px 30px rgba(0,0,0,0.6);
    }
    .hotspot:hover .hotspot-card{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:all}
    .hotspot-card .hc-title{font-family:'Cinzel',serif;font-size:0.72rem;letter-spacing:0.08em;color:#E0BD7F;margin-bottom:0.2rem}
    .hotspot-card .hc-sub{font-size:0.62rem;color:#B7AE99;line-height:1.5;margin-bottom:0.4rem}
    .hc-item{
      display:block;font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.06em;
      color:#EDE6D4;text-decoration:none;padding:0.32rem 0.1rem;border-top:1px solid rgba(182,138,78,0.15);
    }
    .hc-item:first-of-type{border-top:none}
    .hc-item:hover{color:#E0BD7F}

    /* ── BOTTOM BAR ── */
    .a-bottom{
      position:fixed;left:0;right:0;bottom:0;z-index:50;
      display:flex;align-items:center;justify-content:space-between;
      padding:0.9rem 2rem;gap:1rem;
      background:linear-gradient(0deg,rgba(5,7,10,0.85),rgba(5,7,10,0.3) 85%,transparent);
      backdrop-filter:blur(6px);
    }
    .a-stat{display:flex;flex-direction:column;gap:0.15rem;font-size:0.62rem;color:#B7AE99}
    .a-stat b{font-family:'Cinzel',serif;font-size:0.7rem;color:#EDE6D4;font-weight:500;letter-spacing:0.02em}
    .a-stat span.lbl{font-size:0.5rem;letter-spacing:0.14em;text-transform:uppercase;color:#7E7868}
    .a-stats-row{display:flex;gap:2.2rem;flex-wrap:wrap}
    .a-btn{
      font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;
      background:transparent;border:1px solid rgba(182,138,78,0.4);color:#EDE6D4;
      padding:0.6rem 1.1rem;cursor:pointer;transition:all .2s;
    }
    .a-btn:hover{border-color:#B68A4E;background:rgba(182,138,78,0.1)}
    .a-leave{border-color:rgba(163,48,73,0.5);color:#E7B7BF}
    .a-leave:hover{background:rgba(163,48,73,0.15);border-color:#A33049}

    /* ── SETTINGS PANEL ── */
    .a-settings{
      position:fixed;bottom:5rem;right:2rem;z-index:60;
      background:rgba(10,12,10,0.95);border:1px solid rgba(182,138,78,0.35);
      padding:1.1rem 1.3rem;min-width:230px;display:none;
      box-shadow:0 20px 50px rgba(0,0,0,0.6);
    }
    .a-settings.open{display:block}
    .a-settings h4{font-family:'Cinzel',serif;font-size:0.62rem;letter-spacing:0.14em;color:#B68A4E;margin-bottom:0.6rem;text-transform:uppercase}
    .a-settings select{
      width:100%;margin-bottom:0.6rem;background:rgba(255,255,255,0.04);border:1px solid rgba(182,138,78,0.3);
      color:#EDE6D4;padding:0.4rem 0.5rem;font-family:'Space Mono',monospace;font-size:0.7rem;
    }

    /* ── FOCUS MODE ── */
    .a-focus-overlay{
      position:fixed;inset:0;z-index:100;background:rgba(3,4,5,0.4);backdrop-filter:blur(3px);
      opacity:0;pointer-events:none;transition:opacity .35s;
    }
    .a-focus-overlay.open{opacity:1;pointer-events:all}
    .a-focus-panel{
      position:fixed;top:2.4vh;left:6vw;right:6vw;bottom:2.4vh;z-index:101;
      background:#0B0F0D;border:1px solid rgba(182,138,78,0.4);
      transform:scale(0.94) translateY(12px);opacity:0;pointer-events:none;
      transition:transform .35s cubic-bezier(.22,1,.36,1),opacity .35s;
      box-shadow:0 40px 100px rgba(0,0,0,0.7);
      overflow:hidden;display:flex;flex-direction:column;
    }
    .a-focus-panel.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all}
    .a-focus-bar{
      display:flex;align-items:center;justify-content:space-between;
      padding:0.6rem 1rem;background:#10150F;border-bottom:1px solid rgba(182,138,78,0.25);flex-shrink:0;
    }
    .a-focus-title{font-family:'Cinzel',serif;font-size:0.68rem;letter-spacing:0.14em;color:#E0BD7F;text-transform:uppercase}
    .a-focus-close{background:none;border:1px solid rgba(182,138,78,0.35);color:#EDE6D4;width:28px;height:28px;cursor:pointer;font-size:0.85rem}
    .a-focus-close:hover{border-color:#A33049;color:#E7B7BF}
    .a-focus-panel iframe{flex:1;border:none;width:100%;background:#0B0F0D}

    @media(max-width:900px){
      .a-menu{display:none}
      .a-stats-row{display:none}
      .a-settings{right:1rem;left:1rem;min-width:0}
      .a-focus-panel{left:2vw;right:2vw;top:1.5vh;bottom:1.5vh}
    }
  </style>
  </head><body>

  <div class="albion-stage mood-night" id="stage"></div>
  <div class="weather-layer" id="weatherLayer"></div>
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
      <select id="weatherSelect" onchange="applyMood()">
        <option value="clear">Jasno</option>
        <option value="rain">Déšť</option>
        <option value="fog">Mlha</option>
        <option value="snow">Sníh</option>
        <option value="storm">Bouřka</option>
      </select>
      <select id="dayTimeSelect" onchange="applyMood()">
        <option value="morning">Ráno</option>
        <option value="noon">Poledne</option>
        <option value="evening">Večer</option>
        <option value="night" selected>Noc</option>
      </select>
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
    const HOTSPOTS = ${hotspotsJson};
    const wrap = document.getElementById('hotspots');
    HOTSPOTS.forEach(h => {
      const el = document.createElement('div');
      el.className = 'hotspot';
      el.style.left = h.x + '%';
      el.style.top = h.y + '%';
      const itemsHtml = h.items.map(it => \`<a class="hc-item" href="javascript:void(0)" onclick="event.stopPropagation();openFocus('\${it.href}','\${it.label.replace(/'/g,"\\\\'")}')">\${it.label}</a>\`).join('');
      el.innerHTML = \`<div class="hotspot-dot"></div><div class="hotspot-card"><div class="hc-title">\${h.label}</div><div class="hc-sub">\${h.sub}</div>\${itemsHtml}</div>\`;
      el.addEventListener('click', () => { if (h.items.length === 1) openFocus(h.items[0].href, h.items[0].label); });
      wrap.appendChild(el);
    });

    // ── FOCUS MODE ──
    function openFocus(href, title) {
      document.getElementById('focusTitle').textContent = title;
      document.getElementById('focusFrame').src = href;
      document.getElementById('focusOverlay').classList.add('open');
      document.getElementById('focusPanel').classList.add('open');
    }
    function closeFocus() {
      document.getElementById('focusOverlay').classList.remove('open');
      document.getElementById('focusPanel').classList.remove('open');
      setTimeout(() => { document.getElementById('focusFrame').src = 'about:blank'; }, 350);
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeFocus(); });

    function leaveAlbion() { window.location.href = '/home'; }

    // ── SETTINGS / MOOD ──
    function toggleSettings() { document.getElementById('settingsPanel').classList.toggle('open'); }
    function onModeChange() {
      const mode = document.getElementById('modeSelect').value;
      document.getElementById('moodControls').style.display = mode === 'mood' ? 'block' : 'none';
      document.getElementById('stat-mood').textContent = mode === 'mood' ? 'Mood' : 'Reality';
      if (mode === 'reality') applyReality();
      else applyMood();
    }
    function setWeatherClass(w) {
      const el = document.getElementById('weatherLayer');
      el.className = 'weather-layer' + (w !== 'clear' ? ' weather-' + w : '');
    }
    function setTimeClass(t) {
      document.getElementById('stage').className = 'albion-stage mood-' + t;
    }
    function applyMood() {
      const w = document.getElementById('weatherSelect').value;
      const t = document.getElementById('dayTimeSelect').value;
      setWeatherClass(w); setTimeClass(t);
      document.getElementById('stat-weather').textContent = ({clear:'Jasno',rain:'Déšť',fog:'Mlha',snow:'Sníh',storm:'Bouřka'})[w];
    }
    function timeOfDayFromHour(h) {
      if (h >= 5 && h < 11) return 'morning';
      if (h >= 11 && h < 17) return 'noon';
      if (h >= 17 && h < 21) return 'evening';
      return 'night';
    }
    function applyReality() {
      const now = new Date();
      setTimeClass(timeOfDayFromHour(now.getHours()));
      setWeatherClass('clear');
      document.getElementById('stat-weather').textContent = 'Jasno';
    }
    function tickClock() {
      const now = new Date();
      document.getElementById('stat-time').textContent = now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
      if (document.getElementById('modeSelect').value === 'reality') setTimeClass(timeOfDayFromHour(now.getHours()));
    }
    tickClock(); setInterval(tickClock, 30000);
    applyReality();
  </script>
  </body></html>`;
}

module.exports = { renderAlbion };
