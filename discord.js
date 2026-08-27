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

// ── PŘÍMÁ SOUKROMÁ ZPRÁVA (DM) ──────────────────────────────────────────────
// Obecný pomocník pro odeslání DM konkrétnímu Discord uživateli — používá se
// pro reset hesla i pro upozornění prodávajícího v Bazaru na nového zájemce.
async function dmUser(discordId, content) {
  if (!discordId || !BOT_TOKEN()) return false;
  try {
    const dmChannel = await axios.post(
      'https://discord.com/api/v10/users/@me/channels',
      { recipient_id: discordId },
      { headers: { Authorization: `Bot ${BOT_TOKEN()}`, 'Content-Type': 'application/json' } }
    );
    await axios.post(
      `https://discord.com/api/v10/channels/${dmChannel.data.id}/messages`,
      { content },
      { headers: { Authorization: `Bot ${BOT_TOKEN()}`, 'Content-Type': 'application/json' } }
    );
    return true;
  } catch (err) {
    console.error('[DISCORD] DM se nepodařilo odeslat (uživatel může mít vypnuté DM):', err.response?.data || err.message);
    return false;
  }
}

// Odešle nově vygenerované (dočasné) heslo přes DM — používá se jak pro
// "Zapomenuté heslo" (server.js /auth/callback, action=forgot), tak pro
// admin reset hesla jinému členovi.
async function sendPasswordResetDM(discordId, icName, tempPassword) {
  const jmeno = icName ? `${icName}, v` : 'V';
  const content = `${jmeno}yžádal/a jsi si (nebo ti bylo vedením vystaveno) nové heslo do rejstříku Caledonie.\n\n` +
    `Tvé nové dočasné heslo je: **${tempPassword}**\n\n` +
    `Přihlas se jím a co nejdřív si ho v sekci **Profil → Změna hesla** změň za vlastní.`;
  return dmUser(discordId, content);
}

// ══════════════════════════════════════════════════════════════════════
// OSOBNOST EVELYN ASHCROFT — sdílená filozofie s Discord botem
// ══════════════════════════════════════════════════════════════════════

const EVELYN_AUTHOR = { name: '✦  Evelyn Ashcroft  ·  Sekretariát Caledonie' };

const ALBION_SEAL_URL = process.env.ALBION_SEAL_URL || null;

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
  undo: [
    'na vaši žádost jsem poslední zápis vzala zpět a smazala z knihy.',
    'poslední zápis byl na vaše přání zrušen a odstraněn z registru.',
  ],
  vyroba: [
    'zaznamenávám dokončenou várku ve výrobě a odečet surovin ze skladu.',
    'výroba proběhla — suroviny jsem odečetla a hotový produkt zapsala do skladu.',
  ],
};

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

function uvod(uzivatel, klic, accessLevel) {
  const jmeno = uzivatel ? `, **${uzivatel}**` : '';

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

const PRAH_NIZKE_ZASOBY = {
  zbrane: 5,
  weed:   20,
  drogy:  10,
  chemky: 10,
};

const KANAL_PODLE_SEKCE = {
  zbrane: () => process.env.CHANNEL_ZBRANE,
  weed:   () => process.env.CHANNEL_WEED,
  drogy:  () => process.env.CHANNEL_DROGY,
  chemky: () => process.env.CHANNEL_CHEMKY,
};

const POSLEDNI_UPOZORNENI = new Map();
const COOLDOWN_MS = 30 * 60 * 1000;

const HISTORIE_ZASOB = new Map();
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
  if (dnyUplynulo < 0.5) return null;

  const pokles = nejstarsi.v - aktualniStav;
  if (pokles <= 0) return null;

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

  const FRAZE_NIZKE_ZASOBY = [
    'ráda bych upozornila, že zásoby klesly pod bezpečnou hranici.',
    's jistými obavami hlásím pokles zásob pod doporučenou úroveň.',
    'dovoluji si upozornit na klesající stav zásob u této položky.',
    'prosím o pozornost — tahle položka se blíží vyprodání.',
  ];

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

  const detailUpper = (detail || '').toUpperCase();
  const isVklad = detailUpper.startsWith('VKLAD') || detailUpper.startsWith('PŘÍJEM');
  const isVyber = detailUpper.startsWith('VÝBĚR') || detailUpper.startsWith('VÝDAJ');
  const isZruseno = detailUpper.startsWith('ZRUŠENO');
  const color = isZruseno ? 0x99AAB5 : isVklad ? 0x57F287 : isVyber ? 0xED4245 : 0x5865F2;

  // Reserve Fond (samostatný účet, viz sheets.getAccountingSummary('Reserve Fond'))
  // má vlastní ikonu, ať je v Auditu na první pohled jasně odlišený od hlavního
  // účtu 'Účetnictví' a nepůsobí to jako duplicitní/pomíchaný záznam.
  const ikonySekcí = { 'Zbraně': '🔫', 'Weed': '🌿', 'Drogy': '💊', 'Chemky': '⚗️', 'Účetnictví': '💰', 'Reserve Fond': '🏦' };
  const ikona = ikonySekcí[akce] || '📋';

  const now = new Date();
  const casText = now.toLocaleString('cs-CZ', { timeZone: 'Europe/Prague', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const [typAkce, ...zbytek] = (detail || '').split(' — ');
  const zbytekText = zbytek.join(' — ');

  const fields = [
    { name: '📁 Sekce', value: `${ikona} ${akce}`, inline: true },
    { name: '⚡ Akce', value: typAkce || detail, inline: true },
    { name: '🕐 Čas', value: casText, inline: true },
  ];
  if (zbytekText) fields.push({ name: '📝 Detail', value: zbytekText, inline: false });
  fields.push({ name: '👤 Provedl', value: discordUsername ? `${uzivatel}\n(@${discordUsername})` : uzivatel, inline: true });

  try {
    await sendEmbed(channelId, {
      title: isZruseno ? '↩️ VRÁCENO ZPĚT' : isVklad ? `✅ VKLAD / PŘÍJEM` : isVyber ? `❌ VÝBĚR / VÝDAJ` : `📋 ZÁZNAM`,
      color,
      fields,
      timestamp: new Date().toISOString(),
    });
    console.log(`[DISCORD] Audit odeslan: ${akce} — ${uzivatel}`);
  } catch (err) {
    console.error('[DISCORD] notifyAudit selhal:', err.message);
  }
}

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

// Dokončená výrobní várka (odečet surovin + zápis hotového produktu) — jeden
// souhrnný embed do kanálu chemikálií, ať to nezaplaví kanál desítkami zápisů.
async function notifyVyroba(batches, spotrebovano, outputItem, vyrobenoQty, uzivatel, accessLevel) {
  const channelId = process.env.CHANNEL_CHEMKY;
  const seznam = Object.entries(spotrebovano).map(([item, qty]) => `• ${item} — ${qty} ks`).join('\n');
  await sendEmbed(channelId, {
    title: `⚗️ VÝROBA DOKONČENA (web) — ${batches}× várka`,
    color: 0xC9A84C,
    fields: [
      { name: 'Vyrobil', value: uzivatel, inline: true },
      { name: 'Výstup', value: `${outputItem} — ${vyrobenoQty} ks`, inline: true },
      { name: 'Spotřebované suroviny', value: seznam || '—', inline: false },
    ],
    timestamp: new Date().toISOString(),
    author: EVELYN_AUTHOR,
    description: uvod(uzivatel, 'vyroba', accessLevel),
  });
}

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

// Ruční udělení vyznamenání Founder/Council přes web (/vyznamenani → "Udělit
// vyznamenání"). Dřív se na tuhle funkci odkazoval achievements.js, ale
// vůbec neexistovala — volání spadlo na TypeError ještě před odpovědí
// klientovi, takže odznak se sice v DB tiše uložil, ale web nikdy nedostal
// potvrzení a sem do Discordu se nic neposlalo. Vizuálně odlišeno od
// automatického udělení (jiný nadpis/barva + pole "Udělil"), ať je na první
// pohled poznat, že šlo o vědomé rozhodnutí vedení, ne o systémový zápis.
async function notifyVyznamenaniRucne(nazevOdznaku, popis, uzivatel, discordUsername, udelil) {
  const channelId = process.env.CHANNEL_VYZNAMENANI;
  if (!channelId) {
    console.error('[DISCORD] CHANNEL_VYZNAMENANI není nastaven v .env, ruční odznak se nezapsal do Discordu.');
    return;
  }
  const fields = [
    { name: '👤 Jméno', value: uzivatel || '—', inline: true },
    { name: '🏅 Odznak', value: nazevOdznaku, inline: true },
    { name: '✋ Udělil', value: udelil || '—', inline: true },
  ];
  if (discordUsername) fields.push({ name: '🔗 Discord', value: `@${discordUsername}`, inline: true });
  if (popis) fields.push({ name: '📝 Popis', value: popis, inline: false });

  await sendEmbed(channelId, {
    title: '🏅 RUČNÍ UDĚLENÍ VYZNAMENÁNÍ (vedení)',
    color: 0xB3172F,
    fields,
    timestamp: new Date().toISOString(),
    author: EVELYN_AUTHOR,
    description: `${pozdrav()}. Vedení organizace se rozhodlo vědomě udělit toto vyznamenání — nejde o automatický zápis.`,
  });
}

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
      `Pár tipů na začátek: aktuální ceník najdete v sekci **Ceník** na aplikaci. Zápisy do skladu (zbraně, weed, drogy, chemikálie) se dělají výhradně přes interní aplikaci Caledonie — tento kanál slouží jako živá kronika toho, co se v organizaci děje.`,
      `Pokud si nebudete s něčím jistí, obraťte se na Senior Membera nebo výše — a přeji vám v organizaci mnoho úspěchů.`,
    ];

    for (const text of zpravy) {
      await axios.post(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        { content: text },
        { headers: { Authorization: `Bot ${BOT_TOKEN()}`, 'Content-Type': 'application/json' } }
      );
      await new Promise(r => setTimeout(r, 1200));
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

// Obecný pomocník pro načtení posledních zpráv z libovolného kanálu — sdílí
// ho Nástěnka (getAnnouncementMessages), Darkchat i Vysílačka, ať se stejná
// REST logika nepíše na třech místech zvlášť.
async function getChannelMessages(channelId, limit = 20) {
  if (!channelId || !BOT_TOKEN()) return [];
  try {
    const res = await axios.get(
      `https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`,
      { headers: { Authorization: `Bot ${BOT_TOKEN()}` } }
    );
    return res.data || [];
  } catch (err) {
    console.error('[DISCORD] Chyba načtení zpráv kanálu:', err.response?.data || err.message);
    return [];
  }
}

async function getAnnouncementMessages(limit = 20) {
  return getChannelMessages(process.env.CHANNEL_OZNAMENI, limit);
}

// ══════════════════════════════════════════════════════════════════════
// DARKCHAT — živý obousměrný chat web ↔ Discord
// ══════════════════════════════════════════════════════════════════════
// Zbytek souboru je čistě REST (axios) — pro ODESÍLÁNÍ zpráv to stačí, ale
// pro PŘÍJEM zpráv v reálném čase (bez toho, aby web musel Discord pořád
// dokola dotazovat) je potřeba trvalé Gateway (WebSocket) spojení, což REST
// neumí. Proto se tu navíc zapojuje oficiální balíček "discord.js" (NPM
// knihovna — jmenovcem tohoto souboru, ale je to jiná věc; tenhle soubor
// zůstává pod svým názvem beze změny). Vyžaduje:
//   1) `npm install discord.js` (přidá se do package.json)
//   2) V Discord Developer Portal → aplikace bota → Bot → zapnout
//      "MESSAGE CONTENT INTENT" (bez toho bot dostane zprávu, ale s prázdným
//      obsahem — nejde přečíst, co bylo napsáno).
// Pokud balíček není nainstalovaný, server kvůli tomu nespadne — jen se
// nerozjede živé naslouchání a v logu se ukáže jasná hláška; REST notifikace
// (embed zprávy, DM, Nástěnka…) v celém zbytku souboru fungují beze změny.
let GatewaySDK = null;
try {
  GatewaySDK = require('discord.js');
} catch (e) {
  console.error('[DISCORD GATEWAY] Balíček "discord.js" není nainstalovaný (npm install discord.js) — Darkchat naslouchání poběží jen v REST režimu (bez okamžitého doručení zpráv z Discordu na web).');
}

const DARKCHAT_LISTENERS = [];
// server.js si sem zaregistruje callback, který novou zprávu z Discordu
// pošle přes SSE na web (broadcastSSE('darkchatMessage', ...)). Řešeno přes
// registraci callbacku (ne přímým require('./server')), ať nevznikne
// kruhová závislost mezi server.js a discord.js.
function onDarkchatMessage(fn) { if (typeof fn === 'function') DARKCHAT_LISTENERS.push(fn); }

let gatewayClient = null;
function startDarkchatGateway() {
  if (!GatewaySDK || !BOT_TOKEN()) return;
  if (gatewayClient) return; // už běží, nezakládat druhé spojení
  const channelId = process.env.CHANNEL_DARKCHAT;
  if (!channelId) {
    console.error('[DISCORD GATEWAY] CHANNEL_DARKCHAT není nastaven v .env — Darkchat naslouchání se nespouští.');
    return;
  }
  try {
    const { Client, GatewayIntentBits, Partials } = GatewaySDK;
    gatewayClient = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
      partials: [Partials.Channel],
    });
    gatewayClient.once('ready', () => {
      console.log(`[DISCORD GATEWAY] Přihlášen jako ${gatewayClient.user.tag} — Darkchat naslouchá živě.`);
    });
    gatewayClient.on('messageCreate', (message) => {
      try {
        if (message.channelId !== channelId) return;
        if (message.author?.bot) return; // ignoruj zprávy od bota (i vlastní echo z webu)
        const payload = {
          id: message.id,
          author: message.member?.displayName || message.author?.username || 'Discord',
          discordId: message.author?.id || null,
          content: message.content || '',
          timestamp: message.createdAt ? message.createdAt.toISOString() : new Date().toISOString(),
        };
        DARKCHAT_LISTENERS.forEach(fn => { try { fn(payload); } catch (e) { console.error('[DARKCHAT LISTENER]', e.message); } });
      } catch (e) {
        console.error('[DISCORD GATEWAY] Chyba zpracování příchozí zprávy:', e.message);
      }
    });
    gatewayClient.on('error', (e) => console.error('[DISCORD GATEWAY] Chyba spojení:', e.message));
    gatewayClient.login(BOT_TOKEN()).catch(e => console.error('[DISCORD GATEWAY] Přihlášení selhalo:', e.message));
  } catch (e) {
    console.error('[DISCORD GATEWAY] Inicializace selhala:', e.message);
  }
}

// Odeslání zprávy z webu do Discord Darkchatu. Posílá se jako obyčejná
// zpráva bota s jménem odesílatele na začátku (ne přes webhook — to by
// vyžadovalo zvlášť založit a uložit webhook URL pro tenhle kanál, což teď
// není k dispozici). Vlastní odeslaná zpráva se na web přidá OKAMŽITĚ přímo
// v server.js (broadcastSSE hned po úspěšném POSTu) — gateway listener výše
// ji stejně ignoruje, protože jde o zprávu od bota.
async function sendDarkchatMessage(content, uzivatel) {
  const channelId = process.env.CHANNEL_DARKCHAT;
  if (!channelId || !BOT_TOKEN()) return false;
  try {
    await axios.post(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      { content: `**${uzivatel || 'Web'}** (web): ${content}` },
      { headers: { Authorization: `Bot ${BOT_TOKEN()}`, 'Content-Type': 'application/json' } }
    );
    return true;
  } catch (err) {
    console.error('[DISCORD] Odeslání do Darkchatu selhalo:', err.response?.data || err.message);
    return false;
  }
}

async function getDarkchatMessages(limit = 40) {
  return getChannelMessages(process.env.CHANNEL_DARKCHAT, limit);
}

// ══════════════════════════════════════════════════════════════════════
// VYSÍLAČKA — jen čtení existujícího kanálu, který si bot sám generuje
// ══════════════════════════════════════════════════════════════════════
async function getVysilackaMessages(limit = 10) {
  return getChannelMessages(process.env.CHANNEL_VYSILACKA, limit);
}

// Spustí se hned při načtení modulu (stejný vzor jako sheets.js#startPrewarm) —
// pokud balíček/token/kanál chybí, funkce se tiše (s logem) nespustí a zbytek
// appky běží dál beze změny.
startDarkchatGateway();

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

async function notifyBazarZajem(item, zajemce, nabidka, sellerDiscordId) {
  if (!sellerDiscordId) return false;
  const castka = nabidka != null ? `$${Number(nabidka).toLocaleString('cs-CZ')}` : '—';
  return dmUser(
    sellerDiscordId,
    `📬 O tvoji bazarovou nabídku **${item.nazev}** projevil/a zájem **${zajemce}** s nabídkou ${castka}. Podívej se do Bazaru na webu a vyber, komu prodáš.`
  );
}

// ── RESERVE FUND — týdenní povinný odvod (splatnost neděle) ────────────────
// Peníze z Reserve Fondu se od teď zapisují do SAMOSTATNÉHO účetního listu
// 'Reserve Fond' (viz server.js), takže tahle notifikace je čistě informační
// oznámení do Discordu — nezakládá se na tom výpočet hlavní pokladny.
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
      { name: '💰 Povinná částka', value: 'dle aktuálního nastavení organizace', inline: true },
    ],
    timestamp: new Date().toISOString(),
  });
}

async function notifyReserveFundZaplaceno(weekKey, uzivatel, discordUsername) {
  const channelId = process.env.CHANNEL_UCETNICTVI;
  if (!channelId) return;
  await sendEmbed(channelId, {
    title: '🔏 RESERVE FUND PODEPSÁN',
    color: 0x57F287,
    author: EVELYN_AUTHOR,
    description: `${pozdrav()}, ${uzivatel} právě uhradil/a a podepsal/a Reserve Fund za týden do ${weekKey}. Částka byla připsána na samostatný účet Reserve Fondu.`,
    fields: [
      { name: '👤 Člen', value: discordUsername ? `${uzivatel} (@${discordUsername})` : uzivatel, inline: true },
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

module.exports = {
  notifyZbrane, notifyWeed, notifyDrogy, notifyChemky, notifyGarage, notifyUcet, notifySmena,
  notifyBulkSklad, notifyVyroba, notifyPovyseni, notifyVyznamenani, notifyVyznamenaniRucne, notifyPersonalni, notifyRegistrace,
  notifyTydenniSouhrn, notifyAudit, checkNizkaZasoba, sendOnboardingDM, sendAnnouncement,
  getAnnouncementMessages, isUserOnServer, getMemberRoles, notifyGalerie, notifyBazarNove,
  notifyBazarProdano, notifyBazarZajem, dmUser, sendPasswordResetDM,
  notifyReserveFundDluznici, notifyReserveFundZaplaceno,
  onDarkchatMessage, sendDarkchatMessage, getDarkchatMessages, getVysilackaMessages,
};
