/* ---------- 10.67 Coop Winkelapp: keuzepagina en delen (Bestellen · Brood · Kantoor) ---------- */
let deel=null,deelVan=null;
const DELEN={bestellen:['🛒','Bestellen'],brood:['🥖','Brood'],kantoor:['🗂','Kantoor']};
const BA_URL='https://carloradici.github.io/Coop-Besteladvies/';
/* alleen in Brood: deze onderdelen horen niet in Meer van Bestellen of Kantoor */
const BROOD_MEER=new Set(['afsluiten','materiaal','dervlijsten','ontdooi','pakbonnen','rapport','bestel','afwijkend','soorten','programmas','plu','nieuw','export']);
function delen(){if(!ik())return[];const d=[];if(isAdmin()||mag('besteladvies'))d.push('bestellen');d.push('brood');if(isAdmin())d.push('kantoor');return d}
function deelKies(){const g=ik();if(!g)return null;if(deelVan!==g.id){deelVan=g.id;deel=null}const d=delen();
  if(deel==='')return null;if(deel&&d.includes(deel))return deel;if(d.length===1)return deel=d[0];
  const o=(L.deel||{})[g.id];return o&&d.includes(o)?deel=o:null}
function deelTabs(){const t={brood:[['home','Home'],['lijst','Klaarzetten'],...(mag('derving')?[['derving','Derving']]:[]),['check','Checklists'],['meer','Meer']],
  bestellen:[['home','Home'],['check','Checklists'],['meer','Meer']],kantoor:[['home','Kantoor'],...(urenMag()?[['uren','Uren']]:[]),['meer','Meer']]};return t[deel]||t.brood}
const isDonker=()=>{const t=prof().thema;return t==='donker'||(t!=='licht'&&matchMedia('(prefers-color-scheme: dark)').matches)};
const donkerRij=()=>`<div class="sectie menu"><div class="rij"><button class="regel" data-a="donker"><div class="groei"><div class="naam">${isDonker()?'☀️ Lichte modus':'🌙 Donkere modus'}</div><div class="sub">Wissel tussen licht en donker</div></div><span class="pijl">›</span></button></div></div>`;
function kiesHtml(){const g=ik(),u=new Date().getHours(),groet=u<12?'Goedemorgen':u<18?'Goedemiddag':'Goedenavond',{n,k}=homeKlaar(),o=betalenMag()?tbOpen().length:0;
  const sub={bestellen:'Besteladvies, karren tellen, retourbonnen en bestelboeken',brood:n?(k===n?'✓ Alles klaargezet':`Nog ${n-k} klaar te zetten`):'Klaarzetten, derving en taken',kantoor:o?`${o} ${o===1?'factuur':'facturen'} te betalen`:'Facturen, uren, rooster en beheer'};
  return`<div class="kop"><div class="koprij"><h1>${groet} ${esc((g.naam||'').split(' ')[0])}</h1>${info('delen')}</div><p>Waar ga je mee aan de slag?</p></div>
  <div class="deeltegels">${delen().map(d=>`<button class="deeltegel deel-${d}" data-a="deel" data-v="${d}"><span class="deelic">${DELEN[d][0]}</span><span class="groei"><b>${DELEN[d][1]}</b><span class="sub">${esc(sub[d])}</span></span><span class="pijl">›</span></button>`).join('')}</div>
  <label class="deelonthoud"><input type="checkbox" id="deelOnthoud" ${(L.deel||{})[g.id]?'checked':''}> Onthoud mijn keuze op dit toestel</label>${donkerRij()}
  <p class="sub" style="text-align:center;margin:12px 20px">Wisselen kan altijd met de knop bovenin.</p>`}
function bestellenHomeHtml(){return`<div class="kop"><div class="koprij"><h1>🛒 Bestellen</h1>${info('bestellen')}</div><p>Bestellen, tellen en acties. De functies van Besteladvies komen hier stap voor stap bij.</p></div>
  <div class="sectie menu"><div class="rij"><a class="regel" href="${BA_URL}" target="_blank" rel="noopener"><div class="groei"><div class="naam">🧮 Besteladvies openen</div><div class="sub">Bestelboeken, advies, tellen, acties en retourbonnen</div></div><span class="pijl">›</span></a></div>
  <div class="rij"><button class="regel" data-a="sub" data-v="dragers"><div class="groei"><div class="naam">🛒 Karren tellen</div><div class="sub">${(()=>{const t=DR().tel[0];return t?`Laatst ${esc(datumTekst(t.d))}: ${t.k} karren · ${t.pl} planken`:'Karren en planken tellen en vergelijken met Van Tol'})()}</div></div><span class="pijl">›</span></button></div>
  ${betalenMag()?`<div class="rij"><button class="regel" data-a="sub" data-v="vtretour"><div class="groei"><div class="naam">🧾 Retourbonnen Van Tol</div><div class="sub">Bonnen en bedragen uit de weekstaten</div></div><span class="pijl">›</span></button></div>`:''}
  ${bbMag()?`<div class="rij"><button class="regel" data-a="sub" data-v="bestelboeken"><div class="groei"><div class="naam">📘 Bestelboeken</div><div class="sub">Eigen bestelboeken samenstellen en printen</div></div><span class="pijl">›</span></button></div>`:''}</div>`}
function kantoorHomeHtml(){const s=sub;sub='kantoor';try{return meerHtml().replace(/^<button class="terug"[^>]*>[^<]*<\/button>/,'')}finally{sub=s}}
function deelActie(a,v){
  if(a==='deel'){const g=ik();if(!g||!delen().includes(v))return true;const cb=document.getElementById('deelOnthoud');L.deel={...(L.deel||{})};if(cb&&cb.checked)L.deel[g.id]=v;else delete L.deel[g.id];bewaarL();deel=v;tab='home';sub=null;render();return true}
  if(a==='deelkies'){deel='';sub=null;tab='home';render();return true}
  if(a==='donker'){zetProf('thema',isDonker()?'licht':'donker');return true}
  return drActie(a,v)}
/* ---------- 10.68 Bestellen: karren en planken tellen (S.dragers, gedeeld) en retourbonnen van Van Tol bekijken (uit de weekstaten, alleen beheerder) ---------- */
const DR=()=>isObj(S.dragers)&&Array.isArray(S.dragers.tel)?S.dragers:(S.dragers={tel:[]});
function vtWeken(){return Object.entries(isObj(S.vaste?.wk)?S.vaste.wk:{}).filter(([,w])=>isObj(w))}
function vtSaldo(){if(!betalenMag())return null;const l=vtWeken().filter(([,w])=>w.gd&&w.gd.d).sort((a,b)=>b[1].gd.d.localeCompare(a[1].gd.d))[0];if(!l)return null;
  const it=Object.entries(l[1].gd.items||{}),z=re=>{const e=it.find(([n])=>re.test(n));return e?+e[1]:null};return{d:l[1].gd.d,ws:l[0],k:z(/CONTAINER|KAR/i),pl:z(/PLANK/i)}}
function drHtml(){const s=vtSaldo(),T=DR().tel,oud=s?Math.round((new Date(iso())-new Date(s.d))/864e5):0;
  const rij=(k,nm,v)=>`<div class="kaartje"><h3 style="margin:0 0 8px">${nm}</h3><div class="drrij"><button class="knop rand" data-a="drmin" data-v="${k}" aria-label="Eén minder">−</button><input class="veld" id="dr-${k}" inputmode="numeric" placeholder="0" aria-label="Aantal ${nm.toLowerCase()}"><button class="knop rand" data-a="drplus" data-v="${k}" aria-label="Eén meer">+</button></div>
    <div class="sub" style="margin-top:6px">${v==null?(betalenMag()?'Saldo Van Tol nog niet bekend':'Het saldo van Van Tol ziet alleen de beheerder'):`Saldo Van Tol: <b>${v}</b>`}</div></div>`;
  return`<div class="kop"><div class="koprij"><h1>🛒 Karren tellen</h1>${info('dragers')}</div><p>Tel de karren en planken van Van Tol en tik Telling opslaan.</p></div>
  ${s?`<p class="sub" style="margin:0 20px 8px">Saldo Van Tol op ${esc(datumTekst(s.d))} (weekstaat ${esc(s.ws)})${oud>7?` · <span class="oranjetekst">${oud} dagen oud: tel het liefst op de dag dat de weekstaat binnenkomt</span>`:''}</p>`:''}
  ${rij('k','Karren',s?.k)}${rij('pl','Planken',s?.pl)}<div class="knoppen"><button class="knop" data-a="drsla">Telling opslaan</button></div>
  ${T.length?`<div class="sectie"><div class="karkop"><b>Eerdere tellingen</b></div>${T.slice(0,12).map(x=>`<div class="rij inv"><div class="groei"><div class="naam" style="font-size:15px">${esc(datumTekst(x.d))}</div><div class="sub">${x.k} karren${x.vk!=null&&betalenMag()?` (Van Tol ${x.vk})`:''} · ${x.pl} planken${x.vp!=null&&betalenMag()?` (Van Tol ${x.vp})`:''} · ${esc(x.wie||'')}</div></div></div>`).join('')}</div>`:''}`}
function vtRetourHtml(){const b=[];for(const[ws,w]of vtWeken())for(const[ref,x]of Object.entries(isObj(w.re)?w.re:{}))if(isObj(x))b.push({ref:ref.replace(/\D/g,''),ws,...x});b.sort((p,q)=>String(q.d||'').localeCompare(String(p.d||'')));
  return`<div class="kop"><div class="koprij"><h1>🧾 Retourbonnen Van Tol</h1>${info('vtretour')}</div><p>${b.length?`${b.length} bonnen uit de weekstaten · ${fEuro(b.reduce((t,x)=>t+(+x.tot||0),0))}`:'Nog geen retourbonnen: lees weekstaten in bij Vaste lasten.'}</p></div>
  <div class="sectie">${b.slice(0,80).map(x=>`<details class="rij inv vtbon"><summary class="groei"><div class="naam" style="font-size:15px">${esc(datumTekst(x.d||''))} · bon ${esc(x.ref)}</div><div class="sub">${fEuro(+x.tot||0)} · ${(x.regels||[]).length} regels · weekstaat ${esc(x.ws)}</div></summary>
    ${(x.regels||[]).map(([art,n,oms,c])=>`<div class="sub">${esc(String(n))} × ${esc(oms||art||'')} · ${fEuro(+c||0)}</div>`).join('')}${L.modus!=='lokaal'?`<button class="knop rand klein" data-a="vtscan" data-v="${esc(x.ref)}" style="margin-top:8px">Scan bekijken</button>`:''}</details>`).join('')}</div>
  <p class="sub" style="margin:10px 20px">Invoeren, nakijken en claimen doe je voorlopig nog in Besteladvies.</p>`}
function drActie(a,v){
  if(a==='drplus'||a==='drmin'){const i=document.getElementById('dr-'+v);if(i)i.value=Math.max(0,(+i.value||0)+(a==='drplus'?1:-1));return true}
  if(a==='drsla'){const n=k=>{const x=document.getElementById('dr-'+k)?.value.replace(/\D/g,'');return x===''||x==null?null:+x},k=n('k'),pl=n('pl');if(k==null&&pl==null){toast('Vul eerst een aantal in');return true}
    const s=vtSaldo(),D=DR();D.tel.unshift({d:iso(),k:k??0,pl:pl??0,vk:s?.k??null,vp:s?.pl??null,wie:ik()?.naam||''});D.tel.splice(60);bewaar();render();
    toast(s&&s.k!=null&&k!=null&&s.k!==k?`Opgeslagen · karren ${Math.abs(s.k-k)} verschil met Van Tol`:'Telling opgeslagen');return true}
  if(a==='vtscan'){if(!db?.retourUrl)return true;toast('Scan ophalen…');db.retourUrl(v+'.jpg').then(async u=>{if(!u)throw 0;const bl=await(await fetch(u)).blob();toonSheet(`<div class="pkop"><button data-a="sluit">Sluiten</button><b>Bon ${esc(v)}</b><span></span></div><div class="pinhoud"><img src="${URL.createObjectURL(bl)}" alt="Scan van bon ${esc(v)}" style="width:100%;border-radius:10px"></div>`)}).catch(()=>toast('Geen scan gevonden'));return true}
  return false}
