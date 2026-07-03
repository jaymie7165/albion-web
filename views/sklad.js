// sklad.js — Albion v4 · Heraldický sklad, přehledný tab-layout

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

  const formatSklad = (obj, ceny) => {
    const entries = Object.entries(obj).filter(([,q]) => q > 0);
    if (!entries.length) return ledgerEmpty('Sklad prázdný', true);
    return entries.map(([item, qty]) => {
      const hodnota = ceny && ceny[item] ? qty * ceny[item].prodej : null;
      return `<div class="sklad-row"><span>${item}</span><span>${qty} ks${hodnota ? ` <em>$${hodnota}</em>` : ''}</span></div>`;
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
          <span style="width:4px;height:4px;background:${isIn?'#6FBF52':'var(--oxblood-bright)'};flex-shrink:0"></span>
          ${pozn||'—'}
        </span>
        <span style="color:${isIn?'#6FBF52':'var(--oxblood-bright)'}">
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

  const sekceMeta = [
    { id: 'ucet',   label: 'Účetnictví', sub: 'Finance',     icon: '◉' },
    { id: 'smena',  label: 'Směnárna',   sub: 'SAD ⇄ Pesos', icon: '⇄' },
    { id: 'zbrane', label: 'Zbraně',     sub: 'Sklad',       icon: '⚔' },
    { id: 'weed',   label: 'Weed',       sub: 'Sklad',       icon: '◈' },
    { id: 'drogy',  label: 'Drogy',      sub: 'Sklad',       icon: '◆' },
    { id: 'chemky', label: 'Chemikálie', sub: 'Sklad',       icon: '⬡' },
    { id: 'cenik',  label: 'Ceník',      sub: 'Referenční ceny', icon: '$' },
  ];

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Albion — Sklad</title>
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
       TAB LAYOUT — sidebar sekcí + jedna aktivní karta
       Mnohem přehlednější než dříve (6 karet najednou v gridu)
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

    .sklad-panel{display:none;animation:fadeReveal 0.3s ease-out 1}
    .sklad-panel.active{display:block}

    .panel-card{
      background:var(--panel2);border:1px solid var(--border-brass);
      padding:2rem 2.2rem;box-shadow:var(--shadow-card);position:relative;
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

    /* ── SMĚNÁRNA — speciální vizuál ── */
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
    .cenik-row-del:hover{background:var(--oxblood-faint,rgba(110,20,35,0.15))}

    @media(max-width:980px){
      .sklad-shell{grid-template-columns:1fr}
      .sklad-sidebar{
        position:static;display:grid;grid-template-columns:repeat(3,1fr);
      }
      .sklad-sidebar-item{flex-direction:column;text-align:center;gap:0.4rem;padding:0.9rem 0.6rem;border-left:none;border-bottom:1px solid var(--border)}
      .sklad-sidebar-item.active{border-left:none;border-bottom:2px solid var(--oxblood)}
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
        <p>Eviduj pohyb zbraní, weedu, drog, chemikálií, financí a směn. Každý zápis se ihned promítne do tabulky a odešle na Discord.</p>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="sklad-clock" id="live-clock">--:--:--</div>
        <div class="sklad-clock-date" id="live-date"></div>
      </div>
    </div>

    <!-- Tally strip -->
    <div class="tally-strip">
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
        <div class="tally-cell-val" style="color:#7A9A4A">${Object.values(weed).filter(q=>q>0).reduce((a,b)=>a+b,0)} ks</div>
      </div>
      <div class="tally-cell">
        <div class="tally-cell-label">Drogy</div>
        <div class="tally-cell-val" style="color:var(--oxblood-bright)">${Object.values(drogy).filter(q=>q>0).reduce((a,b)=>a+b,0)} ks</div>
      </div>
      <div class="tally-cell">
        <div class="tally-cell-label">Chemikálie</div>
        <div class="tally-cell-val" style="color:#6FA8C9">${Object.values(chemky||{}).filter(q=>q>0).reduce((a,b)=>a+b,0)} ks</div>
      </div>
      <div class="tally-cell">
        <div class="tally-cell-label">Hodnota weedu</div>
        <div class="tally-cell-val" style="color:var(--brass)">$${totalValue.toLocaleString('cs-CZ')}</div>
      </div>
    </div>

    <!-- ── TAB SHELL ── -->
    <div class="sklad-shell">

      <!-- Sidebar -->
      <div class="sklad-sidebar" id="skladSidebar">
        ${sekceMeta.map((s, i) => `
          <div class="sklad-sidebar-item${i===0?' active':''}" data-panel="${s.id}" onclick="skladTab('${s.id}')">
            <div class="sklad-sidebar-icon">${s.icon}</div>
            <div class="sklad-sidebar-text">
              <div class="sklad-sidebar-label">${s.label}</div>
              <div class="sklad-sidebar-sub">${s.sub}</div>
            </div>
          </div>`).join('')}
      </div>

      <!-- Panely -->
      <div>

        <!-- Účetnictví -->
        <div class="sklad-panel active" id="panel-ucet">
          <div class="panel-card">
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
              Převod mezi účtem SAD a Pesos uvnitř organizace. Směna je v kurzu <strong style="color:var(--brass-bright)">1:1</strong> — na jednom účtu se částka odečte, na druhém přičte. Zapisuje se jako výdaj + příjem do účetnictví.
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
                ${formatSklad(zbrane, null)}
              </div>
              <div>
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
                  <div class="form-group"><label>Množství</label><input type="number" id="zbrane-mnozstvi" min="1" value="1"></div>
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
                ${formatSklad(weed, {"Žlutý kanabis":{prodej:150},"Zelený kanabis":{prodej:150},"Kanabis":{prodej:150},"Červený kanabis":{prodej:150},"Modrý kanabis":{prodej:150}})}
              </div>
              <div>
                <div class="typ-toggle">
                  <button class="typ-btn active-vklad" onclick="setTyp('weed','VKLAD',this)">Uložit</button>
                  <button class="typ-btn" onclick="setTyp('weed','VÝBĚR',this)">Vybrat</button>
                </div>
                <input type="hidden" id="weed-typ" value="VKLAD">
                <div class="form-row">
                  <div class="form-group select-wrap"><label>Odrůda</label><select id="weed-odruda" class="select-expandable"><option>Žlutý kanabis</option><option>Zelený kanabis</option><option>Kanabis</option><option>Červený kanabis</option><option>Modrý kanabis</option></select><span class="select-count-badge">5</span></div>
                  <div class="form-group"><label>Množství</label><input type="number" id="weed-mnozstvi" min="1" value="1"></div>
                </div>
                <div class="info-box" id="weed-info"></div>
                <button class="btn-submit" onclick="submitWeed()">Potvrdit akci</button>
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
                ${formatSklad(drogy, null)}
              </div>
              <div>
                <div class="typ-toggle">
                  <button class="typ-btn active-vklad" onclick="setTyp('drogy','VKLAD',this)">Uložit</button>
                  <button class="typ-btn" onclick="setTyp('drogy','VÝBĚR',this)">Vybrat</button>
                </div>
                <input type="hidden" id="drogy-typ" value="VKLAD">
                <div class="form-row">
                  <div class="form-group select-wrap"><label>Droga</label><select id="drogy-droga" class="select-expandable"><option>Kapky</option><option>Kokain</option><option>Extáze</option><option>Metamfetamin</option><option>Benzo</option><option>Joyka</option><option>Heroin</option><option>Speed</option><option>LSD</option></select><span class="select-count-badge">9</span></div>
                  <div class="form-group"><label>Množství</label><input type="number" id="drogy-mnozstvi" min="1" value="1"></div>
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
                ${formatSklad(chemky||{}, null)}
              </div>
              <div>
                <div class="typ-toggle">
                  <button class="typ-btn active-vklad" onclick="setTyp('chemky','VKLAD',this)">Uložit</button>
                  <button class="typ-btn" onclick="setTyp('chemky','VÝBĚR',this)">Vybrat</button>
                </div>
                <input type="hidden" id="chemky-typ" value="VKLAD">
                <div class="form-row">
                  <div class="form-group select-wrap"><label>Chemikálie</label><select id="chemky-chemikalie" class="select-expandable"><option>Aceton</option><option>Peroxid vodíku</option><option>Kofein</option><option>Propylenglykol</option><option>Toluen</option><option>Benzín</option><option>Bismut</option><option>Kyselina fosforečná</option></select><span class="select-count-badge">8</span></div>
                  <div class="form-group"><label>Množství</label><input type="number" id="chemky-mnozstvi" min="1" value="1"></div>
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
            <p style="font-family:var(--font-body);font-size:0.82rem;color:var(--ivory-faint);line-height:1.7;margin-bottom:1.4rem;max-width:640px">
              Referenční výkupní a prodejní ceny. ${canManage ? 'Uprav hodnoty přímo v tabulce a klikni na <strong style="color:var(--brass-bright)">Uložit ceník</strong>.' : 'Upravovat může jen Founder/Council.'}
            </p>
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
  <div class="toast" id="toast"></div>

  <script>
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
    }
    (function restoreTab(){
      try{
        const saved=localStorage.getItem('albion_sklad_tab');
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

    // Sklad logika
    const ZBRANE=["Pump Shotgun","Pistol MK2","Pistol","Combat Pistol","Double Action Revolver","Navy Revolver","Vintage Pistol","Gusenberg","Dlouhé"];
    const NABOJE=["9mm","9mm Mk2",".75cal",".50cal","12-gauge"];
    const AKCE=["Malá C4","Velká C4","Přístupová karta","Pokročilá zvláštní karta","EMP zařízení","Řezací laser","Cable Cutter","Zvláštní karta"];
    const WEED_CENY={"Žlutý kanabis":{vyroba:100,prodej:150},"Zelený kanabis":{vyroba:100,prodej:150},"Kanabis":{vyroba:100,prodej:150},"Červený kanabis":{vyroba:100,prodej:150},"Modrý kanabis":{vyroba:100,prodej:150}};
    const DROGY_LIST=["Kapky","Kokain","Extáze","Metamfetamin","Benzo","Joyka","Heroin","Speed","LSD"];
    const CHEMKY_LIST=["Aceton","Peroxid vodíku","Kofein","Propylenglykol","Toluen","Benzín","Bismut","Kyselina fosforečná"];

    // ── Sloučení vlastních položek katalogu (přidaných přes "Spravovat položky") ──
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
        '<input type="number" class="bulk-qty" min="1" value="1" style="flex:1">'+
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
      if(r.ok){showToast('Hromadný zápis uložen ('+r.count+' položek)');closeBulkModal();setTimeout(()=>location.reload(),1200);}
      else showToast(r.error,true);
    }

    function setTyp(prefix,typ,btn){
      document.getElementById(prefix+'-typ').value=typ;
      btn.parentElement.querySelectorAll('.typ-btn').forEach(b=>b.className='typ-btn');
      btn.className='typ-btn '+(typ==='VKLAD'||typ==='PŘÍJEM'?'active-vklad':'active-vyber');
      if(prefix==='zbrane')document.getElementById('zbrane-ucel-wrap').style.display=typ==='VÝBĚR'?'flex':'none';
    }

    async function post(url,data){
      const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      return res.json();
    }

    async function submitZbrane(){
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
          if(r.ok){showToast('Zápis uložen');setTimeout(()=>location.reload(),1500);}
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
      box.innerHTML='Výroba: ~$'+(c.vyroba*qty)+'&ensp;·&ensp;Prodej: $'+(c.prodej*qty);
    }
    document.getElementById('weed-odruda').addEventListener('change',updateWeedInfo);
    document.getElementById('weed-mnozstvi').addEventListener('input',updateWeedInfo);
    updateWeedInfo();

    async function submitWeed(){
      const typ=document.getElementById('weed-typ').value;
      const odruda=document.getElementById('weed-odruda').value;
      const mnozstvi=document.getElementById('weed-mnozstvi').value;
      const c=WEED_CENY[odruda]||{vyroba:100,prodej:150};
      showModal(
        typ==='VKLAD'?'Vložit weed':'Vybrat weed',
        'Potvrzením zapečetíš zápis do rejstříku.',
        [['Typ',typ],['Odrůda',odruda],['Množství',mnozstvi+' ks'],['Výroba','~$'+(c.vyroba*mnozstvi)],['Prodej','$'+(c.prodej*mnozstvi)]],
        async()=>{
          const r=await post('/api/weed',{typ,odruda,mnozstvi});
          if(r.ok){showToast('Weed uložen — Výroba: ~$'+r.celkVyroba+' · Prodej: $'+r.celkProdej);setTimeout(()=>location.reload(),2000);}
          else showToast(r.error,true);
        }
      );
    }

    async function submitDrogy(){
      const typ=document.getElementById('drogy-typ').value;
      const droga=document.getElementById('drogy-droga').value;
      const mnozstvi=document.getElementById('drogy-mnozstvi').value;
      showModal(
        typ==='VKLAD'?'Vložit drogy':'Vybrat drogy',
        'Potvrzením zapečetíš zápis do rejstříku.',
        [['Typ',typ],['Droga',droga],['Množství',mnozstvi+' ks']],
        async()=>{
          const r=await post('/api/drogy',{typ,droga,mnozstvi});
          if(r.ok){showToast('Drogy uloženy');setTimeout(()=>location.reload(),1500);}
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
        'Tato transakce bude zapsána do účetnictví organizace.',
        [['Typ',typ],['Částka',sym+castka],['Valuta',valuta],['Poznámka',poznamka]],
        async()=>{
          const r=await post('/api/ucet',{typ,castka,valuta,poznamka});
          if(r.ok){showToast('Transakce zaznamenána');setTimeout(()=>location.reload(),1500);}
          else showToast(r.error,true);
        }
      );
    }

    async function submitChemky(){
      const typ=document.getElementById('chemky-typ').value;
      const chemikalie=document.getElementById('chemky-chemikalie').value;
      const mnozstvi=document.getElementById('chemky-mnozstvi').value;
      showModal(
        typ==='VKLAD'?'Vložit chemikálii':'Vybrat chemikálii',
        'Potvrzením zapečetíš zápis do rejstříku.',
        [['Typ',typ],['Chemikálie',chemikalie],['Množství',mnozstvi+' ks']],
        async()=>{
          const r=await post('/api/chemky',{typ,chemikalie,mnozstvi});
          if(r.ok){showToast('Chemikálie uložena');setTimeout(()=>location.reload(),1500);}
          else showToast(r.error,true);
        }
      );
    }

    // ── SMĚNÁRNA ──
    let smenaSmer='usd_to_pesos'; // 'usd_to_pesos' | 'pesos_to_usd'
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
          if(r.ok){showToast('Směna provedena — '+symFrom+castka+' → '+symTo+castka);setTimeout(()=>location.reload(),1500);}
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
      if(data.ok)showToast('Ceník uložen');else showToast(data.error||'Chyba',true);
    }
    window.saveCenik=saveCenik;

    // ── SPRÁVA KATALOGU POLOŽEK ──
    function openKatalogModal(kategorie){
      document.getElementById('katalog-kategorie').value=kategorie;
      document.getElementById('katalog-polozka').value='';
      renderKatalogList();
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
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:0.8rem">'+
          '<span>'+i.replace(/</g,'&lt;')+'</span>'+
          '<button type="button" onclick="removeKatalogItem(\\''+kat+'\\',\\''+i.replace(/'/g,"\\\\'")+'\\')" style="background:none;border:1px solid var(--border-oxblood);color:var(--oxblood-bright);width:26px;height:26px;cursor:pointer">✕</button>'+
        '</div>'
      ).join('');
    }
    document.getElementById('katalog-kategorie').addEventListener('change',renderKatalogList);
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
