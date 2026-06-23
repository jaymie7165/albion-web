// home.js — extracted view module

const { baseStyles, ledgerEmpty } = require('./styles');
const { renderNav } = require('./nav');

function renderHome(req, data) {
  const { zbrane, weed, drogy, chemky, ucet, recentUcet, recentZbrane, recentWeed, recentDrogy, recentChemky } = data;
  const icName = req.session.icName;

  // ── Výpočet hodnoty skladu
  const WEED_P = {"Žlutý kanabis":150,"Zelený kanabis":150,"Kanabis":150,"Červený kanabis":150,"Modrý kanabis":150};
  const DROGY_P = {"Kapky":200,"Kokain":500,"Extáze":350,"Metamfetamin":450,"Benzo":300,"Joyka":250,"Heroin":600,"Speed":280,"LSD":400};
  const ZBRANE_P = {"Pump Shotgun":8000,"Pistol MK2":12000,"Pistol":5000,"Combat Pistol":7000,"Double Action Revolver":15000,"Navy Revolver":14000,"Vintage Pistol":6000,"Gusenberg":18000,"Dlouhé":25000,"9mm":100,"9mm Mk2":150,".75cal":300,".50cal":250,"12-gauge":200};

  let totalValue = 0;
  Object.entries(weed).forEach(([k,q]) => { if(q>0 && WEED_P[k]) totalValue += q * WEED_P[k]; });

  const totalWeed   = Object.values(weed).filter(q=>q>0).reduce((a,b)=>a+b,0);
  const totalDrogy  = Object.values(drogy).filter(q=>q>0).reduce((a,b)=>a+b,0);
  const totalZbrane = Object.values(zbrane).filter(q=>q>0).reduce((a,b)=>a+b,0);
  const totalChemky = Object.values(chemky||{}).filter(q=>q>0).reduce((a,b)=>a+b,0);

  const topItems = (obj, priceMap, limit=5) => Object.entries(obj)
    .filter(([,q])=>q>0)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,limit)
    .map(([item,qty]) => ({ item, qty, value: priceMap[item] ? qty*priceMap[item] : 0 }));

  const topWeed   = topItems(weed, WEED_P);
  const topDrogy  = topItems(drogy, {});
  const topZbrane = topItems(zbrane, {});

  const manifestRows = (items, fallback) => items.length
    ? items.map(({item,qty,value}) => `
      <div class="manifest-row">
        <span class="mr-name">${item}</span>
        <span class="mr-dots"></span>
        <span class="mr-val">${qty} ks${value?' · $'+value.toLocaleString('cs-CZ'):''}</span>
      </div>`).join('')
    : `<div class="manifest-row"><span class="mr-name" style="color:var(--text-muted);font-style:italic">${fallback}</span><span class="mr-dots"></span><span class="mr-val">—</span></div>`;

  // ── Poslední aktivity (kept as a thin stream, not a card)
  const allRecent = [
    ...recentZbrane.map(r => ({ sekce:'Zbraně', typ:r[1]||'', detail:`${r[2]||'?'} · ${r[3]||'?'} ks`, kdo:r[5]||'—', cas:r[0]||'' })),
    ...recentWeed.map(r => ({ sekce:'Weed', typ:r[1]||'', detail:`${r[2]||'?'} · ${r[3]||'?'} ks`, kdo:r[6]||r[5]||'—', cas:r[0]||'' })),
    ...recentDrogy.map(r => ({ sekce:'Drogy', typ:r[1]||'', detail:`${r[2]||'?'} · ${r[3]||'?'} ks`, kdo:r[6]||r[5]||'—', cas:r[0]||'' })),
    ...(recentChemky||[]).map(r => ({ sekce:'Chemky', typ:r[1]||'', detail:`${r[2]||'?'} · ${r[3]||'?'} ks`, kdo:r[4]||'—', cas:r[0]||'' })),
    ...recentUcet.map(r => {
      const sym=(r[3]||'')==='USD'?'SAD ':'₱';
      return { sekce:'Finance', typ:r[1]||'', detail:`${sym}${r[2]||'?'} — ${r[4]||'—'}`, kdo:r[5]||'—', cas:r[0]||'' };
    }),
  ].sort((a,b)=>b.cas.localeCompare(a.cas)).slice(0,5);

  const activityHtml = allRecent.length ? allRecent.map((ev,i) => {
    const isIn = /VKLAD|PŘÍJEM/.test((ev.typ||'').toUpperCase());
    return `<div class="stream-entry">
      <span class="stream-num">${String(i+1).padStart(2,'0')}</span>
      <span class="stream-typ" style="color:${isIn?'#6FBF52':'var(--blood)'}">${ev.typ}</span>
      <span class="stream-detail">${ev.detail}</span>
      <span class="stream-who">${ev.kdo}</span>
      <span class="stream-cas">${ev.cas}</span>
    </div>`;
  }).join('') : ledgerEmpty('Rejstřík dosud beze zápisu', true);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Dobré ráno' : greetingHour < 18 ? 'Dobrý den' : 'Dobrý večer';
  const today = new Date();
  const dateStr = today.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Albion — Rejstřík</title>
  ${baseStyles()}
  <style>
    /* ── OPENING FOLIO — full-bleed crimson stripe breaking out of the page margin ── */
    .opening-folio{
      display:flex;align-items:flex-start;justify-content:space-between;
      gap:2.5rem;
      position:relative;
      margin:-2.6rem -2rem 0;
      padding:3.4rem 2rem 2.8rem;
      background:
        radial-gradient(ellipse 60% 100% at 8% 30%, var(--blood-glow) 0%, transparent 55%),
        linear-gradient(165deg, var(--ink-soft) 0%, var(--ink) 55%);
      border-bottom:2px solid var(--seal-deep);
      overflow:hidden;
    }
    .opening-folio::before{
      content:'';position:absolute;inset:0;pointer-events:none;
      background:repeating-linear-gradient(115deg,transparent,transparent 38px,rgba(232,35,28,0.025) 38px,rgba(232,35,28,0.025) 39px);
    }
    .opening-folio::after{
      content:'';position:absolute;left:0;right:0;bottom:-2px;height:2px;
      background:linear-gradient(90deg,transparent,var(--blood) 30%,var(--brass) 70%,transparent);
      box-shadow:0 0 16px var(--blood-glow);
    }
    .opening-left{flex:1;min-width:0;position:relative;z-index:1;padding-left:0.5rem}
    .opening-tag{
      font-family:var(--font-mono);font-size:0.64rem;letter-spacing:0.34em;
      text-transform:uppercase;color:var(--blood);margin-bottom:1.1rem;font-weight:700;
      text-shadow:0 0 18px var(--blood-glow);
    }
    .opening-name{
      font-family:var(--font-display);font-weight:700;
      font-size:clamp(2.6rem,7vw,5rem);line-height:0.98;color:var(--vellum-bright);
      letter-spacing:-0.01em;
    }
    .opening-name em{font-style:italic;color:var(--blood);font-weight:600;text-shadow:0 0 30px var(--blood-glow)}
    .opening-sub{
      font-family:'Inter',sans-serif;color:var(--text-dim);font-size:1rem;
      margin-top:1.1rem;max-width:480px;line-height:1.7;
    }
    .opening-right{
      flex-shrink:0;text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:1rem;
      position:relative;z-index:1;
    }
    .opening-seal{
      width:118px;height:118px;border-radius:50%;
      border:2px solid var(--brass);
      display:flex;align-items:center;justify-content:center;flex-direction:column;
      box-shadow:0 0 0 7px var(--ink),0 0 50px var(--blood-glow),0 0 14px var(--seal-glow);
      position:relative;
      background:radial-gradient(circle at 35% 30%, rgba(232,35,28,0.08), transparent 65%);
      animation:sealAmbientBreathe 4s ease-in-out infinite;
    }
    @keyframes sealAmbientBreathe{
      0%,100%{box-shadow:0 0 0 7px var(--ink),0 0 50px var(--blood-glow),0 0 14px var(--seal-glow)}
      50%{box-shadow:0 0 0 7px var(--ink),0 0 64px var(--blood-glow),0 0 20px var(--seal-glow)}
    }
    .opening-seal::before{content:'';position:absolute;inset:9px;border-radius:50%;border:1px solid var(--border-brass)}
    .opening-seal .os-letter{font-family:var(--font-display);font-weight:800;font-size:2.3rem;color:var(--brass-bright);line-height:1;text-shadow:0 0 18px rgba(201,162,39,0.4)}
    .opening-seal .os-sub{font-family:var(--font-mono);font-size:0.5rem;letter-spacing:0.22em;color:var(--brass);opacity:0.85;margin-top:0.2rem}
    .opening-seal.live-pulse{animation:heroSealPulseBlood 1.2s ease-out 1}
    @keyframes heroSealPulseBlood{
      0%{box-shadow:0 0 0 7px var(--ink),0 0 50px var(--blood-glow),0 0 14px var(--seal-glow)}
      35%{box-shadow:0 0 0 7px var(--ink),0 0 90px var(--blood-glow),0 0 40px var(--blood);border-color:var(--blood)}
      100%{box-shadow:0 0 0 7px var(--ink),0 0 50px var(--blood-glow),0 0 14px var(--seal-glow)}
    }
    .opening-clock{font-family:var(--font-mono);font-size:0.95rem;color:var(--text-dim);letter-spacing:0.04em}
    .opening-date{font-family:var(--font-mono);font-size:0.64rem;color:var(--text-muted);letter-spacing:0.1em;text-transform:uppercase}

    /* ── THE LEDGER LINE — quick actions as a single typographic row, not buttons ── */
    .ledger-line{
      display:flex;flex-wrap:wrap;gap:0 1.6rem;margin-top:1.8rem;position:relative;z-index:1;
    }
    .ledger-line a{
      font-family:var(--font-mono);font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;
      color:var(--text-dim);text-decoration:none;padding:0.3rem 0;
      border-bottom:1px solid transparent;transition:color 0.2s,border-color 0.2s;
    }
    .ledger-line a:hover{color:var(--blood);border-color:var(--blood)}
    .ledger-line a::before{content:'→ ';color:var(--brass);opacity:0.7}

    /* ── PRIMARY FIGURE — the one number that owns the page, rendered in raw blood-red ── */
    .primary-figure{margin:3rem 0 3rem;position:relative}
    .pf-label{
      font-family:var(--font-mono);font-size:0.66rem;letter-spacing:0.3em;text-transform:uppercase;
      color:var(--text-muted);margin-bottom:0.5rem;
    }
    .pf-value{
      font-family:var(--font-display);font-weight:700;
      font-size:clamp(4rem,11vw,8.5rem);line-height:0.88;color:var(--blood);
      letter-spacing:-0.015em;display:flex;align-items:baseline;gap:0.3rem;
      text-shadow:0 0 60px var(--blood-glow);
      filter:drop-shadow(0 4px 0 rgba(0,0,0,0.3));
    }
    .pf-value .pf-currency{font-size:0.32em;color:var(--text-muted);font-family:var(--font-mono);text-shadow:none}
    .pf-footnote{
      font-family:'Inter',sans-serif;font-size:0.86rem;color:var(--text-dim);
      margin-top:0.9rem;max-width:520px;line-height:1.7;
    }
    .pf-footnote strong{color:var(--brass-bright);font-weight:600}

    /* ── STOCK MANIFEST GRID — three-column layout, home-page specific weighting ── */
    .stock-manifest{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:0 3rem}

    /* ── THE STREAM — recent activity as a typed log, no card ── */
    .stream{margin-top:0.5rem}
    .stream-entry{
      display:grid;grid-template-columns:1.6rem auto 1fr auto auto;
      gap:0.9rem;align-items:baseline;
      padding:0.7rem 0;border-bottom:1px solid var(--border);
      font-size:0.86rem;
    }
    .stream-entry:last-child{border-bottom:none}
    .stream-num{font-family:var(--font-mono);color:var(--text-muted);font-size:0.74rem}
    .stream-typ{font-family:var(--font-mono);font-size:0.66rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:600}
    .stream-detail{color:var(--vellum);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .stream-who{font-family:var(--font-mono);color:var(--text-dim);font-size:0.78rem;white-space:nowrap}
    .stream-cas{font-family:var(--font-mono);color:var(--text-muted);font-size:0.72rem;white-space:nowrap}

    @media(max-width:900px){
      .opening-folio{flex-direction:column;gap:1.6rem;margin:-2.6rem -2rem 0;padding:2.4rem 2rem 2rem}
      .opening-right{flex-direction:row;align-items:center;width:100%;justify-content:space-between}
      .stock-manifest{grid-template-columns:1fr;gap:1.8rem}
      .stream-entry{grid-template-columns:1.4rem auto 1fr;gap:0.5rem 0.7rem}
      .stream-who,.stream-cas{grid-column:2 / -1;font-size:0.7rem}
    }
    @media(max-width:768px){
      .opening-folio{margin:-1.5rem -1rem 0;padding:2rem 1.2rem 1.6rem}
    }
    @media(max-width:480px){
      .opening-seal{width:78px;height:78px}
      .opening-seal .os-letter{font-size:1.5rem}
      .ledger-line{gap:0.5rem 1.1rem}
    }
  </style>
  </head><body>
  ${renderNav(req, 'home')}
  <main>

    <!-- ── OPENING FOLIO ── -->
    <div class="opening-folio">
      <div class="opening-left">
        <div class="opening-tag glitch-in">Rejstřík Albionu · otevřeno</div>
        <h1 class="opening-name glitch-in">${greeting}, <em>${icName}</em></h1>
        <p class="opening-sub">Zásoby a finance organizace se zapisují v reálném čase. Toto je dnešní strana rejstříku, ${dateStr}.</p>
        <div class="ledger-line">
          <a href="/sklad">Správa skladu</a>
          <a href="/audit">Audit zápisů</a>
          <a href="/nastenska">Nástěnka</a>
          <a href="/statistiky">Statistiky</a>
          <a href="/lore">Historie rodu</a>
        </div>
      </div>
      <div class="opening-right">
        <div class="opening-seal" id="heroSeal"><span class="os-letter">A</span><span class="os-sub">LOS SANTOS</span></div>
        <div>
          <div class="opening-clock" id="live-clock">--:--:--</div>
          <div class="opening-date" id="live-date"></div>
        </div>
      </div>
    </div>

    <script>
      (function clock(){
        const c=document.getElementById('live-clock');
        const d=document.getElementById('live-date');
        function tick(){
          const n=new Date();
          if(c) c.textContent=n.toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
          if(d) d.textContent=n.toLocaleDateString('cs-CZ',{weekday:'long'});
        }
        tick();setInterval(tick,1000);
      })();
    </script>

    <!-- ── PRIMARY FIGURE + MARGINALIA — the dominant number, not a KPI tile ── -->
    <div class="folio-spread">
      <div class="primary-figure">
        <div class="pf-label">Hotovostní zůstatek organizace</div>
        <div class="pf-value">$${ucet.usd.toLocaleString('cs-CZ')}<span class="pf-currency">SAD</span></div>
        <p class="pf-footnote">Vedle vede frakce účet i v <strong>₱${ucet.pesos.toLocaleString('cs-CZ')} pesos</strong>. Hodnota skladu (jen weed, dle prodejních cen) činí <strong>$${totalValue.toLocaleString('cs-CZ')}</strong>.</p>
      </div>
      <div class="marginalia">
        <div class="m-line"><span>Weed v skladu</span><span class="m-val">${totalWeed} ks</span></div>
        <div class="m-line"><span>Drogy v skladu</span><span class="m-val">${totalDrogy} ks</span></div>
        <div class="m-line"><span>Zbraně v skladu</span><span class="m-val">${totalZbrane} ks</span></div>
        <div class="m-line"><span>Chemikálie</span><span class="m-val">${totalChemky} ks</span></div>
        <div class="m-line"><span>Odrůd weedu</span><span class="m-val">${Object.keys(weed).filter(k=>weed[k]>0).length}</span></div>
        <div class="m-line"><span>Typů drog</span><span class="m-val">${Object.keys(drogy).filter(k=>drogy[k]>0).length}</span></div>
      </div>
    </div>

    <div class="folio-rule"></div>

    <!-- ── STOCK MANIFEST — three unequal ledger columns ── -->
    <div class="folio-label">Stav skladu</div>
    <div style="height:1.6rem"></div>
    <div class="stock-manifest">
      <div class="manifest-col">
        <div class="manifest-col-head">
          <span class="manifest-col-title">Weed</span>
          <span class="manifest-col-count">${totalWeed} ks celkem</span>
        </div>
        ${manifestRows(topWeed, 'Sklad prázdný')}
      </div>
      <div class="manifest-col">
        <div class="manifest-col-head">
          <span class="manifest-col-title">Drogy</span>
          <span class="manifest-col-count">${totalDrogy} ks celkem</span>
        </div>
        ${manifestRows(topDrogy, 'Sklad prázdný')}
      </div>
      <div class="manifest-col">
        <div class="manifest-col-head">
          <span class="manifest-col-title">Zbraně</span>
          <span class="manifest-col-count">${totalZbrane} ks celkem</span>
        </div>
        ${manifestRows(topZbrane, 'Sklad prázdný')}
      </div>
    </div>

    <div class="folio-rule"></div>

    <!-- ── THE STREAM — last entries in the register ── -->
    <div class="folio-label">Poslední zápisy</div>
    <div style="height:1.6rem"></div>
    <div class="stream" id="activity-stream">${activityHtml}</div>

  </main>
  <div class="toast" id="toast"></div>
  <script>
    // ── Live SSE — re-stamps the seal and nudges a toast, nothing more ──
    const evtHome = new EventSource('/api/events');
    function bumpLive(msg) {
      showToast(msg);
      const seal = document.getElementById('heroSeal');
      if (seal) {
        seal.classList.remove('live-pulse');
        void seal.offsetWidth;
        seal.classList.add('live-pulse');
      }
    }
    evtHome.addEventListener('skladUpdate', (e) => {
      const d = JSON.parse(e.data);
      const label = d.sekce==='zbrane'?'Zbraně':d.sekce==='weed'?'Weed':'Drogy';
      bumpLive(label + ' ' + d.typ + ' — ' + (d.polozka||d.odruda||d.droga) + ' (' + d.qty + ' ks)');
    });
    evtHome.addEventListener('ucetUpdate', (e) => {
      const d = JSON.parse(e.data);
      bumpLive('Finance — ' + d.typ + ' — ' + (d.valuta==='USD'?'SAD ':'₱') + d.castka);
    });
    evtHome.addEventListener('nastenska', (e) => {
      const d = JSON.parse(e.data);
      bumpLive('Nové oznámení: ' + d.title);
    });
    function showToast(msg, isError) {
      let t=document.getElementById('toast');
      if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t);}
      t.textContent=msg;
      t.className='toast show'+(isError?' error':'');
      clearTimeout(t._timer);
      t._timer=setTimeout(()=>t.className='toast',3500);
    }
    window.showToast=showToast;
  </script>
  </body></html>`;
}

module.exports = { renderHome };

