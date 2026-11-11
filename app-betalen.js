/* ================= 10.14 Te betalen (inkoopfacturen, alleen voor de eigenaar) ================= */
/* S.betalen={eig:uid,f:{id:{id,lev,nr,fdat,verval,tot(centen),not,inc:{bureau,kosten,t}|null,bet:{pid:{b,d,vol}},betaald:iso|null,t}}} */
let tbTab='open',tbZoek='',tbStap=null;
function vulBetalen(b){b=isObj(b)?b:{};if(!isObj(b.f))b.f={};for(const[id,x]of Object.entries(b.f)){if(!isObj(x)){delete b.f[id];continue}if(!x.id)x.id=id;if(!isObj(x.bet))x.bet={}}return b}
const betalenMag=()=>isAdmin()&&kanBeheren()&&(!S.betalen?.eig||S.betalen.eig===L.sessie);
const tbD=d=>d?String(d).split('-').reverse().join('-'):'';
const tbInc=x=>isObj(x.inc)&&x.inc.aan!==false?x.inc:null;
const tbTotaal=x=>(+x.tot||0)+(tbInc(x)?+tbInc(x).kosten||0:0);
const tbBetaaldSom=x=>Object.values(x.bet||{}).reduce((t,p)=>t+(+p.b||0),0);
const tbRest=x=>Math.max(0,tbTotaal(x)-tbBetaaldSom(x));
const tbIsBetaald=x=>!!x.betaald;
const tbTeLaat=x=>!tbIsBetaald(x)&&x.verval&&x.verval<iso()?Math.round((vanIso(iso())-vanIso(x.verval))/864e5):0;
const tbAlle=()=>Object.values(S.betalen?.f||{}).filter(isObj);
const tbOpen=()=>tbAlle().filter(x=>!tbIsBetaald(x)).sort((a,c)=>(tbTeLaat(c)>0)-(tbTeLaat(a)>0)||String(a.verval||'9').localeCompare(String(c.verval||'9'))||String(a.fdat).localeCompare(String(c.fdat)));
const tbBetaald=()=>tbAlle().filter(tbIsBetaald).sort((a,c)=>String(c.betaald).localeCompare(String(a.betaald))||c.t-a.t);
function tbMatch(x,q){if(!q)return true;q=q.toLowerCase().trim();const n=q.replace(/[€\s]/g,'');
  return String(x.nr||'').toLowerCase().includes(q)||String(x.lev||'').toLowerCase().includes(q)||(n&&/[0-9]/.test(n)&&[x.tot,tbTotaal(x)].some(c=>bedragTekst((+c||0)/100).includes(n.replace('.',','))))||String(x.not||'').toLowerCase().includes(q)||tbLog(x).some(([,n])=>tbLogTekst(n).toLowerCase().includes(q))}
const TB_SOORT={herinnering:'Herinnering gestuurd',aanmaning:'Aanmaning',gebeld:'Gebeld',notitie:'Notitie'};
const tbLog=x=>Object.entries(isObj(x.log)?x.log:{}).filter(([,n])=>isObj(n)).sort((a,c)=>String(c[1].d).localeCompare(String(a[1].d))||(c[1].ts||0)-(a[1].ts||0));
const tbLogTekst=n=>`${TB_SOORT[n.s]||'Notitie'} · ${tbD(n.d)}${n.t?': '+n.t:''}`;
function tbLogHtml(x){const l=tbLog(x);
  return`<div class="sectie" style="margin:16px 0 0"><div class="karkop"><b>Notities</b></div>
   <div class="tbsnel">${Object.entries(TB_SOORT).map(([k,t])=>`<button class="knop rand klein" data-tb="logsoort" data-v="${k}">${k==='notitie'?'+ Eigen notitie':t}</button>`).join('')}</div>
   <div id="tbLogNieuw" style="display:none"><div class="minmax"><div><label id="tbLogLabel">Notitie</label><input class="veld" type="date" id="tbLogD" value="${iso()}" max="${iso()}"></div></div>
    <input class="veld" id="tbLogT" maxlength="200" placeholder="Bijv. per mail, 2e herinnering"><input type="hidden" id="tbLogS" value="notitie">
    <div class="knoppen" style="justify-content:flex-start;padding:8px 0 0"><button class="knop klein" data-tb="logok" data-v="${esc(x.id)}">Notitie toevoegen</button></div></div>
   ${l.map(([nid,n])=>`<div class="rij inv"><div class="groei"><div class="naam" style="font-size:15px">${esc(TB_SOORT[n.s]||'Notitie')} · ${esc(tbD(n.d))}</div>${n.t?`<div class="sub">${esc(n.t)}</div>`:''}</div><button class="knop rand klein" data-tb="logweg" data-v="${esc(x.id)}|${esc(nid)}">Weg</button></div>`).join('')||'<p class="leeg" style="margin:10px">Nog geen notities.</p>'}</div>`}
function tbSchrijf(){if(!isObj(S.betalen))S.betalen={};if(!isObj(S.betalen.f))S.betalen.f={};if(!S.betalen.eig)S.betalen.eig=L.sessie;return S.betalen.f}
const tbLeveranciers=()=>[...new Set(tbAlle().map(x=>(x.lev||'').trim()).filter(Boolean))].sort((a,c)=>a.localeCompare(c,'nl'));
function tbRij(x){const inc=tbInc(x),laat=tbTeLaat(x),som=tbBetaaldSom(x),rest=tbRest(x),bet=tbIsBetaald(x);
  const sub=[`factuur ${tbD(x.fdat)}`,!bet&&x.plan?`<b>gepland ${tbD(x.plan)}</b>`:'',bet?`<b class="groentekst">betaald ${tbD(x.betaald)}</b>`:x.verval?(laat?`<b class="oranjetekst">${laat} ${laat===1?'dag':'dagen'} te laat</b> (vervaldatum ${tbD(x.verval)})`:`vervalt ${tbD(x.verval)}`):''].filter(Boolean).join(' · ');
  const extra=[inc?`<span class="tbinc">Incasso${inc.bureau?' '+esc(inc.bureau):''} + ${fEuro(+inc.kosten||0)}</span>`:'',!bet&&som?`betaald ${fEuro(som)} · <b>nog open ${fEuro(rest)}</b>`:'',bet&&Object.keys(x.bet||{}).length>1?`${Object.keys(x.bet).length} betalingen`:'',x.not?esc(x.not):''].filter(Boolean).join(' · '),lg=tbLog(x)[0];
  return`<div class="tbrij ${laat?'laat':''} ${inc?'inc':''}"><button class="tbinfo" data-tb="bewerk" data-v="${esc(x.id)}"><div class="naam">${esc(x.lev||'?')} <span class="tbnr">${esc(x.nr||'')}</span></div><div class="sub">${sub}</div>${extra?`<div class="sub">${extra}</div>`:''}${lg?`<div class="sub tblaatst">📝 ${esc(tbLogTekst(lg[1]))}</div>`:''}</button>
   <div class="tbrechts"><div class="tbbedrag">${fEuro(bet?tbTotaal(x):rest)}</div>${bet?`<button class="knop rand klein" data-tb="terug" data-v="${esc(x.id)}">${tbStap==='terug:'+x.id?'Zeker?':'Terugzetten'}</button>`:`<div class="tbknoppen"><button class="knop klein" data-tb="betaald" data-v="${esc(x.id)}">✓ Betaald</button><button class="knop rand klein" data-tb="deel" data-v="${esc(x.id)}">Deel</button>${inc?'':`<button class="knop rand klein" data-tb="incasso" data-v="${esc(x.id)}">Incasso</button>`}</div>`}</div></div>`}
/* 10.16 sorteren en filteren */
let tbF={st:'alle',lev:'',van:'',tot:''};
const TB_SORT=[['fdat','Factuurdatum (oudste eerst)'],['fdat_d','Factuurdatum (nieuwste eerst)'],['verval','Vervaldatum'],['lev','Leverancier (A–Z)'],['bedr_d','Bedrag (hoog–laag)'],['bedr_a','Bedrag (laag–hoog)'],['betd','Betaaldatum (nieuwste eerst)']];
const tbSort=()=>{const v=prof().tbSort;return TB_SORT.some(x=>x[0]===v)?v:'fdat'};
const tbBedrag=x=>tbIsBetaald(x)?tbTotaal(x):tbRest(x);
function tbSorteer(l){const k=tbSort(),s=(a,c)=>String(a||'').localeCompare(String(c||''));const nr=(a,c)=>s(a.fdat,c.fdat)||s(a.nr,c.nr);
  const f={fdat:nr,fdat_d:(a,c)=>nr(c,a),verval:(a,c)=>s(a.verval||'9',c.verval||'9')||nr(a,c),lev:(a,c)=>String(a.lev||'').localeCompare(String(c.lev||''),'nl')||nr(a,c),bedr_d:(a,c)=>tbBedrag(c)-tbBedrag(a)||nr(a,c),bedr_a:(a,c)=>tbBedrag(a)-tbBedrag(c)||nr(a,c),betd:(a,c)=>s(c.betaald,a.betaald)||nr(c,a)}[k]||nr;
  return l.slice().sort(f)}
function tbFilterOk(x){const st=tbF.st;
  if(st==='laat'&&!tbTeLaat(x))return false;if(st==='incasso'&&!tbInc(x))return false;if(st==='deels'&&!(tbBetaaldSom(x)>0&&!tbIsBetaald(x)))return false;if(st==='notitie'&&!tbLog(x).length&&!x.not)return false;
  if(tbF.lev&&String(x.lev||'').toLowerCase()!==tbF.lev.toLowerCase())return false;if(tbF.van&&String(x.fdat||'')<tbF.van)return false;if(tbF.tot&&String(x.fdat||'')>tbF.tot)return false;return true}
const tbFilterAan=()=>tbF.st!=='alle'||!!tbF.lev||!!tbF.van||!!tbF.tot||!!tbZoek.trim();
function tbLijst(){return tbSorteer((tbTab==='open'?tbOpen():tbBetaald()).filter(x=>tbFilterOk(x)&&tbMatch(x,tbZoek)))}
function tbLijstHtml(){const alle=tbTab==='open'?tbOpen():tbBetaald(),l=tbLijst();
  const kop=tbFilterAan()?`<div class="tbfilterinfo"><span><b>${l.length}</b> van ${alle.length} getoond · ${fEuro(l.reduce((t,x)=>t+tbBedrag(x),0))}</span><button class="knop rand klein" data-tb="fwis">Filters wissen</button></div>`:'';
  if(!l.length)return kop+`<p class="leeg">${tbFilterAan()?'Niets gevonden.':tbTab==='open'?'Geen openstaande facturen.':'Nog geen betaalde facturen.'}</p>`;
  return kop+l.map(tbRij).join('')}
function tbFilterHtml(){const st=tbTab==='open'?[['alle','Alles'],['laat','Te laat'],['incasso','Incasso'],['deels','Deels betaald'],['notitie','Met notitie']]:[['alle','Alles'],['incasso','Incasso'],['notitie','Met notitie']];
  if(!st.some(x=>x[0]===tbF.st))tbF.st='alle';const so=TB_SORT.filter(x=>tbTab==='betaald'||x[0]!=='betd');
  return`<div class="tbchips">${st.map(([k,l])=>`<button class="tbchip ${tbF.st===k?'aan':''}" data-tb="fst" data-v="${k}">${l}</button>`).join('')}</div>
   <div class="tbfilters"><label>Sorteren<select class="veld" id="tbSortSel">${so.map(([k,l])=>`<option value="${k}" ${tbSort()===k?'selected':''}>${l}</option>`).join('')}</select></label>
    <label>Leverancier<select class="veld" id="tbLevSel"><option value="">Alle leveranciers</option>${tbLeveranciers().map(l=>`<option ${tbF.lev.toLowerCase()===l.toLowerCase()?'selected':''}>${esc(l)}</option>`).join('')}</select></label>
    <div class="minmax"><div><label>Factuurdatum van</label><input class="veld" type="date" id="tbFvan" value="${esc(tbF.van)}"></div><div><label>tot en met</label><input class="veld" type="date" id="tbFtot" value="${esc(tbF.tot)}"></div></div></div>`}
function betalenHtml(){if(!betalenMag())return'';const o=tbOpen(),b=tbBetaald(),tot=o.reduce((t,x)=>t+tbRest(x),0),laat=o.filter(tbTeLaat),inc=o.filter(tbInc);
  let h=`<div class="kop"><div class="koprij"><h1>Te betalen</h1></div><p>Je inkoopfacturen. Alleen voor jou zichtbaar.</p></div>
   <div class="segment"><button data-tb="tab" data-v="open" class="${tbTab==='open'?'aan':''}">Open (${o.length})</button><button data-tb="tab" data-v="planning" class="${tbTab==='planning'?'aan':''}">Planning</button><button data-tb="tab" data-v="betaald" class="${tbTab==='betaald'?'aan':''}">Betaald (${b.length})</button></div>`;
  if(tbTab==='open')h+=tbInboxHtml();
  if(tbTab==='open')h+=`<div class="kaartje tbtotaal"><div class="tbgroot">${fEuro(tot)}</div><div class="sub">nog te betalen · ${o.length} ${o.length===1?'factuur':'facturen'}</div>
     ${laat.length?`<div class="sub oranjetekst"><b>${laat.length} te laat · ${fEuro(laat.reduce((t,x)=>t+tbRest(x),0))}</b></div>`:''}${inc.length?`<div class="sub" style="color:var(--rood)"><b>${inc.length} bij incasso · ${fEuro(inc.reduce((t,x)=>t+(+tbInc(x).kosten||0),0))} incassokosten</b></div>`:''}</div>`;
  else if(tbTab==='planning')return h+tbPlanHtml();
  else{const mnd=iso().slice(0,7);h+=`<div class="kaartje tbtotaal"><div class="tbgroot">${fEuro(b.filter(x=>String(x.betaald).slice(0,7)===mnd).reduce((t,x)=>t+tbTotaal(x),0))}</div><div class="sub">betaald deze maand · ${b.length} betaalde facturen in totaal</div></div>`}
  h+=`<div class="zoekbalk"><input class="veld" id="tbZoek" type="search" placeholder="Zoek op factuurnummer, leverancier of bedrag" value="${esc(tbZoek)}" autocomplete="off"></div>${tbFilterHtml()}
   <div class="knoppen" style="justify-content:flex-start;gap:8px;flex-wrap:wrap;padding-top:0">${tbTab==='open'?`<button class="knop" data-tb="nieuw">+ Factuur</button><button class="knop" data-tb="scan">📷 Scan factuur</button><button class="knop rand" data-tb="opdracht">📲 Delen vanuit Mail</button>`:''}<button class="knop rand" data-tb="excel">📊 Excel</button><button class="knop rand" data-tb="inlezen">📥 Excel inlezen</button></div>${S.betalen?.sjab?.data?`<p class="hulp" style="margin:0 18px 8px">📊 Excel gebruikt jouw bestand ${esc(S.betalen.sjab.naam||'')}${tbFilterAan()?' · alleen de getoonde facturen':''}.</p>`:''}
   <div id="tbLijst">${tbLijstHtml()}</div>`;
  return h}
/* ---------- 10.17 planning, scannen, bijlagen ---------- */
let tbScanBijl=null,tbScanKlaar=false,tbScanPdf=null,tbScanN=1;
const tbDat=x=>x.plan||x.verval||'';
function tbPlanHtml(){const o=tbOpen(),vd=iso(),w1=plusDagen(maandag(vd),7),w2=plusDagen(w1,7),inst=isObj(S.betalen?.inst)?S.betalen.inst:{};
  const gr=[['Te laat',x=>tbDat(x)&&tbDat(x)<vd],['Deze week',x=>tbDat(x)>=vd&&tbDat(x)<w1],['Volgende week',x=>tbDat(x)>=w1&&tbDat(x)<w2],['Later',x=>tbDat(x)>=w2],['Zonder datum',x=>!tbDat(x)]];
  let h='';for(const[t,fn]of gr){const l=o.filter(fn).sort((a,c)=>tbDat(a).localeCompare(tbDat(c))||String(a.fdat).localeCompare(String(c.fdat)));if(!l.length)continue;
    h+=`<div class="tbgroep"><div class="tbgroepkop ${t==='Te laat'?'laat':''}"><b>${t}</b><span>${l.length} · <b>${fEuro(l.reduce((s,x)=>s+tbRest(x),0))}</b></span></div>${l.map(tbRij).join('')}</div>`}
  if(!h)h='<p class="leeg">Geen openstaande facturen.</p>';
  return h+`<p class="hulp" style="margin:4px 18px 12px">Een factuur staat in de week van de geplande betaaldatum, of anders van de vervaldatum. De geplande datum zet je in de factuur.</p>
   <div class="kaartje"><h3>Pushmeldingen</h3><label class="schakel" style="margin:6px 0 0;color:var(--tekst);font-weight:400">Meldingen over vervaldatums<input type="checkbox" id="tbPushAan" ${inst.push!==false?'checked':''}></label>
    <div style="display:flex;align-items:center;gap:10px;margin-top:10px">Melding <select class="veld" id="tbPushVoor" style="width:90px">${[1,2,3,5,7].map(n=>`<option value="${n}" ${(+inst.voor||3)===n?'selected':''}>${n}</option>`).join('')}</select> ${(+inst.voor||3)===1?'dag':'dagen'} voor de vervaldatum</div>
    <div class="sub" style="margin-top:8px">Plus een melding op de vervaldag zelf en elke maandag om 8:00 wat er die week betaald moet worden. Alleen naar jouw toestel (zet pushmeldingen aan onder Beheer → Pushmeldingen).</div></div>
   <div class="kaartje"><h3>📲 Facturen delen vanuit Mail</h3><div class="sub">Met de iPhone-opdracht “Naar Brood Opzet” deel je een factuur uit Mail, Bestanden of Foto's direct naar de app, zonder op te slaan.</div>
    <div class="knoppen" style="justify-content:flex-start;padding:10px 0 0"><button class="knop klein" data-tb="opdracht">${S.betalen?.inst?.code?'Opdracht bekijken':'Opdracht instellen'}</button></div></div>`}
function tbKiesBestand(cb){const i=document.createElement('input');i.type='file';i.accept='image/*,application/pdf,.pdf';i.onchange=()=>{if(i.files[0])cb(i.files[0])};i.click()}
const tbIsPdf=f=>/pdf/i.test(f.type)||/\.pdf$/i.test(f.name||'');
const tbDataUrl=f=>new Promise((ok,nee)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=nee;r.readAsDataURL(f)});
async function tbPdfLees(file){await laadPdfjs();const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise,n=pdf.numPages,pag=[];
  for(let p=1;p<=n;p++){const pg=await pdf.getPage(p),tc=await pg.getTextContent(),rij={};for(const it of tc.items){if(!it.str.trim())continue;const y=Math.round(it.transform[5]/3)*3;(rij[y]=rij[y]||[]).push(it)}
    pag.push(Object.keys(rij).map(Number).sort((a,b)=>b-a).map(y=>rij[y].sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str).join(' ')).join('\n'))}
  const p1=await pdf.getPage(1),v1=p1.getViewport({scale:1}),sc=Math.min(3,1400/v1.width),vp=p1.getViewport({scale:sc}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);await p1.render({canvasContext:g,viewport:vp}).promise;
  return{tekst:pag.join('\n'),eind:pag.slice(-2).join('\n'),canvas:c,n}}
async function tbCanvas(file){if(tbIsPdf(file)){const r=await tbPdfLees(file);return{...r,pdf:file.size<=8*1024*1024?await tbDataUrl(file):null}}return{canvas:await afbNaarCanvas(file),tekst:''}}
function tbVerklein(c){const m=Math.min(1,1400/Math.max(c.width,c.height)),k=document.createElement('canvas');k.width=Math.round(c.width*m);k.height=Math.round(c.height*m);const g=k.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,k.width,k.height);g.drawImage(c,0,0,k.width,k.height);return k.toDataURL('image/jpeg',.6)}
async function tbOcr(c){const w=await tessKlaar();try{await w.setParameters({tessedit_pageseg_mode:'3',tessedit_char_whitelist:''})}catch(e){}return ocrCanvas(c)}
const TB_MND={jan:1,feb:2,mrt:3,maa:3,mar:3,apr:4,mei:5,may:5,jun:6,jul:7,aug:8,sep:9,okt:10,oct:10,nov:11,dec:12};
function tbLeesFactuur(t,eind){t=String(t||'').replace(/\r/g,'');const low=t.toLowerCase(),r={};
  r.lev=tbLeveranciers().sort((a,c)=>c.length-a.length).find(l=>l.length>2&&low.includes(l.toLowerCase()))||'';
  if(!r.lev){const c=t.split('\n').map(x=>x.trim().split(/\s(?:btw|vat|kvk|iban|bic|tel\.?|telefoon|incassant\w*|e-?mail)\b/i)[0].trim()).filter(x=>/[a-z]{3}/i.test(x)&&!/^[\d+]/.test(x)&&!/factuur|invoice|datum|date|due|amount|total|pagina|page|t\.a\.v|klant|debiteur|coop|vogelenzang|zondaglaan|@|www\.|straat|weg\s\d|laan\s\d/i.test(x));
    const k=c.find(x=>/\b(b\.?v\.?|v\.?o\.?f\.?|n\.?v\.?|holding|bakkerij|groothandel)(\b|$)/i.test(x))||c[0];r.lev=(k||'').replace(/\s{2,}.*/,'').replace(/[^\p{L}\p{N}&.,' -]/gu,'').trim().slice(0,60)}
  const MND='jan|feb|mrt|maa|mar|apr|mei|may|jun|jul|aug|sep|okt|oct|nov|dec';
  const DTN='(?<![\\d.,])(\\d{1,2})[-./](\\d{1,2})[-./](\\d{4}|\\d{2})(?![\\d,])',DTM='(?<!\\d)(\\d{1,2})\\.?\\s*[-./ ]?\\s*('+MND+')[a-z]*\\.?\\s*[-./ ]?\\s*(\\d{4})(?!\\d)';
  const pd=m=>{if(!m)return null;let d=+m[1],mm=/^\d+$/.test(m[2])?+m[2]:TB_MND[m[2].toLowerCase().slice(0,3)],y=+m[3];if(y<100)y+=2000;if(!(d>=1&&d<=31&&mm>=1&&mm<=12&&y>=2000&&y<2100))return null;return`${y}-${String(mm).padStart(2,'0')}-${String(d).padStart(2,'0')}`};
  const redelijk=d=>!!d&&d>=plusDagen(iso(),-730)&&d<=plusDagen(iso(),120);
  const datums=x=>{const l=[];for(const re of[DTN,DTM])for(const m of x.matchAll(new RegExp(re,'gi'))){const v=pd(m);if(v)l.push({i:m.index,v})}return l.sort((a,c)=>a.i-c.i).map(o=>o.v)};
  const isDatum=w=>/^\d{1,2}[-./]\d{1,2}[-./](\d{4}|\d{2})$/.test(w);
  const isBedrag=w=>/^-?(€|eur)?\d{1,3}([.\s]\d{3})*[.,]\d{2}$/i.test(w);
  const nrOk=w=>!!w&&/\d/.test(w)&&!isDatum(w)&&!isBedrag(w)&&w.length>=3&&!/^[A-Z]{2}\d{2}[A-Z]{4}\d{6,}$/i.test(w)&&!/^NL\d{9}B\d{2}$/i.test(w);
  /* 1. kopjes naast elkaar, waarden op de regel eronder (zoals bij Retail Solutions) */
  const regels=t.split('\n').map(x=>x.trim()).filter(Boolean),kol={};
  for(let i=0;i<regels.length-1;i++){const L=regels[i].toLowerCase(),lb=[];
    for(const[k,re]of[['nr',/factuur\s*(nummer|nr\b|no\b)|invoice\s*(number|no\b)/],['fdat',/factuurdatum|factuur\s+datum|invoice\s+date/],['verval',/vervaldatum|verval\s+datum|due\s+date|uiterste\s+betaaldatum/]]){const m=L.search(re);if(m>=0)lb.push([m,k])}
    if(lb.length<2)continue;lb.sort((a,c)=>a[0]-c[0]);
    for(const V of regels.slice(i+1,i+3)){const ds=datums(V);if(!ds.length&&!/\d/.test(V))continue;
      lb.filter(x=>x[1]!=='nr').forEach((x,j)=>{if(ds[j]&&!kol[x[1]])kol[x[1]]=ds[j]});
      if(lb.some(x=>x[1]==='nr')&&!kol.nr){const w=V.split(/\s+/).find(nrOk);if(w)kol.nr=w.replace(/[.,:;]$/,'')}
      break}
    if(Object.keys(kol).length)break}
  /* 2. waarde direct achter het kopje */
  const nrK=[...t.matchAll(/(?:factuur|invoice)[ \t]*(?:nummer|nr\.?|no\.?|number|#)?[ \t]*[:#.]?[ \t]*([A-Z]{0,5}[-\/]?\d[\w\-\/.]{1,20})/gi),...t.matchAll(/(?:^|\n)[ \t]*(?:nummer|nr\.?|number)[ \t]*[:#][ \t]*([A-Z]{0,5}[-\/]?\d[\w\-\/.]{1,20})/gi)].map(m=>m[1].replace(/[.,:]$/,'')).filter(nrOk);
  r.nr=kol.nr||nrK[0]||'';
  const zoek=w=>{for(const x of w)for(const re of[DTN,DTM]){const m=t.match(new RegExp(x+'[^\\n\\d]{0,30}'+re,'i'));const v=m&&pd(m);if(redelijk(v))return v}return null};
  r.fdat=redelijk(kol.fdat)?kol.fdat:zoek(['factuurdatum','factuur datum','datum factuur','invoice date','datum'])||datums(t).find(redelijk)||null;
  r.verval=redelijk(kol.verval)?kol.verval:zoek(['vervaldatum','verval datum','uiterste betaaldatum','betalen voor','te voldoen voor','due date','vervaldag']);
  if(r.verval&&r.fdat&&r.verval<r.fdat)r.verval=null;
  const BED='(-?\\d{1,3}(?:[.\\s]\\d{3})*,\\d{2}|-?\\d+[.,]\\d{2})(?!\\d)';let tot=null;
  const zoekTot=txt=>{for(const w of['totaal te betalen','te betalen','totaal te voldoen','totaal incl','totaalbedrag','factuurbedrag','totaal factuur','amount due','totaal','total']){const re=new RegExp(w+'([^\\n\\d€-]{0,40})(?:€|eur)?\\s*'+BED,'gi');let m,laatst=null;
    while((m=re.exec(txt))){const voor=txt.slice(Math.max(0,m.index-3),m.index).toLowerCase();if(voor.endsWith('sub')||/excl|ex\.? ?btw|zonder/i.test(m[1]))continue;const v=leesBedrag(m[2].replace(/\s/g,''));if(v)laatst=v}if(laatst!=null)return laatst}return null};
  tot=(eind?zoekTot(eind):null)??zoekTot(t);
  if(tot==null){const alle=[...t.matchAll(new RegExp('€\\s*'+BED,'g'))].map(m=>leesBedrag(m[1].replace(/\s/g,''))).filter(v=>v>0);if(alle.length)tot=Math.max(...alle)}
  if(tot!=null)r.tot=fCent(tot);if(!r.verval&&r.fdat)r.verval=plusDagen(r.fdat,30);return r}
async function tbScan(file){toast('Factuur lezen… even geduld');try{const c=await tbCanvas(file);let tekst=c.tekst;
    if(tekst.replace(/\s/g,'').length<40&&c.canvas){toast('Tekst herkennen…');tekst=await tbOcr(c.canvas)}
    tbScanBijl=c.canvas?tbVerklein(c.canvas):null;tbScanPdf=c.pdf||null;tbScanN=c.n||1;const v=tbLeesFactuur(tekst,c.eind),gev=['lev','nr','fdat','tot'].filter(k=>v[k]).length;
    const pre={};for(const k of['lev','nr','fdat','verval','tot'])if(v[k]!=null&&v[k]!=='')pre[k]=v[k];tbFormulier(null,pre);toast(gev===4?'Gelezen: controleer de gegevens':`${gev} van 4 gegevens gelezen: vul de rest aan`)}
  catch(z){console.warn(z);toast('Lezen lukte niet: vul de factuur zelf in');tbScanBijl=null;tbFormulier(null)}}
function tbToonBijl(src){if(!src)return;if(/^data:application\/pdf/.test(src)){tbToonPdf(src);return}let ov=document.getElementById('tbBijlOv');if(!ov){ov=document.createElement('div');ov.id='tbBijlOv';ov.setAttribute('role','dialog');document.body.appendChild(ov);ov.addEventListener('click',e=>{if(e.target.closest('[data-tbsluit]')||e.target===ov)ov.classList.remove('open')})}
  ov.innerHTML=`<div class="tbbijlbalk"><b>Factuur</b><span class="tbbijlhulp">tik om in te zoomen</span><button data-tbsluit="1" class="knop wit klein">Sluiten</button></div><div class="tbbijlvak"><img src="${src}" alt="Factuur"></div>`;ov.classList.add('open');
  const img=ov.querySelector('img');img.addEventListener('click',ev=>{ev.stopPropagation();const vak=ov.querySelector('.tbbijlvak'),r=img.getBoundingClientRect(),fx=(ev.clientX-r.left)/r.width,fy=(ev.clientY-r.top)/r.height;img.classList.toggle('zoom');
    if(img.classList.contains('zoom'))requestAnimationFrame(()=>{vak.scrollLeft=img.offsetWidth*fx-vak.clientWidth/2;vak.scrollTop=img.offsetHeight*fy-vak.clientHeight/2})})}
/* ---------- 10.18 binnengekomen facturen (iPhone-opdracht) ---------- */
let tbInActief=null;
const TB_IN_URL=SUPA_URL+'/functions/v1/hyper-task';
const tbInLijst=()=>Object.entries(isObj(S.tbIn)?S.tbIn:{}).filter(([,d])=>typeof d==='string'&&d.startsWith('data:')).sort((a,c)=>a[0].localeCompare(c[0]));
function tbNieuweCode(){const a=new Uint8Array(18);crypto.getRandomValues(a);return Array.from(a,b=>'abcdefghjkmnpqrstuvwxyz23456789'[b%31]).join('')}
function tbDataFile(d,naam){const m=/^data:([^;]+);base64,(.*)$/.exec(d);if(!m)throw new Error('geen bestand');const bin=atob(m[2]),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  const ext=/pdf/.test(m[1])?'.pdf':/png/.test(m[1])?'.png':/heic/.test(m[1])?'.heic':'.jpg';return new File([u],naam+ext,{type:m[1]})}
function tbInboxHtml(){const l=tbInLijst();if(!l.length)return'';const tijd=id=>{const t=parseInt(id.slice(0,-4),36);return isFinite(t)&&t>1e12?`${datumTekst(iso(new Date(t)))} ${tijdTekst(t)}`:''};
  return`<div class="kaartje tbinbox"><h3>📥 Nieuwe facturen (${l.length})</h3><div class="sub">Gedeeld met de opdracht “Naar Brood Opzet”. Tik op Verwerken: de app leest de factuur uit.</div>
   ${l.map(([id,d])=>`<div class="rij inv" style="flex-wrap:wrap;padding-left:0;padding-right:0"><div class="groei"><div class="naam" style="font-size:16px">${/pdf/.test(d.slice(0,30))?'📄 PDF':'🖼 Foto'}</div><div class="sub">ontvangen ${esc(tijd(id))}</div></div>
    <div class="knoppen" style="padding:0;gap:6px;flex-wrap:wrap"><button class="knop klein" data-tb="inverwerk" data-v="${esc(id)}">Verwerken</button>${/pdf/.test(d.slice(0,30))?'':`<button class="knop rand klein" data-tb="inzien" data-v="${esc(id)}">Bekijken</button>`}<button class="knop rand klein" data-tb="inweg" data-v="${esc(id)}">${tbStap==='inweg:'+id?'Zeker?':'Weggooien'}</button></div></div>`).join('')}</div>`}
function tbOpdrachtSheet(){const c=S.betalen?.inst?.code||'',kb=(k,t)=>`<button class="knop rand klein" data-tb="kopieer" data-k="${k}">📋 ${t}</button>`;
  toonSheet(`<div class="pkop"><span style="width:70px"></span><b>Opdracht “Naar Brood Opzet”</b><button data-a="sluit" style="font-weight:700">Klaar</button></div><div class="pinhoud tbopdracht">
   <p>Eén keer instellen in de app <b>Opdrachten</b> op je iPhone. Daarna: bijlage in Mail → <b>Deel</b> → <b>Naar Brood Opzet</b>.</p>
   <ol>
    <li>Open <b>Opdrachten</b>, tik op <b>＋</b> en noem de opdracht <b>Naar Brood Opzet</b>.</li>
    <li>Tik op <b>ⓘ</b> onderaan en zet <b>Toon in deelpaneel</b> aan. Bovenaan staat dan: <i>Ontvang Afbeeldingen en 3 andere uit Deelpaneel</i>. Goed zo.</li>
    <li>Zoek de actie <b>Herhaal met elk</b> en zet hem eronder (onderdeel in <b>Invoer opdracht</b>).</li>
    <li>Zoek <b>Haal inhoud van URL op</b> en sleep hem tussen <b>Herhaal met elk</b> en <b>Stop herhalen</b>.
      <ul><li>Tik op <b>URL</b> en plak het adres ${kb('url','Kopieer adres')}</li>
      <li>Tik op het pijltje <b>⌄</b> → <b>Methode</b>: <b>POST</b></li>
      <li><b>Kopteksten</b> → <b>Voeg nieuwe koptekst toe</b>: sleutel <code>x-code</code>, tekst: plak je code ${kb('code','Kopieer code')}</li>
      <li>Nog een keer <b>Voeg nieuwe koptekst toe</b>: sleutel <code>apikey</code>, tekst ${kb('key','Kopieer sleutel')}</li>
      <li><b>Vraag om hoofdtekst</b>: tik op <b>JSON</b> en kies <b>Bestand</b>. Tik op het vak bij <b>Bestand</b> → <b>Selecteer variabele</b> → <b>Herhaalonderdeel</b>.</li></ul></li>
    <li>Zoek <b>Toon melding</b> en zet hem <b>direct onder</b> Haal inhoud van URL op (nog vóór Stop herhalen). Wis de tekst en tik op het blauwe blokje <b>Inhoud van URL</b>. Je krijgt dan “✓ Ontvangen!” of de reden als het niet lukt.</li>
    <li>Mooier maken: tik bovenaan op de naam → <b>Kies pictogram</b> → kleur <b>oranje</b>. Wil je de opdracht ook op je beginscherm met het Brood Opzet-logo: bewaar eerst het logo ${'<button class="knop rand klein" data-tb="logo">🖼 Logo bewaren</button>'} (kies <i>Bewaar afbeelding</i>), daarna naam → <b>Zet op beginscherm</b> → tik op het icoon → <b>Kies foto</b>.</li>
   </ol>
   <div class="knoppen" style="justify-content:flex-start;gap:6px;flex-wrap:wrap"><button class="knop klein" data-tb="intest">Verbinding testen</button><button class="knop rand klein rood" data-tb="nieuwecode">Nieuwe code maken</button></div>
   <p class="hulp">Je code: <code>${esc(c)}</code>. Houd hem geheim: met deze code kan iemand een factuur naar je app sturen (niet lezen). De namen van de acties kunnen per iOS-versie iets verschillen.</p></div>`)}
/* ---------- 10.21 dubbele facturen ---------- */
const tbNrN=x=>String(x||'').toLowerCase().replace(/[\s.\-\/]/g,'');
const tbLevN=x=>String(x||'').toLowerCase().replace(/\b(b\.?\s?v\.?|v\.?o\.?f\.?|n\.?v\.?|holding)\b/g,'').replace(/[^a-z0-9]/g,'');
function tbDubbel(nr,lev,tot,eigen){const n=tbNrN(nr);if(n.length<3)return null;const l=tbLevN(lev);
  return tbAlle().find(y=>y.id!==eigen&&tbNrN(y.nr)===n&&((l&&tbLevN(y.lev)&&(tbLevN(y.lev).includes(l)||l.includes(tbLevN(y.lev))))||(tot&&+y.tot===+tot)))||null}
function tbDubHtml(d){if(!d)return'';return`<div class="kaartje tbdub"><b>⚠️ Deze factuur staat er al in</b><div class="sub">${esc(d.lev||'?')} · ${esc(d.nr||'')} · ${fEuro(+d.tot||0)} · factuur ${tbD(d.fdat)} · ${tbIsBetaald(d)?'<b>betaald '+tbD(d.betaald)+'</b>':'<b>nog open</b>'}</div>
   <div class="knoppen" style="justify-content:flex-start;gap:6px;flex-wrap:wrap;padding:8px 0 0"><button class="knop klein" data-tb="dubweg">${tbInActief?'Weggooien':'Niet toevoegen'}</button><button class="knop rand klein" data-tb="dubok">Toch toevoegen</button></div></div>`}
function tbDubToon(d){const v=document.getElementById('tbDubVak');if(v)v.innerHTML=tbDubHtml(d);document.querySelector('#paneel .pinhoud')?.scrollTo({top:0,behavior:'smooth'})}
async function tbToonPdf(src){let ov=document.getElementById('tbBijlOv');if(!ov){ov=document.createElement('div');ov.id='tbBijlOv';ov.setAttribute('role','dialog');document.body.appendChild(ov);ov.addEventListener('click',e=>{if(e.target.closest('[data-tbsluit]')||e.target===ov)ov.classList.remove('open')})}
  ov.innerHTML=`<div class="tbbijlbalk"><b>Factuur</b><span class="tbbijlhulp" id="tbPag">laden…</span><button data-tbsluit="1" class="knop wit klein">Sluiten</button></div><div class="tbbijlvak" id="tbPdfVak"></div>`;ov.classList.add('open');
  try{await laadPdfjs();const bin=atob(src.split(',')[1]),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
    const pdf=await pdfjsLib.getDocument({data:u}).promise,n=pdf.numPages,vak=document.getElementById('tbPdfVak'),lab=document.getElementById('tbPag');if(!vak)return;
    const tel=()=>{const kids=[...vak.children],mid=vak.scrollTop+vak.clientHeight/3;let p=1;for(const k of kids)if(k.offsetTop<=mid)p=+k.dataset.p;if(vak.scrollTop+vak.clientHeight>=vak.scrollHeight-4)p=n;if(lab)lab.textContent=`pagina ${p} van ${n} · tik om in te zoomen`};
    for(let p=1;p<=n;p++){const d=document.createElement('div');d.className='tbpag';d.dataset.p=p;d.style.aspectRatio='1/1.414';vak.appendChild(d)}
    const teken=async d=>{if(d.dataset.klaar)return;d.dataset.klaar=1;const pg=await pdf.getPage(+d.dataset.p),v1=pg.getViewport({scale:1}),vp=pg.getViewport({scale:Math.min(3,1500/v1.width)}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;
      const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);await pg.render({canvasContext:g,viewport:vp}).promise;d.style.aspectRatio=`${vp.width}/${vp.height}`;d.appendChild(c)};
    const io=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting)teken(e.target)},{root:vak,rootMargin:'600px 0px'});for(const d of vak.children)io.observe(d);
    vak.addEventListener('scroll',tel,{passive:true});tel();
    vak.addEventListener('click',e=>{if(!e.target.closest('canvas'))return;const r=e.target.getBoundingClientRect(),fx=(e.clientX-r.left)/r.width,top=e.target.parentElement.offsetTop,fy=(e.clientY-r.top)/r.height;vak.classList.toggle('zoom');
      requestAnimationFrame(()=>{const c=e.target;vak.scrollLeft=c.offsetWidth*fx-vak.clientWidth/2;vak.scrollTop=e.target.parentElement.offsetTop+c.offsetHeight*fy-vak.clientHeight/2})})}
  catch(z){console.warn(z);const v=document.getElementById('tbPdfVak');if(v)v.innerHTML='<p class="leeg" style="color:#fff">De PDF kon niet worden geopend.</p>'}}
/* ---------- formulieren ---------- */
function tbFormulier(x,pre){const n=!x;if(n){tbScanKlaar=!!pre;tbStap=null}x=x||{fdat:iso(),verval:plusDagen(iso(),30),...(pre||{})};const inc=tbInc(x);
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>${n?'Nieuwe factuur':'Factuur'}</b><button data-tb="bewaar" data-v="${esc(x.id||'')}" style="font-weight:700">Bewaren</button></div><div class="pinhoud">
   <div id="tbDubVak">${n?tbDubHtml(tbDubbel(x.nr,x.lev,x.tot,'')):''}</div>
   <label>Leverancier</label><input class="veld" id="tbLev" list="tbLevLijst" maxlength="60" value="${esc(x.lev||'')}" autocomplete="off"><datalist id="tbLevLijst">${tbLeveranciers().map(l=>`<option value="${esc(l)}">`).join('')}</datalist>
   <label>Factuurnummer</label><input class="veld" id="tbNr" maxlength="40" value="${esc(x.nr||'')}" autocomplete="off">
   <div class="minmax"><div><label>Factuurdatum</label><input class="veld" type="date" id="tbFd" value="${esc(x.fdat||'')}"></div><div><label>Vervaldatum</label><input class="veld" type="date" id="tbVv" value="${esc(x.verval||'')}" data-auto="${n&&!pre?.verval?1:''}"></div></div>
   <label>Geplande betaaldatum</label><input class="veld" type="date" id="tbPlan" value="${esc(x.plan||'')}" style="width:190px">
   <label>Factuurtotaal (€)</label><input class="veld" id="tbTot" inputmode="decimal" value="${x.tot!=null?bedragTekst(x.tot/100):''}" style="width:160px">
   <label class="schakel" style="margin-top:14px;color:var(--tekst);font-weight:700">Naar incassobureau<input type="checkbox" id="tbIncAan" ${inc?'checked':''}></label>
   <div id="tbIncVeld" style="${inc?'':'display:none'}"><label>Incassobureau</label><input class="veld" id="tbIncB" maxlength="60" value="${esc(inc?.bureau||'')}"><label>Incassokosten (€)</label><input class="veld" id="tbIncK" inputmode="decimal" value="${inc?bedragTekst((+inc.kosten||0)/100):''}" style="width:160px"></div>
   <label>Opmerking</label><input class="veld" id="tbNot" maxlength="200" value="${esc(x.not||'')}">
   ${n?(tbScanKlaar&&tbScanBijl?`<div class="tbbijl"><img src="${tbScanBijl}" alt="Gescande factuur" data-tb="scanzien" role="button"><div class="sub">🔍 Tik op de factuur om hem groot te bekijken${tbScanPdf&&tbScanN>1?` · 📄 ${tbScanN} pagina's`:''}.</div><div class="sub">De gescande factuur wordt bij de factuur bewaard. Controleer de gegevens.</div></div>`:''):`<div class="knoppen" style="justify-content:flex-start;gap:6px;flex-wrap:wrap;padding:10px 0 0">${S.tbBijl?.[x.id]?`<button class="knop rand klein" data-tb="bijlzien" data-v="${esc(x.id)}">📎 Factuur bekijken</button>`:''}<button class="knop rand klein" data-tb="bijlkoppel" data-v="${esc(x.id)}">📷 ${S.tbBijl?.[x.id]?'Andere foto/PDF':'Foto of PDF koppelen'}</button></div>`}
   <div class="fout" id="fout"></div>
   ${!n?`<div id="tbLogVak">${tbLogHtml(x)}</div>`+tbBetalingenHtml(x)+`<div class="knoppen" style="justify-content:flex-start;padding:14px 0 0"><button class="knop rand rood klein" data-tb="weg" data-v="${esc(x.id)}">Factuur verwijderen</button></div>`:''}</div>`)}
function tbBetalingenHtml(x){const l=Object.entries(x.bet||{}).sort((a,c)=>String(a[1].d).localeCompare(String(c[1].d)));
  return`<div class="sectie" style="margin:16px 0 0"><div class="karkop"><b>Betalingen</b><span class="bbtel" style="margin-left:auto">${fEuro(tbBetaaldSom(x))} van ${fEuro(tbTotaal(x))}</span></div>
   ${l.map(([pid,p])=>`<div class="rij inv"><div class="groei"><div class="naam" style="font-size:16px">${fEuro(+p.b||0)}</div><div class="sub">${tbD(p.d)}${p.vol?' · restbedrag':''}</div></div><button class="knop rand klein" data-tb="betweg" data-v="${esc(x.id)}|${esc(pid)}">Weg</button></div>`).join('')||'<p class="leeg" style="margin:10px">Nog niets betaald.</p>'}
   ${tbIsBetaald(x)?'':`<div class="knoppen" style="justify-content:flex-start"><button class="knop rand klein" data-tb="deel" data-v="${esc(x.id)}">+ Deelbetaling</button></div>`}</div>`}
function tbBetaalSheet(x,vol){const rest=tbRest(x);
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>${vol?'Betaald':'Deelbetaling'}</b><button data-tb="${vol?'betaaldok':'deelok'}" data-v="${esc(x.id)}" style="font-weight:700">Bewaren</button></div><div class="pinhoud">
   <p class="hulp" style="margin-top:0"><b>${esc(x.lev||'')}</b> · ${esc(x.nr||'')} · nog open ${fEuro(rest)}</p>
   ${vol?'':`<label>Bedrag (€)</label><input class="veld" id="tbBb" inputmode="decimal" value="" placeholder="${bedragTekst(rest/100)}" style="width:160px">`}
   <label>Datum betaald</label><input class="veld" type="date" id="tbBd" value="${iso()}" max="${iso()}" style="width:190px"><div class="fout" id="fout"></div>
   ${vol?`<p class="hulp">Het restbedrag van ${fEuro(rest)} wordt als betaald geboekt en de factuur gaat naar Betaald.</p>`:`<p class="hulp">Is het restant daarna € 0,00, dan gaat de factuur vanzelf naar Betaald.</p>`}</div>`)}
function tbIncSheet(x){toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Naar incassobureau</b><button data-tb="incok" data-v="${esc(x.id)}" style="font-weight:700">Bewaren</button></div><div class="pinhoud">
   <p class="hulp" style="margin-top:0"><b>${esc(x.lev||'')}</b> · ${esc(x.nr||'')} · ${fEuro(+x.tot||0)}</p>
   <label>Incassobureau</label><input class="veld" id="tbIncB" maxlength="60"><label>Incassokosten (€)</label><input class="veld" id="tbIncK" inputmode="decimal" style="width:160px"><div class="fout" id="fout"></div>
   <p class="hulp">De incassokosten komen bovenop het factuurbedrag.</p></div>`);setTimeout(()=>document.getElementById('tbIncB')?.focus(),200)}
const tbVal=id=>(document.getElementById(id)?.value||'').trim();
const tbFout=t=>{const e=document.getElementById('fout');if(e)e.textContent=t;return null};
function tbBoekVol(x,d){const rest=tbRest(x);if(rest>0)x.bet[urenId()]={b:rest,d,vol:true};x.betaald=d}
/* ---------- export ---------- */
const JSZIP_URL='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
const tbXmlEsc=t=>String(t??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
const tbSerie=d=>{if(!d)return null;const[y,m,dd]=d.split('-').map(Number);return(Date.UTC(y,m-1,dd)-Date.UTC(1899,11,30))/864e5};
function tbNotitieExcel(x){const inc=tbInc(x),p=[];if(inc)p.push(`incl. ${fEuro(+inc.kosten||0)} incassokosten${inc.bureau?' ('+inc.bureau+')':''}`);if(tbIsBetaald(x))p.push('betaald '+tbD(x.betaald));
  if(x.not)p.push(x.not);for(const[,n]of tbLog(x).reverse())if(!/^betaaldatum onbekend/.test(n.t||''))p.push(tbLogTekst(n));return p.join(' · ')}
async function tbExcelEigen(lijst){await laadScript(JSZIP_URL,()=>window.JSZip);const bin=atob(S.betalen.sjab.data),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  const zip=await JSZip.loadAsync(u),W=(f,t)=>zip.file(f,new TextEncoder().encode(t)),wbx=await zip.file('xl/workbook.xml').async('uint8array').then(z=>new TextDecoder().decode(z)),rels=await zip.file('xl/_rels/workbook.xml.rels').async('uint8array').then(z=>new TextDecoder().decode(z));
  const sh=[...wbx.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)].find(m=>/openstaande posten/i.test(m[1].replace(/&amp;/g,'&')));if(!sh)throw new Error('tabblad niet gevonden');
  const doel=(rels.match(new RegExp('<Relationship [^>]*Id="'+sh[2]+'"[^>]*/>'))||[''])[0].match(/Target="([^"]+)"/)[1],pad='xl/'+doel.replace(/^\/?xl\//,'').replace(/^\.\//,'');
  let x=await zip.file(pad).async('uint8array').then(z=>new TextDecoder().decode(z));
  const rijRe=r=>new RegExp('<row r="'+r+'"[^>]*>[\\s\\S]*?</row>|<row r="'+r+'"[^>]*/>');
  const kopR=[...x.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)].find(m=>/<c r="C\d+"[^>]*t="s"/.test(m[2])&&m[0].includes('r="A'+m[1]+'"'));
  const sst=await zip.file('xl/sharedStrings.xml')?.async('uint8array').then(z=>new TextDecoder().decode(z))||'',strs=[...sst.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m=>m[1].replace(/<[^>]+>/g,''));
  let k0=5;for(const m of x.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)){const c=m[2].match(/<c r="C\d+"[^>]*t="s"[^>]*><v>(\d+)<\/v>/);if(c&&strs[+c[1]]==='Factuurnummer'){k0=+m[1];break}}
  const eerste=k0+1,rijen=[...x.matchAll(/<row r="(\d+)"[^>]*>[\s\S]*?<\/row>/g)].map(m=>+m[1]);
  let tabelEind=0;const tabPad=[];for(const f of Object.keys(zip.files))if(/^xl\/tables\/table\d+\.xml$/.test(f)){const t=await zip.file(f).async('uint8array').then(z=>new TextDecoder().decode(z)),m=t.match(/ref="A(\d+):([A-Z]+)(\d+)"/);if(m&&+m[1]===k0){tabelEind=+m[3];tabPad.push(f)}}
  const oudLaatst=tabelEind||Math.max(...rijen.filter(r=>r>k0&&r<=k0+300));
  const stijl=r=>{const m=x.match(rijRe(r));const o={};if(m)for(const c of m[0].matchAll(/<c r="([A-Z]+)\d+"(?:[^>]*?\ss="(\d+)")?/g))o[c[1]]=c[2]||'';return{o,attr:(m?m[0].match(/<row ([^>]*)>/)[1]:'').replace(/\s*r="\d+"/,'').replace(/\s*spans="[^"]*"/,'')}};
  const st1=stijl(eerste),st2=stijl(eerste+1);
  const n=lijst.length,nieuwLaatst=Math.max(oudLaatst,eerste+n-1+10),totRij=oudLaatst+1;
  const F={E:r=>`IF(D${r}="","",IF(B${r}="","",D${r}+IFERROR(VLOOKUP(B${r},'⚙️ Instellingen'!$A:$D,4,0),30)))`,H:r=>`IF(F${r}="","",IF(B${r}="Van den Berg bloemen",F${r}/0.8,F${r}*(1+SUBSTITUTE(G${r},"%","")/100)))`,
    K:r=>`IF(J${r}="","",J${r}-L${r})`,M:r=>`IF(J${r}="","",IF(L${r}=0,"Open",IF(ROUND(L${r},2)>=ROUND(J${r},2),"Betaald","Gedeeltelijk betaald")))`,
    O:r=>`IF(OR(M${r}="Betaald",M${r}="",D${r}=""),"—",IF(TODAY()-D${r}<30,"0–30 dagen",IF(TODAY()-D${r}<60,"30–60 dagen",IF(TODAY()-D${r}<90,"60–90 dagen","90+ dagen"))))`,
    P:r=>`IF(OR(B${r}="",C${r}=""),"",IF(COUNTIFS(B$${eerste}:B$${nieuwLaatst},B${r},C$${eerste}:C$${nieuwLaatst},C${r})>1,"⚠ DUBBEL",""))`};
  const KOL='ABCDEFGHIJKLMNOP'.split('');
  const rij=(r,y,i)=>{const s=(i%2?st2:st1),c=(k,inh,t)=>`<c r="${k}${r}"${s.o[k]?` s="${s.o[k]}"`:''}${t?` t="${t}"`:''}>${inh}</c>`,leeg=k=>`<c r="${k}${r}"${s.o[k]?` s="${s.o[k]}"`:''}/>`,
      str=(k,t)=>t?c(k,`<is><t xml:space="preserve">${tbXmlEsc(t)}</t></is>`,'inlineStr'):leeg(k),num=(k,v)=>v==null||v===''?leeg(k):c(k,`<v>${v}</v>`),fo=(k,t)=>c(k,`<f>${tbXmlEsc(F[k](r))}</f>`,t);
    const out=[num('A',i+1)];
    if(y){out.push(str('B',y.lev),str('C',y.nr),num('D',tbSerie(y.fdat)),y.verval?num('E',tbSerie(y.verval)):fo('E'),leeg('F'),leeg('G'),fo('H','str'),leeg('I'),num('J',Math.round(tbTotaal(y))/100),fo('K'),num('L',Math.round(tbBetaaldSom(y))/100),fo('M','str'),str('N',tbNotitieExcel(y)),fo('O','str'),fo('P','str'))}
    else out.push(leeg('B'),leeg('C'),leeg('D'),fo('E','str'),leeg('F'),leeg('G'),fo('H','str'),leeg('I'),leeg('J'),fo('K','str'),num('L',0),fo('M','str'),leeg('N'),fo('O','str'),fo('P','str'));
    return`<row r="${r}" ${s.attr}>${out.join('')}</row>`};
  let nieuw='';for(let r=eerste,i=0;r<=nieuwLaatst;r++,i++)nieuw+=rij(r,lijst[i],i);
  // oude datarijen weg, nieuwe ervoor in de plaats; totaalrij en verder schuiven
  const verschuif=nieuwLaatst-oudLaatst;
  x=x.replace(/<row r="(\d+)"[^>]*>[\s\S]*?<\/row>|<row r="(\d+)"[^>]*\/>/g,(m,a,b2)=>{const r=+(a||b2);if(r>=eerste&&r<=oudLaatst)return r===eerste?'@@DATA@@':'';
    if(r>oudLaatst&&verschuif){m=m.replace(/(<row r=")(\d+)/,(q,p1,p2)=>p1+(+p2+verschuif)).replace(/(<c r="[A-Z]+)(\d+)/g,(q,p1,p2)=>p1+(+p2+verschuif))}
    if(r===totRij)m=m.replace(/<f>([\s\S]*?)<\/f>/g,(q,f)=>'<f>'+f.replace(new RegExp('([A-Z]+)'+(oudLaatst-1)+'(?![0-9])','g'),'$1'+nieuwLaatst).replace(new RegExp('([A-Z]+)'+oudLaatst+'(?![0-9])','g'),'$1'+nieuwLaatst)+'</f>');
    return m});
  x=x.replace('@@DATA@@',nieuw);
  const bereik=t=>t.replace(new RegExp('\\$'+oudLaatst+'(?![0-9])','g'),'$'+nieuwLaatst).replace(new RegExp('([A-Z]+)'+eerste+':([A-Z]+)'+oudLaatst+'(?![0-9])','g'),'$1'+eerste+':$2'+nieuwLaatst);
  x=bereik(x).replace(/<dimension ref="A1:([A-Z]+)(\d+)"/,(m,c,r)=>`<dimension ref="A1:${c}${+r+verschuif}"`);
  const geenCache=t=>t.replace(/(<\/f>|<f [^>]*\/>)<v>[^<]*<\/v>/g,'$1');
  W(pad,geenCache(x));
  for(const f of Object.keys(zip.files)){if(/^xl\/worksheets\/sheet\d+\.xml$/.test(f)&&f!==pad){const t=await zip.file(f).async('uint8array').then(z=>new TextDecoder().decode(z)),b=t.replace(/<f([^>]*)>([^<]*Openstaande Posten[^<]*)<\/f>/g,(m,at,f)=>'<f'+at+'>'+f.replace(new RegExp('(:\\$?[A-Z]+\\$?)'+oudLaatst+'(?![0-9])','g'),'$1'+nieuwLaatst)+'</f>');W(f,geenCache(b))}}
  for(const f of tabPad){const t=await zip.file(f).async('uint8array').then(z=>new TextDecoder().decode(z));W(f,t.replace(new RegExp('(ref="A'+k0+':[A-Z]+)'+oudLaatst+'"','g'),'$1'+nieuwLaatst+'"'))}
  if(zip.file('xl/calcChain.xml')){zip.remove('xl/calcChain.xml');const ct=await zip.file('[Content_Types].xml').async('uint8array').then(z=>new TextDecoder().decode(z));W('[Content_Types].xml',ct.replace(/<Override[^>]*calcChain[^>]*\/>/,''));W('xl/_rels/workbook.xml.rels',rels.replace(/<Relationship[^>]*calcChain[^>]*\/>/,''))}
  W('xl/workbook.xml',/<calcPr[^>]*\/>/.test(wbx)?wbx.replace(/<calcPr([^>]*?)\s*\/>/,(m,a)=>`<calcPr${a.replace(/\sfullCalcOnLoad="[^"]*"/,'')} fullCalcOnLoad="1"/>`):wbx.replace('</workbook>','<calcPr fullCalcOnLoad="1"/></workbook>'));
  const blob=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'}),basis=(S.betalen.sjab.naam||'Openstaande_Posten.xlsx').replace(/\.xlsx$/i,'').replace(/-\d{4}-\d{2}-\d{2}$/,'');
  deelBestand(new File([blob],`${basis}-${iso()}.xlsx`,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}))}
async function tbExcel(){if(S.betalen?.sjab?.data){const l=tbFilterAan()?tbLijst():tbSorteer(tbAlle());toast('Excel maken…');try{await tbExcelEigen(l);return}catch(e){console.warn(e);meldFout(e,'Excel eigen bestand');toast('Jouw Excel-bestand lukte niet, ik maak een gewone export')}}if(!window.XLSX){toast('Excel-onderdeel laden…');try{await laadXlsx()}catch(e){toast('Excel kon niet laden, controleer je internet');return}}
  const kop=['Leverancier','Factuurnummer','Factuurdatum','Vervaldatum','Factuurtotaal','Incassobureau','Incassokosten','Totaal te betalen','Betaald','Nog open','Betaaldatum','Dagen te laat','Betalingen','Opmerking','Notities'];
  const rij=x=>{const inc=tbInc(x);return[x.lev||'',x.nr||'',tbD(x.fdat),tbD(x.verval),(+x.tot||0)/100,inc?.bureau||'',inc?(+inc.kosten||0)/100:'',tbTotaal(x)/100,tbBetaaldSom(x)/100,tbRest(x)/100,tbD(x.betaald),tbTeLaat(x)||'',Object.values(x.bet||{}).sort((a,c)=>String(a.d).localeCompare(String(c.d))).map(p=>`${tbD(p.d)} € ${bedragTekst((+p.b||0)/100)}`).join('; '),x.not||'',tbLog(x).reverse().map(([,n])=>tbLogTekst(n)).join('; ')]};
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([kop,...(tbFilterAan()&&tbTab==='open'?tbLijst():tbSorteer(tbOpen())).map(rij)]),'Open');XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([kop,...(tbFilterAan()&&tbTab==='betaald'?tbLijst():tbSorteer(tbBetaald())).map(rij)]),'Betaald');
  const buf=XLSX.write(wb,{bookType:'xlsx',type:'array'});deelBestand(new File([buf],`te-betalen-${iso()}.xlsx`,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}))}
/* ---------- Excel inlezen (Openstaande Posten) ---------- */
let tbImport=null;
function tbXlsDatum(v){if(v==null||v==='')return null;if(typeof v==='number'){const d=new Date(Math.round((v-25569)*864e5));return isNaN(d)?null:d.toISOString().slice(0,10)}
  const t=String(v).trim();let m=t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m=t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);if(m){const j=m[3].length===2?'20'+m[3]:m[3];return`${j}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`}return null}
const tbXlsGetal=v=>typeof v==='number'?v:leesBedrag(v);
async function tbLeesExcel(file){if(!window.XLSX){toast('Excel-onderdeel laden…');try{await laadXlsx()}catch(e){toast('Excel kon niet laden, controleer je internet');return}}
  let wb;try{wb=XLSX.read(await file.arrayBuffer(),{type:'array'})}catch(e){toast('Dit bestand kan ik niet lezen');return}
  const naam=wb.SheetNames.find(n=>/openstaande posten/i.test(n))||wb.SheetNames.find(n=>{const r=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:null}).slice(0,15);return r.some(x=>x.includes('Factuurnummer'))});
  if(!naam){toast('Geen tabblad met facturen gevonden');return}
  if(/openstaande posten/i.test(naam)){try{const buf=new Uint8Array(await file.arrayBuffer());let b='';for(let i=0;i<buf.length;i+=32768)b+=String.fromCharCode.apply(null,buf.subarray(i,i+32768));
    if(buf.length<3e6){tbSchrijf();S.betalen.sjab={naam:file.name,data:btoa(b),t:Date.now()};bewaar()}}catch(e){console.warn(e)}}
  const rijen=XLSX.utils.sheet_to_json(wb.Sheets[naam],{header:1,raw:true,defval:null}),ki=rijen.findIndex(r=>r.some(c=>String(c||'').trim()==='Factuurnummer'));if(ki<0){toast('Kolom Factuurnummer niet gevonden');return}
  const kop=rijen[ki].map(c=>String(c||'').trim().toLowerCase()),col=(...n)=>{for(const x of n){const i=kop.indexOf(x);if(i>=0)return i}return -1};
  const cL=col('bedrijf','leverancier'),cN=col('factuurnummer'),cF=col('factuurdatum'),cV=col('vervaldatum'),cT=col('te betalen','bedrag incl btw','totaal'),cB=col('betaald bedrag','betaald'),cS=col('status'),cO=col('notities','notitie','opmerking');
  if(cL<0||cN<0||cT<0){toast('Kolommen Bedrijf, Factuurnummer of Te betalen niet gevonden');return}
  const bestaand=new Set(tbAlle().map(x=>(String(x.lev).trim()+'|'+String(x.nr).trim()).toLowerCase())),nieuw=[],gezien=new Set();let dubbel=0;
  for(const r of rijen.slice(ki+1)){const lev=String(r[cL]??'').trim(),nr=String(r[cN]??'').trim();if(!lev||!nr)continue;const k=(lev+'|'+nr).toLowerCase();if(bestaand.has(k)||gezien.has(k)){dubbel++;continue}gezien.add(k);
    const fd=tbXlsDatum(r[cF])||iso(),vv=tbXlsDatum(cV>=0?r[cV]:null)||plusDagen(fd,30),tot=fCent(tbXlsGetal(r[cT])),bb=cB>=0?fCent(tbXlsGetal(r[cB])):0,st=String(cS>=0?r[cS]??'':'').trim().toLowerCase(),no=String(cO>=0?r[cO]??'':'').trim();
    nieuw.push({lev:lev.slice(0,60),nr:nr.slice(0,40),fdat:fd,verval:vv,tot,bb,betaald:st==='betaald',no})}
  if(!nieuw.length){toast(dubbel?`Alle ${dubbel} facturen staan er al in`:'Geen facturen gevonden');return}
  tbImport=nieuw;const o=nieuw.filter(x=>!x.betaald),b=nieuw.filter(x=>x.betaald),som=o.reduce((t,x)=>t+Math.max(0,x.tot-x.bb),0),inc=o.filter(x=>/^incasso$/i.test(x.no)).length;
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Excel inlezen</b><button data-tb="importok" style="font-weight:700">Inlezen</button></div><div class="pinhoud">
   <p>Uit <b>${esc(file.name)}</b> (tabblad ${esc(naam.replace(/^[^A-Za-z]+/,''))}):</p>
   <div class="kaartje"><div class="naam">${nieuw.length} facturen</div><div class="sub"><b>${o.length} open</b> · ${fEuro(som)} nog te betalen${inc?` · ${inc} bij incasso`:''}</div><div class="sub">${b.length} betaald</div>${dubbel?`<div class="sub">${dubbel} overgeslagen: staan er al in</div>`:''}</div>
   <p class="hulp">Betaalde facturen krijgen de vervaldatum als betaaldatum, met de notitie "betaaldatum onbekend (uit Excel)". De notitie "Incasso" wordt een incassomarkering met € 0 kosten: vul de echte kosten later per factuur in.</p></div>`)}
function tbImportDoe(){const f=tbSchrijf(),nu=iso(),ts=Date.now();let n=0;
  for(const r of tbImport||[]){const id=urenId(),x=f[id]={id,lev:r.lev,nr:r.nr,fdat:r.fdat,verval:r.verval,tot:r.tot,not:'',bet:{},log:{},inc:null,t:ts,bron:'excel'};n++;
    const nl=(s,t,d)=>{x.log[urenId()]={s,t,d:d||nu,ts:Date.now()}};
    if(/^incasso$/i.test(r.no))x.inc={bureau:'',kosten:0,t:ts};else if(r.no)nl('notitie',r.no);
    if(r.betaald){const d=r.verval||r.fdat;if(r.bb)x.bet[urenId()]={b:r.bb,d};else if(r.tot)x.bet[urenId()]={b:r.tot,d,vol:true};x.betaald=d;nl('notitie','betaaldatum onbekend (uit Excel)');
      if(r.bb-r.tot>=100)nl('notitie',`${fEuro(r.bb-r.tot)} te veel betaald (volgens Excel)`)}
    else if(r.bb>0){x.bet[urenId()]={b:Math.min(r.bb,r.tot),d:nu};nl('notitie',`${fEuro(r.bb)} al betaald volgens Excel, datum onbekend`)}}
  tbImport=null;return n}
/* ---------- klikken ---------- */
document.addEventListener('click',e=>{const el=e.target.closest('[data-tb]');if(!el||el.tagName==='INPUT')return;if(!betalenMag())return;L.laatsteActie=Date.now();const c=el.dataset.tb,v=el.dataset.v||'',f=tbSchrijf(),x=f[v];
  try{switch(c){
  case'tab':tbTab=v;tbStap=null;render();return;
  case'nieuw':tbFormulier(null);setTimeout(()=>{const i=document.getElementById('tbLev');if(i&&!document.activeElement?.matches('#paneel input'))i.focus()},250);return;
  case'bewerk':if(x)tbFormulier(x);return;
  case'bewaar':{const lev=tbVal('tbLev'),nr=tbVal('tbNr'),fd=tbVal('tbFd'),vv=tbVal('tbVv'),tot=fCent(leesBedrag(tbVal('tbTot'))),incAan=document.getElementById('tbIncAan').checked,incK=fCent(leesBedrag(tbVal('tbIncK')));
    if(!lev)return tbFout('Vul de leverancier in.');if(!nr)return tbFout('Vul het factuurnummer in.');if(!fd)return tbFout('Vul de factuurdatum in.');if(!(tot>0))return tbFout('Vul het factuurtotaal in.');if(vv&&vv<fd)return tbFout('De vervaldatum ligt voor de factuurdatum.');
    if(incAan&&!(incK>=0))return tbFout('Vul de incassokosten in.');
    const dub=tbDubbel(nr,lev,tot,v);
    if(dub&&tbStap!=='dubok'){tbDubToon(dub);return}tbStap=null;
    const id=x?v:urenId(),y=x||(f[id]={id,bet:{},t:Date.now()});
    Object.assign(y,{lev:lev.slice(0,60),nr:nr.slice(0,40),fdat:fd,verval:vv||null,plan:tbVal('tbPlan')||null,tot,not:tbVal('tbNot').slice(0,200)});
    if(!x&&tbScanKlaar&&(tbScanPdf||tbScanBijl)){S.tbBijl[id]=tbScanPdf||tbScanBijl}tbScanBijl=null;tbScanPdf=null;tbScanKlaar=false;if(!x&&tbInActief){S.tbIn[tbInActief]=null;tbInActief=null}
    if(incAan)y.inc={bureau:tbVal('tbIncB').slice(0,60),kosten:incK,t:y.inc?.t||Date.now()};else y.inc=null;
    if(y.betaald&&tbRest(y)>0)y.betaald=null;else if(!y.betaald&&Object.keys(y.bet).length&&tbRest(y)===0)y.betaald=Object.values(y.bet).map(p=>p.d).sort().pop();
    bewaar();sluit();render();toast(x?'Opgeslagen':'Factuur toegevoegd');return}
  case'weg':if(!x)return;if(tbStap!=='weg:'+v){tbStap='weg:'+v;el.textContent='Zeker? Tik nogmaals';return}tbStap=null;delete f[v];if(S.tbBijl[v])S.tbBijl[v]=null;bewaar();sluit();render();toast('Verwijderd');return;
  case'betaald':if(x)tbBetaalSheet(x,true);return;
  case'deel':if(x)tbBetaalSheet(x,false);setTimeout(()=>document.getElementById('tbBb')?.focus(),250);return;
  case'betaaldok':{if(!x)return;const d=tbVal('tbBd');if(!d)return tbFout('Kies de datum.');tbBoekVol(x,d);bewaar();sluit();render();bevestig(`✓ Betaald · ${x.lev}`);return}
  case'deelok':{if(!x)return;const d=tbVal('tbBd'),b=fCent(leesBedrag(tbVal('tbBb'))),rest=tbRest(x);if(!(b>0))return tbFout('Vul het bedrag in.');if(b>rest)return tbFout(`Dat is meer dan het openstaande bedrag (${fEuro(rest)}).`);if(!d)return tbFout('Kies de datum.');
    x.bet[urenId()]={b,d};if(tbRest(x)===0)x.betaald=d;bewaar();sluit();render();bevestig(tbRest(x)===0?`✓ Helemaal betaald · ${x.lev}`:`✓ ${fEuro(b)} geboekt · nog open ${fEuro(tbRest(x))}`);return}
  case'betweg':{const[fid,pid]=v.split('|'),y=f[fid];if(!y||!y.bet[pid])return;delete y.bet[pid];if(y.betaald&&tbRest(y)>0)y.betaald=null;bewaar();tbFormulier(y);render();return}
  case'incasso':if(x)tbIncSheet(x);return;
  case'incok':{if(!x)return;const k=fCent(leesBedrag(tbVal('tbIncK')));if(!tbVal('tbIncK'))return tbFout('Vul de incassokosten in (0 mag).');x.inc={bureau:tbVal('tbIncB').slice(0,60),kosten:k,t:Date.now()};bewaar();sluit();render();toast('Bij incasso gezet');return}
  case'terug':{if(!x)return;if(tbStap!=='terug:'+v){tbStap='terug:'+v;render();setTimeout(()=>{if(tbStap==='terug:'+v){tbStap=null;render()}},5000);return}tbStap=null;
    for(const[pid,p]of Object.entries(x.bet))if(p.vol)delete x.bet[pid];x.betaald=null;bewaar();render();toast('Teruggezet naar Open');return}
  case'excel':tbExcel();return;
  case'dubweg':{if(tbInActief){S.tbIn[tbInActief]=null;tbInActief=null;bewaar()}tbScanBijl=null;tbScanKlaar=false;tbStap=null;sluit();render();toast('Niet toegevoegd');return}
  case'dubok':{tbStap='dubok';const d=document.getElementById('tbDubVak');if(d)d.innerHTML='';toast('Tik op Bewaren om toch toe te voegen');return}
  case'scan':tbInActief=null;tbKiesBestand(f2=>tbScan(f2));return;
  case'inverwerk':{const d=S.tbIn?.[v];if(!d)return;tbInActief=v;try{tbScan(tbDataFile(d,'factuur-'+v))}catch(z){toast('Dit bestand lukte niet')}return}
  case'inweg':{if(tbStap!=='inweg:'+v){tbStap='inweg:'+v;render();setTimeout(()=>{if(tbStap==='inweg:'+v){tbStap=null;render()}},5000);return}tbStap=null;S.tbIn[v]=null;bewaar();render();toast('Weggegooid');return}
  case'inzien':tbToonBijl(S.tbIn?.[v]);return;
  case'opdracht':{const ub=tbSchrijf()&&S.betalen;if(!isObj(ub.inst))ub.inst={};if(!ub.inst.code){ub.inst.code=tbNieuweCode();bewaar()}tbOpdrachtSheet();return}
  case'nieuwecode':{if(tbStap!=='code'){tbStap='code';el.textContent='Zeker? De oude opdracht werkt dan niet meer';return}tbStap=null;S.betalen.inst.code=tbNieuweCode();bewaar();tbOpdrachtSheet();toast('Nieuwe code gemaakt: pas hem aan in de opdracht');return}
  case'kopieer':{const t=el.dataset.k==='url'?TB_IN_URL:el.dataset.k==='key'?SUPA_KEY:S.betalen?.inst?.code||'';try{navigator.clipboard.writeText(t).then(()=>toast('Gekopieerd'),()=>prompt('Kopieer:',t))}catch(z){prompt('Kopieer:',t)}return}
  case'intest':{toast('Verbinding testen…');fetch(TB_IN_URL,{method:'POST',headers:{'x-code':S.betalen.inst.code,'x-test':'1','apikey':SUPA_KEY}}).then(r=>r.text().catch(()=>'').then(t=>{let j={};try{j=JSON.parse(t)}catch(z){}
    toast(r.ok?'✓ Verbinding werkt':r.status===404?'✗ De functie factuur-in is niet gevonden in Supabase (naam of Deploy controleren)':/onbekende code/.test(t)?'✗ Code nog niet op de server: wacht even en probeer opnieuw':'✗ '+(j.fout||j.message||t||('fout '+r.status)).slice(0,120))})).catch(()=>toast('✗ Geen verbinding met Supabase'));return}
  case'logo':{fetch('icon-512.png').then(r=>r.blob()).then(b=>deelBestand(new File([b],'brood-opzet-logo.png',{type:'image/png'}))).catch(()=>toast('Logo laden lukte niet'));return}
  case'bijlkoppel':{const fid=v;tbKiesBestand(async f2=>{try{toast('Bijlage verwerken…');const c=await tbCanvas(f2);S.tbBijl[fid]=c.pdf||tbVerklein(c.canvas);bewaar();const y=tbSchrijf()[fid];if(y)tbFormulier(y);toast('Bijlage bewaard')}catch(z){toast('Dit bestand lukte niet')}});return}
  case'bijlzien':tbToonBijl(S.tbBijl?.[v]);return;
  case'scanzien':tbToonBijl(tbScanPdf||tbScanBijl);return;
  case'tbpush':return;
  case'fst':tbF.st=v;render();return;
  case'fwis':tbF={st:'alle',lev:'',van:'',tot:''};tbZoek='';render();return;
  case'inlezen':{const i=document.createElement('input');i.type='file';i.accept='.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';i.onchange=()=>{if(i.files[0])tbLeesExcel(i.files[0]).catch(z=>meldFout(z,'Excel inlezen'))};i.click();return}
  case'importok':{if(!tbImport)return;const n=tbImportDoe();bewaar();sluit();tbTab='open';render();bevestig(`✓ ${n} facturen ingelezen`);return}
  case'logsoort':{const vak=document.getElementById('tbLogNieuw');if(!vak)return;vak.style.display='';document.getElementById('tbLogS').value=v;document.getElementById('tbLogLabel').textContent=(TB_SOORT[v]||'Notitie')+' op';const t=document.getElementById('tbLogT');t.placeholder=v==='notitie'?'Wat wil je noteren?':'Optioneel: bijv. per mail, 2e keer';t.focus();return}
  case'logok':{if(!x)return;const s=tbVal('tbLogS')||'notitie',t=tbVal('tbLogT').slice(0,200),d=tbVal('tbLogD')||iso();if(s==='notitie'&&!t){document.getElementById('tbLogT').focus();return}
    if(!isObj(x.log))x.log={};x.log[urenId()]={s,t,d,ts:Date.now()};bewaar();const vak=document.getElementById('tbLogVak');if(vak)vak.innerHTML=tbLogHtml(x);render();toast('Notitie toegevoegd');return}
  case'logweg':{const[fid,nid]=v.split('|'),y=f[fid];if(!y||!isObj(y.log)||!y.log[nid])return;delete y.log[nid];bewaar();const vak=document.getElementById('tbLogVak');if(vak)vak.innerHTML=tbLogHtml(y);render();return}
  }}catch(z){meldFout(z,'Te betalen')}});
document.addEventListener('change',e=>{const id=e.target.id;if(!['tbSortSel','tbLevSel','tbFvan','tbFtot'].includes(id)||!betalenMag())return;
  if(id==='tbSortSel'){const u=L.sessie;S.profielen[u]={...(S.profielen[u]||{}),tbSort:e.target.value};bewaar()}else if(id==='tbLevSel')tbF.lev=e.target.value;else if(id==='tbFvan')tbF.van=e.target.value;else tbF.tot=e.target.value;render()});
document.addEventListener('change',e=>{if(!['tbPushAan','tbPushVoor'].includes(e.target.id)||!betalenMag())return;const ub=tbSchrijf()&&S.betalen;if(!isObj(ub.inst))ub.inst={};
  if(e.target.id==='tbPushAan')ub.inst.push=e.target.checked;else ub.inst.voor=+e.target.value;bewaar();render()});
document.addEventListener('input',e=>{if(e.target.id==='tbZoek'){tbZoek=e.target.value;const l=document.getElementById('tbLijst');if(l)l.innerHTML=tbLijstHtml()}});
document.addEventListener('change',e=>{if(e.target.id==='tbIncAan'){const v=document.getElementById('tbIncVeld');if(v)v.style.display=e.target.checked?'':'none'}
  if(e.target.id==='tbFd'){const vv=document.getElementById('tbVv');if(vv&&vv.dataset.auto&&e.target.value)vv.value=plusDagen(e.target.value,30)}
  if(e.target.id==='tbVv')e.target.dataset.auto=''});
(function(){const st=document.createElement('style');st.textContent=`.tbrij{display:flex;gap:10px;align-items:flex-start;margin:0 16px 8px;padding:12px;background:var(--kaart);border:1px solid var(--lijn);border-radius:12px}
.tbrij.laat{border-left:4px solid var(--oranje)}.tbrij.inc{border-left:4px solid var(--rood)}
.tbinfo{flex:1;min-width:0;background:none;border:0;padding:0;text-align:left;color:inherit;font:inherit}.tbinfo .naam{font-size:17px}.tbnr{font-weight:400;color:var(--grijs);font-size:15px}
.tbrechts{display:flex;flex-direction:column;align-items:flex-end;gap:6px}.tbbedrag{font-weight:800;font-size:17px;font-variant-numeric:tabular-nums;white-space:nowrap}
.tbknoppen{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.tbinc{color:var(--rood);font-weight:700}
.tbgroep{margin:0 0 10px}.tbgroepkop{display:flex;justify-content:space-between;align-items:center;margin:12px 18px 6px;font-size:16px}.tbgroepkop.laat b{color:var(--oranje)}
.tbbijl{margin-top:12px}.tbbijl img{max-width:100%;max-height:240px;border:1px solid var(--lijn);border-radius:8px}
#tbBijlOv{display:none;position:fixed;inset:0;z-index:30;background:rgba(0,0,0,.9);flex-direction:column}#tbBijlOv.open{display:flex}.tbbijlbalk{display:flex;justify-content:space-between;align-items:center;padding:calc(env(safe-area-inset-top,0px) + 10px) 16px 10px;color:#fff}.tbbijlvak{flex:1;overflow:auto;-webkit-overflow-scrolling:touch}.tbbijlvak img{width:100%;display:block;cursor:zoom-in}.tbbijlvak img.zoom{width:230%;max-width:none;cursor:zoom-out}.tbpag{background:#fff;margin:0 0 8px;width:100%}.tbpag canvas{width:100%;display:block}#tbPdfVak.zoom .tbpag{width:230%}.tbbijlhulp{font-size:13px;opacity:.7}.tbbijl img{cursor:zoom-in}
.tbinbox{border:2px solid var(--oranje)}.tbopdracht ol{padding-left:20px;line-height:1.5}.tbopdracht li{margin-bottom:10px}.tbopdracht ul{padding-left:18px;margin-top:6px}.tbopdracht li .knop{margin:4px 0}.tbopdracht code{background:var(--achter);padding:1px 5px;border-radius:5px;word-break:break-all}
.tbdub{border:2px solid var(--oranje);margin:0 0 12px}
.veld[type=date],.veld[type=time]{-webkit-appearance:none;appearance:none;min-width:0;max-width:100%;width:100%;box-sizing:border-box;min-height:50px;display:block}.veld[type=date]::-webkit-date-and-time-value,.veld[type=time]::-webkit-date-and-time-value{text-align:left}
.tbchips{display:flex;flex-wrap:wrap;gap:6px;margin:4px 16px 8px}.tbchip{border:1px solid var(--lijn);background:var(--kaart);color:var(--tekst);border-radius:16px;padding:6px 12px;font-size:15px}.tbchip.aan{background:var(--oranje);border-color:var(--oranje);color:#fff;font-weight:700}
.tbfilters{margin:0 16px 8px}.tbfilters .minmax{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tbfilters .minmax>div{min-width:0}.minmax>div{min-width:0}.minmax input[type=date],.minmax input[type=time],#paneel input[type=date]{min-width:0;max-width:100%;box-sizing:border-box;display:block}.tbfilters label{display:block;font-size:14px;color:var(--grijs);margin-top:6px}.tbfilters select{width:100%}
.tbfilterinfo{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 16px 8px;font-size:15px}
.tbsnel{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.tblaatst{font-style:italic}
.tbtotaal .tbgroot{font-size:30px;font-weight:900;font-variant-numeric:tabular-nums}.groentekst{color:var(--groen)}
@media(max-width:420px){.tbrij{flex-wrap:wrap}.tbrechts{width:100%;flex-direction:row;justify-content:space-between;align-items:center}}`;document.head.appendChild(st)})();


