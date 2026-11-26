# Brood Opzet (repo Broodkarren) – afspraken voor Claude

Web-app (PWA) van Coop Vogelenzang voor broodkarren klaarzetten, derving, bestellen, uren, chat enz. Draait via GitHub Pages, offline met Supabase-sync. Eigenaar: Carlo (werkt alleen vanaf zijn iPhone, spreekt Nederlands).

## Werkwijze
- Pas pas iets aan als Carlo letterlijk "bouwen" zegt. Daarvóór: kort voorstel (wat, waar in de app, hoe het werkt). Is iets onduidelijk, stel één korte vraag.
- **Lees alleen de bestanden die je nodig hebt.** Zoek een functie met `grep -n "function naam\|naam=" app-*.js` en lees dan alleen dat stuk.
- Pas gericht aan (Edit), herschrijf geen hele bestanden. Houd code compact.
- Nieuw scherm = meteen een eigen hulptekst.
- Stuur tijdens langer werk korte voortgangsberichten met percentage ("⏳ 40% · nu testen"). Is de tool `mcp__voortgang-balk__voortgang` er, roep die ook aan (de balk zelf toont de iPhone-app nog niet).
- **Bouw altijd verder op de bestanden in deze repo** (eerst ophalen van GitHub), nooit op een eigen kopie of één samengevoegd index.html. Werk niet in twee chats tegelijk aan deze app: dan overschrijft de ene upload de andere.

## Opbouw
- `index.html`: alleen HTML-geraamte + laadscript. Daarin staat `const APP_BOUW='x.y'` (de updatecheck leest dit uit index.html) en `LADEN` = de lijst met app-bestanden.
- De `app-*.js`-bestanden zijn stukken van één groot script: het laadscript haalt ze op en voert ze **samen als één script** uit, in de volgorde van `LADEN`. Functies mogen dus naar elkaar verwijzen over bestanden heen. Nieuw bestand? Zet het in `LADEN` (index.html) én in `APP` (sw.js).
- `style.css`: alle opmaak. Coop-oranje #f17d04, grote knoppen, simpele Nederlandse teksten.

| Bestand | Inhoud |
|---|---|
| app-basis.js | standaardgegevens, Supabase-sleutels, dagen, tabs |
| app-logo.js | logo's als afbeelding (niet lezen) |
| app-basis2.js | laden en omzetten van opgeslagen gegevens |
| app-facturen.js | facturen voor de aanbieder |
| app-bestelboek.js | bestelboeken van de leverancier |
| app-winkels.js | foutvanger, meerdere winkels, logo per winkel |
| app-planning.js | accounts & rechten, planning, bijbakken, voorraad, advies, deeg |
| app-opslag.js | lokaal en online opslaan, APP_VERSIE + nieuws |
| app-scherm.js | render(), koppelen, Klaarzetten |
| app-pakbon.js | pakbon scannen, oven, materiaal, pushmeldingen |
| app-meldingen.js | meldingen, euro's, bestel-advies, weekoverzicht, back-up, cadeaubonnen |
| app-uren.js | urenregistratie, Home, plek onthouden |
| app-betalen.js | Te betalen (inkoopfacturen) |
| app-vaste.js | Vaste lasten: ING-CSV (S.bank per maand, prive:bank:YYYY-MM), Van Tol-weekstaat, afboeken in Te betalen, Excel (S.vaste → prive:vaste) |
| app-rooster.js | rooster, checklists, derving in euro's, kassaverkoop uit Besteladvies (KV, kassaHaal, kassa-controle), Home indelen, meldingsoorten |
| app-chat.js | chat |
| app-overdracht-print.js | overdracht, rondleiding, dag afsluiten, printen, feestdagen, weer, export |
| app-schermen.js | Invullen, Derving, Meer, accounts |
| app-events.js | gebruiksgemak, Android, updates, alle klik-afhandeling (`case'...'`) |
| app-start.js | opstarten |

Edge Functions: `stuur-push.js`, `factuur-in.js`, `bestelboek.js` (haalt bestelboek-wk-NN.pdf bij Reto op; app: bbAuto in app-bestelboek.js), `brood-export.js` (alleen lezen: klaargezet, over, voorraad, retourbonnen + signed URL van plaatje uit privé bucket `retour` (vlRetourImg in app-vaste.js) voor Coop Besteladvies, beveiligd met koppelcode in de stub) Code blijft in deze bestanden; `supabase/functions/<naam>/index.ts` is de ingang. **Automatisch live** via `.github/workflows/functies.yml` (Supabase CLI, geheim SUPABASE_ACCESS_TOKEN in GitHub) zodra zo'n bestand verandert: geen Deploy-knop meer. Koppelcode brood-export = geheim BROOD_SLEUTEL in Supabase (nooit in de openbare repo); retourbonnen alleen met header x-retour-sleutel = geheim RETOUR_SLEUTEL (ontbreekt dat geheim: met de gewone koppelcode). `pin.js` (10.60): pincodes controleren/zetten/migreren op de server (tabel pin_geheim, alleen service role, PBKDF2, 5 fout = 5 min slot); app gebruikt dat zodra S.pinServer (in instellingen) aan staat, daarna staan er geen pincodes meer in beheer:gebruikers/pins. `verkoop.js` (10.61): kassaverkoop uit Besteladvies via de server (alleen gekoppeld toestel van de winkel; geheimen VERKOOP_URL en VERKOOP_SLEUTEL; de app bewaart geen adres/koppelcode meer, kassaHaal in app-rooster.js). Veiligheidstest: `.github/workflows/veiligheid.yml` (buitenstaander, elke maandagnacht). verify_jwt: overal uit. `ocr/` = leesprogramma pakbon, niet aanraken.

Updates: bij openen meteen bijwerken (updBijOpen), bijwerkscherm, na update ingelogd op hetzelfde scherm (`bo-updplek`, 2 min). Pushmelding "Nieuwe versie": `.github/workflows/update-melding.yml` wacht tot de nieuwe APP_BOUW live staat en roept stuur-push aan met `{soort:'update',versie}` (alleen naar profielen met Updates tonen).

## Nieuwe versie (nummers met één punt: 10.26, 10.27 …)
1. `index.html`: `APP_BOUW='x.y'` en `?b=x.y` bij style.css (het laadscript gebruikt APP_BOUW zelf).
2. `sw.js`: `VERSIE='broodopzet-x.y'`.
3. Nieuws voor de gebruiker: `APP_VERSIE` + tekst in app-opslag.js (alleen bij grote versies).

## Testen
- Grote versie: volledige Playwright-test, ook een ronde als medewerker; testversie in Claude bijwerken.
- Kleine fix: snelle controle (app laadt zonder fouten, het aangepaste scherm werkt).
- Altijd eerst: `cat app-*.js > /tmp/alles.js && node --check /tmp/alles.js` (een losse apostrof in een hulptekst breekt de hele app).
- Testversie in Claude (artifact "Brood Opzet") is één los HTML-bestand: neem index.html, zet style.css in een `<style>` en vervang het laadscript door één `<script>` met `APP_BOUW` + alle bestanden uit `LADEN` achter elkaar.
- Testen lokaal: `python3 -m http.server`, dan `http://localhost:8000/` (laadt niet via file://). "Zonder koppeling gebruiken" geeft een lokale testwinkel.
- Rapporteer alleen de uitkomst.

## Opleveren
- Na "bouwen" en testen: **zelf committen en pushen naar main** (versienummer in de commit-boodschap). Carlo uploadt niets meer. Haal vóór elke bouw eerst de laatste versie op (hij kan zelf iets geüpload hebben).
- Lukt pushen niet, dan als terugval een zip `brood-opzet-X.Y-github.zip` met alleen de gewijzigde bestanden (plat, geen mappen).
- Supabase: SQL als platte tekst in de chat, compacte delen zonder commentaar (max ~5 KB per deel), altijd met link naar de juiste Supabase-pagina. Nooit "vervang één regel": altijd het hele bestand. Niets nodig? Zeg: "Voor Supabase hoef je niets te doen".
- Na oplevering alleen: wat nieuw is, dat het op GitHub staat, of Supabase iets nodig heeft (alleen nog SQL; Edge Functions gaan automatisch live: controleer de run van functies-live).
