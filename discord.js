// discord.js — posílá zprávy do Discord kanálů při akcích z webu
const axios = require('axios');

const BOT_TOKEN = () => process.env.DISCORD_TOKEN;

async function sendEmbed(channelId, embed) {
  if (!channelId || !BOT_TOKEN()) return;
  if (ALBION_SEAL_URL && !embed.thumbnail) embed.thumbnail = { url: ALBION_SEAL_URL };
  try {
    await axios.post(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      { embeds: [embed] },
      { headers: { Authorization: `Bot ${BOT_TOKEN()}`, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[DISCORD] Chyba odeslání embedu:', err.response?.data || err.message);
  }
}

// ══════════════════════════════════════════════════════════════════════
// OSOBNOST EVELYN ASHCROFT — sdílená filozofie s Discord botem
// (viz utils/helpers.js a utils/registry.js v repu bota). Bot posílá
// embedy jen na základě webhooků, ale VĚTŠINA reálného provozu (sklad,
// účetnictví, garáž...) jde přímo odsud, z webu — a Evelyn má znít stejně
// živě, ať zápis přijde odkudkoliv. Vizuál embedů (barvy/tituly/fields)
// se neměnil, přibyla jen osobnostní vrstva (description + author).
// ══════════════════════════════════════════════════════════════════════

const EVELYN_AUTHOR = { name: '✦  Evelyn Ashcroft  ·  Sekretariát Caledonie' };

// ── Pečeť Albionu (thumbnail) — stejný princip jako v botovi (helpers.js) ──
// Dokud nemáte hostovaný obrázek erbu, zůstává vypnuté. Nastavte na
// Railway ALBION_SEAL_URL a projeví se to automaticky ve všech embedech.
const ALBION_SEAL_URL = process.env.ALBION_SEAL_URL || null;

// ── Nálada dne — STEJNÝ algoritmus jako bot (utils/helpers.js::denniNalada) ──
// Obě strany (bot i web) počítají náladu ze stejného seedu (dnešní datum),
// takže i když jde o dva nezávislé procesy, jejich "nálada" je ten samý den
// konzistentní — to je nejvíc, co lze udělat bez sdíleného balíčku (viz
// diskuse o konsolidaci hlasu bota a webu).
const NALADY_DNE = ['klidná', 'čilá', 'mírně zamyšlená', 'soustředěná', 'dobře naladěná', 'pracovitá'];
function denniNalada() {
  const dnes = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Prague' });
  let seed = 0;
  for (let i = 0; i < dnes.length; i++) seed = (seed * 31 + dnes.charCodeAt(i)) >>> 0;
  return NALADY_DNE[seed % NALADY_DNE.length];
}

// ── Sezónní období — stejná logika jako bot ────────────────────────────
function sezonniObdobi() {
  const dnes = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Prague' });
  const [, mesicStr, denStr] = dnes.split('-');
  const mesic = parseInt(mesicStr), den = parseInt(denStr);
  if ((mesic === 12 && den >= 15) || (mesic === 1 && den <= 6)) return 'vanoce';
  if ((mesic === 10 && den >= 24) || (mesic === 11 && den === 1)) return 'halloween';
  return null;
}

const SEZONNI_FRAZE = {
  vanoce: [
    'i uprostřed vánočního shonu vedu evidenci s obvyklou pečlivostí.',
    'byť za okny svítí vánoční výzdoba, registry se vedou dál jako každý den.',
  ],
  halloween: [
    'i v tento strašidelný večer zůstává evidence organizace v bezpečných rukou.',
    'navzdory halloweenské atmosféře v Los Santos jsem u svého stolu jako obvykle.',
  ],
};

// Motiv, který se má opakovat napříč kanály — malá "podpisová" kontinuita.
const MOTTO = 'Vedu záznamy, abyste vy mohli vést organizaci.';

function pozdrav() {
  const hodina = parseInt(
    new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague', hour: '2-digit', hour12: false })
  );
  if (hodina >= 5 && hodina < 10)  return 'Dobré ráno';
  if (hodina >= 10 && hodina < 18) return 'Dobrý den';
  if (hodina >= 18 && hodina < 23) return 'Dobrý večer';
  return 'Dobrou noc';
}

function nahodna(pole) {
  return pole[Math.floor(Math.random() * pole.length)];
}

// Rotující banky frází — jedna kategorie akce = víc možných formulací,
// aby Evelyn nepůsobila jako robot opakující stále stejnou hlášku.
const FRAZE = {
  vklad: [
    'zaznamenávám nový přírůstek do registru.',
    'do evidence právě přibývá tento zápis.',
    's potěšením zapisuji tuto položku do knihy organizace.',
    'evidence skladu se právě rozrostla o následující záznam.',
    'následující přírůstek eviduji do skladové knihy.',
  ],
  vyber: [
    'zaznamenávám výdej dle níže uvedených údajů.',
    'do evidence zapisuji tento odběr ze skladu.',
    'prosím o pozornost k tomuto výdeji ze skladu.',
    'následující výdej právě eviduji v knize.',
    'zapisuji úbytek ze skladu dle uvedených údajů.',
  ],
  prijem: [
    's potěšením zaznamenávám příjem do pokladny.',
    'pokladna organizace se právě rozrostla o tento příjem.',
    'zapisuji přírůstek do finanční evidence.',
    'do účetní knihy přibývá tento příjem.',
  ],
  vydaj: [
    'zaznamenávám výdaj z pokladny dle níže uvedeného.',
    'do finanční evidence zapisuji tento výdaj.',
    'prosím o pozornost k tomuto výdaji z pokladny.',
    'pokladna organizace se právě snížila o tuto částku.',
  ],
  smena: [
    'provedla jsem pro vás směnu měn dle níže uvedeného kurzu.',
    'zaznamenávám směnu měn do účetní knihy.',
    'směnárna organizace právě zpracovala tuto transakci.',
  ],
  garaz: [
    'evidenci vozového parku jsem právě aktualizovala.',
    'do garážového registru přibývá nový záznam.',
    'zapisuji nový přírůstek do evidence vozidel.',
  ],
  povyseni: [
    's potěšením zaznamenávám povýšení v hodnosti.',
    'personální oddělení eviduje tuto změnu hodnosti.',
    'do kádrové knihy zapisuji radostnou zprávu o povýšení.',
  ],
  vyznamenani: [
    's radostí zaznamenávám udělení tohoto vyznamenání.',
    'do knihy cti organizace přibývá nový zápis.',
    'personální oddělení s potěšením eviduje tento úspěch.',
  ],
  bulk: [
    'zaznamenávám hromadný zápis do registru.',
    'do evidence právě přibývá tato hromadná dávka záznamů.',
    'zpracovala jsem pro vás hromadný zápis do skladu.',
  ],
};

// Formálnější varianty pro nejvyšší hodnosti (accessLevel 1 = Founder/Council,
// viz roles.js). Používají se jen ČÁSTEČNĚ (ne pokaždé), ať to nepůsobí
// vykonstruovaně — ale jednou za čas Evelyn dá jasně najevo, že si je
// vědoma, s kým mluví.
const FRAZE_VYSOKA_HODNOST = {
  vklad: [
    'dovolte, abych tomuto zápisu věnovala patřičnou pečlivost.',
    'ihned zaznamenávám do registru, jak si vaše postavení žádá.',
    's náležitou vážností zapisuji tento přírůstek do knihy.',
  ],
  vyber: [
    'tomuto výdeji věnuji zvýšenou pozornost, jak se na vaši hodnost sluší.',
    'zaznamenávám s náležitou pečlivostí, Vaše slovo je pro mě směrodatné.',
  ],
};

// Sestaví úvodní řádek (description) — pozdrav podle denní doby, oslovení
// jménem a rotující sekretářská poznámka. `klic` volí banku frází.
// `accessLevel` (nepovinné, 1/2/3 dle roles.js) — u úrovně 1 (Founder/Council)
// se část času použije formálnější fráze místo běžné rotace.
function uvod(uzivatel, klic, accessLevel) {
  const jmeno = uzivatel ? `, **${uzivatel}**` : '';

  // Sezónní období má občas (ne pokaždé, ať to nezačne nudit) přednost
  // před běžnou rotací frází.
  const sezona = sezonniObdobi();
  if (sezona && SEZONNI_FRAZE[sezona] && Math.random() < 0.3) {
    return `${pozdrav()}${jmeno}. ${nahodna(SEZONNI_FRAZE[sezona])}`;
  }

  let banka = FRAZE[klic] || FRAZE.vklad;
  if (accessLevel === 1 && FRAZE_VYSOKA_HODNOST[klic] && Math.random() < 0.4) {
    banka = FRAZE_VYSOKA_HODNOST[klic];
  }
  const fraze = nahodna(banka);
  return `${pozdrav()}${jmeno}. ${fraze}`;
}

// ══════════════════════════════════════════════════════════════════════
// NÍZKÉ ZÁSOBY — hlídání prahů + upozornění do příslušné roomky
// ══════════════════════════════════════════════════════════════════════
//
// Hlídají se jen drogy (weed a tvrdé drogy) — zbraně a chemikálie prahy
// nemají. Množství je v sáčcích: weed pod 10 sáčků, drogy pod 5 sáčků.
const PRAH_NIZKE_ZASOBY = {
  weed:   10,
  drogy:  5,
};

const KANAL_PODLE_SEKCE = {
  zbrane: () => process.env.CHANNEL_ZBRANE,
  weed:   () => process.env.CHANNEL_WEED,
  drogy:  () => process.env.CHANNEL_DROGY,
  chemky: () => process.env.CHANNEL_CHEMKY,
};

const IKONA_PODLE_SEKCE = { zbrane: '🔫', weed: '🌿', drogy: '💊', chemky: '⚗️' };
const NAZEV_SEKCE = { zbrane: 'arzenálu', weed: 'botanického registru', drogy: 'farmaceutického registru', chemky: 'laboratorního registru' };

const FRAZE_NIZKE_ZASOBY = [
  'ráda bych upozornila, že zásoby klesly pod bezpečnou hranici.',
  's jistými obavami hlásím pokles zásob pod doporučenou úroveň.',
  'dovoluji si upozornit na klesající stav zásob u této položky.',
  'prosím o pozornost — tahle položka se blíží vyprodání.',
];

// Bezpečnostní pojistka proti spamu — i kdyby detekce "přechodu přes
// hranici" z nějakého důvodu vyhodnotila víc upozornění za sebou (např.
// při rychlém testování mnoha akcí najednou), tenhle cooldown zaručí
// max. jedno upozornění na stejnou položku za 30 minut.
const POSLEDNI_UPOZORNENI = new Map(); // klíč: "sekce:polozka" → timestamp (ms)
const COOLDOWN_MS = 30 * 60 * 1000;

// Vyhodnotí, jestli akce (VKLAD/VÝBĚR o `mnozstvi` ks) právě STÁHLA položku
// POD práh — a pokud ano, pošle upozornění. Neopakuje se při každém dalším
// výběru, dokud se zásoba znovu nedostane nad práh a zase pod něj neklesne
// (kontrolujeme, že PŘEDCHOZÍ stav byl ještě nad prahem).
// `vlastniPrah` — nepovinné, umožňuje serveru dodat prah nakonfigurovaný
// přes web (viz /api/thresholds) místo pevně daného výchozího čísla.
// ── Prediktivní odhad — "za kolik dní dojde" ────────────────────────────
// V paměti (ne persistentní — restart appky historii vynuluje, což je pro
// tenhle "orientační odhad" účel v pořádku) sledujeme poslední stavy
// každé položky za posledních 7 dní a z poklesu odhadneme tempo spotřeby.
const HISTORIE_ZASOB = new Map(); // "sekce:polozka" → [{ t, v }, ...]
const HISTORIE_OKNO_MS = 7 * 24 * 60 * 60 * 1000;

function zaznamenejHistorii(sekce, polozka, aktualniStav) {
  const klic = `${sekce}:${polozka}`;
  const ted = Date.now();
  const zaznamy = (HISTORIE_ZASOB.get(klic) || []).filter(z => ted - z.t <= HISTORIE_OKNO_MS);
  zaznamy.push({ t: ted, v: aktualniStav });
  HISTORIE_ZASOB.set(klic, zaznamy);
}

function odhadniDnyDoVyprodani(sekce, polozka, aktualniStav) {
  const klic = `${sekce}:${polozka}`;
  const zaznamy = HISTORIE_ZASOB.get(klic) || [];
  if (zaznamy.length < 2) return null;

  const nejstarsi = zaznamy[0];
  const dnyUplynulo = (Date.now() - nejstarsi.t) / 86400000;
  if (dnyUplynulo < 0.5) return null; // příliš málo dat na rozumný odhad

  const pokles = nejstarsi.v - aktualniStav;
  if (pokles <= 0) return null; // zásoby rostou/stagnují — nic k predikci

  const tempoZaDen = pokles / dnyUplynulo;
  return Math.max(1, Math.round(aktualniStav / tempoZaDen));
}

async function checkNizkaZasoba(sekce, polozka, typ, mnozstvi, aktualniStav, vlastniPrah) {
  if (aktualniStav != null) zaznamenejHistorii(sekce, polozka, aktualniStav);

  const prah = (typeof vlastniPrah === 'number' && !isNaN(vlastniPrah)) ? vlastniPrah : PRAH_NIZKE_ZASOBY[sekce];
  if (!prah || aktualniStav == null) return;

  const klic = `${sekce}:${polozka}`;
  const ted = Date.now();
  if (POSLEDNI_UPOZORNENI.has(klic) && ted - POSLEDNI_UPOZORNENI.get(klic) < COOLDOWN_MS) return;

  const predchoziStav = typ === 'VÝBĚR' ? aktualniStav + mnozstvi : aktualniStav - mnozstvi;
  const preslaPresHranici = predchoziStav >= prah && aktualniStav < prah;
  if (!preslaPresHranici) return;

  const channelId = KANAL_PODLE_SEKCE[sekce]?.();
  if (!channelId) return;

  POSLEDNI_UPOZORNENI.set(klic, ted);

  const odhad = odhadniDnyDoVyprodani(sekce, polozka, aktualniStav);
  const predikceText = odhad ? `\n\n📉 Při současném tempu spotřeby odhaduji vyprodání za přibližně **${odhad} ${odhad === 1 ? 'den' : odhad < 5 ? 'dny' : 'dní'}**.` : '';

  await sendEmbed(channelId, {
    title: `⚠️ NÍZKÉ ZÁSOBY — ${polozka}`,
    color: 0xE8A33D,
    author: EVELYN_AUTHOR,
    description: `${pozdrav()}. ${nahodna(FRAZE_NIZKE_ZASOBY)}${predikceText}`,
    fields: [
      { name: 'Položka', value: polozka, inline: true },
      { name: 'Aktuální stav', value: `${aktualniStav} ks`, inline: true },
      { name: 'Doporučený minimální stav', value: `${prah} ks`, inline: true },
    ],
    timestamp: new Date().toISOString(),
  });
}

async function notifyZbrane(typ, polozka, mnozstvi, kategorie, uzivatel, ucel, accessLevel) {
  const channelId = process.env.CHANNEL_ZBRANE;
  const color = typ === 'VKLAD' ? 0x00FF88 : 0xFF4444;
  const fields = [
    { name: 'Položka', value: polozka, inline: true },
    { name: 'Množství', value: `${mnozstvi} ks`, inline: true },
    { name: 'Kategorie', value: kategorie, inline: true },
    { name: typ === 'VKLAD' ? 'Vložil' : 'Vzal', value: uzivatel, inline: true },
  ];
  if (typ === 'VÝBĚR' && ucel) fields.push({ name: 'Účel', value: ucel, inline: true });
  await sendEmbed(channelId, {
    title: typ === 'VKLAD' ? '➕ VLOŽENO DO SKLADU (web)' : '➖ VYBRÁNO ZE SKLADU (web)',
    color, fields, timestamp: new Date().toISOString(),
    author: EVELYN_AUTHOR,
    description: uvod(uzivatel, typ === 'VKLAD' ? 'vklad' : 'vyber', accessLevel),
  });
}

async function notifyWeed(typ, odruda, mnozstvi, vyroba, prodej, uzivatel, accessLevel) {
  const channelId = process.env.CHANNEL_WEED;
  const color = typ === 'VKLAD' ? 0x00FF88 : 0xFF4444;
  // Weed se zapisuje přímo v SÁČCÍCH — ceny (vyroba/prodej) jsou stanovené za
  // 1 sáček, žádný přepočet z gramů se tedy nedělá.
  const fields = [
    { name: 'Odrůda', value: odruda, inline: true },
    { name: 'Množství', value: `${mnozstvi} sáčků`, inline: true },
    { name: typ === 'VKLAD' ? 'Vložil' : 'Vzal', value: uzivatel, inline: true },
    { name: '💸 Výroba stála', value: `~$${vyroba * mnozstvi}`, inline: true },
    { name: '💰 Doporučená prodejní', value: `$${prodej * mnozstvi}`, inline: true },
  ];
  await sendEmbed(channelId, {
    title: typ === 'VKLAD' ? '🌿 VLOŽENO DO SKLADU (web)' : '🌿 VYBRÁNO ZE SKLADU (web)',
    color, fields, timestamp: new Date().toISOString(),
    author: EVELYN_AUTHOR,
    description: uvod(uzivatel, typ === 'VKLAD' ? 'vklad' : 'vyber', accessLevel),
  });
}

async function notifyDrogy(typ, droga, mnozstvi, vyroba, prodej, uzivatel, accessLevel) {
  const channelId = process.env.CHANNEL_DROGY;
  const color = typ === 'VKLAD' ? 0x00FF88 : 0xFF4444;
  const fields = [
    { name: 'Droga', value: droga, inline: true },
    { name: 'Množství', value: `${mnozstvi} ks`, inline: true },
    { name: typ === 'VKLAD' ? 'Vložil' : 'Vzal', value: uzivatel, inline: true },
  ];
  // Drogy v configu nemají nastavené ceny (na rozdíl od weedu) — pole
  // přidáváme jen pokud reálně dorazila platná čísla, ať nezobrazujeme "$NaN".
  if (typeof vyroba === 'number' && !isNaN(vyroba)) fields.push({ name: '💸 Výroba', value: `~$${vyroba * mnozstvi}`, inline: true });
  if (typeof prodej === 'number' && !isNaN(prodej)) fields.push({ name: '💰 Prodej', value: `$${prodej * mnozstvi}`, inline: true });
  await sendEmbed(channelId, {
    title: typ === 'VKLAD' ? '💊 VLOŽENO DO SKLADU (web)' : '💊 VYBRÁNO ZE SKLADU (web)',
    color, fields, timestamp: new Date().toISOString(),
    author: EVELYN_AUTHOR,
    description: uvod(uzivatel, typ === 'VKLAD' ? 'vklad' : 'vyber', accessLevel),
  });
}

async function notifyChemky(typ, chemikalie, mnozstvi, uzivatel, accessLevel) {
  const channelId = process.env.CHANNEL_CHEMKY;
  const color = typ === 'VKLAD' ? 0x00FF88 : 0xFF4444;
  const fields = [
    { name: 'Chemikálie', value: chemikalie, inline: true },
    { name: 'Množství', value: `${mnozstvi} ks`, inline: true },
    { name: typ === 'VKLAD' ? 'Vložil' : 'Vzal', value: uzivatel, inline: true },
  ];
  await sendEmbed(channelId, {
    title: typ === 'VKLAD' ? '⚗️ VLOŽENO DO SKLADU (web)' : '⚗️ VYBRÁNO ZE SKLADU (web)',
    color, fields, timestamp: new Date().toISOString(),
    author: EVELYN_AUTHOR,
    description: uvod(uzivatel, typ === 'VKLAD' ? 'vklad' : 'vyber', accessLevel),
  });
}

async function notifyGarage(car, uzivatel, discordUsername, imageUrl) {
  const channelId = process.env.CHANNEL_GARAZ || '1518526763641212968';
  const fields = [
    { name: '🔑 SPZ', value: car.spz || '—', inline: true },
    { name: '🚙 Model', value: car.nazev || '—', inline: true },
    { name: '💰 Cena', value: car.cena != null ? `$${Number(car.cena).toLocaleString('cs-CZ')} SAD` : '—', inline: true },
    { name: '🧾 Koupil', value: car.kupil || '—', inline: true },
    { name: '📋 Přidal', value: car.pridal || uzivatel || '—', inline: true },
  ];
  if (car.ucel) fields.push({ name: '📝 Účel / poznámka', value: car.ucel, inline: false });
  fields.push({ name: '👤 Zadal', value: discordUsername ? `${uzivatel}\n(@${discordUsername})` : uzivatel, inline: true });

  const embed = {
    title: '🚗 NOVÝ VŮZ PŘIDÁN DO GARÁŽE (web)',
    color: 0xC9A84C,
    fields,
    timestamp: new Date().toISOString(),
    author: EVELYN_AUTHOR,
    description: uvod(uzivatel, 'garaz'),
  };
  if (imageUrl) embed.image = { url: imageUrl };

  await sendEmbed(channelId, embed);
}

async function notifyUcet(typ, castka, valuta, poznamka, uzivatel) {
  const channelId = process.env.CHANNEL_UCETNICTVI;
  const color = typ === 'PŘÍJEM' ? 0x00FF88 : 0xFF4444;
  const symbol = valuta === 'USD' ? '$' : '₱';
  const fields = [
    { name: 'Částka', value: `${symbol}${castka}`, inline: true },
    { name: 'Valuta', value: valuta, inline: true },
    { name: 'Zadal', value: uzivatel, inline: true },
    { name: 'Poznámka', value: poznamka },
  ];
  await sendEmbed(channelId, {
    title: typ === 'PŘÍJEM' ? `💚 PŘÍJEM — ${valuta} (web)` : `🔴 VÝDAJ — ${valuta} (web)`,
    color, fields, timestamp: new Date().toISOString(),
    author: EVELYN_AUTHOR,
    description: uvod(uzivatel, typ === 'PŘÍJEM' ? 'prijem' : 'vydaj'),
  });
}

async function notifySmena(smer, castka, vysledek, uzivatel) {
  const channelId = process.env.CHANNEL_UCETNICTVI;
  const zFrom = smer === 'usd_to_pesos' ? 'SAD' : 'Pesos';
  const zTo   = smer === 'usd_to_pesos' ? 'Pesos' : 'SAD';
  const symFrom = smer === 'usd_to_pesos' ? '$' : '₱';
  const symTo   = smer === 'usd_to_pesos' ? '₱' : '$';
  const fields = [
    { name: 'Směr', value: `${zFrom} → ${zTo}`, inline: true },
    { name: 'Směněno', value: `${symFrom}${castka}`, inline: true },
    { name: 'Obdrženo', value: `${symTo}${vysledek}`, inline: true },
    { name: 'Kurz', value: '1:1', inline: true },
    { name: 'Zadal', value: uzivatel, inline: true },
  ];
  await sendEmbed(channelId, {
    title: '💱 SMĚNA MĚN (web)',
    color: 0x6FA8C9, fields, timestamp: new Date().toISOString(),
    author: EVELYN_AUTHOR,
    description: uvod(uzivatel, 'smena'),
  });
}

async function notifyAudit(akce, uzivatel, discordUsername, detail) {
  const channelId = process.env.CHANNEL_AUDIT;
  if (!channelId) {
    console.error('[DISCORD] CHANNEL_AUDIT není nastaven v .env!');
    return;
  }

  // Určit typ akce a barvu
  const detailUpper = (detail || '').toUpperCase();
  const isVklad = detailUpper.startsWith('VKLAD') || detailUpper.startsWith('PŘÍJEM');
  const isVyber = detailUpper.startsWith('VÝBĚR') || detailUpper.startsWith('VÝDAJ');
  const color = isVklad ? 0x57F287 : isVyber ? 0xED4245 : 0x5865F2;

  // Ikona sekce
  const ikonySekcí = { 'Zbraně': '🔫', 'Weed': '🌿', 'Drogy': '💊', 'Účetnictví': '💰' };
  const ikona = ikonySekcí[akce] || '📋';

  // Čas v CZ formátu
  const now = new Date();
  const casText = now.toLocaleString('cs-CZ', { timeZone: 'Europe/Prague', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Rozebrat detail na typ a zbytek
  const [typAkce, ...zbytek] = (detail || '').split(' — ');
  const zbytekText = zbytek.join(' — ');

  const fields = [
    { name: '📁 Sekce', value: `${ikona} ${akce}`, inline: true },
    { name: '⚡ Akce', value: typAkce || detail, inline: true },
    { name: '🕐 Čas', value: casText, inline: true },
  ];
  if (zbytekText) fields.push({ name: '📝 Detail', value: zbytekText, inline: false });
  fields.push({ name: '👤 Provedl', value: discordUsername ? `${uzivatel}
(@${discordUsername})` : uzivatel, inline: true });

  try {
    await sendEmbed(channelId, {
      title: isVklad ? `✅ VKLAD / PŘÍJEM` : isVyber ? `❌ VÝBĚR / VÝDAJ` : `📋 ZÁZNAM`,
      color,
      fields,
      timestamp: new Date().toISOString(),
    });
    console.log(`[DISCORD] Audit odeslan: ${akce} — ${uzivatel}`);
  } catch (err) {
    console.error('[DISCORD] notifyAudit selhal:', err.message);
  }
}

// Hromadný zápis do skladu (více položek najednou) — pošle JEDEN souhrnný
// embed do příslušného kanálu, aby hromadná akce nezaplavila kanál
// desítkami samostatných zpráv.
async function notifyBulkSklad(sekce, typ, items, uzivatel) {
  const channelMap = {
    zbrane: process.env.CHANNEL_ZBRANE,
    weed:   process.env.CHANNEL_WEED,
    drogy:  process.env.CHANNEL_DROGY,
    chemky: process.env.CHANNEL_CHEMKY,
  };
  const ikonyMap = { zbrane: '🔫', weed: '🌿', drogy: '💊', chemky: '⚗️' };
  const channelId = channelMap[sekce];
  const color = typ === 'VKLAD' ? 0x00FF88 : 0xFF4444;
  const jednotka = (sekce === 'weed') ? 'sáčků' : 'ks';
  const seznam = items.map(v => `• ${v.polozka} — ${v.qty} ${jednotka}`).join('\n').slice(0, 1000);

  await sendEmbed(channelId, {
    title: `${ikonyMap[sekce] || '📦'} HROMADNÝ ${typ === 'VKLAD' ? 'VKLAD' : 'VÝBĚR'} (web)`,
    color,
    fields: [
      { name: 'Počet položek', value: `${items.length}`, inline: true },
      { name: typ === 'VKLAD' ? 'Vložil' : 'Vzal', value: uzivatel, inline: true },
      { name: 'Položky', value: seznam || '—', inline: false },
    ],
    timestamp: new Date().toISOString(),
    author: EVELYN_AUTHOR,
    description: uvod(uzivatel, 'bulk'),
  });
}

// Povýšení — detekováno na základě změny Discord role (viz server.js,
// requireDiscordMember middleware). Posílá se do kanálu povýšení.
async function notifyPovyseni(fromLabel, toLabel, uzivatel, discordUsername) {
  const channelId = process.env.CHANNEL_POVYSENI;
  if (!channelId) {
    console.error('[DISCORD] CHANNEL_POVYSENI není nastaven v .env, povýšení se nezapsalo do Discordu.');
    return;
  }
  const fields = [
    { name: '👤 Jméno', value: uzivatel, inline: true },
    { name: '🎖️ Nová hodnost', value: toLabel, inline: true },
    { name: '↩️ Předchozí', value: fromLabel, inline: true },
  ];
  if (discordUsername) fields.push({ name: '🔗 Discord', value: `@${discordUsername}`, inline: true });

  await sendEmbed(channelId, {
    title: '📈 POVÝŠENÍ (web)',
    color: 0xC9A84C,
    fields,
    timestamp: new Date().toISOString(),
    author: EVELYN_AUTHOR,
    description: uvod(uzivatel, 'povyseni'),
  });
}

// Vyznamenání / odznaky (achievements.js) — nová notifikace při udělení
// odznaku (first_action, hundred_ops, first_month, veteran, logistics...).
async function notifyVyznamenani(nazevOdznaku, popis, uzivatel, discordUsername) {
  const channelId = process.env.CHANNEL_VYZNAMENANI;
  if (!channelId) {
    console.error('[DISCORD] CHANNEL_VYZNAMENANI není nastaven v .env, odznak se nezapsal do Discordu.');
    return;
  }
  const fields = [
    { name: '👤 Jméno', value: uzivatel || '—', inline: true },
    { name: '🏅 Odznak', value: nazevOdznaku, inline: true },
  ];
  if (discordUsername) fields.push({ name: '🔗 Discord', value: `@${discordUsername}`, inline: true });
  if (popis) fields.push({ name: '📝 Popis', value: popis, inline: false });

  await sendEmbed(channelId, {
    title: '🏅 UDĚLENÍ VYZNAMENÁNÍ (web)',
    color: 0xC9A84C,
    fields,
    timestamp: new Date().toISOString(),
    author: EVELYN_AUTHOR,
    description: uvod(uzivatel, 'vyznamenani'),
  });
}

// Personální oddělení — nástup nového člena do organizace. (Odchod/suspendace
// zatím nemají na webu žádnou akci, ze které by šly spustit — jakmile
// taková funkce vznikne, stačí sem přidat obdobné volání.)
async function notifyPersonalni(typ, jmeno, detail) {
  const channelId = process.env.CHANNEL_PERSONALNI;
  if (!channelId) {
    console.error('[DISCORD] CHANNEL_PERSONALNI není nastaven v .env, personální záznam se nezapsal.');
    return;
  }
  const NAZVY = {
    nastup: { title: '🟡 NÁSTUP DO ORGANIZACE', icon: '➕' },
  };
  const info = NAZVY[typ] || { title: '🟡 PERSONÁLNÍ ZÁZNAM', icon: '📁' };

  await sendEmbed(channelId, {
    title: info.title,
    color: 0xC9A84C,
    author: EVELYN_AUTHOR,
    description: `${pozdrav()}. Personální oddělení zaznamenává následující změnu.`,
    fields: [
      { name: '👤 Jméno', value: `**${jmeno}**`, inline: true },
      { name: `${info.icon} Detail`, value: detail || '—', inline: true },
    ],
    timestamp: new Date().toISOString(),
  });
}

// ── Onboarding DM ────────────────────────────────────────────────────────
// Krátká uvítací sekvence do soukromé zprávy novému členovi po registraci.
// Použití: await sendOnboardingDM(discordId, icName)
async function sendOnboardingDM(discordId, icName) {
  if (!discordId || !BOT_TOKEN()) return;
  try {
    const dmChannel = await axios.post(
      'https://discord.com/api/v10/users/@me/channels',
      { recipient_id: discordId },
      { headers: { Authorization: `Bot ${BOT_TOKEN()}`, 'Content-Type': 'application/json' } }
    );
    const channelId = dmChannel.data.id;

    const zpravy = [
      `Vítejte v Caledonie${icName ? `, ${icName}` : ''}! Jsem Evelyn Ashcroft a starám se o administrativní chod organizace — ceník, sklad, garáž a spoustu dalšího najdete na webovém rozhraní.`,
      `Pár tipů na začátek: aktuální ceník najdete v sekci **Ceník** na aplikaci (i jako \`/cenik\` zde). Zápisy do skladu (zbraně, weed, drogy, chemikálie) se dělají výhradně přes interní aplikaci Caledonie — tento kanál slouží jako živá kronika toho, co se v organizaci děje.`,
      `Pokud si nebudete s něčím jistí, obraťte se na Senior Membera nebo výše — a přeji vám v organizaci mnoho úspěchů.`,
    ];

    for (const text of zpravy) {
      await axios.post(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        { content: text },
        { headers: { Authorization: `Bot ${BOT_TOKEN()}`, 'Content-Type': 'application/json' } }
      );
      await new Promise(r => setTimeout(r, 1200)); // krátká pauza mezi zprávami, ať to nepůsobí jako spam
    }
  } catch (err) {
    console.error('[DISCORD] Onboarding DM selhalo (uživatel může mít vypnuté DM):', err.response?.data || err.message);
  }
}

async function sendAnnouncement(title, content, uzivatel) {
  const channelId = process.env.CHANNEL_OZNAMENI;
  if (!channelId) return;
  const FRAZE_OZNAMENI = [
    'ráda bych předala následující oznámení organizaci.',
    'na žádost vedení zveřejňuji toto sdělení.',
    'níže naleznete aktuální oznámení pro všechny členy.',
  ];
  await sendEmbed(channelId, {
    title: `📢 ${title}`,
    description: `*${nahodna(FRAZE_OZNAMENI)}*\n\n${content}`,
    color: 0xC9A84C,
    author: EVELYN_AUTHOR,
    footer: { text: `Zveřejnil: ${uzivatel}` },
    timestamp: new Date().toISOString()
  });
}

// Nová registrace člena — krátký zápis do interního kanálu, ať vedení vidí
// přírůstky bez nutnosti procházet Discord OAuth log.
async function notifyRegistrace(icName, discordUsername, discordId) {
  const channelId = process.env.CHANNEL_REGISTRACE || process.env.CHANNEL_AUDIT;
  if (!channelId) return;
  await sendEmbed(channelId, {
    title: '📝 NOVÁ REGISTRACE',
    color: 0x6FA8C9,
    author: EVELYN_AUTHOR,
    description: `${pozdrav()}, do rejstříku organizace jsem právě zapsala nového člena.`,
    fields: [
      { name: '👤 IC jméno', value: icName || '—', inline: true },
      { name: '🔗 Discord', value: discordUsername ? `@${discordUsername}` : '—', inline: true },
      { name: '🆔 Discord ID', value: discordId || '—', inline: true },
    ],
    timestamp: new Date().toISOString(),
  });
}

// Automatický týdenní souhrn Blackbooku — pravidelný přehled financí a
// aktivity organizace, ať to vedení nemusí samo chodit dohledávat na web.
async function notifyTydenniSouhrn({ income, expense, net, ops, inactiveCount, totalMembers }) {
  const channelId = process.env.CHANNEL_BLACKBOOK || process.env.CHANNEL_AUDIT;
  if (!channelId) return;
  await sendEmbed(channelId, {
    title: '📊 TÝDENNÍ SOUHRN BLACKBOOKU',
    color: net >= 0 ? 0x57F287 : 0xED4245,
    author: EVELYN_AUTHOR,
    description: `${pozdrav()}, připravila jsem pro vedení pravidelný týdenní přehled organizace.`,
    fields: [
      { name: '💚 Příjem (7 dní)', value: `$${Math.round(income).toLocaleString('cs-CZ')}`, inline: true },
      { name: '🔴 Výdaj (7 dní)', value: `$${Math.round(expense).toLocaleString('cs-CZ')}`, inline: true },
      { name: net >= 0 ? '📈 Čistý zisk' : '📉 Čistá ztráta', value: `$${Math.round(Math.abs(net)).toLocaleString('cs-CZ')}`, inline: true },
      { name: '⚙ Operací', value: `${ops}`, inline: true },
      { name: '👥 Neaktivní 7+ dní', value: `${inactiveCount} / ${totalMembers}`, inline: true },
    ],
    timestamp: new Date().toISOString(),
  });
}

// ── RESERVE FUND — týdenní povinný odvod (splatnost neděle) ────────────────
// Po víkendu (kontrola v pondělí, viz server.js) se ověří, kdo za uplynulý
// týden nezaplatil a nepodepsal Reserve Fund — jejich jména jdou sem.
async function notifyReserveFundDluznici(weekKey, jmena) {
  const channelId = process.env.CHANNEL_UCETNICTVI || process.env.CHANNEL_AUDIT;
  if (!channelId || !jmena || !jmena.length) return;
  await sendEmbed(channelId, {
    title: '⚠️ RESERVE FUND — NEZAPLACENO',
    color: 0xE8A33D,
    author: EVELYN_AUTHOR,
    description: `${pozdrav()}, po víkendu jsem zkontrolovala Reserve Fund za týden do ${weekKey} a níže uvedení členové jej dosud nezaplatili ani nepodepsali.`,
    fields: [
      { name: '👤 Dlužníci', value: jmena.join('\n').slice(0, 1000) || '—' },
      { name: '💰 Povinná částka', value: '$5 000 / osoba', inline: true },
    ],
    timestamp: new Date().toISOString(),
  });
}

// Potvrzení, že člen Reserve Fund za daný týden zaplatil a podepsal —
// jde do stejného kanálu jako běžné příjmy, ale s vlastním razítkem.
async function notifyReserveFundZaplaceno(weekKey, uzivatel, discordUsername) {
  const channelId = process.env.CHANNEL_UCETNICTVI;
  if (!channelId) return;
  await sendEmbed(channelId, {
    title: '🔏 RESERVE FUND PODEPSÁN',
    color: 0x57F287,
    author: EVELYN_AUTHOR,
    description: `${pozdrav()}, ${uzivatel} právě uhradil/a a podepsal/a Reserve Fund za týden do ${weekKey}.`,
    fields: [
      { name: '👤 Člen', value: discordUsername ? `${uzivatel} (@${discordUsername})` : uzivatel, inline: true },
      { name: '💰 Částka', value: '$5 000', inline: true },
    ],
    timestamp: new Date().toISOString(),
  });
}

async function getAnnouncementMessages(limit = 20) {
  const channelId = process.env.CHANNEL_OZNAMENI;
  if (!channelId || !BOT_TOKEN()) return [];
  try {
    const res = await axios.get(
      `https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`,
      { headers: { Authorization: `Bot ${BOT_TOKEN()}` } }
    );
    return res.data || [];
  } catch (err) {
    console.error('[DISCORD] Chyba načtení zpráv:', err.response?.data || err.message);
    return [];
  }
}

// ── GALERIE ORGANIZACE — každá nahraná fotka jde i do kanálu #fotoalbum ────
async function notifyGalerie(imageUrl, caption, uzivatel) {
  const channelId = process.env.CHANNEL_FOTOALBUM || '1521532400113553488';
  if (!channelId) return;
  const embed = {
    title: '📸 NOVÁ FOTOGRAFIE V GALERII',
    color: 0xC9A84C,
    author: EVELYN_AUTHOR,
    description: `${pozdrav()}, do galerie organizace přibyla nová fotografie.`,
    fields: [
      { name: '👤 Přidal', value: uzivatel || '—', inline: true },
    ],
    timestamp: new Date().toISOString(),
  };
  if (caption) embed.fields.push({ name: '📝 Popisek', value: caption, inline: false });
  if (imageUrl) embed.image = { url: imageUrl };
  await sendEmbed(channelId, embed);
}

// ══════════════════════════════════════════════════════════════════════
// BAZAR — vnitřní tržiště organizace, viditelné pro každou hodnost.
// Nová nabídka i uzavřený obchod se posílají do kanálu #bazar.
// ══════════════════════════════════════════════════════════════════════
async function notifyBazarNove(item, imageUrl) {
  const channelId = process.env.CHANNEL_BAZAR || '1524010210853916787';
  if (!channelId) return;
  const embed = {
    title: '🛍️ NOVÁ NABÍDKA V BAZARU',
    color: 0xC9A84C,
    author: EVELYN_AUTHOR,
    description: `${pozdrav()}, do bazaru organizace přibyla nová položka k prodeji.`,
    fields: [
      { name: 'Položka', value: item.nazev || '—', inline: true },
      { name: 'Cena', value: item.cena != null ? `$${Number(item.cena).toLocaleString('cs-CZ')}` : '—', inline: true },
      { name: 'Nabízí', value: item.prodavajici || '—', inline: true },
    ],
    timestamp: new Date().toISOString(),
  };
  if (item.popis) embed.fields.push({ name: 'Popis', value: item.popis, inline: false });
  if (imageUrl) embed.image = { url: imageUrl };
  await sendEmbed(channelId, embed);
}

async function notifyBazarProdano(item, kupec) {
  const channelId = process.env.CHANNEL_BAZAR || '1524010210853916787';
  if (!channelId) return;
  await sendEmbed(channelId, {
    title: '✅ PRODÁNO — bazar',
    color: 0x57F287,
    author: EVELYN_AUTHOR,
    description: `${pozdrav()}, obchod byl oboustranně potvrzen a je uzavřen.`,
    fields: [
      { name: 'Položka', value: item.nazev || '—', inline: true },
      { name: 'Cena', value: item.dohodnutaCena != null ? `$${Number(item.dohodnutaCena).toLocaleString('cs-CZ')}` : '—', inline: true },
      { name: 'Prodal', value: item.prodavajici || '—', inline: true },
      { name: 'Koupil', value: kupec || '—', inline: true },
    ],
    timestamp: new Date().toISOString(),
  });
}

async function isUserOnServer(discordId) {
  const guildId = process.env.GUILD_ID;
  try {
    await axios.get(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
      { headers: { Authorization: `Bot ${BOT_TOKEN()}` } }
    );
    return true;
  } catch {
    return false;
  }
}

// Vrátí pole role ID (string[]) daného člena na serveru, nebo null pokud není na serveru / nastala chyba.
// Používá se pro určení úrovně přístupu ve webu (viz roles.js).
async function getMemberRoles(discordId) {
  const guildId = process.env.GUILD_ID;
  try {
    const res = await axios.get(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
      { headers: { Authorization: `Bot ${BOT_TOKEN()}` } }
    );
    return res.data?.roles || [];
  } catch {
    return null;
  }
}

module.exports = { notifyZbrane, notifyWeed, notifyDrogy, notifyChemky, notifyGarage, notifyUcet, notifySmena, notifyBulkSklad, notifyPovyseni, notifyVyznamenani, notifyPersonalni, notifyRegistrace, notifyTydenniSouhrn, notifyAudit, checkNizkaZasoba, sendOnboardingDM, sendAnnouncement, getAnnouncementMessages, isUserOnServer, getMemberRoles, notifyGalerie, notifyBazarNove, notifyBazarProdano, notifyReserveFundDluznici, notifyReserveFundZaplaceno };
