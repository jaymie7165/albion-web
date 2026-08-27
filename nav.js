// nav.js — CALEDONIA PRIVATE NETWORK · sidebar navigace
//
// Založeno vlevo (--sidebar-w), ne nahoře — odpovídá referenčnímu vzhledu.
// Founder/Council/Senior Member vidí SESKUPENOU navigaci (Dashboard/
// Evidence/Finance/Organization/Analytics + Nastavení/Odhlásit dole).
// Member/Associate vidí PLOCHÝ seznam bez skupin (jen položky, na které
// mají právo) — přesně podle schváleného návrhu.
//
// renderNav(req, active) má STEJNÝ podpis jako dřív — žádný view soubor se
// nemusí měnit. Globální JS funkce (showToast, ledgerEmptyHTML, atd.)
// zůstávají beze změny.

const { canAccess } = require('./roles');
const { escapeHtml } = require('./utils');

const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>',
  sklad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="10" width="4" height="10"/><rect x="10" y="5" width="4" height="15"/><rect x="17" y="13" width="4" height="7"/></svg>',
  weed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2C9 6 8 9 8 12a4 4 0 0 0 8 0c0-3-1-6-4-10Z"/><path d="M12 12v10"/></svg>',
  timer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 2h6"/></svg>',
  garaz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 13l2-6h14l2 6"/><rect x="2" y="13" width="20" height="6" rx="1"/><circle cx="7" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg>',
  nemovitosti: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
  deposit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="14" rx="1"/><path d="M2 10h20"/></svg>',
  reserve: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 21V9l8-5 8 5v12"/><path d="M9 21v-6h6v6"/></svg>',
  history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  hierarchy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="5" r="2.2"/><path d="M12 7.2V12M5 19v-2a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/></svg>',
  blackbook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3Z"/></svg>',
  profit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 17l6-6 4 4 8-8"/></svg>',
  nastenska: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/></svg>',
  informace: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  mentoring: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="7" r="3"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/></svg>',
  kodex: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>',
  lore: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"/></svg>',
  galerie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  bazar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 8l1.5-4h13L20 8"/><path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/></svg>',
  audit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  statistiky: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="10" width="4" height="10"/><rect x="10" y="5" width="4" height="15"/><rect x="17" y="13" width="4" height="7"/></svg>',
  leaderboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0Z"/></svg>',
  achievements: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="6"/><path d="M9 13.5 7 21l5-3 5 3-2-7.5"/></svg>',
  navigator: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="m8 16 2-6 6-2-2 6z"/></svg>',
  darkchat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-4-1L3 20l1.5-5.5A8.5 8.5 0 1 1 21 11.5Z"/></svg>',
  profil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
};

function renderNav(req, active) {
  const ic = req.session.icName;
  const accessLevel = req.session.accessLevel || 3;
  const can = (pageId) => canAccess(accessLevel, pageId);
  const isAssociate = !!req.session.isAssociate;
  const isStaff = accessLevel <= 2; // Founder/Council/Senior Member → víc práv v Evidence/Financích

  // ── SESKUPENÁ NAVIGACE — STEJNÁ STRUKTURA PRO VŠECHNY ────────────────────
  // Dřív měli Member/Associate úplně jiný, plochý seznam bez skupin — a
  // chyběly v něm stránky, na které přitom měli přístup (Kodex, Historie,
  // Mentoring, Bazar, Galerie, Aktivita, Vyznamenání — vše level 3 =
  // dostupné každému, viz roles.js). Teď je struktura pro obě role stejná
  // (Dashboard/Evidence/Finance/Organizace/Analytika), liší se jen obsah
  // jednotlivých skupin podle canAccess(). Weed a Weed Timer byly dřív dvě
  // položky vedoucí na tutéž stránku — sloučeno do jedné ("Weed").
  const GROUPS = [
    { id: 'dashboard', label: 'Dashboard', links: [{ id: 'home', label: 'Dashboard', href: '/home', icon: ICONS.home }] },
    {
      id: 'evidence', label: 'Evidence',
      links: [
        isStaff && can('sklad-view') && { id: 'sklad', label: 'Sklad', href: '/sklad', icon: ICONS.sklad },
        { id: 'weed-sazeni', label: 'Weed', href: '/weed-sazeni', icon: ICONS.weed },
        { id: 'garaz', label: 'Garáž', href: '/garaz', icon: ICONS.garaz },
        can('nemovitosti') && { id: 'nemovitosti', label: 'Nemovitosti', href: '/nemovitosti', icon: ICONS.nemovitosti },
      ].filter(Boolean),
    },
    {
      id: 'finance', label: 'Finance',
      links: [
        can('blackbook') && { id: 'blackbook', label: 'Blackbook', href: '/blackbook', icon: ICONS.blackbook },
        can('profit-centrum') && { id: 'profit-centrum', label: 'Profit centrum', href: '/profit-centrum', icon: ICONS.profit },
        !isStaff && { id: 'sklad', label: 'Reserve Fund', href: '/sklad', icon: ICONS.reserve },
        !isStaff && { id: 'deposit', label: 'Vklad', href: '/home#deposit', icon: ICONS.deposit },
      ].filter(Boolean),
    },
    {
      id: 'organizace', label: 'Organizace',
      links: [
        can('nastenska') && { id: 'nastenska', label: 'Nástěnka', href: '/nastenska', icon: ICONS.nastenska },
        can('informace') && { id: 'informace', label: 'Informace', href: '/informace', icon: ICONS.informace },
        { id: 'mentoring', label: 'Mentoring', href: '/mentoring', icon: ICONS.mentoring },
        { id: 'kodex', label: 'Kodex', href: '/kodex', icon: ICONS.kodex },
        { id: 'lore', label: 'Historie', href: '/lore', icon: ICONS.lore },
        { id: 'hierarchy', label: 'Hierarchie', href: '/hierarchy', icon: ICONS.hierarchy },
        can('bazar') && { id: 'bazar', label: 'Bazar', href: '/bazar', icon: ICONS.bazar },
        !isAssociate && { id: 'galerie', label: 'Galerie', href: '/galerie', icon: ICONS.galerie },
        { id: 'darkchat', label: 'Darkchat', href: '/darkchat', icon: ICONS.darkchat },
        { id: 'navigator', label: 'Rozcestník', href: '/prehled', icon: ICONS.navigator },
      ].filter(Boolean),
    },
    {
      id: 'analytika', label: 'Analytika',
      links: [
        can('audit') && { id: 'audit', label: 'Audit', href: '/audit', icon: ICONS.audit },
        !isStaff && { id: 'history', label: 'Moje aktivita', href: '/audit-me', icon: ICONS.history },
        can('statistiky') && { id: 'statistiky', label: 'Statistiky', href: '/statistiky', icon: ICONS.statistiky },
        { id: 'leaderboard', label: 'Aktivita', href: '/leaderboard', icon: ICONS.leaderboard },
        { id: 'achievements', label: 'Vyznamenání', href: '/vyznamenani', icon: ICONS.achievements },
      ].filter(Boolean),
    },
  ].filter(g => g.links.length);

  const sidebarInner = GROUPS.map(g => `
        <div class="sb-eyebrow">${g.label}</div>
        ${g.links.map(l => `<a href="${l.href}" class="sb-link${l.id === active ? ' active' : ''}">${l.icon}<span>${l.label}</span></a>`).join('')}
      `).join('');

  const mobileDrawerHtml = GROUPS.map(g => `<div class="md-group-label">${g.label}</div>${g.links.map(l => `<a href="${l.href}" class="${l.id === active ? 'active' : ''}">${l.label}</a>`).join('')}`).join('');

  return `
    <div class="app-sidebar" id="appSidebar">
      <a href="/home" class="sb-brand">
        <img src="/logo.png" alt="Caledonia">
        <div class="sb-brand-name">CALEDONIA</div>
        <div class="sb-brand-tag">Private Network</div>
      </a>

      ${sidebarInner}

      <div class="sb-bottom">
        <a href="/profil" class="sb-link">${ICONS.settings}<span>Nastavení</span></a>
        <a href="/logout" class="sb-link">${ICONS.logout}<span>Odhlásit se</span></a>
        <div class="sb-version">CALEDONIA NETWORK SYSTEMS<br>v6.0 · secure</div>
      </div>
    </div>

    <!-- Slim top bar retained for utilities (search, theme, user, mobile burger) -->
    <nav class="app-topbar">
      <div class="topbar-left">
        <button class="nav-burger" id="navBurger" aria-label="Menu"><span></span><span></span><span></span></button>
      </div>
      <div class="topbar-groups" id="topbarGroups"></div>
      <div class="topbar-right" id="navRight">
        <button class="notif-bell" id="globalSearchBtn" title="Hledat" onclick="openGlobalSearch()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
        <div class="evelyn-widget" id="evelynWidget" title="Evelyn Ashcroft — Sekretariát Caledonie">
          <img src="/evelyn.png" class="evelyn-portrait" alt="" id="evelynImg" onerror="this.style.display='none';document.getElementById('evelynFallback').style.display='flex';">
          <div class="evelyn-portrait evelyn-portrait-placeholder" id="evelynFallback" style="display:none;width:26px;height:26px;border-radius:50%;border:1px solid var(--border-brass);align-items:center;justify-content:center">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="8.5" r="3.4"/><path d="M5 20c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5"/></svg>
          </div>
          <span class="evelyn-ping" id="evelynPing"></span>
        </div>
        <div class="evelyn-letter" id="evelynLetter">
          <div class="evelyn-letter-head">
            <div class="evelyn-letter-from"><span>Evelyn Ashcroft · Sekretariát</span></div>
            <div style="display:flex;align-items:center;gap:0.5rem">
              <button class="evelyn-letter-close" id="evelynSnoozeBtn" title="Dnes už nezobrazovat" style="font-size:0.85rem;background:none;border:none;color:var(--ivory-faint);cursor:pointer">🔕</button>
              <button class="evelyn-letter-close" id="evelynCloseBtn" title="Zavřít" style="background:none;border:none;color:var(--ivory-faint);cursor:pointer">✕</button>
            </div>
          </div>
          <div class="evelyn-letter-body" id="evelynLetterBody"><div class="ledger-loading">Evelyn píše zprávu…</div></div>
        </div>
        <button class="notif-bell" id="notifBell" title="Oznámení" onclick="window.location='${can('nastenska') ? '/nastenska' : '/bazar'}'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span class="notif-badge" id="notifBadge">0</span>
        </button>
        ${req.session.realAccessLevel === 1 ? `
        <div class="view-as-switcher" style="position:relative">
          <button class="nav-shortcut-hint" id="viewAsBtn" style="cursor:pointer;${req.session.viewAsLevel ? 'border-color:var(--oxblood-bright);color:var(--oxblood-bright)' : ''}" title="Zobrazit jako">
            ${req.session.viewAsLevel ? 'Náhled: ' + ({ 1: 'Founder/Council', 2: 'Senior Member', 3: 'Member' }[req.session.viewAsLevel]) : 'Zobrazit jako'}
          </button>
          <div id="viewAsMenu" class="app-sidebar" style="position:absolute;top:120%;right:0;left:auto;bottom:auto;width:200px;padding:0.5rem;opacity:0;pointer-events:none;transition:opacity .15s;box-shadow:var(--shadow)">
            <a href="#" class="sb-link" onclick="setViewAs(null);return false">Vlastní role</a>
            <a href="#" class="sb-link" onclick="setViewAs(2);return false">Senior Member</a>
            <a href="#" class="sb-link" onclick="setViewAs(3);return false">Member/Associate</a>
          </div>
        </div>` : ''}
        <div class="theme-switcher" title="Přepnout téma">
          <button class="theme-dot-btn" id="td-dark" style="background:#07050A;border:1.5px solid #CBA45C" onclick="setTheme('dark')" title="Tmavý"></button>
          <button class="theme-dot-btn" id="td-light" style="background:#F3EFE7;border:1.5px solid #6E1424" onclick="setTheme('light')" title="Světlý"></button>
        </div>
        <span class="nav-user">${escapeHtml(ic)}</span>
      </div>
    </nav>
    <div class="nav-overlay" id="navOverlay"></div>

    ${req.session.viewAsLevel ? `<div style="background:var(--oxblood-faint);border-bottom:1px solid var(--border-oxblood);padding:0.5rem 2rem;text-align:center;font-family:var(--font-mono);font-size:0.7rem;color:var(--oxblood-bright);margin-left:var(--sidebar-w)">
      Náhled jako role: ${({ 1: 'Founder/Council', 2: 'Senior Member', 3: 'Member/Associate' })[req.session.viewAsLevel]} — <a href="#" onclick="setViewAs(null);return false" style="color:var(--oxblood-bright)">ukončit náhled</a>
    </div>` : ''}

    <div class="mobile-drawer" id="mobileDrawer">
      ${mobileDrawerHtml}
      <div class="md-utility" id="mobileUtility"></div>
    </div>

    <div class="modal-overlay" id="globalSearchModal">
      <div class="modal-box" style="max-width:520px;text-align:left">
        <div class="modal-title">Hledat v Caledonii</div>
        <input type="text" id="globalSearchInput" placeholder="Jméno člena, SPZ, nemovitost, bazar…" style="margin-bottom:1rem">
        <div id="globalSearchResults" style="max-height:320px;overflow-y:auto"></div>
        <div class="modal-actions"><button class="modal-btn-cancel" style="flex:1" onclick="closeGlobalSearch()">Zavřít</button></div>
      </div>
    </div>

    <script>
      const navBurger = document.getElementById('navBurger');
      const navOverlay = document.getElementById('navOverlay');
      const mobileDrawer = document.getElementById('mobileDrawer');
      function closeMobileNav(){ navBurger.classList.remove('open'); mobileDrawer.classList.remove('mobile-open'); document.body.classList.remove('nav-locked'); }
      navBurger.addEventListener('click', () => {
        const willOpen = !mobileDrawer.classList.contains('mobile-open');
        navBurger.classList.toggle('open', willOpen);
        mobileDrawer.classList.toggle('mobile-open', willOpen);
        document.body.classList.toggle('nav-locked', willOpen);
      });
      navOverlay.addEventListener('click', closeMobileNav);
      window.addEventListener('resize', () => { if (window.innerWidth > 900) closeMobileNav(); });
      mobileDrawer.querySelectorAll('a[href]:not([href="#"])').forEach(a => a.addEventListener('click', closeMobileNav));

      (function(){
        const btn = document.getElementById('viewAsBtn');
        if (!btn) return;
        const menu = document.getElementById('viewAsMenu');
        btn.addEventListener('click', () => {
          const open = menu.style.opacity === '1';
          menu.style.opacity = open ? '0' : '1';
          menu.style.pointerEvents = open ? 'none' : 'all';
        });
        document.addEventListener('click', (e) => { if (!e.target.closest('.view-as-switcher')) { menu.style.opacity = '0'; menu.style.pointerEvents = 'none'; } });
      })();

      // ── THEMES — dark/light only, no "auto" ──
      const THEMES = ['dark','light'];
      let currentTheme = localStorage.getItem('albion_theme') || 'dark';
      function applyTheme(t) {
        if (t === 'auto') t = 'dark';
        currentTheme = t;
        localStorage.setItem('albion_theme', t);
        THEMES.forEach(c => document.body.classList.remove(c));
        if (t === 'light') document.body.classList.add('light');
        ['dark','light'].forEach(th => { const b = document.getElementById('td-' + th); if (b) b.classList.toggle('active', th === t); });
      }
      applyTheme(currentTheme);
      function setTheme(t) { applyTheme(t); }

      let newCount = 0;
      const evtSource = new EventSource('/api/events');
      window.evtSource = evtSource;
      function bumpBellBadge(){
        newCount++;
        const badge = document.getElementById('notifBadge');
        badge.textContent = newCount; badge.classList.add('visible');
        if (window.bumpUnread) window.bumpUnread();
      }
      evtSource.addEventListener('nastenska', (e) => { const d = JSON.parse(e.data); bumpBellBadge(); showToast('Oznámení: ' + d.title); });
      evtSource.addEventListener('skladUpdate', (e) => {
        const d = JSON.parse(e.data);
        const label = d.sekce === 'zbrane' ? 'Zbraně' : d.sekce === 'weed' ? 'Weed' : d.sekce === 'chemky' ? 'Chemky' : d.sekce === 'undo' ? 'Vráceno zpět' : 'Drogy';
        showToast(label + ' · ' + (d.polozka || d.odruda || d.droga || d.chemikalie) + ' — ' + d.uzivatel);
      });
      evtSource.addEventListener('ucetUpdate', (e) => { const d = JSON.parse(e.data); showToast('Finance · ' + d.typ + ' — ' + (d.valuta === 'USD' ? 'SAD ' : '₱') + d.castka); });
      evtSource.addEventListener('weedTimer', (e) => { const d = JSON.parse(e.data); if (d.action === 'add' && d.timer) showToast('Weed sázení · ' + d.timer.icName); });
      evtSource.addEventListener('bazarUpdate', (e) => { const d = JSON.parse(e.data); if (d.action === 'add') { bumpBellBadge(); showToast('Bazar · nová nabídka'); } else if (d.action === 'zajem') { bumpBellBadge(); showToast('Bazar · nový zájemce'); } });
      evtSource.addEventListener('mentoringUpdate', () => { bumpBellBadge(); showToast('Mentorský program · nová aktivita'); });
      evtSource.addEventListener('achievementUpdate', (e) => { const d = JSON.parse(e.data); bumpBellBadge(); showToast('Vyznamenání · ' + d.label + ' — ' + d.uzivatel); });

      let _toastQueue = [], _toastActive = false;
      function showToast(msg, isError) { _toastQueue.push({ msg, isError }); _processToastQueue(); }
      function _processToastQueue() {
        if (_toastActive || !_toastQueue.length) return;
        _toastActive = true;
        const { msg, isError } = _toastQueue.shift();
        let t = document.getElementById('toast');
        if (!t) { t = document.createElement('div'); t.id='toast'; document.body.appendChild(t); }
        t.className = 'toast' + (isError ? ' error' : '');
        t.innerHTML = '<div class="toast-icon">' + (isError ? '✕' : '✓') + '</div><div class="toast-body"><div class="toast-title">' + (isError ? 'Chyba' : 'Zaznamenáno') + '</div><div class="toast-msg"></div></div>';
        t.querySelector('.toast-msg').textContent = msg;
        void t.offsetWidth; t.classList.add('show');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => { t.classList.remove('show'); setTimeout(() => { _toastActive = false; _processToastQueue(); }, 300); }, 3200);
      }
      window.showToast = showToast;

      window.ledgerEmptyHTML = function(text, compact, variant) {
        const ICONS_L = {
          default: '<rect x="3" y="2" width="58" height="44" rx="1" stroke="var(--border-brass)" stroke-width="1"/><line x1="12" y1="14" x2="44" y2="14" stroke="var(--border)" stroke-width="1"/><line x1="12" y1="22" x2="52" y2="22" stroke="var(--border)" stroke-width="1"/><line x1="12" y1="30" x2="38" y2="30" stroke="var(--border)" stroke-width="1"/><line x1="12" y1="38" x2="48" y2="38" stroke="var(--border)" stroke-width="1"/>',
          photo: '<rect x="3" y="2" width="58" height="44" rx="1" stroke="var(--border-brass)" stroke-width="1"/><circle cx="18" cy="16" r="5" stroke="var(--border)" stroke-width="1"/><path d="M6 38 L22 24 L34 34 L44 22 L58 36" stroke="var(--border)" stroke-width="1" fill="none"/>',
          people: '<circle cx="24" cy="16" r="7" stroke="var(--border-brass)" stroke-width="1"/><path d="M10 40c0-8 6-13 14-13s14 5 14 13" stroke="var(--border)" stroke-width="1" fill="none"/><circle cx="46" cy="18" r="5" stroke="var(--border)" stroke-width="1"/><path d="M38 40c0-6 4-10 10-10" stroke="var(--border)" stroke-width="1" fill="none"/>',
          stock: '<rect x="4" y="18" width="14" height="24" stroke="var(--border-brass)" stroke-width="1"/><rect x="21" y="10" width="14" height="32" stroke="var(--border)" stroke-width="1"/><rect x="38" y="24" width="14" height="18" stroke="var(--border)" stroke-width="1"/>',
        };
        return '<div class="ledger-empty' + (compact ? ' compact' : '') + '"><svg viewBox="0 0 64 48" fill="none">' + (ICONS_L[variant] || ICONS_L.default) + '</svg><div class="ledger-empty-text">' + text + '</div></div>';
      };
      window.skeletonRows = function(n, cols) {
        cols = cols || [1]; let html = '';
        for (let i=0;i<n;i++){ html += '<div class="skeleton-row">' + cols.map(w=>'<div class="skeleton skeleton-line" style="flex:'+w+'"></div>').join('') + '</div>'; }
        return html;
      };
      window.rewardFlash = function(el){
        if (!el) return;
        el.classList.remove('reward-flash','reward-pop'); void el.offsetWidth;
        el.classList.add('reward-flash','reward-pop');
        setTimeout(() => el.classList.remove('reward-flash','reward-pop'), 900);
      };

      (function favicon(){
        let unread = 0;
        function renderFavicon() {
          const size = 64; const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext('2d'); const img = new Image(); img.src = '/logo.png';
          img.onload = () => {
            ctx.drawImage(img, 0, 0, size, size);
            if (unread > 0) {
              ctx.beginPath(); ctx.fillStyle = '#B3172F'; ctx.arc(size-14, 14, 14, 0, 2*Math.PI); ctx.fill();
              ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText(unread > 9 ? '9+' : String(unread), size-14, 15);
            }
            let link = document.querySelector("link[rel='icon']");
            if (!link) { link = document.createElement('link'); link.rel='icon'; document.head.appendChild(link); }
            link.href = canvas.toDataURL('image/png');
            document.title = (unread>0?'('+unread+') ':'') + document.title.replace(/^\\(\\d+\\)\\s*/,'');
          };
        }
        window.bumpUnread = function(){ unread++; renderFavicon(); };
        window.clearUnread = function(){ unread=0; renderFavicon(); };
        renderFavicon();
      })();

      window.albionSealThud = function(){};
      window.albionPaper = function(){};
      window.albionSound = { login(){}, success(){}, notification(){}, timerDone(){} };

      window.setViewAs=async function(level){
        const res=await fetch('/api/view-as',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({level})});
        const d=await res.json();
        if(d.ok)location.reload(); else if(window.showToast)showToast(d.error,true);
      };

      (function evelyn(){
        const letter=document.getElementById('evelynLetter');
        const widget=document.getElementById('evelynWidget');
        const body=document.getElementById('evelynLetterBody');
        const closeBtn=document.getElementById('evelynCloseBtn');
        const snoozeBtn=document.getElementById('evelynSnoozeBtn');
        const ping=document.getElementById('evelynPing');
        if(!letter||!widget||!body)return;
        const PAGE_ID = '${active || 'home'}';
        let shown=false, autoCloseTimer=null, briefCache=null;
        const SNOOZE_KEY = 'albion_evelyn_snooze_until';
        function isSnoozedToday(){ try{ const until = localStorage.getItem(SNOOZE_KEY); if(!until) return false; return new Date(until).toDateString() === new Date().toDateString(); }catch(e){ return false; } }
        function snoozeToday(){ try{ localStorage.setItem(SNOOZE_KEY, new Date().toISOString()); }catch(e){} closeLetter(); if(window.showToast) showToast('Evelyn se dnes už automaticky neozve'); }
        if(snoozeBtn) snoozeBtn.addEventListener('click',(e)=>{ e.stopPropagation(); snoozeToday(); });
        function esc(s){return (s==null?'':String(s)).replace(/</g,'&lt;');}
        function renderBrief(d){
          let html='<div style="font-family:var(--font-mono);font-size:0.62rem;color:var(--ivory-faint);margin-bottom:0.6rem">Doručeno '+new Date().toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'})+'</div>';
          html+='<div style="font-family:var(--font-display);font-size:1rem;color:var(--ivory);margin-bottom:0.6rem">'+esc(d.subject)+'</div>';
          (d.lines||[]).forEach(l=>{ html+='<div style="font-family:var(--font-body);font-size:0.8rem;color:var(--ivory-dim);line-height:1.6;margin-bottom:0.5rem">'+esc(l)+'</div>'; });
          if(d.tips&&d.tips.length){ html+='<div style="margin:0.7rem 0;padding:0.7rem 0.85rem;background:var(--oxblood-faint);border-left:2px solid var(--oxblood-bright)">'+d.tips.map(t=>'<div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--ivory);line-height:1.6;padding:0.15rem 0">⚠ '+esc(t)+'</div>').join('')+'</div>'; }
          if(d.actions&&d.actions.length){ html+='<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.9rem">'+d.actions.map(a=>'<a href="'+a.href+'" style="font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--ivory-dim);border:1px solid var(--border-brass);padding:0.4rem 0.75rem;text-decoration:none">'+esc(a.label)+'</a>').join('')+'</div>'; }
          html+='<div style="margin-top:0.9rem;padding-top:0.7rem;border-top:1px solid var(--border);font-family:var(--font-display);font-size:0.78rem;color:var(--ivory-faint)">— E. Ashcroft</div>';
          body.innerHTML=html;
        }
        function fetchBrief(){
          return fetch('/api/evelyn/brief?page='+encodeURIComponent(PAGE_ID)).then(r=>r.json()).then(d=>{
            if(!d.ok) throw new Error('no data');
            briefCache=d; renderBrief(d);
            if(d.tips&&d.tips.length) ping.classList.add('show');
            return d;
          }).catch(()=>{ body.innerHTML='<div style="font-family:var(--font-body);font-size:0.8rem;color:var(--ivory-dim)">Omlouvám se, momentálně nemám zprávu připravenou.</div>'; });
        }
        function openLetter(autoHideMs){ letter.classList.add('show'); shown=true; ping.classList.remove('show'); clearTimeout(autoCloseTimer); if(autoHideMs) autoCloseTimer=setTimeout(closeLetter,autoHideMs); }
        function closeLetter(){ letter.classList.remove('show'); shown=false; clearTimeout(autoCloseTimer); }
        function toggleLetter(){ if(shown){closeLetter();return;} openLetter(0); if(!briefCache) fetchBrief(); }
        widget.addEventListener('click',toggleLetter);
        closeBtn.addEventListener('click',(e)=>{e.stopPropagation();closeLetter();});
        document.addEventListener('click',(e)=>{ if(shown&&!e.target.closest('.evelyn-widget')&&!e.target.closest('.evelyn-letter'))closeLetter(); });
        setTimeout(()=>{ if(isSnoozedToday())return; fetchBrief().then(()=>{ openLetter(10000); }); },1000);
      })();

      (function globalSearch(){
        const modal=document.getElementById('globalSearchModal');
        const input=document.getElementById('globalSearchInput');
        const results=document.getElementById('globalSearchResults');
        if(!modal||!input||!results)return;
        let debounceT=null;
        function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
        const TYPE_LABEL={ 'člen':'Člen','vůz':'Vůz','nemovitost':'Nemovitost','bazar':'Bazar' };
        function renderResults(list){
          if(!list.length){ results.innerHTML='<div style="padding:1rem 0;color:var(--ivory-faint);font-family:var(--font-mono);font-size:0.78rem;text-align:center">Nic nenalezeno</div>'; return; }
          results.innerHTML=list.map(r=>{
            const inner='<span style="font-family:var(--font-label);font-size:0.48rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--brass);border:1px solid var(--border-brass);padding:0.1rem 0.4rem;margin-right:0.6rem">'+(TYPE_LABEL[r.type]||r.type)+'</span>'+esc(r.label);
            return r.href ? '<a href="'+r.href+'" style="display:block;padding:0.6rem 0.2rem;border-bottom:1px solid var(--border);color:var(--ivory);text-decoration:none;font-size:0.84rem">'+inner+'</a>' : '<div style="padding:0.6rem 0.2rem;border-bottom:1px solid var(--border);color:var(--ivory);font-size:0.84rem">'+inner+'</div>';
          }).join('');
        }
        function doSearch(q){ if(q.trim().length<2){ results.innerHTML=''; return; } fetch('/api/search?q='+encodeURIComponent(q)).then(r=>r.json()).then(d=>{ if(d.ok) renderResults(d.results); }).catch(()=>{}); }
        input.addEventListener('input',()=>{ clearTimeout(debounceT); const q=input.value; debounceT=setTimeout(()=>doSearch(q),200); });
        window.openGlobalSearch=function(){ modal.classList.add('open'); input.value=''; results.innerHTML=''; setTimeout(()=>input.focus(),50); };
        window.closeGlobalSearch=function(){ modal.classList.remove('open'); };
        modal.addEventListener('click',(e)=>{ if(e.target===modal) closeGlobalSearch(); });
      })();

      (function pageTransition(){
        document.addEventListener('click',(e)=>{
          const a=e.target.closest('a[href]'); if(!a)return;
          const href=a.getAttribute('href');
          if(!href||href.startsWith('#')||href.startsWith('javascript:')||a.target==='_blank'||e.metaKey||e.ctrlKey||e.shiftKey)return;
          if(a.hasAttribute('download'))return;
          let url; try{url=new URL(href,location.href);}catch(err){return;}
          if(url.origin!==location.origin)return;
          e.preventDefault(); document.body.style.opacity='0.4'; setTimeout(()=>{location.href=url.href;},120);
        });
      })();
    </script>
  `;
}

module.exports = { renderNav };
