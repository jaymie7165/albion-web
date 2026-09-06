// views/sklad.js — Albion v5 · "Crimson & Cream" sklad, přehledný tab-layout
//
// Oproti v4: sidebar je rozdělený na HLAVNÍ taby (Účetnictví/Reserve Fund,
// Weed, Drogy, Chemky — denní použití) a VEDLEJŠÍ taby schované pod
// "Více ▾" (Zbraně, Výroba, Směnárna, Ceník — občasné použití). Po každém
// úspěšném zápisu se navíc krátce "zablikne" aktivní panel (rewardFlash
// z nav.js) — malý pocit odměny místo tichého formuláře.

const { baseStyles, ledgerEmpty } = require('../styles');
const { renderNav } = require('../nav');

function renderDashboard(req, data) {
  const { zbrane, weed, drogy, chemky, ucet, recentUcet, cenik, katalog } = data;
  const icName = req.session.icName;
  const canManage = req.session.accessLevel === 1; // jen Founder/Council smí upravovat ceník a katalog položek

  const esc = (s) => (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const cenikRowHtml = (row, ci, ri, editable) => editable
    ? `<div class="cenik-row" data-row="${ri}">
        <input type="text" class="cenik-label-input" value="${esc(row.label)}" placeholder="Název položky">
        <input type="text" class="cenik-cena-input" value="${esc(row.cena)}" placeholder="Cena">
        <button type="button" class="cenik-row-del" onclick="this.closest('.cenik-row').remove()" title="Smazat řádek">✕</button>
      </div>`
    : `<div class="cenik-row cenik-row-static"><span>${esc(row.label)}</span><span class="cenik-cena">${esc(row.cena)}</span></div>`;

  const formatSklad = (obj, ceny, jsouSacky) => {
    const entries = Object.entries(obj).filter(([,q]) => q > 0);
    if (!entries.length) return ledgerEmpty('Sklad prázdný', true);
    return entries.map(([item, qty]) => {
      if (jsouSacky) {
        const hodnota = ceny && ceny[item] ? qty * ceny[item].prodej : null;
        return `<div class="sklad-row"><span>${item}</span><span>${qty} sáčků${hodnota ? ` <em>$${hodnota}</em>` : ''}</span></div>`;
      }
      return `<div class="sklad-row"><span>${item}</span><span>${qty} ks</span></div>`;
    }).join('');
  };

  const formatUcet = (rows) => {
    if (!rows.length) return ledgerEmpty('Žádné záznamy', true);
    return rows.map(r => {
      const [cas, typ, castka, valuta, pozn] = r;
      const isIn = typ === 'PŘÍJEM';
      const symbol = valuta === 'USD' ? 'SAD ' : '₱';
      return `<div class="sklad-row">
        <span style="display:flex;align-items:center;gap:0.6rem">
          <span style="width:4px;height:4px;background:${isIn?'#7BD69B':'var(--oxblood-bright)'};flex-shrink:0"></span>
          ${pozn||'—'}
        </span>
        <span style="color:${isIn?'#7BD69B':'var(--oxblood-bright)'}">
          ${symbol}${castka} <em style="color:var(--ivory-faint);font-style:normal;font-size:0.8em">${valuta.replace('USD','SAD')}</em>
        </span>
      </div>`;
    }).join('');
  };

  const totalValue = (() => {
    const W={"Žlutý kanabis":150,"Zelený kanabis":150,"Kanabis":150,"Červený kanabis":150,"Modrý kanabis":150};
    let t=0;
    Object.entries(weed).forEach(([k,q])=>{if(q>0&&W[k])t+=q*W[k];});
    return t;
  })();

  const totalWeedSacky = Object.values(weed).filter(q=>q>0).reduce((a,b)=>a+b,0);
  const totalDrogySacky = Object.values(drogy).filter(q=>q>0).reduce((a,b)=>a+b,0);

  // ── ROZDĚLENÍ TABŮ: HLAVNÍ (denní použití) vs VEDLEJŠÍ (schované pod "Více") ──
  const sekceMetaPrimary = [
    { id: 'ucet',   label: 'Účetnictví', sub: 'Finance',     icon: '◉' },
    { id: 'weed',   label: 'Weed',       sub: 'Sklad',       icon: '◈' },
    { id: 'drogy',  label: 'Drogy',      sub: 'Sklad',       icon: '◆' },
    { id: 'chemky', label: 'Chemikálie', sub: 'Sklad',       icon: '⬡' },
  ];
  const sekceMetaSecondary = [
    { id: 'zbrane', label: 'Zbraně',     sub: 'Sklad',       icon: '⚔' },
    { id: 'vyroba', label: 'Výroba',     sub: 'Substance',   icon: '⚒' },
    { id: 'smena',  label: 'Směnárna',   sub: 'SAD ⇄ Pesos', icon: '⇄' },
    { id: 'cenik',  label: 'Ceník',      sub: 'Referenční ceny', icon: '$' },
    { id: 'nevyrizene', label: 'Nevyřízené', sub: 'Weed & kufr od membérů', icon: '⚑' },
  ];
  const memberOnly = (req.session.accessLevel || 3) >= 3;
  let sekceMeta = memberOnly
    ? [{ id:'ucet', label:'Reserve Fund', sub:'Povinný odvod', icon:'◉' }, { id:'cenik', label:'Ceník', sub:'Referenční ceny', icon:'$' }]
    : null; // null = použij plné primary/secondary rozdělení níže

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Sklad</title>
  ${baseStyles()}
  <style>
    /* ── SKLAD OPENER ── */
    .sklad-opener{
      padding:2.6rem 0 2rem;margin-bottom:0;
      border-bottom:1px solid var(--border-brass);
      display:flex;align-items:flex-end;justify-content:space-between;gap:2rem;
    }
    .sklad-opener-tag{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.32em;text-transform:uppercase;color:var(--brass);margin-bottom:1rem;font-weight:500}
    .sklad-opener h1{font-family:var(--font-display);font-weight:700;font-style:italic;font-size:clamp(2rem,4.5vw,3rem);color:var(--ivory);line-height:1}
    .sklad-opener p{font-family:var(--font-body);color:var(--ivory-faint);margin-top:0.6rem;font-size:0.9rem;max-width:480px;font-weight:300}

    .sklad-clock{font-family:var(--font-mono);font-size:1.1rem;color:var(--ivory-dim);letter-spacing:0.08em}
    .sklad-clock-date{font-family:var(--font-label);font-size:0.52rem;color:var(--ivory-faint);letter-spacing:0.12em;text-transform:uppercase;margin-top:0.3rem}

    /* ── TALLY STRIP ── */
    .tally-strip{
      display:grid;grid-template-columns:repeat(6,1fr);
      gap:1px;background:var(--border-brass);
      margin:2rem 0 2.4rem;
    }
    .tally-cell{
      background:var(--panel2);padding:1.3rem 1.1rem;text-align:center;
      transition:background 0.2s;border-top:2px solid transparent;
    }
    .tally-cell:hover{background:var(--panel3);border-top-color:var(--brass)}
    .tally-cell-label{font-family:var(--font-label);font-size:0.52rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--brass);margin-bottom:0.5rem}
    .tally-cell-val{font-family:var(--font-display);font-weight:700;font-style:italic;font-size:1.35rem;color:var(--ivory);line-height:1}

    /* ══════════════════════════════════════════════
       TAB LAYOUT
       ══════════════════════════════════════════════ */
    .sklad-shell{display:grid;grid-template-columns:230px 1fr;gap:1.6rem;align-items:start}

    .sklad-sidebar{
      background:var(--panel2);border:1px solid var(--border-brass);
      position:sticky;top:calc(var(--nav-h) + 1.5rem);
      overflow:hidden;
    }
    .sklad-sidebar-item{
      display:flex;align-items:center;gap:0.85rem;
      padding:1rem 1.2rem;cursor:pointer;
      border-bottom:1px solid var(--border);
      border-left:3px solid transparent;
      transition:background 0.15s,border-color 0.15s;
      position:relative;
    }
    .sklad-sidebar-item:last-child{border-bottom:none}
    .sklad-sidebar-item:hover{background:var(--brass-faint)}
    .sklad-sidebar-item.active{background:var(--oxblood-faint);border-left-color:var(--oxblood)}
    .sklad-sidebar-icon{
      font-family:var(--font-label);font-size:0.95rem;color:var(--brass);
      width:26px;height:26px;flex-shrink:0;border:1px solid var(--border-brass);
      display:flex;align-items:center;justify-content:center;
      transition:border-color 0.15s,color 0.15s;
    }
    .sklad-sidebar-item.active .sklad-sidebar-icon{border-color:var(--oxblood);color:var(--oxblood-bright)}
    .sklad-sidebar-text{flex:1;min-width:0}
    .sklad-sidebar-label{font-family:var(--font-display);font-weight:600;font-style:italic;font-size:0.92rem;color:var(--ivory);line-height:1.2}
    .sklad-sidebar-item.active .sklad-sidebar-label{color:var(--brass-bright)}
    .sklad-sidebar-sub{font-family:var(--font-mono);font-size:0.6rem;color:var(--ivory-faint);margin-top:0.15rem;letter-spacing:0.03em}

    .sklad-sidebar-more-toggle{
      display:flex;align-items:center;justify-content:space-between;gap:0.5rem;
      padding:0.75rem 1.2rem;cursor:pointer;background:var(--panel3);
      font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.14em;text-transform:uppercase;
      color:var(--ivory-faint);transition:color 0.15s,background 0.15s;
    }
    .sklad-sidebar-more-toggle:hover{color:var(--brass-bright);background:var(--brass-faint)}
    .sklad-sidebar-more-toggle .more-arrow{transition:transform 0.2s;font-size:0.7rem}
    .sklad-sidebar-more-toggle.open .more-arrow{transform:rotate(180deg)}
    .sklad-sidebar-secondary{display:none}
    .sklad-sidebar-secondary.open{display:block}

    .sklad-panel{display:none;animation:fadeReveal 0.3s ease-out 1}
    .sklad-panel.active{display:block}

    .panel-card{
      background:var(--panel2);border:1px solid var(--border-brass);
      padding:2rem 2.2rem;box-shadow:var(--shadow-card);position:relative;
      transition:box-shadow 0.2s;
    }
    .panel-card::before{content:'';position:absolute;top:0;left:0;width:18px;height:18px;border-top:1px solid var(--brass-dim);border-left:1px solid var(--brass-dim)}
    .panel-card::after{content:'';position:absolute;bottom:0;right:0;width:18px;height:18px;border-bottom:1px solid var(--brass-dim);border-right:1px solid var(--brass-dim)}
    .panel-head{
      display:flex;align-items:baseline;justify-content:space-between;gap:1rem;
      margin-bottom:1.4rem;padding-bottom:1.1rem;border-bottom:1px solid var(--border-brass);
    }
    .panel-title{font-family:var(--font-display);font-weight:700;font-style:italic;font-size:1.5rem;color:var(--ivory)}
    .panel-badge{font-family:var(--font-mono);font-size:0.62rem;color:var(--ivory-faint);letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap}

    .panel-split{display:grid;grid-template-columns:1fr 1.15fr;gap:2.2rem;align-items:start}
    @media(max-width:1180px){.panel-split{grid-template-columns:1fr}}

    .panel-list-label{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--brass);margin-bottom:0.9rem}

    /* ── OBLÍBENÉ POLOŽKY (rychlé vyplnění formuláře) ── */
    .fav-chips{display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.9rem}
    .fav-chip{
      font-family:var(--font-mono);font-size:0.68rem;padding:0.3rem 0.65rem;
      background:var(--brass-faint);border:1px solid var(--border-brass);color:var(--ivory-dim);
      cursor:pointer;transition:all 0.15s;
    }
    .fav-chip:hover{border-color:var(--brass);color:var(--brass-bright);background:var(--brass-dim)}

    /* ── VÝROBA — stat strip ── */
    .vyroba-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border-brass);margin-bottom:2rem}
    .vyroba-stat{background:var(--panel3);padding:1.3rem 1.2rem;text-align:center;border-top:2px solid transparent;transition:background 0.2s}
    .vyroba-stat:hover{background:var(--panel4)}
    .vyroba-stat-label{font-family:var(--font-label);font-size:0.52rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--brass);margin-bottom:0.55rem}
    .vyroba-stat-val{font-family:var(--font-display);font-weight:700;font-style:italic;font-size:1.5rem;color:var(--ivory);line-height:1}
    .vyroba-stat-sub{font-family:var(--font-mono);font-size:0.58rem;color:var(--ivory-faint);margin-top:0.4rem}

    /* ── VÝROBA — časová osa postupu vaření ── */
    .vyroba-timeline{position:relative;padding-left:2.2rem;margin-bottom:0.4rem}
    .vyroba-timeline::before{
      content:'';position:absolute;left:0.6rem;top:6px;bottom:6px;width:1px;
      background:linear-gradient(180deg,var(--oxblood) 0%,var(--border-brass) 85%,transparent);
    }
    .vyroba-step-card{
      position:relative;
      padding:1rem 1.3rem;margin-bottom:0.75rem;
      background:var(--panel3);border:1px solid var(--border);
      transition:border-color 0.2s,transform 0.2s,background 0.2s;
    }
    .vyroba-step-card:last-child{margin-bottom:0}
    .vyroba-step-card:hover{border-color:var(--border-brass);background:var(--panel4);transform:translateX(3px)}
    .vyroba-step-card::before{
      content:'';position:absolute;left:-1.72rem;top:1.35rem;
      width:8px;height:8px;background:var(--oxblood);border:1px solid var(--brass);
      transform:rotate(45deg);
    }
    .vyroba-step-card.final{border-color:var(--border-oxblood);background:radial-gradient(ellipse 90% 100% at 0% 0%, rgba(220,20,60,0.14) 0%, var(--panel3) 65%)}
    .vyroba-step-card.final::before{width:12px;height:12px;left:-1.83rem;top:1.3rem;background:var(--oxblood-bright);border:2px solid var(--brass);box-shadow:0 0 10px var(--oxblood-glow)}
    .vyroba-step-meta{font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--brass);margin-bottom:0.4rem}
    .vyroba-step-label{font-family:var(--font-display);font-weight:600;font-style:italic;font-size:1.02rem;color:var(--ivory);margin-bottom:0.6rem}
    .vyroba-step-flow{display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap}
    .vyroba-chip{
      display:inline-flex;align-items:center;
      font-family:var(--font-mono);font-size:0.74rem;color:var(--ivory-dim);
      padding:0.3rem 0.7rem;background:var(--panel4);border:1px solid var(--border);
      white-space:nowrap;
    }
    .vyroba-chip.raw{color:var(--ivory);border-color:var(--border-brass);background:var(--brass-faint)}
    .vyroba-chip.final{color:var(--ivory);border-color:var(--border-oxblood);background:var(--oxblood-faint);font-weight:700}
    .vyroba-plus{color:var(--ivory-faint);font-size:0.72rem}
    .vyroba-arrow{color:var(--brass);font-size:0.9rem;margin:0 0.1rem}

    @media(max-width:900px){.vyroba-stats{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:640px){
      .vyroba-timeline{padding-left:1.7rem}
      .vyroba-step-card::before,.vyroba-step-card.final::before{left:-1.25rem}
    }

    /* ── VÝROBA — záložky receptů (Metamfetamin / Benzodiazepin / Joy) ── */
    .recept-tabs{display:flex;gap:0.5rem;margin-bottom:1.4rem;flex-wrap:wrap}
    .recept-tab{
      font-family:var(--font-label);font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;
      padding:0.6rem 1.1rem;background:var(--panel3);border:1px solid var(--border);color:var(--ivory-dim);
      cursor:pointer;transition:all 0.2s;
    }
    .recept-tab:hover{border-color:var(--border-brass);color:var(--ivory)}
    .recept-tab.active{border-color:var(--border-oxblood);background:var(--oxblood-faint);color:var(--ivory);font-weight:700}
    .vyroba-recept-content{display:none}
    .vyroba-recept-content.active{display:block}
    .vyroba-recept-list{display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1.4rem}

    /* ── SMĚNÁRNA ── */
    .smena-rate-box{
      display:flex;align-items:center;justify-content:center;gap:1.2rem;
      padding:1.6rem;margin-bottom:1.6rem;
      background:var(--brass-faint);border:1px solid var(--border-brass);
    }
    .smena-side{text-align:center;flex:1}
    .smena-side-label{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--ivory-faint);margin-bottom:0.4rem}
    .smena-side-val{font-family:var(--font-display);font-weight:700;font-style:italic;font-size:1.5rem;color:var(--ivory)}
    .smena-arrow-btn{
      width:42px;height:42px;border-radius:50%;flex-shrink:0;
      background:var(--panel3);border:1px solid var(--border-brass);
      color:var(--brass);font-size:1.1rem;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      transition:transform 0.25s,border-color 0.2s,color 0.2s;
    }
    .smena-arrow-btn:hover{border-color:var(--oxblood);color:var(--oxblood-bright)}
    .smena-arrow-btn.flipped{transform:rotate(180deg)}
    .smena-rate-note{text-align:center;font-family:var(--font-mono);font-size:0.66rem;color:var(--ivory-faint);margin-bottom:1.4rem;letter-spacing:0.04em}
    .smena-rate-note strong{color:var(--brass)}
    .smena-preview{
      display:flex;justify-content:space-between;align-items:center;
      padding:1rem 1.2rem;margin-top:1rem;
      background:var(--panel3);border:1px solid var(--border);
      font-family:var(--font-mono);font-size:0.84rem;
    }
    .smena-preview .arrow{color:var(--brass);opacity:0.7}

    /* ── CENÍK ── */
    .cenik-row{display:grid;grid-template-columns:1fr 140px 30px;gap:0.6rem;align-items:center;padding:0.4rem 0;border-bottom:1px solid var(--border)}
    .cenik-row-static{display:flex;justify-content:space-between;padding:0.5rem 0.2rem}
    .cenik-row-static .cenik-cena{color:var(--brass-bright);font-family:var(--font-mono)}
    .cenik-label-input,.cenik-cena-input{
      background:var(--input-bg);border:1px solid var(--border);color:var(--ivory);
      font-family:var(--font-mono);font-size:0.8rem;padding:0.4rem 0.6rem;width:100%;
    }
    .cenik-label-input:focus,.cenik-cena-input:focus{outline:none;border-color:var(--brass)}
    .cenik-row-del{background:transparent;border:1px solid var(--border-oxblood);color:var(--oxblood-bright);width:28px;height:28px;cursor:pointer;font-size:0.75rem}
    .cenik-row-del:hover{background:var(--oxblood-faint,rgba(220,20,60,0.15))}

    /* ── UNDO BAR ── */
    #undoBar{
      position:fixed;bottom:1.5rem;left:1.5rem;z-index:998;
      background:var(--panel3);border:1px solid var(--border-brass);
      padding:0.8rem 1.1rem;display:none;align-items:center;gap:1rem;
      font-family:var(--font-mono);font-size:0.78rem;color:var(--ivory-dim);
      box-shadow:var(--shadow);max-width:min(90vw,420px);
    }

    @media(max-width:980px){
      .sklad-shell{grid-template-columns:1fr}
      .sklad-sidebar{
        position:static;display:block;
      }
      .sklad-sidebar-item{padding:0.9rem 1rem}
      .tally-strip{grid-template-columns:repeat(3,1fr)}
      .sklad-opener{flex-direction:column;align-items:flex-start;gap:0.8rem}
      .panel-card{padding:1.5rem 1.3rem}
    }
    @media(max-width:600px){.tally-strip{grid-template-columns:repeat(2,1fr)}}
  </style>
  </head><body>
  ${renderNav(req, 'sklad')}
  <main>

    <div class="sklad-opener">
      <div>
        <div class="sklad-opener-tag">Centrální sklad organizace</div>
        <h1>Vítej, ${icName}</h1>
        <p>${memberOnly ? 'Zde najdeš svůj týdenní Reserve Fund a aktuální ceník organizace.' : 'Eviduj pohyb zbraní, weedu, drog, chemikálií, financí a směn. Každý zápis se ihned promítne do tabulky a odešle na Discord.'}</p>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="sklad-clock" id="live-clock">--:--:--</div>
        <div class="sklad-clock-date" id="live-date"></div>
      </div>
    </div>

    ${!memberOnly ? `
    <!-- Tally strip -->
    <div class="tally-strip" id="tallyStrip">
      <div class="tally-cell">
        <div class="tally-cell-label">Zůstatek SAD</div>
        <div class="tally-cell-val" style="color:var(--brass-bright)" id="tally-usd">$${ucet.usd.toLocaleString('cs-CZ')}</div>
      </div>
      <div class="tally-cell">
        <div class="tally-cell-label">Pesos</div>
        <div class="tally-cell-val" id="tally-pesos">₱${ucet.pesos.toLocaleString('cs-CZ')}</div>
      </div>
      <div class="tally-cell">
        <div class="tally-cell-label">Weed</div>
        <div class="tally-cell-val" id="tally-weed" style="color:#8AAE5E">${totalWeedSacky} sáčků</div>
      </div>
      <div class="tally-cell">
        <div class="tally-cell-label">Drogy</div>
        <div class="tally-cell-val" id="tally-drogy" style="color:var(--oxblood-bright)">${totalDrogySacky} sáčků</div>
      </div>
      <div class="tally-cell">
        <div class="tally-cell-label">Chemikálie</div>
        <div class="tally-cell-val" id="tally-chemky" style="color:#6FA8C9">${Object.values(chemky||{}).filter(q=>q>0).reduce((a,b)=>a+b,0)} ks</div>
      </div>
      <div class="tally-cell">
        <div class="tally-cell-label">Hodnota weedu</div>
        <div class="tally-cell-val" id="tally-weed-value" style="color:var(--brass)">$${totalValue.toLocaleString('cs-CZ')}</div>
      </div>
    </div>

    <div style="font-family:var(--font-mono);font-size:0.72rem;color:var(--ivory-dim);margin:-1.4rem 0 2rem;padding:0.8rem 1.1rem;border:1px solid var(--border-brass);background:var(--brass-faint)">
      <strong style="color:var(--brass-bright)">Jednotky skladu:</strong> Weed a drogy se do skladu zapisují přímo v <strong>sáčcích</strong> — ceny (výroba/prodej) jsou stanovené za 1 sáček.
      &ensp;·&ensp; Weed: <strong style="color:#8AAE5E" id="unit-summary-weed">${totalWeedSacky} sáčků</strong>
      &ensp;·&ensp; Drogy: <strong style="color:var(--oxblood-bright)" id="unit-summary-drogy">${totalDrogySacky} sáčků</strong>
    </div>
    ` : ''}

    <!-- ── TAB SHELL ── -->
    <div class="sklad-shell">

      <!-- Sidebar -->
      <div class="sklad-sidebar" id="skladSidebar">
        ${sekceMeta ? sekceMeta.map((s, i) => `
          <div class="sklad-sidebar-item${i===0?' active':''}" data-panel="${s.id}" onclick="skladTab('${s.id}')">
            <div class="sklad-sidebar-icon">${s.icon}</div>
            <div class="sklad-sidebar-text">
              <div class="sklad-sidebar-label">${s.label}</div>
              <div class="sklad-sidebar-sub">${s.sub}</div>
            </div>
          </div>`).join('') : `
        ${sekceMetaPrimary.map((s, i) => `
          <div class="sklad-sidebar-item${i===0?' active':''}" data-panel="${s.id}" onclick="skladTab('${s.id}')">
            <div class="sklad-sidebar-icon">${s.icon}</div>
            <div class="sklad-sidebar-text">
              <div class="sklad-sidebar-label">${s.label}</div>
              <div class="sklad-sidebar-sub">${s.sub}</div>
            </div>
          </div>`).join('')}
        <div class="sklad-sidebar-more-toggle" id="skladMoreToggle" onclick="skladToggleMore()">
          <span>Více — Zbraně, Výroba, Směnárna, Ceník, Nevyřízené</span>
          <span class="more-arrow">▾</span>
        </div>
        <div class="sklad-sidebar-secondary" id="skladSecondary">
          ${sekceMetaSecondary.map((s) => `
          <div class="sklad-sidebar-item" data-panel="${s.id}" onclick="skladTab('${s.id}')">
            <div class="sklad-sidebar-icon">${s.icon}</div>
            <div class="sklad-sidebar-text">
              <div class="sklad-sidebar-label">${s.label}</div>
              <div class="sklad-sidebar-sub">${s.sub}</div>
            </div>
          </div>`).join('')}
        </div>
        `}
      </div>

      <!-- Panely -->
      <div>

        <!-- Účetnictví -->
        <div class="sklad-panel active" id="panel-ucet">
          <div class="panel-card">
            ${!memberOnly ? `
            <div class="panel-head">
              <span class="panel-title">Účetnictví organizace</span>
              <span class="panel-badge">Finance · vede rejstřík</span>
            </div>
            <div class="panel-split">
              <div>
                <div class="panel-list-label">Poslední pohyby</div>
                <div id="ucet-recent-list">${formatUcet(recentUcet)}</div>
              </div>
              <div>
                <div class="typ-toggle">
                  <button class="typ-btn active-vklad" onclick="setTyp('ucet','PŘÍJEM',this)">Příjem</button>
                  <button class="typ-btn" onclick="setTyp('ucet','VÝDAJ',this)">Výdaj</button>
                </div>
                <input type="hidden" id="ucet-typ" value="PŘÍJEM">
                <div class="form-row">
                  <div class="form-group"><label>Částka</label><input type="number" id="ucet-castka" min="1" placeholder="1000"></div>
                  <div class="form-group"><label>Valuta</label><select id="ucet-valuta"><option value="USD">SAD</option><option value="PESOS">Pesos</option></select></div>
                </div>
                <div class="form-group" style="margin-bottom:0.5rem"><label>Poznámka</label><input type="text" id="ucet-poznamka" placeholder="Prodej zboží, plat…"></div>
                <button class="btn-submit" onclick="submitUcet()">Potvrdit transakci</button>
              </div>
            </div>

            <div class="folio-rule tight"></div>
            ` : ''}

            <div class="panel-head" style="margin-bottom:1rem;padding-bottom:0.8rem">
              <span class="panel-title" style="font-size:${memberOnly ? '1.5' : '1.15'}rem">Reserve Fund</span>
              <span class="panel-badge" id="rf-badge">Povinný týdenní odvod · splatnost neděle</span>
            </div>
            <p style="font-family:var(--font-body);font-size:0.84rem;color:var(--ivory-dim);line-height:1.7;margin-bottom:1.2rem;max-width:640px">
              Každý člen musí do konce <strong style="color:var(--brass-bright)">neděle</strong> zaplatit a podepsat fixní odvod <strong style="color:var(--brass-bright)" id="rf-amount-text">$…</strong> do Reserve Fondu organizace. Kdo do pondělí nezaplatí, jde automaticky do upozornění v aplikaci.
            </p>
            <div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--ivory-faint);margin-bottom:1.2rem;padding:0.7rem 0.9rem;border:1px solid var(--border-brass);background:var(--brass-faint)">
              <strong style="color:var(--brass)">Samostatný účet.</strong> Reserve Fund se eviduje na vlastním bankovním účtu organizace, odděleně od hlavního účetnictví výše — tyto peníze se do zůstatku SAD nahoře nezapočítávají.
              &ensp;Aktuální zůstatek Reserve Fondu: <strong id="rf-account-balance" style="color:var(--brass-bright)">…</strong>
            </div>
            ${canManage ? `
            <div style="display:flex;gap:0.5rem;align-items:flex-end;margin-bottom:1.2rem;max-width:340px">
              <div class="form-group" style="margin-bottom:0;flex:1"><label>Výše odvodu (SAD)</label><input type="number" id="rf-amount-input" min="1" max="100000"></div>
              <button class="btn-submit" style="margin-top:0;width:auto;padding:0.75rem 1.1rem" onclick="saveReserveFundAmount()">Uložit</button>
            </div>` : ''}
            <div id="rf-status" style="margin-bottom:1rem"></div>
            <div id="rf-list"></div>
          </div>
        </div>

        <!-- Směnárna -->
        <div class="sklad-panel" id="panel-smena">
          <div class="panel-card">
            <div class="panel-head">
              <span class="panel-title">Směnárna</span>
              <span class="panel-badge">Kurz 1:1 · účet organizace</span>
            </div>
            <p style="font-family:var(--font-body);font-size:0.86rem;color:var(--ivory-dim);line-height:1.8;margin-bottom:1.6rem;max-width:560px">
              Převod mezi účtem SAD a Pesos uvnitř organizace. Směna je v kurzu <strong style="color:var(--brass-bright)">1:1</strong> — na jednom účtu se částka odečte, na druhém přičte. Zapisuje se jako výdaj + příjem do hlavního účetnictví.
            </p>

            <div class="smena-rate-box">
              <div class="smena-side">
                <div class="smena-side-label" id="smena-from-label">Z účtu — SAD</div>
                <div class="smena-side-val" id="smena-from-val">$${ucet.usd.toLocaleString('cs-CZ')}</div>
              </div>
              <button class="smena-arrow-btn" id="smenaFlipBtn" onclick="flipSmena()" title="Otočit směr">⇄</button>
              <div class="smena-side">
                <div class="smena-side-label" id="smena-to-label">Na účet — Pesos</div>
                <div class="smena-side-val" id="smena-to-val">₱${ucet.pesos.toLocaleString('cs-CZ')}</div>
              </div>
            </div>
            <div class="smena-rate-note">Aktuální kurz: <strong>1:1</strong> &ensp;·&ensp; částka se nijak neupravuje, jen mění měnu</div>

            <div class="form-group" style="margin-bottom:0.4rem">
              <label id="smena-amount-label">Částka k směně (SAD)</label>
              <input type="number" id="smena-castka" min="1" placeholder="1000" oninput="updateSmenaPreview()">
            </div>
            <div class="smena-preview" id="smena-preview-box">
              <span id="smena-preview-from">$0</span>
              <span class="arrow">→</span>
              <span id="smena-preview-to">₱0</span>
            </div>
            <button class="btn-submit" onclick="submitSmena()" style="margin-top:1.2rem">Provést směnu</button>
          </div>
        </div>

        <!-- Zbraně -->
        <div class="sklad-panel" id="panel-zbrane">
          <div class="panel-card">
            <div class="panel-head"><span class="panel-title">Zbraně &amp; Střelivo</span><span class="panel-badge">Sklad</span>${canManage ? `<button class="quick-btn" onclick="openKatalogModal('zbrane')" style="margin-left:auto">+ Spravovat položky</button>` : ''}<button class="quick-btn" onclick="openBulkModal('zbrane')" style="${canManage ? '' : 'margin-left:auto'}">+ Hromadný zápis</button></div>
            <div class="panel-split">
              <div>
                <div class="panel-list-label">Stav skladu</div>
                <div id="stock-list-zbrane">${formatSklad(zbrane, null)}</div>
              </div>
              <div>
                <div class="fav-chips" id="zbrane-chips"></div>
                <div class="typ-toggle">
                  <button class="typ-btn active-vklad" onclick="setTyp('zbrane','VKLAD',this)">Uložit</button>
                  <button class="typ-btn" onclick="setTyp('zbrane','VÝBĚR',this)">Vybrat</button>
                </div>
                <input type="hidden" id="zbrane-typ" value="VKLAD">
                <div class="form-row">
                  <div class="form-group select-wrap"><label>Kategorie</label><select id="zbrane-kat" class="select-expandable" onchange="updateZbraneItems()"><option value="Zbraň">Zbraně</option><option value="Střelivo">Střelivo</option><option value="Akce">Akce</option></select><span class="select-count-badge">3</span></div>
                  <div class="form-group select-wrap"><label>Položka</label><select id="zbrane-polozka" class="select-expandable"></select><span class="select-count-badge" id="zbrane-polozka-count">9</span></div>
                </div>
                <div class="form-row">
                  <div class="form-group"><label>Množství (max 500)</label><input type="number" id="zbrane-mnozstvi" min="1" max="500" value="1"></div>
                  <div class="form-group" id="zbrane-ucel-wrap" style="display:none"><label>Účel výběru</label><input type="text" id="zbrane-ucel" placeholder="Mise, ochrana…"></div>
                </div>
                <button class="btn-submit" onclick="submitZbrane()">Potvrdit akci</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Weed -->
        <div class="sklad-panel" id="panel-weed">
          <div class="panel-card">
            <div class="panel-head"><span class="panel-title">Weed</span><span class="panel-badge">Sklad</span>${canManage ? `<button class="quick-btn" onclick="openKatalogModal('weed')" style="margin-left:auto">+ Spravovat položky</button>` : ''}<button class="quick-btn" onclick="openBulkModal('weed')" style="${canManage ? '' : 'margin-left:auto'}">+ Hromadný zápis</button></div>
            <div class="panel-split">
              <div>
                <div class="panel-list-label">Stav skladu</div>
                <div id="stock-list-weed">${formatSklad(weed, {"Žlutý kanabis":{prodej:150},"Zelený kanabis":{prodej:150},"Kanabis":{prodej:150},"Červený kanabis":{prodej:150},"Modrý kanabis":{prodej:150}}, true)}</div>
              </div>
              <div>
                <div class="fav-chips" id="weed-chips"></div>
                <div class="typ-toggle">
                  <button class="typ-btn active-vklad" onclick="setTyp('weed','VKLAD',this)">Uložit</button>
                  <button class="typ-btn" onclick="setTyp('weed','VÝBĚR',this)">Vybrat</button>
                </div>
                <input type="hidden" id="weed-typ" value="VKLAD">
                <div class="form-row">
                  <div class="form-group select-wrap"><label>Odrůda</label><select id="weed-odruda" class="select-expandable"><option>Žlutý kanabis</option><option>Zelený kanabis</option><option>Kanabis</option><option>Červený kanabis</option><option>Modrý kanabis</option></select><span class="select-count-badge">5</span></div>
                  <div class="form-group"><label>Množství (max 500 sáčků)</label><input type="number" id="weed-mnozstvi" min="1" max="500" value="1"></div>
                </div>
                <div class="info-box" id="weed-info"></div>
                <button class="btn-submit" onclick="submitWeed()">Potvrdit akci</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Výroba -->
        <div class="sklad-panel" id="panel-vyroba">
          <div class="panel-card">
            <div class="recept-tabs">
              <button class="recept-tab active" id="recept-tab-meth" onclick="switchVyrobaRecept('meth')">Metamfetamin</button>
              <button class="recept-tab" id="recept-tab-benzo" onclick="switchVyrobaRecept('benzo')">Benzodiazepin</button>
              <button class="recept-tab" id="recept-tab-joy" onclick="switchVyrobaRecept('joy')">Joy</button>
            </div>

            <div class="vyroba-recept-content active" id="vyroba-recept-meth">
            <div class="panel-head">
              <span class="panel-title">Výroba — Metamfetamin</span>
              <span class="panel-badge">Recept 1 vaření</span>
            </div>
            <p style="font-family:var(--font-body);font-size:0.86rem;color:var(--ivory-dim);line-height:1.8;max-width:720px;margin-bottom:1.4rem">
              Postup vaření v šesti krocích. Kalkulačka dole počítá přímo z aktuálního stavu skladu chemikálií — kolik várek lze uvařit hned teď a co případně chybí nakoupit. Po potvrzení výroby se suroviny <strong style="color:var(--brass-bright)">rovnou odečtou ze skladu chemikálií</strong> a hotový Metamfetamin se <strong style="color:var(--brass-bright)">rovnou přičte do skladu drog</strong> — žádný ruční přepis.
            </p>

            <!-- Stat strip -->
            <div class="vyroba-stats">
              <div class="vyroba-stat">
                <div class="vyroba-stat-label">Várka</div>
                <div class="vyroba-stat-val">5 dávek</div>
              </div>
              <div class="vyroba-stat" style="border-top-color:var(--brass)">
                <div class="vyroba-stat-label">Výtěžnost (dle receptu)</div>
                <div class="vyroba-stat-val" style="color:var(--brass)">150×</div>
                <div class="vyroba-stat-sub">metamfetamin / várka — reálný výtěžek se zapisuje ručně</div>
              </div>
              <div class="vyroba-stat" id="vyroba-stat-cost" style="border-top-color:var(--oxblood-bright)">
                <div class="vyroba-stat-label">Náklad / várka</div>
                <div class="vyroba-stat-val" style="color:var(--oxblood-bright);font-size:1.15rem">—</div>
              </div>
              <div class="vyroba-stat" id="vyroba-stat-max" style="border-top-color:#7BD69B">
                <div class="vyroba-stat-label">Uvaříš hned teď</div>
                <div class="vyroba-stat-val" style="color:#7BD69B">—</div>
                <div class="vyroba-stat-sub">várek dle skladu</div>
              </div>
            </div>

            <div class="folio-label" style="margin-bottom:1.1rem">Postup vaření</div>
            <div class="vyroba-timeline" id="vyroba-steps"></div>

            <div class="folio-rule"></div>

            <div class="panel-split">
              <div>
                <div class="panel-list-label">Suroviny vs. aktuální sklad</div>
                <div class="table-wrap">
                  <table>
                    <thead><tr><th>Surovina</th><th style="text-align:right">Cena/ks</th><th style="text-align:right">Potřeba</th><th style="text-align:right">Na skladě</th><th>Zásoba</th><th>Stav</th></tr></thead>
                    <tbody id="vyroba-materials-body"></tbody>
                  </table>
                </div>
              </div>
              <div>
                <div class="panel-list-label">Kalkulačka vaření</div>
                <div class="form-group" style="margin-bottom:1rem">
                  <label>Kolik várek chceš uvařit?</label>
                  <input type="number" id="vyroba-batches" min="1" value="1">
                </div>
                <div class="form-group" style="margin-bottom:1rem">
                  <label>Skutečně vyrobené množství (ks)</label>
                  <input type="number" id="vyroba-qty" min="1" placeholder="např. 150">
                  <div style="font-family:var(--font-mono);font-size:0.62rem;color:var(--ivory-faint);margin-top:0.3rem">
                    Přednastaveno dle receptu (várky × 150) — přepiš skutečným počtem sáčků, které z vaření reálně vzniklo.
                  </div>
                </div>
                <div id="vyroba-yield-box" style="margin-bottom:1rem"></div>
                <div class="info-box" id="vyroba-status-box" style="display:block;margin-top:0"></div>
                <button class="btn-submit" id="vyrobaConfirmBtn" onclick="submitVyroba()" style="margin-top:1rem">Potvrdit výrobu a odečíst suroviny</button>
              </div>
            </div>
            </div>

            <div class="vyroba-recept-content" id="vyroba-recept-benzo">
              <div class="panel-head">
                <span class="panel-title">Výroba — Benzodiazepin</span>
                <span class="panel-badge">Recept — zatím bez skladu</span>
              </div>
              <p style="font-family:var(--font-body);font-size:0.86rem;color:var(--ivory-dim);line-height:1.8;max-width:720px;margin-bottom:1.4rem">
                Recept zatím <strong style="color:var(--brass-bright)">není propojený se skladem</strong> — je tu jen jako přehled surovin na jednu várku. Kalkulačka, automatický odečet ze skladu a přičtení hotového produktu se doplní později.
              </p>
              <div class="folio-label" style="margin-bottom:1rem">Suroviny na 1 várku</div>
              <div class="vyroba-recept-list">
                <span class="vyroba-chip raw">50× Léky na bolest</span>
                <span class="vyroba-chip raw">10× Pekáč</span>
              </div>
            </div>

            <div class="vyroba-recept-content" id="vyroba-recept-joy">
              <div class="panel-head">
                <span class="panel-title">Výroba — Joy</span>
                <span class="panel-badge">Recept — zatím bez skladu</span>
              </div>
              <p style="font-family:var(--font-body);font-size:0.86rem;color:var(--ivory-dim);line-height:1.8;max-width:720px;margin-bottom:1.4rem">
                Recept zatím <strong style="color:var(--brass-bright)">není propojený se skladem</strong> — je tu jen jako přehled surovin na jednu várku. Suroviny se berou ze tří různých skladů (Drogy, Weed, Chemikálie), takže propojení kalkulačky a automatického odečtu přijde později až jako samostatný krok.
              </p>
              <div class="folio-label" style="margin-bottom:1rem">Suroviny na 1 várku</div>
              <div class="vyroba-recept-list">
                <span class="vyroba-chip raw">40× Metamfetamin</span>
                <span class="vyroba-chip raw">15× Kokain</span>
                <span class="vyroba-chip raw">30× Kapky</span>
                <span class="vyroba-chip raw">50× Extáze</span>
                <span class="vyroba-chip raw">100× Kanabis</span>
                <span class="vyroba-chip raw">30× Cukr</span>
                <span class="vyroba-chip raw">5× Pekáč</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Drogy -->
        <div class="sklad-panel" id="panel-drogy">
          <div class="panel-card">
            <div class="panel-head"><span class="panel-title">Drogy</span><span class="panel-badge">Sklad</span>${canManage ? `<button class="quick-btn" onclick="openKatalogModal('drogy')" style="margin-left:auto">+ Spravovat položky</button>` : ''}<button class="quick-btn" onclick="openBulkModal('drogy')" style="${canManage ? '' : 'margin-left:auto'}">+ Hromadný zápis</button></div>
            <div class="panel-split">
              <div>
                <div class="panel-list-label">Stav skladu</div>
                <div id="stock-list-drogy">${formatSklad(drogy, null, true)}</div>
              </div>
              <div>
                <div class="fav-chips" id="drogy-chips"></div>
                <div class="typ-toggle">
                  <button class="typ-btn active-vklad" onclick="setTyp('drogy','VKLAD',this)">Uložit</button>
                  <button class="typ-btn" onclick="setTyp('drogy','VÝBĚR',this)">Vybrat</button>
                </div>
                <input type="hidden" id="drogy-typ" value="VKLAD">
                <div class="form-row">
                  <div class="form-group select-wrap"><label>Droga</label><select id="drogy-droga" class="select-expandable"><option>Kapky</option><option>Kokain</option><option>Extáze</option><option>Metamfetamin</option><option>Benzo</option><option>Joyka</option><option>Heroin</option><option>Speed</option><option>LSD</option></select><span class="select-count-badge">9</span></div>
                  <div class="form-group"><label>Množství (max 500 sáčků)</label><input type="number" id="drogy-mnozstvi" min="1" max="500" value="1"></div>
                </div>
                <button class="btn-submit" onclick="submitDrogy()">Potvrdit akci</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Chemky -->
        <div class="sklad-panel" id="panel-chemky">
          <div class="panel-card">
            <div class="panel-head"><span class="panel-title">Chemikálie</span><span class="panel-badge">Sklad</span>${canManage ? `<button class="quick-btn" onclick="openKatalogModal('chemky')" style="margin-left:auto">+ Spravovat položky</button>` : ''}<button class="quick-btn" onclick="openBulkModal('chemky')" style="${canManage ? '' : 'margin-left:auto'}">+ Hromadný zápis</button></div>
            <div class="panel-split">
              <div>
                <div class="panel-list-label">Stav skladu</div>
                <div id="stock-list-chemky">${formatSklad(chemky||{}, null)}</div>
              </div>
              <div>
                <div class="fav-chips" id="chemky-chips"></div>
                <div class="typ-toggle">
                  <button class="typ-btn active-vklad" onclick="setTyp('chemky','VKLAD',this)">Uložit</button>
                  <button class="typ-btn" onclick="setTyp('chemky','VÝBĚR',this)">Vybrat</button>
                </div>
                <input type="hidden" id="chemky-typ" value="VKLAD">
                <div class="form-row">
                  <div class="form-group select-wrap"><label>Chemikálie</label><select id="chemky-chemikalie" class="select-expandable"><option>Aceton</option><option>Peroxid vodíku</option><option>Potravinářský kofein</option><option>Propylenglykol</option><option>Toluen</option><option>Technický benzín</option><option>Bismut</option><option>Kyselina fosforečná</option><option>Kerosen</option><option>Pekáč</option><option>Genkadon</option><option>Amanita Genkia</option><option>Kapátka</option><option>Forma</option><option>Lithiová baterie</option><option>Semínko</option><option>Cukr</option><option>Nadrcené listy</option></select><span class="select-count-badge">18</span></div>
                  <div class="form-group"><label>Množství (max 500)</label><input type="number" id="chemky-mnozstvi" min="1" max="500" value="1"></div>
                </div>
                <div id="chemky-cena-wrap">
                  <div class="typ-toggle" style="margin-bottom:0.6rem">
                    <button class="typ-btn active-vklad" id="chemky-cena-vyrobni" onclick="setChemkyCenaZdroj('vyrobni')">Cena z varny</button>
                    <button class="typ-btn" id="chemky-cena-vlastni" onclick="setChemkyCenaZdroj('vlastni')">Vlastní cena</button>
                    <button class="typ-btn" id="chemky-cena-zadna" onclick="setChemkyCenaZdroj('zadna')">Bez záznamu</button>
                  </div>
                  <input type="hidden" id="chemky-cena-zdroj" value="vyrobni">
                  <div class="info-box" id="chemky-cena-preview" style="display:block"></div>
                  <div class="form-row" id="chemky-cena-vlastni-row" style="display:none;margin-top:0.6rem">
                    <div class="form-group"><label>Zaplaceno</label><input type="number" id="chemky-cena-vlastni-castka" min="0" placeholder="1000"></div>
                    <div class="form-group"><label>Měna</label><select id="chemky-cena-vlastni-mena"><option value="PESOS">Pesos</option><option value="USD">SAD</option></select></div>
                  </div>
                </div>
                <button class="btn-submit" onclick="submitChemky()">Potvrdit akci</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Ceník -->
        <div class="sklad-panel" id="panel-cenik">
          <div class="panel-card">
            <div class="panel-head">
              <span class="panel-title">Ceník</span>
              <span class="panel-badge">${canManage ? 'Editovatelné · Founder/Council' : 'Jen ke čtení'}</span>
              ${canManage ? `<button class="quick-btn" onclick="addCenikRow()" style="margin-left:auto">+ Přidat řádek</button>
              <button class="quick-btn primary" onclick="saveCenik()">Uložit ceník</button>` : ''}
            </div>
            <p style="font-family:var(--font-body);font-size:0.82rem;color:var(--ivory-faint);line-height:1.7;margin-bottom:0.6rem;max-width:640px">
              Referenční výkupní a prodejní ceny. ${canManage ? 'Uprav hodnoty přímo v tabulce a klikni na <strong style="color:var(--brass-bright)">Uložit ceník</strong>.' : 'Upravovat může jen Founder/Council.'}
            </p>
            <div style="font-family:var(--font-mono);font-size:0.66rem;color:var(--ivory-faint);margin-bottom:1.2rem">
              ${cenik.updatedAt ? `Naposledy upraveno ${new Date(cenik.updatedAt).toLocaleString('cs-CZ')}${cenik.updatedBy ? ' — ' + esc(cenik.updatedBy) : ''}` : 'Ceník zatím nebyl ručně upraven — zobrazují se výchozí hodnoty.'}
            </div>
            <div id="cenik-categories">
              ${(cenik.categories || []).map((cat, ci) => `
                <div class="cenik-cat" data-cat="${ci}">
                  <div class="panel-list-label" style="margin-top:${ci ? '1.6rem' : '0'}">${esc(cat.label)}</div>
                  <div class="cenik-rows" data-cat-rows="${ci}">
                    ${cat.rows.map((r, ri) => cenikRowHtml(r, ci, ri, canManage)).join('')}
                  </div>
                </div>`).join('')}
            </div>
          </div>
        </div>

        <!-- Nevyřízené -->
        <div class="sklad-panel" id="panel-nevyrizene">
          <div class="panel-card">
            <div class="panel-head">
              <span class="panel-title">Nevyřízené akce</span>
              <span class="panel-badge">Žlutý weed &amp; vklady do kufru od membérů</span>
            </div>
            <p style="font-family:var(--font-body);font-size:0.86rem;color:var(--ivory-dim);line-height:1.8;max-width:720px;margin-bottom:1.4rem">
              Sem se automaticky přidá záznam pokaždé, když si member vezme žlutý weed nebo nahlásí vklad do kufru auta. Jakmile je to s daným člověkem vyřešené (zaplatil / peníze byly reálně vyzvednuty), klikni na <strong style="color:var(--brass-bright)">Spárovat</strong> — záznam zůstane v historii, jen se označí jako vyřízený.
            </p>
            <div class="panel-list-label" style="margin-bottom:0.9rem">Nevyřízené (<span id="nevyrizene-count">—</span>)</div>
            <div id="nevyrizene-list"><div class="ledger-loading">Načítám…</div></div>

            <div class="folio-rule"></div>

            <div class="panel-list-label" style="margin-bottom:0.9rem">Naposledy vyřízené</div>
            <div id="vyrizene-list"></div>
          </div>
        </div>

      </div>
    </div>
  </main>

  <!-- MODAL: Spravovat položky katalogu -->
  <div class="modal-overlay" id="katalogModal">
    <div class="modal-box" style="max-width:440px">
      <div class="modal-title">Spravovat položky</div>
      <div class="modal-subtitle">Přidej novou položku do skladového katalogu (např. nový typ zbraně od dealera).</div>
      <div class="form-group" style="margin-bottom:0.85rem">
        <label>Kategorie</label>
        <select id="katalog-kategorie">
          <option value="zbrane">Zbraně</option>
          <option value="naboje">Střelivo</option>
          <option value="akce">Akce</option>
          <option value="weed">Weed (odrůda)</option>
          <option value="drogy">Drogy</option>
          <option value="chemky">Chemikálie</option>
        </select>
      </div>
      <div class="form-group" style="margin-bottom:1rem"><label>Název položky</label><input type="text" id="katalog-polozka" placeholder="Např. Heavy Sniper Mk2" maxlength="60"></div>
      <div style="display:flex;gap:0.6rem">
        <button class="btn-submit" onclick="submitKatalog()" style="flex:1">Přidat položku</button>
        <button class="btn-submit" onclick="closeKatalogModal()" style="flex:0 0 auto;background:transparent;border:1px solid var(--border-brass);color:var(--ivory-dim)">Zavřít</button>
      </div>
      <div class="folio-rule tight"></div>
      <div class="panel-list-label">Vlastní přidané položky</div>
      <div id="katalog-list" style="max-height:180px;overflow:auto"></div>
      <div class="folio-rule tight" id="prah-oddelovac" style="display:none"></div>
      <div id="prah-sekce" style="display:none">
        <div class="panel-list-label">Práh nízkých zásob (upozornění na Discordu)</div>
        <div style="display:flex;gap:0.6rem;align-items:flex-end">
          <div class="form-group" style="margin-bottom:0;flex:1"><label>Počet kusů</label><input type="number" id="prah-hodnota" min="0" placeholder="např. 10"></div>
          <button class="btn-submit" onclick="ulozPrah()" style="flex:0 0 auto">Uložit</button>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL -->
  <div class="modal-overlay" id="confirmModal">
    <div class="modal-box" id="modalBox">
      <div class="seal-stamp" id="sealStamp"><span>A</span></div>
      <div class="modal-title" id="modalTitle">Potvrdit akci</div>
      <div class="modal-subtitle" id="modalSubtitle">Opravdu chceš provést tuto operaci?</div>
      <dl class="modal-detail" id="modalDetail"></dl>
      <div class="modal-actions">
        <button class="modal-btn-cancel" onclick="closeModal()">Zrušit</button>
        <button class="modal-btn-confirm" id="modalConfirmBtn">Potvrdit</button>
      </div>
    </div>
  </div>
  <!-- BULK MODAL -->
  <div class="modal-overlay" id="bulkModal">
    <div class="modal-box" style="max-width:640px">
      <div class="modal-title">Hromadný zápis</div>
      <div class="modal-subtitle">Přidej více položek najednou. Souhrn se zobrazí před potvrzením.</div>

      <div class="typ-toggle">
        <button class="typ-btn active-vklad" id="bulk-typ-vklad" onclick="setBulkTyp('VKLAD')">Uložit</button>
        <button class="typ-btn" id="bulk-typ-vyber" onclick="setBulkTyp('VÝBĚR')">Vybrat</button>
      </div>
      <input type="hidden" id="bulk-typ" value="VKLAD">

      <div id="bulk-rows" style="display:flex;flex-direction:column;gap:0.6rem;margin:1rem 0"></div>
      <button class="quick-btn" onclick="addBulkRow()">+ Přidat řádek</button>

      <div class="folio-rule tight"></div>
      <div id="bulk-summary" style="font-family:var(--font-mono);font-size:0.8rem;color:var(--ivory-dim);margin-bottom:1rem"></div>

      <div class="modal-actions">
        <button class="modal-btn-cancel" onclick="closeBulkModal()">Zrušit</button>
        <button class="modal-btn-confirm" id="bulkConfirmBtn" onclick="submitBulk()">Potvrdit zápis</button>
      </div>
    </div>
  </div>
  <div id="undoBar"></div>
  <div class="toast" id="toast"></div>

  <script>
    const ME_IC_NAME = ${JSON.stringify(icName)};

    // Reward flash na aktivně otevřeném panelu (nebo panel-card v modalu, pokud existuje)
    function flashActivePanel(){
      const panel = document.querySelector('.sklad-panel.active .panel-card');
      if (panel && window.rewardFlash) window.rewardFlash(panel);
    }

    // Hodiny
    function updateClock(){
      const now=new Date();
      document.getElementById('live-clock').textContent=now.toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
      document.getElementById('live-date').textContent=now.toLocaleDateString('cs-CZ',{weekday:'long',day:'numeric',month:'long'});
    }
    updateClock();setInterval(updateClock,1000);

    // Tab navigace
    function skladTab(id){
      document.querySelectorAll('.sklad-sidebar-item').forEach(el=>el.classList.toggle('active',el.dataset.panel===id));
      document.querySelectorAll('.sklad-panel').forEach(el=>el.classList.toggle('active',el.id==='panel-'+id));
      try{localStorage.setItem('albion_sklad_tab',id);}catch(e){}
      if(id==='nevyrizene' && window.loadNevyrizene) window.loadNevyrizene();
    }
    function skladToggleMore(){
      const sec=document.getElementById('skladSecondary');
      const toggle=document.getElementById('skladMoreToggle');
      if(!sec||!toggle)return;
      const willOpen=!sec.classList.contains('open');
      sec.classList.toggle('open',willOpen);
      toggle.classList.toggle('open',willOpen);
      try{localStorage.setItem('albion_sklad_more_open',willOpen?'1':'0');}catch(e){}
    }
    (function restoreTab(){
      try{
        const secOpen=localStorage.getItem('albion_sklad_more_open')==='1';
        const SECONDARY_IDS=['zbrane','vyroba','smena','cenik','nevyrizene'];
        const saved=localStorage.getItem('albion_sklad_tab');
        if(secOpen || (saved && SECONDARY_IDS.includes(saved))) skladToggleMore();
        if(saved&&document.getElementById('panel-'+saved))skladTab(saved);
      }catch(e){}
    })();

    // Modal
    let _pendingAction=null;
    let _audioCtx=null;
    function playSealThud(){
      try{
        _audioCtx=_audioCtx||new(window.AudioContext||window.webkitAudioContext)();
        const ctx=_audioCtx;if(ctx.state==='suspended')ctx.resume();
        const now=ctx.currentTime;
        const osc=ctx.createOscillator();osc.type='sine';osc.frequency.setValueAtTime(180,now);osc.frequency.exponentialRampToValueAtTime(48,now+0.16);
        const gain=ctx.createGain();gain.gain.setValueAtTime(0.0001,now);gain.gain.exponentialRampToValueAtTime(0.5,now+0.012);gain.gain.exponentialRampToValueAtTime(0.0001,now+0.32);
        osc.connect(gain);const master=ctx.createGain();master.gain.value=0.9;gain.connect(master);master.connect(ctx.destination);osc.start(now);osc.stop(now+0.34);
      }catch(e){}
    }
    function showModal(title,subtitle,details,actionFn){
      if(window.albionPaper)window.albionPaper();
      document.getElementById('modalTitle').textContent=title;
      document.getElementById('modalSubtitle').textContent=subtitle;
      const dl=document.getElementById('modalDetail');
      dl.innerHTML=details.map(([k,v])=>'<dt>'+k+'</dt><dd>'+v+'</dd>').join('');
      _pendingAction=actionFn;
      document.getElementById('confirmModal').classList.add('open');
      document.getElementById('modalConfirmBtn').textContent='Potvrdit';
      const seal=document.getElementById('sealStamp');
      seal.className='seal-stamp';
      document.getElementById('modalBox').classList.remove('stamped','thud');
    }
    function closeModal(){document.getElementById('confirmModal').classList.remove('open');_pendingAction=null;}
    document.getElementById('modalConfirmBtn').addEventListener('click',async()=>{
      if(!_pendingAction)return;
      const btn=document.getElementById('modalBox');
      const seal=document.getElementById('sealStamp');
      const confirmBtn=document.getElementById('modalConfirmBtn');
      confirmBtn.disabled=true;confirmBtn.textContent='Pečetím…';
      btn.classList.add('stamped','thud');seal.classList.add('slam');
      setTimeout(playSealThud,340);
      await new Promise(r=>setTimeout(r,560));
      confirmBtn.textContent='Odesílám…';
      await _pendingAction();
      seal.classList.add('fade-out');
      await new Promise(r=>setTimeout(r,260));
      confirmBtn.disabled=false;closeModal();
    });
    document.getElementById('confirmModal').addEventListener('click',(e)=>{if(e.target===e.currentTarget)closeModal();});
    document.addEventListener('keydown',(e)=>{if(e.key==='Escape')closeModal();});

    // ── TICHÝ REFRESH DAT SKLADU (místo location.reload()) ─────────────────
    function fmtSklad(obj, ceny, jsouSacky){
      const entries=Object.entries(obj).filter(([,q])=>q>0);
      if(!entries.length) return ledgerEmptyHTML('Sklad prázdný', true);
      return entries.map(([item,qty])=>{
        if(jsouSacky){
          const hodnota=ceny&&ceny[item]?qty*ceny[item].prodej:null;
          return '<div class="sklad-row"><span>'+item+'</span><span>'+qty+' sáčků'+(hodnota?' <em>$'+hodnota+'</em>':'')+'</span></div>';
        }
        return '<div class="sklad-row"><span>'+item+'</span><span>'+qty+' ks</span></div>';
      }).join('');
    }
    const WEED_PRICE_MAP={"Žlutý kanabis":{prodej:150},"Zelený kanabis":{prodej:150},"Kanabis":{prodej:150},"Červený kanabis":{prodej:150},"Modrý kanabis":{prodej:150}};
    async function refreshSkladData(){
      try{
        const res=await fetch('/api/sklad/summary',{cache:'no-store'});
        const d=await res.json();
        if(!d.ok)return;
        const zb=document.getElementById('stock-list-zbrane'); if(zb) zb.innerHTML=fmtSklad(d.zbrane,null);
        const we=document.getElementById('stock-list-weed'); if(we) we.innerHTML=fmtSklad(d.weed,WEED_PRICE_MAP,true);
        const dr=document.getElementById('stock-list-drogy'); if(dr) dr.innerHTML=fmtSklad(d.drogy,null,true);
        const ch=document.getElementById('stock-list-chemky'); if(ch) ch.innerHTML=fmtSklad(d.chemky||{},null);
        if(d.chemky){ Object.assign(VYROBA_STOCK,d.chemky); Object.keys(VYROBA_STOCK).forEach(k=>{ if(!(k in d.chemky)) delete VYROBA_STOCK[k]; }); renderVyrobaStatMax(); renderVyrobaCalc(); }
        const ucetList=document.getElementById('ucet-recent-list');
        if(ucetList){
          if(!d.recentUcet.length) ucetList.innerHTML=ledgerEmptyHTML('Žádné záznamy', true);
          else ucetList.innerHTML=d.recentUcet.map(function(r){
            const isIn=r[1]==='PŘÍJEM', symbol=r[3]==='USD'?'SAD ':'₱';
            return '<div class="sklad-row"><span style="display:flex;align-items:center;gap:0.6rem"><span style="width:4px;height:4px;background:'+(isIn?'#7BD69B':'var(--oxblood-bright)')+';flex-shrink:0"></span>'+(r[4]||'—')+'</span>'+
              '<span style="color:'+(isIn?'#7BD69B':'var(--oxblood-bright)')+'">'+symbol+r[2]+' <em style="color:var(--ivory-faint);font-style:normal;font-size:0.8em">'+r[3].replace('USD','SAD')+'</em></span></div>';
          }).join('');
        }
        const usdEl=document.getElementById('tally-usd'); if(usdEl) usdEl.textContent='$'+d.ucet.usd.toLocaleString('cs-CZ');
        const pesosEl=document.getElementById('tally-pesos'); if(pesosEl) pesosEl.textContent='₱'+d.ucet.pesos.toLocaleString('cs-CZ');
        const totalWeed=Object.values(d.weed).filter(q=>q>0).reduce((a,b)=>a+b,0);
        const totalDrogy=Object.values(d.drogy).filter(q=>q>0).reduce((a,b)=>a+b,0);
        const totalChemky=Object.values(d.chemky||{}).filter(q=>q>0).reduce((a,b)=>a+b,0);
        let totalWeedValue=0; Object.entries(d.weed).forEach(([k,q])=>{if(q>0&&WEED_PRICE_MAP[k])totalWeedValue+=q*WEED_PRICE_MAP[k].prodej;});
        const tw=document.getElementById('tally-weed'); if(tw) tw.textContent=totalWeed+' sáčků';
        const td=document.getElementById('tally-drogy'); if(td) td.textContent=totalDrogy+' sáčků';
        const tc=document.getElementById('tally-chemky'); if(tc) tc.textContent=totalChemky+' ks';
        const twv=document.getElementById('tally-weed-value'); if(twv) twv.textContent='$'+totalWeedValue.toLocaleString('cs-CZ');
        const uw=document.getElementById('unit-summary-weed'); if(uw) uw.textContent=totalWeed+' sáčků';
        const ud=document.getElementById('unit-summary-drogy'); if(ud) ud.textContent=totalDrogy+' sáčků';
        SKLAD_UCET.usd=d.ucet.usd; SKLAD_UCET.pesos=d.ucet.pesos;
        renderSmenaSides();
        loadNejpouzivanejsi();
      }catch(e){}
    }

    // ── VRÁTIT POSLEDNÍ ZÁPIS ZPĚT (undo) ───────────────────────────────────
    function showUndoBar(text){
      const bar=document.getElementById('undoBar');
      bar.innerHTML='<span>Zapsáno: '+text+'</span><button class="modal-btn-cancel" style="padding:0.4rem 0.9rem;flex-shrink:0" onclick="undoLastAction()">Vrátit zpět</button>';
      bar.style.display='flex';
      clearTimeout(bar._hideT);
      bar._hideT=setTimeout(()=>{bar.style.display='none';}, 10*60*1000);
    }
    async function undoLastAction(){
      const r=await post('/api/sklad/undo',{});
      if(r.ok){showToast('Akce vrácena zpět');document.getElementById('undoBar').style.display='none';refreshSkladData();}
      else showToast(r.error,true);
    }
    window.undoLastAction=undoLastAction;

    // ── NEJPOUŽÍVANĚJŠÍ POLOŽKY — rychlé vyplnění formuláře ─────────────────
    async function loadNejpouzivanejsi(){
      try{
        const res=await fetch('/api/sklad/moje-oblibene');
        const d=await res.json();
        if(!d.ok)return;
        renderChips('zbrane-chips', d.zbrane, function(item){
          const sel=document.getElementById('zbrane-polozka');
          if([...sel.options].some(o=>o.value===item)) sel.value=item;
          document.getElementById('zbrane-mnozstvi').focus();
        });
        renderChips('weed-chips', d.weed, function(item){
          document.getElementById('weed-odruda').value=item;
          if(typeof updateWeedInfo==='function')updateWeedInfo();
          document.getElementById('weed-mnozstvi').focus();
        });
        renderChips('drogy-chips', d.drogy, function(item){
          document.getElementById('drogy-droga').value=item;
          document.getElementById('drogy-mnozstvi').focus();
        });
        renderChips('chemky-chips', d.chemky, function(item){
          document.getElementById('chemky-chemikalie').value=item;
          document.getElementById('chemky-mnozstvi').focus();
        });
      }catch(e){}
    }
    function renderChips(containerId, items, onPick){
      const wrap=document.getElementById(containerId);
      if(!wrap)return;
      if(!items||!items.length){ wrap.innerHTML=''; return; }
      wrap.innerHTML='<span style="font-family:var(--font-label);font-size:0.5rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--ivory-faint);align-self:center;margin-right:0.2rem">Oblíbené:</span>'+
        items.map(function(item){ return '<span class="fav-chip" data-item="'+item.replace(/"/g,'&quot;')+'">'+item+'</span>'; }).join('');
      wrap.querySelectorAll('.fav-chip').forEach(function(chip){
        chip.addEventListener('click', function(){ onPick(chip.dataset.item); });
      });
    }
    loadNejpouzivanejsi();

    // Sklad logika
    const ZBRANE=["Pump Shotgun","Pistol MK2","Pistol","Combat Pistol","Double Action Revolver","Navy Revolver","Vintage Pistol","Gusenberg","Dlouhé"];
    const NABOJE=["9mm","9mm Mk2",".75cal",".50cal","12-gauge"];
    const AKCE=["Malá C4","Velká C4","Přístupová karta","Pokročilá zvláštní karta","EMP zařízení","Řezací laser","Cable Cutter","Zvláštní karta"];
    const WEED_CENY={"Žlutý kanabis":{vyroba:100,prodej:150},"Zelený kanabis":{vyroba:100,prodej:150},"Kanabis":{vyroba:100,prodej:150},"Červený kanabis":{vyroba:100,prodej:150},"Modrý kanabis":{vyroba:100,prodej:150}};
    const DROGY_LIST=["Kapky","Kokain","Extáze","Metamfetamin","Benzo","Joyka","Heroin","Speed","LSD"];
    const CHEMKY_LIST=["Aceton","Peroxid vodíku","Potravinářský kofein","Propylenglykol","Toluen","Technický benzín","Bismut","Kyselina fosforečná","Kerosen","Pekáč","Genkadon","Amanita Genkia","Kapátka","Forma","Lithiová baterie","Semínko","Cukr","Nadrcené listy"];
    // Ceník chemikálií — používá se pro dopočet nákladů na várku ve Výrobě.
    const CHEMKY_CENY = {
      'Aceton':               { cena: 60,  mena: 'pesos' },
      'Peroxid vodíku':       { cena: 40,  mena: 'pesos' },
      'Bismut':               { cena: 55,  mena: 'pesos' },
      'Kyselina fosforečná':  { cena: 75,  mena: 'pesos' },
      'Potravinářský kofein': { cena: 80,  mena: 'pesos' },
      'Propylenglykol':       { cena: 40,  mena: 'pesos' },
      'Toluen':               { cena: 55,  mena: 'pesos' },
      'Technický benzín':     { cena: 80,  mena: 'pesos' },
      'Kerosen':              { cena: 120, mena: 'pesos' },
      'Genkadon':             { cena: 130, mena: 'pesos' },
      'Amanita Genkia':       { cena: 50,  mena: 'pesos' },
      'Kapátka':              { cena: 1,   mena: 'sad' },
      'Forma':                { cena: 50,  mena: 'sad' },
      'Pekáč':                { cena: 16,  mena: 'sad' },
      'Lithiová baterie':     { cena: 200, mena: 'sad' },
      'Semínko':              { cena: 5,   mena: 'sad' },
      'Cukr':                 { cena: 50,  mena: 'sad' },
      'Nadrcené listy':       { cena: 1,   mena: 'sad' },
    };

    const KATALOG=${JSON.stringify(katalog || { zbrane: [], naboje: [], akce: [], weed: [], drogy: [], chemky: [] })};
    (KATALOG.zbrane||[]).forEach(i=>{if(!ZBRANE.includes(i))ZBRANE.push(i);});
    (KATALOG.naboje||[]).forEach(i=>{if(!NABOJE.includes(i))NABOJE.push(i);});
    (KATALOG.akce||[]).forEach(i=>{if(!AKCE.includes(i))AKCE.push(i);});
    (KATALOG.weed||[]).forEach(i=>{if(!WEED_CENY[i])WEED_CENY[i]={vyroba:100,prodej:150};});
    (KATALOG.drogy||[]).forEach(i=>{if(!DROGY_LIST.includes(i))DROGY_LIST.push(i);});
    (KATALOG.chemky||[]).forEach(i=>{if(!CHEMKY_LIST.includes(i))CHEMKY_LIST.push(i);});
    function refreshStaticSelects(){
      const weedSel=document.getElementById('weed-odruda');
      if(weedSel){weedSel.innerHTML=Object.keys(WEED_CENY).map(i=>'<option>'+i+'</option>').join('');}
      const drogySel=document.getElementById('drogy-droga');
      if(drogySel){drogySel.innerHTML=DROGY_LIST.map(i=>'<option>'+i+'</option>').join('');const b=document.querySelector('#panel-drogy .select-count-badge');if(b)b.textContent=DROGY_LIST.length;}
      const chemkySel=document.getElementById('chemky-chemikalie');
      if(chemkySel){chemkySel.innerHTML=CHEMKY_LIST.map(i=>'<option>'+i+'</option>').join('');const b=document.querySelector('#panel-chemky .select-count-badge');if(b)b.textContent=CHEMKY_LIST.length;}
    }
    refreshStaticSelects();

    // ── VÝROBA — recept na Metamfetamin ("Recept 1 vaření") ──
    const METH_RECIPE = {
      dávkyPerBatch: 5,
      yieldPerBatch: 150,
      steps: [
        { label: 'Drcení', inputs: [{item:'Bismut',qty:70}], output: 'Drcený bismut', outputQty: 10 },
        { label: 'Směs na meth', inputs: [{item:'Drcený bismut',qty:10},{item:'Toluen',qty:70},{item:'Aceton',qty:70}], output: 'Směs na meth', outputQty: 10 },
        { label: 'Mateč', inputs: [{item:'Směs na meth',qty:10},{item:'Kerosen',qty:35},{item:'Potravinářský kofein',qty:50}], output: 'Mateč', outputQty: 5 },
        { label: 'Pekáč s Matečem', inputs: [{item:'Mateč',qty:5},{item:'Pekáč',qty:5}], output: 'Pekáč s Matečem', outputQty: 5 },
        { label: 'Pekáč s methem', inputs: [{item:'Pekáč s Matečem',qty:5}], output: 'Pekáč s methem', outputQty: 5 },
        { label: 'Výroba', inputs: [{item:'Pekáč s methem',qty:5}], output: 'Metamfetamin', outputQty: 150 },
      ],
      outputItem: 'Metamfetamin',
      rawPerBatch: { 'Bismut':70, 'Toluen':70, 'Aceton':70, 'Kerosen':35, 'Potravinářský kofein':50, 'Pekáč':5 },
    };
    const VYROBA_STOCK = ${JSON.stringify(chemky || {})};
    function money(n){ return '$'+Math.round(n||0).toLocaleString('cs-CZ'); }
    function pesosF(n){ return '₱'+Math.round(n||0).toLocaleString('cs-CZ'); }

    function vyrobaItemPrice(item){ return CHEMKY_CENY[item] || { cena: 0, mena: 'pesos' }; }
    function vyrobaItemCostText(item, qty){
      const p=vyrobaItemPrice(item);
      const total=p.cena*qty;
      return (p.mena==='sad'?money(total):pesosF(total));
    }
    function computeBatchCost(batches){
      let pesos=0, sad=0;
      Object.entries(METH_RECIPE.rawPerBatch).forEach(([item,qtyPerBatch])=>{
        const p=vyrobaItemPrice(item);
        const total=p.cena*qtyPerBatch*batches;
        if(p.mena==='sad') sad+=total; else pesos+=total;
      });
      return { pesos, sad };
    }

    const VYROBA_RAW_ITEMS = new Set(Object.keys(METH_RECIPE.rawPerBatch));
    function vyrobaChip(text, qty, isRaw, isFinalOutput){
      return '<span class="vyroba-chip'+(isRaw?' raw':'')+(isFinalOutput?' final':'')+'">'+qty+'× '+text+'</span>';
    }
    function renderVyrobaSteps(){
      const wrap=document.getElementById('vyroba-steps');
      if(!wrap)return;
      wrap.innerHTML=METH_RECIPE.steps.map((s,i)=>{
        const chips=s.inputs.map(inp=>vyrobaChip(inp.item,inp.qty,VYROBA_RAW_ITEMS.has(inp.item),false)).join('<span class="vyroba-plus">+</span>');
        const isFinal=i===METH_RECIPE.steps.length-1;
        return '<div class="vyroba-step-card'+(isFinal?' final':'')+'">'+
          '<div class="vyroba-step-meta">Krok '+String(i+1).padStart(2,'0')+' / '+String(METH_RECIPE.steps.length).padStart(2,'0')+(isFinal?' · Finální produkt':'')+'</div>'+
          '<div class="vyroba-step-label">'+s.label+'</div>'+
          '<div class="vyroba-step-flow">'+chips+'<span class="vyroba-arrow">→</span>'+vyrobaChip(s.output,s.outputQty,false,isFinal)+'</div>'+
        '</div>';
      }).join('');
    }

    function maxVyrobaBatches(){
      let max=Infinity;
      Object.entries(METH_RECIPE.rawPerBatch).forEach(([item,qty])=>{
        const have=VYROBA_STOCK[item]||0;
        max=Math.min(max,Math.floor(have/qty));
      });
      return isFinite(max)?Math.max(0,max):0;
    }

    function renderVyrobaStatMax(){
      const cell=document.getElementById('vyroba-stat-max');
      if(cell){
        const max=maxVyrobaBatches();
        const valEl=cell.querySelector('.vyroba-stat-val');
        if(valEl)valEl.textContent=max;
      }
      const costCell=document.getElementById('vyroba-stat-cost');
      if(costCell){
        const c=computeBatchCost(1);
        const valEl=costCell.querySelector('.vyroba-stat-val');
        if(valEl)valEl.innerHTML=pesosF(c.pesos)+' <span style="color:var(--ivory-faint);font-size:0.6em">+</span> '+money(c.sad);
      }
    }

    let VYROBA_ALL_OK = false;
    function syncVyrobaQtyDefault(batches){
      const qtyEl=document.getElementById('vyroba-qty');
      if(!qtyEl)return;
      // Dokud člen pole ručně nepřepíše, drží se odhadu dle receptu (batches × 150).
      // Jakmile do pole sám něco napíše, přestane se přepisovat — viz listener níže.
      if(qtyEl.dataset.autofilled!=='0'){
        qtyEl.value=batches*METH_RECIPE.yieldPerBatch;
        qtyEl.dataset.autofilled='1';
      }
    }
    function getVyrobaQty(batches){
      const qtyEl=document.getElementById('vyroba-qty');
      const v=qtyEl?parseInt(qtyEl.value):NaN;
      return Number.isInteger(v)&&v>0 ? v : batches*METH_RECIPE.yieldPerBatch;
    }
    function renderVyrobaCalc(){
      const batches=Math.max(1,parseInt(document.getElementById('vyroba-batches').value)||1);
      syncVyrobaQtyDefault(batches);

      const rows=Object.entries(METH_RECIPE.rawPerBatch).map(([item,qtyPerBatch])=>{
        const needed=qtyPerBatch*batches;
        const have=VYROBA_STOCK[item]||0;
        const missing=Math.max(0,needed-have);
        const ok=missing===0;
        const pct=needed>0?Math.min(100,Math.round((have/needed)*100)):100;
        return {item,needed,have,missing,ok,pct};
      });
      const allOk=rows.every(r=>r.ok);
      VYROBA_ALL_OK = allOk;
      const confirmBtn=document.getElementById('vyrobaConfirmBtn');
      if(confirmBtn) confirmBtn.disabled = !allOk;

      const body=document.getElementById('vyroba-materials-body');
      if(body){
        body.innerHTML=rows.map(r=>
          '<tr>'+
            '<td style="color:'+(r.ok?'var(--ivory)':'var(--oxblood-bright)')+';font-family:var(--font-display);font-style:italic">'+r.item+'</td>'+
            '<td style="text-align:right;color:var(--ivory-faint);font-family:var(--font-mono);font-size:0.78rem">'+vyrobaItemCostText(r.item,1)+' / ks</td>'+
            '<td style="text-align:right">'+r.needed+' ks</td>'+
            '<td style="text-align:right">'+r.have+' ks</td>'+
            '<td><div class="mini-stock-bar-wrap" style="width:90px"><div class="mini-stock-bar-fill" style="width:'+r.pct+'%;background:'+(r.ok?'linear-gradient(90deg,#3A7D2D,#7BD69B)':'linear-gradient(90deg,var(--oxblood),var(--oxblood-bright))')+'"></div></div></td>'+
            '<td>'+(r.ok?'<span class="badge vklad">OK</span>':'<span class="badge vyber">chybí '+r.missing+'</span>')+'</td>'+
          '</tr>'
        ).join('');
      }

      const cost=computeBatchCost(batches);
      const yieldBox=document.getElementById('vyroba-yield-box');
      if(yieldBox){
        yieldBox.innerHTML=
          '<div class="manifest-row"><span class="mr-name">Odhad dle receptu</span><span class="mr-dots"></span><span class="mr-val" style="color:var(--brass)">'+(batches*METH_RECIPE.dávkyPerBatch)+' dávek · ~'+(batches*METH_RECIPE.yieldPerBatch)+'× Metamfetamin</span></div>'+
          '<div class="manifest-row"><span class="mr-name">Zapíše se do skladu</span><span class="mr-dots"></span><span class="mr-val" style="color:#8FE0A0">'+getVyrobaQty(batches)+'× Metamfetamin</span></div>'+
          '<div class="manifest-row"><span class="mr-name">Celkový náklad</span><span class="mr-dots"></span><span class="mr-val" style="color:var(--oxblood-bright)">'+pesosF(cost.pesos)+' + '+money(cost.sad)+'</span></div>';
      }

      const statusBox=document.getElementById('vyroba-status-box');
      if(statusBox){
        statusBox.style.borderColor=allOk?'rgba(58,125,45,0.4)':'var(--border-oxblood)';
        statusBox.style.background=allOk?'rgba(58,125,45,0.08)':'var(--oxblood-faint)';
        statusBox.style.color=allOk?'#8FE0A0':'var(--oxblood-bright)';
        statusBox.innerHTML=allOk
          ? ('✓ Na skladě je dost surovin na '+batches+' '+(batches===1?'várku':batches<5?'várky':'várek')+' — lze rovnou uvařit a odečíst ze skladu.')
          : '✕ Na sklad chybí suroviny uvedené v tabulce (sloupec „Stav“) — výrobu nelze potvrdit.';
      }
    }
    document.getElementById('vyroba-batches') && document.getElementById('vyroba-batches').addEventListener('input',renderVyrobaCalc);
    document.getElementById('vyroba-qty') && document.getElementById('vyroba-qty').addEventListener('input',function(){
      // Jakmile člen sám do pole napíše, přestane se přepočítávat na odhad z receptu.
      this.dataset.autofilled='0';
      renderVyrobaCalc();
    });
    renderVyrobaSteps();renderVyrobaStatMax();renderVyrobaCalc();

    // ── VÝROBA — přepínání záložek receptů (Metamfetamin / Benzodiazepin / Joy) ──
    // Benzodiazepin a Joy zatím nejsou propojené se skladem — jen zobrazují
    // seznam surovin, žádná kalkulačka ani odečet ze skladu.
    function switchVyrobaRecept(recept){
      ['meth','benzo','joy'].forEach(r=>{
        const tab=document.getElementById('recept-tab-'+r);
        const content=document.getElementById('vyroba-recept-'+r);
        if(tab)tab.classList.toggle('active',r===recept);
        if(content)content.classList.toggle('active',r===recept);
      });
    }
    window.switchVyrobaRecept = switchVyrobaRecept;

    // ── NEVYŘÍZENÉ — žlutý weed / vklady do kufru od membérů, čekající na spárování ──
    function nevyrizeneRow(row){
      return '<div class="sklad-row" data-nevyrizene-id="'+row.id+'">'+
        '<span style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap">'+
          '<span class="badge '+(row.vyrizeno?'vklad':'vyber')+'">'+(row.vyrizeno?'Vyřízeno':'Čeká')+'</span>'+
          '<strong style="color:var(--ivory)">'+row.typ+'</strong>'+
          '<span style="color:var(--ivory-dim)">'+row.uzivatel+'</span>'+
          '<em style="color:var(--ivory-faint);font-style:normal;font-size:0.82em">'+row.popis+' · '+row.cas+(row.vyrizeno&&row.vyrizil?' · spároval '+row.vyrizil:'')+'</em>'+
        '</span>'+
        '<button class="quick-btn" onclick="toggleNevyrizene('+row.id+')">'+(row.vyrizeno?'Vrátit mezi nevyřízené':'Spárovat')+'</button>'+
      '</div>';
    }
    async function loadNevyrizene(){
      const listEl=document.getElementById('nevyrizene-list');
      const vyrEl=document.getElementById('vyrizene-list');
      const countEl=document.getElementById('nevyrizene-count');
      if(!listEl)return;
      try{
        const res=await fetch('/api/nevyrizene');
        const d=await res.json();
        if(!d.ok){listEl.innerHTML='<div class="info-box" style="display:block">Načtení se nepodařilo.</div>';return;}
        countEl.textContent=d.nevyrizene.length;
        listEl.innerHTML=d.nevyrizene.length?d.nevyrizene.map(nevyrizeneRow).join(''):'<div class="ledger-loading">Žádné nevyřízené akce</div>';
        if(vyrEl)vyrEl.innerHTML=d.vyrizene.length?d.vyrizene.map(nevyrizeneRow).join(''):'<div class="ledger-loading">Zatím nic</div>';
      }catch(e){listEl.innerHTML='<div class="info-box" style="display:block">Načtení se nepodařilo.</div>';}
    }
    async function toggleNevyrizene(id){
      try{
        const res=await fetch('/api/nevyrizene/vyresit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
        const d=await res.json();
        if(d.ok){showToast(d.vyrizeno?'Spárováno':'Vráceno mezi nevyřízené');loadNevyrizene();}
        else showToast(d.error,true);
      }catch(e){showToast('Nepodařilo se, zkus to znovu',true);}
    }
    window.loadNevyrizene=loadNevyrizene;
    window.toggleNevyrizene=toggleNevyrizene;
    if(document.getElementById('panel-nevyrizene')&&document.getElementById('panel-nevyrizene').classList.contains('active'))loadNevyrizene();

    // Potvrzení výroby — server si sám znovu ověří aktuální sklad chemikálií,
    // odečte suroviny a rovnou přičte hotový Metamfetamin do skladu drog.
    async function submitVyroba(){
      const batches=Math.max(1,parseInt(document.getElementById('vyroba-batches').value)||1);
      if(!VYROBA_ALL_OK) return showToast('Na skladě nejsou potřebné suroviny na tolik várek', true);
      const vyrobenoQty=getVyrobaQty(batches);
      if(!Number.isInteger(vyrobenoQty)||vyrobenoQty<1) return showToast('Zadej platné vyrobené množství (ks)', true);
      const cost=computeBatchCost(batches);
      showModal(
        'Potvrdit výrobu',
        'Suroviny se okamžitě odečtou ze skladu chemikálií a hotový produkt se přičte do skladu drog.',
        [
          ['Počet várek', batches],
          ['Vyrobené množství', vyrobenoQty+'× Metamfetamin'],
          ['Náklad', pesosF(cost.pesos)+' + '+money(cost.sad)],
          ...Object.entries(METH_RECIPE.rawPerBatch).map(([item,qty])=>['Odečte se — '+item, (qty*batches)+' ks']),
        ],
        async()=>{
          const r=await post('/api/vyroba/potvrdit',{batches,vyrobenoQty});
          if(r.ok){
            showToast('Výroba potvrzena — '+r.vyrobenoQty+'× '+r.outputItem+' přičteno do skladu');
            const qtyEl=document.getElementById('vyroba-qty');
            if(qtyEl){qtyEl.value='';qtyEl.dataset.autofilled='1';}
            flashActivePanel();
            refreshSkladData();
          } else showToast(r.error,true);
        }
      );
    }
    window.submitVyroba = submitVyroba;

    function updateZbraneItems(){
      const kat=document.getElementById('zbrane-kat').value;
      const sel=document.getElementById('zbrane-polozka');
      const items=kat==='Zbraň'?ZBRANE:kat==='Střelivo'?NABOJE:AKCE;
      sel.innerHTML=items.map(i=>'<option>'+i+'</option>').join('');
      const badge=document.getElementById('zbrane-polozka-count');
      if(badge)badge.textContent=items.length;
    }
    updateZbraneItems();

    // ── HROMADNÝ ZÁPIS (BULK) ──
    const BULK_ITEMS = {
      zbrane: [...ZBRANE.map(i=>({label:i,kat:'Zbraň'})), ...NABOJE.map(i=>({label:i,kat:'Střelivo'})), ...AKCE.map(i=>({label:i,kat:'Akce'}))],
      weed:   Object.keys(WEED_CENY).map(i=>({label:i})),
      drogy:  DROGY_LIST.map(i=>({label:i})),
      chemky: CHEMKY_LIST.map(i=>({label:i})),
    };
    let bulkSekce='zbrane',bulkTyp='VKLAD';

    function openBulkModal(sekce){
      if(window.albionPaper)window.albionPaper();
      bulkSekce=sekce;
      document.getElementById('bulk-rows').innerHTML='';
      addBulkRow();
      setBulkTyp('VKLAD');
      document.getElementById('bulkModal').classList.add('open');
    }
    function closeBulkModal(){document.getElementById('bulkModal').classList.remove('open');}
    function setBulkTyp(typ){
      bulkTyp=typ;
      document.getElementById('bulk-typ').value=typ;
      document.getElementById('bulk-typ-vklad').className='typ-btn'+(typ==='VKLAD'?' active-vklad':'');
      document.getElementById('bulk-typ-vyber').className='typ-btn'+(typ==='VÝBĚR'?' active-vyber':'');
      updateBulkSummary();
    }
    function addBulkRow(){
      const items=BULK_ITEMS[bulkSekce];
      const wrap=document.createElement('div');
      wrap.style.cssText='display:flex;gap:0.5rem;align-items:center';
      wrap.innerHTML=
        '<select class="bulk-item" style="flex:2">'+items.map(i=>'<option value="'+i.label+'" data-kat="'+(i.kat||'')+'">'+i.label+'</option>').join('')+'</select>'+
        '<input type="number" class="bulk-qty" min="1" max="500" value="1" style="flex:1">'+
        '<button type="button" onclick="this.parentElement.remove();updateBulkSummary()" style="background:none;border:1px solid var(--border-oxblood);color:var(--oxblood-bright);width:32px;height:32px;cursor:pointer">✕</button>';
      document.getElementById('bulk-rows').appendChild(wrap);
      wrap.querySelector('.bulk-qty').addEventListener('input',updateBulkSummary);
      wrap.querySelector('.bulk-item').addEventListener('change',updateBulkSummary);
      updateBulkSummary();
    }
    function updateBulkSummary(){
      const rows=[...document.querySelectorAll('#bulk-rows > div')];
      const lines=rows.map(r=>{
        const sel=r.querySelector('.bulk-item'),qty=r.querySelector('.bulk-qty').value||1;
        return sel.value+' × '+qty;
      });
      document.getElementById('bulk-summary').textContent=
        bulkTyp+' · '+rows.length+' položek: '+lines.join(', ');
    }
    async function submitBulk(){
      const rows=[...document.querySelectorAll('#bulk-rows > div')];
      if(!rows.length)return showToast('Přidej alespoň jednu položku',true);
      for(const r of rows){
        const qty=parseInt(r.querySelector('.bulk-qty').value)||0;
        if(qty<1||qty>500) return showToast('Množství musí být 1–500 ks',true);
      }
      const items=rows.map(r=>{
        const sel=r.querySelector('.bulk-item');
        return {
          polozka:sel.value,
          mnozstvi:r.querySelector('.bulk-qty').value,
          kategorie:sel.selectedOptions[0].dataset.kat||undefined,
        };
      });
      const btn=document.getElementById('bulkConfirmBtn');
      btn.disabled=true;btn.textContent='Odesílám…';
      const r=await post('/api/sklad/bulk',{sekce:bulkSekce,typ:bulkTyp,items});
      btn.disabled=false;btn.textContent='Potvrdit zápis';
      if(r.ok){showToast('Hromadný zápis uložen ('+r.count+' položek)');closeBulkModal();flashActivePanel();refreshSkladData();}
      else showToast(r.error,true);
    }

    function setTyp(prefix,typ,btn){
      document.getElementById(prefix+'-typ').value=typ;
      btn.parentElement.querySelectorAll('.typ-btn').forEach(b=>b.className='typ-btn');
      btn.className='typ-btn '+(typ==='VKLAD'||typ==='PŘÍJEM'?'active-vklad':'active-vyber');
      if(prefix==='zbrane')document.getElementById('zbrane-ucel-wrap').style.display=typ==='VÝBĚR'?'flex':'none';
      if(prefix==='chemky'){
        const wrap=document.getElementById('chemky-cena-wrap');
        if(wrap) wrap.style.display=typ==='VKLAD'?'block':'none';
      }
    }

    async function post(url,data){
      const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      return res.json();
    }

    function qtyValid(id){
      const v=parseInt(document.getElementById(id).value);
      return Number.isInteger(v)&&v>0&&v<=500;
    }

    async function submitZbrane(){
      if(!qtyValid('zbrane-mnozstvi'))return showToast('Množství musí být 1–500 ks',true);
      const typ=document.getElementById('zbrane-typ').value;
      const polozka=document.getElementById('zbrane-polozka').value;
      const mnozstvi=document.getElementById('zbrane-mnozstvi').value;
      const kategorie=document.getElementById('zbrane-kat').value;
      const ucel=document.getElementById('zbrane-ucel').value;
      showModal(
        typ==='VKLAD'?'Vložit do skladu':'Vybrat ze skladu',
        'Potvrzením zapečetíš zápis do rejstříku.',
        [['Typ',typ],['Položka',polozka],['Množství',mnozstvi+' ks'],['Kategorie',kategorie],...(ucel?[['Účel',ucel]]:[])],
        async()=>{
          const r=await post('/api/zbrane',{typ,polozka,mnozstvi,kategorie,ucel});
          if(r.ok){showToast('Zápis uložen');showUndoBar(typ+' — '+polozka+' ('+mnozstvi+' ks)');flashActivePanel();refreshSkladData();}
          else showToast(r.error,true);
        }
      );
    }

    function updateWeedInfo(){
      const odruda=document.getElementById('weed-odruda').value;
      const qty=parseInt(document.getElementById('weed-mnozstvi').value)||1;
      const c=WEED_CENY[odruda];if(!c)return;
      const box=document.getElementById('weed-info');
      box.style.display='block';
      box.innerHTML=qty+' sáčků&ensp;·&ensp;Výroba: ~$'+(c.vyroba*qty)+'&ensp;·&ensp;Prodej: $'+(c.prodej*qty);
    }
    document.getElementById('weed-odruda').addEventListener('change',updateWeedInfo);
    document.getElementById('weed-mnozstvi').addEventListener('input',updateWeedInfo);
    updateWeedInfo();

    async function submitWeed(){
      if(!qtyValid('weed-mnozstvi'))return showToast('Množství musí být 1–500 sáčků',true);
      const typ=document.getElementById('weed-typ').value;
      const odruda=document.getElementById('weed-odruda').value;
      const mnozstvi=document.getElementById('weed-mnozstvi').value;
      const c=WEED_CENY[odruda]||{vyroba:100,prodej:150};
      const qty=parseInt(mnozstvi)||0;
      showModal(
        typ==='VKLAD'?'Vložit weed':'Vybrat weed',
        'Potvrzením zapečetíš zápis do rejstříku.',
        [['Typ',typ],['Odrůda',odruda],['Množství',mnozstvi+' sáčků'],['Výroba','~$'+(c.vyroba*qty)],['Prodej','$'+(c.prodej*qty)]],
        async()=>{
          const r=await post('/api/weed',{typ,odruda,mnozstvi});
          if(r.ok){showToast('Weed uložen — Výroba: ~$'+r.celkVyroba+' · Prodej: $'+r.celkProdej);showUndoBar(typ+' — '+odruda+' ('+mnozstvi+' sáčků)');flashActivePanel();refreshSkladData();}
          else showToast(r.error,true);
        }
      );
    }

    async function submitDrogy(){
      if(!qtyValid('drogy-mnozstvi'))return showToast('Množství musí být 1–500 sáčků',true);
      const typ=document.getElementById('drogy-typ').value;
      const droga=document.getElementById('drogy-droga').value;
      const mnozstvi=document.getElementById('drogy-mnozstvi').value;
      showModal(
        typ==='VKLAD'?'Vložit drogy':'Vybrat drogy',
        'Potvrzením zapečetíš zápis do rejstříku.',
        [['Typ',typ],['Droga',droga],['Množství',mnozstvi+' sáčků']],
        async()=>{
          const r=await post('/api/drogy',{typ,droga,mnozstvi});
          if(r.ok){showToast('Drogy uloženy');showUndoBar(typ+' — '+droga+' ('+mnozstvi+' sáčků)');flashActivePanel();refreshSkladData();}
          else showToast(r.error,true);
        }
      );
    }

    async function submitUcet(){
      const typ=document.getElementById('ucet-typ').value;
      const castka=document.getElementById('ucet-castka').value;
      const valuta=document.getElementById('ucet-valuta').value;
      const poznamka=document.getElementById('ucet-poznamka').value;
      if(!castka||!poznamka)return showToast('Vyplň všechna pole',true);
      const sym=valuta==='USD'?'$':'₱';
      showModal(
        typ==='PŘÍJEM'?'Zaznamenat příjem':'Zaznamenat výdaj',
        'Tato transakce bude zapsána do hlavního účetnictví organizace.',
        [['Typ',typ],['Částka',sym+castka],['Valuta',valuta],['Poznámka',poznamka]],
        async()=>{
          const r=await post('/api/ucet',{typ,castka,valuta,poznamka});
          if(r.ok){showToast('Transakce zaznamenána');document.getElementById('ucet-castka').value='';document.getElementById('ucet-poznamka').value='';flashActivePanel();refreshSkladData();}
          else showToast(r.error,true);
        }
      );
    }

    // ── RESERVE FUND ──
    function escRf(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    let RF_AMOUNT=5000;
    async function loadReserveFund(){
      try{
        const res=await fetch('/api/reserve-fund',{cache:'no-store'});
        const d=await res.json();
        if(!d.ok)return;
        RF_AMOUNT=d.amount;
        const amtInput=document.getElementById('rf-amount-input'); if(amtInput && document.activeElement!==amtInput) amtInput.value=d.amount;
        const amtText=document.getElementById('rf-amount-text'); if(amtText) amtText.textContent='$'+d.amount.toLocaleString('cs-CZ');
        const badge=document.getElementById('rf-badge');
        if(badge)badge.textContent='Týden do '+new Date(d.weekKey).toLocaleDateString('cs-CZ')+' · '+d.paidCount+'/'+d.totalCount+' zaplaceno';
        const balanceEl=document.getElementById('rf-account-balance');
        if(balanceEl && d.ucetReserve) balanceEl.textContent='$'+Math.round(d.ucetReserve.usd||0).toLocaleString('cs-CZ')+(d.ucetReserve.pesos?' · ₱'+Math.round(d.ucetReserve.pesos).toLocaleString('cs-CZ'):'');

        const statusBox=document.getElementById('rf-status');
        if(d.exempt){
          statusBox.innerHTML='<div class="info-box" style="display:block;border-color:var(--border-brass);background:var(--brass-faint);color:var(--ivory-dim)">Jako Associate máš z Reserve Fondu zatím výjimku — povinnost platit začíná od hodnosti Member.</div>';
        } else if(d.paidByMe){
          statusBox.innerHTML='<div class="info-box" style="display:block;border-color:rgba(58,125,45,0.4);background:rgba(58,125,45,0.08);color:#8FE0A0">✓ Tento týden máš Reserve Fund zaplacený a podepsaný.</div>';
        } else {
          statusBox.innerHTML='<button class="btn-submit" style="margin-top:0" onclick="payReserveFund()">Zaplatit a podepsat $'+d.amount.toLocaleString('cs-CZ')+'</button>';
        }

        const list=document.getElementById('rf-list');
        if(!d.members.length){ list.innerHTML=ledgerEmptyHTML('Žádní registrovaní členové',true); return; }
        list.innerHTML='<div class="panel-list-label" style="margin-top:1.2rem">Stav členů — tento týden</div>'+
          d.members.map(m=>
            '<div class="manifest-row"><span class="mr-name">'+escRf(m.icName)+'</span><span class="mr-dots"></span>'+
            '<span class="mr-val" style="color:'+(m.paid?'#7BD69B':'var(--oxblood-bright)')+'">'+(m.paid?'✓ zaplaceno':'✕ nezaplaceno')+'</span></div>'
          ).join('');
      }catch(e){}
    }
    async function payReserveFund(){
      showModal(
        'Reserve Fund',
        'Zaplacením potvrzuješ a podepisuješ povinný týdenní odvod na samostatný účet Reserve Fondu organizace.',
        [['Částka','$'+RF_AMOUNT.toLocaleString('cs-CZ')],['Splatnost','neděle'],['Účet','Reserve Fond (odděleně od hlavní pokladny)']],
        async()=>{
          const r=await post('/api/reserve-fund/pay',{});
          if(r.ok){showToast('Reserve Fund zaplacen a podepsán');flashActivePanel();loadReserveFund();}
          else showToast(r.error,true);
        }
      );
    }
    window.payReserveFund=payReserveFund;
    async function saveReserveFundAmount(){
      const amount=document.getElementById('rf-amount-input').value;
      const res=await fetch('/api/reserve-fund/config',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount})});
      const d=await res.json();
      if(d.ok){showToast('Výše Reserve Fondu uložena');loadReserveFund();}
      else showToast(d.error,true);
    }
    window.saveReserveFundAmount=saveReserveFundAmount;
    loadReserveFund();
    (window.evtSource||new EventSource('/api/events')).addEventListener('reserveFundUpdate',()=>setTimeout(loadReserveFund,400));
    (window.evtSource||new EventSource('/api/events')).addEventListener('reserveFundConfigUpdate',()=>setTimeout(loadReserveFund,200));

    // ── CHEMKY — CENA NÁKUPU (z varny / vlastní / bez záznamu) ──────────────
    let chemkyCenaZdroj = 'vyrobni';
    function setChemkyCenaZdroj(z){
      chemkyCenaZdroj = z;
      document.getElementById('chemky-cena-vyrobni').className = 'typ-btn' + (z==='vyrobni' ? ' active-vklad' : '');
      document.getElementById('chemky-cena-vlastni').className = 'typ-btn' + (z==='vlastni' ? ' active-vklad' : '');
      document.getElementById('chemky-cena-zadna').className = 'typ-btn' + (z==='zadna' ? ' active-vyber' : '');
      document.getElementById('chemky-cena-vlastni-row').style.display = z==='vlastni' ? 'grid' : 'none';
      updateChemkyCenaPreview();
    }
    window.setChemkyCenaZdroj = setChemkyCenaZdroj;
    function updateChemkyCenaPreview(){
      const box=document.getElementById('chemky-cena-preview');
      if(!box)return;
      const item=document.getElementById('chemky-chemikalie').value;
      const qty=parseInt(document.getElementById('chemky-mnozstvi').value)||0;
      if(chemkyCenaZdroj==='zadna'){ box.textContent='Bez odečtu z účtu — do skladu se zapíše jen množství.'; return; }
      if(chemkyCenaZdroj==='vlastni'){ box.textContent='Zaplacená částka se rovnou zapíše jako výdaj do Účetnictví.'; return; }
      const p=CHEMKY_CENY[item];
      if(!p){ box.textContent='Pro tuto položku není v ceníku z varny cena — zvol vlastní cenu.'; return; }
      const total=p.cena*qty;
      const sym=p.mena==='sad'?'$':'₱';
      box.textContent=qty+'× '+item+' × '+p.cena+' '+sym+'/ks = '+sym+total+' — odečte se z účtu jako výdaj.';
    }
    document.getElementById('chemky-chemikalie').addEventListener('change',updateChemkyCenaPreview);
    document.getElementById('chemky-mnozstvi').addEventListener('input',updateChemkyCenaPreview);
    setChemkyCenaZdroj('vyrobni');

    async function submitChemky(){
      if(!qtyValid('chemky-mnozstvi'))return showToast('Množství musí být 1–500 ks',true);
      const typ=document.getElementById('chemky-typ').value;
      const chemikalie=document.getElementById('chemky-chemikalie').value;
      const mnozstvi=document.getElementById('chemky-mnozstvi').value;

      const payload={typ,chemikalie,mnozstvi};
      const detaily=[['Typ',typ],['Chemikálie',chemikalie],['Množství',mnozstvi+' ks']];

      if(typ==='VKLAD'){
        payload.cenaZdroj=chemkyCenaZdroj;
        if(chemkyCenaZdroj==='vyrobni'){
          const p=CHEMKY_CENY[chemikalie];
          if(!p) return showToast('Pro tuto položku není v ceníku z varny cena — zvol vlastní cenu',true);
          detaily.push(['Odečte se z účtu', (p.mena==='sad'?'$':'₱')+(p.cena*parseInt(mnozstvi))+' (cena z varny)']);
        } else if(chemkyCenaZdroj==='vlastni'){
          const castka=document.getElementById('chemky-cena-vlastni-castka').value;
          const mena=document.getElementById('chemky-cena-vlastni-mena').value;
          if(!castka||parseFloat(castka)<=0) return showToast('Vyplň zaplacenou částku',true);
          payload.cenaVlastni=castka;
          payload.cenaVlastniMena=mena;
          detaily.push(['Odečte se z účtu', (mena==='USD'?'$':'₱')+castka+' (vlastní cena)']);
        } else {
          detaily.push(['Odečet z účtu', 'žádný']);
        }
      }

      showModal(
        typ==='VKLAD'?'Vložit chemikálii':'Vybrat chemikálii',
        'Potvrzením zapečetíš zápis do rejstříku.',
        detaily,
        async()=>{
          const r=await post('/api/chemky',payload);
          if(r.ok){
            showToast(r.ucetZapis ? ('Chemikálie uložena — z účtu odečteno '+(r.ucetZapis.valuta==='USD'?'$':'₱')+r.ucetZapis.castka) : 'Chemikálie uložena');
            if(r.ucetChyba) showToast(r.ucetChyba,true);
            showUndoBar(typ+' — '+chemikalie+' ('+mnozstvi+' ks)');
            flashActivePanel();refreshSkladData();
          }
          else showToast(r.error,true);
        }
      );
    }

    // ── SMĚNÁRNA ──
    let smenaSmer='usd_to_pesos';
    const SKLAD_UCET={usd:${ucet.usd},pesos:${ucet.pesos}};

    function flipSmena(){
      smenaSmer=smenaSmer==='usd_to_pesos'?'pesos_to_usd':'usd_to_pesos';
      document.getElementById('smenaFlipBtn').classList.toggle('flipped');
      renderSmenaSides();
      updateSmenaPreview();
    }

    function renderSmenaSides(){
      const fromIsUsd=smenaSmer==='usd_to_pesos';
      document.getElementById('smena-from-label').textContent='Z účtu — '+(fromIsUsd?'SAD':'Pesos');
      document.getElementById('smena-to-label').textContent='Na účet — '+(fromIsUsd?'Pesos':'SAD');
      document.getElementById('smena-from-val').textContent=(fromIsUsd?'$':'₱')+(fromIsUsd?SKLAD_UCET.usd:SKLAD_UCET.pesos).toLocaleString('cs-CZ');
      document.getElementById('smena-to-val').textContent=(fromIsUsd?'₱':'$')+(fromIsUsd?SKLAD_UCET.pesos:SKLAD_UCET.usd).toLocaleString('cs-CZ');
      document.getElementById('smena-amount-label').textContent='Částka k směně ('+(fromIsUsd?'SAD':'Pesos')+')';
    }
    renderSmenaSides();

    function updateSmenaPreview(){
      const amount=parseFloat(document.getElementById('smena-castka').value)||0;
      const fromIsUsd=smenaSmer==='usd_to_pesos';
      const symFrom=fromIsUsd?'$':'₱';
      const symTo=fromIsUsd?'₱':'$';
      document.getElementById('smena-preview-from').textContent=symFrom+amount.toLocaleString('cs-CZ');
      document.getElementById('smena-preview-to').textContent=symTo+amount.toLocaleString('cs-CZ');
    }
    updateSmenaPreview();

    async function submitSmena(){
      const castka=document.getElementById('smena-castka').value;
      if(!castka||parseFloat(castka)<=0)return showToast('Vyplň platnou částku',true);
      const fromIsUsd=smenaSmer==='usd_to_pesos';
      const zText=fromIsUsd?'SAD':'Pesos', naText=fromIsUsd?'Pesos':'SAD';
      const symFrom=fromIsUsd?'$':'₱', symTo=fromIsUsd?'₱':'$';
      showModal(
        'Provést směnu měn',
        'Kurz 1:1 — částka se odečte z jednoho účtu a stejná hodnota se přičte na druhý.',
        [['Směr',zText+' → '+naText],['Směněno',symFrom+castka],['Obdrženo',symTo+castka],['Kurz','1:1']],
        async()=>{
          const r=await post('/api/smena',{smer:smenaSmer,castka});
          if(r.ok){showToast('Směna provedena — '+symFrom+castka+' → '+symTo+castka);document.getElementById('smena-castka').value='';flashActivePanel();refreshSkladData();}
          else showToast(r.error,true);
        }
      );
    }

    // ── CENÍK ──
    const CAN_MANAGE=${canManage};
    function addCenikRow(){
      const wrap=document.querySelector('#cenik-categories .cenik-cat:last-child .cenik-rows');
      if(!wrap)return;
      const div=document.createElement('div');
      div.className='cenik-row';
      div.innerHTML='<input type="text" class="cenik-label-input" placeholder="Název položky">'+
        '<input type="text" class="cenik-cena-input" placeholder="Cena">'+
        '<button type="button" class="cenik-row-del" onclick="this.closest(\\'.cenik-row\\').remove()" title="Smazat řádek">✕</button>';
      wrap.appendChild(div);
      div.querySelector('.cenik-label-input').focus();
    }
    window.addCenikRow=addCenikRow;
    async function saveCenik(){
      if(!CAN_MANAGE)return;
      const categories=[...document.querySelectorAll('#cenik-categories .cenik-cat')].map(catEl=>{
        const label=catEl.querySelector('.panel-list-label').textContent;
        const rows=[...catEl.querySelectorAll('.cenik-row')].map(r=>({
          label:r.querySelector('.cenik-label-input').value.trim(),
          cena:r.querySelector('.cenik-cena-input').value.trim(),
        })).filter(r=>r.label);
        return {label,rows};
      });
      const res=await fetch('/api/cenik',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({categories})});
      const data=await res.json();
      if(data.ok){showToast('Ceník uložen');flashActivePanel();}else showToast(data.error||'Chyba',true);
    }
    window.saveCenik=saveCenik;

    // ── SPRÁVA KATALOGU POLOŽEK ──
    const PRAH_SEKCE = { zbrane:'zbrane', weed:'weed', drogy:'drogy', chemky:'chemky' };

    async function openKatalogModal(kategorie){
      if(window.albionPaper)window.albionPaper();
      document.getElementById('katalog-kategorie').value=kategorie;
      document.getElementById('katalog-polozka').value='';
      renderKatalogList();
      await nactiPrahProKategorii();
      document.getElementById('katalogModal').classList.add('open');
    }
    window.openKatalogModal=openKatalogModal;
    function closeKatalogModal(){document.getElementById('katalogModal').classList.remove('open');}
    window.closeKatalogModal=closeKatalogModal;
    function renderKatalogList(){
      const kat=document.getElementById('katalog-kategorie').value;
      const items=KATALOG[kat]||[];
      const list=document.getElementById('katalog-list');
      if(!items.length){list.innerHTML='<div style="color:var(--ivory-faint);font-size:0.8rem;padding:0.5rem 0">Zatím žádné vlastní položky v této kategorii.</div>';return;}
      list.innerHTML=items.map(i=>
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:0.8rem;gap:0.4rem">'+
          '<span style="flex:1">'+i.replace(/</g,'&lt;')+'</span>'+
          '<button type="button" onclick="renameKatalogItem(\\''+kat+'\\',\\''+i.replace(/'/g,"\\\\'")+'\\')" style="background:none;border:1px solid var(--border-brass);color:var(--brass);width:26px;height:26px;cursor:pointer" title="Přejmenovat">✎</button>'+
          '<button type="button" onclick="removeKatalogItem(\\''+kat+'\\',\\''+i.replace(/'/g,"\\\\'")+'\\')" style="background:none;border:1px solid var(--border-oxblood);color:var(--oxblood-bright);width:26px;height:26px;cursor:pointer">✕</button>'+
        '</div>'
      ).join('');
    }
    async function nactiPrahProKategorii(){
      const kat=document.getElementById('katalog-kategorie').value;
      const sekce=PRAH_SEKCE[kat];
      const oddel=document.getElementById('prah-oddelovac'), sekcePrah=document.getElementById('prah-sekce');
      if(!sekce){oddel.style.display='none';sekcePrah.style.display='none';return;}
      oddel.style.display='';sekcePrah.style.display='';
      try{
        const res=await fetch('/api/thresholds');
        const data=await res.json();
        document.getElementById('prah-hodnota').value=(data.prahy&&data.prahy[sekce]!=null)?data.prahy[sekce]:'';
      }catch(e){}
    }
    async function ulozPrah(){
      const kat=document.getElementById('katalog-kategorie').value;
      const sekce=PRAH_SEKCE[kat];
      const prah=document.getElementById('prah-hodnota').value;
      if(!sekce)return;
      const res=await fetch('/api/thresholds',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({sekce,prah})});
      const data=await res.json();
      if(data.ok)showToast('Práh nízkých zásob uložen');
      else showToast(data.error||'Chyba',true);
    }
    window.ulozPrah=ulozPrah;
    document.getElementById('katalog-kategorie').addEventListener('change',()=>{renderKatalogList();nactiPrahProKategorii();});
    async function submitKatalog(){
      const kategorie=document.getElementById('katalog-kategorie').value;
      const polozka=document.getElementById('katalog-polozka').value.trim();
      if(!polozka)return showToast('Vyplň název položky',true);
      const res=await fetch('/api/sklad/katalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kategorie,polozka})});
      const data=await res.json();
      if(data.ok){showToast('Položka přidána — obnovuji stránku…');setTimeout(()=>location.reload(),1000);}
      else showToast(data.error||'Chyba',true);
    }
    window.submitKatalog=submitKatalog;
    async function renameKatalogItem(kategorie,stara){
      const nova=prompt('Nový název položky:',stara);
      if(!nova||nova.trim()===''||nova.trim()===stara)return;
      const res=await fetch('/api/sklad/katalog',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({kategorie,stara,nova:nova.trim()})});
      const data=await res.json();
      if(data.ok){showToast('Položka přejmenována — obnovuji stránku…');setTimeout(()=>location.reload(),1000);}
      else showToast(data.error||'Chyba',true);
    }
    window.renameKatalogItem=renameKatalogItem;
    async function removeKatalogItem(kategorie,polozka){
      if(!confirm('Odebrat položku "'+polozka+'" z katalogu?'))return;
      const res=await fetch('/api/sklad/katalog',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({kategorie,polozka})});
      const data=await res.json();
      if(data.ok){showToast('Položka odebrána — obnovuji stránku…');setTimeout(()=>location.reload(),1000);}
      else showToast(data.error||'Chyba',true);
    }
    window.removeKatalogItem=removeKatalogItem;
    document.getElementById('katalogModal').addEventListener('click',(e)=>{if(e.target===e.currentTarget)closeKatalogModal();});
  </script>
  </body></html>`;
}

module.exports = { renderDashboard };
