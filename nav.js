// nav.js — Albion v3 · Heraldická navigace

function renderNav(req, active) {
  const ic = req.session.icName;
  const skladPages = ['sklad','weed-sazeni'];
  const blackbookPages = ['blackbook','profit-centrum'];
  const infoPages  = ['nastenska','kodex','lore','hierarchy'];
  const dataPages  = ['audit','statistiky'];

  return `
    <nav>
      <a href="/home" class="nav-logo">
        <img src="/logo.png" class="nav-logo-img" alt="Albion">
        <span class="nav-logo-text">AL<span class="b-red">B</span>ION</span>
      </a>
      <button class="nav-burger" id="navBurger" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-menu" id="navMenu">
        <li><a href="/home" class="${active==='home'?'active':''}">Přehled<span class="nav-desc">Rejstřík</span></a></li>
        <li><a href="/garaz" class="${active==='garaz'?'active':''}">Garáž<span class="nav-desc">Vozový park</span></a></li>

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
        </li>

        <li class="nav-dropdown ${blackbookPages.includes(active)?'open':''}">
          <a href="/blackbook" class="nav-drop-trigger ${blackbookPages.includes(active)?'active':''}">
            Blackbook
            <span class="nav-desc">Reporty &amp; analýzy</span>
            <svg class="nav-drop-arrow" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="1 1 5 5 9 1"/></svg>
          </a>
          <div class="nav-dropdown-menu">
            <a href="/blackbook" class="${active==='blackbook'?'active':''}">Blackbook</a>
            <a href="/profit-centrum" class="${active==='profit-centrum'?'active':''}">Profit centrum</a>
          </div>
        </li>

        <li class="nav-dropdown ${dataPages.includes(active)?'open':''}">
          <a href="/audit" class="nav-drop-trigger ${dataPages.includes(active)?'active':''}">
            Záznamy
            <span class="nav-desc">Audit · Statistiky</span>
            <svg class="nav-drop-arrow" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="1 1 5 5 9 1"/></svg>
          </a>
          <div class="nav-dropdown-menu">
            <a href="/audit" class="${active==='audit'?'active':''}">Audit</a>
            <a href="/statistiky" class="${active==='statistiky'?'active':''}">Statistiky</a>
          </div>
        </li>

        <li class="nav-dropdown ${infoPages.includes(active)?'open':''}">
          <a href="#" class="nav-drop-trigger ${infoPages.includes(active)?'active':''}">
            Organizace
            <span class="nav-desc">Nástěnka · Kodex · Lore</span>
            <svg class="nav-drop-arrow" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="1 1 5 5 9 1"/></svg>
          </a>
          <div class="nav-dropdown-menu">
            <a href="/nastenska" class="${active==='nastenska'?'active':''}">Nástěnka</a>
            <a href="/kodex" class="${active==='kodex'?'active':''}">Kodex</a>
            <a href="/lore" class="${active==='lore'?'active':''}">Historie</a>
            <a href="/hierarchy" class="${active==='hierarchy'?'active':''}">Hierarchie</a>
          </div>
        </li>
      </ul>

      <div class="nav-right" id="navRight">
        <button class="notif-bell" id="notifBell" title="Oznámení" onclick="window.location='/nastenska'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span class="notif-badge" id="notifBadge">0</span>
        </button>
        <div class="theme-switcher" title="Přepnout vrstvu archivu">
          <button class="theme-dot-btn" id="td-dark"    style="background:#0B0F0D;border:1.5px solid #B68A4E" onclick="setTheme('dark')"    title="Heraldický noir"></button>
          <button class="theme-dot-btn" id="td-light"   style="background:#F3EEE3;border:1.5px solid #6E1423" onclick="setTheme('light')"   title="Pergamen"></button>
          <button class="theme-dot-btn" id="td-crystal" style="background:#070B10;border:1.5px solid #6FA8C9;box-shadow:0 0 6px rgba(111,168,201,0.5)" onclick="setTheme('crystal')" title="Šifrovaný kanál"></button>
        </div>
        <span class="nav-shortcut-hint" title="g+h Přehled · g+s Sklad · g+b Blackbook · g+a Audit · g+n Nástěnka · / Hledat">g·_</span>
        <span class="nav-user">člen &nbsp;<strong>${ic}</strong></span>
        <a href="/logout" class="nav-logout">Odejít</a>
      </div>
    </nav>
    <div class="nav-overlay" id="navOverlay"></div>

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
        trigger.addEventListener('click', (e) => {
          const href = trigger.getAttribute('href');
          if (href && href !== '#') {
            if (window.innerWidth <= 880) { e.preventDefault(); dd.classList.toggle('open'); return; }
            return;
          }
          e.preventDefault(); dd.classList.toggle('open');
        });
        dd.addEventListener('mouseenter', () => { if (window.innerWidth <= 880) return; clearTimeout(closeTimer); dd.classList.add('open'); });
        dd.addEventListener('mouseleave', () => { if (window.innerWidth <= 880) return; clearTimeout(closeTimer); closeTimer = setTimeout(() => dd.classList.remove('open'), 300); });
      });
      document.addEventListener('click', (e) => { if (!e.target.closest('.nav-dropdown')) document.querySelectorAll('.nav-dropdown').forEach(dd => dd.classList.remove('open')); });
      navMenu.querySelectorAll('a[href]:not([href="#"])').forEach(a => a.addEventListener('click', closeMobileNav));

      // ── TÉMATA ──
      const THEMES = ['dark','light','crystal'];
      let currentTheme = localStorage.getItem('albion_theme') || 'dark';
      function applyTheme(t) {
        THEMES.forEach(c => document.body.classList.remove(c));
        if (t !== 'dark') document.body.classList.add(t);
        currentTheme = t;
        localStorage.setItem('albion_theme', t);
        THEMES.forEach(th => {
          const btn = document.getElementById('td-' + th);
          if (btn) btn.classList.toggle('active', th === t);
        });
      }
      applyTheme(currentTheme);
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

      function showToast(msg, isError) {
        let t = document.getElementById('toast');
        if (!t) { t = document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
        t.textContent = msg;
        t.className = 'toast show' + (isError ? ' error' : '');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.className = 'toast', 3500);
      }
      window.showToast = showToast;

      window.ledgerEmptyHTML = function(text, compact) {
        return '<div class="ledger-empty' + (compact ? ' compact' : '') + '">' +
          '<svg viewBox="0 0 64 48" fill="none">' +
          '<rect x="3" y="2" width="58" height="44" rx="1" stroke="var(--border-brass)" stroke-width="1"/>' +
          '<line x1="12" y1="14" x2="44" y2="14" stroke="var(--border)" stroke-width="1"/>' +
          '<line x1="12" y1="22" x2="52" y2="22" stroke="var(--border)" stroke-width="1"/>' +
          '<line x1="12" y1="30" x2="38" y2="30" stroke="var(--border)" stroke-width="1"/>' +
          '<line x1="12" y1="38" x2="48" y2="38" stroke="var(--border)" stroke-width="1"/>' +
          '</svg><div class="ledger-empty-text">' + text + '</div></div>';
      };

      // ── KLÁVESOVÉ ZKRATKY ──
      (function(){
        const ROUTES = { h:'/home', s:'/sklad', b:'/blackbook', p:'/profit-centrum', a:'/audit', t:'/statistiky', n:'/nastenska', k:'/kodex', l:'/lore', o:'/hierarchy', w:'/weed-sazeni' };
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
