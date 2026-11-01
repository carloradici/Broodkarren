// Brood Opzet – pushmelding versturen (Supabase Edge Function "stuur-push")
// 10.0: per winkel. Materiaal bijna op (beheerder), herinnering levering (iedereen die de levering mag invullen) en weekoverzicht op maandag (beheerder).
// 10.17: te betalen (vervaldatum, maandag-overzicht), vergeten uit te klokken, checklist niet af.
// 10.10: berichten (chat): privé, teamchat, mededelingen, @naam, dempen, ingeplande berichten en herinnering bij open meldingen.
// 10.17: wordt door de korte stuur-push in Supabase opgehaald van GitHub Pages. Bijwerken = dit bestand uploaden en in Supabase op Deploy tikken.
export function start(webpush, createClient) {
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const antwoord = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const PUBLIEK = "BMq2CTiL_Zpze43M7a5Ik1nZwFyB-xYRLeXAt4R6s7w_WBebpQvP_uHXS8QsH-0g1vkqTBVmEg3eaRe5NtTLj9o";
    const prive = String(Deno.env.get("VAPID_PRIVATE") || "").replace(/[^A-Za-z0-9_-]/g, "");
    webpush.setVapidDetails("mailto:winkel@coopvogelenzang.nl", PUBLIEK, prive);
    let body = {};
    try { body = await req.json(); } catch (_) { /* leeg */ }

    // 10.0: elke winkel apart (alleen winkels met pushmeldingen in hun pakket)
    const PAKKET = { basis: [], plus: ["scan", "push", "rapport"], compleet: ["scan", "push", "rapport", "advies", "euro", "cadeau", "deeg"] };
    const vandaagNL = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date());
    const functies = (w) => {
      const f = new Set([...(PAKKET[w.pakket] || []), ...(w.extra || [])]);
      if (w.proef_pakket && w.proef_tot && w.proef_tot >= vandaagNL) for (const x of PAKKET[w.proef_pakket] || []) f.add(x);
      return f;
    };
    let winkels = [{ id: null, naam: "", meer: false }];
    const wr = await sb.from("winkels").select("id,naam,ondernemer,pakket,extra,proef_pakket,proef_tot,slot");
    if (!wr.error) {
      const perOnd = {};
      for (const w of wr.data || []) perOnd[w.ondernemer] = (perOnd[w.ondernemer] || 0) + 1;
      winkels = (wr.data || []).filter((w) => !w.slot && functies(w).has("push")).filter((w) => !body.winkel || w.id === body.winkel)
        .map((w) => ({ id: w.id, naam: w.naam, meer: perOnd[w.ondernemer] > 1 }));
    }
    let n = 0;
    const perWinkel = [];
    for (const winkel of winkels) {
      try { const x = await doeWinkel(winkel); n += x; perWinkel.push({ winkel: winkel.naam, verstuurd: x }); }
      catch (e) { console.log("winkel mislukt", winkel.naam, e); perWinkel.push({ winkel: winkel.naam, fout: String(e?.message || e) }); }
    }
    return antwoord({ ok: true, verstuurd: n, winkels: perWinkel, reden: n ? undefined : (winkels.length ? "geen toestellen aangemeld" : "pushmeldingen zitten niet in het pakket van deze winkel") });

    async function doeWinkel(winkel) {
      const metW = (q) => winkel.id ? q.eq("winkel", winkel.id) : q;
      const { data: rijen, error } = await metW(sb.from("app_data").select("sleutel,waarde"))
        .in("sleutel", ["prive:push", "materiaal", "prive:pushlog", "pushteam", "instellingen", "beheer:gebruikers", "berichten", "prive:betalen", "uren", "checklists"]);
      if (error) throw error;
      const haal = (k) => (rijen.find((r) => r.sleutel === k) || {}).waarde || {};
      const push = haal("prive:push"), mat = haal("materiaal"), plog = haal("prive:pushlog");
      const team = haal("pushteam"), inst = haal("instellingen"), gebr = (haal("beheer:gebruikers").lijst || []);
      const toestellen = push.subs || [];
      // medewerkers met het recht 'levering invullen' (afvinken) + de beheerder
      const magLevering = (uid) => { const g = gebr.find((x) => x.id === uid); return !!g && (g.rol === "admin" || (g.actief !== false && !!(g.rechten || {}).vinken)); };
      const teamToestellen = (team.subs || []).filter((t) => magLevering(t.uid));
      if (!toestellen.length && !(team.subs || []).length) return 0;

      const verstuurd = { ...(plog.verstuurd || {}) };
      const nieuw = [];
      let berichten = []; // { titel, tekst, tag, url, aan: "beheer" | "levering" | "uid:<id>" }

      if (body.test) {
        berichten = [{ titel: "Brood Opzet", tekst: "✓ Pushmeldingen werken!", tag: "test", url: "./#materiaal", aan: "beheer" }];
      } else {
        const uur = Number(new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", hour: "numeric", hourCycle: "h23" }).format(new Date()));
        const stil = push.stil || { van: 21, tot: 7 };
        const inStil = stil.van === stil.tot ? false
          : stil.van > stil.tot ? (uur >= stil.van || uur < stil.tot) : (uur >= stil.van && uur < stil.tot);
        const naam = (id) => ((mat.lijst || []).find((x) => x.id === id) || {}).naam || ((mat.los || {})[id] || {}).naam || "Materiaal";
        const gemeld = [
          ...Object.entries(mat.meld || {}).map(([id, x]) => ({ id, ...x })),
          ...Object.values(mat.los || {}),
        ].filter((x) => x.staat === "bijna" || x.staat === "op");
        const open = gemeld
          .filter((x) => !verstuurd[`${x.id}:${x.staat}:${x.t}`])
          .filter((x) => !inStil || x.staat === "op");
        if (open.length) {
          const titel = open.some((x) => x.staat === "op") ? "📦 Materiaal op!" : "📦 Materiaal bijna op";
          const tekst = open.length === 1
            ? `${naam(open[0].id)} ${open[0].staat === "op" ? "is op" : "bijna op"} – gemeld door ${open[0].wie || "?"}`
            : open.map((x) => `${naam(x.id)}${x.staat === "op" ? " (op!)" : ""}`).join(", ");
          berichten.push({ titel, tekst, tag: "materiaal", url: "./#materiaal", aan: "beheer" });
          for (const x of open) nieuw.push(`${x.id}:${x.staat}:${x.t}`);
        }
        // ---- 10.10 berichten (chat): privé, teamchat, mededelingen, @naam, dempen, ingepland, herinnering ----
        const ber = haal("berichten"), nuMs = Date.now(), cinst = (ber && ber._inst) || {};
        const zoekUid = (naam) => (gebr.find((g) => g.naam === naam) || {}).id || "";
        const adminIds = new Set(gebr.filter((g) => g.rol === "admin").map((g) => g.id));
        const medewerkers = gebr.filter((g) => g.rol !== "admin" && g.actief !== false).map((g) => g.id);
        const msgsVan = (b) => [
          ...(b.tekst ? [{ id: "0", beheer: !!b.vanBeheer, uid: b.vanBeheer ? "" : (b.uid || ""), van: b.vanBeheer ? (b.wie || "Beheerder") : b.van, tekst: b.tekst, t: b.t || 0 }] : []),
          ...Object.entries(b.r || {}).map(([id, r]) => ({ id, ...(r || {}) })),
        ];
        const gedempt = (b, k) => !!(b.demp && b.demp[k]);
        for (const b of Object.values(ber || {})) {
          if (!b || typeof b !== "object" || !b.id) continue;
          const soort = b.type === "team" ? "team" : b.type === "med" ? "med" : "prive";
          if (soort === "team" && cinst.team === false) continue;
          const url = "./#chat-" + encodeURIComponent(b.id), tag = "chat-" + b.id;
          const lijst = msgsVan(b);
          for (const x of lijst) {
            const tm = x.op || x.t || 0, sleutel = `chat:${b.id}:${x.id}`;
            if (x.auto || x.weg || verstuurd[sleutel] || tm > nuMs || nuMs - tm > 12 * 3600e3) continue;
            if (inStil) continue; // na de stille uren alsnog (binnen 12 uur)
            const inhoud = x.tekst ? String(x.tekst) : x.foto ? "📷 Foto" : x.audio ? "🎤 Spraakbericht" : x.peil ? "📊 " + x.peil.vraag : x.link ? "📎 Bijlage" : "";
            const kort = inhoud.length > 120 ? inhoud.slice(0, 117) + "…" : inhoud;
            const afz = x.beheer ? "beheer" : (x.uid || zoekUid(x.van));
            if (soort === "prive") {
              if (x.beheer) {
                const uid = b.uid || zoekUid(b.van);
                if (uid && !gedempt(b, uid)) berichten.push({ titel: "💬 Bericht van de beheerder", tekst: kort, tag, url, aan: "uid:" + uid });
              } else if (!gedempt(b, "beheer")) berichten.push({ titel: `💬 ${x.van || "Medewerker"}`, tekst: kort, tag, url, aan: "beheer" });
            } else {
              const titel = soort === "med" ? "📢 Mededeling" : `👥 ${x.van || "Teamchat"}`;
              const noem = new Set(x.noem || []);
              for (const u of medewerkers) {
                if (u === afz) continue;
                if (gedempt(b, u) && !noem.has(u)) continue;
                berichten.push({ titel: noem.has(u) ? titel + " – noemt jou" : titel, tekst: kort, tag, url, aan: "uid:" + u });
              }
              if (!x.beheer && (!gedempt(b, "beheer") || [...noem].some((u) => adminIds.has(u)))) berichten.push({ titel, tekst: kort, tag, url, aan: "beheer" });
            }
            nieuw.push(sleutel);
          }
          // herinnering: melding van een medewerker staat na x uur nog open en is niet beantwoord
          const uren = Number(cinst.herinner ?? 4);
          if (soort === "prive" && uren > 0 && !inStil) {
            const mw = lijst.filter((m) => !m.beheer && !m.auto && !m.weg).sort((a, c) => (a.t || 0) - (c.t || 0));
            const laatste = mw[mw.length - 1];
            if (laatste && !(b.af && b.af.t >= laatste.t) && !(b.arch && b.arch >= laatste.t) && !gedempt(b, "beheer")) {
              const beantwoord = lijst.some((m) => m.beheer && (m.t || 0) > (laatste.t || 0));
              const k = `her:${b.id}:${laatste.id}`, oud = nuMs - (laatste.t || 0);
              if (!beantwoord && !verstuurd[k] && oud > uren * 3600e3 && oud < 48 * 3600e3) {
                berichten.push({ titel: "⏰ Melding staat nog open", tekst: `${laatste.van || "Medewerker"}: ${String(laatste.tekst || "").slice(0, 100)}`, tag: "her-" + b.id, url, aan: "beheer" });
                nieuw.push(k);
              }
            }
          }
        }
        // ---- herinnering levering ----
        const vandaag = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date()); // JJJJ-MM-DD
        const minuut = Number(new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", minute: "numeric" }).format(new Date()));
        const dow = new Date(vandaag + "T12:00:00Z").getUTCDay();
        const her = inst.herinnering || { aan: true, uur: 10, min: 0 };
        const versUitz = inst.versUitz || {};
        const versVandaag = vandaag in versUitz ? !!versUitz[vandaag] : (inst.versDagen || [1, 2, 3, 4, 5, 6]).includes(dow);
        const heeftVers = (inst.soorten || []).some((x) => x.type === "vers" && String(x.naam || "").trim());
        if (her.aan !== false && heeftVers && versVandaag && uur * 60 + minuut >= (her.uur ?? 10) * 60 + (her.min || 0) && uur < 20 && !verstuurd[`lev:${vandaag}`]) {
          const { data: dag } = await metW(sb.from("app_data").select("waarde")).eq("sleutel", "dag:" + vandaag).maybeSingle();
          if (!(dag && dag.waarde && dag.waarde.levering)) {
            berichten.push({ titel: "🥖 Levering nog invullen", tekst: "De levering van vandaag is nog niet ingevuld. Scan de pakbon en tel de levering.", tag: "levering", url: "./#levering", aan: "levering" });
            nieuw.push(`lev:${vandaag}`);
          }
        }
        // ---- weekoverzicht op maandag 9:00 ----
        if (dow === 1 && uur >= 9 && uur < 21 && !verstuurd[`week:${vandaag}`]) {
          berichten.push({ titel: "📊 Weekoverzicht", tekst: "Derving, verschillen met de bakker en bestel-advies van vorige week staan klaar.", tag: "week", url: "./#weekoverzicht", aan: "beheer" });
          nieuw.push(`week:${vandaag}`);
        }
        // ---- 10.17 hulpjes ----
        const plusD = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
        const dmj = (d) => String(d || "").split("-").reverse().join("-");
        const eur = (c) => "€ " + (Math.round(c) / 100).toFixed(2).replace(".", ",");
        const amsDag = (t) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date(t));
        const amsTijd = (t) => new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit" }).format(new Date(t));
        const amsMs = (d, hm) => {
          const [y, mo, dd] = d.split("-").map(Number), [h, mi] = String(hm).split(":").map(Number), g = Date.UTC(y, mo - 1, dd, h, mi);
          const off = Date.parse(new Date(g).toLocaleString("en-US", { timeZone: "Europe/Amsterdam" })) - Date.parse(new Date(g).toLocaleString("en-US", { timeZone: "UTC" }));
          return g - off;
        };
        // ---- 10.17 te betalen ----
        const bet = haal("prive:betalen"), binst = bet.inst || {};
        if (binst.push !== false && uur >= 8 && uur < 21) {
          const incK = (x) => (x.inc && x.inc.aan !== false ? Number(x.inc.kosten) || 0 : 0);
          const rest = (x) => Math.max(0, (Number(x.tot) || 0) + incK(x) - Object.values(x.bet || {}).reduce((t, p) => t + (Number(p && p.b) || 0), 0));
          const open = Object.values(bet.f || {}).filter((x) => x && typeof x === "object" && !x.betaald && rest(x) > 0);
          const tekstVan = (l) => l.length === 1 ? `${l[0].lev || "?"} ${l[0].nr || ""} · ${eur(rest(l[0]))}` : `${l.length} facturen · ${eur(l.reduce((t, x) => t + rest(x), 0))}`;
          const voor = Number(binst.voor ?? 3), doel = plusD(vandaag, voor);
          const binnen = voor > 0 ? open.filter((x) => x.verval === doel) : [];
          if (binnen.length && !verstuurd[`tb-voor:${vandaag}`]) {
            berichten.push({ titel: `💶 Vervalt over ${voor} ${voor === 1 ? "dag" : "dagen"}`, tekst: `${tekstVan(binnen)} · vervaldatum ${dmj(doel)}`, tag: "tb-voor", url: "./#tebetalen", aan: "beheer" });
            nieuw.push(`tb-voor:${vandaag}`);
          }
          const nu0 = open.filter((x) => x.verval === vandaag);
          if (nu0.length && !verstuurd[`tb-dag:${vandaag}`]) {
            berichten.push({ titel: "💶 Vervalt vandaag", tekst: tekstVan(nu0), tag: "tb-dag", url: "./#tebetalen", aan: "beheer" });
            nieuw.push(`tb-dag:${vandaag}`);
          }
          if (dow === 1 && !verstuurd[`tb-week:${vandaag}`]) {
            const eind = plusD(vandaag, 6), wk = open.filter((x) => (x.plan || x.verval) && (x.plan || x.verval) <= eind), laat = wk.filter((x) => (x.plan || x.verval) < vandaag);
            if (wk.length) {
              berichten.push({ titel: "💶 Deze week te betalen", tekst: `${wk.length} ${wk.length === 1 ? "factuur" : "facturen"} · ${eur(wk.reduce((t, x) => t + rest(x), 0))}${laat.length ? ` (waarvan ${laat.length} te laat)` : ""}`, tag: "tb-week", url: "./#tebetalen", aan: "beheer" });
              nieuw.push(`tb-week:${vandaag}`);
            }
          }
        }
        // ---- 10.17 vergeten uit te klokken ----
        const uren = haal("uren"), rooster = Object.values(uren.rooster || {}).filter((r) => r && r.uid && r.d && r.van && r.tot);
        const urenNaam = (uid) => String(uid).startsWith("n_") ? (((uren.namen || {})[String(uid).slice(2)] || {}).naam || "?") : ((gebr.find((g) => g.id === uid) || {}).naam || "?");
        for (const [uid, ds] of Object.entries(uren.d || {})) {
          for (const x of Object.values(ds || {})) {
            if (!x || typeof x !== "object" || !x.in || x.uit) continue;
            if (nuMs - x.in > 3 * 864e5) continue;
            const d = amsDag(x.in), r = rooster.filter((y) => y.uid === uid && y.d === d).sort((a, c) => String(c.tot).localeCompare(String(a.tot)))[0];
            let eind = x.in + 10 * 3600e3;
            if (r) { eind = amsMs(r.d, r.tot); if (eind <= amsMs(r.d, r.van)) eind += 864e5; }
            const extern = String(uid).startsWith("n_");
            if (!extern && nuMs > eind + 30 * 60e3 && !verstuurd[`uit-mw:${x.id}`]) {
              berichten.push({ titel: "⏰ Vergeten uit te klokken?", tekst: `Je bent sinds ${amsTijd(x.in)} ingeklokt${r ? ` (dienst tot ${r.tot})` : ""}. Klok uit in de app.`, tag: "uit-" + x.id, url: "./#uren", aan: "uid:" + uid });
              nieuw.push(`uit-mw:${x.id}`);
            }
            if (nuMs > eind + 90 * 60e3 && !inStil && !verstuurd[`uit-bh:${x.id}`]) {
              berichten.push({ titel: `⏰ ${urenNaam(uid)} nog ingeklokt`, tekst: `Sinds ${amsTijd(x.in)}${r ? ` · dienst tot ${r.tot}` : ""}. Vergeten uit te klokken?`, tag: "uitb-" + x.id, url: "./#uren", aan: "beheer" });
              nieuw.push(`uit-bh:${x.id}`);
            }
          }
        }
        // ---- 10.17 checklist niet af ----
        const cl = haal("checklists");
        for (const l of Object.values(cl.lijsten || {})) {
          if (!l || typeof l !== "object" || l.weg || !l.tijd) continue;
          const [ch, cm] = String(l.tijd).split(":").map(Number);
          if (!(uur * 60 + minuut >= ch * 60 + cm) || uur >= 23) continue;
          const taken = (l.taken || []).filter((t) => t && t.id), af = ((cl.dag || {})[vandaag] || {})[l.id] || {};
          const mis = taken.filter((t) => !af[t.id]);
          if (taken.length && mis.length && !verstuurd[`cl:${l.id}:${vandaag}`]) {
            berichten.push({ titel: `✅ ${l.naam || "Checklist"} nog niet af`, tekst: `${taken.length - mis.length} van ${taken.length} gedaan · nog: ${mis.slice(0, 3).map((t) => t.t).join(", ")}${mis.length > 3 ? " …" : ""}`, tag: "cl-" + l.id, url: "./#checklists", aan: "beheer" });
            nieuw.push(`cl:${l.id}:${vandaag}`);
          }
        }
      }

      let n = 0;
      const dood = new Set(); // aanmeldingen die niet meer bestaan (app verwijderd, nieuwe telefoon)
      for (const b of berichten) {
        const doel = b.aan === "levering" ? [...toestellen, ...teamToestellen]
          : String(b.aan).startsWith("uid:") ? (team.subs || []).filter((t) => t.uid === String(b.aan).slice(4))
          : toestellen;
        const gezien = new Set();
        for (const t of doel) {
          if (gezien.has(t.endpoint)) continue; gezien.add(t.endpoint);
          try { await webpush.sendNotification({ endpoint: t.endpoint, keys: t.keys }, JSON.stringify({ titel: winkel.meer ? `${b.titel} – ${winkel.naam}` : b.titel, tekst: b.tekst, tag: b.tag, url: b.url }), { TTL: 3600 }); n++; }
          catch (e) { console.log("push mislukt", e?.statusCode || e); if (e?.statusCode === 404 || e?.statusCode === 410) dood.add(t.endpoint); }
        }
      }
      if (dood.size) {
        const ruim = async (sleutel, rij) => {
          if (!(rij.subs || []).some((x) => dood.has(x.endpoint))) return;
          const w = { ...rij, subs: rij.subs.filter((x) => !dood.has(x.endpoint)), _rev: (Number(rij._rev) || 0) + 1 };
          await metW(sb.from("app_data").update({ waarde: w, bijgewerkt: new Date().toISOString() })).eq("sleutel", sleutel);
        };
        await ruim("prive:push", push); await ruim("pushteam", team);
        console.log("opgeruimd:", dood.size);
      }
      if (nieuw.length) {
        const nu = Date.now();
        for (const k of nieuw) verstuurd[k] = nu;
        for (const [k, t] of Object.entries(verstuurd)) if (nu - t > 14 * 864e5) delete verstuurd[k];
        await sb.from("app_data").upsert(winkel.id ? { winkel: winkel.id, sleutel: "prive:pushlog", waarde: { verstuurd } } : { sleutel: "prive:pushlog", waarde: { verstuurd } }, { onConflict: winkel.id ? "winkel,sleutel" : "sleutel" });
      }
      return n;
    }
  } catch (e) {
    return antwoord({ ok: false, fout: String(e?.message || e) }, 500);
  }
});
}
