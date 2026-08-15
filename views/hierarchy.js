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
      ${canEdit ? `<button onclick="toggleEdit()" id="editToggleBtn" style="background:transparent;border:1px solid var(--border-brass);color:var(--ivory-dim);padding:0.55rem 1.1rem;font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer">Upravit</button>` : ''}
    </div>

    <div id="rank-timeline"><div class="ledger-loading">Načítám…</div></div>
    <div id="rank-editor" style="display:none"></div>
    ${canEdit ? `<div id="editorActions" style="display:none;margin-top:1rem"><button class="btn-submit" onclick="saveHierarchy()" style="width:auto;padding:0.7rem 1.3rem">Uložit změny</button></div>` : ''}

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
          <select id="vz-typ"><option value="mentor">Mentor → Chráněnec</option><option value="rodina">Rodina</option><option value="spojenec">Spojenec</option><option value="rival">Rival</option></select>
        </div>
        <div class="form-group"><label>Poznámka (volitelné)</label><input type="text" id="vz-note" placeholder="Krátký kontext…"></div>
      </div>
      <button class="btn-submit" onclick="addVztah()">Zapsat vztah</button>
    </div>` : ''}
    <div id="vztahy-loading" class="ledger-loading">Načítám vztahy…</div>
    <div class="nav-grid" id="vztahy-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem"></div>
  </main>
  <div class="toast" id="toast"></div>
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

    function rankEditorHtml(ranks){
      return ranks.map((r,i) => '<div class="card" style="margin-bottom:0.9rem">' +
        '<div class="form-row"><div class="form-group"><label>Hodnost</label><input type="text" value="' + esc(r.rank) + '" onchange="RANKS[' + i + '].rank=this.value"></div>' +
        '<div class="form-group"><label>Jméno (volitelné)</label><input type="text" value="' + esc(r.member||'') + '" onchange="RANKS[' + i + '].member=this.value||null"></div></div>' +
        '<div class="form-group" style="margin-bottom:0.7rem"><label>Popis</label><textarea rows="2" onchange="RANKS[' + i + '].desc=this.value">' + esc(r.desc) + '</textarea></div>' +
        '<div class="form-group"><label>Práva (oddělená čárkou)</label><input type="text" value="' + esc((r.rights||[]).join(', ')) + '" onchange="RANKS[' + i + '].rights=this.value.split(\\',\\').map(function(s){return s.trim();}).filter(Boolean)"></div>' +
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

    window.saveHierarchy = async function(){
      const res = await fetch('/api/content/hierarchy', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ data: RANKS }) });
      const d = await res.json();
      if(d.ok){ showToast('Hierarchie uložena'); toggleEdit(); loadHierarchy(); } else showToast(d.error||'Chyba', true);
    };

    // Vztahy — beze změny oproti dřívější verzi
    const CAN_MANAGE_VZ = ${canManageVztahy};
    const VZTAH_LABEL = { mentor:'Mentor', rodina:'Rodina', spojenec:'Spojenec', rival:'Rival' };
    async function loadVztahy(){
      const [vzRes, namesRes] = await Promise.all([fetch('/api/vztahy'), fetch('/api/ic-names')]);
      const vz = await vzRes.json(); const names = await namesRes.json();
      document.getElementById('vztahy-loading').style.display='none';
      if(names.ok && document.getElementById('vz-members')) document.getElementById('vz-members').innerHTML = names.names.map(n=>'<option value="'+esc(n)+'">').join('');
      const grid = document.getElementById('vztahy-grid');
      const list = vz.vztahy || [];
      if(!list.length){ grid.innerHTML = ledgerEmptyHTML('Zatím žádné zaznamenané vztahy',false,'people'); return; }
      grid.innerHTML = list.map(v => '<div class="nav-card">' +
        (CAN_MANAGE_VZ ? '<button onclick="delVztah(\\''+v.id+'\\')" style="float:right;background:none;border:1px solid var(--border-oxblood);color:var(--oxblood-bright);width:22px;height:22px;cursor:pointer">✕</button>' : '') +
        '<div class="nav-card-cat">' + (VZTAH_LABEL[v.typ]||v.typ) + '</div>' +
        '<div class="nav-card-title" style="font-size:1rem">' + esc(v.a) + (v.typ==='mentor'?' → ':' ↔ ') + esc(v.b) + '</div>' +
        (v.note ? '<div class="nav-card-desc">' + esc(v.note) + '</div>' : '') + '</div>'
      ).join('');
    }
    window.addVztah = async function(){
      const a=document.getElementById('vz-a').value.trim(), b=document.getElementById('vz-b').value.trim();
      const typ=document.getElementById('vz-typ').value, note=document.getElementById('vz-note').value.trim();
      if(!a||!b)return showToast('Vyplň obě osoby',true);
      const res=await fetch('/api/vztahy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({a,b,typ,note})});
      const d=await res.json();
      if(d.ok){showToast('Vztah zapsán');document.getElementById('vz-a').value='';document.getElementById('vz-b').value='';document.getElementById('vz-note').value='';loadVztahy();}
      else showToast(d.error,true);
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
