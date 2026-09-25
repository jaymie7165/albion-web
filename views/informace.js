// views/informace.js — CALEDONIA · Informace
//
// Nová stránka. Odkaz "Informace" v postranním menu (nav.js, href
// '/informace') existoval už dřív, ale route/view chyběly — proto se
// nenačetla vůbec (stejná chyba jako dřív u Vyznamenání/Rozcestníku).
//
// Napojeno na existující obecný content-store systém (stejný, jaký už
// používá Hierarchie a Kodex/Lore) — jen s novým klíčem 'informace'. Server
// stranu (nový store + routing v /api/content/:key) je potřeba doplnit v
// server.js, viz komentář tam.
//
// Obsah = seznam sekcí (nadpis + text), Founder/Council přidává/upravuje/
// maže, ostatní jen čtou. Pokud jste "Informace" mysleli jinak (jiná
// struktura, jiná omezení viditelnosti), klidně popiš a přizpůsobím.

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

const DEFAULT_SECTIONS = [
  { title: 'Vítej', body: 'Tahle stránka je zatím prázdná — Founder/Council sem může doplnit interní informace organizace.' },
];

function renderInformace(req) {
  const canEdit = req.session.accessLevel === 1;

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Informace</title>
  ${baseStyles()}
  <style>
    .inf-section{margin-bottom:1.8rem}
    .inf-section h2{font-family:var(--font-display);font-size:1.15rem;color:var(--brass-bright);margin-bottom:0.5rem}
    .inf-section p{font-family:var(--font-body);font-size:0.9rem;color:var(--ivory-dim);line-height:1.75;white-space:pre-wrap}
  </style>
  </head><body>
  ${renderNav(req, 'informace')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Caledonia</div>
        <h1 class="page-title">Informace</h1>
        <p class="page-sub">Interní informace organizace</p>
      </div>
      ${canEdit ? `<button onclick="toggleEdit()" id="editToggleBtn" style="background:transparent;border:1px solid var(--border-brass);color:var(--ivory-dim);padding:0.55rem 1.1rem;font-family:var(--font-label);font-size:0.68rem;letter-spacing:0.04em;text-transform:uppercase;cursor:pointer">Upravit</button>` : ''}
    </div>

    <div id="inf-view"></div>
    <div id="inf-editor" style="display:none"></div>
    ${canEdit ? `<div id="editorActions" style="display:none;margin-top:1rem">
      <button class="btn-submit" onclick="addSection()" style="width:auto;padding:0.7rem 1.3rem;margin-right:0.6rem">+ Přidat sekci</button>
      <button class="btn-submit" onclick="saveInformace()" style="width:auto;padding:0.7rem 1.3rem">Uložit změny</button>
    </div>` : ''}
  </main>
  <div class="toast" id="toast"></div>
  <script>
    const CAN_EDIT = ${canEdit};
    const DEFAULT_SECTIONS = ${JSON.stringify(DEFAULT_SECTIONS)};
    let SECTIONS = [];
    function esc(s){return(s==null?'':String(s)).replace(/</g,'&lt;');}
    function nl2br(s){return esc(s).replace(/\\n/g,'<br>');}

    function viewHtml(sections){
      if(!sections.length) return ledgerEmptyHTML('Zatím žádné informace', false);
      return sections.map(s => '<div class="inf-section"><h2>'+esc(s.title)+'</h2><p>'+nl2br(s.body)+'</p></div>').join('');
    }

    async function loadInformace(){
      document.getElementById('inf-view').innerHTML = skeletonRows(3, [1]);
      try{
        const res = await fetch('/api/content/informace');
        const d = await res.json();
        SECTIONS = (d.ok && Array.isArray(d.data) && d.data.length) ? d.data : DEFAULT_SECTIONS;
      }catch(e){ SECTIONS = DEFAULT_SECTIONS; }
      document.getElementById('inf-view').innerHTML = viewHtml(SECTIONS);
    }
    loadInformace();

    function editorHtml(sections){
      return sections.map((s, i) => '<div class="card" style="margin-bottom:0.9rem">' +
        '<div class="form-group" style="margin-bottom:0.7rem"><label>Nadpis</label><input type="text" value="' + esc(s.title) + '" onchange="SECTIONS[' + i + '].title=this.value"></div>' +
        '<div class="form-group" style="margin-bottom:0.7rem"><label>Text</label><textarea rows="4" onchange="SECTIONS[' + i + '].body=this.value">' + esc(s.body) + '</textarea></div>' +
        '<button onclick="removeSection(' + i + ')" style="background:transparent;border:1px solid var(--border-oxblood);color:var(--oxblood-bright);padding:0.4rem 0.8rem;font-family:var(--font-label);font-size:0.55rem;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer">Smazat sekci</button>' +
      '</div>').join('');
    }

    window.toggleEdit = function(){
      const editor = document.getElementById('inf-editor');
      const view = document.getElementById('inf-view');
      const actions = document.getElementById('editorActions');
      const opening = editor.style.display === 'none';
      editor.style.display = opening ? 'block' : 'none';
      view.style.display = opening ? 'none' : 'block';
      actions.style.display = opening ? 'block' : 'none';
      document.getElementById('editToggleBtn').textContent = opening ? 'Zrušit úpravy' : 'Upravit';
      if(opening) editor.innerHTML = editorHtml(SECTIONS);
    };
    window.addSection = function(){
      SECTIONS.push({ title: 'Nová sekce', body: '' });
      document.getElementById('inf-editor').innerHTML = editorHtml(SECTIONS);
    };
    window.removeSection = function(i){
      SECTIONS.splice(i, 1);
      document.getElementById('inf-editor').innerHTML = editorHtml(SECTIONS);
    };
    window.saveInformace = async function(){
      const res = await fetch('/api/content/informace', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ data: SECTIONS }) });
      const d = await res.json();
      if(d.ok){ showToast('Informace uloženy'); if(window.albionSound) window.albionSound.success(); toggleEdit(); loadInformace(); } else showToast(d.error||'Chyba', true);
    };
  </script>
  </body></html>`;
}

module.exports = { renderInformace };
