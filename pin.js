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
  // 10.63: persoonsbewijs (12 uur) na een goede pincode; daarmee haalt een medewerker zijn eigen privégesprek op en schrijft erin.
  const enc = new TextEncoder(), b64u = (b) => B(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), ub64u = (t) => UB(t.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - t.length % 4) % 4));
  let HK; const hk = async () => HK ??= await crypto.subtle.importKey("raw", enc.encode((Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "") + ":persoonsbewijs"), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  const maakBewijs = async (w, u) => { const p = b64u(enc.encode(JSON.stringify({ w, u, exp: Date.now() + 12 * 3600e3 }))); return p + "." + b64u(await crypto.subtle.sign("HMAC", await hk(), enc.encode(p))); };
  const leesBewijs = async (t, w) => { try { const [p, s] = String(t || "").split("."); if (!p || !s || !(await crypto.subtle.verify("HMAC", await hk(), ub64u(s), enc.encode(p)))) return null; const o = JSON.parse(new TextDecoder().decode(ub64u(p))); return o.w === w && o.exp > Date.now() ? String(o.u) : null; } catch (_) { return null; } };
  const VELD = ["van", "uid", "t", "tekst", "foto", "audio", "antw", "gew", "weg", "link", "noem"], MEDIA = /^c[ma][a-z0-9]{2,40}$/i;
  const VEILIG = /^data:(image\/(jpeg|png|webp|gif)|audio\/[\w.+-]+)(;[\w=.+-]+)*;base64,[A-Za-z0-9+/=\s]*$/;
  const schoon = (m) => { const o = {}; for (const k of VELD) if (m[k] != null) o[k] = typeof m[k] === "string" ? m[k].slice(0, 4000) : typeof m[k] === "number" || typeof m[k] === "boolean" ? m[k] : Array.isArray(m[k]) ? m[k].slice(0, 20).map(String) : undefined; if (o.foto && !MEDIA.test(o.foto)) delete o.foto; if (o.audio && !MEDIA.test(o.audio)) delete o.audio; return o; };
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
        let p = await sb.rpc("pin_poging", { w, u: uid });
        if (p.error) { // overgang: SQL-functie pin_poging bestaat nog niet → oude telling (lezen en schrijven)
          const r0 = await rij(uid), nu = Date.now();
          if (r0?.slot && new Date(r0.slot).getTime() > nu) p = { data: { wacht: Math.ceil((new Date(r0.slot).getTime() - nu) / 1000) } };
          else { const f = (r0?.fout || 0) + 1; await bewaar({ uid, hash: r0?.hash ?? null, fout: f >= 5 ? 0 : f, slot: f >= 5 ? new Date(nu + 300000).toISOString() : null }); p = { data: f >= 5 ? { laatste: true, duur: 300 } : { over: 5 - f } }; }
        }
        const pg = p.data || {};
        if (pg.wacht) return { ok: false, wacht: pg.wacht };
        const r = await rij(uid); let h = r?.hash; if (!h) { const o = await oudeHash(uid); h = o ? "fnv:" + o : null; }
        if (h && await klopt(h, String(pin || ""), uid)) { await bewaar({ uid, hash: h.startsWith("p2:") ? h : await maak(String(pin)), fout: 0, slot: null }); await sb.from("pin_geheim").update({ blok: 0 }).eq("winkel", w).eq("uid", uid); return { ok: true, bewijs: await maakBewijs(w, uid) }; }
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
      if (/^uren/.test(body.doe)) { // 10.64: eigen uren (prive:uren), alleen met een geldig persoonsbewijs; tijden moeten 'nu' zijn (±10 min)
        const u = await leesBewijs(body.bewijs, w); if (!u) return js({ ok: false, fout: "log opnieuw in" }, 401);
        const lk = async (k) => { const r = await sb.from("app_data").select("waarde").eq("winkel", w).eq("sleutel", k).maybeSingle(); if (r.error) throw r.error; return r.data?.waarde || null; };
        const zonder = (o) => { const { _rev, ...x } = o || {}; return x; };
        if (body.doe === "uren") { const pv = zonder(await lk("prive:uren")), src = pv.d ? pv : zonder(await lk("uren")); return js({ ok: true, d: (src.d || {})[u] || {} }); }
        if (body.doe === "urenZet") {
          const c = body.d && typeof body.d === "object" ? body.d : {}, gl = (zonder(await lk("beheer:gebruikers")).lijst || []), naam = (gl.find((g) => g.id === u) || {}).naam || "?";
          for (let i = 0; i < 6; i++) {
            const oud = await lk("prive:uren"), rev = oud?._rev ?? null, alle = zonder(oud);
            if (!alle.d) { const leg = zonder(await lk("uren")); alle.d = leg.d || {}; alle.corr = leg.corr || {}; alle.goed = leg.goed || {}; }
            const ds = alle.d[u] = alle.d[u] && typeof alle.d[u] === "object" ? alle.d[u] : {}, nu = Date.now(), ok = (t) => typeof t === "number" && Math.abs(t - nu) < 600000;
            for (const [id, x] of Object.entries(c)) { if (!x || typeof x !== "object" || !/^[\w-]{1,40}$/.test(id)) continue; const o = ds[id];
              if (!o) { if (ok(x.in) && !Object.values(ds).some((y) => y && y.in && !y.uit)) ds[id] = { id, in: x.in, p: {}, wie: naam }; continue; }
              if (!o.uit) { for (const [pid, q] of Object.entries(x.p && typeof x.p === "object" ? x.p : {})) { if (!q || !/^[\w-]{1,40}$/.test(pid)) continue; o.p = o.p && typeof o.p === "object" ? o.p : {}; const op = o.p[pid];
                  if (!op) { if (ok(q.van)) o.p[pid] = { van: q.van, ...(q.tot && ok(q.tot) && q.tot > q.van ? { tot: q.tot } : {}) }; } else if (!op.tot && q.tot && ok(q.tot) && q.tot > op.van) op.tot = q.tot; }
                if (x.uit && ok(x.uit) && x.uit > o.in) o.uit = x.uit; } }
            const nw = { ...alle, _rev: (rev || 0) + 1 }, nt = new Date().toISOString();
            if (!oud) { const r = await sb.from("app_data").insert({ winkel: w, sleutel: "prive:uren", waarde: nw, bijgewerkt: nt }); if (!r.error) return js({ ok: true, d: ds }); if (r.error.code !== "23505") throw r.error; continue; }
            let q = sb.from("app_data").update({ waarde: nw, bijgewerkt: nt }).eq("winkel", w).eq("sleutel", "prive:uren"); q = rev == null ? q.is("waarde->>_rev", null) : q.eq("waarde->>_rev", String(rev));
            const r = await q.select("sleutel"); if (r.error) throw r.error; if (r.data?.length) return js({ ok: true, d: ds });
          }
          return js({ ok: false, fout: "bezet, probeer opnieuw" }, 409);
        }
      }
      if (/^chat/.test(body.doe)) { // 10.63: eigen privégesprek (prive:chat), alleen met een geldig persoonsbewijs
        const u = await leesBewijs(body.bewijs, w); if (!u) return js({ ok: false, fout: "log opnieuw in" }, 401);
        const id = "p_" + u, lk = async (k) => { const r = await sb.from("app_data").select("waarde").eq("winkel", w).eq("sleutel", k).maybeSingle(); if (r.error) throw r.error; return r.data?.waarde || null; };
        const zonder = (o) => { const { _rev, ...x } = o || {}; return x; }, gesprek = async () => zonder(await lk("prive:chat"))[id] || (zonder(await lk("berichten")))[id] || null;
        if (body.doe === "chat") return js({ ok: true, b: await gesprek() });
        if (body.doe === "chatFoto") { const b = await gesprek(), mid = String(body.id || ""); if (!b || !Object.values(b.r || {}).some((m) => m && (m.foto === mid || m.audio === mid))) return js({ ok: false }, 403);
          const f = (await lk("prive:notfoto:" + mid)) || (await lk("notfoto:" + mid)); return js({ ok: true, data: f?.data || null }); }
        if (body.doe === "chatFotoZet") { const mid = String(body.id || ""), d = String(body.data || ""); if (!MEDIA.test(mid) || !VEILIG.test(d) || d.length > 1400000) return js({ ok: false }, 400);
          if (await lk("prive:notfoto:" + mid)) return js({ ok: true }); const r = await sb.from("app_data").insert({ winkel: w, sleutel: "prive:notfoto:" + mid, waarde: { data: d }, bijgewerkt: new Date().toISOString() }); if (r.error && r.error.code !== "23505") throw r.error; return js({ ok: true }); }
        if (body.doe === "chatZet") {
          const c = body.b; if (!c || c.id !== id) return js({ ok: false }, 400);
          for (let i = 0; i < 6; i++) {
            const oud = await lk("prive:chat"), rev = oud?._rev ?? null, alle = zonder(oud), leg = alle[id] ? null : (zonder(await lk("berichten")))[id];
            const s = JSON.parse(JSON.stringify(alle[id] || leg || { id, van: String(c.van || ""), uid: u, t: Date.now(), r: {}, lees: {} })); s.r = s.r && typeof s.r === "object" ? s.r : {}; let nieuw = false;
            for (const [mid, m] of Object.entries(c.r || {})) { if (!m || typeof m !== "object" || !/^[\w-]{1,40}$/.test(mid)) continue; const o = s.r[mid];
              if (!o) { if (m.uid === u && !m.beheer) { s.r[mid] = { ...schoon(m), uid: u }; nieuw = true; } } else if (o.uid === u && !o.beheer) s.r[mid] = { ...o, ...schoon(m), uid: u, t: o.t }; }
            s.lees = { ...(s.lees || {}), [u]: Number(c.lees?.[u]) || s.lees?.[u] || 0 }; if (c.demp && typeof c.demp === "object") s.demp = { ...(s.demp || {}), [u]: !!c.demp[u] };
            if (nieuw) { s.gelezen = false; s.nieuwM = false; delete s.arch; } s.uid = u; alle[id] = s;
            const nw = { ...alle, _rev: (rev || 0) + 1 }, nu = new Date().toISOString();
            if (!oud) { const r = await sb.from("app_data").insert({ winkel: w, sleutel: "prive:chat", waarde: nw, bijgewerkt: nu }); if (!r.error) return js({ ok: true, b: s }); if (r.error.code !== "23505") throw r.error; continue; }
            let q = sb.from("app_data").update({ waarde: nw, bijgewerkt: nu }).eq("winkel", w).eq("sleutel", "prive:chat"); q = rev == null ? q.is("waarde->>_rev", null) : q.eq("waarde->>_rev", String(rev));
            const r = await q.select("sleutel"); if (r.error) throw r.error; if (r.data?.length) return js({ ok: true, b: s });
          }
          return js({ ok: false, fout: "bezet, probeer opnieuw" }, 409);
        }
      }
      return js({ ok: false, fout: "onbekende actie" }, 400);
    } catch (e) { return js({ ok: false, fout: (console.log(e), "er ging iets mis") }, 500); }
  });
}
