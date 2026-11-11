/* ================= 10.17 rooster ================= */
/* S.uren.rooster={id:{id,uid,d,van,tot,pauze,not}} — maps, samenvoegen veilig */
let rsWeek=null,rsStap=null;
const roosterAlle=()=>Object.values(isObj(S.uren?.rooster)?S.uren.rooster:{}).filter(r=>isObj(r)&&r.uid&&r.d&&r.van&&r.tot);
const roosterDag=(uid,d)=>roosterAlle().filter(r=>r.uid===uid&&r.d===d).sort((a,c)=>String(a.van).localeCompare(String(c.van)));
function rsEind(r){let a=urenTijdstip(r.d,r.van),b=urenTijdstip(r.d,r.tot);if(b<=a)b+=864e5;return b}
const rsDuur=r=>Math.max(0,rsEind(r)-urenTijdstip(r.d,r.van)-(+r.pauze||0)*60000);
const rsTekst=r=>`${r.van}–${r.tot}${+r.pauze?` (pauze ${r.pauze} min)`:''}`;
function rsVergelijk(r){const start=urenTijdstip(r.d,r.van),eind=rsEind(r),nu=Date.now(),kl=urenDiensten(r.uid).filter(x=>iso(new Date(x.in))===r.d).sort((a,c)=>a.in-c.in);
  if(!kl.length){if(nu<start)return{st:'gepland',t:''};if(nu<start+15*60000)return{st:'gepland',t:''};return{st:nu>eind?'weg':'laat',t:nu>eind?'niet gekomen':'nog niet ingeklokt'}}
  const p=[],te=Math.round((kl[0].in-start)/60000),laatst=kl[kl.length-1],gew=kl.reduce((t,x)=>t+urenNetto(x),0);
  if(te>5)p.push(`${te} min te laat`);
  if(laatst.uit){const vr=Math.round((eind-laatst.uit)/60000);if(vr>5)p.push(`${vr} min eerder weg`);else if(vr<-15)p.push(`${-vr} min langer`)}else p.push('nog ingeklokt');
  return{st:p.some(x=>/te laat|eerder/.test(x))?'afw':'ok',t:`${hhmm(kl[0].in)}–${laatst.uit?hhmm(laatst.uit):'nu'}${p.length?' · '+p.join(' · '):''}`,gew}}
const rsGepland=(uid,d)=>roosterDag(uid,d);
function rsExtra(van,tot){const uit=[];for(const p of urenMensen(true))for(const x of urenDiensten(p.uid)){const d=iso(new Date(x.in));if(d>=van&&d<=tot&&!roosterDag(p.uid,d).length)uit.push({p,x,d})}return uit}
function roosterHtml(){const w=rsWeek||maandag(iso()),dagen=[...Array(7)].map((_,i)=>plusDagen(w,i)),naam=uid=>urenNaam(uid),extra=rsExtra(w,plusDagen(w,6));
  let h=`<button class="terug" data-u="view" data-v="klok">‹ Uren</button><div class="kop"><div class="koprij"><div><h1>Rooster</h1><p>Plan de diensten. Na de dienst zie je wat er echt is geklokt.</p></div></div></div>
   <div class="datumrij"><button data-rs="week" data-v="-7">‹</button><div style="flex:1;text-align:center;font-weight:800">Week ${weeknr(w)}<div class="sub" style="font-weight:400">${esc(datumTekst(w))} – ${esc(datumTekst(plusDagen(w,6)))}</div></div><button data-rs="week" data-v="7">›</button></div>
   <div class="knoppen" style="justify-content:flex-start;gap:8px;flex-wrap:wrap;padding-top:0"><button class="knop rand klein" data-rs="kopie">${rsStap==='kopie'?'Zeker? Tik nogmaals':'Kopieer vorige week'}</button></div>`;
  for(const d of dagen){const l=roosterAlle().filter(r=>r.d===d).sort((a,c)=>String(a.van).localeCompare(String(c.van))||naam(a.uid).localeCompare(naam(c.uid),'nl')),ex=extra.filter(e=>e.d===d);
    h+=`<div class="sectie"><div class="karkop"><b>${esc(dagNaamLang(d))}</b>${d===iso()?' <span class="pil">vandaag</span>':''}<button class="knop rand klein" style="margin-left:auto" data-rs="nieuw" data-v="${d}">+ Dienst</button></div>
     ${l.map(r=>{const v=rsVergelijk(r);return`<button class="rij inv rsrij ${v.st}" data-rs="bewerk" data-v="${esc(r.id)}" style="width:100%;text-align:left"><div class="groei"><div class="naam" style="font-size:16px">${esc(naam(r.uid))} · ${esc(rsTekst(r))}</div>${v.t||r.not?`<div class="sub">${v.t?esc(v.t):''}${v.t&&r.not?' · ':''}${r.not?esc(r.not):''}</div>`:''}</div><span>${v.st==='ok'?'✓':v.st==='afw'?'⚠️':v.st==='weg'?'✕':''}</span></button>`}).join('')}
     ${ex.map(e=>`<div class="rij inv rsrij extra"><div class="groei"><div class="naam" style="font-size:16px">${esc(e.p.naam)} · ${hhmm(e.x.in)}–${e.x.uit?hhmm(e.x.uit):'nu'}</div><div class="sub">niet ingeroosterd · ${urenDuur(urenNetto(e.x))} gewerkt</div></div></div>`).join('')}
     ${!l.length&&!ex.length?'<p class="leeg" style="margin:8px 14px">Geen diensten.</p>':''}</div>`}
  const per={};for(const r of roosterAlle().filter(r=>r.d>=w&&r.d<=plusDagen(w,6))){(per[r.uid]=per[r.uid]||{g:0,w:0}).g+=rsDuur(r)}
  for(const p of urenMensen(true)){const l=urenIn(p.uid,w,plusDagen(w,6));if(l.length)(per[p.uid]=per[p.uid]||{g:0,w:0}).w=l.reduce((t,x)=>t+urenNetto(x),0)}
  const ids=Object.keys(per).sort((a,c)=>naam(a).localeCompare(naam(c),'nl'));
  if(ids.length)h+=`<div class="sectie"><div class="karkop"><b>Deze week: gepland en gewerkt</b></div>${ids.map(u=>{const x=per[u],vs=x.w-x.g;return`<div class="rij inv"><div class="groei"><div class="naam" style="font-size:16px">${esc(naam(u))}</div><div class="sub">gepland ${urenDuur(x.g)} · gewerkt ${urenDuur(x.w)}</div></div><b class="${Math.abs(vs)>15*60000?(vs<0?'oranjetekst':'groentekst'):''}">${vs>=0?'+':'−'}${urenDuur(Math.abs(vs))}</b></div>`}).join('')}</div>`;
  return h}
function rsFormulier(r,d){const n=!r;r=r||{d,van:'08:00',tot:'16:30',pauze:30};const mensen=urenMensen(false);
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>${n?'Dienst plannen':'Dienst'}</b><button data-rs="bewaar" data-v="${esc(r.id||'')}" style="font-weight:700">Bewaren</button></div><div class="pinhoud">
   <label>Medewerker</label><select class="veld" id="rsWie">${mensen.map(p=>`<option value="${esc(p.uid)}" ${p.uid===r.uid?'selected':''}>${esc(p.naam)}${p.extern?' (geen account)':''}</option>`).join('')}</select>
   <label>Datum</label><input class="veld" type="date" id="rsD" value="${esc(r.d)}" style="width:190px">
   <div class="minmax"><div><label>Van</label><input class="veld" type="time" id="rsVan" value="${esc(r.van)}"></div><div><label>Tot</label><input class="veld" type="time" id="rsTot" value="${esc(r.tot)}"></div></div>
   <label>Pauze (minuten)</label><input class="veld" id="rsP" inputmode="numeric" value="${+r.pauze||0}" style="width:110px">
   <label>Opmerking</label><input class="veld" id="rsNot" maxlength="120" value="${esc(r.not||'')}" placeholder="Bijv. kassa, vakken vullen">
   <div class="fout" id="fout"></div>
   ${n?'':`<div class="knoppen" style="justify-content:flex-start;padding:12px 0 0"><button class="knop rand rood klein" data-rs="weg" data-v="${esc(r.id)}">Dienst verwijderen</button></div>`}</div>`)}
function rsSchrijf(){const u=urenBasis();if(!isObj(u.rooster))u.rooster={};return u.rooster}
function roosterExportRijen(van,tot){const r=[['Medewerker','Datum','Dag','Gepland van','Gepland tot','Pauze gepland','Gepland (uren)','Geklokt in','Geklokt uit','Gewerkt','Verschil','Opmerking']];
  const l=roosterAlle().filter(x=>x.d>=van&&x.d<=tot).sort((a,c)=>a.d.localeCompare(c.d)||urenNaam(a.uid).localeCompare(urenNaam(c.uid),'nl'));
  for(const x of l){const kl=urenDiensten(x.uid).filter(y=>iso(new Date(y.in))===x.d).sort((a,c)=>a.in-c.in),gew=kl.reduce((t,y)=>t+urenNetto(y),0),v=rsVergelijk(x);
    r.push([urenNaam(x.uid),x.d,vanIso(x.d).toLocaleDateString('nl-NL',{weekday:'short'}),x.van,x.tot,+x.pauze||0,urenDuur(rsDuur(x)),kl[0]?hhmm(kl[0].in):'',kl.length&&kl[kl.length-1].uit?hhmm(kl[kl.length-1].uit):'',kl.length?urenDuur(gew):'',kl.length?(gew>=rsDuur(x)?'+':'−')+urenDuur(Math.abs(gew-rsDuur(x))):v.t,x.not||''])}
  for(const e of rsExtra(van,tot))if(e.x.uit)r.push([e.p.naam,e.d,vanIso(e.d).toLocaleDateString('nl-NL',{weekday:'short'}),'','','','',hhmm(e.x.in),hhmm(e.x.uit),urenDuur(urenNetto(e.x)),'niet ingeroosterd','']);
  return r}
function roosterHomeHtml(){const u=ik();if(!u)return'';const nu=Date.now(),l=roosterAlle().filter(r=>r.uid===u.id&&r.d>=iso()&&r.d<=plusDagen(iso(),6)&&rsEind(r)>nu).sort((a,c)=>a.d.localeCompare(c.d)||String(a.van).localeCompare(String(c.van))).slice(0,3);
  if(!l.length)return'';const dg=d=>d===iso()?'vandaag':d===plusDagen(iso(),1)?'morgen':vanIso(d).toLocaleDateString('nl-NL',{weekday:'short',day:'numeric',month:'short'});
  return`<div class="kaartje rshome" style="margin:10px 16px 0"><b>📅 Je diensten</b>${l.map(r=>`<div class="sub"><b>${esc(dg(r.d))}</b> ${esc(r.van)}–${esc(r.tot)}${r.not?' · '+esc(r.not):''}</div>`).join('')}</div>`}
document.addEventListener('click',e=>{const el=e.target.closest('[data-rs]');if(!el||el.tagName==='INPUT'||el.tagName==='SELECT')return;if(!isAdmin())return;L.laatsteActie=Date.now();const c=el.dataset.rs,v=el.dataset.v||'';
  try{switch(c){
  case'week':rsWeek=plusDagen(rsWeek||maandag(iso()),+v);rsStap=null;render();return;
  case'nieuw':rsFormulier(null,v);return;
  case'bewerk':{const r=rsSchrijf()[v];if(r)rsFormulier(r);return}
  case'bewaar':{const uid=document.getElementById('rsWie').value,d=document.getElementById('rsD').value,van=document.getElementById('rsVan').value,tot=document.getElementById('rsTot').value,p=parseInt(document.getElementById('rsP').value||'0',10),not=document.getElementById('rsNot').value.trim();
    const f=t=>{document.getElementById('fout').textContent=t};if(!uid)return f('Kies een medewerker.');if(!d)return f('Kies een datum.');if(!van||!tot)return f('Vul van en tot in.');if(!isFinite(p)||p<0)return f('Vul de pauze in minuten in (0 mag).');
    const id=v||urenId(),r={id,uid,d,van,tot,pauze:p,not:not.slice(0,120)};if(rsDuur(r)<=0)return f('De pauze is langer dan de dienst.');if(rsEind(r)-urenTijdstip(d,van)>16*3600e3)return f('Een dienst kan niet langer dan 16 uur zijn.');
    rsSchrijf()[id]=r;bewaar();sluit();rsWeek=maandag(d);render();toast(v?'Opgeslagen':'Dienst gepland');return}
  case'weg':{if(rsStap!=='weg:'+v){rsStap='weg:'+v;el.textContent='Zeker? Tik nogmaals';return}rsStap=null;delete rsSchrijf()[v];bewaar();sluit();render();toast('Verwijderd');return}
  case'kopie':{if(rsStap!=='kopie'){rsStap='kopie';render();setTimeout(()=>{if(rsStap==='kopie'){rsStap=null;render()}},5000);return}rsStap=null;const w=rsWeek||maandag(iso()),vw=plusDagen(w,-7),rs=rsSchrijf();let n=0;
    for(const r of roosterAlle().filter(r=>r.d>=vw&&r.d<=plusDagen(vw,6))){const d=plusDagen(r.d,7);if(roosterDag(r.uid,d).some(x=>x.van===r.van&&x.tot===r.tot))continue;const id=urenId();rs[id]={...r,id,d};n++}
    bewaar();render();toast(n?`${n} diensten gekopieerd`:'Niets te kopiëren');return}
  }}catch(z){meldFout(z,'Rooster')}});
/* ================= 10.17 checklists ================= */
/* S.checklists={lijsten:{id:{id,naam,tijd,taken:[{id,t}],volg}},dag:{iso:{lijstId:{taakId:{wie,t}}}}} */
let clKeuze=null,clDatum=null;
const CL_STANDAARD={open:{id:'open',naam:'Openen',tijd:'',volg:1,taken:[{id:'o1',t:'Alarm uit'},{id:'o2',t:'Verlichting aan'},{id:'o3',t:"Kassa's opstarten"},{id:'o4',t:'Wisselgeld klaarleggen'},{id:'o5',t:'Deuren open'}]},
  sluit:{id:'sluit',naam:'Sluiten',tijd:'',volg:2,taken:[{id:'s1',t:"Kassa's afsluiten"},{id:'s2',t:'Afval weg'},{id:'s3',t:'Verlichting uit'},{id:'s4',t:'Deuren op slot'},{id:'s5',t:'Alarm aan'}]}};
function clLijsten(){const l=isObj(S.checklists?.lijsten)&&Object.keys(S.checklists.lijsten).length?S.checklists.lijsten:CL_STANDAARD;return Object.values(l).filter(x=>isObj(x)&&!x.weg).sort((a,c)=>(a.volg||0)-(c.volg||0)||String(a.naam).localeCompare(String(c.naam)))}
const clAf=(d,lid)=>isObj(S.checklists?.dag?.[d]?.[lid])?S.checklists.dag[d][lid]:{};
function clStand(d,l){const af=clAf(d,l.id),t=(l.taken||[]).filter(x=>x&&x.id);return{n:t.filter(x=>af[x.id]).length,tot:t.length}}
function clHomeStatus(){const l=clLijsten();if(!l.length)return['Geen lijsten',false];const nu=new Date(),hm=String(nu.getHours()).padStart(2,'0')+':'+String(nu.getMinutes()).padStart(2,'0');let let_=false;
  const t=l.map(x=>{const s=clStand(iso(),x);if(x.tijd&&hm>=x.tijd&&s.n<s.tot)let_=true;return`${x.naam} ${s.n}/${s.tot}`}).join(' · ');return[t,let_]}
function checkHtml(){const l=clLijsten();if(!l.length)return`<div class="kop"><h1>Checklists</h1></div><p class="leeg">Nog geen checklists.</p>${isAdmin()?'<div class="knoppen"><button class="knop" data-cl="beheer">Lijsten maken</button></div>':''}`;
  if(!l.some(x=>x.id===clKeuze))clKeuze=l[0].id;const lijst=l.find(x=>x.id===clKeuze),d=clDatum||iso(),af=clAf(d,lijst.id),s=clStand(d,lijst);
  let h=`<div class="kop"><div class="koprij"><div><h1>Checklists</h1><p>Vink af wat gedaan is. Je naam en de tijd komen erbij.</p></div>${isAdmin()?'<button class="knop wit klein" data-cl="beheer">Aanpassen</button>':''}</div></div>
   ${l.length>1?`<div class="segment">${l.map(x=>{const t=clStand(d,x);return`<button data-cl="lijst" data-v="${esc(x.id)}" class="${x.id===lijst.id?'aan':''}">${esc(x.naam)} ${t.n}/${t.tot}</button>`}).join('')}</div>`:''}
   <div class="datumrij"><button data-cl="dag" data-v="${plusDagen(d,-1)}">‹</button><div style="flex:1;text-align:center;font-weight:800">${d===iso()?'Vandaag':esc(datumTekst(d))}<div class="sub" style="font-weight:400">${esc(dagNaamLang(d))}</div></div><button data-cl="dag" data-v="${plusDagen(d,1)}" ${d>=iso()?'disabled style="opacity:.3"':''}>›</button></div>
   <div class="kaartje"><div class="naam">${s.n===s.tot&&s.tot?'✓ Alles gedaan':`${s.n} van ${s.tot} gedaan`}</div>${lijst.tijd?`<div class="sub">Klaar om ${esc(lijst.tijd)}</div>`:''}</div>
   <div class="sectie">${(lijst.taken||[]).filter(x=>x&&x.id).map(t=>{const a=af[t.id];return`<button class="rij inv clrij ${a?'af':''}" data-cl="vink" data-v="${esc(t.id)}" style="width:100%;text-align:left"><span class="clvak">${a?'✓':''}</span><div class="groei"><div class="naam">${esc(t.t)}</div>${a?`<div class="sub">${esc(a.wie)} · ${tijdTekst(a.t)}</div>`:''}</div></button>`}).join('')}</div>`;
  if(isAdmin()){const dagen=[...Array(14)].map((_,i)=>plusDagen(iso(),-i));
    h+=`<div class="sectie"><div class="karkop"><b>Afgelopen 14 dagen</b></div>${dagen.map(x=>{const st=l.map(y=>({y,...clStand(x,y)}));const mis=st.some(z=>z.n<z.tot);
      return`<button class="rij inv" data-cl="dag" data-v="${x}" style="width:100%;text-align:left"><div class="groei"><div class="naam" style="font-size:15px">${esc(dagNaamLang(x))}</div><div class="sub">${st.map(z=>`${esc(z.y.naam)} <b class="${z.n<z.tot?'oranjetekst':'groentekst'}">${z.n}/${z.tot}</b>`).join(' · ')}</div></div><span>${mis?'⚠️':'✓'}</span></button>`}).join('')}</div>`}
  return h}
function clBeheerSheet(){const l=clLijsten().map(x=>kloon(x));
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Checklists aanpassen</b><button data-cl="bewaar" style="font-weight:700">Bewaren</button></div><div class="pinhoud" id="clBeheer">
   ${l.map(clBlok).join('')}<div class="knoppen" id="clBij" style="justify-content:flex-start"><button class="knop rand" data-cl="lijstbij">+ Nieuwe lijst</button></div>
   <p class="hulp">Eén taak per regel. Met “Klaar om” krijg je een pushmelding als de lijst om die tijd nog niet af is (leeg = geen melding).</p></div>`)}
const clBlok=x=>`<div class="kaartje clblok" data-id="${esc(x.id||'')}" style="margin:0 0 12px"><h3 class="clkop">${esc(x.naam||'Nieuwe lijst')}</h3><label>Naam</label><input class="veld clnaam" maxlength="40" value="${esc(x.naam||'')}">
  <label>Klaar om</label><input class="veld cltijd" type="time" value="${esc(x.tijd||'')}" style="width:140px">
  <label>Taken</label><textarea class="veld cltaken" rows="6">${esc((x.taken||[]).map(t=>t.t).join('\n'))}</textarea>
  <div class="knoppen" style="justify-content:flex-start;padding:6px 0 0"><button class="knop rand rood klein" data-cl="lijstweg">Lijst verwijderen</button></div></div>`;
document.addEventListener('click',e=>{const el=e.target.closest('[data-cl]');if(!el||el.tagName==='INPUT')return;const u=ik();if(!u)return;L.laatsteActie=Date.now();const c=el.dataset.cl,v=el.dataset.v||'';
  try{switch(c){
  case'lijst':clKeuze=v;render();return;
  case'dag':if(v>iso())return;clDatum=v===iso()?null:v;render();document.getElementById('scherm').scrollTop=0;return;
  case'vink':{const d=clDatum||iso();if(!isObj(S.checklists))S.checklists={};if(!isObj(S.checklists.dag))S.checklists.dag={};const D=S.checklists.dag;if(!isObj(D[d]))D[d]={};if(!isObj(D[d][clKeuze]))D[d][clKeuze]={};const m=D[d][clKeuze];
    if(m[v]){if(m[v].wie!==u.naam&&!isAdmin()){toast(`Afgevinkt door ${m[v].wie}`);return}delete m[v]}else m[v]={wie:u.naam,t:Date.now()};
    for(const k of Object.keys(D))if(k<plusDagen(iso(),-120))delete D[k];bewaar();render();
    {const l=clLijsten().find(x=>x.id===clKeuze);if(l){const s=clStand(d,l);if(m[v]&&s.n===s.tot)bevestig(`✓ ${l.naam}: alles gedaan`)}}return}
  case'beheer':if(isAdmin())clBeheerSheet();return;
  case'lijstbij':{const k=document.getElementById('clBij');if(!k)return;k.insertAdjacentHTML('beforebegin',clBlok({naam:'',taken:[]}));const n=k.previousElementSibling;n?.scrollIntoView({block:'start',behavior:'smooth'});setTimeout(()=>n?.querySelector('.clnaam')?.focus(),350);return}
  case'lijstweg':{const b=el.closest('.clblok');if(!b)return;if(el.dataset.z!=='1'){el.dataset.z='1';el.textContent='Zeker? Tik nogmaals';return}b.remove();return}
  case'bewaar':{if(!isAdmin())return;const oud=clLijsten(),nieuw={};let i=0;
    for(const b of document.querySelectorAll('#clBeheer .clblok')){const naam=b.querySelector('.clnaam').value.trim();if(!naam)continue;const id=b.dataset.id||'l'+urenId(),o=oud.find(x=>x.id===id),tk=[];
      for(const t of b.querySelector('.cltaken').value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,40)){const bestaand=(o?.taken||[]).find(x=>x.t===t&&!tk.some(y=>y.id===x.id));tk.push({id:bestaand?.id||'t'+urenId(),t:t.slice(0,80)})}
      nieuw[id]={id,naam:naam.slice(0,40),tijd:b.querySelector('.cltijd').value||'',volg:++i,taken:tk}}
    for(const o of oud)if(!nieuw[o.id])nieuw[o.id]={...o,weg:true};
    if(!isObj(S.checklists))S.checklists={};S.checklists.lijsten=nieuw;if(!Object.values(nieuw).some(x=>!x.weg))clKeuze=null;bewaar();sluit();render();toast('Opgeslagen');return}
  }}catch(z){meldFout(z,'Checklists')}});
/* ================= 10.17 derving in euro's ================= */
/* ================= 10.27 kassaverkoop uit Coop Besteladvies ================= */
function kaalPlu(p){return String(p??'').trim().replace(/^0+(?=\d)/,'')}
var KV=(()=>{try{return JSON.parse(localStorage.getItem('bo-kassa')||'null')}catch(e){return null}})();
function kassaVan(d,s){const p=kaalPlu(s.plu);if(!p||!KV||!KV.dagen||!KV.dagen[d])return null;return KV.dagen[d][p]??0}
async function kassaHaal(forceer){const k=S&&S.kassaKop;if(!k||!k.url||!k.code||OEFEN)return;if(!forceer&&KV&&Date.now()-KV.t<3*36e5)return;
  const plus=[...new Set(S.soorten.map(s=>kaalPlu(s.plu)).filter(Boolean))];if(!plus.length){if(forceer)throw new Error('Vul eerst de PLU in bij de soorten');return}
  try{const r=await fetch(k.url+(k.url.includes('?')?'&':'?')+'plu='+plus.join(','),{headers:{'x-sleutel':k.code}});const d=await r.json().catch(()=>({fout:'Geen antwoord ('+r.status+')'}));if(!d.ok)throw new Error(d.fout||r.status);
    KV={t:Date.now(),dagen:d.dagen||{}};try{localStorage.setItem('bo-kassa',JSON.stringify(KV))}catch(e){}if(!forceer&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))render();return KV}catch(e){if(forceer)throw e}}
setTimeout(()=>kassaHaal(),5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)kassaHaal()});
function kassaHtml(){const k=S.kassaKop||{},zonder=S.soorten.filter(s=>s.type!=='vers'&&s.naam.trim()&&!kaalPlu(s.plu));
  return`<div class="kop"><div class="koprij"><h1>Kassaverkoop</h1>${info('kassa')}</div><p>Haalt de kassaverkoop per PLU uit Coop Besteladvies. Het advies voor klaarzetten rekent daarmee.</p></div>
  <div class="kaartje"><label>Adres</label><input class="veld" id="kvUrl" type="url" value="${esc(k.url||'')}" placeholder="https://….supabase.co/functions/v1/…"><label style="display:block;margin-top:8px">Koppelcode</label><input class="veld" id="kvCode" value="${esc(k.code||'')}" autocomplete="off">
  <button class="knop" data-kv="1" style="width:100%;margin-top:12px">Opslaan en ophalen</button><div class="sub" id="kvSt" style="margin-top:8px">${KV?`✓ Opgehaald ${new Date(KV.t).toLocaleString('nl-NL',{weekday:'short',day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})} · ${Object.keys(KV.dagen).length} ${Object.keys(KV.dagen).length===1?'dag':'dagen'}`:'Nog niet opgehaald'}</div></div>
  ${zonder.length?`<div class="kaartje waarschuw"><b>${zonder.length} ${zonder.length===1?'soort heeft':'soorten hebben'} nog geen PLU</b><div class="sub">${zonder.map(s=>esc(s.naam)).join(', ')}. Vul de PLU in bij Soorten, anders rekent het advies voor die soort met de derving.</div></div>`:''}${kassaControleHtml()}`}
document.addEventListener('click',async e=>{if(!e.target.closest('[data-kv]')||!isAdmin())return;const url=document.getElementById('kvUrl').value.trim(),code=document.getElementById('kvCode').value.trim(),st=document.getElementById('kvSt');
  if(!/^https:\/\/.+/.test(url)||!code){toast('Vul het adres en de koppelcode in');return}S.kassaKop={url,code};bewaar();st.textContent='Bezig…';
  try{const d=await kassaHaal(true);if(!d){st.textContent='Niet in de oefenmodus';return}toast(`✓ Kassaverkoop van ${Object.keys(d.dagen).length} ${Object.keys(d.dagen).length===1?'dag':'dagen'} opgehaald`);render()}catch(x){st.textContent='✗ '+x.message}});
function kassaControleHtml(){if(!KV||!KV.dagen)return'';const van=plusDagen(iso(),-28),rs=[];
  for(const s of S.soorten.filter(x=>x.type!=='vers'&&x.naam.trim()&&kaalPlu(x.plu))){let k=0,w=0,n=0;for(const d of Object.keys(KV.dagen)){if(d<van||d>=iso())continue;const g=S.historie[d]?.gezet?.[s.id],o=S.derving[d]?.[s.id];if(g==null||o==null)continue;k+=kassaVan(d,s)||0;w+=Math.max(0,g-o);n++}if(n)rs.push({s,k,w})}
  return rs.length?`<div class="sectie"><div class="karkop"><b>Kassa-controle · laatste 4 weken</b></div><div class="tabelwrap"><table class="tabel"><tr><th>Soort</th><th>Kassa</th><th>Gezet − over</th></tr>${rs.map(r=>`<tr><td>${esc(r.s.naam)}</td><td>${fmt(r.k)}</td><td class="${Math.abs(r.k-r.w)>Math.max(3,0.15*Math.max(r.k,r.w))?'hoog':''}">${fmt(r.w)}</td></tr>`).join('')}</table></div><p class="hulp" style="margin:8px 12px">Oranje = groot verschil: er is iets kapot gegaan, opgegeten of verkeerd gescand.</p></div>`:''}
function dervEuroHtml(){const metPrijs=heeft('euro')&&Object.keys(S.prijzen||{}).length>0,w0=maandag(iso()),weken=[...Array(12)].map((_,i)=>plusDagen(w0,-7*(11-i))),c=weken.map(w=>({w,...weekCijfers(w)}));
  const waarde=x=>metPrijs?x.eur:x.over,max=Math.max(1,...c.map(waarde)),W=340,H=150,bw=W/12;
  let h=`<div class="kop"><div class="koprij"><h1>Derving in ${metPrijs?'euro’s':'stuks'}</h1></div><p>De laatste 12 weken${metPrijs?', met de inkoopprijzen':''}. ${metPrijs?'':'Vul inkoopprijzen in (Beheer → Inkoopprijzen) om bedragen te zien.'}</p></div>
   <div class="kaartje"><svg viewBox="0 0 ${W} ${H+28}" width="100%" role="img" aria-label="Derving per week">${c.map((x,i)=>{const v=waarde(x),hh=Math.round(v/max*H),xx=i*bw+4;
     return`<rect x="${xx}" y="${H-hh}" width="${bw-8}" height="${Math.max(hh,v?2:0)}" rx="3" fill="${x.w===w0?'var(--oranjeLicht,#fbd9b0)':'var(--oranje)'}"><title>Week ${weeknr(x.w)}: ${metPrijs?euro2(v):fmt(v)+' stuks'}</title></rect><text x="${xx+(bw-8)/2}" y="${H+14}" text-anchor="middle" font-size="10" fill="currentColor">${weeknr(x.w)}</text>`}).join('')}
     <text x="0" y="${H+27}" font-size="9" fill="currentColor" opacity=".6">weeknummer · deze week is licht</text></svg>
    <div class="sub">Gemiddeld per week (laatste 4 hele weken): <b>${(()=>{const l=c.slice(7,11),g=l.reduce((t,x)=>t+waarde(x),0)/4;return metPrijs?euro2(g):fmt(Math.round(g))+' stuks'})()}</b></div></div>`;
  const per={};for(const x of c.slice(7,11))for(const r of x.rij){const p=per[r.s.id]=per[r.s.id]||{s:r.s,g:0,o:0,e:0};p.g+=r.g;p.o+=r.o;p.e+=r.e}
  const rs=Object.values(per).filter(p=>p.o>0).sort((a,b)=>(metPrijs?b.e-a.e:b.o-a.o));
  h+=`<div class="sectie"><div class="karkop"><b>Per soort · laatste 4 weken</b></div>${rs.length?`<div class="tabelwrap"><table class="tabel"><tr><th>Soort</th><th>Over</th><th>%</th>${metPrijs?'<th>€</th>':''}</tr>${rs.map(p=>{const pct=p.g?Math.round(p.o/p.g*100):null;return`<tr><td>${esc(p.s.naam)}</td><td>${fmt(p.o)}</td><td class="${pct>=15?'hoog':''}">${pct==null?'–':pct+'%'}</td>${metPrijs?`<td>${euro2(p.e)}</td>`:''}</tr>`}).join('')}</table></div>`:'<p class="leeg" style="margin:10px">Geen derving in deze periode.</p>'}</div>`;
  const adv=dervAdvies();
  h+=`<div class="sectie"><div class="karkop"><b>Advies opzet</b></div>${adv.length?adv.map((a,i)=>`<div class="rij inv" style="flex-wrap:wrap"><div class="groei"><div class="naam" style="font-size:16px">${esc(a.s.naam)} op ${esc(GROEP[a.g])}</div><div class="sub">nu ${a.nu} per dag → advies <b>${a.a.aantal}</b> · gem. ${fmt(Math.round(a.a.gemDer*10)/10)} over${metPrijs&&prijs(a.s.id)?` · scheelt ± ${euro2((a.nu-a.a.aantal)*prijs(a.s.id)*(a.g==='mv'?5:1))} per week`:''}</div></div><button class="knop klein" data-de="toepas" data-v="${i}">Toepassen</button></div>`).join(''):`<p class="leeg" style="margin:10px">${heeft('advies')?'Geen aanpassingen nodig.':'Advies zit niet in het pakket.'}</p>`}</div>`;
  const vers=(typeof bestelAdvies==='function'?bestelAdvies():[]).filter(x=>x.soort==='minder');
  if(vers.length)h+=`<div class="kaartje"><h3>Vers brood (bestellen bij de bakker)</h3>${vers.map(x=>`<div class="sub"><b>${esc(x.s.naam)}</b> op ${WDL[x.w]}: ${esc(x.advies)} <span class="hulp" style="margin:0">(${Math.round(x.pct)}% over)</span></div>`).join('')}</div>`;
  h+=kassaControleHtml();
  return h+`<p class="hulp" style="margin:12px 20px">Advies op basis van de laatste weken van dezelfde soort dag${KV?', met de kassaverkoop uit Besteladvies':''}. Toepassen past de planning aan voor alle dagen in die groep.</p>`}
let deAdv=[];
function dervAdvies(){deAdv=[];if(!heeft('advies'))return deAdv;const groepen={mv:['ma','di','wo','do','vr'],za:['za'],zo:['zo']};
  for(const s of S.soorten.filter(x=>x.type!=='vers'&&x.naam.trim()))for(const[g,pks]of Object.entries(groepen)){const a=advies(s,g);if(!a||a.op)continue;const nu=Math.max(...pks.map(pk=>dagTotaal(pk,s)));if(a.aantal<nu)deAdv.push({s,g,pks,nu,a})}
  return deAdv}
document.addEventListener('click',e=>{const el=e.target.closest('[data-de]');if(!el||!isAdmin())return;if(el.dataset.de==='toepas'){const a=deAdv[+el.dataset.v];if(!a)return;
  for(const pk of a.pks)if(dagTotaal(pk,a.s)>a.a.aantal)verdeelAdvies(pk,a.s,a.a.aantal);log(`Advies toegepast: ${a.s.naam} ${GROEP[a.g]} → ${a.a.aantal}`);bewaar();render();toast(`${a.s.naam}: ${a.a.aantal} per dag`)}});
(function(){const st=document.createElement('style');st.textContent=`.rsrij.afw{border-left:4px solid var(--oranje)}.rsrij.weg{border-left:4px solid var(--rood)}.rsrij.ok{border-left:4px solid var(--groen)}.rsrij.extra{opacity:.85;border-left:4px dashed var(--grijs)}
.clrij{display:flex;align-items:center;gap:12px;min-height:58px}.clvak{width:30px;height:30px;border:2px solid var(--oranje);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;flex:none}
.clrij.af .clvak{background:var(--oranje)}.clrij.af .naam{text-decoration:line-through;opacity:.7}#paneel .clblok textarea.veld{width:100%;box-sizing:border-box;min-height:140px;background:var(--kaart)!important;color:var(--tekst)!important;border:1px solid var(--lijn);border-radius:10px;padding:12px 14px;-webkit-appearance:none;appearance:none}.clkop{margin:0 0 4px}`;document.head.appendChild(st)})();
document.addEventListener('input',e=>{if(e.target.classList?.contains('clnaam')){const k=e.target.closest('.clblok')?.querySelector('.clkop');if(k)k.textContent=e.target.value.trim()||'Nieuwe lijst'}});


/* ================= 10.22 Home zelf indelen ================= */
/* eigen indeling: S.profielen[uid].home={tegels:[{k,g}]} · medewerkers: S.homeTeam={alle:{tegels},per:{uid:{tegels}},zelf:bool} */
let homeEdit=null,homeSleep=null;
const homeToonTekst=x=>x.t!=null?!!x.t:!(String(x.k).startsWith('m:')&&MEER_GROEP[x.k.slice(2)]==='beheer');
const HOME_IC={materiaal:'📦',plu:'🏷️',notities:'🗒️',dervlijsten:'📋',ontdooi:'❄️',pakbonnen:'📄',afsluiten:'🔒',instellingen:'⚙️',uitleg:'❓',bestelboeken:'📚',afwijkend:'📅',bestel:'🛒',rapport:'📈',nieuw:'✨',export:'📤',gedaan:'✔️',log:'📜',soorten:'🥐',programmas:'🔥',team:'👥',vraag:'❔'};
const HOME_BASIS=['lijst','plan','derving','uren','check','chat'];
function homeBasisTegels(){const t={};
  {const{n,k}=homeKlaar();t.lijst={k:'lijst',a:'tab',v:'lijst',ic:'🥖',l:'Klaarzetten',s:n?(k===n?'✓ Alles klaar':`nog ${n-k} te gaan`):'Niets klaar te zetten',wl:n&&k<n}}
  if(mag('invullen'))t.plan={k:'plan',a:'tab',v:'plan',ic:'📝',l:'Invullen',s:'Planning en bestellen'};
  if(mag('derving')){const od=S.soorten.filter(s=>s.type==='vers'&&s.naam.trim()&&gezetOverDatum(iso(),s)>0).length,klaar=!!S.historie[iso()];
    t.derving={k:'derving',a:'tab',v:'derving',ic:'🗑',l:'Derving',s:klaar?'✓ Lijst van vandaag opgeslagen':od?`${od} over datum vandaag`:'Derving invullen',wl:!klaar&&od>0}}
  if(urenMag()){const n=urenNu().length;t.uren={k:'uren',a:'tab',v:'uren',ic:'⏱',l:'Uren',s:n?`${n} aan het werk`:'Niemand ingeklokt'}}
  {const[st,wl]=clHomeStatus();t.check={k:'check',a:'tab',v:'check',ic:'✅',l:'Checklists',s:st,wl}}
  {const o=chatTotaal();t.chat={k:'chat',a:'sub2',v:'berichten',ic:'💬',l:'Chat',s:o?`${o} ongelezen`:'Team en beheerder',wl:o>0}}
  return t}
function meerCatalogus(){const s=sub,t=tab;try{sub=null;window.__meerItems=[];meerHtml()}catch(e){}finally{sub=s;tab=t}
  const uit={};for(const x of window.__meerItems||[]){const[k,tl,sb,,,act]=x;if(act&&act!=='sub')continue;if(k==='berichten')continue;
    const tekst=String(tl).replace(/<[^>]+>/g,'').trim(),m=tekst.match(/^(\p{Extended_Pictographic}[️‍\p{Extended_Pictographic}]*)\s*(.*)$/u);
    uit['m:'+k]={k:'m:'+k,a:'sub2',v:k,ic:m?m[1]:(HOME_IC[k]||'📁'),l:m?m[2]:tekst,s:String(sb||'').replace(/<[^>]+>/g,'')}}
  return uit}
function homeCatalogus(uid){const s=L.sessie;if(uid&&uid!==s)L.sessie=uid;try{return{...homeBasisTegels(),...meerCatalogus()}}finally{L.sessie=s}}
function homeTeamCatalogus(){const c={};for(const g of S.gebruikers.filter(x=>x.rol!=='admin'&&x.actief!==false))Object.assign(c,homeCatalogus(g.id));
  if(!Object.keys(c).length){const s=L.sessie;Object.assign(c,homeBasisTegels())}return c}
const homeStd=cat=>HOME_BASIS.filter(k=>cat[k]).map(k=>({k,g:0}));
const homeTeam=()=>isObj(S.homeTeam)?S.homeTeam:{};
function homeIndeling(cat){const u=ik(),eigen=prof().home?.tegels,t=homeTeam();
  let l=null;if(Array.isArray(eigen)&&(isAdmin()||t.zelf))l=eigen;else if(!isAdmin())l=t.per?.[u?.id]?.tegels||t.alle?.tegels||null;
  l=(l||homeStd(cat)).filter(x=>x&&cat[x.k]);return l.length?l:homeStd(cat)}
function homeTegelHtml(x,c,edit,i,n){const g=x.g?'groot':'';
  const tt=homeToonTekst(x);
  if(!edit)return`<button class="hometegel ${g} ${c.wl?'let':''}" data-a="${c.a}" data-v="${esc(c.v)}"><span class="hti">${c.ic}</span><b>${esc(c.l)}</b>${tt&&c.s?`<span class="hts">${esc(c.s)}</span>`:''}</button>`;
  return`<div class="hometegel bewerk ${g}" data-hk="${esc(x.k)}"><button class="heye ${tt?'':'uit'}" data-h="tekst" data-v="${i}" aria-label="${tt?'Tekst verbergen':'Tekst tonen'}">${tt?'👁':'🙈'}</button><span class="hti">${c.ic}</span><b>${esc(c.l)}</b><span class="hts">${tt?esc(c.s||''):'<i>tekst verborgen</i>'}</span>
   <div class="hedit"><button data-h="op" data-v="${i}" ${i===0?'disabled':''} aria-label="Naar voren">▲</button><button data-h="neer" data-v="${i}" ${i===n-1?'disabled':''} aria-label="Naar achteren">▼</button><button data-h="groot" data-v="${i}" aria-label="Groot of klein" class="${x.g?'aan':''}">↔</button><button data-h="weg" data-v="${i}" aria-label="Verbergen">✕</button></div></div>`}
function homeTegelsHtml(){const cat=homeCatalogus();
  if(homeEdit&&homeEdit.ctx==='eigen'){const l=homeEdit.lijst.filter(x=>cat[x.k]);
    return`<div class="homebalk"><b>Home indelen</b><span>Houd een tegel vast en sleep, of gebruik ▲▼. ↔ = groot/klein, 👁 = tekst aan/uit, ✕ = verbergen.</span><div class="knoppen" style="padding:6px 0 0;gap:6px;flex-wrap:wrap;justify-content:flex-start"><button class="knop klein" data-h="klaar">Klaar</button><button class="knop rand klein" data-h="erbij">＋ Tegel toevoegen</button><button class="knop rand klein" data-h="std">${homeEdit.std?'Zeker? Tik nogmaals':'Standaard herstellen'}</button></div></div>
     <div class="hometegels" id="homeTegels">${l.map((x,i)=>homeTegelHtml(x,cat[x.k],true,i,l.length)).join('')}</div>`}
  const l=homeIndeling(cat),magEdit=isAdmin()||homeTeam().zelf;
  return`<div class="hometegels">${l.map(x=>homeTegelHtml(x,cat[x.k],false)).join('')}</div>${magEdit?'<div class="knoppen" style="padding-top:0"><button class="knop rand klein" data-h="start">✏️ Home indelen</button></div>':''}`}
/* ---------- beheer: home voor medewerkers ---------- */
let htKeuze='alle';
function homeTeamHtml(){if(!isAdmin())return'';const t=homeTeam(),mw=S.gebruikers.filter(g=>g.rol!=='admin'&&g.actief!==false).sort((a,c)=>a.naam.localeCompare(c.naam,'nl'));
  if(htKeuze!=='alle'&&!mw.some(g=>g.id===htKeuze))htKeuze='alle';
  const cat=htKeuze==='alle'?homeTeamCatalogus():homeCatalogus(htKeuze),eigen=htKeuze!=='alle'&&t.per?.[htKeuze]?.tegels;
  const bron=htKeuze==='alle'?t.alle?.tegels:(eigen||t.alle?.tegels);
  if(!homeEdit||homeEdit.ctx!=='team:'+htKeuze)homeEdit={ctx:'team:'+htKeuze,lijst:kloon((bron||homeStd(cat)).filter(x=>cat[x.k]))};
  const l=homeEdit.lijst;
  return`<div class="kop"><div class="koprij"><h1>Home voor medewerkers</h1></div><p>Welke tegels medewerkers op Home zien, en in welke volgorde. Ze zien alleen wat ze mogen.</p></div>
   <div class="kaartje"><label>Voor wie</label><select class="veld" id="htWie"><option value="alle">Alle medewerkers</option>${mw.map(g=>`<option value="${esc(g.id)}" ${htKeuze===g.id?'selected':''}>${esc(g.naam)}${t.per?.[g.id]?' (eigen indeling)':''}</option>`).join('')}</select>
    ${htKeuze!=='alle'?`<div class="sub" style="margin-top:6px">${eigen?'Deze medewerker heeft een eigen indeling.':'Gebruikt nu de indeling voor alle medewerkers. Pas je hier iets aan, dan krijgt deze medewerker een eigen indeling.'}</div>`:''}
    <label class="schakel" style="margin:12px 0 0;color:var(--tekst);font-weight:700">Medewerkers mogen hun Home zelf aanpassen<input type="checkbox" id="htZelf" ${t.zelf?'checked':''}></label></div>
   <div class="homebalk"><span>Houd een tegel vast en sleep, of gebruik ▲▼. ↔ = groot/klein, 👁 = tekst aan/uit, ✕ = verbergen. Wijzigingen worden meteen bewaard.</span><div class="knoppen" style="padding:6px 0 0;gap:6px;flex-wrap:wrap;justify-content:flex-start"><button class="knop rand klein" data-h="erbij">＋ Tegel toevoegen</button><button class="knop rand klein" data-h="std">${homeEdit.std?'Zeker? Tik nogmaals':'Standaard herstellen'}</button>${eigen?`<button class="knop rand klein" data-h="perweg">Zelfde als alle medewerkers</button>`:''}</div></div>
   <div class="hometegels" id="homeTegels">${l.map((x,i)=>homeTegelHtml(x,cat[x.k],true,i,l.length)).join('')}</div>`}
/* ---------- opslaan ---------- */
function homeBewaar(){if(!homeEdit)return;const l=homeEdit.lijst.map(x=>({k:x.k,g:x.g?1:0,...(x.t!=null?{t:x.t?1:0}:{})}));
  if(homeEdit.ctx==='eigen'){const id=L.sessie;S.profielen[id]={...(S.profielen[id]||{}),home:homeEdit.reset?null:{tegels:l}}}
  else{if(!isAdmin())return;const wie=homeEdit.ctx.slice(5);if(!isObj(S.homeTeam))S.homeTeam={};
    if(wie==='alle')S.homeTeam.alle=homeEdit.reset?null:{tegels:l};else{if(!isObj(S.homeTeam.per))S.homeTeam.per={};S.homeTeam.per[wie]=homeEdit.reset?null:{tegels:l}}}
  homeEdit.reset=false;bewaar()}
const homeCtxCat=()=>homeEdit.ctx==='eigen'?homeCatalogus():homeEdit.ctx==='team:alle'?homeTeamCatalogus():homeCatalogus(homeEdit.ctx.slice(5));
document.addEventListener('click',e=>{const el=e.target.closest('[data-h]');if(!el||!ik())return;const c=el.dataset.h,i=+el.dataset.v;L.laatsteActie=Date.now();
  try{
  if(c==='start'){if(!(isAdmin()||homeTeam().zelf))return;const cat=homeCatalogus();homeEdit={ctx:'eigen',lijst:kloon(homeIndeling(cat))};render();return}
  if(!homeEdit)return;const l=homeEdit.lijst;
  if(c==='klaar'){homeEdit=null;render();toast('Home bewaard');return}
  if(c==='op'&&i>0){[l[i-1],l[i]]=[l[i],l[i-1]];homeBewaar();render();return}
  if(c==='neer'&&i<l.length-1){[l[i+1],l[i]]=[l[i],l[i+1]];homeBewaar();render();return}
  if(c==='groot'){l[i].g=l[i].g?0:1;homeBewaar();render();return}
  if(c==='tekst'){l[i].t=homeToonTekst(l[i])?0:1;homeBewaar();render();return}
  if(c==='weg'){l.splice(i,1);homeBewaar();render();return}
  if(c==='std'){if(!homeEdit.std){homeEdit.std=true;render();setTimeout(()=>{if(homeEdit?.std){homeEdit.std=false;render()}},5000);return}
    const cat=homeCtxCat();homeEdit.lijst=homeStd(cat);homeEdit.std=false;homeEdit.reset=true;homeBewaar();render();toast('Standaard hersteld');return}
  if(c==='perweg'){const wie=homeEdit.ctx.slice(5);if(S.homeTeam?.per)S.homeTeam.per[wie]=null;bewaar();homeEdit=null;render();toast('Gebruikt nu de indeling voor alle medewerkers');return}
  if(c==='erbij'){const cat=homeCtxCat(),wel=new Set(l.map(x=>x.k)),rest=Object.values(cat).filter(x=>!wel.has(x.k));
    toonSheet(`<div class="pkop"><span style="width:70px"></span><b>Tegel toevoegen</b><button data-a="sluit" style="font-weight:700">Klaar</button></div><div class="pinhoud">
     ${rest.length?rest.map(x=>`<button class="rij inv" style="width:100%;text-align:left" data-h="voegtoe" data-k="${esc(x.k)}"><span style="font-size:24px;margin-right:10px">${x.ic}</span><div class="groei"><div class="naam">${esc(x.l)}</div><div class="sub">${esc(x.s||'')}</div></div><span>＋</span></button>`).join(''):'<p class="leeg">Alle tegels staan er al op.</p>'}</div>`);return}
  if(c==='voegtoe'){const k=el.dataset.k;if(!l.some(x=>x.k===k))l.push({k,g:0});homeBewaar();el.remove();render();toast('Toegevoegd');return}
  }catch(z){meldFout(z,'Home indelen')}});
document.addEventListener('change',e=>{if(!isAdmin())return;
  if(e.target.id==='htWie'){htKeuze=e.target.value;homeEdit=null;render()}
  if(e.target.id==='htZelf'){if(!isObj(S.homeTeam))S.homeTeam={};S.homeTeam.zelf=e.target.checked;bewaar();render()}});
/* slepen: vasthouden en schuiven (werkt op de iPhone) */
document.addEventListener('pointerdown',e=>{const t=e.target.closest('#homeTegels .hometegel.bewerk');if(!t||e.target.closest('[data-h]')||!homeEdit)return;
  const k=t.dataset.hk,x0=e.clientX,y0=e.clientY;homeSleep={k,x0,y0,aan:false,tm:setTimeout(()=>{if(homeSleep){homeSleep.aan=true;t.classList.add('sleept');try{navigator.vibrate?.(15)}catch(z){}}},250)}});
document.addEventListener('pointermove',e=>{if(!homeSleep)return;if(!homeSleep.aan){if(Math.hypot(e.clientX-homeSleep.x0,e.clientY-homeSleep.y0)>10){clearTimeout(homeSleep.tm);homeSleep=null}return}
  e.preventDefault();const onder=document.elementFromPoint(e.clientX,e.clientY)?.closest('#homeTegels .hometegel.bewerk');if(!onder||onder.dataset.hk===homeSleep.k)return;
  const l=homeEdit.lijst,a=l.findIndex(x=>x.k===homeSleep.k),b=l.findIndex(x=>x.k===onder.dataset.hk);if(a<0||b<0)return;const[x]=l.splice(a,1);l.splice(b,0,x);
  const cat=homeCtxCat(),g=document.getElementById('homeTegels');if(g){g.innerHTML=l.filter(y=>cat[y.k]).map((y,i,arr)=>homeTegelHtml(y,cat[y.k],true,i,arr.length)).join('');g.querySelector(`[data-hk="${CSS.escape(homeSleep.k)}"]`)?.classList.add('sleept')}},{passive:false});
document.addEventListener('pointerup',()=>{if(!homeSleep)return;clearTimeout(homeSleep.tm);const was=homeSleep.aan;homeSleep=null;if(was){homeBewaar();render()}});
document.addEventListener('pointercancel',()=>{if(homeSleep){clearTimeout(homeSleep.tm);homeSleep=null;render()}});
(function(){const st=document.createElement('style');st.textContent=`.hometegel.groot{grid-column:span 2;min-height:96px}
.hometegel.bewerk{position:relative;touch-action:none;user-select:none;-webkit-user-select:none;border:2px dashed var(--oranje);animation:hwiebel .35s ease-in-out infinite alternate}
.hometegel.bewerk.sleept{opacity:.75;transform:scale(1.04);animation:none;box-shadow:0 8px 20px rgba(0,0,0,.25);z-index:2}
@keyframes hwiebel{from{transform:rotate(-.6deg)}to{transform:rotate(.6deg)}}
.hedit{display:flex;gap:4px;margin-top:auto;padding-top:8px;flex-wrap:nowrap}.hedit button.aan{background:var(--oranje);color:#fff;border-color:var(--oranje)}.hedit button{width:32px;min-width:32px;height:38px;padding:0;border-radius:10px;border:1px solid var(--lijn);background:var(--achter);color:var(--tekst);font-size:16px}.hedit button:disabled{opacity:.3}
.heye{position:absolute;top:8px;right:8px;width:38px;height:38px;border-radius:10px;border:1px solid var(--lijn);background:var(--achter);font-size:18px;padding:0}.heye.uit{opacity:.7}
.homebalk{margin:6px 16px 4px;font-size:15px;color:var(--grijs)}.homebalk b{display:block;color:var(--tekst);font-size:17px}
@media (prefers-reduced-motion:reduce){.hometegel.bewerk{animation:none}}`;document.head.appendChild(st)})();

/* ================= 10.24 per soort melding aan/uit ================= */
const PUSH_B=[['mat-bijna','📦 Materiaal bijna op'],['mat-op','📦 Materiaal op!'],['chat-prive','💬 Chat: privéberichten van medewerkers'],['chat-team','👥 Chat: teamchat'],['chat-her','⏰ Melding staat nog open (herinnering)'],['levering','🥖 Levering nog niet ingevuld'],['week','📊 Weekoverzicht op maandag'],['tb-voor','💶 Factuur vervalt binnenkort'],['tb-dag','💶 Factuur vervalt vandaag'],['tb-week','💶 Deze week te betalen (maandag)'],['uit-bh','⏱ Medewerker nog ingeklokt'],['checklist','✅ Checklist niet op tijd af']];
const PUSH_M=[['levering','🥖 Levering nog niet ingevuld'],['chat-beheer','💬 Berichten van de beheerder'],['chat-team','👥 Teamchat'],['chat-med','📢 Mededelingen'],['uitklok','⏰ Vergeten uit te klokken']];
function pushSoortenHtml(){const uit=isObj(S.push?.uit)?S.push.uit:{};
  return`<div class="kaartje"><h3>Welke meldingen</h3><div class="sub">Zet uit wat je niet op je telefoon wilt krijgen.</div>${PUSH_B.map(([k,l])=>`<label class="schakel" style="margin:10px 0 0;color:var(--tekst);font-weight:400">${l}<input type="checkbox" data-pushsoort="${k}" ${uit[k]?'':'checked'}></label>`).join('')}</div>`}
function pushSoortenMHtml(){const uit=isObj(prof().pushUit)?prof().pushUit:{},l=PUSH_M.filter(([k])=>k!=='levering'||mag('vinken')).filter(([k])=>k!=='uitklok'||urenMag()||roosterAlle().some(r=>r.uid===L.sessie));
  return`<details class="kaartje"><summary><b>Welke meldingen</b></summary><div class="sub" style="margin-top:6px">Werkt als pushmeldingen op deze telefoon aan staan.</div>${l.map(([k,t])=>`<label class="schakel" style="margin:10px 0 0;color:var(--tekst);font-weight:400">${t}<input type="checkbox" data-pushsoortm="${k}" ${uit[k]?'':'checked'}></label>`).join('')}</details>`}
document.addEventListener('change',e=>{const d=e.target.dataset||{};
  if(d.pushsoort&&isAdmin()){if(!isObj(S.push))S.push={};if(!isObj(S.push.uit))S.push.uit={};if(e.target.checked)delete S.push.uit[d.pushsoort];else S.push.uit[d.pushsoort]=true;bewaar();toast(e.target.checked?'Melding aan':'Melding uit')}
  if(d.pushsoortm){const id=L.sessie;if(!id)return;const u={...(isObj(prof().pushUit)?prof().pushUit:{})};if(e.target.checked)delete u[d.pushsoortm];else u[d.pushsoortm]=true;S.profielen[id]={...(S.profielen[id]||{}),pushUit:u};bewaar();toast(e.target.checked?'Melding aan':'Melding uit')}});

