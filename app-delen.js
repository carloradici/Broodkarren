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
  bestellen:[['home','Home'],['meer','Meer']],kantoor:[['home','Kantoor'],...(urenMag()?[['uren','Uren']]:[]),['meer','Meer']]};return t[deel]||t.brood}
const isDonker=()=>{const t=prof().thema;return t==='donker'||(t!=='licht'&&matchMedia('(prefers-color-scheme: dark)').matches)};
const donkerRij=()=>`<div class="sectie menu"><div class="rij"><button class="regel" data-a="donker"><div class="groei"><div class="naam">${isDonker()?'☀️ Lichte modus':'🌙 Donkere modus'}</div><div class="sub">Wissel tussen licht en donker</div></div><span class="pijl">›</span></button></div></div>`;
function kiesHtml(){const g=ik(),u=new Date().getHours(),groet=u<12?'Goedemorgen':u<18?'Goedemiddag':'Goedenavond',{n,k}=homeKlaar(),o=betalenMag()?tbOpen().length:0;
  const sub={bestellen:'Besteladvies, bestelboeken en straks retourbonnen',brood:n?(k===n?'✓ Alles klaargezet':`Nog ${n-k} klaar te zetten`):'Klaarzetten, derving en taken',kantoor:o?`${o} ${o===1?'factuur':'facturen'} te betalen`:'Facturen, uren, rooster en beheer'};
  return`<div class="kop"><div class="koprij"><h1>${groet} ${esc((g.naam||'').split(' ')[0])}</h1>${info('delen')}</div><p>Waar ga je mee aan de slag?</p></div>
  <div class="deeltegels">${delen().map(d=>`<button class="deeltegel deel-${d}" data-a="deel" data-v="${d}"><span class="deelic">${DELEN[d][0]}</span><span class="groei"><b>${DELEN[d][1]}</b><span class="sub">${esc(sub[d])}</span></span><span class="pijl">›</span></button>`).join('')}</div>
  <label class="deelonthoud"><input type="checkbox" id="deelOnthoud" ${(L.deel||{})[g.id]?'checked':''}> Onthoud mijn keuze op dit toestel</label>${donkerRij()}
  <p class="sub" style="text-align:center;margin:12px 20px">Wisselen kan altijd met de knop bovenin.</p>`}
function bestellenHomeHtml(){return`<div class="kop"><div class="koprij"><h1>🛒 Bestellen</h1>${info('bestellen')}</div><p>Bestellen, tellen en acties. De functies van Besteladvies komen hier stap voor stap bij.</p></div>
  <div class="sectie menu"><div class="rij"><a class="regel" href="${BA_URL}" target="_blank" rel="noopener"><div class="groei"><div class="naam">🧮 Besteladvies openen</div><div class="sub">Bestelboeken, advies, tellen, acties en retourbonnen</div></div><span class="pijl">›</span></a></div>
  ${bbMag()?`<div class="rij"><button class="regel" data-a="sub" data-v="bestelboeken"><div class="groei"><div class="naam">📘 Bestelboeken</div><div class="sub">Eigen bestelboeken samenstellen en printen</div></div><span class="pijl">›</span></button></div>`:''}</div>`}
function kantoorHomeHtml(){const s=sub;sub='kantoor';try{return meerHtml().replace(/^<button class="terug"[^>]*>[^<]*<\/button>/,'')}finally{sub=s}}
function deelActie(a,v){
  if(a==='deel'){const g=ik();if(!g||!delen().includes(v))return true;const cb=document.getElementById('deelOnthoud');L.deel={...(L.deel||{})};if(cb&&cb.checked)L.deel[g.id]=v;else delete L.deel[g.id];bewaarL();deel=v;tab='home';sub=null;render();return true}
  if(a==='deelkies'){deel='';sub=null;tab='home';render();return true}
  if(a==='donker'){zetProf('thema',isDonker()?'licht':'donker');return true}
  return false}
