/* ================= 9.13: gebruiksgemak ================= */
/* slimme startpagina: ochtend Klaarzetten, na de levertijd naar de levering, 's avonds Derving */
function startTab(P){const st=P.startp||'home';if(st!=='slim')return st;const h=new Date().getHours();if(mag('derving')&&h>=(P.dervUur??17))return'derving';return'lijst'}
function naarLevering(){const h=S.herinnering||{},nu=new Date(),na=nu.getHours()*60+nu.getMinutes()>=(h.uur??10)*60+(h.min||0);
  if(tab==='lijst'&&mag('vinken')&&datum===iso()&&na&&versGeleverd(iso())&&!S.levering[iso()]&&S.soorten.some(x=>x.type==='vers'&&x.naam.trim()))setTimeout(()=>document.querySelector('.levmelding')?.scrollIntoView({block:'center',behavior:'smooth'}),350)}
/* groot cijferblok + doortellen (levering en derving) */
let blok=null;
function blokVelden(){return[...document.querySelectorAll('input[data-blok]')]}
function blokSleutel(el){return el.id?'#'+el.id:el.dataset.cderv?`[data-cderv="${el.dataset.cderv}"]`:null}
function openBlok(el){const k=blokSleutel(el);if(!k)return;blok={k,nieuw:true};toonBlok();setTimeout(terugBewaak,0)}
function blokEl(){return blok&&document.querySelector(blok.k)}
function toonBlok(){const el=blokEl();if(!el){sluitBlok();return}const rij=el.closest('.rij'),naam=rij?.querySelector('.naam')?.textContent||'',sub=rij?.querySelector('.sub')?.textContent||'',l=blokVelden(),i=l.indexOf(el);
  document.querySelectorAll('.blokactief').forEach(x=>x.classList.remove('blokactief'));rij?.classList.add('blokactief');rij?.scrollIntoView({block:'center',behavior:'smooth'});
  const o=document.getElementById('cijferblok2');o.innerHTML=`<div class="cb2kop"><div><b>${esc(naam)}</b><small>${esc(sub)}</small></div><span class="cb2nr">${i+1} / ${l.length}</span></div>
   <div class="cb2waarde">${esc(el.value||'')}<span class="cb2ph">${el.value?'':esc(el.placeholder||'–')}</span></div>
   <div class="cb2toetsen">${[1,2,3,4,5,6,7,8,9].map(n=>`<button data-cb="${n}">${n}</button>`).join('')}<button data-cb="leeg" class="cb2klein">Leeg</button><button data-cb="0">0</button><button data-cb="wis" class="cb2klein">⌫</button></div>
   <div class="cb2acties"><button data-cb="klaar" class="cb2rand">Klaar</button><button data-cb="volgende" class="cb2hoofd">${i<l.length-1?'Volgende ›':'Klaar ✓'}</button></div>`;
  o.classList.add('open')}
function sluitBlok(){blok=null;document.getElementById('cijferblok2')?.classList.remove('open');document.querySelectorAll('.blokactief').forEach(x=>x.classList.remove('blokactief'))}
function blokZet(w){const el=blokEl();if(!el)return;el.value=w;el.dispatchEvent(new Event('input',{bubbles:true}))}
function blokToets(t){const el=blokEl();if(!el){sluitBlok();return}let w=el.value||'';
  if(/^\d$/.test(t)){w=blok.nieuw?t:(w+t).slice(0,3);if(w.length>1)w=w.replace(/^0+(?=\d)/,'');blok.nieuw=false;blokZet(w);toonBlok();return}
  if(t==='wis'){blok.nieuw=false;blokZet(w.slice(0,-1));toonBlok();return}
  if(t==='leeg'){blok.nieuw=false;blokZet('');toonBlok();return}
  const derv=!!el.dataset.cderv;
  if(t==='klaar'){sluitBlok();if(derv)render();return}
  if(t==='volgende'){const l=blokVelden(),i=l.indexOf(el),vg=l[i+1],k=vg?blokSleutel(vg):null;if(derv)render();
    if(!k){sluitBlok();return}blok={k,nieuw:true};toonBlok()}}
document.addEventListener('click',e=>{const t=e.target.closest('[data-cb]');if(t){e.stopPropagation();blokToets(t.dataset.cb);return}
  const el=e.target.closest('input[data-blok]');if(el){e.stopPropagation();openBlok(el);return}if(blok&&!e.target.closest('#cijferblok2')){const derv=!!blokEl()?.dataset.cderv;sluitBlok();if(derv)render()}},true);
/* vegen: rechts = afvinken, links = terugzetten */
let veeg=null;
document.addEventListener('touchstart',e=>{const r=e.target.closest('.regel[data-a="vink"]');if(!r||e.touches.length>1||ovenModus||!mag('vinken')){veeg=null;return}const t=e.touches[0];veeg={r,x:t.clientX,y:t.clientY,dx:0,horiz:false}},{passive:true});
document.addEventListener('touchmove',e=>{if(!veeg)return;const t=e.touches[0],dx=t.clientX-veeg.x,dy=t.clientY-veeg.y;
  if(!veeg.horiz){if(Math.abs(dy)>14){veeg=null;return}if(Math.abs(dx)<14)return;veeg.horiz=true;veeg.r.classList.add('veegt')}
  veeg.dx=dx;veeg.r.style.transform=`translateX(${Math.max(-110,Math.min(110,dx))}px)`;const kl=veeg.r.classList.contains('klaar');veeg.r.classList.toggle('veegaan',dx>70&&!kl);veeg.r.classList.toggle('veeguit',dx<-70&&kl)},{passive:true});
document.addEventListener('touchend',()=>{if(!veeg)return;const{r,dx,horiz}=veeg;veeg=null;r.style.transform='';r.classList.remove('veegaan','veeguit','veegt');if(!horiz||Math.abs(dx)<70)return;
  const kl=r.classList.contains('klaar');if((dx>0&&!kl)||(dx<0&&kl)){const vk=r.querySelector('.vinkvak');if(vk){laatsteScroll=0;vk.click()}}});

/* ================= 9.15: Android ================= */
const IS_ANDROID=/Android/i.test(navigator.userAgent)||!!window.__ANDROID_TEST__;
const IS_STANDALONE=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
document.documentElement.classList.toggle('android',IS_ANDROID);
const INSTALL_IPHONE=['Open de link (of scan de QR-code) met Safari.','Tik onderaan op de deelknop (vierkantje met pijl omhoog).','Kies "Zet op beginscherm" en tik op "Voeg toe".'];
const INSTALL_ANDROID=['Open de link (of scan de QR-code) met Chrome.','Tik rechtsboven op de drie puntjes.','Kies "App installeren" of "Toevoegen aan startscherm".'];
const INSTALL_SLOT='Open Brood Opzet vanaf je beginscherm. Eerste keer op dit toestel? Vul de koppelcode van de winkel in (vraag de beheerder). Kies daarna je naam, vul de tijdelijke pincode in en kies je eigen pincode.';
const pushNietTekst=()=>IS_ANDROID?'Dit werkt als Brood Opzet als app op je beginscherm staat (via Chrome → drie puntjes → App installeren).':'Dit werkt alleen als Brood Opzet op het beginscherm staat, op iOS 16.4 of nieuwer.';
const pushGeweigerdTekst=()=>IS_ANDROID?'Meldingen zijn geweigerd. Zet ze aan via Instellingen → Apps → Brood Opzet (of Chrome) → Meldingen.':'Meldingen zijn geweigerd. Zet ze aan via Instellingen → Meldingen → Brood Opzet.';
/* installeren op Android: Chrome geeft een installatievraag die we op een knop zetten */
let installVraag=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installVraag=e;try{render()}catch(x){}});
window.addEventListener('appinstalled',()=>{installVraag=null;toast('Brood Opzet staat op je beginscherm');try{render()}catch(x){}});
const installHtml=()=>installVraag&&!IS_STANDALONE()?`<div class="kaartje installkaart"><b>📲 Zet Brood Opzet op je beginscherm</b><div class="sub">Dan open je de app met één tik, net als een gewone app, en werken meldingen.</div><div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:8px"><button class="knop klein" data-a="installeer">Op beginscherm zetten</button></div></div>`:'';
async function installeer(){if(!installVraag)return;installVraag.prompt();try{await installVraag.userChoice}catch(e){}installVraag=null;render()}
/* trillen bij afvinken (alleen Android, keuze in App-instellingen) */
const kanTrillen=()=>IS_ANDROID&&typeof navigator.vibrate==='function';
function tril(){try{if(kanTrillen()&&prof().tril)navigator.vibrate(30)}catch(e){}}
/* terugknop van Android: eerst venster dicht, dan terug naar Meer/Klaarzetten, pas dan de app uit */
let terugWacht=false;
function opDiepte(){return!!(blok||document.getElementById('sheet')?.classList.contains('open')||werk||document.getElementById('tour')?.classList.contains('open')||sub||(L.sessie&&tab!=='home'))}
function terugBewaak(){if(!IS_ANDROID||terugWacht||!L.sessie)return;if(opDiepte()){try{history.pushState({bo:1},'');terugWacht=true}catch(e){}}}
function terugStap(){
  if(blok){const derv=!!blokEl()?.dataset.cderv;sluitBlok();if(derv)render();return true}
  if(document.getElementById('tour')?.classList.contains('open'))return false;
  if(document.getElementById('sheet')?.classList.contains('open')){sluit();render();return true}
  if(werk){werk=null;document.getElementById('werk').classList.remove('open');render();return true}
  if(sub){sub=null;render();plekTerug();return true}
  if(tab==='uren'&&urenView!=='klok'){urenView='klok';render();plekTerug();return true}
  if(tab!=='home'){plekBewaar();tab='home';render();plekTerug();return true}
  return false}
window.addEventListener('popstate',()=>{if(!IS_ANDROID)return;const was=terugWacht;terugWacht=false;if(!was)return;if(terugStap())setTimeout(terugBewaak,0);else history.back()});
/* iPhone: na sluiten toetsenbord blijft het scherm verschoven, tikken komt dan te laag → terugzetten */
function schermTerug(){if(scrollY||document.documentElement.scrollTop||document.body.scrollTop)scrollTo(0,0)}
document.addEventListener('focusout',()=>setTimeout(()=>{const a=document.activeElement;if(!a||!a.matches('input,textarea,select'))schermTerug()},80));
/* toetsenbord open: menubalk onderin verbergen (Android) */
document.addEventListener('focusin',e=>{if(IS_ANDROID&&e.target.matches('input:not([readonly]):not([type=checkbox]):not([type=radio]):not([type=file]),textarea'))document.body.classList.add('toetsenbord')});
document.addEventListener('focusout',()=>{if(IS_ANDROID)setTimeout(()=>{const a=document.activeElement;if(!a||!a.matches('input:not([readonly]),textarea'))document.body.classList.remove('toetsenbord')},120)});

/* ================= 9.17: versie en bijwerken ================= */
let nieuweBouw=null,updateBezig=false;
const kanUpdaten=()=>location.protocol.startsWith('http')&&'serviceWorker'in navigator&&!!navigator.serviceWorker.controller;
async function zoekUpdate(stil){if(!kanUpdaten()||!navigator.onLine)return null;
  try{const t=await (await fetch('index.html?v='+Date.now(),{cache:'no-store'})).text(),m=t.match(/APP_BOUW='([^']+)'/);const b=m?m[1]:null;
    nieuweBouw=b&&b!==APP_BOUW?b:null;toonUpdateBalk();return nieuweBouw}catch(e){return null}}
function toonUpdateBalk(){let el=document.getElementById('updatebalk');if(!nieuweBouw||!updatesTonen()){if(el)el.remove();return}
  if(!el){el=document.createElement('button');el.id='updatebalk';el.className='updatebalk';el.dataset.a='bijwerken';document.getElementById('app')?.prepend(el)}
  el.textContent=`🔄 Nieuwe versie ${nieuweBouw} beschikbaar – tik om bij te werken`}
async function werkBij(stil){if(updateBezig)return;updateBezig=true;if(!stil)toast('Bijwerken…');bewaarNu();
  try{const reg=await navigator.serviceWorker.getRegistration();if(reg){await reg.update();const w=reg.installing||reg.waiting;
      if(w&&w.state!=='activated')await new Promise(ok=>{const t=setTimeout(ok,8000);w.addEventListener('statechange',()=>{if(w.state==='activated'){clearTimeout(t);ok()}})})}}catch(e){}
  setTimeout(()=>location.reload(),300)}
async function controleerUpdate(){if(!kanUpdaten()){toast(L.modus==='lokaal'||!location.protocol.startsWith('http')?'Bijwerken kan alleen in de geïnstalleerde app':'Bijwerken lukt nu niet');return}
  if(!navigator.onLine){toast('Geen internet – probeer het straks nog eens');return}
  toast('Controleren…');const b=await zoekUpdate();if(b){if(confirm(`Versie ${b} staat klaar. Nu bijwerken?`))werkBij()}else toast(`✓ Je hebt de nieuwste versie (${APP_BOUW})`)}
setInterval(()=>{if(!document.hidden)zoekUpdate(true)},30*60000);setTimeout(()=>zoekUpdate(true),8000);

/* ================= events ================= */
let laatsteScroll=0,laatsteVeeg=0;document.addEventListener('touchmove',()=>{laatsteVeeg=Date.now()},{passive:true,capture:true});document.addEventListener('scroll',()=>{if(Date.now()-laatsteVeeg<2500)laatsteScroll=Date.now()},true);
const VINKACTIE={vink:'.vinkvak',kvink:'.vinkvak',extrakies:'.kiesvak'};
document.addEventListener('click',async e=>{
  L.laatsteActie=Date.now();
  {const b0=e.target.closest('[data-a]'),sel=b0&&VINKACTIE[b0.dataset.a];
   if(sel){if(Date.now()-laatsteScroll<400)return;
     if(!e.target.closest(sel)){if(!window._rondjeTip){window._rondjeTip=1;toast('Tik op het rondje rechts om af te vinken')}return}
     const a0=b0.dataset.a,v0=b0.dataset.v;setTimeout(()=>{const x=document.querySelector(`[data-a="${a0}"][data-v="${CSS.escape(v0)}"]`);const r=x&&(x.closest('.rij')||x);if(r){r.classList.remove('flits');void r.offsetWidth;r.classList.add('flits')}},0)}}
  const b=e.target.closest('[data-a]');if(!b||b.dataset.a!=='undo')undoVerberg();if(!b){if(e.target.id==='sheet')sluit();return}
  const a=b.dataset.a,v=b.dataset.v,m=document.getElementById('scherm');
  const NODIG={vink:'vinken',karalles:'vinken',wis:'vinken',werkmodus:'vinken',werkklaar:'vinken',ovenmodus:'vinken',ovenkies:'vinken',ovenaantal:'vinken',ovenklaar:'vinken',afbak:'vinken',afbakopslaan:'vinken',
    aanpas:'vinken',aanpasopslaan:'vinken',levering:'vinken',levstap:'vinken',levopslaan:'vinken',scanstop:'vinken',pbfout:'vinken',pakbonopen:'vinken',scanok:'vinken',scanstap:'vinken',snij:'vinken',snijderf:'vinken',snijreset:'vinken',extrakies:'vinken',extrastap:'vinken',bijnieuw:'vinken',bijkies:'vinken',bijstap:'vinken',bijopslaan:'vinken',bijklaar:'vinken',bijweg:'vinken',aanpasterug:'vinken',extra:'vinken',extraopslaan:'vinken',hele:'vinken',ontvink:'vinken',ontweg:'vinken',ontnieuw:'vinken',ontopslaan:'vinken',
    gebruik:'invullen',karwissel:'invullen',allesadvies:'invullen',adviestoepassen:'invullen',afwtoevoegen:'invullen',afwweg:'invullen',afwbewerk:'invullen',afwnul:'invullen',kopieer:'invullen',kopieerdoe:'invullen',
    step:'derving',stepH:'derving',cstep:'derving',cstepH:'derving',dannuleer:'derving',dnul:'derving',dopslaan:'derving',kvink:'derving',kassaok:'derving',kassaweg:'derving',tel:'bestellen',telopslaan:'bestellen',leverdag:'bestellen',deelrapport:'rapport',fotoweg:'soorten',typekies:'soorten',snijkies:'soorten',snijstd:'soorten',
    open:'soorten',nieuw:'soorten',versdag:'soorten',versuitznieuw:'soorten',versuitzweg:'soorten',versuitz:'invullen',karkleur:'soorten',allerg:'soorten',nieuwstop:'soorten',feestkopie:'invullen',feestnul:'invullen',feestnee:'invullen',kartaak:'invullen',kartaakzet:'invullen',dagafsluiten:'derving',expsoort:'rapport',expper:'rapport',exportvoorbeeld:'rapport',exportdeel:'rapport',progopen:'soorten',prognieuw:'soorten',progopslaan:'soorten',progweg:'soorten',progsoort:'soorten',progkies:'soorten',karerbij:'soorten',karweg:'soorten',opslaan:'soorten',omhoog:'soorten',omlaag:'soorten',weg:'soorten',momenterbij:'soorten',momentweg:'soorten'};
  if(NODIG[a]&&!mag(NODIG[a]))return;
  if(NODIG[a]&&opSlot()){toast('Deze winkel staat op slot: alleen bekijken');return}
  if(['nieuwegebruiker','gweg','ontkoppel'].includes(a)&&!isAdmin())return;
  if(a==='gebruiker'&&!isAdmin()&&v!==L.sessie)return;
  if(!['bbeigenweg','bbweg','factweg','factklantweg','codenieuw','toestelweg','opzeggen','uitnodigingverw','afwweg','momentweg','wis','ontkoppel','afwnul','ontweg','bijweg','notweg','berichtweg','kassaweg'].includes(a)){if(afwStap==='wis'||afwStap==='ontkoppel'){afwStap=null;if(a!=='vink')render()}else afwStap=null}
  switch(a){
  case'foutweg':document.getElementById('foutbalk')?.classList.remove('open');return;
  case'koppel':{const mail=document.getElementById('kMail').value.trim(),ww=document.getElementById('kWw').value;koppelFout='';
    if(!mail||!ww){document.getElementById('fout').textContent='Vul e-mailadres en wachtwoord in.';return}
    b.disabled=true;b.textContent='Bezig…';
    try{const ses=await db.login(mail,ww);delete L.melding;L.modus='online';bewaarL();await naInloggen(ses)}
    catch(err){koppelFout=/invalid|credentials/i.test(err?.message||'')?'E-mailadres of wachtwoord klopt niet.':/fetch|network/i.test(err?.message||'')?'Koppelen mislukt. Controleer je internetverbinding.':foutTekst(err);render()}return}
  case'koppeltab':koppelTab=v;koppelFout='';if(L.melding){delete L.melding;bewaarL()}render();return;
  case'koppelcode':{const code=(document.getElementById('kCode').value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');koppelFout='';
    if(code.length<6){document.getElementById('fout').textContent='Vul de koppelcode in (8 tekens).';return}
    b.disabled=true;b.textContent='Bezig…';let nieuwSes=false;
    try{let ses=await db.sessie();if(!ses){ses=await db.anoniem();nieuwSes=true}
      const w=await db.rpc('gebruik_koppelcode',{c:code,t:toestelNaam()});
      WK.id=w;bewaarWK();delete L.koppelcode;delete L.melding;L.modus='online';bewaarL();await naInloggen(ses)}
    catch(err){if(nieuwSes)try{await db.logout()}catch(e){}koppelFout=foutTekst(err);render()}return}
  case'uitnodigingweg':delete L.uitnodiging;delete L.uitForm;bewaarL();koppelTab='code';koppelFout='';render();return;
  case'uitnodigingstart':{const g=id=>(document.getElementById(id)?.value||'').trim(),f={ond:g('uOnd'),winkel:g('uWinkel'),plaats:g('uPlaats'),mail:g('uMail')},ww=document.getElementById('uWw').value,fe=t=>document.getElementById('fout').textContent=t;
    if(!f.ond||!f.winkel)return fe('Vul de naam van je onderneming en je winkel in.');if(!/^\S+@\S+\.\S+$/.test(f.mail))return fe('Vul een geldig e-mailadres in.');if(ww.length<8)return fe('Kies een wachtwoord van minimaal 8 tekens.');
    L.uitForm=f;bewaarL();b.disabled=true;b.textContent='Bezig…';koppelFout='';
    try{let ses=null;
      try{ses=await db.registreer(f.mail,ww)}catch(e){if(!/already|registered/i.test(e?.message||''))throw e}
      if(!ses)try{ses=await db.login(f.mail,ww)}catch(e){if(/not confirmed/i.test(e?.message||'')){koppelFout='Bijna klaar! Open de mail die we je stuurden, bevestig je e-mailadres en tik daarna hier opnieuw op Starten.';render();return}throw e}
      const w=await db.rpc('gebruik_uitnodiging',{c:L.uitnodiging,ondernemer_naam:f.ond,winkel_naam:f.winkel,plaats:f.plaats});
      WK.id=w;bewaarWK();delete L.uitnodiging;delete L.uitForm;L.modus='online';bewaarL();await naInloggen(ses)}
    catch(err){koppelFout=foutTekst(err);render()}return}
  case'winkelkies':{winkelKiezen=false;if(!WK.basis)WK.basis=v;if(nsVan(v)!==NS){WK.id=v;bewaarWK();location.reload();return}WK.id=v;bewaarWK();syncStatus='start';render();try{await naInloggen(await db.sessie())}catch(e){zetStatus('offline');render()}return}
  case'winkelwissel':wisselWinkel(v);return;
  case'winkelnieuw':if(!isEigenaar())return;openNieuweWinkel();return;
  case'winkelmaak':{const n=document.getElementById('nwNaam').value.trim(),p=document.getElementById('nwPlaats').value.trim(),k=document.getElementById('nwKopie').value||null;
    if(!n){document.getElementById('fout').textContent='Vul de naam van de winkel in.';return}b.disabled=true;
    try{const w=await db.rpc('nieuwe_winkel',{n,p,kopie:k});await vernieuwWinkels();log(`Winkel ${n} aangemaakt${k?' (kopie)':''}`);sluit();render();
      if(confirm(`${n} is aangemaakt. Nu openen op dit toestel?`))wisselWinkel(w)}
    catch(e){b.disabled=false;document.getElementById('fout').textContent=foutTekst(e)}return}
  case'codenieuw':{if(!WINKEL||!kanBeheren())return;if(wkInfo?.code&&afwStap!=='codenieuw'){afwStap='codenieuw';render();return}afwStap=null;
    try{await db.rpc('maak_koppelcode',{w:WINKEL.id,r:'winkel'});log('Nieuwe koppelcode gemaakt');await laadWinkelInfo()}catch(e){toast(foutTekst(e))}return}
  case'codedeel':if(wkInfo?.code)deelTekst(codeDeelTekst(wkInfo.code.code),'Brood Opzet koppelen');return;
  case'blcode':{if(!isEigenaar())return;try{const c=await db.rpc('maak_koppelcode',{w:WINKEL.id,r:'bedrijfsleider'});wkInfo={...(wkInfo||{}),blCode:c};render()}catch(e){toast(foutTekst(e))}return}
  case'bldeel':if(wkInfo?.blCode)deelTekst(`Je bent bedrijfsleider van ${winkelNaam()} in Brood Opzet.\n1. Open ${appUrl()} en zet de app op je beginscherm.\n2. Open de app en vul de koppelcode in: ${codeTekst(wkInfo.blCode)}\nDe code is 24 uur geldig.`,'Brood Opzet');return;
  case'toestelweg':{if(!WINKEL||!kanBeheren())return;if(afwStap!=='toestelweg:'+v){afwStap='toestelweg:'+v;render();return}afwStap=null;
    try{await db.rpc('verwijder_toestel',{w:WINKEL.id,lid:+v});log('Toestel losgekoppeld');await laadWinkelInfo()}catch(e){toast(foutTekst(e))}return}
  case'ovweek':ovWeek=v==='0'?plusDagen(maandag(iso()),-7):plusDagen(ovWeek,+v);ovData=null;render();return;
  case'slotfunctie':openSlotFunctie(v);return;
  case'factfilter':factFilter=v;render();return;
  case'bbhaal':bbAuto(true);return;
  case'bbnieuw':{if(!bbMag())return;const n=(prompt('Naam van het boek (bijv. Brood, AGF of Vers)')||'').trim();if(!n)return;const id='bb'+Date.now().toString(36);S.bestelboeken.boeken[id]={id,naam:n.slice(0,40),arts:{}};log(`Bestelboek ${n} aangemaakt`);bewaar();bbBoek=id;bbZoek='';bbFilter='alle';bbOpen={};sub='bbkies';render();m.scrollTop=0;return}
  case'bbkies':if(!bbMag())return;bbBoek=v;bbZoek='';bbFilter='alle';bbOpen={};sub='bbkies';render();m.scrollTop=0;return;
  case'bbfilter':bbFilter=v;render();return;
  case'bbgroep':bbOpen[v]=!bbOpen[v];bbLijstVernieuw();return;
  case'bbvink':{const bk=S.bestelboeken.boeken[bbBoek];if(!bk||!bbMag())return;if(bk.arts[v])delete bk.arts[v];else bk.arts[v]=1;bewaar();
    const sp=b.querySelector('.bbvink');if(sp){sp.classList.toggle('aan',!!bk.arts[v]);sp.textContent=bk.arts[v]?'✓':''}
    const gEl=b.closest('[data-bbgroep]');if(gEl){const rs=bbArtikelen().filter(r=>r.groep===gEl.dataset.bbgroep),k=rs.filter(r=>bk.arts[r.art]).length,tl=gEl.querySelector('.bbtel'),ak=gEl.querySelector('[data-a=bbgroepalles]');
      if(tl)tl.textContent=tl.textContent.replace(/^\d+\/\d+/,`${k}/${rs.length}`);if(ak)ak.textContent=k===rs.length?'Niets':'Alles'}
    bbAantalTonen();return}
  case'bbgroepalles':{const bk=S.bestelboeken.boeken[bbBoek];if(!bk||!bbMag())return;const rs=bbArtikelen().filter(r=>r.groep===v),aan=rs.every(r=>bk.arts[r.art]);for(const r of rs){if(aan)delete bk.arts[r.art];else bk.arts[r.art]=1}bewaar();bbLijstVernieuw();return}
  case'bbwegruim':{const bk=S.bestelboeken.boeken[bbBoek];if(!bk||!BB)return;const arts=new Set(bbArtikelen().map(r=>r.art));for(const a of Object.keys(bk.arts))if(!arts.has(a))delete bk.arts[a];bewaar();render();return}
  case'bbhernoem':{const bk=S.bestelboeken.boeken[bbBoek];if(!bk)return;const n=(prompt('Nieuwe naam',bk.naam)||'').trim();if(!n)return;bk.naam=n.slice(0,40);bewaar();render();return}
  case'bbweg':{const bk=S.bestelboeken.boeken[bbBoek];if(!bk||!bbMag())return;if(afwStap!=='bbweg'){afwStap='bbweg';render();return}afwStap=null;delete S.bestelboeken.boeken[bbBoek];log(`Bestelboek ${bk.naam} verwijderd`);bewaar();sub='bestelboeken';render();return}
  case'bbpdf':if(!bbMag())return;bbPdf(v);return;
  case'bbdeel':if(bbKlaar)deelBestand(bbKlaar);return;
  case'bbeigen':if(!bbMag())return;afwStap=null;toonBbEigen(v||null);return;
  case'bbeigenbewaar':if(!bbMag())return;bbEigenBewaar();return;
  case'bbeigenweg':{const B=S.bestelboeken,e=B.eigen[bbEigenArt];if(!e||!bbMag())return;if(afwStap!=='bbeigenweg'){afwStap='bbeigenweg';toonBbEigen(bbEigenArt);return}afwStap=null;
    delete B.eigen[e.art];for(const bk of Object.values(B.boeken))delete bk.arts[e.art];log(`Eigen artikel ${e.naam} (${e.art}) verwijderd`);bewaar();sluit();render();toast('Verwijderd');return}
  case'bbeigenopruim':{if(!bbMag())return;const d=bbEigenInBoek();for(const e of d)delete S.bestelboeken.eigen[e.art];log(`${d.length} eigen artikel(en) opgeruimd, staan nu in het bestelboek`);bewaar();render();return}
  case'bbsangelezen':case'bbsanterug':{const x=S.bestelboeken.san[v];if(!x||!bbMag())return;if(a==='bbsangelezen')x.gelezen=Date.now();else delete x.gelezen;bewaar();render();return}
  case'bbsanalles':{if(!bbMag())return;const n=Date.now();for(const x of Object.values(S.bestelboeken.san))if(!x.gelezen)x.gelezen=n;bewaar();render();toast('Alles gelezen');return}
  case'bbsanuit':{if(!bbMag())return;const nm=bbInBoeken(v);for(const b2 of Object.values(S.bestelboeken.boeken))if(b2.arts)delete b2.arts[v];log(`Gesaneerd artikel ${v} uit ${nm.join(', ')} gehaald`);bewaar();render();toast(`Uit ${nm.join(', ')} gehaald`);return}
  case'bbsanopen':bbSanOpen=!bbSanOpen;render();return;
  case'bbvb':{const bk=S.bestelboeken.boeken[bbKlaarId];if(bk&&BB)bbVoorbeeld(bk);return}
  case'factvb':{if(!facturenMag())return;if(bewerk?.soort==='factuur'){leesFactForm();factVoorbeeld(kloon(bewerk.f),!bewerk.f.nummer)}else{const f=S.facturen.lijst[bewerk?.id];if(f)factVoorbeeld(f,false)}return}
  case'factvbsluit':sluitVoorbeeld();return;
  case'factvbzoom':document.getElementById('factVb')?.classList.toggle('zoom');return;
  case'factnieuw':if(!facturenMag())return;openFactBewerk(nieuweFactuur());return;
  case'factopen':if(!facturenMag())return;openFactuur(v);return;
  case'factregelerbij':{if(bewerk?.soort!=='factuur')return;leesFactForm();const r=bewerk.f.regels;r.push({oms:'',aantal:1,prijs:0,btw:r.length?r[r.length-1].btw:9});toonFactBewerk();setTimeout(()=>{const l=[...document.querySelectorAll('#factForm [data-ff=oms]')].pop();if(l)l.focus()},60);return}
  case'factregelweg':if(bewerk?.soort!=='factuur')return;leesFactForm();bewerk.f.regels.splice(+v,1);if(!bewerk.f.regels.length)bewerk.f.regels.push({oms:'',aantal:1,prijs:0,btw:9});toonFactBewerk();return;
  case'factbtw':if(bewerk?.soort!=='factuur')return;leesFactForm();bewerk.f.regels[+v].btw=+b.dataset.n;b.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.toggle('aan',c===b));factTotTonen();return;
  case'factbewaar':case'factafronden':{if(!facturenMag()||bewerk?.soort!=='factuur')return;leesFactForm();const f=bewerk.f,fout=factControle(f);if(fout){document.getElementById('fout').textContent=fout;return}
    factBewaarKlant(f);if(a==='factafronden'&&!f.nummer){f.nummer=volgendNummer(f.datum);f.status='afgerond';log(`Factuur ${f.nummer} afgerond`)}else log(f.nummer?`Factuur ${f.nummer} aangepast`:'Conceptfactuur bewaard');
    f.t=Date.now();S.facturen.lijst[f.id]=f;bewaar();render();
    if(f.nummer){bewerk={soort:'factview',id:f.id};laadPdf().catch(()=>{});factLogo().catch(()=>{});toonFactuur()}else{sluit();toast('Concept bewaard')}return}
  case'factweg':{if(!facturenMag())return;const id=bewerk?.soort==='factuur'?bewerk.f.id:bewerk?.id,f=S.facturen.lijst[id];if(!f)return;
    if(f.status!=='concept'&&!(f.status==='afgerond'&&isLaatste(f)))return;
    if(afwStap!=='factweg'){afwStap='factweg';if(bewerk.soort==='factuur'){leesFactForm();toonFactBewerk()}else toonFactuur();return}afwStap=null;
    delete S.facturen.lijst[id];log(f.nummer?`Factuur ${f.nummer} verwijderd`:'Conceptfactuur weggegooid');bewaar();sluit();render();toast(f.nummer?`Factuur ${f.nummer} verwijderd – de volgende factuur krijgt dit nummer weer`:'Concept weggegooid');return}
  case'factaanpas':{const f=S.facturen.lijst[bewerk?.id];if(!f||f.status!=='afgerond'||!facturenMag())return;openFactBewerk(f);return}
  case'factdeel':if(!facturenMag())return;factDelen();return;
  case'factverstuurd':case'factniet':case'factbetaald':case'factnietbetaald':{const f=S.facturen.lijst[bewerk?.id];if(!f||!facturenMag())return;
    if(a==='factverstuurd'){f.status='verstuurd';f.verstuurdOp=Date.now()}else if(a==='factniet'){f.status='afgerond';delete f.verstuurdOp}else if(a==='factbetaald'){f.status='betaald';f.betaaldOp=Date.now()}else{f.status='verstuurd';delete f.betaaldOp}
    log(`Factuur ${f.nummer}: ${FSTATUS[f.status][0].toLowerCase()}`);bewaar();toonFactuur();render();return}
  case'factcredit':{const f=S.facturen.lijst[bewerk?.id];if(!f||!facturenMag())return;const n=nieuweFactuur(f);n.regels=f.regels.map(r=>({...r,aantal:-Math.abs(+r.aantal||0)}));n.credit=f.nummer;openFactBewerk(n);return}
  case'factkopie':{const f=S.facturen.lijst[bewerk?.id];if(!f||!facturenMag())return;openFactBewerk(nieuweFactuur(f));return}
  case'factklanten':if(!facturenMag())return;toonFactKlanten();return;
  case'factklantweg':if(!facturenMag())return;if(afwStap!=='kl:'+v){afwStap='kl:'+v;toonFactKlanten();return}afwStap=null;delete S.facturen.klanten[v];bewaar();toonFactKlanten();return;
  case'factinst':if(!facturenMag())return;toonFactInst();return;
  case'factinstbewaar':{if(!facturenMag())return;const B=S.facturen.bedrijf;for(const k of['naam','adres','pcPlaats','tel','email','btw','kvk','iban','bic','voet'])B[k]=document.getElementById('fb_'+k).value.trim();B.termijn=Math.max(0,parseInt(document.getElementById('fb_termijn').value,10)||14);log('Factuurgegevens aangepast');bewaar();sluit();render();toast('Opgeslagen');return}
  case'functievraag':{if(!WINKEL)return;try{await db.rpc('vraag_functie',{w:WINKEL.id,f:v,door:ik()?.naam||''});sluit();toast('Aanvraag verstuurd. We nemen contact met je op.');log(`${FUNCTIE_NAAM[v]||v} aangevraagd`)}catch(e){toast(foutTekst(e))}return}
  case'exportalles':if(!isEigenaar())return;exportAlles();return;
  case'opzeggen':{if(!isEigenaar())return;if(afwStap!=='opzeggen'){afwStap='opzeggen';render();return}afwStap=null;
    if(!confirm(`Abonnement opzeggen voor ${WINKEL.ondernemer_naam||'je onderneming'}?\n\nNa 60 dagen worden alle gegevens van al je winkels gewist.`))return;
    try{await db.rpc('opzeggen',{o:WINKEL.ondernemer});log('Abonnement opgezegd');await vernieuwWinkels();render();toast('Opgezegd. Exporteer je gegevens op tijd.')}catch(e){toast(foutTekst(e))}return}
  case'aanvraagklaar':if(!isAanbieder())return;try{await db.rpc('aanvraag_klaar',{i:+v});await laadAanbieder()}catch(e){toast(foutTekst(e))}return;
  case'opzegterug':if(!isAanbieder())return;try{await db.rpc('opzegging_terugdraaien',{o:v});await laadAanbieder();toast('Opzegging teruggedraaid')}catch(e){toast(foutTekst(e))}return;
  case'uitnodigingnieuw':if(!isAanbieder())return;openUitnodiging();return;
  case'uitnpakket':bewerk.pakket=v;if(v==='compleet'||bewerk.proef===v)bewerk.proef='';toonUitnodiging();return;
  case'uitnproef':bewerk.proef=v;toonUitnodiging();return;
  case'uitndagen':bewerk.dagen=+v;toonUitnodiging();return;
  case'uitnodigingmaak':{if(!isAanbieder())return;b.disabled=true;
    try{const c=await db.rpc('maak_uitnodiging',{pakket:bewerk.pakket,proef_pakket:bewerk.proef||'',proef_dagen:bewerk.proef?bewerk.dagen:0,notitie:document.getElementById('uNotitie').value.trim()});aanb=null;laadAanbieder(true);toonUitnLink(c)}
    catch(e){b.disabled=false;document.getElementById('fout').textContent=foutTekst(e)}return}
  case'uitnodigingdeel':deelTekst(uitnTekst(v),'Uitnodiging Brood Opzet');return;
  case'uitnodigingverw':{if(!isAanbieder())return;if(afwStap!=='uitn:'+v){afwStap='uitn:'+v;render();return}afwStap=null;try{await db.rpc('verwijder_uitnodiging',{c:v});await laadAanbieder()}catch(e){toast(foutTekst(e))}return}
  case'ondweg':{if(!isAanbieder())return;const o=(aanb?.ondernemers||[]).find(x=>x.id===v);if(!o||o.id===WINKEL?.ondernemer)return;
    toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Ondernemer verwijderen</b><span style="width:70px"></span></div><div class="pinhoud">
     <div class="kaartje waarschuw"><b>${esc(o.naam)}</b><div class="sub">Alle winkels (${(o.winkels||[]).map(w=>esc(w.naam)).join(', ')||'geen'}), gegevens, back-ups en inlogaccounts worden direct en definitief gewist. Gekoppelde toestellen worden losgekoppeld. Dit kan niet ongedaan worden gemaakt.</div></div>
     <label>Typ ter bevestiging de naam: <b>${esc(o.naam)}</b></label><input class="veld" id="ondNaam" autocomplete="off">
     <div class="fout" id="fout"></div><div class="knoppen"><button class="knop rood" data-a="ondwegdoe" data-v="${o.id}">Definitief verwijderen</button></div></div>`);return}
  case'ondwegdoe':{if(!isAanbieder())return;const o=(aanb?.ondernemers||[]).find(x=>x.id===v),n=document.getElementById('ondNaam').value;
    if(!o||n.trim().toLowerCase()!==o.naam.trim().toLowerCase()){document.getElementById('fout').textContent='De naam klopt niet.';return}
    b.disabled=true;b.textContent='Bezig…';
    try{await db.rpc('verwijder_ondernemer',{o:v,bevestig:n});log(`Ondernemer ${o.naam} verwijderd`);sluit();await laadAanbieder();toast(`${o.naam} is verwijderd`)}
    catch(e){b.disabled=false;b.textContent='Definitief verwijderen';document.getElementById('fout').textContent=foutTekst(e)}return}
  case'aanbwinkel':openAanbWinkel(v);return;
  case'aanbpakket':bewerk.pakket=v;bewerk.extra=bewerk.extra.filter(f=>!PAKKETTEN[v].includes(f));toonAanbWinkel();return;
  case'aanbextra':bewerk.extra=bewerk.extra.includes(v)?bewerk.extra.filter(f=>f!==v):[...bewerk.extra,v];toonAanbWinkel();return;
  case'aanbproef':bewerk.proef=v;b.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.toggle('aan',c===b));document.getElementById('aanbProefTot').style.display=v?'':'none';return;
  case'aanbopslaan':{if(!isAanbieder())return;const w=aanbWinkel(bewerk.id);b.disabled=true;
    try{await db.rpc('zet_winkel',{w:bewerk.id,pakket:bewerk.pakket,extra:bewerk.extra,proef_pakket:bewerk.proef||'',proef_tot:bewerk.proef?(document.getElementById('aProefTot').value||null):null,slot:document.getElementById('aSlot').checked,notitie:document.getElementById('aNotitie').value.trim()});
      log(`Pakket ${w?.naam||''}: ${PAKKET_NAAM[bewerk.pakket]}`);sluit();await laadAanbieder();if(w?.id===WK.id){await vernieuwWinkels();render()}}
    catch(e){b.disabled=false;document.getElementById('fout').textContent=foutTekst(e)}return}
  case'winkelinst':{if(!isAdmin())return;const bk=document.getElementById('wBakker').value.trim();if(bk!==(S.bakker||'')){S.bakker=bk;log(`Bakker: ${bk||'–'}`);bewaar()}toast('Opgeslagen');return}
  case'weerzoek':{if(!isAdmin())return;const q=document.getElementById('wPlaats').value.trim();if(!q)return;b.disabled=true;
    try{const r=await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=nl&name='+encodeURIComponent(q)).then(r=>r.json()),x=r?.results?.[0];
      if(!x){toast('Plaats niet gevonden');b.disabled=false;return}S.locatie={lat:Math.round(x.latitude*100)/100,lon:Math.round(x.longitude*100)/100,naam:x.name};L.weer=null;log(`Weer voor ${x.name}`);bewaar();weerLaden();render();toast('Weer: '+x.name)}
    catch(e){b.disabled=false;toast('Zoeken lukt nu niet')}return}
  case'logoweg':if(!isAdmin())return;S.winkelLogo=null;bewaar();render();return;
  case'lokaalmodus':L.modus='lokaal';bewaarL();syncStatus='lokaal';render();return;
  case'naarkoppel':L.modus='online';L.gekoppeld=false;L.vanLokaal=true;bewaarL();render();return;
  case'ontkoppel':if(afwStap!=='ontkoppel'){afwStap='ontkoppel';render();return}afwStap=null;
    if(WINKEL||NS){await toestelWissen('');return}
    try{await db?.logout()}catch(e){}
    L={modus:'online'};basis={};revs={};bewaarL();try{localStorage.removeItem(OPSLAG_BASIS);localStorage.removeItem(OPSLAG_REVS)}catch(e){}await wisIdb();bewaarS();render();return;
  case'setup':{const n=document.getElementById('sNaam').value.trim(),p=document.getElementById('sPin').value,p2=document.getElementById('sPin2').value,f=t=>document.getElementById('fout').textContent=t;
    if(!n)return f('Vul je naam in.');if(!/^[0-9]{4}$/.test(p))return f('Pincode moet 4 cijfers zijn.');if(p!==p2)return f('De pincodes zijn niet gelijk.');
    const id=nieuwId();S.gebruikers.push({id,naam:n,rol:'admin',pin:hashPin(p,id)});L.sessie=id;L.laatsteGebruiker=id;log('Beheerdersaccount aangemaakt');bewaar();render();return}
  case'kiesnaam':loginKeuze=v;pinInvoer='';pinMelding='';render();return;
  case'pin':if(pinInvoer.length>=4)return;pinInvoer+=v;pinMelding='';if(pinInvoer.length===4){render();setTimeout(probeerLogin,120)}else render();return;
  case'pinwis':pinInvoer=pinInvoer.slice(0,-1);pinMelding='';render();return;
  case'uitloggen':if(!chatOverdrachtKlaar&&L.sessie&&ik()){chatOverdrachtVraag('uitloggen');return}chatOverdrachtKlaar=false;log('Uitgelogd');L.sessie=null;ovenModus=false;bewaar();render();return;
  case'gebruiker':openGebruiker(S.gebruikers.find(x=>x.id===v));return;
  case'nieuwegebruiker':openGebruiker({id:nieuwId(),naam:'',rol:'medewerker',rechten:{...STANDAARD_RECHTEN},actief:true,nieuw:true});return;
  case'gopslaan':gebruikerOpslaan();return;
  case'gweg':if(!kanBeheren())return;if(!verwStap){verwStap=true;b.textContent='Tik nogmaals om te verwijderen';return}
    log(`Medewerker ${bewerk.naam} verwijderd`);S.gebruikers=S.gebruikers.filter(x=>x.id!==bewerk.id);bewaar();sluit();render();return;
  case'tab':{if(v==='plan'&&tab!=='plan')planKeuze=planKeyVoor(iso());const zelfde=tab===v&&!(v==='meer'&&sub)&&!(v==='uren'&&urenView!=='klok');plekBewaar();tab=v;if(v==='meer')sub=null;if(v==='uren')urenView='klok';ovenModus=false;render();plekTerug(zelfde);return}
  case'sub':if(v==='backup')bkLijst=null;if(v==='aanbieder')aanb=null;if(v==='winkels'||v==='winkel')wkInfo=null;plekBewaar();sub=v||null;render();plekTerug(!!sub);return;
  case'sub2':plekBewaar();tab='meer';sub=v;render();plekTerug(true);return;
  case'moment':moment=v;ovenKeuze={};render();return;
  case'datum':datum=plusDagen(datum,+v);volgVandaag=datum===standaardDatum();ovenKeuze={};ovenModus=ovenModus&&datum<=iso();render();return;
  case'vandaag':datum=iso();volgVandaag=!naOmschakel();ovenKeuze={};render();return;
  case'versdag':{const n=+v,l=S.versDagen;const i=l.indexOf(n);if(i>=0)l.splice(i,1);else l.push(n);l.sort();log(`Leverdagen vers brood: ${l.map(x=>['zo','ma','di','wo','do','vr','za'][x]).join(', ')||'geen'}`);bewaar();render();return}
  case'versuitz':{const ja=b.dataset.n==='ja',std=(S.versDagen||[]).includes(vanIso(v).getDay());if(ja===std)delete S.versUitz[v];else S.versUitz[v]=ja;log(`Vers brood ${datumTekst(v)}: ${ja?'geleverd':'geen levering'}`);bewaar();render();if(document.getElementById('sheet').classList.contains('open')&&sub!=='afwijkend'&&tab!=='meer')openBel();return}
  case'versuitznieuw':{const d=document.getElementById('versUitzDatum').value;if(!d){toast('Kies eerst een datum');return}S.versUitz[d]=b.dataset.n==='ja';log(`Vers brood ${datumTekst(d)}: ${S.versUitz[d]?'extra levering':'geen levering'}`);bewaar();render();return}
  case'versuitzweg':delete S.versUitz[v];bewaar();render();return;
  case'naarmorgen':datum=plusDagen(iso(),1);volgVandaag=true;ovenModus=false;ovenKeuze={};render();m.scrollTop=0;return;
  case'vink':{const s=S.soorten.find(x=>x.id===v);if(!s)return;const wasKlaar=allesKlaar(datum,moment),aan=!S.vinkjes[datum]?.[moment]?.[v];undoStart(`${aan?'✓':'○'} ${s.naam}`);zetVink(v,werkelijk(datum,moment,s),aan);
    log(`${aan?'Afgevinkt':'Vinkje weg'}: ${s.naam} (${werkelijk(datum,moment,s)})`);bewaar();render();undoToon();if(aan)bevestig(`✓ ${s.naam} klaargezet`);if(aan&&!wasKlaar&&allesKlaar(datum,moment))toonFeest();return}
  case'karalles':{const sec=maakLijst(datum,moment).find(x=>String(x.nr)===String(v));if(!sec)return;const vk=S.vinkjes[datum]?.[moment]||{},ids=[...new Set(sec.regels.filter(r=>!vk[r.s.id]).map(r=>r.s.id))];
    if(!ids.length){toast('Alles van deze kar is al klaar');return}if(!confirm(`Alles van ${sec.naam} afvinken?\n\n${ids.length} ${ids.length===1?'product':'producten'} worden in één keer klaargezet.`))return;
    const wasKlaar=allesKlaar(datum,moment);undoStart(`✓ ${sec.naam} klaar`);for(const id of ids){const x=S.soorten.find(y=>y.id===id);if(x)zetVink(id,werkelijk(datum,moment,x),true)}
    log(`${sec.naam} in één keer afgevinkt (${ids.length})`);bewaar();render();undoToon();bevestig(`✓ ${sec.naam} klaargezet`);if(!wasKlaar&&allesKlaar(datum,moment))toonFeest();return}
  case'wis':if(afwStap!=='wis'){afwStap='wis';render();return}afwStap=null;undoStart('Vinkjes gewist');if(S.vinkjes[datum])S.vinkjes[datum][moment]={};log(`Vinkjes gewist (${momentNaam(moment)})`);bewaar();render();undoToon();return;
  case'hist':open[v]=!open[v];render();return;
  case'aanpas':openAanpas(v);return;
  case'aanpasstap':{const i=document.getElementById('aanpasIn');i.value=Math.max(0,(getal(i.value)||0)+ +b.dataset.n);return}
  case'aanpasopslaan':{const n=getal(document.getElementById('aanpasIn').value)??0,s=S.soorten.find(x=>x.id===bewerk.id),gepland=stuksIn(planKeyVoor(datum),moment,s);
    if(n-gepland>=20&&n>gepland*3&&!confirm(`Klopt dit?\n\n${s.naam}: ${n} in plaats van ${gepland} gepland.\n\nToch opslaan?`))return;undoStart('Aantal aangepast');
    S.aanpas[datum]=S.aanpas[datum]||{};S.aanpas[datum][moment]=S.aanpas[datum][moment]||{};
    if(n===gepland)delete S.aanpas[datum][moment][s.id];else S.aanpas[datum][moment][s.id]=n;
    const vk=S.vinkjes[datum]?.[moment]?.[s.id];if(vk){if(n>0)vk.n=n;else delete S.vinkjes[datum][moment][s.id]}
    log(`Aantal ${s.naam} ${datumTekst(datum)}: ${n} (gepland ${gepland})`);bewaar();sluit();render();undoToon();bevestig(`✓ ${s.naam}: ${n}`);return}
  case'aanpasterug':{undoStart('Terug naar planning');const s=S.soorten.find(x=>x.id===bewerk.id);delete S.aanpas[datum]?.[moment]?.[s.id];const vk=S.vinkjes[datum]?.[moment]?.[s.id];if(vk)vk.n=werkelijk(datum,moment,s);
    log(`Aantal ${s.naam} ${datumTekst(datum)} terug naar planning`);bewaar();sluit();render();undoToon();return}
  case'extra':openExtra();return;
  case'extrakies':{const k=bewerk.keuze,sx=S.soorten.find(x=>x.id===v);if(k[v])delete k[v];else k[v]=extraStart(sx);renderExtraSheet();return}
  case'extrastap':{const k=bewerk.keuze;if(!k[v])return;k[v]=Math.max(1,Math.min(9999,k[v]+ +b.dataset.n));renderExtraSheet();return}
  case'extraopslaan':{const k=bewerk.keuze,ids=Object.keys(k);if(!ids.length){const f=document.getElementById('fout');if(f)f.textContent='Tik minimaal één soort aan.';return}
    {const groot=ids.filter(id=>k[id]>100).map(id=>`${S.soorten.find(x=>x.id===id)?.naam}: ${k[id]}`);if(groot.length&&!confirm('Klopt dit? Dit zijn grote aantallen:\n\n'+groot.join('\n')+'\n\nToch toevoegen?'))return}
    undoStart('Extra klaarzetten');
    S.aanpas[datum]=S.aanpas[datum]||{};S.aanpas[datum][moment]=S.aanpas[datum][moment]||{};for(const id of ids)S.aanpas[datum][moment][id]=k[id];
    log(`Extra klaarzetten ${datumTekst(datum)}: ${ids.map(id=>`${S.soorten.find(x=>x.id===id)?.naam} ${k[id]}`).join(', ')}`);bewaar();sluit();render();undoToon();bevestig(`✓ ${ids.length} ${ids.length===1?'soort':'soorten'} extra klaargezet`);return}
  case'notitie':{const i=document.getElementById('notitieIn'),t=i.value.trim();if(!t&&!notFoto)return;const d=tab==='derving'?dervDatum:datum,id=nieuwId();
    S.notities[d]=S.notities[d]||{};let fotoId=null;if(notFoto){fotoId='nf'+id;S.notfotos[fotoId]=notFoto}S.notities[d][id]={id,tekst:t||'📷',wie:ik().naam,t:Date.now(),...(fotoId?{fotoId}:{})};notFoto=null;log(`Notitie ${datumTekst(d)}: ${t}`);bewaar();render();return}
  case'notweg':{if(sub==='notities'&&afwStap!=='nt:'+v){afwStap='nt:'+v;render();return}afwStap=null;for(const d in S.notities){const n=S.notities[d][v];if(n&&(isAdmin()||n.wie===ik().naam)){if(n.fotoId)S.notfotos[n.fotoId]=null;delete S.notities[d][v]}}bewaar();render();return}
  case'werkmodus':{werk={i:0};ovenModus=false;const p=werkPlaten(),vk=S.vinkjes[datum]?.[moment]||{};const eerste=p.findIndex(x=>!x.regels.every(r=>vk[r.s.id]));werk.i=eerste<0?p.length:eerste;renderWerk();return}
  case'werkdicht':werk=null;document.getElementById('werk').classList.remove('open');render();return;
  case'werknav':werk.i+=+v;renderWerk();return;
  case'werkklaar':{undoStart('Plaat klaar (werkmodus)');const wasKlaar=allesKlaar(datum,moment),p=werkPlaten(),x=p[werk.i];if(x){const vk=S.vinkjes[datum]?.[moment]||{};
    if(!x.regels.every(r=>vk[r.s.id])){x.regels.forEach(r=>{if(!vk[r.s.id])zetVink(r.s.id,r.n,true)});log(`Werkmodus: plaat ${x.plaat} klaar (${x.regels.map(r=>r.s.naam).join(', ')})`);bewaar()}}
    werk.i++;renderWerk();if(!wasKlaar&&allesKlaar(datum,moment)){werk=null;document.getElementById('werk').classList.remove('open');render();toonFeest()}return}
  case'ovenmodus':ovenModus=!ovenModus;ovenKeuze={};render();return;
  case'ovenkies':{if(ovenKeuze[v]!=null)delete ovenKeuze[v];else{const f=vindGroep(v),rest=f?restPlaten(f.r,f.nr):1,vrij=Math.max(1,S.ovenMax-Object.values(ovenKeuze).reduce((x,y)=>x+y,0));ovenKeuze[v]=Math.max(1,Math.min(rest,vrij))}render();return}
  case'ovenaantal':{const f=vindGroep(v),rest=f?restPlaten(f.r,f.nr):1;ovenKeuze[v]=Math.max(1,Math.min(rest,(ovenKeuze[v]||1)+ +b.dataset.n));render();return}
  case'slot':toast(b.dataset.m||'Geen rechten – vraag de beheerder');return;
  case'uitleg':tab='meer';sub='uitleg';uitlegOpen=v;ovenModus=false;render();setTimeout(()=>document.getElementById('u-'+v)?.scrollIntoView({block:'start'}),30);return;
  case'uitlegopen':uitlegOpen=uitlegOpen===v?null:v;render();return;
  case'undo':undoDoe();return;
  case'fav':{const f=[...(prof().fav||[])],i=f.indexOf(v);if(i>=0)f.splice(i,1);else f.push(v);zetProf('fav',f);return}
  case'meergroep':{const o={...(prof().meerOpen||{})};o[v]=!o[v];zetProf('meerOpen',o);return}
  case'bel':openBel();return;
  case'belga':{const g=b.dataset.g;sluit();if(g==='sub'){tab='meer';sub=v;render();m.scrollTop=0}else if(g==='levnu'){tab='lijst';datum=iso();render();openLevering()}else if(g==='nieuwsnu'){toonNieuws()}return}
  case'matmeld':{const los=S.materiaal.los[v],x=los||(S.materiaal.meld[v]=S.materiaal.meld[v]||{});x.staat=b.dataset.n;x.wie=ik().naam;x.t=Date.now();delete x.besteld;
    log(`Materiaal ${matNaam(v)}: ${b.dataset.n==='op'?'op!':'bijna op'}`);chatAuto(`📦 ${matNaam(v)} ${b.dataset.n==='op'?'is op':'is bijna op'} – gemeld door ${ik().naam}`);bewaar();render();bevestig(`✓ Gemeld: ${matNaam(v)} ${b.dataset.n==='op'?'is op':'bijna op'}`);setTimeout(()=>stuurPush({}),800);return}
  case'matbesteld':{if(!isAdmin())return;const x=S.materiaal.los[v]||S.materiaal.meld[v];if(!x)return;x.staat='besteld';x.besteld={wie:ik().naam,t:Date.now()};log(`Materiaal ${matNaam(v)} besteld`);bewaar();render();return}
  case'mataangevuld':{const n=matNaam(v);if(S.materiaal.los[v])delete S.materiaal.los[v];else delete S.materiaal.meld[v];log(`Materiaal ${n} ${isAdmin()?'aangevuld':'melding ingetrokken'}`);bewaar();render();return}
  case'matanders':{const n=(prompt('Wat is er bijna op?')||'').trim();if(!n)return;const id='l'+Date.now().toString(36);S.materiaal.los[id]={id,naam:n.slice(0,40),staat:'bijna',wie:ik().naam,t:Date.now()};log(`Materiaal ${n}: bijna op`);bewaar();render();bevestig(`✓ Gemeld: ${n}`);setTimeout(()=>stuurPush({}),800);return}
  case'matlijst':if(!isAdmin())return;openMatLijst();return;
  case'matlijsterbij':bewerk.lijst.forEach((m,i)=>{const e2=document.querySelector(`[data-matnaam="${i}"]`);if(e2)m.naam=e2.value});bewerk.lijst.push({id:'m'+Date.now().toString(36),naam:''});toonMatLijst();return;
  case'matlijstweg':bewerk.lijst.forEach((m,i)=>{const e2=document.querySelector(`[data-matnaam="${i}"]`);if(e2)m.naam=e2.value});bewerk.lijst.splice(+v,1);toonMatLijst();return;
  case'matlijstopslaan':{if(!isAdmin())return;bewerk.lijst.forEach((m,i)=>{const e2=document.querySelector(`[data-matnaam="${i}"]`);if(e2)m.naam=e2.value.trim()});S.materiaal.lijst=bewerk.lijst.filter(m=>m.naam);
    for(const id of Object.keys(S.materiaal.meld))if(!S.materiaal.lijst.some(m=>m.id===id))delete S.materiaal.meld[id];log('Materiaallijst aangepast');bewaar();sluit();render();return}
  case'pushaan':if(!isAdmin())return;pushAan();return;
  case'pushteamaan':pushAanTeam();return;
  case'uitlogmin':if(!isAdmin())return;S.uitlogMin=+v;log(`Automatisch uitloggen: ${+v?v+' min':'direct'}`);bewaar();render();return;
  case'pushteamuit':pushTeamUit();return;
  case'woweek':woWeek=+v===0?plusDagen(maandag(iso()),-7):plusDagen(woWeek,+v);if(woWeek>maandag(iso()))woWeek=maandag(iso());render();return;
  case'bkterug':{if(!isAdmin()||!kanBeheren())return;if(!confirm(`Alle gegevens terugzetten naar de back-up van ${dagNaamLang(v)}?\n\nWat daarna is ingevuld, gaat verloren.`))return;if(!confirm('Weet je het zeker? Dit kan niet ongedaan worden gemaakt.'))return;
    try{toast('Terugzetten…');await db.herstel(v);log(`Back-up van ${datumTekst(v)} teruggezet`);try{localStorage.removeItem(OPSLAG);localStorage.removeItem(OPSLAG_BASIS);localStorage.removeItem(OPSLAG_REVS)}catch(e){}await wisIdb();alert('De back-up is teruggezet. De app start opnieuw. Sluit de app op andere telefoons en open hem opnieuw.');location.reload()}catch(e){toast('Terugzetten mislukt: '+(e?.message||e))}return}
  case'pushtest':toast('Testmelding versturen…');stuurPush({test:true}).then(r=>{let t;
    if(r.netwerk)t='✗ Geen verbinding met Supabase';else if(r.status===401)t='✗ Supabase weigert: zet bij stuur-push "Verify JWT" uit';else if(r.status===404)t='✗ De functie stuur-push bestaat nog niet in Supabase';
    else if(r.ok)t=r.verstuurd?`✓ Verstuurd naar ${r.verstuurd} ${r.verstuurd===1?'toestel':'toestellen'}`:`✗ Niet verstuurd: ${r.reden||'onbekend'}`;else t='✗ '+(r.fout||('fout '+r.status));
    toast(t)});return;
  case'stilvan':case'stiltot':{if(!isAdmin())return;S.push.stil={...(S.push.stil||{van:21,tot:7}),[a==='stilvan'?'van':'tot']:+v};bewaar();render();return}
  case'oefenstart':if(!confirm('Oefenmodus starten?\n\nDe app werkt dan met een kopie. Niets wordt echt opgeslagen. Met Stoppen ga je terug.'))return;OEFEN=true;S=kloon(S);document.body.classList.add('oefen');document.getElementById('oefenbalk').innerHTML='🎓 Oefenmodus – niets wordt opgeslagen <button data-a="oefenstop">Stoppen</button>';tab='lijst';sub=null;render();return;
  case'oefenstop':location.reload();return;
  case'nieuwsklaar':S.profielen[L.sessie]={...(S.profielen[L.sessie]||{}),versieGezien:APP_VERSIE};bewaar();sluit();toonOverdracht();return;
  case'karkleur':{const k=S.karren.find(x=>x.nr===+v);if(k)k.kleur=b.dataset.k;else S.karren.push({nr:+v,naam:'',kleur:b.dataset.k});bewaar();render();return}
  case'wissel':if(!chatOverdrachtKlaar&&L.sessie&&ik()){chatOverdrachtVraag('wissel');return}chatOverdrachtKlaar=false;log('Gewisseld van persoon');L.sessie=null;loginKeuze=null;geenVoorkeur=true;ovenModus=false;sub=null;bewaar();render();return;
  case'welkomdeel':welkomDeel();return;
  case'welkompdf':maakQrPdf('welkom');return;
  case'qrwinkel':if(!isAdmin())return;toonSheet(`<div class="pkop"><span style="width:70px"></span><b>QR-code voor de winkel</b><button data-a="sluit" style="font-weight:700">Klaar</button></div><div class="pinhoud"><p class="hulp">Hang deze A4 op bij de broodafdeling. Collega's scannen hem met de camera en zetten de app op hun beginscherm, op iPhone én Android.</p><div id="winkelQr" class="welkomqr groot"></div><div class="knoppen"><button class="knop" data-a="qrwinkelpdf">PDF maken / printen</button></div><p class="hulp" style="text-align:center">${esc(appUrl())}</p></div>`);laadQr().then(()=>{const el=document.getElementById('winkelQr');if(el)el.innerHTML=qrSvg(appUrl(),6)}).catch(()=>{});return;
  case'qrwinkelpdf':maakQrPdf('winkel');return;
  case'pk':pinKiesToets(v);return;
  case'facelogin':faceLogin();return;
  case'faceaan':faceAan();return;
  case'faceuit':delete L.faceid;bewaarL();log('Face ID uitgezet op dit toestel');render();return;
  case'pw':pinWijzigToets(v);return;
  case'pinwijzig':openPinWijzig();return;
  case'cbtab':case'cbopen':case'cbtoevoegen':case'cbnieuw':case'cbtoeopslaan':case'cbuitgeven':case'cbinwisselen':case'cbuitterug':case'cbgebruiktterug':case'cbweg':case'cbexport':case'bdk':case'cbselmodus':case'cbsel':case'cbselalles':case'cbselreeks':case'cbreeksok':case'cbselwaarde':case'cbwaardeopslaan':case'cbseluitgeven':case'cbwaardezet':case'cbwaardewijzig':{
    if(!isAdmin()||!kanBeheren())return;const nu={wie:ik().naam,t:Date.now()};
    if(a==='bdk'){let t=bewerk.bedragTekst||'';if(v==='wis')t=t.slice(0,-1);else if(v===','){if(!t.includes(','))t=(t||'0')+','}else{const[g,d]=t.split(',');if(d!==undefined?d.length<2:(g||'').length<5)t=(t==='0'?'':t)+v}bewerk.bedragTekst=t;bedragVernieuw();return}
    if(a==='cbselmodus'){cbSelect=!cbSelect;cbSel.clear();render();return}
    if(a==='cbsel'){if(cbSel.has(v))cbSel.delete(v);else cbSel.add(v);render();return}
    if(a==='cbselalles'){const l=cbZichtbaar();if(l.length&&l.every(b=>cbSel.has(b.nr)))l.forEach(b=>cbSel.delete(b.nr));else l.forEach(b=>cbSel.add(b.nr));render();return}
    if(a==='cbselreeks'){openReeksSelectie();return}
    if(a==='cbreeksok'){const van=document.getElementById('cbRVan').value.trim(),tot=document.getElementById('cbRTot').value.trim(),f=t=>document.getElementById('fout').textContent=t;
      if(!/^\d+$/.test(van)||!/^\d+$/.test(tot))return f('Vul twee nummers in.');const a2=parseInt(van,10),b2=parseInt(tot,10);if(b2<a2)return f('Het laatste nummer is kleiner dan het eerste.');
      let n=0;for(const x of Object.values(S.cadeau)){if(!/^\d+$/.test(x.nr))continue;const g=parseInt(x.nr,10);if(g>=a2&&g<=b2&&x.status!=='gebruikt'){cbSel.add(x.nr);n++}}
      cbSelect=true;cbTab='alle';sluit();render();toast(`${n} ${n===1?'bon':'bonnen'} geselecteerd`);return}
    if(a==='cbselwaarde'){if(!cbSel.size)return;openWaarde('Waarde instellen',cbSel.size);return}
    if(a==='cbwaardewijzig'){openWaarde('Waarde wijzigen',0);return}
    if(a==='cbwaardeopslaan'){const c=centen(bewerk.bedragTekst);if(!c||c<=0)return document.getElementById('fout').textContent='Vul een geldig bedrag in.';
      if(bewerk.soort==='waarde'&&bewerk.nr&&!cbSel.size){const x=S.cadeau[bewerk.nr];if(x&&x.status!=='gebruikt')x.bedrag=c;bewaar();render();openBon(bewerk.nr);return}
      let n=0;for(const nr of cbSel){const x=S.cadeau[nr];if(x&&x.status!=='gebruikt'){x.bedrag=c;n++}}bewaar();sluit();render();toast(`${n} ${n===1?'bon':'bonnen'} op ${euro(c)} gezet`);return}
    if(a==='cbseluitgeven'){let n=0,geen=0,al=0;for(const nr of cbSel){const x=S.cadeau[nr];if(!x)continue;if(x.status!=='voorraad'){al++;continue}if(!x.bedrag){geen++;continue}x.status='uit';x.uit=nu;n++}
      bewaar();cbSel.clear();cbSelect=false;render();toast(`${n} ${n===1?'bon':'bonnen'} uitgegeven${geen?` · ${geen} zonder waarde overgeslagen`:''}${al?` · ${al} niet op voorraad`:''}`);return}
    if(a==='cbtab'){cbTab=v;render();return}
    if(a==='cbopen'){openBon(v);return}
    if(a==='cbtoevoegen'){openBonToevoegen('');return}
    if(a==='cbnieuw'){openBonToevoegen(v);return}
    if(a==='cbexport'){cbExport();return}
    if(a==='cbtoeopslaan'){const van=document.getElementById('cbVan').value.trim(),tot=document.getElementById('cbTot').value.trim(),f=t=>document.getElementById('fout').textContent=t;
      if(!van)return f('Vul een nummer in.');let nrs=[van];
      if(tot){if(!/^\d+$/.test(van)||!/^\d+$/.test(tot))return f('Een reeks kan alleen met cijfers.');const a2=parseInt(van,10),b2=parseInt(tot,10);if(b2<a2)return f('Het laatste nummer is kleiner dan het eerste.');if(b2-a2>=1000)return f('Maximaal 1000 bonnen per keer.');
        nrs=[];for(let x=a2;x<=b2;x++)nrs.push(String(x).padStart(van.length,'0'))}
      const waarde=centen(bewerk.bedragTekst);let nieuw=0,al=0;for(const nr of nrs){if(S.cadeau[nr]){al++;continue}S.cadeau[nr]={nr,status:'voorraad',bedrag:waarde||null,notitie:'',toegevoegd:nu};nieuw++}
      bewaar();sluit();cbTab='voorraad';render();toast(`${nieuw} ${nieuw===1?'bon':'bonnen'} toegevoegd${waarde?` à ${euro(waarde)}`:''}${al?`, ${al} bestond${al===1?'':'en'} al`:''}`);return}
    const b=S.cadeau[bewerk?.nr];if(!b)return;
    if(a==='cbwaardezet'){const c=centen(bewerk.bedragTekst);if(!c||c<=0)return document.getElementById('fout').textContent='Vul een geldig bedrag in.';b.bedrag=c;bewaar();render();openBon(b.nr);return}
    if(a==='cbuitgeven'){if(!b.bedrag)return;b.status='uit';b.notitie=document.getElementById('cbNotitie')?.value.trim()||'';b.uit=nu;bewaar();sluit();render();toast(`Bon ${b.nr} uitgegeven: ${euro(b.bedrag)}`);return}
    if(a==='cbinwisselen'){if(b.status!=='uit')return;b.status='gebruikt';b.gebruikt=nu;bewaar();sluit();render();toast(`Bon ${b.nr} ingewisseld (${euro(b.bedrag)})`);return}
    if(a==='cbuitterug'){b.status='voorraad';b.uit=null;b.notitie='';bewaar();openBon(b.nr);render();return}
    if(a==='cbgebruiktterug'){b.status='uit';b.gebruikt=null;bewaar();openBon(b.nr);render();return}
    if(a==='cbweg'){if(b.status!=='voorraad')return;if(!verwStap){verwStap=true;b2tekst(e);return}delete S.cadeau[b.nr];bewaar();sluit();render();return}
    return}
  case'managertoggle':managerOpen=!managerOpen;render();return;
  case'levering':openLevering();return;
  case'scanstop':scan=null;openLevering();return;
  case'scanok':if(scan)scanOvernemen();return;
  case'scanstap':{const r=scan?.regels[+v];if(!r)return;r.aantal=Math.max(0,r.aantal+ +b.dataset.n);r.zeker=r.doel?true:r.zeker;r.twijfel=false;toonScan();return}
  case'installeer':installeer();return;
  case'bijwerken':werkBij();return;
  case'updatecheck':controleerUpdate();return;
  case'pbfout':meldLeesfout();return;
  case'pakbonopen':openPakbon(v);return;
  case'pakbonophalen':{const lv=S.levering[v];if(!lv?.fotoId||!db?.haal)return;b.disabled=true;b.textContent='Ophalen…';try{const r=await db.haal('notfoto:'+lv.fotoId);if(r?.data)toonFoto(r.data);else{toast('Foto niet gevonden op de server');b.remove()}}catch(e){toast('Ophalen lukt nu niet (geen internet?)');b.disabled=false;b.textContent='📷 Foto van de pakbon ophalen'}return}
  case'pakbonfoto':{const lv=S.levering[v];if(lv?.fotoId&&S.notfotos[lv.fotoId])toonFoto(S.notfotos[lv.fotoId]);return}
  case'verschildeel':{const lv=S.levering[v];if(lv)deelTekst(verschilTekst(v,lv),'Verschil levering');return}
  case'pffoto':if(isAdmin()&&S.notfotos[v])toonFoto(S.notfotos[v]);return;
  case'pfdeel':if(isAdmin())deelLeesfout(v);return;
  case'pfweg':if(!isAdmin()||!confirm('Deze melding verwijderen?'))return;delete S.pbFouten[v];S.notfotos[v]=null;bewaar();render();return;
  case'levfoto':{const lv=S.levering[datum];if(lv?.fotoId&&S.notfotos[lv.fotoId])toonFoto(S.notfotos[lv.fotoId]);return}
  case'levstap':{const i=document.getElementById('lev-'+v);const cur=getal(i.value);i.value=Math.max(0,(cur??(+b.dataset.n>0?0:0))+ +b.dataset.n);return}
  case'levopslaan':{const d=datum,items={},l=S.soorten.filter(x=>x.type==='vers'&&x.naam.trim());for(const x of l){const n=getal(document.getElementById('lev-'+x.id)?.value);items[x.id]=n??0}
    if(!bewerk.pakbon){const af=l.filter(x=>{const bes=dagTotaal(planKeyVoor(d),x),n=items[x.id];return Math.abs(n-bes)>=Math.max(5,Math.ceil(bes*0.5))}).map(x=>`${x.naam}: besteld ${dagTotaal(planKeyVoor(d),x)}, geleverd ${items[x.id]}`);if(af.length&&!confirm('Klopt dit? Deze aantallen wijken veel af van de bestelling:\n\n'+af.join('\n')+'\n\nToch opslaan?'))return}
    const oud=S.levering[d];let fotoId=oud?.fotoId||null;if(bewerk.foto){fotoId='lv'+d;S.notfotos[fotoId]=bewerk.foto}
    undoStart('Levering ingevuld');S.levering[d]={items,wie:ik().naam,t:Date.now(),fotoId,...(bewerk.pakbon?{pakbon:bewerk.pakbon,pbNaam:bewerk.pbNaam||{}}:{})};
    log(`Levering ${datumTekst(d)}: ${l.map(x=>`${x.naam} ${items[x.id]}`).join(', ')}`);{const nv=levVerschil(S.levering[d]).length;chatAuto(`🚚 Levering ${datumTekst(d)} ingevuld door ${ik().naam}${nv?` · ${nv} ${nv===1?'verschil':'verschillen'} met de pakbon`:''}`)}bewaar();sluit();render();undoToon();if(levVerschil(S.levering[d]).length)toonVerschil(d);else bevestig('✓ Levering opgeslagen');return}
  case'snij':{const s=S.soorten.find(x=>x.id===v),n=werkelijk(datum,moment,s),sn=snijVan(datum,moment,v,n),f=b.dataset.f,st=+b.dataset.n;
    const nw={hele:sn.hele,halve:sn.halve,derf:sn.derf};nw[f]=Math.max(0,nw[f]+st);if(nw.hele+nw.halve/2+nw.derf>n+1e-9){toast('Meer kan niet: dan kom je boven het geleverde aantal');return}
    S.snij[datum]=S.snij[datum]||{};S.snij[datum][moment]=S.snij[datum][moment]||{};S.snij[datum][moment][v]=nw;
    log(`${s.naam}: ${nw.hele} heel, ${nw.halve} half`,'snij:'+datum+v);bewaar();render();return}
  case'snijreset':{const s2=S.soorten.find(x=>x.id===v),n=werkelijk(datum,moment,s2),x=S.snij[datum]?.[moment]?.[v],derf=x&&typeof x==='object'?x.derf||0:0;
    if(derf)S.snij[datum][moment][v]={...snijStd(v,n-derf),derf};else if(S.snij[datum]?.[moment])delete S.snij[datum][moment][v];
    log(`${s2.naam}: terug naar standaardverdeling`);bewaar();render();return}
  case'snijderf':{const s=S.soorten.find(x=>x.id===v),n=werkelijk(datum,moment,s),sn=snijVan(datum,moment,v,n);if(!sn.rest)return;
    const hele=Math.floor(sn.rest),halve=Math.round((sn.rest-hele)*2),c=conceptVan(datum),x=c[v]=c[v]||{};x.hh=x.hh||{};const hh=x.hh.weg=x.hh.weg||{hele:0,halve:0};hh.hele+=hele;hh.halve+=halve;x.weg=hh.hele+hh.halve/2;bewaarL();
    S.snij[datum]=S.snij[datum]||{};S.snij[datum][moment]=S.snij[datum][moment]||{};S.snij[datum][moment][v]={hele:sn.hele,halve:sn.halve,derf:sn.derf+sn.rest};
    log(`${s.naam}: ${fmt(sn.rest)} brood naar derving`);bewaar();render();toast(`${fmt(sn.rest)} brood bij Derving gezet – tik daar op Lijst opslaan`);return}
  case'cstep':{const c=conceptVan(dervDatum),x=c[v]=c[v]||{},cur=x[best];x[best]=Math.max(0,(cur??0)+(cur==null&&+b.dataset.n<0?0:+b.dataset.n));bewaarL();render();return}
  case'cstepH':{const c=conceptVan(dervDatum),x=c[v]=c[v]||{};x.hh=x.hh||{};const hh=x.hh[best]=x.hh[best]||{hele:0,halve:0};hh[b.dataset.deel]=Math.max(0,hh[b.dataset.deel]+ +b.dataset.n);x[best]=hh.hele+hh.halve/2;bewaarL();render();return}
  case'dannuleer':L.dervConcept[dervDatum]={};bewaarL();render();return;
  case'dnul':{const c=conceptVan(dervDatum),d=dervDatum,hist=S.historie[d];let n=0;for(const s of S.soorten){const g=hist?.gezet?.[s.id]??(hist?0:opgezetTotaal(d,s));if(g>0&&S.derving[d]?.[s.id]==null&&!c[s.id]){c[s.id]={[best]:0};n++}}bewaarL();render();toast(n?`${n} ${n===1?'soort':'soorten'} op 0 gezet – tik op Derving opslaan`:'Alle soorten zijn al ingevuld');return}
  case'dopslaan':{const d=dervDatum,c=conceptVan(d),ids=Object.keys(c);if(!ids.length)return;
    {const hist=S.historie[d],te=ids.map(sid=>{const s2=S.soorten.find(x=>x.id===sid),g=hist?.gezet?.[sid]??(hist?0:opgezetTotaal(d,s2)),al=S.derving[d]?.[sid]||0,nu2=conceptTot(c[sid]);return s2&&nu2+al>g&&nu2>0?`${s2.naam}: ${fmt(nu2+al)} derving, maar ${fmt(g)} opgezet`:null}).filter(Boolean);
     if(te.length&&!confirm('Klopt dit?\n\n'+te.join('\n')+'\n\nToch opslaan?'))return}zorgReg(d);const id='r'+Date.now().toString(36),items={};
    for(const sid of ids){const x=c[sid];items[sid]={weg:x.weg||0,vb:x.vb||0,tg:x.tg||0,...(x.hh?{hh:kloon(x.hh)}:{})}}
    S.dervReg[d][id]={id,t:Date.now(),wie:ik().naam,items,kassa:null,kassaVink:{}};herbereken(d);L.dervConcept[d]={};bewaarL();
    log(`Dervinglijst opgeslagen (${datumTekst(d)}): ${ids.map(sid=>`${S.soorten.find(x=>x.id===sid)?.naam} ${fmt(conceptTot(items[sid]))}`).join(', ')}`);bewaar();render();bevestig('✓ Dervinglijst opgeslagen');return}
  case'kassa':openKassa(v,b.dataset.d||dervDatum);return;
  case'dlijsten':openDagLijsten(v);return;
  case'kvink':{const r=S.dervReg[bewerk.d]?.[bewerk.id];if(!r)return;r.kassaVink=r.kassaVink||{};const aan=!r.kassaVink[v];if(aan)r.kassaVink[v]=true;else delete r.kassaVink[v];bewaar();
    b.classList.toggle('klaar',aan);const vv=b.querySelector('.vinkvak');if(vv)vv.textContent=aan?'✓':'';
    const alle=[...document.querySelectorAll('#paneel [data-a=kvink]')].every(x=>x.classList.contains('klaar')),ok2=document.querySelector('#paneel [data-a=kassaok]');if(ok2&&!r.kassa)ok2.classList.toggle('oplichten',alle);return}
  case'kassaok':{const r=S.dervReg[bewerk.d]?.[bewerk.id];if(!r)return;r.kassa=r.kassa?null:{wie:ik().naam,t:Date.now()};log(`Dervinglijst ${r.kassa?'verwerkt in kassa':'kassa ongedaan'} (${datumTekst(bewerk.d)})`);bewaar();
    if(r.kassa){sluit();render();if(prof().bevestig===false)toast('✓ Dervinglijst verwerkt in kassa');else bevestig('✓ Dervinglijst verwerkt in kassa')}else{render();openKassa(bewerk.id,bewerk.d)}return}
  case'kassaweg':{if(!verwStap){verwStap=true;b.textContent='Tik nogmaals om te verwijderen';return}const d=bewerk.d;delete S.dervReg[d][bewerk.id];herbereken(d);log(`Dervinglijst verwijderd (${datumTekst(d)})`);bewaar();sluit();render();return}
  case'bekijkdag':tab='lijst';datum=v;volgVandaag=v===iso();sub=null;render();m.scrollTop=0;return;
  case'zoek':zoekOpen=!zoekOpen;if(!zoekOpen)zoekTerm='';render();if(zoekOpen)setTimeout(()=>document.getElementById('kzZoek')?.focus(),30);return;
  case'pinfo':openInfo(v);return;
  case'rijmenu':{const s=S.soorten.find(x=>x.id===v);if(!s)return;toonSheet(`<div class="pkop"><span style="width:70px"></span><b>${esc(s.naam)}</b><button data-a="sluit" style="font-weight:700">Sluiten</button></div><div class="pinhoud"><div class="knoppen" style="flex-direction:column"><button class="knop rand" data-a="pinfo" data-v="${v}">ⓘ Productinfo</button><button class="knop rand" data-a="aanpas" data-v="${v}">✎ Aantal aanpassen</button></div></div>`);return}
  case'kzmeer':kzMeer=!kzMeer;if(!kzMeer&&zoekOpen){zoekOpen=false;zoekTerm=''}render();return;
  case'dervmeer':dervMeer=!dervMeer;if(!dervMeer){dervDatum=iso();best='weg'}render();return;
  case'notfoto':{for(const d in S.notities){const n=S.notities[d][v];if(n&&notFotoSrc(n)){toonFoto(notFotoSrc(n));return}}return}
  case'fotozoom':b.closest('.fotozoom').classList.toggle('groot');return;
  case'feestkopie':case'feestnul':{if(S.afwijkend[v])return;const dk=dagKey(v),plan={};if(a==='feestkopie')for(const mo of S.momenten){plan[mo.id]={};for(const s of S.soorten){const x=stuksIn(dk,mo.id,s);if(x>0)plan[mo.id][s.id]=x}}
    S.afwijkend[v]={naam:b.dataset.n,plan};log(`Feestdag ${b.dataset.n} (${datumTekst(v)}) als afwijkende dag${a==='feestnul'?', gesloten':''}`);bewaar();render();toast(a==='feestnul'?'Gesloten gezet':'Afwijkende dag gemaakt – aanpassen via Invullen');return}
  case'feestnee':S.feestNee[v]=true;bewaar();render();return;
  case'kartaak':openKarTaak(+v);return;
  case'kartaakzet':{S.karTaak[datum]=S.karTaak[datum]||{};if(v)S.karTaak[datum][bewerk.nr]=v;else delete S.karTaak[datum][bewerk.nr];
    log(`${karNaam(bewerk.nr)} ${datumTekst(datum)}: ${v?S.gebruikers.find(g=>g.id===v)?.naam:'niemand'}`);bewaar();sluit();render();return}
  case'vraagstuur':{const t=document.getElementById('vraagTekst').value.trim();if(!t)return document.getElementById('fout').textContent='Typ je vraag of melding.';
    const id=nieuwId();S.berichten[id]={id,van:ik().naam,uid:ik().id,tekst:t,t:Date.now(),gelezen:false};log('Bericht aan beheerder verstuurd');bewaar();sluit();toast('Verstuurd naar de beheerder');if(sub==='berichten')render();setTimeout(()=>stuurPush({}),1500);return}
  case'berichtgelezen':if(!isAdmin())return;if(S.berichten[v])S.berichten[v].gelezen=true;bewaar();render();return;
  case'berichtweg':if(!isAdmin())return;if(afwStap!=='br:'+v){afwStap='br:'+v;render();return}afwStap=null;delete S.berichten[v];bewaar();render();return;
  case'tourvolgende':if(tourStap<tourLijst().length-1){tourStap++;toonTour();return}
  case'tourklaar':document.getElementById('tour').classList.remove('open');if(L.sessie&&!prof().rondleiding){S.profielen[L.sessie]={...(S.profielen[L.sessie]||{}),rondleiding:true,versieGezien:APP_VERSIE};bewaar()}if(!toonNieuws())toonOverdracht();return;
  case'tourstart':tourStap=0;toonTour();return;
  case'gedaandag':gedaanDatum=+v===0?iso():plusDagen(gedaanDatum,+v);if(gedaanDatum>iso())gedaanDatum=iso();render();return;
  case'naarderving':tab='derving';dervDatum=iso();render();m.scrollTop=0;return;
  case'dagafsluiten':{const t=document.getElementById('afsluitNotitie')?.value.trim(),d=iso();S.afsluit[d]={wie:ik().naam,t:Date.now()};
    if(t){const m2=plusDagen(d,1),id=nieuwId();S.notities[m2]=S.notities[m2]||{};S.notities[m2][id]={id,tekst:t,wie:ik().naam,t:Date.now()}}
    log(`Dag ${datumTekst(d)} afgesloten`);chatAuto(`🌙 Dag afgesloten door ${ik().naam}`);bewaar();render();toast('Dag afgesloten');return}
  case'printen':printDag();return;
  case'printdeel':printDeel();return;
  case'nieuwstop':{const s=S.soorten.find(x=>x.id===v);if(s){s.nieuwSinds=null;log(`${s.naam} niet meer als nieuw gevolgd`);bewaar();render()}return}
  case'expsoort':exportSoort=v;window._export=null;render();return;
  case'expper':exportPeriode=v;window._export=null;render();return;
  case'exportvoorbeeld':exporteer();return;
  case'exportdeel':exportDeel();return;
  case'allerg':{const l=bewerk.allergenen,i=l.indexOf(v);if(i>=0)l.splice(i,1);else l.push(v);b.classList.toggle('aan',i<0);return}
  case'feestdicht':document.getElementById('feest').classList.remove('open');return;
  case'thema':zetProf('thema',v);return;
  case'prof':{const k=b.dataset.k;zetProf(k,k==='moment'?(v||null):v);return}
  case'plusort':pluSort=v;render();return;
  case'progopen':openProgramma(v);return;
  case'prognieuw':openProgramma(null);return;
  case'progsoort':{const k=bewerk.keuze;if(k[v])delete k[v];else k[v]=true;renderProgLijst();return}
  case'progkies':bewerk.programmaId=v||null;document.querySelectorAll('#progChips .chip').forEach(c=>c.classList.toggle('aan',c.dataset.v===v));toonProgInfo();return;
  case'progopslaan':{const naam=document.getElementById('pNaam').value.trim(),f=t=>document.getElementById('fout').textContent=t;if(!naam)return f('Vul de naam van het programma in.');
    if(Object.values(S.programmas).some(p=>p.id!==bewerk.id&&p.naam.toLowerCase()===naam.toLowerCase()))return f('Er is al een programma met deze naam.');
    const g=id=>getal(document.getElementById(id).value);S.programmas[bewerk.id]={id:bewerk.id,naam,temp:g('pTemp'),baktijd:g('pTijd'),notitie:document.getElementById('pNotitie').value.trim()};
    let n=0;for(const x of S.soorten){if(bewerk.keuze[x.id]){if(x.programmaId!==bewerk.id)n++;x.programmaId=bewerk.id}else if(x.programmaId===bewerk.id)x.programmaId=null}
    syncProgVelden();log(`Bakprogramma ${naam} ${bewerk.nieuw?'toegevoegd':'gewijzigd'} (${Object.keys(bewerk.keuze).length} producten)`);bewaar();sluit();render();return}
  case'progweg':{if(!verwStap){verwStap=true;b.textContent='Tik nogmaals om te verwijderen';return}const p=S.programmas[bewerk.id];
    for(const x of S.soorten)if(x.programmaId===bewerk.id){x.programmaId=null;x.programma=''}delete S.programmas[bewerk.id];log(`Bakprogramma ${p?.naam} verwijderd`);bewaar();sluit();render();return}
  case'bijnieuw':if(datum!==iso()){datum=iso();volgVandaag=false;ovenModus=false;render();toast('Bijbakken doe je voor vandaag – lijst van vandaag geopend')}openBijbak();return;
  case'bijkies':{const k=bewerk.keuze,sx=S.soorten.find(x=>x.id===v);if(k[v])delete k[v];else k[v]={platen:1,perPlaat:sx?.max||12};renderBijSheet();return}
  case'bijstap':{const c=bewerk.keuze[v],sx=S.soorten.find(x=>x.id===v);if(!c)return;const f=b.dataset.f;
    c[f]=f==='platen'?Math.max(1,Math.min(S.ovenMax,c[f]+ +b.dataset.n)):Math.max(1,Math.min(sx?.max||99,c[f]+ +b.dataset.n));renderBijSheet();return}
  case'bijopslaan':{undoStart('Bijbakken');const k=bewerk.keuze,ids=Object.keys(k),f=t=>{const e=document.getElementById('fout');if(e)e.textContent=t};
    if(!ids.length)return f('Tik minimaal één soort aan.');const pl=ids.reduce((a,id)=>a+k[id].platen,0);if(pl>S.ovenMax)return f(`Maximaal ${S.ovenMax} platen in de oven.`);
    const items=ids.map(id=>({soort:id,platen:k[id].platen,perPlaat:k[id].perPlaat,n:k[id].platen*k[id].perPlaat})),id=nieuwId();
    S.bijbak[datum]=S.bijbak[datum]||{};S.bijbak[datum][id]={id,items,t:Date.now(),wie:ik().naam,klaar:null};for(const i of items)historieBij(datum,i.soort,i.n);
    log(`Bijbakken (${pl} ${pl===1?'plaat':'platen'}): ${items.map(i=>`${i.platen}×${i.perPlaat} ${S.soorten.find(x=>x.id===i.soort)?.naam}`).join(', ')}`);bewaar();sluit();render();undoToon();return}
  case'bijklaar':{undoStart('Bijbakken afgebakken');const x=S.bijbak[datum]?.[v];if(!x)return;x.klaar=x.klaar?null:{wie:ik().naam,t:Date.now()};
    log(`Bijbakken lading ${tijdTekst(x.t)}: ${x.klaar?'afgebakken':'afgebakken ongedaan'}`);bewaar();render();undoToon();return}
  case'bijweg':{if(afwStap!=='bij:'+v){afwStap='bij:'+v;render();return}afwStap=null;undoStart('Bijbak-lading verwijderd');const x=S.bijbak[datum]?.[v];
    if(x){for(const i of bijItems(x))historieBij(datum,i.soort,-i.n);log(`Bijbakken lading ${tijdTekst(x.t)} verwijderd`);delete S.bijbak[datum][v]}bewaar();render();undoToon();return}
  case'ovenklaar':{undoStart('Afgebakken');const gek=ovenGekozen(maakLijst(datum,moment));if(!gek.length)return;const tot=gek.reduce((t,g)=>t+g.n,0);if(tot>S.ovenMax)return;
    for(const g of gek){const st=stat(datum,moment,g.gk,true);st.gebakken=(st.gebakken||0)+g.n;st.wie=ik().naam;st.t=Date.now()}
    log(`Afgebakken (${tot} ${tot===1?'plaat':'platen'}): ${gek.map(g=>`${g.n}× ${g.regels.map(r=>r.s.naam).join(' + ')}`).join(', ')}`);ovenModus=false;ovenKeuze={};bewaar();render();undoToon();return}
  case'afbak':openAfbak(v);return;
  case'afbakstap':{const i=document.getElementById('aanpasIn');i.value=Math.max(0,Math.min(bewerk.max,(getal(i.value)||0)+ +b.dataset.n));return}
  case'afbakopslaan':{undoStart('Afgebakken aangepast');const n=Math.max(0,Math.min(bewerk.max,getal(document.getElementById('aanpasIn').value)||0)),st=stat(datum,moment,bewerk.gk,true);
    st.gebakken=n;st.oven=0;st.schap=0;log(`Afgebakken aangepast: ${n} ${n===1?'plaat':'platen'}`);bewaar();sluit();render();undoToon();return}
  case'hele':{undoStart('Hele broden aangepast');const s=S.soorten.find(x=>x.id===v),n=werkelijk(datum,moment,s),h=heleVan(datum,moment,v,n)+ +b.dataset.n;
    S.snij[datum]=S.snij[datum]||{};S.snij[datum][moment]=S.snij[datum][moment]||{};S.snij[datum][moment][v]=Math.max(0,Math.min(n,h));
    log(`${s.naam}: ${S.snij[datum][moment][v]} hele + ${(n-S.snij[datum][moment][v])*2} halve`,'snij:'+datum+v);bewaar();render();undoToon();return}
  case'stepH':{const d=dervDatum,deel=b.dataset.deel,s=S.soorten.find(x=>x.id===v);S.dervHH[d]=S.dervHH[d]||{};S.dervHH[d][v]=S.dervHH[d][v]||{};
    const hh=S.dervHH[d][v][best]=S.dervHH[d][v][best]||{hele:0,halve:0};hh[deel]=Math.max(0,hh[deel]+ +b.dataset.n);
    zetDerving(d,v,best,hh.hele+hh.halve/2);log(`Derving ${datumTekst(d)}: ${s.naam} ${BESTEMMING.find(y=>y[0]===best)[1].toLowerCase()} = ${hh.hele} heel, ${hh.halve} half`,'d:'+d+v+best);bewaar();render();return}
  case'ontdag':ontDatum=+v===0?plusDagen(iso(),1):plusDagen(ontDatum,+v);render();return;
  case'ontnieuw':openOntdooi();return;
  case'dervextra':if(!mag('derving'))return;openDervExtra();return;
  case'dervextrakies':{if(!mag('derving'))return;const s=S.soorten.find(x=>x.id===v);if(!s)return;L.dervExtra=L.dervExtra||{};const l=L.dervExtra[dervDatum]=L.dervExtra[dervDatum]||[];if(!l.includes(v))l.push(v);bewaarL();dervZoek='';sluit();render();toast(`${s.naam} staat nu bij de derving`);
    setTimeout(()=>{const x=document.querySelector(`[data-v="${v}"][data-a^=cstep]`)?.closest('.rij');if(x){x.scrollIntoView({block:'center'});x.classList.remove('flits');void x.offsetWidth;x.classList.add('flits')}},50);return}
  case'volgorde':{L.volgorde=v==='az'?'az':'eigen';bewaarL();document.querySelectorAll('.volgkeuze .chip').forEach(c=>c.classList.toggle('aan',c.dataset.v===L.volgorde));
    const sc=document.querySelector('#paneel .pinhoud')?.scrollTop;
    if(document.getElementById('sheet')?.classList.contains('open')){if(bewerk?.soort==='extra')renderExtraSheet();else if(bewerk?.soort==='bijbak')renderBijSheet();else if(bewerk?.soort==='dervextra')renderDervExtra();else if(bewerk?.soort==='ontdooi'){const el=document.getElementById('ontChips');if(el)el.innerHTML=ontChipsHtml()}}else if(tab==='derving'){render();return}
    const p=document.querySelector('#paneel .pinhoud');if(p&&sc!=null)p.scrollTop=sc;return}
  case'ontkies':{bewerk.id=bewerk.id===v?null:v;document.querySelectorAll('#ontChips .chip').forEach(c=>c.classList.toggle('aan',c.dataset.v===bewerk.id));return}
  case'ontopslaan':{const t=document.getElementById('ontTekst').value.trim(),n=getal(document.getElementById('aanpasIn').value);
    if(!bewerk.id&&!t)return document.getElementById('fout').textContent='Kies een broodsoort of typ iets.';
    const id=nieuwId();S.ontdooi[ontDatum]=S.ontdooi[ontDatum]||{};S.ontdooi[ontDatum][id]={id,soort:bewerk.id,tekst:bewerk.id?'':t,n:n||0,wie:ik().naam,t:Date.now(),klaar:null};
    log(`Ontdooien zoet ${datumTekst(ontDatum)}: ${ontdooiNaam(S.ontdooi[ontDatum][id])}${n?' ('+n+')':''} toegevoegd`);bewaar();sluit();render();return}
  case'ontvink':{const x=S.ontdooi[ontDatum]?.[v];if(!x)return;x.klaar=x.klaar?null:{wie:ik().naam,t:Date.now()};log(`Ontdooien zoet: ${ontdooiNaam(x)} ${x.klaar?'uit vriezer':'teruggezet'}`);bewaar();render();return}
  case'ontweg':{if(afwStap!=='ont:'+v){afwStap='ont:'+v;render();return}afwStap=null;const x=S.ontdooi[ontDatum]?.[v];if(x){log(`Ontdooien zoet: ${ontdooiNaam(x)} verwijderd`);delete S.ontdooi[ontDatum][v]}bewaar();render();return}
  case'afwstart':afwForm.start=v;render();return;
  case'afwnul':{if(afwStap!=='nul:'+v){afwStap='nul:'+v;render();return}afwStap=null;S.afwijkend[v].plan={};log(`Afwijkende dag ${datumTekst(v)}: alles op 0`);bewaar();render();return}
  case'typekies':bewerk.type=v;document.querySelectorAll('#typeChips .chip').forEach(c=>c.classList.toggle('aan',c.dataset.v===v));toonTypeVelden();return;
  case'snijstd':bewerk.snijStandaard=v;document.querySelectorAll('#stdChips .chip').forEach(c=>c.classList.toggle('aan',c.dataset.v===v));return;
  case'snijkies':bewerk.gesneden=v;document.querySelectorAll('#snijChips .chip').forEach(c=>c.classList.toggle('aan',c.dataset.v===v));toonTypeVelden();return;
  case'gebruik':{const s=S.soorten.find(x=>x.id===v);verdeelAdvies(planKeuze,s,+b.dataset.n);log(`Advies gebruikt: ${s.naam} ${planNaam(planKeuze)} → ${b.dataset.n}`);bewaar();render();return}
  case'allesadvies':openAllesAdvies();return;
  case'adviestoepassen':{const l=adviesLijst();l.forEach(x=>verdeelAdvies(planKeuze,x.s,x.a.aantal));log(`Alles op advies (${planNaam(planKeuze)}): ${l.length} soorten`);bewaar();sluit();render();return}
  case'kopieer':openKopieer();return;
  case'kopkies':{bewerk.doel[v]=!bewerk.doel[v];b.classList.toggle('aan',bewerk.doel[v]);return}
  case'kopieerdoe':{const doelen=Object.keys(bewerk.doel).filter(k=>bewerk.doel[k]);if(!doelen.length)return document.getElementById('fout').textContent='Kies minimaal één dag.';
    const bron={};for(const mo of S.momenten){bron[mo.id]={};for(const s of S.soorten)bron[mo.id][s.id]=stuksIn(planKeuze,mo.id,s)}
    const volgorde=doelen.includes('ma')?['ma',...doelen.filter(x=>x!=='ma')]:doelen;
    for(const d of volgorde)for(const mo of S.momenten)for(const s of S.soorten)zetStuks(d,mo.id,s.id,bron[mo.id][s.id]);
    log(`${dagNaam(planKeuze)} gekopieerd naar ${doelen.map(dagNaam).join(', ')}`);bewaar();sluit();render();return}
  case'karwissel':{const s=S.soorten.find(x=>x.id===v),nrs=karNrs(),i=nrs.indexOf(effKar(s)),nx=nrs[(i+1)%nrs.length];
    if(nx===s.kar)delete S.karOverride[v];else S.karOverride[v]=nx;log(`${s.naam} naar ${karNaam(nx)}`);bewaar();render();return}
  case'dd':{const d=plusDagen(dervDatum,+v);if(d<=iso()){dervDatum=d;render()}return}
  case'best':best=v;render();return;
  case'step':{const x=dervDetail(dervDatum,v),cur=x?x[best]:null,s=S.soorten.find(y=>y.id===v);
    zetDerving(dervDatum,v,best,(cur??0)+(cur==null&&+b.dataset.n<0?0:+b.dataset.n));log(`Derving ${datumTekst(dervDatum)}: ${s.naam} ${BESTEMMING.find(y=>y[0]===best)[1].toLowerCase()} = ${dervDetail(dervDatum,v)[best]}`,'d:'+dervDatum+v+best);bewaar();render();return}
  case'tel':openTel(v);return;
  case'telstap':{const i=document.getElementById(v);i.value=Math.max(0,(getal(i.value)||0)+ +b.dataset.n);return}
  case'telopslaan':{const s=S.soorten.find(x=>x.id===bewerk.id),dz=s.perDoos?(getal(document.getElementById('telDoos').value)||0):0,los=getal(document.getElementById('telLos').value)||0,n=dz*(s.perDoos||0)+los;
    S.voorraad[s.id]={basis:n,t:Date.now()};log(`Voorraad geteld: ${s.naam} ${voorraadTekst(s,n)}`);bewaar();sluit();render();return}
  case'leverdag':{const n=+v;S.leverdagen=S.leverdagen.includes(n)?S.leverdagen.filter(x=>x!==n):[...S.leverdagen,n];log('Leverdagen gewijzigd','lever');bewaar();render();return}
  case'week':rapWeek=+v===0?maandag(iso()):plusDagen(rapWeek,+v);if(rapWeek>iso())rapWeek=maandag(iso());render();return;
  case'deelrapport':{const t=rapportTekst();if(navigator.share)navigator.share({title:'Weekrapport broodkarren',text:t}).catch(()=>{});
    else if(navigator.clipboard)navigator.clipboard.writeText(t).then(()=>{b.textContent='Gekopieerd!'}).catch(()=>{});return}
  case'afwtoevoegen':{const d=afwForm.datum,n=afwForm.naam.trim(),f=t=>document.getElementById('fout').textContent=t;
    if(!d)return f('Kies een datum.');if(!n)return f('Vul een naam in.');if(S.afwijkend[d])return f('Voor deze datum bestaat al een afwijkende dag.');
    const dk=dagKey(d),plan={};if(afwForm.start!=='nul')for(const mo of S.momenten){plan[mo.id]={};for(const s of S.soorten){const x=stuksIn(dk,mo.id,s);if(x>0)plan[mo.id][s.id]=x}}
    S.afwijkend[d]={naam:n,plan};afwForm.naam='';log(`Afwijkende dag ${datumTekst(d)} (${n}) toegevoegd${afwForm.start==='nul'?', alles op 0':''}`);bewaar();render();return}
  case'afwweg':if(afwStap!==v){afwStap=v;render();return}log(`Afwijkende dag ${datumTekst(v)} verwijderd`);delete S.afwijkend[v];afwStap=null;bewaar();render();return;
  case'afwbewerk':planKeuze='afw:'+v;tab='plan';render();m.scrollTop=0;return;
  case'open':openSoort(S.soorten.find(s=>s.id===v));return;
  case'nieuw':openSoort({id:nieuwId(),naam:'',kar:+v,groep:'',min:1,max:12,temp:null,baktijd:null,perDoos:null,programma:'',instructie:'',nieuw:true});return;
  case'karerbij':{const nr=Math.max(0,...S.karren.map(k=>k.nr))+1;S.karren.push({nr,naam:'Kar '+nr});log(`Kar ${nr} toegevoegd`);bewaar();render();return}
  case'karweg':S.karren=S.karren.filter(k=>k.nr!==+v);for(const id in S.karOverride)if(S.karOverride[id]===+v)delete S.karOverride[id];log(`Kar ${v} verwijderd`);bewaar();render();return;
  case'momenterbij':{const id='m'+Date.now().toString(36);S.momenten.push({id,naam:'Bakmoment '+(S.momenten.length+1)});log('Bakmoment toegevoegd');bewaar();render();return}
  case'momentweg':{if(afwStap!==v){afwStap=v;render();return}const mo=S.momenten.find(x=>x.id===v);S.momenten=S.momenten.filter(x=>x.id!==v);
    for(const k of Object.keys(S.plan))delete S.plan[k][v];for(const d in S.afwijkend)delete S.afwijkend[d].plan[v];log(`Bakmoment ${mo?.naam} verwijderd`);afwStap=null;bewaar();render();return}
  case'sluit':sluit();return;
  case'opslaan':soortOpslaan();return;
  case'fotoweg':if(bewerk){bewerk.foto=null;document.getElementById('fotoVoorbeeld').innerHTML='<span>Geen foto</span>'}return;
  case'kies':bewerk.kar=+v;document.querySelectorAll('#chips .chip').forEach(c=>c.classList.toggle('aan',c.dataset.v===v));return;
  case'omhoog':verschuif(-1);return;
  case'omlaag':verschuif(1);return;
  case'weg':if(bewerk?.soort!=='brood')return;if(!verwStap){verwStap=true;b.textContent='Tik nogmaals om te verwijderen';return}
    {const id=bewerk.id;log(`Broodsoort ${bewerk.naam} verwijderd`);S.soorten=S.soorten.filter(s=>s.id!==id);
    for(const k of Object.keys(S.plan))for(const mo in S.plan[k])delete S.plan[k][mo][id];for(const d in S.afwijkend)for(const mo in S.afwijkend[d].plan)delete S.afwijkend[d].plan[mo][id];
    delete S.karOverride[id];if(S.fotos[id])S.fotos[id]=null;bewaar();sluit();render();return}
  }
});
document.addEventListener('focusin',e=>{if(e.target.dataset)e.target.dataset.oud=e.target.value});
document.addEventListener('input',e=>{
  const t=e.target,ds=t.dataset||{};
  if(ds.kar){if(!mag('soorten'))return;const k=S.karren.find(x=>x.nr===+ds.kar);if(k)k.naam=t.value;else S.karren.push({nr:+ds.kar,naam:t.value});bewaar()}
  else if(ds.moment){if(!mag('soorten'))return;const mo=S.momenten.find(x=>x.id===ds.moment);if(mo){mo.naam=t.value;bewaar()}}
  else if(ds.plan){if(!mag('invullen'))return;zetStuks(planKeuze,moment,ds.plan,getal(t.value));bewaar();
    const s=S.soorten.find(x=>x.id===ds.plan),el=document.getElementById('h-'+ds.plan);if(el)el.innerHTML=planRegelHint(s)}
  else if(ds.cderv){if(!mag('derving'))return;const c=conceptVan(dervDatum),n=getal(t.value);if(n==null){if(c[ds.cderv]){delete c[ds.cderv][best];if(!['weg','vb','tg'].some(k=>c[ds.cderv][k]!=null))delete c[ds.cderv]}}else{c[ds.cderv]=c[ds.cderv]||{};c[ds.cderv][best]=n}bewaarL()}
  else if(ds.derv){if(!mag('derving'))return;const n=getal(t.value);if(n==null)wisDerving(dervDatum,ds.derv,best);else zetDerving(dervDatum,ds.derv,best,n);bewaar()}
  else if(t.id==='cbZoek'){cbZoek=t.value.trim();cbVernieuw()}
  else if(t.id==='meerZoek'){meerZoekFilter(t.value)}
  else if(t.id==='notZoek'){notZoek=t.value;const el=document.getElementById('notLijst');if(el)el.innerHTML=notLijstHtml()}
  else if(t.id==='kzZoek'){zoekTerm=t.value;zoekFilter()}
  else if(t.id==='pluZoek'){pluZoek=t.value;const el=document.getElementById('pluLijst');if(el)el.innerHTML=pluLijstHtml()}
  else if(t.id==='afwNaam')afwForm.naam=t.value;
  else if(t.id==='afwDatum'&&t.value)afwForm.datum=t.value;
  else if(t.id==='ovenMaxIn'){if(!mag('soorten'))return;const n=getal(t.value);if(n>0){S.ovenMax=n;bewaar()}}
});
document.addEventListener('change',e=>{
  const t=e.target,ds=t.dataset||{},naam=id=>S.soorten.find(x=>x.id===id)?.naam;
  if(t.id==='dervdatum'&&t.value){dervDatum=t.value>iso()?iso():t.value;render()}
  else if(t.id==='planSelect'){planKeuze=t.value;render()}
  else if(t.id==='stilVan'||t.id==='stilTot'){if(isAdmin()){S.push.stil={...(S.push.stil||{van:21,tot:7}),[t.id==='stilVan'?'van':'tot']:+t.value};bewaar()}}
  else if(t.id==='loginNaam'){loginKeuze=t.value;pinInvoer='';pinMelding='';render()}
  else if(t.id==='afwDatum'&&t.value)afwForm.datum=t.value;
  else if(t.id==='verberg0'){L.verberg0=t.checked;bewaarL();render()}
  else if(ds.prof){zetProf(ds.prof,t.checked)}
  else if(t.id==='dervUur'){zetProf('dervUur',+t.value)}
  else if(t.id==='herAan'){if(isAdmin()){S.herinnering={...S.herinnering,aan:t.checked};bewaar();render()}}
  else if(t.id==='herTijd'){if(isAdmin()){const[u,m]=t.value.split(':').map(Number);S.herinnering={...S.herinnering,uur:u,min:m};bewaar()}}
  else if(ds.prijs){if(isAdmin()){const n=parseFloat(String(t.value).replace(',','.'));if(isFinite(n)&&n>=0)S.prijzen[ds.prijs]=Math.round(n*100)/100;else delete S.prijzen[ds.prijs];bewaar();render()}}
  else if(ds.plan&&ds.oud!==t.value){log(`Invullen ${planNaam(planKeuze)}${S.momenten.length>1?' '+momentNaam(moment):''}: ${naam(ds.plan)} ${ds.oud||'–'} → ${t.value||'leeg'}`);bewaar();ds.oud=t.value}
  else if(ds.cderv&&ds.oud!==t.value){render()}
  else if(ds.derv&&ds.oud!==t.value){log(`Derving ${datumTekst(dervDatum)}: ${naam(ds.derv)} ${BESTEMMING.find(y=>y[0]===best)[1].toLowerCase()} = ${t.value||'leeg'}`,'d:'+dervDatum+ds.derv+best);bewaar();ds.oud=t.value;
    const el=document.getElementById('ds-'+ds.derv);if(el)el.innerHTML=dervSub(dervDatum,ds.derv,S.historie[dervDatum]?.gezet?.[ds.derv]??0)}
  else if(t.id==='fFoto'&&t.files&&t.files[0])verkleinFoto(t.files[0]);
  else if(t.id==='bbIn'&&t.files&&t.files[0]){const f=t.files[0];t.value='';bbInlezen(f)}
  else if(t.id==='logoIn'&&t.files&&t.files[0]){if(!isAdmin())return;verkleinNaar(t.files[0],520,src=>{S.winkelLogo=src;log('Eigen logo ingesteld');bewaar();render()},'image/png')}
  else if(t.id==='scanIn'&&t.files&&t.files[0]){if(!mag('vinken')||!heeft('scan'))return;startScan(t.files[0])}
  else if(t.dataset&&t.dataset.scan!=null&&scan){const i=+t.dataset.scan,r=scan.regels[i];if(t.value==='nieuw'){if(!mag('soorten')){toast('Geen rechten om een broodsoort aan te maken');t.value=r.doel;return}scanNieuweSoort(i)}else{r.doel=t.value;r.zeker=true;r.voorstel=false}toonScan()}
  else if(t.id==='levFotoIn'&&t.files&&t.files[0])verkleinNaar(t.files[0],1200,src=>{if(bewerk)bewerk.foto=src;const k=document.getElementById('levFotoKnop');if(k){k.classList.add('aan');k.firstChild.textContent='✓'}toast('Foto van de pakbon klaar')});
  else if(t.id==='notFotoIn'&&t.files&&t.files[0])verkleinNaar(t.files[0],1200,src=>{notFoto=src;const l=t.closest('.fotoknop');if(l){l.classList.add('aan');l.firstChild.textContent='✓'}toast('Foto klaar – typ eventueel tekst en tik op +')});
  else if(t.id==='notMetFoto'){notMetFoto=t.checked;const el=document.getElementById('notLijst');if(el)el.innerHTML=notLijstHtml()}
  else if(t.id==='pluZonder'){pluZonder=t.value;const el=document.getElementById('pluLijst');if(el)el.innerHTML=pluLijstHtml()}
  else if(t.id==='ovenMaxIn'){log(`Oven max. ${S.ovenMax} platen`,'ovenmax');t.value=S.ovenMax}
  else if(t.id==='omschakelIn'){if(!mag('soorten'))return;S.omschakel=t.value===''?null:+t.value;log(`Klaarzetten voor morgen: ${S.omschakel==null?'uit':'vanaf '+S.omschakel+':00'}`);if(volgVandaag)datum=standaardDatum();bewaar();render()}
  else if(ds.moment){log(`Bakmoment hernoemd: ${t.value}`);bewaar()}
});
document.addEventListener('keydown',e=>{if(blok){if(/^[0-9]$/.test(e.key)){blokToets(e.key);return}if(e.key==='Backspace'){blokToets('wis');return}if(e.key==='Enter'){blokToets('volgende');return}}if(document.querySelector('.cijferblok')&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||'')){if(/^[0-9]$/.test(e.key)){document.querySelector(`.cijferblok [data-v="${e.key}"]`)?.click();return}if(e.key==='Backspace'){document.querySelector('.cijferblok .wis')?.click();return}}if(e.key!=='Enter')return;
  if(e.target.id==='notitieIn'){document.querySelector('[data-a=notitie]')?.click();return}
  const b=document.querySelector('[data-a=login],[data-a=setup],[data-a=koppel],[data-a=koppelcode],[data-a=uitnodigingstart]');if(b)b.click()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(L.sessie){L.wegSinds=Date.now();bewaarL()}bewaarNu();if(nieuweBouw&&!updatesTonen()&&kanUpdaten())setTimeout(()=>{if(document.hidden)werkBij(true)},1500);return}const was=!!L.sessie;weerLaden();volgHash();zoekUpdate(true);if(volgVandaag)datum=standaardDatum();controleerSessie();if(was&&!L.sessie){werk=null;document.getElementById('werk').classList.remove('open');sluit();sluitBlok()}if(L.gekoppeld&&db)sync();if(WINKEL&&db?.rpc&&Date.now()-(L.winkelsT||0)>36e5){L.winkelsT=Date.now();vernieuwWinkels().then(()=>renderZacht())}render();nieuwsNaStart()});
window.addEventListener('pagehide',()=>{if(L.sessie){L.wegSinds=Date.now();bewaarL()}});
setInterval(()=>{const was=!!L.sessie;controleerSessie();if(was&&!L.sessie){werk=null;document.getElementById('werk').classList.remove('open');sluit();render()}},60000);

