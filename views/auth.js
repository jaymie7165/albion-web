// views/auth.js — Albion v5 · "Crimson & Cream" přihlášení
// Stejné routy, stejná pojmenování polí/parametrů jako dřív — jen paleta
// (vlastní sada CSS proměnných, protože auth stránky běží mimo baseStyles())
// přepnutá na crimson (#DC143C) + krémovou NavajoWhite (#FFDEAD), stejně
// jako zbytek webu.
 
function renderAuth(page, error, data) {
  const errors = {
    no_code: 'Ověření se nezdařilo, zkus to prosím znovu.',
    not_on_server: 'Nejsi evidován/a v systému organizace Caledonia. Obrať se na sekretariát.',
    already_registered: 'Tento účet je již v rejstříku organizace.',
    not_registered: 'Nemáš záznam v rejstříku. Zaregistruj se.',
    auth_failed: 'Přihlášení selhalo. Zkus to znovu.',
    not_found: 'Záznam nenalezen.',
    wrong_password: 'Špatné heslo.',
    too_many_attempts: 'Příliš mnoho neúspěšných pokusů. Zkus to znovu za pár minut.',
    missing: 'Vyplň všechna pole.',
    password_mismatch: 'Hesla se neshodují.',
    password_short: 'Heslo musí mít alespoň 6 znaků.',
    exists: 'Účet již existuje.',
    dm_failed: 'Nové heslo se nepodařilo doručit přes Discord DM — zkontroluj, že máš na serveru povolené DM od ostatních členů, a zkus to znovu, nebo kontaktuj vedení.',
  };
  const errMsg = error && errors[error]
    ? `<div class="auth-alert">${errors[error]}</div>`
    : '';
  const successReg = page === 'login'
    ? `<script>
        if(location.search.includes('success=registered')){const a=document.createElement('div');a.className='auth-alert auth-success';a.textContent='Registrace proběhla úspěšně. Přihlaš se.';document.querySelector('.auth-card-body').prepend(a);}
        if(location.search.includes('success=password_reset')){const a=document.createElement('div');a.className='auth-alert auth-success';a.textContent='Nové heslo bylo odesláno do tvého Discordu (DM). Přihlaš se jím a v Profilu si ho co nejdřív změň.';document.querySelector('.auth-card-body').prepend(a);}
      <\/script>`
    : '';
 
  const style = `
    <link rel="icon" type="image/png" href="/logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;0,6..96,600;0,6..96,700;0,6..96,800;0,6..96,900;1,6..96,600;1,6..96,700&family=Cinzel:wght@400;500;600;700&family=Jost:wght@300;400;500&family=Space+Mono:ital,wght@0,400;0,700&display=swap" rel="stylesheet">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      :root{
        --noir:#0B0607;
        --panel:#150F10;
        --panel2:#1B1314;
        --oxblood:#7A0E24;
        --oxblood-bright:#DC143C;
        --oxblood-glow:rgba(220,20,60,0.32);
        --brass:#C9A671;
        --brass-bright:#FFDEAD;
        --brass-dim:rgba(255,222,173,0.22);
        --brass-faint:rgba(255,222,173,0.09);
        --ivory:#F6EEE4;
        --ivory-dim:#C9BBAD;
        --ivory-faint:#8C7C6E;
        --border:rgba(255,222,173,0.16);
        --border-brass:rgba(255,222,173,0.30);
        --border-oxblood:rgba(220,20,60,0.42);
        --font-display:'Bodoni Moda',serif;
        --font-label:'Cinzel',serif;
        --font-mono:'Space Mono',monospace;
        --font-body:'Jost',sans-serif;
      }
      html,body{height:100%}
      body{
        background:var(--noir);color:var(--ivory);font-family:var(--font-body);font-weight:300;
        min-height:100vh;position:relative;overflow-x:hidden;
        display:flex;align-items:center;justify-content:center;padding:2rem 1.2rem;
        animation:authIn 0.5s ease-out;
      }
      @keyframes authIn{from{opacity:0}to{opacity:1}}
 
      body::before{
        content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
        background:
          radial-gradient(ellipse 60% 45% at 50% 0%, rgba(255,222,173,0.07), transparent 60%),
          radial-gradient(ellipse 55% 55% at 100% 100%, rgba(220,20,60,0.09), transparent 60%);
      }
      body::after{content:'';position:fixed;inset:0;z-index:0;pointer-events:none;box-shadow:inset 0 0 18vw rgba(0,0,0,0.7)}
 
      .auth-wrap{position:relative;z-index:1;width:100%;max-width:420px}
      .auth-crest{display:flex;flex-direction:column;align-items:center;gap:1rem;margin-bottom:2rem;text-align:center}
      .auth-crest img{width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 0 22px rgba(220,20,60,0.55));animation:crestAmbient 4s ease-in-out infinite}
      @keyframes crestAmbient{0%,100%{filter:drop-shadow(0 0 16px var(--oxblood-glow))}50%{filter:drop-shadow(0 0 30px var(--oxblood-glow))}}
      .auth-crest .wordmark{font-family:var(--font-label);letter-spacing:0.32em;font-size:1.15rem;font-weight:600;color:var(--ivory)}
      .auth-crest .wordmark .b-red{color:var(--oxblood-bright)}
      .auth-crest .tag{font-family:var(--font-mono);font-size:0.62rem;letter-spacing:0.1em;color:var(--ivory-faint);text-transform:uppercase}
 
      .auth-card{background:var(--panel2);border:1px solid var(--border-brass);border-top:2px solid var(--oxblood);box-shadow:0 24px 64px rgba(0,0,0,0.6);position:relative}
      .auth-card::before{content:'';position:absolute;top:0;left:0;width:16px;height:16px;border-top:1px solid var(--brass-dim);border-left:1px solid var(--brass-dim)}
      .auth-card::after{content:'';position:absolute;bottom:0;right:0;width:16px;height:16px;border-bottom:1px solid var(--brass-dim);border-right:1px solid var(--brass-dim)}
      .auth-card-body{padding:2.4rem 2.2rem}
 
      .auth-eyebrow{font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.3em;text-transform:uppercase;color:var(--brass);margin-bottom:0.7rem;text-align:center}
      .auth-h1{font-family:var(--font-display);font-weight:700;font-style:italic;font-size:1.7rem;color:var(--ivory);line-height:1.1;margin-bottom:1.6rem;text-align:center}
      .auth-h1 .b-brass{color:var(--brass-bright)}
 
      .auth-alert{padding:0.8rem 0.95rem;background:rgba(220,20,60,0.10);border:1px solid var(--border-oxblood);border-left:2px solid var(--oxblood);font-size:0.76rem;margin-bottom:1.3rem;color:var(--oxblood-bright);font-family:var(--font-mono)}
      .auth-success{background:rgba(76,175,109,0.09);border-color:rgba(76,175,109,0.28);border-left-color:#4CAF6D;color:#7BD69B}
 
      .auth-btn{
        display:block;width:100%;padding:0.9rem 1.4rem;background:transparent;color:var(--ivory);border:1px solid var(--oxblood);
        font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.22em;text-transform:uppercase;font-weight:600;
        cursor:pointer;text-decoration:none;text-align:center;margin-top:0.7rem;
        transition:background 0.2s,box-shadow 0.2s,border-color 0.2s;position:relative;overflow:hidden;
      }
      .auth-btn:hover{background:var(--oxblood);box-shadow:0 0 26px var(--oxblood-glow)}
      .auth-btn.secondary{background:transparent;border:1px solid var(--border-brass);color:var(--ivory-faint);box-shadow:none}
      .auth-btn.secondary:hover{color:var(--ivory);border-color:var(--brass);background:var(--brass-faint);box-shadow:none}
 
      .auth-link-row{text-align:center;margin-top:1.1rem}
      .auth-link-row a{font-family:var(--font-mono);font-size:0.7rem;color:var(--ivory-faint);text-decoration:underline;text-underline-offset:3px}
      .auth-link-row a:hover{color:var(--brass-bright)}
 
      .auth-input{
        display:block;width:100%;padding:0.8rem 0.95rem;background:rgba(9,6,7,0.85);border:1px solid var(--border-brass);
        color:var(--ivory);font-family:var(--font-body);font-size:0.85rem;font-weight:300;margin-bottom:0.75rem;outline:none;
        transition:border-color 0.2s,box-shadow 0.2s;
      }
      .auth-input:focus{border-color:var(--brass);box-shadow:0 0 0 2px var(--brass-faint)}
      .auth-label{font-family:var(--font-label);display:block;font-size:0.55rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--brass);margin-bottom:0.45rem;font-weight:500}
 
      .auth-sep-line{display:flex;align-items:center;gap:1rem;margin:1.3rem 0;font-family:var(--font-label);font-size:0.55rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--ivory-faint)}
      .auth-sep-line::before,.auth-sep-line::after{content:'';flex:1;height:1px;background:var(--border)}
 
      .auth-discord-chip{display:flex;align-items:center;gap:0.7rem;padding:0.6rem 0.85rem;background:var(--brass-faint);border:1px solid var(--border-brass);font-family:var(--font-label);font-size:0.62rem;letter-spacing:0.1em;color:var(--ivory);margin-bottom:1.3rem}
      .auth-discord-chip span{color:var(--brass);font-size:0.56em;letter-spacing:0.14em;text-transform:uppercase}
 
      .boot-screen{position:fixed;inset:0;z-index:999;background:var(--noir);display:flex;align-items:center;justify-content:center;transition:opacity 0.6s ease,visibility 0.6s}
      .boot-screen.boot-hidden{opacity:0;visibility:hidden;pointer-events:none}
      .boot-stage{display:flex;flex-direction:column;align-items:center;gap:2rem;text-align:center}
      .boot-crest{width:100px;height:100px;display:flex;align-items:center;justify-content:center;position:relative}
      .boot-crest img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 22px rgba(220,20,60,0.6));animation:crestAmbient 2s ease-in-out infinite}
      .boot-lines{width:min(560px,90vw);font-family:var(--font-mono);font-size:0.74rem;line-height:2.1;letter-spacing:0.03em;color:var(--brass);text-shadow:0 0 8px rgba(255,222,173,0.3);text-align:center;min-height:7em}
      .boot-line{animation:bootLineIn 0.18s ease}
      @keyframes bootLineIn{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:translateY(0)}}
      .boot-line.dim{color:var(--ivory-faint);text-shadow:none}
      .boot-line.accent{color:var(--oxblood-bright);text-shadow:0 0 10px var(--oxblood-glow)}
      .boot-line.ivory{color:var(--ivory);text-shadow:none;font-family:var(--font-display);font-style:italic;letter-spacing:0.01em}
      .boot-cursor{display:inline-block;width:6px;height:1em;background:var(--brass);vertical-align:-2px;animation:blink 0.7s steps(1) infinite}
      @keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
      .boot-progress{width:min(260px,80%);height:1px;background:rgba(255,222,173,0.15);position:relative;overflow:hidden}
      .boot-progress-fill{height:100%;background:linear-gradient(90deg,var(--oxblood),var(--brass));transition:width 0.2s linear;width:0}
      .boot-skip{position:absolute;bottom:24px;right:28px;font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--ivory-faint);opacity:0.6}
 
      .reg-ceremony{position:fixed;inset:0;z-index:998;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity 0.4s;backdrop-filter:blur(6px)}
      .reg-ceremony.show{opacity:1;pointer-events:all}
      .reg-ceremony-stage{text-align:center}
      .reg-ceremony-seal{width:120px;height:120px;border-radius:50%;margin:0 auto 1.4rem;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 30%, var(--oxblood-bright), var(--oxblood) 55%, #300711 100%);box-shadow:0 18px 40px rgba(0,0,0,0.6), inset 0 0 0 3px rgba(0,0,0,0.2);transform:scale(2.2) rotate(-18deg);opacity:0}
      .reg-ceremony.slam .reg-ceremony-seal{animation:regSealSlam 0.6s cubic-bezier(0.32,0.04,0.5,1) forwards}
      @keyframes regSealSlam{0%{opacity:0;transform:scale(2.2) rotate(-18deg)}55%{opacity:1;transform:scale(1.15) rotate(-6deg)}100%{opacity:1;transform:scale(1) rotate(-8deg)}}
      .reg-ceremony-seal span{font-family:var(--font-label);font-weight:700;font-size:2.2rem;color:rgba(0,0,0,0.3)}
      .reg-ceremony-name{font-family:var(--font-display);font-weight:700;font-style:italic;font-size:1.6rem;color:var(--ivory)}
      .reg-ceremony-sub{font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.24em;text-transform:uppercase;color:var(--brass);margin-top:0.6rem}
    </style>
  `;
 
  const crestBlock = `
    <div class="auth-crest">
      <img src="/logo.png" alt="Caledonia">
      <div class="wordmark"><span class="b-red">C</span>ALEDONIA</div>
      <div class="tag">Interní rejstřík organizace</div>
    </div>
  `;
 
  const bootScreen = `
    <div class="boot-screen" id="bootScreen">
      <div class="boot-stage">
        <div class="boot-crest"><img src="/logo.png" alt="Caledonia"></div>
        <div class="boot-lines" id="bootTerm"><span class="boot-cursor"></span></div>
        <div class="boot-progress"><div class="boot-progress-fill" id="bootBar"></div></div>
      </div>
      <div class="boot-skip">[ klikni nebo stiskni klávesu ]</div>
    </div>
    <script>
      (function(){
        var boot=document.getElementById('bootScreen');
        var term=document.getElementById('bootTerm');
        var bar=document.getElementById('bootBar');
        if(!boot||!term)return;
        var lines=[
          {text:'Otevírání rejstříku organizace…',cls:'dim',delay:100},
          {text:'Ověřování pečetě…',cls:'dim',delay:80},
          {text:'Prověřuji přísahu loajality.',cls:'accent',delay:90},
          {text:'Pečeť přiložena.',cls:'accent',delay:80},
          {text:'Brána se otevírá.',cls:'ivory',delay:100},
          {text:'Vítej, bratře.',cls:'ivory',delay:120},
        ];
        var li=0;
        function next(){
          if(li>=lines.length)return finish();
          var ln=lines[li];
          term.innerHTML='';
          var div=document.createElement('div');
          div.className='boot-line '+(ln.cls||'dim');
          term.appendChild(div);
          if(bar)bar.style.width=Math.round((li/lines.length)*100)+'%';
          var i=0,text=ln.text;
          var t=setInterval(function(){
            div.textContent=text.slice(0,++i);
            if(i>=text.length){clearInterval(t);li++;setTimeout(next,ln.delay||100);}
          },16);
        }
        function finish(){
          if(bar)bar.style.width='100%';
          setTimeout(function(){
            boot.classList.add('boot-hidden');
            setTimeout(function(){boot.remove()},600);
          },480);
        }
        function skip(){finish();}
        boot.addEventListener('click',skip);
        document.addEventListener('keydown',skip,{once:true});
        next();
      })();
    </script>
  `;
 
  if (page === 'login') return `<!DOCTYPE html><html lang="cs"><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Caledonia — Přihlášení</title>${style}
  </head><body>
    ${bootScreen}
    <div class="auth-wrap">
      ${crestBlock}
      <div class="auth-card"><div class="auth-card-body">
        <div class="auth-eyebrow">Vstup pro členy</div>
        <h1 class="auth-h1">Přihlášení do <span class="b-brass">rejstříku</span></h1>
        ${errMsg}
        <a href="/auth/discord?action=login" class="auth-btn">Přihlásit se přes Discord</a>
        <div class="auth-sep-line">nebo</div>
        <a href="/register" class="auth-btn secondary">Registrovat se</a>
        <div class="auth-link-row"><a href="/auth/discord?action=forgot">Zapomenuté heslo?</a></div>
      </div></div>
    </div>
    ${successReg}
  </body></html>`;
 
  if (page === 'register') return `<!DOCTYPE html><html lang="cs"><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Caledonia — Registrace</title>${style}
  </head><body>
    <div class="auth-wrap">
      ${crestBlock}
      <div class="auth-card"><div class="auth-card-body">
        <div class="auth-eyebrow">Žádost o členství</div>
        <h1 class="auth-h1">Vstup do <span class="b-brass">organizace</span></h1>
        <p style="font-family:var(--font-body);font-size:0.82rem;color:var(--ivory-dim);line-height:1.7;margin-bottom:1.4rem;text-align:center">Pro registraci musíš být evidován/a v systému organizace Caledonia. Po ověření tě rejstřík vyzve k zapsání jména a hesla.</p>
        ${errMsg}
        <a href="/auth/discord?action=register" class="auth-btn">Pokračovat přes Discord</a>
        <div class="auth-sep-line">nebo</div>
        <a href="/login" class="auth-btn secondary">Zpět na přihlášení</a>
      </div></div>
    </div>
  </body></html>`;
 
  if (page === 'register_complete') return `<!DOCTYPE html><html lang="cs"><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Caledonia — Zápis do rejstříku</title>${style}
  </head><body>
    <div class="auth-wrap">
      ${crestBlock}
      <div class="auth-card"><div class="auth-card-body">
        <div class="auth-eyebrow">Zápis do rejstříku</div>
        <div class="auth-discord-chip">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:14px;height:14px;color:var(--brass)"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.100 18.08.12 18.103.14 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
          <span>Discord</span>
          <strong>${data?.username || ''}</strong>
        </div>
        ${errMsg}
        <form method="POST" action="/register/complete">
          <label class="auth-label">IC jméno (ve hře)</label>
          <input class="auth-input" type="text" name="ic_name" placeholder="Christopher Sinclair" required>
          <label class="auth-label">Heslo</label>
          <input class="auth-input" type="password" name="password" placeholder="Alespoň 6 znaků" required>
          <label class="auth-label">Heslo znovu</label>
          <input class="auth-input" type="password" name="password2" placeholder="Zopakuj heslo" required>
          <button type="submit" class="auth-btn" style="margin-top:1.1rem">Zapsat se do rejstříku</button>
        </form>
      </div></div>
    </div>
    <div class="reg-ceremony" id="regCeremony">
      <div class="reg-ceremony-stage">
        <div class="reg-ceremony-seal"><span>A</span></div>
        <div class="reg-ceremony-name" id="regCeremonyName"></div>
        <div class="reg-ceremony-sub">Zapsán do rejstříku Caledonie</div>
      </div>
    </div>
    <script>
      (function(){
        var form=document.querySelector('.auth-card-body form');
        var overlay=document.getElementById('regCeremony');
        var nameEl=document.getElementById('regCeremonyName');
        if(!form||!overlay)return;
        form.addEventListener('submit', function(e){
          e.preventDefault();
          var fd=new FormData(form);
          var icName=(fd.get('ic_name')||'').toString();
          fetch(form.action,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fd),redirect:'follow'}).then(function(res){
            var finalUrl=res.url||'';
            if(finalUrl.indexOf('/login')!==-1 && finalUrl.indexOf('success=registered')!==-1){
              nameEl.textContent=icName;
              overlay.classList.add('show');
              setTimeout(function(){overlay.classList.add('slam');},50);
              setTimeout(function(){ window.location.href=finalUrl; },1900);
            } else {
              window.location.href=finalUrl||form.action;
            }
          }).catch(function(){ form.submit(); });
        });
      })();
    </script>
  </body></html>`;
 
  if (page === 'login_password') return `<!DOCTYPE html><html lang="cs"><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Caledonia — Potvrzení totožnosti</title>${style}
  </head><body>
    <div class="auth-wrap">
      ${crestBlock}
      <div class="auth-card"><div class="auth-card-body">
        <div class="auth-eyebrow">Potvrzení totožnosti</div>
        <div class="auth-discord-chip">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:14px;height:14px;color:var(--brass)"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.100 18.08.12 18.103.14 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
          <span>Discord</span>
          <strong>${data?.username || ''}</strong>
        </div>
        ${errMsg}
        <form method="POST" action="/login/password">
          <label class="auth-label">Heslo</label>
          <input class="auth-input" type="password" name="password" placeholder="Tvoje heslo" required autofocus>
          <button type="submit" class="auth-btn" style="margin-top:1.1rem">Vstoupit do rejstříku</button>
        </form>
        <div class="auth-link-row"><a href="/auth/discord?action=forgot">Zapomenuté heslo?</a></div>
      </div></div>
    </div>
  </body></html>`;
 
  return '<h1>404</h1>';
}
 
module.exports = { renderAuth };
 
