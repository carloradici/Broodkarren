function werkPlaten(){
  const uit=[];
  for(const s of maakLijst(datum,moment)){const map=new Map();
    for(const r of s.regels){if(r.ontdooi){uit.push({kar:s.naam,plaat:'',ontdooi:true,regels:[r]});continue}if(!map.has(r.plaat)){map.set(r.plaat,{kar:s.naam,plaat:r.plaat,regels:[]});uit.push(map.get(r.plaat))}map.get(r.plaat).regels.push(r)}}
  return uit;
}
function renderWerk(){
  const el=document.getElementById('werk'),p=werkPlaten(),v=S.vinkjes[datum]?.[moment]||{};
  if(!p.length){werk=null;el.classList.remove('open');return}
  werk.i=Math.min(Math.max(0,werk.i),p.length);el.classList.add('open');setTimeout(terugBewaak,0);
  const ka=p.filter(x=>x.regels.every(r=>v[r.s.id])).length;
  let h=`<div class="wkop"><button data-a="werkdicht">Sluiten</button><span>${ka} / ${p.length} klaar</span><span style="width:60px"></span></div><div class="wbalk"><div style="width:${ka/p.length*100}%"></div></div>`;
  if(werk.i>=p.length){h+=`<div class="klaarscherm"><b>✓</b><div style="font-size:22px;font-weight:800">${ka===p.length?'Alles klaargezet!':'Einde van de lijst'}</div><p style="color:var(--grijs)">${ka<p.length?`Nog ${p.length-ka} niet afgevinkt.`:''}</p></div>
    <div class="wknoppen"><div class="wklein"><button data-a="werknav" data-v="-1">‹ Terug</button><button data-a="werkdicht">Sluiten</button></div></div>`}
  else{const x=p[werk.i],ok=x.regels.every(r=>v[r.s.id]);
    h+=`<div class="winhoud"><div class="wkar">${esc(x.kar)}</div><div class="wplaat">${x.ontdooi?`<small>Ontdooien</small>${x.regels[0].n} stuks`:`<small>Plaat</small>${x.plaat}`}</div>
      ${x.regels.map(r=>`<div class="witem ${v[r.s.id]?'ok':''}">${sFoto(r.s.id)?`<img class="wfoto" src="${sFoto(r.s.id)}" alt="">`:''}<div class="n">${esc(r.s.naam)}</div>${r.s.plu?`<div class="wplu plu">PLU ${esc(r.s.plu)}</div>`:''}<div class="a">${r.n} stuks${!r.ontdooi&&(r.v.platen>1||r.v.delen[0]!==r.n)?` (${r.v.delen.join(' + ')})`:''}${r.aangepast?` – ${r.extra?'extra':`gepland ${r.gepland}`}`:''}</div>
        ${r.s.programma||r.s.temp||r.s.baktijd?`<div class="wprog">${r.s.programma?`Ovenprogramma <b>${esc(r.s.programma)}</b>`:''}${[r.s.temp?r.s.temp+'°C':'',r.s.baktijd?r.s.baktijd+' min':''].filter(Boolean).map(t=>` · ${t}`).join('')}</div>`:''}
        ${r.s.instructie?`<div class="winstr">${esc(r.s.instructie).replace(/\n/g,'<br>')}</div>`:''}</div>`).join('')}</div>
      <div class="wknoppen"><button class="wgroot" data-a="werkklaar">${ok?'Volgende plaat ›':'✓ Klaar – volgende'}</button><div class="wklein"><button data-a="werknav" data-v="-1">‹ Vorige</button><button data-a="werknav" data-v="1">Overslaan ›</button></div></div>`}
  el.innerHTML=h;
}

/* ---------- Invullen ---------- */
function planOpties(){
  const afw=Object.keys(S.afwijkend).filter(d=>d>=plusDagen(iso(),-1)).sort();
  if(planKeuze.startsWith('afw:')&&!S.afwijkend[planKeuze.slice(4)])planKeuze=dagKey(iso());
  return DAGEN.map(([k,,n])=>`<option value="${k}" ${planKeuze===k?'selected':''}>${n[0].toUpperCase()+n.slice(1)}</option>`).join('')+
    (afw.length?`<optgroup label="Afwijkende dagen">${afw.map(d=>`<option value="afw:${d}" ${planKeuze==='afw:'+d?'selected':''}>${esc(datumTekst(d))} – ${esc(S.afwijkend[d].naam)}</option>`).join('')}</optgroup>`:'');
}
function planRegelHint(s){
  const n=stuksIn(planKeuze,moment,s);if(!n)return'Niet klaarzetten';
  if(s.type!=='afbakken'){let t=`${n} ${s.type==='vers'?'broden':'stuks'}`;if(S.momenten.length>1){const tot=dagTotaal(planKeuze,s);if(tot!==n)t+=` – dag totaal ${tot}`}return t}
  const v=verdeling(n,s.max);let t=`${v.platen} ${v.platen===1?'plaat':'platen'} (${v.delen.join(' + ')})`;
  if(S.momenten.length>1){const tot=dagTotaal(planKeuze,s);if(tot!==n)t+=` – dag totaal ${tot}`}
  if(s.min>0&&v.rest<s.min)t+=` <span class="let">laatste plaat onder min. ${s.min}</span>`;
  return t;
}
function adviesLijst(){const g=groepVanPlan(planKeuze);return S.soorten.map(s=>({s,a:advies(s,g),nu:dagTotaal(planKeuze,s)})).filter(x=>x.a&&!x.a.op&&x.a.aantal!==x.nu)}
function planHtml(){
  const afw=planKeuze.startsWith('afw:'),g=groepVanPlan(planKeuze),volgtMa=!afw&&planKeuze!=='ma';
  let h=`<div class="kop"><div class="koprij"><h1>Invullen</h1>${info('invullen')}</div><p>${afw?'Afwijkende dag: aantallen voor alleen deze datum.':volgtMa?'Leeg = zelfde als maandag (grijs). 0 = niet klaarzetten.':'Aantal stuks per soort. Lege dagen volgen maandag.'}</p></div>
    <div class="planbalk"><select class="veld" id="planSelect">${planOpties()}</select></div>`+(()=>{const d=afw?planKeuze.slice(4):[...Array(10)].map((_,i)=>plusDagen(iso(),i)).find(x=>dagKey(x)===planKeuze);return d&&weerVan(d)?`<div class="weerlabel">${esc(datumTekst(d))}</div>`+weerRegel(d):''})()+momentSegment();
  const adv=adviesLijst();
  h+=`<div class="acties">${adv.length?`<button class="knop" data-a="allesadvies">Alles op advies (${adv.length})</button>`:''}${afw?'':`<button class="knop rand" data-a="kopieer">Kopieer naar…</button>`}</div>
    <label class="schakel" style="margin:6px 16px 0;color:var(--tekst);font-weight:400;border:0">Soorten met 0 verbergen<input type="checkbox" id="verberg0" ${L.verberg0?'checked':''}></label>`;
  if(!S.soorten.length)return h+`<p class="leeg">Er zijn nog geen broodsoorten.</p>`;
  let verborgen=0;
  for(const nr of karNrs()){
    const alle=S.soorten.filter(s=>effKar(s)===nr),lijst=L.verberg0?alle.filter(s=>dagTotaal(planKeuze,s)>0):alle;verborgen+=alle.length-lijst.length;if(!lijst.length)continue;
    const tot=lijst.reduce((t,s)=>t+stuksIn(planKeuze,moment,s),0);
    h+=`<div class="sectie"><div class="karkop"><b>${esc(karNaam(nr))}</b><span>${tot} stuks</span></div>`;
    for(const s of lijst){
      const eigen=eigenWaarde(planKeuze,moment,s.id),a=advies(s,g),dt=dagTotaal(planKeuze,s);
      const ph=volgtMa?(S.plan.ma[moment]?.[s.id]??0):'0';
      h+=`<div class="rij inv"><div class="groei"><div class="naam">${esc(s.naam)}<button class="karchip ${S.karOverride[s.id]!=null?'anders':''}" data-a="karwissel" data-v="${s.id}">kar ${effKar(s)}</button></div>
        <div class="sub" id="h-${s.id}">${s.type==='vers'&&DAG_NR[planKeuze]!=null&&!(S.versDagen||[]).includes(DAG_NR[planKeuze])?'<span class="let">geen levering op deze dag</span>':planRegelHint(s)}</div>
        ${a&&!a.op&&a.aantal!==dt?`<button class="advies" data-a="gebruik" data-v="${s.id}" data-n="${a.aantal}">Advies ${a.aantal}${a.trend?' '+a.trend:''}${S.momenten.length>1?' per dag':''} gebruiken</button>`:a&&a.op?`<div class="sub"><span class="let">${a.h.length}× niets over</span></div>`:''}</div>
        <input inputmode="numeric" maxlength="4" data-plan="${s.id}" value="${eigen??''}" placeholder="${ph}"></div>`;
    }
    h+='</div>';
  }
  if(verborgen)h+=`<p class="hulp" style="margin:12px 20px">${verborgen} ${verborgen===1?'soort':'soorten'} met 0 verborgen.</p>`;
  return h+`<p class="hulp" style="margin:14px 20px">Advies is gebaseerd op de derving van ${GROEP[g]}.${S.momenten.length>1?' Het geldt per dag en wordt over de bakmomenten verdeeld.':''} Tik op "kar" om een soort op een andere kar te zetten.</p>`;
}
function openKopieer(){
  bewerk={soort:'kopieer',doel:{}};
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Kopieer ${esc(dagNaam(planKeuze))}</b><button data-a="kopieerdoe" style="font-weight:700">Kopieer</button></div>
   <div class="pinhoud"><p class="hulp">Alle aantallen van ${esc(dagNaam(planKeuze))} (alle bakmomenten) worden overgenomen op:</p>
   <div class="dagchips" id="kopChips">${DAGEN.filter(([k])=>k!==planKeuze).map(([k,l])=>`<button class="chip" data-a="kopkies" data-v="${k}">${l}</button>`).join('')}</div>
   ${planKeuze!=='ma'?'<p class="hulp">Let op: kopieer je naar maandag, dan veranderen ook de dagen die maandag volgen.</p>':''}<div class="fout" id="fout"></div></div>`);
}
function openAllesAdvies(){
  const l=adviesLijst();
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Alles op advies</b><button data-a="adviestoepassen" style="font-weight:700">Toepassen</button></div>
   <div class="pinhoud"><p class="hulp">${esc(planNaam(planKeuze))}: deze aantallen per dag worden aangepast${S.momenten.length>1?' en over de bakmomenten verdeeld':''}.</p>
   <table class="tabel"><tr><th>Soort</th><th>Nu</th><th>Advies</th></tr>${l.map(x=>`<tr><td>${esc(x.s.naam)}</td><td>${x.nu}</td><td><b>${x.a.aantal}</b></td></tr>`).join('')}</table></div>`);
}

/* ---------- Derving ---------- */
const BESTEMMING=[['weg','Weggegooid'],['vb','Voedselbank'],['tg','TGTG']];
function dervDetail(d,id){const t=S.derving[d]?.[id];const x=S.dervBest[d]?.[id];if(x)return{...x};return t!=null?{weg:t,vb:0,tg:0}:null}
function zetDerving(d,id,b,n){borgHistorie(d);S.dervBest[d]=S.dervBest[d]||{};S.derving[d]=S.derving[d]||{};
  const x=dervDetail(d,id)||{weg:0,vb:0,tg:0};x[b]=Math.max(0,n);S.dervBest[d][id]=x;S.derving[d][id]=x.weg+x.vb+x.tg}
function wisDerving(d,id,b){const x=dervDetail(d,id);if(!x)return;x[b]=0;if(!x.weg&&!x.vb&&!x.tg){if(S.dervBest[d])delete S.dervBest[d][id];if(S.derving[d])delete S.derving[d][id]}else{S.dervBest[d]=S.dervBest[d]||{};S.dervBest[d][id]=x;S.derving[d][id]=x.weg+x.vb+x.tg}}

let dervReden=new Date().getHours()>=14?'over':'gevallen';
const REDEN={gevallen:'Gevallen / beschadigd',over:'Over (eind van de dag)'};
function conceptVan(d){L.dervConcept=L.dervConcept||{};for(const x of Object.keys(L.dervConcept))if(x<plusDagen(iso(),-7))delete L.dervConcept[x];return L.dervConcept[d]=L.dervConcept[d]||{}}
function conceptTot(x){return x?(x.weg||0)+(x.vb||0)+(x.tg||0):0}
function regLijst(d){return Object.values(S.dervReg[d]||{}).sort((a,b)=>a.t-b.t)}
function regTotaal(d,id,reden){return regLijst(d).filter(r=>r.reden===reden).reduce((t,r)=>t+conceptTot(r.items[id]),0)}
function zorgReg(d){if(S.dervReg[d])return;S.dervReg[d]={};const ids=Object.keys(S.derving[d]||{});
  if(ids.length){const items={};for(const id of ids){const x=dervDetail(d,id);if(x)items[id]={weg:x.weg,vb:x.vb,tg:x.tg}}S.dervReg[d].eerder={id:'eerder',t:0,wie:'eerder ingevuld',reden:'over',items,kassa:null,kassaVink:{}}}}
function herbereken(d){borgHistorie(d);S.derving[d]={};S.dervBest[d]={};
  for(const r of regLijst(d)){for(const[id,x]of Object.entries(r.items)){const b=S.dervBest[d][id]=S.dervBest[d][id]||{weg:0,vb:0,tg:0};b.weg+=x.weg||0;b.vb+=x.vb||0;b.tg+=x.tg||0;S.derving[d][id]=b.weg+b.vb+b.tg}}}
/* 10.8.5 derving: zoeken, volgorde en andere soorten toevoegen (bijv. iets van een eerdere dag) */
let dervZoek='';
function dervExtraIds(d){L.dervExtra=L.dervExtra||{};for(const x of Object.keys(L.dervExtra))if(x<plusDagen(iso(),-7))delete L.dervExtra[x];return new Set(L.dervExtra[d]||[])}
function openDervExtra(){bewerk={soort:'dervextra'};keuzeZoek='';
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Andere soort</b><span style="width:70px"></span></div>
   <div class="pinhoud"><p class="hulp">Kies wat je bij de derving van ${esc(datumTekst(dervDatum))} wilt zetten.</p>${volgKnop()}<div id="dervExtraLijst"></div></div>`);
  renderDervExtra()}
function renderDervExtra(){const d=dervDatum,hist=S.historie[d],con=conceptVan(d),ext=dervExtraIds(d);
  const al=s=>(hist?.gezet?.[s.id]??(hist?0:opgezetTotaal(d,s)))>0||gezetOverDatum(d,s)>0||S.derving[d]?.[s.id]!=null||con[s.id]||ext.has(s.id);
  const vrij=S.soorten.filter(s=>s.naam.trim()&&!al(s)&&zoekPast(s));
  const groepen=[...karNrs().map(nr=>[karNaam(nr),volg(vrij.filter(s=>s.type!=='vers'&&effKar(s)===nr))]),['Vers brood',volg(vrij.filter(s=>s.type==='vers'))]].filter(g=>g[1].length);
  const el=document.getElementById('dervExtraLijst');if(!el)return;
  el.innerHTML=groepen.length?groepen.map(([t,l])=>`<div class="sectie" style="margin:10px 0 0"><div class="karkop"><b>${esc(t)}</b></div>${l.map(s=>`<div class="rij"><button class="regel" data-a="dervextrakies" data-v="${s.id}">${sFoto(s.id)?`<img class="duim klein" src="${sFoto(s.id)}" alt="">`:''}<div class="groei"><div class="naam">${esc(s.naam)}</div></div><span class="sub">+ toevoegen</span></button></div>`).join('')}</div>`).join(''):`<p class="leeg" style="margin:10px 0">${keuzeZoek.trim()?'Niets gevonden.':'Alle soorten staan al bij de derving.'}</p>`}
/* 10.9 houdbaarheid: wat op dag d over datum gaat, is opgezet op d − THT */
function gezetOp(d,s){const h=S.historie[d];return h?.gezet?.[s.id]??(h?0:opgezetTotaal(d,s))}
function gezetOverDatum(d,s){const n=+s.tht||0;return n>0?gezetOp(plusDagen(d,-n),s):0}
function thtTekst(s,d,g,vd){const n=+s.tht||0,p=[];if(vd)p.push(`<b class="oranjetekst">over datum vandaag</b> (opgezet ${esc(datumTekst(plusDagen(d,-n)))}: ${fmt(vd)})`);
  if(g||!vd)p.push(`${fmt(g)} opgezet${n&&g?` · houdbaar t/m ${esc(datumTekst(plusDagen(d,n)))}`:''}`);return p.join(' · ')}
function dervingHtml(){
  const d=dervDatum,hist=S.historie[d],con=conceptVan(d);
  let h=`<div class="kop"><div class="koprij"><h1>Derving</h1>${info('derving')}</div><p>Vul in en tik op <b>Lijst opslaan</b>. De lijst neem je over in de kassa.</p></div>
    <div class="datumrij"><button data-a="dd" data-v="-1">‹</button><input type="date" id="dervdatum" value="${d}" max="${iso()}"><button data-a="dd" data-v="1">›</button></div>
    <div class="segment">${BESTEMMING.map(([k,l])=>`<button data-a="best" data-v="${k}" class="${best===k?'aan':''}">${l}</button>`).join('')}</div>`;
  let rijen='',totGezet=0,totOver=0,totGev=0;
  const blok=(titel,lijst)=>{if(!lijst.length)return;rijen+=`<div class="sectie"><div class="karkop"><b>${esc(titel)}</b></div>`;
    for(const{s,g,vd}of lijst){const over=S.derving[d]?.[s.id],gev=0,c=con[s.id];if(over!=null){totGezet+=g;totOver+=over}
      const sub=`${thtTekst(s,d,g,vd)}${over!=null?` · <b>${fmt(over)} opgeslagen</b>`:''}${c?` · <span class="conceptlabel">nu: ${fmt(conceptTot(c))}</span>`:''}`;
      if(s.type==='vers'&&s.gesneden==='on'){const hh=c?.hh?.[best]||{hele:0,halve:0};
        rijen+=`<div class="rij inv" style="flex-wrap:wrap"><div class="groei"><div class="naam">${esc(s.naam)}</div><div class="sub">${sub}</div></div>
        <div class="hhstep"><span>heel</span><button data-a="cstepH" data-v="${s.id}" data-deel="hele" data-n="-1">−</button><b>${hh.hele}</b><button data-a="cstepH" data-v="${s.id}" data-deel="hele" data-n="1">+</button>
        <span>half</span><button data-a="cstepH" data-v="${s.id}" data-deel="halve" data-n="-1">−</button><b>${hh.halve}</b><button data-a="cstepH" data-v="${s.id}" data-deel="halve" data-n="1">+</button></div></div>`}
      else rijen+=`<div class="rij inv"><div class="groei"><div class="naam">${esc(s.naam)}</div><div class="sub">${sub}</div></div>
        <div class="stepper"><button data-a="cstep" data-v="${s.id}" data-n="-1">−</button><input inputmode="numeric" maxlength="4" readonly data-blok data-cderv="${s.id}" value="${c&&c[best]!=null?fmt(c[best]):''}" placeholder="–"><button data-a="cstep" data-v="${s.id}" data-n="1">+</button></div></div>`}
    rijen+='</div>'};
  const ext=dervExtraIds(d),met=s=>({s,g:hist?.gezet?.[s.id]??(hist?0:opgezetTotaal(d,s)),vd:gezetOverDatum(d,s)}),telt=x=>x.g>0||x.vd>0||S.derving[d]?.[x.s.id]!=null||con[x.s.id]||ext.has(x.s.id),zk=x=>!dervZoek.trim()||x.s.naam.toLowerCase().includes(dervZoek.trim().toLowerCase()),vs=l=>volgAZ()?[...l].sort((a,b)=>a.s.naam.localeCompare(b.s.naam,'nl',{numeric:true,sensitivity:'base'})):l;
  let ooit=0;const fl=l=>{const t=l.map(met).filter(telt);ooit+=t.length;return vs(t.filter(zk))};
  for(const nr of karNrs())blok(karNaam(nr),fl(S.soorten.filter(s=>effKar(s)===nr&&s.type!=='vers')));
  blok('Vers brood',fl(S.soorten.filter(s=>s.type==='vers')));
  h+=`<p class="samenvat">${datumTekst(d)}${S.afwijkend[d]?` (${esc(S.afwijkend[d].naam)})`:''}${totGezet?` – ${fmt(totOver)} derving van ${fmt(totGezet)} opgezet (${Math.round(totOver/totGezet*100)}%)`:''}</p>`;
  const regs=regLijst(d);
  if(regs.length)h+=`<div class="knoppen" style="margin-top:4px"><button class="knop rand" data-a="dlijsten" data-v="${d}">Opgeslagen lijsten (${regs.length})</button></div>`;
  h+=notitiesHtml(d)+(ooit?`<div style="margin:6px 16px 0"><input class="veld" id="dervZoek" type="search" placeholder="🔍 Zoeken" autocomplete="off" value="${esc(dervZoek)}">${volgChips()}</div>`:'')
    +(rijen||(ooit?'<p class="leeg">Niets gevonden.</p>':`<p class="leeg">Er is op deze dag niets klaargezet.</p>`))
    +(mag('derving')?`<div class="knoppen"><button class="knop rand" data-a="dervextra">+ Andere soort</button></div><p class="hulp" style="text-align:center;margin-top:0">Voor iets wat vandaag niet op de lijst stond, bijv. pecanbroodjes van maandag.</p>`:'');
  const n=Object.keys(con).length;
  if(mag('derving'))h+=`<div class="knoppen"><button class="knop rand klein" data-a="dnul">Niet ingevulde soorten op 0</button></div>`;
  if(n)h+=`<div class="ovenbalk"><div><b>${n} ${n===1?'product':'producten'}</b> ingevuld, nog niet opgeslagen</div><div class="rijtje"><button class="knop rand" data-a="dannuleer">Wissen</button><button class="knop" style="margin-left:auto" data-a="dopslaan">Lijst opslaan</button></div></div>`;
  return h;
}
function lijstSamenvatting(r){const n=Object.keys(r.items).length,st=Object.values(r.items).reduce((t,x)=>t+conceptTot(x),0);return`${n} ${n===1?'product':'producten'}, ${fmt(st)} stuks`}
function lijstRij(d,r){return`<div class="rij"><button class="regel ${r.kassa?'verwerkt':''}" data-a="kassa" data-v="${esc(r.id)}" data-d="${d}"><div class="groei"><div class="naam">${r.t?tijdTekst(r.t):'Eerder ingevuld'}</div><div class="sub">${esc(r.wie)} · ${lijstSamenvatting(r)}</div></div>${r.kassa?`<span class="st schap">✓ kassa</span>`:`<span class="st aangepast">open</span>`}<span class="pijl">›</span></button></div>`}
function openDagLijsten(d){const l=regLijst(d);
  toonSheet(`<div class="pkop"><span style="width:60px"></span><b>Lijsten ${esc(datumTekst(d))}</b><button data-a="sluit" style="font-weight:700">Sluiten</button></div><div class="pinhoud">
   ${l.length?`<div class="sectie" style="margin:10px 0 0">${l.map(r=>lijstRij(d,r)).join('')}</div>`:'<p class="leeg">Nog geen lijsten op deze dag.</p>'}</div>`)}
function dervLijstenHtml(){
  const dagen=Object.keys(S.dervReg).filter(d=>regLijst(d).length).sort().reverse();
  return`<div class="kop"><div class="koprij"><h1>Dervinglijsten</h1>${info('derving')}</div><p>Opgeslagen lijsten om over te nemen in de kassa.</p></div>
   ${dagen.length?dagen.map(d=>`<div class="sectie"><div class="karkop"><b>${esc(datumTekst(d))} ${vanIso(d).getFullYear()}</b><span>${regLijst(d).filter(r=>!r.kassa).length?`${regLijst(d).filter(r=>!r.kassa).length} open`:'✓ alles verwerkt'}</span></div>${regLijst(d).slice().reverse().map(r=>lijstRij(d,r)).join('')}</div>`).join(''):'<p class="leeg">Nog geen opgeslagen lijsten. Vul derving in en tik op Lijst opslaan.</p>'}`}
/* 10.9.1: soorten op 0 hoeven niet in de kassa en hoeven niet afgevinkt */
function nulKassa(r){let n=0;for(const[sid,x]of Object.entries(r.items||{})){if(!S.soorten.some(y=>y.id===sid))continue;if(!conceptTot(x)&&!Object.values(x.hh||{}).some(v=>v&&(v.hele||v.halve)))n++}return n}
function openKassa(id,d=dervDatum){
  const r=S.dervReg[d]?.[id];if(!r)return;bewerk={soort:'kassa',id,d};verwStap=false;
  let regels=[];for(const[sid,x]of Object.entries(r.items)){const s=S.soorten.find(y=>y.id===sid);if(!s)continue;
    if(x.hh&&s.type==='vers'&&s.gesneden==='on'){for(const[deel,lbl,plu]of[['hele','heel',s.plu],['halve','half',s.pluHalf]]){const per={};let tot=0;for(const[b2,v2]of Object.entries(x.hh)){if(v2[deel]){per[b2]=v2[deel];tot+=v2[deel]}}
      if(tot)regels.push({key:sid+':'+deel,naam:s.naam+' '+lbl,plu,tot,delen:BESTEMMING.filter(([k])=>per[k]).map(([k])=>`${per[k]} ${k==='weg'?'weg':k==='vb'?'VB':'TGTG'}`).join(' · ')})}}
    else regels.push({key:sid,naam:s.naam,plu:s.plu,tot:conceptTot(x),delen:BESTEMMING.filter(([k])=>x[k]).map(([k])=>`${fmt(x[k])} ${k==='weg'?'weg':k==='vb'?'VB':'TGTG'}`).join(' · ')||'0'})}
  toonSheet(`<div class="pkop"><button data-a="sluit">Sluiten</button><b>Dervinglijst</b><span style="width:60px"></span></div><div class="pinhoud">
   <p class="hulp">${esc(datumTekst(d))} · ${r.t?tijdTekst(r.t):'eerder ingevuld'} · ${esc(r.wie)}. Vink af wat je in de kassa hebt gezet.</p>
   ${(()=>{const nul=regels.filter(g=>!g.tot).length;regels=regels.filter(g=>g.tot);return nul&&!regels.length?`<p class="leeg">Alles staat op 0 – er hoeft niets in de kassa.</p>`:''})()}
   ${regels.length?`<div class="sectie" style="margin:0">${regels.map(g=>{const ok=!!r.kassaVink?.[g.key];
     return`<div class="rij"><button class="regel ${ok?'klaar':''}" data-a="kvink" data-v="${esc(g.key)}"><div class="groei"><div class="naam">${esc(g.naam)}</div><div class="sub">${g.delen}</div></div><div class="kassaplu">${g.plu?esc(g.plu):'<span class="let" style="font-size:12px">geen PLU</span>'}</div><div class="kassaaantal">${fmt(g.tot)}</div><div class="vinkvak">${ok?'✓':''}</div></button></div>`}).join('')}</div>`:''}
   ${nulKassa(r)?`<p class="hulp" style="text-align:center">${nulKassa(r)} ${nulKassa(r)===1?'soort':'soorten'} op 0 – hoeven niet in de kassa</p>`:''}
   ${r.kassa?`<p class="hulp" style="text-align:center">✓ Verwerkt in kassa door ${esc(r.kassa.wie)} om ${tijdTekst(r.kassa.t)}</p>`:''}
   <div class="knoppen"><button class="knop ${r.kassa?'rand':''} ${!r.kassa&&regels.every(g=>r.kassaVink?.[g.key])?'oplichten':''}" data-a="kassaok">${r.kassa?'Toch niet verwerkt':'Verwerkt in kassa'}</button></div>
   ${mag('derving')?`<button class="verwijder" data-a="kassaweg">Lijst verwijderen</button>`:''}</div>`);
}


function dervSub(d,id,g){const x=dervDetail(d,id),v=x?BESTEMMING.filter(([k])=>x[k]).map(([k])=>`${fmt(x[k])} ${k==='weg'?'weg':k==='vb'?'VB':'TGTG'}`).join(', '):'';return`${fmt(g)} opgezet${x?` – over: ${v||'0'}`:''}`}


/* ---------- Meer ---------- */
function meerHtml(){
  const terug=`<button class="terug" data-a="sub" data-v="">‹ Meer</button>`;
  if(sub==='vraag'){sub=null;setTimeout(openVraag,0)}
  if(MEER_FUNCTIE[sub]&&!heeft(MEER_FUNCTIE[sub]))sub=null;
  if(sub==='winkels'&&isEigenaar()&&isAdmin())return terug+winkelsHtml();
  if(sub==='winkel'&&WINKEL&&kanBeheren()&&isAdmin())return terug+winkelHtml();
  if(sub==='abonnement'&&isEigenaar()&&isAdmin())return terug+abonnementHtml();
  if(sub==='facturen'&&facturenMag())return terug+facturenHtml();
  if(sub==='tebetalen'&&betalenMag())return terug+betalenHtml();
  if(sub==='hometeam'&&isAdmin())return terug+homeTeamHtml();
  if(sub==='dervingeuro'&&isAdmin())return terug+dervEuroHtml();
  if(sub==='uren'&&isAdmin())return terug+urenBeheerHtml();
  if(sub==='bestelboeken'&&bbMag())return terug+bestelboekenHtml();
  if(sub==='bbkies'&&bbMag())return`<button class="terug" data-a="sub" data-v="bestelboeken">‹ Bestelboeken</button>`+bbKiesHtml();
  if(sub==='bbsan'&&bbMag())return`<button class="terug" data-a="sub" data-v="bestelboeken">‹ Bestelboeken</button>`+bbSanHtml();
  if(sub==='aanbieder'&&isAanbieder()&&isAdmin())return terug+aanbiederHtml();
  if(sub==='berichten')return terug+berichtenHtml();
  if(sub==='gedaan'&&isAdmin())return terug+gedaanHtml();
  if(sub==='afsluiten'&&mag('derving'))return terug+afsluitHtml();
  if(sub==='nieuw'&&mag('rapport'))return terug+nieuwHtml();
  if(sub==='export'&&mag('rapport'))return terug+exportHtml();
  if(sub==='notities')return terug+notOverzichtHtml();
  if(sub==='materiaal')return terug+materiaalHtml();
  if(sub==='push'&&isAdmin()&&kanBeheren())return terug+pushHtml();
  if(sub==='cadeau'&&isAdmin()&&kanBeheren())return terug+cadeauHtml();
  if(sub==='klaar'&&isAdmin()&&kanBeheren())return terug+klaarHtml();
  if(sub==='dervlijsten'&&mag('derving'))return terug+dervLijstenHtml();
  if(sub==='uitleg')return terug+uitlegHtml();
  if(sub==='instellingen')return terug+instellingenHtml();
  if(sub==='plu')return terug+pluHtml();
  if(sub==='programmas'&&mag('soorten'))return terug+programmasHtml();
  if(sub==='rapport'&&mag('rapport'))return terug+rapportHtml();
  if(sub==='bestel'&&mag('bestellen'))return terug+bestelHtml();
  if(sub==='afwijkend'&&mag('invullen'))return terug+afwijkendHtml();
  if(sub==='soorten'&&mag('soorten'))return terug+soortenHtml();
  if(sub==='log'&&isAdmin())return terug+logHtml();
  if(sub==='team'&&isAdmin()&&kanBeheren())return terug+teamHtml();
  if(sub==='ontdooi'&&mag('vinken'))return terug+ontdooiHtml();
  if(sub==='pakbonnen'&&mag('vinken'))return terug+pakbonnenHtml();
  if(sub==='leesfouten'&&isAdmin()&&kanBeheren())return terug+leesfoutenHtml();
  if(sub==='weekoverzicht'&&isAdmin()&&kanBeheren())return terug+weekoverzichtHtml();
  if(sub==='besteladvies'&&isAdmin()&&kanBeheren())return terug+bestelAdviesHtml();
  if(sub==='prijzen'&&isAdmin()&&kanBeheren())return terug+prijzenHtml();
  if(sub==='backup'&&isAdmin()&&kanBeheren())return terug+backupHtml();
  sub=null;const g=ik();
  const o=ongelezen();
  const om=ongelezenM(),items=[...(isAdmin()?[['berichten',`Berichten${o?` <span class="telbol">${o}</span>`:''}`,'Gesprekken met medewerkers',()=>true]]:[['berichten',`Berichten${om?` <span class="telbol">${om}</span>`:''}`,'Vraag of melding aan de beheerder, en antwoorden',()=>true]]),
    ['afsluiten','Dag afsluiten','Checklist voor het eind van de dag',()=>mag('derving')],['materiaal','Materiaal','Verpakking bijna op? Meld het hier',()=>true],['notities','Notities','Alle dagnotities terugzoeken',()=>true],['dervlijsten','Dervinglijsten','Opgeslagen derving om in de kassa te zetten',()=>mag('derving')],['ontdooi','Ontdooien zoet','Wat moet er uit de vriezer',()=>mag('vinken')],['pakbonnen','Pakbonnen','Leveringen terugzoeken: pakbon, geteld, verschil',()=>mag('vinken')],['rapport','Weekrapport','Derving per soort per week',()=>mag('rapport')],...(isAdmin()?[['dervingeuro','💶 Derving in euro’s','12 weken, per soort en advies voor de opzet',()=>true]]:[]),
    ['bestel','Deegbestelling en voorraad','Voorraad tellen en dozen bestellen',()=>mag('bestellen')],['afwijkend','Afwijkende dagen','Feestdagen, gesloten dagen',()=>mag('invullen')],
    ['soorten','Broodsoorten en instellingen','Soorten, karren, bakmomenten, oven',()=>mag('soorten')],['programmas',"Bakprogramma's","Programma's koppelen aan producten",()=>mag('soorten')],['team','Medewerkers en rechten','Accounts beheren',()=>isAdmin()&&kanBeheren(),isAdmin()?'Alleen op je eigen telefoon':null],
    ['gedaan','Vandaag gedaan','Per persoon wat er is gedaan',()=>isAdmin()],['log','Logboek','Wie deed wat en wanneer',()=>isAdmin()],
    ['bestelboeken','📘 Bestelboeken','Eigen bestelboeken uit het bestelboek van de leverancier',()=>bbMag()],['nieuw','Nieuwe producten','Verkoop van nieuwe producten volgen',()=>mag('rapport')],['export','Exporteren naar Excel','Planning, derving of weekrapport',()=>mag('rapport')],['plu','PLU-lijst','PLU-nummers opzoeken',()=>true],['instellingen','App-instellingen','Weergave en persoonlijke keuzes',()=>true],['uitleg','Uitleg','Hoe werkt de app?',()=>true]];
  return`<div class="kop"><div class="koprij"><h1>Meer</h1>${info('meer')}</div><p>Ingelogd als <b>${esc(g.naam)}</b> (${g.rol==='admin'?'beheerder':'medewerker'})</p></div>
    ${meerLijstHtml(items)}
    ${kanBeheren()?`<div class="rij"><button class="regel" data-a="gebruiker" data-v="${g.id}"><div class="groei"><div class="naam">Mijn pincode wijzigen</div></div><span class="pijl">›</span></button></div>`:''}</div>

    <div class="kaartje"><h3>Dit toestel</h3>${statusHtml()}${L.laatsteFout&&Date.now()-L.laatsteFout.t<7*864e5?`<div class="sub" style="margin-top:6px">Laatste fout (${esc(datumTekst(iso(new Date(L.laatsteFout.t))))} ${esc(tijdTekst(L.laatsteFout.t))}${L.laatsteFout.waar?', '+esc(L.laatsteFout.waar):''}): <span class="oranjetekst">${esc(L.laatsteFout.tekst)}</span></div>`:''}<div class="sub" style="margin-top:6px"><b>Versie ${APP_BOUW}</b>${nieuweBouw?` · <span class="oranjetekst">versie ${esc(nieuweBouw)} staat klaar</span>`:''}</div><div class="sub">${L.modus==='lokaal'?'Gegevens staan alleen op dit toestel.':WINKEL?`Gekoppeld met <b>${esc(WINKEL.naam)}</b> als ${{eigenaar:'eigenaar',bedrijfsleider:'bedrijfsleider',winkel:'winkeltoestel'}[WINKEL.rol]||WINKEL.rol}.`:`Gekoppeld met de ${L.beheerder?'beheerders':'winkel'}-login.`}</div>
    <div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:10px;flex-wrap:wrap"><button class="knop rand" data-a="updatecheck">Controleren op update</button>${L.modus==='lokaal'?`<button class="knop rand" data-a="naarkoppel">Toestel koppelen</button>`:isAdmin()?`<button class="knop rand" data-a="ontkoppel">${afwStap==='ontkoppel'?'Zeker? Tik nogmaals':'Toestel ontkoppelen'}</button>`:''}</div></div>
    <div class="knoppen"><button class="knop rand" data-a="uitloggen">Uitloggen</button></div>`;
}

function rapportHtml(){
  const dagen=[...Array(7)].map((_,i)=>plusDagen(rapWeek,i)).filter(d=>d<=iso());
  const eind=plusDagen(rapWeek,6),rows=[],tb={weg:0,vb:0,tg:0};let tg=0,td=0,tgAll=0;
  for(const s of S.soorten){let gezet=0,gezetGeteld=0,der=0,geteld=0,nul=0,bij=0,bijKeer=0,gev=0;
    for(const d of dagen){const g=S.historie[d]?.gezet?.[s.id]??0;gezet+=g;const w=S.derving[d]?.[s.id];const bx=dervDetail(d,s.id);if(bx)for(const k in tb)tb[k]+=bx[k];
      const bb=bijbakStuks(d,s.id);if(bb){bij+=bb;bijKeer++}
      if(w!=null){der+=w;gezetGeteld+=g;geteld++;if(w===0&&g>0)nul++}}
    if(!gezet&&!der&&!gev)continue;rows.push({s,gezet,der,geteld,nul,bij,bijKeer,gev,pct:gezetGeteld?der/gezetGeteld*100:null});tg+=gezetGeteld;td+=der;tgAll+=gezet}
  rows.sort((a,b)=>(b.pct??-1)-(a.pct??-1));
  const dagenGeteld=dagen.filter(d=>S.derving[d]&&Object.keys(S.derving[d]).length).length;
  const hoog=rows.filter(r=>r.pct>=15).slice(0,3),vaakOp=rows.filter(r=>r.nul>=3),vaakBij=rows.filter(r=>r.bijKeer>=2),heeftBij=rows.some(r=>r.bij),heeftGev=rows.some(r=>r.gev),totGev=rows.reduce((t,r)=>t+r.gev,0);
  const notes=dagen.flatMap(d=>Object.values(S.notities[d]||{}).map(n=>({d,...n})));
  let h=`<div class="kop"><div class="koprij"><h1>Weekrapport</h1>${info('rapport')}</div><p>Week ${weeknr(rapWeek)}: ${esc(datumTekst(rapWeek))} t/m ${esc(datumTekst(eind))}</p></div>
   <div class="datumnav"><button class="pijlk" data-a="week" data-v="-7">‹</button><button class="dlabel" data-a="week" data-v="0">Week ${weeknr(rapWeek)}<small>tik voor deze week</small></button><button class="pijlk" data-a="week" data-v="7">›</button></div>
   <div class="cijfers"><div class="cijfer"><b>${fmt(tgAll)}</b><span>opgezet</span></div><div class="cijfer"><b>${fmt(td)}</b><span>over (geteld)</span></div><div class="cijfer"><b>${tg?Math.round(td/tg*100)+'%':'–'}</b><span>derving</span></div>${isAdmin()&&kanBeheren()&&Object.keys(S.prijzen).length?`<div class="cijfer"><b>${euro2(dervEuro(rapWeek,eind))}</b><span>derving in €</span></div>`:''}</div>
   <p class="samenvat">Derving geteld op ${dagenGeteld} van ${dagen.length} dagen.</p>
   <div class="cijfers"><div class="cijfer"><b>${fmt(tb.weg)}</b><span>weggegooid</span></div><div class="cijfer"><b>${fmt(tb.vb)}</b><span>voedselbank</span></div><div class="cijfer"><b>${fmt(tb.tg)}</b><span>Too Good To Go</span></div></div>`;
  if(hoog.length||vaakOp.length||vaakBij.length)h+=`<div class="kaartje"><h3>Opvallend</h3>${vaakBij.map(r=>`<div class="sub"><b>${r.bijKeer}× bijgebakken</b> (${r.bij} stuks): ${esc(r.s.naam)}</div>`).join('')}${hoog.map(r=>`<div class="sub"><span class="hoog">${Math.round(r.pct)}%</span> derving: ${esc(r.s.naam)}</div>`).join('')}${vaakOp.map(r=>`<div class="sub"><span class="goed">${r.nul}× niets over</span>: ${esc(r.s.naam)} – mogelijk te weinig</div>`).join('')}</div>`;
  h+=`<div class="sectie"><div class="tabelwrap"><table class="tabel"><tr><th>Soort</th><th>Opgezet</th>${heeftBij?'<th>Bij</th>':''}<th>Over</th>${heeftGev?'<th>Gev.</th>':''}<th>%</th></tr>${rows.map(r=>`<tr><td>${esc(r.s.naam)}</td><td>${fmt(r.gezet)}</td>${heeftBij?`<td>${r.bij?fmt(r.bij):''}</td>`:''}<td>${r.geteld?fmt(r.der):'–'}</td>${heeftGev?`<td>${r.gev?fmt(r.gev):''}</td>`:''}<td class="${r.pct>=15?'hoog':''}">${r.pct==null?'–':Math.round(r.pct)+'%'}</td></tr>`).join('')||'<tr><td colspan="4">Nog geen gegevens voor deze week.</td></tr>'}</table></div></div>`;
  if(notes.length)h+=`<div class="kaartje"><h3>Dagnotities</h3>${notes.map(n=>`<div class="sub"><b>${esc(datumTekst(n.d))}</b>: ${esc(n.tekst)} (${esc(n.wie)})</div>`).join('')}</div>`;
  return h+`<div class="knoppen"><button class="knop rand" data-a="deelrapport">Delen</button></div>`;
}
function weeknr(d){const x=vanIso(d);x.setDate(x.getDate()+3-(x.getDay()+6)%7);const j=new Date(x.getFullYear(),0,4);return 1+Math.round(((x-j)/864e5-3+(j.getDay()+6)%7)/7)}
function rapportTekst(){const tmp=document.createElement('div');tmp.innerHTML=rapportHtml();
  return'Broodkarren – '+[...tmp.querySelectorAll('.kop p, .samenvat, .cijfer, .kaartje .sub, tr')].map(e=>e.innerText.replace(/\t/g,'  ')).join('\n')}
function bestelHtml(){
  const b=bestelBerekening();
  let h=`<div class="kop"><div class="koprij"><h1>Deegbestelling</h1>${info('bestel')}</div><p>Tel af en toe de voorraad. Wat er daarna wordt afgevinkt op Klaarzetten, gaat er automatisch af.</p></div>
   <div class="kaartje"><h3>Leverdagen</h3><div class="dagchips">${WEEKDAGEN.map(([n,l])=>`<button class="chip ${S.leverdagen.includes(n)?'aan':''}" data-a="leverdag" data-v="${n}">${l}</button>`).join('')}</div></div>`;
  if(!b)return h+`<p class="leeg">Kies minimaal één leverdag.</p>`;
  h+=`<p class="samenvat">Bestelling voor levering <b>${esc(datumTekst(b.L1))}</b>. Nodig van ${esc(datumTekst(b.van))} t/m ${esc(datumTekst(b.tot))} (tot de levering van ${esc(datumTekst(b.L2))}).</p>`;
  const totDozen=b.regels.reduce((t,r)=>t+(r.dozen||0),0);
  h+=`<div class="cijfers"><div class="cijfer"><b>${totDozen}</b><span>dozen bestellen</span></div><div class="cijfer"><b>${b.regels.filter(r=>r.dozen>0).length}</b><span>soorten</span></div></div>`;
  for(const nr of karNrs()){const rs=b.regels.filter(r=>effKar(r.s)===nr);if(!rs.length)continue;
    h+=`<div class="sectie"><div class="karkop"><b>${esc(karNaam(nr))}</b></div>`;
    for(const r of rs){const v=S.voorraad[r.s.id];
      h+=`<div class="rij inv"><div class="groei"><div class="naam">${esc(r.s.naam)}</div><div class="sub">Nodig ${r.nodig} stuks${r.s.perDoos?` (${r.s.perDoos} per doos)`:''}</div>
      <div class="sub">${r.s.perDoos?(r.dozen>0?`<b style="color:var(--oranje)">Bestel ${r.dozen} ${r.dozen===1?'doos':'dozen'}</b>`:'<span class="goed">Genoeg voorraad</span>'):'<span class="let">Stuks per doos niet ingevuld</span>'}</div></div>
      <button class="vrknop" data-a="tel" data-v="${r.s.id}"><small>voorraad</small><b>${esc(voorraadTekst(r.s,r.vr))}</b>${v?`<small>geteld ${esc(datumTekst(iso(new Date(v.t))))}</small>`:'<small>tik om te tellen</small>'}</button></div>`}
    h+='</div>'}
  const zonder=S.soorten.filter(s=>s.type!=='vers'&&!b.regels.find(r=>r.s.id===s.id));
  if(zonder.length)h+=`<div class="kaartje"><h3>Overige soorten</h3><div class="chips">${zonder.map(s=>`<button class="chip" data-a="tel" data-v="${s.id}">${esc(s.naam)}</button>`).join('')}</div><p class="hulp">Tik om de voorraad te tellen.</p></div>`;
  return h;
}
function openTel(id){
  const s=S.soorten.find(x=>x.id===id);if(!s)return;const nu=Math.max(0,voorraadNu(id)??0);bewerk={soort:'tel',id};
  const dz=s.perDoos?Math.floor(nu/s.perDoos):0,los=s.perDoos?nu%s.perDoos:nu;
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Voorraad tellen</b><button data-a="telopslaan" style="font-weight:700">Opslaan</button></div>
   <div class="pinhoud"><div class="naam" style="font-size:20px;margin-top:14px">${esc(s.naam)}</div><p class="hulp">Tel wat er nu in de vriezer ligt. Wat daarna wordt afgevinkt op Klaarzetten, gaat er automatisch af.</p>
   ${s.perDoos?`<label>Hele dozen (${s.perDoos} per doos)</label><div class="grootstep"><button data-a="telstap" data-v="telDoos" data-n="-1">−</button><input id="telDoos" inputmode="numeric" maxlength="4" value="${dz}"><button data-a="telstap" data-v="telDoos" data-n="1">+</button></div>`:''}
   <label>${s.perDoos?'Losse stuks':'Aantal stuks'}</label><div class="grootstep"><button data-a="telstap" data-v="telLos" data-n="-1">−</button><input id="telLos" inputmode="numeric" maxlength="4" value="${los}"><button data-a="telstap" data-v="telLos" data-n="1">+</button></div></div>`);
}
function afwijkendHtml(){
  const lijst=Object.keys(S.afwijkend).sort(),t=iso();
  return`<div class="kop"><div class="koprij"><h1>Afwijkende dagen</h1>${info('afwijkend')}</div><p>Een eigen planning voor één datum, zoals een feestdag of een dag dat jullie dicht zijn.</p></div>
   <div class="kaartje"><h3>Nieuwe afwijkende dag</h3><label style="margin-top:6px">Datum</label><input class="veld" type="date" id="afwDatum" min="${t}" value="${esc(afwForm.datum)}">
   <label>Naam</label><input class="veld" id="afwNaam" placeholder="Bijv. 1e Kerstdag" maxlength="40" value="${esc(afwForm.naam)}">
   <label>Beginnen met</label><div class="chips"><button class="chip ${afwForm.start==='kopie'?'aan':''}" data-a="afwstart" data-v="kopie">Kopie van gewone planning</button><button class="chip ${afwForm.start==='nul'?'aan':''}" data-a="afwstart" data-v="nul">Alles op 0 (gesloten)</button></div>
   <div class="fout" id="fout"></div>
   <div class="knoppen" style="justify-content:flex-start;padding:0"><button class="knop" data-a="afwtoevoegen">Toevoegen</button></div></div>
   ${lijst.length?`<div class="sectie">${lijst.map(d=>{const leeg=!Object.values(S.afwijkend[d].plan||{}).some(m=>Object.values(m||{}).some(x=>x>0));
     return`<div class="rij inv" style="flex-wrap:wrap;${d<t?'opacity:.5':''}"><div class="groei"><div class="naam">${esc(S.afwijkend[d].naam)}</div><div class="sub">${esc(datumTekst(d))} ${vanIso(d).getFullYear()}${leeg?' – gesloten (alles 0)':''}</div><div class="sub" style="margin-top:6px">Vers brood geleverd? <button class="chip ${versGeleverd(d)?'aan':''}" data-a="versuitz" data-v="${d}" data-n="ja">Ja</button> <button class="chip ${versGeleverd(d)?'':'aan'}" data-a="versuitz" data-v="${d}" data-n="nee">Nee</button></div></div>
     ${d>=plusDagen(t,-1)?`<button class="knop rand klein" data-a="afwbewerk" data-v="${d}">Aantallen</button>${leeg?'':`<button class="knop rand klein" data-a="afwnul" data-v="${d}">${afwStap==='nul:'+d?'Zeker?':'Alles op 0'}</button>`}`:''}<button class="knop rand klein rood" data-a="afwweg" data-v="${d}">${afwStap===d?'Zeker?':'×'}</button></div>`}).join('')}</div>`:''}`;
}


function ontdooiLijst(d){return Object.values(S.ontdooi[d]||{}).sort((a,b)=>a.t-b.t)}
function ontdooiNaam(x){if(x.soort){const s=S.soorten.find(y=>y.id===x.soort);if(s)return s.naam}return x.tekst||'?'}
function ontdooiHtml(){
  const d=ontDatum,l=ontdooiLijst(d),morgen=d===plusDagen(iso(),1);
  let h=`<div class="kop"><div class="koprij"><h1>Ontdooien zoet</h1>${info('ontdooi')}</div><p>Zet zelf op de lijst wat er uit de vriezer moet. Vink af wat eruit is.</p></div>
   <div class="datumnav"><button class="pijlk" data-a="ontdag" data-v="-1">‹</button><button class="dlabel" data-a="ontdag" data-v="0">Voor ${morgen?'morgen':esc(datumTekst(d))}<small>${morgen?esc(datumTekst(d)):'tik voor morgen'}</small></button><button class="pijlk" data-a="ontdag" data-v="1">›</button></div>`;
  if(!l.length)h+=`<p class="leeg">Nog niets op de lijst voor ${esc(datumTekst(d))}.</p>`;
  else{h+=`<p class="samenvat">${l.filter(x=>x.klaar).length} van ${l.length} uit de vriezer</p><div class="sectie">`;
    for(const x of l){const s=x.soort?S.soorten.find(y=>y.id===x.soort):null;
      h+=`<div class="rij"><div class="rijflex"><button class="regel ${x.klaar?'klaar':''}" data-a="ontvink" data-v="${esc(x.id)}">${s&&sFoto(s.id)?`<img class="duim klein" src="${sFoto(s.id)}" alt="">`:''}<div class="groei"><div class="naam">${esc(ontdooiNaam(x))}${pluTag(s)}</div><div class="sub">${x.n?`${x.n} stuks – `:''}${esc(x.wie)}${x.klaar?` · eruit door ${esc(x.klaar.wie)} om ${tijdTekst(x.klaar.t)}`:''}</div></div><div class="vinkvak">${x.klaar?'✓':''}</div></button><button class="pot" data-a="ontweg" data-v="${esc(x.id)}" aria-label="Verwijderen">${afwStap==='ont:'+x.id?'?':'×'}</button></div></div>`}
    h+='</div>'}
  return h+`<div class="knoppen"><button class="knop" data-a="ontnieuw">+ Toevoegen</button></div>`;
}
function openOntdooi(){
  bewerk={soort:'ontdooi',id:null};keuzeZoek='';
  const lijst=[...S.soorten.filter(s=>s.type==='ontdooien'),...S.soorten.filter(s=>s.type!=='ontdooien')].filter(s=>s.naam.trim());
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Ontdooien zoet</b><button data-a="ontopslaan" style="font-weight:700">Toevoegen</button></div>
   <div class="pinhoud"><p class="hulp">Voor ${esc(datumTekst(ontDatum))}. Kies een broodsoort of typ zelf iets.</p>
   <label>Broodsoort</label>${volgKnop()}<div class="chips" id="ontChips" style="margin-top:8px">${ontChipsHtml()}</div>
   <label>Of vrije tekst</label><input class="veld" id="ontTekst" maxlength="60" placeholder="Bijv. 2 bakken appelflappen">
   <label>Aantal (mag leeg)</label><div class="grootstep"><button data-a="aanpasstap" data-n="-1">−</button><input id="aanpasIn" inputmode="numeric" maxlength="4" value=""><button data-a="aanpasstap" data-n="1">+</button></div>
   <div class="fout" id="fout"></div></div>`);
}

function soortenHtml(){
  let h=`<div class="kop"><div class="koprij"><h1>Broodsoorten</h1>${info('soorten')}</div><p>Tik op een soort om alles in te stellen: kar, platen, oven, deeg, instructie en foto.</p></div>
   ${isAdmin()&&kanBeheren()?`<div class="kaartje"><h3>Winkel</h3>
    <label>Bakker (leverancier vers brood)</label><div style="display:flex;gap:8px"><input class="veld" id="wBakker" value="${esc(S.bakker||'')}" placeholder="Bijv. Van Eekeren"><button class="knop rand klein" data-a="winkelinst">Opslaan</button></div>
    <div class="sub">Pakbon scannen is afgestemd op de pakbon van Van Eekeren. Bij een andere bakker leert de app de cijfers van jouw pakbon via Leesfout melden.</div>
    <label style="margin-top:12px">Plaats voor het weer</label><div style="display:flex;gap:8px"><input class="veld" id="wPlaats" value="${esc(S.locatie?.naam||WINKEL?.plaats||'Vogelenzang')}"><button class="knop rand klein" data-a="weerzoek">Zoeken</button></div>
    <label style="margin-top:12px">Logo bovenin</label><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><img src="${logoSrc()}" alt="" style="height:44px;background:#f17d04;border-radius:8px;padding:4px"><label class="knop rand klein">Eigen logo kiezen<input type="file" accept="image/*" id="logoIn" style="display:none"></label>${S.winkelLogo?'<button class="knop rand klein" data-a="logoweg">Standaard logo</button>':''}</div></div>`:''}
   <div class="kaartje"><h3>Oven</h3><div style="display:flex;align-items:center;gap:10px">Maximaal <input class="veld" style="width:80px;text-align:center" inputmode="numeric" maxlength="2" id="ovenMaxIn" value="${S.ovenMax}"> platen per lading</div></div>`;
  h+=`<div class="kaartje"><h3>Klaarzetten voor morgen</h3><div class="sub">Vanaf deze tijd opent Klaarzetten automatisch op de lijst van morgen.</div><div style="margin-top:8px"><select class="veld" id="omschakelIn" style="width:160px"><option value="" ${S.omschakel==null?'selected':''}>Uit</option>${[10,11,12,13,14,15,16,17,18,19,20].map(u=>`<option value="${u}" ${S.omschakel===u?'selected':''}>vanaf ${u}:00</option>`).join('')}</select></div></div>`;
  {const dgn=[[1,'ma'],[2,'di'],[3,'wo'],[4,'do'],[5,'vr'],[6,'za'],[0,'zo']],uitz=Object.keys(S.versUitz).filter(d=>d>=plusDagen(iso(),-1)).sort();
   h+=`<div class="kaartje"><h3>Leverdagen vers brood</h3><div class="sub">Op welke dagen levert de bakker?</div><div class="chips" style="margin-top:8px">${dgn.map(([n,l])=>`<button class="chip ${S.versDagen.includes(n)?'aan':''}" data-a="versdag" data-v="${n}">${l}</button>`).join('')}</div>
    <h3 style="margin-top:14px">Uitzonderingen</h3>${uitz.length?uitz.map(d=>`<div style="display:flex;align-items:center;gap:8px;margin-top:6px"><span style="flex:1">${esc(datumTekst(d))} ${vanIso(d).getFullYear()} – <b>${S.versUitz[d]?'extra levering':'geen levering'}</b>${S.afwijkend[d]?' ('+esc(S.afwijkend[d].naam)+')':''}</span><button class="knop rand klein rood" data-a="versuitzweg" data-v="${d}">×</button></div>`).join(''):'<div class="sub">Geen uitzonderingen.</div>'}
    <div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap"><input class="veld" type="date" id="versUitzDatum" min="${iso()}" style="width:170px"><button class="knop rand klein" data-a="versuitznieuw" data-n="nee">Geen levering</button><button class="knop rand klein" data-a="versuitznieuw" data-n="ja">Extra levering</button></div></div>`}
  for(const nr of karNrs()){
    const lijst=S.soorten.filter(s=>s.kar===nr),kar=S.karren.find(k=>k.nr===nr);
    h+=`<div class="sectie"><div class="karkop" style="background:${karKleur(nr)}"><input data-kar="${nr}" value="${esc(kar?kar.naam:'')}" placeholder="Kar ${nr}">${lijst.length?'':`<button class="link" data-a="karweg" data-v="${nr}">Verwijder</button>`}</div>`;
    h+=`<div class="karkleuren">${KARKLEUREN.map(c=>`<button class="kleurbol ${(kar?.kleur||KARKLEUREN[0])===c?'aan':''}" style="background:${c}" data-a="karkleur" data-v="${nr}" data-k="${c}" aria-label="Kleur"></button>`).join('')}<span class="hulp" style="margin:0">kleur van de kar</span></div>`;
    for(const s of lijst)h+=`<div class="rij"><button class="regel" data-a="open" data-v="${s.id}">${sFoto(s.id)?`<img class="duim" src="${sFoto(s.id)}" alt="">`:''}<div class="groei"><div class="naam">${esc(s.naam)}${s.groep?`<span class="groep">samen: ${esc(s.groep.toUpperCase())}</span>`:''}</div>
      <div class="sub">${s.type==='vers'&&s.gesneden==='on'?`${s.plu?`PLU heel ${esc(s.plu)}`:'<span class="let">PLU heel: nog invullen</span>'} · ${s.pluHalf?`half ${esc(s.pluHalf)}`:'<span class="let">half: nog invullen</span>'} · `:s.plu?`PLU ${esc(s.plu)} · `:''}${s.type==='ontdooien'?'Ontdooien, in stuks':s.type==='vers'?(s.gesneden==='on'?'Vers, ongesneden':'Vers, voorgesneden'):`Plaat ${s.min||0}–${s.max||'?'}`}${s.programma?`, prog. ${esc(s.programma)}`:''}${s.temp||s.baktijd?`, ${[s.temp?s.temp+'°C':'',s.baktijd?s.baktijd+' min':''].filter(Boolean).join(' ')}`:''}${s.perDoos?`, ${s.perDoos} per doos`:''}</div></div><span class="pijl">›</span></button></div>`;
    h+=`<button class="toevoegen" data-a="nieuw" data-v="${nr}">+ Broodsoort toevoegen</button></div>`;
  }
  h+=`<div class="knoppen"><button class="knop rand" data-a="karerbij">Kar toevoegen</button></div>
   <div class="sectie"><div class="karkop"><b>Bakmomenten</b><span>${S.momenten.length}</span></div>
   ${S.momenten.map(m=>`<div class="rij inv"><input class="veld" data-moment="${m.id}" value="${esc(m.naam)}" style="flex:1">${S.momenten.length>1?`<button class="knop rand" style="padding:8px 12px;color:var(--rood);border-color:var(--rood)" data-a="momentweg" data-v="${m.id}">${afwStap===m.id?'Zeker?':'×'}</button>`:''}</div>`).join('')}
   <button class="toevoegen" data-a="momenterbij">+ Bakmoment toevoegen</button></div>`;
  return h;
}
function logHtml(){
  const per={};for(const l of Object.values(S.log).sort((a,b)=>b.t-a.t).slice(0,300)){const d=iso(new Date(l.t));(per[d]=per[d]||[]).push(l)}
  return`<div class="kop"><h1>Logboek</h1><p>Laatste 300 acties van alle toestellen, nieuwste eerst.</p></div>`+(Object.keys(per).length?`<div class="sectie">${Object.entries(per).map(([d,ls])=>`<div class="daglabel">${esc(datumTekst(d))}</div>${ls.map(l=>`<div class="logregel">${esc(l.tekst)}<div class="wie">${esc(l.wie)}, ${tijdTekst(l.t)}</div></div>`).join('')}`).join('')}</div>`:`<p class="leeg">Nog geen acties.</p>`);
}
function teamHtml(){
  const ms=S.gebruikers.filter(x=>x.rol!=='admin');
  if(!kanBeheren())return`<div class="kop"><h1>Medewerkers</h1></div><p class="leeg">Medewerkers en rechten beheren kan alleen op een toestel dat met de beheerders-login is gekoppeld.</p>`;
  return`<div class="kop"><div class="koprij"><h1>Medewerkers</h1>${info('team')}</div><p>Geef of ontneem rechten per medewerker.</p></div>
   <div class="kaartje"><h3>Automatisch uitloggen</h3><div class="sub">Is de app zo lang niet in beeld geweest (weggeveegd of afgesloten), dan moet je opnieuw inloggen. Geldt voor iedereen.</div><div class="segment" style="margin:10px 0 0">${[[0,'Direct'],[2,'2 min'],[5,'5 min'],[15,'15 min']].map(([m,l])=>`<button data-a="uitlogmin" data-v="${m}" class="${(S.uitlogMin??5)===m?'aan':''}">${l}</button>`).join('')}</div><div class="hulp" style="margin-top:6px">Direct = na 20 seconden, zodat even de camera of WhatsApp gebruiken je niet uitlogt.</div></div>
   <div class="sectie">${ms.map(m=>{const r=RECHTEN.filter(([k])=>(m.rechten||{})[k]).length;
    return`<div class="rij"><button class="regel" data-a="gebruiker" data-v="${m.id}"><div class="groei"><div class="naam">${esc(m.naam)}${pinTijdelijk(m)?' <span class="st aangepast">tijdelijke pincode</span>':''}${prof(m.id).eenvoudig?' <span class="st ontd">eenvoudig</span>':''}</div><div class="sub">${m.actief===false?'<span class="let">Geen toegang</span>':`${r} van ${RECHTEN.length} rechten`}</div></div><span class="pijl">›</span></button></div>`}).join('')}
    <button class="toevoegen" data-a="nieuwegebruiker">+ Medewerker toevoegen</button></div>`;
}

/* ---------- accounts ---------- */
function setupHtml(){
  if(!kanBeheren())return`<div class="merkscherm">${merkKop('Brood Opzet','Nog niet ingesteld')}<p class="merktekst">Dit toestel is gekoppeld met de winkel-login, maar de beheerder heeft de app nog niet ingesteld. Vraag de beheerder om eerst in te loggen op zijn eigen toestel.</p></div>`;
  return`<div class="merkscherm">${merkKop('Brood Opzet','Welkom')}<p class="merktekst">Maak het beheerdersaccount aan. Daarmee kun je alles in de app en geef je medewerkers rechten.</p>
  <label>Jouw naam</label><input class="veld" id="sNaam" placeholder="Bijv. Carlo">
  <label>Kies een pincode (4 cijfers)</label><input class="veld pinveld" id="sPin" inputmode="numeric" type="password" maxlength="4">
  <label>Herhaal pincode</label><input class="veld pinveld" id="sPin2" inputmode="numeric" type="password" maxlength="4">
  <div class="fout" id="fout"></div><button class="merkknop" data-a="setup">Account aanmaken</button></div>`}

let pinInvoer='',pinMelding='',geenVoorkeur=false;
function pinVan(g){const p=S.pins[g.id];return g.rol!=='admin'&&p&&p.t>(g.pinT||0)?p.pin:g.pin}
function pinTijdelijk(g){if(!g||g.rol==='admin'||!g.pinTijdelijk)return false;const p=S.pins[g.id];return!(p&&p.t>(g.pinT||0))}
function pinTeMakkelijk(p){if(/^(\d)\1{3}$/.test(p))return true;const d=[...p].map(Number);const op=d.every((x,i)=>!i||x===d[i-1]+1),af=d.every((x,i)=>!i||x===d[i-1]-1);return op||af}
let pinKies={stap:1,eerste:'',invoer:'',melding:''};
function pinKiesHtml(){const g=ik();
  return`<div class="merkscherm compact"><div class="merkkop klein"><img src="${logoSrc()}" alt="${esc(winkelNaam())}" class="merklogo"><div class="merkregel"><span class="merktitel">Welkom, ${esc(g.naam)}</span></div></div>
   <p class="merktekst" style="text-align:center">${pinKies.stap===1?'Je bent ingelogd met een tijdelijke pincode.<br><b>Kies nu je eigen pincode</b> van 4 cijfers.':'Vul je nieuwe pincode <b>nog een keer</b> in.'}</p>
   <div class="pinbolletjes ${pinKies.melding?'fout':''}">${[0,1,2,3].map(i=>`<i class="${i<pinKies.invoer.length?'vol':''}"></i>`).join('')}</div>
   <div class="fout" id="fout">${esc(pinKies.melding)}</div>${cijferblokHtml('pk')}
   <p class="merkhint">Kies geen makkelijke code zoals 0000 of 1234.</p></div>`}
function cijferblokHtml(pre){return`<div class="cijferblok">${[1,2,3,4,5,6,7,8,9].map(n=>`<button data-a="${pre}" data-v="${n}">${n}</button>`).join('')}<span></span><button data-a="${pre}" data-v="0">0</button><button class="wis" data-a="${pre}" data-v="wis" aria-label="Wissen">⌫</button></div>`}
function pinKiesToets(v){const g=ik();if(!g)return;if(v==='wis'){pinKies.invoer=pinKies.invoer.slice(0,-1);pinKies.melding='';render();return}
  if(pinKies.invoer.length>=4)return;pinKies.invoer+=v;pinKies.melding='';render();if(pinKies.invoer.length<4)return;
  setTimeout(()=>{const p=pinKies.invoer;pinKies.invoer='';
    if(pinKies.stap===1){if(hashPin(p,g.id)===pinVan(g)){pinKies.melding='Kies een andere pincode dan de tijdelijke.';render();return}if(pinTeMakkelijk(p)){pinKies.melding='Te makkelijk. Kies een andere pincode.';render();return}pinKies.eerste=p;pinKies.stap=2;render();return}
    if(p!==pinKies.eerste){pinKies={stap:1,eerste:'',invoer:'',melding:'De pincodes waren niet gelijk. Begin opnieuw.'};render();return}
    S.pins[g.id]={pin:hashPin(p,g.id),t:Date.now()};pinKies={stap:1,eerste:'',invoer:'',melding:''};log('Eigen pincode gekozen');bewaar();render();bevestig('✓ Je eigen pincode is opgeslagen');naLogin()},150)}
let pinWijzig=null;
function openPinWijzig(){pinWijzig={stap:0,huidig:'',nieuw:'',invoer:'',melding:''};toonPinWijzig()}
function toonPinWijzig(){const t=['Vul je huidige pincode in','Kies je nieuwe pincode','Vul je nieuwe pincode nog een keer in'][pinWijzig.stap];
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Pincode wijzigen</b><span style="width:70px"></span></div><div class="pinhoud pinwijzig">
   <p class="hulp" style="text-align:center;font-size:16px;color:var(--tekst)">${t}</p><div class="pinbolletjes donker ${pinWijzig.melding?'fout':''}">${[0,1,2,3].map(i=>`<i class="${i<pinWijzig.invoer.length?'vol':''}"></i>`).join('')}</div>
   <div class="fout" style="text-align:center">${esc(pinWijzig.melding)}</div><div class="cijferblok licht">${[1,2,3,4,5,6,7,8,9].map(n=>`<button data-a="pw" data-v="${n}">${n}</button>`).join('')}<span></span><button data-a="pw" data-v="0">0</button><button class="wis" data-a="pw" data-v="wis" aria-label="Wissen">⌫</button></div></div>`)}
function pinWijzigToets(v){const g=ik(),w=pinWijzig;if(!g||!w)return;if(v==='wis'){w.invoer=w.invoer.slice(0,-1);w.melding='';toonPinWijzig();return}
  if(w.invoer.length>=4)return;w.invoer+=v;w.melding='';toonPinWijzig();if(w.invoer.length<4)return;
  setTimeout(()=>{const p=w.invoer;w.invoer='';
    if(w.stap===0){if(hashPin(p,g.id)!==pinVan(g)){w.melding='Huidige pincode klopt niet.';toonPinWijzig();return}w.huidig=p;w.stap=1;toonPinWijzig();return}
    if(w.stap===1){if(p===w.huidig){w.melding='Kies een andere pincode dan je huidige.';toonPinWijzig();return}if(pinTeMakkelijk(p)){w.melding='Te makkelijk. Kies een andere pincode.';toonPinWijzig();return}w.nieuw=p;w.stap=2;toonPinWijzig();return}
    if(p!==w.nieuw){w.stap=1;w.nieuw='';w.melding='Niet gelijk. Kies je nieuwe pincode opnieuw.';toonPinWijzig();return}
    if(g.rol==='admin'){const i=S.gebruikers.findIndex(x=>x.id===g.id);S.gebruikers[i]={...S.gebruikers[i],pin:hashPin(p,g.id)}}else S.pins[g.id]={pin:hashPin(p,g.id),t:Date.now()};
    log('Pincode gewijzigd');bewaar();sluit();pinWijzig=null;bevestig('✓ Nieuwe pincode opgeslagen')},150)}
function loginHtml(){
  const lijst=S.gebruikers.filter(g=>g.rol==='admin'||g.actief!==false).sort((a,b)=>a.naam.localeCompare(b.naam,'nl'));
  if(!loginKeuze&&!geenVoorkeur&&L.laatsteGebruiker&&lijst.some(g=>g.id===L.laatsteGebruiker))loginKeuze=L.laatsteGebruiker;
  const g=lijst.find(x=>x.id===loginKeuze),P=g?prof(g.id):null;
  return`<div class="merkscherm compact"><div class="merkkop klein"><img src="${logoSrc()}" alt="${esc(winkelNaam())}" class="merklogo"><div class="merkregel"><svg class="merkcroissant" viewBox="0 0 300 200" aria-hidden="true">${CROISSANT('#fff','#f17d04')}</svg><span class="merktitel">Brood Opzet</span></div></div>
   <label>Naam</label>
   <div class="naamkeuze">${P?.emoji?`<span class="naamemoji">${P.emoji}</span>`:''}<select id="loginNaam" aria-label="Kies je naam"><option value="" ${g?'':'selected'} disabled>Kies je naam</option>${lijst.map(x=>`<option value="${x.id}" ${x.id===loginKeuze?'selected':''}>${esc(x.naam)}</option>`).join('')}</select>${g?.rol==='admin'?'<span class="rol">Beheerder</span>':''}<span class="pijlneer">▾</span></div>
${g?`<label>Pincode</label><div class="pinbolletjes ${pinMelding?'fout':''}">${[0,1,2,3].map(i=>`<i class="${i<pinInvoer.length?'vol':''}"></i>`).join('')}</div>
   <div class="fout" id="fout">${esc(pinMelding)}</div>
   <div class="cijferblok">${[1,2,3,4,5,6,7,8,9].map(n=>`<button data-a="pin" data-v="${n}">${n}</button>`).join('')}${faceVoor(g)?`<button class="wis faceknop" data-a="facelogin" aria-label="Inloggen met Face ID"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M8.5 9v1.5M15.5 9v1.5M12 9v4h-1M9 16.2c1.8 1.3 4.2 1.3 6 0"/></svg></button>`:'<span></span>'}<button data-a="pin" data-v="0">0</button><button class="wis" data-a="pinwis" aria-label="Wissen">⌫</button></div>
   <p class="merkhint">${faceVoor(g)?'Tik linksonder voor Face ID, of vul je pincode in':'Na het 4e cijfer log je automatisch in'}</p>`:'<p class="merkhint" style="margin-top:18px">Kies eerst je naam.</p>'}</div>`}
function naLogin(){if(!prof().rondleiding){tourStap=0;toonTour()}else if(!toonNieuws())toonOverdracht()}
function loginAls(g){fouteLogins=0;geenVoorkeur=false;pinMelding='';L.sessie=g.id;L.laatsteGebruiker=g.id;loginKeuze=null;const P=prof(g.id);tab=startTab(P);setTimeout(naarLevering,0);if(P.moment&&S.momenten.some(x=>x.id===P.moment))moment=P.moment;sub=null;datum=standaardDatum();volgVandaag=true;log('Ingelogd');bewaar();render();if(!pinTijdelijk(g))naLogin()}
const b64u=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64u=t=>{t=t.replace(/-/g,'+').replace(/_/g,'/');t+='='.repeat((4-t.length%4)%4);return Uint8Array.from(atob(t),c=>c.charCodeAt(0))};
function faceKan(){return!!(window.PublicKeyCredential&&navigator.credentials&&window.isSecureContext!==false)}
function faceVoor(g){return!!(g&&g.rol==='admin'&&kanBeheren()&&L.faceid&&L.faceid.uid===g.id&&faceKan())}
async function faceAan(){const g=ik();if(!g||g.rol!=='admin'||!kanBeheren())return;
  if(!faceKan()){toast('Face ID wordt op dit toestel niet ondersteund');return}
  try{const c=await navigator.credentials.create({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),rp:{name:'Brood Opzet'},
      user:{id:new TextEncoder().encode(g.id),name:g.naam,displayName:g.naam},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
      authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'preferred'},timeout:60000}});
    L.faceid={uid:g.id,cred:b64u(c.rawId),t:Date.now()};bewaarL();log('Face ID aangezet op dit toestel');render();bevestig('✓ Face ID staat aan')}
  catch(e){if(e&&e.name==='NotAllowedError'){toast('Face ID is geannuleerd');return}toast('Face ID aanzetten lukte niet: '+(e.message||e))}}
async function faceLogin(){const g=S.gebruikers.find(x=>x.id===loginKeuze);if(!faceVoor(g))return;
  if(Date.now()<geblokkeerdTot){pinMelding='Even wachten na te veel foute pogingen.';render();return}
  try{await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:'public-key',id:unb64u(L.faceid.cred)}],userVerification:'required',timeout:60000}});loginAls(g)}
  catch(e){pinMelding=e&&e.name==='NotAllowedError'?'Face ID geannuleerd. Gebruik je pincode.':'Face ID lukte niet. Gebruik je pincode.';render()}}
function probeerLogin(){
  const g=S.gebruikers.find(x=>x.id===loginKeuze),p=pinInvoer;pinInvoer='';
  if(Date.now()<geblokkeerdTot){pinMelding=`Te vaak fout. Probeer het over ${Math.ceil((geblokkeerdTot-Date.now())/1000)} seconden opnieuw.`;render();return}
  if(g&&pinVan(g)===hashPin(p,g.id)){loginAls(g);return}
  fouteLogins++;if(fouteLogins>=5){geblokkeerdTot=Date.now()+30000;fouteLogins=0;pinMelding='5 keer fout. Wacht 30 seconden.'}else pinMelding=`Pincode klopt niet (${fouteLogins} van 5).`;render();
}


function openGebruiker(u){
  bewerk={...u,soort:'gebruiker'};verwStap=false;const admin=u.rol==='admin',rechtenTonen=isAdmin()&&!admin,zelf=u.id===L.sessie;
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>${u.nieuw?'Nieuwe medewerker':zelf?'Mijn account':'Medewerker'}</b><button data-a="gopslaan" style="font-weight:700">Opslaan</button></div>
  <div class="pinhoud"><label>Naam</label><input class="veld" id="gNaam" value="${esc(u.naam||'')}" ${isAdmin()?'':'disabled'}>
   <label>${admin?(u.nieuw?'Pincode (4 cijfers)':'Nieuwe pincode (leeg = niet wijzigen)'):u.nieuw?'Tijdelijke pincode (4 cijfers)':'Pincode resetten: nieuwe tijdelijke pincode (leeg = niet wijzigen)'}</label><input class="veld pinveld" id="gPin" inputmode="numeric" maxlength="4" ${admin?'type="password"':''}><div class="fout" id="fout"></div>
   ${!admin?`<p class="hulp">${u.nieuw?'De medewerker kiest bij de eerste keer inloggen zelf een eigen pincode.':pinTijdelijk(u)?'<b>Heeft nog een tijdelijke pincode.</b> ':'Vergeten? Vul hierboven een nieuwe tijdelijke pincode in.'}</p>`:''}
   ${rechtenTonen?`<label>Rechten</label>${RECHTEN.map(([k,l])=>`<label class="schakel" style="margin:0;color:var(--tekst);font-weight:400">${l}<input type="checkbox" id="r-${k}" ${(u.rechten||{})[k]?'checked':''}></label>`).join('')}
   <label class="schakel" style="margin:0;color:var(--tekst);font-weight:400">Toegang tot de app<input type="checkbox" id="gActief" ${u.actief!==false?'checked':''}></label>
   <label class="schakel" style="margin:0;color:var(--tekst);font-weight:400">Eenvoudige modus<input type="checkbox" id="gEenvoudig" ${prof(u.id).eenvoudig?'checked':''}></label>
   <p class="hulp">Klaarzetten bekijken en dagnotities plaatsen kan iedereen met toegang.</p>${u.nieuw?'':`<button class="verwijder" data-a="gweg">Medewerker verwijderen</button>`}`:''}</div>`);
}
function gebruikerOpslaan(){
  const naam=document.getElementById('gNaam').value.trim(),pin=document.getElementById('gPin').value.trim(),fout=t=>document.getElementById('fout').textContent=t;
  if(!kanBeheren())return fout('Dit kan alleen op een toestel met de beheerders-login.');
  if(!naam)return fout('Vul een naam in.');
  if(S.gebruikers.some(x=>x.id!==bewerk.id&&x.naam.toLowerCase()===naam.toLowerCase()))return fout('Deze naam bestaat al.');
  if((bewerk.nieuw||pin)&&!/^[0-9]{4}$/.test(pin))return fout('Pincode moet 4 cijfers zijn.');
  if(pin&&bewerk.rol!=='admin'&&pinTeMakkelijk(pin)&&!confirm(`Pincode ${pin} is erg makkelijk. Toch gebruiken als tijdelijke pincode?`))return;
  const oud=S.gebruikers.find(x=>x.id===bewerk.id)||{},u={...oud,id:bewerk.id,naam,rol:bewerk.rol,pin:pin?hashPin(pin,bewerk.id):bewerk.pin};
  if(pin&&bewerk.rol!=='admin'){u.pinTijdelijk=true;u.pinT=Date.now()}
  delete u.nieuw;delete u.soort;
  if(isAdmin()&&bewerk.rol!=='admin'){u.rechten={};for(const[k]of RECHTEN)u.rechten[k]=document.getElementById('r-'+k).checked;u.actief=document.getElementById('gActief').checked;const ev=document.getElementById('gEenvoudig').checked;if(!!prof(u.id).eenvoudig!==ev)S.profielen[u.id]={...(S.profielen[u.id]||{}),eenvoudig:ev}}
  const i=S.gebruikers.findIndex(x=>x.id===u.id);if(i>=0)S.gebruikers[i]=u;else S.gebruikers.push(u);
  log(bewerk.nieuw?`Medewerker ${naam} toegevoegd`:`Account ${naam} gewijzigd${pin?' (pincode gereset)':''}`);
  const welkom=pin&&bewerk.rol!=='admin';bewaar();sluit();render();
  if(welkom)openWelkomst(u,pin);
}

/* ---------- sheets ---------- */
function toonSheet(html){undoVerberg();document.getElementById('paneel').innerHTML=html;document.getElementById('sheet').classList.add('open');setTimeout(terugBewaak,0)}
function sluit(){document.getElementById('sheet').classList.remove('open');bewerk=null}
function openSoort(s){
  bewerk={...s,soort:'brood',foto:S.fotos[s.id]||null,type:s.type||'afbakken',gesneden:s.gesneden||'voor',programmaId:s.programmaId||null,allergenen:[...(s.allergenen||[])]};verwStap=false;
  const veld=(id,l,v,ph='',num=true)=>`<div><div class="hulp" style="margin:0 0 4px">${l}</div><input class="veld" id="${id}" ${num?'inputmode="numeric" maxlength="4"':''} value="${esc(v??'')}" placeholder="${ph}"></div>`;
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>${s.nieuw?'Nieuwe broodsoort':'Broodsoort'}</b><button data-a="opslaan" style="font-weight:700">Opslaan</button></div>
  <div class="pinhoud"><label>Naam</label><input class="veld" id="fNaam" value="${esc(s.naam)}" placeholder="Bijv. Croissant roomboter"><div class="fout" id="fout"></div>
   <label id="pluLabel">PLU-nummer</label><input class="veld" id="fPlu" inputmode="numeric" maxlength="8" style="width:150px" value="${esc(s.plu||'')}" placeholder="bijv. 4312">
   <label>Soort product</label><div class="chips" id="typeChips">${[['afbakken','Afbakken'],['ontdooien','Ontdooien'],['vers','Vers geleverd']].map(([k,l])=>`<button class="chip ${bewerk.type===k?'aan':''}" data-a="typekies" data-v="${k}">${l}</button>`).join('')}</div>
   <div id="secSnij"><label>Artikelnummer(s) bakker</label><input class="veld" id="fArtnr" inputmode="decimal" value="${esc(s.artnr||'')}" placeholder="bijv. 1013 (meerdere met komma)"><p class="hulp" style="margin-top:4px">Zoals op de pakbon. Wordt ook vanzelf ingevuld bij het scannen.</p>
   <label>PLU half brood (alleen bij ongesneden)</label><input class="veld" id="fPluHalf" inputmode="numeric" maxlength="8" style="width:150px" value="${esc(s.pluHalf||'')}" placeholder="bijv. 8014">
   <label>Standaard verdeling (ongesneden)</label><div class="chips" id="stdChips">${[['half','Half om half'],['heel','Alles heel'],['halve','Alles half']].map(([k,l])=>`<button class="chip ${(bewerk.snijStandaard||'half')===k?'aan':''}" data-a="snijstd" data-v="${k}">${l}</button>`).join('')}</div>
   <label>Brood</label><div class="chips" id="snijChips">${[['voor','Voorgesneden'],['on','Ongesneden (zelf snijden)']].map(([k,l])=>`<button class="chip ${bewerk.gesneden===k?'aan':''}" data-a="snijkies" data-v="${k}">${l}</button>`).join('')}</div><p class="hulp">Vers brood staat op Klaarzetten in een eigen blok, zonder platen.</p></div>
   ${SOORT_FOTO?`<label>Foto</label><div class="fotorij"><div id="fotoVoorbeeld">${bewerk.foto?`<img src="${bewerk.foto}" alt="">`:'<span>Geen foto</span>'}</div><div style="display:flex;flex-direction:column;gap:8px">
     <label class="knop rand" style="margin:0;text-align:center;font-size:15px;padding:9px 14px">Foto kiezen<input type="file" accept="image/*" id="fFoto" style="display:none"></label>
     <button class="knop rand" style="font-size:15px;padding:9px 14px;color:var(--rood);border-color:var(--rood)" data-a="fotoweg">Verwijderen</button></div></div>`:''}
   <label>${'Standaard kar'}</label><div class="chips" id="chips">${[...new Set([...karNrs(),s.kar])].map(nr=>`<button class="chip ${nr===s.kar?'aan':''}" data-a="kies" data-v="${nr}">${esc(karNaam(nr))}</button>`).join('')}</div>
   <div id="secPlaat"><label>Per plaat</label><div class="minmax">${veld('fMin','Minimaal',s.min)}${veld('fMax','Maximaal',s.max)}</div>
   <label>Samen op plaat met</label><input class="veld" id="fGroep" style="width:90px;text-transform:uppercase" maxlength="3" value="${esc(s.groep||'')}" placeholder="–">
   <p class="hulp">Broodsoorten met dezelfde letter liggen samen op één plaat. Leeg = eigen plaat.</p></div>
   <div id="secOven"><label>Bakprogramma</label><div class="chips" id="progChips"><button class="chip ${!bewerk.programmaId?'aan':''}" data-a="progkies" data-v="">Geen</button>${Object.values(S.programmas).sort((a,b)=>a.naam.localeCompare(b.naam,'nl')).map(p=>`<button class="chip ${bewerk.programmaId===p.id?'aan':''}" data-a="progkies" data-v="${p.id}">${esc(p.naam)}</button>`).join('')}</div>
   <div class="hulp" id="progInfo"></div>
   <div class="minmax" id="progEigen" style="margin-top:10px">${veld('fTemp','Temperatuur °C',s.temp,'bijv. 190')}${veld('fTijd','Baktijd (min)',s.baktijd,'bijv. 18')}</div>
   <p class="hulp">Programma's beheer je onder Meer → Bakprogramma's.</p></div>
   <div id="secDeeg"><label>Deeg</label><div class="minmax">${veld('fDoos','Stuks per doos',s.perDoos,'bijv. 60')}<div></div></div></div>
   <label>Allergenen</label><div class="chips" id="allergChips">${ALLERGENEN.map(([k,l])=>`<button class="chip ${bewerk.allergenen.includes(k)?'aan':''}" data-a="allerg" data-v="${k}">${l}</button>`).join('')}</div>
   <label>Ingrediënten (optioneel)</label><textarea class="veld" id="fIngr" rows="2" placeholder="Bijv. tarwebloem, roomboter, suiker, gist">${esc(s.ingredienten||'')}</textarea>
   <label>Houdbaar (THT)</label><div class="minmax"><div><input class="veld" id="fTht" inputmode="numeric" maxlength="2" value="${s.tht||0}" style="width:90px"></div><div></div></div>
   <p class="hulp">0 = dagvers, 1 = dagvers + 1 dag, enzovoort. Bij Derving komt het product vanzelf terug op de dag dat het over datum gaat.</p>
   <label class="schakel" style="margin:10px 0 0;color:var(--tekst);font-weight:400">Nieuw product (verkoop volgen)<input type="checkbox" id="fNieuw" ${s.nieuwSinds?'checked':''}></label>
   <label>Werkinstructie</label><textarea class="veld" id="fInstr" rows="4" placeholder="Bijv. 30 min laten rijzen, insmeren met ei">${esc(s.instructie||'')}</textarea>
   ${s.nieuw?'':`<label>Volgorde</label><div style="display:flex;gap:12px"><button class="knop rand" data-a="omhoog">Omhoog</button><button class="knop rand" data-a="omlaag">Omlaag</button></div><button class="verwijder" data-a="weg">Broodsoort verwijderen</button>`}</div>`);
  toonTypeVelden();toonProgInfo();
}
function toonProgInfo(){const p=bewerk.programmaId&&S.programmas[bewerk.programmaId],i=document.getElementById('progInfo'),e=document.getElementById('progEigen');if(!i)return;
  i.textContent=p?[p.temp?p.temp+'°C':'',p.baktijd?p.baktijd+' min':'',p.notitie||''].filter(Boolean).join(' · ')||'Geen temperatuur of baktijd ingevuld bij dit programma.':'';e.style.display=p?'none':''}
function toonTypeVelden(){const t=bewerk.type,z=(id,aan)=>{const e=document.getElementById(id);if(e)e.style.display=aan?'':'none'};
  z('secSnij',t==='vers');const pl=document.getElementById('pluLabel');if(pl)pl.textContent=t==='vers'&&bewerk.gesneden==='on'?'PLU heel brood':'PLU-nummer';z('secPlaat',t==='afbakken');z('secOven',t==='afbakken');z('secDeeg',t!=='vers')}


function soortOpslaan(){
  const w=id=>{const e=document.getElementById(id);return e?getal(e.value):null},tekst=id=>{const e=document.getElementById(id);return e?e.value.trim():''};
  const naam=tekst('fNaam'),t=bewerk.type||'afbakken',afb=t==='afbakken',vers=t==='vers',min=afb?w('fMin'):0,max=afb?w('fMax'):(w('fMax')||null);
  const fout=x=>document.getElementById('fout').textContent=x;
  if(!naam)return fout('Vul de naam in.');if(afb&&!max)return fout('Vul het maximum per plaat in.');if(afb&&min!=null&&min>max)return fout('Minimum is groter dan maximum.');
  const nw={id:bewerk.id,naam,kar:bewerk.kar,type:t,gesneden:bewerk.gesneden||'voor',groep:afb?tekst('fGroep').toUpperCase():'',min:min||0,max,
    temp:afb?w('fTemp'):null,baktijd:afb?w('fTijd'):null,perDoos:vers?null:w('fDoos'),programma:'',programmaId:afb?(bewerk.programmaId||null):null,instructie:tekst('fInstr'),plu:tekst('fPlu'),pluHalf:vers&&bewerk.gesneden==='on'?tekst('fPluHalf'):'',artnr:vers?tekst('fArtnr'):'',snijStandaard:vers&&bewerk.gesneden==='on'?(bewerk.snijStandaard||'half'):undefined,allergenen:[...(bewerk.allergenen||[])],ingredienten:tekst('fIngr'),nieuwSinds:document.getElementById('fNieuw')?.checked?(bewerk.nieuwSinds||iso()):null,tht:Math.max(0,Math.min(30,w('fTht')||0))};
  if(nw.programmaId){const p=S.programmas[nw.programmaId];if(p){nw.programma=p.naam;nw.temp=p.temp;nw.baktijd=p.baktijd}}
  if(bewerk.foto)S.fotos[nw.id]=bewerk.foto;else if(S.fotos[nw.id])S.fotos[nw.id]=null;
  const i=S.soorten.findIndex(x=>x.id===nw.id);
  if(i>=0)S.soorten[i]=nw;else{const l=S.soorten.map(x=>x.kar).lastIndexOf(nw.kar);S.soorten.splice(l+1,0,nw)}
  log(`Broodsoort ${naam} ${i>=0?'gewijzigd':'toegevoegd'}`);bewaar();sluit();render();
}
function verkleinFoto(file){
  const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const max=480,sc=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');
    c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    if(bewerk){bewerk.foto=c.toDataURL('image/jpeg',.7);document.getElementById('fotoVoorbeeld').innerHTML=`<img src="${bewerk.foto}" alt="">`}};img.src=r.result};r.readAsDataURL(file);
}
function verschuif(r){const a=S.soorten,i=a.findIndex(x=>x.id===bewerk.id);if(i<0)return;let j=i+r;
  while(j>=0&&j<a.length&&a[j].kar!==a[i].kar)j+=r;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];bewaar();render()}
