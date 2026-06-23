// nastenska.js — extracted view module

const { baseStyles } = require('./styles');
const { renderNav } = require('./nav');

function renderNastenska(req) {
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Nástěnka</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'nastenska')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Albion</div>
        <h1 class="page-title">Nástěnka</h1>
        <p class="page-sub">Oznámení z aplikace kanálu — synchronizováno v reálném čase</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Oznámení organizace.</strong> Nástěnka zobrazuje zprávy přímo z interního kanálu Albionu a aktualizuje se každých 30 sekund. Nová oznámení jsou orámována pečetní barvou. Zprávu zde lze i odeslat — automaticky se publikuje do kanálu a upozorní ostatní členy.</p>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:2rem;align-items:start">
      <div>
        <div id="nastenska-list" class="nastenska-list">
          <div class="ledger-loading" style="justify-content:center;padding:3rem">Načítám oznámení...</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Nové oznámení</span></div>
        <div class="form-group" style="margin-bottom:0.8rem"><label>Název</label><input type="text" id="ann-title" placeholder="Důležité oznámení..."></div>
        <div class="form-group" style="margin-bottom:1rem"><label>Obsah</label><textarea id="ann-content" placeholder="Napište oznámení..." rows="5"></textarea></div>
        <button class="btn-submit" onclick="sendAnnouncement()">Zveřejnit</button>
        <p style="font-size:0.68rem;color:var(--text-muted);margin-top:0.8rem;text-align:center">Oznámení se odešle i do aplikace kanálu</p>
      </div>
    </div>
  </main>
  <script>
    const LAST_ID_KEY = 'albion_last_ann_id';
    let lastSeenId = localStorage.getItem(LAST_ID_KEY) || '0';

    async function loadAnnouncements() {
      const res = await fetch('/api/nastenska', { cache: 'no-store' });
      const data = await res.json();
      const list = document.getElementById('nastenska-list');
      if (!data.messages || !data.messages.length) {
        list.innerHTML = ledgerEmptyHTML('Žádná oznámení');
        return;
      }
      const newest = data.messages[0]?.id || '0';
      list.innerHTML = data.messages.map((m, i) => {
        const isNew = m.id > lastSeenId && lastSeenId !== '0' && i === 0;
        const dt = new Date(m.timestamp).toLocaleString('cs-CZ', {timeZone:'Europe/Prague'});
        return \`<div class="nastenska-item\${isNew?' new':''}">
          <div class="nastenska-meta">\${m.author} &nbsp;·&nbsp; \${dt}\${isNew ? '<span class="new-badge">NOVÉ</span>' : ''}</div>
          \${m.title ? \`<div class="nastenska-title">\${m.title.replace(/^📢\\s*/,'')}</div>\` : ''}
          <div class="nastenska-content">\${m.content || ''}</div>
        </div>\`;
      }).join('');
      lastSeenId = newest;
      localStorage.setItem(LAST_ID_KEY, newest);
    }

    async function sendAnnouncement() {
      const title = document.getElementById('ann-title').value;
      const content = document.getElementById('ann-content').value;
      if (!content.trim()) return showToast(' Obsah nemůže být prázdný', true);
      const res = await fetch('/api/nastenska', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,content})});
      const data = await res.json();
      if (data.ok) {
        showToast('OK Oznámení odesláno do aplikace');
        document.getElementById('ann-title').value = '';
        document.getElementById('ann-content').value = '';
        setTimeout(loadAnnouncements, 2000);
      } else showToast(' ' + (data.error || 'Chyba'), true);
    }

    const evtSrc = new EventSource('/api/events');
    evtSrc.addEventListener('nastenska', () => { lastSeenId = '0'; setTimeout(loadAnnouncements, 1000); });

    loadAnnouncements();
    setInterval(loadAnnouncements, 30000);
  </script>
  </body></html>`;
}

module.exports = { renderNastenska };

