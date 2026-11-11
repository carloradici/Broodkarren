/* ================= 9.13: meldingen, euro's, bestel-advies, weekoverzicht, back-up ================= */
async function pushAbonneer(){const p=await Notification.requestPermission();if(p!=='granted'){toast('Meldingen zijn niet toegestaan');render();return null}
  const reg=await navigator.serviceWorker.ready;const b64=VAPID_PUBLIEK.replace(/-/g,'+').replace(/_/g,'/'),raw=atob(b64+'='.repeat((4-b64.length%4)%4)),key=Uint8Array.from(raw,c=>c.charCodeAt(0));
  return(await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key})).toJSON()}
async function pushAanTeam(){if(pushStatus()==='niet'){toast(pushNietTekst());return}
  try{const j=await pushAbonneer();if(!j)return;S.pushTeam.subs=(S.pushTeam.subs||[]).filter(x=>x.endpoint!==j.endpoint);S.pushTeam.subs.push({endpoint:j.endpoint,keys:j.keys,uid:L.sessie,t:Date.now()});
    L.pushTeamAan=j.endpoint;bewaarL();bewaar();render();toast('Meldingen staan aan op dit toestel')}catch(e){toast('Aanzetten lukte niet: '+(e.message||e))}}
function pushTeamUit(){S.pushTeam.subs=(S.pushTeam.subs||[]).filter(x=>x.endpoint!==L.pushTeamAan);L.pushTeamAan=null;bewaarL();bewaar();render();toast('Meldingen staan uit op dit toestel')}
const tijd2=(u,m)=>`${u}:${String(m||0).padStart(2,'0')}`;
function herinneringHtml(){const h=S.herinnering;const opties=[];for(let u=6;u<=15;u++)for(const m of[0,15,30,45])opties.push([u,m]);
  return`<div class="kaartje"><h3>Herinnering levering</h3><div class="sub">Is de levering op een leverdag om deze tijd nog niet ingevuld, dan krijgt iedereen die de levering mag invullen een pushmelding.</div>
   <label class="schakel" style="margin:10px 0 0;color:var(--tekst);font-weight:400">Herinnering aan<input type="checkbox" id="herAan" ${h.aan?'checked':''}></label>
   <div style="display:flex;align-items:center;gap:10px;margin-top:10px">Om <select class="veld" id="herTijd" style="width:110px">${opties.map(([u,m])=>`<option value="${u}:${m}" ${u===h.uur&&m===(h.min||0)?'selected':''}>${tijd2(u,m)}</option>`).join('')}</select></div>
   <div class="hulp" style="margin-top:8px">${(S.pushTeam.subs||[]).length} ${(S.pushTeam.subs||[]).length===1?'toestel':'toestellen'} van medewerkers aangemeld. Medewerkers zetten dit aan via Meer → App-instellingen.</div></div>
   <div class="kaartje"><h3>Weekoverzicht</h3><div class="sub">Elke maandag om 9:00 krijg je een melding dat het weekoverzicht klaarstaat.</div></div>`}
/* ---- euro's ---- */
const prijs=id=>+S.prijzen[id]||0;
const euro2=n=>'€ '+(Math.round(n*100)/100).toFixed(2).replace('.',',');
function dervEuro(van,tot){let t=0;for(const d of Object.keys(S.derving))if(d>=van&&d<=tot)for(const[id,n]of Object.entries(S.derving[d]||{}))t+=(+n||0)*prijs(id);return t}
function prijzenHtml(){const l=S.soorten.filter(s=>s.naam.trim()),m0=iso().slice(0,7)+'-01',vm=(()=>{const x=vanIso(m0);x.setMonth(x.getMonth()-1);return iso(x)})(),vmEind=plusDagen(m0,-1);
  return`<div class="kop"><div class="koprij"><h1>Inkoopprijzen</h1></div><p>Inkoopprijs per stuk (per brood bij vers brood). Alleen voor jou zichtbaar. Hiermee zie je de derving in euro's.</p></div>
   ${Object.keys(S.prijzen).length?`<div class="cijfers"><div class="cijfer"><b>${euro2(dervEuro(m0,iso()))}</b><span>derving deze maand</span></div><div class="cijfer"><b>${euro2(dervEuro(vm,vmEind))}</b><span>vorige maand</span></div></div>`:''}
   ${karNrs().map(nr=>{const rs=l.filter(s=>s.type!=='vers'&&effKar(s)===nr);return rs.length?`<div class="sectie"><div class="karkop"><b>${esc(karNaam(nr))}</b></div>${rs.map(prijsRij).join('')}</div>`:''}).join('')}
   ${l.some(s=>s.type==='vers')?`<div class="sectie"><div class="karkop"><b>Vers brood</b></div>${l.filter(s=>s.type==='vers').map(prijsRij).join('')}</div>`:''}`}
const prijsRij=s=>`<div class="rij inv"><div class="groei"><div class="naam">${esc(s.naam)}</div></div><span style="margin-right:6px">€</span><input class="veld prijsveld" inputmode="decimal" data-prijs="${s.id}" value="${S.prijzen[s.id]!=null?String(S.prijzen[s.id]).replace('.',','):''}" placeholder="0,00" style="width:90px;text-align:right"></div>`;
/* ---- bestel-advies per weekdag (vers brood, op basis van derving) ---- */
const WD=['zo','ma','di','wo','do','vr','za'],WDL=['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'];
function bestelAdvies(){const uit=[];
  for(const s of S.soorten.filter(x=>x.type==='vers'&&x.naam.trim()))for(let w=0;w<7;w++){
    const ds=Object.keys(S.levering).filter(d=>vanIso(d).getDay()===w&&S.derving[d]?.[s.id]!=null&&!S.afwijkend[d]).sort().reverse().slice(0,4);if(ds.length<2)continue;
    const lev=ds.map(d=>S.levering[d]?.items?.[s.id]??0),der=ds.map(d=>+S.derving[d][s.id]||0),gl=lev.reduce((a,b)=>a+b,0)/ds.length,gd=der.reduce((a,b)=>a+b,0)/ds.length;if(!gl)continue;
    const pct=gd/gl*100;let advies=null,soort='goed';
    if(gd>=1&&pct>=15){const m=Math.max(1,Math.floor(gd*.75));advies=`${m} minder`;soort='minder'}
    else if(ds.length>=3&&der.every(x=>x===0)){advies='mogelijk te weinig – overweeg meer';soort='meer'}
    uit.push({s,w,n:ds.length,gl,gd,pct,advies,soort})}
  return uit}
function bestelAdviesHtml(){const a=bestelAdvies(),met=a.filter(x=>x.advies);
  let h=`<div class="kop"><div class="koprij"><h1>Bestel-advies</h1></div><p>Per weekdag, op basis van de levering en de derving van de laatste 4 weken. Alleen vers brood.</p></div>`;
  if(!a.length)return h+'<p class="leeg">Nog te weinig gegevens. Na een paar weken leveringen en derving verschijnt hier advies.</p>';
  h+=met.length?`<div class="kaartje"><h3>Advies</h3>${met.map(x=>`<div class="sub"><b>${esc(x.s.naam)}</b> op ${WDL[x.w]}: <span class="${x.soort==='minder'?'hoog':'goed'}">${esc(x.advies)}</span> <span class="hulp" style="margin:0">(gem. ${fmt(Math.round(x.gd*10)/10)} over van ${fmt(Math.round(x.gl*10)/10)}, ${Math.round(x.pct)}%)</span></div>`).join('')}</div>`:'<div class="kaartje"><h3>✓ Geen aanpassingen</h3><div class="sub">De derving is overal laag.</div></div>';
  for(const s of S.soorten.filter(x=>x.type==='vers'&&x.naam.trim())){const rs=a.filter(x=>x.s.id===s.id);if(!rs.length)continue;
    h+=`<div class="sectie"><div class="karkop"><b>${esc(s.naam)}</b></div><div class="tabelwrap"><table class="tabel"><tr><th>Dag</th><th>Geleverd</th><th>Over</th><th>%</th><th>Advies</th></tr>${rs.map(x=>`<tr><td>${WD[x.w]}</td><td>${fmt(Math.round(x.gl*10)/10)}</td><td>${fmt(Math.round(x.gd*10)/10)}</td><td class="${x.pct>=15?'hoog':''}">${Math.round(x.pct)}%</td><td>${x.advies?esc(x.advies):'✓'}</td></tr>`).join('')}</table></div></div>`}
  return h+'<p class="hulp" style="margin:12px 20px">“Minder” is voorzichtig: ongeveer driekwart van wat er gemiddeld over is. Bij 0 derving weet de app niet hoeveel er tekort was, dus geeft hij geen aantal.</p>'}
/* ---- weekoverzicht (maandag) ---- */
let woWeek=null;
function weekCijfers(van){const dagen=[...Array(7)].map((_,i)=>plusDagen(van,i)),rij=[];let gezet=0,over=0,eur=0;
  for(const s of S.soorten){let g=0,o=0,tel=false;for(const d of dagen){const w=S.derving[d]?.[s.id];if(w!=null){tel=true;o+=+w||0;g+=S.historie[d]?.gezet?.[s.id]??0}}
    if(!tel)continue;gezet+=g;over+=o;eur+=o*prijs(s.id);rij.push({s,g,o,e:o*prijs(s.id),pct:g?o/g*100:null})}
  const versch=dagen.filter(d=>levVerschil(S.levering[d]).length).map(d=>({d,l:levVerschil(S.levering[d])}));return{dagen,gezet,over,eur,rij,versch}}
function weekoverzichtHtml(){if(!woWeek)woWeek=plusDagen(maandag(iso()),-7);const c=weekCijfers(woWeek),eind=plusDagen(woWeek,6),metPrijs=heeft('euro')&&Object.keys(S.prijzen).length>0;
  const top=[...c.rij].sort((a,b)=>metPrijs?b.e-a.e:b.o-a.o).filter(x=>x.o>0).slice(0,3),pat=bakkerPatronen(),adv=bestelAdvies().filter(x=>x.advies);
  return`<div class="kop"><div class="koprij"><h1>Weekoverzicht</h1></div><p>Week ${weeknr(woWeek)}: ${esc(datumTekst(woWeek))} t/m ${esc(datumTekst(eind))}</p></div>
   <div class="datumnav"><button class="pijlk" data-a="woweek" data-v="-7">‹</button><button class="dlabel" data-a="woweek" data-v="0">Week ${weeknr(woWeek)}<small>tik voor vorige week</small></button><button class="pijlk" data-a="woweek" data-v="7">›</button></div>
   <div class="cijfers"><div class="cijfer"><b>${c.gezet?Math.round(c.over/c.gezet*100)+'%':'–'}</b><span>derving</span></div><div class="cijfer"><b>${fmt(c.over)}</b><span>stuks over</span></div>${metPrijs?`<div class="cijfer"><b>${euro2(c.eur)}</b><span>derving in €</span></div>`:''}</div>
   ${top.length?`<div class="kaartje"><h3>Meeste derving</h3>${top.map((x,i)=>`<div class="sub">${i+1}. <b>${esc(x.s.naam)}</b>: ${fmt(x.o)} over${x.pct!=null?` (${Math.round(x.pct)}%)`:''}${metPrijs?` · ${euro2(x.e)}`:''}</div>`).join('')}</div>`:''}
   <div class="kaartje"><h3>Levering ↔ pakbon</h3>${c.versch.length?c.versch.map(v=>`<div class="sub"><b>${esc(datumTekst(v.d))}</b>: ${v.l.map(x=>`${esc(S.soorten.find(s=>s.id===x.id)?.naam||'?')} ${x.n<x.pb?'−':'+'}${Math.abs(x.n-x.pb)}`).join(', ')}</div>`).join(''):'<div class="sub">✓ Geen verschillen deze week.</div>'}
    ${pat.length?`<div class="sub" style="margin-top:8px"><b>Vaker te weinig:</b> ${pat.map(x=>`${esc(x.s.naam)} (${x.keer} van ${x.mee})`).join(', ')}</div>`:''}</div>
   <div class="kaartje"><h3>Bestel-advies</h3>${adv.length?adv.slice(0,6).map(x=>`<div class="sub"><b>${esc(x.s.naam)}</b> op ${WDL[x.w]}: ${esc(x.advies)}</div>`).join('')+`<div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:8px"><button class="knop rand klein" data-a="sub" data-v="besteladvies">Alles bekijken</button></div>`:'<div class="sub">✓ Geen aanpassingen nodig.</div>'}</div>
   ${metPrijs||!heeft('euro')?'':`<p class="hulp" style="margin:12px 20px">Tip: vul de inkoopprijzen in (Beheer → Inkoopprijzen), dan zie je de derving ook in euro's.</p>`}`}
/* ---- back-up op de server ---- */
let bkLijst=null,bkFout='';
async function laadBackups(){bkFout='';try{bkLijst=db?.backups?await db.backups():[]}catch(e){bkLijst=[];bkFout=/app_data_backup|relation|schema cache|does not exist/i.test(e?.message||'')?'nog-niet':String(e?.message||e)}render()}
function backupHtml(){if(bkLijst===null){laadBackups();return`<div class="kop"><div class="koprij"><h1>Back-up</h1></div></div><p class="leeg">Back-ups ophalen…</p>`}
  let h=`<div class="kop"><div class="koprij"><h1>Back-up</h1></div><p>Elke nacht maakt de server een kopie van alle gegevens. De laatste 30 dagen worden bewaard.</p></div>`;
  if(L.modus==='lokaal')return h+'<p class="leeg">Dit toestel is niet gekoppeld, dus er is geen server-back-up.</p>';
  if(bkFout==='nog-niet')return h+'<div class="kaartje waarschuw"><b>Nog niet ingesteld</b><div class="sub">Plak eenmalig het SQL-stukje uit de uitleg van deze update in Supabase (SQL Editor). Daarna staat hier elke dag een back-up.</div></div>';
  if(bkFout)return h+`<div class="kaartje waarschuw"><b>Ophalen lukte niet</b><div class="sub">${esc(bkFout)}</div></div>`;
  if(!bkLijst.length)return h+'<p class="leeg">Nog geen back-ups. De eerste wordt vannacht gemaakt.</p>';
  return h+`<div class="kaartje"><h3>✓ Laatste back-up: ${esc(dagNaamLang(bkLijst[0]))}</h3><div class="sub">${bkLijst.length} ${bkLijst.length===1?'back-up':'back-ups'} beschikbaar.</div></div>
   <div class="sectie">${bkLijst.map(d=>`<div class="rij inv"><div class="groei"><div class="naam">${esc(dagNaamLang(d))}</div><div class="sub">gemaakt in de nacht</div></div><button class="knop rand klein" data-a="bkterug" data-v="${d}">Terugzetten</button></div>`).join('')}</div>
   <p class="hulp" style="margin:12px 20px">Terugzetten zet alle gegevens terug naar die nacht. Wat daarna is ingevuld, gaat verloren. Gegevens van latere dagen blijven staan.</p>`}
function klaarHtml(){
  const sn=S.soorten.filter(s=>s.naam.trim()),zonderFoto=sn.filter(s=>!S.fotos[s.id]),zonderPlu=sn.filter(s=>!s.plu),zonderHalf=sn.filter(s=>s.type==='vers'&&s.gesneden==='on'&&!s.pluHalf),zonderProg=sn.filter(s=>s.type==='afbakken'&&!s.programma),
    tijd=S.gebruikers.filter(g=>g.rol!=='admin'&&g.actief!==false&&pinTijdelijk(g)),geenRecht=S.gebruikers.filter(g=>g.rol!=='admin'&&g.actief!==false&&!Object.values(g.rechten||{}).some(Boolean));
  const blok=(titel,l,soort)=>l.length?`<div class="sectie"><div class="karkop"><b>${titel}</b><span>${l.length}</span></div>${l.slice(0,40).map(x=>`<div class="rij"><button class="regel" data-a="${soort==='g'?'gebruiker':'open'}" data-v="${x.id}"><div class="groei"><div class="naam">${esc(x.naam)}</div></div><span class="pijl">›</span></button></div>`).join('')}</div>`:'';
  const h=(SOORT_FOTO?blok('Broodsoorten zonder foto',zonderFoto):'')+blok('Broodsoorten zonder PLU',zonderPlu)+blok('Ongesneden zonder PLU half',zonderHalf)+blok('Afbakken zonder bakprogramma',zonderProg)+(kanBeheren()?blok('Medewerkers met tijdelijke pincode',tijd,'g')+blok('Medewerkers zonder rechten',geenRecht,'g'):'');
  return`<div class="kop"><div class="koprij"><h1>Klaar voor gebruik?</h1></div><p>Wat nog ontbreekt en het werk lastiger maakt.</p></div>${h||'<div class="kaartje"><h3>✓ Alles is klaar</h3><div class="sub">Alle broodsoorten hebben een foto, PLU en programma, en iedereen heeft een eigen pincode.</div></div>'}`}
/* ---------- cadeaubonnen (alleen beheerder) ---------- */
let cbTab='uit',cbZoek='',cbSelect=false,cbSel=new Set();
const euro=c=>'€ '+((c||0)/100).toFixed(2).replace('.',',');
const centen=t=>{const m=String(t||'').replace(/[^0-9,\.]/g,'').replace(',','.');const x=parseFloat(m);return isNaN(x)?null:Math.round(x*100)};
function cadeauTellers(){const l=Object.values(S.cadeau);return{voorraadWaarde:l.filter(b=>b.status==='voorraad').reduce((t,b)=>t+(b.bedrag||0),0),voorraad:l.filter(b=>b.status==='voorraad').length,uit:l.filter(b=>b.status==='uit').length,gebruikt:l.filter(b=>b.status==='gebruikt').length,
  open:l.filter(b=>b.status==='uit').reduce((t,b)=>t+(b.bedrag||0),0),ingewisseld:l.filter(b=>b.status==='gebruikt').reduce((t,b)=>t+(b.bedrag||0),0)}}
const cbStatus={voorraad:['Op voorraad','ontd'],uit:['Uitgegeven','gebak'],gebruikt:['Ingewisseld','schap']};
const cbSort=(a,b)=>a.nr.length-b.nr.length||a.nr.localeCompare(b.nr);
function bedragBlok(){const t=bewerk.bedragTekst||'';
  return`<div class="bedragscherm">€ ${t?esc(t):'<span class="let">0</span>'}</div><div class="cijferblok licht">${['1','2','3','4','5','6','7','8','9',',','0'].map(k=>`<button data-a="bdk" data-v="${k}">${k}</button>`).join('')}<button class="wis" data-a="bdk" data-v="wis" aria-label="Wissen">⌫</button></div>`}
function bedragVernieuw(){const el=document.querySelector('.bedragscherm');if(el){const t=bewerk.bedragTekst||'';el.innerHTML=`€ ${t?esc(t):'<span class="let">0</span>'}`}}
function cadeauHtml(){const t=cadeauTellers(),l=cbZichtbaar(),selW=[...cbSel].reduce((x,nr)=>x+(S.cadeau[nr]?.bedrag||0),0);
  return`<div class="kop"><div class="koprij"><h1>Cadeaubonnen</h1></div><p>Alleen zichtbaar voor jou.</p></div>
   <div class="cijfers"><div class="cijfer"><b>${t.voorraad}</b><span>voorraad</span><small>${euro(t.voorraadWaarde)}</small></div><div class="cijfer"><b>${t.uit}</b><span>uitgegeven</span><small>${euro(t.open)} open</small></div><div class="cijfer"><b>${t.gebruikt}</b><span>ingewisseld</span><small>${euro(t.ingewisseld)}</small></div></div>
   <div class="zoekbalk" style="margin-top:12px"><input class="veld" id="cbZoek" inputmode="numeric" placeholder="Zoek een bonnummer" value="${esc(cbZoek)}" autocomplete="off"></div>
   <div id="cbVondst">${cbVondstHtml()}</div>
   <div class="segment">${[['uit',`Uitgegeven (${t.uit})`],['voorraad',`Voorraad (${t.voorraad})`],['gebruikt',`Gebruikt (${t.gebruikt})`],['alle','Alle']].map(([k,l2])=>`<button data-a="cbtab" data-v="${k}" class="${cbTab===k?'aan':''}">${l2}</button>`).join('')}</div>
   <div class="knoppen" style="justify-content:flex-start;margin:6px 16px 0;padding:0;flex-wrap:wrap">${cbSelect?`<button class="knop rand klein" data-a="cbselalles">${l.length&&l.every(b=>cbSel.has(b.nr))?'Niets selecteren':'Alles selecteren'}</button><button class="knop rand klein" data-a="cbselreeks">Reeks…</button><button class="knop rand klein" data-a="cbselmodus">Klaar</button>`:`<button class="knop rand klein" data-a="cbselmodus">Selecteren</button>`}</div>
   <div id="cbLijst">${cbLijstHtml()}</div>
   ${cbSelect&&cbSel.size?`<div class="ovenbalk"><div><b>${cbSel.size} ${cbSel.size===1?'bon':'bonnen'} geselecteerd</b>${selW?` – samen ${euro(selW)}`:''}</div><div class="rijtje"><button class="knop rand" data-a="cbselwaarde">Waarde instellen</button><button class="knop" style="margin-left:auto" data-a="cbseluitgeven">Uitgeven</button></div></div>`:''}
   <div class="knoppen"><button class="knop" data-a="cbtoevoegen">+ Bonnen toevoegen</button><button class="knop rand" data-a="cbexport">Exporteren</button></div>
   <p class="hulp" style="margin:12px 20px">Tik op een bon om hem uit te geven of in te wisselen. Met Selecteren geef je veel bonnen tegelijk een waarde of geef je ze uit.</p>`}
function cbZichtbaar(){const z=cbZoek.trim();return Object.values(S.cadeau).filter(b=>(cbTab==='alle'||b.status===cbTab)&&(!z||b.nr.includes(z))).sort(cbSort)}

function cbVondstHtml(){const z=cbZoek.trim();if(!z)return'';const b=S.cadeau[z];
  if(!b)return`<div class="kaartje cbmelding rood"><b>Bon ${esc(z)} is onbekend</b><div class="sub">Dit nummer staat niet in de lijst.</div><div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:8px"><button class="knop klein" data-a="cbnieuw" data-v="${esc(z)}">Toevoegen als nieuwe bon</button></div></div>`;
  const w=b.status==='gebruikt'?`<b class="hoog">Let op: al ingewisseld op ${esc(datumTekst(iso(new Date(b.gebruikt.t))))}</b>`:b.status==='voorraad'?'<b class="hoog">Let op: deze bon is nog niet uitgegeven</b>':`<b class="goed">Geldig: ${euro(b.bedrag)}</b>`;
  return`<div class="kaartje cbmelding ${b.status==='uit'?'':'rood'}">${w}<div class="sub">Bon ${esc(b.nr)}${b.notitie?' · '+esc(b.notitie):''}</div><div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:8px"><button class="knop klein" data-a="cbopen" data-v="${esc(b.nr)}">Openen</button></div></div>`}
function cbLijstHtml(){const l=cbZichtbaar();
  if(!l.length)return'<p class="leeg">Geen bonnen.</p>';
  return`<div class="sectie">${l.slice(0,300).map(b=>{const[st,kl]=cbStatus[b.status],gek=cbSel.has(b.nr);return`<div class="rij"><button class="regel ${gek?'gekozen':''}" data-a="${cbSelect?'cbsel':'cbopen'}" data-v="${esc(b.nr)}"><div class="cbnr">${esc(b.nr)}</div><div class="groei"><div class="naam">${b.bedrag?euro(b.bedrag):'<span class="let">geen waarde</span>'}${b.notitie?` <span class="sub">· ${esc(b.notitie)}</span>`:''}</div>
    <div class="sub">${b.uit?`uit ${esc(datumTekst(iso(new Date(b.uit.t))))}`:''}${b.gebruikt?` · ingewisseld ${esc(datumTekst(iso(new Date(b.gebruikt.t))))}`:''}</div></div>${cbSelect?`<div class="kiesvak">${gek?'✓':''}</div>`:`<span class="st ${kl}">${st}</span>`}</button></div>`}).join('')}${l.length>300?`<p class="hulp" style="margin:10px 14px">En nog ${l.length-300} – zoek op nummer.</p>`:''}</div>`}

function openBon(nr){const b=S.cadeau[nr];if(!b)return;bewerk={soort:'bon',nr,bedragTekst:''};verwStap=false;const[st]=cbStatus[b.status];
  const regel=(l,x)=>x?`<div><span>${l}</span><b>${esc(datumTekst(iso(new Date(x.t))))} ${tijdTekst(x.t)} · ${esc(x.wie)}</b></div>`:'';
  toonSheet(`<div class="pkop"><button data-a="sluit">Sluiten</button><b>Bon ${esc(nr)}</b><span style="width:60px"></span></div><div class="pinhoud">
   <div class="infotabel"><div><span>Status</span><b>${st}</b></div><div><span>Waarde</span><b>${b.bedrag?euro(b.bedrag):'nog niet ingevuld'}</b></div>${regel('Toegevoegd',b.toegevoegd)}${regel('Uitgegeven',b.uit)}${regel('Ingewisseld',b.gebruikt)}</div>
   ${b.status==='voorraad'?(b.bedrag?`<label>Notitie (optioneel)</label><input class="veld" id="cbNotitie" maxlength="60" placeholder="bijv. naam klant"><div class="knoppen"><button class="knop" data-a="cbuitgeven">Uitgeven (${euro(b.bedrag)})</button></div><div class="knoppen" style="margin-top:8px"><button class="knop rand klein" data-a="cbwaardewijzig">Waarde wijzigen</button></div>`
       :`<label>Waarde</label>${bedragBlok()}<div class="fout" id="fout"></div><div class="knoppen"><button class="knop" data-a="cbwaardezet">Waarde opslaan</button></div>`)+`<button class="verwijder" data-a="cbweg">Bon verwijderen</button>`:''}
   ${b.status==='uit'?`${b.notitie?`<p class="hulp">Notitie: ${esc(b.notitie)}</p>`:''}<div class="knoppen"><button class="knop" data-a="cbinwisselen">Ingewisseld</button></div><div class="knoppen" style="margin-top:8px"><button class="knop rand klein" data-a="cbuitterug">Uitgifte ongedaan maken</button></div>`:''}
   ${b.status==='gebruikt'?`<p class="hulp hoog" style="text-align:center">Deze bon is al ingewisseld en kan niet opnieuw worden gebruikt.</p><div class="knoppen"><button class="knop rand klein" data-a="cbgebruiktterug">Inwisselen ongedaan maken</button></div>`:''}</div>`)}
function openWaarde(titel,aantal){bewerk={...bewerk,soort:'waarde',bedragTekst:''};
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>${esc(titel)}</b><button data-a="cbwaardeopslaan" style="font-weight:700">Opslaan</button></div><div class="pinhoud">
   <p class="hulp">${aantal?`Deze waarde komt op ${aantal} ${aantal===1?'bon':'bonnen'}. Bonnen die al zijn ingewisseld worden overgeslagen.`:'Nieuwe waarde voor deze bon.'}</p>${bedragBlok()}<div class="fout" id="fout"></div></div>`)}

function openBonToevoegen(start){bewerk={soort:'bontoe',bedragTekst:''};
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Bonnen toevoegen</b><button data-a="cbtoeopslaan" style="font-weight:700">Toevoegen</button></div><div class="pinhoud">
   <p class="hulp">Eén bon: vul alleen het eerste nummer in. Een reeks: vul ook het laatste nummer in, bijvoorbeeld 1001 t/m 1050.</p>
   <div class="minmax"><div><div class="hulp" style="margin:0 0 4px">Nummer</div><input class="veld" id="cbVan" inputmode="numeric" value="${esc(start||'')}"></div><div><div class="hulp" style="margin:0 0 4px">t/m (optioneel)</div><input class="veld" id="cbTot" inputmode="numeric"></div></div>
   <label>Waarde per bon</label>${bedragBlok()}
   <div class="fout" id="fout"></div></div>`)}
function openReeksSelectie(){bewerk={soort:'reeks'};
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Reeks selecteren</b><button data-a="cbreeksok" style="font-weight:700">Selecteren</button></div><div class="pinhoud">
   <div class="minmax"><div><div class="hulp" style="margin:0 0 4px">Van</div><input class="veld" id="cbRVan" inputmode="numeric"></div><div><div class="hulp" style="margin:0 0 4px">t/m</div><input class="veld" id="cbRTot" inputmode="numeric"></div></div>
   <div class="fout" id="fout"></div><p class="hulp">Selecteert alle bonnen in deze reeks, behalve bonnen die al zijn ingewisseld.</p></div>`)}

function b2tekst(e){const k=e.target.closest('[data-a]');if(k)k.textContent='Tik nogmaals om te verwijderen'}
function cbVernieuw(){const a=document.getElementById('cbVondst'),b=document.getElementById('cbLijst');if(a)a.innerHTML=cbVondstHtml();if(b)b.innerHTML=cbLijstHtml()}
async function cbExport(){
  if(!window.XLSX){toast('Excel-onderdeel laden…');try{await laadXlsx()}catch(e){toast('Excel kon niet laden, controleer je internet');return}}
  const d=x=>x?`${iso(new Date(x.t))} ${tijdTekst(x.t)}`:'';
  const rij=[['Nummer','Status','Bedrag','Notitie','Toegevoegd','Uitgegeven','Uitgegeven door','Ingewisseld','Ingewisseld door']];
  for(const b of Object.values(S.cadeau).sort(cbSort))rij.push([b.nr,cbStatus[b.status][0],b.bedrag?b.bedrag/100:'',b.notitie||'',d(b.toegevoegd),d(b.uit),b.uit?.wie||'',d(b.gebruikt),b.gebruikt?.wie||'']);
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rij),'Cadeaubonnen');
  const blob=new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),f=new File([blob],`cadeaubonnen-${iso()}.xlsx`,{type:blob.type});
  try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:f.name});return}}catch(e){if(e&&e.name==='AbortError')return;if(e&&e.name==='NotAllowedError'){toast('Tik nog een keer op Exporteren');return}}
  toast('Delen wordt op dit toestel niet ondersteund');
}
let notZoek='',notMetFoto=false;
function notOverzichtHtml(){
  return`<div class="kop"><div class="koprij"><h1>Notities</h1>${info('notities')}</div><p>Alle dagnotities, nieuwste eerst.</p></div>
   <div class="zoekbalk"><input class="veld" id="notZoek" type="search" placeholder="Zoek op woord of naam" value="${esc(notZoek)}" autocomplete="off"></div>
   <label class="schakel" style="margin:0 16px;color:var(--tekst);font-weight:400;border:0">Alleen met foto<input type="checkbox" id="notMetFoto" ${notMetFoto?'checked':''}></label>
   <div id="notLijst">${notLijstHtml()}</div>`}
function notLijstHtml(){
  const z=notZoek.trim().toLowerCase(),dagen=Object.keys(S.notities).sort().reverse();let h='';
  for(const d of dagen){const l=Object.values(S.notities[d]||{}).filter(n=>(!z||n.tekst.toLowerCase().includes(z)||(n.wie||'').toLowerCase().includes(z))&&(!notMetFoto||notFotoSrc(n))).sort((a,b)=>b.t-a.t);
    if(!l.length)continue;
    h+=`<div class="sectie"><div class="karkop"><b>${esc(datumTekst(d))} ${vanIso(d).getFullYear()}</b><button class="link" data-a="bekijkdag" data-v="${d}">Bekijk dag</button></div>${l.map(n=>`<div class="rij inv">${notFotoSrc(n)?`<button class="notfoto" data-a="notfoto" data-v="${esc(n.id)}"><img src="${notFotoSrc(n)}" alt=""></button>`:''}<div class="groei"><div class="naam" style="font-weight:500">${esc(n.tekst)}</div><div class="sub">${esc(n.wie)}, ${tijdTekst(n.t)}</div></div>${isAdmin()||n.wie===ik()?.naam?`<button class="knop rand klein rood" data-a="notweg" data-v="${esc(n.id)}">${afwStap==='nt:'+n.id?'Zeker?':'×'}</button>`:''}</div>`).join('')}</div>`}
  return h||'<p class="leeg">Geen notities gevonden.</p>';
}
let pluSort='naam',pluZoek='',pluZonder='';
function pluHtml(){
  return`<div class="kop"><div class="koprij"><h1>PLU-lijst</h1>${info('plu')}</div><p>Zoek op naam of nummer.</p></div>
   <div class="zoekbalk"><input class="veld" id="pluZoek" type="search" placeholder="Zoek, bijv. kaas of 43" value="${esc(pluZoek)}" autocomplete="off"></div>
   <div class="segment">${[['naam','Op naam'],['kar','Per kar']].map(([k,l])=>`<button data-a="plusort" data-v="${k}" class="${pluSort===k?'aan':''}">${l}</button>`).join('')}</div>
   <div class="zoekbalk"><select class="veld" id="pluZonder"><option value="">Alle allergenen</option>${ALLERGENEN.map(([k,l])=>`<option value="${k}" ${pluZonder===k?'selected':''}>Zonder ${l.toLowerCase()}</option>`).join('')}</select></div>
   <div id="pluLijst">${pluLijstHtml()}</div>`}
function pluLijstHtml(){
  const z=pluZoek.trim().toLowerCase(),alle=S.soorten.filter(s=>s.naam.trim()&&(!z||s.naam.toLowerCase().includes(z)||(s.plu||'').includes(z)||(s.pluHalf||'').includes(z))&&(!pluZonder||!(s.allergenen||[]).includes(pluZonder)));
  const rij=s=>`<div class="rij"><button class="regel" ${mag('soorten')?`data-a="open" data-v="${s.id}"`:''}>${sFoto(s.id)?`<img class="duim klein" src="${sFoto(s.id)}" alt="">`:''}<div class="groei"><div class="naam">${esc(s.naam)}</div>${s.plu?'':'<div class="sub let">PLU nog niet ingevuld</div>'}${(s.allergenen||[]).length?`<div class="sub">Bevat: ${s.allergenen.map(k=>ALLERGENEN.find(a=>a[0]===k)?.[1].toLowerCase()).join(', ')}</div>`:''}</div>${s.plu?`<div class="plugroot">${esc(s.plu)}${s.pluHalf?`<small>½ ${esc(s.pluHalf)}</small>`:''}</div>`:''}</button></div>`;
  const sorteer=l=>[...l.filter(s=>s.plu).sort((a,b)=>a.naam.localeCompare(b.naam,'nl')),...l.filter(s=>!s.plu).sort((a,b)=>a.naam.localeCompare(b.naam,'nl'))];
  if(!alle.length)return`<p class="leeg">Niets gevonden.</p>`;
  if(pluSort==='naam')return`<div class="sectie">${sorteer(alle).map(rij).join('')}</div>`;
  const groepen=[...karNrs().map(nr=>[karNaam(nr),alle.filter(s=>s.type!=='vers'&&s.kar===nr)]),['Vers brood',alle.filter(s=>s.type==='vers')]].filter(g=>g[1].length);
  return groepen.map(([t,l])=>`<div class="sectie"><div class="karkop"><b>${esc(t)}</b></div>${sorteer(l).map(rij).join('')}</div>`).join('');
}
function uitlegHtml(){
  return`<div class="kop"><h1>Uitleg</h1><p>Tik op een onderdeel om de uitleg te openen.</p></div><div class="knoppen" style="margin:0 0 6px;flex-wrap:wrap"><button class="knop rand klein" data-a="tourstart">Rondleiding opnieuw bekijken</button><button class="knop klein" data-a="oefenstart">🎓 Oefenen</button></div><div class="sectie">${UITLEG.map(([k,t,x])=>`<div class="rij" id="u-${k}"><button class="regel" data-a="uitlegopen" data-v="${k}"><div class="groei"><div class="naam">${t}</div></div><span class="pijl">${uitlegOpen===k?'▴':'▾'}</span></button>${uitlegOpen===k?`<div class="uitlegtekst">${esc(x)}</div>`:''}</div>`).join('')}</div>`;
}
function toast(t){let el=document.getElementById('toast');if(!el){el=document.createElement('div');el.id='toast';document.body.appendChild(el)}el.textContent=t;el.classList.add('zichtbaar');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('zichtbaar'),2600)}

/* ================= extra functies (update 8) ================= */
const ALLERGENEN=[['gluten','Gluten'],['ei','Ei'],['melk','Melk'],['noten','Noten'],['pinda','Pinda'],['soja','Soja'],['sesam','Sesam'],['mosterd','Mosterd'],['selderij','Selderij'],['lupine','Lupine'],['sulfiet','Sulfiet'],['vis','Vis'],['schaaldieren','Schaaldieren'],['weekdieren','Weekdieren']];
const initialen=n=>String(n||'?').split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase();
const wieTijd=x=>x&&x.t?`${initialen(x.wie)} ${tijdTekst(x.t)}`:'';

/* ---------- ongedaan maken ---------- */
let undoSnap=null,undoTimer=null;
function undoStart(label){undoSnap={d:datum,label,v:kloon(S.vinkjes[datum]),st:kloon(S.status[datum]),a:kloon(S.aanpas[datum]),b:kloon(S.bijbak[datum]),sn:kloon(S.snij[datum]),h:kloon(S.historie[datum])}}
function undoToon(){if(!undoSnap)return;const el=document.getElementById('undo');el.innerHTML=`<span>${esc(undoSnap.label)}</span><button data-a="undo">Ongedaan</button>`;el.classList.add('zichtbaar');clearTimeout(undoTimer);undoTimer=setTimeout(()=>{el.classList.remove('zichtbaar')},4000)}
let bevTimer=null;
function bevestig(t){const el=document.getElementById('bevestig');if(!el||prof().bevestig===false)return;el.textContent=t;el.classList.add('zichtbaar');clearTimeout(bevTimer);bevTimer=setTimeout(()=>el.classList.remove('zichtbaar'),1800)}
function undoVerberg(){const el=document.getElementById('undo');if(el)el.classList.remove('zichtbaar')}

function undoDoe(){const u=undoSnap;if(!u)return;const zet=(k,v)=>{if(v===undefined)delete S[k][u.d];else S[k][u.d]=v};
  zet('vinkjes',u.v);zet('status',u.st);zet('aanpas',u.a);zet('bijbak',u.b);zet('snij',u.sn);if(u.h!==undefined)S.historie[u.d]=u.h;
  log(`Ongedaan gemaakt: ${u.label}`);undoSnap=null;document.getElementById('undo').classList.remove('zichtbaar');bewaar();render()}

/* ---------- productinfo ---------- */
function openInfo(id){
  const s=S.soorten.find(x=>x.id===id);if(!s)return;const al=(s.allergenen||[]).map(k=>ALLERGENEN.find(a=>a[0]===k)?.[1]).filter(Boolean);
  toonSheet(`<div class="pkop"><span style="width:70px"></span><b>Productinfo</b><button data-a="sluit" style="font-weight:700">Sluiten</button></div><div class="pinhoud">
   ${sFoto(s.id)?`<img class="infofoto" src="${sFoto(s.id)}" alt="">`:''}
   <div class="naam" style="font-size:22px;margin-top:12px">${esc(s.naam)}${s.nieuwSinds?' <span class="st extra">nieuw</span>':''}</div>
   ${s.plu?`<div class="plu wplu" style="margin-top:8px">PLU ${s.pluHalf?'heel ':''}${esc(s.plu)}</div>`:''}${s.pluHalf?` <div class="plu wplu" style="margin-top:8px">PLU half ${esc(s.pluHalf)}</div>`:''}
   <div class="infotabel">
    <div><span>Soort product</span><b>${s.type==='ontdooien'?'Ontdooien':s.type==='vers'?(s.gesneden==='on'?'Vers, ongesneden':'Vers, voorgesneden'):'Afbakken'}</b></div>
    ${s.type==='afbakken'?`<div><span>Per plaat</span><b>${s.min||0} – ${s.max||'?'}</b></div><div><span>Bakprogramma</span><b>${esc(s.programma||'–')}</b></div><div><span>Oven</span><b>${[s.temp?s.temp+'°C':'',s.baktijd?s.baktijd+' min':''].filter(Boolean).join(' · ')||'–'}</b></div>`:''}
    <div><span>Kar</span><b>${esc(karNaam(s.kar))}</b></div>
   </div>
   ${s.instructie?`<label>Werkinstructie</label><div class="winstr">${esc(s.instructie).replace(/\n/g,'<br>')}</div>`:''}
   <label>Allergenen</label>${al.length?`<div class="chips">${al.map(a=>`<span class="allerg">${a}</span>`).join('')}</div>`:'<div class="hulp" style="margin:0">Geen allergenen ingevuld.</div>'}
   ${s.ingredienten?`<label>Ingrediënten</label><div class="hulp" style="margin:0;color:var(--tekst)">${esc(s.ingredienten)}</div>`:''}
   ${ik()?`<div class="knoppen"><button class="knop rand" data-c="vraaghier" data-v="${s.id}">💬 Vraag hierover</button></div>`:''}</div>`);
}

/* ---------- zoeken op Klaarzetten ---------- */
let zoekOpen=false,zoekTerm='',kzMeer=false,dervMeer=false;
const potKnop=(id,ap)=>ap?`<button class="pot" data-a="rijmenu" data-v="${id}" aria-label="Meer">⋯</button>`:`<button class="pot pinfo" data-a="pinfo" data-v="${id}" aria-label="Productinfo">ⓘ</button>`;
function zoekFilter(){const z=zoekTerm.trim().toLowerCase(),m=document.getElementById('scherm');
  m.querySelectorAll('.rij[data-zoek]').forEach(r=>{r.style.display=!z||r.dataset.zoek.includes(z)?'':'none'});
  m.querySelectorAll('.sectie').forEach(sec=>{const rijen=[...sec.querySelectorAll('.rij[data-zoek]')];if(rijen.length)sec.style.display=rijen.some(r=>r.style.display!=='none')?'':'none'})}

/* ---------- foto bij notitie ---------- */
let notFoto=null;
const notFotoSrc=n=>(n.fotoId&&S.notfotos[n.fotoId])||n.foto||null;
function verkleinNaar(file,max,cb,type){const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const sc=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');
  c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(img,0,0,c.width,c.height);cb(c.toDataURL(type||'image/jpeg',.7))};img.src=r.result};r.readAsDataURL(file)}
function toonFoto(src){toonSheet(`<div class="pkop"><span style="width:70px"></span><b>Foto</b><button data-a="sluit" style="font-weight:700">Sluiten</button></div><div class="pinhoud"><p class="hulp" style="text-align:center">Tik op de foto om in of uit te zoomen.</p><div class="fotozoom"><img src="${src}" alt="" data-a="fotozoom"></div></div>`)}


/* ---------- taken per kar ---------- */
const karTaak=(d,nr)=>S.karTaak[d]?.[nr]||null;
function openKarTaak(nr){
  const huidig=karTaak(datum,nr),mensen=S.gebruikers.filter(g=>g.rol==='admin'||g.actief!==false);bewerk={soort:'kartaak',nr};
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>${esc(karNaam(nr))}</b><span style="width:70px"></span></div><div class="pinhoud">
   <p class="hulp">Wie zet deze kar klaar op ${esc(datumTekst(datum))}? Die persoon ziet de kar bovenaan.</p>
   <div class="sectie" style="margin:0"><div class="rij"><button class="regel ${!huidig?'gekozen':''}" data-a="kartaakzet" data-v=""><div class="groei"><div class="naam">Niemand</div></div><div class="kiesvak">${!huidig?'✓':''}</div></button></div>
   ${mensen.map(g=>`<div class="rij"><button class="regel ${huidig===g.id?'gekozen':''}" data-a="kartaakzet" data-v="${g.id}"><div class="groei"><div class="naam">${prof(g.id).emoji?prof(g.id).emoji+' ':''}${esc(g.naam)}</div></div><div class="kiesvak">${huidig===g.id?'✓':''}</div></button></div>`).join('')}</div></div>`);
}

/* ---------- berichten aan beheerder ---------- */


