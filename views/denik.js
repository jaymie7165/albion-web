// views/denik.js — CALEDONIA · Deník
//
// Osobní zápisník člena. NENÍ vidět ostatním členům organizace. Founder/
// Council k němu přístup MÁ — a tahle stránka to říká rovnou a viditelně
// (banner nahoře, ne v patičce malým písmem). Žádná skrytá logika, žádné
// "tajné" čtení bez vědomí člena — to je přesně to, co jsme se rozhodli
// NEPOSTAVIT.

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderDenik(req) {
  const isFounderCouncil = (req.session.realAccessLevel || req.session.accessLevel) === 1;

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Deník</title>
  ${baseStyles()}
  <style>
    .denik-disclosure{background:var(--brass-faint);border:1px solid var(--border-brass);border-radius:var(--radius);padding:0.9rem 1.2rem;margin-bottom:1.6rem;font-family:var(--font-body);font-size:0.84rem;color:var(--ivory-dim);line-height:1.5;display:flex;gap:0.7rem;align-items:flex-start}
    .denik-disclosure svg{flex-shrink:0;margin-top:0.15rem;color:var(--brass)}
    .denik-entry{background:var(--panel2);border:1px solid var(--border);border-radius:var(--radius);padding:1.1rem 1.3rem;margin-bottom:0.8rem}
    .denik-entry-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem}
    .denik-entry-date{font-family:var(--font-mono);font-size:0.68rem;color:var(--brass)}
    .denik-entry-del{background:none;border:none;color:var(--ivory-faint);cursor:pointer;font-size:0.8rem;transition:color 0.15s}
    .denik-entry-del:hover{color:var(--oxblood-bright)}
    .denik-entry-text{font-family:var(--font-body);font-size:0.9rem;color:var(--ivory-dim);white-space:pre-wrap;line-height:1.6}
    .denik-admin-select{max-width:340px}
  </style>
  </head><body>
  ${renderNav(req, '')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Osobní</div>
        <h1 class="page-title">Deník</h1>
        <p class="page-sub">Tvoje soukromé poznámky a záznamy</p>
      </div>
    </div>

    <div class="denik-disclosure">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 9v4M12 17h.01M10.3 3.9 2.7 17.3a1.8 1.8 0 0 0 1.6 2.7h15.4a1.8 1.8 0 0 0 1.6-2.7L13.7 3.9a1.8 1.8 0 0 0-3.4 0Z"/></svg>
      <span>Ostatní členové organizace tvoje záznamy nevidí. <strong style="color:var(--brass-bright)">Founder/Council k nim může mít přístup pro účely vedení organizace</strong> — bez výjimek a bez skrytého sledování nad rámec tohoto.</span>
    </div>

    <div class="card" style="margin-bottom:1.6rem">
      <div class="form-group" style="margin-bottom:0.8rem"><textarea id="denik-text" rows="5" placeholder="Napiš si, co potřebuješ zaznamenat…"></textarea></div>
      <button class="btn-submit" onclick="addEntry()" style="width:auto;padding:0.7rem 1.3rem">Přidat záznam</button>
    </div>

    <div id="denik-list"><div class="ledger-loading">Načítám…</div></div>

    ${isFounderCouncil ? `
    <div class="folio-rule"></div>
    <div class="page-header" style="margin-bottom:1.4rem;border-bottom:none;padding-bottom:0">
      <div><div class="page-label">Vedení</div><h1 class="page-title" style="font-size:1.6rem">Deníky členů</h1>
      <p class="page-sub">Otevřeně přiznaný přístup — viz banner výše.</p></div>
    </div>
    <div class="card">
      <div class="form-group denik-admin-select">
        <label>Vyber člena</label>
        <select id="denik-admin-member" onchange="loadMemberNotes()"><option value="">Načítám…</option></select>
      </div>
      <div id="denik-admin-notes" style="margin-top:1rem"></div>
    </div>` : ''}
  </main>
  <div class="toast" id="toast"></div>
  <script>
    function esc(s){return(s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    function fmtDate(iso){ return new Date(iso).toLocaleString('cs-CZ',{day:'numeric',month:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}); }

    function entryHtml(n, canDelete){
      return '<div class="denik-entry">' +
        '<div class="denik-entry-meta"><span class="denik-entry-date">' + fmtDate(n.createdAt) + '</span>' +
        (canDelete ? '<button class="denik-entry-del" onclick="delEntry(\\''+n.id+'\\')">Smazat ✕</button>' : '') + '</div>' +
        '<div class="denik-entry-text">' + esc(n.text) + '</div>' +
      '</div>';
    }

    async function loadEntries(){
      const list = document.getElementById('denik-list');
      try{
        const res = await fetch('/api/notes/mine');
        const d = await res.json();
        if(!d.ok){ list.innerHTML = '<p style="color:var(--ivory-faint)">Nepodařilo se načíst.</p>'; return; }
        if(!d.notes.length){ list.innerHTML = ledgerEmptyHTML('Zatím žádné záznamy', false); return; }
        list.innerHTML = d.notes.map(n => entryHtml(n, true)).join('');
      }catch(e){ list.innerHTML = '<p style="color:var(--ivory-faint)">Nepodařilo se načíst.</p>'; }
    }
    window.addEntry = async function(){
      const el = document.getElementById('denik-text');
      const text = el.value.trim();
      if(!text) return showToast('Napiš něco', true);
      const res = await fetch('/api/notes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text }) });
      const d = await res.json();
      if(d.ok){ el.value=''; showToast('Záznam přidán'); if(window.albionSound) window.albionSound.success(); loadEntries(); }
      else showToast(d.error||'Chyba', true);
    };
    window.delEntry = async function(id){
      if(!confirm('Smazat tento záznam?')) return;
      const res = await fetch('/api/notes/'+id, { method:'DELETE' });
      const d = await res.json();
      if(d.ok) loadEntries(); else showToast(d.error||'Chyba', true);
    };
    loadEntries();

    ${isFounderCouncil ? `
    async function loadMemberList(){
      try{
        const res = await fetch('/api/admin/notes');
        const d = await res.json();
        const sel = document.getElementById('denik-admin-member');
        if(!d.ok || !d.members.length){ sel.innerHTML = '<option value="">Zatím nikdo nic nenapsal</option>'; return; }
        sel.innerHTML = '<option value="">Vyber člena…</option>' + d.members.map(m => '<option value="'+m.id+'">'+esc(m.icName||'—')+' ('+m.count+')</option>').join('');
      }catch(e){}
    }
    window.loadMemberNotes = async function(){
      const uid = document.getElementById('denik-admin-member').value;
      const wrap = document.getElementById('denik-admin-notes');
      if(!uid){ wrap.innerHTML=''; return; }
      wrap.innerHTML = '<div class="ledger-loading">Načítám…</div>';
      const res = await fetch('/api/admin/notes/'+uid);
      const d = await res.json();
      if(!d.ok || !d.notes.length){ wrap.innerHTML = ledgerEmptyHTML('Tento člen zatím nic nenapsal', true); return; }
      wrap.innerHTML = d.notes.map(n => entryHtml(n, false)).join('');
    };
    loadMemberList();
    ` : ''}
  </script>
  </body></html>`;
}

module.exports = { renderDenik };
