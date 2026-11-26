// Brood Opzet – kassaverkoop uit Coop Besteladvies ophalen via de server (Supabase Edge Function "verkoop"). 10.61.
// Alleen voor een gekoppeld toestel van de winkel (JWT + mijn_winkels). Adres en koppelcode staan als geheimen VERKOOP_URL en VERKOOP_SLEUTEL in Supabase, nooit op de toestellen.
export function start(createClient) {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "GET, OPTIONS" };
  const js = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    try {
      const q = new URL(req.url).searchParams, tk = String(req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      const URL_ = Deno.env.get("SUPABASE_URL"), sb = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
      const user = tk.split(".").length === 3 ? (await sb.auth.getUser(tk)).data?.user : null;
      if (!user) return js({ ok: false, fout: "Niet gekoppeld" }, 401);
      const w = String(q.get("winkel") || ""), mijn = (await createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: "Bearer " + tk } } }).rpc("mijn_winkels")).data || [];
      if (w ? !mijn.some((x) => x.id === w) : !mijn.length) return js({ ok: false, fout: "Geen toegang" }, 403);
      const adres = Deno.env.get("VERKOOP_URL"), sleutel = Deno.env.get("VERKOOP_SLEUTEL");
      if (!adres || !sleutel) return js({ ok: false, fout: "Nog niet ingesteld" }, 503);
      const doel = new URL(adres), plu = String(q.get("plu") || "");
      if (/^[0-9,]{1,4000}$/.test(plu)) doel.searchParams.set("plu", plu);
      const r = await fetch(doel, { headers: { "x-sleutel": sleutel }, redirect: "error" });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d || !d.ok) return js({ ok: false, fout: "Kassaverkoop ophalen lukte niet" }, 502);
      return js({ ok: true, dagen: d.dagen || {} });
    } catch (_) { return js({ ok: false, fout: "Kassaverkoop ophalen lukte niet" }, 500); }
  });
}
