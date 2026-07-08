// audit.js — Albion v3

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderAudit(req) {
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Audit</title>
  ${baseStyles()}
  <style>
    .ucet-souhrn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:1rem;margin-bottom:2rem}
    .ucet-card{background:var(--panel2);border:1px solid var(--border-brass);padding:1.3rem 1.5rem;position:relative}
    .ucet-card::before{content:'';position:absolute;top:0;left:0;width:10px;height:10px;border-top:1px solid var(--brass-dim);border-left:1px solid var(--brass-dim)}
    .ucet-card-name{font-family:var(--font-display);font-weight:600;font-style:italic;font-size:0.95rem;margin-bottom:0.8rem;color:var(--ivory)}
    .ucet-card-row{display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:0.74rem;color:var(--ivory-faint);padding:0.22rem 0;border-bottom:1px solid var(--border)}
    .ucet-card-row:last-child{border-bottom:none}
    .src-web{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.1em;color:var(--oxblood-bright);border:1px solid var(--border-oxblood);padding:0.12rem 0.45rem}
    .src-bot{font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.1em;color:var(--ivory-faint);border:1px solid var(--border);padding:0.12rem 0.45rem}
    .sekce-badge{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:1px solid;font-family:var(--font-label);font-size:0.58rem;font-weight:600;flex-shrink:0;margin-right:0.5rem}
  </style>
  </head><body>
  ${renderNav(req, 'audit')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Caledonia</div>
        <h1 class="page-title">Audit</h1>
        <p class="page-sub">Kompletní záznam všech akcí — posledních 200 záznamů</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Audit.</strong> Chronologicky seřazené záznamy všech akcí v systému — vklady, výběry, finanční pohyby i jejich autoři. Filtruj podle sekce nebo hledej textem.</p>

    <div id="ucet-souhrn-wrap" style="display:none;margin-bottom:2rem">
      <div class="folio-label" style="margin-bottom:1rem">Účetnictví — souhrn per člen</div>
      <div class="ucet-souhrn-grid" id="ucet-souhrn-grid"></div>
    </div>

    <div class="card">
      <div style="display:flex;gap:0.8rem;margin-bottom:1.2rem;flex-wrap:wrap;align-items:center">
        <div style="position:relative;flex:1;min-width:220px;max-width:340px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);width:13px;height:13px;color:var(--ivory-faint);pointer-events:none"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="audit-search" placeholder="Hledat jméno nebo detail…" style="padding-left:2.1rem">
        </div>
        <span id="audit-result-count" style="font-family:var(--font-mono);font-size:0.64rem;color:var(--ivory-faint)"></span>
      </div>
      <div style="display:flex;gap:0.4rem;margin-bottom:1.5rem;flex-wrap:wrap;align-items:center">
        <button class="typ-btn active-vklad" onclick="filterAudit('vse')" id="filter-vse" style="flex:none;padding:0.4rem 1rem">Vše</button>
        <button class="typ-btn" onclick="filterAudit('Zbraně')" id="filter-zbrane" style="flex:none;padding:0.4rem 1rem">Zbraně</button>
        <button class="typ-btn" onclick="filterAudit('Weed')" id="filter-weed" style="flex:none;padding:0.4rem 1rem">Weed</button>
        <button class="typ-btn" onclick="filterAudit('Drogy')" id="filter-drogy" style="flex:none;padding:0.4rem 1rem">Drogy</button>
        <button class="typ-btn" onclick="filterAudit('Chemky')" id="filter-chemky" style="flex:none;padding:0.4rem 1rem">Chemky</button>
        <button class="typ-btn" onclick="filterAudit('Účetnictví')" id="filter-ucet" style="flex:none;padding:0.4rem 1rem">Účetnictví</button>
        <span style="margin-left:auto;font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.1em;color:var(--ivory-faint);display:flex;align-items:center;gap:0.6rem">
          <span style="display:inline-block;width:6px;height:6px;background:var(--oxblood-bright)"></span>Web
          <span style="display:inline-block;width:6px;height:6px;background:var(--ivory-faint)"></span>Bot
        </span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Čas</th><th>Zdroj</th><th>Sekce</th><th>Typ</th><th>Člen</th><th>Detail</th></tr></thead>
          <tbody id="audit-body"><tr><td colspan="6" style="text-align:center;color:var(--ivory-faint);padding:2.5rem;font-family:var(--font-mono)">Načítám…</td></tr></tbody>
        </table>
      </div>
    </div>
  </main>

  <script>
    let allEvents=[],ucetSouhrn={},activeFilter='vse',searchTerm='',eliteMembers=[];
    let auditOffset=0,auditTotal=0;
    const AUDIT_LIMIT=200;

    async function loadAudit(){
      const res=await fetch('/api/audit?limit='+AUDIT_LIMIT+'&offset='+auditOffset,{cache:'no-store'});
      const data=await res.json();
      allEvents=data.events||[];ucetSouhrn=data.ucetSouhrn||{};eliteMembers=data.elite||[];
      auditTotal=data.total||allEvents.length;
      applyAuditFilters();renderUcetSouhrn();renderAuditPager();
    }

    function renderAuditPager(){
      let pager=document.getElementById('audit-pager');
      if(!pager){
        pager=document.createElement('div');
        pager.id='audit-pager';
        pager.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-top:1rem;font-family:var(--font-mono);font-size:0.72rem;color:var(--ivory-faint)';
        const tableWrap=document.querySelector('.table-wrap');
        tableWrap.insertAdjacentElement('afterend',pager);
      }
      const from=auditOffset+1,to=Math.min(auditOffset+AUDIT_LIMIT,auditTotal);
      pager.innerHTML =
        '<button class="modal-btn-cancel" style="padding:0.4rem 0.9rem"'+(auditOffset<=0?' disabled':'')+' onclick="auditPagePrev()">← Novější</button>'+
        '<span>'+(auditTotal?(from+'–'+to+' z '+auditTotal+' záznamů'):'0 záznamů')+'</span>'+
        '<button class="modal-btn-cancel" style="padding:0.4rem 0.9rem"'+((auditOffset+AUDIT_LIMIT)>=auditTotal?' disabled':'')+' onclick="auditPageNext()">Starší →</button>';
    }
    function auditPagePrev(){ auditOffset=Math.max(0,auditOffset-AUDIT_LIMIT); loadAudit(); }
    function auditPageNext(){ auditOffset+=AUDIT_LIMIT; loadAudit(); }
    window.auditPagePrev=auditPagePrev; window.auditPageNext=auditPageNext;

    function renderUcetSouhrn(){
      const users=Object.keys(ucetSouhrn);
      const wrap=document.getElementById('ucet-souhrn-wrap');
      const grid=document.getElementById('ucet-souhrn-grid');
      if(!users.length){wrap.style.display='none';return;}
      wrap.style.display='block';
      grid.innerHTML=users.map(uz=>{
        const s=ucetSouhrn[uz];
        const netUsd=s.prijem_usd-s.vydaj_usd,netPesos=s.prijem_pesos-s.vydaj_pesos;
        return '<div class="ucet-card">'+
          '<div class="ucet-card-name">'+esc(uz)+'</div>'+
          (s.prijem_usd||s.vydaj_usd?
            '<div class="ucet-card-row"><span>Příjem USD</span><span style="color:#6FBF52">$'+s.prijem_usd.toLocaleString('cs-CZ')+'</span></div>'+
            '<div class="ucet-card-row"><span>Výdaj USD</span><span style="color:var(--oxblood-bright)">$'+s.vydaj_usd.toLocaleString('cs-CZ')+'</span></div>'+
            '<div class="ucet-card-row"><span>Net USD</span><span style="color:'+(netUsd>=0?'#6FBF52':'var(--oxblood-bright)')+'">'+(netUsd>=0?'+':'')+'$'+Math.round(netUsd).toLocaleString('cs-CZ')+'</span></div>':'')+
          (s.prijem_pesos||s.vydaj_pesos?
            '<div class="ucet-card-row"><span>Příjem Pesos</span><span style="color:#6FBF52">₱'+s.prijem_pesos.toLocaleString('cs-CZ')+'</span></div>'+
            '<div class="ucet-card-row"><span>Net Pesos</span><span style="color:'+(netPesos>=0?'#6FBF52':'var(--oxblood-bright)')+'">₱'+Math.round(netPesos).toLocaleString('cs-CZ')+'</span></div>':'')+
        '</div>';
      }).join('');
    }

    function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

    function renderTable(events){
      const tbody=document.getElementById('audit-body');
      if(!events.length){tbody.innerHTML='<tr><td colspan="6" style="padding:1.5rem">'+ledgerEmptyHTML('Žádné záznamy',true)+'</td></tr>';return;}
      const SEKCE={
        'Zbraně':{letter:'🔫',color:'var(--brass)'},
        'Weed':{letter:'🌿',color:'#7A9A4A'},
        'Drogy':{letter:'💊',color:'var(--oxblood-bright)'},
        'Chemky':{letter:'⚗️',color:'#6FA8C9'},
        'Účetnictví':{letter:'💰',color:'var(--brass-bright)'},
      };
      tbody.innerHTML=events.map(e=>{
        const typCls=e.typ==='VKLAD'||e.typ==='PŘÍJEM'?'vklad':'vyber';
        const src=e.source==='web'?'<span class="src-web">WEB</span>':'<span class="src-bot">BOT</span>';
        const mono=SEKCE[e.sekce]||{letter:'?',color:'var(--ivory-faint)'};
        const badge='<span class="sekce-badge" style="border-color:'+mono.color+';color:'+mono.color+'">'+mono.letter+'</span>';
        const isElite=eliteMembers.includes(e.uzivatel);
        return '<tr'+(isElite?' class="rank-elite"':'')+'>'+
          '<td style="white-space:nowrap;color:var(--ivory-faint);font-family:var(--font-mono);font-size:0.78rem">'+esc(e.cas)+'</td>'+
          '<td>'+src+'</td>'+
          '<td style="display:flex;align-items:center">'+badge+esc(e.sekce)+'</td>'+
          '<td><span class="badge '+typCls+'">'+esc(e.typ)+'</span></td>'+
          '<td style="color:var(--ivory);font-family:var(--font-display);font-style:italic">'+esc(e.uzivatel)+(isElite?'<span class="rank-elite-tag">★</span>':'')+'</td>'+
          '<td style="color:var(--ivory-dim)">'+esc(e.detail)+'</td>'+
        '</tr>';
      }).join('');
    }

    function applyAuditFilters(){
      let filtered=activeFilter==='vse'?allEvents:allEvents.filter(e=>e.sekce===activeFilter);
      if(searchTerm){const q=searchTerm.toLowerCase();filtered=filtered.filter(e=>(e.uzivatel||'').toLowerCase().includes(q)||(e.detail||'').toLowerCase().includes(q));}
      renderTable(filtered);
      const countEl=document.getElementById('audit-result-count');
      if(countEl)countEl.textContent=searchTerm?(filtered.length+' / '+allEvents.length+' záznamů'):'';
    }

    function filterAudit(sekce){
      activeFilter=sekce;
      document.querySelectorAll('[id^=filter-]').forEach(b=>b.className='typ-btn');
      const map={'vse':'filter-vse','Zbraně':'filter-zbrane','Weed':'filter-weed','Drogy':'filter-drogy','Chemky':'filter-chemky','Účetnictví':'filter-ucet'};
      const btn=document.getElementById(map[sekce]);
      if(btn)btn.className='typ-btn active-vklad';
      applyAuditFilters();
      document.getElementById('ucet-souhrn-wrap').style.display=(sekce==='vse'||sekce==='Účetnictví')?'block':'none';
    }

    let _searchDebounce=null;
    document.getElementById('audit-search').addEventListener('input',(e)=>{
      clearTimeout(_searchDebounce);
      _searchDebounce=setTimeout(()=>{searchTerm=e.target.value.trim();applyAuditFilters();},150);
    });

    loadAudit();
    const evtSrc=new EventSource('/api/events');
    ['skladUpdate','ucetUpdate'].forEach(ev=>evtSrc.addEventListener(ev,()=>setTimeout(loadAudit,2000)));
  </script>
  </body></html>`;
}

module.exports = { renderAudit };
