// discord.js — posílá zprávy do Discord kanálů při akcích z webu
const axios = require('axios');

const BOT_TOKEN = () => process.env.DISCORD_TOKEN;

async function sendEmbed(channelId, embed) {
  if (!channelId || !BOT_TOKEN()) return;
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

async function notifyZbrane(typ, polozka, mnozstvi, kategorie, uzivatel, ucel) {
  const channelId = process.env.CHANNEL_ZBRANE;
  const color = typ === 'VKLAD' ? 0x00FF88 : 0xFF4444;
  const fields = [
    { name: 'Položka', value: polozka, inline: true },
    { name: 'Množství', value: `${mnozstvi} ks`, inline: true },
    { name: 'Kategorie', value: kategorie, inline: true },
    { name: typ === 'VKLAD' ? 'Vložil' : 'Vzal', value: uzivatel, inline: true },
  ];
  if (typ === 'VÝBĚR' && ucel) fields.push({ name: 'Účel', value: ucel, inline: true });
  await sendEmbed(channelId, { title: typ === 'VKLAD' ? '➕ VLOŽENO DO SKLADU (web)' : '➖ VYBRÁNO ZE SKLADU (web)', color, fields, timestamp: new Date().toISOString() });
}

async function notifyWeed(typ, odruda, mnozstvi, vyroba, prodej, uzivatel) {
  const channelId = process.env.CHANNEL_WEED;
  const color = typ === 'VKLAD' ? 0x00FF88 : 0xFF4444;
  const fields = [
    { name: 'Odrůda', value: odruda, inline: true },
    { name: 'Množství', value: `${mnozstvi} ks`, inline: true },
    { name: typ === 'VKLAD' ? 'Vložil' : 'Vzal', value: uzivatel, inline: true },
    { name: '💸 Výroba stála', value: `~$${vyroba * mnozstvi}`, inline: true },
    { name: '💰 Doporučená prodejní', value: `$${prodej * mnozstvi}`, inline: true },
  ];
  await sendEmbed(channelId, { title: typ === 'VKLAD' ? '🌿 VLOŽENO DO SKLADU (web)' : '🌿 VYBRÁNO ZE SKLADU (web)', color, fields, timestamp: new Date().toISOString() });
}

async function notifyDrogy(typ, droga, mnozstvi, vyroba, prodej, uzivatel) {
  const channelId = process.env.CHANNEL_DROGY;
  const color = typ === 'VKLAD' ? 0x00FF88 : 0xFF4444;
  const fields = [
    { name: 'Droga', value: droga, inline: true },
    { name: 'Množství', value: `${mnozstvi} ks`, inline: true },
    { name: typ === 'VKLAD' ? 'Vložil' : 'Vzal', value: uzivatel, inline: true },
    { name: '💸 Výroba', value: `~$${vyroba * mnozstvi}`, inline: true },
    { name: '💰 Prodej', value: `$${prodej * mnozstvi}`, inline: true },
  ];
  await sendEmbed(channelId, { title: typ === 'VKLAD' ? '💊 VLOŽENO DO SKLADU (web)' : '💊 VYBRÁNO ZE SKLADU (web)', color, fields, timestamp: new Date().toISOString() });
}

async function notifyChemky(typ, chemikalie, mnozstvi, uzivatel) {
  const channelId = process.env.CHANNEL_CHEMKY;
  const color = typ === 'VKLAD' ? 0x00FF88 : 0xFF4444;
  const fields = [
    { name: 'Chemikálie', value: chemikalie, inline: true },
    { name: 'Množství', value: `${mnozstvi} ks`, inline: true },
    { name: typ === 'VKLAD' ? 'Vložil' : 'Vzal', value: uzivatel, inline: true },
  ];
  await sendEmbed(channelId, { title: typ === 'VKLAD' ? '⚗️ VLOŽENO DO SKLADU (web)' : '⚗️ VYBRÁNO ZE SKLADU (web)', color, fields, timestamp: new Date().toISOString() });
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
  await sendEmbed(channelId, { title: typ === 'PŘÍJEM' ? `💚 PŘÍJEM — ${valuta} (web)` : `🔴 VÝDAJ — ${valuta} (web)`, color, fields, timestamp: new Date().toISOString() });
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
  await sendEmbed(channelId, { title: '💱 SMĚNA MĚN (web)', color: 0x6FA8C9, fields, timestamp: new Date().toISOString() });
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

async function sendAnnouncement(title, content, uzivatel) {
  const channelId = process.env.CHANNEL_OZNAMENI;
  if (!channelId) return;
  await sendEmbed(channelId, {
    title: `📢 ${title}`,
    description: content,
    color: 0xC9A84C,
    footer: { text: `Zveřejnil: ${uzivatel}` },
    timestamp: new Date().toISOString()
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

module.exports = { notifyZbrane, notifyWeed, notifyDrogy, notifyChemky, notifyGarage, notifyUcet, notifySmena, notifyAudit, sendAnnouncement, getAnnouncementMessages, isUserOnServer, getMemberRoles };
