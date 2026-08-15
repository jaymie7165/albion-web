# CALEDONIA — Redesign v6 · Integrační průvodce

## 1) Soubory k PŘÍMÉMU nahrazení (kompletní nové verze)

Nahraď v projektu 1:1 tyto soubory obsahem z tohoto balíčku:

- `styles.js` — nová paleta (dark + tichý light), kompatibilní vrstva pro
  Galerii/Trading kartu/Blackbook/Evelyn widget/Dashboard
- `nav.js` — sidebar vlevo, grouped pro staff / flat pro Member-Associate
- `achievements.js` — rozšířený katalog, opravený bug "First Month",
  podpora ručního udílení
- `views/home.js` — nový Dashboard (Caledonia Index, Live Pulse, Daily
  Briefing, quiet timeline — staff i member varianta)
- `views/hierarchy.js` — editovatelná (Founder/Council), napojená na
  content-store
- `views/lore.js` — editovatelná (Founder/Council), napojená na
  content-store
- `views/nastenska.js` — kategorie oznámení s barevnými pily
- `views/auth.js` — zjednodušené přihlášení/registrace ve stejné paletě

## 2) Zcela NOVÉ soubory (nové routy, nic nenahrazují)

- `views/prehled.js` — Rozcestník (`GET /prehled`)
- `views/vyznamenani.js` — katalog + vitrína + ruční udílení (`GET /vyznamenani`)
- `views/audit-me.js` — History pro Member/Associate (`GET /audit-me`)

## 3) Soubory, které NIC NEPOTŘEBUJÍ měnit (drop-in kompatibilní)

Díky tomu, že mají vlastní `<style>` blok postavený na sdílených CSS
proměnných (`var(--panel2)`, `var(--brass)`, `var(--oxblood-bright)`…),
zdědí novou paletu automaticky jen tím, že nahradíš `styles.js` a `nav.js`:

`garaz.js`, `bazar.js`, `mentoring.js`, `spis.js`, `weed-sazeni.js`,
`blackbook.js`, `profit-centrum.js`, `audit.js`, `statistiky.js`,
`gallery.js`, `card.js`, `nemovitosti.js`, `albion.js`

(`card.js` a `nemovitosti.js` mají navíc canvas export s natvrdo zapsanými
barvami — ten záměrně NENÍ přebarvený, dle tvého zadání.)

## 4) Patche — přidej ručně do existujících souborů (nic neodstraňují)

Postupuj v tomto pořadí:

1. **`PATCH-discord.txt`** → `discord.js`
   - `notifyVyznamenaniRucne()` (ruční udělení, jasně "od vedení")
   - `sendAnnouncement()` s kategoriemi (barevný pruh embedu)

2. **`PATCH-server.txt`** → `server.js`
   - `/prehled`, `/vyznamenani`, `/audit-me` routy
   - Reserve Fund vklad/výběr (`/api/reserve-fund/deposit`, `/withdraw`)
   - Ruční vyznamenání (`/api/admin/achievements/grant` + katalog endpointy)
   - Oprava bugu "First Month" (throttle na 1×/den) + `db.setAchievementsCheckedAt`
   - Caledonia Index vzorec + 24h historie (`/api/caledonia-index`)
   - Kategorie v `/api/nastenska`

3. **`PATCH-sklad-simplify.txt`** → `views/sklad.js`
   - Nahrazuje dvouúrovňový sidebar jedním klidným tab-řádkem
   - JS logika (zápisy, katalog, výroba, bulk, undo…) beze změny

4. **`PATCH-sklad-reservefund.txt`** → `views/sklad.js` (panel Účetnictví)
   - UI pro dobrovolný vklad + výběr z Reserve Fondu

## 5) Co zůstává úplně beze změny

Veškerá backendová logika mimo výše uvedené patche — `db.js` (kromě jednoho
nového setteru), `sheets.js`, `roles.js`, `constants.js`, `content-store.js`,
`middleware/auth.js`, Discord OAuth flow, session handling, watermark.js.
Žádná routa, žádné API tělo požadavku/odpovědi se neláme — jen se přidává.

## 6) Doporučené pořadí nasazení

1. `styles.js` + `nav.js` (vizuál se změní okamžitě všude)
2. `views/home.js`, `views/auth.js` (nejviditelnější stránky)
3. `PATCH-discord.txt` a `PATCH-server.txt`
4. `views/nastenska.js`, `views/hierarchy.js`, `views/lore.js`
5. `views/prehled.js`, `views/vyznamenani.js`, `views/audit-me.js`
6. `PATCH-sklad-simplify.txt` + `PATCH-sklad-reservefund.txt`
7. `achievements.js` (rozšířený katalog)

Po každém kroku doporučuju restart appky a rychlou vizuální kontrolu —
zvlášť po kroku 1, kdy se změní paleta úplně všude najednou.
