// nav.js — Albion v3 · Heraldická navigace

const { canAccess } = require('./roles');
const { escapeHtml } = require('./utils');

function renderNav(req, active) {
  const ic = req.session.icName;
  const accessLevel = req.session.accessLevel || 3;
  const can = (pageId) => canAccess(accessLevel, pageId);
  const skladPages = ['sklad','weed-sazeni'];
  const blackbookPages = ['blackbook','profit-centrum'];
  const infoPages  = ['nastenska','kodex','lore','hierarchy','leaderboard','galerie','spis'];
  const dataPages  = ['audit','statistiky'];

  return `
    <nav>
      <a href="/home" class="nav-logo">
        <img src="/logo.png" class="nav-logo-img" alt="Caledonia">
        <span class="nav-logo-text">AL<span class="b-red">B</span>ION</span>
      </a>
      <a href="/albion" title="Vstoupit do CALEDONIA" style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border:1px solid var(--border-brass);color:var(--brass);flex-shrink:0;margin-left:0.6rem;text-decoration:none;transition:border-color .2s,color .2s" onmouseover="this.style.borderColor='var(--brass-bright)';this.style.color='var(--brass-bright)'" onmouseout="this.style.borderColor='var(--border-brass)';this.style.color='var(--brass)'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:13px;height:13px"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>
      </a>
      <button class="nav-burger" id="navBurger" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-menu" id="navMenu">
        <li><a href="/home" class="${active==='home'?'active':''}">Přehled<span class="nav-desc">Rejstřík</span></a></li>
        <li><a href="/garaz" class="${active==='garaz'?'active':''}">Garáž<span class="nav-desc">Vozový park</span></a></li>

        ${can('sklad') ? `
        <li class="nav-dropdown ${skladPages.includes(active)?'open':''}">
          <a href="/sklad" class="nav-drop-trigger ${skladPages.includes(active)?'active':''}">
            Sklad
            <span class="nav-desc">Zbraně · Weed · Drogy</span>
            <svg class="nav-drop-arrow" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="1 1 5 5 9 1"/></svg>
          </a>
          <div class="nav-dropdown-menu">
            <a href="/sklad" class="${active==='sklad'?'active':''}">Správa skladu</a>
            <a href="/weed-sazeni" class="${active==='weed-sazeni'?'active':''}">Weed sázení</a>
          </div>
        </li>` : `
        <li><a href="/weed-sazeni" class="${active==='weed-sazeni'?'active':''}">Weed sázení<span class="nav-desc">Odpočty růstu</span></a></li>`}

        ${blackbookPages.some(can) ? `
        <li class="nav-dropdown ${blackbookPages.includes(active)?'open':''}">
          <a href="/blackbook" class="nav-drop-trigger ${blackbookPages.includes(active)?'active':''}">
            Blackbook
            <span class="nav-desc">Reporty &amp; analýzy</span>
            <svg class="nav-drop-arrow" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="1 1 5 5 9 1"/></svg>
          </a>
          <div class="nav-dropdown-menu">
            ${can('blackbook') ? `<a href="/blackbook" class="${active==='blackbook'?'active':''}">Blackbook</a>` : ''}
            ${can('profit-centrum') ? `<a href="/profit-centrum" class="${active==='profit-centrum'?'active':''}">Profit centrum</a>` : ''}
          </div>
        </li>` : ''}

        ${dataPages.some(can) ? `
        <li class="nav-dropdown ${dataPages.includes(active)?'open':''}">
          <a href="/audit" class="nav-drop-trigger ${dataPages.includes(active)?'active':''}">
            Záznamy
            <span class="nav-desc">Audit · Statistiky</span>
            <svg class="nav-drop-arrow" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="1 1 5 5 9 1"/></svg>
          </a>
          <div class="nav-dropdown-menu">
            ${can('audit') ? `<a href="/audit" class="${active==='audit'?'active':''}">Audit</a>` : ''}
            ${can('statistiky') ? `<a href="/statistiky" class="${active==='statistiky'?'active':''}">Statistiky</a>` : ''}
          </div>
        </li>` : ''}

        <li class="nav-dropdown ${infoPages.includes(active)?'open':''}">
          <button type="button" class="nav-drop-trigger ${infoPages.includes(active)?'active':''}" aria-haspopup="true" aria-expanded="${infoPages.includes(active)?'true':'false'}">
            Organizace
            <span class="nav-desc">Nástěnka · Kodex · Lore</span>
            <svg class="nav-drop-arrow" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="1 1 5 5 9 1"/></svg>
          </button>
          <div class="nav-dropdown-menu">
            ${can('nastenska') ? `<a href="/nastenska" class="${active==='nastenska'?'active':''}">Nástěnka</a>` : ''}
            ${can('spis') ? `<a href="/spis" class="${active==='spis'?'active':''}">Osobní spisy</a>` : ''}
            <a href="/kodex" class="${active==='kodex'?'active':''}">Kodex</a>
            <a href="/lore" class="${active==='lore'?'active':''}">Historie</a>
            <a href="/hierarchy" class="${active==='hierarchy'?'active':''}">Hierarchie</a>
            <a href="/leaderboard" class="${active==='leaderboard'?'active':''}">Aktivita</a>
            ${!req.session.isAssociate ? `<a href="/galerie" class="${active==='galerie'?'active':''}">Galerie</a>` : ''}
          </div>
        </li>
      </ul>

      <div class="nav-right" id="navRight">
        <div class="evelyn-widget" id="evelynWidget" title="Evelyn Ashcroft — Sekretariát Caledonie">
          <img src="/evelyn.png" class="evelyn-portrait" alt="Evelyn Ashcroft" id="evelynImg" onerror="this.style.display='none';document.getElementById('evelynFallback').style.display='flex';">
          <div class="evelyn-portrait evelyn-portrait-placeholder" id="evelynFallback" style="display:none">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4">
              <circle cx="12" cy="8.5" r="3.4"/>
              <path d="M5 20c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5"/>
            </svg>
          </div>
          <span class="evelyn-ping" id="evelynPing"></span>
        </div>
        <div class="evelyn-letter" id="evelynLetter">
          <div class="evelyn-letter-head">
            <div class="evelyn-letter-from">
              <span class="evelyn-letter-avatar">
                <img src="/evelyn.png" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                <span class="evelyn-letter-avatar-fallback" style="display:none">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8.5" r="3.4"/><path d="M5 20c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5"/></svg>
                </span>
              </span>
              <span>Evelyn Ashcroft · Sekretariát</span>
            </div>
            <button class="evelyn-letter-close" id="evelynCloseBtn" title="Zavřít">✕</button>
          </div>
          <div class="evelyn-letter-body" id="evelynLetterBody">
            <div class="ledger-loading">Evelyn píše zprávu…</div>
          </div>
        </div>
        <button class="ambient-btn" id="ambientBtn" title="Ambientní zvuk kanceláře">♫</button>
        ${can('nastenska') ? `
        <button class="notif-bell" id="notifBell" title="Oznámení" onclick="window.location='/nastenska'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span class="notif-badge" id="notifBadge">0</span>
        </button>` : ''}
        ${req.session.realAccessLevel === 1 ? `
        <div class="view-as-switcher" style="position:relative">
          <button class="nav-shortcut-hint" id="viewAsBtn" style="cursor:pointer;${req.session.viewAsLevel?'border-color:var(--oxblood-bright);color:var(--oxblood-bright)':''}" title="View As — simulace role">
            ${req.session.viewAsLevel ? 'Náhled: '+({1:'Founder/Council',2:'Senior Member',3:'Member'}[req.session.viewAsLevel]) : 'View As'}
          </button>
          <div id="viewAsMenu" class="nav-dropdown-menu" style="position:absolute;top:120%;right:0;left:auto;transform:none;opacity:0;pointer-events:none">
            <a href="#" onclick="setViewAs(null);return false">Vlastní role (Founder/Council)</a>
            <a href="#" onclick="setViewAs(2);return false">Náhled: Senior Member</a>
            <a href="#" onclick="setViewAs(3);return false">Náhled: Member / Associate</a>
          </div>
        </div>` : ''}
        <div class="sound-switcher" style="position:relative;margin-left:0.4rem">
          <button class="theme-dot-btn" id="soundToggle" style="border-radius:0;width:18px;height:18px;background:none;border:1px solid var(--border-brass);color:var(--brass);font-size:0.65rem;display:flex;align-items:center;justify-content:center" title="Zvuky">♪</button>
        </div>
        <div class="theme-switcher" title="Přepnout téma">
          <span class="theme-switcher-label">Téma</span>
          <button class="theme-dot-btn" id="td-dark"  aria-label="Tmavý noir" style="background:#0B0F0D;border:1.5px solid #B68A4E" onclick="setTheme('dark')"  title="Heraldický noir"></button>
          <button class="theme-dot-btn" id="td-light" aria-label="Světlý pergamen" style="background:#F3EEE3;border:1.5px solid #6E1423" onclick="setTheme('light')" title="Pergamen"></button>
          <button class="theme-dot-btn" id="td-auto" aria-label="Automaticky dle denní doby" style="background:conic-gradient(from 180deg,#F3EEE3,#0B0F0D,#F3EEE3);border:1.5px solid #B68A4E" onclick="setTheme('auto')" title="Auto — dle reálné denní doby"></button>
        </div>
        <span class="nav-shortcut-hint" title="g+h Přehled${can('sklad')?' · g+s Sklad':''}${can('blackbook')?' · g+b Blackbook':''}${can('audit')?' · g+a Audit':''}${can('nastenska')?' · g+n Nástěnka':''} · / Hledat">g·_</span>
        <span class="nav-user" style="border-left:2px solid ${({1:'var(--oxblood-bright)',2:'var(--brass-bright)',3:'var(--ivory-faint)'})[accessLevel]||'var(--ivory-faint)'};padding-left:0.6rem">člen &nbsp;<strong>${escapeHtml(ic)}</strong></span>
        <a href="/profil" class="nav-logout" style="border-color:var(--border-brass);color:var(--ivory-faint)" title="Profil & aliasy">Profil</a>
        <a href="/logout" class="nav-logout">Odejít</a>
      </div>
    </nav>
    <div class="nav-overlay" id="navOverlay"></div>
    ${req.session.viewAsLevel ? `<div style="background:var(--oxblood-faint);border-bottom:1px solid var(--border-oxblood);padding:0.5rem 2rem;text-align:center;font-family:var(--font-mono);font-size:0.72rem;color:var(--oxblood-bright)">
      Náhled jako role: ${({1:'Founder/Council',2:'Senior Member',3:'Member/Associate'})[req.session.viewAsLevel]} — <a href="#" onclick="setViewAs(null);return false" style="color:var(--oxblood-bright);text-decoration:underline">ukončit náhled</a>
    </div>` : ''}

    <script>
      // ── MOBILE NAV ──
      const navBurger = document.getElementById('navBurger');
      const navMenu   = document.getElementById('navMenu');
      const navOverlay= document.getElementById('navOverlay');
      const navRight  = document.getElementById('navRight');
      const navEl     = document.querySelector('nav');
      let navRightInMenu = false;

      function placeNavRight() {
        const mobile = window.innerWidth <= 880;
        if (mobile && !navRightInMenu) { navMenu.appendChild(navRight); navRightInMenu = true; }
        else if (!mobile && navRightInMenu) { navEl.appendChild(navRight); navRightInMenu = false; }
      }
      placeNavRight();

      function closeMobileNav() {
        navBurger.classList.remove('open');
        navMenu.classList.remove('mobile-open');
        document.body.classList.remove('nav-locked');
      }
      navBurger.addEventListener('click', () => {
        const willOpen = !navMenu.classList.contains('mobile-open');
        navBurger.classList.toggle('open', willOpen);
        navMenu.classList.toggle('mobile-open', willOpen);
        document.body.classList.toggle('nav-locked', willOpen);
        if (!willOpen) document.querySelectorAll('.nav-dropdown').forEach(dd => dd.classList.remove('open'));
      });
      navOverlay.addEventListener('click', closeMobileNav);
      window.addEventListener('resize', () => { placeNavRight(); if (window.innerWidth > 880) closeMobileNav(); });

      document.querySelectorAll('.nav-dropdown').forEach(dd => {
        const trigger = dd.querySelector('.nav-drop-trigger');
        let closeTimer = null;
        function syncExpanded(){ if (trigger.hasAttribute('aria-haspopup')) trigger.setAttribute('aria-expanded', dd.classList.contains('open') ? 'true' : 'false'); }
        trigger.addEventListener('click', (e) => {
          const href = trigger.getAttribute('href');
          if (href && href !== '#') {
            if (window.innerWidth <= 880) { e.preventDefault(); dd.classList.toggle('open'); syncExpanded(); return; }
            return;
          }
          e.preventDefault(); dd.classList.toggle('open'); syncExpanded();
        });
        dd.addEventListener('mouseenter', () => { if (window.innerWidth <= 880) return; clearTimeout(closeTimer); dd.classList.add('open'); syncExpanded(); });
        dd.addEventListener('mouseleave', () => { if (window.innerWidth <= 880) return; clearTimeout(closeTimer); closeTimer = setTimeout(() => { dd.classList.remove('open'); syncExpanded(); }, 300); });
      });
      document.addEventListener('click', (e) => { if (!e.target.closest('.nav-dropdown')) document.querySelectorAll('.nav-dropdown').forEach(dd => { dd.classList.remove('open'); const t=dd.querySelector('.nav-drop-trigger'); if(t&&t.hasAttribute('aria-haspopup'))t.setAttribute('aria-expanded','false'); }); });
      navMenu.querySelectorAll('a[href]:not([href="#"])').forEach(a => a.addEventListener('click', closeMobileNav));

      // ── NÁLADA — reálná denní doba, nezávislá na zvoleném tématu ──
      // Auto téma reaguje na VŠECHNY čtyři fáze dne — svítání a soumrak dostávají
      // tmavý noir s teplým podbarvením (mood-sunrise/mood-sunset), pergamen
      // (light) patří jen skutečnému dni. Díky tomu je při přepnutí na "Auto"
      // vždy vidět, že se něco změnilo, i mimo úzké polední okno.
      const MOODS = ['mood-sunrise','mood-day','mood-sunset','mood-night'];
      const MOOD_LABEL = { 'mood-sunrise':'svítání', 'mood-day':'den', 'mood-sunset':'soumrak', 'mood-night':'noc' };
      function moodFromHour(h){ if(h>=5&&h<7)return'mood-sunrise'; if(h>=7&&h<17)return'mood-day'; if(h>=17&&h<21)return'mood-sunset'; return'mood-night'; }
      function applyMoodTick(){
        const m = moodFromHour(new Date().getHours());
        MOODS.forEach(c=>document.body.classList.remove(c));
        document.body.classList.add(m);
        if (currentTheme === 'auto') {
          // Jen "den" je pergamen — svítání, soumrak i noc zůstávají v noiru
          // (ale s vlastním teplým/chladným podbarvením dle mood- třídy výše)
          document.body.classList.toggle('light', m === 'mood-day');
        }
      }

      // ── TÉMATA ── ('dark' | 'light' | 'auto' = dle reálné denní doby)
      const THEMES = ['dark','light'];
      let currentTheme = localStorage.getItem('albion_theme') || 'dark';
      function applyTheme(t) {
        currentTheme = t;
        localStorage.setItem('albion_theme', t);
        THEMES.forEach(c => document.body.classList.remove(c));
        if (t === 'light') document.body.classList.add('light');
        ['dark','light','auto'].forEach(th => {
          const btn = document.getElementById('td-' + th);
          if (btn) btn.classList.toggle('active', th === t);
        });
        applyMoodTick(); // pro 'auto' tady doreší light/dark dle aktuální fáze dne
        if (t === 'auto' && window.showToast) {
          const m = moodFromHour(new Date().getHours());
          showToast('Auto režim aktivní — právě je ' + MOOD_LABEL[m]);
        }
      }
      applyTheme(currentTheme);
      setInterval(applyMoodTick, 60000);
      function setTheme(t) { applyTheme(t); }

      // ── SSE NOTIFIKACE ──
      let newCount = 0;
      const evtSource = new EventSource('/api/events');
      window.evtSource = evtSource;
      evtSource.addEventListener('nastenska', (e) => {
        const d = JSON.parse(e.data);
        newCount++;
        const badge = document.getElementById('notifBadge');
        badge.textContent = newCount;
        badge.classList.add('visible');
        showToast('Oznámení: ' + d.title + ' — ' + d.uzivatel);
        if (window.bumpUnread) window.bumpUnread();
      });
      evtSource.addEventListener('skladUpdate', (e) => {
        const d = JSON.parse(e.data);
        const label = d.sekce === 'zbrane' ? 'Zbraně' : d.sekce === 'weed' ? 'Weed' : d.sekce === 'chemky' ? 'Chemky' : 'Drogy';
        showToast(label + ' · ' + (d.polozka || d.odruda || d.droga || d.chemikalie) + ' — ' + d.uzivatel);
      });
      evtSource.addEventListener('ucetUpdate', (e) => {
        const d = JSON.parse(e.data);
        showToast('Finance · ' + d.typ + ' — ' + (d.valuta === 'USD' ? 'SAD ' : '₱') + d.castka);
      });
      evtSource.addEventListener('weedTimer', (e) => {
        const d = JSON.parse(e.data);
        if (d.action === 'add' && d.timer) showToast('Weed sázení · ' + d.timer.icName + ' (' + d.timer.postal + ')');
      });

      let _toastQueue = [];
      let _toastActive = false;
      function showToast(msg, isError) {
        _toastQueue.push({ msg, isError });
        _processToastQueue();
      }
      function _processToastQueue() {
        if (_toastActive || !_toastQueue.length) return;
        _toastActive = true;
        const { msg, isError } = _toastQueue.shift();
        let t = document.getElementById('toast');
        if (!t) { t = document.createElement('div'); t.id='toast'; document.body.appendChild(t); }
        t.className = 'toast' + (isError ? ' error' : '');
        t.innerHTML =
          '<div class="toast-icon">' + (isError ? '✕' : '✓') + '</div>' +
          '<div class="toast-body">' +
            '<div class="toast-title">' + (isError ? 'Chyba' : 'Zaznamenáno') + '</div>' +
            '<div class="toast-msg"></div>' +
          '</div>';
        t.querySelector('.toast-msg').textContent = msg; // textContent kvůli bezpečnosti (žádné HTML injection)
        // Vynutit reflow, ať se transformace znovu přehraje i při rychlém opakovaném volání
        void t.offsetWidth;
        t.classList.add('show');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => {
          t.classList.remove('show');
          // Počkat na doběhnutí fade-out (0.3s v CSS), pak pustit další zprávu z fronty
          setTimeout(() => { _toastActive = false; _processToastQueue(); }, 320);
        }, 3500);
      }
      window.showToast = showToast;

      window.ledgerEmptyHTML = function(text, compact, variant) {
        const ICONS = {
          default: '<rect x="3" y="2" width="58" height="44" rx="1" stroke="var(--border-brass)" stroke-width="1"/>' +
            '<line x1="12" y1="14" x2="44" y2="14" stroke="var(--border)" stroke-width="1"/>' +
            '<line x1="12" y1="22" x2="52" y2="22" stroke="var(--border)" stroke-width="1"/>' +
            '<line x1="12" y1="30" x2="38" y2="30" stroke="var(--border)" stroke-width="1"/>' +
            '<line x1="12" y1="38" x2="48" y2="38" stroke="var(--border)" stroke-width="1"/>',
          photo: '<rect x="3" y="2" width="58" height="44" rx="1" stroke="var(--border-brass)" stroke-width="1"/>' +
            '<circle cx="18" cy="16" r="5" stroke="var(--border)" stroke-width="1"/>' +
            '<path d="M6 38 L22 24 L34 34 L44 22 L58 36" stroke="var(--border)" stroke-width="1" fill="none"/>',
          people: '<circle cx="24" cy="16" r="7" stroke="var(--border-brass)" stroke-width="1"/>' +
            '<path d="M10 40c0-8 6-13 14-13s14 5 14 13" stroke="var(--border)" stroke-width="1" fill="none"/>' +
            '<circle cx="46" cy="18" r="5" stroke="var(--border)" stroke-width="1"/>' +
            '<path d="M38 40c0-6 4-10 10-10" stroke="var(--border)" stroke-width="1" fill="none"/>',
          stock: '<rect x="4" y="18" width="14" height="24" stroke="var(--border-brass)" stroke-width="1"/>' +
            '<rect x="21" y="10" width="14" height="32" stroke="var(--border)" stroke-width="1"/>' +
            '<rect x="38" y="24" width="14" height="18" stroke="var(--border)" stroke-width="1"/>',
        };
        return '<div class="ledger-empty' + (compact ? ' compact' : '') + '">' +
          '<svg viewBox="0 0 64 48" fill="none">' + (ICONS[variant] || ICONS.default) + '</svg>' +
          '<div class="ledger-empty-text">' + text + '</div></div>';
      };

      window.skeletonRows = function(n, cols) {
        cols = cols || [1];
        let html = '';
        for (let i=0;i<n;i++){
          html += '<div class="skeleton-row">' + cols.map(w=>'<div class="skeleton skeleton-line" style="flex:'+w+'"></div>').join('') + '</div>';
        }
        return html;
      };

      // ── CHYTRÝ FAVICON ──
      (function favicon(){
        let unread = 0;
        function renderFavicon() {
          const size = 64;
          const canvas = document.createElement('canvas');
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext('2d');
          const img = new Image();
          img.src = '/logo.png';
          img.onload = () => {
            ctx.drawImage(img, 0, 0, size, size);
            if (unread > 0) {
              ctx.beginPath();
              ctx.fillStyle = '#A33049';
              ctx.arc(size-14, 14, 14, 0, 2*Math.PI);
              ctx.fill();
              ctx.fillStyle = '#fff';
              ctx.font = 'bold 18px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(unread > 9 ? '9+' : String(unread), size-14, 15);
            }
            let link = document.querySelector("link[rel='icon']");
            if (!link) { link = document.createElement('link'); link.rel='icon'; document.head.appendChild(link); }
            link.href = canvas.toDataURL('image/png');
            document.title = (unread>0?'('+unread+') ':'') + document.title.replace(/^\(\d+\)\s*/,'');
          };
        }
        window.bumpUnread = function(){ unread++; renderFavicon(); };
        window.clearUnread = function(){ unread=0; renderFavicon(); };
        renderFavicon();
      })();

      // ── ZVUKY ──
      (function sounds(){
        const ENABLED_KEY='albion_sound_enabled';
        let enabled = localStorage.getItem(ENABLED_KEY) !== 'false';

        function playTone(freq, dur, vol) {
          if (!enabled) return;
          try {
            const ctx = window._albionAudioCtx || (window._albionAudioCtx = new (window.AudioContext||window.webkitAudioContext)());
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
            const gain = ctx.createGain(); gain.gain.setValueAtTime(0.0001, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(vol||0.15, ctx.currentTime+0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+dur);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime+dur);
          } catch(e){}
        }
        window.albionSound = {
          login: () => playTone(440, 0.4, 0.12),
          success: () => playTone(660, 0.25, 0.1),
          notification: () => playTone(520, 0.18, 0.08),
          timerDone: () => { playTone(523,0.3,0.12); setTimeout(()=>playTone(659,0.3,0.12),150); },
        };

        // Pečeťovací "thud" — sdíleno napříč Sklad/Garáž/Galerie/Nástěnka/Karta/Spisy,
        // aby každé potvrzení důležité akce znělo stejně heraldicky.
        window.albionSealThud = function(){
          if(!enabled)return;
          try{
            const ctx=window._albionAudioCtx||(window._albionAudioCtx=new (window.AudioContext||window.webkitAudioContext)());
            if(ctx.state==='suspended')ctx.resume();
            const now=ctx.currentTime;
            const osc=ctx.createOscillator();osc.type='sine';osc.frequency.setValueAtTime(180,now);osc.frequency.exponentialRampToValueAtTime(48,now+0.16);
            const gain=ctx.createGain();gain.gain.setValueAtTime(0.0001,now);gain.gain.exponentialRampToValueAtTime(0.5,now+0.012);gain.gain.exponentialRampToValueAtTime(0.0001,now+0.32);
            osc.connect(gain);const master=ctx.createGain();master.gain.value=0.9;gain.connect(master);master.connect(ctx.destination);osc.start(now);osc.stop(now+0.34);
          }catch(e){}
        };

        // Jemný "papírový" mikro-zvuk pro otevírání modalů/karet MIMO Albion
        // World — dřív tam bylo úplné ticho. Generovaný filtrovaným šumem,
        // takže nepotřebuje žádný audio soubor.
        window.albionPaper = function(){
          if(!enabled)return;
          try{
            const ctx=window._albionAudioCtx||(window._albionAudioCtx=new (window.AudioContext||window.webkitAudioContext)());
            if(ctx.state==='suspended')ctx.resume();
            const now=ctx.currentTime;
            const bufferSize=Math.floor(ctx.sampleRate*0.12);
            const buffer=ctx.createBuffer(1,bufferSize,ctx.sampleRate);
            const data=buffer.getChannelData(0);
            for(let i=0;i<bufferSize;i++){ data[i]=(Math.random()*2-1)*Math.pow(1-i/bufferSize,2); }
            const noise=ctx.createBufferSource();noise.buffer=buffer;
            const filter=ctx.createBiquadFilter();filter.type='highpass';filter.frequency.value=1200;
            const gain=ctx.createGain();gain.gain.setValueAtTime(0.16,now);gain.gain.exponentialRampToValueAtTime(0.0001,now+0.12);
            noise.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
            noise.start(now);noise.stop(now+0.13);
          }catch(e){}
        };

        const btn = document.getElementById('soundToggle');
        if (btn) {
          function renderBtn(){ btn.style.opacity = enabled ? '1' : '0.35'; }
          renderBtn();
          btn.addEventListener('click', () => {
            enabled = !enabled;
            localStorage.setItem(ENABLED_KEY, enabled);
            renderBtn();
          });
        }
      })();

      // Sdílená informace o aktuální stránce — používá ambientní zvuk (jiná
      // ambience pro Kodex/Historii) i Evelyn (kontextový brífink níže).
      const CURRENT_PAGE = '${active}' || 'home';

      // ── AMBIENTNÍ ZVUK KANCELÁŘE — napříč celým webem (ne jen /albion) ──
      // Tlačítko ♫ v navu dřív nebylo na nic napojené. Sdílí localStorage klíč
      // s /albion, takže stav (zapnuto/vypnuto) je konzistentní na celém webu,
      // i když se přehrávání při přechodu na jinou stránku vždy znovu nastartuje
      // (klasický multi-page web, ne SPA). Na Kodexu/Historii hraje místo
      // kancelářské ambience tišší "kronikářská" stopa, ať sedí k tónu textu.
      (function globalAmbient(){
        const KEY = 'albion_ambient_on';
        const btn = document.getElementById('ambientBtn');
        if (!btn) return;
        const AUDIO_BY_ENV = {
          day: '/albion/audio/den.mp3', fog: '/albion/audio/mlha.mp3',
          sunrise: '/albion/audio/vychod-slunce.mp3', sunset: '/albion/audio/zapad-slunce.mp3',
          winter: '/albion/audio/snih.mp3', night: '/albion/audio/noc.mp3',
        };
        const KRONIKA_PAGES = ['kodex', 'lore'];
        function envFromHour(h){ if(h>=5&&h<7)return'sunrise'; if(h>=7&&h<17)return'day'; if(h>=17&&h<21)return'sunset'; return'night'; }
        function currentAudioSrc(){
          if (KRONIKA_PAGES.includes(CURRENT_PAGE)) return '/albion/audio/kronika.mp3';
          return AUDIO_BY_ENV[envFromHour(new Date().getHours())];
        }
        let on = localStorage.getItem(KEY) === '1';
        function render(){ btn.classList.toggle('active', on); btn.textContent = on ? '♪' : '♫'; }
        render();
        let audioEl = null;
        function ensureAudio(){
          if (audioEl) return audioEl;
          audioEl = new Audio();
          audioEl.loop = true;
          audioEl.volume = 0.22;
          audioEl.src = currentAudioSrc();
          return audioEl;
        }
        if (on) { const a = ensureAudio(); a.play().catch(() => { /* autoplay blokován do prvního kliku */ }); }
        btn.addEventListener('click', () => {
          on = !on;
          localStorage.setItem(KEY, on ? '1' : '0');
          render();
          const a = ensureAudio();
          if (on) a.play().catch(() => {});
          else a.pause();
        });
        // Pokud autoplay selhal, spustí se při prvním kliknutí kamkoliv na stránku
        document.addEventListener('click', function once(){
          if (on && audioEl && audioEl.paused) audioEl.play().catch(() => {});
        }, { once: true });
      })();

      // ── VIEW AS ──
      (function viewAsInit(){
        const viewAsBtn=document.getElementById('viewAsBtn');
        if(viewAsBtn){
          const menu=document.getElementById('viewAsMenu');
          viewAsBtn.addEventListener('click',()=>{
            const open=menu.style.opacity==='1';
            menu.style.opacity=open?'0':'1';
            menu.style.pointerEvents=open?'none':'all';
          });
        }
        window.setViewAs=async function(level){
          const res=await fetch('/api/view-as',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({level})});
          const d=await res.json();
          if(d.ok)location.reload();
          else if(window.showToast)showToast(d.error,true);
        };
      })();

      // ── SEZÓNNÍ VZHLED ── (+ malý odznak vedle loga, ať se sezónnost propíše i do brandingu)
      function applySeasonalBadge(season){
        const logoText=document.querySelector('.nav-logo-text');
        if(!logoText)return;
        let badge=document.getElementById('seasonBadge');
        if(!badge){ badge=document.createElement('span'); badge.id='seasonBadge'; badge.style.marginLeft='0.4rem'; badge.style.fontSize='0.85em'; logoText.appendChild(badge); }
        const GLYPH={ vanoce:'❄', halloween:'🎃', 'novy-rok':'✦' };
        badge.textContent = GLYPH[season] || '';
      }
      fetch('/api/season').then(r=>r.json()).then(d=>{
        if(d.season && d.season!=='none') document.body.classList.add('season-'+d.season);
        applySeasonalBadge(d.season);
      }).catch(()=>{});
      window.evtSource && window.evtSource.addEventListener('seasonChange', (e)=>{
        const d=JSON.parse(e.data);
        ['vanoce','halloween','novy-rok'].forEach(s=>document.body.classList.remove('season-'+s));
        if(d.season!=='none') document.body.classList.add('season-'+d.season);
        applySeasonalBadge(d.season);
      });

      // ── EVELYN ASHCROFT — sekretářka Albionu: kontextová "e-mailová" zpráva ──
      // Místo jedné náhodné hlášky teď Evelyn posílá skutečný krátký brífink
      // podle toho, na jaké stránce jste (nízké zásoby na Skladu, dorostlé
      // odpočty na Weed sázení, stav pokladny na Blackbooku…) — data táhne
      // z /api/evelyn/brief. Panel se navíc sám automaticky vysune po chvíli
      // na každé stránce, je větší a vydrží otevřený déle.
      (function evelyn(){
        const letter=document.getElementById('evelynLetter');
        const widget=document.getElementById('evelynWidget');
        const body=document.getElementById('evelynLetterBody');
        const closeBtn=document.getElementById('evelynCloseBtn');
        const ping=document.getElementById('evelynPing');
        if(!letter||!widget||!body)return;

        const PAGE_ID = CURRENT_PAGE;
        let shown=false, autoCloseTimer=null, briefCache=null;

        function esc(s){return (s==null?'':String(s)).replace(/</g,'&lt;');}

        function renderBrief(d){
          const stamp=new Date().toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'});
          let html='<div class="evelyn-letter-stamp">Doručeno '+stamp+'</div>';
          html+='<div class="evelyn-letter-subject">'+esc(d.subject)+'</div>';
          (d.lines||[]).forEach(l=>{ html+='<div class="evelyn-letter-line">'+esc(l)+'</div>'; });
          if(d.tips&&d.tips.length){
            html+='<div class="evelyn-letter-tips">'+d.tips.map(t=>'<div class="evelyn-letter-tip">'+esc(t)+'</div>').join('')+'</div>';
          }
          if(d.actions&&d.actions.length){
            html+='<div class="evelyn-letter-actions">'+d.actions.map(a=>'<a href="'+a.href+'">'+esc(a.label)+'</a>').join('')+'</div>';
          }
          html+='<div class="evelyn-letter-sig">— E. Ashcroft</div>';
          body.innerHTML=html;
        }

        function fetchBrief(){
          return fetch('/api/evelyn/brief?page='+encodeURIComponent(PAGE_ID))
            .then(r=>r.json())
            .then(d=>{
              if(!d.ok) throw new Error('no data');
              briefCache=d;
              renderBrief(d);
              if(d.tips&&d.tips.length) ping.classList.add('show');
              return d;
            })
            .catch(()=>{
              body.innerHTML='<div class="evelyn-letter-line">Omlouvám se, momentálně nemám zprávu připravenou.</div>';
            });
        }

        function openLetter(autoHideMs){
          letter.classList.add('show');
          shown=true;
          ping.classList.remove('show');
          clearTimeout(autoCloseTimer);
          if(autoHideMs) autoCloseTimer=setTimeout(closeLetter,autoHideMs);
        }
        function closeLetter(){
          letter.classList.remove('show');
          shown=false;
          clearTimeout(autoCloseTimer);
        }
        function toggleLetter(){
          if(shown){closeLetter();return;}
          openLetter(0);
          if(!briefCache) fetchBrief();
        }

        widget.addEventListener('click',toggleLetter);
        closeBtn.addEventListener('click',(e)=>{e.stopPropagation();closeLetter();});
        document.addEventListener('click',(e)=>{
          if(shown&&!e.target.closest('.evelyn-widget')&&!e.target.closest('.evelyn-letter'))closeLetter();
        });

        // Automatické vysunutí — na každé stránce, o něco větší panel a delší výdrž
        setTimeout(()=>{ fetchBrief().then(()=>{ openLetter(11000); }); },1000);
      })();

      // ── AMBIENTNÍ SOUNDTRACK KANCELÁŘE — opt-in, hraje napříč celým webem ──
      (function ambient(){
        const KEY='albion_ambient_on';
        const btn=document.getElementById('ambientBtn');
        if(!btn)return;
        const AUDIO_BY_ENV={day:'/albion/audio/den.mp3',fog:'/albion/audio/mlha.mp3',sunrise:'/albion/audio/vychod-slunce.mp3',sunset:'/albion/audio/zapad-slunce.mp3',winter:'/albion/audio/snih.mp3',night:'/albion/audio/noc.mp3'};
        function envFromHour(h){if(h>=5&&h<7)return'sunrise';if(h>=7&&h<17)return'day';if(h>=17&&h<21)return'sunset';return'night';}
        let on=localStorage.getItem(KEY)==='1';
        function render(){btn.classList.toggle('active',on);btn.textContent=on?'♪':'♫';}
        render();
        let audioEl=null;
        function ensureAudio(){
          if(audioEl)return audioEl;
          audioEl=new Audio();audioEl.loop=true;audioEl.volume=0.22;
          audioEl.src=AUDIO_BY_ENV[envFromHour(new Date().getHours())];
          return audioEl;
        }
        if(on){ const a=ensureAudio(); a.play().catch(()=>{ /* autoplay může být blokováno do prvního kliku */ }); }
        btn.addEventListener('click',()=>{
          on=!on;localStorage.setItem(KEY,on?'1':'0');render();
          const a=ensureAudio();
          if(on)a.play().catch(()=>{});else a.pause();
        });
        // Pokud autoplay selhal, spustí se při prvním kliknutí kamkoliv na stránku
        document.addEventListener('click',function once(){ if(on&&audioEl&&audioEl.paused)audioEl.play().catch(()=>{}); },{once:true});
      })();

      // ── PAGE TRANSITION — jemný fade při odchodu na jinou stránku webu ──
      (function pageTransition(){
        document.addEventListener('click',(e)=>{
          const a=e.target.closest('a[href]');
          if(!a)return;
          const href=a.getAttribute('href');
          if(!href||href.startsWith('#')||href.startsWith('javascript:')||a.target==='_blank'||e.metaKey||e.ctrlKey||e.shiftKey)return;
          if(a.hasAttribute('download'))return;
          let url; try{url=new URL(href,location.href);}catch(err){return;}
          if(url.origin!==location.origin)return;
          e.preventDefault();
          document.body.classList.add('page-leaving');
          setTimeout(()=>{location.href=url.href;},180);
        });
      })();

      // ── KLÁVESOVÉ ZKRATKY ──
      (function(){
        const ROUTES = { h:'/home'${can('sklad')?", s:'/sklad'":''}${can('blackbook')?", b:'/blackbook'":''}${can('profit-centrum')?", p:'/profit-centrum'":''}${can('audit')?", a:'/audit'":''}${can('statistiky')?", t:'/statistiky'":''}${can('nastenska')?", n:'/nastenska'":''}, k:'/kodex', l:'/lore', o:'/hierarchy', w:'/weed-sazeni' };
        let awaitingSecond = false, chordTimer = null;
        function isTyping(el) { if(!el) return false; const tag=el.tagName; return tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||el.isContentEditable; }
        document.addEventListener('keydown', (e) => {
          if (e.metaKey||e.ctrlKey||e.altKey) return;
          if (isTyping(e.target)) { if(e.key==='Escape') e.target.blur(); return; }
          if (awaitingSecond) {
            awaitingSecond=false; clearTimeout(chordTimer);
            const dest=ROUTES[e.key.toLowerCase()];
            if(dest){e.preventDefault();window.location.href=dest;}
            return;
          }
          if (e.key.toLowerCase()==='g') { awaitingSecond=true; clearTimeout(chordTimer); chordTimer=setTimeout(()=>{awaitingSecond=false;},900); return; }
          if (e.key==='/') { const target=document.getElementById('audit-search'); if(target){e.preventDefault();target.focus();} }
        });
      })();
    </script>
  `;
}

module.exports = { renderNav };
