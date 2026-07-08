// spis.js — Albion v3 · Osobní spisy členů (#4) — tajné poznámky Founder/Council

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderSpisy(req, members) {
  const membersJson = JSON.stringify(members);
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Osobní spisy</title>
  ${baseStyles()}
  <style>
    .spis-shell{display:grid;grid-template-columns:280px 1fr;gap:1.6rem;align-items:start}
    .spis-list{background:var(--panel2);border:1px solid var(--border-brass);max-height:70vh;overflow-y:auto;position:sticky;top:calc(var(--nav-h) + 1.5rem)}
    .spis-list-item{padding:0.9rem 1.1rem;border-bottom:1px solid var(--border);cursor:pointer;font-family:var(--font-display);font-style:italic;font-size:0.92rem;color:var(--ivory-dim);transition:background 0.15s}
    .spis-list-item:last-child{border-bottom:none}
    .spis-list-item:hover{background:var(--brass-faint);color:var(--ivory)}
    .spis-list-item.active{background:var(--oxblood-faint);color:var(--brass-bright);border-left:2px solid var(--oxblood)}
    .spis-editor{background:var(--panel2);border:1px solid var(--border-brass);padding:2rem}
    .spis-editor-empty{color:var(--ivory-faint);font-family:var(--font-mono);font-size:0.84rem;text-align:center;padding:3rem 1rem}
    .spis-meta{font-family:var(--font-mono);font-size:0.62rem;color:var(--ivory-faint);margin-top:0.6rem}
    @media(max-width:820px){.spis-shell{grid-template-columns:1fr}.spis-list{position:static;max-height:220px}}
  </style>
  </head><body>
  ${renderNav(req, 'spis')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Caledonia — Interní</div>
        <h1 class="page-title">Osobní spisy</h1>
        <p class="page-sub">Důvěrné poznámky o členech — vidí jen Founder/Council</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Přísně důvěrné.</strong> Zápisy zde nejsou vidět nikomu mimo nejužší vedení organizace. Používej je pro motivace, rizika, poznámky z jednání.</p>

    <div class="spis-shell">
      <div class="spis-list" id="spisList"></div>
      <div class="spis-editor" id="spisEditor"><div class="spis-editor-empty">Vyber člena ze seznamu vlevo</div></div>
    </div>
  </main>
  <div class="toast" id="toast"></div>
  <script>
    const MEMBERS = ${membersJson};
    let activeMember = null;

    function renderList(){
      document.getElementById('spisList').innerHTML = MEMBERS.map(m =>
        '<div class="spis-list-item'+(m===activeMember?' active':'')+'" onclick="openSpis(\\''+m.replace(/'/g,"\\\\'")+'\\')">'+m+'</div>'
      ).join('');
    }
    async function openSpis(icName){
      activeMember = icName;
      renderList();
      const editor = document.getElementById('spisEditor');
      editor.innerHTML = '<div class="ledger-loading">Otevírám spis…</div>';
      const res = await fetch('/api/spis/' + encodeURIComponent(icName));
      const d = await res.json();
      const dossier = d.dossier || { notes: '' };
      editor.innerHTML =
        '<div class="folio-label" style="margin-bottom:1rem">Spis — ' + icName + '</div>' +
        '<textarea id="spisNotes" rows="14" placeholder="Poznámky, motivace, rizika, historie jednání…" style="font-family:var(--font-mono);font-size:0.86rem">' + (dossier.notes||'').replace(/</g,'&lt;') + '</textarea>' +
        '<button class="btn-submit" onclick="saveSpis()">Uložit spis</button>' +
        '<div class="spis-meta">' + (dossier.updatedAt ? ('Naposledy upravil ' + (dossier.updatedBy||'—') + ' — ' + new Date(dossier.updatedAt).toLocaleString('cs-CZ')) : 'Zatím žádný zápis') + '</div>';
    }
    window.openSpis = openSpis;
    async function saveSpis(){
      if(!activeMember)return;
      const notes = document.getElementById('spisNotes').value;
      const res = await fetch('/api/spis/' + encodeURIComponent(activeMember), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ notes }) });
      const d = await res.json();
      if(d.ok){ if(window.albionSealThud) window.albionSealThud(); showToast('Spis uložen'); openSpis(activeMember); }
      else showToast(d.error||'Chyba', true);
    }
    window.saveSpis = saveSpis;
    renderList();
  </script>
  </body></html>`;
}

module.exports = { renderSpisy };
