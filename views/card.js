// card.js — Albion v3 · Trading karta člena

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderCard(req, icName) {
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Albion — Karta člena</title>
  ${baseStyles()}
  <style>
    .tc-line{display:flex;justify-content:space-between;padding:0.45rem 0;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:0.8rem}
    .tc-line:last-child{border-bottom:none}
    .tc-line span:first-child{color:var(--ivory-faint)}
    .tc-line span:last-child{color:var(--ivory)}
  </style>
  </head><body>
  ${renderNav(req, '')}
  <main>
    <div id="card-wrap"><div class="ledger-loading">Načítám kartu…</div></div>
  </main>
  <script>
    let CARD=null;
    async function loadCard(){
      const res=await fetch('/api/card/${encodeURIComponent(icName || '')}');
      const d=await res.json();
      const wrap=document.getElementById('card-wrap');
      if(!d.ok){wrap.innerHTML='<p style="text-align:center;color:var(--ivory-faint)">'+d.error+'</p>';return;}
      CARD=d.card;
      const c=CARD;
      const photo=c.ic_photo||c.avatar_url||'/logo.png';
      wrap.innerHTML='<div class="trading-card" id="tradingCardEl">'+
        '<div class="tc-header">'+
          '<img class="tc-avatar" src="'+photo+'" crossorigin="anonymous">'+
          '<div class="tc-name">'+c.ic_name+'</div>'+
          '<div class="tc-discord">@'+(c.discord_username||'—')+' · '+c.rank+'</div>'+
        '</div>'+
        '<div class="tc-body">'+
          '<div class="tc-line"><span>Telefon</span><span>'+(c.phone||'—')+'</span></div>'+
          '<div class="tc-line"><span>Datum narození</span><span>'+(c.birthdate?new Date(c.birthdate).toLocaleDateString('cs-CZ'):'—')+'</span></div>'+
          '<div class="tc-line"><span>Bankovní účet</span><span>'+(c.bank||'—')+'</span></div>'+
          '<div class="folio-rule tight"></div>'+
          '<div class="tc-stat"><span>Hodnost</span><strong>'+c.rank+'</strong></div>'+
          '<div class="tc-stat"><span>Členem od</span><strong>'+new Date(c.created_at).toLocaleDateString('cs-CZ')+'</strong></div>'+
          '<div class="tc-stat"><span>Celkem akcí</span><strong>'+c.action_count+'</strong></div>'+
          '<div class="tc-stat"><span>Povýšení</span><strong>'+c.promotions.length+'×</strong></div>'+
          '<div class="folio-label" style="margin-top:1rem">Odznaky</div>'+
          '<div class="tc-badges">'+(c.achievements.length?c.achievements.map(a=>'<span class="tc-badge">'+a.id+'</span>').join(''):'<span style="color:var(--ivory-faint);font-size:0.8rem">žádné zatím</span>')+'</div>'+
        '</div>'+
      '</div>'+
      '<div style="max-width:380px;margin:1.2rem auto 0;display:flex;gap:0.6rem">'+
        '<button class="btn-submit" style="margin-top:0" onclick="exportCardImage(\\'download\\')">Stáhnout jako obrázek</button>'+
        '<button class="btn-submit" style="margin-top:0" onclick="exportCardImage(\\'copy\\')">Zkopírovat obrázek</button>'+
      '</div>';
    }

    async function exportCardImage(mode){
      const c=CARD; if(!c)return;
      const W=420,H=620;
      const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#10150F';ctx.fillRect(0,0,W,H);
      ctx.strokeStyle='#B68A4E';ctx.lineWidth=2;ctx.strokeRect(1,1,W-2,H-2);

      const grad=ctx.createLinearGradient(0,0,W,140);
      grad.addColorStop(0,'#6E1423');grad.addColorStop(1,'#4A0D18');
      ctx.fillStyle=grad;ctx.fillRect(0,0,W,160);

      function drawPhotoAndText(){
        ctx.font='700 22px Georgia';ctx.fillStyle='#EDE6D4';ctx.textAlign='center';
        ctx.fillText(c.ic_name,W/2,205);
        ctx.font='13px monospace';ctx.fillStyle='#B7AE99';
        ctx.fillText('@'+(c.discord_username||'—')+' · '+c.rank,W/2,226);

        let y=270;
        ctx.textAlign='left';
        const rows=[
          ['Telefon', c.phone||'—'],
          ['Datum narození', c.birthdate?new Date(c.birthdate).toLocaleDateString('cs-CZ'):'—'],
          ['Bankovní účet', c.bank||'—'],
          ['Hodnost', c.rank],
          ['Členem od', new Date(c.created_at).toLocaleDateString('cs-CZ')],
          ['Celkem akcí', String(c.action_count)],
          ['Povýšení', c.promotions.length+'×'],
        ];
        rows.forEach(([label,val])=>{
          ctx.font='12px monospace';ctx.fillStyle='#7E7868';ctx.fillText(label,30,y);
          ctx.font='13px monospace';ctx.fillStyle='#EDE6D4';ctx.textAlign='right';ctx.fillText(val,W-30,y);
          ctx.textAlign='left';
          y+=34;
        });

        finish();
      }
      function finish(){
        if(mode==='download'){
          const a=document.createElement('a');a.download=c.ic_name+'_karta.png';a.href=canvas.toDataURL('image/png');a.click();
        } else {
          canvas.toBlob(async (blob)=>{
            try{
              await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
              showToast('Obrázek zkopírován — vlož ho Ctrl+V do Discordu');
            }catch(e){
              showToast('Kopírování nepodporováno, obrázek se stáhne',true);
              const a=document.createElement('a');a.download=c.ic_name+'_karta.png';a.href=canvas.toDataURL('image/png');a.click();
            }
          });
        }
      }

      const img=new Image();img.crossOrigin='anonymous';
      img.onload=()=>{
        ctx.save();ctx.beginPath();ctx.arc(W/2,110,48,0,Math.PI*2);ctx.clip();
        ctx.drawImage(img,W/2-48,110-48,96,96);ctx.restore();
        ctx.strokeStyle='#E0BD7F';ctx.lineWidth=3;ctx.beginPath();ctx.arc(W/2,110,48,0,Math.PI*2);ctx.stroke();
        drawPhotoAndText();
      };
      img.onerror=()=>drawPhotoAndText();
      img.src=c.ic_photo||c.avatar_url||'/logo.png';
    }

    loadCard();
  </script>
  </body></html>`;
}

module.exports = { renderCard };
