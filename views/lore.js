// lore.js — extracted view module

const { baseStyles } = require('./styles');
const { renderNav } = require('./nav');

function renderLore(req) {
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Albion — Historie</title>
  ${baseStyles()}
  </head><body>
  ${renderNav(req, 'lore')}
  <main>
    <div class="page-header">
      <div>
        <div class="page-label">Organizace Albion</div>
        <h1 class="page-title">Historie & Původ</h1>
        <p class="page-sub">Kronika organizace — od počátků po současnost</p>
      </div>
    </div>
    <p class="folio-footnote"><strong>Kronika Albionu.</strong> Historie zaznamenává vznik a vývoj organizace Albion od prvních dnů Christophera Sinclaira v Los Santos po současnost. Každá kapitola popisuje klíčové momenty, které formovaly organizaci do podoby, jakou má dnes.</p>
    <div class="lore-grid">
      <div class="chapters">
        <div class="chapter">
          <div class="chapter-meta">Počátky</div>
          <div class="chapter-title">Vznik organizace</div>
          <div class="chapter-text with-dropcap">Albion vznikl krátce po příchodu Christophera Sinclaira do Los Santos. Po přesunu ze Spojeného království se Sinclair snažil začlenit do místního prostředí a navázat kontakty, které by mu umožnily vybudovat vlastní podnikatelské zázemí. Během prvních měsíců ve městě však zjistil, že samotné vzdělání, zkušenosti ani kapitál často nestačí. Los Santos fungovalo na osobních vazbách, vzájemných službách a důvěře mezi jednotlivci, kteří byli schopni táhnout za jeden provaz.

Právě během tohoto období se kolem něj začala formovat skupina lidí s podobným pohledem na svět. Nešlo o jedince stejné národnosti ani stejného původu. Někteří pocházeli z Evropy, jiní ze Spojených států a další z úplně odlišných částí světa. Spojovala je především ambice vybudovat si v Los Santos vlastní postavení a nechtít být závislí na cizích organizacích nebo zájmech.

Název Albion navrhl sám Sinclair. Původně měl představovat odkaz na jeho britské kořeny a připomínku místa, odkud přišel. Postupem času však získal širší význam — přestal označovat původ zakladatelů a začal symbolizovat samotnou organizaci a její identitu.</div>
        </div>
        <div class="chapter">
          <div class="chapter-meta">Kapitola 1</div>
          <div class="chapter-title">Formování organizace</div>
          <div class="chapter-text">První měsíce existence Albionu byly zaměřeny především na budování kontaktů a získávání informací o fungování města. Členové organizace se pohybovali v podnikatelském prostředí, navštěvovali společenské akce, seznamovali se s majiteli podniků a postupně si vytvářeli síť známých napříč Los Santos.

Od samého začátku bylo jasné, že Albion nechce fungovat jako pouliční gang. Zakladatelé byli přesvědčeni, že dlouhodobý vliv nelze vybudovat prostřednictvím násilí nebo neustálých konfliktů. Místo toho se soustředili na vytváření vztahů, hledání obchodních příležitostí a budování reputace spolehlivých a schopných lidí.

Organizace si postupně získávala další členy — ne na základě původu nebo národnosti, ale na základě charakteru a schopností. Každý nově příchozí musel prokázat, že dokáže přinést určitou hodnotu nejen sobě, ale i celé skupině.</div>
        </div>
        <div class="chapter">
          <div class="chapter-meta">Kapitola 2</div>
          <div class="chapter-title">Působení v Los Santos</div>
          <div class="chapter-text">V době svého vzniku nebyl Albion známým jménem. Většina obyvatel města o jeho existenci vůbec nevěděla. To však zakladatelům vyhovovalo. Jejich cílem nebylo získat okamžitou pozornost, ale vytvořit stabilní základy pro budoucí rozvoj.

Členové organizace se postupně začali angažovat v různých odvětvích služeb a podnikání. Někteří se zaměřovali na gastronomii, jiní na brigády pro nově příchozí ve městě, kavárny a podobně. Díky tomu získával Albion přístup k novým kontaktům a příležitostem, které by jednotlivci samostatně hledali jen obtížně.

Přestože organizace vystupovala navenek jako skupina zaměstnanců v různých prostorech, její skutečná síla spočívala především v propojení lidí s různými zkušenostmi a schopnostmi. Každý nový kontakt rozšiřoval možnosti celé skupiny a posiloval její postavení ve městě.</div>
        </div>
        <div class="chapter">
          <div class="chapter-meta">Kapitola 3</div>
          <div class="chapter-title">Současnost</div>
          <div class="chapter-text">Albion se v současnosti nachází ve fázi růstu. Organizace nadále rozšiřuje své kontakty, hledá nové příležitosti a snaží se upevnit své postavení v Los Santos. Její členové sdílejí přesvědčení, že úspěch nepřichází okamžitě, ale je výsledkem dlouhodobé práce, správných rozhodnutí a důvěry mezi lidmi.

Přestože je skupina stále relativně mladá, její zakladatelé věří, že mají dostatek času na to, aby vybudovali organizaci, která se stane respektovanou součástí života v Los Santos. Nechtějí být známí tím, jak hlasitě o sobě dávají vědět, ale tím, čeho dokážou dosáhnout.

Albion tak zůstává organizací postavenou na ambicích, loajalitě a společné vizi budoucnosti, kterou její členové budují krok za krokem od okamžiku, kdy se jejich cesty poprvé protnuly v ulicích Los Santos.</div>
        </div>
      </div>
      <div class="sidebar">
        <div class="sidebar-title">Kapitoly</div>
        <div class="toc-item"><span class="toc-num">—</span><span>Počátky · Vznik</span></div>
        <div class="toc-item"><span class="toc-num">01</span><span>Formování organizace</span></div>
        <div class="toc-item"><span class="toc-num">02</span><span>Působení v Los Santos</span></div>
        <div class="toc-item"><span class="toc-num">03</span><span>Současnost</span></div>
        <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border);font-family:var(--font-display);font-style:italic;font-size:0.97rem;color:var(--text-muted);line-height:1.85">
          „Nechtějí být známí tím, jak hlasitě o sobě dávají vědět, ale tím, čeho dokážou dosáhnout."
        </div>
      </div>
    </div>
  </main>
  </body></html>`;
}

module.exports = { renderLore };

