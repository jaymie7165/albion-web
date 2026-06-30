// nav.js — Albion v3 · Heraldická navigace

const { canAccess } = require('./roles');

function renderNav(req, active) {
  const ic = req.session.icName;
  const accessLevel = req.session.accessLevel || 3;
  const can = (pageId) => canAccess(accessLevel, pageId);
  const skladPages = ['sklad','weed-sazeni'];
  const blackbookPages = ['blackbook','profit-centrum'];
  const infoPages  = ['nastenska','kodex','lore','hierarchy','leaderboard','galerie'];
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
          <a href="#" class="nav-drop-trigger ${infoPages.includes(active)?'active':''}">
            Organizace
            <span class="nav-desc">Nástěnka · Kodex · Lore</span>
            <svg class="nav-drop-arrow" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="1 1 5 5 9 1"/></svg>
          </a>
          <div class="nav-dropdown-menu">
            ${can('nastenska') ? `<a href="/nastenska" class="${active==='nastenska'?'active':''}">Nástěnka</a>` : ''}
            <a href="/kodex" class="${active==='kodex'?'active':''}">Kodex</a>
            <a href="/lore" class="${active==='lore'?'active':''}">Historie</a>
            <a href="/hierarchy" class="${active==='hierarchy'?'active':''}">Hierarchie</a>
            <a href="/leaderboard" class="${active==='leaderboard'?'active':''}">Aktivita</a>
            ${!req.session.isAssociate ? `<a href="/galerie" class="${active==='galerie'?'active':''}">Galerie</a>` : ''}
          </div>
        </li>
      </ul>

      <div class="nav-right" id="navRight">
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
          <button class="theme-dot-btn" id="td-dark"  style="background:#0B0F0D;border:1.5px solid #B68A4E" onclick="setTheme('dark')"  title="Heraldický noir"></button>
          <button class="theme-dot-btn" id="td-light" style="background:#F3EEE3;border:1.5px solid #6E1423" onclick="setTheme('light')" title="Pergamen"></button>
        </div>
        <span class="nav-shortcut-hint" title="g+h Přehled${can('sklad')?' · g+s Sklad':''}${can('blackbook')?' · g+b Blackbook':''}${can('audit')?' · g+a Audit':''}${can('nastenska')?' · g+n Nástěnka':''} · / Hledat">g·_</span>
        <span class="nav-user" style="border-left:2px solid ${({1:'var(--oxblood-bright)',2:'var(--brass-bright)',3:'var(--ivory-faint)'})[accessLevel]||'var(--ivory-faint)'};padding-left:0.6rem">člen &nbsp;<strong>${ic}</strong></span>
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
      const THEMES = ['dark','light'];
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

      // ── SEZÓNNÍ VZHLED ──
      fetch('/api/season').then(r=>r.json()).then(d=>{
        if(d.season && d.season!=='none') document.body.classList.add('season-'+d.season);
      }).catch(()=>{});
      window.evtSource && window.evtSource.addEventListener('seasonChange', (e)=>{
        const d=JSON.parse(e.data);
        ['vanoce','halloween','novy-rok'].forEach(s=>document.body.classList.remove('season-'+s));
        if(d.season!=='none') document.body.classList.add('season-'+d.season);
      });

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
