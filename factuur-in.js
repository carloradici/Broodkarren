// Brood Opzet – factuur ontvangen via de iPhone-opdracht "Naar Brood Opzet" (Supabase Edge Function "factuur-in").
// 10.18: wordt door de korte factuur-in in Supabase opgehaald van GitHub. Bijwerken = dit bestand uploaden en in Supabase op Deploy tikken.
export function start(createClient) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-code, x-test, x-naam",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  const antwoord = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
  const MAX = 8 * 1024 * 1024;
  const soortVan = (b, ct) => {
    if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
    if (b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
    const ftyp = String.fromCharCode(...b.slice(4, 12));
    if (ftyp.startsWith("ftyphei") || ftyp.startsWith("ftypmif") || ftyp.startsWith("ftyphe")) return "image/heic";
    if (/pdf|image\//i.test(ct || "")) return String(ct).split(";")[0].trim();
    return "";
  };
  const b64 = (b) => { let s = ""; for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768)); return btoa(s); };
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return antwoord({ ok: false, fout: "alleen POST" }, 405);
    try {
      const code = String(req.headers.get("x-code") || "").trim();
      if (code.length < 16) return antwoord({ ok: false, fout: "code ontbreekt" }, 401);
      const sb = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
      const { data: rijen, error } = await sb.from("app_data").select("winkel,waarde").eq("sleutel", "prive:betalen");
      if (error) throw error;
      const rij = (rijen || []).find((r) => r.waarde && r.waarde.inst && r.waarde.inst.code === code);
      if (!rij) return antwoord({ ok: false, fout: "onbekende code" }, 401);
      if (req.headers.get("x-test")) return antwoord({ ok: true, test: true });
      const bestanden = [];
      const ct = req.headers.get("content-type") || "";
      if (/multipart\/form-data/i.test(ct)) {
        const fd = await req.formData();
        for (const [, v] of fd.entries()) if (v && typeof v === "object" && "arrayBuffer" in v) bestanden.push({ b: new Uint8Array(await v.arrayBuffer()), ct: v.type, naam: v.name || "" });
      } else bestanden.push({ b: new Uint8Array(await req.arrayBuffer()), ct, naam: req.headers.get("x-naam") || "" });
      let n = 0;
      for (const f of bestanden) {
        if (!f.b.length) continue;
        if (f.b.length > MAX) return antwoord({ ok: false, fout: "bestand te groot (max 8 MB)" }, 413);
        const soort = soortVan(f.b, f.ct);
        if (!soort) return antwoord({ ok: false, fout: "alleen PDF of foto" }, 415);
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const w = { data: `data:${soort};base64,${b64(f.b)}`, naam: String(f.naam).slice(0, 80), t: Date.now(), _rev: 1 };
        const rec = rij.winkel ? { winkel: rij.winkel, sleutel: "prive:tbin:" + id, waarde: w, bijgewerkt: new Date().toISOString() } : { sleutel: "prive:tbin:" + id, waarde: w, bijgewerkt: new Date().toISOString() };
        const { error: e2 } = await sb.from("app_data").upsert(rec, { onConflict: rij.winkel ? "winkel,sleutel" : "sleutel" });
        if (e2) throw e2;
        n++;
      }
      if (!n) return antwoord({ ok: false, fout: "geen bestand ontvangen" }, 400);
      return antwoord({ ok: true, ontvangen: n });
    } catch (e) {
      return antwoord({ ok: false, fout: String(e?.message || e) }, 500);
    }
  });
}
