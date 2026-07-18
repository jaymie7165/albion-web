# Albion Web — changelog k této dávce úprav

Soubory nahraď 1:1 za stejnojmenné ve svém repu (zachovej strukturu — `views/`
soubory patří do `views/`, zbytek do kořene projektu). Prošly `node --check`
(kontrola syntaxe), ale běžet naživo proti tvému Google Sheets / Discord botovi
jsem je netestoval — vyzkoušej to nejdřív mimo produkci.

## server.js
- `/api/cenik` (GET) už nevyžaduje `requireAccess('sklad')`, jen přihlášení — Member/Associate ho v UI vidí, tak už jim nebude padat 403.
- `/api/blackbook` a `/api/profit-centrum`: `CONFIG.drogyCeny`/`zbraneCeny` mají `|| {}`, takže report nespadne, když ceny chybí.
- `/login`, `/register`: přihlášeného uživatele rovnou přesměrují na `/home`.
- Nové: `/api/me/change-password`, Discord OAuth `action=forgot` (zapomenuté heslo → nové dočasné heslo přes DM), `/api/admin/reset-password/:id`, `/api/admin/members`, `/api/admin/discord-status`.
- `/api/weed-timers/remove`: kontroluje, že maže buď zakladatel odpočtu, nebo Founder/Council.
- `gcOrphanedUploads()`: přidán úklid `bazar-uploads` (nemovitosti tam už byly).
- Bazar `zajem`: prodávajícímu jde Discord DM, pokud má vyplněný `discord_id`.
- Nové: `/api/search` (globální hledání), `/api/me/export` (stažení vlastních dat), `/api/sklad/summary` (tichý refresh dat skladu), `/api/online-members`, `/api/sklad/moje-oblibene` (nejpoužívanější položky).
- Nové: `/api/sklad/undo` + `recordLastAction()` — vrácení POSLEDNÍHO zápisu do Zbraní/Weedu/Drog/Chemek zpět, jen autorem zápisu, jen do 10 minut. **Toto maže řádek přímo v Google Sheets přes `batchUpdate` — vyzkoušej nejdřív na testovacím sešitu.**
- Reserve Fund: částka (dřív `$5000` napevno) je teď v `reserve-fund-config.json`, editovatelná přes `/api/reserve-fund/config` (jen Founder/Council).
- `renderProfil()`: přidána karta "Změna hesla" a (jen Founder/Council) karta "Správa členů" s resetem hesla a stavem Discord kanálů.
- Sjednoceny prahy nízkých zásob na `{ zbrane:5, weed:20, drogy:10, chemky:10 }` — pokud máš v repu ještě starší verzi `server.js`/`discord.js` s `{ weed:10, drogy:5 }`, nahraď ji touhle.

## db.js
- Přidána `db.setPasswordHash(id, hash)` — používá změna hesla, reset i admin reset.

## sheets.js
- Přidány `appendRowTracked()` (vrací číslo zapsaného řádku), `getSheetIdMap()` a `deleteRow()` — podklad pro `/api/sklad/undo`.

## discord.js
- Přidány `dmUser()`, `sendPasswordResetDM()`, `notifyBazarZajem()`.
- Prahy nízkých zásob sjednoceny na 4 kategorie (`zbrane, weed, drogy, chemky`).
- `notifyAudit` umí i "ZRUŠENO (undo)" barvu/nadpis.

## nav.js
- Evelynin dopis: tlačítko 🔕 "dnes už nezobrazovat" (jen automatické vysunutí, ruční otevření pořád funguje).
- Nový modal s přehledem klávesových zkratek (`?`).
- Nové globální vyhledávání (`/`, když stránka nemá vlastní `#audit-search`).
- Zvonek teď reaguje i na nové nabídky/zájemce v Bazaru a aktivitu v Mentoringu, ne jen na Nástěnku.

## views/albion.js (Albion World)
- Opravena race condition v `openFocus`/`closeFocus` (viz commit zpráva v kódu) — nejpravděpodobnější příčina, proč se Kodex/Historie/Profil/Dashboard uvnitř kanceláře občas jevily jako "nefunkční".
- Přidán vždy viditelný odkaz "Otevřít samostatně" + automatický fallback, pokud se iframe do 6 s nenačte.
- **Nemám jak tohle spustit naživo — pokud problém přetrvá i po nasazení, dej vědět a budeme hledat dál.**

## views/sklad.js
- Po zápisu (zbraně/weed/drogy/chemky/účet/směna/reserve fund) se místo `location.reload()` tiše dotáhnou čerstvá data (`/api/sklad/summary`) — stránka a scroll zůstávají na místě.
- Po zápisu se objeví lišta "Vrátit zpět" (funguje 10 minut, jen pro autora zápisu).
- Nad každým formulářem (zbraně/weed/drogy/chemky) čipy "Oblíbené" s nejpoužívanějšími položkami daného člena — klik rovnou předvyplní formulář.
- Množství má teď `max="500"` a JS validaci před odesláním (chyba se ukáže hned, ne až po requestu).
- Reserve Fund: Founder/Council může měnit částku přímo v UI.

## views/blackbook.js
- Sekce VII (Continental) má nahoře souhrn "Dluží nám / Dlužíme my" v SAD i Pesos.
- Sekce II (Aktivita) má widget "Kdo je právě online" (z aktivních SSE spojení).

## views/statistiky.js, views/audit.js
- Počáteční "Načítám…" nahrazeno skeleton animací (`window.skeletonRows`, který už existoval v `nav.js`, ale nikde se nepoužíval).

## views/weed-sazeni.js
- Tlačítko "Povolit oznámení" — když kytka doroste, přehraje zvuk a (pokud je povoleno) pošle systémovou notifikaci prohlížeče, i bez otevřené stránky na popředí.

## styles.js
- Žádná funkční změna. Legacy CSS proměnné (`--ink`, `--leather`, `--seal`, `--blood`…) jsem nechal beze změny hodnot, jen jasně okomentoval a oddělil od "aktivní" sady — bezpečný krok bez rizika rozbití vzhledu. Plný úklid (přejmenovat všude a smazat duplicity) by chtěl projít všech ~20 view souborů a ověřit, že žádný starý název nezůstane osamocený — na to jsem se v této dávce netroufal bez možnosti to reálně otestovat.

## Co záměrně NENÍ v této dávce
- Kompletní přejmenování CSS proměnných napříč všemi views (viz výše — bezpečnostní důvod).
- Automatizované testy / spuštění appky — nemám přístup k tvému Google Sheets ani Discord botovi, takže samotné psaní kódu jsem ověřil jen staticky (`node --check` prošlo na všech souborech).
