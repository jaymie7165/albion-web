// profit-centrum.js — Albion v3 · Heraldický profit centrum

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderProfitCentrum(req) {
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Albion — Profit centrum</title>
  ${baseStyles()}
  <style>
    /* Period tally plaques */
    .period-plaques{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border-brass);margin:1.5rem 0 2.5rem}
    .period-plaque{background:var(--panel2);padding:1.6rem 1.4rem;border-top:2px solid transparent;transition:background 0.2s}
    .period-plaque:hover{background:var(--panel3);border-top-color:var(--brass)}
    .pp-label{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--brass);margin-bottom:0.7rem}
    .pp-net{font-family:var(--font-display);font-weight:700;font-style:italic;font-size:1.7rem;line-height:1;margin-bottom:0.55rem}
    .pp-line{display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:0.68rem;color:var(--ivory-faint);padding:0.1rem 0}
    .pp-line strong{color:var(--ivory-dim);font-weight:400}
    .pp-sklad{border-top:1px dotted var(--border);padding-top:0.3rem;margin-top:0.3rem}

    /* Leaderboard podium */
    .lb-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid var(--border-brass);border-bottom:1px solid var(--border-brass)}
    .lb-col{padding:0 2rem}
    .lb-col:first-child{padding-left:0}
    .lb-col:last-child{padding-right:0}
    .lb-col+.lb-col{border-left:1px solid var(--border)}
    .lb-podium{padding:1.6rem 0 1.2rem;border-bottom:1px solid var(--border-brass)}
    .lb-podium-icon{font-family:var(--font-label);font-size:0.8rem;color:var(--brass);margin-bottom:0.5rem;width:2rem;height:2rem;border:1px solid var(--border-brass);display:flex;align-items:center;justify-content:center}
    .lb-podium-name{font-family:var(--font-display);font-weight:600;font-style:italic;font-size:1.2rem;color:var(--ivory);margin-bottom:0.3rem;min-height:1.4rem;line-height:1.15}
    .lb-podium-val{font-family:var(--font-display);font-style:italic;font-size:1.9rem;color:var(--brass);line-height:1;font-weight:700}
    .lb-podium-sub{font-family:var(--font-label);font-size:0.52rem;color:var(--ivory-faint);margin-top:0.45rem;text-transform:uppercase;letter-spacing:0.1em}
    .lb-rank-row{display:flex;align-items:baseline;gap:0.7rem;font-size:0.84rem;padding:0.5rem 0;border-bottom:1px solid var(--border)}
    .lb-rank-row:last-child{border-bottom:none}
    .lb-rank-num{flex:0 0 1.4rem;font-family:var(--font-label);color:var(--brass);font-size:0.64rem}
    .lb-rank-name{flex:1;color:var(--ivory);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-display);font-style:italic}
    .lb-rank-val{flex:0 0 auto;font-family:var(--font-mono);font-size:0.78rem;color:var(--ivory-dim)}

    @media(max-width:900px){
      .period-plaques{grid-template-columns:repeat(2,1fr)}
      .lb-grid{grid-template-columns:1fr;border-top:none;border-bottom:none}
      .lb-col{padding:1.4rem 0;border-top:1px solid var(--border-brass)}
      .lb-col+.lb-col{border-left:none}
      .lb-col:first-child{border-top:none}
    }
  </style>
  </head><body>
  ${renderNav(req, 'profit-centrum')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Albion — Blackbook</div>
        <h1 class="page-title">Profit centrum</h1>
        <p class="page-sub">Přehled ziskovosti — počítáno z účetnictví a skladů</p>
      </div>
      <div id="pc-generated" style="font-family:var(--font-mono);font-size:0.62rem;color:var(--ivory-faint);letter-spacing:0.06em;flex-shrink:0"></div>
    </div>
    <p class="folio-footnote"><strong>Profit centrum.</strong> Zisk frakce = příjem − výdaj v Účetnictví. Tržby ze skladu = hodnota vybraných drog a weedu dle ceníku. Data jsou čtena přímo z tabulek.</p>

    <div id="pc-loading" class="ledger-loading">Generuji report…</div>

    <div id="pc-content" style="display:none">
      <div class="folio-label" style="margin-bottom:0">Kolik vydělala frakce</div>
      <div class="period-plaques" id="pc-earn-cards"></div>

      <div class="folio-rule tight"></div>
      <div class="report-nav" id="pc-period-nav">
        <button class="report-nav-item" data-p="day" onclick="pcTab('day')">Dnes</button>
        <button class="report-nav-item" data-p="week" onclick="pcTab('week')">Týden</button>
        <button class="report-nav-item" data-p="month" onclick="pcTab('month')">Měsíc</button>
        <button class="report-nav-item active" data-p="total" onclick="pcTab('total')">Celkem</button>
      </div>
      <div style="height:2rem"></div>

      <div class="lb-grid">
        <div class="lb-col">
          <div class="lb-podium" id="pc-dealer-top"></div>
          <div id="pc-dealer-list"></div>
        </div>
        <div class="lb-col">
          <div class="lb-podium" id="pc-drug-top"></div>
          <div id="pc-drug-list"></div>
        </div>
        <div class="lb-col">
          <div class="lb-podium" id="pc-member-top"></div>
          <div id="pc-member-list"></div>
        </div>
      </div>
    </div>
  </main>

  <script>
    let PD=null,pcPeriod='total';
    const money=n=>'$'+Math.round(n||0).toLocaleString('cs-CZ');
    const pesos=n=>'₱'+Math.round(n||0).toLocaleString('cs-CZ');
    const esc=s=>(s==null?'':String(s)).replace(/</g,'&lt;');

    function earnPlaque(title,p){
      const zisk=p.zisk;
      const col=zisk>=0?'#6FBF52':'var(--oxblood-bright)';
      return '<div class="period-plaque">'+
        '<div class="pp-label">'+esc(title)+'</div>'+
        '<div class="pp-net" style="color:'+col+'">'+(zisk>=0?'+':'')+money(zisk)+'</div>'+
        '<div class="pp-line"><span>Příjem</span><strong style="color:#6FBF52">'+money(p.prijem_usd)+'</strong></div>'+
        '<div class="pp-line"><span>Výdaj</span><strong style="color:var(--oxblood-bright)">'+money(p.vydaj_usd)+'</strong></div>'+
        (p.prijem_pesos||p.vydaj_pesos?'<div class="pp-line"><span>Pesos</span><strong>'+pesos(p.prijem_pesos)+' / '+pesos(p.vydaj_pesos)+'</strong></div>':'')+
        '<div class="pp-line pp-sklad"><span>Tržby skladu</span><strong style="color:var(--brass)">'+money(p.trzby_sklad)+'</strong></div>'+
      '</div>';
    }

    function rankList(rows,nameKey,valKey,emptyTxt){
      if(!rows.length)return ledgerEmptyHTML(emptyTxt,true);
      return rows.slice(0,6).map((r,i)=>
        '<div class="lb-rank-row"><span class="lb-rank-num">'+String(i+1).padStart(2,'0')+'</span>'+
        '<span class="lb-rank-name">'+esc(r[nameKey])+'</span>'+
        '<span class="lb-rank-val">'+money(r[valKey])+'</span></div>'
      ).join('');
    }

    function podium(icon,name,value,sub){
      const nameHtml=name?esc(name):'<span style="color:var(--ivory-faint);font-style:italic;font-weight:300">— žádná data —</span>';
      return '<div class="lb-podium-icon">'+icon+'</div>'+
        '<div class="lb-podium-name">'+nameHtml+'</div>'+
        '<div class="lb-podium-val">'+value+'</div>'+
        '<div class="lb-podium-sub">'+sub+'</div>';
    }

    function renderEarnCards(){
      const p=PD.periods;
      document.getElementById('pc-earn-cards').innerHTML=
        earnPlaque('Dnes',p.day)+earnPlaque('Týden',p.week)+earnPlaque('Měsíc',p.month)+earnPlaque('Celkem',p.total);
    }

    function renderLeaderboards(){
      const lb=PD.leaderboards[pcPeriod];
      const d0=lb.dealers[0];
      document.getElementById('pc-dealer-top').innerHTML=podium('§',d0?d0.member:null,d0?money(d0.trzby):'—',d0?(d0.qty+' ks · Nejlepší dealer'):'Nejlepší dealer');
      document.getElementById('pc-dealer-list').innerHTML=rankList(lb.dealers,'member','trzby','Žádné prodeje');
      const dr0=lb.drugs[0];
      document.getElementById('pc-drug-top').innerHTML=podium('◆',dr0?dr0.droga:null,dr0?money(dr0.trzby):'—',dr0?(dr0.qty+' ks · Nejvýdělečnější droga'):'Nejvýdělečnější droga');
      document.getElementById('pc-drug-list').innerHTML=rankList(lb.drugs,'droga','trzby','Žádné prodeje');
      const m0=lb.members[0];
      document.getElementById('pc-member-top').innerHTML=podium('I',m0?m0.member:null,m0?money(m0.net):'—','Čistý přínos do účtu (SAD)');
      document.getElementById('pc-member-list').innerHTML=rankList(lb.members,'member','net','Žádná data');
    }

    function pcTab(p){
      pcPeriod=p;
      document.querySelectorAll('#pc-period-nav .report-nav-item').forEach(b=>b.classList.toggle('active',b.dataset.p===p));
      renderLeaderboards();
    }

    async function loadProfitCentrum(){
      try{
        const res=await fetch('/api/profit-centrum',{cache:'no-store'});
        PD=await res.json();
        if(!PD.ok){document.getElementById('pc-loading').textContent='Chyba: '+(PD.error||'neznámá');return;}
        document.getElementById('pc-loading').style.display='none';
        document.getElementById('pc-content').style.display='block';
        document.getElementById('pc-generated').textContent='Vygenerováno '+(PD.generatedAt||'');
        renderEarnCards();renderLeaderboards();
      }catch(e){document.getElementById('pc-loading').textContent='Chyba: '+e.message;}
    }
    loadProfitCentrum();
    setInterval(loadProfitCentrum,60000);
  </script>
  </body></html>`;
}

module.exports = { renderProfitCentrum };
