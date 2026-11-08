/* ================= 10.7.1 foutvanger: een scherm met een fout laat de app nooit meer hangen ================= */
function foutTekstKort(e){const m=String(e&&(e.message||e)||'onbekend');const st=String(e&&e.stack||'').split('\n').find(r=>/\d+:\d+/.test(r))||'';const p=/:(\d+):(\d+)\)?\s*$/.exec(st);return m.slice(0,160)+(p?` (regel ${p[1]}:${p[2]})`:'')}
function meldFout(e,waar){const t=foutTekstKort(e);console.error(waar,e);try{L.laatsteFout={t:Date.now(),waar:waar||'',tekst:t,versie:APP_BOUW};bewaarL()}catch(x){}
  try{let el=document.getElementById('foutbalk');if(!el){el=document.createElement('div');el.id='foutbalk';document.body.appendChild(el)}
    el.innerHTML=`<b>Er ging iets mis${waar?' bij '+esc(waar):''}</b><div>${esc(t)}</div><button data-a="foutweg">Oké</button>`;el.classList.add('open')}catch(x){}}
function veiligScherm(){try{return tab==='home'?homeHtml():tab==='uren'?urenPaginaHtml():tab==='check'?checkHtml():tab==='lijst'?lijstHtml():tab==='plan'?planHtml():tab==='derving'?dervingHtml():meerHtml()}
  catch(e){const waar=(tab==='meer'&&sub?'Meer → '+sub:tab);meldFout(e,waar);if(tab==='meer'&&sub){sub=null;try{return meerHtml()}catch(x){}}tab='meer';sub=null;try{return meerHtml()}catch(x){return'<p class="leeg">Er ging iets mis. Sluit de app en open hem opnieuw.</p>'}}}
window.addEventListener('error',e=>{if(e&&e.error)meldFout(e.error,'')});
window.addEventListener('unhandledrejection',e=>{const r=e&&e.reason;if(r&&!(r.name==='AbortError'||r.conflict))meldFout(r,'')});
/* ================= 10.0 meerdere winkels ================= */
const PAKKETTEN={basis:[],plus:['scan','push','rapport'],compleet:['scan','push','rapport','advies','euro','cadeau','deeg']};
const PAKKET_NAAM={basis:'Basis',plus:'Plus',compleet:'Compleet'};
const FUNCTIE_NAAM={scan:'Pakbon scannen',push:'Pushmeldingen',rapport:'Rapporten en export',advies:'Bestel-advies',euro:"Derving in euro's",cadeau:'Cadeaubonnen',deeg:'Deegbestelling en voorraad'};
const FUNCTIE_UITLEG={scan:'Pakbon fotograferen of als pdf inlezen, leesfouten en pakbonnen terugzoeken.',push:'Meldingen op de telefoon: levering nog invullen, materiaal op, weekoverzicht.',rapport:'Weekrapport, weekoverzicht, nieuwe producten volgen en exporteren naar Excel.',advies:'Advies per soort en per weekdag op basis van de derving.',euro:"Inkoopprijzen invullen en de derving in euro's zien.",cadeau:'Cadeaubonnen uitgeven, innemen en bijhouden.',deeg:'Voorraad diepvries tellen en dozen bestellen.'};
const MEER_FUNCTIE={rapport:'rapport',nieuw:'rapport',export:'rapport',weekoverzicht:'rapport',bestel:'deeg',cadeau:'cadeau',push:'push',pakbonnen:'scan',leesfouten:'scan',besteladvies:'advies',prijzen:'euro'};
const heeft=f=>L.modus==='lokaal'||!WINKEL||(WINKEL.functies||[]).includes(f);
const isEigenaar=()=>L.modus!=='lokaal'&&WINKEL?.rol==='eigenaar';
const isAanbieder=()=>L.modus!=='lokaal'&&!!WINKEL?.aanbieder;
const oudeVogelenzang=()=>!WINKEL&&L.modus!=='lokaal'&&(!!L.gekoppeld||!!WK.oud);  /* toestel van vóór 10.0 of server zonder winkels */
const winkelNaam=()=>WINKEL?.naam||(oudeVogelenzang()?'Coop Vogelenzang':'Brood Opzet');
const pakketVoor=f=>PAKKETTEN.plus.includes(f)?'Plus':'Compleet';
const datumNL=d=>d?new Date(String(d).length<=10?d+'T12:00:00':d).toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'}):'';
const wisDatum=()=>WINKEL?.opgezegd_op?datumNL(new Date(Date.parse(WINKEL.opgezegd_op)+60*864e5).toISOString()):'';
const toestelNaam=()=>(IS_ANDROID?'Android':/iPhone|iPad/.test(navigator.userAgent)?'iPhone':'Computer')+' '+new Date().toLocaleDateString('nl-NL');
let winkelKiezen=false,koppelTab='code',wkInfo=null,aanb=null,aanbFout='';

/* ---- logo: Vogelenzang houdt het eigen logo, andere winkels krijgen Coop + hun plaatsnaam (of een eigen logo) ---- */
let logoCache=null;
function logoSrc(){
  if(S.winkelLogo)return S.winkelLogo;
  const plaats=(WINKEL?.plaats||'').trim();
  if(!WINKEL)return oudeVogelenzang()?LOGO_SRC:LOGO_KAAL;
  if(/^vogelenzang$/i.test(plaats))return LOGO_SRC;
  if(logoCache&&logoCache.p===plaats)return logoCache.src;
  logoCache={p:plaats,src:LOGO_KAAL};
  try{const im=new Image();im.onload=()=>{try{const c=document.createElement('canvas');c.width=520;c.height=302;const x=c.getContext('2d');x.drawImage(im,0,0);
      if(plaats){let f=50;x.font=`600 ${f}px "Segoe UI",Roboto,Helvetica,Arial,sans-serif`;while(x.measureText(plaats).width>300&&f>22){f-=2;x.font=`600 ${f}px "Segoe UI",Roboto,Helvetica,Arial,sans-serif`}
        x.textAlign='right';x.textBaseline='alphabetic';x.lineJoin='round';x.lineWidth=3;x.strokeStyle='#f17d04';x.strokeText(plaats,505,272);x.fillStyle='#fff';x.fillText(plaats,505,272)}
      logoCache={p:plaats,src:c.toDataURL('image/png')};document.querySelectorAll('img.koplogo,img.merklogo').forEach(i=>i.src=logoCache.src)}catch(e){}};im.src=LOGO_KAAL}catch(e){}
  return logoCache.src}

/* ---- winkels ophalen na het inloggen ---- */
async function winkelsLaden(){
  if(!db?.rpc)return'oud';
  let l;try{l=await db.rpc('mijn_winkels')}catch(e){if(/PGRST202|42883|mijn_winkels|schema cache/i.test((e?.code||'')+' '+(e?.message||''))){WK.oud=true;bewaarWK();return'oud'}throw e}
  l=Array.isArray(l)?l:[];WK.lijst=l;delete WK.oud;
  let w=l.find(x=>x.id===WK.id);
  if(!w){if(!l.length){WINKEL=null;bewaarWK();return'geen'}
    if(L.gekoppeld&&!WK.id)w=l[0];          /* toestel van vóór 10.0: de bestaande gegevens horen bij de eerste (oudste) winkel */
    else if(l.length===1)w=l[0];
    else{bewaarWK();return'kies'}}
  if(!WK.basis)WK.basis=w.id;
  if(nsVan(w.id)!==NS){WK.id=w.id;bewaarWK();bewaarNu();location.reload();return'herstart'}
  WK.id=w.id;bewaarWK();WINKEL=w;
  L.beheerder=w.rol!=='winkel';
  if(L.pingDag!==iso()){L.pingDag=iso();db.rpc('ping',{w:w.id}).catch(()=>{})}
  bewaarL();
  if(w.aanbieder)laadAanbieder(true);
  return'ok'}
async function naInloggen(ses){
  let r;
  try{r=await winkelsLaden()}
  catch(e){console.warn('winkels',e);
    if(WINKEL||WK.oud||(L.gekoppeld&&!WK.lijst)){if(!WK.oud&&!WINKEL&&L.gekoppeld)WK.oud=true;await koppelStart();return}
    zetStatus('offline');clearTimeout(retryTimer);retryTimer=setTimeout(async()=>{try{naInloggen(await db.sessie())}catch(x){}},15000);render();return}
  if(r==='herstart')return;
  if(r==='kies'){winkelKiezen=true;render();return}
  if(r==='geen'){await toestelWissen(L.gekoppeld?'Dit toestel is losgekoppeld van de winkel. Koppel opnieuw met een koppelcode.':'Met deze gegevens hoort geen winkel. Gebruik een koppelcode of de uitnodiging.');return}
  if(r==='oud'){try{L.beheerder=await db.isBeheerder(ses.user.id)}catch(e){}}
  L.modus='online';bewaarL();
  await koppelStart()}
/* toestel helemaal leeg maken (ontkoppeld of verwijderd door de beheerder) */
async function toestelWissen(melding){
  try{await db?.logout()}catch(e){}
  await wisIdb();
  for(const w of WK.lijst||[])try{indexedDB.deleteDatabase('broodopzet'+nsVan(w.id))}catch(e){}
  try{for(const k of Object.keys(localStorage))if(/^broodkarren-(v2|basis|lokaal|revs)/.test(k))localStorage.removeItem(k)}catch(e){}
  WK={};bewaarWK();WINKEL=null;
  const ns=NS;S=leegS();basis={};revs={};L={modus:'online',melding:melding||''};bewaarL();
  if(ns){try{localStorage.setItem('broodkarren-lokaal',JSON.stringify(L))}catch(e){}location.reload();return}
  try{localStorage.setItem(OPSLAG,JSON.stringify(S))}catch(e){}
  syncStatus='lokaal';winkelKiezen=false;render()}
function wisselWinkel(id){if(!id||id===WK.id)return;bewaarNu();WK.id=id;bewaarWK();toast('Winkel wisselen…');setTimeout(()=>location.reload(),150)}

/* ---- koppelen ---- */
function koppelHtml(){
  const fout=koppelFout||L.melding||'';
  if(L.uitnodiging&&koppelTab!=='mail')return uitnodigingHtml(fout);
  const tabs=`<div class="segment koppeltabs"><button data-a="koppeltab" data-v="code" class="${koppelTab==='code'?'aan':''}">Met koppelcode</button><button data-a="koppeltab" data-v="mail" class="${koppelTab==='mail'?'aan':''}">Met e-mail</button></div>`;
  return`<div class="merkscherm">${merkKop('Brood Opzet','Toestel koppelen')}
   ${db?'':'<p class="merkfout">Geen verbinding met de online opslag. Controleer je internet en open de app opnieuw.</p>'}
   ${tabs}
   ${koppelTab==='code'?`<p class="merktekst">Vraag de beheerder om de koppelcode van de winkel (Meer → Winkel). Daarna zien alle toestellen van de winkel dezelfde gegevens.</p>
     <label>Koppelcode</label><input class="veld codeveld" id="kCode" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="12" placeholder="Bijv. K7MX4PQ2" value="${esc(L.koppelcode||'')}">
     <div class="fout" id="fout">${esc(fout)}</div>
     <button class="merkknop" data-a="koppelcode" ${db?'':'disabled'}>Koppelen</button>`
   :`<p class="merktekst">Voor de eigenaar of met de winkel-login. Log één keer in; daarna blijft dit toestel gekoppeld.</p>
     <label>E-mailadres</label><input class="veld" id="kMail" type="email" autocomplete="username" autocapitalize="off" placeholder="naam@voorbeeld.nl">
     <label>Wachtwoord</label><input class="veld" id="kWw" type="password" autocomplete="current-password">
     <div class="fout" id="fout">${esc(fout)}</div>
     <button class="merkknop" data-a="koppel" ${db?'':'disabled'}>Koppelen</button>
     ${L.uitnodiging?'<p style="margin-top:14px;text-align:center"><button class="merklink" data-a="koppeltab" data-v="code">Terug naar de uitnodiging</button></p>':''}`}
   <p style="margin-top:26px;text-align:center"><button class="merklink" data-a="lokaalmodus">Zonder koppeling gebruiken (alleen dit toestel)</button></p></div>`}
function uitnodigingHtml(fout){const f=L.uitForm||{};
  return`<div class="merkscherm">${merkKop('Brood Opzet','Welkom!')}
   <p class="merktekst">Je bent uitgenodigd om Brood Opzet te gebruiken. Vul je gegevens in. Je e-mailadres en wachtwoord gebruik je om je eigen telefoon te koppelen; medewerkers koppelen later met een koppelcode.</p>
   <label>Naam van je onderneming</label><input class="veld" id="uOnd" value="${esc(f.ond||'')}" placeholder="Bijv. Supermarkt Jansen B.V.">
   <label>Naam van de winkel</label><input class="veld" id="uWinkel" value="${esc(f.winkel||'')}" placeholder="Bijv. Coop Heemstede">
   <label>Plaats</label><input class="veld" id="uPlaats" value="${esc(f.plaats||'')}" placeholder="Bijv. Heemstede">
   <label>E-mailadres</label><input class="veld" id="uMail" type="email" autocomplete="username" autocapitalize="off" value="${esc(f.mail||'')}">
   <label>Kies een wachtwoord (minimaal 8 tekens)</label><input class="veld" id="uWw" type="password" autocomplete="new-password">
   <div class="fout" id="fout">${esc(fout)}</div>
   <button class="merkknop" data-a="uitnodigingstart" ${db?'':'disabled'}>Starten</button>
   <p class="hulp" style="text-align:center;margin-top:10px">Uitnodigingscode: <b>${esc(L.uitnodiging)}</b></p>
   <p style="margin-top:18px;text-align:center"><button class="merklink" data-a="koppeltab" data-v="mail">Ik heb al een account</button> · <button class="merklink" data-a="uitnodigingweg">Geen uitnodiging</button></p></div>`}
function winkelKiesHtml(){const l=WK.lijst||[];
  return`<div class="merkscherm">${merkKop('Brood Opzet','Kies de winkel')}
   <p class="merktekst">Welke winkel wil je op dit toestel openen? Wisselen kan later via Meer → Winkels.</p>
   <div class="winkelkies">${l.map(w=>`<button class="merkknop rand" data-a="winkelkies" data-v="${w.id}">${esc(w.naam)}${w.plaats&&!w.naam.toLowerCase().includes(w.plaats.toLowerCase())?` <small>${esc(w.plaats)}</small>`:''}</button>`).join('')}</div></div>`}
function foutTekst(e){const m=String(e?.message||e||'');
  if(/invalid login|invalid credentials/i.test(m))return'E-mailadres of wachtwoord klopt niet.';
  if(/email not confirmed/i.test(m))return'Bevestig eerst je e-mailadres via de mail die je hebt gekregen.';
  if(/already registered|already been registered/i.test(m))return'Dit e-mailadres heeft al een account. Gebruik je wachtwoord.';
  if(/password/i.test(m)&&/(6|8|short|weak)/i.test(m))return'Kies een langer wachtwoord (minimaal 8 tekens).';
  if(/klopt niet|verlopen|gebruikt/i.test(m))return m.replace(/^.*?(Deze)/,'$1');
  if(/anonymous/i.test(m))return'Koppelen met een code staat nog niet aan in Supabase (Anonymous sign-ins).';
  if(/fetch|network|failed/i.test(m))return'Geen verbinding. Controleer je internet.';
  return m||'Er ging iets mis.'}

/* ---- slotje: functie zit niet in het pakket ---- */
function openSlotFunctie(f){
  const kan=kanBeheren()&&isAdmin()&&WINKEL;
  toonSheet(`<div class="pkop"><span style="width:60px"></span><b>${SLOT} ${esc(FUNCTIE_NAAM[f]||f)}</b><button data-a="sluit" style="font-weight:700">Sluiten</button></div><div class="pinhoud">
   <div class="kaartje"><div class="sub">${esc(FUNCTIE_UITLEG[f]||'')}</div><div class="sub" style="margin-top:8px">Deze functie zit in het pakket <b>${pakketVoor(f)}</b>. Je winkel heeft nu <b>${PAKKET_NAAM[WINKEL?.pakket]||'Basis'}</b>.</div></div>
   ${kan?`<div class="knoppen"><button class="knop" data-a="functievraag" data-v="${f}">Aanvragen</button></div><p class="hulp" style="text-align:center">Na je aanvraag nemen we contact met je op. Er verandert nog niets.</p>`:'<p class="hulp" style="text-align:center">Vraag de beheerder als je deze functie wilt gebruiken.</p>'}</div>`)}

/* ---- balk bovenin: winkel op slot of opgezegd ---- */
function winkelBalk(){if(!WINKEL||L.modus==='lokaal')return'';
  if(WINKEL.slot)return`<div class="winkelbalk rood">🔒 Deze winkel staat op slot. Je kunt alles bekijken, maar niets wijzigen. ${isAdmin()?'Neem contact op met Brood Opzet.':'Vraag de beheerder.'}</div>`;
  if(WINKEL.status==='opgezegd'&&isAdmin())return`<div class="winkelbalk">Het abonnement is opgezegd. Op ${esc(wisDatum())} worden alle gegevens gewist. <button class="link" data-a="sub" data-v="abonnement">Gegevens exporteren</button></div>`;
  return''}
const opSlot=()=>!!(WINKEL&&WINKEL.slot&&L.modus!=='lokaal');

/* ---- Abonnement ---- */
function abonnementHtml(){const w=WINKEL,f=w?.functies||[],proef=w?.proef_pakket&&w.proef_tot&&w.proef_tot>=iso();
  const rij=k=>`<div class="rij inv"><div class="nieuwsicoon">${f.includes(k)?'✓':SLOT}</div><div class="groei"><div class="naam">${esc(FUNCTIE_NAAM[k])}</div><div class="sub">${esc(FUNCTIE_UITLEG[k])}${!f.includes(k)?` <i>(${pakketVoor(k)})</i>`:''}</div></div>${f.includes(k)?'':`<button class="knop rand klein" data-a="functievraag" data-v="${k}">Aanvragen</button>`}</div>`;
  return`<div class="kop"><div class="koprij"><h1>Abonnement</h1></div><p>${esc(w.naam)}${w.ondernemer_naam?' · '+esc(w.ondernemer_naam):''}</p></div>
   <div class="cijfers"><div class="cijfer"><b>${PAKKET_NAAM[w.pakket]||w.pakket}</b><span>pakket</span></div>${proef?`<div class="cijfer"><b>${PAKKET_NAAM[w.proef_pakket]}</b><span>proef t/m ${esc(datumTekst(w.proef_tot))}</span></div>`:''}</div>
   ${proef?`<div class="kaartje"><h3>Proefperiode</h3><div class="sub">Je probeert <b>${PAKKET_NAAM[w.proef_pakket]}</b> tot en met ${esc(datumNL(w.proef_tot))}. Daarna gaat de winkel terug naar ${PAKKET_NAAM[w.pakket]}, tenzij je het pakket aanvraagt.</div></div>`:''}
   <div class="sectie"><div class="karkop"><b>Functies</b><span>Basis zit er altijd in</span></div>${Object.keys(FUNCTIE_NAAM).map(rij).join('')}</div>
   ${isEigenaar()?`<div class="kaartje"><h3>Alle gegevens exporteren</h3><div class="sub">Eén Excel-bestand met broodsoorten, planning, klaargezet, derving en leveringen van deze winkel.</div><div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:8px"><button class="knop rand klein" data-a="exportalles">Exporteren</button></div></div>
   ${w.status==='opgezegd'?`<div class="kaartje waarschuw"><h3>Opgezegd</h3><div class="sub">Opgezegd op ${esc(datumNL(w.opgezegd_op))}. Op ${esc(wisDatum())} worden alle gegevens van ${esc(w.ondernemer_naam||'je onderneming')} gewist. Bedacht? Neem contact op, dan zetten we het terug.</div></div>`
   :`<div class="kaartje"><h3>Opzeggen</h3><div class="sub">Na het opzeggen blijven de gegevens nog 60 dagen bewaard, zodat je ze kunt exporteren. Daarna worden alle winkels van ${esc(w.ondernemer_naam||'je onderneming')} gewist.</div><div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:8px"><button class="knop rand klein rood" data-a="opzeggen">${afwStap==='opzeggen'?'Weet je het zeker? Tik nogmaals':'Abonnement opzeggen'}</button></div></div>`}`:''}`}
async function exportAlles(){
  if(!window.XLSX){toast('Excel-onderdeel laden…');try{await laadXlsx()}catch(e){toast('Excel kon niet laden, controleer je internet');return}}
  const wb=XLSX.utils.book_new(),blad=(r,n)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(r),n);
  blad([['Soort','Type','Kar','PLU','PLU half','Programma','Min','Max','Per doos'],...S.soorten.filter(s=>s.naam.trim()).map(s=>[s.naam,s.type,karNaam(effKar(s)),s.plu||'',s.pluHalf||'',s.programma||'',s.min??'',s.max??'',s.perDoos??''])],'Broodsoorten');
  blad([['Soort','Kar',...DAGEN.map(d=>d[2])],...S.soorten.filter(s=>s.naam.trim()).map(s=>[s.naam,karNaam(effKar(s)),...DAGEN.map(([k])=>dagTotaal(k,s))])],'Planning');
  const dagen=[...new Set([...Object.keys(S.historie),...Object.keys(S.derving)])].sort(),dr=[['Datum','Soort','Opgezet','Over','Weggegooid','Voedselbank','Too Good To Go']];
  for(const d of dagen)for(const s of S.soorten){const g=S.historie[d]?.gezet?.[s.id]||0,x=dervDetail(d,s.id);if(!g&&!x)continue;dr.push([d,s.naam,g,x?x.weg+x.vb+x.tg:'',x?.weg??'',x?.vb??'',x?.tg??''])}
  blad(dr,'Klaargezet en derving');
  const lr=[['Datum','Soort','Pakbon','Geteld']];for(const d of Object.keys(S.levering).sort()){const lv=S.levering[d];if(!lv)continue;for(const id of new Set([...Object.keys(lv.pakbon||{}),...Object.keys(lv.items||{})]))lr.push([d,S.soorten.find(s=>s.id===id)?.naam||id,lv.pakbon?.[id]??'',lv.items?.[id]??''])}
  blad(lr,'Leveringen');
  const blob=new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  await deelBestand(new File([blob],`brood-opzet-${(winkelNaam()).toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${iso()}.xlsx`,{type:blob.type}));log('Alle gegevens geëxporteerd')}
async function deelBestand(f){
  try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:f.name});return}}catch(e){if(e&&e.name==='AbortError')return;if(e&&e.name==='NotAllowedError'){toast('Tik nog een keer');return}}
  try{const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000);toast('Bestand gedownload')}catch(e){toast('Delen lukt niet op dit toestel')}}

/* ---- Winkels (eigenaar) en Winkel (bedrijfsleider): toestellen koppelen, wisselen, overzicht ---- */
async function laadWinkelInfo(){const w=WINKEL?.id;if(!w||!db?.rpc)return;wkInfo={...(wkInfo||{}),laden:true};
  try{const[code,toe]=await Promise.all([db.rpc('mijn_koppelcode',{w}),db.rpc('toestellen',{w})]);wkInfo={...wkInfo,code,toe:toe||[],fout:'',laden:false}}
  catch(e){wkInfo={...wkInfo,fout:foutTekst(e),laden:false}}render()}
async function vernieuwWinkels(){try{const l=await db.rpc('mijn_winkels');if(Array.isArray(l)){WK.lijst=l;WINKEL=l.find(x=>x.id===WK.id)||WINKEL;bewaarWK()}}catch(e){}}
function codeTekst(c){return String(c||'').replace(/^(.{4})(.+)$/,'$1 $2')}
function toestellenHtml(){const w=WINKEL,i=wkInfo||{};if(!i.toe&&!i.laden&&!i.fout){laadWinkelInfo()}
  const code=i.code;
  return`<div class="kaartje"><h3>📱 Toestellen koppelen</h3><div class="sub">Medewerkerstelefoons en de winkeltelefoon koppel je met deze code. Open Brood Opzet op het toestel, kies <b>Met koppelcode</b> en vul hem in.</div>
    ${i.laden&&!i.toe?'<div class="sub" style="margin-top:8px">Ophalen…</div>':i.fout?`<div class="sub rood" style="margin-top:8px">${esc(i.fout)}</div>`:code?`<div class="koppelcode">${esc(codeTekst(code.code))}</div><div class="sub" style="text-align:center">Geldig tot ${esc(datumNL(code.verloopt))} · vaker te gebruiken</div>
     <div class="knoppen" style="padding:0;margin-top:10px;flex-wrap:wrap"><button class="knop klein" data-a="codedeel">Delen</button><button class="knop rand klein" data-a="codenieuw">${afwStap==='codenieuw'?'Zeker? Oude code vervalt':'Nieuwe code'}</button></div>`
     :`<div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:10px"><button class="knop klein" data-a="codenieuw">Koppelcode maken</button></div>`}</div>
   ${i.toe?`<div class="sectie"><div class="karkop"><b>Gekoppelde toestellen</b><span>${i.toe.length}</span></div>${i.toe.map(t=>`<div class="rij inv"><div class="groei"><div class="naam">${t.ik?'⭐ ':''}${esc(t.toestel||t.email||'Toestel')}</div><div class="sub">${{eigenaar:'Eigenaar',bedrijfsleider:'Bedrijfsleider',winkel:'Winkel'}[t.rol]||t.rol}${t.email?' · '+esc(t.email):' · met koppelcode'} · sinds ${esc(datumTekst(String(t.gemaakt).slice(0,10)))}${t.ik?' · dit toestel':''}</div></div>${t.ik||(t.rol==='bedrijfsleider'&&!isEigenaar())?'':`<button class="knop rand klein rood" data-a="toestelweg" data-v="${t.id}">${afwStap==='toestelweg:'+t.id?'Zeker?':'Loskoppelen'}</button>`}</div>`).join('')||'<p class="leeg">Nog geen toestellen.</p>'}</div>
    <p class="hulp" style="margin:6px 20px 12px">Een losgekoppeld toestel wordt bij de volgende keer openen helemaal leeggemaakt.</p>`:''}
   ${isEigenaar()?`<div class="kaartje"><h3>👔 Bedrijfsleider toevoegen</h3><div class="sub">Een bedrijfsleider kan alles in deze winkel, maar ziet je andere winkels en het abonnement niet. De code is 24 uur geldig en werkt één keer.</div>
     ${i.blCode?`<div class="koppelcode">${esc(codeTekst(i.blCode))}</div><div class="knoppen" style="padding:0;margin-top:8px"><button class="knop klein" data-a="bldeel">Delen</button></div>`:`<div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:8px"><button class="knop rand klein" data-a="blcode">Code maken</button></div>`}</div>`:''}`}
function winkelHtml(){return`<div class="kop"><div class="koprij"><h1>Winkel</h1></div><p>${esc(winkelNaam())}</p></div>${toestellenHtml()}`}
let ovWeek=null,ovData=null;
function winkelsHtml(){const l=WK.lijst||[];
  return`<div class="kop"><div class="koprij"><h1>Winkels</h1></div><p>${esc(WINKEL?.ondernemer_naam||'')}</p></div>
   <div class="sectie">${l.map(w=>`<div class="rij inv"><div class="nieuwsicoon">🏪</div><div class="groei"><div class="naam">${esc(w.naam)}</div><div class="sub">${esc(w.plaats||'')}${w.plaats?' · ':''}${PAKKET_NAAM[w.pakket]||w.pakket}${w.slot?' · 🔒 op slot':''}</div></div>${w.id===WK.id?'<span class="chip aan">Open</span>':`<button class="knop rand klein" data-a="winkelwissel" data-v="${w.id}">Openen</button>`}</div>`).join('')}
    <button class="toevoegen" data-a="winkelnieuw">+ Nieuwe winkel</button></div>
   <h2 class="tussenkop">Deze winkel: ${esc(winkelNaam())}</h2>${toestellenHtml()}
   ${l.length>1?overzichtHtml():''}`}
function openNieuweWinkel(){const l=WK.lijst||[];
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Nieuwe winkel</b><button data-a="winkelmaak" style="font-weight:700">Maken</button></div><div class="pinhoud">
   <label>Naam van de winkel</label><input class="veld" id="nwNaam" placeholder="Bijv. Coop Bennebroek">
   <label>Plaats</label><input class="veld" id="nwPlaats" placeholder="Bijv. Bennebroek">
   <label>Beginnen met</label><select class="veld" id="nwKopie"><option value="">Een lege winkel</option>${l.filter(w=>w.rol==='eigenaar').map(w=>`<option value="${w.id}" ${w.id===WK.id?'selected':''}>Kopie van ${esc(w.naam)}</option>`).join('')}</select>
   <p class="hulp">Een kopie neemt de broodsoorten, karren, foto's, planning, afwijkende dagen en de materiaallijst over. Medewerkers, derving en leveringen niet.</p>
   <p class="hulp">De nieuwe winkel krijgt eerst het pakket Basis. Wil je meer? Vraag het aan bij Abonnement.</p><div class="fout" id="fout"></div></div>`)}
/* overzicht van alle winkels: derving, verschillen met de bakker, gebruik */
function cijfersUit(rows,van){const oud=S;try{S=leegS();for(const r of rows)pasToe(r.sleutel,r.waarde);const c=weekCijfers(van);
  c.gebruik=c.dagen.filter(d=>S.derving[d]&&Object.keys(S.derving[d]).length).length;c.levDagen=c.dagen.filter(d=>S.levering[d]).length;c.prijzen=Object.keys(S.prijzen).length>0;return c}finally{S=oud}}
function eigenCijfers(van){const c=weekCijfers(van);c.gebruik=c.dagen.filter(d=>S.derving[d]&&Object.keys(S.derving[d]).length).length;c.levDagen=c.dagen.filter(d=>S.levering[d]).length;c.prijzen=Object.keys(S.prijzen).length>0;return c}
async function laadOverzicht(){const van=ovWeek,l=WK.lijst||[],sl=['instellingen','prive:prijzen',...[...Array(7)].map((_,i)=>'dag:'+plusDagen(van,i))];ovData={van,laden:true,per:{}};
  await Promise.all(l.map(async w=>{try{ovData.per[w.id]=w.id===WK.id?eigenCijfers(van):cijfersUit(await db.lees(w.id,sl),van)}catch(e){ovData.per[w.id]={fout:true}}}));
  if(ovData.van===van){ovData.laden=false;render()}}
function overzichtHtml(){if(!ovWeek)ovWeek=plusDagen(maandag(iso()),-7);if(!ovData||ovData.van!==ovWeek)setTimeout(laadOverzicht,0);
  const l=WK.lijst||[],per=ovData?.van===ovWeek?ovData.per:{};
  return`<h2 class="tussenkop">Overzicht alle winkels</h2>
   <div class="datumnav"><button class="pijlk" data-a="ovweek" data-v="-7">‹</button><button class="dlabel" data-a="ovweek" data-v="0">Week ${weeknr(ovWeek)}<small>${esc(datumTekst(ovWeek))} t/m ${esc(datumTekst(plusDagen(ovWeek,6)))}</small></button><button class="pijlk" data-a="ovweek" data-v="7">›</button></div>
   <div class="sectie">${l.map(w=>{const c=per[w.id];return`<div class="rij inv"><div class="groei"><div class="naam">${esc(w.naam)}</div><div class="sub">${!c?'Ophalen…':c.fout?'Ophalen lukte niet':`Derving <b>${c.gezet?Math.round(c.over/c.gezet*100)+'%':'–'}</b> · ${fmt(c.over)} stuks${c.prijzen?` · <b>${euro2(c.eur)}</b>`:''}<br>Verschil met de bakker: ${c.versch.length?`<b>${c.versch.length} ${c.versch.length===1?'dag':'dagen'}</b>`:'geen'} · Derving ingevuld: ${c.gebruik} van 7 dagen · Leveringen: ${c.levDagen}`}</div></div></div>`}).join('')}</div>
   <p class="hulp" style="margin:6px 20px 12px">Derving in euro's zie je alleen bij winkels met inkoopprijzen.</p>`}

/* ---- Brood Opzet beheer (alleen voor de aanbieder) ---- */
async function laadAanbieder(stil){try{aanb=await db.rpc('aanbieder_overzicht');aanbFout='';L.aanvragen=(aanb?.aanvragen||[]).length;bewaarL()}catch(e){aanbFout=foutTekst(e)}if(!stil||sub==='aanbieder')render()}
function aanbiederHtml(){if(!aanb&&!aanbFout){laadAanbieder();return`<div class="kop"><div class="koprij"><h1>Brood Opzet beheer</h1></div></div><p class="leeg">Ophalen…</p>`}
  const o=aanb?.ondernemers||[],u=aanb?.uitnodigingen||[],a=aanb?.aanvragen||[],nW=o.reduce((t,x)=>t+(x.winkels||[]).length,0);
  return`<div class="kop"><div class="koprij"><h1>Brood Opzet beheer</h1></div><p>${o.length} ${o.length===1?'ondernemer':'ondernemers'} · ${nW} ${nW===1?'winkel':'winkels'}</p></div>
   ${aanbFout?`<div class="kaartje waarschuw"><b>Ophalen lukte niet</b><div class="sub">${esc(aanbFout)}</div></div>`:''}
   ${a.length?`<div class="sectie"><div class="karkop"><b>Aanvragen</b><span>${a.length}</span></div>${a.map(x=>`<div class="rij inv"><div class="groei"><div class="naam">${esc(x.winkel||'?')}: ${esc(FUNCTIE_NAAM[x.functie]||x.functie)}</div><div class="sub">${esc(x.door||'')} · ${esc(datumNL(x.gemaakt))}</div></div><button class="knop rand klein" data-a="aanvraagklaar" data-v="${x.id}">Afgehandeld</button></div>`).join('')}</div>`:''}
   <div class="knoppen"><button class="knop" data-a="uitnodigingnieuw">+ Nieuwe ondernemer uitnodigen</button></div>
   ${u.length?`<div class="sectie"><div class="karkop"><b>Openstaande uitnodigingen</b><span>${u.length}</span></div>${u.map(x=>`<div class="rij inv"><div class="groei"><div class="naam">${esc(x.code)}</div><div class="sub">${PAKKET_NAAM[x.pakket]||x.pakket}${x.proef_pakket?` · ${x.proef_dagen} dagen ${PAKKET_NAAM[x.proef_pakket]} proberen`:''}${x.notitie?' · '+esc(x.notitie):''} · geldig tot ${esc(datumNL(x.verloopt))}</div></div><button class="knop klein" data-a="uitnodigingdeel" data-v="${esc(x.code)}">Delen</button><button class="knop rand klein rood" data-a="uitnodigingverw" data-v="${esc(x.code)}">${afwStap==='uitn:'+x.code?'Zeker?':'×'}</button></div>`).join('')}</div>`:''}
   ${o.map(x=>`<div class="sectie"><div class="karkop"><b>${esc(x.naam)}</b><span>${x.status==='opgezegd'?'opgezegd':esc((x.eigenaren||[]).join(', '))}</span></div>
     ${x.id!==WINKEL?.ondernemer?`<div class="rij inv"><div class="groei"><div class="sub">${(x.winkels||[]).length} ${(x.winkels||[]).length===1?'winkel':'winkels'} · sinds ${esc(datumNL(x.gemaakt))}</div></div><button class="knop rand klein rood" data-a="ondweg" data-v="${x.id}">Verwijderen</button></div>`:''}
     ${x.status==='opgezegd'?`<div class="rij inv"><div class="groei"><div class="sub">Opgezegd op ${esc(datumNL(x.opgezegd_op))} · wordt gewist op ${esc(datumNL(new Date(Date.parse(x.opgezegd_op)+60*864e5).toISOString()))}</div></div><button class="knop rand klein" data-a="opzegterug" data-v="${x.id}">Terugdraaien</button></div>`:''}
     ${(x.winkels||[]).map(w=>`<div class="rij"><button class="regel" data-a="aanbwinkel" data-v="${w.id}"><div class="groei"><div class="naam">${w.slot?'🔒 ':''}${esc(w.naam)}</div><div class="sub">${PAKKET_NAAM[w.pakket]||w.pakket}${(w.extra||[]).length?' + '+w.extra.map(f=>FUNCTIE_NAAM[f]||f).join(', '):''}${w.proef_pakket&&w.proef_tot?` · proef ${PAKKET_NAAM[w.proef_pakket]} t/m ${esc(datumTekst(w.proef_tot))}`:''} · ${w.toestellen} ${w.toestellen===1?'toestel':'toestellen'} · ${w.laatst_gebruikt?'gebruikt '+esc(datumTekst(String(w.laatst_gebruikt).slice(0,10))):'nog niet gebruikt'}${w.notitie?'<br>'+esc(w.notitie):''}</div></div><span class="pijl">›</span></button></div>`).join('')}</div>`).join('')}`}
function aanbWinkel(id){for(const o of aanb?.ondernemers||[])for(const w of o.winkels||[])if(w.id===id)return w;return null}
function openAanbWinkel(id){const w=aanbWinkel(id);if(!w)return;bewerk={soort:'aanbwinkel',id,pakket:w.pakket,extra:[...(w.extra||[])],proef:w.proef_pakket||'',slot:!!w.slot};toonAanbWinkel()}
function toonAanbWinkel(){const w=aanbWinkel(bewerk.id),b=bewerk;
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>${esc(w.naam)}</b><button data-a="aanbopslaan" style="font-weight:700">Opslaan</button></div><div class="pinhoud">
   <label>Pakket</label><div class="chips">${Object.keys(PAKKETTEN).map(p=>`<button class="chip ${b.pakket===p?'aan':''}" data-a="aanbpakket" data-v="${p}">${PAKKET_NAAM[p]}</button>`).join('')}</div>
   <label>Losse functies erbij</label><div class="chips">${Object.keys(FUNCTIE_NAAM).filter(f=>!PAKKETTEN[b.pakket].includes(f)).map(f=>`<button class="chip ${b.extra.includes(f)?'aan':''}" data-a="aanbextra" data-v="${f}">${esc(FUNCTIE_NAAM[f])}</button>`).join('')||'<span class="hulp" style="margin:0">Alles zit al in het pakket.</span>'}</div>
   <label>Proberen</label><div class="chips"><button class="chip ${!b.proef?'aan':''}" data-a="aanbproef" data-v="">Geen</button>${['plus','compleet'].map(p=>`<button class="chip ${b.proef===p?'aan':''}" data-a="aanbproef" data-v="${p}">${PAKKET_NAAM[p]}</button>`).join('')}</div>
   <div id="aanbProefTot" style="${b.proef?'':'display:none'}"><label>Proef tot en met</label><input class="veld" type="date" id="aProefTot" value="${esc(w.proef_tot||plusDagen(iso(),30))}" style="width:180px"></div>
   <label class="schakel" style="margin-top:14px">Winkel op slot (alleen lezen)<input type="checkbox" id="aSlot" ${b.slot?'checked':''}></label>
   <label>Notitie (alleen voor jou)</label><input class="veld" id="aNotitie" value="${esc(w.notitie||'')}"><div class="fout" id="fout"></div></div>`)}
function openUitnodiging(){bewerk={soort:'uitnodiging',pakket:'basis',proef:'plus',dagen:30};toonUitnodiging()}
function toonUitnodiging(){const b=bewerk;
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Uitnodiging</b><button data-a="uitnodigingmaak" style="font-weight:700">Maken</button></div><div class="pinhoud">
   <label>Pakket</label><div class="chips">${Object.keys(PAKKETTEN).map(p=>`<button class="chip ${b.pakket===p?'aan':''}" data-a="uitnpakket" data-v="${p}">${PAKKET_NAAM[p]}</button>`).join('')}</div>
   <label>Eerst gratis proberen</label><div class="chips"><button class="chip ${!b.proef?'aan':''}" data-a="uitnproef" data-v="">Nee</button>${['plus','compleet'].filter(p=>p!==b.pakket&&!(b.pakket==='compleet')).map(p=>`<button class="chip ${b.proef===p?'aan':''}" data-a="uitnproef" data-v="${p}">${PAKKET_NAAM[p]}</button>`).join('')}</div>
   ${b.proef?`<label>Hoe lang</label><div class="chips">${[14,30,60].map(d=>`<button class="chip ${b.dagen===d?'aan':''}" data-a="uitndagen" data-v="${d}">${d} dagen</button>`).join('')}</div>`:''}
   <label>Notitie (bijv. naam ondernemer)</label><input class="veld" id="uNotitie">
   <p class="hulp">Je krijgt een link om te delen. De link is 30 dagen geldig en werkt één keer. De ondernemer maakt daarmee zelf een account en zijn eerste winkel aan; die begint leeg.</p><div class="fout" id="fout"></div></div>`)}
const uitnLink=c=>appUrl()+'?uitnodiging='+encodeURIComponent(c);
function toonUitnLink(c){if(!window.qrcode)laadQr().then(()=>{if(document.getElementById('uitnLink')?.dataset.c===c)toonUitnLink(c)}).catch(()=>{});
  toonSheet(`<div class="pkop"><span style="width:60px"></span><b>Uitnodiging klaar</b><button data-a="sluit" style="font-weight:700">Klaar</button></div><div class="pinhoud">
  ${window.qrcode?`<div class="qrvak">${qrSvg(uitnLink(c),5)}</div>`:''}<div class="koppelcode">${esc(c)}</div><p class="sub" id="uitnLink" data-c="${esc(c)}" style="text-align:center;word-break:break-all">${esc(uitnLink(c))}</p>
  <div class="knoppen"><button class="knop" data-a="uitnodigingdeel" data-v="${esc(c)}">Delen</button></div></div>`)}
const uitnTekst=c=>`Je bent uitgenodigd voor Brood Opzet, de app voor de broodafdeling.\n\nOpen deze link op je telefoon en vul je gegevens in:\n${uitnLink(c)}\n\nLukt de link niet? Open ${appUrl()} en gebruik code ${c}.`;
const codeDeelTekst=c=>`Brood Opzet koppelen voor ${winkelNaam()}:\n1. Open ${appUrl()} en zet de app op je beginscherm.\n2. Open de app en kies "Met koppelcode".\n3. Vul deze code in: ${codeTekst(c)}\nDaarna kies je je naam en vul je je pincode in.`;
