// watermark.js — přidá logo Albionu jako watermark na nahrané obrázky
const sharp = require('sharp');
const path = require('path');

async function addWatermark(buffer) {
  try {
    const logoPath = path.join(__dirname, 'public', 'logo.png');
    const meta = await sharp(buffer).metadata();
    const wmWidth = Math.round((meta.width || 800) * 0.12);
    const logoBuf = await sharp(logoPath).resize(wmWidth).png().toBuffer();
    return await sharp(buffer)
      .composite([{ input: logoBuf, gravity: 'southeast', blend: 'over' }])
      .toBuffer();
  } catch (e) {
    console.error('[WATERMARK]', e.message);
    return buffer; // fail-open — radši bez watermarku než rozbitý upload
  }
}

module.exports = { addWatermark };
