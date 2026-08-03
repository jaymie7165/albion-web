// nav.js — Albion v5 · "Crimson & Cream" navigace
//
// Struktura beze změny oproti v4 (nahoře jediný pruh se sekcemi, vlevo
// kontextový sidebar). JEDINÁ funkční změna oproti v4: skupina "Nastavení"
// v topbaru byla odstraněna — mířila na stejnou URL (/profil) jako tlačítko
// "Profil" vpravo v topbaru, takže to byly dva odkazy na to samé místo.
// Teď existuje jen jeden jasný vstup do Profilu (vpravo, viz topbar-right).
//
// DŮLEŽITÉ: renderNav(req, active) má STEJNÝ podpis jako dřív a `active`
// hodnoty, které mu předávají jednotlivé view soubory (server.js/views/*.js),
// se vůbec nemění — tento soubor si jen sám odvodí, do které sekce daná
// stránka patří. Žádný jiný soubor v projektu se tedy nemusí upravovat.
//
// Všechny globální JS funkce a id, na které se odkazují jiné view soubory
// (window.showToast, ledgerEmptyHTML, skeletonRows, albionSealThud,
// albionPaper, albionSound, window.evtSource, bumpUnread/clearUnread,
// openGlobalSearch, setTheme, setViewAs…) zůstávají
// beze změny — mění se jen markup a vzhled navigace kolem nich.

const { canAccess } = require('./roles');
const { escapeHtml } = require('./utils');

function renderNav(req, active) {
  const ic = req.session.icName;
  const accessLevel = req.session.accessLevel || 3;
  const can = (pageId) => canAccess(accessLevel, pageId);
  const isAssociate = !!req.session.isAssociate;

  // ── SEKCE (top bar) + jejich podstránky (kontextový sidebar) ────────────
  const GROUPS = [
    {
      id: 'dashboard', label: 'Dashboard', href: '/home',
      pages: ['home'], links: [],
    },
    {
      id: 'evidence', label: 'Evidence',
      pages: ['sklad', 'weed-sazeni', 'garaz', 'nemovitosti', 'bazar'],
      links: [
        can('sklad-view') && { page: 'sklad', label: can('sklad') ? 'Sklad' : 'Sklad', sub: can('sklad') ? 'Zbraně · Weed · Drogy' : 'Reserve Fund · Ceník', href: '/sklad' },
        { page: 'weed-sazeni', label: 'Weed sázení', sub: 'Odpočty růstu', href: '/weed-sazeni' },
        { page: 'garaz', label: 'Garáž', sub: 'Vozový park', href: '/garaz' },
        can('nemovitosti') && { page: 'nemovitosti', label: 'Nemovitosti', sub: 'Lokace organizace', href: '/nemovitosti' },
        can('bazar') && { page: 'bazar', label: 'Bazar', sub: 'Vnitřní tržiště', href: '/bazar' },
      ].filter(Boolean),
    },
    {
      id: 'finance', label: 'Finance',
      pages: ['blackbook', 'profit-centrum'],
      links: [
        can('blackbook') && { page: 'blackbook', label: 'Blackbook', sub: 'Reporty & analýzy', href: '/blackbook' },
        can('profit-centrum') && { page: 'profit-centrum', label: 'Profit centrum', sub: 'Ziskovost', href: '/profit-centrum' },
      ].filter(Boolean),
    },
    {
      id: 'organizace', label: 'Organizace',
      pages: ['nastenska', 'spis', 'mentoring', 'kodex', 'lore', 'hierarchy', 'galerie'],
      links: [
        can('nastenska') && { page: 'nastenska', label: 'Nástěnka', sub: 'Oznámení', href: '/nastenska' },
        can('spis') && { page: 'spis', label: 'Osobní spisy', sub: 'Důvěrné', href: '/spis' },
        { page: 'mentoring', label: 'Mentorský program', sub: 'Rozvoj členů', href: '/mentoring' },
        { page: 'kodex', label: 'Kodex', sub: 'Pravidla organizace', href: '/kodex' },
        { page: 'lore', label: 'Historie', sub: 'Kronika', href: '/lore' },
        { page: 'hierarchy', label: 'Hierarchie', sub: 'Struktura & vztahy', href: '/hierarchy' },
        !isAssociate && { page: 'galerie', label: 'Galerie', sub: 'Fotokronika', href: '/galerie' },
      ].filter(Boolean),
    },
    {
      id: 'analytika', label: 'Analytika',
      pages: ['audit', 'statistiky', 'leaderboard'],
      links: [
        can('audit') && { page: 'audit', label: 'Audit', sub: 'Historie akcí', href: '/audit' },
        can('statistiky') && { page: 'statistiky', label: 'Statistiky', sub: 'Přehled členů', href: '/statistiky' },
        { page: 'leaderboard', label: 'Aktivita', sub: 'Žebříček členů', href: '/leaderboard' },
      ].filter(Boolean),
    },
    // Skupina "Nastavení" byla odstraněna — mířila na stejnou URL (/profil)
    // jako tlačítko "Profil" v topbar-right. Profil (a pro Founder/Council
    // i sekce Organizace) je teď dostupný výhradně přes to jedno tlačítko.
  ].filter(g => g.href || g.links.length); // skupina bez odkazů (např. Finance pro Member) se v topbaru vůbec nezobrazí

  // Do které skupiny patří aktuální stránka
  let activeGroup = GROUPS.find(g => g.pages.includes(active));
  const activeHref = (g) => g.href || (g.links[0] && g.links[0].href) || '#';

  const topbarGroupsHtml = GROUPS.map(g => `<a href="${activeHref(g)}" class="topbar-group${g === activeGroup ? ' active' : ''}">${g.label}</a>`).join('');

  const sidebarLinksHtml = (activeGroup && activeGroup.links.length)
    ? activeGroup.links.map(l => `
        <a href="${l.href}" class="sb-link${l.page === active ? ' active' : ''}">
          <span class="sb-name">${l.label}</span>
          <span class="sb-sub">${l.sub}</span>
        </a>`).join('')
    : '';

  const mobileDrawerHtml = GROUPS.map(g => `
    <div class="md-group-label">${g.label}</div>
    ${g.links.length
      ? g.links.map(l => `<a href="${l.href}" class="${l.page === active ? 'active' : ''}">${l.label}</a>`).join('')
      : `<a href="${g.href}" class="${(g.pages||[]).includes(active) ? 'active' : ''}">${g.label}</a>`}
  `).join('');

  return `
    <nav class="app-topbar">
      <div class="topbar-left">
        <a href="/home" class="nav-logo">
          <img src="/logo.png" class="nav-logo-img" alt="Caledonia">
          <span class="nav-logo-text"><span class="b-red">C</span>ALEDONIA</span>
        </a>
        <a href="/albion" class="topbar-portal" title="Vstoupit do CALEDONIA">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>
        </a>
        <button class="nav-burger" id="navBurger" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>

      <div class="topbar-groups" id="topbarGroups">${topbarGroupsHtml}</div>

      <div class="topbar-right" id="navRight">
        <button class="notif-bell" id="globalSearchBtn" title="Hledat (klávesa /)" onclick="openGlobalSearch()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
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
            <div style="display:flex;align-items:center;gap:0.5rem">
              <button class="evelyn-letter-close" id="evelynSnoozeBtn" title="Dnes už nezobrazovat automaticky" style="font-size:0.9rem">🔕</button>
              <button class="evelyn-letter-close" id="evelynCloseBtn" title="Zavřít">✕</button>
            </div>
          </div>
          <div class="evelyn-letter-body" id="evelynLetterBody">
            <div class="ledger-loading">Evelyn píše zprávu…</div>
          </div>
        </div>
        <button class="ambient-btn" id="ambientBtn" title="Ambientní zvuk kanceláře">♫</button>
        <button class="notif-bell" id="notifBell" title="Oznámení" onclick="window.location='${can('nastenska') ? '/nastenska' : '/bazar'}'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span class="notif-badge" id="notifBadge">0</span>
        </button>
        ${req.session.realAccessLevel === 1 ? `
        <div class="view-as-switcher" style="position:relative">
          <button class="nav-shortcut-hint" id="viewAsBtn" style="cursor:pointer;${req.session.viewAsLevel ? 'border-color:var(--oxblood-bright);color:var(--oxblood-bright)' : ''}" title="View As — simulace role">
            ${req.session.viewAsLevel ? 'Náhled: ' + ({ 1: 'Founder/Council', 2: 'Senior Member', 3: 'Member' }[req.session.viewAsLevel]) : 'View As'}
          </button>
          <div id="viewAsMenu" class="app-sidebar" style="position:absolute;top:120%;right:0;left:auto;bottom:auto;width:220px;padding:0.6rem;opacity:0;pointer-events:none;transition:opacity .15s;box-shadow:var(--shadow)">
            <a href="#" class="sb-link" onclick="setViewAs(null);return false"><span class="sb-name">Vlastní role</span><span class="sb-sub">Founder/Council</span></a>
            <a href="#" class="sb-link" onclick="setViewAs(2);return false"><span class="sb-name">Náhled</span><span class="sb-sub">Senior Member</span></a>
            <a href="#" class="sb-link" onclick="setViewAs(3);return false"><span class="sb-name">Náhled</span><span class="sb-sub">Member / Associate</span></a>
          </div>
        </div>` : ''}
        <div class="sound-switcher" style="position:relative">
          <button class="theme-dot-btn" id="soundToggle" style="border-radius:0;width:18px;height:18px;background:none;border:1px solid var(--border-brass);color:var(--brass);font-size:0.65rem;display:flex;align-items:center;justify-content:center" title="Zvuky">♪</button>
        </div>
        <div class="theme-switcher" title="Přepnout téma">
          <span class="theme-switcher-label">Téma</span>
          <button class="theme-dot-btn" id="td-dark"  aria-label="Tmavý noir" style="background:#0B0607;border:1.5px solid #FFDEAD" onclick="setTheme('dark')"  title="Crimson Noir"></button>
          <button class="theme-dot-btn" id="td-light" aria-label="Světlý pergamen" style="background:#FBF3E4;border:1.5px solid #DC143C" onclick="setTheme('light')" title="Krémový pergamen"></button>
          <button class="theme-dot-btn" id="td-auto" aria-label="Automaticky dle denní doby" style="background:conic-gradient(from 180deg,#FBF3E4,#0B0607,#FBF3E4);border:1.5px solid #FFDEAD" onclick="setTheme('auto')" title="Auto — dle reálné denní doby"></button>
        </div>
        <span class="nav-user" style="border-left:2px solid ${({ 1: 'var(--oxblood-bright)', 2: 'var(--brass-bright)', 3: 'var(--ivory-faint)' })[accessLevel] || 'var(--ivory-faint)'};padding-left:0.6rem">člen &nbsp;<strong>${escapeHtml(ic)}</strong></span>
        <a href="/profil" class="nav-logout" style="border-color:var(--border-brass);color:var(--ivory-faint)" title="Profil, heslo, aliasy${req.session.realAccessLevel === 1 ? ' & správa organizace' : ''}">Profil</a>
        <a href="/logout" class="nav-logout">Odejít</a>
      </div>
    </nav>
    <div class="nav-overlay" id="navOverlay"></div>

    ${req.session.viewAsLevel ? `<div style="background:var(--oxblood-faint);border-bottom:1px solid var(--border-oxblood);padding:0.5rem 2rem;text-align:center;font-family:var(--font-mono);font-size:0.72rem;color:var(--oxblood-bright)">
      Náhled jako role: ${({ 1: 'Founder/Council', 2: 'Senior Member', 3: 'Member/Associate' })[req.session.viewAsLevel]} — <a href="#" onclick="setViewAs(null);return false" style="color:var(--oxblood-bright);text-decoration:underline">ukončit náhled</a>
    </div>` : ''}

    ${sidebarLinksHtml ? `
    <div class="app-sidebar" id="appSidebar">
      <div class="sb-eyebrow">${activeGroup.label}</div>
      ${sidebarLinksHtml}
    </div>` : ''}

    <div class="mobile-drawer" id="mobileDrawer">
      ${mobileDrawerHtml}
      <div class="md-utility" id="mobileUtility"></div>
    </div>

    <!-- Globální vyhledávání napříč webem (klávesa "/", pokud stránka nemá vlastní audit-search pole) -->
    <div class="modal-overlay" id="globalSearchModal">
      <div class="modal-box" style="max-width:520px;text-align:left">
        <div class="modal-title">Hledat v Caledonii</div>
        <input type="text" id="globalSearchInput" placeholder="Jméno člena, SPZ, nemovitost, bazar…" style="margin-bottom:1rem">
        <div id="globalSearchResults" style="max-height:320px;overflow-y:auto"></div>
        <div class="modal-actions"><button class="modal-btn-cancel" style="flex:1" onclick="closeGlobalSearch()">Zavřít</button></div>
      </div>
    </div>

    <script>
      // ── MOBILNÍ MENU ──
      const navBurger  = document.getElementById('navBurger');
      const navOverlay = document.getElementById('navOverlay');
      const mobileDrawer = document.getElementById('mobileDrawer');
      const navRightEl = document.getElementById('navRight');
      const mobileUtility = document.getElementById('mobileUtility');
      let navRightInMenu = false;

      function placeNavRight() {
        const mobile = window.innerWidth <= 900;
        if (mobile && !navRightInMenu) { mobileUtility.appendChild(navRightEl); navRightInMenu = true; }
        else if (!mobile && navRightInMenu) { document.querySelector('.app-topbar').appendChild(navRightEl); navRightInMenu = false; }
      }
      placeNavRight();

      function closeMobileNav() {
        navBurger.classList.remove('open');
        mobileDrawer.classList.remove('mobile-open');
        document.body.classList.remove('nav-locked');
      }
      navBurger.addEventListener('click', () => {
        const willOpen = !mobileDrawer.classList.contains('mobile-open');
        navBurger.classList.toggle('open', willOpen);
        mobileDrawer.classList.toggle('mobile-open', willOpen);
        document.body.classList.toggle('nav-locked', willOpen);
      });
      navOverlay.addEventListener('click', closeMobileNav);
      window.addEventListener('resize', () => { placeNavRight(); if (window.innerWidth > 900) closeMobileNav(); });
      mobileDrawer.querySelectorAll('a[href]:not([href="#"])').forEach(a => a.addEventListener('click', closeMobileNav));

      // ── VIEW AS dropdown open/close (jednoduchý hover/click) ──
      (function(){
        const btn = document.getElementById('viewAsBtn');
        if (!btn) return;
        const menu = document.getElementById('viewAsMenu');
        btn.addEventListener('click', () => {
          const open = menu.style.opacity === '1';
          menu.style.opacity = open ? '0' : '1';
          menu.style.pointerEvents = open ? 'none' : 'all';
        });
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.view-as-switcher')) { menu.style.opacity = '0'; menu.style.pointerEvents = 'none'; }
        });
      })();

      // ── NÁLADA — reálná denní doba, nezávislá na zvoleném tématu ──
      const MOODS = ['mood-sunrise','mood-day','mood-sunset','mood-night'];
      const MOOD_LABEL = { 'mood-sunrise':'svítání', 'mood-day':'den', 'mood-sunset':'soumrak', 'mood-night':'noc' };
      function moodFromHour(h){ if(h>=5&&h<7)return'mood-sunrise'; if(h>=7&&h<17)return'mood-day'; if(h>=17&&h<21)return'mood-sunset'; return'mood-night'; }
      function applyMoodTick(){
        const m = moodFromHour(new Date().getHours());
        MOODS.forEach(c=>document.body.classList.remove(c));
        document.body.classList.add(m);
        if (currentTheme === 'auto') {
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
        applyMoodTick();
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
      function bumpBellBadge(){
        newCount++;
        const badge = document.getElementById('notifBadge');
        badge.textContent = newCount;
        badge.classList.add('visible');
        if (window.bumpUnread) window.bumpUnread();
      }
      evtSource.addEventListener('nastenska', (e) => {
        const d = JSON.parse(e.data);
        bumpBellBadge();
        showToast('Oznámení: ' + d.title + ' — ' + d.uzivatel);
      });
      evtSource.addEventListener('skladUpdate', (e) => {
        const d = JSON.parse(e.data);
        const label = d.sekce === 'zbrane' ? 'Zbraně' : d.sekce === 'weed' ? 'Weed' : d.sekce === 'chemky' ? 'Chemky' : d.sekce === 'undo' ? 'Vráceno zpět' : 'Drogy';
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
      evtSource.addEventListener('bazarUpdate', (e) => {
        const d = JSON.parse(e.data);
        if (d.action === 'add') { bumpBellBadge(); showToast('Bazar · nová nabídka'); }
        else if (d.action === 'zajem') { bumpBellBadge(); showToast('Bazar · nový zájemce o nabídku'); }
      });
      evtSource.addEventListener('mentoringUpdate', (e) => {
        bumpBellBadge();
        showToast('Mentorský program · nová aktivita');
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
        t.querySelector('.toast-msg').textContent = msg;
        void t.offsetWidth;
        t.classList.add('show');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => {
          t.classList.remove('show');
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

      // ── REWARD FEEDBACK — krátký puls/pop po úspěšném zápisu ──
      // Používá se ze sklad.js i home.js (rychlý zápis) po úspěšném POSTu,
      // ať zápis dat působí jako malý moment odměny, ne jen tichý formulář.
      window.rewardFlash = function(el){
        if (!el) return;
        el.classList.remove('reward-flash','reward-pop');
        void el.offsetWidth;
        el.classList.add('reward-flash','reward-pop');
        setTimeout(() => el.classList.remove('reward-flash','reward-pop'), 950);
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
              ctx.fillStyle = '#DC143C';
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

      const CURRENT_PAGE = '${active}' || 'home';

      // ── AMBIENTNÍ ZVUK KANCELÁŘE ──
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
        if (on) { const a = ensureAudio(); a.play().catch(() => {}); }
        btn.addEventListener('click', () => {
          on = !on;
          localStorage.setItem(KEY, on ? '1' : '0');
          render();
          const a = ensureAudio();
          if (on) a.play().catch(() => {});
          else a.pause();
        });
        document.addEventListener('click', function once(){
          if (on && audioEl && audioEl.paused) audioEl.play().catch(() => {});
        }, { once: true });
      })();

      window.setViewAs=async function(level){
        const res=await fetch('/api/view-as',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({level})});
        const d=await res.json();
        if(d.ok)location.reload();
        else if(window.showToast)showToast(d.error,true);
      };

      // ── SEZÓNNÍ VZHLED ──
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
      (function evelyn(){
        const letter=document.getElementById('evelynLetter');
        const widget=document.getElementById('evelynWidget');
        const body=document.getElementById('evelynLetterBody');
        const closeBtn=document.getElementById('evelynCloseBtn');
        const snoozeBtn=document.getElementById('evelynSnoozeBtn');
        const ping=document.getElementById('evelynPing');
        if(!letter||!widget||!body)return;

        const PAGE_ID = CURRENT_PAGE;
        let shown=false, autoCloseTimer=null, briefCache=null;

        const SNOOZE_KEY = 'albion_evelyn_snooze_until';
        function isSnoozedToday(){
          try{
            const until = localStorage.getItem(SNOOZE_KEY);
            if(!until) return false;
            return new Date(until).toDateString() === new Date().toDateString();
          }catch(e){ return false; }
        }
        function snoozeToday(){
          try{ localStorage.setItem(SNOOZE_KEY, new Date().toISOString()); }catch(e){}
          closeLetter();
          if(window.showToast) showToast('Evelyn se dnes už automaticky neozve');
        }
        if(snoozeBtn) snoozeBtn.addEventListener('click',(e)=>{ e.stopPropagation(); snoozeToday(); });

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

        setTimeout(()=>{
          if(isSnoozedToday())return;
          fetchBrief().then(()=>{ openLetter(11000); });
        },1000);
      })();

      // ── GLOBÁLNÍ VYHLEDÁVÁNÍ (napříč členy, vozy, nemovitostmi, bazarem) ──
      (function globalSearch(){
        const modal=document.getElementById('globalSearchModal');
        const input=document.getElementById('globalSearchInput');
        const results=document.getElementById('globalSearchResults');
        if(!modal||!input||!results)return;
        let debounceT=null;

        function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
        const TYPE_LABEL={ 'člen':'Člen','vůz':'Vůz','nemovitost':'Nemovitost','bazar':'Bazar' };

        function renderResults(list){
          if(!list.length){ results.innerHTML='<div style="padding:1rem 0;color:var(--ivory-faint);font-family:var(--font-mono);font-size:0.8rem;text-align:center">Nic nenalezeno</div>'; return; }
          results.innerHTML=list.map(r=>{
            const inner='<span style="font-family:var(--font-label);font-size:0.5rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--brass);border:1px solid var(--border-brass);padding:0.1rem 0.4rem;margin-right:0.6rem">'+(TYPE_LABEL[r.type]||r.type)+'</span>'+esc(r.label);
            return r.href
              ? '<a href="'+r.href+'" style="display:block;padding:0.6rem 0.2rem;border-bottom:1px solid var(--border);color:var(--ivory);text-decoration:none;font-size:0.86rem">'+inner+'</a>'
              : '<div style="padding:0.6rem 0.2rem;border-bottom:1px solid var(--border);color:var(--ivory);font-size:0.86rem">'+inner+'</div>';
          }).join('');
        }

        function doSearch(q){
          if(q.trim().length<2){ results.innerHTML=''; return; }
          fetch('/api/search?q='+encodeURIComponent(q)).then(r=>r.json()).then(d=>{
            if(d.ok) renderResults(d.results);
          }).catch(()=>{});
        }
        input.addEventListener('input',()=>{
          clearTimeout(debounceT);
          const q=input.value;
          debounceT=setTimeout(()=>doSearch(q),200);
        });

        window.openGlobalSearch=function(){
          modal.classList.add('open');
          input.value='';
          results.innerHTML='';
          setTimeout(()=>input.focus(),50);
        };
        window.closeGlobalSearch=function(){ modal.classList.remove('open'); };
        modal.addEventListener('click',(e)=>{ if(e.target===modal) closeGlobalSearch(); });
      })();

      // ── PAGE TRANSITION ──
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
    </script>
  `;
}

module.exports = { renderNav };
