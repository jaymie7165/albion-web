// audit.js — extracted view module

const { baseStyles } = require('./styles');
const { renderNav } = require('./nav');

function renderAudit(req) {
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Audit</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'audit')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Albion</div>
        <h1 class="page-title">Audit</h1>
        <p class="page-sub">Kompletní záznam všech akcí — posledních 200 záznamů</p>
      </div>
    </div>
    <p class="folio-footnote">Audit zobrazuje chronologicky seřazené záznamy všech akcí v systému — vklady a výběry ze skladu, finanční pohyby i jejich autory. Záznamy lze filtrovat podle sekce nebo hledat textem. Finanční souhrn per člen je vidět u filtrů <strong>Vše</strong> a <strong>Účetnictví</strong>.</p>

    <div id="ucet-souhrn-wrap" style="display:none;margin-bottom:2rem">
      <div style="font-size:0.58rem;letter-spacing:0.3em;text-transform:uppercase;color:var(--brass);margin-bottom:0.8rem;opacity:0.9;font-family:var(--font-mono)">Účetnictví — souhrn per člen</div>
      <div id="ucet-souhrn-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem"></div>
    </div>

    <div class="card">
      <div style="display:flex;gap:0.8rem;margin-bottom:1.2rem;flex-wrap:wrap;align-items:center">
        <div class="audit-search-wrap" style="position:relative;flex:1;min-width:220px;max-width:340px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--text-muted);pointer-events:none"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="audit-search" placeholder="Hledat jméno nebo detail…" style="width:100%;padding:0.55rem 0.8rem 0.55rem 2.1rem;font-size:0.82rem">
        </div>
        <span id="audit-result-count" style="font-size:0.66rem;letter-spacing:0.08em;color:var(--text-muted);font-family:var(--font-mono)"></span>
      </div>
      <div style="display:flex;gap:0.4rem;margin-bottom:1.5rem;flex-wrap:wrap">
        <button class="typ-btn active-vklad" onclick="filterAudit('vse')" id="filter-vse" style="flex:none;padding:0.4rem 1rem">Vše</button>
        <button class="typ-btn" onclick="filterAudit('Zbraně')" id="filter-zbrane" style="flex:none;padding:0.4rem 1rem">Zbraně</button>
        <button class="typ-btn" onclick="filterAudit('Weed')" id="filter-weed" style="flex:none;padding:0.4rem 1rem">Weed</button>
        <button class="typ-btn" onclick="filterAudit('Drogy')" id="filter-drogy" style="flex:none;padding:0.4rem 1rem">Drogy</button>
        <button class="typ-btn" onclick="filterAudit('Chemky')" id="filter-chemky" style="flex:none;padding:0.4rem 1rem">Chemky</button>
        <button class="typ-btn" onclick="filterAudit('Účetnictví')" id="filter-ucet" style="flex:none;padding:0.4rem 1rem">Účetnictví</button>
        <span style="margin-left:auto;font-size:0.62rem;letter-spacing:0.1em;color:var(--text-muted);display:flex;align-items:center;gap:0.5rem;font-family:var(--font-mono)">
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--seal-bright)"></span>Web
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--text-dim)"></span>Discord bot
        </span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Čas</th><th>Zdroj</th><th>Sekce</th><th>Typ</th><th>Člen</th><th>Detail</th></tr></thead>
          <tbody id="audit-body"><tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2.5rem">Načítám...</td></tr></tbody>
        </table>
      </div>
    </div>
  </main>
  <script>
    let allEvents = [];
    let ucetSouhrn = {};
    let activeFilter = 'vse';
    let searchTerm = '';

    async function loadAudit() {
      const res = await fetch('/api/audit', { cache: 'no-store' });
      const data = await res.json();
      allEvents = data.events || [];
      ucetSouhrn = data.ucetSouhrn || {};
      applyAuditFilters();
      renderUcetSouhrn();
    }

    function renderUcetSouhrn() {
      const users = Object.keys(ucetSouhrn);
      const wrap = document.getElementById('ucet-souhrn-wrap');
      const grid = document.getElementById('ucet-souhrn-grid');
      if (!users.length) { wrap.style.display = 'none'; return; }
      wrap.style.display = 'block';
      grid.innerHTML = users.map(uz => {
        const s = ucetSouhrn[uz];
        const netUsd = (s.prijem_usd - s.vydaj_usd);
        const netPesos = (s.prijem_pesos - s.vydaj_pesos);
        return \`<div class="card" style="padding:1.2rem">
          <div style="font-family:var(--font-display);font-weight:600;font-size:0.9rem;margin-bottom:0.8rem;color:var(--vellum)">\${uz}</div>
          \${s.prijem_usd || s.vydaj_usd ? \`
          <div style="display:flex;justify-content:space-between;font-size:0.77rem;padding:0.25rem 0">
            <span style="color:var(--text-muted)">USD příjmy / výdaje</span>
            <span><strong style="color:#6FBF52">$\${s.prijem_usd.toLocaleString('cs-CZ')}</strong> / <strong style="color:var(--seal-bright)">$\${s.vydaj_usd.toLocaleString('cs-CZ')}</strong></span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.74rem;padding:0.2rem 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--text-muted)">Net USD</span>
            <strong style="color:\${netUsd>=0?'#6FBF52':'var(--blood)'}">\${netUsd>=0?'+':''}\$\${netUsd.toLocaleString('cs-CZ')}</strong>
          </div>\` : ''}
          \${s.prijem_pesos || s.vydaj_pesos ? \`
          <div style="display:flex;justify-content:space-between;font-size:0.77rem;padding:0.25rem 0">
            <span style="color:var(--text-muted)">Pesos příjmy / výdaje</span>
            <span><strong style="color:#6FBF52">₱\${s.prijem_pesos.toLocaleString('cs-CZ')}</strong> / <strong style="color:var(--seal-bright)">₱\${s.vydaj_pesos.toLocaleString('cs-CZ')}</strong></span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.74rem;padding:0.2rem 0">
            <span style="color:var(--text-muted)">Net Pesos</span>
            <strong style="color:\${netPesos>=0?'#6FBF52':'var(--blood)'}">\${netPesos>=0?'+':''}₱\${netPesos.toLocaleString('cs-CZ')}</strong>
          </div>\` : ''}
        </div>\`;
      }).join('');
    }

    function renderTable(events) {
      const tbody = document.getElementById('audit-body');
      if (!events.length) { tbody.innerHTML = '<tr><td colspan="6" style="padding:1.5rem">' + ledgerEmptyHTML('Žádné záznamy', true) + '</td></tr>'; return; }
      const SEKCE_MONO = {
        'Zbraně':      { letter: 'Z', color: 'var(--brass)' },
        'Weed':        { letter: 'W', color: '#7A9A4A' },
        'Drogy':       { letter: 'D', color: 'var(--seal-bright)' },
        'Chemky':      { letter: 'CH', color: '#6FA8C9' },
        'Účetnictví':  { letter: 'Ú', color: 'var(--brass-bright)' },
      };
      tbody.innerHTML = events.map(e => {
        const typCls = e.typ === 'VKLAD' || e.typ === 'PŘÍJEM' ? 'vklad' : 'vyber';
        const srcLabel = e.source === 'web'
          ? '<span style="font-size:0.58rem;letter-spacing:0.1em;color:var(--seal-bright);border:1px solid var(--border-seal);padding:0.15rem 0.5rem;font-family:var(--font-mono)">WEB</span>'
          : '<span style="font-size:0.58rem;letter-spacing:0.1em;color:var(--text-dim);border:1px solid var(--border);padding:0.15rem 0.5rem;font-family:var(--font-mono)">BOT</span>';
        const mono = SEKCE_MONO[e.sekce] || { letter: '?', color: 'var(--text-muted)' };
        const monoHtml = '<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border:1px solid '+mono.color+';color:'+mono.color+';font-family:var(--font-mono);font-size:0.6rem;font-weight:700;border-radius:2px;margin-right:0.55rem;flex-shrink:0;opacity:0.9">'+mono.letter+'</span>';
        return \`<tr>
          <td style="white-space:nowrap;color:var(--text-muted);font-size:0.82rem;font-family:var(--font-mono)">\${e.cas}</td>
          <td>\${srcLabel}</td>
          <td style="font-weight:500;display:flex;align-items:center">\${monoHtml}\${e.sekce}</td>
          <td><span class="badge \${typCls}">\${e.typ}</span></td>
          <td style="color:var(--vellum);font-weight:500">\${e.uzivatel}</td>
          <td style="color:var(--text-dim)">\${e.detail}</td>
        </tr>\`;
      }).join('');
    }

    function applyAuditFilters() {
      let filtered = activeFilter === 'vse' ? allEvents : allEvents.filter(e => e.sekce === activeFilter);
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        filtered = filtered.filter(e =>
          (e.uzivatel || '').toLowerCase().includes(q) ||
          (e.detail || '').toLowerCase().includes(q)
        );
      }
      renderTable(filtered);
      const countEl = document.getElementById('audit-result-count');
      if (countEl) countEl.textContent = searchTerm ? (filtered.length + ' / ' + allEvents.length + ' záznamů') : '';
    }

    function filterAudit(sekce) {
      activeFilter = sekce;
      document.querySelectorAll('[id^=filter-]').forEach(b => b.className = 'typ-btn');
      let btnId;
      if (sekce === 'vse') btnId = 'filter-vse';
      else if (sekce === 'Chemky') btnId = 'filter-chemky';
      else btnId = 'filter-' + sekce.toLowerCase().replace('ě','e').replace('í','i').replace('č','c').replace('ú','u');
      const btn = document.getElementById(btnId);
      if (btn) btn.className = 'typ-btn active-vklad';
      applyAuditFilters();
      document.getElementById('ucet-souhrn-wrap').style.display = (sekce === 'vse' || sekce === 'Účetnictví') ? 'block' : 'none';
    }

    const auditSearchInput = document.getElementById('audit-search');
    let _auditSearchDebounce = null;
    auditSearchInput.addEventListener('input', (e) => {
      clearTimeout(_auditSearchDebounce);
      _auditSearchDebounce = setTimeout(() => {
        searchTerm = e.target.value.trim();
        applyAuditFilters();
      }, 150);
    });

    loadAudit();
    const evtSrc = new EventSource('/api/events');
    ['skladUpdate','ucetUpdate'].forEach(ev => evtSrc.addEventListener(ev, () => setTimeout(loadAudit, 2000)));
  </script>
  </body></html>`;
}

module.exports = { renderAudit };

