/* ================= 10.12 urenregistratie (per medewerker, zonder locatie) ================= */
/* S.uren = {_inst:{iedereen}, namen:{id:{id,naam,t,weg,koppel}}, d:{uid:{dienstId:{id,in,uit,p:{pid:{van,tot}},pm,not,wie,gew:{}}}},
   corr:{}, goed:{'uid|maandag':{wie,t}}}. uid = gebruiker-id of 'n_'+naam-id (iemand zonder account). Alles maps. */
let urenPer='week',urenDatum=null,urenOpenP={},urenBusy=false,urenView='klok';
function urenInst(){const i=isObj(S.uren?._inst)?S.uren._inst:{};return{iedereen:!!i.iedereen}}
const urenMag=()=>!!ik()&&(isAdmin()||(urenInst().iedereen&&mag('uren')));
const urenVan=uid=>isObj(S.uren?.d?.[uid])?S.uren.d[uid]:{};
function urenBasis(){if(!isObj(S.uren))S.uren={};return S.uren}
function urenSchrijf(uid){const u=urenBasis();if(!isObj(u.d))u.d={};if(!isObj(u.d[uid]))u.d[uid]={};return u.d[uid]}
const urenNamen=()=>isObj(S.uren?.namen)?S.uren.namen:{};
function urenNaam(uid){if(uid.startsWith('n_'))return urenNamen()[uid.slice(2)]?.naam||'?';return S.gebruikers.find(g=>g.id===uid)?.naam||'?'}
const urenExtern=uid=>uid.startsWith('n_');
function urenMensen(alles){const l=S.gebruikers.filter(g=>g.actief!==false||(alles&&urenDiensten(g.id).length)).map(g=>({uid:g.id,naam:g.naam,extern:false}));
  for(const n of Object.values(urenNamen()))if(isObj(n)&&n.naam&&(!n.weg||(alles&&urenDiensten('n_'+n.id).length)))l.push({uid:'n_'+n.id,naam:n.naam,extern:true,weg:!!n.weg});
  return l.sort((a,c)=>a.naam.localeCompare(c.naam,'nl'))}
const urenDiensten=uid=>Object.values(urenVan(uid)).filter(x=>isObj(x)&&x.in);
const urenLopend=uid=>urenDiensten(uid).find(x=>!x.uit);
function urenPauze(x,tot){const eind=x.uit||tot||Date.now();if(x.pm!=null)return{ms:x.pm*60000,open:null};let ms=0,open=null;
  for(const p of Object.values(isObj(x.p)?x.p:{})){if(!isObj(p)||!p.van)continue;if(p.tot)ms+=Math.max(0,p.tot-p.van);else{open=p;ms+=Math.max(0,eind-p.van)}}return{ms,open}}
const urenNetto=x=>{const e=x.uit||Date.now();return Math.max(0,e-x.in-urenPauze(x,e).ms)};
const urenDuur=ms=>{const m=Math.round(ms/60000);return`${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`};
const urenTijd=t=>tijdTekst(t);
function urenPauzeFout(x){if(!x.uit)return'';const n=urenNetto(x),p=urenPauze(x).ms;if(n>10*3600e3&&p<45*60000)return'Meer dan 10 uur gewerkt met minder dan 45 min pauze';if(n>5.5*3600e3&&p<30*60000)return'Meer dan 5,5 uur gewerkt met minder dan 30 min pauze';return''}
const urenGoedKey=(uid,d)=>uid+'|'+maandag(d);
const urenGoed=(uid,d)=>isObj(S.uren?.goed)?S.uren.goed[urenGoedKey(uid,d)]:null;
const urenId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const urenNu=()=>urenMensen(true).filter(p=>urenLopend(p.uid));
/* ---------- klokken ---------- */
function urenKlok(actie,uid){const u=ik();if(!u||!urenMag()||urenBusy||!uid)return;urenBusy=true;setTimeout(()=>urenBusy=false,800);const nu=Date.now(),ds=urenSchrijf(uid),x=urenLopend(uid),naam=urenNaam(uid);
  if(actie==='in'){if(x)return;const id=urenId();ds[id]={id,in:nu,p:{},wie:u.naam};log(`${naam} ingeklokt`);bewaar();render();bevestig(`✓ ${naam} ingeklokt om ${urenTijd(nu)}`);return}
  if(!x)return;
  if(actie==='pauze'){const p=urenPauze(x).open;if(p){p.tot=nu;log(`${naam}: pauze klaar`);bevestig(`✓ ${naam} weer aan het werk`)}else{if(!isObj(x.p))x.p={};x.p[urenId()]={van:nu};log(`${naam}: pauze`);bevestig(`☕ Pauze ${naam}`)}bewaar();render();return}
  if(actie==='uit'){const p=urenPauze(x).open;if(p)p.tot=nu;x.uit=nu;log(`${naam} uitgeklokt`);bewaar();render();const f=urenPauzeFout(x);bevestig(`✓ ${naam} uitgeklokt · ${urenDuur(urenNetto(x))} gewerkt`);if(f)setTimeout(()=>toast('⚠️ '+f),1800)}}
/* ---------- periode ---------- */
function urenBereik(){const d=urenDatum||iso();
  if(urenPer==='dag')return{van:d,tot:d,label:dagNaamLang(d),kort:'dag'};
  if(urenPer==='maand'){const x=vanIso(d),van=iso(new Date(x.getFullYear(),x.getMonth(),1)),tot=iso(new Date(x.getFullYear(),x.getMonth()+1,0));return{van,tot,label:x.toLocaleDateString('nl-NL',{month:'long',year:'numeric'}),kort:'maand'}}
  const w=maandag(d);return{van:w,tot:plusDagen(w,6),label:`Week ${weeknr(w)}`,sub:`${datumTekst(w)} – ${datumTekst(plusDagen(w,6))}`,kort:'week'}}
function urenSchuif(r){const d=urenDatum||iso();if(urenPer==='dag')urenDatum=plusDagen(d,r);else if(urenPer==='week')urenDatum=plusDagen(d,7*r);else{const x=vanIso(d);urenDatum=iso(new Date(x.getFullYear(),x.getMonth()+r,1))}}
function urenIn(uid,van,tot){return urenDiensten(uid).filter(x=>{const d=iso(new Date(x.in));return d>=van&&d<=tot}).sort((a,c)=>a.in-c.in)}
/* ---------- regels ---------- */
function urenRij(uid,x,beheer){const d=iso(new Date(x.in)),p=urenPauze(x),f=urenPauzeFout(x),goed=urenGoed(uid,d),gew=isObj(x.gew)?Object.values(x.gew):[];
  const tags=[f?'⚠️ '+f:'',gew.length?'✎ aangepast':'',goed?'✓ goedgekeurd':''].filter(Boolean);
  return`<div class="rij inv" style="flex-wrap:wrap"><div class="groei"><div class="naam" style="font-size:16px">${esc(datumTekst(d))} · ${urenTijd(x.in)}–${x.uit?urenTijd(x.uit)+(iso(new Date(x.uit))!==d?' (+1)':''):'nu'}</div>
   <div class="sub">${x.uit?'':'<b>loopt nog</b> · '}pauze ${urenDuur(p.ms)} · <b>${urenDuur(urenNetto(x))} gewerkt</b>${x.not?' · '+esc(x.not):''}</div>${tags.length?`<div class="sub ${f?'oranjetekst':''}">${tags.map(esc).join(' · ')}</div>`:''}</div>
   ${beheer?`<button class="knop rand klein" data-u="bewerk" data-v="${esc(uid)}|${esc(x.id)}">Bewerken</button>`:''}</div>`}
/* ---------- hoofdpagina Uren: klokken per medewerker ---------- */
function urenKlokRij(p){const x=urenLopend(p.uid),open=urenOpenP[p.uid],adm=isAdmin(),zelf=ik()?.id===p.uid;let st,kn;
  if(!x){const vd=urenDiensten(p.uid).filter(d=>iso(new Date(d.in))===iso()&&d.uit),tot=vd.reduce((t,d)=>t+urenNetto(d),0);
    st=tot?`vandaag ${urenDuur(tot)} gewerkt`:'niet ingeklokt';kn=`<button class="knop klein" data-u="in" data-v="${esc(p.uid)}">▶︎ Inklokken</button>`}
  else{const pa=urenPauze(x),lang=Date.now()-x.in>10*3600e3;
    st=pa.open?`<b>☕ pauze sinds ${urenTijd(pa.open.van)}</b> · ${urenDuur(urenNetto(x))}`:`<b>werkt sinds ${urenTijd(x.in)}</b> (${urenDuur(urenNetto(x))})${pa.ms?` · pauze ${urenDuur(pa.ms)}`:''}`;
    if(lang)st+=`<div style="color:var(--rood);font-weight:700">Vergeten uit te klokken? Ingeklokt sinds ${esc(datumTekst(iso(new Date(x.in))))} ${urenTijd(x.in)}</div>`;
    const uitK=afwStap==='uurUit:'+p.uid;
    kn=`<button class="knop klein ${pa.open?'':'rand'}" data-u="pauze" data-v="${esc(p.uid)}">${pa.open?'Pauze klaar':'☕ Pauze'}</button><button class="knop klein ${uitK?'rood':'rand'}" data-u="uit" data-v="${esc(p.uid)}">${uitK?'Zeker?':'⏹ Uitklokken'}</button>`}
  const w=maandag(iso()),l=open?urenIn(p.uid,w,plusDagen(w,6)):[];
  return`<div class="sectie uurrij ${x?'aanwerk':''}"><div class="rij inv" style="flex-wrap:wrap;gap:8px"><button class="groei uurnaam" data-u="persoon" data-v="${esc(p.uid)}"><div class="naam">${esc(p.naam)} <span class="pijltje">${open?'▴':'▾'}</span></div><div class="sub">${p.extern?'geen account · ':''}${st}${(()=>{const g=roosterDag(p.uid,iso());return g.length?`<div>📅 gepland ${g.map(r=>esc(r.van+'–'+r.tot)).join(', ')}</div>`:''})()}</div></button><div class="knoppen" style="padding:0;gap:6px;flex-wrap:nowrap">${kn}</div></div>
   ${open?`<div class="meerinhoud"><div class="hulp" style="margin:6px 14px 0">Deze week: <b>${urenDuur(l.reduce((t,y)=>t+urenNetto(y),0))}</b></div>${l.map(y=>urenRij(p.uid,y,adm)).join('')||'<p class="leeg" style="margin:10px">Nog geen diensten deze week.</p>'}
    ${adm?`<div class="knoppen" style="justify-content:flex-start;gap:6px;flex-wrap:wrap"><button class="knop rand klein" data-u="nieuw" data-v="${esc(p.uid)}">+ Dienst toevoegen</button>${p.extern?`<button class="knop rand klein" data-u="koppel" data-v="${esc(p.uid)}">Koppel aan account</button><button class="knop rand klein" data-u="naamweg" data-v="${esc(p.uid)}">${afwStap==='naamweg:'+p.uid?'Zeker? Tik nogmaals':'Naam weghalen'}</button>`:''}</div>`:''}</div>`:''}</div>`}
function urenPaginaHtml(){if(urenView==='rooster'&&isAdmin())return roosterHtml();if(urenView==='overzicht'&&isAdmin())return`<button class="terug" data-u="view" data-v="klok">‹ Uren</button>`+urenBeheerHtml();
  const mensen=urenMensen(false),nu=mensen.filter(p=>urenLopend(p.uid)).length,i=urenInst();
  return`<div class="kop"><div class="koprij"><div><h1>Uren</h1><p>${nu?`Nu aan het werk: <b>${nu}</b>`:'Niemand ingeklokt'}${isAdmin()&&!i.iedereen?' · testfase: alleen jij klokt':''}</p></div>${isAdmin()?`<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="knop wit klein" data-u="view" data-v="rooster">Rooster</button><button class="knop wit klein" data-u="view" data-v="overzicht">Overzicht</button></div>`:''}</div></div>
   ${mensen.map(urenKlokRij).join('')}
   ${isAdmin()?`<div class="knoppen" style="justify-content:flex-start"><button class="knop rand" data-u="andere">+ Andere naam</button></div><p class="hulp" style="margin:6px 18px">Voor iemand die niet in de app staat: vul een naam in en de klok start. De naam blijft daarna in de lijst staan.</p>`:''}`}
/* ---------- overzicht (dag / week / maand) ---------- */
function urenBeheerHtml(){if(!isAdmin())return'';const i=urenInst(),b=urenBereik();
  const mensen=urenMensen(true).filter(p=>!p.weg||urenIn(p.uid,b.van,b.tot).length);
  const corr=Object.values(isObj(S.uren?.corr)?S.uren.corr:{}).filter(c=>c.status==='open').sort((a,c)=>a.t-c.t);
  let h=`<div class="kop"><div class="koprij"><h1>Urenoverzicht</h1></div><p>Diensten en pauzes per medewerker.</p></div>
   <div class="segment">${[['dag','Dag'],['week','Week'],['maand','Maand']].map(([k,l])=>`<button data-u="per" data-v="${k}" class="${urenPer===k?'aan':''}">${l}</button>`).join('')}</div>
   <div class="datumrij"><button data-u="schuif" data-v="-1">‹</button><div style="flex:1;text-align:center;font-weight:800">${esc(b.label)}${b.sub?`<div class="sub" style="font-weight:400">${esc(b.sub)}</div>`:''}</div><button data-u="schuif" data-v="1">›</button></div>`;
  if(corr.length)h+=`<div class="sectie"><div class="karkop"><b>Correctieverzoeken (${corr.length})</b></div>${corr.map(c=>`<div class="rij inv" style="flex-wrap:wrap"><div class="groei"><div class="naam" style="font-size:16px">${esc(c.naam)} · ${esc(datumTekst(c.d))} ${esc(c.van)}–${esc(c.tot)}</div><div class="sub">pauze ${c.pauze} min${c.not?' · “'+esc(c.not)+'”':''}</div></div><div class="knoppen" style="padding:6px 0 0;gap:6px"><button class="knop klein" data-u="corrok" data-v="${esc(c.id)}">Goedkeuren</button><button class="knop rand klein" data-u="corrnee" data-v="${esc(c.id)}">Afwijzen</button></div></div>`).join('')}</div>`;
  let totaal=0,aantal=0;
  for(const p of mensen){const l=urenIn(p.uid,b.van,b.tot),tot=l.reduce((t,x)=>t+urenNetto(x),0);totaal+=tot;if(l.length)aantal++;
    if(urenPer==='dag'){if(!l.length)continue;
      h+=`<div class="sectie"><div class="karkop"><b>${esc(p.naam)}</b>${p.extern?' <span class="sub">geen account</span>':''}<span class="bbtel" style="margin-left:auto">${urenDuur(tot)}</span></div>${l.map(x=>urenRij(p.uid,x,true)).join('')}</div>`;continue}
    if(urenPer==='maand'&&!l.length)continue;
    const goed=urenPer==='week'&&urenGoed(p.uid,b.van),open=urenOpenP['o'+p.uid],fout=l.some(x=>urenPauzeFout(x));
    h+=`<div class="sectie menu meergroep ${open?'open':''}"><div class="rijflex"><button class="groepkop" data-u="opersoon" data-v="${esc(p.uid)}" style="flex:1"><b>${esc(p.naam)}${p.extern?' <small style="font-weight:400">· geen account</small>':''}${fout?' ⚠️':''}</b><span class="bbtel">${urenDuur(tot)}${goed?' ✓':''} ${open?'▴':'▾'}</span></button></div>
     ${open?`<div class="meerinhoud">${l.map(x=>urenRij(p.uid,x,true)).join('')||'<p class="leeg" style="margin:10px">Geen diensten.</p>'}
      <div class="knoppen" style="justify-content:flex-start;gap:6px;flex-wrap:wrap"><button class="knop rand klein" data-u="nieuw" data-v="${esc(p.uid)}">+ Dienst toevoegen</button>${urenPer==='week'&&l.length?`<button class="knop ${goed?'rand':''} klein" data-u="goed" data-v="${esc(p.uid)}">${goed?'Goedkeuring intrekken':'✓ Week goedkeuren'}</button>`:''}${p.extern?`<button class="knop rand klein" data-u="koppel" data-v="${esc(p.uid)}">Koppel aan account</button>`:''}</div>${goed?`<p class="hulp">Goedgekeurd door ${esc(goed.wie)} op ${esc(datumTekst(iso(new Date(goed.t))))}</p>`:''}</div>`:''}</div>`}
  if(urenPer==='dag'&&!aantal)h+=`<p class="leeg">Geen diensten op deze dag.</p>`;
  if(urenPer==='maand'&&!aantal)h+=`<p class="leeg">Geen diensten in deze maand.</p>`;
  if(aantal)h+=`<div class="kaartje"><div class="naam">Totaal ${esc(b.kort==='dag'?'deze dag':b.kort==='week'?'deze week':'deze maand')}: ${urenDuur(totaal)}</div><div class="sub">${aantal} ${aantal===1?'medewerker':'medewerkers'}</div></div>`;
  h+=`<div class="knoppen" style="flex-wrap:wrap"><button class="knop" data-u="export">📊 Exporteer ${esc(b.kort)}</button></div>
   <div class="kaartje"><label class="schakel" style="margin:0;color:var(--tekst);font-weight:700">Klokken voor medewerkers<input type="checkbox" data-u="iedereen" ${i.iedereen?'checked':''}></label>
    <div class="sub" style="margin-top:6px">${i.iedereen?'Iedereen met het recht “Uren klokken” ziet de tegel Uren op Home en kan klokken.':'Uit: alleen jij ziet Uren. Zet aan als je klaar bent met testen.'}</div></div>
   <p class="hulp">Pauzecontrole volgens de standaardregels van de Arbeidstijdenwet voor volwassenen: meer dan 5,5 uur werk → 30 min pauze, meer dan 10 uur → 45 min. Controleer zelf of jullie cao iets anders zegt.</p>`;
  return h}
/* ---------- bewerken ---------- */
const hhmm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
function urenTijdstip(d,hm){const[h,m]=String(hm||'').split(':').map(Number);if(!isFinite(h)||!isFinite(m))return NaN;const x=vanIso(d);x.setHours(h,m,0,0);return x.getTime()}
function urenFormulier(titel,actie,v,x,extra){const d=x?iso(new Date(x.in)):(urenView==='overzicht'||sub==='uren')&&urenPer==='dag'?(urenDatum||iso()):iso(),p=x?Math.round(urenPauze(x).ms/60000):30;
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>${esc(titel)}</b><button data-u="${actie}" data-v="${esc(v)}" style="font-weight:700">Bewaren</button></div><div class="pinhoud">
   <label>Datum</label><input class="veld" type="date" id="uD" value="${d}" max="${iso()}" style="width:190px">
   <div class="minmax"><div><label>Begin</label><input class="veld" type="time" id="uVan" value="${x?hhmm(x.in):'08:00'}"></div><div><label>Einde</label><input class="veld" type="time" id="uTot" value="${x?.uit?hhmm(x.uit):x?'':'16:30'}"></div></div>
   <label>Pauze (minuten)</label><input class="veld" id="uP" inputmode="numeric" value="${p}" style="width:110px">
   <label>Opmerking</label><input class="veld" id="uNot" maxlength="200" value="${esc(x?.not||'')}" placeholder="Bijv. vergeten uit te klokken">
   <div class="fout" id="fout"></div>${extra||''}</div>`)}
function urenLees(){const d=document.getElementById('uD').value,van=document.getElementById('uVan').value,tot=document.getElementById('uTot').value,p=parseInt(document.getElementById('uP').value,10),not=document.getElementById('uNot').value.trim();
  const fout=t=>{document.getElementById('fout').textContent=t;return null};if(!d)return fout('Kies een datum.');const a=urenTijdstip(d,van);if(!isFinite(a))return fout('Vul een begintijd in.');
  let b=tot?urenTijdstip(d,tot):null;if(tot&&!isFinite(b))return fout('Eindtijd klopt niet.');if(b!=null&&b<=a)b+=864e5;if(b!=null&&b-a>16*3600e3)return fout('Een dienst kan niet langer dan 16 uur zijn.');
  if(!isFinite(p)||p<0)return fout('Vul de pauze in minuten in (0 mag).');if(b!=null&&p*60000>=b-a)return fout('De pauze is langer dan de dienst.');return{d,van,tot,a,b,p,not}}
/* ---------- export ---------- */
async function urenExport(){const b=urenBereik();
  if(!window.XLSX){toast('Excel-onderdeel laden…');try{await laadXlsx()}catch(e){toast('Excel kon niet laden, controleer je internet');return}}
  const rijen=[['Medewerker','Account','Datum','Dag','Begin','Einde','Pauze','Gewerkt','Gewerkt (decimaal)','Opmerking','Aangepast','Goedgekeurd']],som=[['Medewerker','Account','Diensten','Gewerkt','Gewerkt (decimaal)','Waarschuwingen']];
  for(const p of urenMensen(true)){const l=urenIn(p.uid,b.van,b.tot).filter(x=>x.uit);if(!l.length)continue;let t=0,wn=0;
    for(const x of l){const d=iso(new Date(x.in)),n=urenNetto(x);t+=n;if(urenPauzeFout(x))wn++;rijen.push([p.naam,p.extern?'geen account':'ja',d,vanIso(d).toLocaleDateString('nl-NL',{weekday:'short'}),hhmm(x.in),hhmm(x.uit),urenDuur(urenPauze(x).ms),urenDuur(n),Math.round(n/36e3)/100,x.not||'',isObj(x.gew)&&Object.keys(x.gew).length?'ja':'',urenGoed(p.uid,d)?'ja':''])}
    som.push([p.naam,p.extern?'geen account':'ja',l.length,urenDuur(t),Math.round(t/36e3)/100,wn])}
  if(rijen.length===1){toast('Geen afgesloten diensten in deze periode');return}
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(som),'Totalen');XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rijen),'Diensten');{const rr=roosterExportRijen(b.van,b.tot);if(rr.length>1)XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rr),'Rooster')}
  const naam=`uren-${b.kort==='dag'?b.van:b.kort==='week'?'week-'+weeknr(b.van)+'-'+b.van.slice(0,4):b.van.slice(0,7)}.xlsx`,buf=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  deelBestand(new File([buf],naam,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}))}
/* ---------- klikken ---------- */
document.addEventListener('click',e=>{const el=e.target.closest('[data-u]');if(!el||el.tagName==='INPUT')return;L.laatsteActie=Date.now();const c=el.dataset.u,v=el.dataset.v||'';const u=ik();if(!u)return;
  try{switch(c){
  case'in':case'pauze':afwStap=null;urenKlok(c,v);return;
  case'uit':if(afwStap!=='uurUit:'+v){afwStap='uurUit:'+v;render();setTimeout(()=>{if(afwStap==='uurUit:'+v){afwStap=null;render()}},5000);return}afwStap=null;urenKlok('uit',v);return;
  case'view':plekBewaar();urenView=['overzicht','rooster'].includes(v)&&isAdmin()?v:'klok';render();plekTerug(urenView==='overzicht');return;
  case'per':urenPer=v;render();return;
  case'schuif':urenSchuif(+v);render();return;
  case'persoon':urenOpenP[v]=!urenOpenP[v];render();return;
  case'opersoon':urenOpenP['o'+v]=!urenOpenP['o'+v];render();return;
  case'andere':{if(!isAdmin())return;toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Andere naam</b><button data-u="anderestart" style="font-weight:700">Start klok</button></div><div class="pinhoud">
    <label>Naam</label><input class="veld" id="uNaam" maxlength="40" placeholder="Bijv. Carlo" autocomplete="off"><div class="fout" id="fout"></div><p class="hulp">De klok start meteen. Daarna staat de naam in de lijst, zodat je de volgende keer gewoon op de naam tikt.</p></div>`);setTimeout(()=>document.getElementById('uNaam')?.focus(),200);return}
  case'anderestart':{if(!isAdmin())return;const n=(document.getElementById('uNaam')?.value||'').trim().replace(/\s+/g,' ');if(!n){document.getElementById('fout').textContent='Vul een naam in.';return}
    if(S.gebruikers.some(g=>g.actief!==false&&g.naam.toLowerCase()===n.toLowerCase())){document.getElementById('fout').textContent=`${n} staat al in de app. Tik op de naam in de lijst.`;return}
    const ub=urenBasis();if(!isObj(ub.namen))ub.namen={};let x=Object.values(ub.namen).find(y=>isObj(y)&&y.naam.toLowerCase()===n.toLowerCase());
    if(x){if(x.weg)delete x.weg}else{const id=urenId();x=ub.namen[id]={id,naam:n.slice(0,40),t:Date.now()};log(`Naam ${n} toegevoegd voor uren`)}
    sluit();const uid='n_'+x.id;if(urenLopend(uid)){bewaar();render();toast(`${x.naam} is al ingeklokt`);return}urenKlok('in',uid);return}
  case'naamweg':{if(!isAdmin()||!urenExtern(v))return;if(afwStap!=='naamweg:'+v){afwStap='naamweg:'+v;render();return}afwStap=null;const x=urenNamen()[v.slice(2)];if(!x)return;
    if(urenLopend(v)){toast('Klok eerst uit');return}x.weg=true;delete urenOpenP[v];log(`Naam ${x.naam} weggehaald bij uren`);bewaar();render();toast('Weggehaald. De uren blijven in het overzicht.');return}
  case'koppel':{if(!isAdmin()||!urenExtern(v))return;const g=S.gebruikers.filter(x=>x.actief!==false).sort((a,b2)=>a.naam.localeCompare(b2.naam,'nl'));
    toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Koppel ${esc(urenNaam(v))}</b><span style="width:70px"></span></div><div class="pinhoud"><p class="hulp">Kies het account. Alle uren van ${esc(urenNaam(v))} gaan naar dat account.</p>
     ${g.map(x=>`<button class="rij inv" style="width:100%;text-align:left" data-u="koppelok" data-v="${esc(v)}|${esc(x.id)}"><div class="groei"><div class="naam">${esc(x.naam)}</div></div><span>›</span></button>`).join('')}</div>`);return}
  case'koppelok':{if(!isAdmin())return;const[van,naar]=v.split('|');if(!urenExtern(van)||!S.gebruikers.some(g=>g.id===naar))return;const ub=urenBasis(),x=urenNamen()[van.slice(2)];
    if(urenLopend(van)&&urenLopend(naar)){toast('Beide zijn nu ingeklokt. Klok er eerst één uit.');return}
    const bron=urenVan(van),doel=urenSchrijf(naar);for(const[id,dn]of Object.entries(bron))doel[id]=dn;if(isObj(ub.d))delete ub.d[van];
    if(isObj(ub.goed))for(const k of Object.keys(ub.goed))if(k.startsWith(van+'|')){const nk=naar+k.slice(van.length);if(!ub.goed[nk])ub.goed[nk]=ub.goed[k];delete ub.goed[k]}
    if(x){x.weg=true;x.koppel=naar}log(`Uren van ${x?.naam||'?'} gekoppeld aan ${urenNaam(naar)}`);bewaar();sluit();render();toast('Gekoppeld');return}
  case'nieuw':{if(!isAdmin())return;urenFormulier('Dienst toevoegen · '+urenNaam(v),'bewaarnieuw',v,null);return}
  case'bewaarnieuw':{if(!isAdmin())return;const r=urenLees();if(!r)return;const ds=urenSchrijf(v),id=urenId();ds[id]={id,in:r.a,uit:r.b??null,pm:r.p,p:{},not:r.not,gew:{[urenId()]:{wie:u.naam,t:Date.now(),wat:'toegevoegd'}}};
    log(`Dienst toegevoegd voor ${urenNaam(v)} (${datumTekst(r.d)})`);bewaar();sluit();render();toast('Dienst toegevoegd');return}
  case'bewerk':{if(!isAdmin())return;const[uid,id]=v.split('|'),x=urenVan(uid)[id];if(!x)return;urenFormulier('Dienst bewerken · '+urenNaam(uid),'bewaarbewerk',v,x,`<div class="knoppen" style="justify-content:flex-start;padding:12px 0 0"><button class="knop rand rood klein" data-u="dienstweg" data-v="${esc(v)}">Dienst verwijderen</button></div>${isObj(x.gew)&&Object.keys(x.gew).length?`<p class="hulp">${Object.values(x.gew).sort((a,b2)=>a.t-b2.t).map(g=>`${esc(g.wat)} door ${esc(g.wie)} op ${esc(datumTekst(iso(new Date(g.t))))} ${tijdTekst(g.t)}`).join('<br>')}</p>`:''}`);return}
  case'bewaarbewerk':{if(!isAdmin())return;const[uid,id]=v.split('|'),x=urenVan(uid)[id];if(!x)return;const r=urenLees();if(!r)return;
    x.in=r.a;x.uit=r.b??null;x.pm=r.p;x.not=r.not;if(!isObj(x.gew))x.gew={};x.gew[urenId()]={wie:u.naam,t:Date.now(),wat:'aangepast'};log(`Dienst van ${urenNaam(uid)} aangepast (${datumTekst(r.d)})`);bewaar();sluit();render();toast('Opgeslagen');return}
  case'dienstweg':{if(!isAdmin())return;if(afwStap!=='dienstweg'){afwStap='dienstweg';el.textContent='Zeker? Tik nogmaals';return}afwStap=null;
    const[uid,id]=v.split('|');delete urenSchrijf(uid)[id];log(`Dienst van ${urenNaam(uid)} verwijderd`);bewaar();sluit();render();toast('Verwijderd');return}
  case'corrok':case'corrnee':{if(!isAdmin())return;const k=S.uren?.corr?.[v];if(!k||k.status!=='open')return;
    if(c==='corrok'){const ds=urenSchrijf(k.uid),a=urenTijdstip(k.d,k.van);let b=urenTijdstip(k.d,k.tot);if(b<=a)b+=864e5;const did=k.dienst&&ds[k.dienst]?k.dienst:urenId();if(!ds[did])ds[did]={id:did,p:{}};const x=ds[did];
      x.in=a;x.uit=b;x.pm=k.pauze;if(k.not)x.not=k.not;if(!isObj(x.gew))x.gew={};x.gew[urenId()]={wie:u.naam,t:Date.now(),wat:'correctie van '+k.naam+' goedgekeurd'};k.status='ok'}
    else k.status='nee';k.af={wie:u.naam,t:Date.now()};log(`Correctie uren van ${k.naam} ${c==='corrok'?'goedgekeurd':'afgewezen'}`);bewaar();render();return}
  case'goed':{if(!isAdmin())return;const w=urenBereik().van,k=urenGoedKey(v,w),ub=urenBasis();if(!isObj(ub.goed))ub.goed={};if(ub.goed[k])delete ub.goed[k];else ub.goed[k]={wie:u.naam,t:Date.now()};
    log(`Uren week ${weeknr(w)} van ${urenNaam(v)} ${ub.goed[k]?'goedgekeurd':'goedkeuring ingetrokken'}`);bewaar();render();return}
  case'export':if(!isAdmin())return;urenExport();return;
  }}catch(x){meldFout(x,'Uren')}});
document.addEventListener('change',e=>{if(e.target.dataset?.u==='iedereen'&&isAdmin()){const ub=urenBasis();if(!isObj(ub._inst))ub._inst={};ub._inst.iedereen=e.target.checked;log(`Klokken voor medewerkers ${e.target.checked?'aan':'uit'}`);bewaar();render()}});
/* lopende tijden bijhouden */
setInterval(()=>{try{if(tab==='uren'&&urenView==='klok'&&urenNu().length&&!document.querySelector('#sheet.open')&&!(document.activeElement&&document.activeElement.matches('input,textarea'))&&!String(afwStap||'').startsWith('uurUit'))render()}catch(e){}},30000);
/* ================= 10.12 Home ================= */
function homeKlaar(){try{const d=iso(),sec=maakLijst(d,moment),vers=versRegels(d,moment),v=S.vinkjes[d]?.[moment]||{},alle=[...sec.flatMap(x=>x.regels),...vers];return{n:alle.length,k:alle.filter(r=>v[r.s.id]).length}}catch(e){return{n:0,k:0}}}
function homeHtml(){const uur=new Date().getHours(),groet=uur<12?'Goedemorgen':uur<18?'Goedemiddag':'Goedenavond',naam=(ik()?.naam||'').split(' ')[0],t=[];
  {const{n,k}=homeKlaar();t.push(['tab','lijst','🥖','Klaarzetten',n?(k===n?'✓ Alles klaar':`nog ${n-k} te gaan`):'Niets klaar te zetten',n&&k<n])}
  if(mag('invullen'))t.push(['tab','plan','📝','Invullen','Planning en bestellen',false]);
  if(mag('derving')){const od=S.soorten.filter(s=>s.type==='vers'&&s.naam.trim()&&gezetOverDatum(iso(),s)>0).length,klaar=!!S.historie[iso()];
    t.push(['tab','derving','🗑','Derving',klaar?'✓ Lijst van vandaag opgeslagen':od?`${od} over datum vandaag`:'Derving invullen',!klaar&&od>0])}
  if(urenMag()){const n=urenNu().length;t.push(['tab','uren','⏱','Uren',n?`${n} aan het werk`:'Niemand ingeklokt',false])}
  {const[st,wl]=clHomeStatus();t.push(['tab','check','✅','Checklists',st,wl])}
  {const o=chatTotaal();t.push(['sub2','berichten','💬','Chat',o?`${o} ongelezen`:'Team en beheerder',o>0])}
  return`<div class="kop"><div class="koprij"><div><div class="groet">${groet}</div><h1>${esc(naam)} ${esc(prof().emoji||'👋')}</h1><p>${esc(dagNaamLang(iso()))}</p></div></div></div>
   ${installHtml()}${roosterHomeHtml()}${homeTegelsHtml()}`}
(function(){const st=document.createElement('style');st.textContent=`.hometegels{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:6px 16px 16px}
.hometegel{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-height:118px;padding:14px;border-radius:16px;background:var(--kaart);border:1px solid var(--lijn);color:var(--tekst);text-align:left;font-size:17px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.hometegel .hti{font-size:30px;line-height:1}.hometegel b{font-size:18px;margin-top:4px}.hometegel .hts{font-size:14px;color:var(--grijs)}
.hometegel.let{border:2px solid var(--oranje)}.hometegel.let .hts{color:var(--oranje);font-weight:700}
.hometegel:active{transform:scale(.98)}
.uurrij .uurnaam{background:none;border:0;padding:0;text-align:left;color:inherit;font:inherit;min-width:140px}
.uurrij.aanwerk{border-left:4px solid var(--groen,#2e9e44)}
.uurrij .pijltje{font-size:12px;color:var(--grijs)}
.knop.wit{background:#fff;color:var(--oranje);border:0}`;document.head.appendChild(st)})();
/* ================= 10.12 plek op de pagina onthouden ================= */
const schermPlek={};
const schermSleutel=()=>tab==='meer'?'meer|'+(sub||''):tab==='uren'?'uren|'+urenView:tab;
function plekBewaar(){const m=document.getElementById('scherm');if(m)schermPlek[schermSleutel()]=m.scrollTop}
function plekTerug(nul){const m=document.getElementById('scherm');if(!m)return;m.scrollTop=nul?0:(schermPlek[schermSleutel()]||0)}


