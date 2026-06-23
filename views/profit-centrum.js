// profit-centrum.js — extracted view module

const { baseStyles } = require('./styles');
const { renderNav } = require('./nav');

function renderProfitCentrum(req) {
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Profit centrum</title>
  ${baseStyles()}
  <style>
    .pc-podium{text-align:left;padding:1.6rem 0 1.2rem;border-bottom:2px solid var(--border-brass)}
    .pc-podium-icon{font-family:var(--font-display);font-size:1.3rem;margin-bottom:0.5rem;color:var(--brass);width:2.2rem;height:2.2rem;border:1px solid var(--border-brass);border-radius:50%;display:flex;align-items:center;justify-content:center}
    .pc-podium-name{font-family:var(--font-display);font-weight:600;font-size:1.3rem;color:var(--vellum-bright);margin-bottom:0.3rem;min-height:1.5rem;line-height:1.15}
    .pc-podium-value{font-size:2.1rem;color:var(--brass);font-weight:700;font-family:var(--font-display);line-height:1}
    .pc-podium-sub{font-size:0.64rem;color:var(--text-muted);margin-top:0.5rem;text-transform:uppercase;letter-spacing:0.12em;font-family:var(--font-mono)}
    .pc-rank-row{display:flex;align-items:baseline;gap:0.7rem;font-size:0.84rem;padding:0.55rem 0;border-bottom:1px solid var(--border)}
    .pc-rank-row:last-child{border-bottom:none}
    .pc-rank-num{flex:0 0 1.4rem;color:var(--text-muted);font-size:0.68rem;font-family:var(--font-mono)}
    .pc-rank-name{flex:1;color:var(--vellum);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-display)}
    .pc-rank-val{flex:0 0 auto;color:var(--text-dim);font-weight:600;font-family:var(--font-mono);font-size:0.8rem}
    .pc-leaderboard-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
    .pc-leaderboard-col{padding:0 2rem}
    .pc-leaderboard-col:first-child{padding-left:0}
    .pc-leaderboard-col:last-child{padding-right:0}
    .pc-leaderboard-col + .pc-leaderboard-col{border-left:1px solid var(--border)}
    @media(max-width:900px){
      .pc-leaderboard-grid{grid-template-columns:1fr;border-top:none;border-bottom:none}
      .pc-leaderboard-col{padding:1.4rem 0;border-top:1px solid var(--border)}
      .pc-leaderboard-col + .pc-leaderboard-col{border-left:none}
      .pc-leaderboard-col:first-child{border-top:none}
    }
  </style>
  </head><body>
  ${renderNav(req, 'profit-centrum')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Albion — Blackbook</div>
        <h1 class="page-title">Profit centrum</h1>
        <p class="page-sub">Přehled ziskovosti organizace — počítáno z účetnictví a skladů</p>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div id="pc-generated" style="font-size:0.64rem;letter-spacing:0.1em;color:var(--text-muted);text-transform:uppercase;font-family:var(--font-mono)"></div>
      </div>
    </div>
    <p class="folio-footnote"><strong>Profit centrum.</strong> Report se počítá výhradně z reálných dat z webu — Účetnictví (peníze) a sklady Drogy/Weed. „Zisk frakce“ = příjem − výdaj v Účetnictví za dané období. „Tržby ze skladu“ = hodnota vybraných (prodaných) drog a weedu dle aktuálního ceníku.</p>

    <div id="pc-loading" class="ledger-loading">Generuji report…</div>

    <div id="pc-content" style="display:none">
      <div class="folio-label">Kolik vydělala frakce</div>
      <div class="report-figures" id="pc-earn-cards"></div>

      <div class="folio-rule tight"></div>

      <div class="report-nav" id="pc-period-nav">
        <button class="report-nav-item" data-p="day" onclick="pcTab('day')">Dnes</button>
        <button class="report-nav-item" data-p="week" onclick="pcTab('week')">Tento týden</button>
        <button class="report-nav-item" data-p="month" onclick="pcTab('month')">Tento měsíc</button>
        <button class="report-nav-item active" data-p="total" onclick="pcTab('total')">Celkem</button>
      </div>
      <div style="height:1.6rem"></div>

      <div class="pc-leaderboard-grid">
        <div class="pc-leaderboard-col">
          <div class="pc-podium" id="pc-dealer-top"></div>
          <div id="pc-dealer-list"></div>
        </div>
        <div class="pc-leaderboard-col">
          <div class="pc-podium" id="pc-drug-top"></div>
          <div id="pc-drug-list"></div>
        </div>
        <div class="pc-leaderboard-col">
          <div class="pc-podium" id="pc-member-top"></div>
          <div id="pc-member-list"></div>
        </div>
      </div>
    </div>
  </main>
  <script>
    let PD = null;
    let pcPeriod = 'total';
    const money = n => '$' + Math.round(n||0).toLocaleString('cs-CZ');
    const pesos = n => '₱' + Math.round(n||0).toLocaleString('cs-CZ');
    const esc = s => (s==null?'':String(s)).replace(/</g,'&lt;');

    function earnFigure(title, p) {
      const zisk = p.zisk;
      const color = zisk >= 0 ? '#6FBF52' : 'var(--blood)';
      let h = '<div class="report-figure">';
      h += '<div class="report-figure-label">' + esc(title) + '</div>';
      h += '<div class="report-figure-net" style="color:' + color + '">' + (zisk>=0?'+':'') + money(zisk) + '</div>';
      h += '<div class="report-figure-line"><span>Příjem</span><strong style="color:#6FBF52">' + money(p.prijem_usd) + '</strong></div>';
      h += '<div class="report-figure-line"><span>Výdaj</span><strong style="color:#B23B3B">' + money(p.vydaj_usd) + '</strong></div>';
      if (p.prijem_pesos || p.vydaj_pesos) {
        h += '<div class="report-figure-line"><span>Pesos</span><strong>' + pesos(p.prijem_pesos) + ' / ' + pesos(p.vydaj_pesos) + '</strong></div>';
      }
      h += '<div class="report-figure-line" style="border-top:1px dotted var(--border);padding-top:0.3rem;margin-top:0.2rem"><span>Tržby skladu</span><strong style="color:var(--brass)">' + money(p.trzby_sklad) + '</strong></div>';
      h += '</div>';
      return h;
    }

    function rankList(rows, nameKey, valKey, emptyTxt) {
      if (!rows.length) return ledgerEmptyHTML(emptyTxt, true);
      return rows.slice(0, 6).map(function(r, i) {
        return '<div class="pc-rank-row"><span class="pc-rank-num">' + String(i+1).padStart(2,'0') + '</span><span class="pc-rank-name">' + esc(r[nameKey]) + '</span><span class="pc-rank-val">' + money(r[valKey]) + '</span></div>';
      }).join('');
    }

    function podium(icon, name, value, sub) {
      const nameHtml = name ? esc(name) : '<span style="color:var(--text-muted);font-style:italic">— žádná data —</span>';
      return '<div class="pc-podium-icon">' + icon + '</div>' +
        '<div class="pc-podium-name">' + nameHtml + '</div>' +
        '<div class="pc-podium-value">' + value + '</div>' +
        '<div class="pc-podium-sub">' + sub + '</div>';
    }

    function renderEarnCards() {
      const p = PD.periods;
      document.getElementById('pc-earn-cards').innerHTML =
        earnFigure('Dnes', p.day) + earnFigure('Tento týden', p.week) + earnFigure('Tento měsíc', p.month) + earnFigure('Celkem', p.total);
    }

    function renderLeaderboards() {
      const lb = PD.leaderboards[pcPeriod];

      const d0 = lb.dealers[0];
      document.getElementById('pc-dealer-top').innerHTML = podium('§', d0 ? d0.member : null, d0 ? money(d0.trzby) : '—', d0 ? (d0.qty + ' ks prodáno · Nejlepší dealer') : 'Nejlepší dealer');
      document.getElementById('pc-dealer-list').innerHTML = rankList(lb.dealers, 'member', 'trzby', 'Žádné prodeje v tomto období');

      const dr0 = lb.drugs[0];
      document.getElementById('pc-drug-top').innerHTML = podium('◆', dr0 ? dr0.droga : null, dr0 ? money(dr0.trzby) : '—', dr0 ? (dr0.qty + ' ks prodáno · Nejvýdělečnější droga') : 'Nejvýdělečnější droga');
      document.getElementById('pc-drug-list').innerHTML = rankList(lb.drugs, 'droga', 'trzby', 'Žádné prodeje v tomto období');

      const m0 = lb.members[0];
      document.getElementById('pc-member-top').innerHTML = podium('I', m0 ? m0.member : null, m0 ? money(m0.net) : '—', 'Čistý přínos do účtu (SAD)');
      document.getElementById('pc-member-list').innerHTML = rankList(lb.members, 'member', 'net', 'Žádná data v tomto období');
    }

    function pcTab(p) {
      pcPeriod = p;
      document.querySelectorAll('#pc-period-nav .report-nav-item').forEach(function(b){ b.classList.toggle('active', b.dataset.p === p); });
      renderLeaderboards();
    }

    async function loadProfitCentrum() {
      try {
        const res = await fetch('/api/profit-centrum', { cache: 'no-store' });
        PD = await res.json();
        if (!PD.ok) { document.getElementById('pc-loading').textContent = 'Chyba načtení dat: ' + (PD.error||'neznámá'); return; }
        document.getElementById('pc-loading').style.display = 'none';
        document.getElementById('pc-content').style.display = 'block';
        document.getElementById('pc-generated').textContent = 'Vygenerováno ' + (PD.generatedAt||'');
        renderEarnCards();
        renderLeaderboards();
      } catch (e) {
        document.getElementById('pc-loading').textContent = 'Chyba: ' + e.message;
      }
    }
    loadProfitCentrum();
    setInterval(loadProfitCentrum, 60000);
  </script>
  </body></html>`;
}

module.exports = { renderProfitCentrum };

