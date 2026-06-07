# 🏰 ALBION WEB — v2.0
## Návod pro debily (krok za krokem)

---

## 📁 CO JE NOVÉHO v2.0

- 🌙 **Tmavý / Světlý režim** — tlačítko v pravém horním rohu nav baru
- 📢 **Nástěnka** — tahá zprávy z Discord kanálu `⚠️〉oznámení` + odesílá z webu na Discord
- 📋 **Kodex** — záložka s pravidly organizace
- 🔍 **Audit** — kompletní historie všech akcí, filtrovatelná podle sekce
- 📈 **Statistiky** — karta pro každého člena: kolik vložil/vybral drog/trávy/zbraní, kolik přidal/odebral peněz (USD i Pesos)
- 🔔 **Živé notifikace** — když někdo něco udělá nebo přijde oznámení, ostatní přihlášení hned uvidí toast notifikaci bez refreshe

---

## 🔧 NASTAVENÍ PŘED DEPLOYEM

### 1. Discord — přidej nový redirect URI

1. Jdi na https://discord.com/developers/applications
2. Klikni na svou aplikaci (ID: `1512372359368020028`)
3. **OAuth2** → **Redirects**
4. Přidej: `https://TVOJE-APP.up.railway.app/auth/callback`
   - (URL zjistíš až po deployi na Railway — viz níže)
5. Uložit

### 2. Kanál pro audit (volitelný)

Pokud chceš audit logy na Discordu:
1. Na svém serveru vytvoř nový kanál (např. `🔍〉audit`)
2. Pravý klik → **Kopírovat ID kanálu**
3. Vlož do `.env` jako `CHANNEL_AUDIT=ČÍSLO`

Kanál pro nástěnku (`⚠️〉oznámení`) už máš: `1510078482124636251` — ten je v `.env` jako `CHANNEL_OZNAMENI`.

---

## 🚂 DEPLOY NA RAILWAY (krok za krokem)

### Krok 1 — GitHub

1. Jdi na https://github.com a přihlas se
2. Klikni **New repository** (zelené tlačítko vpravo nahoře)
3. Název: `albion-web` → **Create repository**
4. Na počítači otevři složku s projektem v terminálu a spusť:

```bash
git init
git add .
git commit -m "Albion v2"
git branch -M main
git remote add origin https://github.com/TVOJEUZIVATELSKEJMENO/albion-web.git
git push -u origin main
```

> ⚠️ Nezapomeň přidat `.gitignore` aby ses nenakoupal — viz níže

### Krok 2 — .gitignore

Vytvoř soubor `.gitignore` v kořeni projektu s tímto obsahem:
```
node_modules/
.env
google-credentials.json
```

Pak znovu:
```bash
git add .gitignore
git commit -m "gitignore"
git push
```

### Krok 3 — Railway

1. Jdi na https://railway.app a přihlas se přes GitHub
2. Klikni **New Project** → **Deploy from GitHub repo**
3. Vyber `albion-web`
4. Railway sám detekuje Node.js a spustí `npm start`

### Krok 4 — Proměnné prostředí (Environment Variables)

1. V Railway klikni na svůj projekt → **Variables**
2. Klikni **Raw Editor** a vlož celý obsah souboru `.env`
3. **ZMĚŇ** tyto hodnoty:
   - `DISCORD_REDIRECT_URI` → zatím nevíš URL, pokračuj dál
   - `CHANNEL_AUDIT` → ID tvého audit kanálu (nebo smaž řádek)
   - `SESSION_SECRET` → změň na jakýkoliv náhodný řetězec

4. Pro `google-credentials.json` — místo souboru použij env proměnnou:
   - Přidej proměnnou: `GOOGLE_CREDENTIALS`
   - Hodnota: celý obsah souboru `google-credentials.json` jako jeden řádek JSON

   Pro konverzi na jeden řádek použij: https://www.freeformatter.com/json-formatter.html → Minify

### Krok 5 — Zjisti URL

1. V Railway klikni na projekt → **Settings** → **Domains**
2. Klikni **Generate Domain** → dostaneš URL jako `albion-web-xxxx.up.railway.app`
3. Tuto URL zkopíruj

### Krok 6 — Aktualizuj Discord redirect

1. Jdi zpět na https://discord.com/developers/applications
2. OAuth2 → Redirects → přidej: `https://albion-web-xxxx.up.railway.app/auth/callback`
3. V Railway → Variables → `DISCORD_REDIRECT_URI` → nastav na tuto URL
4. Redeploy (klikni **Redeploy** nebo prostě pušni cokoliv na GitHub)

### Krok 7 — Hotovo! 🎉

Web je dostupný na `https://albion-web-xxxx.up.railway.app`

---

## 🗂️ STRUKTURA PROJEKTU

```
albion-web/
├── server.js          ← hlavní soubor (celý backend + frontend v jednom)
├── db.js              ← JSON databáze uživatelů
├── discord.js         ← Discord notifikace + čtení kanálů
├── sheets.js          ← Google Sheets operace
├── middleware/
│   └── auth.js        ← kontrola přihlášení
├── users.json         ← databáze uživatelů (generuje se automaticky)
├── package.json
├── .env               ← NIKDY nepushovat na GitHub!
└── google-credentials.json  ← NIKDY nepushovat!
```

---

## ❓ ČASTÉ PROBLÉMY

**"not_on_server" při přihlášení**
→ Bot nemá práva číst členy serveru. Jdi do Discord Developer Portal → Bot → zaškrtni `SERVER MEMBERS INTENT`

**Nástěnka nefunguje / prázdná**
→ Zkontroluj `CHANNEL_OZNAMENI` v Railway Variables — musí být `1510078482124636251`
→ Bot musí mít právo číst zprávy v tom kanálu

**Statistiky jsou prázdné**
→ Google Sheets musí mít listy pojmenované přesně: `Zbraně`, `Weed`, `Drogy`, `Účetnictví`

**Audit kanál neexistuje**
→ Buď smaž `CHANNEL_AUDIT` z Variables, nebo vytvoř kanál a dej správné ID
