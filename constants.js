// constants.js — shared static configuration (item catalogs, prices, weed-growing recipe)

const CONFIG = {
  zbrane: ["Pump Shotgun","Pistol MK2","Pistol","Combat Pistol","Double Action Revolver","Navy Revolver","Vintage Pistol","Gusenberg","Dlouhé"],
  naboje: ["9mm","9mm Mk2",".75cal",".50cal","12-gauge"],
  akce:   ["Malá C4","Velká C4","Přístupová karta","Pokročilá zvláštní karta","EMP zařízení","Řezací laser","Cable Cutter","Zvláštní karta"],
  weedOdrudy: ["Žlutý kanabis","Zelený kanabis","Kanabis","Červený kanabis","Modrý kanabis"],
  weedCeny: {
    "Žlutý kanabis":  { vyroba: 100, prodej: 150 },
    "Zelený kanabis": { vyroba: 100, prodej: 150 },
    "Kanabis":        { vyroba: 100, prodej: 150 },
    "Červený kanabis":{ vyroba: 100, prodej: 150 },
    "Modrý kanabis":  { vyroba: 100, prodej: 150 },
  },
  drogyTypy: ["Kapky","Kokain","Extáze","Metamfetamin","Benzo","Joyka","Heroin","Speed","LSD"],
  chemkyTypy: ["Aceton","Peroxid vodíku","Kofein","Propylenglykol","Toluen","Benzín","Bismut","Kyselina fosforečná"],
  drogyCeny: {
    "Kapky":       { prodej: 200 },
    "Kokain":      { prodej: 500 },
    "Extáze":      { prodej: 350 },
    "Metamfetamin":{ prodej: 450 },
    "Benzo":       { prodej: 300 },
    "Joyka":       { prodej: 250 },
    "Heroin":      { prodej: 600 },
    "Speed":       { prodej: 280 },
    "LSD":         { prodej: 400 },
  },
  zbraneCeny: {
    "Pump Shotgun":           { prodej: 8000 },
    "Pistol MK2":             { prodej: 12000 },
    "Pistol":                 { prodej: 5000 },
    "Combat Pistol":          { prodej: 7000 },
    "Double Action Revolver": { prodej: 15000 },
    "Navy Revolver":          { prodej: 14000 },
    "Vintage Pistol":         { prodej: 6000 },
    "Gusenberg":              { prodej: 18000 },
    "Dlouhé":                 { prodej: 25000 },
    "9mm":                    { prodej: 100 },
    "9mm Mk2":                { prodej: 150 },
    ".75cal":                 { prodej: 300 },
    ".50cal":                 { prodej: 250 },
    "12-gauge":               { prodej: 200 },
  },
};

// ── WEED SÁZENÍ — recept a ceny na jednu kytku ────────────────────────────────
// Každá položka: kolik kusů je potřeba na 1 kytku a kolik to celkem stojí.
const WEED_PLANT = {
  // qty = počet kusů na 1 kytku, unit = cena za 1 kus
  items: [
    { key: 'seed',            name: 'Seed',             qty: 1, unit: 50 },
    { key: 'hnojivo',         name: 'Hnojivo',          qty: 1, unit: 25 },
    { key: 'konev',           name: 'Konev s vodou',    qty: 1, unit: 20 },
    { key: 'kvalitniHnojivo', name: 'Kvalitní hnojivo', qty: 4, unit: 50 },
    { key: 'vyzivovaVoda',    name: 'Výživová voda',    qty: 4, unit: 40 },
  ],
  bagsPerPlant: 4,    // z 1 kytky vznikají 4 sáčky
  bagPrice:     150,  // prodejní hodnota 1 sáčku
  growHours:    20,   // doba růstu jedné kytky
};
WEED_PLANT.items.forEach(it => { it.cost = it.qty * it.unit; });                          // cena za danou položku na 1 kytku
WEED_PLANT.costPerPlant    = WEED_PLANT.items.reduce((a, it) => a + it.cost, 0);          // 455
WEED_PLANT.revenuePerPlant = WEED_PLANT.bagsPerPlant * WEED_PLANT.bagPrice;               // 600
WEED_PLANT.profitPerPlant  = WEED_PLANT.revenuePerPlant - WEED_PLANT.costPerPlant;        // 145
WEED_PLANT.growMs          = WEED_PLANT.growHours * 60 * 60 * 1000;

module.exports = { CONFIG, WEED_PLANT };
