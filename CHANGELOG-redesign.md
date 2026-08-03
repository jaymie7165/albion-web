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

---

# Dávka 2 — oprava zpětné vazby a druhé kolo úprav

## 7) nav.js — klávesové zkratky úplně odebrány
Odstraněno: tlačítko "g·_ · ?" v topbaru, modal s přehledem zkratek,
`openShortcutsHelp`/`closeShortcutsHelp`, celá chordová navigace (`g` + `h`/
`s`/`b`/…), globální `/` pro focus vyhledávání a `?` pro nápovědu. Globální
vyhledávání zůstává dostupné jen kliknutím na ikonu lupy v topbaru — funkčně
beze změny, jen bez klávesové zkratky.

## 8) Chemikálie — volba ceny nákupu při vkladu (server.js, constants.js, views/sklad.js)
Nové: **`constants.js`** má `CHEMKY_CENY` (server-autoritativní ceník za
kus, měna pesos/SAD — zrcadlí to, co dřív existovalo jen na frontendu ve
`sklad.js`). `POST /api/chemky` nově přijímá při `typ:'VKLAD'` volitelně
`cenaZdroj` (`'vyrobni'` | `'vlastni'` | `'zadna'`):
- **`vyrobni`** — server si sám (nedůvěřuje klientovi) dopočítá částku ×
  množství z `CHEMKY_CENY` a zapíše ji jako `VÝDAJ` do `Účetnictví`
  (poznámka `Nákup chemikálie — <položka> (<qty> ks) [cena z varny]`).
- **`vlastni`** — přijme částku + měnu zadanou uživatelem (stejná důvěra
  jako u běžného ručního výdaje) a zapíše stejně jako výše.
- **`zadna`** / bez pole — beze změny oproti původnímu chování (jen zápis
  do skladu, žádný dopad na účet). Existující volání (např. rychlý zápis na
  Home) tak dál fungují bez úprav.

`views/sklad.js` — panel Chemikálie má při zvoleném VKLADU nový přepínač
**Cena z varny / Vlastní cena / Bez záznamu** s živým náhledem částky
(počítáno stejnou tabulkou jako dřív ve Výrobě) a — u vlastní ceny — polem
na částku + měnu. Potvrzovací modal i toast po odeslání ukazují, kolik (a
zda) se z účtu strhlo.

*Pozn.: Rychlý zápis na Home (`views/home.js`) tuhle volbu záměrně nemá —
zůstává jednoduchý a bez ceny, jak byl navržený. Cenu za nákup nastavíš na
plné stránce Skladu.*

## 9) Home — živé propisování aktivity a čísel (oprava)
Dřív SSE eventy (`skladUpdate`, `ucetUpdate`) na Home jen vyvolaly toast —
seznam "Poslední zápisy do rejstříku" ani horní čísla (zůstatek, hodnota
weedu, stav skladu) se bez ručního refreshe stránky neaktualizovaly. Teď:
- Nový záznam se rovnou **předsune do seznamu aktivity** (s krátkým
  `rewardFlash` pulzem) a seznam se ořeže na posledních 7 položek.
- Po každé události se přes `/api/sklad/summary` přetáhnou čerstvá čísla a
  přepíšou se `tally-usd`, `tally-pesos`, `tally-weed-value`, `qs-weed`,
  `qs-drogy`, `qs-chemky`, `qs-usd-big`, `qs-weed-value` i výplň ukazatele
  trezoru — bez reloadu stránky.

## 10) Home — bohatší dashboard pro Member/Associate
Dřív viděl řadový člen na Home jen hodiny a jednu větu o omezeném přístupu.
Teď (beze změny přístupových práv — pořád nevidí finance ani sklad):
- **Citát dne** (stejná rotace citátů jako na `/lore`, jen inline).
- **Tvůj profil** — hodnost a počet odznaků (`/api/me/session`,
  `/api/me/achievements`).
- **Weed sázení** — kolik kytek je právě dorostlých / kolik roste
  (`/api/weed-timers`), s odkazem na plnou stránku.
- **Rychlý přístup** — dlaždice na Kodex, Historii, Hierarchii, Garáž,
  Bazar, Mentoring, Aktivitu (leaderboard) a Trading kartu/Profil — všechno
  jsou stránky, na které Member/Associate stejně už měl přístup, jen dřív
  nebyly z Home nijak vidět.
