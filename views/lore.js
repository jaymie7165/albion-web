// views/lore.js — CALEDONIA · Historie (editovatelná)
// Přepojeno na /api/content/lore (content-store.js). GET = každý přihlášený,
// editace jen Founder/Council (requireAccess('audit') na serveru), bez
// záznamu autora poslední úpravy.

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

const DEFAULT_CHAPTERS = [
  { meta: 'Počátky', title: 'Vznik organizace', text: 'Caledonia vznikla krátce po příchodu Christophera Sinclaira do Los Santos. Po přesunu ze Spojeného království se Sinclair snažil začlenit do místního prostředí a navázat kontakty, které by mu umožnily vybudovat vlastní podnikatelské zázemí.\n\nPrávě během tohoto období se kolem něj začala formovat skupina lidí s podobným pohledem na svět.\n\nNázev Caledonia navrhl sám Sinclair — postupem času získal širší význam a začal symbolizovat samotnou organizaci a její identitu.' },
  { meta: 'Kapitola I', title: 'Formování organizace', text: 'První měsíce existence Caledonie byly zaměřeny především na budování kontaktů a získávání informací o fungování města. Caledonia nechtěla fungovat jako pouliční gang — dlouhodobý vliv nelze vybudovat prostřednictvím násilí nebo neustálých konfliktů.' },
  { meta: 'Kapitola II', title: 'Působení v Los Santos', text: 'V době svého vzniku nebyla Caledonia známým jménem. To zakladatelům vyhovovalo — jejich cílem nebylo získat okamžitou pozornost, ale vytvořit stabilní základy pro budoucí rozvoj.' },
  { meta: 'Kapitola III', title: 'Současnost', text: 'Caledonia se v současnosti nachází ve fázi růstu. Organizace nadále rozšiřuje své kontakty, hledá nové příležitosti a snaží se upevnit své postavení v Los Santos.' },
];

const QUOTES = [
  '„Nechtějí být známí tím, jak hlasitě o sobě dávají vědět, ale tím, čeho dokážou dosáhnout."',
  '„Důvěra se nedává. Důvěra se vydobývá, čin po činu."',
  '„Caledonia nestaví na strachu. Staví na slovu, které platí."',
  '„Kdo nemá ambice, nemá v Caledonii místo."',
];
function pickQuoteOfDay() { return QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length]; }

function renderLore(req) {
  const canEdit = req.session.accessLevel === 1;
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Historie</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'lore')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Caledonia</div>
        <h1 class="page-title">Historie &amp; Původ</h1>
        <p class="page-sub">Kronika organizace — od počátků po současnost</p>
      </div>
      ${canEdit ? `<button onclick="toggleEdit()" id="editToggleBtn" style="background:transparent;border:1px solid var(--border-brass);color:var(--ivory-dim);padding:0.55rem 1.1rem;font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer">Upravit</button>` : ''}
    </div>

    <div style="display:grid;grid-template-columns:1fr 260px;gap:2.5rem;align-items:start">
      <div>
        <div id="chapters-view"><div class="ledger-loading">Načítám…</div></div>
        <div id="chapters-editor" style="display:none"></div>
        ${canEdit ? `<div id="editorActions" style="display:none;margin-top:1rem"><button class="btn-submit" onclick="saveLore()" style="width:auto;padding:0.7rem 1.3rem">Uložit změny</button> <button onclick="addChapter()" style="background:transparent;border:1px solid var(--border);color:var(--ivory-faint);padding:0.7rem 1.1rem;font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;margin-left:0.6rem">+ Kapitola</button></div>` : ''}
      </div>
      <div>
        <div class="folio-label" style="margin-bottom:1rem">Citát dne</div>
        <p style="font-family:var(--font-display);font-size:0.98rem;color:var(--ivory-faint);line-height:1.85">${pickQuoteOfDay()}</p>
      </div>
    </div>
  </main>
  <script>
    const CAN_EDIT = ${canEdit};
    const DEFAULT_CHAPTERS = ${JSON.stringify(DEFAULT_CHAPTERS)};
    let CHAPTERS = [];
    function esc(s){return(s==null?'':String(s)).replace(/</g,'&lt;');}
    function nl2br(s){return esc(s).replace(/\\n/g,'<br><br>');}

    function chaptersViewHtml(chs){
      return chs.map(c => '<div style="margin-bottom:2.4rem"><div style="font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.24em;text-transform:uppercase;color:var(--brass);margin-bottom:0.7rem">' + esc(c.meta) + '</div>' +
        '<div style="font-family:var(--font-display);font-size:1.4rem;color:var(--ivory);margin-bottom:1rem">' + esc(c.title) + '</div>' +
        '<div style="font-family:var(--font-body);font-size:0.9rem;line-height:2;color:var(--ivory-dim);font-weight:300">' + nl2br(c.text) + '</div></div>').join('');
    }
    async function loadLore(){
      try{
        const res = await fetch('/api/content/lore');
        const d = await res.json();
        CHAPTERS = (d.ok && Array.isArray(d.data) && d.data.length) ? d.data : DEFAULT_CHAPTERS;
      }catch(e){ CHAPTERS = DEFAULT_CHAPTERS; }
      document.getElementById('chapters-view').innerHTML = chaptersViewHtml(CHAPTERS);
    }
    loadLore();

    function chaptersEditorHtml(chs){
      return chs.map((c,i) => '<div class="card" style="margin-bottom:0.9rem">' +
        '<div class="form-row"><div class="form-group"><label>Štítek (např. "Kapitola I")</label><input type="text" value="' + esc(c.meta) + '" onchange="CHAPTERS[' + i + '].meta=this.value"></div>' +
        '<div class="form-group"><label>Nadpis</label><input type="text" value="' + esc(c.title) + '" onchange="CHAPTERS[' + i + '].title=this.value"></div></div>' +
        '<div class="form-group"><label>Text</label><textarea rows="6" onchange="CHAPTERS[' + i + '].text=this.value">' + esc(c.text) + '</textarea></div>' +
        '<button onclick="removeChapter(' + i + ')" style="margin-top:0.6rem;background:none;border:1px solid var(--border-oxblood);color:var(--oxblood-bright);padding:0.4rem 0.8rem;font-family:var(--font-label);font-size:0.52rem;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer">Smazat kapitolu</button>' +
      '</div>').join('');
    }
    window.toggleEdit = function(){
      const editor = document.getElementById('chapters-editor');
      const view = document.getElementById('chapters-view');
      const actions = document.getElementById('editorActions');
      const opening = editor.style.display === 'none';
      editor.style.display = opening ? 'block' : 'none';
      view.style.display = opening ? 'none' : 'block';
      actions.style.display = opening ? 'block' : 'none';
      document.getElementById('editToggleBtn').textContent = opening ? 'Zrušit úpravy' : 'Upravit';
      if(opening) editor.innerHTML = chaptersEditorHtml(CHAPTERS);
    };
    window.addChapter = function(){ CHAPTERS.push({ meta:'Nová kapitola', title:'', text:'' }); document.getElementById('chapters-editor').innerHTML = chaptersEditorHtml(CHAPTERS); };
    window.removeChapter = function(i){ CHAPTERS.splice(i,1); document.getElementById('chapters-editor').innerHTML = chaptersEditorHtml(CHAPTERS); };
    window.saveLore = async function(){
      const res = await fetch('/api/content/lore', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ data: CHAPTERS }) });
      const d = await res.json();
      if(d.ok){ showToast('Historie uložena'); toggleEdit(); loadLore(); } else showToast(d.error||'Chyba', true);
    };
  </script>
  </body></html>`;
}

module.exports = { renderLore };
