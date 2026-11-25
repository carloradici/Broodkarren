// Veiligheidstest: probeert als buitenstaander (alleen openbare gegevens uit de repo) bij Brood Opzet te komen. Meldt alleen goed/fout, nooit gegevens.
import { createClient } from '@supabase/supabase-js';
const U = 'https://dmvutkvpnoeenybznskz.supabase.co', K = 'sb_publishable_bWdFBTPWPSK9nLo3UDZn5w_6uvDQ_eu';
let fout = 0;
const ok = (t, goed, info = '') => { console.log(`::${goed ? 'notice' : 'error'} title=${goed ? '✓' : '✗'} ${t}::${info}`); if (!goed) fout++; };
const leeg = async (t, p) => { try { const r = await p; ok(t, !!r.error || !(r.data || []).length, r.error ? 'geweigerd' : `${(r.data || []).length} rijen`); } catch (e) { ok(t, true, 'geweigerd'); } };
const fn = async (t, pad, init, verwacht) => { const r = await fetch(`${U}/functions/v1/${pad}`, { ...init, headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', ...(init?.headers || {}) } }); ok(t, verwacht.includes(r.status), 'antwoord ' + r.status); };
for (const [wie, sb] of [['zonder account', createClient(U, K, { auth: { persistSession: false } })], ['anoniem account zonder koppelcode', null]]) {
  let c = sb;
  if (!c) { c = createClient(U, K, { auth: { persistSession: false } }); const r = await c.auth.signInAnonymously(); if (r.error) { ok('anoniem account maken', true, 'staat uit'); continue; } }
  await leeg(`${wie}: app_data lezen`, c.from('app_data').select('sleutel').limit(5));
  await leeg(`${wie}: privé-gegevens lezen`, c.from('app_data').select('sleutel').like('sleutel', 'prive:%').limit(5));
  await leeg(`${wie}: beheerders lezen`, c.from('beheerders').select('user_id').limit(5));
  await leeg(`${wie}: winkels lezen`, c.from('winkels').select('id').limit(5));
  const w = await c.from('app_data').insert({ sleutel: 'veiligheidstest', waarde: {} }); ok(`${wie}: app_data schrijven`, !!w.error, w.error ? 'geweigerd' : 'GELUKT');
  if (!w.error) await c.from('app_data').delete().eq('sleutel', 'veiligheidstest');
  await leeg(`${wie}: retourbonnen (opslag) bekijken`, c.storage.from('retour').list('', { limit: 5 }));
  const d = await c.storage.from('retour').upload('veiligheidstest.jpg', new Blob(['x'], { type: 'image/jpeg' })); ok(`${wie}: retourbon uploaden`, !!d.error, d.error ? 'geweigerd' : 'GELUKT');
  if (!d.error) await c.storage.from('retour').remove(['veiligheidstest.jpg']);
  try { const r = await c.rpc('mijn_winkels'); ok(`${wie}: mijn_winkels`, !!r.error || !(r.data || []).length, r.error ? 'geweigerd' : `${(r.data || []).length} winkels`); } catch (e) { ok(`${wie}: mijn_winkels`, true, 'geweigerd'); }
  try { const r = await c.rpc('gebruik_koppelcode', { c: 'AAAAAAAA', t: 'veiligheidstest' }); ok(`${wie}: verzonnen koppelcode`, !!r.error || !r.data, r.error ? 'geweigerd' : 'antwoord zonder fout'); } catch (e) { ok(`${wie}: verzonnen koppelcode`, true, 'geweigerd'); }
  await c.auth.signOut();
}
await fn('stuur-push: testmelding zonder beheerder', 'stuur-push', { method: 'POST', body: '{"test":true}' }, [403]);
await fn('stuur-push: nep "Nieuwe versie"', 'stuur-push', { method: 'POST', body: '{"soort":"update","versie":"99.99"}' }, [400]);
await fn('brood-export zonder koppelcode', 'brood-export', {}, [401]);
await fn('brood-export met verzonnen koppelcode', 'brood-export', { headers: { 'x-sleutel': 'verzonnen' } }, [401]);
await fn('factuur-in met verzonnen code', 'factuur-in', { method: 'POST', headers: { 'x-code': 'verzonnen-code-1234567890', 'x-test': '1' } }, [401]);
console.log(fout ? `${fout} keer fout` : 'alles dicht'); process.exit(fout ? 1 : 0);
