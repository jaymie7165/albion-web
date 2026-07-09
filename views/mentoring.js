// mentoring.js — Albion v4 · Formální mentorský program
//
// Nahrazuje/doplňuje prostý tag "mentor → chráněnec" z Hierarchie (#5)
// strukturovaným procesem: cíl programu, checkpointy s termínem a stavem,
// průběžné poznámky a závěrečné hodnocení. Vidí každý přihlášený člen
// (transparentnost růstu v organizaci), zakládat a upravovat program smí
// od hodnosti Senior Member výš (řeší server.js), hodnocení uzavírá mentor
// nebo vedení.
//
// DATA MODEL (data/mentoring.json — pole záznamů):
// {
//   id, mentor, chranenec, cil, status: 'aktivni'|'dokoncen'|'zruseny',
//   checkpoints: [{ id, text, termin, hotovo, hotovoAt }],
//   poznamky, hodnoceni: { znamka: 1-5, text, hodnotil, hodnocenoAt } | null,
//   vytvoril, vytvorenoAt
// }

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderMentoring(req) {
  const canManage = (req.session.accessLevel || 3) <= 2; // Senior Member a výš
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Mentorský program</title>
  ${baseStyles()}
  <style>
    .ment-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:1.3rem}
    .ment-card{background:var(--panel2);border:1px solid var(--border-brass);padding:1.5rem 1.6rem;position:relative}
    .ment-card::before{content:'';position:absolute;top:0;left:0;width:14px;height:14px;border-top:1px solid var(--brass-dim);border-left:1px solid var(--brass-dim)}
    .ment-status{display:inline-block;font-family:var(--font-label);font-size:0.52rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.18rem 0.55rem;margin-bottom:0.8rem}
    .ment-status.aktivni{background:rgba(58,125,45,.12);color:#6FBF52;border:1px solid rgba(58,125,45,.35)}
    .ment-status.dokoncen{background:var(--brass-faint);color:var(--brass-bright);border:1px solid var(--border-brass)}
    .ment-status.zruseny{background:var(--oxblood-faint);color:var(--oxblood-bright);border:1px solid var(--border-oxblood)}
    .ment-pair{font-family:var(--font-display);font-weight:600;font-style:italic;font-size:1.1rem;color:var(--ivory);margin-bottom:0.3rem}
    .ment-cil{font-family:var(--font-body);font-size:0.84rem;color:var(--ivory-dim);line-height:1.6;margin-bottom:0.9rem}
    .ment-cp-list{display:flex;flex-direction:column;gap:0.4rem;margin-bottom:0.8rem}
    .ment-cp{display:flex;align-items:flex-start;gap:0.5rem;font-size:0.8rem;font-family:var(--font-mono);color:var(--ivory-dim)}
    .ment-cp.done{color:var(--ivory-faint);text-decoration:line-through}
    .ment-cp input{margin-top:0.2rem}
    .ment-progress-track{height:4px;background:var(--border);margin-bottom:0.9rem;position:relative}
    .ment-progress-fill{height:100%;background:linear-gradient(90deg,var(--oxblood),var(--brass))}
    .ment-score{font-family:var(--font-display);font-weight:700;font-style:italic;font-size:1.1rem;color:var(--brass)}
    .ment-actions{display:flex;gap:0.5rem;margin-top:0.8rem;flex-wrap:wrap}
    .ment-btn{padding:0.4rem 0.8rem;background:transparent;border:1px solid var(--border-brass);color:var(--ivory-dim);font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer}
    .ment-btn:hover{border-color:var(--brass);color:var(--brass-bright)}
  </style>
  </head><body>
  ${renderNav(req, 'mentoring')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Caledonia — Rozvoj členů</div>
        <h1 class="page-title">Mentorský program</h1>
        <p class="page-sub">Strukturovaný proces růstu — cíl, checkpointy a závěrečné hodnocení</p>
      </div>
      ${canManage ? '<button class="quick-btn primary" onclick="openNewProgram()">+ Založit program</button>' : ''}
    </div>
    <p class="folio-footnote"><strong>Jak to funguje.</strong> Mentor a chráněnec dostanou společný cíl rozdělený na checkpointy s termínem. Průběh je viditelný pro celou organizaci, program uzavírá mentor nebo vedení závěrečným hodnocením 1–5 s textovým komentářem.</p>

    <div id="ment-loading" class="ledger-loading">Načítám programy…</div>
    <div id="ment-grid" class="ment-grid"></div>
  </main>

  <div class="modal-overlay" id="mentModal">
    <div class="modal-box" style="max-width:520px">
      <div class="modal-title">Nový mentorský program</div>
      <div class="form-row">
        <div class="form-group"><label>Mentor</label><input type="text" id="m-mentor" list="ment-names" placeholder="IC jméno"></div>
        <div class="form-group"><label>Chráněnec</label><input type="text" id="m-chranenec" list="ment-names" placeholder="IC jméno"></div>
      </div>
      <datalist id="ment-names"></datalist>
      <div class="form-group" style="margin-bottom:0.85rem"><label>Cíl programu</label><textarea id="m-cil" rows="3" placeholder="Např. zvládnout samostatné vedení skladu a prodejní jednání do 30 dní"></textarea></div>
      <div class="form-group" style="margin-bottom:0.6rem"><label>Checkpointy (jeden na řádek, nepovinný termín za "|", např. "Zvládne zápis do skladu | do 15.7.")</label><textarea id="m-checkpoints" rows="4" placeholder="Zaškolení do skladu | do 15.7.&#10;Samostatné jednání s klientem"></textarea></div>
      <div class="modal-actions">
        <button class="modal-btn-cancel" onclick="closeNewProgram()">Zrušit</button>
        <button class="modal-btn-confirm" id="mentSubmitBtn" onclick="submitProgram()">Založit program</button>
      </div>
    </div>
  </div>
  <div class="modal-overlay" id="hodnoceniModal">
    <div class="modal-box" style="max-width:440px">
      <div class="modal-title">Závěrečné hodnocení</div>
      <div class="form-group" style="margin-bottom:0.85rem"><label>Známka (1 – nejhorší, 5 – nejlepší)</label>
        <select id="h-znamka"><option value="5">5 — vynikající</option><option value="4">4 — velmi dobré</option><option value="3">3 — dobré</option><option value="2">2 — slabé</option><option value="1">1 — nedostatečné</option></select>
      </div>
      <div class="form-group" style="margin-bottom:1rem"><label>Komentář</label><textarea id="h-text" rows="4" placeholder="Shrnutí průběhu, doporučení do budoucna…"></textarea></div>
      <input type="hidden" id="h-id">
      <div class="modal-actions">
        <button class="modal-btn-cancel" onclick="closeHodnoceni()">Zrušit</button>
        <button class="modal-btn-confirm" onclick="submitHodnoceni()">Uzavřít program</button>
      </div>
    </div>
  </div>
  <div class="toast" id="toast"></div>

  <script>
    const CAN_MANAGE = ${canManage ? 'true' : 'false'};
    let PROGRAMS = [];
    function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

    async function loadPrograms(){
      const [progRes, namesRes] = await Promise.all([fetch('/api/mentoring',{cache:'no-store'}), fetch('/api/ic-names')]);
      const d = await progRes.json();
      const names = await namesRes.json();
      if(names.ok) document.getElementById('ment-names').innerHTML = names.names.map(function(n){return '<option value="'+esc(n)+'">';}).join('');
      document.getElementById('ment-loading').style.display='none';
      PROGRAMS = d.programs||[];
      renderGrid();
    }

    function cardHtml(p){
      const total = (p.checkpoints||[]).length;
      const done = (p.checkpoints||[]).filter(function(c){return c.hotovo;}).length;
      const pct = total ? Math.round((done/total)*100) : 0;
      const cpHtml = (p.checkpoints||[]).map(function(c){
        return '<label class="ment-cp'+(c.hotovo?' done':'')+'">'+
          '<input type="checkbox" '+(c.hotovo?'checked':'')+(CAN_MANAGE && p.status==='aktivni' ? '' : ' disabled')+' onchange="toggleCheckpoint(\\''+p.id+'\\',\\''+c.id+'\\',this.checked)">'+
          '<span>'+esc(c.text)+(c.termin?(' <span style="color:var(--ivory-faint)">— '+esc(c.termin)+'</span>'):'')+'</span>'+
        '</label>';
      }).join('');
      let hodnoceniHtml = '';
      if(p.hodnoceni){
        hodnoceniHtml = '<div class="folio-rule tight"></div><div class="ment-score">'+p.hodnoceni.znamka+'/5</div>'+
          '<div style="font-family:var(--font-body);font-size:0.8rem;color:var(--ivory-dim);margin-top:0.3rem">'+esc(p.hodnoceni.text||'')+'</div>'+
          '<div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--ivory-faint);margin-top:0.4rem">Hodnotil '+esc(p.hodnoceni.hodnotil)+'</div>';
      }
      let actions = '';
      if(CAN_MANAGE && p.status==='aktivni'){
        actions = '<div class="ment-actions">'+
          '<button class="ment-btn" onclick="openHodnoceni(\\''+p.id+'\\')">Uzavřít + ohodnotit</button>'+
          '<button class="ment-btn" onclick="zrusitProgram(\\''+p.id+'\\')">Zrušit program</button>'+
        '</div>';
      }
      return '<div class="ment-card">'+
        '<span class="ment-status '+p.status+'">'+(p.status==='aktivni'?'Aktivní':p.status==='dokoncen'?'Dokončen':'Zrušen')+'</span>'+
        '<div class="ment-pair">'+esc(p.mentor)+' → '+esc(p.chranenec)+'</div>'+
        (p.cil ? '<div class="ment-cil">'+esc(p.cil)+'</div>' : '')+
        (total ? ('<div class="ment-progress-track"><div class="ment-progress-fill" style="width:'+pct+'%"></div></div>'+
          '<div class="ment-cp-list">'+cpHtml+'</div>') : '')+
        hodnoceniHtml+
        actions+
      '</div>';
    }

    function renderGrid(){
      const grid = document.getElementById('ment-grid');
      if(!PROGRAMS.length){ grid.innerHTML = ledgerEmptyHTML('Zatím žádný mentorský program', false, 'people'); return; }
      const order = { aktivni:0, dokoncen:1, zruseny:2 };
      const sorted = PROGRAMS.slice().sort(function(a,b){ return (order[a.status]||0)-(order[b.status]||0); });
      grid.innerHTML = sorted.map(cardHtml).join('');
    }

    function openNewProgram(){
      document.getElementById('m-mentor').value='';
      document.getElementById('m-chranenec').value='';
      document.getElementById('m-cil').value='';
      document.getElementById('m-checkpoints').value='';
      document.getElementById('mentModal').classList.add('open');
    }
    window.openNewProgram = openNewProgram;
    function closeNewProgram(){ document.getElementById('mentModal').classList.remove('open'); }
    window.closeNewProgram = closeNewProgram;

    async function submitProgram(){
      const mentor=document.getElementById('m-mentor').value.trim();
      const chranenec=document.getElementById('m-chranenec').value.trim();
      const cil=document.getElementById('m-cil').value.trim();
      const rawCp=document.getElementById('m-checkpoints').value.split('\\n').map(function(l){return l.trim();}).filter(Boolean);
      const checkpoints=rawCp.map(function(line){
        const parts=line.split('|');
        return { text: parts[0].trim(), termin: parts[1] ? parts[1].trim() : '' };
      });
      if(!mentor||!chranenec) return showToast('Vyplň mentora i chráněnce', true);
      const btn=document.getElementById('mentSubmitBtn'); btn.disabled=true;
      const res=await fetch('/api/mentoring',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mentor,chranenec,cil,checkpoints})});
      const d=await res.json();
      btn.disabled=false;
      if(d.ok){ showToast('Program založen'); closeNewProgram(); loadPrograms(); } else showToast(d.error, true);
    }
    window.submitProgram = submitProgram;

    async function toggleCheckpoint(programId, cpId, hotovo){
      const res=await fetch('/api/mentoring/'+programId+'/checkpoint/'+cpId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({hotovo})});
      const d=await res.json();
      if(!d.ok){ showToast(d.error, true); return; }
      loadPrograms();
    }
    window.toggleCheckpoint = toggleCheckpoint;

    function openHodnoceni(id){
      document.getElementById('h-id').value=id;
      document.getElementById('h-znamka').value='5';
      document.getElementById('h-text').value='';
      document.getElementById('hodnoceniModal').classList.add('open');
    }
    window.openHodnoceni = openHodnoceni;
    function closeHodnoceni(){ document.getElementById('hodnoceniModal').classList.remove('open'); }
    window.closeHodnoceni = closeHodnoceni;

    async function submitHodnoceni(){
      const id=document.getElementById('h-id').value;
      const znamka=document.getElementById('h-znamka').value;
      const text=document.getElementById('h-text').value.trim();
      const res=await fetch('/api/mentoring/'+id+'/hodnoceni',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({znamka,text})});
      const d=await res.json();
      if(d.ok){ if(window.albionSealThud)window.albionSealThud(); showToast('Program uzavřen a ohodnocen'); closeHodnoceni(); loadPrograms(); }
      else showToast(d.error, true);
    }
    window.submitHodnoceni = submitHodnoceni;

    async function zrusitProgram(id){
      if(!confirm('Zrušit tento mentorský program?')) return;
      const res=await fetch('/api/mentoring/'+id,{method:'DELETE'});
      const d=await res.json();
      if(d.ok){ showToast('Program zrušen'); loadPrograms(); } else showToast(d.error, true);
    }
    window.zrusitProgram = zrusitProgram;

    loadPrograms();
  </script>
  </body></html>`;
}

module.exports = { renderMentoring };
