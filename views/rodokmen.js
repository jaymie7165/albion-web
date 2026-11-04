// views/rodokmen.js — CALEDONIA · Rodokmen (samostatná stránka)
//
// Celá logika (strom, detail osoby, editor, výpočet příbuzenství) je v
// public/js/rodokmen.js, data jdou přes /api/rodokmen (viz server.js).
// Čtení vidí každý přihlášený člen, úpravy (osoby, fotky, vazby) jen Founder/Council.

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderRodokmen(req) {
  const canEdit = req.session.accessLevel === 1;
  const isStaff = (req.session.realAccessLevel || req.session.accessLevel || 3) < 3;

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Rodokmen</title>
  ${baseStyles()}
  <style>
    .rk-head-actions{display:flex;gap:0.6rem;align-items:center}
    .rk-stats{display:flex;gap:1rem;flex-wrap:wrap;margin:0 0 1.4rem}
    .rk-stat{min-width:120px;padding:0.8rem 1.2rem;background:linear-gradient(180deg,#221a17,#161110);border:1px solid var(--border-brass,#7a6236);border-radius:8px}
    .rk-stat-n{font-family:var(--font-display,Georgia,serif);font-size:1.8rem;color:#e6c97c;line-height:1}
    .rk-stat-l{font-family:var(--font-label,sans-serif);font-size:0.56rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--ivory-faint,#8a8070);margin-top:0.35rem}
    .rk-toolbar{display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap;margin-bottom:0.9rem}
    .rk-toolbar input,.rk-toolbar select{width:auto;min-width:210px}
    .rk-toggle{display:inline-flex;align-items:center;gap:0.5rem;font-family:var(--font-mono,monospace);font-size:0.72rem;color:var(--ivory-dim,#bfb5a0);cursor:pointer}
    .rk-toggle input{width:auto}
    .rk-zbtn{background:transparent;border:1px solid var(--border-brass,#7a6236);color:var(--ivory-dim,#bfb5a0);width:34px;height:34px;cursor:pointer;font-size:1rem;border-radius:4px}
    .rk-zbtn:hover{background:rgba(201,163,91,.14);color:#e6c97c}
    .rk-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:1.2rem;align-items:start}
    .rk-canvas{background:linear-gradient(180deg,#1b1413,#120d0c);border:1px solid var(--border-brass,#7a6236);border-radius:10px;padding:0.8rem;box-shadow:0 10px 34px rgba(0,0,0,.4);min-width:0}
    .rk-info{font-family:var(--font-mono,monospace);font-size:0.74rem;color:var(--ivory-dim,#bfb5a0);margin:0 0 0.7rem;padding:0.55rem 0.8rem;border-left:2px solid #c9a35b;background:rgba(201,163,91,.07)}
    .rk-info b{color:#e6c97c}
    .rk-info button{background:none;border:none;color:#e0627a;cursor:pointer;font:inherit;text-decoration:underline;margin-left:0.5rem}
    .rk-scroll{overflow:auto;max-height:78vh;min-height:320px;border:1px solid rgba(122,98,54,.45);border-radius:6px;cursor:grab}
    .rk-scroll.rk-drag{cursor:grabbing;user-select:none}
    .rk-scroll svg{display:block;user-select:none}
    .rk-legend{display:flex;gap:1rem;flex-wrap:wrap;margin-top:0.7rem;font-family:var(--font-mono,monospace);font-size:0.66rem;color:var(--ivory-dim,#bfb5a0)}
    .rk-legend i{display:inline-block;width:22px;height:0;margin-right:0.4rem;vertical-align:middle}
    .rk-empty,.rk-d-empty{padding:3rem 1.5rem;text-align:center;color:var(--ivory-dim,#bfb5a0);font-family:var(--font-mono,monospace);font-size:0.82rem;line-height:1.7}
    .rk-empty-ico{font-size:2.4rem;color:#7a6236;margin-bottom:0.6rem}
    .rk-empty-t{font-family:var(--font-display,Georgia,serif);font-size:1.3rem;color:#e6c97c;margin-bottom:0.5rem}
    .rk-detail{position:sticky;top:calc(var(--nav-h,0px) + 1rem);background:linear-gradient(180deg,#1f1715,#141010);border:1px solid var(--border-brass,#7a6236);border-radius:10px;max-height:calc(100vh - 2rem);overflow:auto;box-shadow:0 10px 34px rgba(0,0,0,.4)}
    .rk-d-close{position:absolute;right:0.7rem;top:0.7rem;z-index:3;width:30px;height:30px;border-radius:50%;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.2);color:#fff;cursor:pointer}
    .rk-d-photo{position:relative;height:300px;background:#120d0c;overflow:hidden}
    .rk-d-photo img{width:100%;height:100%;object-fit:cover;object-position:top}
    .rk-d-fade{position:absolute;inset:auto 0 0 0;height:110px;background:linear-gradient(180deg,transparent,#1b1412)}
    .rk-d-mono{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display,Georgia,serif);font-size:4rem;color:#f1e8d6;background:radial-gradient(circle at 35% 30%,#8a2f3d,#4a1520)}
    .rk-d-body{padding:0 1.3rem 1.4rem;margin-top:-1.4rem;position:relative}
    .rk-d-name{font-family:var(--font-display,Georgia,serif);font-size:1.7rem;line-height:1.15;color:#f4ebd9;margin:0 0 0.5rem}
    .rk-d-title{display:inline-block;padding:0.25rem 0.8rem;border:1px solid #a8843f;border-radius:20px;color:#e6c97c;font-family:var(--font-mono,monospace);font-size:0.74rem;margin-bottom:0.8rem;background:rgba(217,173,92,.1)}
    .rk-d-row{display:flex;justify-content:space-between;gap:1rem;font-family:var(--font-mono,monospace);font-size:0.76rem;padding:0.35rem 0;border-bottom:1px solid rgba(255,255,255,.06);color:var(--ivory-faint,#8a8070)}
    .rk-d-row b{color:var(--ivory,#efe6d4);font-weight:500;text-align:right}
    .rk-d-row a{color:#e6c97c}
    .rk-d-h{font-family:var(--font-label,sans-serif);font-size:0.58rem;letter-spacing:0.2em;text-transform:uppercase;color:#c9a35b;margin:1.2rem 0 0.6rem}
    .rk-d-lore{font-size:0.88rem;line-height:1.75;color:var(--ivory-dim,#bfb5a0);white-space:pre-wrap}
    .rk-kins{display:grid;gap:0.35rem}
    .rk-kin{display:flex;gap:0.7rem;align-items:center;padding:0.4rem 0.5rem;border-radius:8px;cursor:pointer}
    .rk-kin:hover,.rk-ev:hover,.rk-pair-p:hover{background:rgba(201,163,91,.1)}
    .rk-kin-av,.rk-ev-av{width:36px;height:36px;border-radius:9px;object-fit:cover;border:1px solid #7a6236;flex:none}
    .rk-mono{display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 30%,#8a2f3d,#4a1520);color:#f1e8d6;font-family:var(--font-display,Georgia,serif);font-size:0.9rem}
    .rk-kin-l{font-family:var(--font-mono,monospace);font-size:0.62rem;color:#c9a35b;text-transform:uppercase;letter-spacing:0.06em}
    .rk-kin-n{font-family:var(--font-display,Georgia,serif);font-size:0.98rem;color:#f4ebd9}
    .rk-views{display:flex;flex-wrap:wrap;gap:0.4rem}
    .rk-chip{background:transparent;border:1px solid #7a6236;color:var(--ivory-dim,#bfb5a0);padding:0.3rem 0.75rem;border-radius:20px;cursor:pointer;font-family:var(--font-mono,monospace);font-size:0.68rem}
    .rk-chip.on,.rk-chip:hover{background:rgba(217,173,92,.16);color:#e6c97c;border-color:#c9a35b}
    .rk-rel{display:flex;justify-content:space-between;align-items:center;gap:0.6rem;font-size:0.82rem;padding:0.3rem 0;border-bottom:1px solid rgba(255,255,255,.05);color:var(--ivory-dim,#bfb5a0)}
    .rk-x{background:none;border:1px solid var(--border-oxblood,#6a2530);color:var(--oxblood-bright,#d4586a);width:24px;height:24px;cursor:pointer;border-radius:4px;flex:none}
    .rk-addrel{display:grid;gap:0.5rem;margin-top:0.4rem}
    .rk-addrel select,.rk-addrel input{width:100%}
    .rk-hint{font-family:var(--font-mono,monospace);font-size:0.66rem;color:var(--ivory-faint,#8a8070);margin-top:0.35rem;line-height:1.5}
    .rk-btn{background:transparent;border:1px solid #7a6236;color:var(--ivory-dim,#bfb5a0);padding:0.6rem 1rem;font-family:var(--font-label,sans-serif);font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;border-radius:4px}
    .rk-btn:hover{background:rgba(201,163,91,.12)}
    .rk-btn-gold{background:linear-gradient(180deg,#d4a95a,#a8843f);border-color:#d4a95a;color:#1a1413;font-weight:700}
    .rk-btn-gold:hover{background:linear-gradient(180deg,#e6c97c,#b8934a)}
    .rk-btn-red{border-color:var(--border-oxblood,#6a2530);color:var(--oxblood-bright,#d4586a)}
    .rk-d-actions{display:flex;gap:0.6rem;margin-top:1.4rem}
    .rk-d-actions .rk-btn-gold{flex:1}
    .rk-bottom{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.2rem;margin-top:1.4rem}
    .rk-panel{background:linear-gradient(180deg,#1f1715,#141010);border:1px solid var(--border-brass,#7a6236);border-radius:10px;padding:1.1rem 1.3rem}
    .rk-panel h3{font-family:var(--font-display,Georgia,serif);font-size:1.15rem;color:#f4ebd9;margin:0 0 0.9rem;font-weight:500}
    .rk-ev{display:flex;gap:0.8rem;align-items:center;padding:0.4rem 0.4rem;border-radius:8px;cursor:pointer}
    .rk-ev-d{font-family:var(--font-mono,monospace);font-size:0.68rem;color:#c9a35b}
    .rk-ev-t{font-size:0.88rem;color:var(--ivory,#efe6d4)}
    .rk-pair{display:flex;align-items:center;justify-content:center;gap:0.6rem;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,.05)}
    .rk-pair-p{display:flex;flex-direction:column;align-items:center;gap:0.3rem;cursor:pointer;padding:0.3rem 0.5rem;border-radius:8px;flex:1;text-align:center;font-size:0.8rem;color:var(--ivory,#efe6d4)}
    .rk-pair-av{width:54px;height:54px;border-radius:12px;object-fit:cover;border:1px solid #7a6236}
    .rk-pair-h{color:#e0627a;font-size:1.2rem}
    .rk-muted{color:var(--ivory-faint,#8a8070);font-family:var(--font-mono,monospace);font-size:0.78rem;line-height:1.6}
    .rk-people-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:1rem}
    .rk-pc{background:linear-gradient(180deg,#221a17,#161110);border:1px solid #5a4a2b;border-radius:12px;overflow:hidden;cursor:pointer;transition:transform .15s,border-color .15s}
    .rk-pc:hover{transform:translateY(-3px);border-color:#d4a95a}
    .rk-pc-ph{height:210px;background:#120d0c}
    .rk-pc-ph img{width:100%;height:100%;object-fit:cover;object-position:top}
    .rk-pc-b{padding:0.8rem 1rem 1rem}
    .rk-pc-n{font-family:var(--font-display,Georgia,serif);font-size:1.05rem;color:#f4ebd9}
    .rk-pc-t{font-family:var(--font-mono,monospace);font-size:0.68rem;color:#e6c97c;margin-top:0.2rem}
    .rk-pc-d{font-family:var(--font-mono,monospace);font-size:0.68rem;color:var(--ivory-faint,#8a8070);margin-top:0.35rem}
    .rk-ov{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:4vh 1rem;overflow:auto}
    .rk-md{background:linear-gradient(180deg,#221a17,#151010);border:1px solid #a8843f;border-radius:12px;width:100%;max-width:760px;box-shadow:0 20px 60px rgba(0,0,0,.7)}
    .rk-md-h{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.3rem;border-bottom:1px solid rgba(255,255,255,.08);font-family:var(--font-display,Georgia,serif);font-size:1.3rem;color:#f4ebd9}
    .rk-md-b{padding:1.2rem 1.3rem}
    .rk-md-f{display:flex;justify-content:flex-end;gap:0.6rem;padding:1rem 1.3rem;border-top:1px solid rgba(255,255,255,.08)}
    .rk-md-grid{display:grid;grid-template-columns:190px 1fr;gap:1.2rem}
    .rk-drop{height:230px;border:2px dashed #7a6236;border-radius:12px;display:flex;align-items:center;justify-content:center;text-align:center;cursor:pointer;color:var(--ivory-faint,#8a8070);font-family:var(--font-mono,monospace);font-size:0.74rem;line-height:1.7;overflow:hidden;background:#120d0c}
    .rk-drop.over,.rk-drop:hover{border-color:#e6c97c;color:#e6c97c}
    .rk-drop img{width:100%;height:100%;object-fit:cover}
    .rk-link{background:none;border:none;color:#e0627a;cursor:pointer;font-family:var(--font-mono,monospace);font-size:0.72rem;text-decoration:underline;margin-top:0.5rem}
    @media(max-width:1100px){.rk-layout{grid-template-columns:1fr}.rk-detail{position:static;max-height:none}.rk-bottom{grid-template-columns:1fr}}
    @media(max-width:620px){.rk-md-grid{grid-template-columns:1fr}}
  </style>
  </head><body>
  ${renderNav(req, 'rodokmen')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Caledonia</div>
        <h1 class="page-title">Rodokmen</h1>
        <p class="page-sub">Kdo je kdo v rodině — osoby, jejich příběhy a vazby mezi nimi</p>
      </div>
      <div class="rk-head-actions">${canEdit ? '<button class="rk-btn rk-btn-gold" data-act="add">+ Přidat osobu</button>' : ''}</div>
    </div>

    <div class="rk-stats" id="rk-stats"></div>

    <div class="report-nav" style="margin-bottom:1.2rem">
      <button class="report-nav-item active" id="rk-tabbtn-tree" type="button">Rodokmen</button>
      <button class="report-nav-item" id="rk-tabbtn-people" type="button">Osoby</button>
    </div>

    <div id="rk-tab-tree">
      <div class="rk-toolbar">
        <input type="text" id="rk-search" list="rk-names" placeholder="Najít osobu…"><datalist id="rk-names"></datalist>
        <select id="rk-view">
          <option value="full">Zobrazení: celý rodokmen</option>
          <option value="predci">Zobrazení: předci vybrané osoby</option>
          <option value="potomci">Zobrazení: potomci vybrané osoby</option>
          <option value="okoli">Zobrazení: nejbližší okolí vybrané osoby</option>
        </select>
        <label class="rk-toggle"><input type="checkbox" id="rk-threads" checked><span>Červené nitě (strýc, bratranec, švagr…)</span></label>
        <button class="rk-zbtn" id="rk-z-out" type="button" title="Oddálit">−</button>
        <button class="rk-zbtn" id="rk-z-fit" type="button" title="Přizpůsobit šířce">⤢</button>
        <button class="rk-zbtn" id="rk-z-in" type="button" title="Přiblížit">+</button>
      </div>
      <div class="rk-layout">
        <div class="rk-canvas">
          <div class="rk-info" id="rk-info"></div>
          <div class="rk-scroll" id="rk-scroll"><div id="rk-svg-host"></div></div>
          <div class="rk-legend">
            <span><i style="border-top:3px solid #d9ad5c"></i>Rodič → dítě</span>
            <span><i style="border-top:3px solid #d4a95a"></i>Partneři</span>
            <span><i style="border-top:3px dotted #7fb0d6"></i>Sourozenci</span>
            <span><i style="border-top:3px dashed #d99a63"></i>Strýc / teta</span>
            <span><i style="border-top:3px dotted #e6c75e"></i>Kmotr</span>
            <span><i style="border-top:3px dotted #8f95a3"></i>Rodinný známý</span>
            <span><i style="border-top:3px solid #d6455d"></i>Červená nit (strýc, bratranec, švagr…)</span>
          </div>
        </div>
        <aside class="rk-detail" id="rk-detail"></aside>
      </div>
      <div class="rk-bottom">
        <div class="rk-panel"><h3>Historie rodiny</h3><div id="rk-hist"></div></div>
        <div class="rk-panel"><h3>Klíčové vztahy</h3><div id="rk-pairs"></div></div>
      </div>
    </div>

    <div id="rk-tab-people" style="display:none">
      <div class="rk-toolbar"><input type="text" id="rk-pq" placeholder="Hledat podle jména nebo titulu…"></div>
      <div class="rk-people-grid" id="rk-people-grid"></div>
    </div>
  </main>
  <div id="rk-modal"></div>
  <div class="toast" id="toast"></div>
  <script>window.RODOKMEN_CFG = { canEdit: ${canEdit}, isStaff: ${isStaff} };</script>
  <script src="/js/rodokmen.js"></script>
  </body></html>`;
}

module.exports = { renderRodokmen };
