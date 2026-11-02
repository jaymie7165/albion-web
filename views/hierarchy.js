// views/hierarchy.js — CALEDONIA · Hierarchie (editovatelná)
// Přepojeno na /api/content/hierarchy (content-store.js) místo hardcoded
// pole. GET vidí každý přihlášený, editace (POST /api/content/hierarchy)
// je serverem omezena na requireAccess('audit') = jen Founder/Council.
// Bez záznamu, kdo naposledy upravil (dle zadání — jako dnes).
// Vztahy mezi členy (Vztahy) beze změny — jede přes existující /api/vztahy.

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

const DEFAULT_RANKS = [
  { rank: 'Founder', num: '01', member: 'Christopher Anthony Sinclair', isFounder: true,
    desc: 'Zakladatel Caledonie a osoba určující dlouhodobé směřování organizace.',
    rights: ['Absolutní rozhodovací pravomoc','Jmenování a odvolávání členů','Schvalování projektů','Správa financí'] },
  { rank: 'Council', num: '02', member: 'Monica Williams', isFounder: false,
    desc: 'Nejužší vedení organizace.',
    rights: ['Přístup k interním informacím','Strategická rozhodnutí','Návrhy nových členů','Dohled nad chodem'] },
  { rank: 'Senior Member', num: '03', member: 'Henry Williams', isFounder: false,
    desc: 'Zkušení a prověření členové, kteří prokázali loajalitu a schopnosti.',
    rights: ['Přístup k interním informacím','Doporučování nových členů','Vedení projektů','Reprezentace'] },
  { rank: 'Member', num: '04', member: null, isFounder: false,
    desc: 'Plnohodnotný člen Caledonie.', rights: ['Přístup do interních prostor','Účast na schůzkách','Zapojení do projektů'] },
  { rank: 'Associate', num: '05', member: null, isFounder: false,
    desc: 'Kandidát na členství.', rights: ['Omezený přístup','Vybrané aktivity','Možnost získat plné členství'] },
];

function renderHierarchy(req) {
  const canManageVztahy = req.session.accessLevel === 1;
  const canEdit = req.session.accessLevel === 1;

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Hierarchie</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'hierarchy')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Caledonia</div>
        <h1 class="page-title">Hierarchie</h1>
        <p class="page-sub">Struktura a řád organizace</p>
      </div>
      ${canEdit ? `<button onclick="toggleEdit()" id="editToggleBtn" style="background:transparent;border:1px solid var(--border-brass);color:var(--ivory-dim);padding:0.55rem 1.1rem;font-family:var(--font-label);font-size:0.68rem;letter-spacing:0.04em;text-transform:uppercase;cursor:pointer">Upravit</button>` : ''}
    </div>

    <div id="rank-timeline"><div class="ledger-loading">Načítám…</div></div>
    <div id="rank-editor" style="display:none"></div>
    ${canEdit ? `<div id="editorActions" style="display:none;margin-top:1rem"><button class="btn-submit" onclick="addRank()" style="width:auto;padding:0.7rem 1.3rem;margin-right:0.6rem">+ Přidat pozici</button><button class="btn-submit" onclick="saveHierarchy()" style="width:auto;padding:0.7rem 1.3rem">Uložit změny</button></div>` : ''}

    ${canEdit ? `
    <div class="folio-rule"></div>
    <div class="page-header" style="margin-bottom:1.4rem;border-bottom:none;padding-bottom:0">
      <div><div class="page-label">Vedení</div><h1 class="page-title" style="font-size:1.6rem">Oddělení Senior Members</h1>
      <p class="page-sub">Head of Weapons / Narcotics / Members / Financials — určuje, které taby ve Skladu daný Senior Member vidí (viz roles.js).</p></div>
    </div>
    <div id="dept-loading" class="ledger-loading">Načítám…</div>
    <div id="dept-list" style="display:grid;gap:0.6rem"></div>
    ` : ''}

    <div class="folio-rule"></div>
    <div class="page-header" style="margin-bottom:1.4rem;border-bottom:none;padding-bottom:0">
      <div><div class="page-label">Kdo je s kým</div><h1 class="page-title" style="font-size:1.6rem">Vztahy mezi členy</h1></div>
    </div>
    ${canManageVztahy ? `
    <div class="card" style="margin-bottom:1.6rem">
      <div class="card-header"><span class="card-title">Přidat vztah</span></div>
      <div class="form-row">
        <div class="form-group"><label>Osoba A</label><input type="text" id="vz-a" list="vz-members" placeholder="IC jméno"></div>
        <div class="form-group"><label>Osoba B</label><input type="text" id="vz-b" list="vz-members" placeholder="IC jméno"></div>
      </div>
      <datalist id="vz-members"></datalist>
      <div class="form-row">
        <div class="form-group"><label>Typ vztahu</label>
          <select id="vz-typ" onchange="vzRoleChanged()">
            <optgroup label="Základ stromu">
              <option value="rodic">A je rodič B (otec / matka)</option>
              <option value="partner">A a B jsou partneři / manželé</option>
              <option value="sourozenec">A a B jsou sourozenci</option>
            </optgroup>
            <optgroup label="Širší rodina (napojí se automaticky)">
              <option value="stryc">A je strýc / teta B</option>
              <option value="neter">A je neteř / synovec B</option>
              <option value="svagr">A je švagr / švagrová B</option>
              <option value="kmotr">A je kmotr / kmotra B</option>
              <option value="kmotrenec">A je kmotřenec B</option>
              <option value="znamy">A a B jsou rodinní známí</option>
              <option value="rodina">Jiná rodinná vazba</option>
            </optgroup>
            <optgroup label="Mimo rodinu">
              <option value="mentor">A mentoruje B</option>
              <option value="spojenec">Spojenci</option>
              <option value="rival">Rivalové</option>
            </optgroup>
          </select>
        </div>
        <div class="form-group"><label>Poznámka (volitelné)</label><input type="text" id="vz-note" placeholder="Krátký kontext…"></div>
      </div>
      <div class="form-row" id="vz-via-row" style="display:none">
        <div class="form-group"><label id="vz-via-label">Napojit přes</label><select id="vz-via"></select>
          <div id="vz-via-hint" style="font-family:var(--font-mono);font-size:0.68rem;color:var(--ivory-faint);margin-top:0.4rem"></div></div>
      </div>
      <button class="btn-submit" onclick="addVztah()">Zapsat vztah</button>
    </div>` : ''}
    <div class="report-nav" style="margin-bottom:1.2rem">
      <button class="report-nav-item active" id="vztab-btn-tree" onclick="vzTab('tree')">Rodinný strom</button>
      <button class="report-nav-item" id="vztab-btn-network" onclick="vzTab('network')">Síť vztahů</button>
      <button class="report-nav-item" id="vztab-btn-list" onclick="vzTab('list')">Seznam</button>
    </div>
    <div id="vztahy-loading" class="ledger-loading">Načítám vztahy…</div>
    <div id="family-viz" style="margin-bottom:1.4rem"></div>
    <div class="nav-grid" id="vztahy-grid" style="display:none;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem"></div>
  </main>
  <div class="toast" id="toast"></div>
  <script src="/js/family-tree.js"></script>
  <script>
    const CAN_EDIT = ${canEdit};
    const DEFAULT_RANKS = ${JSON.stringify(DEFAULT_RANKS)};
    let RANKS = [];
    function esc(s){return(s==null?'':String(s)).replace(/</g,'&lt;');}

    function rankViewHtml(ranks){
      return ranks.map(r => '<div class="rank-item' + (r.isFounder?' founder':'') + '"><div class="rank-num">' + r.num + '</div><div class="rank-info"><h3>' + esc(r.rank) + '</h3>' +
        (r.member ? '<div class="rank-member">' + esc(r.member) + '</div>' : '') +
        '<p>' + esc(r.desc) + '</p><div class="rank-rights">' + (r.rights||[]).map(right=>'<span class="rank-right-tag">'+esc(right)+'</span>').join('') + '</div></div></div>').join('');
    }

    async function loadHierarchy(){
      try{
        const res = await fetch('/api/content/hierarchy');
        const d = await res.json();
        RANKS = (d.ok && Array.isArray(d.data) && d.data.length) ? d.data : DEFAULT_RANKS;
      }catch(e){ RANKS = DEFAULT_RANKS; }
      document.getElementById('rank-timeline').innerHTML = rankViewHtml(RANKS);
    }
    loadHierarchy();

    const CAN_EDIT_DEPT = ${canEdit};
    async function loadDepartments(){
      if(!CAN_EDIT_DEPT) return;
      try{
        const res = await fetch('/api/admin/departments');
        const d = await res.json();
        document.getElementById('dept-loading').style.display='none';
        const list = document.getElementById('dept-list');
        if(!d.ok || !d.seniorMembers.length){ list.innerHTML = ledgerEmptyHTML('Zatím žádní Senior Members', true); return; }
        const optionHtml = (current) => '<option value=""' + (!current?' selected':'') + '>— bez oddělení —</option>' +
          d.options.map(o => '<option value="' + o.key + '"' + (o.key===current?' selected':'') + '>' + esc(o.label) + '</option>').join('');
        list.innerHTML = d.seniorMembers.map(m => '<div class="nav-card" style="display:flex;align-items:center;justify-content:space-between;gap:1rem">' +
          '<div><div class="nav-card-title" style="font-size:0.95rem;margin-bottom:0.1rem">' + esc(m.icName||'—') + '</div><div class="nav-card-desc">@' + esc(m.discordUsername||'—') + '</div></div>' +
          '<select onchange="setDepartment(' + m.id + ',this.value)" style="width:auto;min-width:200px">' + optionHtml(m.department) + '</select>' +
        '</div>').join('');
      }catch(e){ document.getElementById('dept-loading').textContent = 'Nepodařilo se načíst.'; }
    }
    window.setDepartment = async function(userId, department){
      const res = await fetch('/api/admin/departments', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId, department }) });
      const d = await res.json();
      if(d.ok){ showToast('Oddělení uloženo'); if(window.albionSound) window.albionSound.success(); } else showToast(d.error||'Chyba', true);
    };
    loadDepartments();

    function rankEditorHtml(ranks){
      return ranks.map((r,i) => '<div class="card" style="margin-bottom:0.9rem">' +
        '<div class="form-row"><div class="form-group"><label>Hodnost</label><input type="text" value="' + esc(r.rank) + '" onchange="RANKS[' + i + '].rank=this.value"></div>' +
        '<div class="form-group"><label>Jméno (volitelné)</label><input type="text" value="' + esc(r.member||'') + '" onchange="RANKS[' + i + '].member=this.value||null"></div></div>' +
        '<div class="form-group" style="margin-bottom:0.7rem"><label>Popis</label><textarea rows="2" onchange="RANKS[' + i + '].desc=this.value">' + esc(r.desc) + '</textarea></div>' +
        '<div class="form-group" style="margin-bottom:0.8rem"><label>Práva (oddělená čárkou)</label><input type="text" value="' + esc((r.rights||[]).join(', ')) + '" onchange="RANKS[' + i + '].rights=this.value.split(\\',\\').map(function(s){return s.trim();}).filter(Boolean)"></div>' +
        '<button onclick="removeRank(' + i + ')" style="background:transparent;border:1px solid var(--border-oxblood);color:var(--oxblood-bright);padding:0.4rem 0.8rem;font-family:var(--font-label);font-size:0.55rem;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer">Smazat pozici</button>' +
      '</div>').join('');
    }

    window.toggleEdit = function(){
      const editor = document.getElementById('rank-editor');
      const view = document.getElementById('rank-timeline');
      const actions = document.getElementById('editorActions');
      const opening = editor.style.display === 'none';
      editor.style.display = opening ? 'block' : 'none';
      view.style.display = opening ? 'none' : 'block';
      actions.style.display = opening ? 'block' : 'none';
      document.getElementById('editToggleBtn').textContent = opening ? 'Zrušit úpravy' : 'Upravit';
      if(opening) editor.innerHTML = rankEditorHtml(RANKS);
    };

    window.addRank = function(){
      RANKS.push({ rank: 'Nová pozice', num: '', member: null, isFounder: false, desc: '', rights: [] });
      document.getElementById('rank-editor').innerHTML = rankEditorHtml(RANKS);
    };
    window.removeRank = function(i){
      if(!confirm('Smazat tuto pozici z hierarchie?')) return;
      RANKS.splice(i, 1);
      document.getElementById('rank-editor').innerHTML = rankEditorHtml(RANKS);
    };

    window.saveHierarchy = async function(){
      if(!RANKS.length) return showToast('Hierarchie musí obsahovat alespoň jednu pozici', true);
      RANKS.forEach(function(r, i){ r.num = String(i + 1).padStart(2, '0'); });
      const res = await fetch('/api/content/hierarchy', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ data: RANKS }) });
      const d = await res.json();
      if(d.ok){ showToast('Hierarchie uložena'); if(window.albionSound) window.albionSound.success(); toggleEdit(); loadHierarchy(); } else showToast(d.error||'Chyba', true);
    };

    // Vztahy — beze změny oproti dřívější verzi
    const CAN_MANAGE_VZ = ${canManageVztahy};
    const VZTAH_LABEL = { mentor:'Mentor', rodina:'Jiná rodinná vazba', spojenec:'Spojenec', rival:'Rival', rodic:'Rodič → dítě', partner:'Partneři', sourozenec:'Sourozenci', stryc:'Strýc / teta → neteř / synovec', kmotr:'Kmotr → kmotřenec', znamy:'Rodinní známí' };
    const VZTAH_DIRECTED = { mentor:1, rodic:1, stryc:1, kmotr:1 };
    const nk = function(n){ return (n||'').toString().trim().toLowerCase(); };
    function relsOf(name, typ, asB){ // jména osob, které jsou s "name" ve vztahu typu typ
      const k = nk(name); const out = [];
      VZTAHY.forEach(function(v){
        if(v.typ !== typ) return;
        if(asB && nk(v.b) === k) out.push(v.a);
        else if(!asB && nk(v.a) === k) out.push(v.b);
      });
      return out;
    }
    function partnersOf(name){ const k=nk(name); const o=[]; VZTAHY.forEach(function(v){ if(v.typ!=='partner') return; if(nk(v.a)===k) o.push(v.b); else if(nk(v.b)===k) o.push(v.a); }); return o; }
    function siblingsOf(name){ const k=nk(name); const o=[]; VZTAHY.forEach(function(v){ if(v.typ!=='sourozenec') return; if(nk(v.a)===k) o.push(v.b); else if(nk(v.b)===k) o.push(v.a); }); return o; }
    // Co se při zápisu automaticky napojí: strýc/neteř přes rodiče, švagr přes partnera nebo sourozence
    window.vzRoleChanged = function(){
      const role = document.getElementById('vz-typ').value;
      const a = document.getElementById('vz-a').value.trim(), b = document.getElementById('vz-b').value.trim();
      const row = document.getElementById('vz-via-row'), sel = document.getElementById('vz-via'), label = document.getElementById('vz-via-label'), hint = document.getElementById('vz-via-hint');
      let opts = [], lab = '', h = '';
      if(role === 'stryc'){ lab = 'Strýc/teta přes kterého rodiče ' + (b||'B') + '?'; opts = b ? relsOf(b,'rodic',true).map(function(p){ return { v:'sib:'+p, t:(a||'A')+' je sourozenec osoby '+p }; }) : []; h = 'Napojí se jako sourozenec zvoleného rodiče — strýc/teta se pak dopočítá sám.'; }
      else if(role === 'neter'){ lab = 'Přes kterého rodiče ' + (a||'A') + '?'; opts = a ? relsOf(a,'rodic',true).map(function(p){ return { v:'sib:'+p, t:(b||'B')+' je sourozenec osoby '+p }; }) : []; h = 'Napojí se jako sourozenec zvoleného rodiče.'; }
      else if(role === 'svagr'){ lab = 'Švagr/švagrová přes koho?';
        if(b){ partnersOf(b).forEach(function(p){ opts.push({ v:'sib:'+p, t:(a||'A')+' je sourozenec partnera '+p }); }); siblingsOf(b).forEach(function(p){ opts.push({ v:'par:'+p, t:(a||'A')+' je partner sourozence '+p }); }); }
        h = 'Napojí se jako sourozenec partnera, nebo partner sourozence.'; }
      else { row.style.display = 'none'; return; }
      row.style.display = 'block'; label.textContent = lab;
      sel.innerHTML = opts.map(function(o){ return '<option value="'+esc(o.v)+'">'+esc(o.t)+'</option>'; }).join('') + '<option value="">— jen zapsat bez napojení —</option>';
      hint.textContent = opts.length ? h : 'Zatím nejsou známí žádní vhodní rodiče / partneři — vztah se zapíše samostatně. Doplň nejdřív rodiče (A je rodič B) a vrať se.';
    };
    ['vz-a','vz-b'].forEach(function(id){ setTimeout(function(){ const el=document.getElementById(id); if(el){ el.addEventListener('input', window.vzRoleChanged); el.addEventListener('change', window.vzRoleChanged); } }, 0); });
    let VZTAHY = [];
    let vzMode = 'tree';
    function renderViz(){
      const viz = document.getElementById('family-viz');
      const grid = document.getElementById('vztahy-grid');
      if(vzMode === 'list'){ viz.style.display='none'; grid.style.display='grid'; return; }
      grid.style.display='none'; viz.style.display='block';
      if(window.FamilyViz) window.FamilyViz.render(viz, VZTAHY, vzMode);
      else viz.innerHTML = '<div class="ledger-loading">Vizualizace se nenačetla (chybí /js/family-tree.js).</div>';
    }
    window.vzTab = function(mode){
      vzMode = mode;
      ['tree','network','list'].forEach(function(m){ const b=document.getElementById('vztab-btn-'+m); if(b) b.classList.toggle('active', m===mode); });
      renderViz();
    };
    async function loadVztahy(){
      const [vzRes, namesRes] = await Promise.all([fetch('/api/vztahy'), fetch('/api/ic-names')]);
      const vz = await vzRes.json(); const names = await namesRes.json();
      document.getElementById('vztahy-loading').style.display='none';
      if(names.ok && document.getElementById('vz-members')) document.getElementById('vz-members').innerHTML = names.names.map(n=>'<option value="'+esc(n)+'">').join('');
      const grid = document.getElementById('vztahy-grid');
      const list = vz.vztahy || [];
      VZTAHY = list;
      renderViz();
      if(!list.length){ grid.innerHTML = ledgerEmptyHTML('Zatím žádné zaznamenané vztahy',false,'people'); return; }
      grid.innerHTML = list.map(v => '<div class="nav-card">' +
        (CAN_MANAGE_VZ ? '<button onclick="delVztah(\\''+v.id+'\\')" style="float:right;background:none;border:1px solid var(--border-oxblood);color:var(--oxblood-bright);width:22px;height:22px;cursor:pointer">✕</button>' : '') +
        '<div class="nav-card-cat">' + (VZTAH_LABEL[v.typ]||v.typ) + '</div>' +
        '<div class="nav-card-title" style="font-size:1rem">' + esc(v.a) + (VZTAH_DIRECTED[v.typ]?' → ':' ↔ ') + esc(v.b) + '</div>' +
        (v.note ? '<div class="nav-card-desc">' + esc(v.note) + '</div>' : '') + '</div>'
      ).join('');
    }
    async function postVztah(a,b,typ,note){
      const res=await fetch('/api/vztahy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({a,b,typ,note})});
      return res.json();
    }
    function existsVztah(a,b,typ){ const x=nk(a), y=nk(b); return VZTAHY.some(function(v){ return v.typ===typ && ((nk(v.a)===x&&nk(v.b)===y) || ((typ==='partner'||typ==='sourozenec') && nk(v.a)===y && nk(v.b)===x)); }); }
    window.addVztah = async function(){
      let a=document.getElementById('vz-a').value.trim(), b=document.getElementById('vz-b').value.trim();
      let typ=document.getElementById('vz-typ').value; const note=document.getElementById('vz-note').value.trim();
      const via=(document.getElementById('vz-via-row').style.display!=='none') ? document.getElementById('vz-via').value : '';
      if(!a||!b)return showToast('Vyplň obě osoby',true);
      if(a.toLowerCase()===b.toLowerCase())return showToast('Osoby musí být různé',true);
      // role, které se ukládají otočeně
      if(typ==='neter'){ const t=a; a=b; b=t; typ='stryc'; }          // A je neteř B  =  B je strýc A
      else if(typ==='kmotrenec'){ const t=a; a=b; b=t; typ='kmotr'; } // A je kmotřenec B = B je kmotr A
      let msg='Vztah zapsán';
      try{
        if(via && (typ==='stryc'||typ==='svagr')){
          // napojení přes rodiče / partnera / sourozence — strýc, neteř i švagr se pak odvodí sami
          const kind=via.slice(0,3), other=via.slice(4);
          const person = a;   // strýc/teta, resp. švagr — ten, kdo se napojuje (u „neteře“ už po otočení rolí)
          const t2 = kind==='sib' ? 'sourozenec' : 'partner';
          if(!existsVztah(person,other,t2)) { const d=await postVztah(person,other,t2,''); if(!d.ok) return showToast(d.error,true); }
          msg='Napojeno: '+person+' — '+(kind==='sib'?'sourozenec ':'partner ')+other+' (příbuzenství se dopočítá)';
        } else if(typ==='svagr'){
          const d=await postVztah(a,b,'rodina','švagr/švagrová'); if(!d.ok) return showToast(d.error,true);
        } else {
          const d=await postVztah(a,b,typ,note); if(!d.ok) return showToast(d.error,true);
        }
      }catch(e){ return showToast('Zápis se nepodařil',true); }
      showToast(msg);
      ['vz-a','vz-b','vz-note'].forEach(function(id){ document.getElementById(id).value=''; });
      document.getElementById('vz-via-row').style.display='none';
      loadVztahy();
    };
    window.delVztah = async function(id){
      if(!confirm('Smazat tento vztah?'))return;
      const res=await fetch('/api/vztahy/'+id,{method:'DELETE'});
      const d=await res.json();
      if(d.ok)loadVztahy();else showToast(d.error,true);
    };
    loadVztahy();
  </script>
  </body></html>`;
}

module.exports = { renderHierarchy };
