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
- `index.html` (10.66): HTML-geraamte + CSP-meta + `<script src="lib/supabase.js">` + `<script src="laden.js?b=x.y">`. Versie staat in `<meta name="bouw" content="APP_VERSIE='x.y',APP_BOUW='x.y'">` (updatecheck, update-melding.yml en stuur-push lezen `APP_BOUW='x.y'` uit index.html).
- `laden.js`: frame-check, `LADEN` = de lijst met app-bestanden; voert ze uit via een blob-URL, zodat de CSP géén 'unsafe-inline'/'unsafe-eval' nodig heeft. Nooit inline scripts of `onclick="…"` gebruiken. Bibliotheken lokaal in `lib/` (supabase, jszip, pdf-lib, jspdf + autotable, qrcode, xlsx + xlsx-werker); pdf.js en Tesseract uit `ocr/`. Nieuw extern adres = in de CSP (index.html) zetten.
- De `app-*.js`-bestanden zijn stukken van één groot script: het laadscript haalt ze op en voert ze **samen als één script** uit, in de volgorde van `LADEN`. Functies mogen dus naar elkaar verwijzen over bestanden heen. Nieuw bestand? Zet het in `LADEN` (laden.js) én in `APP` (sw.js).
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

Edge Functions: `stuur-push.js`, `factuur-in.js`, `bestelboek.js` (haalt bestelboek-wk-NN.pdf bij Reto op; app: bbAuto in app-bestelboek.js), `brood-export.js` (alleen lezen: klaargezet, over, voorraad, retourbonnen + signed URL van plaatje uit privé bucket `retour` (vlRetourImg in app-vaste.js) voor Coop Besteladvies, beveiligd met koppelcode in de stub) Code blijft in deze bestanden; `supabase/functions/<naam>/index.ts` is de ingang. **Automatisch live** via `.github/workflows/functies.yml` (Supabase CLI, geheim SUPABASE_ACCESS_TOKEN in GitHub) zodra zo'n bestand verandert: geen Deploy-knop meer. Koppelcode brood-export = geheim BROOD_SLEUTEL in Supabase (nooit in de openbare repo); retourbonnen alleen met header x-retour-sleutel = geheim RETOUR_SLEUTEL (ontbreekt dat geheim: met de gewone koppelcode). `pin.js` (10.60): pincodes controleren/zetten/migreren op de server (tabel pin_geheim, alleen service role, PBKDF2, 5 fout = 5 min slot); app gebruikt dat zodra S.pinServer (in instellingen) aan staat, daarna staan er geen pincodes meer in beheer:gebruikers/pins. `verkoop.js` (10.61): kassaverkoop uit Besteladvies via de server (alleen gekoppeld toestel van de winkel; geheimen VERKOOP_URL en VERKOOP_SLEUTEL; de app bewaart geen adres/koppelcode meer, kassaHaal in app-rooster.js). 10.62: `veiligSrc` (app-basis.js) laat alleen data:image/audio of https toe als bron van foto's/logo (tegen XSS via synced foto's); stuur-push-ronde alleen met header x-cron-sleutel = geheim CRON_SLEUTEL of vanaf een gekoppeld toestel (alleen eigen winkels), antwoord zonder winkelnamen/fouten; pin.js telt elke poging eerst via SQL-functie pin_poging (rijslot, oplopend slot 5→10→20 min, max 24 u, melding prive:pinslot in de bel), beheer per winkel via mijn_winkels-rol, pincode eigenaar alleen met oude pincode, geen terugval na rij __migratie; pinServer staat in beheer:gebruikers (2 = migratievlag gezet); brood-export alleen winkel BROOD_WINKEL als dat geheim staat; foutteksten algemeen. 10.63: privégesprekken (p_…) staan in prive:chat en hun foto/spraak in prive:notfoto:… (beheerdertoestel synct die); andere toestellen halen/schrijven alleen hun eigen gesprek via pin.js (acties chat, chatZet, chatFoto, chatFotoZet) met een persoonsbewijs (HMAC, 12 uur, L.bewijs na een goede pincode); chatGedeeld() laat oude p_ in 'berichten' staan tot het beheerdertoestel ze heeft overgezet. 10.64: uren-diensten/correcties/goedkeuringen in prive:uren (beheerdertoestel), rooster/namen/_inst blijven in 'uren' (urenGedeeld); medewerker (urenEigen) ziet en klokt alleen zichzelf via pin.js (uren, urenZet; tijden ±10 min van nu, geen wijzigen na uitklokken), zonder internet geen klokken. 10.65: pin.js ook slot per toestel (SQL pin_toestel + pin_toestel_poging/pin_toestel_goed, 10 fout per uur over alle namen) en geen makkelijke pincodes (behalve tijdelijke pincode van de beheerder); veiligSrc alleen jpeg/png/webp/audio; sw.js wist alleen eigen caches (broodopzet-, nooit cba-) en bewaart alleen r.ok; localStorage-sleutels alleen broodkarren-/broodopzet- (toestelWissen wist alleen die, uitloggen scope local); pdf.js altijd isEvalSupported:false; Excel van buiten via `xlsxBladen` (worker lib/xlsx-werker.js, 20 s). Inbraaktest-SQL (alles teruggedraaid): /home/claude/w/sql/inbraak.sql-aanpak (pg_temp-hulpjes, rol wisselen met set_config). Veiligheidstest: `.github/workflows/veiligheid.yml` + `veiligheid-winkel.yml` (met de hand, eenmalige koppelcode, test als winkeltoestel) (buitenstaander, elke maandagnacht). verify_jwt: overal uit. `ocr/` = leesprogramma pakbon, niet aanraken.

Updates: bij openen meteen bijwerken (updBijOpen), bijwerkscherm, na update ingelogd op hetzelfde scherm (`bo-updplek`, 2 min). Pushmelding "Nieuwe versie": `.github/workflows/update-melding.yml` wacht tot de nieuwe APP_BOUW live staat en roept stuur-push aan met `{soort:'update',versie}` (alleen naar profielen met Updates tonen).

## Nieuwe versie (nummers met één punt: 10.26, 10.27 …)
1. `index.html`: meta bouw (`APP_BOUW='x.y'`, en `APP_VERSIE` alleen bij grote versies), `?b=x.y` bij style.css en laden.js.
2. `sw.js`: `VERSIE='broodopzet-x.y'`.
3. Nieuws voor de gebruiker: `APP_VERSIE` + tekst in app-opslag.js (alleen bij grote versies).

## Testen
- Grote versie: volledige Playwright-test, ook een ronde als medewerker; testversie in Claude bijwerken.
- Kleine fix: snelle controle (app laadt zonder fouten, het aangepaste scherm werkt).
- Altijd eerst: `cat app-*.js > /tmp/alles.js && node --check /tmp/alles.js` (een losse apostrof in een hulptekst breekt de hele app).
- Testversie in Claude (artifact "Brood Opzet") is één los HTML-bestand: neem index.html zonder CSP-meta, zet style.css in een `<style>`, supabase via het CDN, en vervang laden.js door één `<script>` met `APP_VERSIE`/`APP_BOUW` + alle bestanden uit `LADEN` achter elkaar.
- Test met CSP aan: geen meldingen "Content Security Policy" in de console (alle schermen, pdf, Excel, QR, scannen).
- Testen lokaal: `python3 -m http.server`, dan `http://localhost:8000/` (laadt niet via file://). "Zonder koppeling gebruiken" geeft een lokale testwinkel.
- Rapporteer alleen de uitkomst.

## Opleveren
- Na "bouwen" en testen: **zelf committen en pushen naar main** (versienummer in de commit-boodschap). Carlo uploadt niets meer. Haal vóór elke bouw eerst de laatste versie op (hij kan zelf iets geüpload hebben).
- Lukt pushen niet, dan als terugval een zip `brood-opzet-X.Y-github.zip` met alleen de gewijzigde bestanden (plat, geen mappen).
- Supabase: SQL als platte tekst in de chat, compacte delen zonder commentaar (max ~5 KB per deel), altijd met link naar de juiste Supabase-pagina. Nooit "vervang één regel": altijd het hele bestand. Niets nodig? Zeg: "Voor Supabase hoef je niets te doen".
- Na oplevering alleen: wat nieuw is, dat het op GitHub staat, of Supabase iets nodig heeft (alleen nog SQL; Edge Functions gaan automatisch live: controleer de run van functies-live).
