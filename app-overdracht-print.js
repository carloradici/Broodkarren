function openVraag(){const t=chatPrive(ik()?.id,true);if(t)openChat(t.id)}
chatCssLaad();
function berichtenOudHtml(){
  const l=Object.values(S.berichten).sort((a,b)=>b.t-a.t);
  return`<div class="kop"><div class="koprij"><h1>Chat</h1>${info('berichten')}</div><p>Vragen en meldingen van medewerkers.</p></div>
   ${l.length?`<div class="sectie">${l.map(b=>`<div class="rij inv" style="flex-wrap:wrap"><div class="groei"><div class="naam" style="${b.gelezen?'font-weight:500;color:var(--grijs)':''}">${b.gelezen?'':'<span class="bolletje"></span>'}${esc(b.tekst)}</div><div class="sub">${esc(b.van)} · ${esc(datumTekst(iso(new Date(b.t))))} ${tijdTekst(b.t)}</div></div>
     ${b.gelezen?'':`<button class="knop rand klein" data-a="berichtgelezen" data-v="${esc(b.id)}">Gelezen</button>`}<button class="knop rand klein rood" data-a="berichtweg" data-v="${esc(b.id)}">${afwStap==='br:'+b.id?'Zeker?':'×'}</button></div>`).join('')}</div>`:'<p class="leeg">Geen berichten.</p>'}`;
}

/* ---------- overdracht bij inloggen ---------- */
function overdrachtRegels(){
  const d=iso(),r=[],uit=[];
  for(const mo of S.momenten){const alle=[...maakLijst(d,mo.id).flatMap(x=>x.regels),...versRegels(d,mo.id)],v=S.vinkjes[d]?.[mo.id]||{},open=alle.filter(x=>!v[x.s.id]).length;
    if(open&&alle.length>open)uit.push(`Nog ${open} ${open===1?'soort':'soorten'} niet klaargezet${S.momenten.length>1?` (${mo.naam.toLowerCase()})`:''}`)}
  const ovenOpen=bijbakLijst(d).filter(x=>!x.klaar).length;if(ovenOpen)uit.push(`${ovenOpen} bijbak-${ovenOpen===1?'lading':'ladingen'} nog in de oven`);
  const mij=ik()?.naam,notes=Object.values(S.notities[d]||{}).filter(n=>n.wie!==mij);if(notes.length)uit.push(`${notes.length} ${notes.length===1?'notitie':'notities'} van vandaag: ${notes.map(n=>`"${n.tekst}" (${n.wie})`).join(', ')}`);
  const od=ontdooiLijst(plusDagen(d,1)).filter(x=>!x.klaar).length;if(od&&new Date().getHours()>=12)uit.push(`${od} ${od===1?'item':'items'} Ontdooien zoet voor morgen nog niet gedaan`);
  if(isAdmin()){const o=ongelezen();if(o)uit.push(`${o} ongelezen ${o===1?'bericht':'berichten'} van medewerkers`)}else{const o=ongelezenM();if(o)uit.push(`💬 ${o} ${o===1?'nieuw antwoord':'nieuwe antwoorden'} van de beheerder (Meer → Chat)`)}
  return uit;
}
function toonOverdracht(){const ov=chatOverdrachtRegels(),l=[...overdrachtRegels(),...ov];if(ov.length){L.ovGezien=Date.now();bewaarL()}if(!l.length)return;
  toonSheet(`<div class="pkop"><span style="width:70px"></span><b>Overdracht</b><button data-a="sluit" style="font-weight:700">Begrepen</button></div><div class="pinhoud">
   <p class="hulp">Dit staat er nog open:</p><div class="sectie" style="margin:0">${l.map(t=>`<div class="rij inv"><div class="groei"><div class="naam" style="font-size:16px;font-weight:500">${esc(t)}</div></div></div>`).join('')}</div>${ov.length?`<div class="knoppen"><button class="knop rand" data-c="ovreageer">💬 Reageren in de teamchat</button></div>`:''}</div>`)}

/* ---------- rondleiding ---------- */
const TOUR_PLAATJE={
 klaar:`<svg viewBox="0 0 280 120" class="tourplaatje" aria-hidden="true"><rect x="0" y="0" width="280" height="120" rx="12" fill="#fff"/><rect x="0" y="0" width="280" height="26" rx="12" fill="#f17d04"/><rect x="0" y="14" width="280" height="12" fill="#f17d04"/><text x="12" y="18" font-size="12" font-weight="800" fill="#fff">KAR 1 – DEEG</text>
  <rect x="12" y="38" width="34" height="30" rx="6" fill="none" stroke="#f17d04" stroke-width="2"/><text x="29" y="58" font-size="13" font-weight="800" fill="#f17d04" text-anchor="middle">1–2</text><text x="56" y="52" font-size="13" font-weight="700" fill="#222">Croissant</text><text x="56" y="65" font-size="10" fill="#888">24 stuks</text><circle cx="250" cy="53" r="12" fill="#f17d04"/><text x="250" y="58" font-size="14" font-weight="800" fill="#fff" text-anchor="middle">✓</text>
  <rect x="12" y="78" width="34" height="30" rx="6" fill="none" stroke="#f17d04" stroke-width="2"/><text x="29" y="98" font-size="13" font-weight="800" fill="#f17d04" text-anchor="middle">3</text><text x="56" y="92" font-size="13" font-weight="700" fill="#222">Kaasstengels</text><text x="56" y="105" font-size="10" fill="#888">12 stuks</text><circle cx="250" cy="93" r="12" fill="none" stroke="#ccc" stroke-width="2"/><path d="M215 40 l14 10 -6 2 4 8 -4 2 -4 -8 -5 4z" fill="#222"/></svg>`,
 pot:`<svg viewBox="0 0 280 120" class="tourplaatje" aria-hidden="true"><rect width="280" height="120" rx="12" fill="#fff"/><text x="14" y="34" font-size="13" font-weight="700" fill="#222">Witte pistolet</text><text x="14" y="50" font-size="10" fill="#888">16 stuks</text><rect x="232" y="18" width="36" height="36" rx="8" fill="#fff1e2"/><text x="250" y="42" font-size="16" fill="#f17d04" text-anchor="middle">⋯</text>
  <rect x="14" y="74" width="252" height="34" rx="10" fill="none" stroke="#f17d04" stroke-width="2"/><text x="140" y="96" font-size="13" font-weight="800" fill="#f17d04" text-anchor="middle">+ Extra klaarzetten</text></svg>`,
 oven:`<svg viewBox="0 0 280 120" class="tourplaatje" aria-hidden="true"><rect width="280" height="120" rx="12" fill="#fff"/><rect x="14" y="16" width="120" height="36" rx="10" fill="#f17d04"/><text x="74" y="39" font-size="13" font-weight="800" fill="#fff" text-anchor="middle">Oven vullen</text><rect x="146" y="16" width="120" height="36" rx="10" fill="none" stroke="#f17d04" stroke-width="2"/><text x="206" y="39" font-size="13" font-weight="800" fill="#f17d04" text-anchor="middle">Bijbakken</text>
  <rect x="14" y="66" width="252" height="40" rx="10" fill="#fff1e2"/><text x="26" y="91" font-size="12" fill="#222">3 platen in de oven</text><rect x="180" y="72" width="78" height="28" rx="8" fill="#f17d04"/><text x="219" y="91" font-size="11" font-weight="800" fill="#fff" text-anchor="middle">Afgebakken</text></svg>`,
 derving:`<svg viewBox="0 0 280 120" class="tourplaatje" aria-hidden="true"><rect width="280" height="120" rx="12" fill="#fff"/><text x="14" y="32" font-size="13" font-weight="700" fill="#222">Croissant kaas</text><text x="14" y="48" font-size="10" fill="#888">24 opgezet</text><circle cx="186" cy="36" r="14" fill="none" stroke="#f17d04" stroke-width="2"/><text x="186" y="41" font-size="16" fill="#f17d04" text-anchor="middle">−</text><text x="216" y="41" font-size="15" font-weight="800" fill="#222" text-anchor="middle">3</text><circle cx="246" cy="36" r="14" fill="none" stroke="#f17d04" stroke-width="2"/><text x="246" y="41" font-size="16" fill="#f17d04" text-anchor="middle">+</text>
  <rect x="14" y="70" width="252" height="38" rx="10" fill="#f17d04"/><text x="140" y="94" font-size="13" font-weight="800" fill="#fff" text-anchor="middle">Lijst opslaan</text></svg>`,
 meer:`<svg viewBox="0 0 280 120" class="tourplaatje" aria-hidden="true"><rect width="280" height="120" rx="12" fill="#fff"/>${['Notities','PLU-lijst','App-instellingen','Uitleg'].map((t,i)=>`<text x="16" y="${26+i*26}" font-size="13" font-weight="700" fill="#222">${t}</text><text x="262" y="${26+i*26}" font-size="14" fill="#bbb" text-anchor="end">›</text>`).join('')}</svg>`};
const TOUR_ALLE=[
 ['Klaarzetten','Hier zie je per kar wat er klaargezet moet worden, met het plaatnummer links. Tik op een regel om hem af te vinken. Een verkeerde tik? Onderaan verschijnt "Ongedaan".','klaar',null],
 ['⋯ en extra','Met ⋯ rechts bij een regel pas je het aantal voor vandaag aan of zie je foto, werkinstructie en allergenen. Met "+ Extra klaarzetten" zet je iets bij dat niet gepland stond.','pot','vinken'],
 ['Oven en bijbakken','Tik bovenin op ⋯ en dan "Oven vullen", kies wat de oven in gaat en tik op "Afgebakken" als het klaar is. Is iets op tijdens de dag? Gebruik "Bijbakken".','oven','vinken'],
 ['Derving','Vul bij Derving in wat er weg moet en tik op "Lijst opslaan". De lijst neem je over in de kassa.','derving','derving'],
 ['Meer','Onder Meer vind je de PLU-lijst, notities, je eigen instellingen (zoals je pincode wijzigen) en de uitleg van alles. Wil je oefenen? Ga naar Uitleg → Oefenen.','meer',null]];
const tourLijst=()=>TOUR_ALLE.filter(x=>!x[3]||mag(x[3]));
let tourStap=0;
function toonTour(){const T=tourLijst(),el=document.getElementById('tour'),[t,x,pl]=T[Math.min(tourStap,T.length-1)];
  el.innerHTML=`<div class="tourkaart"><div class="toursub">${tourStap+1} van ${T.length}</div><div class="tourtitel">${t}</div>${TOUR_PLAATJE[pl]||''}<p>${esc(x)}</p>
   <div class="tourpunten">${T.map((_,i)=>`<i class="${i===tourStap?'aan':''}"></i>`).join('')}</div>
   <div class="tourknoppen"><button class="merklink" data-a="tourklaar">Overslaan</button><button class="merkknop" data-a="tourvolgende">${tourStap<T.length-1?'Volgende':'Aan de slag'}</button></div></div>`;el.classList.add('open')}

/* ---------- vandaag gedaan ---------- */
let gedaanDatum=iso();
function gedaanHtml(){
  const d=gedaanDatum,l=Object.values(S.log).filter(x=>iso(new Date(x.t))===d).sort((a,b)=>a.t-b.t),per={};
  for(const x of l)(per[x.wie]=per[x.wie]||[]).push(x);
  const soort=t=>/^Afgevinkt|^Werkmodus/.test(t)?'afgevinkt':/^Afgebakken|^Bijbakken/.test(t)?'oven':/^Derving/.test(t)?'derving':'overig';
  return`<div class="kop"><div class="koprij"><h1>Vandaag gedaan</h1>${info('gedaan')}</div><p>Wie deed wat, per persoon.</p></div>
   <div class="datumnav"><button class="pijlk" data-a="gedaandag" data-v="-1">‹</button><button class="dlabel" data-a="gedaandag" data-v="0">${d===iso()?'Vandaag':esc(datumTekst(d))}<small>${d===iso()?esc(datumTekst(d)):'tik voor vandaag'}</small></button><button class="pijlk" data-a="gedaandag" data-v="1">›</button></div>
   ${Object.keys(per).length?Object.entries(per).map(([wie,xs])=>{const c={afgevinkt:0,oven:0,derving:0,overig:0};xs.forEach(x=>c[soort(x.tekst)]++);
     return`<div class="sectie"><div class="karkop"><b>${esc(wie)}</b><span>${tijdTekst(xs[0].t)} – ${tijdTekst(xs[xs.length-1].t)}</span></div>
      <div class="gedaanteller"><span><b>${c.afgevinkt}</b> afgevinkt</span><span><b>${c.oven}</b> oven</span><span><b>${c.derving}</b> derving</span><span><b>${c.overig}</b> overig</span></div>
      ${xs.slice().reverse().slice(0,40).map(x=>`<div class="logregel">${esc(x.tekst)}<div class="wie">${tijdTekst(x.t)}</div></div>`).join('')}</div>`}).join(''):'<p class="leeg">Nog niets gedaan op deze dag.</p>'}`;
}

/* ---------- dag afsluiten ---------- */
function afsluitHtml(){
  const d=iso(),a=S.afsluit[d],gezet=S.soorten.filter(s=>opgezetTotaal(d,s)>0),geteld=gezet.filter(s=>S.derving[d]?.[s.id]!=null).length;
  const morgen=plusDagen(d,1),od=ontdooiLijst(morgen),odOpen=od.filter(x=>!x.klaar).length;
  const alle=S.momenten.flatMap(mo=>{const v=S.vinkjes[d]?.[mo.id]||{};return[...maakLijst(d,mo.id).flatMap(x=>x.regels),...versRegels(d,mo.id)].map(r=>!!v[r.s.id])}),open=alle.filter(x=>!x).length;
  const stap=(ok,t,sub,knop)=>`<div class="rij inv"><div class="stapbol ${ok?'ok':''}">${ok?'✓':''}</div><div class="groei"><div class="naam">${t}</div><div class="sub">${sub}</div></div>${knop||''}</div>`;
  return`<div class="kop"><div class="koprij"><h1>Dag afsluiten</h1>${info('afsluiten')}</div><p>${esc(datumTekst(d))}</p></div>
   ${a?`<div class="kaartje"><h3>✓ Afgesloten</h3><div class="sub">Door ${esc(a.wie)} om ${tijdTekst(a.t)}.</div></div>`:''}
   <div class="sectie">
    ${stap(!open,'Klaarzetten',open?`${open} ${open===1?'soort':'soorten'} niet afgevinkt`:'Alles afgevinkt')}
    ${stap(gezet.length&&geteld===gezet.length,'Derving ingevuld',`${geteld} van ${gezet.length} soorten geteld`,geteld<gezet.length&&mag('derving')?`<button class="knop rand klein" data-a="naarderving">Invullen</button>`:'')}
    ${stap(!odOpen,'Ontdooien zoet voor morgen',od.length?`${od.length-odOpen} van ${od.length} gedaan`:'Niets op de lijst',mag('vinken')?`<button class="knop rand klein" data-a="sub" data-v="ontdooi">Bekijken</button>`:'')}
   </div>
   <div class="kaartje"><h3>Notitie voor morgen (optioneel)</h3><textarea class="veld" id="afsluitNotitie" rows="3" maxlength="200" placeholder="Bijv. croissants bijna op, extra bestellen"></textarea></div>
   <div class="knoppen"><button class="knop" data-a="dagafsluiten">${a?'Opnieuw afsluiten':'Dag afsluiten'}</button></div>
   ${geteld<gezet.length?'<p class="hulp" style="margin:10px 20px;text-align:center">Je kunt ook afsluiten als nog niet alles is geteld.</p>':''}`;
}

/* ---------- printen ---------- */
function laadPdf(){if(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API.autoTable)return Promise.resolve();
  const laad=src=>new Promise((ok,nee)=>{const x=document.createElement('script');x.src=src;x.onload=ok;x.onerror=nee;document.head.appendChild(x)});
  return laad('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js').then(()=>laad('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'))}
/* 10.13 kiezen welke karren op de PDF komen (per persoon onthouden) */
function printKeuze(){const p=prof().printKeuze;return{uit:Array.isArray(p?.uit)?p.uit.map(Number):[],vers:!!p?.vers}}
function printKarren(d){const m=new Map();let vers=false;for(const mo of S.momenten){for(const s of maakLijst(d,mo.id))if(!m.has(s.nr))m.set(s.nr,s.naam);if(versRegels(d,mo.id).length)vers=true}return{karren:[...m].map(([nr,naam])=>({nr,naam})).sort((a,b)=>a.nr-b.nr),vers}}
function printSelectieTekst(d){const k=printKeuze(),a=printKarren(d),l=a.karren.filter(x=>!k.uit.includes(x.nr)).map(x=>x.naam);if(a.vers&&k.vers)l.push('Vers brood');
  return l.length===a.karren.length+(a.vers?1:0)?'':l.length?'Op deze lijst: '+l.join(', '):'Niets gekozen'}
function printKeuzeHtml(){const k=printKeuze(),a=printKarren(datum);if(!a.karren.length&&!a.vers)return'';
  return`<div class="kaartje" style="margin:0 0 12px"><b>Wat moet erop?</b><div class="printkeuze">${a.karren.map(x=>`<label><input type="checkbox" data-printkar="${x.nr}" ${k.uit.includes(x.nr)?'':'checked'}> ${esc(x.naam)}</label>`).join('')}${a.vers?`<label><input type="checkbox" data-printkar="vers" ${k.vers?'checked':''}> Vers brood</label>`:''}</div><div class="sub">Je keuze wordt onthouden.</div></div>`}
document.addEventListener('change',e=>{const v=e.target.dataset?.printkar;if(v==null)return;const k=printKeuze();
  if(v==='vers')k.vers=e.target.checked;else{const nr=+v;k.uit=k.uit.filter(x=>x!==nr);if(!e.target.checked)k.uit.push(nr)}
  const id=L.sessie;if(!id)return;S.profielen[id]={...(S.profielen[id]||{}),printKeuze:k};bewaar();printDag()});
(function(){const st=document.createElement('style');st.textContent='.printkeuze{display:flex;flex-wrap:wrap;gap:8px 16px;margin:8px 0 4px}.printkeuze label{display:flex;align-items:center;gap:6px;font-size:16px;color:var(--tekst)}.printkeuze input{width:22px;height:22px;accent-color:var(--oranje)}';document.head.appendChild(st)})();
function printGegevens(){
  const d=datum,delen=[],pk=printKeuze();
  for(const mo of S.momenten){const sec=maakLijst(d,mo.id).filter(x=>!pk.uit.includes(x.nr)),vers=pk.vers?versRegels(d,mo.id):[];if(!sec.length&&!vers.length)continue;const blokken=[];
    for(const s of sec){const k=karTaak(d,s.nr),nm=k?S.gebruikers.find(g=>g.id===k)?.naam:'';blokken.push({titel:s.naam+(nm?' – '+nm:''),rijen:s.regels.map(r=>[r.ontdooi?'–':r.plaat,r.s.naam,r.s.plu||'',`${r.n}${!r.ontdooi&&r.v.platen>1?` (${r.v.delen.join('+')})`:''}`,''])})}
    if(vers.length)blokken.push({titel:'Vers brood',rijen:vers.map(r=>['–',r.s.naam,r.s.plu||'',String(r.n),''])});
    delen.push({moment:mo.naam,blokken})}
  return{titel:'Brood Opzet – '+winkelNaam(),selectie:printSelectieTekst(d),datum:`${datumTekst(d)} ${vanIso(d).getFullYear()}${S.afwijkend[d]?' – '+S.afwijkend[d].naam:''}`,delen};
}
function maakPdf(){
  const g=printGegevens(),doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'}),O=[241,125,4];let y=16;
  doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(g.titel,14,y);doc.setFont('helvetica','normal');doc.setFontSize(11);doc.text(g.datum,196,y,{align:'right'});
  doc.setDrawColor(...O);doc.setLineWidth(1);doc.line(14,y+3,196,y+3);y+=10;
  if(g.selectie){doc.setFontSize(10);doc.setTextColor(90);doc.text(g.selectie,14,y-2);doc.setTextColor(0);doc.setFontSize(11);y+=5}
  if(!g.delen.length){doc.text('Niets gepland.',14,y)}
  for(const deel of g.delen){if(g.delen.length>1){doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text(deel.moment,14,y);y+=4}
    for(const bl of deel.blokken){
      doc.autoTable({startY:y,head:[[{content:bl.titel,colSpan:5,styles:{fillColor:O,textColor:255,fontStyle:'bold',fontSize:11}}],['Plaat','Product','PLU','Aantal','OK']],body:bl.rijen,theme:'grid',
        styles:{fontSize:10,cellPadding:2,lineColor:[150,150,150],lineWidth:.2,textColor:20},headStyles:{fillColor:[240,240,240],textColor:20},
        columnStyles:{0:{cellWidth:18},2:{cellWidth:22},3:{cellWidth:32},4:{cellWidth:12}},margin:{left:14,right:14},rowPageBreak:'avoid'});
      y=doc.lastAutoTable.finalY+6}}
  return new File([doc.output('blob')],`brood-opzet-${datum}.pdf`,{type:'application/pdf'});
}
async function printDeel(){
  if(!(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API.autoTable)){toast('Even geduld, de PDF wordt voorbereid…');try{await laadPdf()}catch(e){toast('PDF maken lukt niet zonder internet');return}}
  let f;try{f=maakPdf()}catch(e){toast('PDF maken mislukt');return}
  try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:'Klaarzetlijst '+datumTekst(datum)});log('Klaarzetlijst als PDF gedeeld');return}}catch(e){if(e&&e.name==='AbortError')return;if(e&&e.name==='NotAllowedError'){toast('Tik nog een keer op de knop');return}}
  const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;document.body.appendChild(a);a.click();a.remove();
}
function printDag(){
  const d=datum,pk=printKeuze(),delen=S.momenten.map(mo=>{const sec=maakLijst(d,mo.id).filter(x=>!pk.uit.includes(x.nr)),vers=pk.vers?versRegels(d,mo.id):[];if(!sec.length&&!vers.length)return'';
    const tab=(titel,rows)=>`<h2>${esc(titel)}</h2><table><tr><th>Plaat</th><th>Product</th><th>PLU</th><th>Aantal</th><th>✓</th></tr>${rows}</table>`;
    return`<h1>${esc(mo.naam)}${S.momenten.length>1?'':''}</h1>`+sec.map(s=>{const k=karTaak(d,s.nr),naam=k?S.gebruikers.find(g=>g.id===k)?.naam:'';
      return tab(s.naam+(naam?` – ${naam}`:''),s.regels.map(r=>`<tr><td>${r.ontdooi?'–':r.plaat}</td><td>${esc(r.s.naam)}</td><td>${esc(r.s.plu||'')}</td><td>${r.n}${!r.ontdooi&&r.v.platen>1?` (${r.v.delen.join('+')})`:''}</td><td class="vak"></td></tr>`).join(''))}).join('')
      +(vers.length?tab('Vers brood',vers.map(r=>`<tr><td>–</td><td>${esc(r.s.naam)}</td><td>${esc(r.s.plu||'')}</td><td>${r.n}</td><td class="vak"></td></tr>`).join('')):'')}).join('');
  const el=document.getElementById('printvak');
  el.innerHTML=`<div class="printkop"><b>Brood Opzet – ${esc(winkelNaam())}</b><span>${esc(datumTekst(d))} ${vanIso(d).getFullYear()}${S.afwijkend[d]?' – '+esc(S.afwijkend[d].naam):''}</span></div>${printSelectieTekst(d)?`<p class="printsel">${esc(printSelectieTekst(d))}</p>`:''}${delen||'<p>Niets gepland.</p>'}`;
  toonSheet(`<div class="pkop"><button data-a="sluit">Sluiten</button><b>Afdrukvoorbeeld</b><span style="width:60px"></span></div>
   <div class="pinhoud">${printKeuzeHtml()}<div class="knoppen" style="margin:12px 0"><button class="knop" data-a="printdeel">Printen of delen (PDF)</button></div><p class="hulp" style="text-align:center;margin:-4px 0 10px">Kies in het deelmenu <b>Afdrukken</b>, of bewaar of verstuur de PDF.</p>
   <div class="printvoorbeeld">${el.innerHTML}</div></div>`);
  laadPdf().catch(()=>{});
}


/* ---------- feestdagen ---------- */
function pasen(j){const a=j%19,b=Math.floor(j/100),c=j%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),n=h+l-7*m+114;return iso(new Date(j,Math.floor(n/31)-1,n%31+1))}
function feestdagen(j){const p=pasen(j),kd=new Date(j,3,27).getDay()===0?`${j}-04-26`:`${j}-04-27`;
  return[[`${j}-01-01`,'Nieuwjaarsdag'],[plusDagen(p,-2),'Goede Vrijdag'],[p,'1e Paasdag'],[plusDagen(p,1),'2e Paasdag'],[kd,'Koningsdag'],[`${j}-05-05`,'Bevrijdingsdag'],[plusDagen(p,39),'Hemelvaartsdag'],[plusDagen(p,49),'1e Pinksterdag'],[plusDagen(p,50),'2e Pinksterdag'],[`${j}-12-24`,'Kerstavond'],[`${j}-12-25`,'1e Kerstdag'],[`${j}-12-26`,'2e Kerstdag'],[`${j}-12-31`,'Oudejaarsdag']]}
function volgendeFeest(){const t=iso(),j=vanIso(t).getFullYear(),grens=plusDagen(t,21);
  return[...feestdagen(j),...feestdagen(j+1)].find(([d])=>d>t&&d<=grens&&!S.afwijkend[d]&&!S.feestNee[d])||null}

/* ---------- weer ---------- */
const WEER_CODE=c=>c===0?'☀️':c<=2?'🌤️':c===3?'☁️':c<=48?'🌫️':c<=57?'🌦️':c<=67?'🌧️':c<=77?'🌨️':c<=82?'🌧️':c<=86?'🌨️':'⛈️';
function weerLaden(){
  const p=S.locatie||{lat:52.32,lon:4.58},pk=p.lat+','+p.lon;
  if(L.weer&&L.weer.p===pk&&Date.now()-L.weer.t<3*3600e3)return;
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&daily=weather_code,temperature_2m_max,precipitation_probability_max&timezone=Europe%2FAmsterdam&forecast_days=10`)
   .then(r=>r.json()).then(j=>{const d=j.daily;if(!d)return;const per={};d.time.forEach((t,i)=>per[t]={c:d.weather_code[i],max:Math.round(d.temperature_2m_max[i]),regen:d.precipitation_probability_max[i]??0});L.weer={t:Date.now(),p:pk,per};bewaarL();renderZacht()}).catch(()=>{})}
function weerVan(d){return L.weer?.per?.[d]||null}
function weerHint(w){if(!w)return'';if(w.max>=22&&w.regen<30)return`Mooi weer (${w.max}°C): vaak meer stokbrood en snacks`;if(w.regen>=70)return`Veel kans op regen (${w.regen}%): vaak rustiger in de winkel`;if(w.max<=3)return`Koud (${w.max}°C): vaak meer warme snacks`;return''}
function weerRegel(d){const w=weerVan(d);if(!w)return'';const h=weerHint(w);
  return`<div class="weer">${WEER_CODE(w.c)} ${w.max}° · ${w.regen}% regen${h?`<div class="weerhint">${esc(h)}</div>`:''}</div>`}

/* ---------- nieuwe producten ---------- */
function nieuwHtml(){
  const l=S.soorten.filter(s=>s.nieuwSinds).sort((a,b)=>b.nieuwSinds.localeCompare(a.nieuwSinds));
  return`<div class="kop"><div class="koprij"><h1>Nieuwe producten</h1>${info('nieuw')}</div><p>Verkoop per week sinds de start.</p></div>
   ${l.length?l.map(s=>{const weken=[];let st=maandag(s.nieuwSinds);while(st<=iso()&&weken.length<8){const dagen=[...Array(7)].map((_,i)=>plusDagen(st,i)).filter(d=>d>=s.nieuwSinds&&d<=iso());
     let g=0,o=0,tel=0;for(const d of dagen){const x=S.historie[d]?.gezet?.[s.id]||0;g+=x;const w=S.derving[d]?.[s.id];if(w!=null){o+=w;tel++}}weken.push({st,g,o,tel});st=plusDagen(st,7)}
     return`<div class="sectie"><div class="karkop"><b>${esc(s.naam)}</b><span>sinds ${esc(datumTekst(s.nieuwSinds))}</span></div><div class="tabelwrap"><table class="tabel"><tr><th>Week</th><th>Opgezet</th><th>Over</th><th>Verkocht</th><th>%</th></tr>
      ${weken.map((w,i)=>`<tr><td>${i+1} (wk ${weeknr(w.st)})</td><td>${fmt(w.g)}</td><td>${w.tel?fmt(w.o):'–'}</td><td>${w.tel?fmt(Math.max(0,w.g-w.o)):'–'}</td><td>${w.tel&&w.g?Math.round(Math.max(0,w.g-w.o)/w.g*100)+'%':'–'}</td></tr>`).join('')}</table></div>
      <div class="knoppen" style="margin:10px 0 12px">${mag('soorten')?`<button class="knop rand klein" data-a="nieuwstop" data-v="${s.id}">Niet meer als nieuw volgen</button>`:''}</div></div>`}).join(''):'<p class="leeg">Geen nieuwe producten. Zet bij een broodsoort het vinkje "Nieuw product" aan.</p>'}`;
}

/* ---------- exporteren naar Excel ---------- */
let exportPeriode='week',exportSoort='derving';
function exportHtml(){laadXlsx().catch(()=>{});const v=window._export;
  return`<div class="kop"><div class="koprij"><h1>Exporteren</h1>${info('export')}</div><p>Als Excel-bestand, via het deelmenu.</p></div>
   <div class="kaartje"><h3>Wat</h3><div class="segment" style="margin:8px 0 0">${[['derving','Derving'],['rapport','Weekrapport'],['planning','Planning']].map(([k,l])=>`<button data-a="expsoort" data-v="${k}" class="${exportSoort===k?'aan':''}">${l}</button>`).join('')}</div>
   ${exportSoort==='planning'?'':`<h3 style="margin-top:14px">Periode</h3><div class="segment" style="margin:8px 0 0">${[['week','Deze week'],['vorige','Vorige week'],['4w','4 weken'],['maand','Deze maand']].map(([k,l])=>`<button data-a="expper" data-v="${k}" class="${exportPeriode===k?'aan':''}">${l}</button>`).join('')}</div>`}</div>
   <div class="knoppen"><button class="knop ${v?'rand':''}" data-a="exportvoorbeeld">Voorbeeld maken</button>${v?`<button class="knop" data-a="exportdeel">Openen of delen</button>`:''}</div>
   <p class="hulp" style="margin:10px 20px;text-align:center" id="expStatus"></p>
   ${v?`<div class="kaartje"><h3>${esc(v.bestand)}</h3><div class="sub">${v.rij.length-1} ${v.rij.length-1===1?'regel':'regels'}${v.rij.length>21?', hieronder de eerste 20':''}</div>
     <div class="tabelwrap" style="margin-top:8px"><table class="tabel exptabel">${v.rij.slice(0,21).map((r,i)=>`<tr>${r.map(c=>i?`<td>${esc(c)}</td>`:`<th>${esc(c)}</th>`).join('')}</tr>`).join('')}</table></div>
     <p class="hulp">Tik op <b>Openen of delen</b> en kies <b>Excel</b>. Staat Excel er niet tussen, veeg de rij met apps naar links en tik op <b>Meer</b>, of kies <b>Bewaar in Bestanden</b> en open het daar.</p></div>`:''}`;
}

function periodeDagen(){const t=iso();let van,tot=t;
  if(exportPeriode==='week')van=maandag(t);else if(exportPeriode==='vorige'){van=plusDagen(maandag(t),-7);tot=plusDagen(van,6)}else if(exportPeriode==='4w')van=plusDagen(t,-27);else van=t.slice(0,8)+'01';
  const r=[];for(let d=van;d<=tot;d=plusDagen(d,1))r.push(d);return r}
function laadXlsx(){return window.XLSX?Promise.resolve():new Promise((ok,nee)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=ok;s.onerror=nee;document.head.appendChild(s)})}
function maakExport(){
  const dagen=periodeDagen();let rij,naam,blad;
  if(exportSoort==='planning'){rij=[['Soort','Kar',...DAGEN.map(d=>d[2])]];for(const s of S.soorten)rij.push([s.naam,karNaam(effKar(s)),...DAGEN.map(([k])=>dagTotaal(k,s))]);naam='planning';blad='Planning'}
  else if(exportSoort==='derving'){rij=[['Datum','Dag','Soort','PLU','Opgezet','Over','Weggegooid','Voedselbank','Too Good To Go','Verkocht','Derving %']];
    for(const d of dagen)for(const s of S.soorten){const g=S.historie[d]?.gezet?.[s.id]||0,x=dervDetail(d,s.id);if(!g&&!x)continue;const o=x?x.weg+x.vb+x.tg:null;
      rij.push([d,dagNaam(dagKey(d)),s.naam,s.plu||'',g,o??'',x?.weg??'',x?.vb??'',x?.tg??'',o==null?'':Math.max(0,g-o),o==null||!g?'':Math.round(o/g*1000)/10])}
    naam='derving';blad='Derving'}
  else{rij=[['Soort','PLU','Opgezet','Bijgebakken','Over (geteld)','Derving %','Dagen geteld']];
    for(const s of S.soorten){let g=0,gg=0,o=0,tel=0,bij=0;for(const d of dagen){const x=S.historie[d]?.gezet?.[s.id]||0;g+=x;bij+=bijbakStuks(d,s.id);const w=S.derving[d]?.[s.id];if(w!=null){o+=w;gg+=x;tel++}}
      if(g||o)rij.push([s.naam,s.plu||'',g,bij,tel?o:'',gg?Math.round(o/gg*1000)/10:'',tel])}
    naam='rapport';blad='Weekrapport'}
  const bestand=`brood-opzet-${naam}-${exportSoort==='planning'?iso():dagen[0]+'_tm_'+dagen[dagen.length-1]}.xlsx`;
  return{rij,naam,blad,bestand};
}
async function exporteer(){const st=document.getElementById('expStatus');
  if(!window.XLSX){st.textContent='Excel-onderdeel laden…';try{await laadXlsx()}catch(e){st.textContent='Excel-onderdeel kon niet laden. Controleer je internetverbinding.';return}}
  window._export=maakExport();render();
}
async function exportDeel(){
  const v=window._export,st=document.getElementById('expStatus');if(!v||!window.XLSX)return;
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(v.rij),v.blad);
  const blob=new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),file=new File([blob],v.bestand,{type:blob.type});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:v.bestand});log(`Export ${v.naam} gedeeld`);return}}
  catch(e){if(e&&e.name==='AbortError')return;if(e&&e.name==='NotAllowedError'){st.textContent='Tik nog een keer op Openen of delen.';return}}
  st.textContent='Delen wordt op dit toestel niet ondersteund.';
}


/* ---------- Werkmodus ---------- */
