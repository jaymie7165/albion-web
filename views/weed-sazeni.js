// weed-sazeni.js — extracted view module

const { baseStyles } = require('./styles');
const { renderNav } = require('./nav');
const { WEED_PLANT } = require('../constants');

function renderWeedSazeni(req) {
  const icName = req.session.icName;
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Weed sázení</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'weed-sazeni')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Albion — Sklad</div>
        <h1 class="page-title">Weed sázení</h1>
        <p class="page-sub">Ceník, kalkulačka materiálu a sdílené odpočty růstu</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Pěstování weedu.</strong> Na jednu kytku potřebuješ daný materiál. Z jedné kytky vzniknou <strong>${WEED_PLANT.bagsPerPlant} sáčky</strong> (1 sáček = $${WEED_PLANT.bagPrice}). Kytka roste <strong>${WEED_PLANT.growHours} hodin</strong>. Kalkulačka spočítá materiál i zisk podle počtu kytek nebo rozpočtu. Spuštěné odpočty vidí všichni členové.</p>

    <div class="stats" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat"><div class="stat-label">Náklad / kytka</div><div class="stat-value">$${WEED_PLANT.costPerPlant}</div><div class="stat-sub">materiál</div></div>
      <div class="stat" style="border-top-color:var(--gold)"><div class="stat-label">Tržba / kytka</div><div class="stat-value" style="color:var(--gold)">$${WEED_PLANT.revenuePerPlant}</div><div class="stat-sub">${WEED_PLANT.bagsPerPlant} × $${WEED_PLANT.bagPrice}</div></div>
      <div class="stat" style="border-top-color:#6FBF52"><div class="stat-label">Zisk / kytka</div><div class="stat-value" style="color:#6FBF52">$${WEED_PLANT.profitPerPlant}</div><div class="stat-sub">tržba − náklad</div></div>
      <div class="stat" style="border-top-color:#6FA8C9"><div class="stat-label">Doba růstu</div><div class="stat-value" style="color:#6FA8C9">${WEED_PLANT.growHours}h</div><div class="stat-sub">na 1 kytku</div></div>
    </div>

    <div class="grid" style="grid-template-columns:1fr 1fr">
      <!-- CENÍK -->
      <div class="card">
        <div class="card-header"><span class="card-title">Ceník na 1 kytku</span><span class="card-badge">Materiál</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Položka</th><th style="text-align:center">Množství</th><th style="text-align:right">Cena/ks</th><th style="text-align:right">Celkem</th></tr></thead>
            <tbody>
              ${WEED_PLANT.items.map(it => `<tr><td>${it.name}</td><td style="text-align:center">${it.qty}×</td><td style="text-align:right;color:var(--text-muted)">$${it.unit}</td><td style="text-align:right;color:var(--gold)">$${it.cost}</td></tr>`).join('')}
              <tr style="border-top:2px solid var(--border-gold)"><td style="font-weight:600">Celkem</td><td></td><td></td><td style="text-align:right;font-weight:700;color:var(--gold)">$${WEED_PLANT.costPerPlant}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="info-box" style="display:block;margin-top:1rem">Výnos: 1 kytka → ${WEED_PLANT.bagsPerPlant} sáčky × $${WEED_PLANT.bagPrice} = <strong style="color:var(--gold)">$${WEED_PLANT.revenuePerPlant}</strong> &ensp;|&ensp; čistý zisk <strong style="color:#6FBF52">$${WEED_PLANT.profitPerPlant}</strong></div>
      </div>

      <!-- KALKULAČKA -->
      <div class="card">
        <div class="card-header"><span class="card-title">Kalkulačka</span><span class="card-badge">Výpočet</span></div>
        <div class="form-row">
          <div class="form-group"><label>Počet kytek</label><input type="number" id="calc-plants" min="0" value="1"></div>
          <div class="form-group"><label>Rozpočet $ (volitelné)</label><input type="number" id="calc-budget" min="0" placeholder="napiš peníze"></div>
        </div>
        <div class="table-wrap" style="margin-top:0.5rem">
          <table>
            <thead><tr><th>Materiál</th><th style="text-align:right">Potřeba</th></tr></thead>
            <tbody id="calc-mat"></tbody>
          </table>
        </div>
        <div class="stats" style="grid-template-columns:repeat(3,1fr);margin-top:1rem">
          <div class="stat"><div class="stat-label">Náklad</div><div class="stat-value" id="calc-cost" style="font-size:1.2rem">$0</div></div>
          <div class="stat" style="border-top-color:var(--brass)"><div class="stat-label">Tržba</div><div class="stat-value" id="calc-rev" style="font-size:1.2rem;color:var(--brass)">$0</div></div>
          <div class="stat" style="border-top-color:#6FBF52"><div class="stat-label">Zisk</div><div class="stat-value" id="calc-profit" style="font-size:1.2rem;color:#6FBF52">$0</div></div>
        </div>
        <div class="info-box" id="calc-note" style="display:block;margin-top:1rem"></div>
      </div>
    </div>

    <!-- ODPOČTY -->
    <div class="card" style="margin-top:0.5rem">
      <div class="card-header"><span class="card-title">Odpočty růstu</span><span class="card-badge">Sdílené — vidí všichni</span></div>
      <div class="form-row">
        <div class="form-group"><label>IC jméno</label><input type="text" id="t-icname" value="${icName ? icName.replace(/"/g,'&quot;') : ''}" placeholder="Jméno postavy"></div>
        <div class="form-group"><label>Postal (4 číslice)</label><input type="text" id="t-postal" maxlength="4" inputmode="numeric" placeholder="1234"></div>
        <div class="form-group"><label>Počet kytek</label><input type="number" id="t-plants" min="1" value="1"></div>
      </div>
      <button class="btn-submit" onclick="startTimer()">Spustit odpočet (${WEED_PLANT.growHours}h)</button>
      <div id="timers-list" style="margin-top:1.5rem"><p style="color:var(--text-muted);font-size:0.84rem">Načítám odpočty...</p></div>
    </div>
  </main>
  <div class="toast" id="toast"></div>
  <script>
    const RECIPE = ${JSON.stringify(WEED_PLANT)};
    const money = n => '$' + Math.round(n).toLocaleString('cs-CZ');

    // ── KALKULAČKA ──
    function recalc(source) {
      const plantsInput = document.getElementById('calc-plants');
      const budgetInput = document.getElementById('calc-budget');
      let plants = parseInt(plantsInput.value) || 0;
      if (source === 'budget') {
        const budget = parseFloat(budgetInput.value) || 0;
        plants = Math.floor(budget / RECIPE.costPerPlant);
        plantsInput.value = plants;
      }
      const cost = plants * RECIPE.costPerPlant;
      const rev = plants * RECIPE.revenuePerPlant;
      const profit = rev - cost;
      document.getElementById('calc-mat').innerHTML = RECIPE.items.map(it =>
        \`<tr><td>\${it.name}</td><td style="text-align:right">\${it.qty * plants}× <span style="color:var(--text-muted)">($\${it.cost * plants})</span></td></tr>\`
      ).join('') + \`<tr><td style="color:var(--text-muted)">Sáčky na prodej</td><td style="text-align:right;color:var(--gold)">\${plants * RECIPE.bagsPerPlant}×</td></tr>\`;
      document.getElementById('calc-cost').textContent = money(cost);
      document.getElementById('calc-rev').textContent = money(rev);
      document.getElementById('calc-profit').textContent = money(profit);
      const budgetVal = parseFloat(budgetInput.value) || 0;
      let note = plants + ' kytek · roste ' + RECIPE.growHours + 'h · ' + (plants * RECIPE.bagsPerPlant) + ' sáčků';
      if (source === 'budget' && budgetVal) {
        const zbytek = budgetVal - cost;
        note += ' · z rozpočtu ' + money(budgetVal) + ' zbude ' + money(zbytek);
      }
      document.getElementById('calc-note').textContent = note;
    }
    document.getElementById('calc-plants').addEventListener('input', () => recalc('plants'));
    document.getElementById('calc-budget').addEventListener('input', () => recalc('budget'));
    recalc('plants');

    // ── ODPOČTY ──
    let serverOffset = 0;
    let timers = [];
    function fmtRemain(ms) {
      if (ms <= 0) return 'Hotovo';
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      return (h>0?h+'h ':'') + String(m).padStart(2,'0') + 'm ' + String(s).padStart(2,'0') + 's';
    }
    function renderTimers() {
      const wrap = document.getElementById('timers-list');
      if (!timers.length) { wrap.innerHTML = ledgerEmptyHTML('Žádné probíhající odpočty', true); return; }
      wrap.innerHTML = timers.map(t => {
        const dur = t.endsAt - t.startedAt;
        return \`<div class="card" style="padding:1.1rem;margin-bottom:0.9rem">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap">
            <div>
              <div style="font-family:var(--font-display);font-weight:600;font-size:0.95rem;color:var(--vellum)">\${t.icName} <span style="color:var(--text-muted);font-size:0.8rem">· Postal \${t.postal}</span></div>
              <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.25rem">\${t.plants} kytek · spustil \${t.createdBy||'—'}</div>
            </div>
            <div style="text-align:right">
              <div class="cd-remain" data-ends="\${t.endsAt}" style="font-family:var(--font-mono);font-size:1.25rem;color:var(--brass)">–</div>
              <button onclick="removeTimer('\${t.id}')" style="margin-top:0.4rem;background:none;border:1px solid var(--border);color:var(--text-muted);font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.25rem 0.6rem;cursor:pointer;border-radius:3px">Smazat</button>
            </div>
          </div>
          <div style="height:7px;background:var(--border);border-radius:4px;margin-top:0.9rem;overflow:hidden">
            <div class="cd-bar" data-start="\${t.startedAt}" data-ends="\${t.endsAt}" style="height:100%;width:0%;background:linear-gradient(90deg,#6FBF52,var(--brass));transition:width 1s linear"></div>
          </div>
        </div>\`;
      }).join('');
      tick();
    }
    function tick() {
      const nowS = Date.now() + serverOffset;
      document.querySelectorAll('.cd-remain').forEach(el => {
        const ends = parseInt(el.dataset.ends);
        const rem = ends - nowS;
        el.textContent = fmtRemain(rem);
        el.style.color = rem <= 0 ? '#6FBF52' : 'var(--brass)';
        if (rem <= 0) el.textContent = 'Hotovo';
      });
      document.querySelectorAll('.cd-bar').forEach(el => {
        const start = parseInt(el.dataset.start), ends = parseInt(el.dataset.ends);
        const pct = Math.min(100, Math.max(0, ((nowS - start) / (ends - start)) * 100));
        el.style.width = pct + '%';
      });
    }
    async function loadTimers() {
      try {
        const res = await fetch('/api/weed-timers', { cache: 'no-store' });
        const d = await res.json();
        timers = d.timers || [];
        serverOffset = (d.now || Date.now()) - Date.now();
        renderTimers();
      } catch (e) { /* ignore */ }
    }
    async function startTimer() {
      const icName = document.getElementById('t-icname').value.trim();
      const postal = document.getElementById('t-postal').value.trim();
      const plants = document.getElementById('t-plants').value;
      if (!icName) return showToast('Vyplň IC jméno', true);
      if (!/^\\d{4}$/.test(postal)) return showToast('Postal musí být 4 číslice', true);
      const res = await fetch('/api/weed-timers', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({icName,postal,plants})});
      const d = await res.json();
      if (d.ok) { showToast('Odpočet spuštěn'); document.getElementById('t-postal').value=''; loadTimers(); }
      else showToast(d.error, true);
    }
    async function removeTimer(id) {
      const res = await fetch('/api/weed-timers/remove', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
      const d = await res.json();
      if (d.ok) loadTimers(); else showToast(d.error, true);
    }
    loadTimers();
    setInterval(tick, 1000);
    const evtT = new EventSource('/api/events');
    evtT.addEventListener('weedTimer', () => setTimeout(loadTimers, 300));
  </script>
  </body></html>`;
}

module.exports = { renderWeedSazeni };

