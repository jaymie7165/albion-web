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

module.exports = { notifyZbrane, notifyWeed, notifyDrogy, notifyUcet, notifyAudit, sendAnnouncement, getAnnouncementMessages, isUserOnServer };
