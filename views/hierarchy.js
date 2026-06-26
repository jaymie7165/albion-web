// hierarchy.js — Albion v3

const { baseStyles } = require('../styles');
const { renderNav } = require('../nav');

function renderHierarchy(req) {
  const ranks = [
    {
      rank: 'Founder', num: '01', member: 'Christopher Anthony Sinclair', isFounder: true,
      desc: 'Zakladatel Albionu a osoba určující dlouhodobé směřování organizace. Má konečné slovo při zásadních rozhodnutích, přijímání nových členů, navazování partnerství a určování budoucnosti organizace.',
      rights: ['Absolutní rozhodovací pravomoc','Jmenování a odvolávání členů','Schvalování projektů','Správa financí'],
    },
    {
      rank: 'Council', num: '02', member: 'Monica Williams', isFounder: false,
      desc: 'Nejužší vedení organizace. Tvoří jej lidé, kteří si získali nejvyšší důvěru zakladatele. Podílejí se na vedení, rozhodování o důležitých záležitostech a koordinaci aktivit.',
      rights: ['Přístup k interním informacím','Strategická rozhodnutí','Návrhy nových členů','Dohled nad chodem'],
    },
    {
      rank: 'Senior Member', num: '03', member: 'Henry Williams', isFounder: false,
      desc: 'Zkušení a prověření členové, kteří prokázali loajalitu a schopnosti. Zastupují organizaci při obchodních jednáních a podílejí se na rozvoji projektů.',
      rights: ['Přístup k interním informacím','Doporučování nových členů','Vedení projektů','Reprezentace'],
    },
    {
      rank: 'Member', num: '04', member: null, isFounder: false,
      desc: 'Plnohodnotný člen Albionu. Prošel zkušebním obdobím a stal se oficiální součástí organizace. Od člena se očekává aktivita, reprezentace a dodržování kodexu.',
      rights: ['Přístup do interních prostor','Účast na schůzkách','Zapojení do projektů'],
    },
    {
      rank: 'Associate', num: '05', member: null, isFounder: false,
      desc: 'Kandidát na členství. Osoba, která s Albionem spolupracuje a buduje si důvěru. Ještě není plnohodnotným členem. Tato hodnost je zkušební fází.',
      rights: ['Omezený přístup','Vybrané aktivity','Možnost získat plné členství'],
    },
  ];

  return `<!DOCTYPE html><html lang="cs"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Albion — Hierarchie</title>
  ${baseStyles()}
  <style>
    /* Heraldická hierarchie — vertikální osa s řadami */
    .rank-timeline{position:relative;padding-left:3rem}
    .rank-timeline::before{
      content:'';position:absolute;left:0.85rem;top:0;bottom:0;width:1px;
      background:linear-gradient(180deg,var(--oxblood),var(--border-brass) 60%,transparent);
    }
    .rank-item{
      position:relative;display:flex;gap:1.8rem;align-items:flex-start;
      padding:2rem 2rem 2rem 0;border-bottom:1px solid var(--border);
      transition:background 0.2s;
    }
    .rank-item:last-child{border-bottom:none}
    .rank-item:hover{background:var(--brass-faint);margin:0 -1rem;padding-left:1rem;padding-right:1rem}
    /* Uzel na ose */
    .rank-item::before{
      content:'';position:absolute;left:-2.15rem;top:2.4rem;
      width:8px;height:8px;
      background:var(--oxblood);border:1px solid var(--brass);
      transform:rotate(45deg);
    }
    .rank-item.founder::before{
      width:12px;height:12px;left:-2.35rem;top:2.3rem;
      background:var(--oxblood-bright);border:2px solid var(--brass);
      box-shadow:0 0 12px var(--oxblood-glow);
    }
    .rank-item.founder{
      background:radial-gradient(ellipse 80% 100% at 0% 0%, rgba(110,20,35,0.12) 0%, transparent 60%);
      border-bottom:1px solid var(--border-brass);padding:2.6rem 2rem 2.6rem 0;
    }
    .rank-item.founder:hover{margin:0 -1rem;padding-left:1rem;padding-right:1rem}
    .rank-num{
      font-family:var(--font-display);font-weight:700;font-style:italic;
      font-size:1.8rem;color:var(--oxblood);opacity:0.35;
      min-width:2.8rem;line-height:1;flex-shrink:0;margin-top:0.1rem;
    }
    .rank-item.founder .rank-num{font-size:4.5rem;opacity:1;color:var(--oxblood-bright);min-width:5rem;line-height:0.85}
    .rank-info{flex:1}
    .rank-info h3{
      font-family:var(--font-display);font-size:1.1rem;font-weight:600;font-style:italic;
      color:var(--ivory);margin-bottom:0.3rem;
    }
    .rank-item.founder .rank-info h3{font-size:1.6rem}
    .rank-member{
      font-family:var(--font-label);font-size:0.68rem;letter-spacing:0.1em;
      color:var(--ivory-dim);margin-bottom:0.6rem;
    }
    .rank-item.founder .rank-member{color:var(--brass-bright);font-size:0.82rem}
    .rank-info p{font-family:var(--font-body);font-size:0.88rem;color:var(--ivory-dim);line-height:1.8;font-weight:300}
    .rank-rights{margin-top:0.8rem;display:flex;flex-wrap:wrap;gap:0.35rem}
    .rank-right-tag{
      font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.1em;
      padding:0.22rem 0.65rem;
      background:var(--brass-faint);border:1px solid var(--border-brass);
      color:var(--ivory-dim);white-space:nowrap;
      transition:border-color 0.2s,color 0.2s;
    }
    .rank-right-tag:hover{border-color:var(--brass);color:var(--ivory)}
    .rank-item.founder .rank-right-tag{border-color:var(--border-oxblood);color:var(--ivory)}
  </style>
  </head><body>
  ${renderNav(req, 'hierarchy')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Albion</div>
        <h1 class="page-title">Hierarchie</h1>
        <p class="page-sub">Struktura a řád organizace — pět úrovní členství</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Struktura organizace.</strong> Hierarchie definuje pět úrovní členství — od zakladatele po Associate. Každý rank nese specifické pravomoci a odpovědnosti. Postup závisí na prokazování loajality, schopností a přispívání k organizaci.</p>

    <div class="rank-timeline">
      ${ranks.map(r => `
        <div class="rank-item${r.isFounder ? ' founder' : ''}">
          <div class="rank-num">${r.num}</div>
          <div class="rank-info">
            <h3>${r.rank}</h3>
            ${r.member ? `<div class="rank-member">${r.member}</div>` : ''}
            <p>${r.desc}</p>
            <div class="rank-rights">
              ${r.rights.map(right => `<span class="rank-right-tag">${right}</span>`).join('')}
            </div>
          </div>
        </div>`).join('')}
    </div>
  </main>
  </body></html>`;
}

module.exports = { renderHierarchy };
