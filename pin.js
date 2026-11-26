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
      const beheer = ((mijn.data || []).find((x) => x.id === w) || {}).rol !== "winkel"; // 10.62: beheer per winkel, zoals in de app
      const rij = async (uid) => { const r = await sb.from("pin_geheim").select("*").eq("winkel", w).eq("uid", uid).maybeSingle(); if (r.error) throw r.error; return r.data; };
      const bewaar = async (o) => { const r = await sb.from("pin_geheim").upsert({ winkel: w, t: new Date().toISOString(), ...o }); if (r.error) throw r.error; };
      const gemigreerd = !!(await rij("__migratie")); // 10.62: na de omzetting geen terugval meer op oude pincodes uit de app-gegevens
      const oudeHash = async (uid) => { if (gemigreerd) return null; const a = (await sb.from("app_data").select("sleutel,waarde").eq("winkel", w).in("sleutel", ["beheer:gebruikers", "pins"])).data || [];
        const get = (k) => (a.find((r) => r.sleutel === k) || {}).waarde || {}, g = (get("beheer:gebruikers").lijst || []).find((x) => x.id === uid), p = get("pins")[uid];
        return g ? (g.rol !== "admin" && p && p.pin && p.t > (g.pinT || 0) ? p.pin : g.pin) || null : null; };
      // 10.62: elke poging wordt eerst in één stap geteld in de database (pin_poging, met rijslot), pas daarna gecontroleerd. Slot: 5, 10, 20 … min, max 24 uur.
      const check = async (uid, pin) => {
        const p = await sb.rpc("pin_poging", { w, u: uid }); if (p.error) throw p.error; const pg = p.data || {};
        if (pg.wacht) return { ok: false, wacht: pg.wacht };
        const r = await rij(uid); let h = r?.hash; if (!h) { const o = await oudeHash(uid); h = o ? "fnv:" + o : null; }
        if (h && await klopt(h, String(pin || ""), uid)) { await bewaar({ uid, hash: h.startsWith("p2:") ? h : await maak(String(pin)), fout: 0, slot: null, blok: 0 }); return { ok: true }; }
        if (pg.laatste) { await sb.from("app_data").upsert({ winkel: w, sleutel: "prive:pinslot", waarde: { uid, t: Date.now() } }, { onConflict: "winkel,sleutel" }); return { ok: false, wacht: pg.duur || 300 }; }
        return h ? { ok: false, over: pg.over } : { ok: false, fout: "geen pincode" };
      };
      if (body.doe === "check") return js(await check(String(body.uid || ""), body.pin));
      if (body.doe === "zet") {
        const uid = String(body.uid || ""), pin = String(body.pin || "");
        if (!/^\d{4}$/.test(pin)) return js({ ok: false, fout: "Pincode moet 4 cijfers zijn" });
        const isEigenaar = async () => { const a = (await sb.from("app_data").select("waarde").eq("winkel", w).eq("sleutel", "beheer:gebruikers").maybeSingle()).data; return ((a?.waarde?.lijst) || []).some((g) => g.id === uid && g.rol === "admin"); };
        if (!(beheer && body.oud == null && !(await isEigenaar()))) { if (pin === String(body.oud)) return js({ ok: false, fout: "zelfde" }); const c = await check(uid, body.oud); if (!c.ok) return js(c); }
        await bewaar({ uid, hash: await maak(pin), fout: 0, slot: null }); return js({ ok: true });
      }
      if (body.doe === "migreer") {
        if (!beheer) return js({ ok: false, fout: "alleen voor de beheerder" }, 403);
        const a = (await sb.from("app_data").select("sleutel,waarde").eq("winkel", w).in("sleutel", ["beheer:gebruikers", "pins"])).data || [];
        const gs = ((a.find((r) => r.sleutel === "beheer:gebruikers") || {}).waarde || {}).lijst || [], q = await sb.from("pin_geheim").select("uid").eq("winkel", w); if (q.error) throw q.error; const al = new Set((q.data || []).map((r) => r.uid));
        let n = 0; for (const g of gs) { if (al.has(g.id)) continue; const o = await oudeHash(g.id); if (o) { await bewaar({ uid: g.id, hash: "fnv:" + o, fout: 0 }); n++; } }
        await bewaar({ uid: "__migratie", hash: null }); return js({ ok: true, n });
      }
      return js({ ok: false, fout: "onbekende actie" }, 400);
    } catch (e) { return js({ ok: false, fout: (console.log(e), "er ging iets mis") }, 500); }
  });
}
