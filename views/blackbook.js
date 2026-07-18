// blackbook.js — Albion v3 · Heraldický blackbook

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderBlackbook(req) {
  const canManageCont = req.session.accessLevel === 1;
  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Blackbook</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'blackbook')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Caledonia</div>
        <h1 class="page-title">Blackbook</h1>
        <p class="page-sub">Analytické reporty — sklad, finance, členové, bezpečnost</p>
      </div>
      <div id="bb-generated" style="font-family:var(--font-mono);font-size:0.62rem;color:var(--ivory-faint);letter-spacing:0.06em;flex-shrink:0;text-align:right"></div>
    </div>
    <p class="folio-footnote"><strong>Analytické reporty.</strong> Blackbook generuje reporty výhradně z dat dostupných v tabulkách — finance, sklad, zbraně, drogy a aktivita členů.</p>

    <div class="report-nav">
      <button class="report-nav-item active" data-sec="finance" onclick="bbTab('finance')">I. Finanční</button>
      <button class="report-nav-item" data-sec="aktivita" onclick="bbTab('aktivita')">II. Aktivita členů</button>
      <button class="report-nav-item" data-sec="sklad" onclick="bbTab('sklad')">III. Inventura</button>
      <button class="report-nav-item" data-sec="zbrane" onclick="bbTab('zbrane')">IV. Zbraně</button>
      <button class="report-nav-item" data-sec="drogy" onclick="bbTab('drogy')">V. Drogy</button>
      <button class="report-nav-item" data-sec="bezpecnost" onclick="bbTab('bezpecnost')">VI. Bezpečnost</button>
      <button class="report-nav-item" data-sec="continental" onclick="bbTab('continental')">VII. Continental</button>
    </div>

    <div id="bb-loading" class="ledger-loading" style="margin-top:1.5rem">Generuji reporty…</div>
    <div id="bb-finance"   class="report-section active"></div>
    <div id="bb-aktivita"  class="report-section"></div>
    <div id="bb-sklad"     class="report-section"></div>
    <div id="bb-zbrane"    class="report-section"></div>
    <div id="bb-drogy"     class="report-section"></div>
    <div id="bb-bezpecnost" class="report-section"></div>
    <div id="bb-continental" class="report-section"></div>
  </main>
  <div class="toast" id="toast"></div>

  <script>
    let D=null;
    const money=n=>'$'+Math.round(n||0).toLocaleString('cs-CZ');
    const pesos=n=>'₱'+Math.round(n||0).toLocaleString('cs-CZ');
    const esc=s=>(s==null?'':String(s)).replace(/</g,'&lt;');

    // Skeleton loading — vypadá o dost svižněji než holý text "Generuji reporty…"
    document.getElementById('bb-loading').innerHTML = skeletonRows(6,[1,3]);

    function bbTab(sec){
      document.querySelectorAll('.report-nav-item').forEach(b=>b.classList.toggle('active',b.dataset.sec===sec));
      document.querySelectorAll('.report-section').forEach(s=>s.classList.toggle('active',s.id==='bb-'+sec));
    }

    function ledgerBars(rows,max){
      if(!rows.length)return ledgerEmptyHTML('Žádná data',true);
      const mx=max||Math.max(...rows.map(r=>r.val),1);
      return rows.map(r=>'<div class="ledger-bar-row">'+
        '<span class="ledger-bar-name">'+esc(r.name)+'</span>'+
        '<span class="ledger-bar-track"><span class="ledger-bar-fill" style="width:'+Math.max(1.5,(r.val/mx)*100)+'%"></span></span>'+
        '<span class="ledger-bar-val">'+(r.label||r.val)+'</span>'+
      '</div>').join('');
    }

    function lineChart(points,key,color,fmt){
      if(!points||points.length<2)return ledgerEmptyHTML('Nedostatek dat pro graf',true);
      const W=760,H=160,pad=8;
      const vals=points.map(p=>p[key]);
      const min=Math.min(...vals,0),max=Math.max(...vals,1);
      const range=(max-min)||1,n=points.length;
      const x=i=>pad+(i/(n-1))*(W-2*pad);
      const y=v=>H-pad-((v-min)/range)*(H-2*pad);
      const pts=points.map((p,i)=>x(i).toFixed(1)+','+y(p[key]).toFixed(1)).join(' ');
      const area='M'+x(0).toFixed(1)+','+(H-pad)+' L'+pts.split(' ').join(' L')+' L'+x(n-1).toFixed(1)+','+(H-pad)+' Z';
      const last=vals[vals.length-1];
      return '<div style="overflow-x:auto"><svg viewBox="0 0 '+W+' '+H+'" style="width:100%;min-width:480px;height:auto;display:block">'+
        '<path d="'+area+'" fill="'+color+'" opacity="0.07"/>'+
        '<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="1.5"/>'+
        '<line x1="'+pad+'" y1="'+y(0).toFixed(1)+'" x2="'+(W-pad)+'" y2="'+y(0).toFixed(1)+'" stroke="var(--border)" stroke-dasharray="1 4"/>'+
      '</svg></div>'+
      '<div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:0.62rem;color:var(--ivory-faint);margin-top:0.4rem;border-top:1px solid var(--border);padding-top:0.5rem">'+
        '<span>min '+(fmt||money)(min)+'</span><span style="color:var(--brass)">aktuálně '+(fmt||money)(last)+'</span><span>max '+(fmt||money)(max)+'</span>'+
      '</div>';
    }

    function dualLineChart(points,keyA,keyB,colorA,colorB,labelA,labelB){
      if(!points||points.length<2)return ledgerEmptyHTML('Nedostatek dat',true);
      const W=760,H=160,pad=8;
      const allVals=points.flatMap(p=>[p[keyA],p[keyB]]);
      const min=Math.min(...allVals,0),max=Math.max(...allVals,1),range=(max-min)||1,n=points.length;
      const x=i=>pad+(i/(n-1))*(W-2*pad);
      const y=v=>H-pad-((v-min)/range)*(H-2*pad);
      const ptsA=points.map((p,i)=>x(i).toFixed(1)+','+y(p[keyA]).toFixed(1)).join(' ');
      const ptsB=points.map((p,i)=>x(i).toFixed(1)+','+y(p[keyB]).toFixed(1)).join(' ');
      return '<div style="overflow-x:auto"><svg viewBox="0 0 '+W+' '+H+'" style="width:100%;min-width:480px;height:auto;display:block">'+
        '<polyline points="'+ptsA+'" fill="none" stroke="'+colorA+'" stroke-width="1.5"/>'+
        '<polyline points="'+ptsB+'" fill="none" stroke="'+colorB+'" stroke-width="1.5" stroke-dasharray="4 3"/>'+
        '<line x1="'+pad+'" y1="'+y(0).toFixed(1)+'" x2="'+(W-pad)+'" y2="'+y(0).toFixed(1)+'" stroke="var(--border)" stroke-dasharray="1 4"/>'+
      '</svg></div>'+
      '<div style="display:flex;gap:1.4rem;font-family:var(--font-mono);font-size:0.62rem;color:var(--ivory-faint);margin-top:0.4rem">'+
        '<span><span style="display:inline-block;width:14px;border-top:1.5px solid '+colorA+';vertical-align:middle;margin-right:5px"></span>'+labelA+'</span>'+
        '<span><span style="display:inline-block;width:14px;border-top:1.5px dashed '+colorB+';vertical-align:middle;margin-right:5px"></span>'+labelB+'</span>'+
      '</div>';
    }

    function renderTips(tips){
      if(!tips||!tips.length)return ledgerEmptyHTML('Žádná doporučení',true);
      const cfg={good:{icon:'+',color:'#6FBF52'},warning:{icon:'!',color:'var(--oxblood-bright)'},info:{icon:'§',color:'var(--brass)'}};
      return tips.map(t=>{
        const c=cfg[t.type]||cfg.info;
        return '<div class="recommendation">'+
          '<span class="recommendation-mark" style="color:'+c.color+'">'+c.icon+'</span>'+
          '<div><div class="recommendation-cat" style="color:'+c.color+'">'+esc(t.cat)+'</div>'+
          '<div class="recommendation-text">'+esc(t.text)+'</div></div></div>';
      }).join('');
    }

    function reportFigure(title,f){
      const netUsd=f.prijem_usd-f.vydaj_usd,netPesos=f.prijem_pesos-f.vydaj_pesos;
      return '<div class="report-figure">'+
        '<div class="report-figure-label">'+title+'</div>'+
        '<div class="report-figure-net" style="color:'+(netUsd>=0?'#6FBF52':'var(--oxblood-bright)')+'">'+(netUsd>=0?'+':'')+money(netUsd)+'</div>'+
        '<div class="report-figure-line"><span>Příjem</span><span style="color:#6FBF52">'+money(f.prijem_usd)+'</span></div>'+
        '<div class="report-figure-line"><span>Výdaj</span><span style="color:var(--oxblood-bright)">'+money(f.vydaj_usd)+'</span></div>'+
        ((f.prijem_pesos||f.vydaj_pesos)?'<div class="report-figure-line"><span>Net Pesos</span><span style="color:'+(netPesos>=0?'#6FBF52':'var(--oxblood-bright)')+'">'+(netPesos>=0?'+':'')+pesos(netPesos)+'</span></div>':'')+
      '</div>';
    }

    function tbl(headers,rows){
      if(!rows.length)return ledgerEmptyHTML('Žádné záznamy',true);
      return '<div class="table-wrap"><table><thead><tr>'+headers.map(h=>'<th'+(h.r?' style="text-align:right"':'')+'>'+h.t+'</th>').join('')+'</tr></thead>'+
        '<tbody>'+rows.map(r=>'<tr>'+r.map((c,i)=>'<td'+(headers[i]&&headers[i].r?' style="text-align:right"':'')+'>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
    }

    function renderFinance(){
      const f=D.finance;
      let h='<div class="folio-label">Příjmy a výdaje</div>';
      h+='<div class="report-figures">'+reportFigure('Dnes',f.periods.day)+reportFigure('Týden',f.periods.week)+reportFigure('Měsíc',f.periods.month)+reportFigure('Celkem',f.periods.total)+'</div>';
      h+='<div class="folio-spread"><div class="folio-panel"><div class="folio-label">Vývoj zůstatku účtu (SAD)</div><div style="height:1rem"></div>'+lineChart(f.balanceTimeline,'usd','var(--brass)')+'</div>';
      h+='<div class="marginalia"><div class="m-line"><span>Záznamů</span><span class="m-val">'+(f.balanceTimeline.length||0)+'</span></div></div></div>';
      h+='<div class="folio-rule tight"></div>';
      h+='<div class="folio-label">Hodnota skladu v čase</div><div style="height:1rem"></div>'+lineChart(f.stockTimeline,'value','#6FA8C9');
      h+='<div class="folio-rule tight"></div>';
      h+='<div class="folio-label">Kdo vydělal nejvíc (SAD)</div><div style="height:1rem"></div>';
      h+=ledgerBars(f.topEarners.map(e=>({name:e.member,val:e.prijem_usd,label:money(e.prijem_usd)})));
      h+='<div class="folio-rule tight"></div>';
      h+='<div class="folio-spread"><div class="folio-panel"><div class="folio-label">Výkonnost — 8 týdnů</div><div style="height:1rem"></div>'+dualLineChart(f.weeklyTrend,'income','expense','#6FBF52','var(--oxblood-bright)','Příjem','Výdaj')+'</div>';
      h+='<div class="folio-panel"><div class="folio-label">Tržby dle kategorie</div><div style="height:1rem"></div>'+ledgerBars(f.revenueByCategory.map(r=>({name:r.sekce,val:r.value,label:money(r.value)})))+'</div></div>';
      h+='<div class="folio-rule tight"></div>';
      h+='<div class="folio-label">Doporučení rejstříku</div><div style="height:1rem"></div>'+renderTips(f.tips);
      document.getElementById('bb-finance').innerHTML=h;
    }

    // ── KDO JE PRÁVĚ ONLINE — odvozeno z aktivních SSE spojení ──────────────
    async function renderOnlineWidget(){
      try{
        const res=await fetch('/api/online-members',{cache:'no-store'});
        const d=await res.json();
        if(!d.ok)return '';
        if(!d.count) return '<div class="folio-label">Kdo je právě online</div><div style="height:1rem"></div>'+ledgerEmptyHTML('Nikdo aktuálně nemá otevřenou appku',true);
        return '<div class="folio-label">Kdo je právě online ('+d.count+')</div><div style="height:1rem"></div>'+
          '<div style="display:flex;flex-wrap:wrap;gap:0.5rem">'+d.members.map(m=>
            '<span style="font-family:var(--font-mono);font-size:0.74rem;padding:0.3rem 0.7rem;background:rgba(58,125,45,0.1);border:1px solid rgba(58,125,45,0.35);color:#8FE070"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#6FBF52;margin-right:0.4rem;vertical-align:1px"></span>'+esc(m)+'</span>'
          ).join('')+'</div>';
      }catch(e){ return ''; }
    }

    function renderAktivita(){
      const a=D.aktivita;
      let h='<div class="report-figures">'+
        '<div class="report-figure"><div class="report-figure-label">Členů celkem</div><div class="report-figure-net" style="color:var(--ivory)">'+a.total+'</div></div>'+
        '<div class="report-figure"><div class="report-figure-label">Neaktivní (7+ dní)</div><div class="report-figure-net" style="color:var(--oxblood-bright)">'+a.inactiveCount+'</div></div>'+
        '<div class="report-figure"><div class="report-figure-label">Aktivní</div><div class="report-figure-net" style="color:#6FBF52">'+(a.total-a.inactiveCount)+'</div></div>'+
        '<div class="report-figure"></div></div>';
      h+='<div id="bb-online-widget"><div class="ledger-loading">Zjišťuji, kdo je online…</div></div>';
      h+='<div class="folio-rule tight"></div>';
      h+='<div class="folio-label">Členové dle aktivity</div><div style="height:1rem"></div>';
      h+=tbl([{t:'Člen'},{t:'Poslední aktivita'},{t:'Zdroj'},{t:'Web login'},{t:'Stav',r:true},{t:'Pohyby',r:true},{t:'Vklady/Výběry',r:true},{t:'Vklad SAD',r:true}],
        a.members.map(m=>[
          esc(m.member),
          m.lastCas?esc(m.lastCas):'<span style="color:var(--ivory-faint)">nikdy</span>',
          m.lastZdroj?'<span style="color:var(--ivory-faint);font-size:0.7rem">'+esc(m.lastZdroj)+'</span>':'—',
          m.lastWebLoginCas?'<span style="color:var(--ivory-dim);font-size:0.72rem">'+esc(m.lastWebLoginCas)+'</span>':'<span style="color:var(--ivory-faint)">—</span>',
          m.inactive?'<span class="badge vyber">'+(m.daysSince!=null?m.daysSince+' dní':'—')+'</span>':'<span class="badge vklad">aktivní</span>',
          m.pohyby,
          '<span style="color:#6FBF52">'+m.vklady+'</span> / <span style="color:var(--oxblood-bright)">'+m.vybery+'</span>',
          money(m.ucetVkladUsd)
        ]));
      document.getElementById('bb-aktivita').innerHTML=h;
      renderOnlineWidget().then(html=>{ const w=document.getElementById('bb-online-widget'); if(w) w.innerHTML=html; });
    }

    function renderSklad(){
      const s=D.sklad;
      const bySekce={};s.stockList.forEach(i=>{(bySekce[i.sekce]=bySekce[i.sekce]||[]).push(i);});
      let h='<div class="folio-label">Stav skladu</div><div style="height:1rem"></div>';
      h+='<div class="manifest-grid">';
      Object.entries(bySekce).forEach(([sek,items])=>{
        h+='<div class="manifest-col"><div class="manifest-col-head"><span class="manifest-col-title">'+sek+'</span></div>'+
          items.map(i=>'<div class="manifest-row"><span class="mr-name">'+esc(i.item)+'</span><span class="mr-dots"></span><span class="mr-val" style="color:'+(i.current<=0?'var(--oxblood-bright)':'var(--ivory-dim)')+'">'+i.current+' ks</span></div>').join('')+'</div>';
      });
      h+='</div>';
      h+='<div class="folio-rule tight"></div>';
      h+='<div class="folio-spread"><div class="folio-panel"><div class="folio-label">Nejvíc ukládali</div><div style="height:1rem"></div>'+ledgerBars(s.topVklad.map(m=>({name:m.member,val:m.vklad,label:m.vklad+' ks'})))+'</div>';
      h+='<div class="folio-panel"><div class="folio-label">Nejvíc vybírali</div><div style="height:1rem"></div>'+ledgerBars(s.topVyber.map(m=>({name:m.member,val:m.vyber,label:m.vyber+' ks'})))+'</div></div>';
      h+='<div class="folio-rule tight"></div>';
      h+='<div class="folio-label">Predikce došlých zásob</div><div style="height:1rem"></div>';
      h+=tbl([{t:'Položka'},{t:'Sekce'},{t:'Stav',r:true},{t:'Spotřeba/den',r:true},{t:'Dojde za',r:true}],
        s.predikce.length?s.predikce.map(p=>[esc(p.item),p.sekce,p.current+' ks',p.perDay+' ks','<span style="color:'+(p.daysLeft<=3?'var(--oxblood-bright)':p.daysLeft<=7?'var(--brass)':'var(--ivory-dim)')+'">'+p.daysLeft+' dní</span>']):[]
      );
      document.getElementById('bb-sklad').innerHTML=h;
    }

    function renderZbrane(){
      const z=D.zbrane;
      let h='<div class="folio-label">Kdo vybral nejvíc zbraní</div><div style="height:1rem"></div>';
      h+=ledgerBars(z.topVyber.map(m=>({name:m.member,val:m.qty,label:m.qty+' ks'})));
      h+='<div class="folio-rule tight"></div>';
      h+='<div class="folio-label">Nevrácené zbraně</div><div style="height:1rem"></div>';
      h+=tbl([{t:'Člen'},{t:'Zbraň'},{t:'Nevráceno',r:true}],
        z.nevraceno.map(n=>[esc(n.member),esc(n.item),'<span class="badge vyber">'+n.outstanding+' ks</span>'])
      );
      h+='<div class="folio-rule tight"></div>';
      h+='<div class="folio-label">Historie vydání zbraní</div><div style="height:1rem"></div>';
      h+=tbl([{t:'Čas'},{t:'Položka'},{t:'Množ.',r:true},{t:'Člen'},{t:'Účel'}],
        z.historie.map(e=>[esc(e.cas),esc(e.item),e.qty,esc(e.member),esc(e.ucel)||'—'])
      );
      document.getElementById('bb-zbrane').innerHTML=h;
    }

    function renderDrogy(){
      const d=D.drogy;
      const drugs=[...new Set([...Object.keys(d.drugProd),...Object.keys(d.drugVyber)])];
      let h='<div class="folio-label">Výroba a prodej drog</div><div style="height:1rem"></div>';
      h+=tbl([{t:'Droga'},{t:'Vyrobeno',r:true},{t:'Prodáno',r:true},{t:'Hodnota',r:true}],
        drugs.map(dr=>[esc(dr),'<span style="color:#6FBF52">'+(d.drugProd[dr]||0)+'</span>','<span style="color:var(--oxblood-bright)">'+(d.drugVyber[dr]||0)+'</span>','<span style="color:var(--brass)">'+money(d.drugZisk[dr]||0)+'</span>'])
      );
      h+='<div class="report-figures">'+
        '<div class="report-figure"><div class="report-figure-label">Weed vyrobeno</div><div class="report-figure-net" style="color:#6FBF52">'+d.weedProd+'</div></div>'+
        '<div class="report-figure"><div class="report-figure-label">Weed vybráno</div><div class="report-figure-net" style="color:var(--oxblood-bright)">'+d.weedVyber+'</div></div>'+
        '<div class="report-figure"><div class="report-figure-label">Hodnota prodeje</div><div class="report-figure-net" style="color:var(--brass)">'+money(d.weedZisk)+'</div></div>'+
        '<div class="report-figure"></div></div>';
      h+='<div class="folio-spread">'+
        '<div class="folio-panel"><div class="folio-label">Kdo nejvíc navařil</div><div style="height:1rem"></div>'+ledgerBars(d.topVarici.map(m=>({name:m.member,val:m.qty,label:m.qty+' ks'})))+'</div>'+
        '<div class="folio-panel"><div class="folio-label">Spotřeba chemikálií</div><div style="height:1rem"></div>'+ledgerBars(Object.entries(d.chemSpotreba).map(([k,v])=>({name:k,val:v,label:v+' ks'})).sort((a,b)=>b.val-a.val))+'</div></div>';
      document.getElementById('bb-drogy').innerHTML=h;
    }

    function renderBezpecnost(){
      const b=D.bezpecnost;
      let h='<div class="folio-label">Dlužníci — vybral zboží bez vkladu peněz</div><div style="height:1rem"></div>';
      h+=tbl([{t:'Člen'},{t:'Hodnota zboží',r:true},{t:'Vložil peněz',r:true},{t:'Dluh',r:true}],
        b.dluznici.map(d=>[esc(d.member),money(d.goodsValue),money(d.deposited),'<span class="badge vyber">'+money(d.dluh)+'</span>'])
      );
      h+='<div class="folio-rule tight"></div>';
      h+='<div class="folio-label">Podezřelé transakce (velké výdaje)</div><div style="height:1rem"></div>';
      h+=tbl([{t:'Čas'},{t:'Člen'},{t:'Částka',r:true},{t:'Poznámka'},{t:'Důvod'}],
        b.podezreleTransakce.map(t=>[esc(t.cas),esc(t.member),(t.valuta==='USD'?money(t.castka):pesos(t.castka)),esc(t.pozn),'<span style="color:var(--brass)">'+esc(t.duvod)+'</span>'])
      );
      document.getElementById('bb-bezpecnost').innerHTML=h;
    }

    // ══════════ VII. CONTINENTAL LEDGER ══════════
    const CAN_MANAGE_CONT = ${canManageCont};
    let contEntries = [], contLoaded = false;

    function contEntryHtml(e){
      const isUs = e.smer === 'dluzime';
      const sym = e.valuta === 'USD' ? '$' : '₱';
      const overdue = !e.settled && isContOverdue(e.splatnost);
      return '<div class="cont-entry'+(e.settled?' settled':'')+'">'+
        '<div class="cont-entry-row"><span class="cont-entry-who">'+esc(e.osoba)+'</span>'+
        '<span class="cont-entry-amount" style="color:'+(isUs?'var(--oxblood-bright)':'#6FBF52')+'">'+sym+Math.round(e.hodnota).toLocaleString('cs-CZ')+'</span></div>'+
        '<div class="cont-entry-reason">'+esc(e.duvod)+'</div>'+
        '<div class="cont-entry-meta"><span>'+esc(e.createdAtText||'')+' · zapsal '+esc(e.createdBy||'—')+'</span>'+(e.splatnost?('<span>splatnost: '+esc(e.splatnost)+'</span>'):'')+'</div>'+
        (overdue ? '<div class="cont-entry-meta" style="color:var(--oxblood-bright);margin-top:0.3rem">⚠ Po splatnosti</div>' : '')+
        (!e.settled ? '<div class="cont-entry-actions">'+
          '<button class="cont-btn-settle" onclick="settleCont(\\''+e.id+'\\')">'+(isUs?'Splatili jsme':'Splaceno')+'</button>'+
          (CAN_MANAGE_CONT?'<button class="cont-btn-del" onclick="delCont(\\''+e.id+'\\')">✕</button>':'')+
        '</div>' : '<div class="cont-entry-meta" style="margin-top:0.4rem;color:var(--brass)">Uzavřeno '+(e.settledAt?new Date(e.settledAt).toLocaleDateString('cs-CZ'):'')+' · '+esc(e.settledBy||'')+'</div>')+
        '<div class="cont-seal '+(isUs?'seal-oxblood':'seal-brass')+'">'+(isUs?'VYROVNÁNO':'UZAVŘENA<br>SLUŽBA')+'</div>'+
      '</div>';
    }

    function isContOverdue(splatnost){
      if(!splatnost) return false;
      const s = splatnost.toString().replace(/^do\s+/i,'').trim();
      const now = new Date();
      let m = s.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
      if(m) return new Date(+m[3], +m[2]-1, +m[1], 23, 59, 59).getTime() < now.getTime();
      m = s.match(/^(\d{1,2})\.\s*(\d{1,2})\.?$/);
      if(m){
        const d = new Date(now.getFullYear(), +m[2]-1, +m[1], 23, 59, 59);
        return d.getTime() < now.getTime();
      }
      return false;
    }

    // Souhrn nahoře — dřív bylo vidět jen "seznam karet", teď hned na první
    // pohled "kolik nám celkem dluží / kolik my dlužíme" (nevyrovnané položky).
    function contSummaryHtml(owedToUs, owedByUs){
      const sumBy = (arr, valuta) => arr.filter(e => !e.settled && e.valuta === valuta).reduce((s,e) => s + (e.hodnota||0), 0);
      return '<div class="report-figures" style="margin-bottom:1.6rem">'+
        '<div class="report-figure"><div class="report-figure-label">Dluží nám (SAD)</div><div class="report-figure-net" style="color:#6FBF52">'+money(sumBy(owedToUs,'USD'))+'</div></div>'+
        '<div class="report-figure"><div class="report-figure-label">Dlužíme my (SAD)</div><div class="report-figure-net" style="color:var(--oxblood-bright)">'+money(sumBy(owedByUs,'USD'))+'</div></div>'+
        '<div class="report-figure"><div class="report-figure-label">Dluží nám (Pesos)</div><div class="report-figure-net" style="color:#6FBF52">'+pesos(sumBy(owedToUs,'PESOS'))+'</div></div>'+
        '<div class="report-figure"><div class="report-figure-label">Dlužíme my (Pesos)</div><div class="report-figure-net" style="color:var(--oxblood-bright)">'+pesos(sumBy(owedByUs,'PESOS'))+'</div></div>'+
      '</div>';
    }

    function renderContinental(){
      const owedToUs = contEntries.filter(e => e.smer === 'dluzi_nam');
      const owedByUs  = contEntries.filter(e => e.smer === 'dluzime');
      let h = '<div class="folio-footnote"><strong>Continental rejstřík.</strong> Sem se zapisují dluhy stylem starého řádu — komu, co, kolik a od kdy. Jakmile je vyrovnáno, záznam dostane pečeť a zůstává v knize jako uzavřená služba.</div>';
      h += contSummaryHtml(owedToUs, owedByUs);
      h += '<div class="card" style="margin-bottom:1.6rem;overflow:visible">'+
        '<div class="card-header"><span class="card-title">Nový zápis do knihy</span></div>'+
        '<div class="seal-stamp" id="contCreateSeal"><span>A</span></div>'+
        '<div class="typ-toggle"><button class="typ-btn active-vklad" id="cont-smer-nam" onclick="setContSmer(\\'dluzi_nam\\')">Dluží nám</button>'+
        '<button class="typ-btn" id="cont-smer-my" onclick="setContSmer(\\'dluzime\\')">Dlužíme my</button></div>'+
        '<input type="hidden" id="cont-smer" value="dluzi_nam">'+
        '<div class="form-row"><div class="form-group"><label>Osoba / frakce</label><input type="text" id="cont-osoba" placeholder="IC jméno nebo frakce"></div>'+
        '<div class="form-group"><label>Splatnost (volitelné)</label><input type="text" id="cont-splatnost" placeholder="např. do 15.7."></div></div>'+
        '<div class="form-group" style="margin-bottom:0.85rem"><label>Za co / důvod</label><input type="text" id="cont-duvod" placeholder="Krytí při razii, půjčka na zbraně…"></div>'+
        '<div class="form-row"><div class="form-group"><label>Hodnota</label><input type="number" id="cont-hodnota" min="1" placeholder="5000"></div>'+
        '<div class="form-group"><label>Valuta</label><select id="cont-valuta"><option value="USD">SAD</option><option value="PESOS">Pesos</option></select></div></div>'+
        '<button class="btn-submit" onclick="submitCont()">Zapsat do knihy</button></div>';
      h += '<div class="cont-grid">'+
        '<div><div class="cont-col-title owed-to-us">Dluží nám</div>'+(owedToUs.length?owedToUs.map(contEntryHtml).join(''):ledgerEmptyHTML('Nikdo nám nic nedluží',true))+'</div>'+
        '<div><div class="cont-col-title owed-by-us">Dlužíme my</div>'+(owedByUs.length?owedByUs.map(contEntryHtml).join(''):ledgerEmptyHTML('Frakce nikomu nedluží',true))+'</div>'+
      '</div>';
      document.getElementById('bb-continental').innerHTML = h;
    }

    function setContSmer(s){
      document.getElementById('cont-smer').value = s;
      document.getElementById('cont-smer-nam').className = 'typ-btn' + (s==='dluzi_nam' ? ' active-vklad' : '');
      document.getElementById('cont-smer-my').className = 'typ-btn' + (s==='dluzime' ? ' active-vyber' : '');
    }
    window.setContSmer = setContSmer;

    async function loadContinental(){
      try{
        const res = await fetch('/api/continental', { cache: 'no-store' });
        const d = await res.json();
        contEntries = d.entries || [];
        contLoaded = true;
        renderContinental();
      }catch(e){}
    }
    async function submitCont(){
      const smer = document.getElementById('cont-smer').value;
      const osoba = document.getElementById('cont-osoba').value.trim();
      const duvod = document.getElementById('cont-duvod').value.trim();
      const hodnota = document.getElementById('cont-hodnota').value;
      const valuta = document.getElementById('cont-valuta').value;
      const splatnost = document.getElementById('cont-splatnost').value.trim();
      if(!osoba || !duvod || !hodnota) return showToast('Vyplň osobu, důvod a hodnotu', true);
      const res = await fetch('/api/continental', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ smer, osoba, duvod, hodnota, valuta, splatnost }) });
      const d = await res.json();
      if(d.ok){
        const seal=document.getElementById('contCreateSeal');
        if(seal) seal.classList.add('slam');
        if(window.albionSealThud) window.albionSealThud();
        showToast('Zapsáno do Continental knihy');
        setTimeout(loadContinental, 900);
      }
      else showToast(d.error, true);
    }
    window.submitCont = submitCont;
    async function settleCont(id){
      if(!confirm('Označit tento dluh jako vyrovnaný? Přiloží se pečeť.')) return;
      const res = await fetch('/api/continental/'+id+'/splatit', { method:'POST' });
      const d = await res.json();
      if(d.ok){ if(window.albionSealThud) window.albionSealThud(); showToast('Vyrovnáno — pečeť přiložena'); loadContinental(); }
      else showToast(d.error, true);
    }
    window.settleCont = settleCont;
    async function delCont(id){
      if(!confirm('Trvale smazat tento záznam z knihy?')) return;
      const res = await fetch('/api/continental/'+id, { method:'DELETE' });
      const d = await res.json();
      if(d.ok){ showToast('Záznam smazán'); loadContinental(); } else showToast(d.error, true);
    }
    window.delCont = delCont;

    const _origBbTab = bbTab;
    bbTab = function(sec){
      _origBbTab(sec);
      if(sec === 'continental' && !contLoaded) loadContinental();
    };

    async function loadBlackbook(){
      try{
        const res=await fetch('/api/blackbook',{cache:'no-store'});
        D=await res.json();
        if(!D.ok){document.getElementById('bb-loading').textContent='Chyba: '+(D.error||'neznámá');return;}
        document.getElementById('bb-loading').style.display='none';
        document.getElementById('bb-generated').textContent='Vygenerováno '+(D.generatedAt||'');
        renderFinance();renderAktivita();renderSklad();renderZbrane();renderDrogy();renderBezpecnost();
      }catch(e){document.getElementById('bb-loading').textContent='Chyba: '+e.message;}
    }
    loadBlackbook();setInterval(loadBlackbook,60000);
  </script>
  </body></html>`;
}

module.exports = { renderBlackbook };
