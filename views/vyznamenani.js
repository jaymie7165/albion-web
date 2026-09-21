// views/vyznamenani.js — CALEDONIA · Vyznamenání
//
// Nová stránka. Odkaz "Vyznamenání" v postranním menu (nav.js, href
// '/vyznamenani') existoval už dřív a styles.js dokonce už měl hotové
// .badge-tile styly pro přesně tenhle katalog — ale samotná route/view
// v serveru chyběla, takže po kliknutí spadla defaultní Express chyba
// (Cannot GET /vyznamenani). Data bere z existujícího /api/me/achievements.
//
// Founder/Council navíc vidí panel pro RUČNÍ udělení odznaků označených
// `manual: true` v achievements.js (dřív se nedaly udělit vůbec — chyběl
// endpoint, teď /api/admin/achievements/grant v server.js).

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');
const { ACHIEVEMENTS, CATEGORY_LABELS } = require('../achievements');

function renderVyznamenani(req) {
  const canGrant = req.session.accessLevel === 1;

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Vyznamenání</title>
  ${baseStyles()}
  <style>
    .vz-progress-track{height:6px;background:var(--panel2);border:1px solid var(--border);margin:1.1rem 0 2.2rem;overflow:hidden}
    .vz-progress-fill{height:100%;background:var(--brass-bright);transition:width 0.4s ease}
    .vz-cat-label{font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--brass);margin:2rem 0 0.9rem}
    .vz-cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:0.8rem}
    .badge-tile{cursor:default}
  </style>
  </head><body>
  ${renderNav(req, 'achievements')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Caledonia</div>
        <h1 class="page-title">Vyznamenání</h1>
        <p class="page-sub">Katalog odznaků a tvůj postup</p>
      </div>
    </div>

    <div id="vz-summary" class="ledger-loading">Načítám…</div>
    <div class="vz-progress-track"><div class="vz-progress-fill" id="vz-progress-fill" style="width:0%"></div></div>
    <div id="vz-grid"></div>

    ${canGrant ? `
    <div class="folio-rule"></div>
    <div class="page-header" style="margin-bottom:1.4rem;border-bottom:none;padding-bottom:0">
      <div><div class="page-label">Vedení</div><h1 class="page-title" style="font-size:1.6rem">Udělit odznak</h1></div>
    </div>
    <div class="card">
      <div class="form-row">
        <div class="form-group"><label>Člen</label><select id="vz-member"><option value="">Načítám…</option></select></div>
        <div class="form-group"><label>Odznak</label><select id="vz-badge"><option value="">Načítám…</option></select></div>
      </div>
      <button class="btn-submit" onclick="grantBadge()" style="width:auto;padding:0.7rem 1.3rem">Udělit</button>
    </div>` : ''}
  </main>
  <div class="toast" id="toast"></div>
  <script>
    const CATALOG = ${JSON.stringify(ACHIEVEMENTS)};
    const CATEGORY_LABELS = ${JSON.stringify(CATEGORY_LABELS)};
    const CATEGORY_ORDER = ${JSON.stringify(Object.keys(CATEGORY_LABELS))};
    function esc(s){return(s==null?'':String(s)).replace(/</g,'&lt;');}

    async function loadAchievements(){
      try{
        const res = await fetch('/api/me/achievements');
        const d = await res.json();
        const summary = document.getElementById('vz-summary');
        const grid = document.getElementById('vz-grid');
        if(!d.ok){ summary.textContent = 'Nepodařilo se načíst vyznamenání.'; return; }
        const earnedKeys = new Set((d.earned||[]).map(a => typeof a === 'string' ? a : a.id));
        const allKeys = Object.keys(CATALOG);
        const earnedCount = allKeys.filter(k => earnedKeys.has(k)).length;
        summary.className = '';
        summary.innerHTML = '<span style="font-family:var(--font-mono);font-size:0.86rem;color:var(--ivory)">' + earnedCount + ' / ' + allKeys.length + ' odznaků odemčeno</span>';
        document.getElementById('vz-progress-fill').style.width = (allKeys.length ? Math.round(earnedCount/allKeys.length*100) : 0) + '%';

        grid.innerHTML = CATEGORY_ORDER.map(cat => {
          const keys = allKeys.filter(k => CATALOG[k].cat === cat);
          if(!keys.length) return '';
          return '<div class="vz-cat-label">' + esc(CATEGORY_LABELS[cat] || cat) + '</div><div class="vz-cat-grid">' +
            keys.map(k => {
              const a = CATALOG[k]; const earned = earnedKeys.has(k);
              return '<div class="badge-tile ' + (earned?'earned':'locked') + '" title="' + esc(a.desc) + '">' +
                '<div class="badge-tile-icon">' + (a.icon||'★') + '</div>' +
                '<div class="badge-tile-label">' + esc(a.label) + '</div>' +
                '<div class="badge-tile-cat">' + (earned ? 'Získáno' : (a.manual ? 'Uděluje vedení' : 'Zamčeno')) + '</div>' +
              '</div>';
            }).join('') + '</div>';
        }).join('');
      }catch(e){ document.getElementById('vz-summary').textContent = 'Nepodařilo se načíst vyznamenání.'; }
    }
    loadAchievements();

    ${canGrant ? `
    async function loadGrantForm(){
      try{
        const res = await fetch('/api/admin/members');
        const d = await res.json();
        const memberSel = document.getElementById('vz-member');
        memberSel.innerHTML = '<option value="">Vyber člena…</option>' + (d.ok ? d.members.map(m => '<option value="'+m.id+'">'+esc(m.ic_name||'—')+'</option>').join('') : '');
      }catch(e){ document.getElementById('vz-member').innerHTML = '<option value="">Nelze načíst</option>'; }
      const badgeSel = document.getElementById('vz-badge');
      const manualKeys = Object.keys(CATALOG).filter(k => CATALOG[k].manual);
      badgeSel.innerHTML = '<option value="">Vyber odznak…</option>' + manualKeys.map(k => '<option value="'+k+'">'+esc(CATALOG[k].label)+' — '+esc(CATALOG[k].desc)+'</option>').join('');
    }
    loadGrantForm();

    window.grantBadge = async function(){
      const userId = document.getElementById('vz-member').value;
      const key = document.getElementById('vz-badge').value;
      if(!userId || !key) return showToast('Vyber člena i odznak', true);
      const res = await fetch('/api/admin/achievements/grant', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId, key }) });
      const d = await res.json();
      if(d.ok){ showToast('Odznak udělen'); loadAchievements(); } else showToast(d.error || 'Chyba', true);
    };
    ` : ''}
  </script>
  </body></html>`;
}

module.exports = { renderVyznamenani };
