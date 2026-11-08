/* ================= 10.7 bestelboeken (uit het bestelboek van de leverancier) ================= */
const PDF_LIB='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
function vulBestelboeken(b){b=isObj(b)?b:{};if(!isObj(b.boeken))b.boeken={};for(const[id,x]of Object.entries(b.boeken)){if(!isObj(x)){delete b.boeken[id];continue}if(!isObj(x.arts))x.arts={};if(!x.id)x.id=id;if(!x.naam)x.naam='Boek'}if(!isObj(b.eigen))b.eigen={};for(const[k,e]of Object.entries(b.eigen)){if(!isObj(e)||!/^\d{5,7}$/.test(k)){delete b.eigen[k];continue}e.art=k;if(typeof e.naam!=='string')e.naam=''}if(!isObj(b.bekend))b.bekend={};if(!isObj(b.nieuw))b.nieuw={};if(!isObj(b.san))b.san={};for(const[k,x]of Object.entries(b.san))if(!isObj(x))delete b.san[k];if(!isObj(b.terug))b.terug={};if(!isObj(b.editie))b.editie={};return b}
let BB=null,bbZoek='',bbFilter='alle',bbOpen={},bbBoek=null,bbBezig='';
const bbMag=()=>mag('bestelboek');
async function laadPdfjs(){const lok=await ocrLokaal();await laadScript(lok?'ocr/pdf.min.js':PDF_JS,()=>window.pdfjsLib);pdfjsLib.GlobalWorkerOptions.workerSrc=window.__PDF_WORKER__||(lok?new URL('ocr/pdf.worker.min.js',location.href).href:PDF_WORKER)}
async function bbLaad(){if(BB)return BB;await opslagKlaar;const x=idbBekend.get('x:bestelboek');if(x&&x.rijen)BB=x;return BB}
/* horizontale lijnen van een pagina (scheiding tussen de regels) */
function bbLijnen(ops){const O=pdfjsLib.OPS,ys=[];let m=[1,0,0,1,0,0];const st=[];
  const mul=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]],tp=(x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
  for(let i=0;i<ops.fnArray.length;i++){const f=ops.fnArray[i],a=ops.argsArray[i];
    if(f===O.save)st.push(m);else if(f===O.restore)m=st.pop()||m;else if(f===O.transform)m=mul(m,a);
    else if(f===O.constructPath){const[os,co]=a;let k=0,cur=null;for(const o of os){
      if(o===O.rectangle){const[x,y,w,h]=co.slice(k,k+4);k+=4;const p=tp(x,y),q=tp(x+w,y+h);if(Math.abs(q[0]-p[0])>300&&Math.abs(q[1]-p[1])<2)ys.push((p[1]+q[1])/2)}
      else if(o===O.moveTo){cur=tp(co[k],co[k+1]);k+=2}else if(o===O.lineTo){const q=tp(co[k],co[k+1]);k+=2;if(cur&&Math.abs(q[0]-cur[0])>300&&Math.abs(q[1]-cur[1])<1)ys.push((q[1]+cur[1])/2);cur=q}
      else if(o===O.curveTo)k+=6;else if(o===O.curveTo2||o===O.curveTo3)k+=4;else if(o===O.closePath){}}}}
  const u=[];for(const y of ys.sort((a,b)=>b-a))if(!u.length||u[u.length-1]-y>2)u.push(Math.round(y*100)/100);return u}
async function bbLees(file,meld){await laadPdfjs();const buf=await file.arrayBuffer(),pdf=await pdfjsLib.getDocument({data:new Uint8Array(buf.slice(0))}).promise,rijen=[];let kop=null,groep='';
  for(let p=1;p<=pdf.numPages;p++){meld(`Bestelboek lezen: pagina ${p} van ${pdf.numPages}`);const pg=await pdf.getPage(p),[tc,ops]=await Promise.all([pg.getTextContent(),pg.getOperatorList()]);
    const it=tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({s:i.str.trim(),x:i.transform[4],y:i.transform[5],h:Math.abs(i.transform[0])})),ys=bbLijnen(ops);
    for(let i=0;i<ys.length-1;i++){const top=ys[i],bot=ys[i+1];if(top-bot<8)continue;const b=it.filter(t=>t.y<top&&t.y>bot);if(!b.length)continue;
      if(b.some(t=>t.s==='Artikel'||t.s==='Artikelomschrijving')){if(!kop)kop={p:p-1,top,bot};continue}
      const g=b.filter(t=>t.h>10);if(g.length){groep=g.sort((a,c)=>a.x-c.x).map(t=>t.s).join(' ');rijen.push({t:'g',p:p-1,top,bot,naam:groep});continue}
      const a=b.find(t=>t.x<30&&/^\d{5,7}$/.test(t.s));if(!a)continue;
      const zelfde=t=>Math.abs(t.y-a.y)<1.5,onder=b.filter(t=>t.y<a.y-1.5);
      const naam=b.filter(t=>zelfde(t)&&t.x>40&&t.x<330).sort((x,y)=>x.x-y.x).map(t=>t.s).join(' ').replace(/\s+/g,' ');
      const bst=b.find(t=>zelfde(t)&&t.x>330&&t.x<380&&/^\d+$/.test(t.s));const prijs=onder.filter(t=>t.x>120&&t.x<330&&/^\d+[.,]\d+$/.test(t.s)).sort((x,y)=>x.x-y.x);
      rijen.push({t:'a',p:p-1,top,bot,art:a.s,naam,groep,eh:(onder.find(t=>t.x<30)||{}).s||'',bst:bst?bst.s:'',cons:prijs[0]?.s||'',ink:prijs[1]?.s||''})}}
  pdf.destroy();if(!kop||!rijen.some(r=>r.t==='a'))throw new Error('Dit lijkt geen bestelboek van de leverancier te zijn.');
  return{kop,rijen,pdf:buf,paginas:rijen.length?Math.max(...rijen.map(r=>r.p))+1:0}}
function bbEditieNaam(n){const m=/w(?:ee)?k[\s_-]*(\d{1,2})/i.exec(n||'');return m?'week '+(+m[1]):(n||'bestelboek').replace(/\.pdf$/i,'')}
async function bbInlezen(file){if(!bbMag())return;bbBezig='Bestelboek openen…';render();
  try{const vorig=BB||await bbLaad().catch(()=>null);const r=await bbLees(file,t=>{bbBezig=t;const el=document.getElementById('bbStatus');if(el)el.textContent=t});
    const naam=bbEditieNaam(file.name),arts=r.rijen.filter(x=>x.t==='a').map(x=>x.art),B=S.bestelboeken;
    BB={naam,t:Date.now(),kop:r.kop,rijen:r.rijen,pdf:r.pdf};idbZet('x:bestelboek',BB);idbSchrijf();
    if(B.editie.naam!==naam){const oud=B.bekend,eerste=!Object.keys(oud).length;B.nieuw={};if(!eerste)for(const a of arts)if(!oud[a])B.nieuw[a]=1;
      if(!eerste)bbSaneer(Object.keys(oud).filter(a=>!new Set(arts).has(a)),vorig&&vorig.naam!==naam?vorig:null,B.editie.naam||'',naam,new Set(arts));
      B.bekend={};for(const a of arts)B.bekend[a]=1;B.editie={naam,t:Date.now(),n:arts.length}}
    log(`Bestelboek ${naam} ingelezen (${arts.length} artikelen)`);bewaar();bbBezig='';toast(`✓ ${naam}: ${arts.length} artikelen ingelezen`)}
  catch(e){console.warn(e);bbBezig='';toast(e.message&&/bestelboek/.test(e.message)?e.message:'Inlezen lukte niet. Controleer je internet en probeer opnieuw.')}
  render()}
/* 10.10.1 gesaneerde artikelen */
const BB_SAN_SEED={'367370':{naam:'Uit ass. Duca Filodeeg 15x225gr',groep:'Deegwaren',eh:'DS',bst:'0',cons:'2.29',ink:'1.384'},'933605':{naam:'Vivera zalm filet 2x100gr',groep:'Vegetarische vleesvervangers',eh:'ST',bst:'4911',cons:'4.15',ink:'2.865'}};
function bbInBoeken(a){return Object.values(S.bestelboeken.boeken).filter(b=>b.arts&&b.arts[a]).map(b=>b.naam)}
function bbSaneer(weg,vorig,laatst,sinds,nuSet){const B=S.bestelboeken;
  for(const a of Object.keys(B.san))if(nuSet.has(a)){B.terug[a]=1;delete B.san[a]}
  for(const a of Object.keys(B.terug))if(!nuSet.has(a))delete B.terug[a];
  const rij=a=>vorig?.rijen?.find(r=>r.t==='a'&&r.art===a);
  for(const a of weg){if(B.san[a])continue;const r=rij(a)||{};B.san[a]={art:a,naam:r.naam||'',groep:r.groep||'',eh:r.eh||'',bst:r.bst||'',cons:r.cons||'',ink:r.ink||'',laatst:laatst||vorig?.naam||'',sinds,boeken:bbInBoeken(a),t:Date.now()}}}
function bbSanSeed(){const B=S.bestelboeken;if(B.sanSeed||!BB)return;const nu=new Set(BB.rijen.filter(r=>r.t==='a').map(r=>r.art));let n=0;
  const wk41=Object.values(S.log||{}).some(l=>/^Bestelboek week 41 ingelezen/.test(l?.tekst||''));
  for(const[a,x]of Object.entries(BB_SAN_SEED)){if(nu.has(a)||B.san[a])continue;if(!wk41&&!bbInBoeken(a).length&&!B.bekend[a])continue;B.san[a]={art:a,...x,laatst:'week 41',sinds:BB.naam,boeken:bbInBoeken(a),t:Date.now()};n++}
  if(n){B.sanSeed=1;bewaar()}}
const bbUitAss=()=>bbArtikelen().filter(r=>!r.eigen&&/^\s*uit\s*ass/i.test(r.naam));
function bbSanRij(x,gelezen){const prijs=[x.cons?'cons. € '+x.cons.replace('.',','):'',x.ink?'ink. € '+x.ink.replace('.',','):''].filter(Boolean).join(' · ');const nu=bbInBoeken(x.art);
  return`<div class="rij inv" style="flex-wrap:wrap"><div class="groei" style="min-width:60%"><div class="naam" style="${gelezen?'font-weight:500':''}">${esc(x.naam||'(naam niet bekend)')}</div>
   <div class="sub">${x.art}${x.eh?' · '+esc(x.eh):''}${x.bst?' · bst.nr. '+esc(x.bst):''}${prijs?' · '+prijs:''}</div>
   <div class="sub">${x.groep?esc(x.groep)+' · ':''}${x.laatst?'laatst in '+esc(x.laatst):''}${x.sinds?' · weg sinds '+esc(x.sinds):''}</div>
   ${nu.length?`<div class="sub oranjetekst">Staat nog in: ${esc(nu.join(', '))}</div>`:(x.boeken||[]).length?`<div class="sub">Stond in: ${esc(x.boeken.join(', '))}</div>`:''}</div>
   <div class="knoppen" style="padding:6px 0 0;gap:6px">${nu.length?`<button class="knop rand klein" data-a="bbsanuit" data-v="${x.art}">Uit mijn boeken</button>`:''}${gelezen?`<button class="knop rand klein" data-a="bbsanterug" data-v="${x.art}">Toch niet gelezen</button>`:`<button class="knop klein" data-a="bbsangelezen" data-v="${x.art}">✓ Gelezen</button>`}</div></div>`}
let bbSanOpen=false;
function bbSanHtml(){const B=S.bestelboeken;if(!BB)bbLaad().then(x=>{if(x&&sub==='bbsan')render()});bbSanSeed();
  const l=Object.values(B.san).sort((a,c)=>(bbInBoeken(c.art).length>0)-(bbInBoeken(a.art).length>0)||(c.t||0)-(a.t||0)||String(a.naam).localeCompare(c.naam,'nl'));
  const open=l.filter(x=>!x.gelezen),gel=l.filter(x=>x.gelezen),ua=BB?bbUitAss().sort((a,c)=>bbInBoeken(c.art).length-bbInBoeken(a.art).length):[];
  return`<div class="kop"><div class="koprij"><h1>Gesaneerd</h1></div><p>Artikelen die uit het bestelboek van de leverancier zijn verdwenen, met hun laatste gegevens.</p></div>
   <div class="sectie"><div class="karkop rijflex"><b style="flex:1">Nieuw gesaneerd (${open.length})</b>${open.length>1?`<button class="knop rand klein" style="margin:4px 0" data-a="bbsanalles">Alles gelezen</button>`:''}</div>${open.map(x=>bbSanRij(x,false)).join('')||'<p class="leeg">Niets nieuws. 👌</p>'}</div>
   ${ua.length?`<div class="sectie"><div class="karkop"><b>Gaat uit assortiment (${ua.length})</b></div><p class="hulp" style="margin:8px 14px">Staan nog in ${esc(BB.naam)}, maar de leverancier zet er “Uit ass.” voor.</p>${ua.map(r=>{const nu=bbInBoeken(r.art);return`<div class="rij inv"><div class="groei"><div class="naam">${esc(r.naam)}</div><div class="sub">${r.art} · ${esc(r.eh)} · bst.nr. ${esc(r.bst||'–')}${r.cons?' · € '+esc(r.cons.replace('.',',')):''} · ${esc(r.groep)}</div>${nu.length?`<div class="sub oranjetekst">In: ${esc(nu.join(', '))}</div>`:''}</div></div>`}).join('')}</div>`:''}
   ${gel.length?`<div class="sectie menu meergroep ${bbSanOpen?'open':''}"><button class="groepkop" data-a="bbsanopen" style="width:100%"><b>Gelezen</b><span class="bbtel">${gel.length} ${bbSanOpen?'▴':'▾'}</span></button>${bbSanOpen?`<div class="meerinhoud">${gel.map(x=>bbSanRij(x,true)).join('')}</div>`:''}</div>`:''}`}
/* 10.8 eigen artikelen */
function bbEigenLijst(){return Object.values(S.bestelboeken.eigen||{}).filter(isObj)}
function bbEigenInBoek(){if(!BB)return[];const a=new Set(BB.rijen.filter(r=>r.t==='a').map(r=>r.art));return bbEigenLijst().filter(e=>a.has(e.art))}
function bbRijen(){if(!BB)return[];const inBoek=new Set(),laatste={};BB.rijen.forEach((r,i)=>{if(r.t==='a'){inBoek.add(r.art);laatste[r.groep]=i}});
  const tA=BB.rijen.find(r=>r.t==='a'),tG=BB.rijen.find(r=>r.t==='g'),eig={},los=[];
  for(const e of bbEigenLijst()){if(inBoek.has(e.art)||!tA)continue;const rij={t:'a',eigen:1,art:e.art,naam:e.naam,eh:e.eh||'',bst:e.bst||'',cons:e.cons||'',ink:e.ink||'',p:tA.p,top:tA.top,bot:tA.bot};
    if(e.groep&&laatste[e.groep]!==undefined){rij.groep=e.groep;(eig[e.groep]=eig[e.groep]||[]).push(rij)}else{rij.groep='Eigen artikelen';los.push(rij)}}
  if(!Object.keys(eig).length&&!los.length)return BB.rijen;
  const srt=a=>a.sort((x,y)=>x.naam.localeCompare(y.naam,'nl')),uit=[];
  BB.rijen.forEach((r,i)=>{uit.push(r);if(r.t==='a'&&laatste[r.groep]===i&&eig[r.groep])uit.push(...srt(eig[r.groep]))});
  if(los.length){if(tG)uit.push({t:'g',eigen:1,naam:'Eigen artikelen',p:tG.p,top:tG.top,bot:tG.bot});uit.push(...srt(los))}
  return uit}
function bbArtikelen(){return bbRijen().filter(r=>r.t==='a')}
/* barcode zoals de leverancier: MSI met twee controlecijfers (mod 10 + mod 10) */
function msiCode(a){const m10=x=>{let t=0;[...x].reverse().forEach((c,i)=>{const v=+c*(i%2?1:2);t+=Math.floor(v/10)+v%10});return String((10-t%10)%10)};const c=a+m10(a);return c+m10(c)}
function msiBalken(code){let s='1110';for(const d of code)for(const b of(+d).toString(2).padStart(4,'0'))s+=b==='1'?'1110':'1000';s+='10001';
  const r=[];for(let i=0;i<s.length;){if(s[i]==='1'){let j=i;while(s[j]==='1')j++;r.push([i,j-i]);i=j}else i++}return r}
const bbTxt=t=>String(t||'').replace(/[^\x20-\x7E -ÿ€]/g,'');
/* eigen regel tekenen over een lege kopie van een echte regel (zelfde lijnen en weekvakken) */
/* 10.8.2 printmarge: alles 13pt (4,6 mm) naar rechts en 14pt (5 mm) omlaag */
const BB_DX=13,BB_DY=14;
function bbEigenTeken(p0,r){const pen={rect:(x,...a)=>p0.rect(x+BB_DX,...a),text:(t,x,...a)=>p0.text(t,x+BB_DX,...a),breed:p0.breed,ster:(cx,...a)=>p0.ster(cx+BB_DX,...a)};const h=r.top-r.bot,W='#fff',Z='#000';
  if(r.t==='g'){pen.rect(8.6,0.8,370,h-1.6,W);pen.text(bbTxt(r.naam),27.8,16.5,11.98,1);return}
  pen.rect(8.6,0.8,370,h-1.6,W);pen.rect(380.1,0.8,15.8,h-1.6,W);
  const naam=bbTxt(r.naam);pen.text(r.art,8.16,8.88,7.92,1);pen.text(naam,57.09,8.88,7.92,1);pen.ster(57.09+pen.breed(naam,7.92,1)+5.5,6.1,3.3);
  pen.text(bbTxt(r.eh),8.16,19.44,7.92,1);if(r.cons)pen.text(r.cons,196.6,19.44,7.92,0,1);if(r.ink)pen.text(r.ink,243.9,19.44,7.92,0,1);if(r.bst)pen.text(r.bst,369.2,8.88,7.92,1,1);
  const mw=99.854/157;for(const[i,n]of msiBalken(msiCode(r.art)))pen.rect(246.72+(10+i)*mw,2.88,n*mw,17.28,Z)}
function bbSterPunten(cx,cy,R){const p=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?R*.45:R;p.push([cx+rr*Math.cos(a),cy+rr*Math.sin(a)])}return p}
function bestelboekenHtml(){const B=S.bestelboeken,boeken=Object.values(B.boeken).sort((a,b)=>a.naam.localeCompare(b.naam,'nl')),nNieuw=Object.keys(B.nieuw).length;
  if(!BB)bbLaad().then(x=>{if(x&&sub==='bestelboeken')render()});
  const arts=new Set(bbArtikelen().map(r=>r.art));
  return`<div class="kop"><div class="koprij"><h1>Bestelboeken</h1></div><p>Je eigen bestelboeken, gemaakt uit het bestelboek van de leverancier</p></div>
   <div class="kaartje"><h3>📄 Bestelboek van de leverancier</h3>${bbBezig?`<div class="sub" id="bbStatus">${esc(bbBezig)}</div>`:BB?`<div class="sub"><b>${esc(BB.naam)}</b> · ${arts.size} artikelen · ingelezen ${esc(datumTekst(iso(new Date(BB.t))))}</div>`:'<div class="sub">Nog geen bestelboek op dit toestel. Lees het bestelboek van deze week in (pdf).</div>'}
    ${B.editie.naam&&BB&&B.editie.naam!==BB.naam?`<div class="sub oranjetekst" style="margin-top:6px">Op een ander toestel is al ${esc(B.editie.naam)} ingelezen. Lees die ook hier in.</div>`:''}
    <div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:10px"><label class="knop ${BB?'rand':''} klein">${BB?'Nieuw bestelboek inlezen':'Bestelboek inlezen'}<input type="file" accept="application/pdf,.pdf" id="bbIn" style="display:none" ${bbBezig?'disabled':''}></label></div></div>
   ${nNieuw&&BB?`<div class="kaartje"><h3>✨ ${nNieuw} nieuwe ${nNieuw===1?'artikel':'artikelen'} in ${esc(B.editie.naam)}</h3><div class="sub">Kijk of ze in een van je boeken moeten. Ze staan bij het kiezen bovenaan onder "Nieuw".</div></div>`:''}
   ${(()=>{const d=bbEigenInBoek();return d.length?`<div class="kaartje"><h3>★ ${d.length} ${d.length===1?'eigen artikel staat':'eigen artikelen staan'} nu in het bestelboek</h3><div class="sub">${d.map(e=>esc(e.naam||e.art)).join(', ')}. De app gebruikt nu de regel van de leverancier, je eigen versie is niet meer nodig.</div><div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:8px"><button class="knop rand klein" data-a="bbeigenopruim">Eigen versie verwijderen</button></div></div>`:''})()}
   ${(()=>{bbSanSeed();const o=Object.values(B.san).filter(x=>!x.gelezen).length,t=Object.keys(B.san).length,ua=BB?bbUitAss().length:0;return t||ua?`<div class="kaartje"><h3>🗑 Gesaneerd${o?` <span class="telbol">${o}</span>`:''}</h3><div class="sub">${o?`${o} ${o===1?'artikel is':'artikelen zijn'} uit het bestelboek verdwenen.`:'Alles gelezen.'}${ua?` ${ua} ${ua===1?'artikel gaat':'artikelen gaan'} uit assortiment.`:''}</div><div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:8px"><button class="knop rand klein" data-a="sub" data-v="bbsan">Bekijken</button></div></div>`:''})()}
   <div class="sectie">${boeken.map(b=>{const n=Object.keys(b.arts).length,weg=BB?Object.keys(b.arts).filter(a=>!arts.has(a)).length:0;
     return`<div class="rij inv"><div class="groei"><div class="naam">📘 ${esc(b.naam)}</div><div class="sub">${n} ${n===1?'artikel':'artikelen'}${weg?` · <span class="oranjetekst">${weg} niet meer leverbaar</span>`:''}</div></div>
      <button class="knop rand klein" data-a="bbkies" data-v="${b.id}">Kiezen</button><button class="knop klein" data-a="bbpdf" data-v="${b.id}" ${BB&&n?'':'disabled'}>PDF</button></div>`}).join('')||'<p class="leeg">Nog geen boeken. Maak bijvoorbeeld een boek voor Brood, AGF of Vers.</p>'}
    <button class="toevoegen" data-a="bbnieuw">+ Nieuw boek</button></div>`}
/* kiezen per boek */
function bbLijstHtml(b){const alle=bbArtikelen(),nieuw=S.bestelboeken.nieuw,z=bbZoek.trim().toLowerCase();
  const zicht=alle.filter(r=>(bbFilter!=='eigen'||r.eigen)&&(bbFilter!=='gekozen'||b.arts[r.art])&&(bbFilter!=='nieuw'||nieuw[r.art])&&(!z||r.naam.toLowerCase().includes(z)||r.art.includes(z)||r.bst===z));
  const groepen=[],idx={};for(const r of zicht){let g=idx[r.groep];if(!g){g=idx[r.groep]={naam:r.groep,r:[]};groepen.push(g)}g.r.push(r)}
  const open=!!z||bbFilter!=='alle';let n=0;
  return groepen.map(g=>{const k=g.r.filter(r=>b.arts[r.art]).length,isOpen=open||bbOpen[g.naam],toon=isOpen?g.r.filter(()=>n++<300):[];
    return`<div class="sectie menu meergroep ${isOpen?'open':''}" data-bbgroep="${esc(g.naam)}"><div class="rijflex"><button class="groepkop" data-a="bbgroep" data-v="${esc(g.naam)}" style="flex:1"><b>${esc(g.naam)}</b><span class="bbtel">${k}/${g.r.length} ${isOpen?'▴':'▾'}</span></button><button class="knop rand klein" style="margin:6px" data-a="bbgroepalles" data-v="${esc(g.naam)}">${k===g.r.length?'Niets':'Alles'}</button></div>
      ${isOpen?`<div class="meerinhoud">${toon.map(r=>`<div class="rij" ${r.eigen?'style="display:flex;align-items:center"':''}><button class="regel" data-a="bbvink" data-v="${r.art}"><span class="bbvink ${b.arts[r.art]?'aan':''}">${b.arts[r.art]?'✓':''}</span><div class="groei"><div class="naam">${r.eigen?'★ ':''}${esc(r.naam)}${nieuw[r.art]?` <span class="fstatus oranje">${S.bestelboeken.terug[r.art]?'terug':'nieuw'}</span>`:''}</div><div class="sub">${r.art} · bst.nr. ${esc(r.bst||'–')} · ${esc(r.eh)}${r.cons?' · € '+esc(r.cons.replace('.',',')):''}${r.eigen?' · eigen artikel':''}</div></div></button>${r.eigen?`<button class="knop rand klein" style="margin-right:12px" data-a="bbeigen" data-v="${r.art}">Wijzig</button>`:''}</div>`).join('')}</div>`:''}</div>`}).join('')||'<p class="leeg">Niets gevonden.</p>'}
function bbKiesHtml(){const b=S.bestelboeken.boeken[bbBoek];if(!b){sub='bestelboeken';return bestelboekenHtml()}
  const nieuw=S.bestelboeken.nieuw,arts=new Set(bbArtikelen().map(r=>r.art)),weg=BB?Object.keys(b.arts).filter(a=>!arts.has(a)):[],n=Object.keys(b.arts).length;
  return`<div class="kop"><div class="koprij"><h1>${esc(b.naam)}</h1></div><p id="bbAantal">${n} ${n===1?'artikel':'artikelen'} gekozen${BB?' · '+esc(BB.naam):''}</p></div>
   <div class="knoppen" style="justify-content:flex-start;padding-top:0;flex-wrap:wrap"><button class="knop rand klein" data-a="bbhernoem">Naam wijzigen</button><button class="knop rand klein rood" data-a="bbweg">${afwStap==='bbweg'?'Zeker? Tik nogmaals':'Boek verwijderen'}</button></div>
   ${!BB?'<p class="leeg">Lees eerst het bestelboek van de leverancier in.</p>':`
   <div class="zoekbalk"><input class="veld" id="bbZoek" type="search" placeholder="Zoek op naam, artikelnummer of bestelnummer" value="${esc(bbZoek)}" autocomplete="off"></div>
   <div class="chips" style="margin:0 16px 8px">${[['alle','Alles'],['gekozen','Gekozen'],['nieuw',`Nieuw (${Object.keys(nieuw).length})`],['eigen',`★ Eigen (${bbArtikelen().filter(r=>r.eigen).length})`]].map(([k,t])=>`<button class="chip ${bbFilter===k?'aan':''}" data-a="bbfilter" data-v="${k}">${t}</button>`).join('')}</div>
   ${weg.length?`<div class="kaartje waarschuw"><b>${weg.length} ${weg.length===1?'artikel staat':'artikelen staan'} niet meer in het bestelboek</b><div class="sub">${weg.map(a=>{const x=S.bestelboeken.san[a];return x&&x.naam?`${esc(x.naam)} (${a})`:esc(a)}).join(', ')}</div><div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:8px"><button class="knop rand klein" data-a="sub" data-v="bbsan">Bekijken</button><button class="knop rand klein" data-a="bbwegruim">Uit dit boek halen</button></div></div>`:''}
   <div class="knoppen" style="justify-content:flex-start;padding-top:0"><button class="knop rand klein" data-a="bbeigen" data-v="">★ Eigen artikel toevoegen</button></div>
   <div id="bbLijst">${bbLijstHtml(b)}</div>`}`}
function bbLijstVernieuw(){const b=S.bestelboeken.boeken[bbBoek],el=document.getElementById('bbLijst');if(b&&el)el.innerHTML=bbLijstHtml(b);bbAantalTonen()}
function bbAantalTonen(){const b=S.bestelboeken.boeken[bbBoek],el=document.getElementById('bbAantal');if(b&&el){const n=Object.keys(b.arts).length;el.textContent=`${n} ${n===1?'artikel':'artikelen'} gekozen${BB?' · '+BB.naam:''}`}}
document.addEventListener('input',e=>{if(e.target.id==='dervZoek'){dervZoek=e.target.value;const p=e.target.selectionStart;render();const n=document.getElementById('dervZoek');if(n){n.focus();try{n.setSelectionRange(p,p)}catch(x){}}return}
  if(e.target.id!=='keuzeZoek')return;keuzeZoek=e.target.value;if(bewerk?.soort==='dervextra')renderDervExtra();else if(bewerk?.soort==='extra')renderExtraSheet();else if(bewerk?.soort==='bijbak')renderBijSheet();else if(bewerk?.soort==='ontdooi'){const el=document.getElementById('ontChips');if(el)el.innerHTML=ontChipsHtml()}});
let bbZoekT=null,bbEigenArt=null,bbLaatsteGroep='';
function toonBbEigen(art){if(!BB)return;const e=art?S.bestelboeken.eigen[art]:null;bbEigenArt=e?art:null;
  const groepen=[...new Set(BB.rijen.filter(r=>r.t==='a').map(r=>r.groep))],gk=e?.groep&&groepen.includes(e.groep)?e.groep:groepen.includes(bbLaatsteGroep)?bbLaatsteGroep:groepen[0];
  const v=(id,l,w,x='')=>`<label>${l}</label><input class="veld" id="be_${id}" value="${esc(w??'')}" autocomplete="off" ${x}>`;
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>${e?'Eigen artikel':'Nieuw eigen artikel'}</b><button data-a="bbeigenbewaar" style="font-weight:700">Bewaren</button></div><div class="pinhoud">
   <p class="sub" style="margin:0 0 6px">Voor artikelen die je wel kunt bestellen maar die niet in het bestelboek staan. Ze komen met een ★ in de PDF, met barcode, onderaan de afdeling die je kiest.</p>
   ${v('art','Artikelnummer',e?.art,'inputmode="numeric" maxlength="7" placeholder="bijv. 979378"')}<div class="sub" id="beCode">${e?'Barcode: '+msiCode(e.art):''}</div>
   ${v('naam','Omschrijving',e?.naam,'maxlength="40" placeholder="bijv. Bosui 1st"')}
   <label>Afdeling in het boek</label><select class="veld" id="be_groep">${groepen.map(g=>`<option ${g===gk?'selected':''}>${esc(g)}</option>`).join('')}</select>
   ${v('eh','Besteleenheid (bst.eh.)',e?.eh||'ST','maxlength="4" style="width:90px;text-transform:uppercase"')}
   ${v('bst','Bestelnummer (bst.nr.)',e?.bst,'inputmode="numeric" maxlength="6" style="width:120px" placeholder="optioneel"')}
   ${v('cons','Consumentenprijs',e?.cons?.replace('.',','),'inputmode="decimal" style="width:120px" placeholder="optioneel"')}
   ${v('ink','Inkoopprijs',e?.ink?.replace('.',','),'inputmode="decimal" style="width:120px" placeholder="optioneel"')}
   <div class="fout" id="fout"></div>
   ${e?`<div class="knoppen" style="justify-content:flex-start;padding:12px 0 0"><button class="knop rand rood" data-a="bbeigenweg">${afwStap==='bbeigenweg'?'Zeker? Tik nogmaals':'Eigen artikel verwijderen'}</button></div>`:''}</div>`)}
function bbEigenBewaar(){const B=S.bestelboeken,g=id=>(document.getElementById('be_'+id)?.value||'').trim(),fout=t=>{document.getElementById('fout').textContent=t};
  const art=g('art').replace(/\s/g,''),naam=bbTxt(g('naam')).slice(0,40),eh=bbTxt(g('eh')).toUpperCase().slice(0,4)||'ST',bst=g('bst').replace(/\s/g,''),groep=g('groep');
  if(!/^\d{5,7}$/.test(art))return fout('Het artikelnummer is 5 tot 7 cijfers.');
  const inBoek=BB.rijen.find(r=>r.t==='a'&&r.art===art);if(inBoek)return fout(`Dit artikel staat al in het bestelboek: ${inBoek.naam}. Zoek het op en vink het aan.`);
  if(art!==bbEigenArt&&B.eigen[art])return fout('Dit artikelnummer heb je al als eigen artikel.');
  if(!naam)return fout('Vul een omschrijving in.');if(bst&&!/^\d{1,6}$/.test(bst))return fout('Het bestelnummer bestaat alleen uit cijfers.');
  const prijs=(t,d)=>{if(!t)return'';const n=parseFloat(t.replace(/[€\s]/g,'').replace(',','.'));return isFinite(n)&&n>=0?n.toFixed(d):null},cons=prijs(g('cons'),2),ink=prijs(g('ink'),3);
  if(cons===null||ink===null)return fout('Een prijs klopt niet. Gebruik bijvoorbeeld 1,49.');
  if(bbEigenArt&&art!==bbEigenArt){delete B.eigen[bbEigenArt];for(const bk of Object.values(B.boeken))if(bk.arts[bbEigenArt]){delete bk.arts[bbEigenArt];bk.arts[art]=1}}
  const nieuw=!bbEigenArt;B.eigen[art]={art,naam,eh,bst,cons,ink,groep,t:Date.now()};bbLaatsteGroep=groep;
  const bk=B.boeken[bbBoek];if(nieuw&&bk&&sub==='bbkies')bk.arts[art]=1;
  log(`Eigen artikel ${naam} (${art}) ${nieuw?'toegevoegd':'aangepast'}`);bewaar();sluit();render();toast(nieuw?`★ ${naam} toegevoegd${bk&&sub==='bbkies'?' en aangevinkt':''}`:'Opgeslagen')}
document.addEventListener('input',e=>{if(e.target.id==='be_art'){const a=e.target.value.replace(/\s/g,''),el=document.getElementById('beCode');if(el)el.textContent=/^\d{5,7}$/.test(a)?'Barcode: '+msiCode(a):''}});
document.addEventListener('input',e=>{if(e.target.id==='bbZoek'){bbZoek=e.target.value;clearTimeout(bbZoekT);bbZoekT=setTimeout(bbLijstVernieuw,200)}});
/* PDF samenstellen: originele regels uitknippen en onder elkaar zetten */
/* indeling: welke originele regels op welke pagina, van boven naar beneden (zelfde voor PDF en voorbeeld) */
function bbIndeling(b,H){const ONDER=36,paginas=[];let pg=null,y=0,gDrawn=null,groep=null;
  const zet=r=>{pg.push({r,y});y+=r.top-r.bot};
  const nieuw=()=>{pg=[];paginas.push(pg);y=H-BB.kop.top+BB_DY;zet(BB.kop);gDrawn=null};
  for(const r of bbRijen()){if(r.t==='g'){groep=r;continue}if(!b.arts[r.art])continue;
    const h=r.top-r.bot,gh=groep&&gDrawn!==groep.naam?groep.top-groep.bot:0;
    if(!pg||y+h+gh>H-ONDER)nieuw();
    if(groep&&gDrawn!==groep.naam){zet(groep);gDrawn=groep.naam}
    zet(r)}
  return paginas}
async function bbMaakPdf(b){await laadScript(PDF_LIB,()=>window.PDFLib);const PL=window.PDFLib,src=await PL.PDFDocument.load(BB.pdf.slice(0)),out=await PL.PDFDocument.create(),font=await out.embedFont(PL.StandardFonts.Helvetica),vet=await out.embedFont(PL.StandardFonts.HelveticaBold);
  const{width:W,height:H}=src.getPage(0).getSize(),cache={},emb=async i=>cache[i]||(cache[i]=await out.embedPage(src.getPage(i))),ind=bbIndeling(b,H);
  if(!ind.length)throw new Error('leeg');
  for(let n=0;n<ind.length;n++){const page=out.addPage([W,H]);
    for(const{r,y}of ind[n]){const h=r.top-r.bot,e=await emb(r.p),yb=H-y-h;page.pushOperators(PL.pushGraphicsState(),PL.rectangle(0,yb-0.4,W,h+0.8),PL.clip(),PL.endPath());page.drawPage(e,{x:BB_DX,y:yb-r.bot});page.pushOperators(PL.popGraphicsState());
      if(r.eigen){const T=yb+h,kl=c=>c==='#fff'?PL.rgb(1,1,1):PL.rgb(0,0,0),f=b=>b?vet:font;
        bbEigenTeken({rect:(x,dy,w,hh,c)=>page.drawRectangle({x,y:T-dy-hh,width:w,height:hh,color:kl(c)}),
          text:(t,x,bl,sz,b,re)=>{if(!t)return;page.drawText(t,{x:re?x-f(b).widthOfTextAtSize(t,sz):x,y:T-bl,size:sz,font:f(b),color:PL.rgb(0,0,0)})},
          breed:(t,sz,b)=>f(b).widthOfTextAtSize(t,sz),
          ster:(cx,cy,R)=>{const p=bbSterPunten(0,0,R);page.drawSvgPath('M'+p.map(q=>q[0].toFixed(2)+' '+q[1].toFixed(2)).join(' L')+' Z',{x:cx,y:T-cy,color:PL.rgb(0,0,0)})}},r)}}
    const t=`${b.naam} – Pagina ${n+1}`;page.drawText(t,{x:(W-font.widthOfTextAtSize(t,9))/2,y:18,size:9,font})}
  return new File([await out.save()],`bestelboek-${b.naam.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${BB.naam.replace(/\s+/g,'-')}.pdf`,{type:'application/pdf'})}
/* voorbeeld: elke originele pagina één keer tekenen en de regels eruit knippen (snel, ook op de telefoon) */
/* 10.8.1 voorbeeld: alleen de pagina's rond de plek waar je kijkt worden getekend (geen geheugenprobleem op de iPhone) */
let bbVbOpruim=null;
async function bbVoorbeeld(b){let ov=document.getElementById('factVb');if(!ov){ov=document.createElement('div');ov.id='factVb';ov.setAttribute('role','dialog');document.body.appendChild(ov)}
  if(bbVbOpruim)bbVbOpruim();
  if(!document.getElementById('bbVbCss')){const st=document.createElement('style');st.id='bbVbCss';st.textContent='#factVb .bbvbp{width:100%;background:#fff;border-radius:4px;margin-bottom:10px;box-shadow:0 2px 12px rgba(0,0,0,.4);position:relative;overflow:hidden}#factVb.zoom .bbvbp{width:220%}#factVb .bbvbp img{width:100%!important;height:100%;display:block;box-shadow:none;border-radius:0}#factVb .bbvbp span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#999;font-size:14px}';document.head.appendChild(st)}
  ov.innerHTML=`<div class="vbkop"><b>${esc(b.naam)}</b><span id="bbVbTel" style="font-size:14px;opacity:.8"></span><button data-a="factvbsluit">Sluiten</button></div><div class="vbinhoud"><p class="vbmelding">Voorbeeld maken…</p></div><p class="vbhulp">Tik op een pagina om in of uit te zoomen</p>`;ov.classList.add('open');
  let pdf=null,io=null,dicht=false;const urls={},bron=new Map(),sc=1.5;
  const opruim=()=>{dicht=true;if(io)io.disconnect();for(const u of Object.values(urls))URL.revokeObjectURL(u);for(const c of bron.values()){c.width=c.height=0}bron.clear();if(pdf){pdf.destroy();pdf=null}bbVbOpruim=null};bbVbOpruim=opruim;
  try{await laadPdfjs();pdf=await pdfjsLib.getDocument({data:new Uint8Array(BB.pdf.slice(0))}).promise;if(dicht)return;
    const p1=await pdf.getPage(1),[,,W,H]=p1.view,ind=bbIndeling(b,H),N=ind.length,el=ov.querySelector('.vbinhoud'),tel=document.getElementById('bbVbTel'),uit=document.createElement('canvas'),ux=uit.getContext('2d');
    el.innerHTML=ind.map((_,n)=>`<div class="bbvbp" data-n="${n}" data-a="factvbzoom" style="aspect-ratio:${W}/${H}"><span>Pagina ${n+1}</span></div>`).join('');
    const pagina=async i=>{if(bron.has(i)){const c=bron.get(i);bron.delete(i);bron.set(i,c);return c}
      const pg=await pdf.getPage(i+1),vp=pg.getViewport({scale:sc}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;pg.cleanup();
      bron.set(i,c);while(bron.size>3){const[k,o]=bron.entries().next().value;o.width=o.height=0;bron.delete(k)}return c};
    const teken=async n=>{uit.width=W*sc;uit.height=H*sc;const x=ux;x.fillStyle='#fff';x.fillRect(0,0,uit.width,uit.height);
      for(const{r,y}of ind[n]){const s=await pagina(r.p),h=r.top-r.bot;if(dicht)return null;x.drawImage(s,0,(H-r.top)*sc,W*sc,h*sc,BB_DX*sc,y*sc,W*sc,h*sc);
        if(r.eigen){const fnt=(sz,b)=>`${b?'bold ':''}${sz*sc}px Helvetica,Arial,sans-serif`;
          bbEigenTeken({rect:(px,dy,w,hh,c)=>{x.fillStyle=c;x.fillRect(px*sc,(y+dy)*sc,w*sc,hh*sc)},
            text:(t,px,bl,sz,b,re)=>{x.fillStyle='#000';x.font=fnt(sz,b);x.textAlign=re?'right':'left';x.fillText(t,px*sc,(y+bl)*sc)},
            breed:(t,sz,b)=>{x.font=fnt(sz,b);return x.measureText(t).width/sc},
            ster:(cx,cy,R)=>{x.fillStyle='#000';x.beginPath();bbSterPunten(cx,y+cy,R).forEach(([a,c],i)=>i?x.lineTo(a*sc,c*sc):x.moveTo(a*sc,c*sc));x.closePath();x.fill()}},r)}}
      x.fillStyle='#000';x.font=`${9*sc}px Helvetica,Arial,sans-serif`;x.textAlign='center';x.fillText(`${b.naam} – Pagina ${n+1}`,W*sc/2,(H-18)*sc);
      const blob=await new Promise(ok=>uit.toBlob(ok,'image/jpeg',.85));uit.width=uit.height=1;return blob};
    const zicht=new Set();let bezig=false;
    const gewenst=()=>{const s=new Set();for(const n of zicht)for(let k=n-1;k<=n+1;k++)if(k>=0&&k<N)s.add(k);return s};
    const werk=async()=>{if(bezig||dicht)return;bezig=true;
      try{for(;;){const g=gewenst();
        for(const k of Object.keys(urls))if(!g.has(+k)){const d=el.querySelector(`[data-n="${k}"]`);if(d)d.innerHTML=`<span>Pagina ${+k+1}</span>`;URL.revokeObjectURL(urls[k]);delete urls[k]}
        const n=[...g].sort((a,c)=>a-c).find(k=>!urls[k]);if(n===undefined||dicht)break;
        const blob=await teken(n);if(dicht||!blob)break;urls[n]=URL.createObjectURL(blob);const d=el.querySelector(`[data-n="${n}"]`);if(d)d.innerHTML=`<img src="${urls[n]}" alt="Pagina ${n+1}">`}}
      catch(e){console.warn(e);if(!dicht)meldFout(e,'Bestelboek bekijken')}
      bezig=false};
    io=new IntersectionObserver(es=>{for(const x of es){const n=+x.target.dataset.n;if(x.isIntersecting)zicht.add(n);else zicht.delete(n)}
      if(tel&&zicht.size)tel.textContent=`Pagina ${Math.min(...zicht)+1} van ${N}`;werk()},{root:el,rootMargin:'200px 0px'});
    el.querySelectorAll('.bbvbp').forEach(d=>io.observe(d));tel.textContent=`Pagina 1 van ${N}`}
  catch(e){console.warn(e);const el=ov.querySelector('.vbinhoud');if(el&&!dicht)el.innerHTML='<p class="vbmelding">Bekijken lukt nu niet.</p>'}}
let bbKlaar=null,bbKlaarId=null;
async function bbPdf(id){const b=S.bestelboeken.boeken[id];if(!b||!BB)return;toonSheet(`<div class="pkop"><span style="width:60px"></span><b>${esc(b.naam)}</b><button data-a="sluit" style="font-weight:700">Sluiten</button></div><div class="pinhoud"><p class="leeg" id="bbPdfStatus">PDF maken…</p></div>`);
  try{const f=await bbMaakPdf(b);bbKlaar=f;bbKlaarId=id;const n=Object.keys(b.arts).length;
    toonSheet(`<div class="pkop"><span style="width:60px"></span><b>${esc(b.naam)}</b><button data-a="sluit" style="font-weight:700">Sluiten</button></div><div class="pinhoud"><div class="kaartje"><div class="naam">✓ Klaar</div><div class="sub">${n} ${n===1?'artikel':'artikelen'} uit ${esc(BB.naam)}</div></div>
     <div class="knoppen" style="flex-wrap:wrap"><button class="knop" data-a="bbdeel">📄 Delen of printen</button><button class="knop rand" data-a="bbvb">👁 Bekijken</button></div></div>`)}
  catch(e){console.warn(e);const el=document.getElementById('bbPdfStatus');if(el)el.textContent='PDF maken lukte niet. Controleer je internetverbinding.'}}
async function pdfVoorbeeldBestand(file,titel){let ov=document.getElementById('factVb');if(!ov){ov=document.createElement('div');ov.id='factVb';ov.setAttribute('role','dialog');document.body.appendChild(ov)}
  ov.innerHTML=`<div class="vbkop"><b>${esc(titel)}</b><button data-a="factvbsluit">Sluiten</button></div><div class="vbinhoud"><p class="vbmelding">Voorbeeld maken…</p></div><p class="vbhulp">Tik op een pagina om in of uit te zoomen</p>`;ov.classList.add('open');
  try{await laadPdfjs();const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise,el=ov.querySelector('.vbinhoud');el.innerHTML='';
    for(let i=1;i<=pdf.numPages&&ov.classList.contains('open');i++){const pg=await pdf.getPage(i),vp=pg.getViewport({scale:1.6}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
      el.insertAdjacentHTML('beforeend',`<img src="${c.toDataURL('image/jpeg',.85)}" alt="Pagina ${i}" data-a="factvbzoom" style="margin-bottom:10px">`)}}
  catch(e){const el=ov.querySelector('.vbinhoud');if(el)el.innerHTML='<p class="vbmelding">Bekijken lukt nu niet.</p>'}}
