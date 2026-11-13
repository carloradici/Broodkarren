// Brood Opzet – bestelboek van de leverancier ophalen bij Reto (Supabase Edge Function "bestelboek").
// De telefoon mag de pdf niet rechtstreeks laden (andere website); deze functie haalt hem op en geeft hem door.
// Bijwerken = dit bestand op GitHub zetten en in Supabase op Deploy tikken.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
export const urls = week => [...new Set([String(+week), String(+week).padStart(2, '0')])].map(w => `https://static.reto.media/ordervantolversuniecom/bestelboeken/bestelboek-wk-${w}.pdf`);
export async function haal(week, f = fetch) {
  week = +week; if (!(week >= 1 && week <= 53)) return { status: 400, fout: 'Ongeldige week' };
  for (const u of urls(week)) {
    try { const r = await f(u); if (r.ok) { const b = new Uint8Array(await r.arrayBuffer()); if (b.length > 1000 && b[0] === 0x25 && b[1] === 0x50) return { status: 200, pdf: b, url: u }; } } catch (e) { }
  }
  return { status: 404, fout: `Bestelboek week ${week} staat nog niet online` };
}
export function start() {
  Deno.serve(async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    const r = await haal(new URL(req.url).searchParams.get('week'));
    if (r.pdf) return new Response(r.pdf, { headers: { ...CORS, 'Content-Type': 'application/pdf', 'X-Bron': r.url } });
    return new Response(JSON.stringify({ fout: r.fout }), { status: r.status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });
  });
}
