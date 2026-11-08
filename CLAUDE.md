# Brood Opzet (repo Broodkarren) – afspraken voor Claude

Web-app (PWA) van Coop Vogelenzang voor broodkarren klaarzetten, derving, bestellen, uren, chat enz. Draait via GitHub Pages, offline met Supabase-sync. Eigenaar: Carlo (werkt alleen vanaf zijn iPhone, spreekt Nederlands).

## Werkwijze
- Pas pas iets aan als Carlo letterlijk "bouwen" zegt. Daarvóór: kort voorstel (wat, waar in de app, hoe het werkt). Is iets onduidelijk, stel één korte vraag.
- **Lees alleen de bestanden die je nodig hebt.** Zoek een functie met `grep -n "function naam\|naam=" app-*.js` en lees dan alleen dat stuk.
- Pas gericht aan (Edit), herschrijf geen hele bestanden. Houd code compact.
- Nieuw scherm = meteen een eigen hulptekst.
- Stuur tijdens langer werk korte voortgangsberichten met percentage ("⏳ 40% · nu testen").

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
| app-rooster.js | rooster, checklists, derving in euro's, Home indelen, meldingsoorten |
| app-chat.js | chat |
| app-overdracht-print.js | overdracht, rondleiding, dag afsluiten, printen, feestdagen, weer, export |
| app-schermen.js | Invullen, Derving, Meer, accounts |
| app-events.js | gebruiksgemak, Android, updates, alle klik-afhandeling (`case'...'`) |
| app-start.js | opstarten |

Edge Functions: `stuur-push.js`, `factuur-in.js` (vaste naam, Supabase heeft alleen een stub die ze importeert). `ocr/` = leesprogramma pakbon, niet aanraken.

## Nieuwe versie (nummers met één punt: 10.26, 10.27 …)
1. `index.html`: `APP_BOUW='x.y'` en `?b=x.y` bij style.css en in het laadscript.
2. `sw.js`: `VERSIE='broodopzet-x.y'`.
3. Nieuws voor de gebruiker: `APP_VERSIE` + tekst in app-opslag.js (alleen bij grote versies).

## Testen
- Grote versie: volledige Playwright-test, ook een ronde als medewerker; testversie in Claude bijwerken.
- Kleine fix: snelle controle (app laadt zonder fouten, het aangepaste scherm werkt).
- Testen lokaal: `python3 -m http.server`, dan `http://localhost:8000/` (laadt niet via file://). "Zonder koppeling gebruiken" geeft een lokale testwinkel.
- Rapporteer alleen de uitkomst.

## Opleveren
- Zip `brood-opzet-X.Y-github.zip` met alleen de gewijzigde GitHub-bestanden (plat, geen mappen).
- Supabase: SQL als platte tekst in de chat, compacte delen zonder commentaar (max ~5 KB per deel), altijd met link naar de juiste Supabase-pagina. Nooit "vervang één regel": altijd het hele bestand. Niets nodig? Zeg: "Voor Supabase hoef je niets te doen".
- Na oplevering alleen: wat nieuw is, wat te uploaden, of Supabase iets nodig heeft.
