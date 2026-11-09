// Brood Opzet – gegevens voor Coop Besteladvies (Supabase Edge Function "brood-export"). Alleen lezen.
// Supabase heeft alleen een korte stub die dit bestand van GitHub haalt. Bijwerken = uploaden + Deploy.
export function start(createClient, SLEUTEL) {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-sleutel", "Access-Control-Allow-Methods": "GET, OPTIONS" };
  const js = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
  const vandaag = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date());
  const plus = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (!SLEUTEL || req.headers.get("x-sleutel") !== SLEUTEL) return js({ ok: false, fout: "Verkeerde koppelcode" }, 401);
    try {
      const sb = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
      const nu = vandaag(), van = plus(nu, -63), wq = new URL(req.url).searchParams.get("winkel");
      const a = await sb.from("app_data").select("sleutel,waarde,winkel").in("sleutel", ["instellingen", "voorraad"]);
      const b = await sb.from("app_data").select("sleutel,waarde,winkel").gte("sleutel", "dag:" + van).lte("sleutel", "dag:9");
      if (a.error || b.error) throw a.error || b.error;
      const per = {};
      for (const r of [...a.data, ...b.data]) (per[r.winkel ?? ""] ??= { n: 0, rows: [] }).rows.push(r);
      for (const w of Object.values(per)) w.n = w.rows.filter((r) => r.sleutel.startsWith("dag:")).length + (w.rows.some((r) => r.sleutel === "instellingen") ? 1e6 : 0);
      const wk = wq != null && per[wq] ? wq : Object.keys(per).sort((x, y) => per[y].n - per[x].n)[0];
      const rows = per[wk]?.rows || [], get = (k) => rows.find((r) => r.sleutel === k)?.waarde || {};
      const soorten = (get("instellingen").soorten || []).filter((s) => s.type !== "vers" && (s.naam || "").trim()).map((s) => ({ id: s.id, naam: s.naam.trim(), plu: s.plu || "", perDoos: s.perDoos || null }));
      const ids = new Set(soorten.map((s) => s.id)), dagen = {}, uit = [];
      const kies = (o) => { const r = {}; for (const [k, v] of Object.entries(o || {})) if (ids.has(k) && v != null) r[k] = +v || 0; return r; };
      for (const r of rows) {
        if (!r.sleutel.startsWith("dag:")) continue; const d = r.sleutel.slice(4), v = r.waarde || {};
        dagen[d] = { g: kies(v.historie?.gezet), o: kies(v.derving), afw: !!v.historie?.afw };
        for (const m of Object.values(v.vinkjes || {})) for (const [id, x] of Object.entries(m || {})) if (ids.has(id) && x) uit.push([id, +x.t || 0, +x.n || 0]);
        for (const x of Object.values(v.bijbak || {})) for (const i of (Array.isArray(x?.items) ? x.items : x?.soort ? [{ soort: x.soort, n: x.n }] : [])) if (ids.has(i.soort)) uit.push([i.soort, +x.t || 0, +i.n || 0]);
      }
      const voorraad = {};
      for (const [id, v] of Object.entries(get("voorraad"))) if (ids.has(id) && v && v.basis != null) voorraad[id] = { n: uit.reduce((n, [i, t, a]) => i === id && t > v.t ? n - a : n, +v.basis), geteld: v.t };
      return js({ ok: true, nu, winkel: wk || null, soorten, dagen, voorraad });
    } catch (e) { return js({ ok: false, fout: String(e?.message || e) }, 500); }
  });
}
