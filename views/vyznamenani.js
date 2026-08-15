// views/vyznamenani.js — CALEDONIA · Vyznamenání
// Katalog všech odznaků (kategorie), vitrína členů, a pro Founder/Council
// panel pro ruční udělení (viz /api/admin/achievements/grant v server.js).

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderVyznamenani(req) {
  const canGrant = req.session.accessLevel === 1;
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Vyznamenání</title>
  ${baseStyles()}
  <style>
    .badge-cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:0.8rem;margin-bottom:2rem}
    .member-badges-row{display:flex;align-items:center;justify-content:space-between;padding:0.9rem 0;border-bottom:1px solid var(--border);gap:1rem}
    .member-badges-row:last-child{border-bottom:none}
    .member-badges-icons{display:flex;flex-wrap:wrap;gap:0.3rem}
    .mini-badge{font-size:1rem;opacity:0.9}
  </style>
  </head><body>
  ${renderNav(req, 'achievements')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Caledonia — Uznání</div>
        <h1 class="page-title">Vyznamenání</h1>
        <p class="page-sub">Katalog odznaků a vitrína úspěchů členů organizace</p>
      </div>
      ${canGrant ? `<button class="quick-btn" onclick="openGrantModal()" style="background:transparent;border:1px solid var(--border-brass);color:var(--ivory-dim);padding:0.6rem 1.1rem;font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer">+ Udělit vyznamenání</button>` : ''}
    </div>
    <p class="folio-footnote"><strong>Automatická i ruční ocenění.</strong> Většina odznaků se uděluje automaticky na základě aktivity a obratu. Odznaky označené jako ruční uděluje výhradně vedení organizace (Founder/Council) a jde vždy o vědomé rozhodnutí — Discord notifikace to zřetelně odlišuje od systémových zápisů.</p>

    <div id="cat-sections"><div class="ledger-loading">Načítám katalog…</div></div>

    <div class="folio-rule"></div>
    <div class="folio-label" style="margin-bottom:1rem">Vitrína členů</div>
    <div id="member-showcase"><div class="ledger-loading">Načítám…</div></div>
  </main>

  ${canGrant ? `
  <div class="modal-overlay" id="grantModal">
    <div class="modal-box" style="max-width:440px">
      <div class="modal-title">Udělit vyznamenání</div>
      <div class="modal-subtitle">Toto je vědomé rozhodnutí vedení — Discord notifikace jasně uvede, že šlo o ruční udělení.</div>
      <div class="form-group" style="margin-bottom:0.85rem"><label>Člen</label><select id="grant-member"></select></div>
      <div class="form-group" style="margin-bottom:1rem"><label>Odznak</label><select id="grant-badge"></select></div>
      <div class="modal-actions">
        <button class="modal-btn-cancel" onclick="closeGrantModal()">Zrušit</button>
        <button class="modal-btn-confirm" onclick="submitGrant()">Udělit</button>
      </div>
    </div>
  </div>` : ''}
  <div class="toast" id="toast"></div>

  <script>
    const CAN_GRANT = ${canGrant};
    let CATALOG = {}, CATEGORIES = {}, MEMBERS = [];
    function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

    async function loadAll(){
      const res = await fetch('/api/achievements/all');
      const d = await res.json();
      if(!d.ok) return;
      CATALOG = d.catalog; CATEGORIES = d.categories; MEMBERS = d.members;
      renderCatalog(); renderShowcase();
    }

    function renderCatalog(){
      const wrap = document.getElementById('cat-sections');
      const byCat = {};
      Object.entries(CATALOG).forEach(([key, info]) => { (byCat[info.cat] = byCat[info.cat] || []).push({ key, ...info }); });
      wrap.innerHTML = Object.entries(CATEGORIES).map(([catKey, catLabel]) => {
        const items = byCat[catKey] || [];
        if(!items.length) return '';
        return '<div class="folio-label" style="margin-bottom:1rem">' + esc(catLabel) + '</div>' +
          '<div class="badge-cat-grid">' + items.map(b =>
            '<div class="badge-tile earned"><div class="badge-tile-icon">' + b.icon + '</div><div class="badge-tile-label">' + esc(b.label) + '</div>' +
            '<div class="badge-tile-cat">' + (b.manual ? 'Ruční' : 'Automatický') + '</div></div>'
          ).join('') + '</div>';
      }).join('');
    }

    function renderShowcase(){
      const wrap = document.getElementById('member-showcase');
      const withBadges = MEMBERS.filter(m => (m.achievements||[]).length);
      if(!withBadges.length){ wrap.innerHTML = ledgerEmptyHTML('Zatím nikdo nemá žádné vyznamenání', false, 'people'); return; }
      wrap.innerHTML = withBadges.sort((a,b)=>(b.achievements||[]).length-(a.achievements||[]).length).map(m => {
        const icons = (m.achievements||[]).map(a => {
          const key = typeof a === 'string' ? a : a.id;
          const info = CATALOG[key];
          return info ? '<span class="mini-badge" title="' + esc(info.label) + '">' + info.icon + '</span>' : '';
        }).join('');
        return '<div class="member-badges-row"><span style="font-family:var(--font-display);font-size:1rem;color:var(--ivory)">' + esc(m.ic_name) + '</span>' +
          '<div class="member-badges-icons">' + icons + '</div></div>';
      }).join('');

      if(CAN_GRANT){
        const memberSel = document.getElementById('grant-member');
        if(memberSel) memberSel.innerHTML = MEMBERS.map(m => '<option value="' + esc(m.ic_name) + '">' + esc(m.ic_name) + '</option>').join('');
        const badgeSel = document.getElementById('grant-badge');
        if(badgeSel) badgeSel.innerHTML = Object.entries(CATALOG).map(([key,info]) => '<option value="' + key + '">' + info.icon + ' ' + esc(info.label) + (info.manual?' (ruční)':'') + '</option>').join('');
      }
    }

    window.openGrantModal = function(){ document.getElementById('grantModal').classList.add('open'); };
    window.closeGrantModal = function(){ document.getElementById('grantModal').classList.remove('open'); };
    window.submitGrant = async function(){
      const icName = document.getElementById('grant-member').value;
      const key = document.getElementById('grant-badge').value;
      const res = await fetch('/api/admin/members');
      const d = await res.json();
      const member = (d.members||[]).find(m => m.ic_name === icName);
      if(!member) return showToast('Člen nenalezen', true);
      const r = await fetch('/api/admin/achievements/grant', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: member.id, key }) });
      const rd = await r.json();
      if(rd.ok){ showToast('Vyznamenání uděleno'); closeGrantModal(); loadAll(); } else showToast(rd.error, true);
    };

    loadAll();
  </script>
  </body></html>`;
}

module.exports = { renderVyznamenani };
