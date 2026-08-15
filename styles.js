// styles.js — Albion v5 · "Crimson & Cream" — redesign
// Paleta vychází z reálné identity organizace (auta, merch): vínová/crimson
// (#DC143C) + krémová NavajoWhite (#FFDEAD) na tmavém pozadí. Zachovává
// VŠECHNY původní CSS proměnné a třídy 1:1 (jen s novými hodnotami + pár
// novými pravidly na konci), takže žádná stávající stránka nepotřebuje úpravu
// — zdědí nový vzhled automaticky přes styles.js a nav.js.
 
const LEDGER_EMPTY_ICONS = {
  default: `<rect x="3" y="2" width="58" height="44" rx="1" stroke="var(--border-brass)" stroke-width="1"/>
    <line x1="12" y1="14" x2="44" y2="14" stroke="var(--border)" stroke-width="1"/>
    <line x1="12" y1="22" x2="52" y2="22" stroke="var(--border)" stroke-width="1"/>
    <line x1="12" y1="30" x2="38" y2="30" stroke="var(--border)" stroke-width="1"/>
    <line x1="12" y1="38" x2="48" y2="38" stroke="var(--border)" stroke-width="1"/>`,
  photo: `<rect x="3" y="2" width="58" height="44" rx="1" stroke="var(--border-brass)" stroke-width="1"/>
    <circle cx="18" cy="16" r="5" stroke="var(--border)" stroke-width="1"/>
    <path d="M6 38 L22 24 L34 34 L44 22 L58 36" stroke="var(--border)" stroke-width="1" fill="none"/>`,
  people: `<circle cx="24" cy="16" r="7" stroke="var(--border-brass)" stroke-width="1"/>
    <path d="M10 40c0-8 6-13 14-13s14 5 14 13" stroke="var(--border)" stroke-width="1" fill="none"/>
    <circle cx="46" cy="18" r="5" stroke="var(--border)" stroke-width="1"/>
    <path d="M38 40c0-6 4-10 10-10" stroke="var(--border)" stroke-width="1" fill="none"/>`,
  stock: `<rect x="4" y="18" width="14" height="24" stroke="var(--border-brass)" stroke-width="1"/>
    <rect x="21" y="10" width="14" height="32" stroke="var(--border)" stroke-width="1"/>
    <rect x="38" y="24" width="14" height="18" stroke="var(--border)" stroke-width="1"/>`,
};
 
function ledgerEmpty(text, compact, variant) {
  return `<div class="ledger-empty${compact ? ' compact' : ''}">
    <svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      ${LEDGER_EMPTY_ICONS[variant] || LEDGER_EMPTY_ICONS.default}
    </svg>
    <div class="ledger-empty-text">${text}</div>
  </div>`;
}
 
function baseStyles() {
  return `
    <link rel="icon" type="image/png" href="/logo.png">
    <link rel="apple-touch-icon" href="/logo.png">
    <link rel="manifest" href="/manifest.webmanifest">
    <meta name="theme-color" content="#0B0607">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;0,6..96,700;0,6..96,800;0,6..96,900;1,6..96,500;1,6..96,600;1,6..96,700&family=Cinzel:wght@400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
 
      :root{
        /* ══════════════════════════════════════════════════════════════
           CRIMSON & CREAM — 2026 redesign · aktivní paleta
           Vínová/crimson (#DC143C) + krémová NavajoWhite (#FFDEAD), stejná
           dvojice barev jako na vozech a merchi organizace.
           ══════════════════════════════════════════════════════════════ */
        --noir:#0B0607;
        --panel:#150F10;
        --panel2:#1B1314;
        --panel3:#221819;
        --panel4:#2B1E20;
        --emerald-deep:#12160E;
        --oxblood:#7A0E24;
        --oxblood-bright:#DC143C;
        --oxblood-glow:rgba(220,20,60,0.35);
        --oxblood-faint:rgba(220,20,60,0.12);
        --brass:#C9A671;
        --brass-bright:#FFDEAD;
        --brass-dim:rgba(255,222,173,0.22);
        --brass-faint:rgba(255,222,173,0.08);
        --brass-line:rgba(255,222,173,0.32);
        --ivory:#F6EEE4;
        --ivory-dim:#C9BBAD;
        --ivory-faint:#8C7C6E;
        --border:rgba(255,222,173,0.13);
        --border-hover:rgba(255,222,173,0.30);
        --border-brass:rgba(255,222,173,0.26);
        --border-oxblood:rgba(220,20,60,0.42);
        --input-bg:rgba(9,6,7,0.85);
        --shadow:0 24px 64px rgba(0,0,0,0.82);
        --shadow-card:0 4px 24px rgba(0,0,0,0.55);
        --nav-h:64px;
        --sidebar-w:252px;
        /* Fonty */
        --font-display:'Bodoni Moda',serif;
        --font-label:'Cinzel',serif;
        --font-body:'Jost',sans-serif;
        --font-mono:'Space Mono',monospace;
 
        /* ══════════════════════════════════════════════════════════════
           SEKCE B — LEGACY ALIASY (zpětná kompatibilita)
           Beze změny struktury — hodnoty se přeberou ze sekce A výše, takže
           žádný starší view soubor nepotřebuje úpravu.
           ══════════════════════════════════════════════════════════════ */
        --ink:var(--noir);
        --ink-soft:var(--panel);
        --leather:var(--panel);
        --leather2:var(--panel2);
        --leather3:var(--panel3);
        --leather4:var(--panel4);
        --seal:var(--oxblood);
        --seal-bright:var(--oxblood-bright);
        --seal-glow:var(--oxblood-glow);
        --seal-deep:#3A0812;
        --blood:var(--oxblood-bright);
        --blood-glow:var(--oxblood-glow);
        --vellum:var(--ivory);
        --vellum-bright:var(--ivory);
        --text:var(--ivory);
        --text-dim:var(--ivory-dim);
        --text-muted:var(--ivory-faint);
        --text-label:var(--ivory-faint);
        --gold-dim:var(--brass-faint);
        --true-gold:var(--brass);
        --silver:var(--ivory-dim);
        --silver-dim:rgba(255,222,173,0.07);
        --silver-bright:var(--ivory);
        --bg:var(--noir);
        --bg-soft:var(--panel);
        --bg-mid:var(--panel2);
        --bg-card:var(--panel2);
        --bg-card2:var(--panel3);
        --bg-card3:var(--panel4);
        --gold:var(--brass);
        --border-silver:var(--border);
        --border-gold:var(--border-oxblood);
        --crimson:var(--oxblood);
        --crimson-light:var(--oxblood-bright);
        --crimson-glow:var(--oxblood-glow);
        --crimson-bright:var(--oxblood-bright);
        --money:#4CAF6D;
      }
 
      /* ── SVĚTLÝ REŽIM — Krémový pergamen (NavajoWhite) ── */
      body.light{
        --noir:#FBF3E4;
        --panel:#F3E6CD;
        --panel2:#ECDBB9;
        --panel3:#E3CDA0;
        --panel4:#D7BC87;
        --oxblood:#7A0E24;
        --oxblood-bright:#B0102E;
        --oxblood-glow:rgba(176,16,46,0.18);
        --oxblood-faint:rgba(176,16,46,0.08);
        --brass:#8A6A34;
        --brass-bright:#6B4F1F;
        --brass-dim:rgba(138,106,52,0.25);
        --brass-faint:rgba(138,106,52,0.10);
        --ivory:#241A12;
        --ivory-dim:#4A3A2A;
        --ivory-faint:#6B5A46;
        --border:rgba(138,106,52,0.20);
        --border-hover:rgba(138,106,52,0.40);
        --border-brass:rgba(138,106,52,0.35);
        --border-oxblood:rgba(176,16,46,0.30);
        --input-bg:rgba(255,251,244,0.92);
        --shadow:0 8px 32px rgba(0,0,0,0.14);
        --shadow-card:0 2px 12px rgba(0,0,0,0.09);
        background:var(--noir);
        color:var(--ivory);
      }
      body.light::before{
        background:
          radial-gradient(ellipse 70% 50% at 50% 0%, rgba(138,106,52,0.07), transparent 60%),
          radial-gradient(ellipse 60% 60% at 100% 100%, rgba(176,16,46,0.05), transparent 60%);
      }
      body.light::after{box-shadow:inset 0 0 18vw rgba(0,0,0,0.05)}
      body.light .app-topbar{background:rgba(243,230,205,0.97)}
      body.light .app-sidebar{background:var(--panel)}
      body.light select,body.light input[type=text],body.light input[type=number],body.light input[type=date],body.light input[type=password],body.light textarea{
        background:var(--input-bg);color:var(--ivory);
      }
      body.light .card,body.light .panel-card,body.light .dash-widget,body.light .dash-stat-card{background:var(--panel2)}
      body.light .modal-box{background:var(--panel2)}
      body.light ::-webkit-scrollbar-track{background:var(--panel)}
      body.light ::-webkit-scrollbar-thumb{background:var(--oxblood)}
 
      html{scroll-behavior:smooth}
      body{
        background:var(--noir);
        color:var(--ivory);
        font-family:var(--font-body);
        font-weight:300;
        font-size:15px;
        line-height:1.65;
        min-height:100vh;
        overflow-x:hidden;
        position:relative;
        animation:pageFadeIn 0.5s ease-out;
      }
 
      /* Jemný "živý" ambient — velmi pomalu driftující gradienty, ať appka
         nepůsobí staticky ani v klidu (bez zásahu do výkonu — čistě CSS). */
      body::before{
        content:'';position:fixed;inset:-10%;z-index:0;pointer-events:none;
        background:
          radial-gradient(ellipse 55% 40% at 30% 10%, rgba(255,222,173,0.055), transparent 60%),
          radial-gradient(ellipse 50% 50% at 90% 90%, rgba(220,20,60,0.09), transparent 55%),
          radial-gradient(ellipse 40% 35% at 75% 15%, rgba(220,20,60,0.05), transparent 60%);
        background-size:140% 140%;
        animation:ambientDrift 34s ease-in-out infinite alternate;
      }
      @keyframes ambientDrift{
        0%{background-position:0% 0%,100% 100%,100% 0%}
        100%{background-position:8% 10%,92% 88%,88% 12%}
      }
      body::after{
        content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
        box-shadow:inset 0 0 16vw rgba(0,0,0,0.65);
      }
 
      @keyframes pageFadeIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeReveal{0%{opacity:0;transform:translateY(4px)}100%{opacity:1;transform:translateY(0)}}
      .glitch-in{animation:fadeReveal 0.6s ease-out 1}
 
      /* ── ODMĚNA ZA ZÁPIS — krátký "živý" pulz kolem karty po úspěšné akci ── */
      @keyframes rewardPulse{
        0%{box-shadow:0 0 0 0 rgba(76,175,109,0.45)}
        60%{box-shadow:0 0 0 14px rgba(76,175,109,0)}
        100%{box-shadow:0 0 0 0 rgba(76,175,109,0)}
      }
      .reward-flash{animation:rewardPulse 0.9s ease-out 1}
      @keyframes rewardPop{
        0%{transform:scale(1)}
        35%{transform:scale(1.035)}
        100%{transform:scale(1)}
      }
      .reward-pop{animation:rewardPop 0.4s cubic-bezier(.34,1.56,.64,1) 1}
 
      ::-webkit-scrollbar{width:4px;height:4px}
      ::-webkit-scrollbar-track{background:var(--panel)}
      ::-webkit-scrollbar-thumb{background:var(--oxblood);border-radius:2px}
      ::-webkit-scrollbar-thumb:hover{background:var(--oxblood-bright)}
 
      /* ══════════════════════════════════════════════════════════════
         TOP BAR — jediný čistý pruh: logo · 6 sekcí · nástroje
         ══════════════════════════════════════════════════════════════ */
      .app-topbar{
        background:rgba(11,6,7,0.94);
        border-bottom:1px solid var(--border-brass);
        padding:0 1.8rem;
        display:flex;align-items:center;justify-content:space-between;gap:1.2rem;
        position:sticky;top:0;z-index:200;
        height:var(--nav-h);
        backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
      }
      .app-topbar::after{
        content:'';position:absolute;left:0;right:0;bottom:-1px;height:1px;
        background:linear-gradient(90deg,transparent,var(--oxblood) 15%,var(--brass) 50%,var(--oxblood) 85%,transparent);
        opacity:0.65;
      }
      .topbar-left{display:flex;align-items:center;gap:0.9rem;flex-shrink:0}
      .nav-logo{
        font-family:var(--font-label);letter-spacing:0.2em;font-size:1rem;font-weight:600;
        text-transform:uppercase;text-decoration:none;color:var(--ivory);
        display:flex;align-items:center;gap:0.75rem;flex-shrink:0;transition:opacity 0.2s;
      }
      .nav-logo:hover{opacity:0.82}
      .nav-logo-img{width:30px;height:30px;object-fit:contain;filter:drop-shadow(0 0 8px rgba(255,222,173,0.4));transition:transform .3s}
      .nav-logo:hover .nav-logo-img{transform:scale(1.05)}
      .nav-logo-text .b-red{color:var(--oxblood-bright)}
      .topbar-portal{
        display:flex;align-items:center;justify-content:center;width:26px;height:26px;
        border:1px solid var(--border-brass);color:var(--brass);flex-shrink:0;text-decoration:none;
        transition:border-color .2s,color .2s;
      }
      .topbar-portal:hover{border-color:var(--brass-bright);color:var(--brass-bright)}
      .topbar-portal svg{width:13px;height:13px}
 
      .topbar-groups{display:flex;align-items:stretch;gap:0.1rem;height:100%;overflow-x:auto;flex:1;justify-content:center}
      .topbar-group{
        display:flex;align-items:center;height:100%;padding:0 1.05rem;position:relative;
        font-family:var(--font-label);font-size:0.64rem;letter-spacing:0.16em;text-transform:uppercase;font-weight:600;
        color:var(--ivory-faint);text-decoration:none;white-space:nowrap;transition:color .2s;
      }
      .topbar-group:hover{color:var(--ivory)}
      .topbar-group.active{color:var(--brass-bright)}
      .topbar-group.active::after{
        content:'';position:absolute;left:0.9rem;right:0.9rem;bottom:0;height:2px;
        background:var(--oxblood-bright);box-shadow:0 0 10px var(--oxblood-glow);
      }
 
      .topbar-right{display:flex;align-items:center;gap:0.7rem;flex-shrink:0}
      .nav-user{font-size:0.66rem;color:var(--ivory-faint);letter-spacing:0.04em;white-space:nowrap;font-family:var(--font-mono)}
      .nav-user strong{color:var(--ivory);font-weight:400;font-family:var(--font-label);letter-spacing:0.06em}
      .nav-logout{
        font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.16em;text-transform:uppercase;font-weight:500;
        color:var(--oxblood-bright);text-decoration:none;padding:0.4rem 0.85rem;
        border:1px solid var(--border-oxblood);transition:all 0.2s;
      }
      .nav-logout:hover{background:var(--oxblood-faint);border-color:var(--oxblood)}
      .nav-shortcut-hint{
        font-family:var(--font-mono);font-size:0.58rem;letter-spacing:0.04em;
        color:var(--ivory-faint);border:1px solid var(--border);
        padding:0.2rem 0.5rem;cursor:default;opacity:0.5;transition:opacity 0.2s;flex-shrink:0;
      }
      .nav-shortcut-hint:hover{opacity:0.9}
      @media(max-width:1200px){.nav-shortcut-hint{display:none}}
 
      .notif-bell{position:relative;cursor:pointer;background:none;border:none;color:var(--ivory-faint);padding:0.3rem;transition:color 0.2s;display:flex;align-items:center}
      .notif-bell svg{width:17px;height:17px}
      .notif-bell:hover{color:var(--brass-bright)}
      .notif-badge{position:absolute;top:-3px;right:-5px;background:var(--oxblood);color:var(--ivory);font-size:0.5rem;min-width:14px;height:14px;border-radius:7px;display:none;align-items:center;justify-content:center;padding:0 3px;font-weight:700}
      .notif-badge.visible{display:flex}
 
      .nav-burger{display:none;flex-direction:column;justify-content:center;gap:5px;width:32px;height:32px;background:none;border:1px solid var(--border-brass);cursor:pointer;flex-shrink:0;padding:0;align-items:center}
      .nav-burger span{display:block;width:16px;height:1px;background:var(--brass);transition:transform 0.25s,opacity 0.2s}
      .nav-burger.open span:nth-child(1){transform:translateY(6px) rotate(45deg)}
      .nav-burger.open span:nth-child(2){opacity:0}
      .nav-burger.open span:nth-child(3){transform:translateY(-6px) rotate(-45deg)}
 
      .theme-switcher{display:flex;align-items:center;gap:6px}
      .theme-dot-btn{width:12px;height:12px;border-radius:50%;border:1.5px solid transparent;cursor:pointer;transition:transform 0.18s,border-color 0.18s;flex-shrink:0;outline:none;padding:0}
      .theme-dot-btn:hover{transform:scale(1.3)}
      .theme-dot-btn.active{border-color:var(--ivory)!important}
      .theme-switcher-label{font-family:var(--font-label);font-size:0.5rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--ivory-faint);margin-right:0.2rem}
      @media(max-width:1300px){.theme-switcher-label{display:none}}
 
      .ambient-btn{width:18px;height:18px;border:1px solid var(--border-brass);background:none;color:var(--brass);font-size:0.6rem;display:flex;align-items:center;justify-content:center;cursor:pointer}
      .ambient-btn.active{color:var(--brass-bright);border-color:var(--brass-bright);box-shadow:0 0 6px var(--oxblood-glow)}
 
      /* ── MOBILE DRAWER ── */
      .nav-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:190;opacity:0;pointer-events:none;transition:opacity 0.25s;backdrop-filter:blur(4px)}
      body.nav-locked{overflow:hidden}
      body.nav-locked .nav-overlay{opacity:1;pointer-events:all}
      .mobile-drawer{
        display:none;flex-direction:column;gap:0;
        position:fixed;top:var(--nav-h);left:0;right:0;bottom:0;
        background:rgba(11,6,7,0.98);border-top:1px solid var(--border-brass);
        padding:0.5rem 0 1rem;overflow-y:auto;z-index:195;
        transform:translateY(-8px);opacity:0;pointer-events:none;
        transition:opacity 0.2s,transform 0.2s;
      }
      .mobile-drawer.mobile-open{display:flex;opacity:1;pointer-events:all;transform:translateY(0)}
      .mobile-drawer .md-group-label{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--brass);padding:0.9rem 1.4rem 0.4rem}
      .mobile-drawer a{display:block;padding:0.75rem 1.4rem;font-family:var(--font-display);font-style:italic;font-size:0.94rem;color:var(--ivory-dim);text-decoration:none;border-bottom:1px solid var(--border)}
      .mobile-drawer a.active{color:var(--brass-bright)}
      .mobile-drawer .md-utility{display:flex;flex-wrap:wrap;gap:0.7rem 0.9rem;padding:1.1rem 1.4rem 0.4rem;border-top:1px solid var(--border);margin-top:0.6rem}
 
      @media(min-width:901px){.nav-overlay,body.nav-locked .nav-overlay{display:none}}
      @media(max-width:900px){
        .nav-burger{display:flex}
        .app-topbar{padding:0 1rem}
        .topbar-groups,.topbar-right{display:none}
      }
 
      /* ══════════════════════════════════════════════════════════════
         CONTEXTUAL SIDEBAR — vlevo, dle aktivní sekce (Evidence, Finance…)
         ══════════════════════════════════════════════════════════════ */
      .app-sidebar{
        position:fixed;left:0;top:var(--nav-h);bottom:0;width:var(--sidebar-w);
        background:var(--panel);border-right:1px solid var(--border);
        padding:1.7rem 0.9rem 2rem;overflow-y:auto;z-index:120;
      }
      .app-sidebar .sb-eyebrow{font-family:var(--font-label);font-size:0.52rem;letter-spacing:0.24em;text-transform:uppercase;color:var(--brass);padding:0 0.7rem;margin-bottom:1.1rem}
      .app-sidebar .sb-link{
        display:flex;flex-direction:column;gap:0.15rem;padding:0.72rem 0.8rem;
        color:var(--ivory-dim);text-decoration:none;border-left:2px solid transparent;
        transition:background .15s,border-color .15s,color .15s;margin-bottom:0.1rem;
      }
      .app-sidebar .sb-link:hover{background:var(--brass-faint);color:var(--ivory)}
      .app-sidebar .sb-link.active{background:var(--oxblood-faint);border-left-color:var(--oxblood-bright)}
      .app-sidebar .sb-link .sb-name{font-family:var(--font-display);font-style:italic;font-weight:600;font-size:0.94rem;color:var(--ivory)}
      .app-sidebar .sb-link.active .sb-name{color:var(--brass-bright)}
      .app-sidebar .sb-link .sb-sub{font-family:var(--font-mono);font-size:0.6rem;color:var(--ivory-faint);letter-spacing:0.02em}
      .app-sidebar .sb-divider{height:1px;background:var(--border);margin:1rem 0.7rem}
 
      .app-sidebar ~ main{margin-left:var(--sidebar-w);max-width:calc(1480px + var(--sidebar-w))}
      @media(max-width:980px){
        .app-sidebar{display:none}
        .app-sidebar ~ main{margin-left:0;max-width:1480px}
      }
 
      /* ══════════════════════════════════════════════
         LAYOUT
         ══════════════════════════════════════════════ */
      main{max-width:1480px;margin:0 auto;padding:2.6rem 2rem 6rem;position:relative;z-index:1}
 
      .page-header{
        margin-bottom:2.6rem;padding-bottom:1.7rem;border-bottom:1px solid var(--border-brass);
        position:relative;display:flex;align-items:flex-end;justify-content:space-between;gap:2rem;
      }
      .page-label{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.3em;text-transform:uppercase;color:var(--brass);margin-bottom:0.9rem;font-weight:500}
      .page-title{font-family:var(--font-display);font-size:clamp(2.1rem,4.4vw,3.1rem);color:var(--ivory);font-weight:700;font-style:italic;letter-spacing:0.01em;line-height:1.0}
      .page-title::after{content:'';display:block;width:44px;height:2px;margin-top:0.75rem;background:linear-gradient(90deg,var(--oxblood),var(--brass))}
      .page-sub{font-family:var(--font-body);color:var(--ivory-faint);margin-top:0.65rem;font-size:0.92rem}
 
      .folio-footnote{
        font-family:var(--font-body);font-size:0.86rem;color:var(--ivory-dim);line-height:1.9;
        max-width:660px;margin:0 0 2.2rem;padding-left:1rem;border-left:1px solid var(--brass-dim);
      }
      .folio-footnote strong{color:var(--brass-bright);font-weight:500}
 
      /* ══════════════════════════════════════════════
         CARDS
         ══════════════════════════════════════════════ */
      .card{
        background:var(--panel2);border:1px solid var(--border);padding:1.7rem;
        transition:border-color 0.2s,box-shadow 0.2s;box-shadow:var(--shadow-card);
        position:relative;overflow:hidden;border-radius:2px;
      }
      .card::before{content:'';position:absolute;top:0;left:0;width:15px;height:15px;border-top:1px solid var(--brass-dim);border-left:1px solid var(--brass-dim)}
      .card::after{content:'';position:absolute;bottom:0;right:0;width:15px;height:15px;border-bottom:1px solid var(--brass-dim);border-right:1px solid var(--brass-dim)}
      .card:hover{border-color:var(--border-brass);box-shadow:0 8px 40px rgba(0,0,0,0.6)}
      .card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.3rem;padding-bottom:0.9rem;border-bottom:1px solid var(--border)}
      .card-title{font-family:var(--font-label);font-size:0.76rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--ivory);font-weight:500;display:flex;align-items:center;gap:0.6rem}
      .card-badge{font-family:var(--font-mono);font-size:0.55rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:400;color:var(--ivory-faint);background:var(--brass-faint);padding:0.2rem 0.6rem;border:1px solid var(--border-brass)}
 
      /* ══════════════════════════════════════════════
         FORMS
         ══════════════════════════════════════════════ */
      .form-section{margin-top:1.5rem;padding-top:1.3rem;border-top:1px solid var(--border)}
      .form-row{display:grid;grid-template-columns:1fr 1fr;gap:0.85rem;margin-bottom:0.85rem}
      .form-group{display:flex;flex-direction:column;gap:0.42rem}
      label{font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--brass);font-weight:500}
      select,input[type=text],input[type=number],input[type=password],input[type=date],textarea{
        background:var(--input-bg);border:1px solid var(--border-brass);color:var(--ivory);
        padding:0.72rem 0.95rem;font-family:var(--font-body);font-size:0.88rem;font-weight:300;
        width:100%;outline:none;transition:border-color 0.15s,box-shadow 0.15s;
        appearance:none;-webkit-appearance:none;border-radius:1px;
      }
      textarea{resize:vertical;min-height:100px}
      select:focus,input:focus,textarea:focus{border-color:var(--brass);box-shadow:0 0 0 2px var(--brass-faint)}
      select option{background:var(--panel2)}
      .btn-submit{
        background:transparent;color:var(--ivory);border:1px solid var(--oxblood);padding:0.85rem 1.4rem;
        font-family:var(--font-label);font-size:0.62rem;letter-spacing:0.2em;text-transform:uppercase;font-weight:500;
        cursor:pointer;width:100%;margin-top:0.6rem;transition:background 0.15s,border-color 0.15s,box-shadow 0.15s;
      }
      .btn-submit:hover{background:var(--oxblood);border-color:var(--oxblood);box-shadow:0 0 24px var(--oxblood-glow)}
 
      .typ-toggle{display:flex;gap:0.4rem;margin-bottom:1rem}
      .typ-btn{flex:1;padding:0.6rem;background:transparent;border:1px solid var(--border);color:var(--ivory-faint);font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.14em;text-transform:uppercase;font-weight:500;cursor:pointer;transition:color 0.15s,border-color 0.15s,background 0.15s}
      .typ-btn:hover{color:var(--ivory);border-color:var(--border-brass)}
      .typ-btn.active-vklad{background:rgba(76,175,109,0.10);border-color:rgba(76,175,109,0.35);color:#7BD69B}
      .typ-btn.active-vyber{background:var(--oxblood-faint);border-color:var(--border-oxblood);color:var(--oxblood-bright)}
 
      .info-box{background:var(--brass-faint);border:1px solid var(--border-brass);padding:0.85rem 1.1rem;font-size:0.82rem;color:var(--ivory-dim);margin-top:0.9rem;display:none;font-family:var(--font-mono)}
 
      /* ══════════════════════════════════════════════
         STAT STRIP (legado)
         ══════════════════════════════════════════════ */
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border-brass);margin-bottom:2rem}
      .stat{background:var(--panel2);padding:1.7rem 1.5rem;text-align:center;transition:background 0.25s;border-top:2px solid transparent;position:relative}
      .stat:hover{background:var(--panel3);border-top-color:var(--brass)}
      .stat-label{font-family:var(--font-label);font-size:0.55rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--brass);margin-bottom:0.75rem}
      .stat-value{font-family:var(--font-display);font-size:1.9rem;font-weight:700;color:var(--ivory);line-height:1;font-style:italic}
      .stat-sub{font-family:var(--font-mono);font-size:0.6rem;color:var(--ivory-faint);margin-top:0.5rem;letter-spacing:0.04em}
 
      /* ══════════════════════════════════════════════
         SKLAD (legacy row style, beze změny struktury)
         ══════════════════════════════════════════════ */
      .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem}
      .sklad-row{display:flex;justify-content:space-between;align-items:center;padding:0.68rem 0;border-bottom:1px solid var(--border);font-size:0.87rem;transition:background 0.15s,padding 0.15s}
      .sklad-row:last-child{border-bottom:none}
      .sklad-row:hover{background:var(--oxblood-faint);margin:0 -0.5rem;padding-left:0.5rem;padding-right:0.5rem}
      .sklad-row em{color:var(--brass);font-style:normal;margin-left:0.5rem;font-size:0.7rem;opacity:0.9;font-family:var(--font-mono)}
 
      /* ══════════════════════════════════════════════
         TOAST
         ══════════════════════════════════════════════ */
      .toast{
        position:fixed;bottom:1.5rem;right:1.5rem;display:flex;align-items:flex-start;gap:0.85rem;
        background:linear-gradient(160deg,var(--panel3),var(--panel2));border:1px solid var(--border-brass);
        border-left:3px solid #4CAF6D;padding:0.9rem 1.3rem;transform:translateY(24px) scale(0.97);opacity:0;
        transition:transform 0.3s cubic-bezier(.22,1,.36,1),opacity 0.3s ease;z-index:999;max-width:360px;
        box-shadow:var(--shadow),0 0 0 1px rgba(255,222,173,0.06);pointer-events:none;
      }
      .toast.show{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}
      .toast.error{border-left-color:var(--oxblood-bright)}
      .toast-icon{flex:none;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-family:var(--font-label);background:rgba(76,175,109,0.14);color:#9BE0B3;border:1px solid rgba(76,175,109,0.35);margin-top:0.05rem}
      .toast.error .toast-icon{background:var(--oxblood-faint);color:var(--oxblood-bright);border-color:var(--border-oxblood)}
      .toast-body{display:flex;flex-direction:column;gap:0.15rem;min-width:0}
      .toast-title{font-family:var(--font-label);font-size:0.66rem;letter-spacing:0.09em;text-transform:uppercase;color:var(--brass-bright)}
      .toast.error .toast-title{color:var(--oxblood-bright)}
      .toast-msg{font-family:var(--font-body);font-size:0.82rem;color:var(--text);line-height:1.35;word-break:break-word}
 
      /* ══════════════════════════════════════════════
         TABULKY
         ══════════════════════════════════════════════ */
      .table-wrap{overflow-x:auto}
      table{width:100%;border-collapse:collapse;font-size:0.86rem;border-top:1px solid var(--border-brass);border-bottom:1px solid var(--border-brass)}
      th{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.16em;text-transform:uppercase;font-weight:500;color:var(--brass);padding:0.72rem 1rem;text-align:left;border-bottom:1px solid var(--border-brass);background:transparent}
      th + th{border-left:1px solid var(--border)}
      td{padding:0.66rem 1rem;border-bottom:1px solid var(--border);color:var(--ivory-dim);font-size:0.86rem}
      td + td{border-left:1px solid var(--border)}
      tr:last-child td{border-bottom:none}
      tr:hover td{background:var(--brass-faint);color:var(--ivory)}
      .badge{font-family:var(--font-label);font-size:0.56rem;padding:0.2rem 0.65rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:500}
      .badge.vklad,.badge.prijem{background:rgba(76,175,109,0.10);color:#7BD69B;border:1px solid rgba(76,175,109,0.28)}
      .badge.vyber,.badge.vydaj{background:var(--oxblood-faint);color:var(--oxblood-bright);border:1px solid var(--border-oxblood)}
 
      /* ══════════════════════════════════════════════
         NÁSTĚNKA
         ══════════════════════════════════════════════ */
      .nastenska-list{display:flex;flex-direction:column;gap:1rem}
      .nastenska-item{background:var(--panel2);border:1px solid var(--border);border-left:2px solid var(--border-brass);padding:1.5rem 1.8rem;transition:border-color 0.2s;position:relative;overflow:hidden}
      .nastenska-item:hover{border-left-color:var(--brass)}
      .nastenska-item.new{border-left-color:var(--oxblood-bright);box-shadow:0 0 0 1px var(--border-oxblood)}
      .nastenska-meta{font-family:var(--font-mono);font-size:0.64rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--ivory-faint);margin-bottom:0.6rem}
      .nastenska-title{font-family:var(--font-display);font-size:1.1rem;margin-bottom:0.55rem;color:var(--ivory);font-weight:600;font-style:italic}
      .nastenska-content{font-size:0.92rem;color:var(--ivory-dim);line-height:1.85;white-space:pre-wrap}
      .new-badge{display:inline-block;font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.1em;text-transform:uppercase;background:var(--oxblood);color:var(--ivory);padding:0.16rem 0.55rem;margin-left:0.55rem;vertical-align:middle;font-weight:500}
 
      /* ══════════════════════════════════════════════
         LORE / KODEX / HIERARCHY
         ══════════════════════════════════════════════ */
      .lore-grid{display:grid;grid-template-columns:1fr 300px;gap:0;align-items:start}
      .chapters{display:flex;flex-direction:column;gap:3rem;padding-right:3rem}
      .chapter{border-left:1px solid var(--border-brass);padding-left:2rem;position:relative;transition:border-color 0.3s}
      .chapter:hover{border-left-color:var(--brass)}
      .chapter::before{content:'';position:absolute;left:-4px;top:4px;width:7px;height:7px;background:var(--oxblood);opacity:0.7;transition:opacity 0.2s}
      .chapter:hover::before{opacity:1}
      .chapter-meta{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.28em;text-transform:uppercase;color:var(--brass);margin-bottom:0.8rem;font-weight:500}
      .chapter-title{font-family:var(--font-display);font-size:1.5rem;color:var(--ivory);margin-bottom:1.1rem;font-weight:600;font-style:italic}
      .chapter-text{font-family:var(--font-body);font-size:0.95rem;line-height:2.05;color:var(--ivory-dim);white-space:pre-line}
      .chapter-text.with-dropcap::first-letter{font-family:var(--font-display);font-weight:700;font-size:3.5em;line-height:0.8;float:left;padding:0.06em 0.12em 0 0;color:var(--brass)}
      .sidebar{background:var(--panel2);border:1px solid var(--border-brass);padding:2rem;position:sticky;top:calc(var(--nav-h) + 1.5rem);box-shadow:var(--shadow-card);margin-left:1.6rem}
      .sidebar-title{font-family:var(--font-label);font-size:0.62rem;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid var(--border-brass);color:var(--brass)}
      .toc-item{font-family:var(--font-body);font-size:0.84rem;padding:0.65rem 0;border-bottom:1px solid var(--border);color:var(--ivory-dim);display:flex;gap:0.8rem;align-items:center;transition:color 0.2s;cursor:default}
      .toc-item:last-child{border-bottom:none}
      .toc-item:hover{color:var(--ivory)}
      .toc-num{font-family:var(--font-label);color:var(--brass);font-weight:600;min-width:1.6rem;font-size:0.78rem;letter-spacing:0.1em}
 
      .rank-list{}
      .rank-item{display:flex;align-items:flex-start;gap:1.5rem;padding:1.8rem 2rem;background:var(--panel2);border:1px solid var(--border);border-top:none;transition:background 0.2s;position:relative}
      .rank-item:first-child{border-top:1px solid var(--border)}
      .rank-item::before{content:'';position:absolute;left:0;top:0;bottom:0;width:1px;background:var(--oxblood);opacity:0;transition:opacity 0.2s}
      .rank-item:hover::before{opacity:1}
      .rank-item:hover{background:var(--panel3)}
      .rank-item.founder{border:1px solid var(--border-brass)!important;background:radial-gradient(ellipse 80% 100% at 0% 0%, rgba(220,20,60,0.18) 0%, var(--panel3) 60%);padding:2.4rem 2.4rem;margin-bottom:0.6rem}
      .rank-item.founder::before{opacity:1;background:var(--oxblood-bright)}
      .rank-num{font-family:var(--font-display);font-size:1.7rem;color:var(--oxblood);opacity:0.4;min-width:2.5rem;line-height:1;font-weight:700;font-style:italic}
      .rank-item.founder .rank-num{font-size:4rem;opacity:1;color:var(--oxblood-bright);min-width:4.5rem;line-height:0.85}
      .rank-item.founder .rank-info h3{font-size:1.5rem}
      .rank-item.founder .rank-info .rank-member{font-size:0.95rem;color:var(--brass-bright)}
      .rank-info h3{font-family:var(--font-display);font-size:1.05rem;color:var(--ivory);margin-bottom:0.25rem;font-weight:600;font-style:italic}
      .rank-info .rank-member{font-family:var(--font-label);font-size:0.72rem;color:var(--ivory-dim);margin-bottom:0.5rem;letter-spacing:0.08em}
      .rank-info p{font-family:var(--font-body);font-size:0.88rem;color:var(--ivory-dim);line-height:1.8}
      .rank-rights{margin-top:0.8rem;display:flex;flex-wrap:wrap;gap:0.35rem}
      .rank-right-tag{font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.1em;padding:0.22rem 0.65rem;background:var(--brass-faint);border:1px solid var(--border-brass);color:var(--ivory-dim);white-space:nowrap;font-weight:500;transition:border-color 0.2s,color 0.2s}
      .rank-right-tag:hover{border-color:var(--brass);color:var(--ivory)}
      .rank-item.founder .rank-right-tag{border-color:var(--border-oxblood);color:var(--ivory)}
 
      /* ══════════════════════════════════════════════
         STATISTIKY
         ══════════════════════════════════════════════ */
      .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,360px));gap:2rem 1.6rem}
      .stat-card{background:var(--panel2);border:1px solid var(--border-brass);padding:1.8rem 1.7rem 1.5rem;transition:border-color 0.25s,transform 0.25s;box-shadow:var(--shadow-card);position:relative;overflow:visible;margin-top:0.4rem}
      .stat-card::before{content:'';position:absolute;top:0;left:0;width:20px;height:20px;border-top:1px solid var(--brass);border-left:1px solid var(--brass)}
      .stat-card::after{content:'';position:absolute;bottom:0;right:0;width:20px;height:20px;border-bottom:1px solid var(--brass);border-right:1px solid var(--brass)}
      .stat-card:hover{border-color:var(--brass);transform:translateY(-3px)}
      .stat-card-tab{position:absolute;top:-0.4rem;right:1.4rem;background:var(--oxblood);color:var(--ivory);font-family:var(--font-label);font-size:0.56rem;font-weight:600;letter-spacing:0.12em;padding:0.22rem 0.65rem}
      .stat-card-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.2rem;padding-bottom:1rem;border-bottom:1px solid var(--border-brass);padding-right:2.6rem}
      .stat-card-name{font-family:var(--font-display);font-size:1.15rem;color:var(--ivory);font-weight:600;font-style:italic}
      .stat-card-discord{font-family:var(--font-mono);font-size:0.64rem;letter-spacing:0.04em;color:var(--ivory-faint);margin-top:0.3rem}
      .stat-row{display:flex;justify-content:space-between;font-size:0.86rem;padding:0.35rem 0;color:var(--ivory-dim)}
      .stat-row strong{color:var(--ivory);font-weight:500}
      .stat-section-label{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--brass);font-weight:500;margin-top:0.9rem;margin-bottom:0.4rem;padding-top:0.65rem;border-top:1px solid var(--border)}
      .stat-section-label:first-of-type{border-top:none;margin-top:0}
      .stat-item-group{margin-left:0.5rem}
 
      /* ══════════════════════════════════════════════
         CONFIRM MODAL
         ══════════════════════════════════════════════ */
      .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:1000;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity 0.25s;backdrop-filter:blur(10px)}
      .modal-overlay.open{opacity:1;pointer-events:all}
      .modal-box{background:var(--panel2);border:1px solid var(--border-brass);border-top:2px solid var(--oxblood);padding:2.5rem;max-width:420px;width:90%;box-shadow:var(--shadow);transform:translateY(16px) scale(0.97);transition:transform 0.25s cubic-bezier(0.22,1,0.36,1);position:relative}
      .modal-overlay.open .modal-box{transform:translateY(0) scale(1)}
      .modal-title{font-family:var(--font-display);font-size:1.2rem;font-weight:600;font-style:italic;margin-bottom:0.6rem;color:var(--ivory)}
      .modal-subtitle{font-size:0.84rem;color:var(--ivory-dim);line-height:1.7;margin-bottom:1.8rem;font-family:var(--font-body)}
      .modal-detail{background:var(--panel3);border:1px solid var(--border);padding:0.9rem 1.1rem;margin-bottom:1.6rem;font-size:0.83rem;color:var(--ivory-dim);display:grid;grid-template-columns:auto 1fr;gap:0.35rem 1rem}
      .modal-detail dt{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--brass);padding-top:0.1rem}
      .modal-detail dd{color:var(--ivory);font-weight:400;font-family:var(--font-body)}
      .modal-actions{display:flex;gap:0.75rem}
      .modal-btn-cancel{flex:1;padding:0.75rem;background:transparent;border:1px solid var(--border-brass);color:var(--ivory-faint);font-family:var(--font-label);font-size:0.62rem;letter-spacing:0.14em;text-transform:uppercase;cursor:pointer;transition:all 0.2s}
      .modal-btn-cancel:hover{border-color:var(--brass);color:var(--ivory)}
      .modal-btn-confirm{flex:2;padding:0.75rem;background:var(--oxblood);color:var(--ivory);border:1px solid var(--oxblood);font-family:var(--font-label);font-size:0.62rem;letter-spacing:0.14em;text-transform:uppercase;font-weight:500;cursor:pointer;transition:opacity 0.2s,box-shadow 0.2s;box-shadow:0 0 20px var(--oxblood-glow)}
      .modal-btn-confirm:hover{opacity:0.9;box-shadow:0 0 32px var(--oxblood-glow)}
      .modal-btn-confirm:disabled{cursor:default;opacity:0.7;box-shadow:none}
 
      .modal-box{overflow:visible}
      .seal-stamp{position:absolute;top:50%;left:50%;width:128px;height:128px;transform:translate(-50%,-50%) translateY(-340px) scale(2.2) rotate(-18deg);opacity:0;pointer-events:none;z-index:50;display:flex;align-items:center;justify-content:center;background-image:url('/pecet.png');background-size:contain;background-repeat:no-repeat;background-position:center;filter:drop-shadow(0 18px 28px rgba(0,0,0,0.55))}
      .seal-stamp span{display:none}
      .seal-stamp.slam{animation:sealSlam 0.62s cubic-bezier(0.32,0.04,0.5,1) forwards}
      @keyframes sealSlam{0%{opacity:0;transform:translate(-50%,-50%) translateY(-340px) scale(2.2) rotate(-18deg)}55%{opacity:1;transform:translate(-50%,-50%) translateY(0) scale(1.18) rotate(-6deg);box-shadow:0 18px 40px rgba(0,0,0,0.5),0 0 80px var(--oxblood-glow)}68%{transform:translate(-50%,-50%) translateY(0) scale(0.94) rotate(-9deg)}80%{transform:translate(-50%,-50%) translateY(0) scale(1.04) rotate(-7deg)}100%{opacity:1;transform:translate(-50%,-50%) translateY(0) scale(1) rotate(-8deg)}}
      .seal-stamp.fade-out{animation:sealFadeOut 0.3s ease-in forwards}
      @keyframes sealFadeOut{0%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(-8deg)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.15) rotate(-8deg)}}
      .modal-box.stamped .modal-title,.modal-box.stamped .modal-subtitle,.modal-box.stamped .modal-detail,.modal-box.stamped .modal-actions{transition:opacity 0.2s;opacity:0.2}
      @keyframes modalThud{0%{transform:translateY(0) scale(1)}56%{transform:translateY(2px) scale(0.993)}100%{transform:translateY(0) scale(1)}}
      .modal-box.thud{animation:modalThud 0.62s cubic-bezier(0.32,0.04,0.5,1) 1}
 
      /* ══════════════════════════════════════════════
         LEDGER LOADING / EMPTY
         ══════════════════════════════════════════════ */
      .ledger-loading{display:flex;align-items:center;gap:0.7rem;color:var(--ivory-dim);font-family:var(--font-mono);font-size:0.82rem;padding:0.4rem 0}
      .ledger-loading::before{content:'';width:8px;height:8px;flex-shrink:0;background:var(--oxblood);animation:ledgerPulse 1.3s ease-in-out infinite}
      @keyframes ledgerPulse{0%,100%{box-shadow:0 0 0 0 var(--oxblood-glow);opacity:0.5}50%{box-shadow:0 0 0 5px var(--oxblood-glow);opacity:1}}
      .ledger-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.9rem;padding:2.5rem 1.5rem;text-align:center}
      .ledger-empty svg{width:64px;height:48px;opacity:0.35;flex-shrink:0}
      .ledger-empty-text{font-family:var(--font-mono);font-size:0.78rem;color:var(--ivory-faint);letter-spacing:0.04em}
      .ledger-empty.compact{padding:1.1rem 0.5rem;gap:0.6rem}
      .ledger-empty.compact svg{width:40px;height:30px}
      .ledger-empty.compact .ledger-empty-text{font-size:0.72rem}
 
      /* ══════════════════════════════════════════════
         FOLIO SYSTÉM
         ══════════════════════════════════════════════ */
      .folio-rule{height:1px;background:linear-gradient(90deg,var(--oxblood) 0%,var(--border) 40%,var(--border) 60%,var(--brass) 100%);opacity:0.5;margin:2.5rem 0}
      .folio-rule.tight{margin:1.4rem 0;opacity:0.3}
      .folio-label{font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.28em;text-transform:uppercase;color:var(--brass);font-weight:500;display:flex;align-items:center;gap:0.8em}
      .folio-label::after{content:'';flex:1;height:1px;background:var(--border-brass);margin-top:1px;opacity:0.5}
      .folio-spread{display:grid;grid-template-columns:1fr 260px;gap:3.5rem;align-items:start}
      .marginalia{font-family:var(--font-mono);font-size:0.66rem;letter-spacing:0.04em;color:var(--ivory-faint);line-height:1.9;border-left:1px solid var(--border-brass);padding-left:1rem}
      .marginalia .m-line{display:flex;justify-content:space-between;gap:1rem;padding:0.3rem 0;border-bottom:1px solid var(--border)}
      .marginalia .m-line:last-child{border-bottom:none}
      .marginalia .m-line .m-val{color:var(--ivory);font-weight:400}
      .manifest-row{display:flex;align-items:baseline;gap:0.6rem;padding:0.85rem 0;border-bottom:1px solid var(--border);font-size:0.9rem}
      .manifest-row:last-child{border-bottom:none}
      .manifest-row .mr-name{color:var(--ivory);font-family:var(--font-display);font-weight:500;font-style:italic;flex-shrink:0}
      .manifest-row .mr-dots{flex:1;border-bottom:1px dotted var(--border-hover);transform:translateY(-0.35em);min-width:1rem}
      .manifest-row .mr-val{font-family:var(--font-mono);color:var(--ivory-dim);flex-shrink:0;font-size:0.82rem}
      .manifest-row:hover .mr-name{color:var(--brass-bright)}
      .manifest-col{padding-top:0.2rem}
      .manifest-col-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:0.9rem;padding-bottom:0.7rem;border-bottom:1px solid var(--border-brass)}
      .manifest-col-title{font-family:var(--font-display);font-weight:600;font-size:1.1rem;color:var(--ivory);font-style:italic}
      .manifest-col-count{font-family:var(--font-mono);font-size:0.74rem;color:var(--ivory-faint)}
      .manifest-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0 2.5rem}
      .folio-panel{position:relative;padding-top:0.5rem}
      .folio-panel + .folio-panel{margin-top:2.2rem}
 
      .ledger-bar-row{display:grid;grid-template-columns:1fr 2.6fr auto;gap:1rem;align-items:baseline;padding:0.55rem 0;border-bottom:1px solid var(--border)}
      .ledger-bar-row:last-child{border-bottom:none}
      .ledger-bar-name{font-family:var(--font-display);font-size:0.9rem;color:var(--ivory);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-style:italic}
      .ledger-bar-track{position:relative;height:1px;background:var(--border);align-self:center}
      .ledger-bar-fill{position:absolute;top:-2px;bottom:-2px;left:0;background:linear-gradient(90deg,var(--oxblood) 0%,var(--brass) 100%);opacity:0.9}
      .ledger-bar-fill::after{content:'';position:absolute;right:-1px;top:0;bottom:0;width:1px;background:var(--brass-bright)}
      .ledger-bar-val{font-family:var(--font-mono);font-size:0.8rem;color:var(--ivory);text-align:right;white-space:nowrap}
 
      .report-figures{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid var(--border-brass);border-bottom:1px solid var(--border-brass);margin:1.6rem 0 2.2rem}
      .report-figure{padding:1.2rem 1.5rem;border-left:1px solid var(--border)}
      .report-figure:first-child{border-left:none}
      .report-figure-label{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--brass);margin-bottom:0.6rem}
      .report-figure-net{font-family:var(--font-display);font-weight:700;font-size:1.5rem;line-height:1;margin-bottom:0.55rem;font-style:italic}
      .report-figure-line{display:flex;justify-content:space-between;font-size:0.7rem;color:var(--ivory-dim);padding:0.12rem 0;font-family:var(--font-mono)}
 
      .recommendation{display:flex;gap:1rem;align-items:flex-start;padding:0.9rem 0;border-bottom:1px solid var(--border)}
      .recommendation:last-child{border-bottom:none}
      .recommendation-mark{font-family:var(--font-display);font-weight:700;font-size:1rem;width:1.6rem;height:1.6rem;display:flex;align-items:center;justify-content:center;border:1px solid currentColor;margin-top:0.1rem;flex-shrink:0}
      .recommendation-cat{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.16em;text-transform:uppercase;margin-bottom:0.3rem}
      .recommendation-text{font-size:0.86rem;color:var(--ivory);line-height:1.7;font-family:var(--font-body)}
 
      .report-nav{display:flex;flex-wrap:wrap;gap:0 2rem;margin-bottom:0.4rem;border-bottom:1px solid var(--border-brass)}
      .report-nav-item{font-family:var(--font-label);font-size:0.62rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--ivory-faint);padding:0.7rem 0;cursor:pointer;background:none;border:none;border-bottom:2px solid transparent;transition:color 0.2s,border-color 0.2s;white-space:nowrap}
      .report-nav-item:hover{color:var(--ivory-dim)}
      .report-nav-item.active{color:var(--brass-bright);border-bottom-color:var(--oxblood)}
      .report-section{display:none}
      .report-section.active{display:block;animation:fadeReveal 0.35s ease-out 1}
 
      .quick-actions{display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:1.5rem}
      .quick-btn{display:inline-flex;align-items:center;gap:0.5rem;padding:0.6rem 1.2rem;background:var(--brass-faint);border:1px solid var(--border-brass);color:var(--ivory-dim);font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;font-weight:500;text-decoration:none;transition:all 0.2s;cursor:pointer}
      .quick-btn:hover{background:var(--brass-dim);border-color:var(--brass);color:var(--ivory);transform:translateY(-1px)}
      .quick-btn svg{width:12px;height:12px;opacity:0.7}
      .quick-btn.primary{background:var(--oxblood);border-color:var(--oxblood);color:var(--ivory);box-shadow:0 0 16px var(--oxblood-glow)}
      .quick-btn.primary:hover{opacity:0.9;box-shadow:0 0 26px var(--oxblood-glow);color:var(--ivory)}
 
      .form-group{position:relative}
      .select-expandable{padding-right:2.8rem!important;cursor:pointer}
      .select-wrap{position:relative;display:flex;flex-direction:column;gap:0.45rem}
      .select-wrap::after{content:'';position:absolute;right:1rem;bottom:0.95rem;width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid var(--oxblood-bright);pointer-events:none;opacity:0.85;transition:transform 0.2s}
      .select-wrap:focus-within::after{transform:rotate(180deg)}
      .select-count-badge{position:absolute;right:2.2rem;bottom:0.72rem;font-family:var(--font-mono);font-size:0.52rem;color:var(--oxblood-bright);background:var(--oxblood-faint);border:1px solid var(--border-oxblood);padding:0.06rem 0.36rem;pointer-events:none;line-height:1.4;font-weight:400}
 
      .activity-item{display:flex;align-items:flex-start;gap:0.9rem;padding:0.7rem 0;border-bottom:1px solid var(--border);transition:background 0.15s}
      .activity-item:last-child{border-bottom:none}
      .activity-item:hover{background:var(--brass-faint);margin:0 -0.5rem;padding-left:0.5rem;padding-right:0.5rem}
      .activity-icon{width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:0.75rem;flex-shrink:0;background:var(--brass-faint);border:1px solid var(--border-brass)}
      .activity-body{flex:1;min-width:0}
      .activity-main{font-family:var(--font-body);font-size:0.86rem;color:var(--ivory);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .activity-meta{font-family:var(--font-mono);font-size:0.66rem;color:var(--ivory-faint);margin-top:0.2rem;letter-spacing:0.04em}
 
      .mini-stock-row{display:flex;align-items:center;gap:0.8rem;padding:0.5rem 0;border-bottom:1px solid var(--border)}
      .mini-stock-row:last-child{border-bottom:none}
      .mini-stock-name{font-size:0.82rem;color:var(--ivory-dim);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .mini-stock-bar-wrap{width:80px;height:3px;background:var(--border);position:relative;flex-shrink:0}
      .mini-stock-bar-fill{height:100%;background:linear-gradient(90deg,var(--oxblood),var(--brass));transition:width 0.6s ease}
      .mini-stock-qty{font-family:var(--font-mono);font-size:0.76rem;color:var(--ivory);min-width:36px;text-align:right;flex-shrink:0}
 
      .kodex-section{margin-bottom:2.5rem}
      .kodex-number{font-family:var(--font-display);font-size:3.5rem;color:var(--oxblood);opacity:0.2;float:left;line-height:1;margin-right:1.2rem;margin-top:-0.3rem;font-weight:700;font-style:italic}
      .kodex-rule{font-family:var(--font-body);font-size:0.92rem;line-height:2;color:var(--ivory-dim);overflow:hidden}
      .kodex-rule strong{color:var(--ivory);font-weight:500}
      .kodex-divider{height:1px;background:var(--border);margin:1.8rem 0}
 
      .breakdown-row{display:flex;justify-content:space-between;padding:0.45rem 0;font-size:0.88rem;color:var(--ivory-dim);border-bottom:1px solid var(--border)}
      .breakdown-row:last-child{border-bottom:none}
      .breakdown-row .green{color:#7BD69B}
      .bd-label{display:flex;align-items:center;gap:0.4rem}
      .profit-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-top:1.5rem}
      .profit-stat{background:var(--panel2);border:1px solid var(--border-brass);padding:0.9rem 1rem;text-align:center}
      .profit-stat-label{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.18em;text-transform:uppercase;font-weight:500;color:var(--brass);margin-bottom:0.55rem}
      .profit-stat-num{font-family:var(--font-display);font-size:1.4rem;color:var(--ivory);line-height:1;font-weight:700;font-style:italic}
 
      .fret{height:10px;background-image:linear-gradient(135deg,var(--brass-dim) 25%,transparent 25.5%),linear-gradient(225deg,var(--brass-dim) 25%,transparent 25.5%);background-size:16px 16px;background-position:center;opacity:0.7;margin:1.5rem 0 3rem}
 
      .bb-group{position:relative}
      .bb-group-title{display:flex;align-items:center;justify-content:space-between;gap:0.5rem;font-family:var(--font-label);font-size:0.66rem;letter-spacing:0.08em;font-weight:500;color:var(--ivory-dim);padding:0.55rem 0.7rem;cursor:pointer;white-space:nowrap}
      .bb-group-title:hover,.bb-group.open .bb-group-title{color:var(--ivory);background:var(--brass-faint)}
      .bb-group-title .bb-arrow{width:0;height:0;flex:none;border-top:4px solid transparent;border-bottom:4px solid transparent;border-left:4px solid currentColor;opacity:0.6;transition:transform 0.15s}
      .bb-group.open .bb-group-title .bb-arrow{transform:rotate(90deg)}
      .bb-submenu{display:none;flex-direction:column;padding:0.2rem 0 0.3rem}
      .bb-group.open .bb-submenu{display:flex}
 
      @media(max-width:900px){
        .folio-spread{grid-template-columns:1fr;gap:1.8rem}
        .report-figures{grid-template-columns:1fr 1fr}
        .report-figure:nth-child(3){border-left:none}
        .grid,.stats{grid-template-columns:1fr!important}
        .lore-grid{grid-template-columns:1fr}
        .chapters{padding-right:0}
        .sidebar{margin-left:0;position:static}
      }
      @media(max-width:768px){
        main{padding:1.4rem 1rem}
        .page-header{flex-direction:column;align-items:flex-start;gap:0.8rem}
        .form-row{grid-template-columns:1fr}
        .stats{grid-template-columns:repeat(2,1fr)!important}
        .profit-grid{grid-template-columns:1fr 1fr!important}
        .modal-box{padding:1.8rem 1.4rem}
        .modal-detail{grid-template-columns:1fr;gap:0.15rem 0}
        .modal-detail dt{padding-top:0.4rem}
        table{font-size:0.78rem}
        th,td{padding:0.6rem 0.7rem}
      }
      @media(max-width:640px){
        .stats{grid-template-columns:1fr 1fr!important}
        .nav-logo-text{font-size:0.9rem}
        .typ-toggle{flex-direction:column}
      }
      @media(max-width:420px){.stats{grid-template-columns:1fr!important}}
 
      /* ══════════════════════════════════════════════
         SKELETON LOADING
         ══════════════════════════════════════════════ */
      .skeleton{background:linear-gradient(90deg,var(--panel3) 25%,var(--panel4) 50%,var(--panel3) 75%);background-size:200% 100%;animation:skeletonShine 1.4s ease-in-out infinite}
      @keyframes skeletonShine{0%{background-position:200% 0}100%{background-position:-200% 0}}
      .skeleton-line{height:0.9rem;margin:0.5rem 0;border-radius:2px}
      .skeleton-row{display:flex;gap:0.8rem;padding:0.7rem 0;border-bottom:1px solid var(--border)}
      .skeleton-card{height:140px;border:1px solid var(--border-brass)}
 
      /* ══════════════════════════════════════════════
         SEZÓNNÍ VZHLED
         ══════════════════════════════════════════════ */
      body.season-vanoce::before{background-image:radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,0.5) 0, transparent 50%),radial-gradient(2px 2px at 60% 70%, rgba(255,255,255,0.4) 0, transparent 50%),radial-gradient(1px 1px at 80% 20%, rgba(255,255,255,0.3) 0, transparent 50%);background-size:200px 200px;animation:snowFall 12s linear infinite}
      @keyframes snowFall{from{background-position:0 0}to{background-position:0 200px}}
      body.season-halloween{--oxblood:#C97328;--oxblood-bright:#F0902E}
      body.season-novy-rok::before{background-image:radial-gradient(3px 3px at 30% 40%, rgba(255,222,173,0.6) 0, transparent 50%);animation:snowFall 8s linear infinite}
 
      /* ══════════════════════════════════════════════
         TRADING KARTA
         ══════════════════════════════════════════════ */
      .trading-card{max-width:420px;margin:0 auto;background:var(--panel2);border:2px solid var(--brass);position:relative;overflow:hidden;box-shadow:var(--shadow)}
      .trading-card::before{content:'';position:absolute;top:0;left:0;width:20px;height:20px;border-top:1px solid var(--brass-bright);border-left:1px solid var(--brass-bright);z-index:2}
      .trading-card::after{content:'';position:absolute;bottom:0;right:0;width:20px;height:20px;border-bottom:1px solid var(--brass-bright);border-right:1px solid var(--brass-bright);z-index:2}
      .tc-header{background:linear-gradient(135deg,var(--oxblood),var(--seal-deep,#3A0812));padding:2.4rem 1.6rem 2rem;text-align:center;position:relative}
      .tc-avatar{width:132px;height:132px;border-radius:50%;border:4px solid var(--brass-bright);object-fit:cover;background:var(--panel3);margin:0 auto 1rem;display:block;box-shadow:0 8px 28px rgba(0,0,0,0.45)}
      .tc-name{font-family:var(--font-display);font-style:italic;font-weight:700;font-size:1.55rem;color:var(--ivory)}
      .tc-discord{font-family:var(--font-mono);font-size:0.74rem;color:var(--ivory-dim);margin-top:0.3rem}
      .tc-body{padding:1.8rem 1.8rem 2rem}
      .tc-stat{display:flex;justify-content:space-between;padding:0.55rem 0;border-bottom:1px solid var(--border);font-size:0.86rem}
      .tc-badges{display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.9rem}
      .tc-badge{display:flex;align-items:center;font-family:var(--font-label);font-size:0.58rem;padding:0.32rem 0.7rem;background:var(--brass-faint);border:1px solid var(--border-brass);color:var(--brass-bright)}
      .tc-badge-icon{margin-right:0.35rem;color:var(--brass-bright);font-size:0.95em}
 
      .tc-foil-shine{position:absolute;inset:0;z-index:5;pointer-events:none;mix-blend-mode:overlay;background:linear-gradient(115deg,transparent 30%,rgba(255,222,173,0.55) 45%,rgba(255,255,255,0.65) 50%,rgba(255,222,173,0.55) 55%,transparent 70%);background-size:250% 250%;animation:cardFoilShine 4.5s ease-in-out infinite}
      .tc-foil-shine.silver{background:linear-gradient(115deg,transparent 30%,rgba(201,190,175,0.5) 45%,rgba(255,255,255,0.55) 50%,rgba(201,190,175,0.5) 55%,transparent 70%)}
      @keyframes cardFoilShine{0%{background-position:0% 0%}50%{background-position:100% 100%}100%{background-position:0% 0%}}
      .trading-card.card-foil-gold{border-color:var(--brass-bright);box-shadow:0 0 36px rgba(255,222,173,0.3),var(--shadow)}
      .trading-card.card-foil-silver{border-color:#C9BEAF;box-shadow:0 0 26px rgba(201,190,175,0.25),var(--shadow)}
 
      /* ══════════════════════════════════════════════
         GALERIE
         ══════════════════════════════════════════════ */
      .gal-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.2rem}
      .gal-item{background:var(--panel2);border:1px solid var(--border);overflow:hidden;position:relative}
      .gal-item::after{content:'';position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 0 1px rgba(255,222,173,0.35)}
      .gal-item img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
      .gal-caption{padding:0.8rem 1rem;font-size:0.82rem;color:var(--ivory-dim)}
      .gal-meta{font-family:var(--font-mono);font-size:0.62rem;color:var(--ivory-faint);padding:0 1rem 0.8rem}
      .gal-del{position:absolute;top:0.5rem;right:0.5rem;background:rgba(0,0,0,0.6);color:#fff;border:none;width:26px;height:26px;cursor:pointer}
 
      .onb-dot{width:6px;height:6px;border-radius:50%;background:var(--border-brass);display:inline-block}
      .onb-dot.active{background:var(--oxblood-bright)}
 
      /* ══════════════════════════════════════════════
         UPLOAD ZONE
         ══════════════════════════════════════════════ */
      .upload-zone{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.5rem;background:var(--panel3);border:1px dashed var(--border-brass);cursor:pointer;transition:border-color 0.2s,background 0.2s;color:var(--ivory-faint);overflow:hidden;text-align:center}
      .upload-zone:hover,.upload-zone:focus{border-color:var(--brass);color:var(--ivory-dim);outline:none}
      .upload-zone svg{width:26px;height:26px;opacity:0.6}
      .upload-zone-text{font-family:var(--font-mono);font-size:0.62rem;letter-spacing:0.02em;line-height:1.5}
      .upload-zone-text strong{color:var(--brass-bright);font-weight:400}
      .upload-preview{position:absolute;inset:0;width:100%;height:100%}
      .upload-zone.has-image svg,.upload-zone.has-image .upload-zone-text{display:none}
      .upload-clear{position:absolute;top:0.3rem;right:0.3rem;z-index:2;width:20px;height:20px;background:rgba(0,0,0,0.6);color:var(--ivory);border:1px solid var(--border-brass);cursor:pointer;display:none;align-items:center;justify-content:center;font-size:0.6rem;line-height:1}
      .upload-zone.has-image .upload-clear{display:flex}
 
      /* ══════════════════════════════════════════════
         SKUTEČNÁ NÁLADA
         ══════════════════════════════════════════════ */
      body.mood-sunrise::before{background:radial-gradient(ellipse 70% 50% at 50% 0%, rgba(224,150,90,0.14), transparent 60%),radial-gradient(ellipse 60% 60% at 100% 100%, rgba(220,20,60,0.10), transparent 60%)}
      body.mood-day::before{background:radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255,222,173,0.06), transparent 60%),radial-gradient(ellipse 60% 60% at 100% 100%, rgba(220,20,60,0.06), transparent 60%)}
      body.mood-sunset::before{background:radial-gradient(ellipse 70% 50% at 50% 0%, rgba(220,20,60,0.16), transparent 60%),radial-gradient(ellipse 60% 60% at 100% 100%, rgba(255,222,173,0.10), transparent 60%)}
      body.mood-night::before{background:radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255,222,173,0.05), transparent 60%),radial-gradient(ellipse 60% 60% at 100% 100%, rgba(20,10,20,0.30), transparent 60%)}
      body.mood-night{--oxblood-glow:rgba(220,20,60,0.24)}
      body.mood-sunset{--oxblood-glow:rgba(220,20,60,0.32)}
      body.light.mood-night{filter:brightness(0.94) saturate(0.94)}
      body.light.mood-sunset{filter:brightness(1.02) saturate(1.06)}
      body.light.mood-sunrise{filter:brightness(1.03)}
 
      /* Vellum texture */
      .card,.stat-card,.car-card,.trading-card,.panel-card,.sidebar,.ucet-card,.dash-widget,.dash-stat-card{
        background-image:
          repeating-linear-gradient(0deg, rgba(255,222,173,0.02) 0px, transparent 1px, transparent 3px),
          repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0px, transparent 1px, transparent 3px),
          radial-gradient(ellipse 140% 100% at 10% 0%, rgba(255,222,173,0.05), transparent 55%),
          radial-gradient(ellipse 120% 90% at 90% 100%, rgba(0,0,0,0.18), transparent 60%);
        background-blend-mode:overlay,overlay,normal,normal;
      }
      body.light .card,body.light .stat-card,body.light .car-card,body.light .trading-card,body.light .panel-card,body.light .sidebar,body.light .ucet-card,body.light .dash-widget,body.light .dash-stat-card{
        background-image:
          repeating-linear-gradient(0deg, rgba(110,70,20,0.04) 0px, transparent 1px, transparent 3px),
          repeating-linear-gradient(90deg, rgba(90,60,20,0.05) 0px, transparent 1px, transparent 3px),
          radial-gradient(ellipse 140% 100% at 10% 0%, rgba(138,106,52,0.10), transparent 55%),
          radial-gradient(ellipse 120% 90% at 90% 100%, rgba(90,60,20,0.10), transparent 60%);
      }
 
      tr.rank-elite td{background:linear-gradient(90deg, var(--brass-faint), transparent 40%);border-left:2px solid var(--brass-bright)}
      tr.rank-elite td:first-child{padding-left:calc(1rem - 2px)}
      .stat-card.rank-elite{border-color:var(--brass-bright);box-shadow:0 0 0 1px var(--border-brass),var(--shadow-card)}
      .stat-card.rank-elite .stat-card-tab{background:var(--brass);color:var(--noir)}
      .stream-entry.rank-elite{border-left:2px solid var(--brass-bright);padding-left:0.6rem;background:var(--brass-faint)}
      .rank-elite-tag{font-family:var(--font-label);font-size:0.5rem;letter-spacing:0.08em;color:var(--brass-bright);border:1px solid var(--border-brass);padding:0.04rem 0.35rem;margin-left:0.4rem;text-transform:uppercase;vertical-align:1px}
 
      .tilt-card{transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translateZ(var(--tz,0px));transition:transform 0.15s ease-out;will-change:transform}
      .tilt-card.tilt-reset{transition:transform 0.4s cubic-bezier(0.22,1,0.36,1)}
      .tilt-glare{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(circle at var(--gx,50%) var(--gy,50%), rgba(255,255,255,0.14), transparent 55%);transition:opacity 0.2s;z-index:5}
      .tilt-card:hover .tilt-glare{opacity:1}
 
      @keyframes pageOutFade{to{opacity:0;filter:blur(2px)}}
      body.page-leaving{animation:pageOutFade 0.22s ease-in forwards}
      ::view-transition-old(root){animation:pageOutFade 0.22s ease-in forwards}
      ::view-transition-new(root){animation:pageFadeIn 0.28s ease-out}
 
      .ink-progress-track{position:fixed;top:var(--nav-h);left:0;right:0;height:3px;background:var(--border);z-index:150}
      .ink-progress-fill{height:100%;width:0%;background:linear-gradient(90deg,var(--oxblood),var(--brass));box-shadow:0 0 8px var(--oxblood-glow);transition:width 0.08s linear}
      .ink-progress-fill::after{content:'';position:absolute;right:-3px;top:-2px;width:7px;height:7px;border-radius:50%;background:var(--brass-bright);box-shadow:0 0 6px var(--brass-bright)}
 
      /* ══════════════════════════════════════════════
         EVELYN ASHCROFT
         ══════════════════════════════════════════════ */
      .evelyn-widget{position:relative;display:flex;align-items:center;gap:0.5rem;cursor:pointer}
      .evelyn-portrait{width:30px;height:30px;border-radius:50%;border:1px solid var(--brass);object-fit:cover;background:var(--panel3);flex-shrink:0}
      .evelyn-portrait-placeholder{display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;font-style:italic;font-size:0.9rem;color:var(--brass-bright);background:var(--oxblood-faint)}
      .evelyn-bubble{position:fixed;top:calc(var(--nav-h) + 10px);right:1.5rem;max-width:290px;z-index:250;background:rgba(9,6,7,0.96);border:1px solid var(--border-brass);border-top:2px solid var(--oxblood);padding:0.9rem 1.1rem;font-family:var(--font-body);font-size:0.82rem;color:var(--ivory-dim);line-height:1.7;box-shadow:var(--shadow);opacity:0;transform:translateY(-6px);pointer-events:none;transition:opacity 0.25s,transform 0.25s}
      .evelyn-bubble.show{opacity:1;transform:translateY(0);pointer-events:all}
      .evelyn-bubble .ev-name{font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--brass-bright);margin-bottom:0.4rem;display:block}
      @media(max-width:880px){.evelyn-bubble{right:1rem;left:1rem;max-width:none}}
 
      .evelyn-ping{position:absolute;top:-3px;right:-3px;width:10px;height:10px;border-radius:50%;background:var(--oxblood-bright);box-shadow:0 0 6px var(--oxblood-glow);border:1.5px solid var(--noir);opacity:0;transition:opacity 0.2s;animation:evelynPingPulse 1.6s ease-in-out infinite}
      .evelyn-ping.show{opacity:1}
      @keyframes evelynPingPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.35)}}
 
      .evelyn-letter{position:fixed;top:calc(var(--nav-h) + 10px);right:1.5rem;z-index:250;width:min(380px,92vw);background:rgba(9,6,7,0.97);border:1px solid var(--border-brass);border-top:2px solid var(--oxblood);box-shadow:var(--shadow),0 0 0 1px rgba(255,222,173,0.06);opacity:0;transform:translateY(-10px) scale(0.98);pointer-events:none;transition:opacity 0.3s,transform 0.3s}
      .evelyn-letter.show{opacity:1;transform:translateY(0) scale(1);pointer-events:all}
      .evelyn-letter-head{display:flex;align-items:center;justify-content:space-between;gap:0.6rem;padding:0.75rem 0.95rem;border-bottom:1px solid var(--border-brass);background:var(--brass-faint)}
      .evelyn-letter-from{display:flex;align-items:center;gap:0.6rem;font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--brass-bright)}
      .evelyn-letter-from img{width:22px;height:22px;border-radius:50%;border:1px solid var(--brass);object-fit:cover;flex-shrink:0}
      .evelyn-letter-avatar{position:relative;width:22px;height:22px;flex-shrink:0;display:inline-block}
      .evelyn-letter-avatar-fallback{position:absolute;inset:0;border-radius:50%;border:1px solid var(--brass);background:var(--oxblood-faint);color:var(--brass-bright);align-items:center;justify-content:center}
      .evelyn-letter-close{background:none;border:none;color:var(--ivory-faint);cursor:pointer;font-size:0.85rem;line-height:1;padding:0.2rem;flex-shrink:0}
      .evelyn-letter-close:hover{color:var(--oxblood-bright)}
      .evelyn-letter-body{padding:1rem 1.1rem 1.1rem;max-height:62vh;overflow-y:auto}
      .evelyn-letter-stamp{font-family:var(--font-mono);font-size:0.58rem;color:var(--ivory-faint);letter-spacing:0.05em;margin-bottom:0.6rem}
      .evelyn-letter-subject{font-family:var(--font-display);font-style:italic;font-weight:600;font-size:0.98rem;color:var(--ivory);margin-bottom:0.6rem;line-height:1.4}
      .evelyn-letter-line{font-family:var(--font-body);font-size:0.84rem;color:var(--ivory-dim);line-height:1.7;margin-bottom:0.5rem;font-weight:300}
      .evelyn-letter-tips{margin:0.7rem 0;padding:0.7rem 0.85rem;background:var(--oxblood-faint);border-left:2px solid var(--oxblood)}
      .evelyn-letter-tip{font-family:var(--font-mono);font-size:0.72rem;color:var(--ivory);line-height:1.65;padding:0.15rem 0}
      .evelyn-letter-tip::before{content:'⚠ ';color:var(--oxblood-bright)}
      .evelyn-letter-actions{display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.9rem}
      .evelyn-letter-actions a{font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--ivory-dim);border:1px solid var(--border-brass);padding:0.42rem 0.8rem;text-decoration:none;transition:all 0.15s}
      .evelyn-letter-actions a:hover{border-color:var(--brass);color:var(--brass-bright);background:var(--brass-faint)}
      .evelyn-letter-sig{margin-top:0.9rem;padding-top:0.7rem;border-top:1px solid var(--border);font-family:var(--font-display);font-style:italic;font-size:0.8rem;color:var(--ivory-faint)}
      @media(max-width:880px){.evelyn-letter{right:1rem;left:1rem;width:auto}}
 
      /* ══════════════════════════════════════════════
         CONTINENTAL LEDGER
         ══════════════════════════════════════════════ */
      .cont-grid{display:grid;grid-template-columns:1fr 1fr;gap:2rem}
      @media(max-width:980px){.cont-grid{grid-template-columns:1fr}}
      .cont-col-title{font-family:var(--font-label);font-size:0.62rem;letter-spacing:0.2em;text-transform:uppercase;font-weight:600;margin-bottom:1rem;padding-bottom:0.7rem;border-bottom:1px solid var(--border-brass);display:flex;align-items:center;gap:0.5rem}
      .cont-col-title.owed-to-us{color:var(--brass-bright)}
      .cont-col-title.owed-by-us{color:var(--oxblood-bright)}
      .cont-entry{position:relative;background:var(--panel2);border:1px solid var(--border);padding:1.1rem 1.3rem;margin-bottom:0.9rem;overflow:hidden;transition:border-color 0.2s}
      .cont-entry:hover{border-color:var(--border-brass)}
      .cont-entry.settled{opacity:0.62}
      .cont-entry-row{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;margin-bottom:0.35rem}
      .cont-entry-who{font-family:var(--font-display);font-weight:600;font-style:italic;font-size:1.02rem;color:var(--ivory)}
      .cont-entry-amount{font-family:var(--font-mono);font-size:0.92rem;white-space:nowrap}
      .cont-entry-reason{font-family:var(--font-body);font-size:0.82rem;color:var(--ivory-dim);line-height:1.6;margin-bottom:0.5rem}
      .cont-entry-meta{display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:0.62rem;color:var(--ivory-faint);letter-spacing:0.03em}
      .cont-entry-actions{margin-top:0.7rem;display:flex;gap:0.5rem}
      .cont-seal{position:absolute;top:50%;right:1.1rem;transform:translateY(-50%) rotate(-11deg);width:86px;height:86px;display:flex;align-items:flex-end;justify-content:center;font-family:var(--font-label);font-weight:700;font-size:0.5rem;letter-spacing:0.04em;text-align:center;text-transform:uppercase;color:var(--ivory);padding-bottom:6px;background-image:url('/pecet.png');background-size:contain;background-repeat:no-repeat;background-position:center;filter:drop-shadow(0 8px 16px rgba(0,0,0,0.45));opacity:0;pointer-events:none;transform-origin:center;text-shadow:0 1px 3px rgba(0,0,0,0.9)}
      .cont-entry.settled .cont-seal{opacity:1;animation:contSealStamp 0.5s cubic-bezier(0.3,0.05,0.5,1) 1}
      .cont-seal.seal-brass{filter:drop-shadow(0 8px 16px rgba(0,0,0,0.45)) sepia(0.4) saturate(2) hue-rotate(-6deg)}
      .cont-seal.seal-oxblood{filter:drop-shadow(0 8px 16px rgba(0,0,0,0.45)) sepia(0.6) saturate(3) hue-rotate(-30deg)}
      @keyframes contSealStamp{0%{opacity:0;transform:translateY(-50%) rotate(-11deg) scale(2.4)}60%{opacity:1;transform:translateY(-50%) rotate(-11deg) scale(0.92)}100%{opacity:1;transform:translateY(-50%) rotate(-11deg) scale(1)}}
      .cont-btn-settle{padding:0.4rem 0.9rem;background:transparent;border:1px solid var(--border-brass);color:var(--ivory-dim);font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:all 0.15s}
      .cont-btn-settle:hover{border-color:var(--brass);color:var(--brass-bright)}
      .cont-btn-del{padding:0.4rem 0.7rem;background:transparent;border:1px solid var(--border-oxblood);color:var(--oxblood-bright);font-family:var(--font-label);font-size:0.54rem;cursor:pointer}
 
      /* ══════════════════════════════════════════════
         DASHBOARD v2 — nový Přehled (home.js)
         ══════════════════════════════════════════════ */
      .dash-hero{
        display:flex;align-items:flex-end;justify-content:space-between;gap:2rem;flex-wrap:wrap;
        padding-bottom:1.8rem;margin-bottom:1.8rem;border-bottom:1px solid var(--border-brass);position:relative;overflow:hidden;
      }
      .dash-hero-radial{position:absolute;top:-40%;right:-6%;width:420px;height:420px;pointer-events:none;opacity:0.5}
      .dash-hero-eyebrow{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.28em;text-transform:uppercase;color:var(--brass);margin-bottom:0.6rem}
      .dash-hero-title{font-family:var(--font-display);font-weight:700;font-style:italic;font-size:clamp(1.9rem,4vw,2.7rem);color:var(--ivory);line-height:1.05}
      .dash-hero-sub{font-family:var(--font-body);font-size:0.9rem;color:var(--ivory-dim);margin-top:0.5rem}
      .dash-hero-time{text-align:right;flex-shrink:0}
      .dash-hero-clock{font-family:var(--font-mono);font-size:1.4rem;color:var(--ivory);letter-spacing:0.06em}
      .dash-hero-date{font-family:var(--font-label);font-size:0.56rem;color:var(--ivory-faint);letter-spacing:0.14em;text-transform:uppercase;margin-top:0.3rem}
 
      .dash-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1px;background:var(--border-brass);margin-bottom:1.8rem}
      .dash-stat-card{background:var(--panel2);padding:1.5rem 1.5rem;position:relative;border-top:2px solid transparent;transition:background .2s,border-color .2s}
      .dash-stat-card:hover{background:var(--panel3);border-top-color:var(--brass)}
      .dash-stat-icon{position:absolute;top:1.3rem;right:1.3rem;width:22px;height:22px;color:var(--brass);opacity:0.55}
      .dash-stat-icon svg{width:100%;height:100%}
      .dash-stat-label{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--brass);margin-bottom:0.8rem;padding-right:1.6rem}
      .dash-stat-value{font-family:var(--font-display);font-weight:700;font-style:italic;font-size:1.65rem;color:var(--ivory);line-height:1}
      .dash-stat-sub{font-family:var(--font-mono);font-size:0.6rem;color:var(--ivory-faint);margin-top:0.55rem;letter-spacing:0.03em}
 
      .dash-grid-2{display:grid;grid-template-columns:1.5fr 1fr;gap:1.4rem;margin-bottom:1.4rem;align-items:start}
      @media(max-width:980px){.dash-grid-2{grid-template-columns:1fr}}
      .dash-widget{background:var(--panel2);border:1px solid var(--border-brass);padding:1.6rem 1.7rem;position:relative;box-shadow:var(--shadow-card);transition:box-shadow .25s}
      .dash-widget::before{content:'';position:absolute;top:0;left:0;width:16px;height:16px;border-top:1px solid var(--brass-dim);border-left:1px solid var(--brass-dim)}
      .dash-widget-title{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--brass);margin-bottom:1.1rem;display:flex;align-items:center;justify-content:space-between}
      .dash-activity-item{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:0.65rem 0;border-bottom:1px solid var(--border);font-size:0.85rem}
      .dash-activity-item:last-child{border-bottom:none}
      .dash-activity-left{display:flex;align-items:center;gap:0.7rem;min-width:0}
      .dash-activity-icon{width:24px;height:24px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--brass-faint);border:1px solid var(--border-brass);font-size:0.7rem}
      .dash-activity-text{color:var(--ivory);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dash-activity-time{font-family:var(--font-mono);font-size:0.68rem;color:var(--ivory-faint);flex-shrink:0;white-space:nowrap}
 
      .dash-notice-card{background:radial-gradient(ellipse 130% 110% at 100% 0%, rgba(220,20,60,0.32), var(--panel2) 65%);border:1px solid var(--border-brass);padding:1.6rem 1.7rem;position:relative;overflow:hidden}
      .dash-notice-eyebrow{font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--brass);margin-bottom:0.7rem}
      .dash-notice-title{font-family:var(--font-display);font-weight:600;font-style:italic;font-size:1.15rem;color:var(--ivory);margin-bottom:0.6rem}
      .dash-notice-text{font-family:var(--font-body);font-size:0.85rem;color:var(--ivory-dim);line-height:1.7;margin-bottom:1.1rem}
      .dash-notice-btn{display:inline-flex;align-items:center;gap:0.5rem;padding:0.65rem 1.1rem;background:var(--oxblood);border:1px solid var(--oxblood);color:var(--ivory);font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;text-decoration:none;transition:background .2s,box-shadow .2s}
      .dash-notice-btn:hover{background:var(--oxblood-bright);box-shadow:0 0 20px var(--oxblood-glow)}
 
      .dash-quick-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:0.7rem}
      .dash-quick-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.55rem;padding:1.2rem 0.6rem;background:var(--panel3);border:1px solid var(--border);color:var(--ivory-dim);font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;transition:all .15s}
      .dash-quick-btn svg{width:20px;height:20px;color:var(--brass);opacity:0.8;transition:opacity .15s}
      .dash-quick-btn:hover{border-color:var(--brass);color:var(--brass-bright);background:var(--panel4)}
      .dash-quick-btn:hover svg{opacity:1}
 
      .dash-vault-card{background:var(--panel2);border:1px solid var(--border-brass);padding:1.6rem 1.7rem}
      .dash-vault-value{font-family:var(--font-display);font-weight:700;font-style:italic;font-size:2.1rem;color:var(--ivory);line-height:1;margin:0.3rem 0 0.9rem}
      .dash-vault-track{height:5px;background:var(--border);position:relative;overflow:hidden}
      .dash-vault-fill{height:100%;background:linear-gradient(90deg,var(--oxblood),var(--brass))}
      .dash-vault-caption{display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:0.66rem;color:var(--ivory-faint);margin-top:0.6rem}
 
      .dash-portal{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:2rem;padding:2rem 2.3rem;background:radial-gradient(ellipse 120% 140% at 0% 0%, rgba(220,20,60,0.32), var(--panel2) 65%);border:1px solid var(--border-brass);box-shadow:var(--shadow-card);text-decoration:none;transition:border-color .25s,transform .25s;margin-bottom:1.4rem}
      .dash-portal::before{content:'';position:absolute;top:0;left:0;width:20px;height:20px;border-top:1px solid var(--brass-bright);border-left:1px solid var(--brass-bright)}
      .dash-portal::after{content:'';position:absolute;bottom:0;right:0;width:20px;height:20px;border-bottom:1px solid var(--brass-bright);border-right:1px solid var(--brass-bright)}
      .dash-portal:hover{border-color:var(--brass-bright);transform:translateY(-2px)}
      .dash-portal-left{display:flex;align-items:center;gap:1.2rem;position:relative;z-index:1}
      .dash-portal-icon{flex-shrink:0;width:50px;height:50px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border-brass);background:var(--brass-faint);color:var(--brass-bright)}
      .dash-portal-icon svg{width:24px;height:24px}
      .dash-portal-eyebrow{font-family:var(--font-label);font-size:0.55rem;letter-spacing:0.24em;text-transform:uppercase;color:var(--brass);margin-bottom:0.35rem}
      .dash-portal-title{font-family:var(--font-display);font-weight:700;font-style:italic;font-size:1.3rem;color:var(--ivory);line-height:1.1}
      .dash-portal-sub{font-family:var(--font-body);font-size:0.82rem;color:var(--ivory-dim);margin-top:0.3rem;max-width:420px}
      .dash-portal-btn{position:relative;z-index:1;flex-shrink:0;display:inline-flex;align-items:center;gap:0.55rem;padding:0.8rem 1.4rem;background:var(--oxblood);border:1px solid var(--oxblood);color:var(--ivory);font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;font-weight:600;box-shadow:0 0 20px var(--oxblood-glow);transition:all .2s;white-space:nowrap}
      .dash-portal-btn:hover{background:var(--oxblood-bright);box-shadow:0 0 32px var(--oxblood-glow)}
      @media(max-width:760px){.dash-portal{flex-direction:column;align-items:flex-start;padding:1.6rem}.dash-portal-btn{width:100%;justify-content:center}}
 
      /* ══════════════════════════════════════════════
         RYCHLÝ ZÁPIS (dashboard widget, home.js)
         ══════════════════════════════════════════════ */
      .quick-entry{background:var(--panel2);border:1px solid var(--border-brass);padding:1.6rem 1.7rem;position:relative;margin-bottom:1.4rem;overflow:hidden}
      .quick-entry::before{content:'';position:absolute;top:0;left:0;width:16px;height:16px;border-top:1px solid var(--brass-dim);border-left:1px solid var(--brass-dim)}
      .quick-entry-tabs{display:flex;gap:0.4rem;margin-bottom:1.1rem;flex-wrap:wrap}
      .qe-tab{padding:0.45rem 0.9rem;background:transparent;border:1px solid var(--border);color:var(--ivory-faint);font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:all .15s}
      .qe-tab:hover{border-color:var(--border-brass);color:var(--ivory)}
      .qe-tab.active{background:var(--oxblood-faint);border-color:var(--oxblood);color:var(--brass-bright)}
      .qe-row{display:grid;grid-template-columns:1fr 90px auto;gap:0.6rem;align-items:end}
      .qe-row .form-group{margin-bottom:0}
      .qe-typetoggle{display:flex;gap:0.3rem;margin-bottom:0.8rem}
      .qe-type-btn{padding:0.4rem 0.8rem;background:transparent;border:1px solid var(--border);color:var(--ivory-faint);font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer}
      .qe-type-btn.on-in{background:rgba(76,175,109,0.10);border-color:rgba(76,175,109,0.35);color:#7BD69B}
      .qe-type-btn.on-out{background:var(--oxblood-faint);border-color:var(--border-oxblood);color:var(--oxblood-bright)}
      .qe-submit{padding:0.72rem 1.1rem;background:var(--oxblood);border:1px solid var(--oxblood);color:var(--ivory);font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;white-space:nowrap;transition:background .15s,box-shadow .15s}
      .qe-submit:hover{background:var(--oxblood-bright);box-shadow:0 0 18px var(--oxblood-glow)}
      .qe-submit:disabled{opacity:0.5;cursor:default}
      .qe-hint{font-family:var(--font-mono);font-size:0.66rem;color:var(--ivory-faint);margin-top:0.7rem}
      @media(max-width:640px){.qe-row{grid-template-columns:1fr;}.qe-row .qe-submit{width:100%}}
 
      /* ══════════════════════════════════════════════
         PROFIL — taby (server.js renderProfil)
         ══════════════════════════════════════════════ */
      .profil-tab-panel{display:none}
      .profil-tab-panel.active{display:block;animation:fadeReveal 0.3s ease-out 1}
    </style>
  `;
}
 
module.exports = { baseStyles, ledgerEmpty };
 
