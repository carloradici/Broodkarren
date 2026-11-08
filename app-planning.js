/* ================= accounts & rechten ================= */
function hashPin(pin,zout){let h=2166136261;for(const c of zout+':'+pin){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
const ik=()=>S.gebruikers.find(g=>g.id===L.sessie);
/* 10.9: foto bij broodsoorten staat (voorlopig) uit; de foto's blijven bewaard */
const SOORT_FOTO=false,sFoto=id=>SOORT_FOTO?S.fotos[id]:null;
const isAdmin=()=>ik()?.rol==='admin';
function mag(r){const g=ik();if(!g)return false;if(g.rol==='admin')return true;return g.actief!==false&&!!(g.rechten||{})[r]}
const kanBeheren=()=>L.modus==='lokaal'||!!L.beheerder;
const UITLOG_MIN=60;let fouteLogins=0,geblokkeerdTot=0;
function controleerSessie(){if(L.sessie&&L.laatsteActie&&Date.now()-L.laatsteActie>UITLOG_MIN*60000){L.sessie=null;loginKeuze=null;bewaarL()}
  /* app langer dan de ingestelde tijd niet in beeld geweest (of afgesloten): opnieuw inloggen. 'Direct' = na 20 seconden, zodat camera of delen niet uitlogt */
  if(L.sessie&&L.wegSinds&&!OEFEN){const m=S.uitlogMin??5,grens=m===0?20000:m*60000;if(Date.now()-L.wegSinds>=grens){L.sessie=null;loginKeuze=null}}
  if(L.wegSinds){L.wegSinds=null;bewaarL()}}
let laatsteLog=null;
function log(tekst,sleutel){
  const t=Date.now(),wie=ik()?.naam||'?',l=laatsteLog&&S.log[laatsteLog];
  if(sleutel&&l&&l.k===sleutel&&l.wie===wie&&t-l.t<90000&&iso(new Date(l.t))===iso()){l.tekst=tekst;l.t=t}
  else{const id='l'+t.toString(36)+Math.random().toString(36).slice(2,5);S.log[id]={t,wie,tekst,k:sleutel||null};laatsteLog=id}
}

/* ================= planning ================= */
const effKar=s=>S.karOverride[s.id]??s.kar;
const planKeyVoor=d=>S.afwijkend[d]?'afw:'+d:dagKey(d);
const momentNaam=id=>S.momenten.find(m=>m.id===id)?.naam||'';
const dagNaam=k=>DAGEN.find(x=>x[0]===k)?.[2]||k;
function planNaam(pk){if(pk.startsWith('afw:')){const d=pk.slice(4);return`${datumTekst(d)} – ${S.afwijkend[d]?.naam||'afwijkend'}`}return dagNaam(pk)}
const groepVanPlan=pk=>pk.startsWith('afw:')?dagGroep(pk.slice(4)):(pk==='za'||pk==='zo'?pk:'mv');
function stuksIn(pk,m,s){
  if(pk.startsWith('afw:'))return S.afwijkend[pk.slice(4)]?.plan?.[m]?.[s.id]??0;
  const ma=S.plan.ma[m]?.[s.id]??0;if(pk==='ma')return ma;
  const v=S.plan[pk]?.[m]?.[s.id];return v==null?ma:v;
}
function eigenWaarde(pk,m,id){if(pk.startsWith('afw:'))return S.afwijkend[pk.slice(4)]?.plan?.[m]?.[id];return S.plan[pk]?.[m]?.[id]}
function zetStuks(pk,m,id,n){
  let doel;
  if(pk.startsWith('afw:')){const a=S.afwijkend[pk.slice(4)];a.plan[m]=a.plan[m]||{};doel=a.plan[m]}
  else{S.plan[pk][m]=S.plan[pk][m]||{};doel=S.plan[pk][m]}
  if(n==null)delete doel[id];
  else if(!pk.startsWith('afw:')&&pk!=='ma'){if(n===(S.plan.ma[m]?.[id]??0))delete doel[id];else doel[id]=n}
  else doel[id]=n;
}
const dagTotaal=(pk,s)=>S.momenten.reduce((t,m)=>t+stuksIn(pk,m.id,s),0);
function werkelijk(d,m,s){
  if(s.type==='vers'&&!versGeleverd(d))return 0;
  if(s.type==='vers'&&S.levering[d]?.items&&s.id in S.levering[d].items)return m===S.momenten[0].id?(S.levering[d].items[s.id]||0):0;
  const a=S.aanpas[d]?.[m]?.[s.id];return a!=null?a:stuksIn(planKeyVoor(d),m,s)}
const werkDagTotaal=(d,s)=>S.momenten.reduce((t,m)=>t+werkelijk(d,m.id,s),0);
function verdeling(n,max){max=max>0?max:n;const p=Math.ceil(n/max),rest=n-(p-1)*max;return{platen:p,delen:p?[...Array(p-1).fill(max),rest]:[],rest}}
function karNrs(){return[...new Set([...S.karren.map(k=>k.nr),...S.soorten.map(effKar)])].filter(Number.isInteger).sort((a,b)=>a-b)}
const KARKLEUREN=['#f17d04','#1f6fb2','#2e8b57','#7b3fa0','#c62828','#6b6b6b'];
function karKleur(nr){return S.karren.find(x=>x.nr===nr)?.kleur||'var(--oranje)'}
function karNaam(nr){const k=S.karren.find(x=>x.nr===nr);return(k&&k.naam&&k.naam.trim())||`Kar ${nr}`}
function maakLijst(d,m){
  const out=[],pk=planKeyVoor(d);
  for(const nr of karNrs()){
    const regels=S.soorten.filter(s=>effKar(s)===nr&&s.type!=='vers'&&s.naam.trim()).map(s=>{const gepland=stuksIn(pk,m,s),n=werkelijk(d,m,s);return{s,n,gepland,aangepast:n!==gepland,extra:gepland===0&&n>0}}).filter(r=>r.n>0);
    if(!regels.length)continue;
    const gk=s=>s.groep&&s.groep.trim()?'g:'+s.groep.trim().toUpperCase():'e:'+s.id;
    const gp={};for(const r of regels){if(r.s.type==='ontdooien'){r.v={platen:0,delen:[r.n],rest:r.n};r.g='o:'+r.s.id;r.ontdooi=true;continue}r.v=verdeling(r.n,r.s.max);r.g=gk(r.s);gp[r.g]=Math.max(gp[r.g]||0,r.v.platen)}
    const start={};let volg=1;
    for(const r of regels){if(r.ontdooi){r.plaat='';r.aantalPlaten=0;r.teWeinig=false;continue}if(start[r.g]===undefined){start[r.g]=volg;volg+=gp[r.g]}
      const a=start[r.g],b=a+gp[r.g]-1;r.plaat=b>a?`${a}–${b}`:`${a}`;r.aantalPlaten=gp[r.g];r.teWeinig=r.s.min>0&&r.v.rest<r.s.min}
    out.push({nr,naam:karNaam(nr),regels,totaal:regels.reduce((t,r)=>t+r.n,0),platen:volg-1});
  }
  return out;
}

/* ================= bijbakken ================= */
function bijbakLijst(d){return Object.values(S.bijbak[d]||{}).sort((a,b)=>a.t-b.t)}
const bijItems=x=>Array.isArray(x.items)?x.items:(x.soort?[{soort:x.soort,n:x.n||0,platen:x.platen||1,perPlaat:Math.round((x.n||0)/(x.platen||1))}]:[]);
function bijbakStuks(d,id){return bijbakLijst(d).reduce((t,x)=>t+bijItems(x).filter(i=>i.soort===id).reduce((a,i)=>a+(i.n||0),0),0)}
const opgezetTotaal=(d,s)=>werkDagTotaal(d,s)+bijbakStuks(d,s.id);
function historieBij(d,id,delta){if(d===iso()||!S.historie[d])return;const g=S.historie[d].gezet=S.historie[d].gezet||{};g[id]=Math.max(0,(g[id]||0)+delta)}

/* ================= voorraad ================= */
function voorraadNu(id){
  const v=S.voorraad[id];if(!v)return null;let n=v.basis;
  for(const d of Object.keys(S.vinkjes))for(const m of Object.keys(S.vinkjes[d]||{})){const x=S.vinkjes[d][m]?.[id];if(x&&x.t>v.t)n-=x.n||0}
  for(const d of Object.keys(S.bijbak))for(const x of Object.values(S.bijbak[d]||{}))if(x.t>v.t)for(const i of bijItems(x))if(i.soort===id)n-=i.n||0;
  return n;
}
function voorraadTekst(s,n){if(n==null)return'niet geteld';n=Math.max(0,n);if(!s.perDoos)return`${n} stuks`;const dz=Math.floor(n/s.perDoos),los=n%s.perDoos;
  return`${dz} ${dz===1?'doos':'dozen'}${los?` + ${los}`:''}`}

/* ================= historie en advies ================= */
function borgHistorie(d){if(S.historie[d])return;const gezet={};for(const s of S.soorten){const n=opgezetTotaal(d,s);if(n>0)gezet[s.id]=n}S.historie[d]={afw:!!S.afwijkend[d],gezet}}
function snapshot(){
  const d=iso(),gezet={};for(const s of S.soorten){const n=opgezetTotaal(d,s);if(n>0)gezet[s.id]=n}
  const oud=S.historie[d];if(!oud||JSON.stringify(oud.gezet)!==JSON.stringify(gezet)||oud.afw!==!!S.afwijkend[d])S.historie[d]={afw:!!S.afwijkend[d],gezet};
  const grens=plusDagen(d,-180);
  for(const k of['historie','derving','notities','dervBest','aanpas','dervHH','bijbak','afsluit','dervReg'])for(const x of Object.keys(S[k]))if(x<grens)delete S[k][x];
  for(const k of['vinkjes','status','avond','snij','ontdooi','karTaak'])for(const x of Object.keys(S[k]))if(x<plusDagen(d,-35))delete S[k][x];
  {const dgrens=plusDagen(iso(),-30);try{chatOpruimen()}catch(e){console.warn(e)}
   for(const d of Object.keys(S.dervReg))if(d<dgrens){const l=Object.values(S.dervReg[d]||{});if(l.length&&l.every(r=>r.kassa))delete S.dervReg[d]}}
  const nodig=new Set();for(const d of Object.keys(S.notities))for(const n of Object.values(S.notities[d]||{}))if(n.fotoId)nodig.add(n.fotoId);for(const lv of Object.values(S.levering))if(lv?.fotoId)nodig.add(lv.fotoId);
  for(const id of Object.keys(S.notfotos))if(!nodig.has(id)&&S.notfotos[id]===null)delete S.notfotos[id];
  for(const id of Object.keys(S.notfotos))if(oudePakbonFoto(id)&&S.notfotos[id]!==null){delete S.notfotos[id];delete basis['notfoto:'+id];delete revs['notfoto:'+id]}
  /* leesfout-foto van een medewerker: na het versturen van dit toestel af (alleen de beheerder bewaart hem) */
  if(!kanBeheren())for(const id of Object.keys(S.notfotos))if(id.startsWith('pf')&&S.notfotos[id]&&basis['notfoto:'+id]===stabiel({data:S.notfotos[id]})){delete S.notfotos[id];delete basis['notfoto:'+id];delete revs['notfoto:'+id]}
  const lg=Date.now()-60*864e5;for(const[id,l]of Object.entries(S.log))if(l.t<lg)delete S.log[id];
}
function historie(s,groep){
  return Object.keys(S.derving).filter(d=>dagGroep(d)===groep&&!S.afwijkend[d]&&!S.historie[d]?.afw&&S.derving[d]?.[s.id]!=null).sort().reverse().slice(0,8)
    .map(d=>{const gezet=S.historie[d]?.gezet?.[s.id]??0,der=S.derving[d][s.id],bij=bijbakStuks(d,s.id);return{d,gezet,der,bij,verkocht:Math.max(0,gezet-der),verkochtAdv:Math.max(0,Math.min(gezet-bij,gezet-der))}});
}
function advies(s,groep){
  if(!heeft('advies'))return null;
  const h=historie(s,groep).slice(0,4);if(h.length<2)return null;
  const gemDer=h.reduce((t,x)=>t+x.der,0)/h.length,gemGezet=h.reduce((t,x)=>t+x.gezet,0)/h.length;
  if(h.every(x=>x.der===0))return{h,gemDer,gemGezet,op:true};
  const gw=[4,3,2,1].slice(0,h.length),som=gw.reduce((a,b)=>a+b,0),gew=h.reduce((t,x,i)=>t+x.verkochtAdv*gw[i],0)/som;
  let trend='';if(h.length>=4){const nu=(h[0].verkochtAdv+h[1].verkochtAdv)/2,oud=(h[2].verkochtAdv+h[3].verkochtAdv)/2;if(oud>0&&(nu-oud)/oud>=0.1)trend='↑';else if(oud>0&&(nu-oud)/oud<=-0.1)trend='↓'}
  return{h,gemDer,gemGezet,trend,aantal:Math.max(s.min||0,Math.ceil(gew))};
}
function adviesTekst(a,huidig,groep){
  if(!a)return'';if(a.op)return`<b>${a.h.length}× niets over</b> (${GROEP[groep]}) – misschien meer klaarzetten?`;
  const pct=a.gemGezet?Math.round(a.gemDer/a.gemGezet*100):0;
  return`Gem. ${Math.round(a.gemDer*10)/10} over (${pct}%), laatste ${a.h.length} ${GROEP[groep]}`+(a.trend?` <b>${a.trend==='↑'?'↑ stijgend':'↓ dalend'}</b>`:'')+(a.aantal!==huidig?` – <b>advies ${a.aantal} per dag</b>`:'');
}
function verdeelAdvies(pk,s,A){
  const ms=S.momenten.map(m=>m.id),cur=ms.map(m=>stuksIn(pk,m,s)),T=cur.reduce((a,b)=>a+b,0);
  let nieuw;if(T===0)nieuw=ms.map(m=>m===moment?A:0);
  else{nieuw=cur.map(c=>Math.floor(A*c/T));const i=cur.indexOf(Math.max(...cur));nieuw[i]+=A-nieuw.reduce((a,b)=>a+b,0)}
  ms.forEach((m,i)=>zetStuks(pk,m,s.id,nieuw[i]));
}

/* ================= deegbestelling ================= */
function volgendeLeverdag(vanaf){for(let i=1;i<=14;i++){const d=plusDagen(vanaf,i);if(S.leverdagen.includes(vanIso(d).getDay()))return d}return null}
function bestelBerekening(){
  const t=iso(),L1=volgendeLeverdag(t);if(!L1)return null;const L2=volgendeLeverdag(L1)||plusDagen(L1,7);
  const dagen=[];for(let d=plusDagen(t,1);d<L2;d=plusDagen(d,1))dagen.push(d);
  const regels=S.soorten.filter(s=>s.type!=='vers').map(s=>{const nodig=dagen.reduce((x,d)=>x+werkDagTotaal(d,s),0),vr=voorraadNu(s.id);
    const tekort=Math.max(0,nodig-Math.max(0,vr||0));return{s,nodig,vr,dozen:s.perDoos?Math.ceil(tekort/s.perDoos):null}}).filter(r=>r.nodig>0||r.vr!=null);
  return{L1,L2,van:dagen[0],tot:dagen[dagen.length-1],regels};
}
