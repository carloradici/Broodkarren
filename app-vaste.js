/* ================= 10.32 Vaste lasten (alleen beheerder, prive) =================
   S.bank={'2026-09':JSON-tekst {txid:[datum,centen(+/-),naam,omschrijving,saldo|null,volgnr]}}  → prive:bank:<maand>
   S.vaste={regels:{naamkey:cat},wk:{nr:{d,r:{post:{b,v}},len:{begin,saldo,t,rente},ovv}},kop:{txid:{f:[[fid,pid]],d}},ctl:{txid:{s,f:[],fid}},terug:{id:{lev,b,d,o,klaar}},upl,ex}  → prive:vaste */
const VL_CAT=[['personeel','👥 Personeel',0],['huur','🏠 Huur',21],['vantol','🛒 Van Tol vast',21],['lening','💳 Lening en rente',0],['energie','⚡ Energie en water',21],['verzekering','🛡️ Verzekering',0],['belasting','🏛️ Belastingen',0],['bank','🏦 Bank en pin',0],['telecom','📞 Telefoon en internet',21],['software','💻 Software',21],['afval','🗑️ Afval',21],['overig','📦 Overig',21],['inkoop','🥖 Inkoop goederen',9],['ontvangst','💰 Ontvangsten',0],['prive','🚫 Opname / privé',0]];
const VL_N=Object.fromEntries(VL_CAT.map(c=>[c[0],c[1]])),VL_BTW=Object.fromEntries(VL_CAT.map(c=>[c[0],c[2]])),VL_KOST=VL_CAT.map(c=>c[0]).filter(c=>!['inkoop','ontvangst','prive'].includes(c));
const VL_RE=[['prive',/\bopname\b|geldautomaat/],['inkoop',/van ?tol|versunie|smeding|hooge ?werff|bak ?combi|unipharma|bakkerij|sligro|makro|hanos|bidfood/],['personeel',/salaris|\bloon|pensioen|pfzw|\bbpf|pggm|nmbrs|loket\.nl|\buwv|arbodienst|vakantiegeld/],
  ['belasting',/belastingdienst|gemeente|\bozb|waterschap|hhnk|rijnland|cocensus|\bgbt\b|svhw/],['energie',/eneco|vattenfall|essent|greenchoice|energie|stedin|liander|enexis|vitens|\bpwn|waternet|evides|engie/],
  ['verzekering',/verzeker|interpolis|achmea|allianz|centraal beheer|nationale.nederlanden|\basr\b|aegon/],['lening',/lening|aflossing|krediet|financiering|lease/],['bank',/ing bank|kosten zakelijk|betaalpakket|\bccv\b|worldline|mollie|adyen|cm\.com|equens|transactiekosten|\brente\b/],
  ['telecom',/\bkpn|ziggo|vodafone|odido|t-mobile|tele2|strato|xs4all/],['software',/\br ?& ?h\b|caspos|analyser|microsoft|google|apple\.com|adobe|dropbox|anthropic|github|supabase/],['afval',/renewi|suez|afval|avalex|meerlanden|\bhvc\b|prezero/],['huur',/\bhuur\b|vastgoed/]];
let vlTab='overzicht',vlBtw=true,vlMnd=null,vlZoek='',vlAlleenIndelen=false,vlBezig='';
const vlKey=n=>String(n||'').toLowerCase().replace(/\b(b\.?v\.?|n\.?v\.?|v\.?o\.?f\.?)\b/g,'').replace(/[^a-z0-9]/g,'').slice(0,40);
const vlV=()=>{if(!isObj(S.vaste))S.vaste={};for(const k of['regels','wk','kop','ctl','terug'])if(!isObj(S.vaste[k]))S.vaste[k]={};return S.vaste};
let vlCache={s:null,l:[]};
function vlTx(){const bron=JSON.stringify(Object.keys(S.bank||{}).map(k=>[k,(S.bank[k]||'').length]));if(vlCache.s===bron)return vlCache.l;const l=[];
  for(const[m,t]of Object.entries(S.bank||{})){if(!t)continue;let o;try{o=JSON.parse(t)}catch(e){continue}for(const[id,r]of Object.entries(o))l.push({id,d:r[0],b:r[1],n:r[2]||'',o:r[3]||'',s:r[4],q:r[5]||0,m})}
  l.sort((a,c)=>a.d.localeCompare(c.d)||a.q-c.q);vlCache={s:bron,l};return l}
function vlCat(t){const r=vlV().regels[vlKey(t.n)];if(r)return r;const s=(t.n+' '+t.o).toLowerCase();if(/\bopname\b/.test(s))return'prive';if(t.b>0)return'ontvangst';for(const[c,re]of VL_RE)if(re.test(s))return c;return'overig'}
const vlEx=(b,c)=>Math.round(b/(1+(VL_BTW[c]||0)/100));
/* ---------- CSV (ING) ---------- */
function vlCsvRijen(t){t=t.replace(/^\uFEFF/,'');const sep=(t.split('\n')[0].match(/;/g)||[]).length>=(t.split('\n')[0].match(/,/g)||[]).length?';':',',rij=[];let r=[],v='',q=false;
  for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){v+='"';i++}else q=false}else v+=c}else if(c==='"')q=true;else if(c===sep){r.push(v);v=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;r.push(v);v='';if(r.some(x=>x.trim()))rij.push(r);r=[]}else v+=c}
  r.push(v);if(r.some(x=>x.trim()))rij.push(r);return rij}
function vlDatum(s){s=String(s||'').trim();let m=/^(\d{4})(\d{2})(\d{2})$/.exec(s);if(m)return`${m[1]}-${m[2]}-${m[3]}`;m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);if(m)return m[0].slice(0,10);m=/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/.exec(s);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:null}
const vlHash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h.toString(36)};
function vlLeesCsv(t){const rij=vlCsvRijen(t);if(rij.length<2)throw'Geen regels gevonden in dit bestand';const kop=rij[0].map(x=>x.toLowerCase().trim()),k=re=>kop.findIndex(x=>re.test(x));
  const c={d:k(/^datum|^date|boekdatum/),n:k(/naam|name/),a:k(/^af ?bij|debit\/credit|af\/bij/),b:k(/bedrag|amount/),o:k(/mededeling|notification/),s:k(/saldo|balance/),t:k(/mutatiesoort|transaction type/)};
  if(c.o<0)c.o=k(/^omschrijving|^description/);const mist=['d','b'].filter(x=>c[x]<0);if(mist.length)throw`Kolom ${mist.map(x=>({d:'Datum',b:'Bedrag'})[x]).join(' en ')} niet gevonden. Kies de CSV-export van ING.`;
  let l=rij.slice(1).map(r=>{const d=vlDatum(r[c.d]);let b=fCent(leesBedrag(String(r[c.b]||'').replace(/[€\s]/g,'')));if(c.a>=0&&/^(af|debit)/i.test(String(r[c.a]).trim()))b=-Math.abs(b);else if(c.a>=0)b=Math.abs(b);
    return d&&b?{d,b,n:String(r[c.n]??'').trim().slice(0,70),o:((c.t>=0&&/geldautomaat/i.test(r[c.t])?'Opname ':'')+String(r[c.o]??'')).replace(/\s+/g,' ').trim().slice(0,160),s:c.s>=0&&String(r[c.s]).trim()?fCent(leesBedrag(String(r[c.s]).replace(/[€\s]/g,''))):null}:null}).filter(Boolean);
  if(!l.length)throw'Geen transacties gevonden';if(l[0].d>l[l.length-1].d)l.reverse();const per={};
  return l.map(x=>{const g=x.d+'|'+x.b+'|'+x.n+'|'+x.o+'|'+x.s;per[g]=(per[g]||0)+1;return{...x,id:vlHash(g+'|'+per[g]),q:0}}).map((x,i)=>(x.q=i,x))}
function vlZetTx(l){const nieuw=[],perM={};for(const x of l){const m=x.d.slice(0,7);if(!perM[m]){let o;try{o=JSON.parse(S.bank[m]||'{}')||{}}catch(e){throw`De opgeslagen bankgegevens van ${m} zijn beschadigd; ik heb niets overschreven.`}perM[m]=o}
    if(perM[m][x.id])continue;const dag=Object.values(perM[m]).filter(r=>r[0]===x.d).length;perM[m][x.id]=[x.d,x.b,x.n,x.o,x.s,dag*1000+x.q%1000];nieuw.push(x.id)}
  for(const[m,o]of Object.entries(perM))S.bank[m]=JSON.stringify(o);return nieuw}
async function vlCsvIn(file){if(/\.pdf$/i.test(file.name)){toast('Kies de CSV-export van ING (geen pdf)');return}vlBezig='Bankexport lezen…';render();
  try{const l=vlLeesCsv(await file.text()),nw=vlZetTx(l);vlV().upl=iso();const k=vlKoppel(new Set(nw));bewaar();vlBezig='';render();
    toonSheet(`<div class="pkop"><span style="width:70px"></span><b>Bankexport</b><button data-a="sluit" style="font-weight:700">Klaar</button></div><div class="pinhoud"><div class="kaartje" style="margin:0">
      <div class="naam">${nw.length} nieuwe transacties</div><div class="sub">${l.length-nw.length?`${l.length-nw.length} stonden er al in · `:''}${tbD(l[0].d)} t/m ${tbD(l[l.length-1].d)}</div>
      <div class="sub" style="margin-top:8px">💶 Te betalen: <b>${k.betaald} ${k.betaald===1?'factuur':'facturen'} betaald</b>${k.deel?` · ${k.deel} deelbetaling`:''}${k.ctl?` · <b>${k.ctl} om te controleren</b>`:''}${k.storno?` · ${k.storno} storno teruggezet`:''}</div></div></div>`)}
  catch(e){vlBezig='';render();toast(typeof e==='string'?e:'Dit bestand kon ik niet lezen');console.warn(e)}}
/* ---------- Van Tol-weekstaat ---------- */
function vlWeekstaat(t){t=String(t||'');const nr=(t.match(/Weekstaatnummer\s*:?\s*(\d{4}\.\d{2}\.\d{2})/i)||[])[1];if(!nr)return null;
  const wi=t.search(/Weekstaatnummer/i),dm=[...t.slice(Math.max(0,wi-400),wi+200).matchAll(/Datum\s*:?\s*(\d\d)\.(\d\d)\.(\d{4})/gi)].pop(),d=dm?`${dm[3]}-${dm[2]}-${dm[1]}`:iso(),r={},B=s=>leesBedrag(s)||0;
  const naam=s=>/HUUR (BRUTO|KORTING)/i.test(s)?'Huur winkel':/ONDERHOUDSCONTRACT SCAN/i.test(s)?'Onderhoud scanning':/VERHUUR TERMINAL/i.test(s)?'Huur terminals':/ICT-INFRA/i.test(s)?'Huur ICT-infra':/BESTANDSONDERH/i.test(s)?'Bestandsonderhoud':/STOPKOSTEN/i.test(s)?'Stopkosten KW en vers':/TRANSPORTTOESLAG/i.test(s)?'Transporttoeslag':/DRUKKERIJ/i.test(s)?'Drukwerk':/STORNOKOSTEN/i.test(s)?'Stornokosten':s.replace(/\s+\d[\d.]*$/,'').trim().slice(0,40).toLowerCase().replace(/^./,c=>c.toUpperCase());
  for(const m of t.matchAll(/(?:^|\n)\s*(9[345]\d{7})\s+\d+\s+\d+\s+ST\s+(.+?)\s+VAN TOL\b[^\n]*?(\d{1,3}(?:\.\d{3})*,\d\d)\s*(-)?\s*(?=\n|$)/g)){const p=naam(m[2]),b=fCent(B(m[3]))*(m[4]?-1:1);
    (r[p]=r[p]||{b:0,v:/^94/.test(m[1])||/STOPKOSTEN/i.test(m[2])?1:0}).b+=b}
  let len=null;const c=t.match(/Beginsaldo[^\n]*\n[^\d\n]*(\d{1,3}(?:\.\d{3})*,\d\d)\s+(\d{1,3}(?:\.\d{3})*,\d\d)\s+(\d{1,3}(?:\.\d{3})*,\d\d)\s+(\d{1,3}(?:\.\d{3})*,\d\d)\s+(\d{1,3}(?:\.\d{3})*,\d\d)/i);
  if(c)len={begin:fCent(B(c[1])),saldo:fCent(B(c[3])),t:fCent(B(c[4])),rente:fCent(B(c[5]))};
  const ov=t.match(/\n\s*(\d{1,3}(?:\.\d{3})*,\d\d)\s+\d{1,3}(?:\.\d{3})*,\d\d\s+\d{1,3}(?:\.\d{3})*,\d\d[^\n]*\n[^\n]*Overige vorderingen/i);
  return{nr,d,r,len,ovv:ov?fCent(B(ov[1])):null}}
function vlWeekstaatZet(w){if(!w)return false;const v=vlV();v.wk[w.nr]={d:w.d,r:w.r,len:w.len,ovv:w.ovv};return true}
async function vlPdfIn(file){vlBezig='Weekstaat lezen…';render();try{const r=await tbPdfLees(file),w=vlWeekstaat(r.tekst);vlBezig='';
    if(!w){render();toast('Dit is geen Van Tol-weekstaat (geen weekstaatnummer gevonden)');return}vlWeekstaatZet(w);bewaar();render();toast(`✓ Weekstaat ${w.nr}: ${Object.keys(w.r).length} posten${w.len?' + lening':''}`)}
  catch(e){vlBezig='';render();toast('Deze pdf kon ik niet lezen');console.warn(e)}}
const vlWkL=()=>Object.entries(vlV().wk).map(([nr,w])=>({nr,...w})).sort((a,c)=>a.d.localeCompare(c.d));
function vlWkWeek(w){const r=[];for(const[p,x]of Object.entries(w.r||{}))if(x.v)r.push([p,'vantol',x.b]);if(w.len){r.push(['Aflossing lening kassa\'s','lening',w.len.t]);r.push(['Rente lening','lening',w.len.rente])}return r}
const vlWkIncl=(c,b)=>c==='lening'?b:Math.round(b*1.21);
/* ---------- koppelen met Te betalen ---------- */
const VL_STOP=new Set(['van','de','der','den','het','bv','nv','vof','retail','groothandel','in','en','holding','levensmiddelen','b','v','the','and']);
const vlTok=s=>String(s||'').toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>=3&&!VL_STOP.has(w));
const vlLevOk=(lev,naam)=>{const n=new Set(vlTok(naam));return vlTok(lev).some(w=>n.has(w))};
function vlBetaal(x,b,d,txid){const v=vlV(),pid=urenId();x.bet[pid]={b,d,bank:txid};if(tbRest(x)===0)x.betaald=d;(v.kop[txid]=v.kop[txid]||{d,f:[]}).f.push([x.id,pid])}
function vlOntkoppel(txid){const v=vlV(),k=v.kop[txid];if(!k)return;const f=tbSchrijf();for(const[fid,pid]of k.f){const x=f[fid];if(!x)continue;delete x.bet[pid];if(x.betaald&&tbRest(x)>0)x.betaald=null}delete v.kop[txid];for(const[id,t]of Object.entries(v.terug))if(t.tx===txid)delete v.terug[id]}
function vlKoppel(nw){const v=vlV(),r={betaald:0,deel:0,ctl:0,storno:0};if(!betalenMag())return r;const f=tbSchrijf(),alle=tbAlle(),tx=vlTx();
  for(const t of tx){if(!nw.has(t.id)||v.kop[t.id]||v.ctl[t.id])continue;const tekst=(t.n+' '+t.o).toLowerCase().replace(/[.\-\/]/g,''),heeft=n=>new RegExp('(^|\\D)'+n.replace(/[^a-z0-9]/g,'')+'(\\D|$)').test(tekst);
    if(t.b>0){if(/storno|terugboeking|retour/i.test(t.o+' '+t.n)){const o=tx.find(y=>y.b===-t.b&&v.kop[y.id]&&y.d<=t.d&&vlKey(y.n)===vlKey(t.n));if(o){vlOntkoppel(o.id);r.storno++}}continue}
    const b=-t.b,nr=alle.filter(x=>{const n=tbNrN(x.nr);return n.length>=4&&heeft(n)&&(!x.fdat||x.fdat<=t.d)});
    const goed=nr.filter(x=>vlLevOk(x.lev,t.n)),open=goed.filter(x=>!tbIsBetaald(x));
    if(open.length===1){const x=open[0],rest=tbRest(x);if(b<=rest){vlBetaal(x,b,t.d,t.id);b<rest?r.deel++:r.betaald++}else{vlBetaal(x,rest,t.d,t.id);v.terug[urenId()]={lev:x.lev,b:b-rest,d:t.d,o:`Te veel betaald op ${x.nr}`,tx:t.id};r.betaald++}continue}
    if(goed.length&&!open.length){v.ctl[t.id]={s:'albetaald',fid:goed[0].id};r.ctl++;continue}
    if(nr.length)continue;
    const lev=alle.filter(x=>!tbIsBetaald(x)&&vlLevOk(x.lev,t.n)&&(!x.fdat||x.fdat<=t.d));if(!lev.length)continue;
    const een=lev.filter(x=>tbRest(x)===b);if(een.length){v.ctl[t.id]={s:'waarsch',f:[een[0].id]};r.ctl++;continue}
    const k=lev.sort((a,c)=>String(a.fdat).localeCompare(String(c.fdat))).slice(0,16),n=k.length;
    for(let m=3;m<(1<<n);m++){if(!(m&(m-1)))continue;let s=0;for(let i=0;i<n;i++)if(m&(1<<i))s+=tbRest(k[i]);if(s===b){v.ctl[t.id]={s:'waarsch',f:k.filter((_,i)=>m&(1<<i)).map(x=>x.id)};r.ctl++;break}}}
  return r}
const vlCtl=()=>{const v=vlV(),tx=Object.fromEntries(vlTx().map(t=>[t.id,t]));return Object.entries(v.ctl).filter(([id,c])=>tx[id]&&!c.klaar).map(([id,c])=>({...c,t:tx[id]}))};
/* ---------- rekenen ---------- */
function vlRek(){const tx=vlTx().map(t=>({...t,c:vlCat(t)})),mnd=[...new Set(tx.map(t=>t.m))].sort(),wk=vlWkL(),per={},geld={};
  for(const t of tx){const g=geld[t.m]=geld[t.m]||{in:0,uit:0,saldo:null,sd:''};t.b>0?g.in+=t.b:g.uit-=t.b;if(t.s!=null&&(t.d+String(t.q).padStart(6,'0'))>=g.sd){g.saldo=t.s;g.sd=t.d+String(t.q).padStart(6,'0')}
    if(!VL_KOST.includes(t.c))continue;const p=per[t.m]=per[t.m]||{};const c=p[t.c]=p[t.c]||{i:0,e:0};c.i-=t.b;c.e-=vlEx(t.b,t.c)}
  const laatst=wk[wk.length-1],wekelijks=laatst?vlWkWeek(laatst):[];
  for(const m of mnd){const ws=wk.filter(w=>w.d.slice(0,7)===m),p=per[m]=per[m]||{},f=52/12/(ws.length||1);
    for(const[,c,b]of ws.length?ws.flatMap(vlWkWeek):wekelijks){const x=p[c]=p[c]||{i:0,e:0};x.i+=Math.round(vlWkIncl(c,b)*f);x.e+=Math.round(b*f);if(ws.length<4)x.schat=1}}
  const groep={};for(const t of tx){if(!VL_KOST.includes(t.c)||t.b>=0)continue;const k=vlKey(t.n)||'?';(groep[k]=groep[k]||{n:t.n,c:t.c,l:[]}).l.push(t)}
  const vast=[],sig=[],max=tx.length?tx[tx.length-1].d:iso();
  for(const g of Object.values(groep)){const l=g.l,mn=new Set(l.map(t=>t.m)).size;if(!(l.length>=2&&mn>=2)&&!['verzekering','belasting'].includes(g.c))continue;
    const gap=l.length>1?(vanIso(l[l.length-1].d)-vanIso(l[0].d))/864e5/(l.length-1):365,fr=gap<=10?['week',52/12]:gap<=45?['maand',1]:gap<=120?['kwartaal',1/3]:['jaar',1/12],la=-l[l.length-1].b;
    vast.push({n:g.n,c:g.c,fr:fr[0],la,pm:Math.round(la*fr[1]),pme:Math.round(vlEx(-la,g.c)*-1*fr[1])});
    if(g.c!=='personeel'&&l.length>=3){const vr=l.slice(0,-1).map(t=>-t.b).sort((a,c)=>a-c),med=vr[vr.length>>1];if(la>med*1.05)sig.push(`${g.n}: ${fEuro(la)} (was ${fEuro(med)}, +${Math.round((la/med-1)*100)}%)`)}
    if(l.length>=2&&l[0].d>=plusDagen(max,-62))sig.push(`Nieuw: ${g.n} · ${fEuro(la)} per ${fr[0]}`)}
  if(wk.length>1){const a=Object.fromEntries(vlWkWeek(wk[wk.length-2]).map(x=>[x[0],x[2]]));for(const[p,,b]of wekelijks)if(a[p]&&b>a[p]*1.05)sig.push(`Van Tol ${p}: ${fEuro(b)} per week (was ${fEuro(a[p])})`)}
  for(const[p,c,b]of wekelijks)vast.push({n:p,c,fr:'week',la:vlWkIncl(c,b),pm:Math.round(vlWkIncl(c,b)*52/12),pme:Math.round(b*52/12),vt:1});
  vast.sort((a,c)=>VL_KOST.indexOf(a.c)-VL_KOST.indexOf(c.c)||c.pm-a.pm);
  const lg=tx.filter(t=>t.s!=null).pop(),open=tbOpen().filter(x=>(x.plan||x.verval||iso())<=plusDagen(iso(),28)),fo=open.reduce((s,x)=>s+tbRest(x),0),vtOpen=open.some(x=>/van ?tol/i.test(x.lev)),vk=Math.round(vast.filter(x=>!(x.vt&&vtOpen)).reduce((s,x)=>s+x.pm,0)*28/30.44);
  return{tx,mnd,per,geld,vast,sig,wk,laatst,vb:lg?{saldo:lg.s,sd:lg.d,fo,fn:open.length,vk,eind:lg.s-fo-vk}:null}}
/* ---------- scherm ---------- */
function vasteHtml(){const v=vlV(),R=vlRek(),ctl=vlCtl(),wb=vlBtw?'i':'e',m=vlMnd&&R.mnd.includes(vlMnd)?vlMnd:R.mnd[R.mnd.length-1],mi=R.mnd.indexOf(m);
  const mndN=x=>{const[j,mm]=x.split('-');return['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'][+mm-1]+' '+j};
  let h=`<div class="kop"><div class="koprij"><h1>Vaste lasten</h1><div class="kopeind">${info('vaste')}</div></div><p>Wat er elke maand vast uitgaat. Alleen voor jou zichtbaar.</p></div>
   <div class="kaartje"><div style="display:flex;gap:8px;flex-wrap:wrap"><label class="knop klein" style="margin:0">⬆️ Bankexport (CSV)<input type="file" id="vlCsv" accept=".csv,text/csv,text/plain" hidden></label><label class="knop rand klein" style="margin:0">📄 Van Tol-weekstaat<input type="file" id="vlPdf" accept="application/pdf,.pdf" hidden></label>${R.tx.length?'<button class="knop rand klein" style="margin:0" data-vl="excel">📊 Excel</button>':''}</div>
   <div class="sub" style="margin-top:8px">${vlBezig?'⏳ '+vlBezig:R.tx.length?`${R.tx.length} transacties t/m ${tbD(R.tx[R.tx.length-1].d)} · laatst geüpload ${tbD(v.upl)}`:'Nog niets ingelezen. Download bij ING een CSV-export van je zakelijke rekening en upload die hier.'}${R.wk.length?` · ${R.wk.length} weekstaat${R.wk.length>1?'en':''} (laatste ${R.laatst.nr})`:''}</div></div>`;
  if(ctl.length)h+=`<div class="kaartje tbinbox"><h3>🏦 Controleren (${ctl.length})</h3><div class="sub">Betalingen die ik niet zeker aan een factuur kon koppelen.</div>${ctl.map(vlCtlHtml).join('')}</div>`;
  const ter=Object.entries(v.terug).filter(([,t])=>!t.klaar);if(ter.length)h+=`<div class="kaartje"><h3>↩️ Te verrekenen · ${fEuro(ter.reduce((s,[,t])=>s+t.b,0))}</h3>${ter.map(([id,t])=>`<div class="rij inv"><div class="groei"><div class="naam" style="font-size:15px">${esc(t.lev)} · ${fEuro(t.b)}</div><div class="sub">${esc(t.o)} · ${tbD(t.d)}</div></div><button class="knop rand klein" data-vl="terugklaar" data-v="${id}">Verrekend</button></div>`).join('')}</div>`;
  if(R.sig.length)h+=`<div class="kaartje"><h3>📈 Let op</h3>${R.sig.slice(0,8).map(s=>`<div class="sub" style="margin-top:4px">• ${esc(s)}</div>`).join('')}</div>`;
  if(R.vb)h+=`<div class="kaartje"><h3>🔭 Komende 4 weken</h3><div class="sub">Saldo ${tbD(R.vb.sd)}: <b>${fEuro(R.vb.saldo)}</b><br>− ${R.vb.fn} open facturen die vervallen: ${fEuro(R.vb.fo)}<br>− vaste lasten 4 weken: ${fEuro(R.vb.vk)}</div><div class="tbgroot" style="font-size:26px;margin-top:6px;${R.vb.eind<0?'color:var(--rood)':''}">${fEuro(R.vb.eind)}</div><div class="sub">over na 4 weken (zonder nieuwe omzet en inkoop)</div></div>`;
  const ind=R.tx.filter(t=>t.c==='overig'&&t.b<0).length;
  h+=`<div class="segment" style="margin-top:14px">${[['overzicht','Per maand'],['vast','Vaste lasten'],['geld','In en uit'],['tx','Transacties']].map(([k,t])=>`<button data-vl="tab" data-v="${k}" class="${vlTab===k?'aan':''}">${t}</button>`).join('')}</div>
   <div class="chips" style="margin:0 16px 8px"><button class="chip ${vlBtw?'aan':''}" data-vl="btw" data-v="1">Met btw</button><button class="chip ${vlBtw?'':'aan'}" data-vl="btw" data-v="0">Zonder btw</button>${ind?`<button class="chip ${vlAlleenIndelen?'aan':''}" data-vl="indelen">Nog indelen (${ind})</button>`:''}</div>`;
  if(!R.mnd.length&&!R.wk.length)return h;
  if(vlTab==='overzicht'&&m){const p=R.per[m]||{},tot=VL_KOST.reduce((s,c)=>s+(p[c]?.[wb]||0),0),gem=c=>Math.round(R.mnd.reduce((s,x)=>s+(R.per[x]?.[c]?.[wb]||0),0)/R.mnd.length);
    h+=`<div class="datumrij"><button data-vl="mnd" data-v="${R.mnd[mi-1]||''}" ${mi>0?'':'disabled'}>‹</button><b style="flex:1;text-align:center;font-size:18px">${mndN(m)}</b><button data-vl="mnd" data-v="${R.mnd[mi+1]||''}" ${mi<R.mnd.length-1?'':'disabled'}>›</button></div>
     <div class="sectie menu">${VL_KOST.filter(c=>p[c]?.[wb]||gem(c)).map(c=>`<div class="rij inv"><div class="groei"><div class="naam" style="font-size:16px">${VL_N[c]}</div><div class="sub">gemiddeld ${fEuro(gem(c))} per maand${p[c]?.schat?' · ≈ geschat':''}</div></div><b>${fEuro(p[c]?.[wb]||0)}</b></div>`).join('')}
     <div class="rij inv"><div class="groei"><div class="naam">Totaal ${mndN(m)}</div><div class="sub">gemiddeld ${fEuro(VL_KOST.reduce((s,c)=>s+gem(c),0))} per maand</div></div><b>${fEuro(tot)}</b></div></div>`}
  if(vlTab==='vast'){const len=R.laatst?.len,vw=R.laatst?.ovv&&len?R.laatst.ovv-len.saldo:0;
    if(len){const wk=len.t?Math.ceil(len.saldo/len.t):0;h+=`<div class="kaartje"><h3>💳 Lening kassa's (Van Tol)</h3><div class="sub">Nog open: <b>${fEuro(len.saldo)}</b> van ${fEuro(len.begin)} · ${fEuro(len.t)} per week + ${fEuro(len.rente)} rente${wk?` · klaar rond <b>${tbD(plusDagen(R.laatst.d,wk*7)).slice(3)}</b> (${wk} weken)`:''}</div>${vw>0?`<div class="sub" style="margin-top:6px">Voorwaardelijke lening: <b>${fEuro(vw)}</b> · vervalt € 10.000 per jaar zolang je aan de voorwaarden voldoet (geen betaling)</div>`:''}</div>`}
    const tot=R.vast.reduce((s,x)=>s+(vlBtw?x.pm:x.pme),0);h+=`<div class="kaartje tbtotaal"><div class="tbgroot">${fEuro(tot)}</div><div class="sub">vaste lasten per maand ${vlBtw?'met':'zonder'} btw · ${R.vast.length} posten</div></div>`;
    for(const c of VL_KOST){const l=R.vast.filter(x=>x.c===c);if(!l.length)continue;h+=`<div class="sectie menu"><div class="karkop"><b>${VL_N[c]}</b><span>${fEuro(l.reduce((s,x)=>s+(vlBtw?x.pm:x.pme),0))} p/m</span></div>${l.map(x=>`<div class="rij inv"><div class="groei"><div class="naam" style="font-size:15px">${esc(x.n)}${x.vt?' <span class="tbnr">Van Tol</span>':''}</div><div class="sub">${fEuro(x.la)} per ${x.fr}</div></div><b>${fEuro(vlBtw?x.pm:x.pme)}</b></div>`).join('')}</div>`}}
  if(vlTab==='geld')h+=`<div class="sectie menu">${[...R.mnd].reverse().map(x=>{const g=R.geld[x]||{in:0,uit:0};return`<div class="rij inv"><div class="groei"><div class="naam" style="font-size:16px">${mndN(x)}</div><div class="sub">in ${fEuro(g.in)} · uit ${fEuro(g.uit)}${g.saldo!=null?` · saldo ${fEuro(g.saldo)}`:''}</div></div><b style="${g.in-g.uit<0?'color:var(--rood)':''}">${fEuro(g.in-g.uit)}</b></div>`}).join('')}</div>`;
  if(vlTab==='tx'){const q=vlZoek.toLowerCase(),l=R.tx.filter(t=>(!vlAlleenIndelen||(t.c==='overig'&&t.b<0))&&(!q||(t.n+' '+t.o+' '+bedragTekst(Math.abs(t.b)/100)).toLowerCase().includes(q))).reverse();
    h+=`<div style="margin:0 16px 8px"><input class="veld" id="vlZoek" placeholder="Zoek op naam, omschrijving of bedrag" value="${esc(vlZoek)}"></div><div class="sectie menu">${l.slice(0,150).map(t=>`<div class="rij inv"><div class="groei"><div class="naam" style="font-size:15px">${esc(t.n||'(geen naam)')}</div><div class="sub">${tbD(t.d)} · ${esc(t.o.slice(0,70))}</div>
      <select class="veld" data-vlcat="${esc(t.id)}" style="margin-top:6px;padding:6px">${VL_CAT.map(([k,n])=>`<option value="${k}" ${t.c===k?'selected':''}>${n}</option>`).join('')}</select></div><b style="${t.b>0?'color:var(--groen)':''}">${fEuro(t.b)}</b></div>`).join('')||'<div class="sub" style="padding:12px">Niets gevonden</div>'}${l.length>150?`<div class="sub" style="padding:12px">Nog ${l.length-150} meer: zoek om te vinden</div>`:''}</div>`}
  const kp=Object.entries(v.kop).sort((a,c)=>String(c[1].d).localeCompare(String(a[1].d))).slice(0,15),f=S.betalen?.f||{};
  if(kp.length)h+=`<details class="kaartje"><summary><b>💶 Afgeboekt via de bank (${Object.keys(v.kop).length})</b></summary>${kp.map(([id,k])=>`<div class="rij inv"><div class="groei"><div class="sub">${tbD(k.d)} · ${k.f.map(([fid])=>esc((f[fid]?.lev||'?')+' '+(f[fid]?.nr||''))).join(', ')}</div></div><button class="knop rand klein" data-vl="ontkoppel" data-v="${id}">Terugdraaien</button></div>`).join('')}</details>`;
  return h}
function vlCtlHtml(c){const t=c.t,f=S.betalen?.f||{},b=-t.b,kop=`<div class="naam" style="font-size:15px">${esc(t.n)} · ${fEuro(b)}</div><div class="sub">${tbD(t.d)} · ${esc(t.o.slice(0,80))}</div>`;
  if(c.s==='waarsch'){const l=c.f.map(i=>f[i]).filter(Boolean);return`<div class="rij inv" style="display:block">${kop}<div class="sub" style="margin-top:4px">Betaald: ${l.map(x=>`<b>${esc(x.nr)}</b> (${fEuro(tbRest(x))})`).join(' + ')}?</div><div class="knoppen" style="justify-content:flex-start;padding:6px 0 0;gap:6px"><button class="knop klein" data-vl="ja" data-v="${t.id}">Ja, betaald</button><button class="knop rand klein" data-vl="neg" data-v="${t.id}">Nee</button></div></div>`}
  const x=f[c.fid],sug=tbOpen().filter(y=>vlLevOk(y.lev,t.n)&&tbRest(y)===b).slice(0,3);
  return`<div class="rij inv" style="display:block">${kop}<div class="sub" style="margin-top:4px">Noemt factuur <b>${esc(x?.nr||'?')}</b>, maar die is al betaald${x?.betaald?' op '+tbD(x.betaald):''}.</div><div class="knoppen" style="justify-content:flex-start;padding:6px 0 0;gap:6px;flex-wrap:wrap">${sug.map(y=>`<button class="knop klein" data-vl="hoort" data-v="${t.id}|${esc(y.id)}">Hoort bij ${esc(y.nr)}</button>`).join('')}<button class="knop rand klein" data-vl="dubbel" data-v="${t.id}">Dubbel betaald</button><button class="knop rand klein" data-vl="neg" data-v="${t.id}">Negeren</button></div></div>`}
function vlTbKaart(){if(!S.vaste)return'';const n=vlCtl().length;return n?`<div class="kaartje tbinbox"><div class="rij inv" style="border:0;padding:0"><div class="groei"><div class="naam">🏦 ${n} ${n===1?'betaling':'betalingen'} uit de bank controleren</div><div class="sub">Kon ik niet zeker aan een factuur koppelen.</div></div><button class="knop klein" data-a="sub" data-v="vaste">Bekijken</button></div></div>`:''}
/* ---------- Excel ---------- */
async function vlExcel(){if(!window.XLSX){toast('Excel-onderdeel laden…');try{await laadXlsx()}catch(e){toast('Excel kon niet laden, controleer je internet');return}}const R=vlRek(),wb=XLSX.utils.book_new(),e=c=>(c||0)/100,A=(n,r)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(r),n);
  for(const[n,k]of[['Per maand met btw','i'],['Per maand zonder btw','e']])A(n,[['Categorie',...R.mnd,'Gemiddeld'],...VL_KOST.map(c=>{const l=R.mnd.map(m=>e(R.per[m]?.[c]?.[k]));return[VL_N[c].replace(/^\S+\s/,''),...l,Math.round(l.reduce((s,x)=>s+x,0)/Math.max(1,l.length)*100)/100]}),['Totaal',...R.mnd.map(m=>e(VL_KOST.reduce((s,c)=>s+(R.per[m]?.[c]?.[k]||0),0)))]]);
  A('Vaste lasten',[['Categorie','Naam','Hoe vaak','Laatste bedrag','Per maand met btw','Per maand zonder btw'],...R.vast.map(x=>[VL_N[x.c].replace(/^\S+\s/,''),x.n,x.fr,e(x.la),e(x.pm),e(x.pme)])]);
  A('Van Tol per week',[['Weekstaat','Datum','Post','Bedrag zonder btw','Vast'],...R.wk.flatMap(w=>[...Object.entries(w.r||{}).map(([p,x])=>[w.nr,tbD(w.d),p,e(x.b),x.v?'ja':'nee']),...(w.len?[[w.nr,tbD(w.d),'Aflossing lening',e(w.len.t),'ja'],[w.nr,tbD(w.d),'Rente lening',e(w.len.rente),'ja'],[w.nr,tbD(w.d),'Lening nog open',e(w.len.saldo),'']]:[])])]);
  A('In en uit',[['Maand','In','Uit','Verschil','Saldo eind maand'],...R.mnd.map(m=>{const g=R.geld[m]||{};return[m,e(g.in),e(g.uit),e(g.in-g.uit),g.saldo!=null?e(g.saldo):'']})]);
  A('Transacties',[['Datum','Naam','Omschrijving','Bedrag','Categorie','Btw %','Zonder btw'],...R.tx.map(t=>[tbD(t.d),t.n,t.o,e(t.b),VL_N[t.c].replace(/^\S+\s/,''),VL_BTW[t.c],e(vlEx(t.b,t.c))])]);
  A('Te verrekenen',[['Leverancier','Bedrag','Datum','Omschrijving','Verrekend'],...Object.values(vlV().terug).map(t=>[t.lev,e(t.b),tbD(t.d),t.o,t.klaar?'ja':'nee'])]);
  deelBestand(new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],`vaste-lasten-${iso()}.xlsx`,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}))}
/* ---------- klikken ---------- */
document.addEventListener('click',e=>{const el=e.target.closest('[data-vl]');if(!el||!betalenMag())return;const c=el.dataset.vl,v=el.dataset.v||'',V=vlV(),t=vlTx().find(x=>x.id===v.split('|')[0]);
  switch(c){case'tab':vlTab=v;break;case'btw':vlBtw=v==='1';break;case'mnd':if(v)vlMnd=v;break;case'indelen':vlAlleenIndelen=!vlAlleenIndelen;vlTab='tx';break;case'excel':vlExcel();return;
   case'ja':{const k=V.ctl[v];if(!k||!t)return;const f=tbSchrijf();for(const id of k.f){const x=f[id];if(x&&!tbIsBetaald(x))vlBetaal(x,tbRest(x),t.d,t.id)}k.klaar=1;bewaar();toast('✓ Afgeboekt');break}
   case'neg':if(V.ctl[v])V.ctl[v].klaar=1;bewaar();break;
   case'dubbel':if(!t)return;V.terug[urenId()]={lev:t.n,b:-t.b,d:t.d,o:'Dubbel betaald: terugvragen',tx:t.id};V.ctl[t.id].klaar=1;bewaar();toast('Staat bij Te verrekenen');break;
   case'hoort':{const x=tbSchrijf()[v.split('|')[1]];if(!x||!t)return;const rest=tbRest(x);vlBetaal(x,Math.min(-t.b,rest),t.d,t.id);if(-t.b>rest)V.terug[urenId()]={lev:x.lev,b:-t.b-rest,d:t.d,o:`Te veel betaald op ${x.nr}`,tx:t.id};V.ctl[t.id].klaar=1;bewaar();toast(`✓ ${x.nr} betaald`);break}
   case'terugklaar':if(V.terug[v])V.terug[v].klaar=iso();bewaar();break;
   case'ontkoppel':if(el.dataset.zeker!=='1'){el.dataset.zeker='1';el.textContent='Zeker?';return}vlOntkoppel(v);bewaar();toast('Teruggedraaid: factuur staat weer open');break;default:return}render()});
document.addEventListener('change',e=>{const id=e.target.id;if(!betalenMag())return;
  if(id==='vlCsv'||id==='vlPdf'){const f=e.target.files?.[0];e.target.value='';if(f)(id==='vlCsv'?vlCsvIn:vlPdfIn)(f);return}
  const k=e.target.dataset?.vlcat;if(k){const t=vlTx().find(x=>x.id===k);if(!t)return;vlV().regels[vlKey(t.n)]=e.target.value;bewaar();toast(`Alles van ${t.n||'deze naam'} → ${VL_N[e.target.value]}`);render()}});
let vlZT;document.addEventListener('input',e=>{if(e.target.id==='vlZoek'){vlZoek=e.target.value;clearTimeout(vlZT);vlZT=setTimeout(()=>{{render();const i=document.getElementById('vlZoek');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}}},400)}});
