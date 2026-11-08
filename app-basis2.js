const CROISSANT=(fill,line,sw=7)=>`<g fill="${fill}" stroke="${line}" stroke-width="${sw}" stroke-linejoin="round"><ellipse cx="34" cy="150" rx="17" ry="24" transform="rotate(-58 34 150)"/><ellipse cx="266" cy="150" rx="17" ry="24" transform="rotate(58 266 150)"/><ellipse cx="62" cy="128" rx="27" ry="36" transform="rotate(-42 62 128)"/><ellipse cx="238" cy="128" rx="27" ry="36" transform="rotate(42 238 128)"/><ellipse cx="102" cy="106" rx="38" ry="52" transform="rotate(-20 102 106)"/><ellipse cx="198" cy="106" rx="38" ry="52" transform="rotate(20 198 106)"/><ellipse cx="150" cy="96" rx="48" ry="64"/></g>`;
const merkKop=(titel,sub)=>`<div class="merkkop"><img src="${logoSrc()}" alt="${esc(winkelNaam())}" class="merklogo"><svg class="merkcroissant" viewBox="0 0 300 200" aria-hidden="true">${CROISSANT('#fff','#f17d04')}</svg><div class="merktitel">${titel}</div>${sub?`<div class="merksub">${sub}</div>`:''}</div>`;
const DAGVELDEN=['vinkjes','status','aanpas','derving','dervBest','historie','notities','avond','snij','ontdooi','dervHH','bijbak','karTaak','afsluit','dervReg','levering'];
const zonderRev=v=>{if(isObj(v)&&'_rev' in v){const{_rev,...r}=v;return r}return v};
const stabiel=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).sort().reduce((r,x)=>(r[x]=v[x],r),{}):v);
const kloon=o=>o==null?o:JSON.parse(JSON.stringify(o));
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);

/* ================= laden en omzetten ================= */
function vanV1(d){
  const S={soorten:[],karren:d.karren||[],plan:{mv:{},za:{},zo:{}},karOverride:{},historie:{},derving:{}};
  for(const it of d.items||[]){
    const mv=it.mv||{},st=[mv.s,it.za?.s,it.zo?.s].filter(x=>x>0),max=st.length?Math.max(...st):12;
    S.soorten.push({id:it.id,naam:it.naam,kar:it.kar,groep:it.groep||'',min:1,max});
    const m=(mv.p||0)*(mv.s||0);S.plan.mv[it.id]=m;
    for(const k of['za','zo']){const x=it[k]||{};if(x.p==null&&x.s==null)continue;const v=(x.p??mv.p??0)*(x.s??mv.s??0);if(v!==m)S.plan[k][it.id]=v}
  }
  return S;
}
function naarV3(S){
  if(S.versie>=3)return S;
  const plan={mv:{m1:{}},za:{m1:{}},zo:{m1:{}}};
  for(const k of['mv','za','zo'])for(const[id,v]of Object.entries((S.plan||{})[k]||{}))if(v!=null)plan[k].m1[id]=v;
  S.plan=plan;S.momenten=[{id:'m1',naam:'Ochtend'}];S.vinkjes={};S.versie=3;return S;
}
function naarV6(S){
  if(S.versie>=6)return S;
  if(S.plan.mv){S.plan.ma=S.plan.mv;delete S.plan.mv}
  for(const k of['ma','di','wo','do','vr','za','zo'])S.plan[k]=S.plan[k]||{};
  S.fotos=S.fotos||{};
  for(const s of S.soorten||[]){if(s.foto){S.fotos[s.id]=s.foto}delete s.foto;delete s.ontdooien}
  if(Array.isArray(S.timers)){const o={};for(const t of S.timers)o[t.id]=t;S.timers=o}
  if(Array.isArray(S.log)){const o={};S.log.forEach((l,i)=>o['l'+l.t.toString(36)+i]=l);S.log=o}
  for(const d of Object.keys(S.notities||{}))if(Array.isArray(S.notities[d])){const o={};for(const n of S.notities[d])o[n.id]=n;S.notities[d]=o}
  const vr={};for(const[id,v]of Object.entries(S.voorraad||{})){if(typeof v==='number'){const s=(S.soorten||[]).find(x=>x.id===id);vr[id]={basis:v*(s?.perDoos||1),t:Date.now()}}else vr[id]=v}S.voorraad=vr;
  for(const d of Object.keys(S.vinkjes||{}))for(const m of Object.keys(S.vinkjes[d]||{}))for(const id of Object.keys(S.vinkjes[d][m]||{}))if(S.vinkjes[d][m][id]===true)S.vinkjes[d][m][id]={n:0,t:0};
  delete S.sessie;delete S.laatsteActie;S.versie=6;return S;
}
function vulAan(S){
  for(const k of['historie','derving','karOverride','afwijkend','notities','voorraad','vinkjes','status','avond','dervBest','aanpas','timers','log','fotos','snij','ontdooi','dervHH','bijbak','profielen','berichten','karTaak','afsluit','feestNee','notfotos','dervReg','levering','cadeau','pins','push','pbFouten','prijzen','pushTeam','uren','tbBijl','checklists','tbIn','homeTeam'])S[k]=isObj(S[k])?S[k]:{};
  for(const k of['gebruikers','soorten','karren'])S[k]=Array.isArray(S[k])?S[k]:[];
  S.plan=isObj(S.plan)?S.plan:{};for(const k of['ma','di','wo','do','vr','za','zo'])S.plan[k]=isObj(S.plan[k])?S.plan[k]:{};
  S.leverdagen=Array.isArray(S.leverdagen)?S.leverdagen:[1,3,5];S.ovenMax=S.ovenMax||10;if(S.omschakel===undefined)S.omschakel=14;if(!Array.isArray(S.versDagen))S.versDagen=[1,2,3,4,5,6];if(!isObj(S.versUitz))S.versUitz={};if(!isObj(S.herinnering))S.herinnering={aan:true,uur:10,min:0};if(S.uitlogMin==null)S.uitlogMin=5;
  if(!Array.isArray(S.momenten)||!S.momenten.length)S.momenten=[{id:'m1',naam:'Ochtend'}];
  for(const s of S.soorten){s.pluHalf??='';s.allergenen=Array.isArray(s.allergenen)?s.allergenen:[];s.ingredienten??='';s.nieuwSinds??=null;s.plu??='';s.type??='afbakken';s.gesneden??='voor';s.programma??='';s.instructie??='';s.temp??=null;s.baktijd??=null;s.perDoos??=null}
  if(!isObj(S.programmas)){S.programmas={};for(const x of S.soorten){const n=(x.programma||'').trim();if(!n)continue;const id='p_'+n.toLowerCase().replace(/[^a-z0-9]+/g,'_').slice(0,30);
    if(!S.programmas[id])S.programmas[id]={id,naam:n,temp:x.temp||null,baktijd:x.baktijd||null,notitie:''};x.programmaId=id}}
  syncProgVelden(S);
  S.materiaal=vulMateriaal(S.materiaal);
  S.facturen=vulFacturen(S.facturen);S.betalen=vulBetalen(S.betalen);
  S.bestelboeken=vulBestelboeken(S.bestelboeken);
  S.versie=6;return S;
}
function syncProgVelden(T=S){for(const x of T.soorten){const p=x.programmaId&&T.programmas?.[x.programmaId];if(x.programmaId&&!p)x.programmaId=null;if(p){x.programma=p.naam;x.temp=p.temp;x.baktijd=p.baktijd}}}
function leegS(){return vulAan({versie:6})}
let S=null,L={},basis={},revs={};
try{S=window.__BEGINSTAAT__||JSON.parse(localStorage.getItem(OPSLAG)||'null')}catch(e){}
try{L=JSON.parse(localStorage.getItem(OPSLAG_LOKAAL)||'{}')||{}}catch(e){L={}}
if(WK.id&&!Object.keys(L).length)L={modus:'online',wissel:true};  /* net naar een andere winkel gewisseld */
let WINKEL=(WK.lijst||[]).find(x=>x.id===WK.id)||null;
try{basis=JSON.parse(localStorage.getItem(OPSLAG_BASIS)||'{}')||{}}catch(e){basis={}}
try{revs=JSON.parse(localStorage.getItem(OPSLAG_REVS)||'{}')||{}}catch(e){revs={}}
for(const k of Object.keys(basis)){try{basis[k]=stabiel(JSON.parse(basis[k]))}catch(e){delete basis[k]}}
if(S&&S.sessie&&!L.sessie){L.sessie=S.sessie;L.laatsteActie=S.laatsteActie}
/* 10.2: gekoppeld toestel zonder eigen gegevens (opslag gewist of beschadigd): leeg beginnen en alles opnieuw ophalen, niets terugsturen */
if(!window.__BEGINSTAAT__&&L.gekoppeld&&L.modus!=='lokaal'&&!(S&&Array.isArray(S.soorten))){S=leegS();basis={};revs={};L.syncTot=null;L.herstel=true;try{localStorage.setItem(OPSLAG_LOKAAL,JSON.stringify(L))}catch(e){}}
if(!S||!S.soorten){let v1=null;if(!NS)try{v1=JSON.parse(localStorage.getItem('broodkarren-v1')||'null')}catch(e){}S=NS?leegS():vanV1(v1&&v1.items?v1:DEFAULTS)}
S=vulAan(naarV6(naarV3(S)));
