// views/darkchat.js — CALEDONIA · Darkchat
//
// Živý obousměrný chat propojený s Discord kanálem (CHANNEL_DARKCHAT).
// Zprávy z Discordu chodí na web přes SSE (viz discord.js#startDarkchatGateway
// + server.js registrace discord.onDarkchatMessage → broadcastSSE), zprávy
// z webu jdou na Discord přes POST /api/darkchat/send. Vidí a píše sem úplně
// každý přihlášený člen (viz roles.js PAGE_ACCESS.darkchat = 3).

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderDarkchat(req) {
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Darkchat</title>
  ${baseStyles()}
  <style>
    .dc-shell{background:var(--panel2);border:1px solid var(--border-brass);display:flex;flex-direction:column;height:calc(100vh - var(--nav-h) - 3.4rem);max-height:74vh}
    .dc-log{flex:1;overflow-y:auto;padding:1.2rem 1.4rem;display:flex;flex-direction:column;gap:0.9rem}
    .dc-msg{max-width:80%}
    .dc-msg.me{align-self:flex-end;text-align:right}
    .dc-msg-meta{font-family:var(--font-mono);font-size:0.6rem;color:var(--ivory-faint);margin-bottom:0.25rem}
    .dc-msg-bubble{display:inline-block;background:var(--panel3);border:1px solid var(--border);padding:0.6rem 0.9rem;font-family:var(--font-body);font-size:0.86rem;color:var(--ivory-dim);line-height:1.6;text-align:left;font-weight:300}
    .dc-msg.me .dc-msg-bubble{background:var(--oxblood-faint);border-color:var(--border-oxblood);color:var(--ivory)}
    .dc-msg-bubble strong{color:var(--ivory);font-weight:600}
    .dc-msg-bubble em{font-style:italic}
    .dc-msg-bubble u{text-decoration:underline}
    .dc-msg-bubble code{font-family:var(--font-mono);font-size:0.82em;background:rgba(0,0,0,0.25);padding:0.05rem 0.35rem}
    .dc-msg-bubble .mention{color:var(--brass-bright);font-weight:600}
    .dc-input-row{display:flex;gap:0.6rem;padding:1rem 1.2rem;border-top:1px solid var(--border-brass)}
    .dc-input-row textarea{flex:1;resize:none;min-height:2.6rem;max-height:7rem;background:var(--input-bg);border:1px solid var(--border);color:var(--ivory);font-family:var(--font-body);font-size:0.86rem;padding:0.6rem 0.8rem}
    .dc-input-row textarea:focus{outline:none;border-color:var(--brass)}
    .dc-send-btn{flex:0 0 auto;padding:0 1.4rem;background:var(--oxblood);color:var(--ivory);border:1px solid var(--oxblood);font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer}
    .dc-send-btn:disabled{opacity:0.5;cursor:default}
    .dc-status{font-family:var(--font-mono);font-size:0.62rem;color:var(--ivory-faint);padding:0.5rem 1.4rem;border-top:1px solid var(--border)}
  </style>
  </head><body>
  ${renderNav(req, 'darkchat')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Caledonia — Živé spojení</div>
        <h1 class="page-title">Darkchat</h1>
        <p class="page-sub">Obousměrně propojeno s Discordem — co napíšeš tady, uvidí i Discord, a naopak</p>
      </div>
    </div>

    <div class="dc-shell">
      <div class="dc-log" id="dcLog"><div class="ledger-loading">Načítám historii…</div></div>
      <div class="dc-input-row">
        <textarea id="dcInput" placeholder="Napiš zprávu… (Enter odešle, Shift+Enter nový řádek)" rows="1"></textarea>
        <button class="dc-send-btn" id="dcSendBtn" onclick="dcSend()">Odeslat</button>
      </div>
      <div class="dc-status" id="dcStatus">Spojeno se serverem — zprávy z Discordu chodí živě.</div>
    </div>
  </main>
  <div class="toast" id="toast"></div>
  <script>
    const ME_IC_NAME = ${JSON.stringify(req.session.icName)};
    function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

    // Stejný lehký Discord-markdown parser jako na Nástěnce (bold/italic/
    // underline/kód/zmínky) — viz nastenska.js pro plnou verzi s citacemi a
    // bloky kódu; tady stačí odlehčená varianta pro krátké chatové zprávy.
    function formatDcContent(raw){
      let text = esc(raw || '');
      text = text.replace(/\\uE000([^\\uE001]*)\\uE001/g, '<span class="mention">@$1</span>');
      text = text.replace(/\`([^\`\\n]+)\`/g, '<code>$1</code>');
      text = text.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
      text = text.replace(/__([^_]+)__/g, '<u>$1</u>');
      text = text.replace(/\\*([^*\\n]+)\\*/g, '<em>$1</em>');
      return text.split('\\n').join('<br>');
    }

    function fmtTime(iso){
      try{ return new Date(iso).toLocaleString('cs-CZ',{timeZone:'Europe/Prague',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); }
      catch(e){ return ''; }
    }

    const seenIds = new Set();
    function appendMessage(m, prepend){
      if(m.id && seenIds.has(m.id)) return;
      if(m.id) seenIds.add(m.id);
      const log = document.getElementById('dcLog');
      const isMe = m.author === ME_IC_NAME;
      const row = document.createElement('div');
      row.className = 'dc-msg' + (isMe ? ' me' : '');
      row.innerHTML = '<div class="dc-msg-meta">'+esc(m.author)+' · '+fmtTime(m.timestamp)+'</div>'+
        '<div class="dc-msg-bubble">'+formatDcContent(m.content||'')+'</div>';
      if(prepend) log.prepend(row); else log.appendChild(row);
    }

    async function loadHistory(){
      const log = document.getElementById('dcLog');
      try{
        const res = await fetch('/api/darkchat/history', { cache:'no-store' });
        const d = await res.json();
        log.innerHTML = '';
        if(!d.ok || !d.messages.length){
          log.innerHTML = ledgerEmptyHTML('Zatím žádné zprávy', true);
          return;
        }
        d.messages.forEach(m => appendMessage(m, false));
        log.scrollTop = log.scrollHeight;
      }catch(e){
        log.innerHTML = '<div style="color:var(--ivory-faint);font-family:var(--font-mono);font-size:0.78rem">Historii se nepodařilo načíst.</div>';
      }
    }
    loadHistory();

    const dcEvt = window.evtSource || new EventSource('/api/events');
    dcEvt.addEventListener('darkchatMessage', (e) => {
      const d = JSON.parse(e.data);
      const log = document.getElementById('dcLog');
      const wasEmpty = log.querySelector('.ledger-empty');
      if(wasEmpty) log.innerHTML = '';
      appendMessage(d, false);
      log.scrollTop = log.scrollHeight;
    });

    async function dcSend(){
      const input = document.getElementById('dcInput');
      const btn = document.getElementById('dcSendBtn');
      const content = input.value.trim();
      if(!content) return;
      btn.disabled = true;
      try{
        const res = await fetch('/api/darkchat/send', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content }) });
        const d = await res.json();
        if(d.ok){ input.value=''; input.style.height='auto'; }
        else showToast(d.error||'Odeslání selhalo', true);
      }catch(e){ showToast('Odeslání selhalo', true); }
      btn.disabled = false;
      input.focus();
    }
    window.dcSend = dcSend;

    const dcInput = document.getElementById('dcInput');
    dcInput.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); dcSend(); }
    });
    dcInput.addEventListener('input', function(){
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 112) + 'px';
    });
  </script>
  </body></html>`;
}

module.exports = { renderDarkchat };
