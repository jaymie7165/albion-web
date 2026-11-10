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
  const canDiscord = (req.session.accessLevel || 3) <= 2;

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Caledonia — Rodokmen</title>
  ${baseStyles()}
<style>
    .rk-hero{position:relative;overflow:hidden;display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap;padding:2rem 2rem 1.6rem;margin-bottom:1.3rem;border:1px solid var(--border-brass,#7a6236);border-radius:12px;background:radial-gradient(ellipse at 20% 0%,rgba(122,98,54,.28),transparent 55%),radial-gradient(ellipse at 90% 100%,rgba(86,104,43,.38),transparent 55%),linear-gradient(135deg,#1a1d13,#0d0f0a)}
    .rk-hero::after{content:"";position:absolute;right:2%;top:50%;width:230px;height:230px;transform:translateY(-50%);background:url('/seal.png') center/contain no-repeat;opacity:.22;pointer-events:none}
    .rk-hero h1{font-family:var(--font-display,Georgia,serif);font-size:3rem;font-weight:500;color:#f4ebd9;margin:0;line-height:1}
    .rk-slogan{font-family:var(--font-display,Georgia,serif);font-style:italic;font-size:1.15rem;color:#c9a35b;margin-top:0.5rem}
    .rk-hero-r{display:flex;gap:0.6rem;align-items:center;position:relative;z-index:1;flex-wrap:wrap}
    .rk-tabs{display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:1.1rem}
    .rk-tab{background:linear-gradient(180deg,#1d2016,#131510);border:1px solid #3e4a22;color:var(--ivory-dim,#bfb5a0);padding:0.65rem 1.2rem;border-radius:8px;cursor:pointer;font-family:var(--font-display,Georgia,serif);font-size:0.98rem}
    .rk-tab:hover{border-color:#a8843f;color:#e6c97c}
    .rk-tab.active{border-color:#d4a95a;color:#f0d38a;background:linear-gradient(180deg,#313a1c,#1a1d12);box-shadow:0 0 18px rgba(212,169,90,.18)}
    .rk-toolbar{display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap;margin-bottom:0.9rem}
    .rk-toolbar input,.rk-toolbar select{width:auto;min-width:170px}
    .rk-seg{display:inline-flex;margin-left:auto;border:1px solid #7a6236;border-radius:8px;overflow:hidden}
    .rk-seg button{background:transparent;border:none;color:var(--ivory-dim,#bfb5a0);padding:0.55rem 1rem;cursor:pointer;font-family:var(--font-display,Georgia,serif);font-size:0.9rem}
    .rk-seg button.on{background:linear-gradient(180deg,#d4a95a,#a8843f);color:#181a13;font-weight:700}
    .rk-toggle{display:inline-flex;align-items:center;gap:0.5rem;font-family:var(--font-mono,monospace);font-size:0.72rem;color:var(--ivory-dim,#bfb5a0);cursor:pointer}
    .rk-toggle input{width:auto;min-width:0}
    .rk-layout{display:grid;grid-template-columns:minmax(0,1fr) 370px;gap:1.2rem;align-items:start}
    .rk-canvas{position:relative;background:linear-gradient(180deg,#191b13,#10120c);border:1px solid var(--border-brass,#7a6236);border-radius:12px;padding:0.8rem;box-shadow:0 10px 34px rgba(0,0,0,.4);min-width:0}
    .rk-zoom{position:absolute;left:1.5rem;top:4.2rem;z-index:5;display:flex;flex-direction:column;gap:0.4rem}
    .rk-zbtn{background:rgba(20,15,13,.92);border:1px solid #7a6236;color:#e6c97c;width:36px;height:36px;cursor:pointer;font-size:1.15rem;border-radius:8px}
    .rk-zbtn:hover{background:rgba(201,163,91,.2)}
    .rk-info{font-family:var(--font-mono,monospace);font-size:0.74rem;color:var(--ivory-dim,#bfb5a0);margin:0 0 0.7rem;padding:0.55rem 0.8rem;border-left:2px solid #c9a35b;background:rgba(201,163,91,.07)}
    .rk-info b{color:#e6c97c}
    .rk-info button{background:none;border:none;color:#b7c96b;cursor:pointer;font:inherit;text-decoration:underline;margin-left:0.5rem}
    .rk-scroll{overflow:auto;max-height:78vh;min-height:340px;border:1px solid rgba(122,98,54,.45);border-radius:8px;cursor:grab}
    .rk-scroll.rk-drag{cursor:grabbing;user-select:none}
    .rk-scroll svg{display:block;user-select:none}
    .rk-legend{display:flex;gap:1rem;flex-wrap:wrap;margin-top:0.7rem;font-family:var(--font-mono,monospace);font-size:0.66rem;color:var(--ivory-dim,#bfb5a0)}
    .rk-legend i{display:inline-block;width:22px;height:0;margin-right:0.4rem;vertical-align:middle}
    .rk-empty,.rk-d-empty{padding:3rem 1.5rem;text-align:center;color:var(--ivory-dim,#bfb5a0);font-family:var(--font-mono,monospace);font-size:0.82rem;line-height:1.7}
    .rk-empty-ico{font-size:2.4rem;color:#7a6236;margin-bottom:0.6rem}
    .rk-empty-t{font-family:var(--font-display,Georgia,serif);font-size:1.3rem;color:#e6c97c;margin-bottom:0.5rem}
    .rk-detail{position:sticky;top:calc(var(--nav-h,0px) + 1rem);background:linear-gradient(180deg,#1c1f15,#131410);border:1px solid var(--border-brass,#7a6236);border-radius:12px;max-height:calc(100vh - 2rem);overflow:auto;box-shadow:0 10px 34px rgba(0,0,0,.4)}
    .rk-d-close{position:absolute;right:0.7rem;top:0.7rem;z-index:3;width:30px;height:30px;border-radius:50%;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.2);color:#fff;cursor:pointer}
    .rk-d-photo{position:relative;height:270px;background:#10120c;overflow:hidden}
    .rk-d-photo img{width:100%;height:100%;object-fit:cover;object-position:top}
    .rk-d-fade{position:absolute;inset:auto 0 0 0;height:120px;background:linear-gradient(180deg,transparent,#181b12)}
    .rk-d-mono{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display,Georgia,serif);font-size:4rem;color:#f1e8d6;background:radial-gradient(circle at 35% 30%,#6d8034,#34421a)}
    .rk-d-head{padding:0 1.3rem;margin-top:-2.6rem;position:relative}
    .rk-d-name{font-family:var(--font-display,Georgia,serif);font-size:1.65rem;line-height:1.15;color:#f4ebd9;margin:0 0 0.3rem}
    .rk-d-sub{font-family:var(--font-mono,monospace);font-size:0.76rem;color:#b3a78d;margin-bottom:0.5rem}
    .rk-d-title{display:inline-block;padding:0.22rem 0.8rem;border:1px solid #a8843f;border-radius:20px;color:#e6c97c;font-family:var(--font-mono,monospace);font-size:0.72rem;background:rgba(217,173,92,.1)}
    .rk-d-tabs{display:flex;gap:0.2rem;padding:0.9rem 1.3rem 0;border-bottom:1px solid rgba(255,255,255,.08)}
    .rk-dt{background:none;border:none;border-bottom:2px solid transparent;color:var(--ivory-faint,#8a8070);padding:0.5rem 0.7rem;cursor:pointer;font-family:var(--font-display,Georgia,serif);font-size:0.9rem}
    .rk-dt.on{color:#f0d38a;border-bottom-color:#d4a95a}
    .rk-d-body{padding:0.6rem 1.3rem 1.4rem}
    .rk-d-row{display:flex;justify-content:space-between;gap:1rem;font-family:var(--font-mono,monospace);font-size:0.76rem;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,.06);color:var(--ivory-faint,#8a8070)}
    .rk-d-row b{color:var(--ivory,#efe6d4);font-weight:500;text-align:right}
    .rk-d-row a{color:#e6c97c}
    .rk-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:0.4rem}
    .rk-dot-live{background:#6fbf52}.rk-dot-dead{background:#8f95a3}
    .rk-lnk{color:#e6c97c;cursor:pointer;text-decoration:underline;text-decoration-color:rgba(230,201,124,.4)}
    .rk-d-h{font-family:var(--font-label,sans-serif);font-size:0.58rem;letter-spacing:0.2em;text-transform:uppercase;color:#c9a35b;margin:1.2rem 0 0.6rem}
    .rk-d-lore{font-size:0.88rem;line-height:1.75;color:var(--ivory-dim,#bfb5a0);white-space:pre-wrap}
    .rk-kins{display:grid;gap:0.3rem}
    .rk-kin{display:flex;gap:0.7rem;align-items:center;padding:0.4rem 0.5rem;border-radius:8px;cursor:pointer}
    .rk-kin:hover,.rk-pair-p:hover{background:rgba(201,163,91,.1)}
    .rk-kin-av,.rk-ev-av{width:38px;height:38px;border-radius:9px;object-fit:cover;border:1px solid #7a6236;flex:none}
    .rk-mono{display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 30%,#6d8034,#34421a);color:#f1e8d6;font-family:var(--font-display,Georgia,serif);font-size:0.9rem}
    .rk-kin-l{font-family:var(--font-mono,monospace);font-size:0.62rem;color:#c9a35b;text-transform:uppercase;letter-spacing:0.06em}
    .rk-kin-n{font-family:var(--font-display,Georgia,serif);font-size:0.98rem;color:#f4ebd9}
    .rk-views{display:flex;flex-wrap:wrap;gap:0.4rem}
    .rk-chip{background:transparent;border:1px solid #7a6236;color:var(--ivory-dim,#bfb5a0);padding:0.3rem 0.75rem;border-radius:20px;cursor:pointer;font-family:var(--font-mono,monospace);font-size:0.68rem}
    .rk-chip.on,.rk-chip:hover{background:rgba(217,173,92,.16);color:#e6c97c;border-color:#c9a35b}
    .rk-rel{display:flex;justify-content:space-between;align-items:center;gap:0.6rem;font-size:0.82rem;padding:0.35rem 0;border-bottom:1px solid rgba(255,255,255,.05);color:var(--ivory-dim,#bfb5a0)}
    .rk-x{background:none;border:1px solid var(--border-oxblood,#6a2530);color:var(--oxblood-bright,#d4586a);width:24px;height:24px;cursor:pointer;border-radius:4px;flex:none}
    .rk-addrel{display:grid;gap:0.5rem;margin-top:0.4rem}
    .rk-addrel select,.rk-addrel input{width:100%}
    .rk-hint{font-family:var(--font-mono,monospace);font-size:0.66rem;color:var(--ivory-faint,#8a8070);margin-top:0.35rem;line-height:1.5}
    .rk-btn{background:transparent;border:1px solid #7a6236;color:var(--ivory-dim,#bfb5a0);padding:0.6rem 1rem;font-family:var(--font-label,sans-serif);font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;border-radius:6px}
    .rk-btn:hover:not(:disabled){background:rgba(201,163,91,.12)}
    .rk-btn:disabled{opacity:.45;cursor:default}
    .rk-btn-gold{background:linear-gradient(180deg,#d4a95a,#a8843f);border-color:#d4a95a;color:#181a13;font-weight:700}
    .rk-btn-gold:hover:not(:disabled){background:linear-gradient(180deg,#e6c97c,#b8934a)}
    .rk-btn-red{border-color:var(--border-oxblood,#6a2530);color:var(--oxblood-bright,#d4586a)}
    .rk-d-actions{display:flex;gap:0.6rem;margin-top:1.4rem}
    .rk-d-actions .rk-btn-gold{flex:1}
    .rk-link{background:none;border:none;color:#e6c97c;cursor:pointer;font-family:var(--font-mono,monospace);font-size:0.72rem;text-decoration:underline;margin-top:0.6rem;padding:0}
    .rk-bottom{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.2rem;margin-top:1.4rem}
    .rk-bottom4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1.2rem;margin-top:1.4rem}
    .rk-panel{background:linear-gradient(180deg,#1c1f15,#131410);border:1px solid var(--border-brass,#7a6236);border-radius:12px;padding:1.1rem 1.3rem}
    .rk-panel h3{font-family:var(--font-display,Georgia,serif);font-size:1.15rem;color:#f4ebd9;margin:0 0 0.9rem;font-weight:500}
    .rk-mini-tl{display:grid;gap:0.55rem;border-left:1px solid #5a4a2b;margin-left:0.3rem;padding-left:0.9rem}
    .rk-mtl-i{position:relative;display:flex;flex-direction:column;font-size:0.82rem}
    .rk-mtl-dot{position:absolute;left:-1.18rem;top:0.35rem;width:8px;height:8px;border-radius:50%;background:#d4a95a;box-shadow:0 0 8px rgba(212,169,90,.6)}
    .rk-mtl-y{font-family:var(--font-mono,monospace);font-size:0.66rem;color:#c9a35b}
    .rk-mtl-t{color:var(--ivory,#efe6d4)}
    .rk-sig-card{border:1px solid #5a4a2b;border-radius:10px;padding:0.9rem 1rem;background:rgba(0,0,0,.2)}
    .rk-sig-t{font-family:var(--font-display,Georgia,serif);font-size:1.15rem;color:#f0d38a}
    .rk-sig-d{font-family:var(--font-mono,monospace);font-size:0.7rem;color:#c9a35b;margin:0.2rem 0 0.5rem}
    .rk-sig-x{font-size:0.84rem;line-height:1.6;color:var(--ivory-dim,#bfb5a0)}
    .rk-sgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:0.8rem}
    .rk-sg{text-align:center;padding:0.7rem 0.3rem;border:1px solid #333d1d;border-radius:10px;background:rgba(0,0,0,.18)}
    .rk-sg-n{font-family:var(--font-display,Georgia,serif);font-size:1.8rem;color:#e6c97c;line-height:1}
    .rk-sg-l{font-family:var(--font-label,sans-serif);font-size:0.54rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--ivory-faint,#8a8070);margin-top:0.35rem}
    .rk-mini-map{cursor:pointer;border-radius:8px;background:#10120c;border:1px solid #333d1d}
    .rk-muted{color:var(--ivory-faint,#8a8070);font-family:var(--font-mono,monospace);font-size:0.78rem;line-height:1.6}
    .rk-tl{position:relative;display:grid;gap:0.9rem;max-width:760px}
    .rk-tl-year{font-family:var(--font-display,Georgia,serif);font-size:1.5rem;color:#e6c97c;margin-top:0.8rem}
    .rk-tl-item{display:flex;gap:0.9rem;align-items:flex-start}
    .rk-tl-dot{flex:none;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.95rem;border:1px solid #a8843f;background:#181a13;color:#e6c97c}
    .rk-tl-death{color:#9aa0ac;border-color:#6b7280}.rk-tl-event{color:#ffe08a;background:rgba(212,169,90,.18)}
    .rk-tl-card{flex:1;border:1px solid #333d1d;border-radius:10px;padding:0.7rem 1rem;background:rgba(0,0,0,.18)}
    .rk-tl-d{font-family:var(--font-mono,monospace);font-size:0.68rem;color:#c9a35b}
    .rk-tl-t{font-family:var(--font-display,Georgia,serif);font-size:1.02rem;color:#f4ebd9}
    .rk-tl-x{font-size:0.84rem;line-height:1.6;color:var(--ivory-dim,#bfb5a0);margin-top:0.3rem;white-space:pre-wrap}
    .rk-tl-p{display:flex;flex-wrap:wrap;gap:0.35rem;margin-top:0.5rem}
    .rk-tl-chip{font-family:var(--font-mono,monospace);font-size:0.66rem;border:1px solid #7a6236;border-radius:20px;padding:0.15rem 0.6rem;color:#e6c97c;cursor:pointer}
    .rk-tl-a{display:flex;gap:1rem;margin-top:0.4rem}
    .rk-tl-sm .rk-tl-dot{width:28px;height:28px;font-size:0.8rem}
    .rk-sc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem}
    .rk-sc{background:linear-gradient(180deg,#1f2217,#141610);border:1px solid #3e4a22;border-radius:12px;padding:1rem 1.2rem}
    .rk-sc-l{font-family:var(--font-label,sans-serif);font-size:0.56rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--ivory-faint,#8a8070)}
    .rk-sc-v{font-family:var(--font-display,Georgia,serif);font-size:1.5rem;color:#e6c97c;margin-top:0.4rem;line-height:1.2}
    .rk-sc-s{font-family:var(--font-mono,monospace);font-size:0.68rem;color:var(--ivory-faint,#8a8070);margin-top:0.3rem}
    .rk-bar{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.55rem}
    .rk-bar-l{width:30px;font-family:var(--font-display,Georgia,serif);color:#c9a35b;font-style:italic}
    .rk-bar-t{flex:1;height:12px;background:#10120c;border-radius:6px;overflow:hidden;border:1px solid #333d1d}
    .rk-bar-f{height:100%;background:linear-gradient(90deg,#a8843f,#e6c97c)}
    .rk-bar-n{width:28px;text-align:right;font-family:var(--font-mono,monospace);font-size:0.78rem;color:var(--ivory,#efe6d4)}
    .rk-split{display:flex;height:34px;border-radius:8px;overflow:hidden;font-family:var(--font-mono,monospace);font-size:0.8rem;color:#11120f}
    .rk-split div{display:flex;align-items:center;justify-content:center}
    .rk-split-l{display:flex;gap:1rem;margin-top:0.7rem;font-family:var(--font-mono,monospace);font-size:0.7rem;color:var(--ivory-dim,#bfb5a0)}
    .rk-split-l i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:0.35rem}
    .rk-people-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:1rem}
    .rk-pc{background:linear-gradient(180deg,#1f2217,#141610);border:1px solid #5a4a2b;border-radius:12px;overflow:hidden;cursor:pointer;transition:transform .15s,border-color .15s}
    .rk-pc:hover{transform:translateY(-3px);border-color:#d4a95a}
    .rk-pc-ph{height:210px;background:#10120c}
    .rk-pc-ph img{width:100%;height:100%;object-fit:cover;object-position:top}
    .rk-pc-b{padding:0.8rem 1rem 1rem}
    .rk-pc-n{font-family:var(--font-display,Georgia,serif);font-size:1.05rem;color:#f4ebd9}
    .rk-pc-t{font-family:var(--font-mono,monospace);font-size:0.68rem;color:#e6c97c;margin-top:0.2rem}
    .rk-pc-d{font-family:var(--font-mono,monospace);font-size:0.68rem;color:var(--ivory-faint,#8a8070);margin-top:0.35rem}
    .rk-ls{position:absolute;top:10px;right:10px;width:15px;height:15px;border-radius:50%;background:#35e068;border:2px solid #0e3a1b;box-shadow:0 0 0 3px rgba(53,224,104,.25),0 0 10px #35e068;z-index:2}
    .rk-ls-inline{position:static;display:inline-block;width:12px;height:12px;vertical-align:middle;margin-left:0.3rem}
    .rk-pc-ph{position:relative}
    .rk-dot-ls{background:#35e068;box-shadow:0 0 6px #35e068}
    .rk-ls-check{display:flex;align-items:flex-start;gap:0.6rem;margin-top:0.4rem;line-height:1.5;color:var(--ivory-dim,#bfb5a0)}
    .rk-ls-check input{margin-top:0.2rem}
    .rk-ov{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:4vh 1rem;overflow:auto}
    .rk-md{background:linear-gradient(180deg,#1f2217,#131510);border:1px solid #a8843f;border-radius:12px;width:100%;max-width:760px;box-shadow:0 20px 60px rgba(0,0,0,.7)}
    .rk-md-h{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.3rem;border-bottom:1px solid rgba(255,255,255,.08);font-family:var(--font-display,Georgia,serif);font-size:1.3rem;color:#f4ebd9}
    .rk-md-b{padding:1.2rem 1.3rem}
    .rk-md-f{display:flex;justify-content:flex-end;gap:0.6rem;padding:1rem 1.3rem;border-top:1px solid rgba(255,255,255,.08)}
    .rk-md-grid{display:grid;grid-template-columns:190px 1fr;gap:1.2rem}
    .rk-drop{height:230px;border:2px dashed #7a6236;border-radius:12px;display:flex;align-items:center;justify-content:center;text-align:center;cursor:pointer;color:var(--ivory-faint,#8a8070);font-family:var(--font-mono,monospace);font-size:0.74rem;line-height:1.7;overflow:hidden;background:#10120c}
    .rk-drop.over,.rk-drop:hover{border-color:#e6c97c;color:#e6c97c}
    .rk-drop img{width:100%;height:100%;object-fit:cover}
    .rk-checks{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.3rem;max-height:200px;overflow:auto;padding:0.5rem;border:1px solid #333d1d;border-radius:8px}
    .rk-check{display:flex;align-items:center;gap:0.5rem;font-size:0.84rem;color:var(--ivory-dim,#bfb5a0);cursor:pointer}
    .rk-check input{width:auto;min-width:0}
    .rk-ex-grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:1.3rem}
    .rk-ex-prev{background:#0d0f0a;border:1px solid #333d1d;border-radius:8px;min-height:240px;max-height:60vh;overflow:auto;display:flex;align-items:center;justify-content:center;padding:0.5rem}
    .rk-ex-prev img{max-width:100%;display:block}
    .rk-ex-btns{display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:0.6rem}
    @media(max-width:1250px){.rk-bottom4{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:1100px){.rk-layout{grid-template-columns:1fr}.rk-detail{position:static;max-height:none}.rk-bottom{grid-template-columns:1fr}.rk-ex-grid{grid-template-columns:1fr}}
    @media(max-width:700px){.rk-bottom4{grid-template-columns:1fr}.rk-md-grid{grid-template-columns:1fr}.rk-hero h1{font-size:2.2rem}.rk-seg{margin-left:0}}
  </style>
  </head><body>
  ${renderNav(req, 'rodokmen')}
  <main>
    <div class="rk-hero">
      <div style="position:relative;z-index:1">
        <div class="page-label">Caledonia · VassClair</div>
        <h1>Rodokmen</h1>
        <div class="rk-slogan">Sinclair &amp; Vass — jedna rodina, jedno jméno.</div>
      </div>
      <div class="rk-hero-r">
        <button class="rk-btn" data-act="export" type="button">⤓ Exportovat rodokmen</button>
        ${canEdit ? '<button class="rk-btn rk-btn-gold" data-act="add" type="button">+ Přidat osobu</button>' : ''}
      </div>
    </div>

    <div class="rk-tabs">
      <button class="rk-tab active" id="rk-tabbtn-tree" type="button">Rodinný strom</button>
      <button class="rk-tab" id="rk-tabbtn-people" type="button">Osoby</button>
      <button class="rk-tab" id="rk-tabbtn-history" type="button">Historie a události</button>
      <button class="rk-tab" id="rk-tabbtn-stats" type="button">Statistiky</button>
    </div>

    <div id="rk-tab-tree">
      <div class="rk-toolbar">
        <input type="text" id="rk-search" list="rk-names" placeholder="Hledat člena rodiny…"><datalist id="rk-names"></datalist>
        <select id="rk-gen"><option value="0">Všechny generace</option></select>
        <select id="rk-view">
          <option value="full">Všechny větve</option>
          <option value="predci">Předci vybrané osoby</option>
          <option value="potomci">Potomci vybrané osoby</option>
          <option value="okoli">Nejbližší okolí vybrané osoby</option>
        </select>
        <select id="rk-status"><option value="all">Všichni členové</option><option value="alive">Jen žijící</option><option value="dead">Jen zesnulí</option><option value="ls">Jen hráči (Los Santos)</option><option value="lore">Jen lorové postavy</option></select>
        <label class="rk-toggle" id="rk-threads-wrap"><input type="checkbox" id="rk-threads" checked><span>Červené nitě</span></label>
        <div class="rk-seg"><button type="button" id="rk-mode-tree" class="on">Strom</button><button type="button" id="rk-mode-map">Mapa vztahů</button></div>
      </div>
      <div class="rk-layout">
        <div class="rk-canvas">
          <div class="rk-zoom">
            <button class="rk-zbtn" id="rk-z-in" type="button" title="Přiblížit">+</button>
            <button class="rk-zbtn" id="rk-z-out" type="button" title="Oddálit">−</button>
            <button class="rk-zbtn" id="rk-z-fit" type="button" title="Přizpůsobit šířce">◎</button>
          </div>
          <div class="rk-info" id="rk-info"></div>
          <div class="rk-scroll" id="rk-scroll"><div id="rk-svg-host"></div></div>
          <div class="rk-legend">
            <span><i style="border-top:3px solid #d9ad5c"></i>Rodič → dítě</span>
            <span><i style="border-top:3px solid #d4a95a"></i>Partneři</span>
            <span><i style="border-top:3px dotted #7fb0d6"></i>Sourozenci</span>
            <span><i style="border-top:3px dashed #d99a63"></i>Strýc / teta</span>
            <span><i style="border-top:3px dotted #e6c75e"></i>Kmotr</span>
            <span><i style="border-top:3px dotted #8f95a3"></i>Rodinný známý</span>
            <span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#35e068;border:1px solid #0e3a1b"></i>Hráč (přestěhován do Los Santos)</span>
            <span><i style="border-top:3px solid #a8c15a"></i>Nit (strýc, bratranec, švagr…)</span>
          </div>
        </div>
        <aside class="rk-detail" id="rk-detail"></aside>
      </div>
      <div class="rk-bottom4">
        <div class="rk-panel"><h3>Historie rodiny</h3><div id="rk-hist"></div></div>
        <div class="rk-panel"><h3>Významné události</h3><div id="rk-sig"></div></div>
        <div class="rk-panel"><h3>Statistiky rodiny</h3><div id="rk-statp"></div></div>
        <div class="rk-panel"><h3>Mapa vztahů</h3><div id="rk-mini"></div></div>
      </div>
    </div>

    <div id="rk-tab-people" style="display:none">
      <div class="rk-toolbar"><input type="text" id="rk-pq" placeholder="Hledat podle jména nebo titulu…" style="min-width:280px"></div>
      <div class="rk-people-grid" id="rk-people-grid"></div>
    </div>

    <div id="rk-tab-history" style="display:none"><div id="rk-history"></div></div>
    <div id="rk-tab-stats" style="display:none"><div id="rk-stats"></div></div>
  </main>
  <div id="rk-modal"></div>
  <div class="toast" id="toast"></div>
  <script>window.RODOKMEN_CFG = { canEdit: ${canEdit}, isStaff: ${isStaff}, canDiscord: ${canDiscord} };</script>
  <script src="/js/rodokmen.js"></script>
  </body></html>`;
}

module.exports = { renderRodokmen };
