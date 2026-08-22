// views/auth.js — CALEDONIA PRIVATE NETWORK · přihlášení
// Stejné routy/pole jako dřív (žádná změna server.js potřeba). Vizuál
// zjednodušen na styl zbytku redesignu — žádný "boot terminál" ani pečetní
// animace (příliš "gaming"), jen krátký klidný "AUTHENTICATING…" přechod.

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
    dm_failed: 'Nové heslo se nepodařilo doručit přes Discord DM.',
  };
  const errMsg = error && errors[error] ? `<div class="auth-alert">${errors[error]}</div>` : '';
  const successReg = page === 'login'
    ? `<script>
        if(location.search.includes('success=registered')){const a=document.createElement('div');a.className='auth-alert auth-success';a.textContent='Registrace proběhla úspěšně. Přihlaš se.';document.querySelector('.auth-card-body').prepend(a);}
        if(location.search.includes('success=password_reset')){const a=document.createElement('div');a.className='auth-alert auth-success';a.textContent='Nové heslo bylo odesláno do tvého Discordu (DM).';document.querySelector('.auth-card-body').prepend(a);}
      <\/script>`
    : '';

  const style = `
    <link rel="icon" type="image/png" href="/logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Cinzel:wght@500;600;700&family=Inter:wght@300;400;500&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      :root{
        --noir:#07050A;--panel2:#100C14;
        --oxblood:#3D0A16;--oxblood-bright:#B3172F;--oxblood-glow:rgba(179,23,47,0.25);
        --brass:#9C7D42;--brass-bright:#CBA45C;--brass-faint:rgba(203,164,92,0.08);
        --ivory:#EFE7D8;--ivory-dim:#B7ACA0;--ivory-faint:#6E6660;
        --border:rgba(203,164,92,0.14);--border-brass:rgba(203,164,92,0.24);--border-oxblood:rgba(179,23,47,0.35);
        --font-display:'Cormorant Garamond',serif;--font-label:'Cinzel',serif;--font-mono:'Space Mono',monospace;--font-body:'Inter',sans-serif;
      }
      html,body{height:100%}
      body{background:var(--noir);color:var(--ivory);font-family:var(--font-body);font-weight:300;min-height:100vh;position:relative;overflow-x:hidden;display:flex;align-items:center;justify-content:center;padding:2rem 1.2rem;animation:authIn 0.4s ease-out}
      @keyframes authIn{from{opacity:0}to{opacity:1}}
      body::before{content:'';position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(ellipse 55% 40% at 50% 0%, rgba(203,164,92,0.04), transparent 60%),radial-gradient(ellipse 50% 50% at 100% 100%, rgba(179,23,47,0.05), transparent 60%)}

      .auth-wrap{position:relative;z-index:1;width:100%;max-width:400px}
      .auth-crest{display:flex;flex-direction:column;align-items:center;gap:0.8rem;margin-bottom:2rem;text-align:center}
      .auth-crest img{width:44px;height:44px;object-fit:contain;opacity:0.92}
      .auth-crest .wordmark{font-family:var(--font-label);letter-spacing:0.28em;font-size:1rem;font-weight:600;color:var(--ivory)}
      .auth-crest .tag{font-family:var(--font-mono);font-size:0.58rem;letter-spacing:0.14em;color:var(--ivory-faint);text-transform:uppercase;margin-top:0.15rem}

      .auth-card{background:var(--panel2);border:1px solid var(--border);border-top:1.5px solid var(--oxblood-bright)}
      .auth-card-body{padding:2.2rem 2rem}
      .auth-eyebrow{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.26em;text-transform:uppercase;color:var(--brass);margin-bottom:0.6rem;text-align:center}
      .auth-h1{font-family:var(--font-display);font-weight:600;font-size:1.5rem;color:var(--ivory);line-height:1.1;margin-bottom:1.5rem;text-align:center}
      .auth-h1 .b-brass{color:var(--brass-bright)}
      .auth-alert{padding:0.75rem 0.9rem;background:rgba(179,23,47,0.08);border:1px solid var(--border-oxblood);border-left:2px solid var(--oxblood-bright);font-size:0.75rem;margin-bottom:1.2rem;color:var(--oxblood-bright);font-family:var(--font-mono)}
      .auth-success{background:rgba(95,168,117,0.08);border-color:rgba(95,168,117,0.25);border-left-color:#5FA875;color:#7CC79A}
      .auth-btn{display:block;width:100%;padding:0.85rem 1.3rem;background:transparent;color:var(--ivory);border:1px solid var(--oxblood-bright);font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.2em;text-transform:uppercase;font-weight:500;cursor:pointer;text-decoration:none;text-align:center;margin-top:0.6rem;transition:background 0.2s,color 0.2s}
      .auth-btn:hover{background:var(--oxblood-bright);color:var(--noir)}
      .auth-btn.secondary{border:1px solid var(--border-brass);color:var(--ivory-faint)}
      .auth-btn.secondary:hover{color:var(--ivory);border-color:var(--brass);background:transparent}
      .auth-link-row{text-align:center;margin-top:1rem}
      .auth-link-row a{font-family:var(--font-mono);font-size:0.68rem;color:var(--ivory-faint);text-decoration:underline;text-underline-offset:3px}
      .auth-link-row a:hover{color:var(--brass-bright)}
      .auth-input{display:block;width:100%;padding:0.75rem 0.9rem;background:rgba(5,4,7,0.85);border:1px solid var(--border-brass);color:var(--ivory);font-family:var(--font-body);font-size:0.84rem;font-weight:300;margin-bottom:0.7rem;outline:none}
      .auth-input:focus{border-color:var(--brass)}
      .auth-label{font-family:var(--font-label);display:block;font-size:0.52rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--brass);margin-bottom:0.4rem;font-weight:500}
      .auth-sep-line{display:flex;align-items:center;gap:1rem;margin:1.2rem 0;font-family:var(--font-label);font-size:0.52rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--ivory-faint)}
      .auth-sep-line::before,.auth-sep-line::after{content:'';flex:1;height:1px;background:var(--border)}
      .auth-discord-chip{display:flex;align-items:center;gap:0.6rem;padding:0.55rem 0.8rem;background:var(--brass-faint);border:1px solid var(--border-brass);font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.08em;color:var(--ivory);margin-bottom:1.2rem}

      .auth-transition{position:fixed;inset:0;z-index:999;background:var(--noir);display:flex;align-items:center;justify-content:center;transition:opacity 0.4s;opacity:1}
      .auth-transition.hide{opacity:0;pointer-events:none}
      .auth-transition-text{font-family:var(--font-mono);font-size:0.72rem;letter-spacing:0.1em;color:var(--brass);text-transform:uppercase}
    </style>
  `;

  const crestBlock = `<div class="auth-crest"><img src="/logo.png" alt="Caledonia"><div class="wordmark">CALEDONIA</div><div class="tag">Private Network</div></div>`;

  const authTransition = `
    <div class="auth-transition" id="authTransition"><div class="auth-transition-text" id="authTransitionText">Authenticating…</div></div>
    <script>
      (function(){
        var el = document.getElementById('authTransition');
        var txt = document.getElementById('authTransitionText');
        if (!el) return;
        setTimeout(function(){ el.classList.add('hide'); setTimeout(function(){ el.remove(); }, 400); }, 350);
      })();
    </script>
  `;

  if (page === 'login') return `<!DOCTYPE html><html lang="cs"><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Caledonia — Přihlášení</title>${style}
  </head><body>
    ${authTransition}
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
        <p style="font-family:var(--font-body);font-size:0.8rem;color:var(--ivory-dim);line-height:1.65;margin-bottom:1.3rem;text-align:center;font-weight:300">Pro registraci musíš být evidován/a v systému organizace. Po ověření tě rejstřík vyzve k zapsání jména a hesla.</p>
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
        <div class="auth-discord-chip"><span>Discord</span><strong>${data?.username || ''}</strong></div>
        ${errMsg}
        <form method="POST" action="/register/complete">
          <label class="auth-label">IC jméno (ve hře)</label>
          <input class="auth-input" type="text" name="ic_name" placeholder="Christopher Sinclair" required>
          <label class="auth-label">Heslo</label>
          <input class="auth-input" type="password" name="password" placeholder="Alespoň 6 znaků" required>
          <label class="auth-label">Heslo znovu</label>
          <input class="auth-input" type="password" name="password2" placeholder="Zopakuj heslo" required>
          <button type="submit" class="auth-btn" style="margin-top:1rem">Zapsat se do rejstříku</button>
        </form>
      </div></div>
    </div>
  </body></html>`;

  if (page === 'login_password') return `<!DOCTYPE html><html lang="cs"><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Caledonia — Potvrzení totožnosti</title>${style}
  </head><body>
    <div class="auth-wrap">
      ${crestBlock}
      <div class="auth-card"><div class="auth-card-body">
        <div class="auth-eyebrow">Potvrzení totožnosti</div>
        <div class="auth-discord-chip"><span>Discord</span><strong>${data?.username || ''}</strong></div>
        ${errMsg}
        <form method="POST" action="/login/password">
          <label class="auth-label">Heslo</label>
          <input class="auth-input" type="password" name="password" placeholder="Tvoje heslo" required autofocus>
          <button type="submit" class="auth-btn" style="margin-top:1rem">Vstoupit do rejstříku</button>
        </form>
        <div class="auth-link-row"><a href="/auth/discord?action=forgot">Zapomenuté heslo?</a></div>
      </div></div>
    </div>
  </body></html>`;

  return '<h1>404</h1>';
}

module.exports = { renderAuth };
