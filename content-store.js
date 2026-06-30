// content-store.js — JSON úložiště pro editovatelný obsah (Kodex, Lore, Hierarchy)
// Founder/Council mohou měnit obsah bez zásahu do kódu.
const fs = require('fs');
const path = require('path');

function makeStore(dataDir, filename, defaults) {
  const FILE = path.join(dataDir, filename);

  function load() {
    try {
      if (!fs.existsSync(FILE)) { save(defaults); return defaults; }
      return JSON.parse(fs.readFileSync(FILE, 'utf8'));
    } catch { return defaults; }
  }
  function save(data) {
    try { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); } catch (e) { console.error('[CONTENT]', filename, e.message); }
  }
  return { load, save };
}

module.exports = { makeStore };
