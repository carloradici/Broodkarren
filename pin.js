// Brood Opzet – pincodes controleren en opslaan op de server (Supabase Edge Function "pin"). 10.60.
// Pincodes staan sterk versleuteld (PBKDF2) in tabel pin_geheim, die alleen deze functie kan lezen. Toestellen krijgen geen pincodes meer.
// Acties: check {uid,pin} · zet {uid,pin,oud} (eigen pincode, of beheerder zonder oud) · migreer (beheerder: oude pincodes eenmalig overnemen).
export function start(createClient) {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
  const js = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
  const B = (b) => btoa(String.fromCharCode(...new Uint8Array(b))), UB = (t) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
  const fnv = (pin, zout) => { let h = 2166136261; for (const c of zout + ":" + pin) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const kdf = async (pin, zout) => crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: zout, iterations: 100000 }, await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]), 256);
  const maak = async (pin) => { const z = crypto.getRandomValues(new Uint8Array(16)); return "p2:" + B(z) + ":" + B(await kdf(pin, z)); };
  const klopt = async (h, pin, uid) => { if (!h) return false; if (h.startsWith("fnv:")) return h.slice(4) === fnv(pin, uid); const [, z, x] = h.split(":"); return B(await kdf(pin, UB(z))) === x; };
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return js({ ok: false, fout: "alleen POST" }, 405);
    try {
      const body = await req.json().catch(() => ({})), tk = String(req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      if (body.doe === "controle") return js({ ok: true, controle: true });
      const URL_ = Deno.env.get("SUPABASE_URL"), sb = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
      const user = tk.split(".").length === 3 ? (await sb.auth.getUser(tk)).data?.user : null;
      if (!user) return js({ ok: false, fout: "niet gekoppeld" }, 401);
      const w = String(body.winkel || ""), mijn = await createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: "Bearer " + tk } } }).rpc("mijn_winkels");
      if (!w || !(mijn.data || []).some((x) => x.id === w)) return js({ ok: false, fout: "geen toegang tot deze winkel" }, 403);
      const beheer = !!(await sb.from("beheerders").select("user_id").eq("user_id", user.id).maybeSingle()).data;
      const rij = async (uid) => { const r = await sb.from("pin_geheim").select("*").eq("winkel", w).eq("uid", uid).maybeSingle(); if (r.error) throw r.error; return r.data; };
      const bewaar = async (o) => { const r = await sb.from("pin_geheim").upsert({ winkel: w, t: new Date().toISOString(), ...o }); if (r.error) throw r.error; };
      const oudeHash = async (uid) => { const a = (await sb.from("app_data").select("sleutel,waarde").eq("winkel", w).in("sleutel", ["beheer:gebruikers", "pins"])).data || [];
        const get = (k) => (a.find((r) => r.sleutel === k) || {}).waarde || {}, g = (get("beheer:gebruikers").lijst || []).find((x) => x.id === uid), p = get("pins")[uid];
        return g ? (g.rol !== "admin" && p && p.pin && p.t > (g.pinT || 0) ? p.pin : g.pin) || null : null; };
      const check = async (uid, pin) => {
        let r = await rij(uid); const nu = Date.now();
        if (r?.slot && new Date(r.slot).getTime() > nu) return { ok: false, wacht: Math.ceil((new Date(r.slot).getTime() - nu) / 1000) };
        let h = r?.hash; if (!h) { const o = await oudeHash(uid); h = o ? "fnv:" + o : null; }
        if (!h) return { ok: false, fout: "geen pincode" };
        if (await klopt(h, String(pin || ""), uid)) { await bewaar({ uid, hash: h.startsWith("p2:") ? h : await maak(String(pin)), fout: 0, slot: null }); return { ok: true }; }
        const f = (r?.fout || 0) + 1; await bewaar({ uid, hash: r?.hash || h, fout: f >= 5 ? 0 : f, slot: f >= 5 ? new Date(nu + 300000).toISOString() : null });
        return f >= 5 ? { ok: false, wacht: 300 } : { ok: false, over: 5 - f };
      };
      if (body.doe === "check") return js(await check(String(body.uid || ""), body.pin));
      if (body.doe === "zet") {
        const uid = String(body.uid || ""), pin = String(body.pin || "");
        if (!/^\d{4}$/.test(pin)) return js({ ok: false, fout: "Pincode moet 4 cijfers zijn" });
        if (!(beheer && body.oud == null)) { if (pin === String(body.oud)) return js({ ok: false, fout: "zelfde" }); const c = await check(uid, body.oud); if (!c.ok) return js(c); }
        await bewaar({ uid, hash: await maak(pin), fout: 0, slot: null }); return js({ ok: true });
      }
      if (body.doe === "migreer") {
        if (!beheer) return js({ ok: false, fout: "alleen voor de beheerder" }, 403);
        const a = (await sb.from("app_data").select("sleutel,waarde").eq("winkel", w).in("sleutel", ["beheer:gebruikers", "pins"])).data || [];
        const gs = ((a.find((r) => r.sleutel === "beheer:gebruikers") || {}).waarde || {}).lijst || [], q = await sb.from("pin_geheim").select("uid").eq("winkel", w); if (q.error) throw q.error; const al = new Set((q.data || []).map((r) => r.uid));
        let n = 0; for (const g of gs) { if (al.has(g.id)) continue; const o = await oudeHash(g.id); if (o) { await bewaar({ uid: g.id, hash: "fnv:" + o, fout: 0 }); n++; } }
        return js({ ok: true, n });
      }
      return js({ ok: false, fout: "onbekende actie" }, 400);
    } catch (e) { return js({ ok: false, fout: String(e?.message || e) }, 500); }
  });
}
