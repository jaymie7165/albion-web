// styles.js — CALEDONIA PRIVATE NETWORK
// Redesign v6 — "Private Terminal": near-black base, deep wine secondary,
// crimson used only as a thin accent (lines, dots, small glows), old-gold
// for secondary text/labels, warm off-white for primary text. Serif for
// identity/headings, clean sans for UI. All existing CSS variable NAMES are
// kept 1:1 (--noir, --panel, --oxblood, --brass, --ivory, --border, etc.)
// so no view file needs to change to inherit the new look — only values
// changed, plus a handful of new utility classes for the redesigned pages
// (index card, pulse line, briefing block, timeline rows, quiet-list).

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
    <meta name="theme-color" content="#07050A">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,500;1,600&family=Cinzel:wght@400;500;600;700&family=Inter:wght@300;400;500;600&family=Space+Mono:ital,wght@0,400;0,700&display=swap" rel="stylesheet">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}

      :root{
        /* ══════════════════════════════════════════════════════════════
           CALEDONIA PRIVATE NETWORK — dark (default)
           near-black base / deep wine secondary / crimson accent only /
           old gold for secondary text / warm off-white primary text
           ══════════════════════════════════════════════════════════════ */
        --noir:#07050A;
        --panel:#0C0910;
        --panel2:#100C14;
        --panel3:#151019;
        --panel4:#1B141F;
        --oxblood:#3D0A16;
        --oxblood-bright:#B3172F;
        --oxblood-glow:rgba(179,23,47,0.28);
        --oxblood-faint:rgba(179,23,47,0.10);
        --brass:#9C7D42;
        --brass-bright:#CBA45C;
        --brass-dim:rgba(203,164,92,0.20);
        --brass-faint:rgba(203,164,92,0.07);
        --brass-line:rgba(203,164,92,0.26);
        --ivory:#EFE7D8;
        --ivory-dim:#B7ACA0;
        --ivory-faint:#6E6660;
        --border:rgba(203,164,92,0.10);
        --border-hover:rgba(203,164,92,0.24);
        --border-brass:rgba(203,164,92,0.20);
        --border-oxblood:rgba(179,23,47,0.35);
        --input-bg:rgba(5,4,7,0.85);
        --shadow:0 24px 64px rgba(0,0,0,0.85);
        --shadow-card:0 4px 24px rgba(0,0,0,0.6);
        --nav-h:66px;
        --sidebar-w:236px;
        --font-display:'Cormorant Garamond',serif;
        --font-label:'Cinzel',serif;
        --font-body:'Inter',sans-serif;
        --font-mono:'Space Mono',monospace;

        /* legacy aliases — unchanged names, kept so no view needs edits */
        --ink:var(--noir);--ink-soft:var(--panel);--leather:var(--panel);
        --leather2:var(--panel2);--leather3:var(--panel3);--leather4:var(--panel4);
        --seal:var(--oxblood);--seal-bright:var(--oxblood-bright);--seal-glow:var(--oxblood-glow);
        --seal-deep:#22040B;--blood:var(--oxblood-bright);--blood-glow:var(--oxblood-glow);
        --vellum:var(--ivory);--vellum-bright:var(--ivory);--text:var(--ivory);
        --text-dim:var(--ivory-dim);--text-muted:var(--ivory-faint);--text-label:var(--ivory-faint);
        --gold-dim:var(--brass-faint);--true-gold:var(--brass);--silver:var(--ivory-dim);
        --silver-dim:rgba(203,164,92,0.06);--silver-bright:var(--ivory);
        --bg:var(--noir);--bg-soft:var(--panel);--bg-mid:var(--panel2);
        --bg-card:var(--panel2);--bg-card2:var(--panel3);--bg-card3:var(--panel4);
        --gold:var(--brass);--border-silver:var(--border);--border-gold:var(--border-oxblood);
        --crimson:var(--oxblood);--crimson-light:var(--oxblood-bright);--crimson-glow:var(--oxblood-glow);
        --crimson-bright:var(--oxblood-bright);--money:#5FA875;
      }

      /* ── LIGHT — same restrained language, inverted. Old-gold + wine on
         warm paper, crimson still only an accent. Deliberately quiet, not
         the "krémový pergamen" NavajoWhite look this replaces. ── */
      body.light{
        --noir:#F3EFE7;
        --panel:#EAE3D6;
        --panel2:#E2D9C8;
        --panel3:#D8CCB6;
        --panel4:#CBBC9F;
        --oxblood:#6E1424;
        --oxblood-bright:#8E1A2C;
        --oxblood-glow:rgba(142,26,44,0.14);
        --oxblood-faint:rgba(142,26,44,0.07);
        --brass:#7A5F2E;
        --brass-bright:#5B4520;
        --brass-dim:rgba(122,95,46,0.22);
        --brass-faint:rgba(122,95,46,0.09);
        --ivory:#231C14;
        --ivory-dim:#4C4230;
        --ivory-faint:#6E624A;
        --border:rgba(122,95,46,0.18);
        --border-hover:rgba(122,95,46,0.34);
        --border-brass:rgba(122,95,46,0.28);
        --border-oxblood:rgba(142,26,44,0.26);
        --input-bg:rgba(255,252,246,0.9);
        --shadow:0 8px 32px rgba(30,20,10,0.12);
        --shadow-card:0 2px 12px rgba(30,20,10,0.08);
        background:var(--noir);color:var(--ivory);
      }
      body.light::before{
        background:radial-gradient(ellipse 70% 50% at 50% 0%, rgba(122,95,46,0.05), transparent 60%),
          radial-gradient(ellipse 60% 60% at 100% 100%, rgba(142,26,44,0.04), transparent 60%);
      }
      body.light::after{box-shadow:inset 0 0 16vw rgba(30,20,10,0.04)}
      body.light .app-topbar{background:rgba(234,227,214,0.96)}
      body.light .app-sidebar{background:var(--panel)}
      body.light select,body.light input[type=text],body.light input[type=number],body.light input[type=date],body.light input[type=password],body.light textarea{background:var(--input-bg);color:var(--ivory)}
      body.light .card,body.light .panel-card,body.light .dash-widget,body.light .dash-stat-card{background:var(--panel2)}
      body.light .modal-box{background:var(--panel2)}
      body.light ::-webkit-scrollbar-track{background:var(--panel)}
      body.light ::-webkit-scrollbar-thumb{background:var(--brass)}

      html{scroll-behavior:smooth}
      body{
        background:var(--noir);color:var(--ivory);font-family:var(--font-body);
        font-weight:300;font-size:14.5px;line-height:1.6;min-height:100vh;
        overflow-x:hidden;position:relative;animation:pageFadeIn 0.45s ease-out;
      }
      body::before{
        content:'';position:fixed;inset:-10%;z-index:0;pointer-events:none;
        background:radial-gradient(ellipse 50% 38% at 30% 8%, rgba(203,164,92,0.035), transparent 60%),
          radial-gradient(ellipse 46% 46% at 92% 92%, rgba(179,23,47,0.05), transparent 55%);
        background-size:140% 140%;
      }
      body::after{content:'';position:fixed;inset:0;z-index:0;pointer-events:none;box-shadow:inset 0 0 16vw rgba(0,0,0,0.7)}

      @keyframes pageFadeIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeReveal{0%{opacity:0;transform:translateY(4px)}100%{opacity:1;transform:translateY(0)}}
      .glitch-in{animation:fadeReveal 0.5s ease-out 1}

      @keyframes rewardPulse{0%{box-shadow:0 0 0 0 rgba(95,168,117,0.4)}60%{box-shadow:0 0 0 12px rgba(95,168,117,0)}100%{box-shadow:0 0 0 0 rgba(95,168,117,0)}}
      .reward-flash{animation:rewardPulse 0.8s ease-out 1}
      @keyframes rewardPop{0%{transform:scale(1)}35%{transform:scale(1.02)}100%{transform:scale(1)}}
      .reward-pop{animation:rewardPop 0.35s cubic-bezier(.34,1.2,.64,1) 1}

      ::-webkit-scrollbar{width:3px;height:3px}
      ::-webkit-scrollbar-track{background:var(--panel)}
      ::-webkit-scrollbar-thumb{background:var(--brass);border-radius:2px}

      /* ══════════════════════════════════════════════
         TOP BAR — quiet, thin bottom rule, no gradients
         ══════════════════════════════════════════════ */
      .app-topbar{
        background:rgba(7,5,10,0.92);border-bottom:1px solid var(--border);
        padding:0 1.8rem;display:flex;align-items:center;justify-content:space-between;gap:1.2rem;
        position:sticky;top:0;z-index:140;height:var(--nav-h);
        backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
      }
      /* Horní bar nesmí zasahovat do prostoru levého sidebaru — dřív kreslil
         přes celou šířku obrazovky a s vyšším z-indexem (200 > 150) tak
         "přejížděl" přes horní část sidebaru, kde je logo. Teď má nižší
         z-index NEŽ sidebar (viz .app-sidebar níže) a navíc mu vůbec
         nezasahuje do jeho šířky, takže logo je vždy celé vpředu. */
      .app-sidebar ~ .app-topbar{margin-left:var(--sidebar-w)}
      @media(max-width:980px){.app-sidebar ~ .app-topbar{margin-left:0}}
      .topbar-left{display:flex;align-items:center;gap:0.9rem;flex-shrink:0}
      .nav-logo{font-family:var(--font-label);letter-spacing:0.22em;font-size:0.92rem;font-weight:600;text-transform:uppercase;text-decoration:none;color:var(--ivory);display:flex;align-items:center;gap:0.7rem;flex-shrink:0;transition:opacity 0.2s}
      .nav-logo:hover{opacity:0.8}
      .nav-logo-img{width:26px;height:26px;object-fit:contain;opacity:0.92}
      .nav-logo-text .b-red{color:var(--oxblood-bright)}
      .topbar-portal{display:flex;align-items:center;justify-content:center;width:24px;height:24px;border:1px solid var(--border-brass);color:var(--brass);flex-shrink:0;text-decoration:none;transition:border-color .2s,color .2s}
      .topbar-portal:hover{border-color:var(--brass-bright);color:var(--brass-bright)}
      .topbar-portal svg{width:12px;height:12px}

      .topbar-groups{display:flex;align-items:stretch;gap:0.1rem;height:100%;overflow-x:auto;flex:1;justify-content:center}
      .topbar-group{display:flex;align-items:center;height:100%;padding:0 1rem;position:relative;font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;font-weight:500;color:var(--ivory-faint);text-decoration:none;white-space:nowrap;transition:color .2s}
      .topbar-group:hover{color:var(--ivory)}
      .topbar-group.active{color:var(--brass-bright)}
      .topbar-group.active::after{content:'';position:absolute;left:0.9rem;right:0.9rem;bottom:0;height:1.5px;background:var(--oxblood-bright)}

      .topbar-right{display:flex;align-items:center;gap:0.65rem;flex-shrink:0}
      .nav-user{font-size:0.64rem;color:var(--ivory-faint);letter-spacing:0.03em;white-space:nowrap;font-family:var(--font-mono)}
      .nav-user strong{color:var(--ivory);font-weight:400;font-family:var(--font-label);letter-spacing:0.04em}
      .nav-logout{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.14em;text-transform:uppercase;font-weight:500;color:var(--ivory-faint);text-decoration:none;padding:0.4rem 0.8rem;border:1px solid var(--border);transition:all 0.2s}
      .nav-logout:hover{color:var(--oxblood-bright);border-color:var(--border-oxblood)}
      .nav-shortcut-hint{font-family:var(--font-mono);font-size:0.56rem;color:var(--ivory-faint);border:1px solid var(--border);padding:0.2rem 0.5rem;cursor:default;opacity:0.5}

      .notif-bell{position:relative;cursor:pointer;background:none;border:none;color:var(--ivory-faint);padding:0.3rem;transition:color 0.2s;display:flex;align-items:center}
      .notif-bell svg{width:16px;height:16px}
      .notif-bell:hover{color:var(--brass-bright)}
      .notif-badge{position:absolute;top:-3px;right:-5px;background:var(--oxblood-bright);color:var(--ivory);font-size:0.48rem;min-width:13px;height:13px;border-radius:7px;display:none;align-items:center;justify-content:center;padding:0 3px;font-weight:700}
      .notif-badge.visible{display:flex}

      .nav-burger{display:none;flex-direction:column;justify-content:center;gap:5px;width:30px;height:30px;background:none;border:1px solid var(--border-brass);cursor:pointer;flex-shrink:0;padding:0;align-items:center}
      .nav-burger span{display:block;width:15px;height:1px;background:var(--brass);transition:transform 0.25s,opacity 0.2s}
      .nav-burger.open span:nth-child(1){transform:translateY(6px) rotate(45deg)}
      .nav-burger.open span:nth-child(2){opacity:0}
      .nav-burger.open span:nth-child(3){transform:translateY(-6px) rotate(-45deg)}

      .theme-switcher{display:flex;align-items:center;gap:6px}
      .theme-dot-btn{width:11px;height:11px;border-radius:50%;border:1.5px solid transparent;cursor:pointer;transition:transform 0.18s;flex-shrink:0;outline:none;padding:0}
      .theme-dot-btn:hover{transform:scale(1.25)}
      .theme-dot-btn.active{border-color:var(--ivory)!important}

      .nav-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:190;opacity:0;pointer-events:none;transition:opacity 0.25s;backdrop-filter:blur(4px)}
      body.nav-locked{overflow:hidden}
      body.nav-locked .nav-overlay{opacity:1;pointer-events:all}
      .mobile-drawer{display:none;flex-direction:column;gap:0;position:fixed;top:var(--nav-h);left:0;right:0;bottom:0;background:rgba(7,5,10,0.98);border-top:1px solid var(--border);padding:0.5rem 0 1rem;overflow-y:auto;z-index:195;transform:translateY(-8px);opacity:0;pointer-events:none;transition:opacity 0.2s,transform 0.2s}
      .mobile-drawer.mobile-open{display:flex;opacity:1;pointer-events:all;transform:translateY(0)}
      .mobile-drawer .md-group-label{font-family:var(--font-label);font-size:0.5rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--brass);padding:0.9rem 1.4rem 0.4rem}
      .mobile-drawer a{display:block;padding:0.7rem 1.4rem;font-family:var(--font-display);font-size:1rem;color:var(--ivory-dim);text-decoration:none;border-bottom:1px solid var(--border)}
      .mobile-drawer a.active{color:var(--brass-bright)}
      .mobile-drawer .md-utility{display:flex;flex-wrap:wrap;gap:0.7rem 0.9rem;padding:1.1rem 1.4rem 0.4rem;border-top:1px solid var(--border);margin-top:0.6rem}
      @media(min-width:901px){.nav-overlay,body.nav-locked .nav-overlay{display:none}}
      @media(max-width:900px){.nav-burger{display:flex}.app-topbar{padding:0 1rem}.topbar-groups,.topbar-right{display:none}}

      /* ══════════════════════════════════════════════
         SIDEBAR — flat for members, grouped for staff.
         Active state = thin crimson line only, no fill blocks.
         ══════════════════════════════════════════════ */
      .app-sidebar{position:fixed;left:0;top:0;bottom:0;width:var(--sidebar-w);background:var(--panel);border-right:1px solid var(--border);padding:1.6rem 1rem 1.4rem;overflow-y:auto;z-index:210;display:flex;flex-direction:column}
      .sb-brand{display:flex;flex-direction:column;align-items:center;gap:0.4rem;padding:0.35rem 0 1.5rem;margin-bottom:0.3rem;text-decoration:none;position:relative}
      .sb-brand img{width:58px;height:58px;object-fit:contain;opacity:0.95;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.5))}
      .sb-brand-name{font-family:var(--font-label);font-size:0.88rem;letter-spacing:0.22em;color:var(--ivory);font-weight:600;text-align:center;margin-top:0.05rem}
      .sb-brand-tag{font-family:var(--font-mono);font-size:0.48rem;letter-spacing:0.18em;color:var(--ivory-faint);text-transform:uppercase}
      .sb-brand::after{content:'';position:absolute;bottom:0;left:22%;right:22%;height:1px;background:var(--border-brass)}
      .sb-eyebrow{font-family:var(--font-label);font-size:0.5rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--brass);padding:0 0.6rem;margin:1.1rem 0 0.6rem}
      .sb-eyebrow:first-of-type{margin-top:0}
      .app-sidebar .sb-link{display:flex;align-items:center;gap:0.7rem;padding:0.62rem 0.7rem;color:var(--ivory-dim);text-decoration:none;border-left:1.5px solid transparent;transition:color .15s,border-color .15s;margin-bottom:0.05rem;font-family:var(--font-label);font-size:0.66rem;letter-spacing:0.08em;text-transform:uppercase}
      .app-sidebar .sb-link:hover{color:var(--ivory)}
      .app-sidebar .sb-link.active{border-left-color:var(--oxblood-bright);color:var(--brass-bright)}
      .app-sidebar .sb-link svg{width:14px;height:14px;flex-shrink:0;opacity:0.85}
      .app-sidebar .sb-divider{height:1px;background:var(--border);margin:0.9rem 0.7rem}
      .app-sidebar .sb-bottom{margin-top:auto;padding-top:1rem;border-top:1px solid var(--border)}
      .app-sidebar .sb-version{font-family:var(--font-mono);font-size:0.5rem;color:var(--ivory-faint);padding:0.8rem 0.7rem 0;letter-spacing:0.04em}

      .app-sidebar ~ main{margin-left:var(--sidebar-w);max-width:calc(1440px + var(--sidebar-w))}
      @media(max-width:980px){.app-sidebar{display:none}.app-sidebar ~ main{margin-left:0;max-width:1440px}.app-topbar{display:none}}

      main{max-width:1440px;margin:0 auto;padding:2.4rem 2.4rem 5rem;position:relative;z-index:1}

      .page-header{margin-bottom:2.4rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border);position:relative;display:flex;align-items:flex-end;justify-content:space-between;gap:2rem}
      .page-label{font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.28em;text-transform:uppercase;color:var(--brass);margin-bottom:0.8rem;font-weight:500}
      .page-title{font-family:var(--font-display);font-size:clamp(2rem,4vw,2.9rem);color:var(--ivory);font-weight:600;letter-spacing:0.01em;line-height:1.0}
      .page-sub{font-family:var(--font-body);color:var(--ivory-faint);margin-top:0.6rem;font-size:0.86rem;font-weight:300}

      .folio-footnote{font-family:var(--font-body);font-size:0.82rem;color:var(--ivory-dim);line-height:1.85;max-width:660px;margin:0 0 2.2rem;padding-left:1rem;border-left:1px solid var(--border);font-weight:300}
      .folio-footnote strong{color:var(--brass-bright);font-weight:500}

      /* ══════════════════════════════════════════════
         CARDS — thinner border, no corner ornaments,
         used sparingly (prefer plain sections + rules)
         ══════════════════════════════════════════════ */
      .card{background:var(--panel2);border:1px solid var(--border);padding:1.5rem;transition:border-color 0.2s;position:relative;border-radius:1px}
      .card:hover{border-color:var(--border-brass)}
      .card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;padding-bottom:0.8rem;border-bottom:1px solid var(--border)}
      .card-title{font-family:var(--font-label);font-size:0.68rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--ivory);font-weight:500}
      .card-badge{font-family:var(--font-mono);font-size:0.52rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--ivory-faint);background:var(--brass-faint);padding:0.18rem 0.55rem;border:1px solid var(--border)}

      /* ══════════════════════════════════════════════
         FORMS
         ══════════════════════════════════════════════ */
      .form-section{margin-top:1.4rem;padding-top:1.2rem;border-top:1px solid var(--border)}
      .form-row{display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;margin-bottom:0.8rem}
      .form-group{display:flex;flex-direction:column;gap:0.4rem}
      label{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--brass);font-weight:500}
      select,input[type=text],input[type=number],input[type=password],input[type=date],textarea{
        background:var(--input-bg);border:1px solid var(--border-brass);color:var(--ivory);
        padding:0.68rem 0.9rem;font-family:var(--font-body);font-size:0.85rem;font-weight:300;
        width:100%;outline:none;transition:border-color 0.15s;appearance:none;-webkit-appearance:none;border-radius:1px;
      }
      textarea{resize:vertical;min-height:100px}
      select:focus,input:focus,textarea:focus{border-color:var(--brass)}
      select option{background:var(--panel2)}
      .btn-submit{background:transparent;color:var(--ivory);border:1px solid var(--oxblood-bright);padding:0.78rem 1.3rem;font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;font-weight:500;cursor:pointer;width:100%;margin-top:0.5rem;transition:background 0.15s,color 0.15s}
      .btn-submit:hover{background:var(--oxblood-bright);color:var(--noir)}

      .typ-toggle{display:flex;gap:0.4rem;margin-bottom:1rem}
      .typ-btn{flex:1;padding:0.55rem;background:transparent;border:1px solid var(--border);color:var(--ivory-faint);font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:500;cursor:pointer;transition:color 0.15s,border-color 0.15s}
      .typ-btn:hover{color:var(--ivory);border-color:var(--border-brass)}
      .typ-btn.active-vklad{border-color:#5FA875;color:#7CC79A}
      .typ-btn.active-vyber{border-color:var(--border-oxblood);color:var(--oxblood-bright)}

      .info-box{background:var(--brass-faint);border:1px solid var(--border);padding:0.8rem 1rem;font-size:0.8rem;color:var(--ivory-dim);margin-top:0.8rem;display:none;font-family:var(--font-mono)}

      /* ══════════════════════════════════════════════
         STAT STRIP (legacy grid, quieted down)
         ══════════════════════════════════════════════ */
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);margin-bottom:2rem}
      .stat{background:var(--panel2);padding:1.5rem 1.3rem;text-align:center;transition:background 0.2s}
      .stat:hover{background:var(--panel3)}
      .stat-label{font-family:var(--font-label);font-size:0.52rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--brass);margin-bottom:0.65rem}
      .stat-value{font-family:var(--font-display);font-size:1.7rem;font-weight:600;color:var(--ivory);line-height:1}
      .stat-sub{font-family:var(--font-mono);font-size:0.56rem;color:var(--ivory-faint);margin-top:0.45rem}

      .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.4rem}
      .sklad-row{display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid var(--border);font-size:0.84rem}
      .sklad-row:last-child{border-bottom:none}
      .sklad-row em{color:var(--brass);font-style:normal;margin-left:0.5rem;font-size:0.68rem;opacity:0.85;font-family:var(--font-mono)}

      .toast{position:fixed;bottom:1.4rem;right:1.4rem;display:flex;align-items:flex-start;gap:0.8rem;background:var(--panel3);border:1px solid var(--border);border-left:2px solid #5FA875;padding:0.85rem 1.2rem;transform:translateY(20px);opacity:0;transition:transform 0.3s,opacity 0.3s;z-index:999;max-width:340px;box-shadow:var(--shadow);pointer-events:none}
      .toast.show{transform:translateY(0);opacity:1;pointer-events:auto}
      .toast.error{border-left-color:var(--oxblood-bright)}
      .toast-icon{flex:none;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.68rem;background:rgba(95,168,117,0.12);color:#7CC79A;border:1px solid rgba(95,168,117,0.3)}
      .toast.error .toast-icon{background:var(--oxblood-faint);color:var(--oxblood-bright);border-color:var(--border-oxblood)}
      .toast-body{display:flex;flex-direction:column;gap:0.1rem}
      .toast-title{font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--ivory-dim)}
      .toast-msg{font-family:var(--font-body);font-size:0.8rem;color:var(--text);line-height:1.35}

      .table-wrap{overflow-x:auto}
      table{width:100%;border-collapse:collapse;font-size:0.82rem;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
      th{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.12em;text-transform:uppercase;font-weight:500;color:var(--brass);padding:0.65rem 0.9rem;text-align:left;border-bottom:1px solid var(--border)}
      td{padding:0.6rem 0.9rem;border-bottom:1px solid var(--border);color:var(--ivory-dim);font-size:0.82rem}
      tr:last-child td{border-bottom:none}
      tr:hover td{background:var(--brass-faint);color:var(--ivory)}
      .badge{font-family:var(--font-label);font-size:0.52rem;padding:0.16rem 0.55rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:500}
      .badge.vklad,.badge.prijem{color:#7CC79A;border:1px solid rgba(95,168,117,0.3)}
      .badge.vyber,.badge.vydaj{color:var(--oxblood-bright);border:1px solid var(--border-oxblood)}

      /* ══════════════════════════════════════════════
         NEW — Index card, Live Pulse, Briefing, Timeline
         ══════════════════════════════════════════════ */
      .index-card{background:var(--panel2);border:1px solid var(--border);padding:1.8rem 2rem}
      .index-eyebrow{font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--brass);margin-bottom:0.8rem}
      .index-value{font-family:var(--font-display);font-size:4rem;font-weight:600;color:var(--ivory);line-height:1;display:flex;align-items:baseline;gap:0.8rem}
      .index-delta{font-family:var(--font-mono);font-size:0.85rem}
      .index-delta.up{color:#7CC79A}
      .index-delta.down{color:var(--oxblood-bright)}
      .index-health{margin-top:1.2rem;font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--ivory-faint)}
      .index-health strong{color:var(--brass-bright);display:block;margin-top:0.2rem;font-size:0.66rem}

      .pulse-card{background:var(--panel2);border:1px solid var(--border);padding:1.4rem 1.6rem}
      .pulse-title{display:flex;align-items:center;gap:0.5rem;font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--ivory-faint);margin-bottom:0.9rem}
      .pulse-dot{width:6px;height:6px;border-radius:50%;background:var(--oxblood-bright);box-shadow:0 0 6px var(--oxblood-glow);animation:pulseDot 1.8s ease-in-out infinite}
      @keyframes pulseDot{0%,100%{opacity:0.5}50%{opacity:1}}
      .pulse-svg path{stroke:var(--oxblood-bright);stroke-width:1.4;fill:none;filter:drop-shadow(0 0 4px var(--oxblood-glow))}
      .pulse-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-top:1.2rem;padding-top:1.1rem;border-top:1px solid var(--border)}
      .pulse-stat-num{font-family:var(--font-display);font-size:1.3rem;color:var(--ivory);font-weight:600}
      .pulse-stat-label{font-family:var(--font-mono);font-size:0.52rem;color:var(--ivory-faint);letter-spacing:0.03em;margin-top:0.2rem}

      .briefing-card{background:var(--panel2);border:1px solid var(--border);border-left:2px solid var(--oxblood-bright);padding:1.4rem 1.6rem}
      .briefing-eyebrow{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--brass);margin-bottom:0.7rem}
      .briefing-title{font-family:var(--font-display);font-size:1.2rem;color:var(--ivory);margin-bottom:0.5rem}
      .briefing-text{font-family:var(--font-body);font-size:0.82rem;color:var(--ivory-dim);line-height:1.7;font-weight:300;margin-bottom:1rem}
      .briefing-link{font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--brass-bright);text-decoration:none;display:inline-flex;align-items:center;gap:0.4rem}
      .briefing-link:hover{color:var(--ivory)}

      .quiet-timeline{display:flex;flex-direction:column}
      .qt-row{display:grid;grid-template-columns:56px 1fr auto;gap:1rem;padding:0.85rem 0;border-bottom:1px solid var(--border);align-items:start}
      .qt-row:last-child{border-bottom:none}
      .qt-time{font-family:var(--font-mono);font-size:0.72rem;color:var(--ivory-faint);padding-top:0.1rem}
      .qt-main{min-width:0}
      .qt-title{font-family:var(--font-label);font-size:0.7rem;letter-spacing:0.04em;color:var(--ivory);margin-bottom:0.2rem}
      .qt-sub{font-family:var(--font-body);font-size:0.76rem;color:var(--ivory-faint);font-weight:300}
      .qt-amount{font-family:var(--font-mono);font-size:0.8rem;white-space:nowrap;padding-top:0.1rem}
      .qt-amount.pos{color:#7CC79A}
      .qt-amount.neg{color:var(--oxblood-bright)}

      .quick-tile-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:var(--border)}
      .quick-tile{background:var(--panel2);padding:1.1rem 1.2rem;display:flex;align-items:center;gap:0.8rem;text-decoration:none;transition:background 0.15s}
      .quick-tile:hover{background:var(--panel3)}
      .quick-tile svg{width:18px;height:18px;color:var(--brass);flex-shrink:0}
      .quick-tile-label{font-family:var(--font-label);font-size:0.64rem;letter-spacing:0.04em;color:var(--ivory)}
      .quick-tile-sub{font-family:var(--font-mono);font-size:0.54rem;color:var(--ivory-faint);margin-top:0.15rem}

      .nav-card{display:block;background:var(--panel2);border:1px solid var(--border);padding:1.4rem 1.5rem;text-decoration:none;transition:border-color 0.2s}
      .nav-card:hover{border-color:var(--border-brass)}
      .nav-card-cat{font-family:var(--font-label);font-size:0.52rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--brass);margin-bottom:0.5rem}
      .nav-card-title{font-family:var(--font-display);font-size:1.15rem;color:var(--ivory);margin-bottom:0.4rem}
      .nav-card-desc{font-family:var(--font-body);font-size:0.78rem;color:var(--ivory-faint);line-height:1.6;font-weight:300}

      .cat-pill{display:inline-flex;align-items:center;gap:0.4rem;font-family:var(--font-label);font-size:0.5rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.18rem 0.5rem 0.18rem 0.4rem;border:1px solid var(--border)}
      .cat-pill::before{content:'';width:5px;height:5px;border-radius:50%}
      .cat-pill.dulezite::before{background:var(--oxblood-bright)}
      .cat-pill.personalni::before{background:var(--brass-bright)}
      .cat-pill.provozni::before{background:#6FA8C9}
      .cat-pill.ostatni::before{background:var(--ivory-faint)}

      .badge-tile{background:var(--panel2);border:1px solid var(--border);padding:1.1rem 1rem;text-align:center;transition:border-color 0.2s}
      .badge-tile.earned{border-color:var(--border-brass)}
      .badge-tile.locked{opacity:0.35}
      .badge-tile-icon{font-size:1.4rem;margin-bottom:0.5rem}
      .badge-tile-label{font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.04em;color:var(--ivory)}
      .badge-tile-cat{font-family:var(--font-mono);font-size:0.48rem;color:var(--ivory-faint);margin-top:0.3rem;text-transform:uppercase}

      .ledger-loading{display:flex;align-items:center;gap:0.6rem;color:var(--ivory-dim);font-family:var(--font-mono);font-size:0.78rem;padding:0.4rem 0}
      .ledger-loading::before{content:'';width:6px;height:6px;flex-shrink:0;background:var(--oxblood-bright);animation:ledgerPulse 1.3s ease-in-out infinite}
      @keyframes ledgerPulse{0%,100%{opacity:0.5}50%{opacity:1}}
      .ledger-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.8rem;padding:2.2rem 1.5rem;text-align:center}
      .ledger-empty svg{width:56px;height:42px;opacity:0.3;flex-shrink:0}
      .ledger-empty-text{font-family:var(--font-mono);font-size:0.74rem;color:var(--ivory-faint)}
      .ledger-empty.compact{padding:1rem 0.5rem;gap:0.5rem}
      .ledger-empty.compact svg{width:36px;height:27px}

      .folio-rule{height:1px;background:var(--border);margin:2.2rem 0}
      .folio-rule.tight{margin:1.2rem 0}
      .folio-label{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.24em;text-transform:uppercase;color:var(--brass);font-weight:500;display:flex;align-items:center;gap:0.8em}
      .folio-label::after{content:'';flex:1;height:1px;background:var(--border);margin-top:1px}

      .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity 0.25s;backdrop-filter:blur(8px)}
      .modal-overlay.open{opacity:1;pointer-events:all}
      .modal-box{background:var(--panel2);border:1px solid var(--border);border-top:1.5px solid var(--oxblood-bright);padding:2.2rem;max-width:420px;width:90%;box-shadow:var(--shadow)}
      .modal-title{font-family:var(--font-display);font-size:1.15rem;font-weight:600;margin-bottom:0.5rem;color:var(--ivory)}
      .modal-subtitle{font-size:0.8rem;color:var(--ivory-dim);line-height:1.6;margin-bottom:1.5rem}
      .modal-detail{background:var(--panel3);border:1px solid var(--border);padding:0.8rem 1rem;margin-bottom:1.4rem;font-size:0.78rem;color:var(--ivory-dim);display:grid;grid-template-columns:auto 1fr;gap:0.3rem 1rem}
      .modal-detail dt{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--brass)}
      .modal-detail dd{color:var(--ivory)}
      .modal-actions{display:flex;gap:0.6rem}
      .modal-btn-cancel{flex:1;padding:0.7rem;background:transparent;border:1px solid var(--border-brass);color:var(--ivory-faint);font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer}
      .modal-btn-confirm{flex:2;padding:0.7rem;background:var(--oxblood-bright);color:var(--noir);border:1px solid var(--oxblood-bright);font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;cursor:pointer}
      .modal-box.stamped{opacity:0.7}
      .seal-stamp{display:none}

      .rank-item{display:flex;gap:1.4rem;align-items:flex-start;padding:1.4rem 0;border-bottom:1px solid var(--border)}
      .rank-item:last-child{border-bottom:none}
      .rank-num{font-family:var(--font-display);font-size:1.5rem;color:var(--brass);opacity:0.4;min-width:2.4rem}
      .rank-item.founder .rank-num{opacity:1;color:var(--oxblood-bright)}
      .rank-info h3{font-family:var(--font-display);font-size:1.05rem;color:var(--ivory);margin-bottom:0.2rem}
      .rank-info .rank-member{font-family:var(--font-label);font-size:0.66rem;color:var(--ivory-dim);margin-bottom:0.4rem}
      .rank-info p{font-family:var(--font-body);font-size:0.82rem;color:var(--ivory-dim);line-height:1.7;font-weight:300}
      .rank-rights{margin-top:0.7rem;display:flex;flex-wrap:wrap;gap:0.3rem}
      .rank-right-tag{font-family:var(--font-label);font-size:0.52rem;letter-spacing:0.06em;padding:0.18rem 0.55rem;border:1px solid var(--border);color:var(--ivory-dim)}

      .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.4rem}
      .stat-card{background:var(--panel2);border:1px solid var(--border);padding:1.5rem}
      .stat-card-header{display:flex;justify-content:space-between;margin-bottom:1rem;padding-bottom:0.8rem;border-bottom:1px solid var(--border)}
      .stat-card-name{font-family:var(--font-display);font-size:1.05rem;color:var(--ivory)}
      .stat-row{display:flex;justify-content:space-between;font-size:0.82rem;padding:0.3rem 0;color:var(--ivory-dim)}
      .stat-row strong{color:var(--ivory);font-weight:500}
      .stat-section-label{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--brass);margin-top:0.8rem;margin-bottom:0.3rem;padding-top:0.6rem;border-top:1px solid var(--border)}

      .upload-zone{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.5rem;background:var(--panel3);border:1px dashed var(--border-brass);cursor:pointer;color:var(--ivory-faint);overflow:hidden;text-align:center}
      .upload-zone:hover{border-color:var(--brass);color:var(--ivory-dim)}
      .upload-zone svg{width:22px;height:22px;opacity:0.55}
      .upload-preview{position:absolute;inset:0;width:100%;height:100%}
      .upload-zone.has-image svg,.upload-zone.has-image .upload-zone-text{display:none}
      .upload-clear{position:absolute;top:0.3rem;right:0.3rem;z-index:2;width:20px;height:20px;background:rgba(0,0,0,0.6);color:var(--ivory);border:1px solid var(--border);cursor:pointer;display:none;align-items:center;justify-content:center;font-size:0.6rem}
      .upload-zone.has-image .upload-clear{display:flex}

      @media(max-width:768px){main{padding:1.4rem 1rem}.page-header{flex-direction:column;align-items:flex-start;gap:0.7rem}.form-row{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:640px){.pulse-stats,.quick-tile-grid{grid-template-columns:1fr 1fr}}

      .skeleton{background:linear-gradient(90deg,var(--panel3) 25%,var(--panel4) 50%,var(--panel3) 75%);background-size:200% 100%;animation:skeletonShine 1.4s ease-in-out infinite}
      @keyframes skeletonShine{0%{background-position:200% 0}100%{background-position:-200% 0}}
      .skeleton-line{height:0.85rem;margin:0.45rem 0;border-radius:2px}
      .skeleton-row{display:flex;gap:0.8rem;padding:0.6rem 0;border-bottom:1px solid var(--border)}

      tr.rank-elite td{border-left:2px solid var(--brass-bright)}
      tr.rank-elite td:first-child{padding-left:calc(0.9rem - 2px)}
      .rank-elite-tag{font-family:var(--font-label);font-size:0.46rem;letter-spacing:0.06em;color:var(--brass-bright);border:1px solid var(--border-brass);padding:0.03rem 0.32rem;margin-left:0.35rem;text-transform:uppercase}

      /* ══════════════════════════════════════════════
         COMPATIBILITY LAYER — classes relied on by pages
         that keep their own markup as-is (Galerie, Trading
         karta, Blackbook, Evelyn widget) plus dash-widget
         used by the new Dashboard/History pages.
         ══════════════════════════════════════════════ */
      .quick-btn{display:inline-flex;align-items:center;gap:0.4rem;padding:0.55rem 1rem;background:transparent;border:1px solid var(--border-brass);color:var(--ivory-dim);font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:500;text-decoration:none;transition:border-color .2s,color .2s;cursor:pointer}
      .quick-btn:hover{border-color:var(--brass);color:var(--brass-bright)}
      .quick-btn.primary{border-color:var(--oxblood-bright);color:var(--ivory)}
      .quick-btn.primary:hover{background:var(--oxblood-bright);color:var(--noir)}

      .dash-widget{background:var(--panel2);border:1px solid var(--border);padding:1.4rem 1.5rem}
      .dash-widget-title{font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--brass);margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between}
      .dash-notice-card{background:var(--panel2);border:1px solid var(--border);border-left:2px solid var(--oxblood-bright);padding:1.4rem 1.5rem}
      .dash-notice-eyebrow{font-family:var(--font-label);font-size:0.52rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--brass);margin-bottom:0.6rem}
      .dash-notice-title{font-family:var(--font-display);font-size:1.05rem;color:var(--ivory);margin-bottom:0.5rem}
      .dash-notice-text{font-family:var(--font-body);font-size:0.8rem;color:var(--ivory-dim);line-height:1.6;font-weight:300}
      .dash-notice-btn{display:inline-flex;align-items:center;gap:0.4rem;margin-top:0.9rem;font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--brass-bright);text-decoration:none}

      .gal-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem}
      .gal-item{background:var(--panel2);border:1px solid var(--border);overflow:hidden;position:relative}
      .gal-item img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
      .gal-caption{padding:0.7rem 0.9rem 0.2rem;font-size:0.8rem;color:var(--ivory-dim)}
      .gal-meta{font-family:var(--font-mono);font-size:0.6rem;color:var(--ivory-faint);padding:0 0.9rem 0.7rem}
      .gal-del{position:absolute;top:0.5rem;right:0.5rem;background:rgba(0,0,0,0.6);color:#fff;border:none;width:24px;height:24px;cursor:pointer}

      .trading-card{max-width:400px;margin:0 auto;background:var(--panel2);border:1px solid var(--border-brass);position:relative;overflow:hidden}
      .tc-header{background:var(--oxblood);padding:2rem 1.4rem 1.6rem;text-align:center;position:relative}
      .tc-avatar{width:112px;height:112px;border-radius:50%;border:2px solid var(--brass-bright);object-fit:cover;background:var(--panel3);margin:0 auto 0.8rem;display:block}
      .tc-name{font-family:var(--font-display);font-weight:600;font-size:1.35rem;color:var(--ivory)}
      .tc-discord{font-family:var(--font-mono);font-size:0.68rem;color:var(--ivory-dim);margin-top:0.25rem}
      .tc-body{padding:1.5rem 1.5rem 1.7rem}
      .tc-stat{display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border);font-size:0.82rem}
      .tc-badges{display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.8rem}
      .tc-badge{display:flex;align-items:center;font-family:var(--font-label);font-size:0.54rem;padding:0.28rem 0.6rem;border:1px solid var(--border-brass);color:var(--brass-bright)}
      .tc-badge-icon{margin-right:0.3rem}
      .tc-foil-shine{display:none} /* redesign drops the foil-shine animation, kept as no-op so old markup doesn't error */
      .trading-card.card-foil-gold{border-color:var(--brass-bright)}
      .trading-card.card-foil-silver{border-color:#B7ACA0}

      .folio-spread{display:grid;grid-template-columns:1fr 260px;gap:2.2rem;align-items:start}
      .folio-panel + .folio-panel{margin-top:1.6rem}
      .marginalia{font-family:var(--font-mono);font-size:0.64rem;color:var(--ivory-faint);line-height:1.8;border-left:1px solid var(--border);padding-left:0.9rem}
      .marginalia .m-line{display:flex;justify-content:space-between;gap:1rem;padding:0.25rem 0;border-bottom:1px solid var(--border)}
      .marginalia .m-line .m-val{color:var(--ivory)}
      .manifest-row{display:flex;align-items:baseline;gap:0.5rem;padding:0.7rem 0;border-bottom:1px solid var(--border);font-size:0.86rem}
      .manifest-row .mr-name{color:var(--ivory);font-family:var(--font-display);flex-shrink:0}
      .manifest-row .mr-dots{flex:1;border-bottom:1px dotted var(--border-hover);transform:translateY(-0.3em)}
      .manifest-row .mr-val{font-family:var(--font-mono);color:var(--ivory-dim);font-size:0.78rem}
      .manifest-col-head{display:flex;justify-content:space-between;margin-bottom:0.7rem;padding-bottom:0.6rem;border-bottom:1px solid var(--border)}
      .manifest-col-title{font-family:var(--font-display);font-size:1rem;color:var(--ivory)}
      .manifest-col-count{font-family:var(--font-mono);font-size:0.7rem;color:var(--ivory-faint)}
      .manifest-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0 2rem}

      .ledger-bar-row{display:grid;grid-template-columns:1fr 2.6fr auto;gap:1rem;align-items:baseline;padding:0.5rem 0;border-bottom:1px solid var(--border)}
      .ledger-bar-name{font-family:var(--font-display);font-size:0.86rem;color:var(--ivory);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ledger-bar-track{position:relative;height:1px;background:var(--border);align-self:center}
      .ledger-bar-fill{position:absolute;top:-1.5px;bottom:-1.5px;left:0;background:var(--oxblood-bright)}
      .ledger-bar-val{font-family:var(--font-mono);font-size:0.76rem;color:var(--ivory);text-align:right}

      .recommendation{display:flex;gap:0.9rem;padding:0.8rem 0;border-bottom:1px solid var(--border)}
      .recommendation-mark{font-family:var(--font-display);font-weight:700;width:1.5rem;height:1.5rem;display:flex;align-items:center;justify-content:center;border:1px solid currentColor;flex-shrink:0}
      .recommendation-cat{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:0.25rem}
      .recommendation-text{font-size:0.82rem;color:var(--ivory);line-height:1.6}

      .report-figures{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);margin:1.4rem 0 2rem}
      .report-figure{padding:1.1rem 1.3rem;border-left:1px solid var(--border)}
      .report-figure:first-child{border-left:none}
      .report-figure-label{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--brass);margin-bottom:0.5rem}
      .report-figure-net{font-family:var(--font-display);font-weight:600;font-size:1.35rem;line-height:1;margin-bottom:0.5rem}
      .report-figure-line{display:flex;justify-content:space-between;font-size:0.68rem;color:var(--ivory-dim);padding:0.1rem 0;font-family:var(--font-mono)}

      .cont-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.6rem}
      @media(max-width:980px){.cont-grid{grid-template-columns:1fr}.folio-spread{grid-template-columns:1fr}.manifest-grid{grid-template-columns:1fr}}
      .cont-col-title{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.16em;text-transform:uppercase;font-weight:600;margin-bottom:0.9rem;padding-bottom:0.6rem;border-bottom:1px solid var(--border)}
      .cont-entry{position:relative;background:var(--panel2);border:1px solid var(--border);padding:1rem 1.2rem;margin-bottom:0.8rem}
      .cont-entry.settled{opacity:0.55}
      .cont-entry-row{display:flex;justify-content:space-between;gap:1rem;margin-bottom:0.3rem}
      .cont-entry-who{font-family:var(--font-display);font-size:0.98rem;color:var(--ivory)}
      .cont-entry-amount{font-family:var(--font-mono);font-size:0.86rem}
      .cont-entry-reason{font-family:var(--font-body);font-size:0.78rem;color:var(--ivory-dim);margin-bottom:0.4rem;font-weight:300}
      .cont-entry-meta{display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:0.6rem;color:var(--ivory-faint)}
      .cont-entry-actions{margin-top:0.6rem;display:flex;gap:0.5rem}
      .cont-seal{display:none}
      .cont-btn-settle{padding:0.35rem 0.8rem;background:transparent;border:1px solid var(--border-brass);color:var(--ivory-dim);font-family:var(--font-label);font-size:0.5rem;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer}
      .cont-btn-del{padding:0.35rem 0.6rem;background:transparent;border:1px solid var(--border-oxblood);color:var(--oxblood-bright);font-family:var(--font-label);font-size:0.5rem;cursor:pointer}

      .evelyn-widget{position:relative;display:flex;align-items:center;gap:0.5rem;cursor:pointer}
      .evelyn-portrait{width:26px;height:26px;border-radius:50%;border:1px solid var(--border-brass);object-fit:cover;background:var(--panel3);flex-shrink:0}
      .evelyn-bubble{display:none}
      .evelyn-ping{position:absolute;top:-2px;right:-2px;width:8px;height:8px;border-radius:50%;background:var(--oxblood-bright);border:1.5px solid var(--noir);opacity:0}
      .evelyn-ping.show{opacity:1}
      .evelyn-letter{position:fixed;top:calc(var(--nav-h) + 8px);right:1.4rem;z-index:250;width:min(360px,92vw);background:var(--panel2);border:1px solid var(--border);border-top:1.5px solid var(--oxblood-bright);opacity:0;transform:translateY(-8px);pointer-events:none;transition:opacity 0.25s,transform 0.25s}
      .evelyn-letter.show{opacity:1;transform:translateY(0);pointer-events:all}
      .evelyn-letter-head{display:flex;align-items:center;justify-content:space-between;gap:0.6rem;padding:0.7rem 0.9rem;border-bottom:1px solid var(--border)}
      .evelyn-letter-from{font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--brass-bright)}
      .evelyn-letter-body{padding:1rem 1.1rem 1.1rem;max-height:58vh;overflow-y:auto}
      @media(max-width:880px){.evelyn-letter{right:1rem;left:1rem;width:auto}}

      /* ── DARKCHAT — plovoucí bublina + panel na každé stránce ── */
      .dc-bubble{position:fixed;bottom:1.5rem;right:1.5rem;width:52px;height:52px;border-radius:50%;background:var(--oxblood);border:1px solid var(--oxblood-bright);color:var(--ivory);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:400;box-shadow:0 4px 16px rgba(0,0,0,0.45);transition:transform 0.15s}
      .dc-bubble:hover{transform:scale(1.06)}
      .dc-bubble svg{width:24px;height:24px}
      .dc-bubble-badge{position:absolute;top:-3px;right:-3px;background:var(--brass-bright);color:#1a1108;font-family:var(--font-mono);font-weight:700;font-size:0.62rem;min-width:18px;height:18px;border-radius:9px;display:flex;align-items:center;justify-content:center;padding:0 4px;border:1.5px solid var(--noir)}
      .dc-panel{position:fixed;bottom:5.6rem;right:1.5rem;width:340px;max-width:calc(100vw - 2rem);height:460px;max-height:70vh;background:var(--panel2);border:1px solid var(--border-brass);display:flex;flex-direction:column;z-index:400;box-shadow:0 10px 36px rgba(0,0,0,0.55);opacity:0;pointer-events:none;transform:translateY(14px);transition:opacity 0.2s,transform 0.2s}
      .dc-panel.open{opacity:1;pointer-events:all;transform:translateY(0)}
      .dc-panel-head{display:flex;justify-content:space-between;align-items:center;padding:0.8rem 1rem;border-bottom:1px solid var(--border-brass);font-family:var(--font-label);font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--brass-bright)}
      .dc-panel-head button{background:none;border:none;color:var(--ivory-faint);cursor:pointer;font-size:0.85rem}
      .dc-panel-head button:hover{color:var(--ivory)}
      .dc-panel-log{flex:1;overflow-y:auto;padding:0.9rem 1rem;display:flex;flex-direction:column;gap:0.7rem}
      .dc-msg{max-width:85%}
      .dc-msg.me{align-self:flex-end;text-align:right}
      .dc-msg-meta{font-family:var(--font-mono);font-size:0.56rem;color:var(--ivory-faint);margin-bottom:0.2rem}
      .dc-msg-bubble{display:inline-block;background:var(--panel3);border:1px solid var(--border);padding:0.5rem 0.7rem;font-family:var(--font-body);font-size:0.8rem;color:var(--ivory-dim);line-height:1.5;text-align:left;font-weight:300}
      .dc-msg.me .dc-msg-bubble{background:var(--oxblood-faint);border-color:var(--border-oxblood);color:var(--ivory)}
      .dc-msg-bubble strong{color:var(--ivory);font-weight:600}
      .dc-msg-bubble em{font-style:italic}
      .dc-msg-bubble u{text-decoration:underline}
      .dc-msg-bubble code{font-family:var(--font-mono);font-size:0.82em;background:rgba(0,0,0,0.25);padding:0.05rem 0.35rem}
      .dc-msg-bubble .mention{color:var(--brass-bright);font-weight:600}
      .dc-panel-input-row{display:flex;gap:0.5rem;padding:0.7rem 0.8rem;border-top:1px solid var(--border-brass)}
      .dc-panel-input-row textarea{flex:1;resize:none;min-height:2.1rem;max-height:70px;background:var(--input-bg);border:1px solid var(--border);color:var(--ivory);font-family:var(--font-body);font-size:0.8rem;padding:0.4rem 0.6rem}
      .dc-panel-input-row textarea:focus{outline:none;border-color:var(--brass)}
      .dc-panel-send-btn{flex:0 0 auto;width:36px;background:var(--oxblood);color:var(--ivory);border:1px solid var(--oxblood);cursor:pointer;font-size:0.9rem}
      .dc-panel-send-btn:disabled{opacity:0.5;cursor:default}
      @media(max-width:480px){.dc-panel{right:0.6rem;left:0.6rem;width:auto;bottom:5.2rem}.dc-bubble{right:1rem;bottom:1rem}}

      .profil-tab-panel{display:none}
      .profil-tab-panel.active{display:block;animation:fadeReveal 0.3s ease-out 1}
      .report-nav{display:flex;flex-wrap:wrap;gap:0 1.8rem;margin-bottom:0.4rem;border-bottom:1px solid var(--border)}
      .report-nav-item{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--ivory-faint);padding:0.65rem 0;cursor:pointer;background:none;border:none;border-bottom:1.5px solid transparent;transition:color 0.2s,border-color 0.2s;white-space:nowrap}
      .report-nav-item.active{color:var(--brass-bright);border-bottom-color:var(--oxblood-bright)}
      .report-section{display:none}
      .report-section.active{display:block;animation:fadeReveal 0.3s ease-out 1}
    </style>
  `;
}

module.exports = { baseStyles, ledgerEmpty };
