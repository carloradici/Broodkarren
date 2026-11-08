/* ================= lokaal opslaan ================= */
let bewaarTimer=null,opslagFout=false;
let OEFEN=false;
const APP_VERSIE='10.0';
const NIEUWS=[['🏪','Brood Opzet per winkel','De app werkt nu per winkel. Alles wat je al had, hoort bij je eigen winkel. Voor jou verandert er niets.'],
 ['🔑','Koppelen met een code','Een nieuwe telefoon koppel je voortaan met de koppelcode van de winkel, zonder wachtwoord. De beheerder vindt de code onder Meer.'],
 ['🌤️','Weer en bakker','De beheerder kiest bij Broodsoorten en instellingen de plaats voor het weer en de naam van de bakker.'],
 ['🥐','Nieuw icoon','Het icoon op het beginscherm is vernieuwd. Op een iPhone zie je het pas als je de app opnieuw op je beginscherm zet.'],
 ['🔄','Versie en bijwerken','Onderaan Meer zie je op welke versie de app draait. Met Controleren op update haal je meteen de nieuwste versie op.']];
const NIEUWS_OUD=[['🔑','Eigen pincode','Nieuwe medewerkers kiezen bij de eerste keer inloggen zelf een pincode. Je pincode wijzigen kan via Meer → App-instellingen.'],
 ['🧹','Rustiger menu','Je ziet alleen nog de onderdelen die je mag gebruiken.'],
 ['🔤','Eenvoudige modus','In App-instellingen kun je de app eenvoudiger maken: minder informatie en grotere knoppen.'],
 ['🎓','Oefenen','Via Meer → Uitleg → Oefenen kun je alles uitproberen zonder dat er iets echt verandert.'],
 ['✅','Duidelijke bevestiging','Na afvinken of opslaan zie je een groene melding. Bij een vreemd aantal vraagt de app "Klopt dit?".'],
 ['🎨','Kleur per kar','Elke kar kan een eigen kleur hebben, zodat je de lijst makkelijk bij de echte kar vindt.'],
 ['⇄','Snel wisselen','Werk je met meerdere mensen op één telefoon? Tik bovenin op je naam om te wisselen.']];
function nieuwsNaStart(){setTimeout(()=>{if(!L.sessie||document.getElementById('sheet')?.classList.contains('open')||document.getElementById('tour')?.classList.contains('open'))return;const p=prof();if(p.updates&&p.rondleiding&&p.versieGezien!==APP_VERSIE)toonNieuws()},700)}
const updatesTonen=()=>!!(L.sessie&&prof().updates);
function toonNieuws(){const p=prof();if(!L.sessie||p.versieGezien===APP_VERSIE)return false;
  toonSheet(`<div class="pkop"><span style="width:70px"></span><b>Nieuw in versie ${APP_VERSIE}</b><button data-a="nieuwsklaar" style="font-weight:700">Top!</button></div><div class="pinhoud">
   <div class="sectie" style="margin:10px 0 0">${NIEUWS.map(([i,t,x])=>`<div class="rij inv"><div class="nieuwsicoon">${i}</div><div class="groei"><div class="naam">${t}</div><div class="sub">${x}</div></div></div>`).join('')}</div>
   <div class="knoppen"><button class="knop" data-a="nieuwsklaar">Begrepen</button></div></div>`);return true}
function bewaarL(){if(OEFEN)return;try{localStorage.setItem(OPSLAG_LOKAAL,JSON.stringify(L))}catch(e){}}

/* ---- opslag op het toestel (9.14): gewone gegevens in localStorage, foto's en serverkopie in IndexedDB (veel meer ruimte) ---- */
let idb=null,idbOk=false,idbTimer=null,idbRij=new Map();const idbBekend=new Map();
function idbOpen(){return new Promise(ok=>{try{if(!window.indexedDB)return ok(null);const r=indexedDB.open('broodopzet'+NS,1);r.onupgradeneeded=()=>{try{r.result.createObjectStore('kv')}catch(e){}};r.onsuccess=()=>ok(r.result);r.onerror=()=>ok(null);r.onblocked=()=>ok(null);setTimeout(()=>ok(null),4000)}catch(e){ok(null)}})}
function idbAlles(){return new Promise(ok=>{try{const uit={},c=idb.transaction('kv','readonly').objectStore('kv').openCursor();c.onsuccess=()=>{const x=c.result;if(x){uit[x.key]=x.value;x.continue()}else ok(uit)};c.onerror=()=>ok(null)}catch(e){ok(null)}})}
function idbZet(k,v){if(v===undefined&&!idbBekend.has(k)){idbRij.delete(k);return}if(v!==undefined&&idbBekend.get(k)===v&&!idbRij.has(k))return;idbRij.set(k,v);if(!idbTimer)idbTimer=setTimeout(idbSchrijf,300)}
function idbSchrijf(){idbTimer=null;if(!idb||!idbRij.size)return;const rij=idbRij;idbRij=new Map();
  try{const t=idb.transaction('kv','readwrite'),st=t.objectStore('kv');for(const[k,v]of rij){if(v===undefined)st.delete(k);else st.put(v,k)}
    t.oncomplete=()=>{for(const[k,v]of rij){if(v===undefined)idbBekend.delete(k);else idbBekend.set(k,v)}if(opslagFout)opslagFoutZet(false)};
    t.onerror=t.onabort=()=>{for(const[k,v]of rij)if(!idbRij.has(k))idbRij.set(k,v);opslagFoutZet(true)}}catch(e){opslagFoutZet(true)}}
function idbGroep(pre,obj){const nu=new Set();for(const[id,v]of Object.entries(obj||{}))if(typeof v==='string'&&v){nu.add(pre+id);idbZet(pre+id,v)}
  for(const k of new Set([...idbBekend.keys(),...idbRij.keys()]))if(k.startsWith(pre)&&!nu.has(k))idbZet(k,undefined)}
function wisIdb(){return new Promise(ok=>{idbRij=new Map();idbBekend.clear();if(!idb)return ok();try{const t=idb.transaction('kv','readwrite');t.objectStore('kv').clear();t.oncomplete=t.onerror=t.onabort=()=>ok()}catch(e){ok()}})}
function lichteS(){const o={...S,fotos:{},notfotos:{},tbBijl:{},tbIn:{}};for(const[id,v]of Object.entries(S.tbIn||{}))if(v===null)o.tbIn[id]=null;for(const[id,v]of Object.entries(S.notfotos))if(v===null)o.notfotos[id]=null;for(const[id,v]of Object.entries(S.tbBijl||{}))if(v===null)o.tbBijl[id]=null;return o}
function bewaarS(){try{localStorage.setItem(OPSLAG,JSON.stringify(idbOk?lichteS():S));if(idbOk){idbGroep('f:',S.fotos);idbGroep('n:',S.notfotos);idbGroep('t:',S.tbBijl);idbGroep('i:',S.tbIn)}return true}catch(e){return false}}
function opslagFoutZet(f){opslagFout=f;const el=document.getElementById('opslagmelding');if(!el)return;
  el.textContent=L.gekoppeld&&L.modus!=='lokaal'?'Dit toestel kon niet alles bewaren. Je werk staat wel veilig op de server.':'Opslaan op dit toestel is mislukt: het geheugen is vol.';el.style.display=f?'block':'none'}
/* pakbonfoto's ouder dan 60 dagen blijven alleen op de server (ophalen bij openen) */
function oudePakbonFoto(id){const m=/^lv(\d{4}-\d{2}-\d{2})$/.exec(id||'');return!!m&&m[1]<plusDagen(iso(),-60)}
const opslagKlaar=(async()=>{if(window.ReactNativeWebView||window.__BEGINSTAAT__!==undefined)return;idb=await idbOpen();if(!idb)return;const a=await idbAlles();if(!a)return;
  const lsBasis=(()=>{try{return localStorage.getItem(OPSLAG_BASIS)}catch(e){return null}})();
  const idbHeeftBasis=Object.keys(a).some(k=>k.startsWith('b:'));if(idbHeeftBasis)basis={};
  if(L.herstel)for(const k of Object.keys(a))if(k.startsWith('b:'))delete a[k];  /* oude serverkopie niet gebruiken: alles komt opnieuw van de server */
  for(const[k,v]of Object.entries(a)){idbBekend.set(k,v);const id=k.slice(2);
    if(k.startsWith('f:')){if(!S.fotos[id])S.fotos[id]=v}
    else if(k.startsWith('n:')){if(S.notfotos[id]!==null&&!S.notfotos[id]&&!oudePakbonFoto(id))S.notfotos[id]=v}
    else if(k.startsWith('t:')){if(S.tbBijl[id]!==null&&!S.tbBijl[id])S.tbBijl[id]=v}
    else if(k.startsWith('i:')){if(S.tbIn[id]!==null&&!S.tbIn[id])S.tbIn[id]=v}
    else if(k.startsWith('b:'))basis[id]=v}
  idbOk=true;
  /* overstap van de oude opslag: serverkopie naar IndexedDB, daarna de grote kopieën uit localStorage weg */
  idbGroep('b:',basis);idbGroep('f:',S.fotos);idbGroep('n:',S.notfotos);idbGroep('t:',S.tbBijl);idbGroep('i:',S.tbIn);idbSchrijf();
  if(lsBasis!==null&&idbHeeftBasis)try{localStorage.removeItem(OPSLAG_BASIS)}catch(e){}  /* pas weg als de kopie in IndexedDB zeker staat */
  try{localStorage.setItem(OPSLAG,JSON.stringify(lichteS()))}catch(e){}
  render()})();
function bewaarNu(){clearTimeout(bewaarTimer);bewaarTimer=null;if(OEFEN)return;snapshot();let ok=bewaarS()||!!window.ReactNativeWebView;bewaarSync();
  bewaarL();if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(S));
  if(ok!==!opslagFout)opslagFoutZet(!ok);
  planSync();}
function bewaarSync(){try{if(idbOk)idbGroep('b:',basis);else localStorage.setItem(OPSLAG_BASIS,JSON.stringify(basis));localStorage.setItem(OPSLAG_REVS,JSON.stringify(revs))}catch(e){}}
function bewaar(){L.laatsteActie=Date.now();if(!bewaarTimer)bewaarTimer=setTimeout(bewaarNu,250)}
window.addEventListener('pagehide',()=>{bewaarNu()});

/* ================= online opslag ================= */
let db=null,syncStatus='lokaal',syncBezig=false,syncOpnieuw=false,syncTimer=null,retryTimer=null,uitgesteldRender=false;
function maakDb(){
  if(window.__DB_MOCK__)return window.__DB_MOCK__;
  if(!window.supabase||!window.supabase.createClient)return null;
  const c=window.supabase.createClient(SUPA_URL,SUPA_KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'broodkarren-auth'}});
  const chk=r=>{if(r.error)throw r.error;return r.data};
  /* 10.0: alles per winkel (zonder winkel = oude opzet met één winkel) */
  const wid=()=>WINKEL?.id||null,metW=q=>wid()?q.eq('winkel',wid()):q,rij=o=>wid()?{winkel:wid(),...o}:o;
  return{
    async sessie(){return chk(await c.auth.getSession()).session},
    async login(e,p){return chk(await c.auth.signInWithPassword({email:e,password:p})).session},
    async anoniem(){return chk(await c.auth.signInAnonymously()).session},
    async registreer(e,p){return chk(await c.auth.signUp({email:e,password:p,options:{emailRedirectTo:appUrl()}})).session},
    async logout(){await c.auth.signOut()},
    async rpc(f,a){return chk(await c.rpc(f,a||{}))},
    async isBeheerder(uid){return !!chk(await c.from('beheerders').select('user_id').eq('user_id',uid).maybeSingle())},
    /* opstarten: alleen wat sinds de vorige keer veranderd is; leesfout-foto's alleen naar de beheerder */
    async alles(opt={}){const q=()=>metW(c.from('app_data').select('sleutel,waarde,bijgewerkt')),zonderPf=r=>opt.beheerder?r:r.not('sleutel','like','notfoto:pf%');
      if(opt.sinds)return chk(await zonderPf(q().gt('bijgewerkt',opt.sinds)));
      try{const a=chk(await zonderPf(q().not('sleutel','like','notfoto:lv%')));
        const b=chk(await q().like('sleutel','notfoto:lv%').gte('sleutel','notfoto:lv'+plusDagen(iso(),-60)));return a.concat(b)}
      catch(e){console.warn('gefilterd ophalen mislukt, alles ophalen',e);return chk(await q())}},
    async haal(k){const d=chk(await metW(c.from('app_data').select('waarde')).eq('sleutel',k).maybeSingle());return d?d.waarde:null},
    async lees(w,keys){return chk(await c.from('app_data').select('sleutel,waarde').eq('winkel',w).in('sleutel',keys))},
    async schrijf(k,v,opt={}){const nu=new Date().toISOString();
      try{
        if(!opt.bestaat){const r=await c.from('app_data').insert(rij({sleutel:k,waarde:v,bijgewerkt:nu}));if(r.error){if(r.error.code==='23505')throw{conflict:true};throw r.error}return}
        let q=metW(c.from('app_data').update({waarde:v,bijgewerkt:nu})).eq('sleutel',k);
        q=opt.rev==null?q.is('waarde->>_rev',null):q.eq('waarde->>_rev',String(opt.rev));
        const r=await q.select('sleutel');if(r.error)throw r.error;if(!r.data||!r.data.length)throw{conflict:true};
      }catch(e){if(e&&e.conflict)throw e;if(String(e?.code||'').startsWith('PGRST')){chk(await c.from('app_data').upsert(rij({sleutel:k,waarde:v,bijgewerkt:nu}),{onConflict:wid()?'winkel,sleutel':'sleutel'}));return}throw e}},
    async backups(){const d=chk(await metW(c.from('app_data_backup').select('dag')).eq('sleutel','instellingen').order('dag',{ascending:false}).limit(31));return d.map(x=>x.dag)},
    async herstel(dag){return chk(await c.rpc('herstel_backup',wid()?{d:dag,w:wid()}:{d:dag}))},
    abonneer(cb,status){const f={event:'*',schema:'public',table:'app_data'};if(wid())f.filter='winkel=eq.'+wid();
      c.channel('app_data_live').on('postgres_changes',f,p=>{if(p.new&&p.new.sleutel&&(!wid()||!p.new.winkel||p.new.winkel===wid()))cb(p.new.sleutel,p.new.waarde)}).subscribe(s=>status&&status(s))}
  };
}
function splitsen(){
  const o={'beheer:gebruikers':{lijst:S.gebruikers},instellingen:{bakker:S.bakker||'',locatie:S.locatie||null,winkelLogo:S.winkelLogo||null,soorten:S.soorten,karren:S.karren,momenten:S.momenten,ovenMax:S.ovenMax,leverdagen:S.leverdagen,programmas:S.programmas,omschakel:S.omschakel??null,versDagen:S.versDagen,versUitz:S.versUitz,pakbonNegeer:S.pakbonNegeer||[],pakbonNamen:S.pakbonNamen||{},pakbonCijfers:S.pakbonCijfers||{},herinnering:S.herinnering,uitlogMin:S.uitlogMin},
    plan:{plan:S.plan,karOverride:S.karOverride,feestNee:S.feestNee},afwijkend:S.afwijkend,voorraad:S.voorraad,profielen:S.profielen,berichten:S.berichten,pins:S.pins,materiaal:S.materiaal,pakbonfouten:S.pbFouten,pushteam:S.pushTeam,...(Object.keys(S.uren||{}).length?{uren:S.uren}:{})};
  const dagen=new Set();for(const k of DAGVELDEN)for(const d of Object.keys(S[k]))dagen.add(d);
  for(const d of dagen){const x={};for(const k of DAGVELDEN)if(S[k][d]!==undefined)x[k]=S[k][d];o['dag:'+d]=x}
  for(const[id,l]of Object.entries(S.log)){const k='log:'+iso(new Date(l.t));(o[k]=o[k]||{})[id]=l}
  for(const[id,f]of Object.entries(S.fotos))o['foto:'+id]={data:f||null};
  for(const[id,f]of Object.entries(S.notfotos))o['notfoto:'+id]={data:f||null};
  if(kanBeheren()&&heeft('cadeau')&&Object.keys(S.cadeau).length)o['prive:cadeau']={bonnen:S.cadeau};
  if(kanBeheren()&&heeft('push')&&(S.push.subs?.length||S.push.stil||S.push.uit))o['prive:push']=S.push;
  if(kanBeheren()&&heeft('euro')&&Object.keys(S.prijzen).length)o['prive:prijzen']=S.prijzen;
  if(kanBeheren()&&(isAanbieder()||L.modus==='lokaal'))o['prive:facturen']=S.facturen;
  if(betalenMag()&&(Object.keys(S.betalen.f).length||S.betalen.eig))o['prive:betalen']=S.betalen;
  if(betalenMag())for(const[id,f]of Object.entries(S.tbBijl))o['prive:tbbijl:'+id]={data:f||null};
  if(betalenMag())for(const[id,f]of Object.entries(S.tbIn))o['prive:tbin:'+id]={data:f||null};
  if(Object.keys(S.checklists).length)o.checklists=S.checklists;
  if(Object.keys(S.homeTeam).length)o.hometeam=S.homeTeam;
  if(Object.keys(S.bestelboeken.boeken).length||S.bestelboeken.editie.naam||Object.keys(S.bestelboeken.eigen).length)o.bestelboeken=S.bestelboeken;
  /* 10.0: wat niet in het pakket zit, gaat niet naar de server */
  if(!heeft('deeg'))delete o.voorraad;if(!heeft('push'))delete o.pushteam;
  if(!heeft('scan')){delete o.pakbonfouten;for(const k of Object.keys(o))if(k.startsWith('notfoto:pf'))delete o[k]}
  return o;
}
function pasToe(k,v){
  if(!isObj(v))return;v=zonderRev(v);
  if(k==='beheer:gebruikers')S.gebruikers=Array.isArray(v.lijst)?v.lijst:[];
  else if(k==='instellingen'){for(const f of['bakker','locatie','winkelLogo','soorten','karren','momenten','ovenMax','leverdagen','programmas','omschakel','versDagen','versUitz','pakbonNegeer','pakbonNamen','pakbonCijfers','herinnering','uitlogMin'])if(v[f]!==undefined)S[f]=v[f]}
  else if(k==='plan'){S.plan=v.plan||{};S.karOverride=v.karOverride||{};S.feestNee=v.feestNee||{}}
  else if(k==='afwijkend')S.afwijkend=v;
  else if(k==='voorraad')S.voorraad=v;
  else if(k==='profielen')S.profielen=v;
  else if(k==='berichten')S.berichten=v;
  else if(k==='uren')S.uren=v;
  else if(k==='pins')S.pins=v;
  else if(k==='materiaal')S.materiaal=vulMateriaal(v);
  else if(k==='prive:push')S.push=v;
  else if(k==='prive:prijzen')S.prijzen=v;
  else if(k==='prive:facturen')S.facturen=vulFacturen(v);
  else if(k==='prive:betalen')S.betalen=vulBetalen(v);
  else if(k.startsWith('prive:tbbijl:')){S.tbBijl[k.slice(13)]=v.data||null}
  else if(k.startsWith('prive:tbin:')){S.tbIn[k.slice(11)]=v.data||null}
  else if(k==='checklists')S.checklists=v;
  else if(k==='hometeam')S.homeTeam=v;
  else if(k==='bestelboeken')S.bestelboeken=vulBestelboeken(v);
  else if(k==='pakbonfouten')S.pbFouten=v;
  else if(k==='pushteam')S.pushTeam=v;
  else if(k==='prive:cadeau')S.cadeau=v.bonnen||{};
  else if(k.startsWith('dag:')){const d=k.slice(4);for(const f of DAGVELDEN){if(v[f]!==undefined)S[f][d]=v[f];else delete S[f][d]}}
  else if(k.startsWith('log:')){const d=k.slice(4);for(const[id,l]of Object.entries(S.log))if(iso(new Date(l.t))===d&&!v[id])delete S.log[id];Object.assign(S.log,v)}
  else if(k.startsWith('foto:')){const id=k.slice(5);if(v.data)S.fotos[id]=v.data;else delete S.fotos[id]}
  else if(k.startsWith('notfoto:')){const id=k.slice(8);if(v.data)S.notfotos[id]=v.data;else S.notfotos[id]=null}
  vulAan(S);
}
function diff(a,b,pad=[],ops=[]){
  if(a===undefined&&isObj(b)){if(!Object.keys(b).length){ops.push({p:pad,v:{}});return ops}a={}}  /* 10.7.2: lege map niet kwijtraken */
  if(isObj(a)&&isObj(b)){for(const k of Object.keys(b))diff(a[k],b[k],[...pad,k],ops);for(const k of Object.keys(a))if(!(k in b))ops.push({p:[...pad,k],del:true})}
  else if(stabiel(a)!==stabiel(b))ops.push({p:pad,v:kloon(b)});
  return ops;
}
function pasOpsToe(obj,ops){
  let root=isObj(obj)?obj:{};
  for(const op of ops){if(!op.p.length){if(!op.del)root=kloon(op.v);continue}
    let o=root;for(let i=0;i<op.p.length-1;i++){if(!isObj(o[op.p[i]]))o[op.p[i]]={};o=o[op.p[i]]}
    const l=op.p[op.p.length-1];if(op.del)delete o[l];else o[l]=kloon(op.v)}
  return root;
}
function ontvang(k,v){
  if(OEFEN||!isObj(v))return;const rev=v._rev||0;if(revs[k]!=null&&rev<=revs[k])return;revs[k]=rev;v=zonderRev(v);
  if((k.startsWith('notfoto:')&&oudePakbonFoto(k.slice(8)))||(k.startsWith('notfoto:pf')&&!kanBeheren())){delete basis[k];delete revs[k];delete S.notfotos[k.slice(8)];return}
  const lokaal=splitsen()[k],lj=stabiel(lokaal);
  if(basis[k]===undefined||lokaal===undefined||lj===basis[k]){basis[k]=stabiel(v);pasToe(k,v)}
  else{const ops=diff(JSON.parse(basis[k]),lokaal);basis[k]=stabiel(v);pasToe(k,pasOpsToe(kloon(v),ops));planSync()}
}
function planSync(){if(L.modus==='lokaal'||!db||!L.gekoppeld)return;clearTimeout(syncTimer);syncTimer=setTimeout(sync,250)}
const geweigerd=new Set();let serverGezien=false;
/* 10.2: rem op grote verwijderingen (bijv. een toestel dat ineens de standaardlijst stuurt) */
function krimpOk(k,oud,nieuw){const n=(o,f)=>Array.isArray(o?.[f])?o[f].length:0;
  if(k==='instellingen')return!(n(oud,'soorten')>=6&&n(nieuw,'soorten')<n(oud,'soorten')/2);
  if(k==='beheer:gebruikers')return!(n(oud,'lijst')>=3&&n(nieuw,'lijst')<n(oud,'lijst')/2);
  return true}
async function opnieuwOphalen(){try{const rows=await db.alles({beheerder:!!L.beheerder});for(const r of rows)ontvang(r.sleutel,r.waarde);serverGezien=true;bewaarSync();bewaarS();render()}catch(e){setTimeout(opnieuwOphalen,15000)}}
async function sync(){
  if(OEFEN||!db||!L.gekoppeld||L.modus==='lokaal'||opSlot()||!serverGezien||L.herstel)return;await opslagKlaar;
  if(syncBezig){syncOpnieuw=true;return}
  syncBezig=true;let veranderd=false,fout=false,krimp=false;
  try{
    for(const k of Object.keys(splitsen())){
      if((k.startsWith('beheer:')||k.startsWith('prive:'))&&!L.beheerder)continue;
      if(geweigerd.has(k))continue;
      for(let poging=0;;poging++){
        const lokaal=splitsen()[k],lokaalJ=stabiel(lokaal);
        if(lokaal===undefined||lokaalJ===basis[k])break;
        zetStatus('bezig');
        const server=await db.haal(k),bestaat=server!==null&&server!==undefined,srev=bestaat?(server._rev??null):null,sb=bestaat?zonderRev(server):null;
        let nieuw;
        if(basis[k]!==undefined&&bestaat)nieuw=pasOpsToe(kloon(sb),diff(JSON.parse(basis[k]),lokaal));
        else if(bestaat&&isObj(sb)&&isObj(lokaal))nieuw=pasOpsToe(kloon(sb),diff({},lokaal));
        else nieuw=kloon(lokaal);
        if(bestaat&&!krimpOk(k,sb,nieuw)){console.warn('grote verwijdering tegengehouden',k);delete basis[k];delete revs[k];krimp=true;break}
        const rev=(srev||0)+1;
        try{await db.schrijf(k,{...nieuw,_rev:rev},{bestaat,rev:srev})}
        catch(e){if(e&&e.conflict&&poging<5){await new Promise(r=>setTimeout(r,150+Math.random()*300));continue}
          if(/P0420|Te veel/i.test((e?.code||'')+' '+(e?.message||''))){delete basis[k];delete revs[k];krimp=true;break}
          if(/42501|row-level security/i.test((e?.code||'')+' '+(e?.message||''))||(e&&e.conflict&&WINKEL)){console.warn('geweigerd',k);geweigerd.add(k);break}throw e}
        revs[k]=Math.max(revs[k]||0,rev);basis[k]=stabiel(nieuw);
        const nu=splitsen()[k];
        if(stabiel(nu)!==lokaalJ){pasToe(k,pasOpsToe(kloon(nieuw),diff(lokaal,nu)));veranderd=true}
        else if(stabiel(nieuw)!==lokaalJ){pasToe(k,nieuw);veranderd=true}
        break;
      }
    }
    zetStatus('online');
  }catch(e){fout=true;zetStatus('offline');console.warn('sync',e);clearTimeout(retryTimer);retryTimer=setTimeout(sync,15000)}
  finally{syncBezig=false;
    if(krimp){serverGezien=false;toast('Een grote verwijdering is tegengehouden. De gegevens worden opnieuw opgehaald.');opnieuwOphalen()}
    bewaarSync();bewaarS();
    if(veranderd)renderZacht();else try{if(chatId&&document.getElementById('chatOv')?.classList.contains('open'))chatVernieuw()}catch(e){}
    if(syncOpnieuw&&!fout){syncOpnieuw=false;sync()}}
}
function zetStatus(s){if(syncStatus===s)return;syncStatus=s;document.querySelectorAll('.status').forEach(el=>el.outerHTML=statusHtml())}
function themaVan(){return prof().thema}

function pasThemaToe(){
  const p=prof(),t=p.thema,r=document.documentElement,app=document.getElementById('app');
  if(t==='licht')r.dataset.theme='light';else if(t==='donker')r.dataset.theme='dark';else delete r.dataset.theme;
  const kleur=ACCENTEN.find(a=>a[0]===p.accent)?.[2]||'#f17d04';
  if(kleur!=='#f17d04'){r.style.setProperty('--oranje',kleur);r.style.setProperty('--oranjeLicht',`color-mix(in srgb, ${kleur} 16%, var(--kaart))`)}else{r.style.removeProperty('--oranje');r.style.removeProperty('--oranjeLicht')}
  r.style.setProperty('--zoom',Math.max(p.eenvoudig?1.12:1,{normaal:1,groot:1.12,xl:1.25}[p.tekst]||1));
  app.classList.toggle('eenvoudig',!!p.eenvoudig);app.classList.toggle('werkvloer',!!(p.werkvloer&&isAdmin()));
  app.classList.toggle('compact',!!p.compact);app.classList.toggle('geenfotos',!p.fotos);app.classList.toggle('geenpatroon',!p.patroon);app.classList.toggle('geenplu',!p.plu);
}
const ACCENTEN=[['oranje','Coop-oranje','#f17d04'],['groen','Groen','#2e8b57'],['blauw','Blauw','#1f6fb2'],['paars','Paars','#7b3fa0']];
const EMOJI=['🥐','🥖','🍞','🥨','🧁','🍰','🧑‍🍳','👩‍🍳','👨‍🍳','😀','😎','🌻','⭐','🔥','💪','☕'];
const PROF_STANDAARD={bevestig:true,werkvloer:false,fav:[],meerOpen:{dagelijks:true},eenvoudig:false,thema:'auto',tekst:'normaal',compact:false,fotos:true,patroon:true,plu:true,emoji:'',accent:'oranje',start:'slim',moment:null,feest:true,groet:true};
function prof(id=L.sessie){const p={...PROF_STANDAARD,...((id&&S.profielen[id])||{})};if(id&&!S.profielen[id]?.thema&&L.thema?.[id])p.thema=L.thema[id];return p}
function zetProf(k,v){const id=L.sessie;if(!id)return;S.profielen[id]={...(S.profielen[id]||{}),[k]:v};bewaar();render()}

function statusHtml(){
  const t={lokaal:['','Alleen dit toestel – niet gekoppeld'],online:['ok','Online – alle toestellen gelijk'],bezig:['ok','Online – bezig met opslaan…'],offline:['uit','Offline – wijzigingen worden later verzonden'],start:['ok','Verbinden…']}[syncStatus]||['',''];
  return`<div class="status ${t[0]}">${t[1]}</div>`;
}
function renderZacht(){try{if(chatId&&document.getElementById('chatOv')?.classList.contains('open'))chatVernieuw()}catch(e){}const a=document.activeElement;if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.tagName==='SELECT')){uitgesteldRender=true;return}render()}
document.addEventListener('focusout',()=>setTimeout(()=>{if(uitgesteldRender){const a=document.activeElement;if(!a||!['INPUT','TEXTAREA','SELECT'].includes(a.tagName)){uitgesteldRender=false;render()}}},250));
async function koppelStart(){
  syncStatus='start';render();await opslagKlaar;
  try{
    const volledig=!L.gekoppeld||!L.syncTot||!idbOk||!Object.keys(basis).length||Date.now()-(L.volledigOp||0)>7*864e5;
    const rows=await db.alles({sinds:volledig?null:new Date(Date.parse(L.syncTot)-15*60000).toISOString(),beheerder:!!L.beheerder});
    if(!L.gekoppeld){
      if(rows.some(r=>r.sleutel==='instellingen')){S=leegS();basis={};revs={}}else{if(WINKEL&&!L.vanLokaal)S=leegS();basis={};revs={}}
      L.gekoppeld=true;delete L.wissel;delete L.vanLokaal;delete L.melding;bewaarL();
    }
    for(const r of rows)ontvang(r.sleutel,r.waarde);
    serverGezien=true;if(L.herstel){delete L.herstel;bewaarL()}
    {const max=rows.reduce((m,r)=>r.bijgewerkt&&r.bijgewerkt>m?r.bijgewerkt:m,L.syncTot||'');if(max)L.syncTot=max;if(volledig)L.volledigOp=Date.now();bewaarL()}
    db.abonneer((k,v)=>{ontvang(k,v);bewaarSync();bewaarS();renderZacht()},
      s=>{if(s==='SUBSCRIBED'&&syncStatus==='offline')sync()});
    zetStatus('online');bewaarNu();await sync();
  }catch(e){console.warn(e);zetStatus('offline');clearTimeout(retryTimer);retryTimer=setTimeout(()=>{if(syncStatus==='offline')koppelStart()},15000)}
  render();
}
window.addEventListener('online',()=>{if(L.gekoppeld&&db)sync()});
