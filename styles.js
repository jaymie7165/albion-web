// styles.js — Albion v3 · Nová vizuální identita
// Estetika: Heraldický noir · Bodoni Moda + Cinzel + Space Mono
// Paleta: Noir (#0B0F0D) · Oxblood (#6E1423) · Mosaz (#B68A4E) · Slonová kost (#EDE6D4)

function ledgerEmpty(text, compact) {
  return `<div class="ledger-empty${compact ? ' compact' : ''}">
    <svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="2" width="58" height="44" rx="1" stroke="var(--border-brass)" stroke-width="1"/>
      <line x1="12" y1="14" x2="44" y2="14" stroke="var(--border)" stroke-width="1"/>
      <line x1="12" y1="22" x2="52" y2="22" stroke="var(--border)" stroke-width="1"/>
      <line x1="12" y1="30" x2="38" y2="30" stroke="var(--border)" stroke-width="1"/>
      <line x1="12" y1="38" x2="48" y2="38" stroke="var(--border)" stroke-width="1"/>
    </svg>
    <div class="ledger-empty-text">${text}</div>
  </div>`;
}

function baseStyles() {
  return `
    <link rel="icon" type="image/png" href="/logo.png">
    <link rel="apple-touch-icon" href="/logo.png">
    <link rel="manifest" href="/manifest.webmanifest">
    <meta name="theme-color" content="#0B0F0D">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;0,6..96,700;0,6..96,800;0,6..96,900;1,6..96,500;1,6..96,600;1,6..96,700&family=Cinzel:wght@400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}

      :root{
        /* ── PALETA — heraldický noir ── */
        --noir:#0B0F0D;
        --panel:#10150F;
        --panel2:#141A14;
        --panel3:#181F17;
        --panel4:#1D261C;
        --emerald-deep:#0E1A10;
        --oxblood:#6E1423;
        --oxblood-bright:#A33049;
        --oxblood-glow:rgba(110,20,35,0.30);
        --oxblood-faint:rgba(110,20,35,0.12);
        --brass:#B68A4E;
        --brass-bright:#E0BD7F;
        --brass-dim:rgba(182,138,78,0.22);
        --brass-faint:rgba(182,138,78,0.10);
        --brass-line:rgba(182,138,78,0.35);
        --ivory:#EDE6D4;
        --ivory-dim:#B7AE99;
        --ivory-faint:#7E7868;
        --border:rgba(182,138,78,0.14);
        --border-hover:rgba(182,138,78,0.30);
        --border-brass:rgba(182,138,78,0.28);
        --border-oxblood:rgba(110,20,35,0.40);
        --input-bg:rgba(11,15,13,0.85);
        --shadow:0 20px 60px rgba(0,0,0,0.80);
        --shadow-card:0 4px 24px rgba(0,0,0,0.55);
        --nav-h:68px;
        /* Fonty */
        --font-display:'Bodoni Moda',serif;
        --font-label:'Cinzel',serif;
        --font-body:'Jost',sans-serif;
        --font-mono:'Space Mono',monospace;
        /* Legacy aliasy pro komponenty které ještě nebyly přepsány */
        --ink:var(--noir);
        --ink-soft:var(--panel);
        --leather:var(--panel);
        --leather2:var(--panel2);
        --leather3:var(--panel3);
        --leather4:var(--panel4);
        --seal:var(--oxblood);
        --seal-bright:var(--oxblood-bright);
        --seal-glow:var(--oxblood-glow);
        --seal-deep:#4A0D18;
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
        --silver-dim:rgba(182,138,78,0.07);
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
        --money:#3A7D2D;
      }

      /* ── SVĚTLÝ REŽIM — Pergamen ── */
      body.light{
        --noir:#F3EEE3;
        --panel:#EDE5D4;
        --panel2:#E5DBС8;
        --panel2:#E5DBC8;
        --panel3:#DDD3BD;
        --panel4:#D4C9B0;
        --oxblood:#6E1423;
        --oxblood-bright:#8B1A2D;
        --oxblood-glow:rgba(110,20,35,0.18);
        --oxblood-faint:rgba(110,20,35,0.08);
        --brass:#8B6325;
        --brass-bright:#6B4A18;
        --brass-dim:rgba(139,99,37,0.25);
        --brass-faint:rgba(139,99,37,0.10);
        --ivory:#1A1410;
        --ivory-dim:#3D3020;
        --ivory-faint:#5C4A30;
        --border:rgba(139,99,37,0.20);
        --border-hover:rgba(139,99,37,0.40);
        --border-brass:rgba(139,99,37,0.35);
        --border-oxblood:rgba(110,20,35,0.30);
        --input-bg:rgba(255,252,245,0.90);
        --shadow:0 8px 32px rgba(0,0,0,0.15);
        --shadow-card:0 2px 12px rgba(0,0,0,0.10);
        background:var(--noir);
        color:var(--ivory);
      }
      body.light::before{
        background:
          radial-gradient(ellipse 70% 50% at 50% 0%, rgba(139,99,37,0.08), transparent 60%),
          radial-gradient(ellipse 60% 60% at 100% 100%, rgba(110,20,35,0.06), transparent 60%);
      }
      body.light::after{box-shadow:inset 0 0 18vw rgba(0,0,0,0.06)}
      body.light nav{background:rgba(237,229,212,0.97)}
      body.light select,body.light input[type=text],body.light input[type=number],body.light textarea{
        background:var(--input-bg);color:var(--ivory);
      }
      body.light .card{background:var(--panel2)}
      body.light .modal-box{background:var(--panel2)}
      body.light .nav-dropdown-menu{background:rgba(237,229,212,0.98)}
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

      /* Heraldický ambient — světlo přichází shora jako ze svíček */
      body::before{
        content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
        background:
          radial-gradient(ellipse 70% 50% at 50% 0%, rgba(182,138,78,0.07), transparent 60%),
          radial-gradient(ellipse 60% 60% at 100% 100%, rgba(110,20,35,0.10), transparent 60%),
          radial-gradient(ellipse 50% 50% at 0% 100%, rgba(182,138,78,0.04), transparent 50%);
      }
      body::after{
        content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
        box-shadow:inset 0 0 18vw rgba(0,0,0,0.70);
      }

      @keyframes pageFadeIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeReveal{0%{opacity:0;transform:translateY(4px)}100%{opacity:1;transform:translateY(0)}}
      .glitch-in{animation:fadeReveal 0.6s ease-out 1}

      /* Scrollbar */
      ::-webkit-scrollbar{width:4px;height:4px}
      ::-webkit-scrollbar-track{background:var(--panel)}
      ::-webkit-scrollbar-thumb{background:var(--oxblood);border-radius:2px}
      ::-webkit-scrollbar-thumb:hover{background:var(--oxblood-bright)}

      /* ══════════════════════════════════════════════
         NAV — heraldická lišta s mosazným akcentem
         ══════════════════════════════════════════════ */
      nav{
        background:rgba(11,15,13,0.96);
        border-bottom:1px solid var(--border-brass);
        padding:0 2rem;
        display:flex;
        align-items:center;
        justify-content:space-between;
        position:sticky;
        top:0;
        z-index:200;
        height:var(--nav-h);
        backdrop-filter:blur(12px);
        -webkit-backdrop-filter:blur(12px);
      }
      /* Tenká mosazná linka na spodku navu */
      nav::after{
        content:'';position:absolute;left:0;right:0;bottom:-1px;height:1px;
        background:linear-gradient(90deg,transparent,var(--oxblood) 20%,var(--brass) 50%,var(--oxblood) 80%,transparent);
        opacity:0.7;
      }

      .nav-logo{
        font-family:var(--font-label);
        letter-spacing:0.18em;
        font-size:1.05rem;
        font-weight:600;
        text-transform:uppercase;
        text-decoration:none;
        color:var(--ivory);
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
        transition:transform 0.3s;
        filter:drop-shadow(0 0 8px rgba(182,138,78,0.4));
      }
      .nav-logo:hover .nav-logo-img{transform:scale(1.05)}
      .nav-logo-text .b-red{color:var(--oxblood-bright)}

      .nav-burger{
        display:none;
        flex-direction:column;justify-content:center;gap:5px;
        width:34px;height:34px;background:none;
        border:1px solid var(--border-brass);
        cursor:pointer;flex-shrink:0;padding:0;
        align-items:center;
      }
      .nav-burger span{
        display:block;width:17px;height:1px;background:var(--brass);
        transition:transform 0.25s,opacity 0.2s;
      }
      .nav-burger.open span:nth-child(1){transform:translateY(6px) rotate(45deg)}
      .nav-burger.open span:nth-child(2){opacity:0}
      .nav-burger.open span:nth-child(3){transform:translateY(-6px) rotate(-45deg)}

      .nav-menu{display:flex;gap:0;list-style:none;height:100%}
      .nav-menu li{height:100%}
      .nav-menu a{
        display:flex;align-items:center;flex-direction:column;justify-content:center;
        padding:0 1.1rem;height:100%;
        font-family:var(--font-label);
        font-size:0.6rem;
        letter-spacing:0.18em;
        text-transform:uppercase;
        font-weight:500;
        color:var(--ivory-faint);
        text-decoration:none;
        border-bottom:2px solid transparent;
        transition:color 0.2s,border-color 0.2s,background 0.2s;
        white-space:nowrap;
        position:relative;
        gap:0.2rem;
      }
      .nav-menu a:hover{color:var(--ivory);background:rgba(182,138,78,0.05)}
      .nav-menu a.active{color:var(--brass-bright);border-bottom-color:var(--oxblood)}
      .nav-menu a .nav-desc{
        font-size:0.52rem;letter-spacing:0.04em;
        color:var(--ivory-faint);opacity:0.7;
        font-weight:400;line-height:1;
        font-family:var(--font-mono);
      }

      .nav-right{display:flex;align-items:center;gap:0.9rem;flex-shrink:0}
      .nav-user{font-size:0.68rem;color:var(--ivory-faint);letter-spacing:0.04em;white-space:nowrap;font-family:var(--font-mono)}
      .nav-user strong{color:var(--ivory);font-weight:400;font-family:var(--font-label);letter-spacing:0.06em}
      .nav-logout{
        font-family:var(--font-label);
        font-size:0.58rem;letter-spacing:0.18em;text-transform:uppercase;font-weight:500;
        color:var(--oxblood-bright);text-decoration:none;
        padding:0.4rem 0.95rem;
        border:1px solid var(--border-oxblood);
        transition:all 0.2s;
      }
      .nav-logout:hover{background:var(--oxblood-faint);border-color:var(--oxblood)}

      .theme-switcher{display:flex;align-items:center;gap:6px}
      .theme-dot-btn{
        width:12px;height:12px;border-radius:50%;border:1.5px solid transparent;
        cursor:pointer;transition:transform 0.18s,border-color 0.18s;
        flex-shrink:0;outline:none;padding:0;
      }
      .theme-dot-btn:hover{transform:scale(1.3)}
      .theme-dot-btn.active{border-color:var(--ivory)!important}

      .nav-shortcut-hint{
        font-family:var(--font-mono);font-size:0.6rem;letter-spacing:0.04em;
        color:var(--ivory-faint);border:1px solid var(--border);
        padding:0.2rem 0.5rem;cursor:default;opacity:0.5;transition:opacity 0.2s;flex-shrink:0;
      }
      .nav-shortcut-hint:hover{opacity:0.9}
      @media(max-width:880px){.nav-shortcut-hint{display:none}}

      .notif-bell{
        position:relative;cursor:pointer;background:none;border:none;
        color:var(--ivory-faint);padding:0.3rem;transition:color 0.2s;
        display:flex;align-items:center;
      }
      .notif-bell svg{width:18px;height:18px}
      .notif-bell:hover{color:var(--brass-bright)}
      .notif-badge{
        position:absolute;top:-3px;right:-5px;
        background:var(--oxblood);color:var(--ivory);
        font-size:0.5rem;min-width:14px;height:14px;
        border-radius:7px;display:none;align-items:center;justify-content:center;padding:0 3px;
        font-weight:700;
      }
      .notif-badge.visible{display:flex}

      /* ── MOBILE NAV ── */
      .nav-overlay{
        position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:190;
        opacity:0;pointer-events:none;transition:opacity 0.25s;
        backdrop-filter:blur(4px);
      }
      body.nav-locked{overflow:hidden}
      body.nav-locked .nav-overlay{opacity:1;pointer-events:all}

      @media(max-width:880px){
        .nav-burger{display:flex}
        nav{padding:0 1.1rem}
        .nav-menu{
          display:flex;flex-direction:column;height:auto;gap:0;
          position:fixed;top:var(--nav-h);left:0;right:0;bottom:0;
          background:rgba(11,15,13,0.98);
          border-top:1px solid var(--border-brass);
          padding:0.5rem 0 1rem;overflow-y:auto;
          transform:translateY(-8px);opacity:0;pointer-events:none;
          transition:opacity 0.2s,transform 0.2s;z-index:195;
        }
        .nav-menu.mobile-open{opacity:1;pointer-events:all;transform:translateY(0)}
        .nav-menu li{height:auto;width:100%}
        .nav-menu a,.nav-drop-trigger{
          height:auto;flex-direction:row;justify-content:space-between;
          padding:0.95rem 1.4rem;width:100%;border-bottom:1px solid var(--border);
          border-left:2px solid transparent;
        }
        .nav-menu a.active,.nav-drop-trigger.active{border-bottom:1px solid var(--border);border-left-color:var(--oxblood)}
        .nav-menu a .nav-desc{display:none}
        .nav-drop-arrow{margin-top:0}
        .nav-dropdown.open .nav-drop-arrow{transform:rotate(180deg)}
        .nav-dropdown-menu{
          position:static;transform:none!important;width:100%;min-width:0;
          margin-top:0;padding-top:0;border-radius:0;border:none;border-top:0;
          box-shadow:none;background:var(--panel3);
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

      /* ══════════════════════════════════════════════
         LAYOUT
         ══════════════════════════════════════════════ */
      main{max-width:1480px;margin:0 auto;padding:3rem 2rem 6rem;position:relative;z-index:1}

      /* ── PAGE HEADER ── */
      .page-header{
        margin-bottom:3rem;
        padding-bottom:2rem;
        border-bottom:1px solid var(--border-brass);
        position:relative;
        display:flex;
        align-items:flex-end;
        justify-content:space-between;
        gap:2rem;
      }
      .page-label{
        font-family:var(--font-label);
        font-size:0.6rem;letter-spacing:0.3em;text-transform:uppercase;
        color:var(--brass);margin-bottom:1rem;font-weight:500;
      }
      .page-title{
        font-family:var(--font-display);
        font-size:clamp(2.4rem,5vw,3.6rem);color:var(--ivory);font-weight:700;
        font-style:italic;letter-spacing:0.01em;line-height:1.0;
      }
      .page-title::after{
        content:'';display:block;width:48px;height:2px;margin-top:0.8rem;
        background:linear-gradient(90deg,var(--oxblood),var(--brass));
      }
      .page-sub{
        font-family:var(--font-body);
        color:var(--ivory-faint);
        margin-top:0.7rem;font-size:0.95rem;
      }

      /* ── FOLIO FOOTNOTE ── */
      .folio-footnote{
        font-family:var(--font-body);font-size:0.88rem;color:var(--ivory-dim);line-height:1.9;
        max-width:660px;margin:0 0 2.5rem;padding-left:1rem;
        border-left:1px solid var(--brass-dim);
      }
      .folio-footnote strong{color:var(--brass-bright);font-weight:500}

      /* ══════════════════════════════════════════════
         CARDS — vázané stránky rejstříku
         ══════════════════════════════════════════════ */
      .card{
        background:var(--panel2);
        border:1px solid var(--border);
        padding:1.8rem;
        transition:border-color 0.2s,box-shadow 0.2s;
        box-shadow:var(--shadow-card);
        position:relative;
        overflow:hidden;
      }
      /* Rohové ozdoby — heraldický detail */
      .card::before{
        content:'';position:absolute;top:0;left:0;
        width:16px;height:16px;
        border-top:1px solid var(--brass-dim);border-left:1px solid var(--brass-dim);
      }
      .card::after{
        content:'';position:absolute;bottom:0;right:0;
        width:16px;height:16px;
        border-bottom:1px solid var(--brass-dim);border-right:1px solid var(--brass-dim);
      }
      .card:hover{border-color:var(--border-brass);box-shadow:0 8px 40px rgba(0,0,0,0.6)}
      .card-header{
        display:flex;align-items:center;justify-content:space-between;
        margin-bottom:1.4rem;padding-bottom:1rem;
        border-bottom:1px solid var(--border);
      }
      .card-title{
        font-family:var(--font-label);
        font-size:0.78rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--ivory);font-weight:500;
        display:flex;align-items:center;gap:0.6rem;
      }
      .card-badge{
        font-family:var(--font-mono);
        font-size:0.56rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:400;
        color:var(--ivory-faint);background:var(--brass-faint);
        padding:0.2rem 0.65rem;border:1px solid var(--border-brass);
      }

      /* ══════════════════════════════════════════════
         FORMS
         ══════════════════════════════════════════════ */
      .form-section{margin-top:1.6rem;padding-top:1.4rem;border-top:1px solid var(--border)}
      .form-row{display:grid;grid-template-columns:1fr 1fr;gap:0.85rem;margin-bottom:0.85rem}
      .form-group{display:flex;flex-direction:column;gap:0.45rem}
      label{
        font-family:var(--font-label);
        font-size:0.58rem;letter-spacing:0.16em;text-transform:uppercase;
        color:var(--brass);font-weight:500;
      }
      select,input[type=text],input[type=number],textarea{
        background:var(--input-bg);
        border:1px solid var(--border-brass);
        color:var(--ivory);
        padding:0.75rem 1rem;
        font-family:var(--font-body);
        font-size:0.9rem;font-weight:300;
        width:100%;outline:none;
        transition:border-color 0.15s,box-shadow 0.15s;
        appearance:none;-webkit-appearance:none;
      }
      textarea{resize:vertical;min-height:100px}
      select:focus,input:focus,textarea:focus{
        border-color:var(--brass);
        box-shadow:0 0 0 2px var(--brass-faint);
      }
      select option{background:var(--panel2)}
      .btn-submit{
        background:transparent;
        color:var(--ivory);border:1px solid var(--oxblood);
        padding:0.9rem 1.5rem;
        font-family:var(--font-label);
        font-size:0.64rem;letter-spacing:0.2em;text-transform:uppercase;font-weight:500;
        cursor:pointer;width:100%;margin-top:0.6rem;
        transition:background 0.15s,border-color 0.15s,box-shadow 0.15s;
      }
      .btn-submit:hover{background:var(--oxblood);border-color:var(--oxblood);box-shadow:0 0 24px var(--oxblood-glow)}

      .typ-toggle{display:flex;gap:0.4rem;margin-bottom:1rem}
      .typ-btn{
        flex:1;padding:0.6rem;background:transparent;
        border:1px solid var(--border);
        color:var(--ivory-faint);font-family:var(--font-label);
        font-size:0.58rem;letter-spacing:0.14em;text-transform:uppercase;font-weight:500;cursor:pointer;
        transition:color 0.15s,border-color 0.15s,background 0.15s;
      }
      .typ-btn:hover{color:var(--ivory);border-color:var(--border-brass)}
      .typ-btn.active-vklad{background:rgba(58,125,45,0.10);border-color:rgba(58,125,45,0.35);color:#6FBF52}
      .typ-btn.active-vyber{background:var(--oxblood-faint);border-color:var(--border-oxblood);color:var(--oxblood-bright)}

      .info-box{
        background:var(--brass-faint);border:1px solid var(--border-brass);
        padding:0.85rem 1.1rem;font-size:0.82rem;color:var(--ivory-dim);margin-top:0.9rem;display:none;
        font-family:var(--font-mono);
      }

      /* ══════════════════════════════════════════════
         STAT STRIP
         ══════════════════════════════════════════════ */
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border-brass);margin-bottom:2rem}
      .stat{
        background:var(--panel2);padding:1.8rem 1.6rem;text-align:center;
        transition:background 0.25s;
        border-top:2px solid transparent;
        position:relative;
      }
      .stat:hover{background:var(--panel3);border-top-color:var(--brass)}
      .stat-label{font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--brass);margin-bottom:0.8rem}
      .stat-value{font-family:var(--font-display);font-size:2rem;font-weight:700;color:var(--ivory);line-height:1;font-style:italic}
      .stat-sub{font-family:var(--font-mono);font-size:0.6rem;color:var(--ivory-faint);margin-top:0.5rem;letter-spacing:0.04em}

      /* ══════════════════════════════════════════════
         SKLAD
         ══════════════════════════════════════════════ */
      .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem}
      .sklad-row{
        display:flex;justify-content:space-between;align-items:center;
        padding:0.7rem 0;border-bottom:1px solid var(--border);
        font-size:0.88rem;
        transition:background 0.15s,padding 0.15s;
      }
      .sklad-row:last-child{border-bottom:none}
      .sklad-row:hover{background:var(--oxblood-faint);margin:0 -0.5rem;padding-left:0.5rem;padding-right:0.5rem}
      .sklad-row em{color:var(--brass);font-style:normal;margin-left:0.5rem;font-size:0.7rem;opacity:0.9;font-family:var(--font-mono)}

      /* ══════════════════════════════════════════════
         TOAST
         ══════════════════════════════════════════════ */
      .toast{
        position:fixed;bottom:1.5rem;right:1.5rem;
        background:var(--panel3);
        border:1px solid var(--border-brass);
        border-left:2px solid #6FBF52;
        padding:0.9rem 1.4rem;font-size:0.8rem;
        transform:translateY(20px);opacity:0;
        transition:transform 0.25s ease,opacity 0.25s ease;
        z-index:999;max-width:340px;
        box-shadow:var(--shadow);
        font-family:var(--font-body);
      }
      .toast.show{transform:translateY(0);opacity:1}
      .toast.error{border-left-color:var(--oxblood-bright)}

      /* ══════════════════════════════════════════════
         TABULKY
         ══════════════════════════════════════════════ */
      .table-wrap{overflow-x:auto}
      table{width:100%;border-collapse:collapse;font-size:0.86rem;border-top:1px solid var(--border-brass);border-bottom:1px solid var(--border-brass)}
      th{
        font-family:var(--font-label);
        font-size:0.58rem;letter-spacing:0.16em;text-transform:uppercase;font-weight:500;
        color:var(--brass);padding:0.75rem 1rem;text-align:left;
        border-bottom:1px solid var(--border-brass);
        background:transparent;
      }
      th + th{border-left:1px solid var(--border)}
      td{padding:0.68rem 1rem;border-bottom:1px solid var(--border);color:var(--ivory-dim);font-size:0.86rem}
      td + td{border-left:1px solid var(--border)}
      tr:last-child td{border-bottom:none}
      tr:hover td{background:var(--brass-faint);color:var(--ivory)}
      .badge{
        font-family:var(--font-label);
        font-size:0.56rem;padding:0.2rem 0.65rem;
        letter-spacing:0.1em;text-transform:uppercase;font-weight:500;
      }
      .badge.vklad,.badge.prijem{background:rgba(58,125,45,0.10);color:#6FBF52;border:1px solid rgba(58,125,45,0.28)}
      .badge.vyber,.badge.vydaj{background:var(--oxblood-faint);color:var(--oxblood-bright);border:1px solid var(--border-oxblood)}

      /* ══════════════════════════════════════════════
         NÁSTĚNKA
         ══════════════════════════════════════════════ */
      .nastenska-list{display:flex;flex-direction:column;gap:1rem}
      .nastenska-item{
        background:var(--panel2);border:1px solid var(--border);
        border-left:2px solid var(--border-brass);
        padding:1.5rem 1.8rem;transition:border-color 0.2s;
        position:relative;overflow:hidden;
      }
      .nastenska-item:hover{border-left-color:var(--brass)}
      .nastenska-item.new{border-left-color:var(--oxblood-bright);box-shadow:0 0 0 1px var(--border-oxblood)}
      .nastenska-meta{font-family:var(--font-mono);font-size:0.64rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--ivory-faint);margin-bottom:0.6rem}
      .nastenska-title{font-family:var(--font-display);font-size:1.1rem;margin-bottom:0.55rem;color:var(--ivory);font-weight:600;font-style:italic}
      .nastenska-content{font-size:0.92rem;color:var(--ivory-dim);line-height:1.85;white-space:pre-wrap}
      .new-badge{
        display:inline-block;font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.1em;text-transform:uppercase;
        background:var(--oxblood);color:var(--ivory);padding:0.16rem 0.55rem;margin-left:0.55rem;vertical-align:middle;font-weight:500;
      }

      /* ══════════════════════════════════════════════
         LORE / KODEX / HIERARCHY
         ══════════════════════════════════════════════ */
      .lore-grid{display:grid;grid-template-columns:1fr 300px;gap:0;align-items:start}
      .chapters{display:flex;flex-direction:column;gap:3rem;padding-right:3rem}
      .chapter{
        border-left:1px solid var(--border-brass);
        padding-left:2rem;position:relative;
        transition:border-color 0.3s;
      }
      .chapter:hover{border-left-color:var(--brass)}
      .chapter::before{
        content:'';position:absolute;left:-4px;top:4px;
        width:7px;height:7px;
        background:var(--oxblood);opacity:0.7;
        transition:opacity 0.2s;
      }
      .chapter:hover::before{opacity:1}
      .chapter-meta{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.28em;text-transform:uppercase;color:var(--brass);margin-bottom:0.8rem;font-weight:500}
      .chapter-title{font-family:var(--font-display);font-size:1.5rem;color:var(--ivory);margin-bottom:1.1rem;font-weight:600;font-style:italic}
      .chapter-text{font-family:var(--font-body);font-size:0.95rem;line-height:2.05;color:var(--ivory-dim);white-space:pre-line}
      .chapter-text.with-dropcap::first-letter{
        font-family:var(--font-display);font-weight:700;font-size:3.5em;line-height:0.8;
        float:left;padding:0.06em 0.12em 0 0;color:var(--brass);
      }
      .sidebar{
        background:var(--panel2);border:1px solid var(--border-brass);
        padding:2rem;position:sticky;top:calc(var(--nav-h) + 1.5rem);
        box-shadow:var(--shadow-card);margin-left:1.6rem;
      }
      .sidebar-title{
        font-family:var(--font-label);font-size:0.62rem;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;
        margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid var(--border-brass);color:var(--brass);
      }
      .toc-item{
        font-family:var(--font-body);font-size:0.84rem;padding:0.65rem 0;border-bottom:1px solid var(--border);
        color:var(--ivory-dim);display:flex;gap:0.8rem;align-items:center;
        transition:color 0.2s;cursor:default;
      }
      .toc-item:last-child{border-bottom:none}
      .toc-item:hover{color:var(--ivory)}
      .toc-num{font-family:var(--font-label);color:var(--brass);font-weight:600;min-width:1.6rem;font-size:0.78rem;letter-spacing:0.1em}

      /* Hierarchy rank */
      .rank-list{}
      .rank-item{
        display:flex;align-items:flex-start;gap:1.5rem;
        padding:1.8rem 2rem;
        background:var(--panel2);
        border:1px solid var(--border);
        border-top:none;transition:background 0.2s;
        position:relative;
      }
      .rank-item:first-child{border-top:1px solid var(--border)}
      .rank-item::before{
        content:'';position:absolute;left:0;top:0;bottom:0;width:1px;
        background:var(--oxblood);opacity:0;transition:opacity 0.2s;
      }
      .rank-item:hover::before{opacity:1}
      .rank-item:hover{background:var(--panel3)}
      .rank-item.founder{
        border:1px solid var(--border-brass)!important;
        background:radial-gradient(ellipse 80% 100% at 0% 0%, rgba(110,20,35,0.18) 0%, var(--panel3) 60%);
        padding:2.4rem 2.4rem;margin-bottom:0.6rem;
      }
      .rank-item.founder::before{opacity:1;background:var(--oxblood-bright)}
      .rank-num{font-family:var(--font-display);font-size:1.7rem;color:var(--oxblood);opacity:0.4;min-width:2.5rem;line-height:1;font-weight:700;font-style:italic}
      .rank-item.founder .rank-num{font-size:4rem;opacity:1;color:var(--oxblood-bright);min-width:4.5rem;line-height:0.85}
      .rank-item.founder .rank-info h3{font-size:1.5rem}
      .rank-item.founder .rank-info .rank-member{font-size:0.95rem;color:var(--brass-bright)}
      .rank-info h3{font-family:var(--font-display);font-size:1.05rem;color:var(--ivory);margin-bottom:0.25rem;font-weight:600;font-style:italic}
      .rank-info .rank-member{font-family:var(--font-label);font-size:0.72rem;color:var(--ivory-dim);margin-bottom:0.5rem;letter-spacing:0.08em}
      .rank-info p{font-family:var(--font-body);font-size:0.88rem;color:var(--ivory-dim);line-height:1.8}
      .rank-rights{margin-top:0.8rem;display:flex;flex-wrap:wrap;gap:0.35rem}
      .rank-right-tag{
        font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.1em;padding:0.22rem 0.65rem;
        background:var(--brass-faint);border:1px solid var(--border-brass);
        color:var(--ivory-dim);white-space:nowrap;font-weight:500;
        transition:border-color 0.2s,color 0.2s;
      }
      .rank-right-tag:hover{border-color:var(--brass);color:var(--ivory)}
      .rank-item.founder .rank-right-tag{border-color:var(--border-oxblood);color:var(--ivory)}

      /* ══════════════════════════════════════════════
         STATISTIKY — spisy členů
         ══════════════════════════════════════════════ */
      .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:2rem 1.6rem}
      .stat-card{
        background:var(--panel2);border:1px solid var(--border-brass);
        padding:1.8rem 1.7rem 1.5rem;transition:border-color 0.25s,transform 0.25s;
        box-shadow:var(--shadow-card);
        position:relative;overflow:visible;
        margin-top:0.4rem;
      }
      .stat-card::before{
        content:'';position:absolute;top:0;left:0;
        width:20px;height:20px;
        border-top:1px solid var(--brass);border-left:1px solid var(--brass);
      }
      .stat-card::after{
        content:'';position:absolute;bottom:0;right:0;
        width:20px;height:20px;
        border-bottom:1px solid var(--brass);border-right:1px solid var(--brass);
      }
      .stat-card:hover{border-color:var(--brass);transform:translateY(-3px)}
      .stat-card-tab{
        position:absolute;top:-0.4rem;right:1.4rem;
        background:var(--oxblood);color:var(--ivory);
        font-family:var(--font-label);font-size:0.56rem;font-weight:600;letter-spacing:0.12em;
        padding:0.22rem 0.65rem;
      }
      .stat-card-header{
        display:flex;justify-content:space-between;align-items:flex-start;
        margin-bottom:1.2rem;padding-bottom:1rem;border-bottom:1px solid var(--border-brass);
        padding-right:2.6rem;
      }
      .stat-card-name{font-family:var(--font-display);font-size:1.15rem;color:var(--ivory);font-weight:600;font-style:italic}
      .stat-card-discord{font-family:var(--font-mono);font-size:0.64rem;letter-spacing:0.04em;color:var(--ivory-faint);margin-top:0.3rem}
      .stat-row{display:flex;justify-content:space-between;font-size:0.86rem;padding:0.35rem 0;color:var(--ivory-dim)}
      .stat-row strong{color:var(--ivory);font-weight:500}
      .stat-section-label{
        font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--brass);font-weight:500;
        margin-top:0.9rem;margin-bottom:0.4rem;
        padding-top:0.65rem;border-top:1px solid var(--border);
      }
      .stat-section-label:first-of-type{border-top:none;margin-top:0}
      .stat-item-group{margin-left:0.5rem}

      /* ══════════════════════════════════════════════
         CONFIRM MODAL
         ══════════════════════════════════════════════ */
      .modal-overlay{
        position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:1000;
        display:flex;align-items:center;justify-content:center;
        opacity:0;pointer-events:none;transition:opacity 0.25s;
        backdrop-filter:blur(10px);
      }
      .modal-overlay.open{opacity:1;pointer-events:all}
      .modal-box{
        background:var(--panel2);
        border:1px solid var(--border-brass);
        border-top:2px solid var(--oxblood);
        padding:2.5rem;max-width:420px;width:90%;
        box-shadow:var(--shadow);
        transform:translateY(16px) scale(0.97);
        transition:transform 0.25s cubic-bezier(0.22,1,0.36,1);
        position:relative;
      }
      .modal-overlay.open .modal-box{transform:translateY(0) scale(1)}
      .modal-title{font-family:var(--font-display);font-size:1.2rem;font-weight:600;font-style:italic;margin-bottom:0.6rem;color:var(--ivory)}
      .modal-subtitle{font-size:0.84rem;color:var(--ivory-dim);line-height:1.7;margin-bottom:1.8rem;font-family:var(--font-body)}
      .modal-detail{
        background:var(--panel3);border:1px solid var(--border);
        padding:0.9rem 1.1rem;margin-bottom:1.6rem;font-size:0.83rem;color:var(--ivory-dim);
        display:grid;grid-template-columns:auto 1fr;gap:0.35rem 1rem;
      }
      .modal-detail dt{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--brass);padding-top:0.1rem}
      .modal-detail dd{color:var(--ivory);font-weight:400;font-family:var(--font-body)}
      .modal-actions{display:flex;gap:0.75rem}
      .modal-btn-cancel{
        flex:1;padding:0.75rem;background:transparent;border:1px solid var(--border-brass);
        color:var(--ivory-faint);font-family:var(--font-label);font-size:0.62rem;
        letter-spacing:0.14em;text-transform:uppercase;cursor:pointer;transition:all 0.2s;
      }
      .modal-btn-cancel:hover{border-color:var(--brass);color:var(--ivory)}
      .modal-btn-confirm{
        flex:2;padding:0.75rem;
        background:var(--oxblood);
        color:var(--ivory);border:1px solid var(--oxblood);font-family:var(--font-label);
        font-size:0.62rem;letter-spacing:0.14em;text-transform:uppercase;font-weight:500;
        cursor:pointer;transition:opacity 0.2s,box-shadow 0.2s;
        box-shadow:0 0 20px var(--oxblood-glow);
      }
      .modal-btn-confirm:hover{opacity:0.9;box-shadow:0 0 32px var(--oxblood-glow)}
      .modal-btn-confirm:disabled{cursor:default;opacity:0.7;box-shadow:none}

      /* Pečeť */
      .modal-box{overflow:visible}
      .seal-stamp{
        position:absolute;top:50%;left:50%;
        width:108px;height:108px;border-radius:50%;
        transform:translate(-50%,-50%) translateY(-340px) scale(2.2) rotate(-18deg);
        opacity:0;pointer-events:none;z-index:50;
        display:flex;align-items:center;justify-content:center;
        background:radial-gradient(circle at 35% 30%, var(--oxblood-bright), var(--oxblood) 55%, #4A0D18 100%);
        box-shadow:0 18px 40px rgba(0,0,0,0.6), inset 0 0 0 3px rgba(0,0,0,0.2), inset 0 2px 6px rgba(255,255,255,0.08);
      }
      .seal-stamp::before{content:'';position:absolute;inset:9px;border-radius:50%;border:1px solid rgba(182,138,78,0.3)}
      .seal-stamp span{font-family:var(--font-label);font-weight:700;font-size:2rem;color:rgba(0,0,0,0.25);letter-spacing:0.05em}
      .seal-stamp.slam{animation:sealSlam 0.62s cubic-bezier(0.32,0.04,0.5,1) forwards}
      @keyframes sealSlam{
        0%{opacity:0;transform:translate(-50%,-50%) translateY(-340px) scale(2.2) rotate(-18deg)}
        55%{opacity:1;transform:translate(-50%,-50%) translateY(0) scale(1.18) rotate(-6deg);box-shadow:0 18px 40px rgba(0,0,0,0.5),0 0 80px var(--oxblood-glow)}
        68%{transform:translate(-50%,-50%) translateY(0) scale(0.94) rotate(-9deg)}
        80%{transform:translate(-50%,-50%) translateY(0) scale(1.04) rotate(-7deg)}
        100%{opacity:1;transform:translate(-50%,-50%) translateY(0) scale(1) rotate(-8deg)}
      }
      .seal-stamp.fade-out{animation:sealFadeOut 0.3s ease-in forwards}
      @keyframes sealFadeOut{
        0%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(-8deg)}
        100%{opacity:0;transform:translate(-50%,-50%) scale(1.15) rotate(-8deg)}
      }
      .modal-box.stamped .modal-title,.modal-box.stamped .modal-subtitle,.modal-box.stamped .modal-detail,.modal-box.stamped .modal-actions{
        transition:opacity 0.2s;opacity:0.2;
      }
      @keyframes modalThud{
        0%{transform:translateY(0) scale(1)}
        56%{transform:translateY(2px) scale(0.993)}
        100%{transform:translateY(0) scale(1)}
      }
      .modal-box.thud{animation:modalThud 0.62s cubic-bezier(0.32,0.04,0.5,1) 1}

      /* ══════════════════════════════════════════════
         LEDGER LOADING / EMPTY
         ══════════════════════════════════════════════ */
      .ledger-loading{
        display:flex;align-items:center;gap:0.7rem;
        color:var(--ivory-dim);font-family:var(--font-mono);font-size:0.82rem;
        padding:0.4rem 0;
      }
      .ledger-loading::before{
        content:'';width:8px;height:8px;flex-shrink:0;
        background:var(--oxblood);
        animation:ledgerPulse 1.3s ease-in-out infinite;
      }
      @keyframes ledgerPulse{
        0%,100%{box-shadow:0 0 0 0 var(--oxblood-glow);opacity:0.5}
        50%{box-shadow:0 0 0 5px var(--oxblood-glow);opacity:1}
      }
      .ledger-empty{
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:0.9rem;padding:2.5rem 1.5rem;text-align:center;
      }
      .ledger-empty svg{width:64px;height:48px;opacity:0.35;flex-shrink:0}
      .ledger-empty-text{font-family:var(--font-mono);font-size:0.78rem;color:var(--ivory-faint);letter-spacing:0.04em}
      .ledger-empty.compact{padding:1.1rem 0.5rem;gap:0.6rem}
      .ledger-empty.compact svg{width:40px;height:30px}
      .ledger-empty.compact .ledger-empty-text{font-size:0.72rem}

      /* ══════════════════════════════════════════════
         FOLIO SYSTÉM — dokumentové primitiva
         ══════════════════════════════════════════════ */
      .folio-rule{
        height:1px;background:linear-gradient(90deg,var(--oxblood) 0%,var(--border) 40%,var(--border) 60%,var(--brass) 100%);
        opacity:0.5;margin:2.5rem 0;
      }
      .folio-rule.tight{margin:1.4rem 0;opacity:0.3}
      .folio-label{
        font-family:var(--font-label);
        font-size:0.6rem;letter-spacing:0.28em;text-transform:uppercase;
        color:var(--brass);font-weight:500;
        display:flex;align-items:center;gap:0.8em;
      }
      .folio-label::after{content:'';flex:1;height:1px;background:var(--border-brass);margin-top:1px;opacity:0.5}
      .folio-spread{display:grid;grid-template-columns:1fr 260px;gap:3.5rem;align-items:start}
      .marginalia{
        font-family:var(--font-mono);font-size:0.66rem;letter-spacing:0.04em;
        color:var(--ivory-faint);line-height:1.9;
        border-left:1px solid var(--border-brass);padding-left:1rem;
      }
      .marginalia .m-line{display:flex;justify-content:space-between;gap:1rem;padding:0.3rem 0;border-bottom:1px solid var(--border)}
      .marginalia .m-line:last-child{border-bottom:none}
      .marginalia .m-line .m-val{color:var(--ivory);font-weight:400}
      .manifest-row{
        display:flex;align-items:baseline;gap:0.6rem;
        padding:0.85rem 0;border-bottom:1px solid var(--border);font-size:0.9rem;
      }
      .manifest-row:last-child{border-bottom:none}
      .manifest-row .mr-name{color:var(--ivory);font-family:var(--font-display);font-weight:500;font-style:italic;flex-shrink:0}
      .manifest-row .mr-dots{flex:1;border-bottom:1px dotted var(--border-hover);transform:translateY(-0.35em);min-width:1rem}
      .manifest-row .mr-val{font-family:var(--font-mono);color:var(--ivory-dim);flex-shrink:0;font-size:0.82rem}
      .manifest-row:hover .mr-name{color:var(--brass-bright)}
      .manifest-col{padding-top:0.2rem}
      .manifest-col-head{
        display:flex;align-items:baseline;justify-content:space-between;
        margin-bottom:0.9rem;padding-bottom:0.7rem;border-bottom:1px solid var(--border-brass);
      }
      .manifest-col-title{font-family:var(--font-display);font-weight:600;font-size:1.1rem;color:var(--ivory);font-style:italic}
      .manifest-col-count{font-family:var(--font-mono);font-size:0.74rem;color:var(--ivory-faint)}
      .manifest-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0 2.5rem}
      .folio-panel{position:relative;padding-top:0.5rem}
      .folio-panel + .folio-panel{margin-top:2.2rem}

      /* Ledger bars */
      .ledger-bar-row{display:grid;grid-template-columns:1fr 2.6fr auto;gap:1rem;align-items:baseline;padding:0.55rem 0;border-bottom:1px solid var(--border)}
      .ledger-bar-row:last-child{border-bottom:none}
      .ledger-bar-name{font-family:var(--font-display);font-size:0.9rem;color:var(--ivory);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-style:italic}
      .ledger-bar-track{position:relative;height:1px;background:var(--border);align-self:center}
      .ledger-bar-fill{position:absolute;top:-2px;bottom:-2px;left:0;background:linear-gradient(90deg,var(--oxblood) 0%,var(--brass) 100%);opacity:0.9}
      .ledger-bar-fill::after{content:'';position:absolute;right:-1px;top:0;bottom:0;width:1px;background:var(--brass-bright)}
      .ledger-bar-val{font-family:var(--font-mono);font-size:0.8rem;color:var(--ivory);text-align:right;white-space:nowrap}

      /* Report figures */
      .report-figures{
        display:grid;grid-template-columns:repeat(4,1fr);gap:0;
        border-top:1px solid var(--border-brass);border-bottom:1px solid var(--border-brass);
        margin:1.6rem 0 2.2rem;
      }
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

      /* Report nav */
      .report-nav{display:flex;flex-wrap:wrap;gap:0 2rem;margin-bottom:0.4rem;border-bottom:1px solid var(--border-brass)}
      .report-nav-item{
        font-family:var(--font-label);font-size:0.62rem;letter-spacing:0.14em;text-transform:uppercase;
        color:var(--ivory-faint);padding:0.7rem 0;cursor:pointer;background:none;border:none;
        border-bottom:2px solid transparent;transition:color 0.2s,border-color 0.2s;white-space:nowrap;
      }
      .report-nav-item:hover{color:var(--ivory-dim)}
      .report-nav-item.active{color:var(--brass-bright);border-bottom-color:var(--oxblood)}
      .report-section{display:none}
      .report-section.active{display:block;animation:fadeReveal 0.35s ease-out 1}

      /* Quick btn */
      .quick-actions{display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:1.5rem}
      .quick-btn{
        display:inline-flex;align-items:center;gap:0.5rem;
        padding:0.6rem 1.2rem;background:var(--brass-faint);
        border:1px solid var(--border-brass);color:var(--ivory-dim);
        font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;font-weight:500;
        text-decoration:none;transition:all 0.2s;cursor:pointer;
      }
      .quick-btn:hover{background:var(--brass-dim);border-color:var(--brass);color:var(--ivory);transform:translateY(-1px)}
      .quick-btn svg{width:12px;height:12px;opacity:0.7}
      .quick-btn.primary{background:var(--oxblood);border-color:var(--oxblood);color:var(--ivory);box-shadow:0 0 16px var(--oxblood-glow)}
      .quick-btn.primary:hover{opacity:0.9;box-shadow:0 0 26px var(--oxblood-glow);color:var(--ivory)}

      /* Select expandable */
      .form-group{position:relative}
      .select-expandable{padding-right:2.8rem!important;cursor:pointer}
      .select-wrap{position:relative;display:flex;flex-direction:column;gap:0.45rem}
      .select-wrap::after{
        content:'';position:absolute;right:1rem;bottom:0.95rem;
        width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;
        border-top:5px solid var(--oxblood-bright);pointer-events:none;opacity:0.85;
        transition:transform 0.2s;
      }
      .select-wrap:focus-within::after{transform:rotate(180deg)}
      .select-count-badge{
        position:absolute;right:2.2rem;bottom:0.72rem;
        font-family:var(--font-mono);font-size:0.52rem;color:var(--oxblood-bright);
        background:var(--oxblood-faint);border:1px solid var(--border-oxblood);
        padding:0.06rem 0.36rem;pointer-events:none;line-height:1.4;font-weight:400;
      }

      /* Nav dropdown */
      .nav-dropdown{position:relative;height:100%}
      .nav-drop-trigger{
        display:flex;align-items:center;flex-direction:column;justify-content:center;
        padding:0 1.1rem;height:100%;
        font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.18em;text-transform:uppercase;font-weight:500;
        color:var(--ivory-faint);text-decoration:none;
        border-bottom:2px solid transparent;
        transition:color 0.2s,border-color 0.2s,background 0.2s;
        white-space:nowrap;position:relative;gap:0.2rem;cursor:pointer;
      }
      .nav-drop-trigger:hover,.nav-dropdown:hover .nav-drop-trigger{color:var(--ivory);background:rgba(182,138,78,0.05)}
      .nav-drop-trigger.active{color:var(--brass-bright);border-bottom-color:var(--oxblood);background:rgba(182,138,78,0.05)}
      .nav-drop-arrow{width:8px;height:5px;margin-top:2px;opacity:0.4;transition:transform 0.2s,opacity 0.2s;flex-shrink:0}
      .nav-dropdown.open .nav-drop-arrow{transform:rotate(180deg);opacity:0.7}
      .nav-dropdown-menu{
        position:absolute;top:100%;left:50%;
        transform:translateX(-50%) translateY(-4px);
        background:rgba(16,21,15,0.98);
        border:1px solid var(--border-brass);
        min-width:180px;margin-top:0;padding-top:6px;
        box-shadow:var(--shadow-card);
        opacity:0;pointer-events:none;
        transition:opacity 0.18s,transform 0.18s;
        z-index:300;
        backdrop-filter:blur(10px);
      }
      .nav-dropdown-menu::before{content:'';position:absolute;top:-6px;left:0;right:0;height:6px}
      .nav-dropdown.open .nav-dropdown-menu{opacity:1;pointer-events:all;transform:translateX(-50%) translateY(0)}
      .nav-dropdown-menu a{
        display:block;padding:0.65rem 1.2rem;
        font-family:var(--font-label);font-size:0.64rem;letter-spacing:0.12em;text-transform:uppercase;font-weight:500;
        color:var(--ivory-faint);text-decoration:none;
        border-bottom:1px solid var(--border);
        transition:color 0.15s,background 0.15s;white-space:nowrap;
      }
      .nav-dropdown-menu a:first-child{}
      .nav-dropdown-menu a:last-child{border-bottom:none}
      .nav-dropdown-menu a:hover{color:var(--ivory);background:var(--brass-faint)}
      .nav-dropdown-menu a.active{color:var(--brass-bright);background:var(--oxblood-faint)}

      /* Activity feed */
      .activity-item{display:flex;align-items:flex-start;gap:0.9rem;padding:0.7rem 0;border-bottom:1px solid var(--border);transition:background 0.15s}
      .activity-item:last-child{border-bottom:none}
      .activity-item:hover{background:var(--brass-faint);margin:0 -0.5rem;padding-left:0.5rem;padding-right:0.5rem}
      .activity-icon{width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:0.75rem;flex-shrink:0;background:var(--brass-faint);border:1px solid var(--border-brass)}
      .activity-body{flex:1;min-width:0}
      .activity-main{font-family:var(--font-body);font-size:0.86rem;color:var(--ivory);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .activity-meta{font-family:var(--font-mono);font-size:0.66rem;color:var(--ivory-faint);margin-top:0.2rem;letter-spacing:0.04em}

      /* Mini stock */
      .mini-stock-row{display:flex;align-items:center;gap:0.8rem;padding:0.5rem 0;border-bottom:1px solid var(--border)}
      .mini-stock-row:last-child{border-bottom:none}
      .mini-stock-name{font-size:0.82rem;color:var(--ivory-dim);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .mini-stock-bar-wrap{width:80px;height:3px;background:var(--border);position:relative;flex-shrink:0}
      .mini-stock-bar-fill{height:100%;background:linear-gradient(90deg,var(--oxblood),var(--brass));transition:width 0.6s ease}
      .mini-stock-qty{font-family:var(--font-mono);font-size:0.76rem;color:var(--ivory);min-width:36px;text-align:right;flex-shrink:0}

      /* Kodex */
      .kodex-section{margin-bottom:2.5rem}
      .kodex-number{font-family:var(--font-display);font-size:3.5rem;color:var(--oxblood);opacity:0.2;float:left;line-height:1;margin-right:1.2rem;margin-top:-0.3rem;font-weight:700;font-style:italic}
      .kodex-rule{font-family:var(--font-body);font-size:0.92rem;line-height:2;color:var(--ivory-dim);overflow:hidden}
      .kodex-rule strong{color:var(--ivory);font-weight:500}
      .kodex-divider{height:1px;background:var(--border);margin:1.8rem 0}

      /* Breakdown */
      .breakdown-row{display:flex;justify-content:space-between;padding:0.45rem 0;font-size:0.88rem;color:var(--ivory-dim);border-bottom:1px solid var(--border)}
      .breakdown-row:last-child{border-bottom:none}
      .breakdown-row .green{color:#6FBF52}
      .bd-label{display:flex;align-items:center;gap:0.4rem}
      .profit-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-top:1.5rem}
      .profit-stat{background:var(--panel2);border:1px solid var(--border-brass);padding:0.9rem 1rem;text-align:center}
      .profit-stat-label{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.18em;text-transform:uppercase;font-weight:500;color:var(--brass);margin-bottom:0.55rem}
      .profit-stat-num{font-family:var(--font-display);font-size:1.4rem;color:var(--ivory);line-height:1;font-weight:700;font-style:italic}

      /* Fret divider */
      .fret{
        height:10px;
        background-image:
          linear-gradient(135deg,var(--brass-dim) 25%,transparent 25.5%),
          linear-gradient(225deg,var(--brass-dim) 25%,transparent 25.5%);
        background-size:16px 16px;background-position:center;
        opacity:0.7;margin:1.5rem 0 3rem;
      }

      /* BB submenu */
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
        main{padding:1.5rem 1rem}
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

      /* Garage */
      .ledger-loading{display:flex;align-items:center;gap:0.7rem;color:var(--ivory-dim);font-family:var(--font-mono);font-size:0.82rem;padding:0.4rem 0}

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
      body.season-halloween{--oxblood:#D2691E;--oxblood-bright:#FF8C00}
      body.season-novy-rok::before{background-image:radial-gradient(3px 3px at 30% 40%, rgba(182,138,78,0.6) 0, transparent 50%);animation:snowFall 8s linear infinite}

      /* ══════════════════════════════════════════════
         TRADING KARTA
         ══════════════════════════════════════════════ */
      .trading-card{max-width:380px;margin:0 auto;background:var(--panel2);border:2px solid var(--brass);position:relative;overflow:hidden;box-shadow:var(--shadow)}
      .tc-header{background:linear-gradient(135deg,var(--oxblood),var(--seal-deep,#4A0D18));padding:1.6rem;text-align:center}
      .tc-avatar{width:96px;height:96px;border-radius:50%;border:3px solid var(--brass-bright);object-fit:cover;background:var(--panel3);margin:0 auto 0.8rem;display:block}
      .tc-name{font-family:var(--font-display);font-style:italic;font-weight:700;font-size:1.3rem;color:var(--ivory)}
      .tc-discord{font-family:var(--font-mono);font-size:0.7rem;color:var(--ivory-dim)}
      .tc-body{padding:1.4rem}
      .tc-stat{display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid var(--border);font-size:0.84rem}
      .tc-badges{display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.8rem}
      .tc-badge{font-family:var(--font-label);font-size:0.54rem;padding:0.25rem 0.6rem;background:var(--brass-faint);border:1px solid var(--border-brass);color:var(--brass-bright)}

      /* ══════════════════════════════════════════════
         GALERIE
         ══════════════════════════════════════════════ */
      .gal-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.2rem}
      .gal-item{background:var(--panel2);border:1px solid var(--border);overflow:hidden;position:relative}
      .gal-item img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
      .gal-caption{padding:0.8rem 1rem;font-size:0.82rem;color:var(--ivory-dim)}
      .gal-meta{font-family:var(--font-mono);font-size:0.62rem;color:var(--ivory-faint);padding:0 1rem 0.8rem}
      .gal-del{position:absolute;top:0.5rem;right:0.5rem;background:rgba(0,0,0,0.6);color:#fff;border:none;width:26px;height:26px;cursor:pointer}

      /* Onboarding dots */
      .onb-dot{width:6px;height:6px;border-radius:50%;background:var(--border-brass);display:inline-block}
      .onb-dot.active{background:var(--oxblood-bright)}
    </style>
  `;
}

module.exports = { baseStyles, ledgerEmpty };
