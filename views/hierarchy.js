// hierarchy.js — extracted view module

const { baseStyles } = require('./styles');
const { renderNav } = require('./nav');

function renderHierarchy(req) {
  const ranks = [
    {
      rank: 'Founder', num: '01', member: 'Christopher Anthony Sinclair', isFounder: true,
      desc: 'Zakladatel Albionu a osoba určující dlouhodobé směřování organizace. Má konečné slovo při zásadních rozhodnutích, přijímání nových členů, navazování významných partnerství a určování budoucnosti organizace.',
      rights: ['Absolutní rozhodovací pravomoc','Jmenování a odvolávání členů','Schvalování projektů','Správa financí'],
    },
    {
      rank: 'Council', num: '02', member: 'Monica Williams', isFounder: false,
      desc: 'Nejužší vedení organizace. Tvoří jej lidé, kteří si získali nejvyšší důvěru zakladatele. Podílejí se na vedení organizace, rozhodování o důležitých záležitostech a koordinaci aktivit.',
      rights: ['Přístup k interním informacím','Strategická rozhodnutí','Návrhy nových členů','Dohled nad chodem'],
    },
    {
      rank: 'Senior Member', num: '03', member: 'Henry Williams', isFounder: false,
      desc: 'Zkušení a prověření členové. Jedná se o dlouhodobé členy Albionu, kteří prokázali loajalitu a schopnosti. Zastupují organizaci při obchodních jednáních a podílejí se na rozvoji projektů.',
      rights: ['Přístup k interním informacím','Doporučování nových členů','Vedení projektů','Reprezentace'],
    },
    {
      rank: 'Member', num: '04', member: null, isFounder: false,
      desc: 'Plnohodnotný člen Albionu. Člověk, který prošel zkušebním obdobím a stal se oficiální součástí organizace. Od člena se očekává aktivita, reprezentace organizace a dodržování kodexu.',
      rights: ['Přístup do interních prostor','Účast na schůzkách','Zapojení do projektů'],
    },
    {
      rank: 'Associate', num: '05', member: null, isFounder: false,
      desc: 'Kandidát na členství. Osoba, která s Albionem spolupracuje a buduje si důvěru. Associate ještě není plnohodnotným členem a nemá přístup ke všem informacím. Tato hodnost je zkušební fází.',
      rights: ['Omezený přístup','Vybrané aktivity','Možnost získat plné členství'],
    },
  ];
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Hierarchie</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'hierarchy')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Albion</div>
        <h1 class="page-title">Hierarchie</h1>
        <p class="page-sub">Struktura a řád organizace Albion</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Struktura organizace.</strong> Hierarchie definuje pět úrovní členství v Albionu — od zakladatele po Associate. Každý rank nese specifické pravomoci a odpovědnosti. Postup v hierarchii závisí na prokazování loajality, schopností a přispívání k rozvoji organizace.</p>
    <div class="rank-list">
      ${ranks.map(r => `
      <div class="rank-item${r.isFounder?' founder':''}">
        <div class="rank-num">${r.num}</div>
        <div class="rank-info" style="flex:1">
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

