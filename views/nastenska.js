// views/nastenska.js — CALEDONIA · Nástěnka s kategoriemi
// Kategorie: dulezite / personalni / provozni / ostatni (viz styles.js .cat-pill
// a discord.js PATCH — ANNOUNCEMENT_CATEGORIES). Server posílá `category` v
// POST /api/nastenska a v SSE broadcastu (viz PATCH-server.txt bod 3).

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

const CAT_LABELS = { dulezite: 'Důležité', personalni: 'Personální', provozni: 'Provozní', ostatni: 'Ostatní' };

function renderNastenska(req) {
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Nástěnka</title>
  ${baseStyles()}
  <style>
    .nastenska-layout{display:grid;grid-template-columns:2fr 1fr;gap:2rem;align-items:start}
    @media(max-width:860px){.nastenska-layout{grid-template-columns:1fr}}
    .ann-item{background:var(--panel2);border:1px solid var(--border);border-left:3px solid var(--ivory-faint);padding:1.2rem 1.4rem;margin-bottom:1rem;box-shadow:0 2px 8px rgba(0,0,0,0.18)}
    .ann-item.dulezite{border-left-color:var(--oxblood-bright)}
    .ann-item.personalni{border-left-color:var(--brass-bright)}
    .ann-item.provozni{border-left-color:#6FA8C9}
    .ann-item.ostatni{border-left-color:var(--ivory-faint)}
    .ann-meta-row{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;flex-wrap:wrap}
    .ann-author{font-family:var(--font-mono);font-size:0.68rem;color:var(--ivory-faint)}
    .ann-title{font-family:var(--font-display);font-size:1.1rem;color:var(--ivory);margin-bottom:0.4rem}
    .ann-content{font-family:var(--font-body);font-size:0.86rem;color:var(--ivory-dim);line-height:1.75;font-weight:300}
    .ann-content strong{color:var(--ivory);font-weight:600}
    .ann-content em{font-style:italic}
    .ann-content u{text-decoration:underline}
    .ann-content s{text-decoration:line-through;opacity:0.7}
    .ann-content code{font-family:var(--font-mono);font-size:0.82em;background:var(--panel3);padding:0.05rem 0.35rem;border:1px solid var(--border)}
    .ann-content pre.md-code-block{font-family:var(--font-mono);font-size:0.78rem;background:var(--panel3);border:1px solid var(--border);padding:0.7rem 0.9rem;overflow-x:auto;white-space:pre-wrap;margin:0.5rem 0}
    .ann-content blockquote{margin:0.5rem 0;padding:0.3rem 0.9rem;border-left:2px solid var(--border-oxblood);color:var(--ivory-faint)}
    .ann-content .mention{color:var(--brass-bright);font-weight:600}
  </style>
  </head><body>
  ${renderNav(req, 'nastenska')}
  <main>
    <div class="page-header">
      <div><div class="page-label">Organizace Caledonia</div><h1 class="page-title">Nástěnka</h1><p class="page-sub">Oznámení synchronizovaná s Discordem v reálném čase</p></div>
    </div>

    <div class="nastenska-layout">
      <div id="nastenska-list"><div class="ledger-loading" style="padding:2rem 0">Načítám oznámení…</div></div>
      <div class="card">
        <div class="card-header"><span class="card-title">Nové oznámení</span></div>
        <div class="form-group" style="margin-bottom:0.8rem"><label>Kategorie</label>
          <select id="ann-category">
            <option value="dulezite">🔴 Důležité</option>
            <option value="personalni">🟡 Personální</option>
            <option value="provozni">🔵 Provozní</option>
            <option value="ostatni" selected>⚪ Ostatní</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0.8rem"><label>Název</label><input type="text" id="ann-title" placeholder="Důležité oznámení…"></div>
        <div class="form-group" style="margin-bottom:0.8rem"><label>Obsah</label><textarea id="ann-content" placeholder="Napište oznámení…" rows="5"></textarea></div>
        <div class="form-group" style="margin-bottom:1rem"><label>Naplánovat na (volitelné)</label><input type="datetime-local" id="ann-publish-at"></div>
        <button class="btn-submit" onclick="sendAnnouncement()">Zveřejnit oznámení</button>
        <div id="scheduled-wrap" style="margin-top:1.2rem"></div>
      </div>
    </div>
  </main>
  <div class="toast" id="toast"></div>
  <script>
    const CAT_LABELS = ${JSON.stringify(CAT_LABELS)};
    const LAST_ID_KEY='albion_last_ann_id';
    let lastSeenId=localStorage.getItem(LAST_ID_KEY)||'0';
    function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

    // Discord-style formátování obsahu oznámení: hvězdičkami tučně/kurzíva,
    // podtržítky podtržení, vlnovkami přeškrtnuté, apostrofy (jedním nebo
    // trojicí) inline kód / blok kódu, a "> " na začátku řádku jako citace.
    // Zmínky (<@ID>) server už přeložil na IC jméno a obalil
    // neviditelnými sentinely \uE000/\uE001 (viz resolveDiscordMentions v
    // server.js) — tady se z nich udělá zvýrazněné "@Jméno" místo syrového
    // Discord ID. Text se nejdřív HTML-escapuje (bezpečnost), teprve pak se
    // aplikuje markdown, ať nejde vložit škodlivé HTML přes obsah oznámení.
    function formatAnnouncementContent(raw){
      let text = esc(raw || '');

      // Zmínky — sentinely přežily esc() beze změny (nejsou to HTML znaky)
      text = text.replace(/\uE000([^\uE001]*)\uE001/g, '<span class="mention">@$1</span>');

      // Bloky kódu (trojice zpětných apostrofů), pak inline kód (jeden
      // zpětný apostrof) — musí jít první, ať se obsah uvnitř nerozbije
      // dalšími pravidly níže
      text = text.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, function(m, code){ return '<pre class="md-code-block">'+code.replace(/^\\n/,'')+'</pre>'; });
      text = text.replace(/\`([^\`\\n]+)\`/g, '<code>$1</code>');

      // Tučná kurzíva, tučně, podtržení, přeškrtnuté
      text = text.replace(/\\*\\*\\*([^*]+)\\*\\*\\*/g, '<strong><em>$1</em></strong>');
      text = text.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
      text = text.replace(/__([^_]+)__/g, '<u>$1</u>');
      text = text.replace(/~~([^~]+)~~/g, '<s>$1</s>');
      // Kurzíva — zbylé jednotlivé * nebo _ (musí jít až po tučně/podtržení)
      text = text.replace(/\\*([^*\\n]+)\\*/g, '<em>$1</em>');
      text = text.replace(/(^|[^_])_([^_\\n]+)_(?!_)/g, '$1<em>$2</em>');

      // Citace (> na začátku řádku, v escapovaném textu je to "&gt; ") —
      // celý souvislý blok citace se sestaví jako jeden kus HTML, ne po
      // jednotlivých řádcích prokládaných <br> zvenku, ať na začátku/konci
      // citace nevznikne nechtěný prázdný řádek.
      const lines = text.split('\\n');
      const out = [];
      let quoteBuf = null;
      for (const line of lines){
        const m = line.match(/^&gt;\\s?(.*)$/);
        if (m){
          if (quoteBuf === null) quoteBuf = [];
          quoteBuf.push(m[1]);
        } else {
          if (quoteBuf !== null){ out.push('<blockquote>'+quoteBuf.join('<br>')+'</blockquote>'); quoteBuf = null; }
          out.push(line);
        }
      }
      if (quoteBuf !== null) out.push('<blockquote>'+quoteBuf.join('<br>')+'</blockquote>');
      return out.join('<br>');
    }
    function catPill(cat){ cat = cat && CAT_LABELS[cat] ? cat : 'ostatni'; return '<span class="cat-pill '+cat+'">'+CAT_LABELS[cat]+'</span>'; }

    async function loadAnnouncements(){
      const res=await fetch('/api/nastenska',{cache:'no-store'});
      const data=await res.json();
      const list=document.getElementById('nastenska-list');
      if(!data.messages||!data.messages.length){list.innerHTML=ledgerEmptyHTML('Žádná oznámení',false,'photo');return;}
      list.innerHTML=data.messages.map((m)=>{
        const dt=new Date(m.timestamp).toLocaleString('cs-CZ',{timeZone:'Europe/Prague'});
        const catClass = (m.category && CAT_LABELS[m.category]) ? m.category : 'ostatni';
        return '<div class="ann-item '+catClass+'">'+
          '<div class="ann-meta-row">'+catPill(m.category)+'<span class="ann-author">'+esc(m.author)+' · '+esc(dt)+'</span></div>'+
          (m.title?'<div class="ann-title">'+esc(m.title.replace(/^[🔴🟡🔵⚪]\\s*[A-ZÁ-Ž]+\\s*·\\s*/,'').replace(/^📢\\s*/,''))+'</div>':'')+
          '<div class="ann-content">'+formatAnnouncementContent(m.content||'')+'</div>'+
        '</div>';
      }).join('');
    }

    async function sendAnnouncement(){
      const category=document.getElementById('ann-category').value;
      const title=document.getElementById('ann-title').value;
      const content=document.getElementById('ann-content').value;
      const publishAtRaw=document.getElementById('ann-publish-at').value;
      if(!content.trim())return showToast('Obsah nemůže být prázdný',true);
      const publishAt=publishAtRaw?new Date(publishAtRaw).toISOString():undefined;
      const res=await fetch('/api/nastenska',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,content,publishAt,category})});
      const data=await res.json();
      if(data.ok){
        showToast(data.scheduled?'Oznámení naplánováno':'Oznámení odesláno');
        document.getElementById('ann-title').value='';document.getElementById('ann-content').value='';document.getElementById('ann-publish-at').value='';
        setTimeout(loadAnnouncements,2000); loadScheduled();
      }else showToast(data.error||'Chyba',true);
    }
    window.sendAnnouncement = sendAnnouncement;

    async function loadScheduled(){
      const wrap=document.getElementById('scheduled-wrap'); if(!wrap)return;
      try{
        const res=await fetch('/api/nastenska/scheduled');
        const d=await res.json();
        if(!d.ok||!d.items.length){wrap.innerHTML='';return;}
        wrap.innerHTML='<div class="folio-label" style="margin-bottom:0.6rem">Naplánovaná</div>'+
          d.items.map(a=>'<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid var(--border);font-size:0.78rem"><span>'+catPill(a.category)+' '+esc(a.title||'Oznámení')+'</span><span>'+esc(new Date(a.publishAt).toLocaleString('cs-CZ'))+' <button onclick="cancelScheduled(\\''+a.id+'\\')" style="background:none;border:1px solid var(--border-oxblood);color:var(--oxblood-bright);margin-left:0.5rem;cursor:pointer;font-size:0.65rem">✕</button></span></div>').join('');
      }catch(e){}
    }
    window.cancelScheduled = async function(id){
      const res=await fetch('/api/nastenska/scheduled/'+id,{method:'DELETE'});
      const d=await res.json();
      if(d.ok){showToast('Zrušeno');loadScheduled();}else showToast(d.error,true);
    };

    const evtSrc=window.evtSource || new EventSource('/api/events');
    evtSrc.addEventListener('nastenska',()=>{lastSeenId='0';setTimeout(loadAnnouncements,1000);});
    loadAnnouncements();setInterval(loadAnnouncements,30000);
    loadScheduled();setInterval(loadScheduled,60000);
  </script>
  </body></html>`;
}

module.exports = { renderNastenska };
