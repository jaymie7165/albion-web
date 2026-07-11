// constants.js — shared static configuration (item catalogs, prices, weed-growing recipe)

// Weed i drogy se do skladu zapisují přímo v SÁČCÍCH (ne v gramech). Ceny
// v CONFIG.weedCeny (vyroba/prodej) jsou stanovené za 1 sáček, takže žádný
// další přepočet není potřeba — množství zapsané do skladu = počet sáčků.
// (GRAMU_NA_SACEK/pocetSacku zůstávají exportované jen pro zpětnou kompatibilitu
// s případnými staršími voláními, sklad je už na nich nezávislý.)
const GRAMU_NA_SACEK = 5;
function pocetSacku(gramy) { return Math.floor((gramy || 0) / GRAMU_NA_SACEK); }

const CONFIG = {
  zbrane: ["Pump Shotgun","Pistol MK2","Pistol","Combat Pistol","Double Action Revolver","Navy Revolver","Vintage Pistol","Gusenberg","Dlouhé"],
  naboje: ["9mm","9mm Mk2",".75cal",".50cal","12-gauge"],
  akce:   ["Malá C4","Velká C4","Přístupová karta","Pokročilá zvláštní karta","EMP zařízení","Řezací laser","Cable Cutter","Zvláštní karta"],
  weedOdrudy: ["Žlutý kanabis","Zelený kanabis","Kanabis","Červený kanabis","Modrý kanabis"],
  weedCeny: {
    "Žlutý kanabis":  { vyroba: 100, prodej: 165 },
    "Zelený kanabis": { vyroba: 100, prodej: 165 },
    "Kanabis":        { vyroba: 100, prodej: 165 },
    "Červený kanabis":{ vyroba: 100, prodej: 165 },
    "Modrý kanabis":  { vyroba: 100, prodej: 165 },
  },
  drogyTypy: ["Kapky","Kokain","Extáze","Metamfetamin","Benzo","Joyka","Heroin","Speed","LSD"],
  chemkyTypy: ["Aceton","Peroxid vodíku","Kofein","Propylenglykol","Toluen","Benzín","Bismut","Kyselina fosforečná"],
  // Ceny drog a zbraní/střeliva byly záměrně odstraněny — evidují se přesně
  // v Profit centru a hodnoty dřív uložené zde neodpovídaly realitě.
};

// ── WEED SÁZENÍ — recept a ceny na jednu kytku ────────────────────────────────
// Každá položka: kolik kusů je potřeba na 1 kytku a kolik to celkem stojí.
const WEED_PLANT = {
  // qty = počet kusů na 1 kytku, unit = cena za 1 kus
  items: [
    { key: 'seed',            name: 'Seed',             qty: 1, unit: 80 }, // zdraženo z 50$ na 80$
    { key: 'hnojivo',         name: 'Hnojivo',          qty: 1, unit: 25 },
    { key: 'konev',           name: 'Konev s vodou',    qty: 1, unit: 20 },
    { key: 'kvalitniHnojivo', name: 'Kvalitní hnojivo', qty: 4, unit: 50 },
    { key: 'vyzivovaVoda',    name: 'Výživová voda',    qty: 4, unit: 40 },
  ],
  bagsPerPlant: 4,    // z 1 kytky vznikají 4 sáčky
  bagPrice:     165,  // prodejní hodnota 1 sáčku — zdraženo ze 150$ na 165$
  growHours:    20,   // doba růstu jedné kytky
};
WEED_PLANT.items.forEach(it => { it.cost = it.qty * it.unit; });                          // cena za danou položku na 1 kytku
WEED_PLANT.costPerPlant    = WEED_PLANT.items.reduce((a, it) => a + it.cost, 0);          // 455
WEED_PLANT.revenuePerPlant = WEED_PLANT.bagsPerPlant * WEED_PLANT.bagPrice;               // 600
WEED_PLANT.profitPerPlant  = WEED_PLANT.revenuePerPlant - WEED_PLANT.costPerPlant;        // 145
WEED_PLANT.growMs          = WEED_PLANT.growHours * 60 * 60 * 1000;

module.exports = { CONFIG, WEED_PLANT, GRAMU_NA_SACEK, pocetSacku };
