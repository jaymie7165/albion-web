// views/informace.js — CALEDONIA · Informace (dřív Osobní spisy)
//
// DATA MODEL (data/dossiers.json — soubor beze změny názvu, ať se
// nepřijdou o dřívější data; jen se mění tvar záznamu):
// {
//   id, nazev, zjistil,
//   osoby: [{ jmeno, kontakt }, ...],           // libovolný počet
//   zaznamy: [{ text, autor, cas }, ...],        // rostoucí log, nic se nepřepisuje
//   vytvoril, vytvorenoAt, upravil, upravenoAt   // metadata k nazev/zjistil/osoby
// }
// Staré spisy (jmeno/kategorie/pozice/kontakt/rizika/historie/poznamky) se
// při načtení automaticky převedou na tenhle tvar (viz migrateEntry v
// server.js) — žádná data se neztratí, jen se zobrazí jako první záznamy v logu.

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderInformace(req) {
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Informace</title>
  ${baseStyles()}
  <style>
    .inf-shell{display:grid;grid-template-columns:300px 1fr;gap:1.6rem;align-items:start}
    .inf-list{background:var(--panel2);border:1px solid var(--border-brass);max-height:78vh;overflow-y:auto;position:sticky;top:calc(var(--nav-h) + 1.5rem)}
    .inf-list-item{padding:0.8rem 1.1rem;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s}
    .inf-list-item:hover{background:var(--brass-faint)}
    .inf-list-item.active{background:var(--oxblood-faint);border-left:2px solid var(--oxblood)}
    .inf-list-name{font-family:var(--font-display);font-style:italic;font-size:0.92rem;color:var(--ivory-dim)}
    .inf-list-item.active .inf-list-name{color:var(--brass-bright)}
    .inf-list-sub{font-family:var(--font-mono);font-size:0.6rem;color:var(--ivory-faint);margin-top:0.15rem}
    .inf-list-empty{padding:1.2rem;color:var(--ivory-faint);font-family:var(--font-mono);font-size:0.76rem}
    .inf-editor{background:var(--panel2);border:1px solid var(--border-brass);padding:2rem}
    .inf-editor-empty{color:var(--ivory-faint);font-family:var(--font-mono);font-size:0.84rem;text-align:center;padding:3rem 1rem}
    .inf-meta{font-family:var(--font-mono);font-size:0.62rem;color:var(--ivory-faint);margin-top:0.8rem;padding-top:0.8rem;border-top:1px solid var(--border)}
    .inf-new-btn{width:100%;padding:0.8rem;background:var(--oxblood);color:var(--ivory);border:1px solid var(--oxblood);font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;cursor:pointer}
    .inf-osoba-row{display:grid;grid-template-columns:1fr 1fr 30px;gap:0.5rem;align-items:center;margin-bottom:0.5rem}
    .inf-osoba-row input{margin:0}
    .inf-osoba-del{background:none;border:1px solid var(--border-oxblood);color:var(--oxblood-bright);width:30px;height:30px;cursor:pointer;flex-shrink:0}
    .inf-add-osoba-btn{background:transparent;border:1px solid var(--border-brass);color:var(--ivory-dim);padding:0.4rem 0.8rem;font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;margin-bottom:0.8rem}
    .inf-log{margin-top:0.4rem}
    .inf-log-entry{padding:0.8rem 0;border-bottom:1px solid var(--border)}
    .inf-log-entry:last-child{border-bottom:none}
    .inf-log-meta{font-family:var(--font-mono);font-size:0.6rem;color:var(--brass);margin-bottom:0.35rem}
    .inf-log-text{font-family:var(--font-body);font-size:0.86rem;color:var(--ivory-dim);line-height:1.65;white-space:pre-wrap;font-weight:300}
    .inf-log-empty{color:var(--ivory-faint);font-family:var(--font-mono);font-size:0.76rem;padding:0.6rem 0}
    @media(max-width:900px){.inf-shell{grid-template-columns:1fr}.inf-list{position:static;max-height:280px}}
  </style>
  </head><body>
  ${renderNav(req, 'informace')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Caledonia — Interní</div>
        <h1 class="page-title">Informace</h1>
        <p class="page-sub">Skupiny, osoby a průběžně doplňovaný přehled zjištění organizace</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Přísně důvěrné.</strong> Vidí jen Founder, Council, GenK a Senior Member. Založ záznam na skupinu nebo téma, přidej k němu lidi, kterých se týká, a průběžně dopisuj, co se kdy zjistilo — starší záznamy se nikdy nepřepisují, jen přibývají nové.</p>

    <div class="inf-shell">
      <div class="inf-list" id="infList"><div class="inf-list-empty">Načítám…</div></div>
      <div class="inf-editor" id="infEditor"><div class="inf-editor-empty">Vyber záznam vlevo, nebo založ nový</div></div>
    </div>
  </main>
  <div class="toast" id="toast"></div>
  <script>
    const CAN_DELETE = ${req.session.accessLevel === 1 ? 'true' : 'false'};
    const ME_IC_NAME = ${JSON.stringify(req.session.icName)};
    let ENTRIES = [];
    let activeId = null;
    let osobyBuffer = []; // rozpracované osoby v otevřeném formuláři (před uložením)
    function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

    async function loadEntries(){
      const res = await fetch('/api/informace', { cache:'no-store' });
      const d = await res.json();
      ENTRIES = (d.entries||[]).sort((a,b)=>(a.nazev||'').localeCompare(b.nazev||'','cs'));
      renderList();
    }

    function renderList(){
      const wrap = document.getElementById('infList');
      let h = '<div style="padding:0.8rem;border-bottom:1px solid var(--border-brass)"><button class="inf-new-btn" onclick="newInformace()">+ Založit nový záznam</button></div>';
      if(!ENTRIES.length){ h += '<div class="inf-list-empty">Zatím žádný záznam</div>'; }
      else {
        h += ENTRIES.map(function(e){
          const pocetOsob = (e.osoby||[]).length;
          const pocetZaznamu = (e.zaznamy||[]).length;
          return '<div class="inf-list-item'+(e.id===activeId?' active':'')+'" onclick="openInformace(\\''+e.id+'\\')">'+
            '<div class="inf-list-name">'+esc(e.nazev)+'</div>'+
            '<div class="inf-list-sub">'+pocetOsob+' '+(pocetOsob===1?'osoba':pocetOsob>=2&&pocetOsob<=4?'osoby':'osob')+' · '+pocetZaznamu+' '+(pocetZaznamu===1?'záznam':pocetZaznamu>=2&&pocetZaznamu<=4?'záznamy':'záznamů')+'</div>'+
          '</div>';
        }).join('');
      }
      wrap.innerHTML = h;
    }

    function osobyRowsHtml(){
      if(!osobyBuffer.length) return '<div class="inf-log-empty">Zatím nikdo přidaný</div>';
      return osobyBuffer.map(function(o, i){
        return '<div class="inf-osoba-row">'+
          '<input type="text" placeholder="Jméno" value="'+esc(o.jmeno)+'" oninput="osobyBuffer['+i+'].jmeno=this.value">'+
          '<input type="text" placeholder="Kontakt (telefon, přezdívka…)" value="'+esc(o.kontakt)+'" oninput="osobyBuffer['+i+'].kontakt=this.value">'+
          '<button type="button" class="inf-osoba-del" onclick="removeOsoba('+i+')" title="Odebrat">✕</button>'+
        '</div>';
      }).join('');
    }
    window.removeOsoba = function(i){ osobyBuffer.splice(i,1); document.getElementById('osobyWrap').innerHTML = osobyRowsHtml(); };
    window.addOsoba = function(){ osobyBuffer.push({jmeno:'',kontakt:''}); document.getElementById('osobyWrap').innerHTML = osobyRowsHtml(); };

    function logHtml(zaznamy){
      if(!zaznamy || !zaznamy.length) return '<div class="inf-log-empty">Zatím žádný záznam v logu</div>';
      return zaznamy.slice().reverse().map(function(z){
        return '<div class="inf-log-entry">'+
          '<div class="inf-log-meta">'+esc(z.autor||'—')+' · '+new Date(z.cas).toLocaleString('cs-CZ')+'</div>'+
          '<div class="inf-log-text">'+esc(z.text)+'</div>'+
        '</div>';
      }).join('');
    }

    function editorHeaderFormHtml(e){
      e = e || {};
      osobyBuffer = (e.osoby||[]).map(function(o){ return { jmeno:o.jmeno||'', kontakt:o.kontakt||'' }; });
      return '<div class="form-group" style="margin-bottom:0.8rem"><label>Název skupiny / informace *</label><input type="text" id="f-nazev" value="'+esc(e.nazev||'')+'" placeholder="Např. název skupiny nebo tématu"></div>'+
        '<div class="form-group" style="margin-bottom:1rem"><label>Kdo to zjistil</label><input type="text" id="f-zjistil" value="'+esc(e.zjistil||ME_IC_NAME||'')+'" placeholder="IC jméno"></div>'+
        '<div class="folio-label" style="margin-bottom:0.6rem">Přidružené osoby</div>'+
        '<div id="osobyWrap">'+osobyRowsHtml()+'</div>'+
        '<button type="button" class="inf-add-osoba-btn" onclick="addOsoba()">+ Přidat osobu</button>';
    }

    function newInformace(){
      activeId = null;
      renderList();
      const editor = document.getElementById('infEditor');
      editor.innerHTML = '<div class="folio-label" style="margin-bottom:1rem">Nový záznam</div>'+editorHeaderFormHtml({})+
        '<button class="btn-submit" onclick="saveInformace()" style="margin-top:0.6rem">Založit záznam</button>';
    }
    window.newInformace = newInformace;

    async function openInformace(id){
      activeId = id;
      renderList();
      const e = ENTRIES.find(function(x){return x.id===id;});
      if(!e) return;
      const editor = document.getElementById('infEditor');
      editor.innerHTML = '<div class="folio-label" style="margin-bottom:1rem">'+esc(e.nazev)+'</div>'+editorHeaderFormHtml(e)+
        '<div style="display:flex;gap:0.6rem;margin-top:0.6rem">'+
          '<button class="btn-submit" onclick="saveInformace(\\''+id+'\\')" style="flex:1">Uložit změny</button>'+
          (CAN_DELETE ? ('<button class="btn-submit" onclick="deleteInformace(\\''+id+'\\')" style="flex:0 0 auto;background:transparent;border:1px solid var(--border-oxblood);color:var(--oxblood-bright)">Smazat</button>') : '')+
        '</div>'+
        '<div class="inf-meta">'+(e.upravenoAt ? ('Naposledy upravil '+esc(e.upravil||'—')+' — '+new Date(e.upravenoAt).toLocaleString('cs-CZ')) : ('Založil '+esc(e.vytvoril||'—')+' — '+new Date(e.vytvorenoAt).toLocaleString('cs-CZ')))+'</div>'+
        '<div class="folio-rule"></div>'+
        '<div class="folio-label" style="margin-bottom:0.8rem">Přidat záznam do logu</div>'+
        '<div class="form-group" style="margin-bottom:0.6rem"><textarea id="f-novy-zaznam" rows="3" placeholder="Co, kdo, kdy, kde, proč, s kým…"></textarea></div>'+
        '<button class="btn-submit" onclick="pridatZaznam(\\''+id+'\\')" style="width:auto;padding:0.65rem 1.2rem">Přidat do logu</button>'+
        '<div class="folio-rule"></div>'+
        '<div class="folio-label" style="margin-bottom:0.4rem">Log ('+((e.zaznamy||[]).length)+')</div>'+
        '<div class="inf-log">'+logHtml(e.zaznamy)+'</div>';
    }
    window.openInformace = openInformace;

    async function saveInformace(id){
      const nazev = document.getElementById('f-nazev').value.trim();
      const zjistil = document.getElementById('f-zjistil').value.trim();
      if(!nazev) return showToast('Vyplň název', true);
      const osoby = osobyBuffer.filter(function(o){ return o.jmeno.trim(); }).map(function(o){ return { jmeno:o.jmeno.trim(), kontakt:o.kontakt.trim() }; });
      const url = id ? ('/api/informace/'+id) : '/api/informace';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, { method: method, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ nazev, zjistil, osoby }) });
      const d = await res.json();
      if(d.ok){
        showToast(id ? 'Záznam uložen' : 'Záznam založen');
        await loadEntries();
        openInformace(d.entry.id);
      } else showToast(d.error||'Chyba', true);
    }
    window.saveInformace = saveInformace;

    async function pridatZaznam(id){
      const ta = document.getElementById('f-novy-zaznam');
      const text = ta.value.trim();
      if(!text) return showToast('Napiš text záznamu', true);
      const res = await fetch('/api/informace/'+id+'/zaznam', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text }) });
      const d = await res.json();
      if(d.ok){
        showToast('Záznam přidán do logu');
        await loadEntries();
        openInformace(id);
      } else showToast(d.error||'Chyba', true);
    }
    window.pridatZaznam = pridatZaznam;

    async function deleteInformace(id){
      if(!confirm('Trvale smazat celý tento záznam včetně logu?')) return;
      const res = await fetch('/api/informace/'+id, { method:'DELETE' });
      const d = await res.json();
      if(d.ok){
        showToast('Záznam smazán'); activeId=null;
        document.getElementById('infEditor').innerHTML='<div class="inf-editor-empty">Vyber záznam vlevo, nebo založ nový</div>';
        loadEntries();
      } else showToast(d.error||'Chyba', true);
    }
    window.deleteInformace = deleteInformace;

    loadEntries();
  </script>
  </body></html>`;
}

module.exports = { renderInformace };
