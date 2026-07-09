// spis.js — Albion v4 · Osobní spisy — Founder/Council/GenK + Senior Member
//
// DATA MODEL (data/dossiers.json — pole záznamů, ne už objekt klíčovaný IC jménem):
// {
//   id, jmeno, kategorie: 'interni' | 'externi',
//   pozice: '', kontakt: '', poznamky: '', rizika: '', historie: '',
//   vytvoril, vytvorenoAt, upravil, upravenoAt
// }
// Jméno je teď VOLNÝ TEXT — spis lze založit na kohokoliv (člena i osobu
// mimo organizaci), ne jen na existující účty. Po uložení je záznam kdykoliv
// znovu otevřen a upraven.

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderSpisy(req) {
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Osobní spisy</title>
  ${baseStyles()}
  <style>
    .spis-shell{display:grid;grid-template-columns:300px 1fr;gap:1.6rem;align-items:start}
    .spis-list{background:var(--panel2);border:1px solid var(--border-brass);max-height:78vh;overflow-y:auto;position:sticky;top:calc(var(--nav-h) + 1.5rem)}
    .spis-cat-head{padding:0.7rem 1.1rem;font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--brass);background:var(--brass-faint);border-bottom:1px solid var(--border-brass)}
    .spis-list-item{padding:0.8rem 1.1rem;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s}
    .spis-list-item:hover{background:var(--brass-faint)}
    .spis-list-item.active{background:var(--oxblood-faint);border-left:2px solid var(--oxblood)}
    .spis-list-name{font-family:var(--font-display);font-style:italic;font-size:0.92rem;color:var(--ivory-dim)}
    .spis-list-item.active .spis-list-name{color:var(--brass-bright)}
    .spis-list-sub{font-family:var(--font-mono);font-size:0.6rem;color:var(--ivory-faint);margin-top:0.15rem}
    .spis-list-empty{padding:1.2rem;color:var(--ivory-faint);font-family:var(--font-mono);font-size:0.76rem}
    .spis-editor{background:var(--panel2);border:1px solid var(--border-brass);padding:2rem}
    .spis-editor-empty{color:var(--ivory-faint);font-family:var(--font-mono);font-size:0.84rem;text-align:center;padding:3rem 1rem}
    .spis-meta{font-family:var(--font-mono);font-size:0.62rem;color:var(--ivory-faint);margin-top:0.8rem;padding-top:0.8rem;border-top:1px solid var(--border)}
    .spis-new-btn{width:100%;padding:0.8rem;background:var(--oxblood);color:var(--ivory);border:1px solid var(--oxblood);font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;cursor:pointer}
    @media(max-width:900px){.spis-shell{grid-template-columns:1fr}.spis-list{position:static;max-height:280px}}
  </style>
  </head><body>
  ${renderNav(req, 'spis')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Caledonia — Interní</div>
        <h1 class="page-title">Osobní spisy</h1>
        <p class="page-sub">Důvěrné poznámky o lidech uvnitř i vně organizace</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Přísně důvěrné.</strong> Vidí jen Founder, Council, GenK a Senior Member. Spis lze založit na kohokoliv — člena organizace i osobu mimo ni. Všechna pole kromě jména jsou nepovinná a záznam je kdykoliv možné znovu otevřít a upravit.</p>

    <div class="spis-shell">
      <div class="spis-list" id="spisList"><div class="spis-list-empty">Načítám…</div></div>
      <div class="spis-editor" id="spisEditor"><div class="spis-editor-empty">Vyber spis vlevo, nebo založ nový</div></div>
    </div>
  </main>
  <div class="toast" id="toast"></div>
  <script>
    const CAN_DELETE = ${req.session.accessLevel === 1 ? 'true' : 'false'};
    let ENTRIES = [];
    let activeId = null;
    function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

    async function loadEntries(){
      const res = await fetch('/api/spis', { cache:'no-store' });
      const d = await res.json();
      ENTRIES = (d.entries||[]).sort((a,b)=>(a.jmeno||'').localeCompare(b.jmeno||'','cs'));
      renderList();
    }

    function renderList(){
      const wrap = document.getElementById('spisList');
      const interni = ENTRIES.filter(e=>e.kategorie!=='externi');
      const externi = ENTRIES.filter(e=>e.kategorie==='externi');
      function group(title,list){
        let h = '<div class="spis-cat-head">'+title+' ('+list.length+')</div>';
        if(!list.length) { h += '<div class="spis-list-empty">Zatím žádný spis</div>'; return h; }
        h += list.map(function(e){
          return '<div class="spis-list-item'+(e.id===activeId?' active':'')+'" onclick="openSpis(\\''+e.id+'\\')">'+
            '<div class="spis-list-name">'+esc(e.jmeno)+'</div>'+
            (e.pozice?('<div class="spis-list-sub">'+esc(e.pozice)+'</div>'):'')+
          '</div>';
        }).join('');
        return h;
      }
      wrap.innerHTML =
        '<div style="padding:0.8rem;border-bottom:1px solid var(--border-brass)"><button class="spis-new-btn" onclick="newSpis()">+ Založit nový spis</button></div>'+
        group('Uvnitř organizace', interni) + group('Vně organizace', externi);
    }

    function editorFormHtml(e){
      e = e || {};
      return '<div class="form-group" style="margin-bottom:0.8rem"><label>Jméno *</label><input type="text" id="f-jmeno" value="'+esc(e.jmeno||'')+'" placeholder="Jméno osoby"></div>'+
        '<div class="form-row">'+
          '<div class="form-group"><label>Kategorie</label><select id="f-kategorie">'+
            '<option value="interni"'+(e.kategorie!=='externi'?' selected':'')+'>Uvnitř organizace</option>'+
            '<option value="externi"'+(e.kategorie==='externi'?' selected':'')+'>Vně organizace</option>'+
          '</select></div>'+
          '<div class="form-group"><label>Pozice / vztah (nepovinné)</label><input type="text" id="f-pozice" value="'+esc(e.pozice||'')+'" placeholder="Member, obchodní partner…"></div>'+
        '</div>'+
        '<div class="form-group" style="margin-bottom:0.8rem"><label>Kontakt (nepovinné)</label><input type="text" id="f-kontakt" value="'+esc(e.kontakt||'')+'" placeholder="Telefon, přezdívka…"></div>'+
        '<div class="form-group" style="margin-bottom:0.8rem"><label>Rizika / na co si dát pozor (nepovinné)</label><textarea id="f-rizika" rows="3" placeholder="…">'+esc(e.rizika||'')+'</textarea></div>'+
        '<div class="form-group" style="margin-bottom:0.8rem"><label>Historie jednání (nepovinné)</label><textarea id="f-historie" rows="3" placeholder="…">'+esc(e.historie||'')+'</textarea></div>'+
        '<div class="form-group" style="margin-bottom:0.8rem"><label>Poznámky (nepovinné)</label><textarea id="f-poznamky" rows="5" placeholder="Motivace, dojmy, cokoliv dalšího…">'+esc(e.poznamky||'')+'</textarea></div>';
    }

    function newSpis(){
      activeId = null;
      renderList();
      const editor = document.getElementById('spisEditor');
      editor.innerHTML = '<div class="folio-label" style="margin-bottom:1rem">Nový spis</div>'+editorFormHtml({})+
        '<button class="btn-submit" onclick="saveSpis()">Založit spis</button>';
    }
    window.newSpis = newSpis;

    async function openSpis(id){
      activeId = id;
      renderList();
      const e = ENTRIES.find(function(x){return x.id===id;});
      if(!e) return;
      const editor = document.getElementById('spisEditor');
      editor.innerHTML = '<div class="folio-label" style="margin-bottom:1rem">Spis — '+esc(e.jmeno)+'</div>'+editorFormHtml(e)+
        '<div style="display:flex;gap:0.6rem">'+
          '<button class="btn-submit" onclick="saveSpis(\\''+id+'\\')" style="flex:1">Uložit změny</button>'+
          (CAN_DELETE ? ('<button class="btn-submit" onclick="deleteSpis(\\''+id+'\\')" style="flex:0 0 auto;background:transparent;border:1px solid var(--border-oxblood);color:var(--oxblood-bright)">Smazat</button>') : '')+
        '</div>'+
        '<div class="spis-meta">'+(e.upravenoAt ? ('Naposledy upravil '+esc(e.upravil||'—')+' — '+new Date(e.upravenoAt).toLocaleString('cs-CZ')) : ('Založil '+esc(e.vytvoril||'—')+' — '+new Date(e.vytvorenoAt).toLocaleString('cs-CZ')))+'</div>';
    }
    window.openSpis = openSpis;

    async function saveSpis(id){
      const payload = {
        jmeno: document.getElementById('f-jmeno').value.trim(),
        kategorie: document.getElementById('f-kategorie').value,
        pozice: document.getElementById('f-pozice').value.trim(),
        kontakt: document.getElementById('f-kontakt').value.trim(),
        rizika: document.getElementById('f-rizika').value.trim(),
        historie: document.getElementById('f-historie').value.trim(),
        poznamky: document.getElementById('f-poznamky').value.trim(),
      };
      if(!payload.jmeno) return showToast('Vyplň jméno', true);
      const url = id ? ('/api/spis/'+id) : '/api/spis';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, { method: method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const d = await res.json();
      if(d.ok){
        if(window.albionSealThud) window.albionSealThud();
        showToast(id ? 'Spis uložen' : 'Spis založen');
        await loadEntries();
        openSpis(d.entry.id);
      } else showToast(d.error||'Chyba', true);
    }
    window.saveSpis = saveSpis;

    async function deleteSpis(id){
      if(!confirm('Trvale smazat tento spis?')) return;
      const res = await fetch('/api/spis/'+id, { method:'DELETE' });
      const d = await res.json();
      if(d.ok){
        showToast('Spis smazán'); activeId=null;
        document.getElementById('spisEditor').innerHTML='<div class="spis-editor-empty">Vyber spis vlevo, nebo založ nový</div>';
        loadEntries();
      } else showToast(d.error||'Chyba', true);
    }
    window.deleteSpis = deleteSpis;

    loadEntries();
  </script>
  </body></html>`;
}

module.exports = { renderSpisy };
