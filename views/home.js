// home.js — Albion v3 · Heraldická hlavní stránka

const { baseStyles, ledgerEmpty } = require('../styles');
const { renderNav } = require('../nav');

function renderHome(req, data) {
  const { zbrane, weed, drogy, chemky, ucet, recentUcet, recentZbrane, recentWeed, recentDrogy, recentChemky } = data;
  const icName = req.session.icName;

  const WEED_P = {"Žlutý kanabis":150,"Zelený kanabis":150,"Kanabis":150,"Červený kanabis":150,"Modrý kanabis":150};

  let totalValue = 0;
  Object.entries(weed).forEach(([k,q]) => { if(q>0 && WEED_P[k]) totalValue += q * WEED_P[k]; });

  const totalWeed   = Object.values(weed).filter(q=>q>0).reduce((a,b)=>a+b,0);
  const totalDrogy  = Object.values(drogy).filter(q=>q>0).reduce((a,b)=>a+b,0);
  const totalZbrane = Object.values(zbrane).filter(q=>q>0).reduce((a,b)=>a+b,0);
  const totalChemky = Object.values(chemky||{}).filter(q=>q>0).reduce((a,b)=>a+b,0);

  const topItems = (obj, limit=5) => Object.entries(obj)
    .filter(([,q])=>q>0).sort((a,b)=>b[1]-a[1]).slice(0,limit)
    .map(([item,qty]) => ({ item, qty }));

  const topWeed   = topItems(weed);
  const topDrogy  = topItems(drogy);
  const topZbrane = topItems(zbrane);

  const manifestRows = (items, fallback) => items.length
    ? items.map(({item,qty}) => `
      <div class="manifest-row">
        <span class="mr-name">${item}</span>
        <span class="mr-dots"></span>
        <span class="mr-val">${qty} ks</span>
      </div>`).join('')
    : `<div class="manifest-row"><span class="mr-name" style="color:var(--ivory-faint);font-style:italic">${fallback}</span><span class="mr-dots"></span><span class="mr-val">—</span></div>`;

  // Poslední zápisy
  const allRecent = [
    ...recentZbrane.map(r => ({ sekce:'Zbraně', typ:r[1]||'', detail:`${r[2]||'?'} · ${r[3]||'?'} ks`, kdo:r[5]||'—', cas:r[0]||'' })),
    ...recentWeed.map(r => ({ sekce:'Weed', typ:r[1]||'', detail:`${r[2]||'?'} · ${r[3]||'?'} ks`, kdo:r[6]||r[5]||'—', cas:r[0]||'' })),
    ...recentDrogy.map(r => ({ sekce:'Drogy', typ:r[1]||'', detail:`${r[2]||'?'} · ${r[3]||'?'} ks`, kdo:r[6]||r[5]||'—', cas:r[0]||'' })),
    ...(recentChemky||[]).map(r => ({ sekce:'Chemky', typ:r[1]||'', detail:`${r[2]||'?'} · ${r[3]||'?'} ks`, kdo:r[4]||'—', cas:r[0]||'' })),
    ...recentUcet.map(r => {
      const sym=(r[3]||'')==='USD'?'SAD ':'₱';
      return { sekce:'Finance', typ:r[1]||'', detail:`${sym}${r[2]||'?'} — ${r[4]||'—'}`, kdo:r[5]||'—', cas:r[0]||'' };
    }),
  ].sort((a,b)=>b.cas.localeCompare(a.cas)).slice(0,6);

  const activityHtml = allRecent.length ? allRecent.map((ev,i) => {
    const isIn = /VKLAD|PŘÍJEM/.test((ev.typ||'').toUpperCase());
    const sekceIcons = { 'Zbraně':'⚔', 'Weed':'◈', 'Drogy':'◆', 'Chemky':'⬡', 'Finance':'◉' };
    return `<div class="stream-entry">
      <span class="stream-num">${String(i+1).padStart(2,'0')}</span>
      <span class="stream-icon">${sekceIcons[ev.sekce]||'·'}</span>
      <span class="stream-typ" style="color:${isIn?'#6FBF52':'var(--oxblood-bright)'}">${ev.typ}</span>
      <span class="stream-detail">${ev.detail}</span>
      <span class="stream-who">${ev.kdo}</span>
      <span class="stream-cas">${ev.cas}</span>
    </div>`;
  }).join('') : ledgerEmpty('Rejstřík dosud beze zápisu', true);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Dobré ráno' : greetingHour < 18 ? 'Dobrý den' : 'Dobrý večer';
  const today = new Date();
  const dateStr = today.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });

  // Heraldický erb SVG
  const crestSvg = `<svg viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
    <!-- Koruna -->
    <path d="M56 32 L64 20 L70 32 L80 16 L90 32 L96 20 L104 32 L104 40 L56 40 Z" fill="none" stroke="var(--brass)" stroke-width="1.4" stroke-linejoin="round"/>
    <!-- Štít -->
    <path d="M80 50 L134 72 L134 136 Q134 186 80 206 Q26 186 26 136 L26 72 Z" fill="rgba(110,20,35,0.55)" stroke="var(--brass)" stroke-width="2"/>
    <path d="M80 62 L120 80 L120 134 Q120 174 80 192 Q40 174 40 134 L40 80 Z" fill="rgba(110,20,35,0.35)" stroke="rgba(182,138,78,0.5)" stroke-width="1"/>
    <!-- Lev -->
    <g stroke="var(--brass-bright)" stroke-width="1.8" fill="none" stroke-linejoin="round" stroke-linecap="round" transform="translate(80,134)">
      <path d="M-6,-42 C2,-48 14,-46 16,-38 C18,-30 16,-22 10,-18 C18,-14 20,-6 18,4 C16,12 8,18 0,18 C-12,20 -22,12 -24,2 L-28,14 L-36,10 L-30,0 C-34,-4 -36,-10 -34,-18 C-30,-28 -20,-32 -12,-28 C-14,-34 -10,-42 -6,-42 Z"/>
      <path d="M16,0 C22,4 26,12 24,20 C20,26 12,26 8,20"/>
    </g>
    <!-- Dekorativní fleur-de-lis -->
    <g stroke="var(--brass)" stroke-width="0.9" fill="none" opacity="0.7">
      <path d="M26 72 C20 66 16 58 20 52 C24 46 32 46 36 52"/>
      <path d="M134 72 C140 66 144 58 140 52 C136 46 128 46 124 52"/>
    </g>
  </svg>`;

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Albion — Rejstřík</title>
  ${baseStyles()}
  <style>
    /* ── HERO — heraldická záhlavní strana s radiálními paprsky ── */
    .home-hero{
      position:relative;
      margin:-3rem -2rem 0;
      padding:5rem 2rem 4rem;
      text-align:center;
      overflow:hidden;
      display:flex;flex-direction:column;align-items:center;
    }
    /* Radiální paprsky z korony */
    .home-rays{
      position:absolute;top:0;left:50%;transform:translateX(-50%);
      width:min(1100px,100%);height:360px;pointer-events:none;z-index:0;
    }
    .ray{stroke:var(--brass);stroke-width:0.8;opacity:0;stroke-dasharray:380;stroke-dashoffset:380}
    .ray.drawn{animation:drawRay 1.4s ease-out forwards}
    .arc-line{stroke:var(--brass);stroke-width:0.7;fill:none;opacity:0}
    .arc-line.drawn{animation:arcReveal 1.2s ease-out forwards}
    @keyframes drawRay{to{stroke-dashoffset:0;opacity:0.35}}
    @keyframes arcReveal{to{opacity:0.18}}

    .home-eyebrow{
      position:relative;z-index:2;
      font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.36em;
      text-transform:uppercase;color:var(--brass);margin-bottom:1.4rem;
      animation:heroFadeUp 0.7s ease-out 0.3s both;
    }
    .home-title{
      position:relative;z-index:2;
      font-family:var(--font-display);font-weight:800;
      font-size:clamp(4rem,12vw,8rem);letter-spacing:0.04em;
      color:var(--ivory);line-height:0.9;
      animation:heroFadeUp 0.9s ease-out 0.5s both;
    }
    .home-title-rule{
      position:relative;z-index:2;
      width:1px;height:32px;
      background:linear-gradient(180deg,var(--brass),transparent);
      margin:1.6rem auto;
      animation:heroFadeUp 0.7s ease-out 0.7s both;
    }
    .home-greeting{
      position:relative;z-index:2;
      font-family:var(--font-display);font-style:italic;font-weight:500;
      font-size:clamp(1.1rem,2.5vw,1.5rem);color:var(--ivory-dim);
      animation:heroFadeUp 0.7s ease-out 0.85s both;
    }
    .home-greeting strong{color:var(--brass-bright);font-style:normal}
    .home-meta{
      position:relative;z-index:2;
      display:flex;gap:2rem;margin-top:2rem;
      font-family:var(--font-mono);font-size:0.64rem;letter-spacing:0.06em;color:var(--ivory-faint);
      animation:heroFadeUp 0.7s ease-out 1s both;
    }
    .home-meta .dot{
      display:inline-block;width:4px;height:4px;
      background:var(--oxblood-bright);margin-right:0.5em;vertical-align:1px;
    }
    .home-crest{
      position:relative;z-index:2;
      width:min(120px,20vw);height:auto;margin-bottom:1.6rem;
      filter:drop-shadow(0 0 24px var(--oxblood-glow));
      animation:heroFadeUp 0.8s ease-out 0.15s both, crestAmbient 4s ease-in-out 2s infinite;
    }
    @keyframes heroFadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes crestAmbient{0%,100%{filter:drop-shadow(0 0 20px var(--oxblood-glow))}50%{filter:drop-shadow(0 0 36px var(--oxblood-glow))}}
    .home-crest.live-beat{animation:heroSealBeat 0.6s ease-out 1}
    @keyframes heroSealBeat{0%{filter:drop-shadow(0 0 20px var(--oxblood-glow))}40%{filter:drop-shadow(0 0 60px rgba(163,48,73,0.9))}100%{filter:drop-shadow(0 0 20px var(--oxblood-glow))}}

    /* Fret ornament */
    .home-fret{
      height:10px;margin:0 -2rem 3rem;
      background-image:
        linear-gradient(135deg,var(--brass-dim) 25%,transparent 25.5%),
        linear-gradient(225deg,var(--brass-dim) 25%,transparent 25.5%);
      background-size:16px 16px;background-position:center;opacity:0.7;
    }

    /* ── TALLY PLAQUES — čtyři hlavní čísla ── */
    .tally{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border-brass);margin-bottom:3.5rem}
    .plaque{
      background:var(--panel2);padding:2rem 1.6rem;text-align:center;
      transition:background 0.25s;
      border-top:2px solid transparent;
      position:relative;overflow:hidden;
    }
    .plaque::before{content:'';position:absolute;top:0;left:0;width:12px;height:12px;border-top:1px solid var(--brass-dim);border-left:1px solid var(--brass-dim)}
    .plaque::after{content:'';position:absolute;bottom:0;right:0;width:12px;height:12px;border-bottom:1px solid var(--brass-dim);border-right:1px solid var(--brass-dim)}
    .plaque:hover{background:var(--panel3);border-top-color:var(--brass)}
    .plaque-label{font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.22em;text-transform:uppercase;color:var(--brass);margin-bottom:0.9rem}
    .plaque-value{font-family:var(--font-display);font-weight:700;font-style:italic;font-size:clamp(1.5rem,3vw,2.2rem);color:var(--ivory)}
    .plaque-sub{font-family:var(--font-mono);font-size:0.6rem;color:var(--ivory-faint);margin-top:0.55rem;letter-spacing:0.04em}

    /* ── RYCHLÉ AKCE — typografická linka, ne tlačítka ── */
    .quick-nav{
      display:flex;flex-wrap:wrap;gap:0 2rem;margin:0 0 3rem;
      padding-bottom:1.4rem;border-bottom:1px solid var(--border);
    }
    .quick-nav a{
      font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.18em;text-transform:uppercase;
      color:var(--ivory-faint);text-decoration:none;padding:0.35rem 0;
      border-bottom:1px solid transparent;transition:color 0.2s,border-color 0.2s;
    }
    .quick-nav a::before{content:'→ ';color:var(--brass);opacity:0.7}
    .quick-nav a:hover{color:var(--oxblood-bright);border-color:var(--oxblood-bright)}

    /* ── MANIFEST — třísloupec zásobník ── */
    .stock-manifest{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:0 3rem}

    /* ── STREAM — poslední zápisy ── */
    .stream-entry{
      display:grid;grid-template-columns:1.8rem 1.2rem auto 1fr auto auto;
      gap:0.9rem;align-items:baseline;
      padding:0.75rem 0;border-bottom:1px solid var(--border);
    }
    .stream-entry:last-child{border-bottom:none}
    .stream-num{font-family:var(--font-mono);color:var(--ivory-faint);font-size:0.7rem}
    .stream-icon{font-size:0.72rem;color:var(--brass);opacity:0.7}
    .stream-typ{font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:600}
    .stream-detail{font-family:var(--font-body);color:var(--ivory);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.88rem}
    .stream-who{font-family:var(--font-mono);color:var(--ivory-dim);font-size:0.74rem;white-space:nowrap}
    .stream-cas{font-family:var(--font-mono);color:var(--ivory-faint);font-size:0.7rem;white-space:nowrap}

    /* Folio spread na home */
    .home-spread{display:grid;grid-template-columns:1fr 240px;gap:3rem;align-items:start;margin-bottom:3rem}
    .home-balance-big{
      font-family:var(--font-display);font-weight:800;font-style:italic;
      font-size:clamp(3.5rem,9vw,7rem);line-height:0.9;color:var(--ivory);
      letter-spacing:-0.01em;
    }
    .home-balance-big .currency{font-size:0.3em;color:var(--brass);font-family:var(--font-label);font-style:normal;letter-spacing:0.14em;vertical-align:0.2em;margin-left:0.2em}
    .home-balance-note{font-family:var(--font-body);font-size:0.88rem;color:var(--ivory-dim);margin-top:1rem;line-height:1.8;max-width:500px}
    .home-balance-note strong{color:var(--brass-bright);font-weight:500}

    /* Live clock */
    .home-clock{font-family:var(--font-mono);font-size:0.9rem;color:var(--ivory-dim);letter-spacing:0.06em}
    .home-clock-date{font-family:var(--font-label);font-size:0.56rem;color:var(--ivory-faint);letter-spacing:0.14em;text-transform:uppercase;margin-top:0.3rem}

    @media(max-width:1100px){.stock-manifest{grid-template-columns:1fr 1fr;gap:1.5rem 3rem}}
    @media(max-width:900px){
      .home-hero{padding:4rem 1.2rem 3rem;margin:-1.5rem -1rem 0}
      .home-fret{margin:0 -1rem 2rem}
      .tally{grid-template-columns:repeat(2,1fr)}
      .stock-manifest{grid-template-columns:1fr;gap:2rem}
      .home-spread{grid-template-columns:1fr;gap:1.5rem}
      .stream-entry{grid-template-columns:1.5rem auto 1fr;gap:0.5rem 0.7rem}
      .stream-who,.stream-cas{grid-column:2/-1;font-size:0.68rem}
      .stream-icon{display:none}
    }
    @media(max-width:640px){
      .home-meta{flex-direction:column;gap:0.5rem;align-items:center}
      .quick-nav{gap:0.5rem 1.2rem}
      .tally{grid-template-columns:1fr 1fr}
    }
  </style>
  </head><body>
  ${renderNav(req, 'home')}
  <main>

    <!-- ── HERO — záhlaví stránky ── -->
    <div class="home-hero">
      <!-- Radiální paprsky -->
      <svg class="home-rays" viewBox="0 0 1100 360" preserveAspectRatio="xMidYMin meet" id="heroRays">
        <circle class="arc-line" cx="550" cy="10" r="100"/>
        <circle class="arc-line" cx="550" cy="10" r="170"/>
        <circle class="arc-line" cx="550" cy="10" r="240"/>
        <circle class="arc-line" cx="550" cy="10" r="310"/>
        <line class="ray" x1="550" y1="10" x2="550" y2="310"/>
        <line class="ray" x1="550" y1="10" x2="604" y2="275" style="animation-delay:.08s"/>
        <line class="ray" x1="550" y1="10" x2="496" y2="275" style="animation-delay:.08s"/>
        <line class="ray" x1="550" y1="10" x2="668" y2="288" style="animation-delay:.14s"/>
        <line class="ray" x1="550" y1="10" x2="432" y2="288" style="animation-delay:.14s"/>
        <line class="ray" x1="550" y1="10" x2="690" y2="220" style="animation-delay:.2s"/>
        <line class="ray" x1="550" y1="10" x2="410" y2="220" style="animation-delay:.2s"/>
        <line class="ray" x1="550" y1="10" x2="760" y2="195" style="animation-delay:.26s"/>
        <line class="ray" x1="550" y1="10" x2="340" y2="195" style="animation-delay:.26s"/>
        <line class="ray" x1="550" y1="10" x2="760" y2="120" style="animation-delay:.32s"/>
        <line class="ray" x1="550" y1="10" x2="340" y2="120" style="animation-delay:.32s"/>
        <line class="ray" x1="550" y1="10" x2="830" y2="80" style="animation-delay:.38s"/>
        <line class="ray" x1="550" y1="10" x2="270" y2="80" style="animation-delay:.38s"/>
      </svg>

      <!-- Erb -->
      <div class="home-crest" id="homeCrest">
        <img src="/logo.png" alt="Albion" style="width:100%;height:100%;object-fit:contain;display:block;mix-blend-mode:lighten;filter:drop-shadow(0 0 28px rgba(110,20,35,0.7))">
      </div>

      <div class="home-eyebrow">Los Santos · Interní rejstřík</div>
      <h1 class="home-title">ALBION</h1>
      <div class="home-title-rule"></div>
      <p class="home-greeting">${greeting}, <strong>${icName}</strong></p>
      <div class="home-meta">
        <span><span class="dot"></span>Otevřeno · ${dateStr}</span>
        <span id="live-clock-hero">--:--:--</span>
      </div>
    </div>

    <!-- Fret ornament -->
    <div class="home-fret"></div>

    <!-- ── TALLY PLAQUES — čtyři dominantní čísla ── -->
    <div class="tally">
      <div class="plaque">
        <div class="plaque-label">Zůstatek · SAD</div>
        <div class="plaque-value">$${ucet.usd.toLocaleString('cs-CZ')}</div>
        <div class="plaque-sub">hotovost organizace</div>
      </div>
      <div class="plaque">
        <div class="plaque-label">Hodnota weedu</div>
        <div class="plaque-value">$${totalValue.toLocaleString('cs-CZ')}</div>
        <div class="plaque-sub">dle prodejní ceny</div>
      </div>
      <div class="plaque">
        <div class="plaque-label">Pesos</div>
        <div class="plaque-value">₱${ucet.pesos.toLocaleString('cs-CZ')}</div>
        <div class="plaque-sub">sekundární účet</div>
      </div>
      <div class="plaque">
        <div class="plaque-label">Zásoby celkem</div>
        <div class="plaque-value">${(totalWeed+totalDrogy+totalZbrane+totalChemky).toLocaleString('cs-CZ')}</div>
        <div class="plaque-sub">ks ve skladu</div>
      </div>
    </div>

    <!-- ── RYCHLÉ AKCE ── -->
    <nav class="quick-nav">
      <a href="/sklad">Správa skladu</a>
      <a href="/audit">Audit zápisů</a>
      <a href="/blackbook">Blackbook</a>
      <a href="/nastenska">Nástěnka</a>
      <a href="/statistiky">Statistiky</a>
      <a href="/garaz">Garáž</a>
      <a href="/lore">Historie rodu</a>
    </nav>

    <!-- ── HLAVNÍ ČÍSLO + MARGINALIA ── -->
    <div class="home-spread">
      <div>
        <div class="folio-label" style="margin-bottom:1.2rem">Hotovostní zůstatek organizace</div>
        <div class="home-balance-big">
          $${ucet.usd.toLocaleString('cs-CZ')}<span class="currency">SAD</span>
        </div>
        <p class="home-balance-note">
          Vedle USD vede frakce i účet v <strong>₱${ucet.pesos.toLocaleString('cs-CZ')} pesos</strong>.
          Odhadovaná tržní hodnota weedu ve skladu činí <strong>$${totalValue.toLocaleString('cs-CZ')}</strong>.
        </p>
      </div>
      <div class="marginalia">
        <div class="m-line"><span>Weed</span><span class="m-val">${totalWeed} ks</span></div>
        <div class="m-line"><span>Drogy</span><span class="m-val">${totalDrogy} ks</span></div>
        <div class="m-line"><span>Zbraně</span><span class="m-val">${totalZbrane} ks</span></div>
        <div class="m-line"><span>Chemikálie</span><span class="m-val">${totalChemky} ks</span></div>
        <div class="m-line"><span>Odrůd weedu</span><span class="m-val">${Object.keys(weed).filter(k=>weed[k]>0).length}</span></div>
        <div class="m-line"><span>Typů drog</span><span class="m-val">${Object.keys(drogy).filter(k=>drogy[k]>0).length}</span></div>
        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">
          <div class="home-clock" id="live-clock">--:--:--</div>
          <div class="home-clock-date" id="live-date"></div>
        </div>
      </div>
    </div>

    <div class="folio-rule"></div>

    <!-- ── MANIFEST SKLADU ── -->
    <div class="folio-label">Stav skladu</div>
    <div style="height:1.8rem"></div>
    <div class="stock-manifest">
      <div class="manifest-col">
        <div class="manifest-col-head">
          <span class="manifest-col-title">Weed</span>
          <span class="manifest-col-count">${totalWeed} ks</span>
        </div>
        ${manifestRows(topWeed, 'Sklad prázdný')}
      </div>
      <div class="manifest-col">
        <div class="manifest-col-head">
          <span class="manifest-col-title">Drogy</span>
          <span class="manifest-col-count">${totalDrogy} ks</span>
        </div>
        ${manifestRows(topDrogy, 'Sklad prázdný')}
      </div>
      <div class="manifest-col">
        <div class="manifest-col-head">
          <span class="manifest-col-title">Zbraně</span>
          <span class="manifest-col-count">${totalZbrane} ks</span>
        </div>
        ${manifestRows(topZbrane, 'Sklad prázdný')}
      </div>
    </div>

    <div class="folio-rule"></div>

    <!-- ── POSLEDNÍ ZÁPISY ── -->
    <div class="folio-label">Poslední zápisy do rejstříku</div>
    <div style="height:1.8rem"></div>
    <div id="activity-stream">${activityHtml}</div>

  </main>
  <div class="toast" id="toast"></div>

  <script>
    // Spustit animaci paprsků po načtení
    setTimeout(() => {
      document.querySelectorAll('.home-rays .ray,.home-rays .arc-line').forEach(el => el.classList.add('drawn'));
    }, 200);

    // Live hodiny
    (function clock(){
      const c=document.getElementById('live-clock');
      const ch=document.getElementById('live-clock-hero');
      const d=document.getElementById('live-date');
      function tick(){
        const n=new Date();
        const t=n.toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
        if(c) c.textContent=t;
        if(ch) ch.textContent=t;
        if(d) d.textContent=n.toLocaleDateString('cs-CZ',{weekday:'long'});
      }
      tick();setInterval(tick,1000);
    })();

    // SSE — živé aktualizace
    const evtHome = new EventSource('/api/events');
    function bumpLive(msg) {
      showToast(msg);
      const crest = document.getElementById('homeCrest');
      if (crest) {
        crest.classList.remove('live-beat');
        void crest.offsetWidth;
        crest.classList.add('live-beat');
      }
    }
    evtHome.addEventListener('skladUpdate', (e) => {
      const d = JSON.parse(e.data);
      const label = d.sekce==='zbrane'?'Zbraně':d.sekce==='weed'?'Weed':'Drogy';
      bumpLive(label + ' · ' + d.typ + ' — ' + (d.polozka||d.odruda||d.droga) + ' (' + d.qty + ' ks)');
    });
    evtHome.addEventListener('ucetUpdate', (e) => {
      const d = JSON.parse(e.data);
      bumpLive('Finance · ' + d.typ + ' — ' + (d.valuta==='USD'?'SAD ':'₱') + d.castka);
    });
    evtHome.addEventListener('nastenska', (e) => {
      const d = JSON.parse(e.data);
      bumpLive('Oznámení: ' + d.title);
    });
  </script>
  </body></html>`;
}

module.exports = { renderHome };
