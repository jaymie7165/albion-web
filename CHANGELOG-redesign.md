# Albion Web — changelog: "Crimson & Cream" redesign

Soubory nahraď 1:1 za stejnojmenné ve svém repu (zachovej strukturu — `views/`
soubory patří do `views/`, zbytek do kořene projektu).

**Kanonická verze:** vycházím z tvého posledního nahraného `server.js` a
`sheets.js` (s opravami self-healing listů a hlaviček) — ty jsou v balíčku
beze změny logiky, jen `server.js` má upravenou stránku `/profil` (viz níže).
Ostatní soubory (`styles.js`, `nav.js`, `views/home.js`, `views/sklad.js`,
`views/auth.js`, `views/card.js`, `views/nemovitosti.js`) jsou přepsané celé.

Prošly `node --check` (syntax), živé zprovoznění proti tvému Discordu/Sheets
jsem netestoval — vyzkoušej to nejdřív mimo produkci.

## 1) Paleta — "Crimson & Cream"
**styles.js** — přebarveno z heraldického zlato-bordó na skutečnou identitu
organizace: crimson `#DC143C` + krémová NavajoWhite `#FFDEAD` na tmavém
pozadí (`--noir #0B0607`). Světlý režim odpovídá stejné dvojici barev na
krémovém podkladu. Všechny CSS proměnné a třídy zůstaly 1:1 — žádný jiný view
soubor proto nepotřebuje úpravu kvůli paletě, zdědí ji automaticky.

Přidáno (nové, neruší nic starého):
- Jemný "živý" ambient na pozadí (`body::before`, animace `ambientDrift`,
  34s smyčka) — appka teď i v klidu mírně "dýchá", místo aby byla úplně
  statická.
- `.reward-flash` / `.reward-pop` + `window.rewardFlash(el)` (definováno v
  `nav.js`) — krátký zelený puls + jemný "pop" scale efekt, který se spustí
  po úspěšném zápisu. Použito v `sklad.js` (po každé akci) a v novém
  rychlém zápisu na Home.
- `.quick-entry*` třídy pro widget rychlého zápisu na Home.
- `.profil-tab-panel` pro přepínání záložek Profil/Organizace.

`auth.js` a canvas exporty (`card.js`, `nemovitosti.js`) mají vlastní
natvrdo zapsané barvy (neběží přes `baseStyles()`/canvas nejde stylovat
CSS proměnnými) — ty jsem přebarvil ručně na stejnou paletu.

## 2) nav.js — sloučení Profil/Nastavení
Skupina **"Nastavení"** v horním menu mířila na stejnou URL (`/profil`) jako
tlačítko **"Profil"** vpravo v topbaru — byly to dva odkazy na to samé místo.
Skupina "Nastavení" byla z topbaru odstraněna, zůstává jediný jasný vstup
(tlačítko "Profil" vpravo nahoře).

## 3) server.js — `/profil` rozdělen na záložky
Stránka teď má dvě záložky (v hlavičce, stejný vizuální styl jako taby v
Blackbooku):
- **Profil** (vidí každý) — IC jméno, změna hesla, Discord aliasy, historie
  povýšení, trading karta, export dat.
- **Organizace** (jen Founder/Council) — sezónní vzhled webu, správa členů
  (reset hesla), stav Discord notifikací. Tahle záložka se v DOM vůbec
  nevykreslí pro nikoho jiného.

Žádná API routa se neměnila — jde čistě o markup/JS uvnitř `renderProfil()`.

## 4) views/home.js — Rychlý zápis + odstraněn portál do Caledonia World
- Nový widget **"Rychlý zápis"** na Dashboardu (jen pro role s přístupem do
  skladu) — čtyři taby: Weed / Drogy / Chemky / Účetnictví, tedy přesně ty
  sekce, které se používají denně. Zápis proběhne přes stejné API endpointy
  jako `/sklad` (`/api/weed`, `/api/drogy`, `/api/chemky`, `/api/ucet`),
  takže žádná serverová logika se neduplikuje. Po úspěchu se ozve pečeť
  (`albionSealThud`) a krátce zabliká widget (`rewardFlash`).
- **Portál "Vstup do Caledonia World"** byl na Home odstraněn (appku nikdo
  neotevíral). Routa `/albion` a celý `views/albion.js` v projektu zůstávají
  beze změny — pokud budete chtít portál vrátit, stačí do `home.js` znovu
  přidat `<a href="/albion" class="dash-portal">…</a>` blok (je zachovaný
  v historii/starší verzi souboru).
- Zbytek stránky (stat karty, aktivita, manifest skladu, onboarding,
  přísaha při povýšení) beze změny.

## 5) views/sklad.js — hlavní/vedlejší taby + odměna za zápis
Sidebar teď má dvě úrovně:
- **Hlavní** (vždy vidět): Účetnictví/Reserve Fund, Weed, Drogy, Chemikálie.
- **Vedlejší** (schované pod "Více ▾", stav se pamatuje v `localStorage`):
  Zbraně, Výroba, Směnárna, Ceník.

Po každém úspěšném zápisu (zbraně/weed/drogy/chemky/účet/směna/výroba/bulk/
ceník/Reserve Fund) se navíc zavolá `flashActivePanel()` → krátké zablikání
aktivního panelu (`rewardFlash`), zvuk pečeti zůstává jako dřív. Pro
`memberOnly` pohled (Reserve Fund + Ceník) zůstává původní jednoduchý
sidebar beze změny.

## 6) Co záměrně NENÍ v této dávce
- `views/albion.js` (Caledonia World) — beze změny, jen se na něj nikde
  neodkazuje z Home.
- Zbylé view soubory (blackbook, statistiky, audit, garáž, bazar,
  mentoring, spis, nemovitosti markup mimo canvas barvy, …) — dědí novou
  paletu automaticky přes `styles.js`, funkčně beze změny.
- Automatizované testy / živé spuštění proti Discordu a Google Sheets —
  ověřeno jen staticky (`node --check`).
