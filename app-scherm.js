/* ================= toestand scherm ================= */
let tab='home',sub=null,datum=iso(),moment=S.momenten[0].id,planKeuze=planKeyVoor(iso()),open={},dervDatum=iso(),
    bewerk=null,verwStap=false,loginKeuze=null,ovenModus=false,ovenKeuze={},werk=null,rapWeek=null,afwStap=null,best='weg',koppelFout='',
    ontDatum=plusDagen(iso(),1),afwForm={datum:plusDagen(iso(),1),naam:'',start:'kopie'},uitlegOpen=null,volgVandaag=true;
function versGeleverd(d){if(S.versUitz&&d in S.versUitz)return!!S.versUitz[d];return(S.versDagen||[1,2,3,4,5,6]).includes(vanIso(d).getDay())}
const DAG_NR={zo:0,ma:1,di:2,wo:3,do:4,vr:5,za:6};
function naOmschakel(){return S.omschakel!=null&&new Date().getHours()>=S.omschakel}
function standaardDatum(){return naOmschakel()?plusDagen(iso(),1):iso()}
function dagNaamLang(d){const x=vanIso(d);return x.toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long'})}
function maandag(d){const x=vanIso(d),w=(x.getDay()+6)%7;return plusDagen(d,-w)}
rapWeek=maandag(iso());

function render(){
  const m=document.getElementById('scherm');pasThemaToe();_render();const merk=!!m.querySelector('.merkscherm');document.getElementById('app').classList.toggle('merkmodus',merk);
  if(tab==='lijst'&&zoekOpen)zoekFilter();
  if(typeof terugBewaak==='function')setTimeout(terugBewaak,0);
  try{toonUpdateBalk()}catch(e){}
  const k=m.querySelector('.kop');if(k&&!merk){k.insertAdjacentHTML('afterbegin',`<img class="koplogo" src="${logoSrc()}" alt="${esc(winkelNaam())}">${isAdmin()||ongelezenM()?(()=>{const n=belItems().length;return`<button class="belknop" data-a="bel" aria-label="Meldingen">🔔${n?`<span class="belgetal">${n}</span>`:''}</button>`})():''}${ik()&&S.gebruikers.filter(g=>g.rol==='admin'||g.actief!==false).length>1?`<button class="wisselknop ${isAdmin()||ongelezenM()?'metbel':''}" data-a="wissel">${prof().emoji||'👤'} ${esc((ik().naam||'').split(' ')[0])} ⇄</button>`:''}`);const t=m.querySelector(':scope > .terug');if(t)k.prepend(t)}
}
function _render(){
  const m=document.getElementById('scherm'),nav=document.getElementById('nav'),st=document.getElementById('statusplek');
  if(L.sessie&&ik()&&pinTijdelijk(ik())){st.innerHTML=statusHtml();nav.innerHTML='';m.innerHTML=pinKiesHtml();return}
  if(st)st.innerHTML=statusHtml();
  if(!S.momenten.find(x=>x.id===moment))moment=S.momenten[0].id;
  if(winkelKiezen){m.innerHTML=winkelKiesHtml();nav.innerHTML='';return}
  if(L.modus!=='lokaal'&&!L.gekoppeld){m.innerHTML=L.wissel?`<div class="login"><h1>Verbinden…</h1><p>${esc(winkelNaam())} wordt geopend.</p></div>`:koppelHtml();nav.innerHTML='';return}
  if(L.herstel&&L.gekoppeld){m.innerHTML=`<div class="login"><h1>Gegevens ophalen…</h1><p>Dit toestel haalt alle gegevens opnieuw op van de server. ${syncStatus==='offline'?'Er is nu geen internet; zodra er verbinding is, gaat het verder.':'Een ogenblik.'}</p></div>`;nav.innerHTML='';return}
  if(syncStatus==='start'&&!S.gebruikers.length){m.innerHTML=`<div class="login"><h1>Verbinden…</h1><p>Gegevens worden opgehaald.</p></div>`;nav.innerHTML='';return}
  if(!S.gebruikers.some(g=>g.rol==='admin')){m.innerHTML=setupHtml();nav.innerHTML='';return}
  const g=ik();if(!g||(g.rol!=='admin'&&g.actief===false)){if(L.sessie){L.sessie=null;bewaarL()}m.innerHTML=loginHtml();nav.innerHTML='';return}
  const t=TABS.find(x=>x[0]===tab);if(tab==='uren'?!urenMag():tab==='check'?false:(!t||(t[2]&&!mag(t[2]))))tab='home';
  m.innerHTML=veiligScherm();
  if(tab==='lijst'||tab==='home'){const bk=chatBalkKlaarzetten();if(bk){const k=m.querySelector('.kop');if(k)k.insertAdjacentHTML('afterend',bk);else m.insertAdjacentHTML('afterbegin',bk)}}
  if(['lijst','plan','derving','check'].includes(tab)||(tab==='uren'&&urenView==='klok'))m.insertAdjacentHTML('afterbegin','<button class="terug" data-a="tab" data-v="home">‹ Home</button>');
  {const wb=winkelBalk();if(wb)m.insertAdjacentHTML('afterbegin',wb)}
  nav.innerHTML=TABS.filter(([k,l,r])=>k==='home'||k==='meer').map(([k,l,r])=>{const ok=true;return`<button data-a="${ok?'tab':'slot'}" data-v="${k}" class="${tab===k||(k==='home'&&tab!=='meer')?'aan':''} ${ok?'':'op-slot'}">${ok?'':SLOT+' '}${l}${k==='meer'&&chatTotaal()?'<span class="tabbol"></span>':''}</button>`}).join('');
  if(chatId&&document.getElementById('chatOv')?.classList.contains('open'))chatVernieuw();
  if(werk)renderWerk();
}
const momentSegment=()=>S.momenten.length<2?'':`<div class="segment">${S.momenten.map(x=>`<button data-a="moment" data-v="${x.id}" class="${x.id===moment?'aan':''}">${esc(x.naam)}</button>`).join('')}</div>`;

/* ---------- Koppelen ---------- */


/* ---------- Klaarzetten ---------- */
function gKey(nr,r){return r.s.kar+'|'+r.g}
function vindGroep(gk){for(const x of maakLijst(datum,moment))for(const r of x.regels)if(gKey(x.nr,r)===gk)return{r,nr:x.nr};return null}
function stat(d,m,k,maak){if(!maak)return S.status[d]?.[m]?.[k]||{oven:0,gebakken:0,schap:0};S.status[d]=S.status[d]||{};S.status[d][m]=S.status[d][m]||{};return S.status[d][m][k]=S.status[d][m][k]||{oven:0,gebakken:0,schap:0}}
function restPlaten(r,nr){const s=stat(datum,moment,gKey(nr,r));return Math.max(0,r.aantalPlaten-s.oven-s.gebakken-s.schap)}

const SLOT='<svg class="slotje" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>';
const info=k=>`<button class="info" data-a="uitleg" data-v="${k}" aria-label="Uitleg">?</button>`;
const fmt=n=>Number.isInteger(n)?String(n):String(Math.round(n*10)/10).replace('.',',');
const pluTag=s=>s&&s.plu?` <span class="plu">PLU ${esc(s.plu)}</span>`:'';
function afgebakken(gk){const s=stat(datum,moment,gk);return(s.oven||0)+(s.gebakken||0)+(s.schap||0)}
function versRegels(d,m){const pk=planKeyVoor(d);return S.soorten.filter(s=>s.type==='vers'&&s.naam.trim()).map(s=>{const gepland=stuksIn(pk,m,s),n=werkelijk(d,m,s);return{s,n,gepland,aangepast:n!==gepland,extra:gepland===0&&n>0}}).filter(r=>r.n>0)}
function heleVan(d,m,id,n){return snijVan(d,m,id,n).hele}
function snijStd(id,av){const st=S.soorten.find(y=>y.id===id)?.snijStandaard||'half',heel=Math.floor(av);
  if(st==='heel')return{hele:heel,halve:Math.round((av-heel)*2)};if(st==='halve')return{hele:0,halve:Math.round(av*2)};
  const h=Math.ceil(heel/2);return{hele:h,halve:Math.round((av-h)*2)}}
function snijAangepast(d,m,id,n){const x=S.snij[d]?.[m]?.[id];if(x==null)return false;if(typeof x==='number')return true;const sd=snijStd(id,n-(x.derf||0));return x.hele!==sd.hele||x.halve!==sd.halve}
function snijVan(d,m,id,n){const x=S.snij[d]?.[m]?.[id];let o;
  if(x==null)o={...snijStd(id,n),derf:0};else if(typeof x==='number'){const h=Math.max(0,Math.min(n,x));o={hele:h,halve:(n-h)*2,derf:0}}else o={hele:x.hele||0,halve:x.halve||0,derf:x.derf||0};
  o.rest=Math.max(0,n-o.hele-o.halve/2-o.derf);return o}
function lijstHtml(){
  const sec=maakLijst(datum,moment),vers=versRegels(datum,moment),v=S.vinkjes[datum]?.[moment]||{},gr=dagGroep(datum),vandaag=datum===iso(),pk=planKeyVoor(datum);
  const alle=[...sec.flatMap(x=>x.regels),...vers],n=alle.length+0,k=alle.filter(r=>v[r.s.id]).length,heeftAfbak=sec.some(x=>x.regels.some(r=>r.s.type!=='ontdooien'));
  const uur=new Date().getHours(),groet=uur<12?'Goedemorgen':uur<18?'Goedemiddag':'Goedenavond',naamIk=(ik()?.naam||'').split(' ')[0];
  const ring=n?`<svg class="ring" viewBox="0 0 66 66" role="img" aria-label="${k} van ${n} klaar"><circle cx="33" cy="33" r="27" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="7"/><circle cx="33" cy="33" r="27" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(169.6*k/n).toFixed(1)} 169.6" transform="rotate(-90 33 33)"/><text x="33" y="38" text-anchor="middle" font-size="${n>99?12:15}" font-weight="800" fill="#fff">${k}/${n}</text></svg>`:'';
  const P=prof();
  let h=(P.groet?`<div class="kop"><div class="koprij"><div><div class="groet">${vandaag?groet:'Klaarzetten'}</div><h1>${vandaag?esc(naamIk)+' '+(P.emoji||'👋'):esc(datumTekst(datum))}</h1><p>${n?(k===n?`Alles klaar voor ${esc(momentNaam(moment).toLowerCase())}`:`Klaarzetten · nog ${n-k} te gaan${S.momenten.length>1?` voor ${esc(momentNaam(moment).toLowerCase())}`:''}`):'Niets klaar te zetten'}</p></div><div class="kopeind">${ring}<button class="info" data-a="zoek" aria-label="Zoeken">⌕</button>${info('klaarzetten')}</div></div></div>`:`<div class="kop"><div class="koprij"><h1>Klaarzetten</h1><div class="kopeind"><button class="info" data-a="zoek" aria-label="Zoeken">⌕</button>${info('klaarzetten')}</div></div><p>${n?`${k} van ${n} klaar`:'Niets klaar te zetten'}</p></div>`)+`
   <div class="datumnav"><button class="pijlk" data-a="datum" data-v="-1">‹</button><button class="dlabel" data-a="vandaag">${vandaag?'Vandaag':esc(datumTekst(datum))}<small>${vandaag?esc(datumTekst(datum)):'tik voor vandaag'}</small></button><button class="pijlk" data-a="datum" data-v="1">›</button></div>`;
  {const morgen=plusDagen(iso(),1);
   h+=datum===morgen?`<div class="dagbalk morgen">Je zet klaar voor: <b>${esc(dagNaamLang(datum))} (morgen)</b></div>`:datum===iso()?`<div class="dagbalk vandaag">Bakdag vandaag: <b>${esc(dagNaamLang(datum))}</b></div>`:`<div class="dagbalk anders">${datum<iso()?'Eerdere dag':'Later'}: <b>${esc(dagNaamLang(datum))}</b></div>`;
   if(datum===iso()&&naOmschakel()&&mag('vinken'))h+=`<div class="kaartje waarschuw"><b>Let op: dit is de lijst van vandaag.</b><div class="sub">Wil je klaarzetten voor morgen?</div><div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:8px"><button class="knop klein" data-a="naarmorgen">Naar morgen →</button></div></div>`}
  h+=installHtml();
  if(!prof().eenvoudig)h+=weerRegel(datum);
  if(zoekOpen)h+=`<div class="zoekbalk"><input class="veld" id="kzZoek" type="search" placeholder="Zoek op naam of PLU" value="${esc(zoekTerm)}" autocomplete="off"></div>`;
  if(pk.startsWith('afw:'))h+=`<span class="pil">Afwijkende planning: ${esc(S.afwijkend[datum].naam)}</span>`;
  if(S.afsluit[datum])h+=`<span class="pil groen">✓ Dag afgesloten door ${esc(S.afsluit[datum].wie)} om ${tijdTekst(S.afsluit[datum].t)}</span>`;
  if(vandaag&&mag('invullen')&&!isAdmin()){const f=volgendeFeest();if(f){const dg=Math.round((vanIso(f[0])-vanIso(iso()))/864e5);
    h+=`<div class="kaartje feestkaart2"><h3>${esc(f[1])} over ${dg} ${dg===1?'dag':'dagen'}</h3><div class="sub">${esc(datumTekst(f[0]))} – afwijkende dag maken?</div>
    <div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:10px;flex-wrap:wrap"><button class="knop klein" data-a="feestkopie" data-v="${f[0]}" data-n="${esc(f[1])}">Kopie van planning</button><button class="knop rand klein" data-a="feestnul" data-v="${f[0]}" data-n="${esc(f[1])}">Gesloten</button><button class="knop rand klein" data-a="feestnee" data-v="${f[0]}">Niet nodig</button></div></div>`}}
  h+=momentSegment()+notitiesHtml(datum);
  if(vandaag&&mag('vinken')){const od=ontdooiLijst(plusDagen(iso(),1));if(od.length)h+=`<button class="avondkaart" data-a="sub2" data-v="ontdooi"><b>Ontdooien zoet voor morgen</b><span>${od.filter(x=>x.klaar).length} van ${od.length} gedaan ›</span></button>`}
  if(sec.length&&mag('vinken'))h+=`<div class="acties"><button class="knop" data-a="werkmodus">Werkmodus</button>${heeftAfbak&&datum<=iso()?`<button class="knop rand" data-a="ovenmodus">${ovenModus?'Oven annuleren':'Oven vullen'}</button>`:''}</div>`;
  if(!n&&!bijbakLijst(datum).length)h+=`<p class="leeg">Voor ${esc(momentNaam(moment).toLowerCase())} op ${esc(datumTekst(datum))} staat niets gepland.</p>`;
  const gezien={},kanTaak=(isAdmin()||mag('invullen'))&&!prof().werkvloer;
  sec.sort((a,b)=>(karTaak(datum,b.nr)===L.sessie)-(karTaak(datum,a.nr)===L.sessie));
  for(const s of sec){const tk=karTaak(datum,s.nr),tkNaam=tk?S.gebruikers.find(g=>g.id===tk)?.naam:'';
    h+=`<div class="sectie" style="border-color:${karKleur(s.nr)}"><div class="karkop" style="background:${karKleur(s.nr)}" ${kanTaak?`data-a="kartaak" data-v="${s.nr}"`:''}><b>${esc(s.naam)}</b><span>${s.platen?`${s.platen} platen, `:''}${s.totaal} stuks</span>${mag('vinken')&&!ovenModus&&s.regels.some(r=>!v[r.s.id])?`<button class="karalles" data-a="karalles" data-v="${s.nr}">✓ Alles</button>`:''}</div>${tk||kanTaak?`<div class="taakregel ${tk===L.sessie?'mijn':''}" ${kanTaak?`data-a="kartaak" data-v="${s.nr}"`:''}>${tk?`👤 ${esc(tkNaam||'?')}${tk===L.sessie?' (jij)':''}`:'+ Iemand toewijzen'}</div>`:''}`;
    for(const r of s.regels){
      const kl=!!v[r.s.id],gk=gKey(s.nr,r),eerste=!gezien[gk];gezien[gk]=true;
      const afb=r.s.type!=='ontdooien',gek=ovenKeuze[gk]!=null,a=advies(r.s,gr),hs=historie(r.s,gr),rest=restPlaten(r,s.nr),ab=afgebakken(gk);
      const extra=afb?[r.s.programma?`prog. ${esc(r.s.programma)}`:'',r.s.temp?`${r.s.temp}°C`:'',r.s.baktijd?`${r.s.baktijd} min`:''].filter(Boolean).join(', '):'';
      const actie=ovenModus?(afb&&(rest>0||gek)?'ovenkies':''):'vink';
      const label=(r.s.nieuwSinds?'<span class="st extra">nieuw</span> ':'')+(r.s.type==='ontdooien'?'<span class="st ontd">ontdooien</span> ':'')+(r.extra?'<span class="st extra">extra</span> ':r.aangepast?`<span class="st aangepast">gepland ${r.gepland}</span> `:'');
      const stx=stat(datum,moment,gk),statusTxt=!ovenModus&&(kl||(afb&&ab))?`<div class="statusrij">${kl?`✓ ${wieTijd(v[r.s.id])}`:''}${afb&&ab?`<span class="st gebak">${ab} van ${r.aantalPlaten} afgebakken${stx.wie?' · '+wieTijd(stx):''}</span>`:''}</div>`:'';
      h+=`<div class="rij" data-zoek="${esc((r.s.naam+' '+(r.s.plu||'')).toLowerCase())}"><div class="rijflex"><button class="regel ${kl&&!ovenModus?'klaar':''} ${ovenModus&&gek?'gekozen':''} ${ovenModus&&!actie?'uit':''}" ${actie?`data-a="${actie}" data-v="${esc(ovenModus?gk:r.s.id)}"`:''}>${r.ontdooi?`<div class="plaat stuks">${r.n}<small>st</small></div>`:`<div class="plaat">${r.plaat}</div>`}${sFoto(r.s.id)?`<img class="duim klein" src="${sFoto(r.s.id)}" alt="">`:''}<div class="groei"><div class="naam">${esc(r.s.naam)}${pluTag(r.s)}</div><div class="sub">${label}${r.n} stuks${!r.ontdooi&&(r.v.platen>1||r.v.delen[0]!==r.n)?` (${r.v.delen.join(' + ')})`:''}${extra?` – ${extra}`:''}${r.teWeinig?` <span class="let">– laatste plaat onder min. ${r.s.min}</span>`:''}</div>
        ${ovenModus&&afb?`<div class="sub"><b style="color:${rest?'var(--oranje)':'var(--groen)'}">${rest?`nog ${rest} ${rest===1?'plaat':'platen'} af te bakken`:'alles afgebakken'}</b></div>`:statusTxt}</div>
        ${ovenModus?(afb?`<div class="kiesvak">${gek?'✓':''}</div>`:''):mag('vinken')?`<div class="vinkvak">${kl?'✓':''}</div>`:''}</button>${!ovenModus?`<button class="pot pinfo" data-a="pinfo" data-v="${r.s.id}" aria-label="Productinfo">ⓘ</button>`:''}${!ovenModus&&mag('vinken')?`<button class="pot" data-a="aanpas" data-v="${r.s.id}" aria-label="Aantal aanpassen">✎</button>`:''}</div>`;
      if(ovenModus&&gek&&eerste)h+=`<div class="ovenstep"><span>Platen de oven in</span><div class="stepper"><button data-a="ovenaantal" data-v="${esc(gk)}" data-n="-1">−</button><input readonly value="${ovenKeuze[gk]}"><button data-a="ovenaantal" data-v="${esc(gk)}" data-n="1">+</button></div><span class="hulp" style="margin:0">van ${rest}</span></div>`;
      if(!ovenModus&&afb&&ab>0&&eerste&&mag('vinken'))h+=`<button class="hist" data-a="afbak" data-v="${esc(gk)}">${ab} van ${r.aantalPlaten} ${r.aantalPlaten===1?'plaat':'platen'} afgebakken – <b>tik om te wijzigen</b></button>`;
      if(hs.length&&!ovenModus){
        h+=`<button class="hist" data-a="hist" data-v="${r.s.id}">${a?adviesTekst(a,werkDagTotaal(datum,r.s),gr):`Derving: ${fmt(hs[0].der)} over op ${datumTekst(hs[0].d)}`} ${open[r.s.id]?'▴':'▾'}</button>`;
        if(open[r.s.id])h+=histTabel(hs);
      }
      h+='</div>';
    }
    h+='</div>';
  }
  h+=bijbakHtml();
  if(!ovenModus&&!versGeleverd(datum)&&S.soorten.some(x=>x.type==='vers'&&x.naam.trim()))h+=`<div class="sectie"><div class="karkop" style="background:#6b6b6b"><b>Vers brood</b></div><div class="taakregel">Geen levering vers brood op ${esc(dagNaamLang(datum))}.</div></div>`;
  if(vers.length&&!ovenModus){const lv=S.levering[datum];
    h+=`<div class="sectie"><div class="karkop"><b>Vers brood</b><span>${vers.reduce((t,r)=>t+r.n,0)} broden</span></div>`;
    h+=lv?`<div class="taakregel">Levering ingevuld door ${esc(lv.wie)} om ${tijdTekst(lv.t)}${mag('vinken')?' · <button class="linkoranje" data-a="levering">Aanpassen</button>':''}${lv.fotoId&&S.notfotos[lv.fotoId]?' · <button class="linkoranje" data-a="levfoto">📷 Pakbon</button>':''}</div>`
      :datum>iso()?`<div class="taakregel">De levering vul je in op ${esc(dagNaamLang(datum))}, als die binnen is.</div>`:`<div class="levmelding"><b>Levering ${datum===iso()?'van vandaag':'van '+esc(datumTekst(datum))} nog invullen</b><span>Vul de aantallen in van de pakbon.</span>${mag('vinken')?'<button class="knop klein" data-a="levering">Levering invullen (pakbon)</button>':''}</div>`;
    for(const r of vers){const kl=!!v[r.s.id],on=r.s.gesneden==='on',a=advies(r.s,gr),hs=historie(r.s,gr),bes=dagTotaal(planKeyVoor(datum),r.s),geleverd=lv?.items&&r.s.id in lv.items;
      const label=(on?'<span class="st ontd">ongesneden</span> ':'<span class="st ontd">voorgesneden</span> ')+(geleverd&&lv.pakbon&&r.n!==(lv.pakbon[r.s.id]??0)?`<span class="st aangepast">pakbon ${lv.pakbon[r.s.id]??0}, geleverd ${r.n}</span> `:geleverd&&!lv.pakbon&&r.n!==bes?`<span class="st aangepast">besteld ${bes}, geleverd ${r.n}</span> `:!geleverd&&(r.extra||r.aangepast)?(r.extra?'<span class="st extra">extra</span> ':`<span class="st aangepast">gepland ${r.gepland}</span> `):'');
      const sn=on?snijVan(datum,moment,r.s.id,r.n):null;
      h+=`<div class="rij" data-zoek="${esc((r.s.naam+' '+(r.s.plu||'')+' '+(r.s.pluHalf||'')).toLowerCase())}"><div class="rijflex"><button class="regel ${kl?'klaar':''}" data-a="vink" data-v="${r.s.id}">${sFoto(r.s.id)?`<img class="duim klein" src="${sFoto(r.s.id)}" alt="">`:''}<div class="groei"><div class="naam">${esc(r.s.naam)}${on?'':pluTag(r.s)}</div><div class="sub">${label}${on?`${r.n} ${r.n===1?'brood':'broden'}${geleverd?' geleverd':''}`:`Vullen: <b>${r.n}</b>`}</div>${kl?`<div class="statusrij">✓ ${wieTijd(v[r.s.id])}</div>`:''}</div>${mag('vinken')?`<div class="vinkvak">${kl?'✓':''}</div>`:''}</button><button class="pot pinfo" data-a="pinfo" data-v="${r.s.id}" aria-label="Productinfo">ⓘ</button>${mag('vinken')&&!geleverd?`<button class="pot" data-a="aanpas" data-v="${r.s.id}" aria-label="Aantal aanpassen">✎</button>`:''}</div>`;
      if(on){const kan=mag('vinken'),st=(f,lbl,plu,val)=>`<div class="snijrij"><span class="snijlabel">${lbl}${plu?` <span class="plu">PLU ${esc(plu)}</span>`:''}</span>${kan?`<div class="stepper"><button data-a="snij" data-v="${r.s.id}" data-f="${f}" data-n="-1">−</button><input readonly value="${val}"><button data-a="snij" data-v="${r.s.id}" data-f="${f}" data-n="1">+</button></div>`:`<b>${val}</b>`}</div>`;
        const aang=snijAangepast(datum,moment,r.s.id,r.n);h+=st('hele','Heel',r.s.plu,sn.hele)+st('halve','Half',r.s.pluHalf,sn.halve);
        h+=`<div class="snijstatus">${sn.rest?`<span>Nog ${fmt(sn.rest)} ${sn.rest===1?'brood':'brood'} te verdelen</span>${kan?`<button class="knop rand klein" data-a="snijderf" data-v="${r.s.id}">${sn.rest===0.5?'½ brood derven':'Rest derven'}</button>`:''}`:'<span class="goed">✓ Alles verdeeld</span>'}${sn.derf?`<span class="hulp" style="margin:0"> · ${fmt(sn.derf)} gederfd</span>`:''}${aang?`<span class="st aangepast">aangepast</span>${kan?`<button class="knop rand klein" data-a="snijreset" data-v="${r.s.id}">↺ Standaard</button>`:''}`:''}</div>`}
      if(hs.length){h+=`<button class="hist" data-a="hist" data-v="${r.s.id}">${a?adviesTekst(a,werkDagTotaal(datum,r.s),gr):`Derving: ${fmt(hs[0].der)} over op ${datumTekst(hs[0].d)}`} ${open[r.s.id]?'▴':'▾'}</button>`;if(open[r.s.id])h+=histTabel(hs)}
      h+='</div>'}
    h+='</div>';
  }

  if(ovenModus)h+=ovenBalk(sec);
  if(!ovenModus)h+=`<div class="knoppen" style="margin-top:10px"><button class="knop rand klein" data-a="printen">Printen</button></div>`;
  if(ovenModus){}else if(mag('vinken')){h+=`<div class="knoppen"><button class="knop" data-a="bijnieuw">Bijbakken</button><button class="knop rand" data-a="extra">+ Extra klaarzetten</button>${n?`<button class="knop rand" data-a="wis">${afwStap==='wis'?'Tik nogmaals om te wissen':'Vinkjes wissen'}</button>`:''}</div>`}
  return h;
}
function bijbakHtml(){
  const l=bijbakLijst(datum);if(!l.length||ovenModus)return'';
  const totaal=l.reduce((t,x)=>t+bijItems(x).reduce((a,i)=>a+i.n,0),0);
  let h=`<div class="sectie"><div class="karkop"><b>Bijgebakken</b><span>${totaal} stuks</span></div>`;
  for(const x of l){const it=bijItems(x),pl=it.reduce((a,i)=>a+i.platen,0),progs=[...new Set(it.map(i=>(S.soorten.find(s=>s.id===i.soort)?.programma||'').trim()).filter(Boolean))];
    h+=`<div class="rij"><div class="rijflex"><div class="regel"><div class="groei"><div class="naam">Lading ${tijdTekst(x.t)} <span class="sub" style="font-weight:400">${esc(x.wie)} – ${pl} ${pl===1?'plaat':'platen'}${progs.length?` – prog. ${progs.map(esc).join(' / ')}`:''}</span></div>
      ${it.map(i=>{const s=S.soorten.find(y=>y.id===i.soort);return`<div class="bijitem">${s&&sFoto(s.id)?`<img class="duim mini" src="${sFoto(s.id)}" alt="">`:''}<span><b>${i.platen} × ${i.perPlaat}</b> ${esc(s?s.naam:'?')}${pluTag(s)} <span class="sub">(${i.n} stuks)</span></span></div>`}).join('')}
      <div class="statusrij">${x.klaar?`<span class="st gebak">afgebakken ${tijdTekst(x.klaar.t)}</span>`:'<span class="st oven">in de oven</span>'}</div></div>
      ${mag('vinken')?`<button class="knop ${x.klaar?'rand':''} klein" data-a="bijklaar" data-v="${esc(x.id)}">${x.klaar?'Ongedaan':'Afgebakken'}</button>`:''}</div>${mag('vinken')?`<button class="pot" data-a="bijweg" data-v="${esc(x.id)}" aria-label="Verwijderen">${afwStap==='bij:'+x.id?'?':'×'}</button>`:''}</div></div>`}
  return h+'</div>';
}

function openBijbak(){
  bewerk={soort:'bijbak',keuze:{}};keuzeZoek='';
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Bijbakken</b><button data-a="bijopslaan" style="font-weight:700">In de oven</button></div>
   <div class="pinhoud" id="bijInhoud"><p class="hulp">${esc(datumTekst(datum))}. Tik alles aan wat je wilt bijbakken en pas per soort de platen en stuks per plaat aan.</p>${volgKnop()}<div id="bijLijst"></div></div>
   <div class="bijvoet" id="bijVoet"></div>`);
  renderBijSheet();
}
function renderBijSheet(){
  const k0=bewerk.keuze,lijst=volg(S.soorten.filter(s=>s.type==='afbakken'&&s.naam.trim()&&(zoekPast(s)||k0[s.id]))),k=bewerk.keuze;
  document.getElementById('bijLijst').innerHTML=`<div class="sectie" style="margin:8px 0 0">${lijst.map(s=>{const c=k[s.id];
    return`<div class="rij"><button class="regel ${c?'gekozen':''}" data-a="bijkies" data-v="${s.id}">${sFoto(s.id)?`<img class="duim klein" src="${sFoto(s.id)}" alt="">`:''}<div class="groei"><div class="naam">${esc(s.naam)}</div><div class="sub">${[s.programma?'prog. '+esc(s.programma):'',s.temp?s.temp+'°C':'',s.baktijd?s.baktijd+' min':'',`max. ${s.max} per plaat`].filter(Boolean).join(' · ')}</div></div><div class="kiesvak">${c?'✓':''}</div></button>
    ${c?`<div class="bijregel"><div><span>Platen</span><div class="stepper"><button data-a="bijstap" data-v="${s.id}" data-f="platen" data-n="-1">−</button><input readonly value="${c.platen}"><button data-a="bijstap" data-v="${s.id}" data-f="platen" data-n="1">+</button></div></div>
      <div><span>Per plaat</span><div class="stepper"><button data-a="bijstap" data-v="${s.id}" data-f="perPlaat" data-n="-1">−</button><input readonly value="${c.perPlaat}"><button data-a="bijstap" data-v="${s.id}" data-f="perPlaat" data-n="1">+</button></div></div>
      <b class="bijtot">= ${c.platen*c.perPlaat} stuks</b></div>`:''}</div>`}).join('')}</div>`;
  const ids=Object.keys(k),pl=ids.reduce((a,id)=>a+k[id].platen,0),gek=ids.map(id=>S.soorten.find(s=>s.id===id)).filter(Boolean);
  const progs=[...new Set(gek.map(s=>(s.programma||'').trim()).filter(Boolean))],temps=[...new Set(gek.map(s=>s.temp).filter(x=>x>0))],w=[];
  if(pl>S.ovenMax)w.push(`maximaal ${S.ovenMax} platen`);if(progs.length>1)w.push("verschillende programma's");else if(temps.length>1)w.push('verschillende temperaturen');
  document.getElementById('bijVoet').innerHTML=ids.length?`<b>${ids.length} ${ids.length===1?'soort':'soorten'}, ${pl} van max. ${S.ovenMax} platen</b>${w.length?`<div class="let">Let op: ${w.join(', ')}!</div>`:''}<div class="fout" id="fout"></div>`:'<span class="sub">Nog niets aangetikt.</span><div class="fout" id="fout"></div>';
}
