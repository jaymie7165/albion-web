// styles.js — sdílené CSS (baseStyles) a drobné HTML helpery (ledgerEmpty)
// Redesign: stříbro/platina jako hlavní akcent (místo zlata/mosazi), karmínová zůstává.

function ledgerEmpty(text, compact) {
  return `<div class="ledger-empty${compact ? ' compact' : ''}">
    <svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="2" width="58" height="44" rx="2" stroke="var(--border-brass)" stroke-width="1.5"/>
      <line x1="12" y1="14" x2="44" y2="14" stroke="var(--border)" stroke-width="1.5"/>
      <line x1="12" y1="22" x2="52" y2="22" stroke="var(--border)" stroke-width="1.5"/>
      <line x1="12" y1="30" x2="38" y2="30" stroke="var(--border)" stroke-width="1.5"/>
      <line x1="12" y1="38" x2="48" y2="38" stroke="var(--border)" stroke-width="1.5"/>
    </svg>
    <div class="ledger-empty-text">${text}</div>
  </div>`;
}


function baseStyles() {
  return `
    <link rel="icon" type="image/png" href="/logo.png">
    <link rel="apple-touch-icon" href="/logo.png">
    <link rel="manifest" href="/manifest.webmanifest">
    <meta name="theme-color" content="#0A0908">
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;0,9..144,900;1,9..144,500;1,9..144,600&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}

      :root{
        /* ── LEDGER — operational mode (the working register) ── */
        --ink:#070605;
        --ink-soft:#0A0908;
        --leather:#120F0C;
        --leather2:#171310;
        --leather3:#1D1814;
        --leather4:#241E18;
        --seal:#8B1A1A;
        --seal-bright:#B23B3B;
        --seal-glow:rgba(139,26,26,0.20);
        --seal-deep:#5C0F0F;
        --blood:#E8231C;
        --blood-glow:rgba(232,35,28,0.35);
        --brass:#A9B4B8;
        --brass-bright:#E4ECEE;
        --brass-dim:rgba(169,180,184,0.16);
        --brass-line:rgba(169,180,184,0.34);
        --vellum:#E9EDEE;
        --vellum-bright:#F7FAFB;
        --parchment-dim:#9CA3A6;
        --text:#E2E7E9;
        --text-dim:#9CA3A6;
        --text-muted:#6A7174;
        --text-label:#5A6164;
        --border:rgba(169,180,184,0.11);
        --border-hover:rgba(169,180,184,0.28);
        --border-seal:rgba(139,26,26,0.32);
        --border-brass:rgba(169,180,184,0.30);
        --gold-dim:rgba(169,180,184,0.11);
        --true-gold:#A9B4B8;
        --true-gold-dim:rgba(169,180,184,0.16);
        --input-bg:#0C0A08;
        --shadow:0 16px 50px rgba(0,0,0,0.75);
        --shadow-card:0 2px 20px rgba(0,0,0,0.5);
        --nav-h:68px;
        --font-display:'Fraunces',serif;
        --font-mono:'JetBrains Mono',monospace;
        /* legacy aliases kept so untouched inline styles still resolve */
        --crimson:var(--seal);
        --crimson-light:var(--seal-bright);
        --crimson-glow:var(--seal-glow);
        --crimson-bright:var(--seal-bright);
        --money:#3A7D2D;
        --silver:var(--text-dim);
        --silver-bright:var(--text);
        --silver-dim:rgba(169,180,184,0.06);
        --bg:var(--ink);
        --bg-soft:var(--ink-soft);
        --bg-mid:var(--leather);
        --bg-card:var(--leather2);
        --bg-card2:var(--leather3);
        --bg-card3:var(--leather4);
        --gold:var(--brass);
        --border-silver:var(--border);
        --border-gold:var(--border-seal);
      }
      body.light{
        /* ── VELLUM — paper documentation mode ── */
        --seal:#A1271F;
        --seal-bright:#BE3A30;
        --seal-glow:rgba(161,39,31,0.10);
        --seal-deep:#7A1812;
        --blood:#D11F18;
        --blood-glow:rgba(209,31,24,0.22);
        --brass:#52606A;
        --brass-bright:#37434C;
        --brass-dim:rgba(82,96,106,0.10);
        --brass-line:rgba(82,96,106,0.30);
        --ink:#F3EEE3;
        --ink-soft:#ECE5D6;
        --leather:#E6DDC9;
        --leather2:#FBF8F0;
        --leather3:#F1EBDC;
        --leather4:#E9E1CE;
        --vellum:#241F17;
        --vellum-bright:#15110C;
        --text:#241F17;
        --text-dim:#5C5340;
        --text-muted:#8C8264;
        --text-label:#6B6249;
        --border:rgba(36,31,23,0.10);
        --border-hover:rgba(36,31,23,0.22);
        --border-seal:rgba(161,39,31,0.30);
        --border-brass:rgba(82,96,106,0.32);
        --gold-dim:rgba(82,96,106,0.08);
        --true-gold:#52606A;
        --true-gold-dim:rgba(82,96,106,0.10);
        --input-bg:#FFFFFF;
        --shadow:0 8px 30px rgba(40,30,10,0.10);
        --shadow-card:0 2px 12px rgba(40,30,10,0.07);
        --crimson:var(--seal);--crimson-light:var(--seal-bright);--crimson-glow:var(--seal-glow);--crimson-bright:var(--seal-bright);
        --silver:var(--text-dim);--silver-bright:var(--text);--silver-dim:rgba(82,96,106,0.05);
        --bg:var(--ink);--bg-soft:var(--ink-soft);--bg-mid:var(--leather);--bg-card:var(--leather2);--bg-card2:var(--leather3);--bg-card3:var(--leather4);
        --gold:var(--brass);--border-silver:var(--border);--border-gold:var(--border-seal);
      }
      body.crystal{
        /* ── OBSIDIAN — encrypted / private channel mode ── */
        --seal:#C23B3B;
        --seal-bright:#DB5252;
        --seal-glow:rgba(194,59,59,0.18);
        --seal-deep:#7E1F1F;
        --blood:#FF3B30;
        --blood-glow:rgba(255,59,48,0.30);
        --brass:#6FA8C9;
        --brass-bright:#8FC2E0;
        --brass-dim:rgba(111,168,201,0.12);
        --brass-line:rgba(111,168,201,0.28);
        --ink:#070B10;
        --ink-soft:rgba(12,18,26,0.6);
        --leather:rgba(14,21,30,0.55);
        --leather2:rgba(16,24,34,0.55);
        --leather3:rgba(20,29,40,0.55);
        --leather4:rgba(24,35,48,0.55);
        --text:#E4EEF5;
        --text-dim:#85A0B3;
        --text-muted:#4D6376;
        --text-label:#5E7A8C;
        --vellum:#E4EEF5;
        --vellum-bright:#F5FAFD;
        --border:rgba(111,168,201,0.16);
        --border-hover:rgba(111,168,201,0.30);
        --border-seal:rgba(194,59,59,0.30);
        --border-brass:rgba(111,168,201,0.28);
        --gold-dim:rgba(111,168,201,0.08);
        --true-gold:#6FA8C9;
        --true-gold-dim:rgba(111,168,201,0.12);
        --input-bg:rgba(7,12,18,0.6);
        --shadow:0 10px 36px rgba(0,4,12,0.55);
        --shadow-card:0 2px 20px rgba(0,8,24,0.40);
        --crystal-blur:14px;
        --crimson:var(--seal);--crimson-light:var(--seal-bright);--crimson-glow:var(--seal-glow);--crimson-bright:var(--seal-bright);
        --silver:var(--text-dim);--silver-bright:var(--text);--silver-dim:rgba(111,168,201,0.07);
        --bg:var(--ink);--bg-soft:var(--ink-soft);--bg-mid:var(--leather);--bg-card:var(--leather2);--bg-card2:var(--leather3);--bg-card3:var(--leather4);
        --gold:var(--brass);--border-silver:var(--border);--border-gold:var(--border-seal);
      }

      html{scroll-behavior:smooth}
      body{
        background:var(--bg);
        color:var(--text);
        font-family:'Inter',sans-serif;
        font-weight:400;
        font-size:15px;
        line-height:1.6;
        min-height:100vh;
        transition:background 0.4s,color 0.4s;
        animation:pageFadeIn 0.5s cubic-bezier(0.22,1,0.36,1);
        position:relative;
      }

      /* ── PAPER GRAIN + VIGNETTE — felt, not rendered ── */
      body::before{
        content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
        background-image:
          radial-gradient(ellipse 90% 70% at 50% -10%, rgba(139,26,26,0.07), transparent 60%),
          radial-gradient(ellipse 70% 60% at 100% 110%, rgba(169,180,184,0.05), transparent 60%);
      }
      body::after{
        content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
        box-shadow:inset 0 0 26vw rgba(0,0,0,0.55);
        opacity:0.85;
      }
      body.light::before{
        background-image:
          radial-gradient(ellipse 90% 70% at 50% -10%, rgba(161,39,31,0.05), transparent 60%),
          radial-gradient(ellipse 70% 60% at 100% 110%, rgba(82,96,106,0.05), transparent 60%);
      }
      body.light::after{box-shadow:inset 0 0 22vw rgba(60,45,20,0.10);opacity:1}

      @keyframes pageFadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeReveal{0%{opacity:0;transform:translateY(3px)}100%{opacity:1;transform:translateY(0)}}
      .glitch-in{animation:fadeReveal 0.55s ease-out 1}

      /* legacy hooks kept inert */
      .hud-scan,.hud-readout,.hud-corner-tr{display:none}

      /* ── SCROLLBAR ── */
      ::-webkit-scrollbar{width:5px;height:5px}
      ::-webkit-scrollbar-track{background:var(--bg-soft)}
      ::-webkit-scrollbar-thumb{background:var(--seal);border-radius:3px;opacity:0.5}
      ::-webkit-scrollbar-thumb:hover{background:var(--seal-bright)}

      /* ── SEAL EMBLEM — signature element ── */
      .seal-mark{
        position:relative;width:1em;height:1em;display:inline-block;flex-shrink:0;
      }
      .seal-emblem{
        display:inline-flex;align-items:center;justify-content:center;
        border-radius:50%;
        border:1.5px solid var(--brass);
        color:var(--brass);
        font-family:var(--font-display);
        position:relative;
        box-shadow:0 0 0 1px var(--ink) inset, 0 0 14px var(--seal-glow);
      }
      .seal-emblem::before{
        content:'';position:absolute;inset:3px;border-radius:50%;
        border:1px solid var(--brass-line);
        opacity:0.6;
      }

      /* ── NAV ── */
      nav{
        background:var(--bg-card);
        border-bottom:1px solid var(--border-brass);
        padding:0 2rem;
        display:flex;
        align-items:center;
        justify-content:space-between;
        position:sticky;
        top:0;
        z-index:200;
        height:var(--nav-h);
        transition:background 0.3s,border-color 0.3s;
        box-shadow:0 1px 0 rgba(0,0,0,0.4), var(--shadow-card);
      }
      body.crystal nav{
        background:var(--bg-card);
        backdrop-filter:blur(var(--crystal-blur));
        -webkit-backdrop-filter:blur(var(--crystal-blur));
      }
      nav::after{
        content:'';position:absolute;left:0;right:0;bottom:-1px;height:1px;
        background:linear-gradient(90deg,transparent,var(--seal) 18%,var(--brass) 50%,var(--seal) 82%,transparent);
        opacity:0.55;
      }

      .nav-logo{
        font-family:var(--font-display);
        letter-spacing:0.1em;
        font-size:1.18rem;
        font-weight:700;
        text-transform:uppercase;
        text-decoration:none;
        color:var(--text);
        display:flex;
        align-items:center;
        gap:0.9rem;
        flex-shrink:0;
        transition:opacity 0.2s;
      }
      .nav-logo:hover{opacity:0.82}
      .nav-logo-img{
        width:34px;height:34px;
        object-fit:contain;
        transition:transform 0.25s;
        filter:drop-shadow(0 0 6px rgba(169,180,184,0.35));
      }
      .nav-logo:hover .nav-logo-img{transform:scale(1.06) rotate(-3deg)}
      .nav-logo-text .b-red{color:var(--seal)}

      .nav-burger{
        display:none;
        flex-direction:column;justify-content:center;gap:5px;
        width:34px;height:34px;background:none;border:1px solid var(--border-brass);
        border-radius:3px;cursor:pointer;flex-shrink:0;padding:0;
        align-items:center;
      }
      .nav-burger span{
        display:block;width:17px;height:1.5px;background:var(--brass);
        transition:transform 0.25s,opacity 0.2s;
      }
      .nav-burger.open span:nth-child(1){transform:translateY(6.5px) rotate(45deg)}
      .nav-burger.open span:nth-child(2){opacity:0}
      .nav-burger.open span:nth-child(3){transform:translateY(-6.5px) rotate(-45deg)}

      .nav-menu{display:flex;gap:0;list-style:none;height:100%}
      .nav-menu li{height:100%}
      .nav-menu a{
        display:flex;align-items:center;flex-direction:column;justify-content:center;
        padding:0 1.15rem;
        height:100%;
        font-size:0.66rem;
        letter-spacing:0.12em;
        text-transform:uppercase;
        font-weight:600;
        color:var(--text-dim);
        text-decoration:none;
        border-bottom:2px solid transparent;
        transition:color 0.2s,border-color 0.2s,background 0.2s;
        white-space:nowrap;
        position:relative;
        gap:0.22rem;
        font-family:'Inter',sans-serif;
      }
      .nav-menu a:hover{color:var(--text);background:var(--silver-dim)}
      .nav-menu a.active{color:var(--brass-bright);border-bottom-color:var(--seal)}
      .nav-menu a .nav-desc{
        font-size:0.54rem;letter-spacing:0.04em;
        color:var(--text-muted);opacity:0.8;
        font-weight:400;line-height:1;
        font-family:var(--font-mono);
      }

      .nav-right{display:flex;align-items:center;gap:0.8rem;flex-shrink:0}
      .nav-user{font-size:0.72rem;color:var(--text-muted);letter-spacing:0.02em;white-space:nowrap;font-family:var(--font-mono)}
      .nav-user strong{color:var(--vellum);font-weight:500;font-family:'Inter',sans-serif}
      .nav-logout{
        font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;
        color:var(--seal-bright);text-decoration:none;
        padding:0.4rem 0.95rem;
        border:1px solid var(--border-seal);
        transition:all 0.2s;
        border-radius:2px;
      }
      .nav-logout:hover{background:var(--seal-glow);border-color:var(--seal)}
      .theme-switcher{display:flex;align-items:center;gap:6px}
      .theme-dot-btn{
        width:13px;height:13px;border-radius:50%;border:2px solid transparent;
        cursor:pointer;transition:transform 0.18s,border-color 0.18s,box-shadow 0.18s;
        flex-shrink:0;outline:none;padding:0;
      }
      .theme-dot-btn:hover{transform:scale(1.25)}
      .theme-dot-btn.active{border-color:var(--vellum);box-shadow:0 0 0 1px var(--bg),0 0 6px rgba(169,180,184,0.4)}
      .nav-shortcut-hint{
        font-family:var(--font-mono);font-size:0.62rem;letter-spacing:0.05em;
        color:var(--text-muted);border:1px solid var(--border);
        padding:0.22rem 0.5rem;border-radius:2px;cursor:default;
        opacity:0.6;transition:opacity 0.2s,border-color 0.2s;
        flex-shrink:0;
      }
      .nav-shortcut-hint:hover{opacity:1;border-color:var(--border-brass)}
      @media(max-width:880px){.nav-shortcut-hint{display:none}}
      .notif-bell{
        position:relative;cursor:pointer;background:none;border:none;
        color:var(--text-muted);padding:0.3rem;transition:color 0.2s;
        display:flex;align-items:center;
      }
      .notif-bell svg{width:18px;height:18px}
      .notif-bell:hover{color:var(--seal-bright)}
      .notif-badge{
        position:absolute;top:-3px;right:-5px;
        background:var(--seal);color:var(--vellum-bright);
        font-size:0.5rem;min-width:14px;height:14px;
        border-radius:7px;display:none;align-items:center;justify-content:center;padding:0 3px;
        font-weight:700;
      }
      .notif-badge.visible{display:flex}

      /* ── MOBILE NAV — overlay + slide panel ── */
      .nav-overlay{
        position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:190;
        opacity:0;pointer-events:none;transition:opacity 0.25s;
        backdrop-filter:blur(2px);
      }
      body.nav-locked{overflow:hidden}
      body.nav-locked .nav-overlay{opacity:1;pointer-events:all}

      @media(max-width:880px){
        .nav-burger{display:flex}
        nav{padding:0 1.1rem}
        .nav-menu{
          display:flex;flex-direction:column;height:auto;gap:0;
          position:fixed;top:var(--nav-h);left:0;right:0;bottom:0;
          background:var(--bg-card);
          border-top:1px solid var(--border-brass);
          padding:0.5rem 0 1rem;
          overflow-y:auto;
          transform:translateY(-8px);
          opacity:0;pointer-events:none;
          transition:opacity 0.2s,transform 0.2s;
          z-index:195;
        }
        .nav-menu.mobile-open{opacity:1;pointer-events:all;transform:translateY(0)}
        .nav-menu li{height:auto;width:100%}
        .nav-menu a,.nav-drop-trigger{
          height:auto;flex-direction:row;justify-content:space-between;
          padding:0.95rem 1.4rem;width:100%;border-bottom:1px solid var(--border);
          border-left:2px solid transparent;
        }
        .nav-menu a.active,.nav-drop-trigger.active{border-bottom:1px solid var(--border);border-left-color:var(--seal)}
        .nav-menu a .nav-desc{display:none}
        .nav-drop-arrow{margin-top:0}
        .nav-dropdown.open .nav-drop-arrow{transform:rotate(180deg)}
        .nav-dropdown-menu{
          position:static;transform:none!important;width:100%;min-width:0;
          margin-top:0;padding-top:0;border-radius:0;border:none;border-top:0;
          box-shadow:none;background:var(--bg-mid);
          max-height:0;overflow:hidden;opacity:1;pointer-events:none;
          transition:max-height 0.25s ease;
        }
        .nav-dropdown.open .nav-dropdown-menu{max-height:340px;pointer-events:all}
        .nav-dropdown-menu a{padding:0.8rem 2.2rem;border-bottom:1px solid var(--border)}

        .nav-right{
          flex-wrap:wrap;justify-content:flex-start;gap:0.7rem 0.9rem;
          width:100%;padding:1.1rem 1.4rem 0.4rem;
          border-top:1px solid var(--border);margin-top:0.4rem;
        }
      }
      @media(min-width:881px){
        .nav-overlay,body.nav-locked .nav-overlay{display:none}
      }
      /* ── LAYOUT ── */
      main{max-width:1480px;margin:0 auto;padding:2.6rem 2rem 5rem;position:relative;z-index:1}

      /* ── PAGE HEADER — register-entry opener ── */
      .page-header{
        margin-bottom:2.6rem;
        padding-bottom:1.9rem;
        border-bottom:1px solid var(--border);
        position:relative;
        display:flex;
        align-items:flex-end;
        justify-content:space-between;
        gap:2rem;
      }
      .page-label{
        font-size:0.62rem;letter-spacing:0.3em;text-transform:uppercase;
        color:var(--blood);margin-bottom:0.8rem;font-weight:700;
        font-family:var(--font-mono);
        display:flex;align-items:center;gap:0.6em;
        text-shadow:0 0 14px var(--blood-glow);
      }
      .page-label::before{content:'§';color:var(--brass);font-family:var(--font-display);font-size:1.1em;text-shadow:none}
      .page-title{
        font-family:var(--font-display);
        font-size:clamp(2.4rem,5vw,3.6rem);color:var(--vellum-bright);font-weight:700;letter-spacing:0.002em;
        position:relative;line-height:1.0;
      }
      .page-title::after{
        content:'';display:block;width:60px;height:3px;margin-top:0.7rem;
        background:linear-gradient(90deg,var(--blood),var(--brass));
        box-shadow:0 0 12px var(--blood-glow);
      }
      .page-sub{
        font-family:'Inter',sans-serif;
        color:var(--text-dim);
        margin-top:0.6rem;font-size:0.98rem;
      }

      /* ── PAGE INFO BOX — marginalia / annotation (legacy, used on some pages) ── */
      .page-info{
        background:var(--gold-dim);
        border:1px solid var(--border-brass);
        border-left:3px solid var(--brass);
        padding:1.25rem 1.5rem;
        margin-bottom:2rem;
        display:flex;
        align-items:flex-start;
        gap:1rem;
      }
      .page-info-icon{flex-shrink:0;margin-top:0.1rem;color:var(--brass);opacity:0.9}
      .page-info-icon svg{width:20px;height:20px}
      .page-info-title{
        font-family:var(--font-mono);
        font-size:0.74rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;
        color:var(--brass-bright);margin-bottom:0.4rem;
      }
      .page-info-text{font-size:0.85rem;color:var(--text-dim);line-height:1.85}

      /* ── FOLIO FOOTNOTE — boxless marginal annotation, preferred over .page-info ── */
      .folio-footnote{
        font-family:'Inter',sans-serif;font-size:0.88rem;color:var(--text-dim);line-height:1.85;
        max-width:680px;margin:0 0 2.2rem;padding-left:1rem;border-left:2px solid var(--border-brass);
      }
      .folio-footnote strong{color:var(--vellum);font-weight:600}

      /* ── CARDS — bound ledger pages ── */
      .card{
        background:var(--bg-card);
        border:1px solid var(--border);
        border-radius:6px;
        padding:1.8rem;
        transition:border-color 0.2s,box-shadow 0.2s;
        box-shadow:var(--shadow-card);
        position:relative;
        overflow:hidden;
      }
      .card::before{
        content:'';position:absolute;top:0;left:0;right:0;height:2px;
        background:linear-gradient(90deg,var(--seal),transparent 60%);
        opacity:0.5;
      }
      .card:hover{border-color:var(--border-hover)}
      .card-header{
        display:flex;align-items:center;justify-content:space-between;
        margin-bottom:1.4rem;padding-bottom:1rem;
        border-bottom:1px solid var(--border);
      }
      .card-title{
        font-family:var(--font-display);
        font-size:1rem;letter-spacing:0.01em;color:var(--vellum);font-weight:600;
        display:flex;align-items:center;gap:0.6rem;
      }
      .card-title svg{width:14px;height:14px;color:var(--seal);flex-shrink:0}
      .card-badge{
        font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;
        color:var(--text-dim);background:var(--silver-dim);
        padding:0.22rem 0.65rem;border:1px solid var(--border);border-radius:3px;
        font-family:var(--font-mono);
      }
      body.crystal .card{backdrop-filter:blur(var(--crystal-blur));-webkit-backdrop-filter:blur(var(--crystal-blur))}

      /* ── FORMS ── */
      .form-section{margin-top:1.6rem;padding-top:1.4rem;border-top:1px solid var(--border)}
      .form-row{display:grid;grid-template-columns:1fr 1fr;gap:0.85rem;margin-bottom:0.85rem}
      .form-group{display:flex;flex-direction:column;gap:0.4rem}
      label{
        font-size:0.64rem;letter-spacing:0.1em;text-transform:uppercase;
        color:var(--text-dim);font-weight:700;font-family:var(--font-mono);
      }
      select,input[type=text],input[type=number],textarea{
        background:var(--input-bg);
        border:1px solid var(--border-hover);
        border-radius:3px;
        color:var(--text);
        padding:0.75rem 1rem;
        font-family:'Inter',sans-serif;
        font-size:0.9rem;
        width:100%;outline:none;
        transition:border-color 0.15s,box-shadow 0.15s;
        appearance:none;-webkit-appearance:none;
      }
      textarea{resize:vertical;min-height:100px}
      select:focus,input:focus,textarea:focus{
        border-color:var(--seal);
        box-shadow:0 0 0 3px var(--seal-glow);
        background:var(--bg-card);
      }
      select option{background:var(--bg-mid)}
      .btn-submit{
        background:transparent;
        color:var(--text);border:1px solid var(--seal);
        padding:0.9rem 1.5rem;
        font-family:var(--font-mono);
        font-size:0.7rem;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;
        cursor:pointer;width:100%;margin-top:0.6rem;
        border-radius:3px;
        transition:background 0.15s,color 0.15s,border-color 0.15s,box-shadow 0.15s;
      }
      .btn-submit:hover{background:var(--blood);color:#FFF7EE;border-color:var(--blood);box-shadow:0 0 24px var(--blood-glow)}
      .btn-submit:active{opacity:0.85}
      .typ-toggle{display:flex;gap:0.4rem;margin-bottom:1rem}
      .typ-btn{
        flex:1;padding:0.6rem;background:transparent;
        border:1px solid var(--border-hover);
        border-radius:3px;
        color:var(--text-muted);font-family:var(--font-mono);
        font-size:0.64rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;cursor:pointer;
        transition:color 0.15s,border-color 0.15s,background 0.15s;
      }
      .typ-btn:hover{color:var(--text);border-color:var(--border-hover)}
      .typ-btn.active-vklad{background:rgba(58,125,45,0.12);border-color:rgba(58,125,45,0.4);color:#6FBF52}
      .typ-btn.active-vyber{background:var(--seal-glow);border-color:var(--border-seal);color:var(--seal-bright)}
      .info-box{
        background:var(--gold-dim);border:1px solid var(--border-brass);
        padding:0.85rem 1.1rem;font-size:0.82rem;color:var(--text-dim);margin-top:0.9rem;display:none;
      }

      /* ── TOP STATS STRIP ── */
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2rem}
      .stat{
        background:var(--bg-card);
        border:1px solid var(--border);
        border-top:2px solid var(--seal);
        border-radius:4px;
        padding:1.6rem 1.8rem;
        transition:border-color 0.2s,transform 0.2s;
        position:relative;overflow:hidden;
        box-shadow:var(--shadow-card);
        cursor:default;
      }
      .stat:hover{border-top-color:var(--brass);transform:translateY(-2px)}
      .stat-label{font-size:0.6rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.65rem;font-weight:700;font-family:var(--font-mono)}
      .stat-value{font-family:var(--font-display);font-size:2.1rem;font-weight:700;color:var(--vellum);line-height:1}
      .stat-sub{font-size:0.72rem;color:var(--text-dim);margin-top:0.55rem;font-family:var(--font-mono)}

      /* ── SKLAD ── */
      .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem}
      .sklad-row{
        display:flex;justify-content:space-between;align-items:center;
        padding:0.7rem 0;border-bottom:1px solid var(--border);
        font-size:0.88rem;
        transition:background 0.15s,padding 0.15s;
      }
      .sklad-row:last-child{border-bottom:none}
      .sklad-row:hover{background:var(--seal-glow);margin:0 -0.5rem;padding-left:0.5rem;padding-right:0.5rem}
      .sklad-row em{color:var(--brass);font-style:normal;margin-left:0.5rem;font-size:0.7rem;opacity:0.9;font-family:var(--font-mono)}

      /* ── TOAST ── */
      .toast{
        position:fixed;bottom:1.5rem;right:1.5rem;
        background:var(--bg-card3);
        border:1px solid var(--border);
        border-left:3px solid #6FBF52;
        border-radius:4px;
        padding:0.9rem 1.4rem;font-size:0.8rem;
        transform:translateY(20px);opacity:0;
        transition:transform 0.25s ease,opacity 0.25s ease;
        z-index:999;max-width:340px;
        box-shadow:var(--shadow);
        font-family:'Inter',sans-serif;
      }
      .toast.show{transform:translateY(0);opacity:1}
      .toast.error{border-left-color:var(--seal-bright)}

      /* ── TABULKY — ledger rows ── */
      .table-wrap{overflow-x:auto}
      table{width:100%;border-collapse:collapse;font-size:0.86rem;border-top:2px solid var(--brass);border-bottom:2px solid var(--brass)}
      th{
        font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;
        color:var(--brass);padding:0.75rem 1rem;text-align:left;
        border-bottom:1px solid var(--border-brass);
        font-family:var(--font-mono);
        background:transparent;
      }
      th + th{border-left:1px solid var(--border)}
      td{padding:0.68rem 1rem;border-bottom:1px solid var(--border);color:var(--text-dim);font-size:0.86rem}
      td + td{border-left:1px solid var(--border)}
      tr:last-child td{border-bottom:none}
      tbody tr:nth-child(even) td{background:transparent}
      tr:hover td{background:var(--seal-glow);color:var(--text)}
      .badge{
        font-size:0.6rem;padding:0.22rem 0.7rem;
        letter-spacing:0.08em;text-transform:uppercase;font-weight:600;
        border-radius:3px;font-family:var(--font-mono);
      }
      .badge.vklad{background:rgba(58,125,45,0.12);color:#6FBF52;border:1px solid rgba(58,125,45,0.3)}
      .badge.vyber{background:var(--seal-glow);color:var(--seal-bright);border:1px solid var(--border-seal)}
      .badge.prijem{background:rgba(58,125,45,0.12);color:#6FBF52;border:1px solid rgba(58,125,45,0.3)}
      .badge.vydaj{background:var(--seal-glow);color:var(--seal-bright);border:1px solid var(--border-seal)}

      /* ── NÁSTĚNKA ── */
      .nastenska-list{display:flex;flex-direction:column;gap:1rem}
      .nastenska-item{
        background:var(--bg-card);border:1px solid var(--border);
        border-left:3px solid var(--border);
        border-radius:4px;
        padding:1.5rem 1.8rem;transition:border-color 0.2s,background 0.2s,box-shadow 0.3s;
        position:relative;overflow:hidden;
      }
      .nastenska-item:hover{border-left-color:var(--text-dim);background:var(--bg-card2)}
      .nastenska-item.new{border-left-color:var(--blood);box-shadow:0 0 0 1px var(--border-seal),0 4px 30px var(--blood-glow)}
      .nastenska-meta{font-size:0.66rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.6rem;font-weight:600;font-family:var(--font-mono)}
      .nastenska-title{font-family:var(--font-display);font-size:1.12rem;margin-bottom:0.55rem;color:var(--vellum);font-weight:600}
      .nastenska-content{font-size:0.92rem;color:var(--text-dim);line-height:1.85;white-space:pre-wrap}
      .new-badge{
        display:inline-block;font-size:0.56rem;letter-spacing:0.08em;text-transform:uppercase;
        background:var(--blood);color:#FFF7EE;padding:0.16rem 0.55rem;margin-left:0.55rem;vertical-align:middle;font-weight:700;
        border-radius:2px;font-family:var(--font-mono);
        box-shadow:0 0 14px var(--blood-glow);
        animation:newBadgePulse 1.6s ease-in-out infinite;
      }
      @keyframes newBadgePulse{0%,100%{box-shadow:0 0 10px var(--blood-glow)}50%{box-shadow:0 0 20px var(--blood-glow)}}

      /* ── KODEX ── */
      .kodex-section{margin-bottom:2.5rem}
      .kodex-number{font-family:var(--font-display);font-size:3.5rem;color:var(--seal);opacity:0.18;float:left;line-height:1;margin-right:1.2rem;margin-top:-0.3rem;font-weight:700}
      .kodex-rule{font-size:0.92rem;line-height:2;color:var(--text-dim);overflow:hidden}
      .kodex-rule strong{color:var(--vellum);font-weight:600}
      .kodex-divider{height:1px;background:var(--border);margin:1.8rem 0}

      /* ── STATISTIKY — personnel dossiers, not dashboard cards ── */
      .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:2rem 1.6rem}
      .stat-card{
        background:var(--bg-card);border:1px solid var(--border);border-radius:2px 8px 8px 8px;
        padding:1.7rem 1.7rem 1.5rem;transition:border-color 0.25s,transform 0.25s;
        box-shadow:var(--shadow-card);
        position:relative;overflow:visible;
        margin-top:0.4rem;
      }
      .stat-card::before{
        content:'';position:absolute;left:0;right:0;bottom:-5px;height:5px;
        background:var(--bg-card3);border-radius:0 0 6px 6px;opacity:0.6;
        z-index:-1;
      }
      .stat-card:hover{border-color:var(--border-hover);transform:translateY(-3px)}
      .stat-card-tab{
        position:absolute;top:-0.4rem;right:1.4rem;
        background:var(--seal);color:var(--vellum-bright);
        font-family:var(--font-mono);font-size:0.6rem;font-weight:700;letter-spacing:0.08em;
        padding:0.22rem 0.6rem;border-radius:2px 2px 0 0;
        box-shadow:0 -1px 0 var(--brass) inset;
      }
      .stat-card-header{
        display:flex;justify-content:space-between;align-items:flex-start;
        margin-bottom:1.2rem;padding-bottom:1rem;border-bottom:1px solid var(--border-brass);
        padding-right:2.6rem;
      }
      .stat-card-name{font-family:var(--font-display);font-size:1.18rem;color:var(--vellum-bright);font-weight:600}
      .stat-card-discord{font-size:0.66rem;letter-spacing:0.04em;color:var(--text-muted);margin-top:0.3rem;font-family:var(--font-mono)}
      .stat-row{display:flex;justify-content:space-between;font-size:0.86rem;padding:0.35rem 0;color:var(--text-dim)}
      .stat-row strong{color:var(--text);font-weight:600}
      .stat-section-label{
        font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--brass);font-weight:700;
        margin-top:0.9rem;margin-bottom:0.4rem;
        padding-top:0.65rem;border-top:1px dotted var(--border-hover);
        font-family:var(--font-mono);
      }
      .stat-section-label:first-of-type{border-top:none;margin-top:0}
      .stat-item-group{margin-left:0.5rem}
      /* ── LORE / HIERARCHY — open-book spread with a spine shadow ── */
      .lore-grid{
        display:grid;grid-template-columns:1fr 320px;gap:0;align-items:start;
        position:relative;
      }
      .lore-grid::before{
        content:'';position:absolute;left:calc(100% - 320px - 1.6rem);top:0;bottom:0;width:3rem;
        background:linear-gradient(90deg,transparent,rgba(0,0,0,0.18),transparent);
        pointer-events:none;z-index:1;
      }
      body.light .lore-grid::before{background:linear-gradient(90deg,transparent,rgba(0,0,0,0.05),transparent)}
      .chapters{display:flex;flex-direction:column;gap:3rem;padding-right:3rem}
      .chapter{
        border-left:2px solid var(--border);
        padding-left:2rem;position:relative;
        transition:border-color 0.3s;
      }
      .chapter:hover{border-left-color:var(--seal)}
      .chapter::before{
        content:'';position:absolute;left:-5px;top:6px;
        width:8px;height:8px;border-radius:50%;
        background:var(--seal);opacity:0.6;
        transition:opacity 0.2s;
      }
      .chapter:hover::before{opacity:1}
      .chapter-meta{font-size:0.6rem;letter-spacing:0.3em;text-transform:uppercase;color:var(--blood);margin-bottom:0.8rem;font-weight:700;font-family:var(--font-mono);text-shadow:0 0 10px var(--blood-glow)}
      .chapter-title{font-family:var(--font-display);font-size:1.5rem;color:var(--vellum);margin-bottom:1.1rem;font-weight:600}
      .chapter-text{font-family:'Inter',sans-serif;font-size:0.95rem;line-height:2.05;color:var(--text-dim);white-space:pre-line}
      .chapter-text.with-dropcap::first-letter{
        font-family:var(--font-display);font-weight:700;font-size:3.6em;line-height:0.8;
        float:left;padding:0.06em 0.1em 0 0;color:var(--brass);
      }
      .sidebar{
        background:var(--bg-card);border:1px solid var(--border);border-radius:6px;
        padding:2rem;position:sticky;top:calc(var(--nav-h) + 1.5rem);
        box-shadow:var(--shadow-card);margin-left:1.6rem;
      }
      .sidebar-title{
        font-family:var(--font-mono);font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;
        margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid var(--border);color:var(--brass);
      }
      .toc-item{
        font-size:0.82rem;padding:0.65rem 0;border-bottom:1px solid var(--border);
        color:var(--text-dim);display:flex;gap:0.8rem;align-items:center;
        transition:color 0.2s;cursor:default;
      }
      .toc-item:last-child{border-bottom:none}
      .toc-item:hover{color:var(--text)}
      .toc-num{color:var(--seal);font-weight:700;min-width:1.5rem;font-family:var(--font-mono);font-size:0.8rem}
      .rank-item{
        display:flex;align-items:flex-start;gap:1.5rem;
        padding:1.8rem 2rem;
        background:var(--bg-card);
        border:1px solid var(--border);
        border-top:none;transition:border-color 0.2s,background 0.2s;
        position:relative;
      }
      .rank-item:first-child{border-top:1px solid var(--border)}
      .rank-item::before{
        content:'';position:absolute;left:0;top:0;bottom:0;width:2px;
        background:var(--seal);opacity:0;transition:opacity 0.2s;
      }
      .rank-item:hover::before{opacity:1}
      .rank-item:hover{background:var(--bg-card2)}
      .rank-item.founder{
        border:2px solid var(--border-seal)!important;
        background:radial-gradient(ellipse 80% 100% at 0% 0%, var(--blood-glow) 0%, var(--bg-card2) 60%);
        padding:2.6rem 2.4rem;margin-bottom:0.6rem;border-radius:6px;
        box-shadow:0 8px 40px var(--blood-glow);
      }
      .rank-item.founder::before{opacity:1;width:4px;background:var(--blood);box-shadow:0 0 16px var(--blood-glow)}
      .rank-num{font-family:var(--font-display);font-size:1.7rem;color:var(--seal);opacity:0.35;min-width:2.5rem;line-height:1;font-weight:700}
      .rank-item.founder .rank-num{font-size:4.2rem;opacity:1;color:var(--blood);min-width:4.5rem;text-shadow:0 0 30px var(--blood-glow);line-height:0.85}
      .rank-item.founder .rank-info h3{font-size:1.5rem;letter-spacing:0.01em}
      .rank-item.founder .rank-info .rank-member{font-size:0.95rem;color:var(--brass-bright)}
      .rank-info h3{font-family:var(--font-display);font-size:1.05rem;color:var(--vellum);margin-bottom:0.25rem;font-weight:600}
      .rank-info .rank-member{font-size:0.84rem;color:var(--text-dim);margin-bottom:0.5rem;font-family:var(--font-mono)}
      .rank-info p{font-size:0.88rem;color:var(--text-dim);line-height:1.8}
      .rank-rights{margin-top:0.8rem;display:flex;flex-wrap:wrap;gap:0.35rem}
      .rank-right-tag{
        font-size:0.6rem;letter-spacing:0.08em;padding:0.25rem 0.7rem;
        background:var(--silver-dim);border:1px solid var(--border);
        color:var(--text-dim);white-space:nowrap;font-weight:500;border-radius:2px;
        transition:border-color 0.2s,color 0.2s;font-family:var(--font-mono);
      }
      .rank-right-tag:hover{border-color:var(--seal);color:var(--text)}
      .rank-item.founder .rank-right-tag{border-color:var(--border-seal);color:var(--vellum)}

      .breakdown-row{display:flex;justify-content:space-between;padding:0.45rem 0;font-size:0.88rem;color:var(--text-dim);border-bottom:1px solid var(--border)}
      .breakdown-row:last-child{border-bottom:none;color:var(--text);padding-top:0.7rem;margin-top:0.3rem}
      .breakdown-row .green{color:#6FBF52}
      .bd-label{display:flex;align-items:center;gap:0.4rem}
      .slider-wrap{margin:1.5rem 0}
      .slider{-webkit-appearance:none;width:100%;height:4px;background:linear-gradient(90deg,rgba(58,125,45,0.5) var(--pct,50%),var(--border-hover) var(--pct,50%));outline:none}
      .slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--brass);cursor:pointer;border:2px solid var(--bg);box-shadow:0 0 8px var(--seal-glow)}
      .slider-labels{display:flex;justify-content:space-between;font-size:0.66rem;color:var(--text-muted);letter-spacing:0.08em;margin-top:0.4rem;font-family:var(--font-mono)}
      .profit-bar{height:5px;background:var(--border);margin-top:1rem;position:relative;overflow:hidden}
      .profit-fill{height:100%;background:linear-gradient(90deg,rgba(58,125,45,0.5),#6FBF52);transition:width 0.4s}
      .profit-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-top:1.5rem}
      .profit-stat{background:var(--bg-card);border:1px solid var(--border);padding:0.9rem 1rem;text-align:center;border-radius:4px}
      .profit-stat-label{font-size:0.56rem;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;color:var(--text-muted);margin-bottom:0.55rem;font-family:var(--font-mono)}
      .profit-stat-num{font-family:var(--font-display);font-size:1.4rem;color:var(--vellum);line-height:1;font-weight:700}

      /* ── CONFIRM MODAL — the wax seal moment ── */
      .modal-overlay{
        position:fixed;inset:0;background:rgba(0,0,0,0.86);z-index:1000;
        display:flex;align-items:center;justify-content:center;
        opacity:0;pointer-events:none;transition:opacity 0.25s;
        backdrop-filter:blur(8px);
      }
      .modal-overlay.open{opacity:1;pointer-events:all}
      .modal-box{
        background:var(--bg-card);
        border:1px solid var(--border-brass);
        border-top:2px solid var(--seal);
        padding:2.5rem;max-width:420px;width:90%;
        box-shadow:var(--shadow);
        transform:translateY(20px) scale(0.97);
        transition:transform 0.25s cubic-bezier(0.22,1,0.36,1);
        position:relative;border-radius:6px;
      }
      .modal-overlay.open .modal-box{transform:translateY(0) scale(1)}
      .modal-title{font-family:var(--font-display);font-size:1.15rem;font-weight:600;margin-bottom:0.6rem;color:var(--vellum)}
      .modal-subtitle{font-size:0.84rem;color:var(--text-dim);line-height:1.7;margin-bottom:1.8rem}
      .modal-detail{
        background:var(--bg-mid);border:1px solid var(--border-hover);
        padding:0.9rem 1.1rem;margin-bottom:1.6rem;font-size:0.83rem;color:var(--text-dim);
        display:grid;grid-template-columns:auto 1fr;gap:0.35rem 1rem;
      }
      .modal-detail dt{font-size:0.6rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--brass);padding-top:0.1rem;font-family:var(--font-mono)}
      .modal-detail dd{color:var(--text);font-weight:500}
      .modal-actions{display:flex;gap:0.75rem}
      .modal-btn-cancel{
        flex:1;padding:0.75rem;background:transparent;border:1px solid var(--border-hover);
        color:var(--text-muted);font-family:var(--font-mono);font-size:0.68rem;
        letter-spacing:0.14em;text-transform:uppercase;cursor:pointer;transition:all 0.2s;
      }
      .modal-btn-cancel:hover{border-color:var(--border-hover);color:var(--text)}
      .modal-btn-confirm{
        flex:2;padding:0.75rem;
        background:var(--blood);
        color:#FFF7EE;border:1px solid var(--blood);font-family:var(--font-mono);
        font-size:0.68rem;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;
        cursor:pointer;transition:opacity 0.2s,box-shadow 0.2s;border-radius:3px;
        box-shadow:0 0 20px var(--blood-glow);
      }
      .modal-btn-confirm:hover{opacity:0.9;box-shadow:0 0 32px var(--blood-glow)}
      .modal-btn-confirm:disabled{cursor:default;opacity:0.7;box-shadow:none}

      /* ── SEAL STAMP — wax seal slamming down on confirm, raw blood-red at the moment of impact ── */
      .modal-box{overflow:visible}
      .seal-stamp{
        position:absolute;top:50%;left:50%;
        width:108px;height:108px;border-radius:50%;
        transform:translate(-50%,-50%) translateY(-340px) scale(2.2) rotate(-18deg);
        opacity:0;pointer-events:none;z-index:50;
        display:flex;align-items:center;justify-content:center;
        background:radial-gradient(circle at 35% 30%, var(--blood), var(--seal) 55%, var(--seal-deep) 100%);
        box-shadow:0 18px 40px rgba(0,0,0,0.5), inset 0 0 0 3px rgba(0,0,0,0.18), inset 0 2px 6px rgba(255,255,255,0.12);
      }
      .seal-stamp::before{
        content:'';position:absolute;inset:9px;border-radius:50%;
        border:1.5px solid rgba(0,0,0,0.22);
      }
      .seal-stamp span{
        font-family:var(--font-display);font-weight:700;font-size:2.1rem;
        color:rgba(0,0,0,0.32);letter-spacing:0.02em;
        text-shadow:0 1px 0 rgba(255,255,255,0.08);
      }
      .seal-stamp.slam{
        animation:sealSlam 0.62s cubic-bezier(0.32,0.04,0.5,1) forwards;
      }
      @keyframes sealSlam{
        0%{opacity:0;transform:translate(-50%,-50%) translateY(-340px) scale(2.2) rotate(-18deg);box-shadow:0 18px 40px rgba(0,0,0,0.5)}
        55%{opacity:1;transform:translate(-50%,-50%) translateY(0) scale(1.18) rotate(-6deg);box-shadow:0 18px 40px rgba(0,0,0,0.5),0 0 90px var(--blood-glow)}
        68%{transform:translate(-50%,-50%) translateY(0) scale(0.94) rotate(-9deg)}
        80%{transform:translate(-50%,-50%) translateY(0) scale(1.04) rotate(-7deg);box-shadow:0 18px 40px rgba(0,0,0,0.5),0 0 40px var(--blood-glow)}
        100%{opacity:1;transform:translate(-50%,-50%) translateY(0) scale(1) rotate(-8deg);box-shadow:0 18px 40px rgba(0,0,0,0.5),0 0 24px var(--blood-glow)}
      }
      .seal-stamp.fade-out{
        animation:sealFadeOut 0.3s ease-in forwards;
      }
      @keyframes sealFadeOut{
        0%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(-8deg)}
        100%{opacity:0;transform:translate(-50%,-50%) scale(1.15) rotate(-8deg)}
      }
      .modal-box.stamped .modal-title,.modal-box.stamped .modal-subtitle,.modal-box.stamped .modal-detail,.modal-box.stamped .modal-actions{
        transition:opacity 0.2s;opacity:0.25;
      }
      @keyframes modalThud{
        0%{transform:translateY(0) scale(1)}
        56%{transform:translateY(2px) scale(0.992)}
        100%{transform:translateY(0) scale(1)}
      }
      .modal-box.thud{animation:modalThud 0.62s cubic-bezier(0.32,0.04,0.5,1) 1}
      /* ── ACTIVITY FEED ── */
      .activity-item{
        display:flex;align-items:flex-start;gap:0.9rem;
        padding:0.7rem 0;border-bottom:1px solid var(--border);
        transition:background 0.15s;
      }
      .activity-item:last-child{border-bottom:none}
      .activity-item:hover{background:var(--seal-glow);margin:0 -0.5rem;padding-left:0.5rem;padding-right:0.5rem}
      .activity-icon{
        width:28px;height:28px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:0.75rem;flex-shrink:0;margin-top:0.1rem;
        background:var(--silver-dim);border:1px solid var(--border);
      }
      .activity-body{flex:1;min-width:0}
      .activity-main{font-size:0.86rem;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .activity-meta{font-size:0.68rem;color:var(--text-muted);margin-top:0.2rem;letter-spacing:0.05em;font-family:var(--font-mono)}
      .activity-source-web{color:var(--seal-bright)}
      .activity-source-bot{color:var(--text-dim)}

      /* ── HOME DASHBOARD EXTRA ── */
      .home-hero{
        background:var(--bg-card);
        border:1px solid var(--border-brass);
        border-left:3px solid var(--seal);
        padding:2rem 2.5rem;margin-bottom:2rem;
        position:relative;overflow:hidden;
        display:flex;align-items:center;justify-content:space-between;gap:2rem;
        border-radius:6px;
      }
      .quick-actions{display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:1.5rem}
      .quick-btn{
        display:inline-flex;align-items:center;gap:0.5rem;
        padding:0.6rem 1.2rem;background:rgba(169,180,184,0.04);
        border:1px solid var(--border);color:var(--text-dim);
        font-size:0.64rem;letter-spacing:0.16em;text-transform:uppercase;font-weight:600;
        text-decoration:none;transition:all 0.2s;
        font-family:var(--font-mono);
        border-radius:2px;cursor:pointer;
      }
      .quick-btn:hover{background:var(--seal-glow);border-color:var(--border-seal);color:var(--text);transform:translateY(-2px)}
      .quick-btn svg{width:13px;height:13px;opacity:0.7}
      .quick-btn.primary{background:var(--blood);border-color:var(--blood);color:#FFF7EE;box-shadow:0 0 16px var(--blood-glow)}
      .quick-btn.primary:hover{background:var(--blood);opacity:0.9;box-shadow:0 0 26px var(--blood-glow);color:#FFF7EE}

      /* ── MINI STOCK BARS ── */
      .mini-stock-row{display:flex;align-items:center;gap:0.8rem;padding:0.5rem 0;border-bottom:1px solid var(--border)}
      .mini-stock-row:last-child{border-bottom:none}
      .mini-stock-name{font-size:0.82rem;color:var(--text-dim);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .mini-stock-bar-wrap{width:80px;height:4px;background:var(--border);position:relative;border-radius:2px;flex-shrink:0}
      .mini-stock-bar-fill{height:100%;background:linear-gradient(90deg,var(--seal),var(--brass));border-radius:2px;transition:width 0.6s ease}
      .mini-stock-qty{font-size:0.78rem;color:var(--text);font-weight:500;min-width:36px;text-align:right;flex-shrink:0;font-family:var(--font-mono)}

      @media(max-width:1200px){.nav-menu a .nav-desc{display:none}}
      @media(max-width:900px){.grid,.stats{grid-template-columns:1fr!important}.lore-grid{grid-template-columns:1fr}.lore-grid::before{display:none}.chapters{padding-right:0}.sidebar{margin-left:0}.sidebar{position:static}}
      @media(max-width:768px){.profit-grid{grid-template-columns:repeat(2,1fr)!important}main{padding:1.5rem 1rem}}
      @media(max-width:640px){
        .page-header{flex-direction:column;align-items:flex-start;gap:0.8rem}
        .form-row{grid-template-columns:1fr}
        .stats{grid-template-columns:repeat(2,1fr)!important}
        .profit-grid{grid-template-columns:1fr 1fr!important}
        .modal-box{padding:1.8rem 1.4rem}
        .modal-detail{grid-template-columns:1fr;gap:0.15rem 0}
        .modal-detail dt{padding-top:0.4rem}
        table{font-size:0.78rem}
        th,td{padding:0.6rem 0.7rem}
        .card{padding:1.3rem}
        .nav-logo-text{font-size:0.95rem}
        .typ-toggle{flex-direction:column}
      }
      @media(max-width:420px){
        .stats{grid-template-columns:1fr!important}
      }

      /* ── NAV DROPDOWN ── */
      .nav-dropdown{position:relative;height:100%}
      .nav-drop-trigger{
        display:flex;align-items:center;flex-direction:column;justify-content:center;
        padding:0 1.15rem;height:100%;
        font-size:0.66rem;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;
        color:var(--text-dim);text-decoration:none;
        border-bottom:2px solid transparent;
        transition:color 0.2s,border-color 0.2s,background 0.2s;
        white-space:nowrap;position:relative;gap:0.22rem;cursor:pointer;
        font-family:'Inter',sans-serif;
      }
      .nav-drop-trigger:hover,.nav-dropdown:hover .nav-drop-trigger{color:var(--text);background:var(--silver-dim)}
      .nav-drop-trigger.active{color:var(--brass-bright);border-bottom-color:var(--seal);background:var(--silver-dim)}
      .nav-drop-arrow{width:9px;height:6px;margin-top:2px;opacity:0.4;transition:transform 0.2s,opacity 0.2s;flex-shrink:0}
      .nav-dropdown.open .nav-drop-arrow{transform:rotate(180deg);opacity:0.7}
      .nav-dropdown-menu{
        position:absolute;top:100%;left:50%;
        transform:translateX(-50%) translateY(-4px);
        background:var(--bg-card);
        border:1px solid var(--border-brass);
        border-radius:4px;
        min-width:190px;
        margin-top:0;
        padding-top:8px;
        box-shadow:var(--shadow-card);
        opacity:0;pointer-events:none;
        transition:opacity 0.18s,transform 0.18s;
        z-index:300;
      }
      .nav-dropdown-menu::before{
        content:'';position:absolute;top:-8px;left:0;right:0;height:8px;
      }
      body.crystal .nav-dropdown-menu{backdrop-filter:blur(var(--crystal-blur));-webkit-backdrop-filter:blur(var(--crystal-blur))}
      .nav-dropdown.open .nav-dropdown-menu{opacity:1;pointer-events:all;transform:translateX(-50%) translateY(0)}
      .nav-dropdown-menu a{
        display:block;padding:0.7rem 1.2rem;
        font-size:0.7rem;letter-spacing:0.06em;text-transform:uppercase;font-weight:500;
        color:var(--text-dim);text-decoration:none;
        border-bottom:1px solid var(--border);
        transition:color 0.15s,background 0.15s;
        white-space:nowrap;
      }
      .nav-dropdown-menu a:first-child{border-radius:4px 4px 0 0}
      .nav-dropdown-menu a:last-child{border-bottom:none;border-radius:0 0 4px 4px}
      .nav-dropdown-menu a:hover{color:var(--text);background:var(--silver-dim)}
      .nav-dropdown-menu a.active{color:var(--seal-bright);background:var(--seal-glow)}

      .nav-dropdown-menu.mega{min-width:220px;width:max-content;max-width:96vw;padding:0.4rem}
      .bb-group{position:relative}
      .bb-group-title{
        display:flex;align-items:center;justify-content:space-between;gap:0.5rem;
        font-size:0.7rem;letter-spacing:0.04em;font-weight:600;
        color:var(--text-dim);padding:0.55rem 0.7rem;border-radius:4px;cursor:pointer;white-space:nowrap;
      }
      .bb-group-title:hover,.bb-group.open .bb-group-title{color:var(--text);background:var(--silver-dim)}
      .bb-group-title .bb-arrow{
        width:0;height:0;flex:none;
        border-top:4px solid transparent;border-bottom:4px solid transparent;
        border-left:5px solid currentColor;opacity:0.6;transition:transform 0.15s;
      }
      .bb-group.open .bb-group-title .bb-arrow{transform:rotate(90deg)}
      .bb-submenu{display:none;flex-direction:column;padding:0.2rem 0 0.3rem 0}
      .bb-group.open .bb-submenu{display:flex}
      .nav-dropdown-menu.mega .bb-submenu a{
        padding:0.4rem 0.7rem 0.4rem 1.6rem;
        font-size:0.66rem;letter-spacing:0.03em;text-transform:none;font-weight:400;
        border-bottom:none;color:var(--text-dim);border-radius:4px;
      }
      .nav-dropdown-menu.mega .bb-submenu a:hover{color:var(--text);background:var(--silver-dim)}

      /* ── LEDGER LOADING — ink settling, not a spinner ── */
      .ledger-loading{
        display:flex;align-items:center;gap:0.7rem;
        color:var(--text-dim);font-size:0.85rem;
        padding:0.4rem 0;
      }
      .ledger-loading::before{
        content:'';width:9px;height:9px;border-radius:50%;flex-shrink:0;
        background:var(--seal);
        animation:ledgerInkPulse 1.3s ease-in-out infinite;
      }
      @keyframes ledgerInkPulse{
        0%,100%{box-shadow:0 0 0 0 var(--seal-glow);opacity:0.55}
        50%{box-shadow:0 0 0 6px var(--seal-glow);opacity:1}
      }

      /* ── LEDGER EMPTY STATE — an unwritten page ── */
      .ledger-empty{
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:0.9rem;padding:2.2rem 1.5rem;text-align:center;
      }
      .ledger-empty svg{width:64px;height:48px;opacity:0.5;flex-shrink:0}
      .ledger-empty-text{font-size:0.82rem;color:var(--text-muted);font-family:var(--font-mono);letter-spacing:0.02em}
      .ledger-empty.compact{padding:1.1rem 0.5rem;gap:0.6rem}
      .ledger-empty.compact svg{width:42px;height:32px}
      .ledger-empty.compact .ledger-empty-text{font-size:0.76rem}
      /* ══════════════════════════════════════════════════════════════════
         FOLIO SYSTEM — the page-as-document primitives.
         Not dashboard widgets: a register you read, not a grid you scan.
         ══════════════════════════════════════════════════════════════════ */

      .folio-mega{
        font-family:var(--font-display);
        font-weight:600;
        font-size:clamp(3.8rem, 11vw, 8.5rem);
        line-height:0.92;
        color:var(--vellum-bright);
        letter-spacing:-0.01em;
        font-variant-numeric:oldstyle-nums;
      }
      .folio-mega .unit{
        font-size:0.32em;font-family:var(--font-mono);font-weight:500;
        color:var(--brass);letter-spacing:0.02em;margin-left:0.15em;
        vertical-align:0.18em;
      }
      .folio-mega.seal-tint{color:var(--seal-bright)}

      .marginalia{
        font-family:var(--font-mono);
        font-size:0.68rem;
        letter-spacing:0.06em;
        color:var(--text-muted);
        line-height:1.9;
        border-left:1px solid var(--border);
        padding-left:1rem;
      }
      .marginalia strong{color:var(--brass);font-weight:600}
      .marginalia .m-line{display:flex;justify-content:space-between;gap:1rem;padding:0.3rem 0;border-bottom:1px solid var(--border)}
      .marginalia .m-line:last-child{border-bottom:none}
      .marginalia .m-line .m-val{color:var(--vellum);font-weight:500}

      .folio-rule{
        height:1px;background:linear-gradient(90deg,var(--seal) 0%,var(--border) 40%,var(--border) 60%,var(--brass) 100%);
        opacity:0.4;margin:2.5rem 0;
      }
      .folio-rule.tight{margin:1.4rem 0;opacity:0.25}

      .folio-label{
        font-family:var(--font-mono);
        font-size:0.64rem;letter-spacing:0.3em;text-transform:uppercase;
        color:var(--blood);font-weight:700;
        display:flex;align-items:center;gap:0.8em;
      }
      .folio-label::after{content:'';flex:1;height:1px;background:var(--border);margin-top:1px}

      .folio-spread{
        display:grid;
        grid-template-columns:1fr 280px;
        gap:3.5rem;
        align-items:start;
      }
      .folio-spread.reverse{grid-template-columns:280px 1fr}

      .drop-stat{position:relative;padding-top:0.3rem}
      .drop-stat-label{
        font-family:var(--font-mono);font-size:0.62rem;letter-spacing:0.18em;
        text-transform:uppercase;color:var(--text-muted);margin-bottom:-0.3em;
        position:relative;z-index:2;
      }
      .drop-stat-value{
        font-family:var(--font-display);font-weight:700;
        font-size:clamp(2.2rem,5vw,3.4rem);line-height:1;color:var(--vellum);
        position:relative;z-index:1;
      }
      .drop-stat-sub{font-family:var(--font-mono);font-size:0.66rem;color:var(--text-muted);margin-top:0.4rem}

      .seal-anchor{
        width:56px;height:56px;border-radius:50%;flex-shrink:0;
        border:1.5px solid var(--brass);
        display:flex;align-items:center;justify-content:center;
        font-family:var(--font-display);font-weight:700;font-size:1.3rem;color:var(--brass);
        background:var(--ink);
        box-shadow:0 0 0 5px var(--bg), 0 0 20px var(--seal-glow);
        position:relative;z-index:3;
      }
      .seal-anchor::before{content:'';position:absolute;inset:5px;border-radius:50%;border:1px solid var(--border-brass)}

      .manifest-row{
        display:flex;align-items:baseline;gap:0.6rem;
        padding:0.85rem 0;border-bottom:1px solid var(--border);
        font-size:0.92rem;
      }
      .manifest-row:last-child{border-bottom:none}
      .manifest-row .mr-name{color:var(--vellum);font-family:var(--font-display);font-weight:500;flex-shrink:0}
      .manifest-row .mr-dots{flex:1;border-bottom:1px dotted var(--border-hover);transform:translateY(-0.35em);min-width:1rem}
      .manifest-row .mr-val{font-family:var(--font-mono);color:var(--text-dim);flex-shrink:0;font-size:0.85rem}
      .manifest-row:hover .mr-name{color:var(--seal-bright)}

      .manifest-col{padding-top:0.2rem}
      .manifest-col-head{
        display:flex;align-items:baseline;justify-content:space-between;
        margin-bottom:0.9rem;padding-bottom:0.7rem;border-bottom:1px solid var(--border-brass);
      }
      .manifest-col-title{font-family:var(--font-display);font-weight:600;font-size:1.15rem;color:var(--vellum)}
      .manifest-col-count{font-family:var(--font-mono);font-size:0.78rem;color:var(--text-muted)}
      .manifest-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0 2.6rem}

      .folio-panel{position:relative;padding-top:0.5rem}
      .folio-panel + .folio-panel{margin-top:2.2rem}

      .ledger-bar-row{
        display:grid;grid-template-columns:1fr 2.6fr auto;gap:1rem;
        align-items:baseline;padding:0.55rem 0;border-bottom:1px solid var(--border);
      }
      .ledger-bar-row:last-child{border-bottom:none}
      .ledger-bar-name{font-family:var(--font-display);font-size:0.92rem;color:var(--vellum);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ledger-bar-track{position:relative;height:1px;background:var(--border);align-self:center}
      .ledger-bar-fill{position:absolute;top:-3px;bottom:-3px;left:0;background:linear-gradient(90deg,var(--seal) 0%,var(--brass) 100%);opacity:0.85}
      .ledger-bar-fill::after{content:'';position:absolute;right:-1px;top:0;bottom:0;width:1px;background:var(--brass-bright)}
      .ledger-bar-val{font-family:var(--font-mono);font-size:0.82rem;color:var(--vellum);text-align:right;white-space:nowrap}

      .report-figures{
        display:grid;grid-template-columns:repeat(4,1fr);gap:0;
        border-top:1px solid var(--border-brass);border-bottom:1px solid var(--border-brass);
        margin:1.6rem 0 2.2rem;
      }
      .report-figure{padding:1.2rem 1.5rem;border-left:1px solid var(--border)}
      .report-figure:first-child{border-left:none}
      .report-figure-label{font-family:var(--font-mono);font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.6rem}
      .report-figure-net{font-family:var(--font-display);font-weight:700;font-size:1.5rem;line-height:1;margin-bottom:0.55rem}
      .report-figure-line{display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text-dim);padding:0.12rem 0;font-family:var(--font-mono)}

      .recommendation{
        display:flex;gap:1rem;align-items:flex-start;
        padding:0.9rem 0;border-bottom:1px solid var(--border);
      }
      .recommendation:last-child{border-bottom:none}
      .recommendation-mark{
        font-family:var(--font-display);font-weight:700;font-size:1rem;
        width:1.6rem;height:1.6rem;border-radius:50%;flex-shrink:0;
        display:flex;align-items:center;justify-content:center;border:1px solid currentColor;
        margin-top:0.1rem;
      }
      .recommendation-cat{font-family:var(--font-mono);font-size:0.6rem;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:0.3rem}
      .recommendation-text{font-size:0.86rem;color:var(--vellum);line-height:1.7}

      .report-nav{display:flex;flex-wrap:wrap;gap:0 2rem;margin-bottom:0.4rem;border-bottom:1px solid var(--border)}
      .report-nav-item{
        font-family:var(--font-mono);font-size:0.66rem;letter-spacing:0.1em;text-transform:uppercase;
        color:var(--text-muted);padding:0.7rem 0;cursor:pointer;background:none;border:none;
        border-bottom:2px solid transparent;transition:color 0.2s,border-color 0.2s;
        white-space:nowrap;
      }
      .report-nav-item:hover{color:var(--text-dim)}
      .report-nav-item.active{color:var(--blood);border-bottom-color:var(--blood);text-shadow:0 0 10px var(--blood-glow)}
      .report-section{display:none}
      .report-section.active{display:block;animation:fadeReveal 0.35s ease-out 1}

      @media(max-width:900px){
        .folio-spread,.folio-spread.reverse{grid-template-columns:1fr;gap:1.8rem}
        .folio-mega{font-size:clamp(2.6rem,14vw,4.5rem)}
        .report-figures{grid-template-columns:1fr 1fr}
        .report-figure:nth-child(3){border-left:none}
      }
      @media(max-width:640px){
        .ledger-bar-row{grid-template-columns:1fr;gap:0.3rem}
        .ledger-bar-track{display:none}
        .report-figures{grid-template-columns:1fr 1fr}
      }

      /* ── SELECT EXPANDABLE ── */
      .form-group{position:relative}
      .select-expandable{padding-right:2.8rem!important;cursor:pointer;border-color:var(--border-brass)!important}
      .select-expandable:hover{border-color:var(--seal)!important;box-shadow:0 0 0 2px var(--seal-glow)}
      .select-wrap{position:relative;display:flex;flex-direction:column;gap:0.4rem}
      .select-wrap::after{
        content:'';position:absolute;right:1rem;bottom:0.95rem;
        width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
        border-top:6px solid var(--seal);pointer-events:none;opacity:0.85;
        transition:transform 0.2s,opacity 0.2s;
      }
      .select-wrap:focus-within::after{transform:rotate(180deg);opacity:1}
      .select-count-badge{
        position:absolute;right:2.2rem;bottom:0.72rem;
        font-size:0.54rem;letter-spacing:0.06em;color:var(--seal-bright);
        background:var(--seal-glow);border:1px solid var(--border-seal);
        padding:0.08rem 0.38rem;pointer-events:none;line-height:1.4;font-weight:600;opacity:0.9;
        font-family:var(--font-mono);
      }

      /* ── CREST SIGNATURE — shared heraldic mark used on hero/login ── */
      .crest-mark svg{display:block}
      .crest-mark .cm-shield{fill:var(--seal-deep);stroke:var(--brass);stroke-width:1.4}
      .crest-mark .cm-lion{fill:none;stroke:var(--brass-bright);stroke-width:1.3;stroke-linejoin:round;stroke-linecap:round}
      .crest-mark .cm-crown{fill:none;stroke:var(--brass);stroke-width:1.2}

    </style>
  `;
}

module.exports = { baseStyles, ledgerEmpty };
