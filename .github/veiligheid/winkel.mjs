// Veiligheidstest als winkeltoestel: koppelt met een eenmalige koppelcode een toestel "veiligheidstest" en probeert wat een handige medewerker zou proberen.
// Meldt alleen goed/fout, nooit gegevens. Schrijft alleen eigen proefsleutels en ruimt die op. Verwijder daarna het toestel "veiligheidstest" in de app.
import { createClient } from '@supabase/supabase-js';
const U = 'https://dmvutkvpnoeenybznskz.supabase.co', K = 'sb_publishable_bWdFBTPWPSK9nLo3UDZn5w_6uvDQ_eu', CODE = (process.env.KOPPELCODE || '').trim().toUpperCase();
let fout = 0;
const ok = (t, goed, info = '', bekend = false) => { console.log(`::${goed ? 'notice' : bekend ? 'warning' : 'error'} title=${goed ? '✓' : bekend ? '⚠' : '✗'} ${t}::${info}`); if (!goed && !bekend) fout++; };
const c = createClient(U, K, { auth: { persistSession: false } });
const a = await c.auth.signInAnonymously(); if (a.error) { ok('anoniem account', false, 'lukt niet'); process.exit(1); }
const k = await c.rpc('gebruik_koppelcode', { c: CODE, t: 'veiligheidstest' }); if (k.error || k.data === false) { ok('koppelen met de code', false, 'code ongeldig of al gebruikt'); process.exit(1); }
const mw = (await c.rpc('mijn_winkels')).data || []; const W = mw[0]?.id; ok('gekoppeld als winkeltoestel', mw.length === 1 && mw[0].rol === 'winkel', `rol ${mw[0]?.rol}`);
const tk = (await c.auth.getSession()).data.session.access_token;
const lees = async (s) => (await c.from('app_data').select('sleutel,waarde').eq('winkel', W).like('sleutel', s)).data || [];
ok('privé-gegevens lezen (facturen, bank, vaste lasten)', !(await lees('prive:%')).length, 'geweigerd');
const g = (await lees('beheer:gebruikers'))[0]?.waarde?.lijst || []; ok('pincodes in de gebruikerslijst', !g.some((x) => x.pin), g.length ? 'geen pincodes' : 'lijst niet leesbaar');
const pn = (await lees('pins'))[0]?.waarde || {}; ok('pincodes in "pins"', !Object.values(pn).some((x) => x && x.pin), 'geen pincodes');
const ins = (await lees('instellingen'))[0]?.waarde || {}; ok('kassa-koppelcode in instellingen', !ins.kassaKop, 'niet aanwezig');
for (const s of ['beheer:veiligheidstest', 'prive:veiligheidstest']) { const w = await c.from('app_data').insert({ winkel: W, sleutel: s, waarde: {} }); ok(`schrijven in ${s.split(':')[0]}:`, !!w.error, w.error ? 'geweigerd' : 'GELUKT'); if (!w.error) await c.from('app_data').delete().eq('winkel', W).eq('sleutel', s); }
const pg = await c.from('pin_geheim').select('uid').limit(1); ok('pincodes op de server lezen', !!pg.error || !(pg.data || []).length, 'geweigerd');
const rl = await c.storage.from('retour').list('', { limit: 5 }); ok('retourplaatjes bekijken', !!rl.error || !(rl.data || []).length, 'geweigerd');
const ru = await c.storage.from('retour').upload('veiligheidstest.jpg', new Blob(['x'], { type: 'image/jpeg' })); ok('retourplaatje uploaden', !!ru.error, ru.error ? 'geweigerd' : 'GELUKT'); if (!ru.error) await c.storage.from('retour').remove(['veiligheidstest.jpg']);
const fn = (pad, init = {}) => fetch(`${U}/functions/v1/${pad}`, { ...init, headers: { apikey: K, Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json', ...(init.headers || {}) } });
let r = await fn('stuur-push', { method: 'POST', body: '{"test":true}' }); ok('testmelding sturen', r.status === 403, 'antwoord ' + r.status);
const ander = g.find((x) => x.rol === 'admin')?.id || 'x';
r = await fn('pin', { method: 'POST', body: JSON.stringify({ doe: 'zet', winkel: W, uid: ander, pin: '1234' }) }); let j = await r.json().catch(() => ({})); ok('pincode van de beheerder zetten zonder oude pincode', !j.ok, j.ok ? 'GELUKT' : 'geweigerd');
r = await fn('pin', { method: 'POST', body: JSON.stringify({ doe: 'migreer', winkel: W }) }); ok('pincodes omzetten (alleen beheerder)', r.status === 403, 'antwoord ' + r.status);
r = await fn('brood-export'); ok('brood-export zonder koppelcode', r.status === 401, 'antwoord ' + r.status);
const ber = (await lees('berichten'))[0]?.waarde || {}; const priv = Object.keys(ber).filter((x) => x.startsWith('p_')).length;
ok('privéberichten van anderen lezen', !priv, priv ? `${priv} privégesprekken leesbaar` : 'niet leesbaar', true);
const ur = (await lees('uren'))[0]?.waarde || {}; const nU = Object.keys(ur.d || {}).length;
ok('uren van anderen lezen', !nU, nU ? `uren van ${nU} mensen leesbaar` : 'niet leesbaar', true);
await c.auth.signOut();
console.log(fout ? `${fout} keer fout` : 'alles dicht (⚠ = bekend punt 2)'); process.exit(fout ? 1 : 0);
