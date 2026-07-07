// card.js — Albion v3 · Trading karta člena

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderCard(req, icName) {
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Albion — Karta člena</title>
  ${baseStyles()}
  <style>
    .tc-line{display:flex;justify-content:space-between;padding:0.55rem 0;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:0.84rem}
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
    function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
    async function loadCard(){
      const res=await fetch('/api/card/${encodeURIComponent(icName || '')}');
      const d=await res.json();
      const wrap=document.getElementById('card-wrap');
      if(!d.ok){wrap.innerHTML='<p style="text-align:center;color:var(--ivory-faint)">'+esc(d.error)+'</p>';return;}
      CARD=d.card;
      const c=CARD;
      const photo=c.ic_photo||c.avatar_url||'/logo.png';
      // Rarity/foil dle hodnosti — sběratelská karta má vypadat jinak pro
      // Founder/Council (zlatá fólie) než pro Senior Member (stříbrná) nebo
      // řadového člena (obyčejná, bez fólie).
      const rankStr=(c.rank||'');
      const foilClass = rankStr.includes('Founder') ? ' card-foil-gold' : (rankStr.includes('Senior') ? ' card-foil-silver' : '');
      const foilShine = rankStr.includes('Founder') ? '<div class="tc-foil-shine"></div>' : (rankStr.includes('Senior') ? '<div class="tc-foil-shine silver"></div>' : '');
      const privacyNote = c.private ? '<div style="text-align:center;font-family:var(--font-mono);font-size:0.62rem;color:var(--ivory-faint);margin-top:0.6rem">🔒 Tato karta je nastavena jako skrytá</div>' : '';
      wrap.innerHTML='<div class="trading-card tilt-card'+foilClass+'" id="tradingCardEl" style="position:relative">'+
        foilShine+
        '<div class="tilt-glare"></div>'+
        '<div class="tc-header">'+
          '<img class="tc-avatar" src="'+photo+'" crossorigin="anonymous">'+
          '<div class="tc-name">'+esc(c.ic_name)+'</div>'+
          '<div class="tc-discord">@'+esc(c.discord_username||'—')+' · '+esc(c.rank)+'</div>'+
        '</div>'+
        '<div class="tc-body">'+
          '<div class="tc-line"><span>Telefon</span><span>'+esc(c.phone||'—')+'</span></div>'+
          '<div class="tc-line"><span>Datum narození</span><span>'+(c.birthdate?new Date(c.birthdate).toLocaleDateString('cs-CZ'):'—')+'</span></div>'+
          '<div class="tc-line"><span>Bankovní účet</span><span>'+esc(c.bank||'—')+'</span></div>'+
          '<div class="folio-rule tight"></div>'+
          '<div class="tc-stat"><span>Hodnost</span><strong>'+esc(c.rank)+'</strong></div>'+
          '<div class="tc-stat"><span>Členem od</span><strong>'+new Date(c.created_at).toLocaleDateString('cs-CZ')+'</strong></div>'+
          '<div class="tc-stat"><span>Celkem akcí</span><strong>'+c.action_count+'</strong></div>'+
          '<div class="tc-stat"><span>Povýšení</span><strong>'+c.promotions.length+'×</strong></div>'+
          '<div class="folio-label" style="margin-top:1rem">Odznaky</div>'+
          '<div class="tc-badges">'+(c.achievements.length?c.achievements.map(a=>'<span class="tc-badge"><span class="tc-badge-icon">'+esc(a.icon||'★')+'</span>'+esc(a.label||a.id)+'</span>').join(''):'<span style="color:var(--ivory-faint);font-size:0.8rem">žádné zatím</span>')+'</div>'+
        '</div>'+
      '</div>'+
      privacyNote+
      '<div style="max-width:380px;margin:1.2rem auto 0;display:flex;gap:0.6rem">'+
        '<button class="btn-submit" style="margin-top:0" onclick="exportCardImage(\\'download\\')">Stáhnout jako obrázek</button>'+
        '<button class="btn-submit" style="margin-top:0" onclick="exportCardImage(\\'copy\\')">Zkopírovat obrázek</button>'+
      '</div>';
      enableTilt(document.getElementById('tradingCardEl'));
    }

    // 3D tilt-hover (#12) — jemný náklon karty podle pozice kurzoru
    function enableTilt(el){
      if(!el)return;
      const MAX=9;
      el.addEventListener('mousemove',(e)=>{
        const r=el.getBoundingClientRect();
        const px=(e.clientX-r.left)/r.width, py=(e.clientY-r.top)/r.height;
        el.style.setProperty('--ry',((px-0.5)*MAX*2)+'deg');
        el.style.setProperty('--rx',(-(py-0.5)*MAX*2)+'deg');
        el.style.setProperty('--tz','6px');
        el.style.setProperty('--gx',(px*100)+'%');
        el.style.setProperty('--gy',(py*100)+'%');
        el.classList.remove('tilt-reset');
      });
      el.addEventListener('mouseleave',()=>{
        el.classList.add('tilt-reset');
        el.style.setProperty('--rx','0deg');el.style.setProperty('--ry','0deg');el.style.setProperty('--tz','0px');
      });
    }

    async function exportCardImage(mode){
      const c=CARD; if(!c)return;
      const W=440,H=660,SCALE=2.5; // SCALE = vykreslujeme ve vyšším rozlišení, ať export není rozpixelovaný
      const canvas=document.createElement('canvas');canvas.width=W*SCALE;canvas.height=H*SCALE;
      const ctx=canvas.getContext('2d');
      ctx.scale(SCALE,SCALE); // od teď kreslíme v "logických" souřadnicích 440×660, canvas je ale ostrý ve vysokém rozlišení

      ctx.fillStyle='#10150F';ctx.fillRect(0,0,W,H);
      const rankStrExp=(c.rank||'');
      const isGoldExp=rankStrExp.includes('Founder');
      const isSilverExp=rankStrExp.includes('Senior');
      ctx.strokeStyle=isGoldExp?'#E0BD7F':(isSilverExp?'#B7AE99':'#B68A4E');
      ctx.lineWidth=2;ctx.strokeRect(1,1,W-2,H-2);

      const grad=ctx.createLinearGradient(0,0,W,170);
      grad.addColorStop(0,'#6E1423');grad.addColorStop(1,'#4A0D18');
      ctx.fillStyle=grad;ctx.fillRect(0,0,W,180);

      // Rohové akcenty (stejný heraldický detail jako zbytek webu)
      ctx.strokeStyle='#E0BD7F';ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(14,28);ctx.lineTo(14,14);ctx.lineTo(28,14);ctx.stroke();
      ctx.beginPath();ctx.moveTo(W-28,H-14);ctx.lineTo(W-14,H-14);ctx.lineTo(W-14,H-28);ctx.stroke();

      // Foil/rarity přechod — stejná logika jako živý náhled (#10): zlatá
      // fólie pro Founder/Council, stříbrná pro Senior Member, žádná pro
      // řadového člena. Diagonální pásy napříč celou kartou.
      if(isGoldExp||isSilverExp){
        const shine=ctx.createLinearGradient(0,0,W,H);
        const c1=isGoldExp?'rgba(224,189,127,0)':'rgba(183,174,153,0)';
        const c2=isGoldExp?'rgba(224,189,127,0.35)':'rgba(183,174,153,0.30)';
        const c3=isGoldExp?'rgba(255,255,255,0.30)':'rgba(255,255,255,0.22)';
        shine.addColorStop(0,c1);shine.addColorStop(0.45,c2);shine.addColorStop(0.5,c3);shine.addColorStop(0.55,c2);shine.addColorStop(1,c1);
        ctx.fillStyle=shine;ctx.fillRect(0,0,W,H);
      }

      function drawPhotoAndText(){
        ctx.font='700 26px Georgia';ctx.fillStyle='#EDE6D4';ctx.textAlign='center';
        ctx.fillText(c.ic_name,W/2,232);
        ctx.font='14px monospace';ctx.fillStyle='#B7AE99';
        ctx.fillText('@'+(c.discord_username||'—')+' · '+c.rank,W/2,254);

        let y=305;
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
          ctx.font='12.5px monospace';ctx.fillStyle='#7E7868';ctx.fillText(label,32,y);
          ctx.font='13.5px monospace';ctx.fillStyle='#EDE6D4';ctx.textAlign='right';ctx.fillText(val,W-32,y);
          ctx.textAlign='left';
          y+=37;
        });

        ctx.font='600 9px "Cinzel",Georgia';ctx.fillStyle='#7E7868';ctx.textAlign='center';
        ctx.fillText('A L B I O N',W/2,H-24);

        finish();
      }
      function finish(){
        if(window.albionSealThud)window.albionSealThud();
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

      // Kruhový avatar bez zdeformování — stejná logika jako CSS object-fit:cover:
      // najdeme čtvercový výřez ze středu zdrojové fotky (bez ohledu na její poměr stran)
      // a teprve ten vykreslíme do kruhu, takže fotka nikdy není roztažená.
      const img=new Image();img.crossOrigin='anonymous';
      const R=58, CX=W/2, CY=130;
      img.onload=()=>{
        const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
        const side=Math.min(iw,ih);
        const sx=(iw-side)/2, sy=(ih-side)/2;
        ctx.save();ctx.beginPath();ctx.arc(CX,CY,R,0,Math.PI*2);ctx.clip();
        ctx.drawImage(img,sx,sy,side,side,CX-R,CY-R,R*2,R*2);
        ctx.restore();
        ctx.strokeStyle='#E0BD7F';ctx.lineWidth=3.5;ctx.beginPath();ctx.arc(CX,CY,R,0,Math.PI*2);ctx.stroke();
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
