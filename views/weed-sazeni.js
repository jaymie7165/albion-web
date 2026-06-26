// weed-sazeni.js — Albion v3 · Heraldický weed sázení

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');
const { WEED_PLANT } = require('../constants');

function renderWeedSazeni(req) {
  const icName = req.session.icName;
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Albion — Weed sázení</title>
  ${baseStyles()}
  <style>
    /* Ceník tabulka — vertikální plaque styl */
    .weed-recipe-plaques{
      display:grid;grid-template-columns:repeat(5,1fr);gap:1px;
      background:var(--border-brass);margin-bottom:2rem;
    }
    .recipe-plaque{
      background:var(--panel2);padding:1.4rem 1rem;text-align:center;
      border-top:2px solid transparent;transition:background 0.2s;
    }
    .recipe-plaque:hover{background:var(--panel3);border-top-color:var(--brass)}
    .recipe-plaque-name{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--brass);margin-bottom:0.5rem}
    .recipe-plaque-qty{font-family:var(--font-display);font-style:italic;font-size:1.5rem;color:var(--ivory);line-height:1}
    .recipe-plaque-cost{font-family:var(--font-mono);font-size:0.64rem;color:var(--ivory-faint);margin-top:0.4rem}

    /* Stat strip — 4 čísla */
    .weed-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border-brass);margin-bottom:2.5rem}
    .weed-stat{background:var(--panel2);padding:1.6rem 1.4rem;text-align:center;border-top:2px solid transparent;transition:background 0.2s}
    .weed-stat:hover{background:var(--panel3);border-top-color:var(--brass)}
    .weed-stat-label{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--brass);margin-bottom:0.6rem}
    .weed-stat-val{font-family:var(--font-display);font-weight:700;font-style:italic;font-size:1.8rem;color:var(--ivory);line-height:1}
    .weed-stat-sub{font-family:var(--font-mono);font-size:0.6rem;color:var(--ivory-faint);margin-top:0.4rem}

    /* Odpočty */
    .timer-card{
      background:var(--panel2);border:1px solid var(--border-brass);
      padding:1.3rem 1.5rem;margin-bottom:0.9rem;
      position:relative;transition:border-color 0.2s;
    }
    .timer-card::before{content:'';position:absolute;top:0;left:0;width:12px;height:12px;border-top:1px solid var(--brass-dim);border-left:1px solid var(--brass-dim)}
    .timer-card:hover{border-color:var(--brass)}
    .timer-bar-track{height:3px;background:var(--border);margin-top:1rem;overflow:hidden}
    .timer-bar-fill{height:100%;background:linear-gradient(90deg,var(--oxblood),var(--brass));transition:width 1s linear}

    @media(max-width:900px){
      .weed-recipe-plaques{grid-template-columns:repeat(3,1fr)}
      .weed-stats{grid-template-columns:repeat(2,1fr)}
    }
    @media(max-width:500px){.weed-recipe-plaques{grid-template-columns:1fr 1fr}}
  </style>
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
    <p class="folio-footnote"><strong>Pěstování weedu.</strong> Na jednu kytku potřebuješ níže uvedený materiál. Z jedné kytky vzniknou <strong>${WEED_PLANT.bagsPerPlant} sáčky</strong> po $${WEED_PLANT.bagPrice}. Kytka roste <strong>${WEED_PLANT.growHours} hodin</strong>.</p>

    <!-- Stat strip -->
    <div class="weed-stats">
      <div class="weed-stat">
        <div class="weed-stat-label">Náklad / kytka</div>
        <div class="weed-stat-val">$${WEED_PLANT.costPerPlant}</div>
        <div class="weed-stat-sub">materiál</div>
      </div>
      <div class="weed-stat" style="border-top-color:var(--brass)">
        <div class="weed-stat-label">Tržba / kytka</div>
        <div class="weed-stat-val" style="color:var(--brass)">$${WEED_PLANT.revenuePerPlant}</div>
        <div class="weed-stat-sub">${WEED_PLANT.bagsPerPlant} × $${WEED_PLANT.bagPrice}</div>
      </div>
      <div class="weed-stat" style="border-top-color:#6FBF52">
        <div class="weed-stat-label">Zisk / kytka</div>
        <div class="weed-stat-val" style="color:#6FBF52">$${WEED_PLANT.profitPerPlant}</div>
        <div class="weed-stat-sub">tržba − náklad</div>
      </div>
      <div class="weed-stat" style="border-top-color:#6FA8C9">
        <div class="weed-stat-label">Doba růstu</div>
        <div class="weed-stat-val" style="color:#6FA8C9">${WEED_PLANT.growHours}h</div>
        <div class="weed-stat-sub">na 1 kytku</div>
      </div>
    </div>

    <!-- Ceník — recipe plaques -->
    <div class="folio-label" style="margin-bottom:1.2rem">Materiál na 1 kytku</div>
    <div class="weed-recipe-plaques">
      ${WEED_PLANT.items.map(it => `
        <div class="recipe-plaque">
          <div class="recipe-plaque-name">${it.name}</div>
          <div class="recipe-plaque-qty">${it.qty}×</div>
          <div class="recipe-plaque-cost">$${it.cost} celkem</div>
        </div>`).join('')}
    </div>
    <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--ivory-faint);margin-bottom:2.5rem;padding:0.9rem 1rem;border:1px solid var(--border-brass);background:var(--brass-faint)">
      Celkový náklad: <strong style="color:var(--brass)">$${WEED_PLANT.costPerPlant}</strong> &ensp;·&ensp;
      Výnos: ${WEED_PLANT.bagsPerPlant} sáčků × $${WEED_PLANT.bagPrice} = <strong style="color:var(--brass)">$${WEED_PLANT.revenuePerPlant}</strong> &ensp;·&ensp;
      Čistý zisk: <strong style="color:#6FBF52">$${WEED_PLANT.profitPerPlant}</strong>
    </div>

    <!-- Dvě karty vedle sebe: kalkulačka + odpočty -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;align-items:start">

      <!-- Kalkulačka -->
      <div class="card">
        <div class="card-header"><span class="card-title">Kalkulačka</span><span class="card-badge">Výpočet</span></div>
        <div class="form-row">
          <div class="form-group"><label>Počet kytek</label><input type="number" id="calc-plants" min="0" value="1"></div>
          <div class="form-group"><label>Rozpočet $</label><input type="number" id="calc-budget" min="0" placeholder="volitelné"></div>
        </div>
        <div id="calc-result" style="margin-top:0.5rem">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border-brass);margin-bottom:1rem">
            <div style="background:var(--panel3);padding:1rem;text-align:center">
              <div style="font-family:var(--font-label);font-size:0.52rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--brass);margin-bottom:0.4rem">Náklad</div>
              <div id="calc-cost" style="font-family:var(--font-display);font-style:italic;font-size:1.3rem;color:var(--ivory)">$0</div>
            </div>
            <div style="background:var(--panel3);padding:1rem;text-align:center">
              <div style="font-family:var(--font-label);font-size:0.52rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--brass);margin-bottom:0.4rem">Tržba</div>
              <div id="calc-rev" style="font-family:var(--font-display);font-style:italic;font-size:1.3rem;color:var(--brass)">$0</div>
            </div>
            <div style="background:var(--panel3);padding:1rem;text-align:center">
              <div style="font-family:var(--font-label);font-size:0.52rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--brass);margin-bottom:0.4rem">Zisk</div>
              <div id="calc-profit" style="font-family:var(--font-display);font-style:italic;font-size:1.3rem;color:#6FBF52">$0</div>
            </div>
          </div>
          <div class="table-wrap">
            <table><thead><tr><th>Materiál</th><th style="text-align:right">Potřeba</th></tr></thead>
            <tbody id="calc-mat"></tbody></table>
          </div>
          <div class="info-box" id="calc-note" style="display:block;margin-top:1rem"></div>
        </div>
      </div>

      <!-- Odpočty -->
      <div class="card">
        <div class="card-header"><span class="card-title">Odpočty růstu</span><span class="card-badge">Sdílené · všichni vidí</span></div>
        <div class="form-row">
          <div class="form-group"><label>IC jméno</label><input type="text" id="t-icname" value="${icName ? icName.replace(/"/g,'&quot;') : ''}" placeholder="Jméno postavy"></div>
          <div class="form-group"><label>Postal</label><input type="text" id="t-postal" maxlength="4" inputmode="numeric" placeholder="1234"></div>
        </div>
        <div class="form-group" style="margin-bottom:0.8rem"><label>Počet kytek</label><input type="number" id="t-plants" min="1" value="1"></div>
        <button class="btn-submit" style="margin-top:0" onclick="startTimer()">Spustit odpočet (${WEED_PLANT.growHours}h)</button>
        <div id="timers-list" style="margin-top:1.5rem">
          <p style="color:var(--ivory-faint);font-size:0.84rem;font-family:var(--font-mono)">Načítám odpočty…</p>
        </div>
      </div>

    </div>
  </main>
  <div class="toast" id="toast"></div>

  <script>
    const RECIPE = ${JSON.stringify(WEED_PLANT)};
    const money = n => '$' + Math.round(n).toLocaleString('cs-CZ');

    function recalc(source){
      const plantsInput=document.getElementById('calc-plants');
      const budgetInput=document.getElementById('calc-budget');
      let plants=parseInt(plantsInput.value)||0;
      if(source==='budget'){
        const budget=parseFloat(budgetInput.value)||0;
        plants=Math.floor(budget/RECIPE.costPerPlant);
        plantsInput.value=plants;
      }
      const cost=plants*RECIPE.costPerPlant;
      const rev=plants*RECIPE.revenuePerPlant;
      const profit=rev-cost;
      document.getElementById('calc-mat').innerHTML=RECIPE.items.map(it=>
        '<tr><td>'+it.name+'</td><td style="text-align:right">'+it.qty*plants+'× <span style="color:var(--ivory-faint);font-size:0.85em">($'+it.cost*plants+')</span></td></tr>'
      ).join('')+'<tr><td style="color:var(--ivory-faint)">Sáčky na prodej</td><td style="text-align:right;color:var(--brass)">'+plants*RECIPE.bagsPerPlant+'×</td></tr>';
      document.getElementById('calc-cost').textContent=money(cost);
      document.getElementById('calc-rev').textContent=money(rev);
      document.getElementById('calc-profit').textContent=money(profit);
      document.getElementById('calc-profit').style.color=profit>=0?'#6FBF52':'var(--oxblood-bright)';
      const budgetVal=parseFloat(budgetInput.value)||0;
      let note=plants+' kytek · '+RECIPE.growHours+'h růstu · '+(plants*RECIPE.bagsPerPlant)+' sáčků';
      if(source==='budget'&&budgetVal){note+=' · ze '+money(budgetVal)+' zbyde '+money(budgetVal-cost);}
      document.getElementById('calc-note').textContent=note;
    }
    document.getElementById('calc-plants').addEventListener('input',()=>recalc('plants'));
    document.getElementById('calc-budget').addEventListener('input',()=>recalc('budget'));
    recalc('plants');

    // Odpočty
    let serverOffset=0,timers=[];
    function fmtRemain(ms){
      if(ms<=0)return'Hotovo';
      const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000);
      return(h>0?h+'h ':'')+String(m).padStart(2,'0')+'m '+String(s).padStart(2,'0')+'s';
    }
    function renderTimers(){
      const wrap=document.getElementById('timers-list');
      if(!timers.length){wrap.innerHTML=ledgerEmptyHTML('Žádné probíhající odpočty',true);return;}
      wrap.innerHTML=timers.map(function(t){
        return '<div class="timer-card">'+
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap">'+
            '<div>'+
              '<div style="font-family:var(--font-display);font-weight:600;font-style:italic;font-size:0.95rem;color:var(--ivory)">'+t.icName+' <span style="color:var(--ivory-faint);font-size:0.8rem;font-style:normal;font-family:var(--font-mono)">· Postal '+t.postal+'</span></div>'+
              '<div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--ivory-faint);margin-top:0.3rem">'+t.plants+' kytek · '+(t.createdBy||'—')+'</div>'+
            '</div>'+
            '<div style="text-align:right">'+
              '<div class="cd-remain" data-ends="'+t.endsAt+'" style="font-family:var(--font-display);font-style:italic;font-size:1.2rem;color:var(--brass)">–</div>'+
              '<button onclick="removeTimer(\''+t.id+'\')" style="margin-top:0.4rem;background:none;border:1px solid var(--border-brass);color:var(--ivory-faint);font-family:var(--font-label);font-size:0.52rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.22rem 0.6rem;cursor:pointer">Smazat</button>'+
            '</div>'+
          '</div>'+
          '<div class="timer-bar-track"><div class="cd-bar" data-start="'+t.startedAt+'" data-ends="'+t.endsAt+'" style="height:100%;width:0%"></div></div>'+
        '</div>';
      }).join('');
      tick();
    }
    function tick(){
      const nowS=Date.now()+serverOffset;
      document.querySelectorAll('.cd-remain').forEach(el=>{
        const rem=parseInt(el.dataset.ends)-nowS;
        el.textContent=fmtRemain(rem);
        el.style.color=rem<=0?'#6FBF52':'var(--brass)';
      });
      document.querySelectorAll('.cd-bar').forEach(el=>{
        const start=parseInt(el.dataset.start),ends=parseInt(el.dataset.ends);
        el.style.width=Math.min(100,Math.max(0,((nowS-start)/(ends-start))*100))+'%';
      });
    }
    async function loadTimers(){
      try{
        const res=await fetch('/api/weed-timers',{cache:'no-store'});
        const d=await res.json();
        timers=d.timers||[];serverOffset=(d.now||Date.now())-Date.now();renderTimers();
      }catch(e){}
    }
    async function startTimer(){
      const icName=document.getElementById('t-icname').value.trim();
      const postal=document.getElementById('t-postal').value.trim();
      const plants=document.getElementById('t-plants').value;
      if(!icName)return showToast('Vyplň IC jméno',true);
      if(!/^\\d{4}$/.test(postal))return showToast('Postal musí být 4 číslice',true);
      const res=await fetch('/api/weed-timers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({icName,postal,plants})});
      const d=await res.json();
      if(d.ok){showToast('Odpočet spuštěn');document.getElementById('t-postal').value='';loadTimers();}
      else showToast(d.error,true);
    }
    async function removeTimer(id){
      const res=await fetch('/api/weed-timers/remove',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
      const d=await res.json();if(d.ok)loadTimers();else showToast(d.error,true);
    }
    loadTimers();setInterval(tick,1000);
    const evtT=new EventSource('/api/events');
    evtT.addEventListener('weedTimer',()=>setTimeout(loadTimers,300));
  </script>
  </body></html>`;
}

module.exports = { renderWeedSazeni };
