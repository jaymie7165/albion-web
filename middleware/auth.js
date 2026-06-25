// auth.js — extracted view module (redesign: stříbro/platina + karmín, heraldický štít jako podpis)

function renderAuth(page, error, data) {
  const errors = {
    no_code: 'Discord autorizace selhala.',
    not_on_server: 'Nejsi členem aplikace serveru Albion.',
    already_registered: 'Tento Discord účet je již registrován.',
    not_registered: 'Nemáš účet. Zaregistruj se nejdřív.',
    auth_failed: 'Přihlášení selhalo. Zkus to znovu.',
    not_found: 'Účet nenalezen.',
    wrong_password: 'Špatné heslo.',
    missing: 'Vyplň všechna pole.',
    password_mismatch: 'Hesla se neshodují.',
    password_short: 'Heslo musí mít alespoň 6 znaků.',
    exists: 'Účet již existuje.',
  };
  const errMsg = error && errors[error] ? `<div class="auth-alert">${errors[error]}</div>` : '';
  const successReg = page === 'login' ? `<script>if(location.search.includes('success=registered')){const a=document.createElement('div');a.className='auth-alert auth-success';a.textContent='Registrace proběhla úspěšně. Přihlaš se.';document.querySelector('.auth-form-col').prepend(a);}<\/script>` : '';

  const style = `
    <link rel="icon" type="image/png" href="/logo.png">
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;0,9..144,900;1,9..144,500;1,9..144,600&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      :root{
        --seal:#8B1A1A;--seal-bright:#B23B3B;--seal-glow:rgba(139,26,26,0.20);
        --blood:#E8231C;--blood-glow:rgba(232,35,28,0.32);
        --plat:#A9B4B8;--plat-bright:#E7EDEE;
        --plat-dim:rgba(169,180,184,0.16);--plat-line:rgba(169,180,184,0.32);
        --border-seal:rgba(139,26,26,0.30);
        --font-display:'Fraunces',serif;
        --font-mono:'JetBrains Mono',monospace;
      }
      html,body{height:100%}
      body{
        background-color:#070605;
        color:#E7EBEC;
        font-family:'Inter',sans-serif;font-weight:300;
        min-height:100vh;
        position:relative;overflow-x:hidden;
        animation:authBodyFlicker 0.7s linear;
      }
      @keyframes authBodyFlicker{0%{opacity:0}6%{opacity:1}10%{opacity:0.4}15%{opacity:1}100%{opacity:1}}

      /* steel-and-candlelight ambient, asymmetric — cold platinum light from the left, the crest's own glow */
      body::before{
        content:'';position:fixed;inset:0;z-index:0;
        background:
          radial-gradient(ellipse 50% 70% at 12% 45%, rgba(169,180,184,0.10) 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 100% 0%, rgba(139,26,26,0.10) 0%, transparent 55%),
          radial-gradient(ellipse 70% 60% at 50% 110%, rgba(5,4,3,0.8) 0%, transparent 65%);
        pointer-events:none;
      }
      .bg-grid{
        position:fixed;inset:0;z-index:0;
        background-image:
          linear-gradient(rgba(169,180,184,0.012) 1px,transparent 1px),
          linear-gradient(90deg,rgba(169,180,184,0.008) 1px,transparent 1px);
        background-size:100px 100px;
        pointer-events:none;
        animation:gridDrift 70s linear infinite;
      }
      @keyframes gridDrift{from{background-position:0 0}to{background-position:100px 100px}}

      /* ── FRONTISPIECE LAYOUT — asymmetric title page, not a centered card ── */
      .frontispiece{
        position:relative;z-index:1;
        min-height:100vh;
        display:grid;
        grid-template-columns:1fr 1px 460px;
        align-items:center;
      }
      .auth-seal-col{
        display:flex;flex-direction:column;align-items:flex-end;justify-content:center;
        padding:3rem 5vw;text-align:right;
        gap:2.2rem;
      }

      /* ── THE CREST — heraldic shield rendered in SVG, silver+crimson, breathing gently ── */
      .auth-crest{position:relative;width:min(230px,30vw);filter:drop-shadow(0 0 50px var(--blood-glow));animation:crestBreathe 4s ease-in-out infinite}
      .auth-crest svg{width:100%;height:auto;display:block}
      @keyframes crestBreathe{0%,100%{filter:drop-shadow(0 0 36px var(--blood-glow))}50%{filter:drop-shadow(0 0 58px var(--blood-glow))}}
      .cm-shield{fill:#160B0C;stroke:var(--plat);stroke-width:2}
      .cm-shield-inner{fill:var(--seal-deep,#5C0F0F);stroke:var(--plat-bright);stroke-width:1.2;opacity:0.95}
      .cm-lion{fill:none;stroke:var(--plat-bright);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
      .cm-crown{fill:none;stroke:var(--plat);stroke-width:1.6}
      .cm-fleur{fill:var(--plat);opacity:0.92}
      .cm-spear{stroke:var(--plat);stroke-width:1.6}
      .cm-spear-tip{fill:var(--plat-bright)}

      .auth-tagline{
        font-family:var(--font-display);font-style:italic;font-weight:500;
        font-size:1.15rem;color:#9C9C9C;max-width:340px;line-height:1.55;
      }
      .auth-tagline strong{color:var(--blood);font-style:normal;font-weight:700;text-shadow:0 0 20px var(--blood-glow)}
      .frontispiece-rule{
        width:1px;height:62vh;background:linear-gradient(180deg,transparent,var(--blood) 20%,var(--plat) 50%,var(--blood) 80%,transparent);
        opacity:0.6;justify-self:center;
      }

      .auth-form-col{padding:3rem 5vw;width:100%;max-width:460px}
      .auth-eyebrow{
        font-family:var(--font-mono);font-size:0.62rem;letter-spacing:0.3em;text-transform:uppercase;
        color:var(--blood);margin-bottom:0.9rem;font-weight:700;text-shadow:0 0 16px var(--blood-glow);
      }
      .auth-h1{
        font-family:var(--font-display);font-weight:700;font-size:clamp(1.8rem,4vw,2.3rem);
        color:#F6F8F8;letter-spacing:0.005em;line-height:1.1;margin-bottom:0.6rem;
      }
      .auth-h1 .b-red{color:var(--blood);text-shadow:0 0 24px var(--blood-glow)}
      .auth-subcopy{font-size:0.86rem;color:#9C9C9C;line-height:1.7;margin-bottom:2rem;max-width:380px}

      .auth-btn{
        display:block;width:100%;padding:1rem;
        background:var(--blood);
        color:#FFF7EE;border:1px solid var(--blood);
        font-family:var(--font-mono);font-size:0.68rem;
        letter-spacing:0.22em;text-transform:uppercase;font-weight:700;
        cursor:pointer;text-decoration:none;text-align:center;
        margin-top:0.8rem;
        transition:opacity 0.2s,box-shadow 0.2s;border-radius:3px;
        position:relative;overflow:hidden;
        box-shadow:0 0 30px var(--blood-glow);
      }
      .auth-btn:hover{opacity:0.9;box-shadow:0 0 44px var(--blood-glow)}
      .auth-btn:active{opacity:1}
      .auth-btn.secondary{
        background:transparent;border:1px solid var(--plat-line);
        color:#9C9C9C;box-shadow:none;
      }
      .auth-btn.secondary:hover{color:#E7EBEC;border-color:rgba(169,180,184,0.5);background:var(--plat-dim);opacity:1;box-shadow:none}
      .auth-input{
        display:block;width:100%;
        padding:0.85rem 1rem;
        background:rgba(0,0,0,0.35);
        border:1px solid var(--plat-line);
        color:#E7EBEC;font-family:'Inter',sans-serif;font-size:0.84rem;
        margin-bottom:0.8rem;outline:none;border-radius:3px;
        transition:border-color 0.2s;
      }
      .auth-input:focus{border-color:rgba(169,180,184,0.7)!important;box-shadow:0 0 0 2px rgba(169,180,184,0.10),0 0 12px rgba(169,180,184,0.16)!important}
      .auth-label{display:block;font-size:0.6rem;letter-spacing:0.2em;text-transform:uppercase;color:#9C9C9C;margin-bottom:0.4rem;font-family:var(--font-mono);font-weight:600}
      .auth-alert{
        padding:0.8rem 1rem;
        background:var(--seal-glow);
        border:1px solid var(--border-seal);
        border-left:2px solid var(--seal);
        font-size:0.78rem;margin-bottom:1.5rem;color:#D89B9B;
      }
      .auth-success{background:rgba(111,191,82,0.08);border-color:rgba(111,191,82,0.25);border-left-color:#6FBF52;color:#9BD686}
      .auth-divider{
        text-align:left;font-size:0.6rem;letter-spacing:0.26em;
        text-transform:uppercase;color:#5A5A5A;margin:1.4rem 0;
        position:relative;font-family:var(--font-mono);
        display:flex;align-items:center;gap:1rem;
      }
      .auth-divider::after{content:'';flex:1;height:1px;background:var(--plat-dim)}
      .auth-sep{height:1px;background:var(--plat-dim);margin:1.2rem 0}

      .auth-status-bar{
        display:inline-flex;align-items:center;gap:0.6rem;margin-bottom:1.8rem;padding:0.5rem 0.85rem;
        background:var(--plat-dim);border:1px solid var(--plat-line);
        font-family:var(--font-mono);font-size:0.58rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--plat-bright);
      }
      .auth-status-dot{width:6px;height:6px;border-radius:50%;background:var(--seal);box-shadow:0 0 8px var(--seal);animation:authDotPulse 1.8s ease-in-out infinite;flex-shrink:0}
      @keyframes authDotPulse{0%,100%{box-shadow:0 0 4px var(--seal)}50%{box-shadow:0 0 12px var(--seal),0 0 20px rgba(139,26,26,0.35)}}
      .auth-btn::before{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent);animation:btnSweep 3.2s ease-in-out 2s infinite}
      @keyframes btnSweep{0%,60%{left:-100%}100%{left:220%}}

      @keyframes authReveal{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}
      .auth-h1{animation:authReveal 0.6s ease-out 1}
      .auth-reveal{transition:opacity 0.7s ease}
      body.booting .auth-reveal{opacity:0}

      @media(max-width:900px){
        .frontispiece{grid-template-columns:1fr;display:flex;flex-direction:column;padding:3rem 0 2.5rem}
        .auth-seal-col{align-items:center;text-align:center;padding:1.5rem 6vw 0.5rem}
        .frontispiece-rule{display:none}
        .auth-form-col{margin:0 auto;padding:2rem 6vw}
        .auth-tagline{max-width:100%}
      }

      /* ── SEAL RITUAL — opening of the register, not a hacker boot ── */
      body.booting{overflow:hidden}
      .boot-screen{
        position:fixed;inset:0;z-index:999;background:#050403;
        display:flex;align-items:center;justify-content:center;
        transition:opacity 0.6s ease, visibility 0.6s ease;
      }
      .boot-screen.boot-hidden{opacity:0;visibility:hidden;pointer-events:none}
      .boot-screen::before{
        content:'';position:absolute;inset:0;pointer-events:none;z-index:1;
        background:radial-gradient(ellipse 55% 50% at 50% 42%, rgba(169,180,184,0.10), transparent 70%);
      }
      .boot-screen::after{
        content:'';position:absolute;inset:0;pointer-events:none;z-index:1;
        background:radial-gradient(ellipse 75% 65% at 50% 50%, transparent 35%, rgba(0,0,0,0.88) 100%);
      }
      .boot-stage{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:1.8rem}
      .boot-seal-wax{
        width:84px;height:84px;border-radius:50%;
        border:2px solid var(--plat);
        display:flex;align-items:center;justify-content:center;
        position:relative;
        box-shadow:0 0 0 1px #050403 inset, 0 0 24px var(--seal-glow);
        animation:sealBreatheSm 2.4s ease-in-out infinite;
      }
      .boot-seal-wax::before{content:'';position:absolute;inset:6px;border-radius:50%;border:1px solid var(--plat-line)}
      .boot-seal-wax span{font-family:var(--font-display);font-weight:700;font-size:1.7rem;color:var(--plat);letter-spacing:0.02em}
      @keyframes sealBreatheSm{0%,100%{box-shadow:0 0 0 1px #050403 inset,0 0 16px var(--seal-glow)}50%{box-shadow:0 0 0 1px #050403 inset,0 0 34px var(--seal-glow)}}
      .boot-term{
        width:88%;max-width:560px;color:#B7C0C4;
        font-family:var(--font-mono);
        font-size:0.78rem;line-height:2.05;letter-spacing:0.03em;
        text-shadow:0 0 8px rgba(169,180,184,0.25);
        text-align:center;
        min-height:7.5em;
      }
      .boot-term .boot-line{white-space:pre-wrap;word-break:break-word;animation:bootLineIn 0.2s ease}
      @keyframes bootLineIn{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:translateY(0)}}
      .boot-line.dim{color:#6A7174;text-shadow:none}
      .boot-line.warn{color:#A9B4B8;text-shadow:0 0 8px rgba(169,180,184,0.35)}
      .boot-line.white{color:#E7EBEC;text-shadow:none;font-family:var(--font-display);font-style:italic;letter-spacing:0.01em}
      .boot-cursor{display:inline-block;width:7px;height:1em;background:var(--seal-bright);vertical-align:-2px;animation:bootCursor 0.7s steps(1) infinite}
      @keyframes bootCursor{0%,49%{opacity:1}50%,100%{opacity:0}}
      .boot-skip{
        position:absolute;bottom:24px;right:28px;z-index:2;
        color:#5A5A5A;font-size:0.58rem;letter-spacing:0.14em;text-transform:uppercase;
        font-family:var(--font-mono);
      }
      .boot-progress{width:88%;max-width:280px;height:2px;background:rgba(139,26,26,0.18);position:relative;overflow:hidden;border-radius:1px}
      .boot-progress-fill{height:100%;background:linear-gradient(90deg,var(--seal),var(--plat));box-shadow:0 0 10px var(--seal-glow);transition:width 0.18s linear;width:0%}
    </style>
  `;

  // Heraldic shield — lion rampant under a crown, flanked by crossed spears (matches the org's GTA logo)
  const crestSvg = `
    <div class="auth-crest">
      <svg viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg">
        <!-- crossed spears -->
        <line class="cm-spear" x1="40" y1="60" x2="138" y2="118"/>
        <polygon class="cm-spear-tip" points="34,46 50,56 40,68 28,58"/>
        <line class="cm-spear" x1="180" y1="60" x2="82" y2="118"/>
        <polygon class="cm-spear-tip" points="186,46 198,58 186,68 174,56"/>
        <!-- crown -->
        <path class="cm-crown" d="M78 52 L84 30 L98 46 L110 22 L122 46 L136 30 L142 52 Z"/>
        <rect class="cm-crown" x="80" y="50" width="60" height="10" rx="1"/>
        <!-- shield -->
        <path class="cm-shield" d="M110 56 L172 78 L172 150 Q172 210 110 248 Q48 210 48 150 L48 78 Z"/>
        <path class="cm-shield-inner" d="M110 70 L160 88 L160 148 Q160 198 110 230 Q60 198 60 148 L60 88 Z"/>
        <!-- lion rampant (simplified heraldic mark) -->
        <g class="cm-lion" transform="translate(110,158)">
          <path d="M-6,-46 C2,-52 12,-50 16,-42 C20,-34 18,-26 12,-22 C18,-18 22,-10 20,0 C18,10 10,16 0,18 C-12,20 -22,14 -26,4 L-30,16 L-38,12 L-32,-2 C-36,-6 -38,-12 -36,-18 C-32,-28 -22,-32 -14,-30 C-16,-36 -12,-44 -6,-46 Z"/>
          <path d="M2,-44 C6,-40 6,-36 2,-34"/>
          <circle cx="4" cy="-40" r="1.4" fill="var(--plat-bright)" stroke="none"/>
          <path d="M18,-2 C26,2 30,10 26,18 C22,24 14,24 10,18"/>
        </g>
        <!-- fleur-de-lis flanking the shield -->
        <g class="cm-fleur" transform="translate(20,150) scale(0.55)">
          <path d="M20 0 C20 18 10 26 10 40 C10 50 14 58 20 62 C26 58 30 50 30 40 C30 26 20 18 20 0 Z"/>
          <path d="M0 30 C2 20 12 16 18 24 C16 34 6 38 0 30 Z"/>
          <path d="M40 30 C38 20 28 16 22 24 C24 34 34 38 40 30 Z"/>
          <rect x="14" y="58" width="12" height="10"/>
        </g>
        <g class="cm-fleur" transform="translate(200,150) scale(-0.55,0.55)">
          <path d="M20 0 C20 18 10 26 10 40 C10 50 14 58 20 62 C26 58 30 50 30 40 C30 26 20 18 20 0 Z"/>
          <path d="M0 30 C2 20 12 16 18 24 C16 34 6 38 0 30 Z"/>
          <path d="M40 30 C38 20 28 16 22 24 C24 34 34 38 40 30 Z"/>
          <rect x="14" y="58" width="12" height="10"/>
        </g>
      </svg>
    </div>
  `;

  const sealColHtml = `
    <div class="auth-seal-col">
      ${crestSvg}
      <p class="auth-tagline">Albion nepotřebuje být <strong>hlasitý</strong>. Stačí, že je <strong>zapečetěný</strong>.</p>
    </div>
    <div class="frontispiece-rule"></div>
  `;

  const bootScreen = `
    <div class="boot-screen" id="bootScreen">
      <div class="boot-stage">
        <div class="boot-seal-wax"><span>A</span></div>
        <div class="boot-term" id="bootTerm">
          <span class="boot-cursor"></span>
        </div>
        <div class="boot-progress"><div class="boot-progress-fill" id="bootBar"></div></div>
      </div>
      <div class="boot-skip">[ klikni / stiskni klávesu — přeskočit ]</div>
    </div>
    <script>
      (function(){
        var boot = document.getElementById('bootScreen');
        var term = document.getElementById('bootTerm');
        var bar  = document.getElementById('bootBar');
        if (!boot || !term) return;
        var lines = [
          { text: 'Otevírání rejstříku rodiny…', cls: 'dim', delay: 90 },
          { text: 'Kodex mlčenlivosti — potvrzen', cls: 'dim', delay: 70 },
          { text: 'Ověřování přísahy…', cls: 'warn', delay: 80 },
          { text: 'Pečeť rodiny přiložena.', cls: 'warn', delay: 70 },
          { text: 'Brána se otevírá.', cls: 'white', delay: 90 },
          { text: 'Vítej, bratře.', cls: 'white', delay: 90 },
        ];
        var cursor = term.querySelector('.boot-cursor');
        var li = 0;
        function nextLine(){
          if (li >= lines.length) { return finish(); }
          var ln = lines[li];
          term.innerHTML = '';
          var div = document.createElement('div');
          div.className = 'boot-line ' + (ln.cls||'dim');
          term.appendChild(div);
          if (bar) bar.style.width = Math.round((li/lines.length)*100) + '%';
          var i = 0, text = ln.text;
          var typer = setInterval(function(){
            div.textContent = text.slice(0,++i);
            if (i >= text.length) { clearInterval(typer); li++; setTimeout(nextLine, ln.delay||120); }
          }, 18);
        }
        function finish(){
          if (bar) bar.style.width = '100%';
          setTimeout(function(){
            boot.classList.add('boot-hidden');
            document.body.classList.remove('booting');
            setTimeout(function(){ boot.remove(); }, 600);
          }, 500);
        }
        function skip(){ finish(); }
        boot.addEventListener('click', skip);
        document.addEventListener('keydown', skip, { once: true });
        nextLine();
      })();
    </script>
  `;

  if (page === 'login') return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Albion — Přihlášení</title>${style}</head><body class="booting">${bootScreen}<div class="bg-grid"></div><div class="frontispiece auth-reveal">${sealColHtml}<div class="auth-form-col">
    <div class="auth-eyebrow">Rejstřík Albionu</div>
    <h1 class="auth-h1">Vstup pro <span class="b-red">členy</span></h1>
    <p class="auth-subcopy">Přihlášení vyžaduje příslušnost k organizaci na Discordu a heslo do interního rejstříku.</p>
    <div class="auth-status-bar"><div class="auth-status-dot"></div><span>Kanál zapečetěn</span></div>
    ${errMsg}
    <a href="/auth/discord?action=login" class="auth-btn">Přihlásit se přes Discord</a>
    <div class="auth-divider">nebo</div>
    <a href="/register" class="auth-btn secondary">Registrovat se</a>
  </div></div>${successReg}</body></html>`;

  if (page === 'register') return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Albion — Registrace</title>${style}</head><body class="booting">${bootScreen}<div class="bg-grid"></div><div class="frontispiece auth-reveal">${sealColHtml}<div class="auth-form-col">
    <div class="auth-eyebrow">Rejstřík Albionu</div>
    <h1 class="auth-h1">Žádost o <span class="b-red">členství</span></h1>
    <p class="auth-subcopy">Pro registraci musíš být členem Discord serveru Albion. Po ověření tě rejstřík vyzve k zápisu jména a heslu.</p>
    ${errMsg}
    <a href="/auth/discord?action=register" class="auth-btn">Pokračovat přes Discord</a>
    <div class="auth-sep"></div>
    <a href="/login" class="auth-btn secondary">Zpět na přihlášení</a>
  </div></div></body></html>`;

  if (page === 'register_complete') return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Albion — Registrace</title>${style}</head><body><div class="bg-grid"></div><div class="frontispiece">${sealColHtml}<div class="auth-form-col">
    <div class="auth-eyebrow">Rejstřík Albionu</div>
    <h1 class="auth-h1">Zápis do <span class="b-red">rejstříku</span></h1>
    <p class="auth-subcopy">Discord: <strong style="color:#E7EBEC">${data?.username||''}</strong></p>
    ${errMsg}
    <form method="POST" action="/register/complete">
      <label class="auth-label">IC jméno (ve hře)</label><input class="auth-input" type="text" name="ic_name" placeholder="Christopher Sinclair" required>
      <label class="auth-label">Heslo</label><input class="auth-input" type="password" name="password" placeholder="Alespoň 6 znaků" required>
      <label class="auth-label">Heslo znovu</label><input class="auth-input" type="password" name="password2" placeholder="Zopakuj heslo" required>
      <button type="submit" class="auth-btn">Dokončit registraci</button>
    </form>
  </div></div></body></html>`;

  if (page === 'login_password') return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Albion — Přihlášení</title>${style}</head><body><div class="bg-grid"></div><div class="frontispiece">${sealColHtml}<div class="auth-form-col">
    <div class="auth-eyebrow">Rejstřík Albionu</div>
    <h1 class="auth-h1">Potvrzení <span class="b-red">totožnosti</span></h1>
    <p class="auth-subcopy">Discord: <strong style="color:#E7EBEC">${data?.username||''}</strong></p>
    ${errMsg}
    <form method="POST" action="/login/password">
      <label class="auth-label">Heslo</label><input class="auth-input" type="password" name="password" placeholder="Tvoje heslo" required autofocus>
      <button type="submit" class="auth-btn">Přihlásit se</button>
    </form>
  </div></div></body></html>`;

  return '<h1>404</h1>';
}

module.exports = { renderAuth };
