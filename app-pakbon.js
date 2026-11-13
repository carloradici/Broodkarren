/* ================= pakbon scannen (foto / PDF) ================= */
const TESS_JS='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
const PDF_JS='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
const PDF_WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
const MAANDEN=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
function laadScript(src,klaar){return klaar()?Promise.resolve():new Promise((ok,nee)=>{const x=document.createElement('script');x.src=src;x.onload=ok;x.onerror=()=>nee(new Error('laden mislukt'));document.head.appendChild(x)})}
const normArt=t=>String(t||'').trim().replace(/,/g,'.').replace(/[^0-9.]/g,'').replace(/^\.+|\.+$/g,'');
function artnrsVan(s){return String(s.artnr||'').split(/[\s;,/]+/).map(x=>normArt(x.replace(/(\d)\.(\d)/,'$1.$2'))).filter(Boolean)}
function lev(a,b){const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);for(let j=1;j<=n;j++)d[0][j]=j;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n]}
/* één regel tekst → {aantal?, naam, artnr} */
function leesRegel(r){r=r.replace(/[“”‘’"]/g,' ');
  const am=r.match(/(?:^|[\s|—–\-_])(\d{4}(?:\s?[.,]\s?\d{1,3})?)[\s|\]\)\.;:!iIl]*(?:\s+[^\s\d]{1,3}|\s+\d)?[\s|\]\)\.;:!iIl]*$/);if(!am)return null;
  const artnr=normArt(am[1]);if(/^20\d\d$/.test(artnr))return null;
  const rest=r.slice(0,am.index);
  const qm=rest.match(/(?:^|[^\d])(\d{1,2})\s*[\[\{\(|][^A-Za-z]*(?=[A-Za-z])/)||rest.match(/(?:^|\s)(\d{1,2})\s+(?=[A-Z]{2})/);
  const schoon=t=>t.replace(/[_|\[\]{}()~]/g,' ').replace(/\s+/g,' ').trim().toUpperCase().replace(/^[^A-Z]+/,'');
  let naam=qm?schoon(rest.slice(qm.index+qm[0].length)):'',aantal=qm?+qm[1]:null;
  if(naam.length<3){naam=schoon(rest);aantal=null}  /* bijv. '10 ST' in de naam is geen aantal */
  if(naam.length<3)return null;return{aantal,naam,artnr}}
function leesDatum(tekst){const re=new RegExp('(\\d{1,2})\\s+('+MAANDEN.join('|')+')\\s+(20\\d\\d)','gi');let m;
  while((m=re.exec(tekst))){const voor=tekst.slice(Math.max(0,m.index-18),m.index).toLowerCase();if(/druk/.test(voor))continue;
    return`${m[3]}-${String(MAANDEN.indexOf(m[2].toLowerCase())+1).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`}return null}
/* tekst van de pakbon → regels {aantal, naam, artnr} + datum */
function leesPakbonTekst(tekst){const regels=[];for(const r of tekst.split(/\n/)){const x=leesRegel(r);if(x&&x.aantal!=null)regels.push(x)}return{datum:leesDatum(tekst),regels}}
/* PDF: tekstlaag → regels; geen tekst (scan) → afbeelding per pagina */
async function pdfNaarTekst(file){
  const lok=await ocrLokaal();await laadScript(lok?'ocr/pdf.min.js':PDF_JS,()=>window.pdfjsLib);pdfjsLib.GlobalWorkerOptions.workerSrc=window.__PDF_WORKER__||(lok?new URL('ocr/pdf.worker.min.js',location.href).href:PDF_WORKER);
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;let alle='';const n=Math.min(pdf.numPages,4),paginas=[];
  for(let p=1;p<=n;p++){const pg=await pdf.getPage(p),tc=await pg.getTextContent(),rij={};
    for(const it of tc.items){if(!it.str.trim())continue;const y=Math.round(it.transform[5]/3)*3;(rij[y]=rij[y]||[]).push(it)}
    alle+=Object.keys(rij).map(Number).sort((a,b)=>b-a).map(y=>rij[y].sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str).join(' ')).join('\n')+'\n';paginas.push(pg)}
  /* scans: ~1800 px breed renderen (scherper dan voorheen) */
  const canvassen=[];for(const pg of paginas){const v1=pg.getViewport({scale:1}),sc=Math.min(3.5,Math.max(2,1800/Math.min(v1.width,v1.height))),vp=pg.getViewport({scale:sc}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;
    const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);await pg.render({canvasContext:x,viewport:vp}).promise;canvassen.push(c)}
  return{tekst:alle,canvassen,canvas:canvassen[0]};
}
function afbNaarCanvas(file){return new Promise((ok,nee)=>{const r=new FileReader();r.onerror=nee;r.onload=()=>{const img=new Image();img.onerror=()=>nee(new Error('afbeelding'));img.onload=()=>{
  const sc=Math.min(1,2200/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);
  const x=c.getContext('2d');x.drawImage(img,0,0,c.width,c.height);ok(c)};img.src=r.result};r.readAsDataURL(file)})}
function grijsContrast(c){const x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height),p=d.data;
  for(let i=0;i<p.length;i+=4){let g=.299*p[i]+.587*p[i+1]+.114*p[i+2];g=Math.max(0,Math.min(255,(g-128)*1.4+150));p[i]=p[i+1]=p[i+2]=g}x.putImageData(d,0,0);return c}
let tessWorker=null,tessVoortgang=null;
async function tessKlaar(){const lok=await ocrLokaal(),B=new URL('ocr/',location.href).href;await laadScript(lok?B+'tesseract.min.js':TESS_JS,()=>window.Tesseract);
  if(!tessWorker){tessWorker=await Tesseract.createWorker('eng',1,{...(lok?{workerPath:B+'worker.min.js',corePath:B,langPath:B.replace(/\/$/,''),workerBlobURL:false}:{}),logger:m=>{if(m.status&&tessVoortgang)tessVoortgang(m)}});await tessWorker.setParameters({tessedit_pageseg_mode:'6'})}return tessWorker}
async function ocrData(c,voortgang){const w=await tessKlaar();tessVoortgang=voortgang;const r=await w.recognize(c,{},{text:true,blocks:true});const d=r.data;
  const lines=d.lines||(d.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>p.lines||[])),words=d.words||lines.flatMap(l=>l.words||[]);
  return{text:d.text||'',lines:lines.map(l=>({text:l.text||'',bbox:l.bbox})),words:words.map(w=>({text:w.text||'',bbox:w.bbox}))}}
async function ocrCanvas(c,voortgang){return(await ocrData(c,voortgang)).text}
/* klein stukje met alleen cijfers lezen (art.nr. van een regel die de volle lezing miste) */
async function ocrStuk(c,rect,cijfers){const w=await tessKlaar();await w.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:cijfers?'0123456789.':''});
  /* stukje 3× vergroten met witte rand: kleine cijfers (6/8) worden dan beter gelezen */
  const r={x:Math.max(0,rect.left),y:Math.max(0,rect.top)};r.w=Math.min(c.width-r.x,rect.width);r.h=Math.min(c.height-r.y,rect.height);
  const k=document.createElement('canvas');k.width=Math.round(r.w*3)+40;k.height=Math.round(r.h*3)+40;const x=k.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,k.width,k.height);x.imageSmoothingQuality='high';x.drawImage(c,r.x,r.y,r.w,r.h,20,20,r.w*3,r.h*3);
  try{return((await w.recognize(k)).data.text||'').trim()}finally{await w.setParameters({tessedit_pageseg_mode:'6',tessedit_char_whitelist:''})}}
function kopieCanvas(c,f,rect){const r=rect||{x:0,y:0,w:c.width,h:c.height},o=document.createElement('canvas');o.width=Math.round(r.w*f);o.height=Math.round(r.h*f);const x=o.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(c,r.x,r.y,r.w,r.h,0,0,o.width,o.height);return o}
/* ---- pakbon: vakjes opsporen en aantallen lezen met cijfers van de bakker ---- */
function grijsVan(c){const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,g=new Uint8Array(c.width*c.height);for(let i=0,j=0;j<g.length;i+=4,j++)g[j]=(.299*d[i]+.587*d[i+1]+.114*d[i+2])|0;return{g,W:c.width,H:c.height}}
function adaptInkt(G,r=15,C=12){const{g,W,H}=G,W1=W+1,I=new Uint32Array(W1*(H+1));
  for(let y=0;y<H;y++){let s=0;for(let x=0;x<W;x++){s+=g[y*W+x];I[(y+1)*W1+x+1]=I[y*W1+x+1]+s}}
  const b=new Uint8Array(W*H);
  for(let y=0;y<H;y++){const y0=Math.max(0,y-r),y1=Math.min(H,y+r+1);for(let x=0;x<W;x++){const x0=Math.max(0,x-r),x1=Math.min(W,x+r+1);
    const m=(I[y1*W1+x1]-I[y0*W1+x1]-I[y1*W1+x0]+I[y0*W1+x0])/((y1-y0)*(x1-x0));if(g[y*W+x]<=m-C)b[y*W+x]=1}}return b}
function componenten(b,W,H,waarde=1,acht=true){const lab=new Int32Array(W*H),st=new Int32Array(W*H),uit=[];let n=0;
  for(let i=0;i<W*H;i++){if(b[i]!==waarde||lab[i])continue;n++;let sp=0;st[sp++]=i;lab[i]=n;let x0=W,y0=H,x1=-1,y1=-1,a=0;
    while(sp){const p=st[--sp],x=p%W,y=(p-x)/W;a++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
      for(let dy=-1;dy<=1;dy++){const yy=y+dy;if(yy<0||yy>=H)continue;for(let dx=-1;dx<=1;dx++){if(!acht&&dx&&dy)continue;const xx=x+dx;if(xx<0||xx>=W)continue;const q=yy*W+xx;if(b[q]===waarde&&!lab[q]){lab[q]=n;st[sp++]=q}}}}
    uit.push({id:n,x:x0,y:y0,w:x1-x0+1,h:y1-y0+1,a})}return{lab,comp:uit}}
const mediaan=a=>{const s=[...a].sort((p,q)=>p-q),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
function zoekVakjes(G){const{W,H}=G,b=adaptInkt(G),v=[];
  /* buitenkant (inkt) én binnenkant (wit gat) van elk vakje: het gat werkt ook als de rand een letter raakt */
  const kand=[...componenten(b,W,H,1,true).comp,...componenten(b,W,H,0,false).comp.filter(k=>k.x>0&&k.y>0&&k.x+k.w<W&&k.y+k.h<H&&k.a>.75*k.w*k.h)];
  for(const{x,y,w,h}of kand){if(!(w>.02*W&&w<.06*W&&w/h>1.5&&w/h<3.5&&x<.4*W))continue;
    let s=0,n=0;const xa=x+Math.floor(w/6),xb=x+Math.floor(5*w/6);for(let yy=y+(h>>2);yy<y+((3*h)>>2);yy++)for(let xx=xa;xx<xb;xx++){s+=b[yy*W+xx];n++}
    if(n&&s/n<40/255)v.push({x,y,w,h})}
  v.sort((a,b)=>a.y-b.y||a.x-b.x);const u=[];for(const q of v)if(!u.some(o=>Math.abs(q.x-o.x)<q.w*.3&&Math.abs(q.y-o.y)<q.h*.5))u.push(q);
  if(!u.length)return u;const mx=mediaan(u.map(q=>q.x)),mw=mediaan(u.map(q=>q.w));
  const goed=u.filter(q=>Math.abs(q.x-mx)<1.2*mw&&Math.abs(q.w-mw)<.35*mw);return goed.length>=3?vulVakjes(b,W,H,goed):goed}
/* 10.8.4: in de gaten tussen gevonden vakjes (en eronder) zoeken naar een vakje met dezelfde maat: vier randen inkt */
function vulVakjes(b,W,H,v){const mw=Math.round(mediaan(v.map(q=>q.w))),mh=Math.round(mediaan(v.map(q=>q.h))),st=mediaan(v.slice(1).map((q,j)=>q.y-v[j].y).filter(d=>d<2.2*mh+10)),uit=[...v];
  const ink=(x,y)=>x>=0&&y>=0&&x<W&&y<H?b[y*W+x]:0,rij=(y,xa,xb)=>{let n=0,t=0;for(let x=xa;x<=xb;x++){t++;n+=(ink(x,y-1)|ink(x,y)|ink(x,y+1))}return n/t},kol=(x,ya,yb)=>{let n=0,t=0;for(let y=ya;y<=yb;y++){t++;n+=(ink(x-1,y)|ink(x,y)|ink(x+1,y))}return n/t};
  const score=(x,y,mh,mw)=>{const t=rij(y,x+3,x+mw-4),o=rij(y+mh-1,x+3,x+mw-4),l=kol(x,y+3,y+mh-4),r=kol(x+mw-1,y+3,y+mh-4);if(Math.min(t,o)<.7||Math.min(l,r)<.6)return 0;
    let n=0,k=0;for(let yy=y+3;yy<y+mh-3;yy++)for(let xx=x+4;xx<x+mw-4;xx++){k++;n+=ink(xx,yy)}if(k&&n/k>.45)return 0;return t+o+l+r};
  const zoek=(ya,yb,xa,ha,wa,yMax)=>{let best=null;for(let w=Math.round(.9*wa);w<=Math.round(1.2*wa);w++)for(let h=Math.round(.8*ha);h<=Math.round(1.25*ha);h++)for(let y=Math.round(ya);y<=Math.round(yb);y++)for(let x=xa-4;x<=xa+4;x++){if(yMax&&y+h>yMax)continue;let s=score(x,y,h,w);if(!s)continue;s-=.03*Math.abs(h-ha)+.02*Math.abs(w-wa);if(!best||s>best.s)best={x,y,h,w,s}}return best};
  for(let j=0;j<v.length;j++){const a=v[j],nb=v[j+1],eind=nb?nb.y-.75*st:Math.min(H-mh,a.y+4*st);let y=a.y+.75*st,x=a.x;
    while(y<=eind){const f=zoek(y,Math.min(eind,y+.6*st),Math.round(nb?x+(nb.x-x)*.5:x),nb?(a.h+nb.h)/2:a.h,nb?(a.w+nb.w)/2:a.w,nb?nb.y-2:0);if(!f){if(!nb)break;y+=.5*st;continue}
      uit.push({x:f.x,y:f.y,w:f.w,h:f.h,erbij:1});y=f.y+.75*st;x=f.x}}
  return uit.sort((a,b)=>a.y-b.y)}
/* glyph → 24×20 (verhouding behouden, gecentreerd) */
function schaal(src,sw,sh,dw,dh){const o=new Float32Array(dw*dh),fx=sw/dw,fy=sh/dh;
  if(fx>=1&&fy>=1){for(let oy=0;oy<dh;oy++){const ya=oy*fy,yb=ya+fy;for(let ox=0;ox<dw;ox++){const xa=ox*fx,xb=xa+fx;let s=0;
      for(let y=Math.floor(ya);y<Math.ceil(yb);y++){const wy=Math.min(yb,y+1)-Math.max(ya,y);if(wy<=0)continue;for(let x=Math.floor(xa);x<Math.ceil(xb);x++){const wx=Math.min(xb,x+1)-Math.max(xa,x);if(wx>0)s+=src[y*sw+x]*wx*wy}}
      o[oy*dw+ox]=s/(fx*fy)}}return o}
  for(let oy=0;oy<dh;oy++){let y=(oy+.5)*fy-.5;y=Math.max(0,Math.min(sh-1,y));const y0=Math.floor(y),y1=Math.min(sh-1,y0+1),ty=y-y0;
    for(let ox=0;ox<dw;ox++){let x=(ox+.5)*fx-.5;x=Math.max(0,Math.min(sw-1,x));const x0=Math.floor(x),x1=Math.min(sw-1,x0+1),tx=x-x0;
      o[oy*dw+ox]=(src[y0*sw+x0]*(1-tx)+src[y0*sw+x1]*tx)*(1-ty)+(src[y1*sw+x0]*(1-tx)+src[y1*sw+x1]*tx)*ty}}return o}
function normGlyph(m,w,h){const nw=Math.max(1,Math.min(20,Math.round(w*24/h))),r=schaal(m,w,h,nw,24),o=new Float32Array(480),s=(20-nw)>>1;
  for(let y=0;y<24;y++)for(let x=0;x<nw;x++)o[y*20+s+x]=r[y*nw+x];return o}
const glyphHex=a=>{let s='';for(let i=0;i<480;i+=4){let v=0;for(let k=0;k<4;k++)v=v*2+(a[i+k]>=.5?1:0);s+=v.toString(16)}return s};
function hexGlyph(h){const a=new Float32Array(480);for(let i=0;i<120;i++){const v=parseInt(h[i],16);for(let k=0;k<4;k++)a[i*4+k]=(v>>(3-k))&1}return a}
function centreer(a){let m=0;for(const v of a)m+=v;m/=a.length;const o=new Float32Array(a.length);let q=0;for(let i=0;i<a.length;i++){o[i]=a[i]-m;q+=o[i]*o[i]}return{v:o,q:Math.sqrt(q)||1}}
function maakSjablonen(...bronnen){const T=[];for(const b of bronnen)for(const[d,l]of Object.entries(b||{}))for(const h of l)T.push({d,...centreer(hexGlyph(h))});return T}
function klasCijfer(T,n){const c=centreer(n),best={};for(const t of T){let s=0;for(let i=0;i<480;i++)s+=c.v[i]*t.v[i];s/=c.q*t.q;if(!(t.d in best)||s>best[t.d])best[t.d]=s}
  const r=Object.entries(best).sort((a,b)=>b[1]-a[1]);return{d:r[0][0],score:r[0][1],marge:r[0][1]-(r[1]?r[1][1]:-1)}}
function otsu(c){const h=new Float64Array(256);for(const p of c)h[Math.max(0,Math.min(255,Math.round(p)))]++;const n=c.length;let sum=0;for(let i=0;i<256;i++)sum+=i*h[i];
  let sB=0,wB=0,best=0,t=0;for(let i=0;i<256;i++){wB+=h[i];if(!wB)continue;const wF=n-wB;if(!wF)break;sB+=i*h[i];const mB=sB/wB,mF=(sum-sB)/wF,v=wB*wF*(mB-mF)*(mB-mF);if(v>best){best=v;t=i}}return t}
/* aantal links van het vakje */
function leesAantal(G,v,T){const{g,W,H}=G,{x,y,w,h}=v,x0=Math.max(0,Math.round(x-1.1*w)),x1=Math.round(x+.02*w),y0=Math.max(0,Math.round(y-.3*h)),y1=Math.min(H,Math.round(y+1.3*h)),cw=x1-x0,ch=y1-y0;
  if(cw<4||ch<4)return null;const c=new Float32Array(cw*ch);
  for(let j=0;j<ch;j++)for(let i=0;i<cw;i++){let s=0;for(let dj=-1;dj<=1;dj++){const jj=Math.min(ch-1,Math.max(0,j+dj));for(let di=-1;di<=1;di++){const ii=Math.min(cw-1,Math.max(0,i+di));s+=g[(y0+jj)*W+x0+ii]*(di?1:2)*(dj?1:2)}}c[j*cw+i]=s/16}
  const t=otsu(c),b=new Uint8Array(cw*ch);for(let i=0;i<b.length;i++)b[i]=c[i]<=t?1:0;
  const{lab,comp}=componenten(b,cw,ch);let gl=comp.filter(k=>k.h>.3*h&&k.h<1.1*h&&k.w>.3*k.h&&k.w<1.2*k.h&&k.a>8&&k.x>0);
  if(!gl.length)return{tekst:'',marge:0,glyphs:[]};const hm=mediaan(gl.map(k=>k.h));gl=gl.filter(k=>k.h>.75*hm&&k.h<1.3*hm).sort((a,b)=>a.x-b.x).slice(-2);
  let r=gl.map(k=>{const m=new Float32Array(k.w*k.h);for(let yy=0;yy<k.h;yy++)for(let xx=0;xx<k.w;xx++)m[yy*k.w+xx]=lab[(k.y+yy)*cw+k.x+xx]===k.id?1:0;const n=normGlyph(m,k.w,k.h);return{...klasCijfer(T,n),hex:glyphHex(n)}});
  if(r.length===2&&r[0].score<.5)r=r.slice(1);
  return{tekst:r.map(q=>q.d).join(''),marge:Math.min(...r.map(q=>q.marge)),glyphs:r.map(q=>q.hex)}}

const PB_SJAB={"0":["07fe00fff00fff83fff83f1f83f1f87e0f87e0fc7e0fc7e0fc7e0fc7e0fc7e0fc7e0fc7e0fc7e0fc7e0fc7f1f83fff83fff03ffe00ffc00ff8007f00","03f800ffe00ffe00ffe03fff83f1f83f0f83f0783c0783c07c3c07c3c07c7c07c7c07c7c07c7f0783f1f83fbf81fbf00ffe00ffe007fc007fc003f80","03f800ffe00ffe00ffe03fff83f9f83f9f83f1f83f0783c07c3c07c3c07c7c07c7e07c7f07c7f1fc3f1f83fff83fff83fff80ffe007fc007fc003f80"],"1":["00080001c0001e0007f001ff003fe007fe00ffe01ffe01ffe01ffe0007e0007e0007e0007e0007e0007e0007e0007e0007e0007e0007e0007e0007e0","003f0007f0007f001ff007ff00fff01fff01fff01fff01fff0007f0007f0007f0007f0007f0007f0007f0007f0007f0007f0007f0007e0007c000380","01f0003f0003f0007f001ff801ff801ff803ff801ff80007c0007c0007c0007c0007c0007e0007f0003f0003f0003f0003f0000f8000f0000e000040","003e0007f0007f001ff003ff003ff00fff01fff00fff007ff0003f0003f0003f0003f0003f0003f0003f0003f0003f0003f0003f0003f0001f0000e0","007e000fe000fe007fe00ffe00ffe00ffe00ffe00ffe00ffe0007e0001e0001e0007e0007e0007e0007e0007e0007e0007e000fe0007c0003c0001c0","000c0003e0007e000fe001fe00ffe00ffe00ffe00ffe007fe003fe0007e0007e0007e0007e0007e0007e0007e0007e0007e0007e0007e0003e0001c0","000e0007e0007e001ff003ff003ff00fff01fff00fff007ff0007f0003f0003f0003f0003f0003f0003e0003e0003e0003e0003e0007e0007e0003e0","000e0003e0007e000ff001ff003ff007ff00fff00fff007ff003ff0007f0001f0001f0003f0007f0007f0007f0007f0007e0007e0007e0003e0001e0","007e000fe000fe001fe00ffe00ffe00ffe00ffe00ffe00ffe000fe0007e0007e0007e0007e0007e0007e0007e0007e0007e0007e0007e0007e0007e0","00e0001f0001f000ff001ff001ff801ff801ff801ff800ff8007fc0007e0007e0007e0007e0007e0007e0007f0007f0007f0001f0001f0001f0001f0","007e000fe000fe001fe00ffe00ffe00ffe00ffe00ffe00ffe0007e0007e0007e0007e0007e0007e0007e0007e0007e0007e0007e0007e0003e0001c0","00fe001fe001fe00ffe00ffc00ffc00ffc00ffc00ffc00ffc0007e0007e0007e0007e000fe000fe000fc000fc000fc000fc000fc000fc000f8000700"],"2":["01f8007fe00fff01fff83fcf83f8783f8781e07800078000f8001f8003f0007c000fc001fc003f8007f000fc001fc003ff783fff83fff83fff81fff0","07fe01fff03fff83fff87f0fc7f0fc3e0fc000fc000fc000fc001f8003e0007e000fe001fc003f8007e000fc001fe003fe007fffc7fffc7fffc3fff8","07fc00fff00fff83fff87f1f87f1f87e0fc000fc000f8000f8001f8003e0007e000fc001f0003f0007e000fc001fc003fc007fff87fffc7fffc7fff8","01fc00fff00fff83fff87fdf87f9f87e0fc380fc001f8001f8007f800fe000fe001fc007f0007f000fe003fc007fff07fff87fffc7fffc7fffc3ffe0","00f0003fe007fe03fff83fffc3fffc7f0fc380fc001f8001f8001f8003e0007e000fc001f0003f000fe003fc003fe003fe007fff87fffc7fffc7fff8","00fc007ff007ff81fffc3f8fc3f8fc3f03c0403c0007c000fc001f8007e0007e000fe003fc003f8007f001fe003fffc3fffc3fffc3fffc3fffc00f00","00e0003fe007fe00fff81fdfc3f9fc3f0fc380fc000fc000fc001f8003f8007f000fe001fc003f8007f000fe001fe003fe003fffc7fffc7fffc3fff8","01fc00fff00fff83fff83fcfc3f8fc7e0fc380fc000fc000fc001f8003e0007e000fc001f0003f0007e000fc001fff03fff87fffc7fffc7fffc3fff8","07fc00ffe01fff03fff83f9f83f0f83e0781c078001f8003f8003f0007e001fc003f8003f0003e001fe003fe003ff003fff83fffc3fff83fff01f9c0","007c003ff003ff807ffc1fffc1fffc1fffc1fc7c0007c0007c000fc003f8007f800ff001fe001fc003f8007f800ff801fff83fffc3fffc3fffc1fff8","01f0007fc00ffe01fff01fff03fcf81e0f80e0f8040f8001f0003f0007e000fe001fc001f0007e000fe001fe003ff003fff03fff83fff03fff0001e0","03f8007fe007ff03fff83fff83f9fc3f9fc3f1fc001fc003f8003f8007f800fe003fc003fc007e000fe001fe003ff003fff87fff87fff87fff03ffe0"],"3":["07f800ffc01ffe03fff03fbf03f1f03e1f0063f0007f000ff001ff001ff0007f0001f8000f8000f83e0f83e0f83f1f83fff83fff01ffe00ffc007f80","03f0007fc00ffe01ffe01fff01f1f00f1f0073f0007f000fe000fe000fe0007f0003f0001f81e1f83f1f83f1f83fff03fff01ffe00ffc007f8000e00","03f0007fc00ffe01fff03fff01fdf01f1f00f3f0007f000fe000fe000fe0007f0003f0001f81e1f83f1f83f1f83fff83fff01ffe00ffc007f8001f00"],"4":["00e0001e0001e0001f0007f0007f0007f000ff000ff000ff003f7c03e7c03c7c0787c0787e07c7f07fff87fffc7fff87fff0001e0001e0001e0001e0","007c000fc000fc000fc001fc003fc007fc007fe00ffe00f9e00f1e01f1e03f1e03e1e07f3f87fff87fffc7fffc3e7f81e3f8001f8001e0001e0001c0","001e0003f0007f000fe000fe000fe001fe007fe00ffe00f9e00f0e01e0e03e0e07e1f07fffc7fffc7fffe7fffc007f8007f0001e0001e0001e0001e0","0070000f0000f0000fc001fc003fc003fc007fc007fc007fc00ffe01f1e01f1e03e1f03c1f83fffc3fffc3fffc3fffc3fffc1c1f8000f8000f8000f8","001f8001f8001f8007f800ff800ff803ff807ff807ff807ff80fff81f8f83f0f8ff1fcff1fcfffffffffffffffffffcffffc001f8001f8001f0000e0","00070000f0000f0001f0007f0007f000ff001ff003ff007ff0078f00f0f00f0f03f0fc7fffe7fffe7fffe3fffe003f8001f0001f0000f0000f000060","00180003c0007e000fe000fe000fe001fe007fe007fe007fe00f9e00f1e00f1e03f1f03fffc3fffc7fffe7fffc3fffc1fff8001f0001f0001f0001e0","001f8001f8001f8007f800ff800ff803ff807ff807ff807ff80fff81f9f83f1f8ff1fcff1fcfffffffffffffffffffcffffc001f8001f8001f0000e0","0078000fc000fe000fe001fe001fe001fe001fe003fe007fe00fff00fcf00f8f03f1fc7fffc7fffc7fffe3fffe00ffc00ffc001fc000f0000f000060","000e0001f0001f0007f000ff000ff001ff001ff003ff007ff00fff01fcf03f8f03f1f07f9fc7fffc7fffe7fffe7fffc7fff801ff0001f0001f0001e0","00040000e0001e0003e000ff803ff803ff803ff807fe007fe007fe00fde03f9f87fff87fff87fffc7fffc3fffc1fffc03ff8003f8003f0003e0001c0","00380007c0007c000fc003fc003fc003fc003fe007fe007fe007fe00ffe03fff87fff87fff87fff87fffc7fffc7fffc0fffc007f8003f8003f0001e0"],"5":["3fff03ffe03ffc03800038000380003800038000384003ffc03ffe03e3f000078000780007800038000380003800038380783c0f01ffe00ffc007f80","1fff81fff81fff01e0003c0003c0003c0003c0003ffc03fff03fff83fff81c07c0003c0003c0003c0003c0003c1803c3c07c3f9fc1fff80fff007fe0","1fff03fff03fff03ffe03ffc03e0003e0003e0003ffc03ffe03fff03fff83e0f80007c0007c0007c0007c3c07c3e0f83fff81fff00ffe007fc001f00","3fff83fff83fff03ffe03e0003c0003c0003c0003ffc03ffe03fff03fff83c1fc000fc0007c0007c0007c3007c380fc3e1f83fff81fff00ffe007f80"],"6":["07e000ff001ff803ffc03e3c03c0c03c0403c000380003cf003df803ffe03ffe03f0f03e0783e0781e0381e07c1f07c1f87c07ff803ff803ff001fe0","00f0003fc007fe00fff01fff01e0f03e0003e0003e0003ff803ffc03ffe03fff03f0f03e0f83e0f83e0f03e0f01e0f01fff00ffe007fc003f8001e00","01fe007ff007ff807ff81fc781f0001e0001e0003ffc03ffe03fff03fff83f9fc3f0fc3e07c3e03c3e03c1e07c1f0fc1fff807ff803ff003fe000400","03fc007ff80fff81fff81e0783c0003c0003c0003ff803ffe03fff03fff83e0f83c0783c0783c0783c0783e0f83f1f81fff81fff003fe003fc000700","0ff001ff803ffc03ffe07e0c07c00078000780007ff007ff007ffe07fff07fff83f0f83e03c3e03c3e03c3f0fc0f8fc0fcfc07ff801ff801ff000700","0078003fe003ff007ff81fff81f0781e0783e0003e0003ffe03fff03fff83fff83f0783e0783e0783e0783e0f83f1f81fff81fff003fe003fc001c00","01fc003ff007ff80fff81f0f83f0703e0007e0007ff807ffc07ffe07fff07fff87f1f87e0f87c0f8780fc7e0f83f1f83f1f83fff80ffe00ffe001f00","0078003fe003ff007ff81fff81f8781f8783e0003e0003ffe03fff03fff83fff83f0783e0783e0783e0783e0f83f1f81fff807ff003fe003fc001c00","01ff00fff80fffc0fffe1fffe3f87c3e0003f3c03fbe07fff07fff87fffc7fffe7fffe7e07e7e03e7e07e7e07e3f87e3fffe3fffc0fff00fff007fe0","01fc003ff007ff80fff81fdf83f9f03e0207e0007ff807ffc07ffe07fff07fff87f1f87e0fc7e0fc7e0fc7e0fc7f1f87f1f83fff80ffe00ffe001f00","00f0003fe007fe00fff81fffc3fffc3f0383f0003f3803f7c07ffe07fff07fff87fffc7f03c7f03c7f03c3f0fc3f1fc1f1fc0fffc0fff80fff007fc0","0078003fe003ff007ff81fffc1fc3c1fc3c1f8001ffc03ffe03fff03fff83fffc3f8fc3f87c3f83c1f83c1f87c1f8fc1fffc07ff807ff007fe001f80"],"7":["1fffc3fffc3fffc3fffc1fff8003f8003f0003e0007c0007c000fc001f8001f8003f8003f0003e0003e0003e0003e0007c0007c0007c0007c0003800","7fff87fffc7fffc7fff83fff8007f0007e0007c0007c000f8000f8000f8003e0007e0007e0007e0007c0007c0007c000fc000f8000f8000f80007000","0fff81fffc3fffc7fffc3fffc003f8003f0003e0007e000fc000fc000fc003f8003f8003f8003e0007e0007e0007e0007c0007c0007c0007c0007800","1fff83fffc3fffc3fffc3fffc003f8003f0003e0003e0007c000fc001fc001f8003f8003f0003e0003e0007e0007e0007c0007c0007c0007c0003800","3fff83fffc3fffc3fffc1fffc00ffc007fc003f8003e0007c0007c0007c001f8003f8003f8003f8003e0003e0003e0007e0007c0007c0007c0003800","1fff83fffc3fffc3fffc3fffc003f8003f0003e0007e000fc001fc001fc003f8003f8003f0007e0007e0007e0007e0007c0007c0007c0007c0007800","1fff83fffc3fffc3fffc3fffc003f8003f0003e0007e0007c000fc001fc001f8003f8003f0003e0003e0007e0007e0007e0007c0007c0007c0003c00","7ffe07fff07fff87fffc3fff801ff800ff0007e0007c000f8000f8000f8003e0007e0007e0007e0007c0007c0007c000fc000f8000f8000f80007000","1fff83fffc3fffc3fffc3fffc003f8003f0003e0007e000fc001fc001fc003f8003f8003f0007e0007e0007e0007e0007c0007c0007c0007c0007800"],"8":["03f801ffc01ffe01fff03e1f03e0f01e0f01e0f01f0f00fff00fff00fff00fff00f8f81f0781f0781f07c1f07c1f07c0f8f80fff807ff003fe000f80","07f800ffc01ffc03ffe03e1e03c0f03c0f83e1f81ffe00ffe007fe007fe007ff80f8f81f0781e03c1e03c1f03c0f83c0783c07ffc03ff803ff0007e0","03f800ffc01ffc03ffe03e1f83e1f83e1f83e1f81ffe01ffe00ffe007fe01fff81f8f81f0781e03c1e03c1e07c1f0fc1f9fc07ff807ff007fe001f80","01c0007f000ff801ffc03ffe03f1f03e1f83e1f81e1e00ffe007fe007fe007ff8078f80f0781e03c1e03c1f03c1f83c1fc7c07ff803ff803ff0007c0","07f800ffe01ffe03ffe03e3f83e1f83e1f83e1f81ffe01ffe00ffe007fe01fff81f8f81f0781e07c1e03c1f07c1f8fc1f9fc1fff80fff007fe001f80","01c0007f000ff801ffe03ffe03f1f03e1f83e1f81e3e01ffe00ffe007fe007ff80f8f81f0781e03c1e03c1f03c1f83c1fc7c07ff803ff803ff0007c0"],"9":["03f800ffe01fff01fff83f87c3c03c3c03c3c03c3c03c3c07c3c0fc3f9fc1fffc1fffc0fffc07ffc1c07c3c0783c0f83fff83ffe01ffc00ffc003e00","03fc00ffe01fff03fff83e0783c07c3c07c3c03c3c03c3c07c3c0fc3f9fc1fffc1fffc0fffc007fc3c07c3c0783c0f83e3f83ffe01ffc00ffc003e00","03f8007fe00fff01e0783c0383c0383c0383803c3803c3c03c3c03c3c03c1e07c0fffc07ffc01c3c0003c0003800038180781e1e00ffc007fc003f80","07fc00ffe01fff03f9f83c07c3c03c3c03c3c03c3c03c3c03c3c03c3e07c1fffc1fffc0fffc03fbc0003c0007c0007c3c0783e1f81fff00ffe007fc0","01f0007fc00ffe01fff03fff03e0f87c0f87c0787c07c7c07c7c0fc3e0fc3fffc1fffc0fffc07ffc000f8000f83e1f83fff01ffe00ffc007f8001e00","03f8007fe00fff01fff81e1f83e0f83e0783e07c3e07c3e07c3f0fc1f9fc1fffc0fffc07ffc01c7c0007c00078000f81e1f81ffe00ffe007fe003f80"]};
/* één pagina lezen: vakjes zoeken, aantal per vakje met de cijfers van de bakker, 2× tekst lezen ter controle */
/* 10.8.4 gekleurde pen (blauwe/rode vinkjes) weghalen: de pakbon is zwart gedrukt. Kleur t.o.v. de kleurzweem van de foto. */
function zonderPen(c){const o=document.createElement('canvas');o.width=c.width;o.height=c.height;const x=o.getContext('2d');x.drawImage(c,0,0);const d=x.getImageData(0,0,o.width,o.height),p=d.data,W=o.width,H=o.height;
  const h=new Int32Array(512);let n0=0;for(let i=0;i<p.length;i+=64){h[p[i+2]-p[i]+256]++;n0++}let s=0,c0=0;for(let k=0;k<512;k++){s+=h[k];if(s>=n0/2){c0=k-256;break}}
  const m=new Uint8Array(W*H);let n=0;for(let i=0,j=0;i<p.length;i+=4,j++){const r=p[i],g=p[i+1],b=p[i+2],l=(r+g+b)/3,dv=(b-r)-c0;if(l<215&&(dv>20||dv<-28)){m[j]=1;n++}}
  if(n<30)return o;
  /* pen-pixels (en een randje eromheen) vullen met de papierkleur van die plek: lichtste 20% van een blok van 24×24 */
  const T=24,tw=Math.ceil(W/T),th=Math.ceil(H/T),pap=new Float32Array(tw*th);
  for(let ty=0;ty<th;ty++)for(let tx=0;tx<tw;tx++){const hh=new Uint32Array(256);let k=0;for(let y=ty*T;y<Math.min(H,ty*T+T);y++)for(let xx=tx*T;xx<Math.min(W,tx*T+T);xx++){const j=y*W+xx;if(m[j])continue;const i=j*4;hh[((p[i]+p[i+1]+p[i+2])/3)|0]++;k++}
    let s=0,v=230;for(let q=255;q>=0;q--){s+=hh[q];if(s>=k*.2){v=q;break}}pap[ty*tw+tx]=k>20?v:-1}
  for(let i=0;i<pap.length;i++)if(pap[i]<0){let s=0,k=0;for(const j of[i-1,i+1,i-tw,i+tw])if(j>=0&&j<pap.length&&pap[j]>=0){s+=pap[j];k++}pap[i]=k?s/k:230}
  const mh=new Uint8Array(W*H),md=new Uint8Array(W*H);for(let y=0;y<H;y++)for(let xx=0;xx<W;xx++){if(!m[y*W+xx])continue;for(let dx=-2;dx<=2;dx++){const q=xx+dx;if(q>=0&&q<W)mh[y*W+q]=1}}
  for(let y=0;y<H;y++)for(let xx=0;xx<W;xx++){if(!mh[y*W+xx])continue;for(let dy=-2;dy<=2;dy++){const yy=y+dy;if(yy>=0&&yy<H)md[yy*W+xx]=1}}
  for(let y=0;y<H;y++)for(let xx=0;xx<W;xx++){const z=md[y*W+xx];
    if(z){const i=(y*W+xx)*4,dv=(p[i+2]-p[i])-c0;if(m[y*W+xx]||dv>6){const v=pap[((y/T)|0)*tw+((xx/T)|0)];p[i]=p[i+1]=p[i+2]=v}}}
  x.putImageData(d,0,0);return o}
/* 10.8.4: per vakje de tekstregel in de kolom art.nr. zoeken (een verfrommelde of scheve bon loopt niet recht) */
function artLijnen(G,vak,words){const{W,H}=G,b=adaptInkt(G),st=vak.length>1?mediaan(vak.slice(1).map((v,j)=>(v.y+v.h/2)-(vak[j].y+vak[j].h/2))):vak[0].h*1.2,uit=vak.map(()=>null);
  const mw=mediaan(vak.map(v=>v.w)),vx=mediaan(vak.map(v=>v.x));
  const aw=(words||[]).filter(w=>w.bbox&&/^\d{3,4}([.,]\d{1,3})?$/.test(w.text.trim().replace(/[|\]\[)(;:!'`]/g,''))).map(w=>({cx:(w.bbox.x0+w.bbox.x1)/2,w:w.bbox.x1-w.bbox.x0,h:w.bbox.y1-w.bbox.y0})).filter(w=>w.cx>vx+6*mw&&w.cx<vx+11*mw);
  const cx=aw.length?mediaan(aw.map(w=>w.cx)):vx+8.6*mw,half=aw.length?Math.max(.5*mw,.55*mediaan(aw.map(w=>w.w))):1.6*mw,th=aw.length?mediaan(aw.map(w=>w.h)):.75*mediaan(vak.map(v=>v.h));
  const xa=Math.max(0,Math.round(cx-half)),xb=Math.min(W-1,Math.round(cx+half)),ya=Math.max(0,Math.round(vak[0].y-1.5*st)),yb=Math.min(H-1,Math.round(vak[vak.length-1].y+1.5*st));
  /* regels in de smalle kolom: rijen met genoeg inkt, kleine gaten dichten */
  const aan=[];for(let y=ya;y<=yb;y++){let n=0;for(let x=xa;x<=xb;x++)n+=b[y*W+x];aan.push(n>.18*(xb-xa))}
  const bl=[];let s0=-1,gat=0;for(let i=0;i<=aan.length;i++){if(i<aan.length&&aan[i]){if(s0<0)s0=i;gat=0;continue}if(s0<0)continue;if(i<aan.length&&++gat<=2)continue;const e=i-gat;const h=e-s0+1;
    if(h>=.5*th&&h<=1.6*th)bl.push({y0:ya+s0,y1:ya+e,c:ya+(s0+e)/2});s0=-1;gat=0}
  if(!bl.length)return{lijnen:uit,x0:xa,x1:xb};
  /* één verschuiving voor de hele bon (art.nr. staat vaak iets hoger of lager dan het vakje), daarna per regel bijsturen */
  const cyV=vak.map(v=>v.y+v.h/2);let best={n:-1,e:1e9,o:0};
  for(let o=Math.round(-1.3*st);o<=Math.round(.8*st);o++){let n=0,e=0;for(const c of cyV){let d=1e9;for(const q of bl)d=Math.min(d,Math.abs(q.c-c-o));if(d<.3*st){n++;e+=d}}if(n>best.n||(n===best.n&&e<best.e))best={n,e,o}}
  let o=best.o;const bezet=new Set();
  cyV.forEach((c,j)=>{let q=null,d=1e9;for(const k of bl){const e=Math.abs(k.c-c-o);if(e<d){d=e;q=k}}if(q&&d<.35*st&&!bezet.has(q)){uit[j]=q;bezet.add(q);o=.7*o+.3*(q.c-c)}});
  return{lijnen:uit,x0:Math.max(0,Math.round(cx-1.5*half)),x1:Math.min(W-1,Math.round(cx+1.5*half))}}
async function leesPagina(canvas,melding){canvas=zonderPen(canvas);
  const G=grijsVan(canvas),vak=zoekVakjes(G);
  const A=grijsContrast(kopieCanvas(canvas,1));melding('Tekst herkennen (1 van 2)…',0);const dA=await ocrData(A,m=>melding('Tekst herkennen (1 van 2)…',m));
  let rect=null;if(vak.length>=3){const mw=mediaan(vak.map(v=>v.w)),mh=mediaan(vak.map(v=>v.h)),x0=Math.max(0,Math.min(...vak.map(v=>v.x))-1.5*mw),y0=Math.max(0,vak[0].y-1.5*mh),x1=Math.min(canvas.width,Math.max(...vak.map(v=>v.x))+11*mw),y1=Math.min(canvas.height,vak[vak.length-1].y+2.5*mh);rect={x:x0,y:y0,w:x1-x0,h:y1-y0}}
  const f=Math.min(1.5,3000/Math.max(rect?rect.w:canvas.width,rect?rect.h:canvas.height));const B=grijsContrast(kopieCanvas(canvas,f,rect));melding('Tekst herkennen (2 van 2)…',0);const dB=await ocrData(B,m=>melding('Tekst herkennen (2 van 2)…',m));
  const datum=leesDatum(dA.text)||leesDatum(dB.text);
  const AL=vak.length>=3?artLijnen(G,vak,dA.words):{lijnen:[]};
  if(vak.length<3)return{datum,tekst:dA.text,regels:zonderVakjes(dA.text,dB.text)};
  /* woorden → vakje: elk woord naar het dichtstbijzijnde vakje (art.nr. staat soms iets lager dan de naam) */
  const perVak=vak.map(()=>[{art:[],naam:[],aant:[]},{art:[],naam:[],aant:[]}]),mw=mediaan(vak.map(v=>v.w));
  const isArt=t=>/^\d{4}([.,]\d{1,3})?$/.test(t.replace(/[|\]\[)(;:!'`’”“]/g,'').replace(/[.,]$/,''));
  const steek=vak.length>1?mediaan(vak.slice(1).map((v,j)=>(v.y+v.h/2)-(vak[j].y+vak[j].h/2))):vak[0].h*1.2;
  const plaats=(words,i,sc,ox,oy)=>{let W=words.filter(w=>w.bbox&&w.text.trim()).map(w=>({t:w.text.trim(),cx:(w.bbox.x0+w.bbox.x1)/2/sc+ox,cy:(w.bbox.y0+w.bbox.y1)/2/sc+oy,x0:w.bbox.x0/sc+ox,x1:w.bbox.x1/sc+ox,h:(w.bbox.y1-w.bbox.y0)/sc}));
    /* gesplitste nummers weer samenvoegen: '4404' + '006' */
    W.sort((a,b)=>a.x0-b.x0);for(const w of W){if(w.weg||!/^\d{4}[.,]?$/.test(w.t))continue;const n=W.find(q=>!q.weg&&q!==w&&/^[.,]?\d{1,3}$/.test(q.t)&&Math.abs(q.cy-w.cy)<.5*w.h&&q.x0>=w.x1-2&&q.x0-w.x1<1.5*w.h);
      if(n){w.t=w.t.replace(/[.,]$/,'')+'.'+n.t.replace(/^[.,]/,'');w.x1=n.x1;w.cx=(w.x0+w.x1)/2;n.weg=true}}W=W.filter(w=>!w.weg);
    /* art.nrs: herkennen aan de vorm; scheefstand: zoek de verschuiving waarbij de meeste nummers op een vakje vallen */
    const arts=W.filter(w=>isArt(w.t)&&w.cx>vak[0].x+3*mw&&w.cy>vak[0].y-2*steek&&w.cy<vak[vak.length-1].y+3*steek);
    const cyV=vak.map(v=>v.y+v.h/2);let best={n:-1,e:1e9,o:0};
    for(const w of arts)for(const c of cyV){const o=w.cy-c;if(Math.abs(o)>1.6*steek)continue;let n=0,e=0;for(const q of arts){const d=Math.min(...cyV.map(c2=>Math.abs(q.cy-o-c2)));if(d<.35*steek){n++;e+=d}}
      if(n>best.n||(n===best.n&&e<best.e))best={n,e,o}}
    const rxArt=arts.length?mediaan(arts.map(w=>w.cx-vak[0].x)):9*mw,versch=x=>best.o*Math.max(0,Math.min(1.2,(x-vak[0].x)/rxArt));
    /* één nummer per vakje: de dichtstbijzijnde */
    const kies=vak.map(()=>null);for(const w of arts){const cy=w.cy-best.o;let j=-1,d=1e9;cyV.forEach((c,k)=>{if(Math.abs(cy-c)<d){d=Math.abs(cy-c);j=k}});if(j>=0&&d<.45*steek&&(!kies[j]||d<kies[j].d))kies[j]={d,w}}
    kies.forEach((k,j)=>{if(k)perVak[j][i].art.push({x:k.w.cx,t:k.w.t})});
    for(const w of W){if(arts.includes(w))continue;const cy=w.cy-versch(w.cx);let j=-1,d=1e9;cyV.forEach((c,k)=>{if(Math.abs(cy-c)<d){d=Math.abs(cy-c);j=k}});if(j<0||d>.45*steek)continue;const v=vak[j],rx=w.cx-v.x;
      if(w.x0>v.x+.6*v.w&&rx<rxArt-.8*mw&&/[A-Za-z]/.test(w.t))perVak[j][i].naam.push({x:w.cx,t:w.t});
      else if(rx<.4*v.w&&rx>-1.4*v.w)perVak[j][i].aant.push({x:w.cx,t:w.t})}};
  plaats(dA.words,0,1,0,0);plaats(dB.words,1,f,rect.x,rect.y)
  const uitWoorden=o=>{const art=normArt((o.art.sort((a,b)=>a.x-b.x)[0]||{t:''}).t.replace(/[|\]\[)(;:!'`’”“]/g,'').replace(/[.,]$/,''));const n=o.naam.sort((a,b)=>a.x-b.x).map(w=>w.t).join(' ');
    const naam=n.replace(/^[^A-Za-z]*\d{0,2}\W*/,'').replace(/[_|\[\]{}()~“”"]/g,' ').replace(/\s+/g,' ').trim().toUpperCase().replace(/^[^A-Z]+/,'');
    const q=o.aant.sort((a,b)=>a.x-b.x).map(w=>w.t).join('').match(/(\d{1,2})\D*$/)||n.match(/^\W*(\d{1,2})\s*[\[{(|]/);
    return{artnr:/^\d{4}(\.\d{1,3})?$/.test(art)?art:'',naam,aantal:q?+q[1]:null}};
  const bek=bekendeArt(),T=maakSjablonen(!S.bakker||/eekeren/i.test(S.bakker)?PB_SJAB:{},S.pakbonCijfers),regels=[];
  for(let j=0;j<vak.length;j++){const v=vak[j],a=uitWoorden(perVak[j][0]),b=uitWoorden(perVak[j][1]),lez=[a,b];
    let artnr=(lez.find(x=>bek[x.artnr])||lez.find(x=>x.artnr)||{}).artnr||'',naam=[a.naam,b.naam].sort((x,y)=>y.length-x.length)[0]||'';
    /* onbekend of niet gelezen nummer: alleen het nummer nog eens lezen (alleen cijfers) */
    if(!bek[artnr]){melding('Regel nalezen…',0);const x0=Math.round(v.x+6.8*v.w),x1=Math.min(A.width,Math.round(v.x+10.3*v.w));
      const al=AL.lijnen[j];let extra=al?normArt(await ocrStuk(A,{left:AL.x0,top:Math.max(0,al.y0-3),width:AL.x1-AL.x0,height:al.y1-al.y0+7},true)):'';
      if(!/^\d{4}(\.\d{1,3})?$/.test(extra)||(!bek[extra]&&al))extra=(t=>/^\d{4}(\.\d{1,3})?$/.test(t)&&(bek[t]||!/^\d{4}(\.\d{1,3})?$/.test(extra))?t:extra)(normArt(await ocrStuk(A,{left:x0,top:Math.max(0,Math.round(v.y-.35*v.h)),width:x1-x0,height:Math.round(1.7*v.h)},true)));
      if(/^\d{4}(\.\d{1,3})?$/.test(extra)&&(bek[extra]||!artnr))artnr=extra}
    if(!naam){naam=(await ocrStuk(A,{left:Math.round(v.x+v.w+2),top:Math.round(v.y-.2*v.h),width:Math.round(6.2*v.w),height:Math.round(1.4*v.h)},false)).toUpperCase().replace(/[^A-Z0-9 .]/g,' ').replace(/\s+/g,' ').trim()}
    const sj=leesAantal(G,v,T),tv=lez.map(x=>x.aantal).filter(x=>x!=null&&x>0),la=sj?.tekst||'';
    const eens=la&&tv.length&&tv.every(t=>String(t)===la),zekerAantal=!!la&&(sj.marge>=.25||eens);
    const aantal=la?+la:tv.length?tv[0]:0;
    if(!naam&&!artnr&&!la)continue;
    regels.push({aantal,naam:naam||'(naam niet gelezen)',artnr,twijfel:!zekerAantal,glyphs:sj?.glyphs||[],sjab:la,tess:tv})}
  return{datum,tekst:dA.text,regels}}
/* geen vakjes gevonden (andere bon): twee lezingen naast elkaar leggen */
function zonderVakjes(tA,tB){const a=leesPakbonTekst(tA).regels,b=leesPakbonTekst(tB).regels,uit=[];
  for(const r of a){const o=b.find(x=>x.artnr===r.artnr);uit.push({...r,twijfel:!o||o.aantal!==r.aantal})}
  for(const r of b)if(!a.some(x=>x.artnr===r.artnr))uit.push({...r,twijfel:true});return uit}
function canvasNaarFoto(c){const sc=Math.min(1,1200/Math.max(c.width,c.height)),o=document.createElement('canvas');o.width=Math.round(c.width*sc);o.height=Math.round(c.height*sc);o.getContext('2d').drawImage(c,0,0,o.width,o.height);return o.toDataURL('image/jpeg',.7)}
/* koppelen: artnr → broodsoort */
function bekendeArt(){const k={};for(const s of S.soorten)if(s.type==='vers'&&s.naam.trim())for(const a of artnrsVan(s))k[a]=s.id;for(const a of S.pakbonNegeer||[])k[normArt(a)]='negeer';return k}
const kaleNaam=t=>t.toUpperCase().replace(/\b(HEEL|HALF|GESN\.?|GESNEDEN|CP|X|\d+|ST|STUKS|VGB|DECO|800)\b/g,' ').replace(/[^A-Z ]/g,' ').replace(/\s+/g,' ').trim();
function naamVoorstel(r){const kn=kaleNaam(r.naam).toLowerCase(),half=/^HALF/.test(r.naam)||/GESN/.test(r.naam),w1=kn.split(' ').filter(w=>w.length>2);let best=null,bs=0;
  const lijkt=(a,b)=>a===b||(a.length>3&&b.length>3&&Math.abs(a.length-b.length)<=2&&(a.slice(0,4)===b.slice(0,4)||lev(a,b)<=2));
  for(const s of S.soorten){if(s.type!=='vers'||!s.naam.trim()||artnrsVan(s).length)continue;if(half!==(s.gesneden!=='on'))continue;
    const w2=s.naam.toLowerCase().replace(/[^a-z ]/g,' ').split(' ').filter(w=>w.length>2&&!['half','gesneden','heel'].includes(w));if(!w2.length)continue;
    if(!w2.every(b=>w1.some(a=>lijkt(a,b))))continue;const sc=w2.length;if(sc>bs){bs=sc;best=s}}return best}
function naamLijkt(a,b){a=kaleNaam(a);b=kaleNaam(b);if(!a||!b)return false;return lev(a,b)<=Math.max(2,Math.round(Math.max(a.length,b.length)*.3))}
function koppelRegels(regels){const bek=bekendeArt(),keys=Object.keys(bek),namen=S.pakbonNamen||{};
  return regels.map(r=>{let k=r.artnr?bek[r.artnr]:null,zeker=!!k;
    /* 10.8.4: nummer niet gelezen → op naam zoeken in de namen die eerder bij een nummer hoorden (oranje) */
    if(!k&&!r.artnr){const kn=kaleNaam(r.naam),hh=(/^(HEEL|HALF)\b/.exec(r.naam)||[])[1]||'';let best=null,bd=99,twee=false;
      for(const[a,nm]of Object.entries(namen)){if(!bek[a])continue;if(((/^(HEEL|HALF)\b/.exec(nm)||[])[1]||'')!==hh)continue;const kb=kaleNaam(nm);if(!kn||!kb)continue;const d=Math.min(lev(kn,kb),kn.length>kb.length+2?lev(kn.slice(0,kb.length),kb)+1:99);
        if(d<bd){bd=d;best=a;twee=false}else if(d===bd&&bek[a]!==bek[best])twee=true}
      if(best&&!twee&&bd<=Math.max(2,Math.round(Math.max(kn.length,kaleNaam(namen[best]).length)*.25))){k=bek[best];r={...r,artGeraden:best}}}
    if(!k&&r.artnr){let best=null,bd=9;for(const a of keys){const d=lev(r.artnr,a);if(d<bd&&namen[a]&&naamLijkt(r.naam,namen[a])){bd=d;best=a}}
      if(best&&bd<=2)k=bek[best];
      /* zelfde 4 begincijfers en maar één cijfer anders (bijv. 4404.008 → 4404.006): koppelen, maar oranje */
      if(!k){const basis=r.artnr.slice(0,4),kand=keys.filter(a=>bek[a]!=='negeer'&&a.slice(0,4)===basis&&lev(a,r.artnr)<=Math.max(1,Math.abs(a.length-r.artnr.length)));
        if(kand.length===1&&new Set(kand.map(a=>bek[a])).size===1)k=bek[kand[0]];
        else if(kand.length>1){const s=new Set(kand.map(a=>bek[a]));if(s.size===1)k=bek[kand[0]]}}}
    const voorstel=k?null:naamVoorstel(r);return{...r,orig:r.orig??r.aantal,doel:k||(voorstel?voorstel.id:''),zeker,voorstel:!!voorstel,bekend:!!k}})}
/* scherm */
let scan=null;
async function startScan(file){
  const d=datum;scan={d,stap:'lezen',melding:'Pakbon lezen…'};toonScan();
  const melding=(t,m)=>{const pct=m&&m.progress&&/recogniz/.test(m.status)?' '+Math.round(m.progress*100)+'%':'';scan.melding=m&&/load|initializ/.test(m.status||'')&&!/recogniz/.test(m.status)?'Leesprogramma laden… (de eerste keer duurt dit even)':t+pct;zetScanMelding()};
  try{let canvassen=[],tekst='',p=null;
    if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){const r=await pdfNaarTekst(file);canvassen=r.canvassen;tekst=r.tekst;
      const t=leesPakbonTekst(tekst);if(t.regels.length>=2)p=t}
    else{canvassen=[await afbNaarCanvas(file)]}
    scan.foto=canvasNaarFoto(canvassen[0]);try{const c=canvassen[0],sc=Math.min(1,2200/Math.max(c.width,c.height)),o=document.createElement('canvas');o.width=Math.round(c.width*sc);o.height=Math.round(c.height*sc);o.getContext('2d').drawImage(c,0,0,o.width,o.height);scan.fotoHoog=o.toDataURL('image/jpeg',.85)}catch(e){}
    if(!p){p={datum:null,regels:[]};const tk=[];for(let i=0;i<canvassen.length;i++){const pre=canvassen.length>1?`Pagina ${i+1} van ${canvassen.length}: `:'';
        const r=await leesPagina(canvassen[i],(t,m)=>melding(pre+t,m));p.datum=p.datum||r.datum;p.regels.push(...r.regels);tk.push(r.tekst)}tekst=tk.join('\n')}
    scan={...scan,stap:'controle',datumBon:p.datum,regels:koppelRegels(p.regels),tekst};
    if(!scan.regels.length){scan.stap='fout';scan.melding='Er zijn geen regels herkend. Maak een rechte, scherpe foto zonder schaduw (of gebruik de iPhone-scanner) en probeer het opnieuw.'}
    toonScan()}
  catch(e){console.error(e);scan={d,stap:'fout',melding:/laden/.test(e.message||'')?'Het leesprogramma kon niet laden. De eerste keer is internet nodig.':'Lezen is mislukt: '+(e.message||e)};toonScan()}
}
function ocrMelding(m){const pct=m.progress?Math.round(m.progress*100)+'%':'';return/recogniz/.test(m.status)?`Tekst herkennen… ${pct}`:/load|initializ/.test(m.status)?'Leesprogramma laden… (de eerste keer duurt dit even)':'Pakbon lezen…'}
function zetScanMelding(){const el=document.getElementById('scanMelding');if(el)el.textContent=scan.melding}
function versOpties(sel){const l=S.soorten.filter(x=>x.type==='vers'&&x.naam.trim());
  return`<option value="" ${!sel?'selected':''}>– kies –</option>${l.map(x=>`<option value="${x.id}" ${sel===x.id?'selected':''}>${esc(x.naam)}${x.gesneden==='on'?' (heel)':' (gesneden)'}</option>`).join('')}<option value="negeer" ${sel==='negeer'?'selected':''}>Negeren (niet in de app)</option><option value="nieuw">+ Nieuwe broodsoort</option>`}
function scanTotalen(){const t={};for(const r of scan.regels)if(r.doel&&r.doel!=='negeer')t[r.doel]=(t[r.doel]||0)+r.aantal;return t}
function scanRang(r){return!r.doel?0:r.doel==='negeer'?3:(!r.zeker||r.twijfel)?1:2}
function toonScan(){
  if(scan.stap==='lezen'){toonSheet(`<div class="pkop"><button data-a="scanstop">Annuleren</button><b>Pakbon lezen</b><span style="width:70px"></span></div><div class="pinhoud"><div class="scanlader"><div class="spinner"></div><p id="scanMelding">${esc(scan.melding)}</p></div></div>`);return}
  if(scan.stap==='fout'){toonSheet(`<div class="pkop"><button data-a="scanstop">Terug</button><b>Pakbon lezen</b><span style="width:70px"></span></div><div class="pinhoud"><div class="kaartje"><b>Dat lukte niet</b><div class="sub">${esc(scan.melding)}</div></div><div class="knoppen"><label class="knop" style="margin:0">📷 Opnieuw proberen<input type="file" accept="image/*,application/pdf" id="scanIn" style="display:none"></label></div></div>`);return}
  const d=scan.d,datumAnders=scan.datumBon&&scan.datumBon!==d,bes=x=>dagTotaal(planKeyVoor(d),x),tot=scanTotalen(),open=scan.regels.filter(r=>!r.doel).length;
  const niet=S.soorten.filter(x=>x.type==='vers'&&x.naam.trim()&&!(x.id in tot)&&bes(x)>0);
  if(!scan.volgorde||scan.volgorde.length!==scan.regels.length)scan.volgorde=scan.regels.map((r,i)=>i).sort((a,b)=>scanRang(scan.regels[a])-scanRang(scan.regels[b])||a-b);
  const oudeScroll=document.querySelector('#paneel .pinhoud.scanlijst')?.scrollTop;
  toonSheet(`<div class="pkop"><button data-a="scanstop">Annuleren</button><b>Pakbon controleren</b><button data-a="scanok" style="font-weight:700">Overnemen</button></div><div class="pinhoud scanlijst">
   ${datumAnders?`<div class="kaartje waarschuw rood"><b>Let op: andere datum</b><div class="sub">De pakbon is van ${esc(datumTekst(scan.datumBon))}, je vult de levering in voor ${esc(datumTekst(d))}.</div></div>`:scan.datumBon?`<p class="hulp">✓ Pakbon van ${esc(datumTekst(scan.datumBon))}</p>`:''}
   <p class="hulp">Controleer de aantallen. <span class="oranjetekst">Oranje</span> = niet zeker of wijkt af van de bestelling.<br><b>${open?`${open} ${open===1?'regel':'regels'} nog koppelen`:'✓ Alle regels gekoppeld'}</b></p>
   <div class="sectie" style="margin:0">${scan.volgorde.map(i=>[scan.regels[i],i]).map(([r,i])=>{const s=S.soorten.find(x=>x.id===r.doel),b=s?bes(s):null,afw=s&&Math.abs(tot[s.id]-b)>=Math.max(3,Math.ceil(b*0.5)),let_=!r.doel||((!r.zeker||r.twijfel)&&r.doel!=='negeer')||afw;
     return`<div class="rij inv scanrij ${let_?'aandacht':''} ${r.doel==='negeer'?'genegeerd':''}" style="flex-wrap:wrap"><div class="groei"><div class="naam" style="font-size:15px">${esc(r.naam)}</div><div class="sub">${r.artnr?'art. '+esc(r.artnr):r.artGeraden?'art. '+esc(r.artGeraden)+' (herkend op naam)':'art.nr. niet gelezen'}${r.voorstel?' · <b>voorstel</b>':''}${!r.zeker&&r.bekend?' · nummer niet zeker gelezen':''}${r.twijfel&&r.doel!=='negeer'?' · <b>aantal nakijken</b>':''}${s&&b!=null?` · besteld ${b}`:''}</div>
      <select class="veld scankeuze" data-scan="${i}">${versOpties(r.doel)}</select></div>
      <div class="stepper"><button data-a="scanstap" data-v="${i}" data-n="-1">−</button><input readonly value="${r.aantal}"><button data-a="scanstap" data-v="${i}" data-n="1">+</button></div></div>`}).join('')}</div>
   ${niet.length?`<div class="kaartje waarschuw"><b>Niet op de pakbon gevonden</b><div class="sub">${niet.map(x=>`${esc(x.naam)} (besteld ${bes(x)})`).join(', ')}. Deze komen op 0 te staan. Controleer of een regel is overgeslagen.</div></div>`:''}
   <p class="hulp">Gekozen koppelingen worden onthouden, dus de volgende keer gaat het vanzelf.</p>
   <div class="knoppen"><button class="knop rand klein" data-a="pbfout">⚠️ Leesfout melden</button></div><p class="hulp" style="text-align:center;margin-top:0">Klopt er iets niet aan het lezen? Meld het, dan kan het scannen beter worden.</p></div>`);
  if(oudeScroll!=null){const el=document.querySelector('#paneel .pinhoud.scanlijst');if(el)el.scrollTop=oudeScroll}
}
function scanNieuweSoort(i){const r=scan.regels[i],half=/^HALF/.test(r.naam)||/GESN/.test(r.naam),kn=kaleNaam(r.naam).toLowerCase(),naam=(half?'Half ':'')+kn.replace(/\b\w/g,c=>c.toUpperCase())+(half?' gesneden':'');
  const voorbeeld=S.soorten.find(x=>x.type==='vers'),id=nieuwId();
  S.soorten.push({id,naam:naam.trim()||r.naam,kar:voorbeeld?.kar??karNrs()[0]??1,type:'vers',gesneden:half?'voor':'on',groep:'',min:0,max:null,temp:null,baktijd:null,perDoos:null,programma:'',programmaId:null,instructie:'',plu:'',pluHalf:'',allergenen:[],ingredienten:'',nieuwSinds:null,artnr:r.artnr,snijStandaard:half?undefined:'half'});
  r.doel=id;r.zeker=true;log(`Broodsoort ${naam} aangemaakt vanuit pakbon`);bewaar();toast(`${naam} aangemaakt – vul later de PLU in bij Broodsoorten`)}
/* goedgekeurde cijfers onthouden: alleen als de cijferlezing klopte of beide tekstlezingen hetzelfde zeiden */
function leerCijfers(regels){const C=S.pakbonCijfers=S.pakbonCijfers||{};let n=0;
  for(const r of regels){const t=String(r.aantal);if(!r.glyphs||r.glyphs.length!==t.length||r.doel==='negeer')continue;
    if(!(t===r.sjab||(r.tess&&r.tess.length>=2&&r.tess.every(x=>String(x)===t))))continue;
    r.glyphs.forEach((h,i)=>{const d=t[i],l=C[d]=C[d]||[];if(!l.includes(h)){l.push(h);n++;if(l.length>15)l.shift()}})}return n}
function scanOvernemen(){
  const open=scan.regels.filter(r=>!r.doel);if(open.length&&!confirm(`${open.length} ${open.length===1?'regel is':'regels zijn'} nog niet gekoppeld en ${open.length===1?'wordt':'worden'} overgeslagen. Doorgaan?`))return;
  S.pakbonNamen=S.pakbonNamen||{};leerCijfers(scan.regels);for(const r of scan.regels){if(!r.doel||!r.artnr)continue;if(r.zeker||!r.bekend)S.pakbonNamen[r.artnr]=r.naam;
    if(r.doel==='negeer'){S.pakbonNegeer=[...new Set([...(S.pakbonNegeer||[]),r.artnr])];continue}
    const s=S.soorten.find(x=>x.id===r.doel);if(s&&!artnrsVan(s).includes(r.artnr)&&(r.zeker===false?!r.bekend:true)){s.artnr=[...artnrsVan(s),r.artnr].join(', ')}
    if(s)S.pakbonNegeer=(S.pakbonNegeer||[]).filter(a=>a!==r.artnr)}
  const tot=scanTotalen(),voor={};for(const x of S.soorten.filter(x=>x.type==='vers'&&x.naam.trim()))voor[x.id]=tot[x.id]||0;
  const let_=new Set(scan.regels.filter(r=>r.doel&&r.doel!=='negeer'&&(!r.zeker||r.twijfel)).map(r=>r.doel));
  log(`Pakbon gescand (${datumTekst(scan.d)})`);bewaar();const foto=scan.foto;const pbNaam={};for(const r of scan.regels)if(r.doel&&r.doel!=='negeer'&&!pbNaam[r.doel])pbNaam[r.doel]=`${r.naam}${r.artnr?` (${r.artnr})`:''}`;scan=null;openLevering({voor,foto,let:let_,pakbon:voor,pbNaam});
}

function openLevering(opt={}){
  const d=datum,lv=S.levering[d],l=S.soorten.filter(x=>x.type==='vers'&&x.naam.trim());bewerk={soort:'levering',foto:opt.foto||null,pakbon:opt.pakbon||lv?.pakbon||null,pbNaam:opt.pbNaam||lv?.pbNaam||null};const PB=bewerk.pakbon;
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Levering ${esc(datumTekst(d))}</b><button data-a="levopslaan" style="font-weight:700">Opslaan</button></div><div class="pinhoud">
   ${heeft('scan')?`<label class="knop scanknop">📷 Pakbon scannen (foto of PDF)<input type="file" accept="image/*,application/pdf" id="scanIn" style="display:none"></label>`:`<button class="knop rand scanknop" data-a="slotfunctie" data-v="scan">${SLOT} Pakbon scannen</button>`}
   ${opt.voor||!heeft('scan')?'':IS_ANDROID?`<p class="hulp scantip">💡 <b>Tip Android:</b> scan de pakbon met de <b>Google Drive</b>-app (<b>＋</b> → <b>Scannen</b>) en kies hier daarna de pdf. Drive knipt de pakbon recht en zonder schaduw bij. Een gewone foto kan ook.</p>`:`<p class="hulp scantip">💡 <b>Tip iPhone:</b> tik op <b>Kies bestand</b> → <b>⋯</b> (rechtsboven) → <b>Scan documenten</b>. Je iPhone knipt de pakbon dan recht en zonder schaduw bij. Tik daarna op Bewaar.</p>`}
   <p class="hulp">${PB?'✓ Ingevuld vanaf de pakbon. <b>Tel de levering</b> en pas alleen aan wat afwijkt. Tik dan op Opslaan.':'Scan de pakbon, of neem de aantallen zelf over. Leeg = niets geleverd. Grijs = besteld.'}</p>
   <div class="sectie" style="margin:0">${l.map(x=>{const bes=PB?(PB[x.id]??0):dagTotaal(planKeyVoor(d),x),w=opt.voor?opt.voor[x.id]:lv?.items?.[x.id];return`<div class="rij inv ${opt.let?.has(x.id)?'aandacht':''}"><div class="groei"><div class="naam">${esc(x.naam)}</div><div class="sub">${PB?'pakbon':'besteld'} ${bes}${x.gesneden==='on'?' · ongesneden':''}</div></div>
     <div class="stepper"><button data-a="levstap" data-v="${x.id}" data-n="-1">−</button><input inputmode="numeric" maxlength="3" readonly data-blok id="lev-${x.id}" value="${w??''}" placeholder="${bes}"><button data-a="levstap" data-v="${x.id}" data-n="1">+</button></div></div>`}).join('')}</div>
   <label>Foto van de pakbon (optioneel)</label><div class="notitieform" style="margin:0"><label class="fotoknop ${lv?.fotoId||opt.foto?'aan':''}" id="levFotoKnop">${lv?.fotoId||opt.foto?'✓':'📷'}<input type="file" accept="image/*" id="levFotoIn" style="display:none"></label><span class="hulp" style="margin:auto 0">${opt.foto?'De gescande pakbon wordt als foto bewaard.':lv?.fotoId?'Er is al een foto. Kies een nieuwe om te vervangen.':'Maak een foto van de pakbon.'}</span></div>
   <div class="fout" id="fout"></div></div>`);
}
function histTabel(hs){const b=hs.some(x=>x.bij);return`<div class="histtab"><table><tr><th>Datum</th><th>Opgezet</th>${b?'<th>Bij</th>':''}<th>Over</th><th>Verkocht</th></tr>${hs.map(x=>`<tr><td>${datumTekst(x.d)}</td><td>${fmt(x.gezet)}</td>${b?`<td>${x.bij?fmt(x.bij):''}</td>`:''}<td>${fmt(x.der)}</td><td>${fmt(x.verkocht)}</td></tr>`).join('')}</table>${b?'<div class="hulp" style="margin:4px 0 0">Opgezet is inclusief bijgebakken. Bijbakken verhoogt het advies niet.</div>':''}</div>`}

function notitiesHtml(d){
  const lijst=Object.values(S.notities[d]||{}).sort((a,b)=>a.t-b.t);
  return`<div class="notities">${lijst.map(n=>`<div class="notitie">${notFotoSrc(n)?`<button class="notfoto" data-a="notfoto" data-v="${esc(n.id)}"><img src="${notFotoSrc(n)}" alt=""></button>`:''}<div><div>${esc(n.tekst)}</div><div class="wie">${esc(n.wie)}, ${tijdTekst(n.t)}</div></div>${isAdmin()||n.wie===ik()?.naam?`<button data-a="notweg" data-v="${esc(n.id)}">×</button>`:''}</div>`).join('')}
   <div class="notitieform"><label class="fotoknop ${notFoto?'aan':''}" aria-label="Foto toevoegen">${notFoto?'✓':'📷'}<input type="file" accept="image/*" id="notFotoIn" style="display:none"></label><input id="notitieIn" placeholder="${lijst.length?'Notitie toevoegen':'Dagnotitie, bijv. croissants later geleverd'}" maxlength="200"><button data-a="notitie">+</button></div></div>`;
}
function openAanpas(id){
  const s=S.soorten.find(x=>x.id===id);if(!s)return;const gepland=stuksIn(planKeyVoor(datum),moment,s),nu=werkelijk(datum,moment,s);
  bewerk={soort:'aanpas',id,n:nu};
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Aantal aanpassen</b><button data-a="aanpasopslaan" style="font-weight:700">Opslaan</button></div>
   <div class="pinhoud"><div class="naam" style="font-size:20px;margin-top:14px">${esc(s.naam)}</div><p class="hulp">${esc(datumTekst(datum))}${S.momenten.length>1?`, ${esc(momentNaam(moment).toLowerCase())}`:''} – gepland: <b>${gepland}</b>. Alleen voor deze dag.</p>
   <div class="grootstep"><button data-a="aanpasstap" data-n="-1">−</button><input id="aanpasIn" inputmode="numeric" maxlength="4" value="${nu}"><button data-a="aanpasstap" data-n="1">+</button></div>
   <p class="hulp">0 = vandaag niet klaarzetten (verdwijnt uit de lijst).</p>
   ${S.aanpas[datum]?.[moment]?.[id]!=null?`<div class="knoppen"><button class="knop rand" data-a="aanpasterug">Terug naar planning (${gepland})</button></div>`:''}</div>`);
}
/* 10.8.5 volgorde in keuzelijsten: eigen volgorde of A–Z (per toestel onthouden) */
const volgAZ=()=>L.volgorde==='az',volg=l=>volgAZ()?[...l].sort((a,b)=>a.naam.localeCompare(b.naam,'nl',{numeric:true,sensitivity:'base'})):l;
let keuzeZoek='';const zoekPast=x=>!keuzeZoek.trim()||x.naam.toLowerCase().includes(keuzeZoek.trim().toLowerCase());
const zoekVeld=()=>`<input class="veld" id="keuzeZoek" type="search" placeholder="🔍 Zoeken" autocomplete="off" value="${esc(keuzeZoek)}" style="margin-top:8px">`;
const volgKnop=()=>zoekVeld()+volgChips();
const volgChips=()=>`<div class="chips volgkeuze" style="margin:6px 0 0;align-items:center"><span class="sub" style="margin-right:4px">Volgorde:</span><button class="chip ${volgAZ()?'':'aan'}" data-a="volgorde" data-v="eigen">Eigen</button><button class="chip ${volgAZ()?'aan':''}" data-a="volgorde" data-v="az">A–Z</button></div>`;
function ontChipsHtml(){const l=[...volg(S.soorten.filter(s=>s.type==='ontdooien'&&s.naam.trim())),...volg(S.soorten.filter(s=>s.type!=='ontdooien'&&s.naam.trim()))];return l.filter(s=>zoekPast(s)||bewerk?.id===s.id).map(s=>`<button class="chip ${bewerk?.id===s.id?'aan':''}" data-a="ontkies" data-v="${s.id}">${esc(s.naam)}</button>`).join('')}
function openExtra(){
  bewerk={soort:'extra',keuze:{}};keuzeZoek='';
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Extra klaarzetten</b><button data-a="extraopslaan" style="font-weight:700">Toevoegen</button></div>
   <div class="pinhoud"><p class="hulp">Alleen voor ${esc(datumTekst(datum))}${S.momenten.length>1?`, ${esc(momentNaam(moment).toLowerCase())}`:''}. Tik alles aan wat erbij moet. Soorten die al op de lijst staan pas je aan met ✎.</p>${volgKnop()}<div id="extraLijst"></div></div>
   <div class="bijvoet" id="extraVoet"></div>`);
  renderExtraSheet();
}
function extraStart(s){return s.type==='afbakken'?(s.max||12):1}
function renderExtraSheet(){
  const k=bewerk.keuze,vrij=S.soorten.filter(s=>s.naam.trim()&&werkelijk(datum,moment,s)===0&&(zoekPast(s)||k[s.id]));
  const groepen=[...karNrs().map(nr=>[karNaam(nr),volg(vrij.filter(s=>s.type!=='vers'&&effKar(s)===nr))]),['Vers brood',volg(vrij.filter(s=>s.type==='vers'))]].filter(g=>g[1].length);
  document.getElementById('extraLijst').innerHTML=groepen.length?groepen.map(([t,l])=>`<div class="sectie" style="margin:10px 0 0"><div class="karkop"><b>${esc(t)}</b></div>${l.map(s=>{const c=k[s.id],eenheid=s.type==='vers'?'broden':'stuks';
    const pl=c&&s.type==='afbakken'?Math.ceil(c/(s.max||c)):0;
    return`<div class="rij"><button class="regel ${c?'gekozen':''}" data-a="extrakies" data-v="${s.id}">${sFoto(s.id)?`<img class="duim klein" src="${sFoto(s.id)}" alt="">`:''}<div class="groei"><div class="naam">${esc(s.naam)}</div><div class="sub">${s.type==='afbakken'?`max. ${s.max} per plaat`:s.type==='ontdooien'?'ontdooien, in stuks':'vers geleverd'}</div></div><div class="kiesvak">${c?'✓':''}</div></button>
    ${c?`<div class="bijregel"><div><span>Aantal</span><div class="stepper"><button data-a="extrastap" data-v="${s.id}" data-n="-1">−</button><input readonly value="${c}"><button data-a="extrastap" data-v="${s.id}" data-n="1">+</button></div></div><b class="bijtot">${c} ${eenheid}${pl?` = ${pl} ${pl===1?'plaat':'platen'}`:''}</b></div>`:''}</div>`}).join('')}</div>`).join(''):keuzeZoek.trim()?'<p class="leeg" style="margin:10px 0">Niets gevonden.</p>':'<p class="leeg" style="margin:10px 0">Alle soorten staan al op de lijst. Pas het aantal aan met ✎.</p>';
  const ids=Object.keys(k),tot=ids.reduce((a,id)=>a+k[id],0);
  document.getElementById('extraVoet').innerHTML=(ids.length?`<b>${ids.length} ${ids.length===1?'soort':'soorten'}, ${tot} stuks</b>`:'<span class="sub">Nog niets aangetikt.</span>')+'<div class="fout" id="fout"></div>';
}

function allesKlaar(d,m){const r=[...maakLijst(d,m).flatMap(x=>x.regels),...versRegels(d,m)];if(!r.length)return false;const v=S.vinkjes[d]?.[m]||{};return r.every(x=>v[x.s.id])}
function toonFeest(){if(!prof().feest)return;const n=[...maakLijst(datum,moment).flatMap(x=>x.regels),...versRegels(datum,moment)].length,el=document.getElementById('feest');
  el.innerHTML=`<div class="feestkaart"><div class="confetti">${Array.from({length:18},(_,i)=>`<i style="left:${(i*37)%100}%;animation-delay:${(i%6)*0.12}s;background:${['#fff','#ffd9a8','#e30613'][i%3]}"></i>`).join('')}</div>
   <svg width="150" height="100" viewBox="0 0 300 200" aria-hidden="true">${CROISSANT('#fff','#f17d04')}</svg><div class="feesttitel">Alles klaargezet! 🎉</div>
   <div class="feestsub">${esc(momentNaam(moment))} – ${n} van ${n}</div><div class="feestsub">Goed gedaan, ${esc((ik()?.naam||'').split(' ')[0])}</div><button class="merkknop" data-a="feestdicht">Top!</button></div>`;
  el.classList.add('open')}
function zetVink(id,n,aan){if(aan)tril();
  S.vinkjes[datum]=S.vinkjes[datum]||{};const vk=S.vinkjes[datum][moment]=S.vinkjes[datum][moment]||{};
  if(aan)vk[id]={n,t:Date.now(),wie:ik()?.naam||''};else delete vk[id];
}

/* ---------- Oven ---------- */
function ovenGekozen(sec){
  const uit=[];for(const s of sec){const gezien={};for(const r of s.regels){const gk=gKey(s.nr,r);if(ovenKeuze[gk]==null)continue;
    if(!gezien[gk]){gezien[gk]={gk,n:ovenKeuze[gk],plaat:r.plaat,regels:[]};uit.push(gezien[gk])}gezien[gk].regels.push(r)}}
  return uit;
}
function ovenBalk(sec){
  const gek=ovenGekozen(sec),regels=gek.flatMap(g=>g.regels),totaal=gek.reduce((t,g)=>t+g.n,0);
  const temps=[...new Set(regels.map(r=>r.s.temp).filter(x=>x>0))],progs=[...new Set(regels.map(r=>(r.s.programma||'').trim()).filter(Boolean))];
  const teVeel=totaal>S.ovenMax,w=[];
  if(teVeel)w.push(`maximaal ${S.ovenMax} platen in de oven`);if(progs.length>1)w.push("verschillende programma's");else if(temps.length>1)w.push('verschillende temperaturen');
  return`<div class="ovenbalk"><div>${gek.length?`<b>${totaal} van max. ${S.ovenMax} platen</b>${progs.length?` – prog. ${progs.map(esc).join(' / ')}`:''}${temps.length?` – ${temps.join('/')}°C`:''}`:'Tik aan wat de oven in gaat en kies het aantal platen.'}${w.length?`<div class="let">Let op: ${w.join(', ')}!</div>`:''}</div>
    <div class="rijtje"><button class="knop rand" data-a="ovenmodus">Annuleren</button><button class="knop" style="margin-left:auto" data-a="ovenklaar" ${gek.length&&!teVeel?'':'disabled'}>Afgebakken</button></div></div>`;
}
function openAfbak(gk){
  const f=vindGroep(gk);if(!f)return;const nu=afgebakken(gk);bewerk={soort:'afbak',gk,max:f.r.aantalPlaten};
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Afgebakken</b><button data-a="afbakopslaan" style="font-weight:700">Opslaan</button></div>
   <div class="pinhoud"><div class="naam" style="font-size:20px;margin-top:14px">Plaat ${esc(f.r.plaat)}: ${esc(f.r.s.naam)}</div><p class="hulp">Hoeveel van de ${f.r.aantalPlaten} ${f.r.aantalPlaten===1?'plaat is':'platen zijn'} afgebakken? Zet op 0 om ongedaan te maken.</p>
   <div class="grootstep"><button data-a="afbakstap" data-n="-1">−</button><input id="aanpasIn" inputmode="numeric" maxlength="2" value="${nu}"><button data-a="afbakstap" data-n="1">+</button></div></div>`);
}



let timerSig='';




const UITLEG=[
 ['bestelboeken','Bestelboeken','Het bestelboek van de leverancier komt vanzelf binnen: één keer per dag kijkt de app of het bestelboek van deze of volgende week online staat en leest het in. Met ⬇️ Haal bestelboek op doe je dat meteen; met Pdf kiezen lees je zelf een pdf in. Daarna maak je eigen boeken (bijvoorbeeld Brood of AGF): kies de artikelen en maak er een PDF met barcodes van. Nieuwe en verdwenen artikelen zie je hier bovenaan.'],
 ['kassa','Kassaverkoop','Het advies voor klaarzetten rekent met wat er echt over de kassa ging. Daarvoor haalt Brood Opzet elke paar uur de kassaverkoop per PLU uit Coop Besteladvies. Vul bij Beheer → Kassaverkoop één keer het adres en de koppelcode in en zorg dat elke bake-off-soort zijn PLU heeft (Soorten). Is er geen kassagegeven voor een dag, dan rekent het advies zoals vroeger met de derving. Onder Kassa-controle zie je per soort de kassa naast klaargezet min over; oranje betekent een groot verschil.'],
 ['klaarzetten','Klaarzetten','Hier zie je per kar wat er vandaag klaargezet moet worden, met het plaatnummer links. Tik op een regel om hem af te vinken; tik nog eens om het vinkje weg te halen. Met ‹ › blader je naar een andere dag. Met ⋯ rechts bij een regel zie je productinfo of pas je het aantal aan. Met ⋯ bovenin vind je Zoeken, Afvinken (schermvullend), Oven vullen en de dagnotitie.'],
 ['aanpassen','Aantal aanpassen en extra','Met ⋯ → Aantal aanpassen bij een regel pas je het aantal van een soort alleen voor die dag aan, bijvoorbeeld 15 kaiser omdat er maar 15 zijn. De lijst toont dan "gepland 16". Zet je het op 0, dan verdwijnt de soort. Met "+ Extra klaarzetten" zet je voor die dag iets bij dat niet gepland stond.'],
 ['werkmodus','Afvinken (schermvullend)','Tik op Klaarzetten bovenin op ⋯ en dan Afvinken. Schermvullend, één plaat tegelijk met grote letters, foto, ovenprogramma en werkinstructie. Tik op "Klaar – volgende" om de plaat af te vinken en door te gaan.'],
 ['oven','Oven','Tik op Klaarzetten bovenin op ⋯ en dan "Oven vullen", tik de soorten aan die de oven in gaan en kies met − en + hoeveel platen. De app waarschuwt als je boven het maximum komt of programma\'s mengt. Tik op "Afgebakken" als de lading klaar is. Per soort zie je daarna hoeveel platen afgebakken zijn; tik daarop om het te wijzigen of ongedaan te maken.'],
 ['bijbakken','Bijbakken','Is er iets op tijdens de dag? Tik op Klaarzetten op Bijbakken en tik alle soorten aan die je wilt bijbakken. Elke soort staat meteen op 1 plaat met het maximum per plaat; pas met − en + de platen en de stuks per plaat aan (bijv. 12 naar 9). Tik op In de oven: alles komt als één lading in het blok Bijgebakken. Tik op Afgebakken als de lading klaar is. Bijbakken telt mee als opgezet en gaat van de voorraad af, maar verhoogt het advies niet. In de historie en het weekrapport zie je hoe vaak er is bijgebakken.'],
 ['vers','Vers brood','Vers brood staat onderaan Klaarzetten. Vul elke dag eerst de levering in met de knop Levering invullen (pakbon): neem de aantallen over van de pakbon en maak eventueel een foto. Daarna rekent de app met het geleverde aantal. Bij ongesneden brood stel je met twee regelaars in hoeveel hele en hoeveel halve broden je maakt, elk met een eigen PLU om te stickeren. Je kunt nooit boven het geleverde aantal uitkomen. Blijft er iets over, bijvoorbeeld een half brood door een gat, tik dan op Derven: het komt bij Derving te staan en je slaat het daar op met Lijst opslaan.'],
 ['invullen','Invullen (planning)','Kies bovenaan de dag (maandag t/m zondag). Vul per soort het aantal stuks in. Een leeg vakje bij dinsdag t/m zondag betekent: zelfde als maandag (grijs getal). 0 betekent: niet klaarzetten. Met "Kopieer naar…" zet je een dag in één keer over naar andere dagen.'],
 ['advies','Advies','Als er een paar dagen derving is ingevuld, rekent de app uit hoeveel er gemiddeld verkocht wordt. Ma t/m vr tellen samen; zaterdag en zondag apart. "Advies gebruiken" of "Alles op advies" past de planning aan; je ziet eerst wat er verandert.'],
 ['derving','Derving','Vul met − en + in wat er weg moet. Standaard zie je vandaag en Weggegooid; met ⋯ bovenin kies je een andere dag, Voedselbank of TGTG, de volgorde of een notitie. Tik op Lijst opslaan: je krijgt een compacte lijst met naam, PLU en aantal om in de kassa over te nemen, en de tellers staan weer op nul. Zo kun je \'s ochtends en \'s avonds een lijst opslaan. De lijsten vind je via Opgeslagen lijsten op Derving en onder Meer → Dervinglijsten. Vink per regel af wat in de kassa staat en tik op Verwerkt in kassa.'],
 ['ontdooi','Ontdooien zoet','Een lijst die je zelf vult met wat er uit de vriezer moet, bijvoorbeeld voor morgen. Kies een broodsoort of typ vrije tekst. Vink af wat eruit is. Staat er iets op de lijst, dan zie je een kaart op Klaarzetten.'],
 ['afwijkend','Afwijkende dagen','Een eigen planning voor één datum, zoals een feestdag. Kies bij het aanmaken "Kopie van gewone planning" of "Alles op 0 (gesloten)". Via "Aantallen" pas je de planning van die dag aan.'],
 ['bestel','Deegbestelling en voorraad','Tel af en toe de voorraad in de vriezer (dozen + losse stuks). Wat daarna wordt afgevinkt op Klaarzetten gaat er automatisch af. Kies je leverdagen; de app rekent uit hoeveel dozen je moet bestellen tot de levering daarna. Vers brood telt niet mee.'],
 ['rapport','Weekrapport','Per week: wat er opgezet is, wat er over was en het dervingspercentage per soort, plus opvallende soorten en de dagnotities. Met "Delen" stuur je het door.'],
 ['soorten','Broodsoorten en instellingen','Per soort stel je in: soort product (afbakken, ontdooien of vers geleverd), standaard kar, min/max per plaat, ovenprogramma, baktijd, stuks per doos, werkinstructie en foto. Hier beheer je ook karren, bakmomenten en het maximum aantal platen in de oven.'],
 ['team','Medewerkers en rechten','Alleen de beheerder, op zijn eigen gekoppelde telefoon. Voeg medewerkers toe met een pincode en zet per persoon rechten aan of uit. Onderdelen zonder recht staan grijs met een slotje.'],
 ['instellingen','App-instellingen','Medewerkers zien hier alleen weergave, pushmeldingen en hun pincode. Onder Meer → App-instellingen richt de beheerder de app naar eigen smaak in: licht of donker, tekstgrootte, compacte lijst, foto\'s, achtergrondpatroon, PLU-nummers, je eigen emoji, een accentkleur, de startpagina, je standaard bakmoment en de meldingen. Het geldt alleen voor jou en werkt op elk toestel waar je inlogt.'],
 ['programmas',"Bakprogramma's","Onder Meer → Bakprogramma's beheer je de ovenprogramma's met temperatuur en baktijd. Tik op een programma en tik de producten aan die erbij horen; zo koppel je veel producten in één keer. Een product hoort bij één programma. Pas je de temperatuur of baktijd aan, dan geldt dat meteen voor alle gekoppelde producten. Bij een broodsoort kies je het programma uit de lijst."],
 ['kantoor','Kantoor','Alleen voor de beheerder: facturen, te betalen, cadeaubonnen, uren, rapporten en de beheerinstellingen bij elkaar, zodat Meer kort blijft. Medewerkers zien Kantoor niet. Tik op ☆ bij een onderdeel om het als favoriet bovenaan Meer te zetten. Zoeken in Meer vindt ook alles in Kantoor.'],
 ['zoeken','Zoeken en productinfo','Op Klaarzetten tik je bovenin op ⋯ en dan Zoeken: zoek op naam of PLU. Met ⋯ → Productinfo bij een regel zie je foto, werkinstructie, programma, allergenen en ingrediënten.'],
 ['ongedaan','Ongedaan maken','Na afvinken, afgebakken, bijbakken of een aangepast aantal verschijnt onderaan kort een balk met "Ongedaan maken". Tik erop om je laatste actie terug te draaien.'],
 ['kartaak','Taken per kar','De beheerder (of wie het recht Invullen heeft) tikt op de kop van een kar om iemand toe te wijzen voor die dag. Jouw eigen kar staat bovenaan. Bij elk vinkje staan de voorletters en de tijd van wie het deed.'],
 ['afsluiten','Dag afsluiten','Onder Meer → Dag afsluiten zie je wat er aan het eind van de dag nog moet: afvinken, derving en Ontdooien zoet voor morgen. Laat eventueel een notitie voor morgen achter en tik op Dag afsluiten.'],
 ['berichten','Chat','Privé-gesprekken met medewerkers, een teamchat waarin iedereen meeleest, en mededelingen aan iedereen. Tik op een bericht voor een emoji, antwoorden, kopiëren, wijzigen of verwijderen. Met ＋ stuur je een foto, iets uit de app, een stemming of plan je een bericht in; met 🎤 spreek je een bericht in. Onder ⋯ kun je een melding afhandelen, een gesprek dempen, archiveren of als PDF delen. Bij ⚙︎ Instellingen kies je de snelle antwoorden en meldingen, de teamchat, automatische berichten, de herinnering en hoe lang berichten bewaard blijven.'],
 ['gedaan','Vandaag gedaan','Alleen voor de beheerder: per persoon wat er op een dag is gedaan, met tijden. Blader met ‹ › naar andere dagen.'],
 ['printen','Printen','Onder de lijst op Klaarzetten staat Printen: de klaarzetlijst per kar op A4, met plaatnummers, PLU en vinkvakjes. Via het printmenu kun je ook een PDF delen.'],
 ['feest','Feestdagen','Drie weken voor een feestdag verschijnt op Klaarzetten een voorstel om er een afwijkende dag van te maken: kopie van de planning, gesloten of niet nodig.'],
 ['weer','Weer','Bij Klaarzetten en Invullen zie je het weer bij de winkel met een hint bij opvallend weer. Het advies verandert daar niet vanzelf door.'],
 ['nieuw','Nieuwe producten','Zet bij een broodsoort "Nieuw product" aan. Onder Meer → Nieuwe producten zie je per week hoe het verkoopt.'],
 ['export','Exporteren naar Excel','Onder Meer → Exporteren kies je derving, weekrapport of planning en een periode. Het Excel-bestand deel je via het deelmenu: opslaan, mailen of versturen.'],
 ['begeleid','Winkel-iPhone: alleen Brood Opzet (Begeleide toegang)','Zo zorg je dat op de winkel-iPhone alleen Brood Opzet open kan. 1) Open Instellingen → Toegankelijkheid → Begeleide toegang en zet het aan. 2) Tik op Toegangscode-instellingen → Stel toegangscode in en kies een code die alleen jij kent. 3) Open Brood Opzet vanaf het beginscherm. 4) Druk 3 keer snel op de zijknop en tik rechtsboven op Start. Nu kan niemand de app verlaten. Stoppen: druk weer 3 keer op de zijknop, vul je code in en tik linksboven op Stop. Tip: zet bij Begeleide toegang ook Automatische vergrendeling op Nooit als de telefoon aan de lader in de winkel ligt.'],
 ['oefenen','Oefenen','Via Meer → Uitleg → Oefenen werkt de app tijdelijk met een kopie van de gegevens. Je kunt alles uitproberen: afvinken, derving, bijbakken. Er wordt niets echt opgeslagen. Met Stoppen in de oranje balk ga je terug naar de echte app.'],
 ['pakbonnen','Pakbonnen','Hier zoek je eerdere leveringen terug. Per dag zie je wat er op de pakbon stond, wat er geteld is en het verschil, met de foto van de pakbon. Met Delen stuur je het verschil naar de bakker.'],
 ['telling','Levering tellen','De pakbon is de bestelling. Na het scannen staan de aantallen van de pakbon al ingevuld. Tel de levering en pas alleen aan wat afwijkt. Wijkt de telling af, dan zie je na Opslaan het verschil en kun je het met één tik naar de bakker sturen (WhatsApp, mail of sms).'],
 ['gemak','Sneller werken','Tik op een aantal bij Levering of Derving: er komt een groot cijferblok. Met Volgende ga je meteen naar de volgende regel, zo tel je de hele lijst achter elkaar af. Op Klaarzetten kun je een regel naar rechts vegen om af te vinken en naar links om het vinkje weg te halen. Met ✓ Alles bij een kar vink je de hele kar in één keer af (je kunt het ongedaan maken).'],
 ['pakbon','Pakbon scannen','Bij Levering invullen tik je op Pakbon scannen. Maak een foto, kies er een uit je fotobibliotheek of kies een PDF. De app leest de regels en koppelt ze op artikelnummer aan jullie broodsoorten. De eerste keer kies je bij elke regel de juiste broodsoort, Negeren of + Nieuwe broodsoort; dat wordt onthouden. Oranje regels zijn niet zeker of wijken af van de bestelling: controleer die. Met Overnemen komen de aantallen in de levering, daarna tik je op Opslaan. Tip: een rechte foto zonder schaduw leest het best. Op de iPhone kan het nog beter: Pakbon scannen → Kies bestand → ⋯ → Scan documenten. Op Android: scan met de Google Drive-app (＋ → Scannen) en kies daarna de pdf. De app zoekt de afvinkvakjes, leest het aantal met de cijfers van de bakker en controleert alles nog eens met een tweede lezing. Bij twijfel staat er ‘aantal nakijken’. Elke goedgekeurde bon maakt het lezen beter.'],
 ['leverdagen','Leverdagen vers brood','Bij Broodsoorten en instellingen stel je in op welke dagen de bakker vers brood levert. Met Uitzonderingen zet je een datum op Geen levering (bijv. een feestdag) of Extra levering. Bij Afwijkende dagen en de feestdagmelding kun je ook kiezen of er vers brood wordt geleverd. Op een dag zonder levering staat er geen vers brood op Klaarzetten, krijg je geen melding om de levering in te vullen en telt het vers brood niet mee.'],
 ['morgen','Klaarzetten voor morgen','De lijst op Klaarzetten hoort bij de bakdag. Vanaf de omschakeltijd (in te stellen bij Broodsoorten en instellingen, standaard 14:00) opent Klaarzetten op morgen, met een blauwe balk "Je zet klaar voor: … (morgen)". Bekijk je na die tijd de lijst van vandaag, dan krijg je een waarschuwing met de knop Naar morgen. Bijbakken en Oven vullen horen altijd bij vandaag; de levering vul je in op de dag zelf.'],
 ['materiaal','Materiaal','Onder Meer → Materiaal meld je dat verpakkingsmateriaal bijna op is: tik op Bijna op, en als het echt op is op Op!. Je naam en de tijd komen erbij, zodat niemand het dubbel meldt. Staat het er niet tussen? Tik op + Iets anders. De beheerder krijgt een melding en zet het op Besteld en later op Aangevuld.'],
 ['notities','Notities','Onder Meer → Notities vind je alle dagnotities van de afgelopen 6 maanden, nieuwste eerst. Zoek op een woord of naam, of toon alleen notities met een foto. Met Bekijk dag ga je naar Klaarzetten op die dag. Tik op een foto om hem groot te zien; tik nog eens om in te zoomen.'],
 ['plu','PLU-lijst','Onder Meer → PLU-lijst vind je alle PLU-nummers. Typ een deel van de naam of het nummer om te zoeken. Kies Op naam of Per kar. Het PLU-nummer staat ook achter de naam op Klaarzetten en groot in de werkmodus. Vul PLU-nummers in bij Broodsoorten.'],
 ['koppelen','Koppelen en inloggen','Elk toestel wordt één keer gekoppeld met de winkel-login of de beheerders-login. Daarna logt iedereen in met naam en pincode. Na 60 minuten niets doen wordt er automatisch uitgelogd. Bovenaan zie je of de app online is; offline wijzigingen worden later verzonden.']
];
function instellingenHtml(){const p=prof();
  const seg=(k,opts)=>`<div class="segment" style="margin:8px 0 0">${opts.map(([v,l])=>`<button data-a="prof" data-k="${k}" data-v="${v}" class="${String(p[k])===String(v)?'aan':''}">${l}</button>`).join('')}</div>`;
  const sw=(k,l)=>`<label class="schakel" style="margin:0;color:var(--tekst);font-weight:400">${l}<input type="checkbox" data-prof="${k}" ${p[k]?'checked':''}></label>`;
  return`<div class="kop"><div class="koprij"><h1>App-instellingen</h1>${info('instellingen')}</div><p>Alleen voor jou. Werkt op elk toestel waar je inlogt.</p></div>
   <div class="kaartje"><h3>Weergave</h3>${seg('thema',[['auto','Automatisch'],['licht','Licht'],['donker','Donker']])}
   <div class="hulp" style="margin-top:14px">Tekstgrootte</div>${seg('tekst',[['normaal','Normaal'],['groot','Groot'],['xl','Extra groot']])}</div>
   ${isAdmin()?`   <div class="kaartje"><h3>Lijsten</h3>${sw('compact','Compacte lijst')}${sw('fotos',"Foto's tonen")}${sw('patroon','Achtergrondpatroon')}${sw('plu','PLU-nummers tonen')}</div>
   <div class="kaartje"><h3>Updates</h3>${sw('updates','Updates tonen')}<div class="sub" style="margin-top:6px">${p.updates?'Je ziet wat er nieuw is na een update, en een balk als er een nieuwe versie klaarstaat.':'Uit: de app werkt zichzelf stil bij als hij op de achtergrond staat. Je krijgt geen meldingen over nieuwe versies.'}</div></div>
   <div class="kaartje"><h3>Persoonlijk</h3><div class="hulp" style="margin:0 0 6px">Jouw emoji</div>
   <div class="emojis">${['',...EMOJI].map(e=>`<button class="emojiknop ${p.emoji===e?'aan':''}" data-a="prof" data-k="emoji" data-v="${e}">${e||'geen'}</button>`).join('')}</div>
   <div class="hulp" style="margin:14px 0 6px">Accentkleur</div><div class="emojis">${ACCENTEN.map(([k,l,c])=>`<button class="kleurknop ${p.accent===k?'aan':''}" data-a="prof" data-k="accent" data-v="${k}"><i style="background:${c}"></i>${l}</button>`).join('')}</div>
   <div class="hulp" style="margin-top:14px">Startpagina na inloggen</div><div class="segment" style="margin:8px 0 0">${[['home','Home'],['slim','Slim'],['lijst','Klaarzetten'],['derving','Derving'],['plan','Invullen']].map(([v,l])=>`<button data-a="prof" data-k="startp" data-v="${v}" class="${(p.startp||'home')===v?'aan':''}">${l}</button>`).join('')}</div>
   ${(p.start||'slim')==='slim'?`<div class="hulp" style="margin-top:6px">Slim: overdag Klaarzetten (na de levertijd meteen bij de levering), 's avonds Derving vanaf <select class="veld" id="dervUur" style="width:86px;display:inline-block;padding:4px 8px">${[12,13,14,15,16,17,18,19,20,21].map(u=>`<option value="${u}" ${u===(p.dervUur??17)?'selected':''}>${u}:00</option>`).join('')}</select></div>`:''}
   ${S.momenten.length>1?`<div class="hulp" style="margin-top:14px">Standaard bakmoment</div>${seg('moment',[['','Geen'],...S.momenten.map(m=>[m.id,esc(m.naam)])])}`:''}</div>`:''}
   ${isAdmin()&&kanBeheren()?`<div class="kaartje"><h3>Face ID</h3>${!faceKan()?`<p class="hulp">${IS_ANDROID?'Inloggen met Face ID kan alleen op de iPhone van de beheerder.':'Face ID wordt hier niet ondersteund. Open Brood Opzet vanaf je beginscherm op je iPhone.'}</p>`:L.faceid&&L.faceid.uid===L.sessie?'<div class="sub">✓ Aan op dit toestel. Op het inlogscherm staat de knop Inloggen met Face ID.</div><div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:8px"><button class="knop rand klein" data-a="faceuit">Face ID uitzetten</button></div>':'<div class="sub">Log op dit toestel in met Face ID in plaats van je pincode. Alleen voor jou, alleen op deze telefoon.</div><div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:8px"><button class="knop klein" data-a="faceaan">Face ID aanzetten</button></div>'}</div>`:''}
   <div class="kaartje"><h3>Pincode</h3>${ik()?.rol==='admin'&&!kanBeheren()?'<p class="hulp">Je eigen pincode wijzig je op je eigen telefoon.</p>':'<div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:6px"><button class="knop rand klein" data-a="pinwijzig">Pincode wijzigen</button></div>'}</div>
   ${isAdmin()?`<div class="kaartje"><h3>Eenvoud</h3>${sw('eenvoudig','Eenvoudige modus (minder informatie, grotere knoppen)')}${sw('werkvloer','Werkvloer-weergave (beheerdersdingen op Klaarzetten verbergen)')}</div>`:''}
   ${mag('vinken')&&heeft('push')&&!(isAdmin()&&kanBeheren())?`<div class="kaartje"><h3>Pushmelding levering</h3><div class="sub">Een melding op deze telefoon als de levering om ${tijd2(S.herinnering.uur??10,S.herinnering.min)} nog niet is ingevuld.${S.herinnering.aan?'':' (De beheerder heeft de herinnering nu uitgezet.)'}</div><div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:8px">${pushStatus()==='niet'?`<span class="hulp" style="margin:0">${esc(pushNietTekst())}</span>`:L.pushTeamAan&&(S.pushTeam.subs||[]).some(x=>x.endpoint===L.pushTeamAan)?'<span class="goed" style="margin-right:10px">✓ Staat aan</span><button class="knop rand klein" data-a="pushteamuit">Uitzetten</button>':'<button class="knop klein" data-a="pushteamaan">Aanzetten op dit toestel</button>'}</div></div>`:''}${heeft('push')&&!(isAdmin()&&kanBeheren())?pushSoortenMHtml():''}
   ${isAdmin()?`<div class="kaartje"><h3>Meldingen</h3>${sw('bevestig','Groene bevestiging na een actie')}${kanTrillen()?sw('tril','Kort trillen bij afvinken'):''}${sw('feest','"Alles klaargezet!"-melding')}${sw('groet','Begroeting en voortgangsring')}</div>`:''}`}

function programmasHtml(){
  const l=Object.values(S.programmas).sort((a,b)=>a.naam.localeCompare(b.naam,'nl')),zonder=S.soorten.filter(x=>x.type==='afbakken'&&!x.programmaId);
  return`<div class="kop"><div class="koprij"><h1>Bakprogramma's</h1>${info('programmas')}</div><p>Tik op een programma om producten te koppelen.</p></div>
   ${l.length?`<div class="sectie">${l.map(p=>{const n=S.soorten.filter(x=>x.programmaId===p.id);return`<div class="rij"><button class="regel" data-a="progopen" data-v="${p.id}"><div class="groei"><div class="naam">${esc(p.naam)}</div>
     <div class="sub">${[p.temp?p.temp+'°C':'',p.baktijd?p.baktijd+' min':'',`${n.length} ${n.length===1?'product':'producten'}`].filter(Boolean).join(' · ')}${p.notitie?` · ${esc(p.notitie)}`:''}</div>
     ${n.length?`<div class="sub" style="margin-top:3px">${n.slice(0,5).map(x=>esc(x.naam)).join(', ')}${n.length>5?` en nog ${n.length-5}`:''}</div>`:''}</div><span class="pijl">›</span></button></div>`}).join('')}</div>`:'<p class="leeg">Nog geen programma\'s.</p>'}
   <div class="knoppen"><button class="knop" data-a="prognieuw">+ Programma toevoegen</button></div>
   ${zonder.length?`<div class="kaartje"><h3>Zonder programma (${zonder.length})</h3><div class="sub">${zonder.map(x=>esc(x.naam)).join(', ')}</div></div>`:''}`}
function openProgramma(id){
  const p=id?S.programmas[id]:{id:'p'+Date.now().toString(36),naam:'',temp:null,baktijd:null,notitie:'',nieuw:true};
  bewerk={soort:'programma',id:p.id,nieuw:!id,keuze:Object.fromEntries(S.soorten.filter(x=>x.programmaId===p.id).map(x=>[x.id,true]))};verwStap=false;
  const veld=(i,l,v,ph,num)=>`<div><div class="hulp" style="margin:0 0 4px">${l}</div><input class="veld" id="${i}" ${num?'inputmode="numeric" maxlength="3"':''} value="${esc(v??'')}" placeholder="${ph}"></div>`;
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>${id?'Bakprogramma':'Nieuw programma'}</b><button data-a="progopslaan" style="font-weight:700">Opslaan</button></div>
   <div class="pinhoud"><label>Naam van het programma</label><input class="veld" id="pNaam" value="${esc(p.naam)}" placeholder="Bijv. P3 Croissant"><div class="fout" id="fout"></div>
   <div class="minmax" style="margin-top:12px">${veld('pTemp','Temperatuur °C',p.temp,'bijv. 190',true)}${veld('pTijd','Baktijd (min)',p.baktijd,'bijv. 18',true)}</div>
   <label>Notitie (optioneel)</label><input class="veld" id="pNotitie" maxlength="60" value="${esc(p.notitie||'')}" placeholder="Bijv. met stoom">
   <label>Producten bij dit programma</label><div id="progLijst"></div>
   ${id?`<button class="verwijder" data-a="progweg">Programma verwijderen</button>`:''}</div>
   <div class="bijvoet" id="progVoet"></div>`);
  renderProgLijst();
}
function renderProgLijst(){
  const k=bewerk.keuze,l=S.soorten.filter(x=>x.type==='afbakken'&&x.naam.trim());
  document.getElementById('progLijst').innerHTML=`<div class="sectie" style="margin:0">${l.map(x=>{const ander=x.programmaId&&x.programmaId!==bewerk.id?S.programmas[x.programmaId]:null;
    return`<div class="rij"><button class="regel ${k[x.id]?'gekozen':''}" data-a="progsoort" data-v="${x.id}">${sFoto(x.id)?`<img class="duim klein" src="${sFoto(x.id)}" alt="">`:''}<div class="groei"><div class="naam">${esc(x.naam)}</div>${ander?`<div class="sub">${k[x.id]?'verhuist van':'nu'}: ${esc(ander.naam)}</div>`:''}</div><div class="kiesvak">${k[x.id]?'✓':''}</div></button></div>`}).join('')}</div>`;
  const n=Object.keys(k).length;document.getElementById('progVoet').innerHTML=`<b>${n} ${n===1?'product':'producten'} gekoppeld</b>`;
}
let managerOpen=false;
/* ---------- materiaal ---------- */
function vulMateriaal(m){m=isObj(m)?m:{};if(!Array.isArray(m.lijst))m.lijst=['Broodzakken groot','Broodzakken klein','Papieren zakjes','Croissantzakjes','Labels weegschaal','Bakpapier','Handschoenen'].map((n,i)=>({id:'m'+(i+1),naam:n}));if(!isObj(m.meld))m.meld={};if(!isObj(m.los))m.los={};return m}
const matNaam=id=>S.materiaal.lijst.find(x=>x.id===id)?.naam||S.materiaal.los[id]?.naam||'?';
function matGemeld(){return[...Object.entries(S.materiaal.meld).map(([id,x])=>({id,naam:matNaam(id),...x})),...Object.values(S.materiaal.los).map(x=>({...x,los:true}))].filter(x=>x.staat)}
const MAT_LABEL={bijna:['Bijna op','aangepast'],op:['Op!','rood'],besteld:['Besteld','schap']};
const MEER_GROEP={mijnuren:'dagelijks',uren:'beheer',berichten:'dagelijks',vraag:'dagelijks',materiaal:'dagelijks',notities:'dagelijks',dervlijsten:'dagelijks',ontdooi:'dagelijks',pakbonnen:'dagelijks',afsluiten:'dagelijks',plu:'dagelijks',
  afwijkend:'planning',bestel:'planning',bestelboeken:'planning',rapport:'rapporten',dervingeuro:'rapporten',nieuw:'rapporten',export:'rapporten',gedaan:'rapporten',log:'rapporten',
  soorten:'instellingen',programmas:'instellingen',team:'instellingen',instellingen:'instellingen',klaar:'beheer',qrwinkel:'beheer',cadeau:'beheer',push:'beheer',leesfouten:'beheer',kassa:'beheer',weekoverzicht:'beheer',besteladvies:'beheer',prijzen:'beheer',backup:'beheer',winkels:'beheer',winkel:'beheer',kantoor:'kantoor',facturen:'beheer',tebetalen:'beheer',hometeam:'beheer',abonnement:'beheer',aanbieder:'beheer',uitleg:'hulp'};
const KANTOOR=new Set(['facturen','tebetalen','cadeau','uren','rapport','dervingeuro','weekoverzicht','nieuw','export','besteladvies','kassa','prijzen','leesfouten','backup','klaar','qrwinkel','push','hometeam','winkels','winkel','abonnement','aanbieder']);
const GROEPEN=[['dagelijks','Dagelijks'],['planning','Planning'],['rapporten','Rapporten'],['instellingen','Instellingen'],['beheer','Beheer'],['hulp','Hulp']];
function meerLijstHtml(items,kt){
  if(isAdmin()&&kanBeheren())items=[...items,['klaar','✅ Klaar voor gebruik',"Wat nog ontbreekt: foto's, PLU, programma's, pincodes",()=>true],['qrwinkel','📱 QR-code voor de winkel','A4 om op te hangen bij de broodafdeling',()=>true,null,'qrwinkel'],
    ['cadeau','🎁 Cadeaubonnen',`${cadeauTellers().uit} uitgegeven · ${euro(cadeauTellers().open)} openstaand`,()=>true],['push','🔔 Pushmeldingen',pushStatus()==='granted'&&S.push.subs?.length?'Staan aan':'Meldingen op je telefoon',()=>true],['leesfouten','📷 Leesfouten pakbon',`${Object.keys(S.pbFouten).length} gemeld`,()=>true],['weekoverzicht','📊 Weekoverzicht','Derving, verschillen met de bakker, advies',()=>true],['kassa','🧾 Kassaverkoop',KV?`Gekoppeld · ${Object.keys(KV.dagen).length} ${Object.keys(KV.dagen).length===1?'dag':'dagen'}`:'Koppelen met Besteladvies',()=>true],['besteladvies','🧮 Bestel-advies','Per weekdag, op basis van derving',()=>true],['prijzen','💶 Inkoopprijzen',"Derving in euro's",()=>true],['backup','💾 Back-up','Elke nacht een kopie op de server',()=>true],
    ...(isEigenaar()?[['winkels','🏪 Winkels',`${(WK.lijst||[]).length} ${(WK.lijst||[]).length===1?'winkel':'winkels'} · wisselen, toestellen koppelen, overzicht`,()=>true]]:WINKEL&&WINKEL.rol==='bedrijfsleider'?[['winkel','🏪 Winkel en toestellen','Koppelcode voor de toestellen van de winkel',()=>true]]:[]),
    ...(isEigenaar()?[['abonnement','⭐ Abonnement',`Pakket ${PAKKET_NAAM[WINKEL.pakket]||''}${WINKEL.proef_pakket&&WINKEL.proef_tot>=iso()?' · proef '+PAKKET_NAAM[WINKEL.proef_pakket]:''}`,()=>true]]:[]),
    ...(isAdmin()?[['uren','⏱ Urenregistratie',(()=>{const n=urenNu().length,c=Object.values(isObj(S.uren?.corr)?S.uren.corr:{}).filter(x=>x.status==='open').length;return[n?`${n} nu ingeklokt`:'',c?`${c} correctie${c===1?'':'s'}`:''].filter(Boolean).join(' · ')||(urenInst().iedereen?'Overzicht per dag, week of maand':'Overzicht per dag, week of maand · testfase')})(),()=>true]]:[]),
    ...(isAdmin()?[['hometeam','🏠 Home voor medewerkers',(()=>{const t=homeTeam(),n=Object.values(t.per||{}).filter(Boolean).length;return(t.alle?.tegels?'Eigen indeling':'Standaard')+(n?` · ${n} per persoon`:'')+(t.zelf?' · zelf aanpassen aan':'')})(),()=>true]]:[]),
    ...(betalenMag()?[['tebetalen','💶 Te betalen',(()=>{const o=tbOpen(),l=o.filter(tbTeLaat).length;const ni=tbInLijst().length;return(ni?`📥 ${ni} nieuw · `:'')+(o.length?`${o.length} open · ${fEuro(o.reduce((t,x)=>t+tbRest(x),0))}${l?` · ${l} te laat`:''}`:'Inkoopfacturen bijhouden')})(),()=>true]]:[]),
    ...(facturenMag()?[['facturen','🧾 Facturen',(()=>{const o=Object.values(S.facturen.lijst).filter(f=>f.status==='verstuurd'||f.status==='afgerond');return o.length?`${o.length} open · ${fEuro(o.reduce((t,f)=>t+factTotalen(f).tot,0))}`:'Facturen maken en bijhouden'})(),()=>true]]:[]),
    ...(isAanbieder()?[['aanbieder','🧑‍💼 Brood Opzet beheer',`Ondernemers, pakketten, uitnodigingen${L.aanvragen?` · ${L.aanvragen} ${L.aanvragen===1?'aanvraag':'aanvragen'}`:''}`,()=>true]]:[])];
  /* 10.0: functies buiten het pakket met een slotje */
  items=items.map(x=>{const f=MEER_FUNCTIE[x[0]];return f&&!heeft(f)?[x[0],`${SLOT} ${x[1]}`,`Zit in ${pakketVoor(f)} – tik voor meer`,x[3],x[4],'slotfunctie',f]:x});
  const wel=items.filter(x=>x[3]()),P=prof(),fav=P.fav||[];if(Array.isArray(window.__meerItems))window.__meerItems.push(...wel);
  const alle=[...wel],kA=isAdmin()?wel.filter(x=>KANTOOR.has(x[0])):[];
  if(kt)wel.splice(0,wel.length,...kA);else if(kA.length){const ni=betalenMag()?tbInLijst().length:0;wel.splice(0,wel.length,...wel.filter(x=>!KANTOOR.has(x[0])));wel.unshift(['kantoor','🗂 Kantoor',(ni?`📥 ${ni} nieuwe factuur · `:'')+'Facturen, uren, cadeaubonnen, rapporten en beheer',()=>true,null,null,null,kA.map(x=>String(x[1]).replace(/<[^>]+>/g,'')).join(' ').toLowerCase()])}
  const rij=x=>{const[k,t,sb,,,act,fv,zx]=x;return`<div class="rij" data-zoekmeer="${esc((String(t).replace(/<[^>]+>/g,'')+' '+sb+' '+(zx||'')).toLowerCase())}"><div class="rijflex"><button class="regel" data-a="${act||'sub'}" data-v="${fv||k}"><div class="groei"><div class="naam">${t}</div><div class="sub">${sb}</div></div><span class="pijl">›</span></button>${wel.length>9?`<button class="pot ster ${fav.includes(k)?'aan':''}" data-a="fav" data-v="${k}" aria-label="Favoriet">${fav.includes(k)?'★':'☆'}</button>`:''}</div></div>`};
  if(wel.length<=9)return`<div class="sectie menu">${wel.map(rij).join('')}</div>`;
  const favs=kt?[]:alle.filter(x=>fav.includes(x[0]));
  return`<div class="zoekbalk"><input class="veld" id="meerZoek" type="search" placeholder="Zoek een onderdeel" autocomplete="off"></div><div id="meerGroepen">
   ${favs.length?`<div class="sectie menu meergroep open" data-groep="fav"><div class="karkop"><b>★ Favorieten</b></div><div class="meerinhoud">${favs.map(rij).join('')}</div></div>`:''}
   ${wel.filter(x=>x[0]==='kantoor').map(x=>`<div class="sectie menu">${rij(x)}</div>`).join('')}
   ${GROEPEN.map(([g,naam])=>{const l=wel.filter(x=>(MEER_GROEP[x[0]]||'hulp')===g);if(!l.length)return'';const open=kt||!!(P.meerOpen||{})[g];
     return`<div class="sectie menu meergroep ${open?'open':''}" data-groep="${g}">${kt?`<div class="karkop"><b>${naam}</b></div>`:`<button class="groepkop" data-a="meergroep" data-v="${g}"><b>${naam}</b><span>${l.length} ${open?'▴':'▾'}</span></button>`}<div class="meerinhoud">${l.map(rij).join('')}</div></div>`}).join('')}</div>`}
function meerZoekFilter(z){const c=document.getElementById('meerGroepen');if(!c)return;z=z.trim().toLowerCase();c.classList.toggle('zoekend',!!z);
  c.querySelectorAll('[data-zoekmeer]').forEach(r=>r.style.display=!z||r.dataset.zoekmeer.includes(z)?'':'none');
  c.querySelectorAll('.meergroep').forEach(g=>{const rs=[...g.querySelectorAll('[data-zoekmeer]')];g.style.display=!z||rs.some(r=>r.style.display!=='none')?'':'none'})}
function belItems(){if(!isAdmin()){const o=ongelezenM();return o?[{i:'💬',t:`${o} ${o===1?'nieuw antwoord':'nieuwe antwoorden'} van de beheerder`,a:'sub',v:'berichten'}]:[]}const l=[],o=ongelezen(),mg=matGemeld().filter(x=>x.staat!=='besteld');
  if(o)l.push({i:'💬',t:`${o} ${o===1?'bericht':'berichten'} van medewerkers`,a:'sub',v:'berichten'});
  if(mg.length)l.push({i:'📦',t:`${mg.length} ${mg.length===1?'materiaal':'materialen'} ${mg.some(x=>x.staat==='op')?'op of bijna op':'bijna op'}: ${mg.map(x=>x.naam).join(', ')}`,a:'sub',v:'materiaal'});
  const f=volgendeFeest();if(f){const dg=Math.round((vanIso(f[0])-vanIso(iso()))/864e5);l.push({i:'🎉',t:`${f[1]} over ${dg} ${dg===1?'dag':'dagen'} – afwijkende dag maken?`,feest:f})}
  const h=new Date().getHours();if(S.soorten.some(x=>x.type==='vers'&&x.naam.trim())&&versGeleverd(iso())&&!S.levering[iso()]&&h>=6)l.push({i:'🥖',t:'Levering van vandaag nog niet ingevuld',a:'levnu'});
  if(isAanbieder()&&L.aanvragen)l.push({i:'🧑‍💼',t:`${L.aanvragen} ${L.aanvragen===1?'aanvraag':'aanvragen'} voor Brood Opzet`,a:'sub',v:'aanbieder'});
  {const pf=Object.values(S.pbFouten).filter(x=>x.t>(L.pfGezien||0)).length;if(pf&&kanBeheren()&&heeft('scan'))l.push({i:'📷',t:`${pf} ${pf===1?'leesfout':'leesfouten'} pakbon gemeld`,a:'sub',v:'leesfouten'})}
  {const p=bakkerPatronen();if(p.length)l.push({i:'⚖️',t:`Bakker levert vaker te weinig: ${p.map(x=>`${x.s.naam} (${x.keer}×)`).join(', ')}`,a:'sub',v:'pakbonnen'})}
  if(h>=19&&!S.afsluit[iso()])l.push({i:'🌙',t:'Dag nog niet afgesloten',a:'sub',v:'afsluiten'});
  if(prof().updates&&prof().versieGezien!==APP_VERSIE)l.push({i:'✨',t:`Nieuw in versie ${APP_VERSIE}`,a:'nieuwsnu'});
  return l}
function openBel(){const l=belItems(),P=prof();
  toonSheet(`<div class="pkop"><span style="width:60px"></span><b>Meldingen</b><button data-a="sluit" style="font-weight:700">Sluiten</button></div><div class="pinhoud">
   ${l.length?`<div class="sectie" style="margin:10px 0 0">${l.map(x=>x.feest?`<div class="rij inv" style="flex-wrap:wrap"><div class="nieuwsicoon">${x.i}</div><div class="groei"><div class="naam" style="font-weight:600">${esc(x.t)}</div>
     <div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:8px;flex-wrap:wrap"><button class="knop klein" data-a="feestkopie" data-v="${x.feest[0]}" data-n="${esc(x.feest[1])}">Kopie</button><button class="knop rand klein" data-a="feestnul" data-v="${x.feest[0]}" data-n="${esc(x.feest[1])}">Gesloten</button><button class="knop rand klein" data-a="feestnee" data-v="${x.feest[0]}">Niet nodig</button></div><div class="sub" style="margin-top:8px">Vers brood geleverd? <button class="chip ${versGeleverd(x.feest[0])?'aan':''}" data-a="versuitz" data-v="${x.feest[0]}" data-n="ja">Ja</button> <button class="chip ${versGeleverd(x.feest[0])?'':'aan'}" data-a="versuitz" data-v="${x.feest[0]}" data-n="nee">Nee</button></div></div></div>`
     :`<div class="rij"><button class="regel" data-a="belga" data-g="${x.a}" data-v="${x.v||''}"><div class="nieuwsicoon">${x.i}</div><div class="groei"><div class="naam" style="font-weight:600">${esc(x.t)}</div></div><span class="pijl">›</span></button></div>`).join('')}</div>`:'<p class="leeg">Geen meldingen. Alles is bij! 👌</p>'}
   <label class="schakel" style="margin:16px 0 0;color:var(--tekst);font-weight:400">Werkvloer-weergave (beheerdersdingen op Klaarzetten verbergen)<input type="checkbox" data-prof="werkvloer" ${P.werkvloer?'checked':''}></label></div>`)}
function pushHtml(){const st=pushStatus(),aan=st==='granted'&&S.push.subs?.length,stil=S.push.stil||{van:21,tot:7},uren=[...Array(24).keys()];
  return`<div class="kop"><div class="koprij"><h1>Pushmeldingen</h1></div><p>Een melding op je telefoon als materiaal bijna op is, ook als de app dicht is.</p></div>
   <div class="kaartje"><h3>${aan?'✓ Staan aan':'Staan uit'}</h3><div class="sub">${st==='niet'?pushNietTekst():st==='denied'?pushGeweigerdTekst():`${(S.push.subs||[]).length} ${(S.push.subs||[]).length===1?'toestel':'toestellen'} aangemeld.`}</div>
    <div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:10px;flex-wrap:wrap">${st!=='niet'&&st!=='denied'?`<button class="knop klein" data-a="pushaan">${aan?'Dit toestel opnieuw aanmelden':'Pushmeldingen aanzetten'}</button>`:''}${aan?'<button class="knop rand klein" data-a="pushtest">Testmelding sturen</button>':''}</div></div>
   <div class="kaartje"><h3>Stille uren</h3><div class="sub">In deze uren komen alleen meldingen van "Op!" door. "Bijna op" volgt daarna.</div>
    <div style="display:flex;align-items:center;gap:10px;margin-top:10px">Van <select class="veld" id="stilVan" style="width:90px">${uren.map(u=>`<option value="${u}" ${u===stil.van?'selected':''}>${u}:00</option>`).join('')}</select> tot <select class="veld" id="stilTot" style="width:90px">${uren.map(u=>`<option value="${u}" ${u===stil.tot?'selected':''}>${u}:00</option>`).join('')}</select></div></div>
   ${pushSoortenHtml()}${herinneringHtml()}
   <p class="hulp" style="margin:12px 20px">De eenmalige instelling in Supabase staat in de uitleg die je bij deze update hebt gekregen.</p>`}
function materiaalHtml(){const adm=isAdmin(),regel=(id,naam,x,los)=>{const st=x?.staat;
    return`<div class="rij inv matrij ${st||''}"><div class="groei"><div class="naam">${esc(naam)}</div><div class="sub">${st?`<span class="st ${MAT_LABEL[st][1]}">${MAT_LABEL[st][0]}</span> ${esc(x.wie)} · ${tijdTekst(x.t)}${x.besteld?` · besteld door ${esc(x.besteld.wie)}`:''}`:'Op voorraad'}</div></div>
     <div class="matknoppen">${!st?`<button class="knop rand klein" data-a="matmeld" data-v="${id}" data-n="bijna">Bijna op</button>`:''}${st==='bijna'?`<button class="knop klein rood" data-a="matmeld" data-v="${id}" data-n="op">Op!</button>`:''}
     ${adm&&st&&st!=='besteld'?`<button class="knop rand klein" data-a="matbesteld" data-v="${id}">Besteld</button>`:''}${adm&&st?`<button class="knop klein" data-a="mataangevuld" data-v="${id}">Aangevuld</button>`:''}
     ${!adm&&st&&x.wie===ik()?.naam&&st!=='besteld'?`<button class="knop rand klein" data-a="mataangevuld" data-v="${id}">Toch niet</button>`:''}</div></div>`};
  return`<div class="kop"><div class="koprij"><h1>Materiaal</h1>${info('materiaal')}</div><p>${adm?'Wat medewerkers hebben gemeld. Tik op Besteld of Aangevuld.':'Is iets bijna op? Tik op Bijna op. De beheerder krijgt een melding.'}</p></div>
   <div class="sectie">${S.materiaal.lijst.map(m=>regel(m.id,m.naam,S.materiaal.meld[m.id])).join('')}${Object.values(S.materiaal.los).map(x=>regel(x.id,x.naam,x,true)).join('')}</div>
   <div class="knoppen"><button class="knop rand" data-a="matanders">+ Iets anders</button>${adm&&kanBeheren()?'<button class="knop rand" data-a="matlijst">Lijst aanpassen</button>':''}</div>`}
function openMatLijst(){bewerk={soort:'matlijst',lijst:kloon(S.materiaal.lijst)};toonMatLijst()}
function toonMatLijst(){toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Lijst aanpassen</b><button data-a="matlijstopslaan" style="font-weight:700">Opslaan</button></div><div class="pinhoud">
   <p class="hulp">Pas de namen aan, verwijder of voeg toe.</p>${bewerk.lijst.map((m,i)=>`<div style="display:flex;gap:8px;margin-bottom:8px"><input class="veld" data-matnaam="${i}" value="${esc(m.naam)}"><button class="knop rand klein rood" data-a="matlijstweg" data-v="${i}">×</button></div>`).join('')}
   <button class="toevoegen" data-a="matlijsterbij">+ Materiaal toevoegen</button></div>`)}
/* ---------- pushmeldingen ---------- */
const VAPID_PUBLIEK='BMq2CTiL_Zpze43M7a5Ik1nZwFyB-xYRLeXAt4R6s7w_WBebpQvP_uHXS8QsH-0g1vkqTBVmEg3eaRe5NtTLj9o';
function stuurPush(extra){try{return fetch(SUPA_URL+'/functions/v1/stuur-push',{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY},body:JSON.stringify({...(extra||{}),...(WINKEL?{winkel:WINKEL.id}:{})})}).then(async r=>{let j={};try{j=await r.json()}catch(e){}return{status:r.status,...j}}).catch(()=>({netwerk:true}))}catch(e){return Promise.resolve({netwerk:true})}}
function pushStatus(){if(!('serviceWorker'in navigator)||!('PushManager'in window))return'niet';if(typeof Notification==='undefined')return'niet';return Notification.permission}
async function pushAan(){
  if(pushStatus()==='niet'){toast(pushNietTekst());return}
  try{const j=await pushAbonneer();if(!j)return;
    S.push.subs=(S.push.subs||[]).filter(x=>x.endpoint!==j.endpoint);S.push.subs.push({endpoint:j.endpoint,keys:j.keys,toestel:navigator.userAgent.slice(0,60),t:Date.now()});
    bewaar();render();toast('Pushmeldingen staan aan');setTimeout(()=>stuurPush({test:true}),1500)}catch(e){toast('Aanzetten lukte niet: '+(e.message||e))}}
function appUrl(){return location.href.split('#')[0].split('?')[0].replace(/index\.html$/,'')}
function laadQr(){return window.qrcode?Promise.resolve():new Promise((ok,nee)=>{const x=document.createElement('script');x.src='https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';x.onload=ok;x.onerror=nee;document.head.appendChild(x)})}
function qrSvg(tekst,cel=5){const q=qrcode(0,'M');q.addData(tekst);q.make();return q.createSvgTag({cellSize:cel,margin:2,scalable:true})}
function qrInPdf(doc,tekst,x,y,maat){const q=qrcode(0,'M');q.addData(tekst);q.make();const n=q.getModuleCount(),c=maat/n;doc.setFillColor(0,0,0);for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))doc.rect(x+k*c,y+r*c,c+0.01,c+0.01,'F')}
const INSTALLATIE_TEKST=()=>`iPhone:\n${INSTALL_IPHONE.map((x,i)=>`${i+1}. ${x}`).join('\n')}\n\nAndroid:\n${INSTALL_ANDROID.map((x,i)=>`${i+1}. ${x}`).join('\n')}\n\nDaarna: ${INSTALL_SLOT}`;
let welkomst=null;
function openWelkomst(u,pin){welkomst={naam:u.naam,pin};
  toonSheet(`<div class="pkop"><span style="width:70px"></span><b>Welkomstkaart</b><button data-a="sluit" style="font-weight:700">Klaar</button></div><div class="pinhoud">
   <p class="hulp">Geef deze kaart aan <b>${esc(u.naam)}</b>. De tijdelijke pincode staat erop; bij de eerste keer inloggen kiest ${esc(u.naam)} een eigen pincode.</p>
   <div class="welkomkaart"><div class="welkomtitel">Welkom bij Brood Opzet, ${esc(u.naam)}!</div><div class="welkompin">Tijdelijke pincode: <b>${esc(pin)}</b></div><div id="welkomQr" class="welkomqr"></div>
    <div class="welkomkolom"><div><b>iPhone</b><ol>${INSTALL_IPHONE.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></div><div><b>Android</b><ol>${INSTALL_ANDROID.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></div></div><p class="sub">Daarna: ${esc(INSTALL_SLOT)}</p><div class="sub">${esc(appUrl())}</div></div>
   <div class="knoppen"><button class="knop" data-a="welkomdeel">Delen (WhatsApp)</button><button class="knop rand" data-a="welkompdf">PDF / printen</button></div></div>`);
  laadQr().then(()=>{const el=document.getElementById('welkomQr');if(el)el.innerHTML=qrSvg(appUrl())}).catch(()=>{})}
async function welkomDeel(){const w=welkomst;if(!w)return;const t=`Welkom bij Brood Opzet, ${w.naam}!\n\nJe tijdelijke pincode: ${w.pin}\n\n${INSTALLATIE_TEKST()}\n\n${appUrl()}`;
  try{if(navigator.share){await navigator.share({text:t});return}}catch(e){if(e&&e.name==='AbortError')return}
  try{await navigator.clipboard.writeText(t);toast('Tekst gekopieerd')}catch(e){toast('Delen lukt hier niet')}}
function pdfKolommen(doc,y0,fs){for(const[x,titel,l]of[[18,'iPhone',INSTALL_IPHONE],[110,'Android',INSTALL_ANDROID]]){doc.setFont('helvetica','bold');doc.setFontSize(fs+2);doc.text(titel,x,y0);doc.setFont('helvetica','normal');doc.setFontSize(fs);let y=y0+8;
  l.forEach((t,i)=>{const r=doc.splitTextToSize(`${i+1}. ${t}`,84);doc.text(r,x,y);y+=r.length*(fs*.45)+2})}}
async function maakQrPdf(soort){
  try{await laadPdf();await laadQr()}catch(e){toast('PDF maken lukt niet zonder internet');return}
  const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'}),O=[241,125,4];doc.setFillColor(...O);doc.rect(0,0,210,28,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(22);doc.text('Brood Opzet',105,18,{align:'center'});doc.setTextColor(20,20,20);
  if(soort==='winkel'){doc.setFontSize(26);doc.text('Scan om Brood Opzet te openen',105,52,{align:'center'});qrInPdf(doc,appUrl(),45,64,120);doc.setFont('helvetica','normal');doc.setFontSize(13);
    pdfKolommen(doc,198,12);doc.setFontSize(12);doc.text('Daarna: open Brood Opzet vanaf je beginscherm en log in met je naam en pincode.',105,262,{align:'center'});doc.setFontSize(10);doc.text(appUrl(),105,285,{align:'center'})}
  else{const w=welkomst;doc.setFontSize(22);doc.text(`Welkom, ${w.naam}!`,105,48,{align:'center'});doc.setFont('helvetica','normal');doc.setFontSize(15);doc.text('Je tijdelijke pincode:',105,62,{align:'center'});doc.setFont('helvetica','bold');doc.setFontSize(34);doc.text(w.pin,105,78,{align:'center'});
    qrInPdf(doc,appUrl(),65,90,80);doc.setFont('helvetica','normal');pdfKolommen(doc,182,11);doc.setFontSize(11);doc.text(doc.splitTextToSize('Daarna: '+INSTALL_SLOT,170),20,252);doc.setFontSize(10);doc.text(appUrl(),105,285,{align:'center'})}
  const f=new File([doc.output('blob')],soort==='winkel'?'brood-opzet-qr-winkel.pdf':`welkom-${(welkomst?.naam||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')}.pdf`,{type:'application/pdf'});
  try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:f.name});return}}catch(e){if(e&&e.name==='AbortError')return;if(e&&e.name==='NotAllowedError'){toast('Tik nog een keer');return}}
  toast('Delen wordt op dit toestel niet ondersteund')}
/* ================= 9.13: pakbon = besteld, verschil, archief, leesfouten ================= */
const pbNaamVan=(lv,id)=>lv?.pbNaam?.[id]||S.soorten.find(x=>x.id===id)?.naam||'?';
function levVerschil(lv){if(!lv?.pakbon)return[];const ids=new Set([...Object.keys(lv.pakbon),...Object.keys(lv.items||{})]),l=[];
  for(const id of ids){if(!S.soorten.some(x=>x.id===id))continue;const pb=lv.pakbon[id]??0,n=lv.items?.[id]??0;if(pb!==n)l.push({id,pb,n})}return l}
function verschilTekst(d,lv){return`Levering ${winkelNaam()} – ${dagNaamLang(d)}\nVerschil met de pakbon:\n`+levVerschil(lv).map(x=>`• ${pbNaamVan(lv,x.id)}: pakbon ${x.pb}, ontvangen ${x.n} (${Math.abs(x.n-x.pb)} te ${x.n<x.pb?'weinig':'veel'})`).join('\n')}
function toonVerschil(d){const lv=S.levering[d],l=levVerschil(lv);if(!l.length)return;
  toonSheet(`<div class="pkop"><span style="width:70px"></span><b>Verschil met pakbon</b><button data-a="sluit" style="font-weight:700">Sluiten</button></div><div class="pinhoud">
   <p class="hulp">✓ Levering opgeslagen. De telling wijkt af van de pakbon:</p>
   <div class="sectie" style="margin:0">${l.map(x=>`<div class="rij inv"><div class="groei"><div class="naam">${esc(S.soorten.find(s=>s.id===x.id)?.naam||'?')}</div><div class="sub">pakbon ${x.pb} · ontvangen ${x.n}</div></div><b class="${x.n<x.pb?'hoog':'goed'}" style="font-size:18px">${x.n<x.pb?'−':'+'}${Math.abs(x.n-x.pb)}</b></div>`).join('')}</div>
   <div class="knoppen"><button class="knop" data-a="verschildeel" data-v="${d}">Delen met de bakker</button></div>
   <p class="hulp" style="text-align:center">Kies daarna WhatsApp, mail of sms en de ontvanger.</p></div>`)}
async function deelTekst(t,titel){try{if(navigator.share){await navigator.share({text:t,title:titel});return}}catch(e){if(e&&e.name==='AbortError')return;if(e&&e.name==='NotAllowedError'){toast('Tik nog een keer');return}}
  try{await navigator.clipboard.writeText(t);toast('Gekopieerd – plak het in WhatsApp of mail')}catch(e){toast('Delen lukt niet op dit toestel')}}
function dataUrlBlob(u){const[k,d]=u.split(','),t=(k.match(/data:([^;]+)/)||[])[1]||'image/jpeg',b=atob(d),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return new Blob([a],{type:t})}
/* patroon: levert de bakker een soort vaker te weinig? (laatste 6 gescande leveringen) */
function bakkerPatronen(){const ds=Object.keys(S.levering).filter(d=>S.levering[d]?.pakbon).sort().reverse().slice(0,6);if(ds.length<3)return[];const uit=[];
  for(const s of S.soorten.filter(x=>x.type==='vers'&&x.naam.trim())){let keer=0,stuks=0,mee=0;
    for(const d of ds){const lv=S.levering[d];if(!(s.id in lv.pakbon))continue;mee++;const t=(lv.pakbon[s.id]||0)-(lv.items?.[s.id]??0);if(t>0){keer++;stuks+=t}}
    if(mee>=3&&keer>=3&&keer/mee>=.5)uit.push({s,keer,mee,stuks})}return uit.sort((a,b)=>b.keer-a.keer)}
function pakbonnenHtml(){const ds=Object.keys(S.levering).filter(d=>S.levering[d]).sort().reverse().slice(0,90),pat=isAdmin()?bakkerPatronen():[];
  let h=`<div class="kop"><div class="koprij"><h1>Pakbonnen</h1>${info('pakbonnen')}</div><p>Leveringen terugzoeken: pakbon, geteld en verschil.</p></div>`;
  if(pat.length)h+=`<div class="kaartje waarschuw"><b>Bakker levert vaker te weinig</b>${pat.map(x=>`<div class="sub">${esc(x.s.naam)}: ${x.keer} van de laatste ${x.mee} leveringen te weinig (${x.stuks} in totaal)</div>`).join('')}</div>`;
  if(!ds.length)return h+'<p class="leeg">Nog geen leveringen ingevuld.</p>';
  return h+`<div class="sectie">${ds.map(d=>{const lv=S.levering[d],v=levVerschil(lv),tot=Object.values(lv.items||{}).reduce((a,b)=>a+(+b||0),0);
    return`<div class="rij"><button class="regel" data-a="pakbonopen" data-v="${d}"><div class="groei"><div class="naam">${esc(dagNaamLang(d))}</div><div class="sub">${fmt(tot)} broden · ${esc(lv.wie||'')}${lv.pakbon?' · pakbon gescand':''}${lv.fotoId?' · 📷':''}</div></div>${v.length?`<span class="st aangepast">${v.length} ${v.length===1?'verschil':'verschillen'}</span>`:lv.pakbon?'<span class="goed">✓</span>':''}<span class="pijl">›</span></button></div>`}).join('')}</div>`}
function openPakbon(d){const lv=S.levering[d];if(!lv)return;const ids=S.soorten.filter(s=>s.type==='vers'&&(lv.items?.[s.id]||lv.pakbon?.[s.id])).map(s=>s.id),v=levVerschil(lv),foto=lv.fotoId&&S.notfotos[lv.fotoId],pb=!!lv.pakbon;
  toonSheet(`<div class="pkop"><span style="width:70px"></span><b>${esc(datumTekst(d))}</b><button data-a="sluit" style="font-weight:700">Sluiten</button></div><div class="pinhoud">
   <p class="hulp">Ingevuld door ${esc(lv.wie||'?')} om ${tijdTekst(lv.t)}.${pb?'':' Geen pakbon gescand.'}</p>
   ${foto?`<img class="pakbonduim" src="${foto}" alt="Pakbon" data-a="pakbonfoto" data-v="${d}"><p class="hulp" style="text-align:center;margin-top:0">Tik op de pakbon om te vergroten</p>`:lv.fotoId&&d<plusDagen(iso(),-183)?`<p class="hulp" style="text-align:center">Pakbonfoto's worden 6 maanden bewaard. Deze foto is niet meer beschikbaar.</p>`:lv.fotoId&&L.gekoppeld&&L.modus!=='lokaal'?`<div class="knoppen"><button class="knop rand klein" data-a="pakbonophalen" data-v="${d}">📷 Foto van de pakbon ophalen</button></div><p class="hulp" style="text-align:center;margin-top:0">Oudere pakbonfoto's staan alleen op de server.</p>`:''}
   <div class="tabelwrap"><table class="tabel"><tr><th>Broodsoort</th>${pb?'<th>Pakbon</th>':''}<th>Geteld</th>${pb?'<th>Verschil</th>':''}</tr>${ids.map(id=>{const s=S.soorten.find(x=>x.id===id),p=lv.pakbon?.[id]??0,n=lv.items?.[id]??0;
     return`<tr><td>${esc(s.naam)}</td>${pb?`<td>${p}</td>`:''}<td>${n}</td>${pb?`<td class="${n<p?'hoog':''}">${n===p?'':(n>p?'+':'')+(n-p)}</td>`:''}</tr>`}).join('')}</table></div>
   ${v.length?`<div class="knoppen"><button class="knop rand" data-a="verschildeel" data-v="${d}">Verschil delen met de bakker</button></div>`:''}</div>`)}
/* leesfouten: medewerker meldt, beheerder bekijkt en deelt */
function meldLeesfout(){if(!scan)return;const notitie=prompt('Wat klopt er niet? (mag leeg blijven)','');if(notitie===null)return;const id='pf'+Date.now().toString(36);
  S.notfotos[id]=scan.fotoHoog||scan.foto||null;
  S.pbFouten[id]={id,t:Date.now(),wie:ik()?.naam||'',d:scan.d,notitie:String(notitie).slice(0,300),regels:(scan.regels||[]).map(r=>({a:r.artnr||'',n:r.aantal,o:r.orig??r.aantal,naam:r.naam,tw:!!r.twijfel,doel:r.doel||'',z:!!r.zeker,bk:!!r.bekend,sj:r.sjab||'',ts:(r.tess||[]).join('/')})),datumBon:scan.datumBon||'',versie:APP_BOUW,tekst:String(scan.tekst||'').slice(0,6000)};
  const l=Object.values(S.pbFouten).sort((a,b)=>a.t-b.t);while(l.length>15){const x=l.shift();S.notfotos[x.id]=null;delete S.pbFouten[x.id]}
  log('Leesfout pakbon gemeld');bewaar();bevestig('✓ Gemeld. De beheerder kan dit bekijken.')}
function leesfoutenHtml(){const l=Object.values(S.pbFouten).sort((a,b)=>b.t-a.t);L.pfGezien=Date.now();bewaarL();
  return`<div class="kop"><div class="koprij"><h1>Leesfouten pakbon</h1></div><p>Gemeld door medewerkers. Stuur een melding naar Claude, dan kan het scannen verder verbeterd worden.</p></div>
   ${l.length?`<div class="kaartje"><h3>Zo komt het in de goede chat</h3><div class="sub">1. Tik op <b>Delen</b> en kies <b>Bewaar in Bestanden</b>.<br>2. Open bij Claude de chat van Brood Opzet.<br>3. Tik op <b>＋</b> → <b>Bestanden</b> en kies het bestand (brood-opzet-leesfout-…zip).</div>
    ${l.length>1?`<div class="knoppen" style="justify-content:flex-start;padding:0;margin-top:10px"><button class="knop klein" data-a="pfdeel" data-v="alle">Alle ${l.length} delen in één bestand</button></div>`:''}</div>`:''}
   ${l.length?`<div class="sectie">${l.map(x=>`<div class="rij inv matrij"><div class="groei"><div class="naam">Pakbon ${esc(datumTekst(x.d))}</div><div class="sub">${esc(x.wie)} · ${esc(datumTekst(iso(new Date(x.t))))} ${tijdTekst(x.t)} · ${x.regels.length} regels gelezen${x.notitie?`<br>“${esc(x.notitie)}”`:''}</div></div>
     <div class="matknoppen">${S.notfotos[x.id]?`<button class="knop rand klein" data-a="pffoto" data-v="${x.id}">Foto</button>`:''}<button class="knop klein" data-a="pfdeel" data-v="${x.id}">Delen</button><button class="knop rand klein rood" data-a="pfweg" data-v="${x.id}">Verwijderen</button></div></div>`).join('')}</div>`:'<p class="leeg">Geen leesfouten gemeld. 👌</p>'}`}
/* 10.8.3 melden aan Claude: één zip met alles erin, zodat het in de juiste chat kan */
const CRC_T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRC_T[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
function maakZip(bestanden){const enc=new TextEncoder(),delen=[],cd=[];let off=0;const nu=new Date(),dt=((nu.getHours()<<11)|(nu.getMinutes()<<5)|(nu.getSeconds()>>1))&0xFFFF,dd=(((nu.getFullYear()-1980)<<9)|((nu.getMonth()+1)<<5)|nu.getDate())&0xFFFF;
  for(const[naam,data]of bestanden){const n=enc.encode(naam),d=typeof data==='string'?enc.encode(data):data,c=crc32(d),h=new DataView(new ArrayBuffer(30));
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint16(10,dt,true);h.setUint16(12,dd,true);h.setUint32(14,c,true);h.setUint32(18,d.length,true);h.setUint32(22,d.length,true);h.setUint16(26,n.length,true);h.setUint16(28,0,true);
    const z=new DataView(new ArrayBuffer(46));z.setUint32(0,0x02014b50,true);z.setUint16(4,20,true);z.setUint16(6,20,true);z.setUint16(8,0x0800,true);z.setUint16(10,0,true);z.setUint16(12,dt,true);z.setUint16(14,dd,true);z.setUint32(16,c,true);z.setUint32(20,d.length,true);z.setUint32(24,d.length,true);z.setUint16(28,n.length,true);z.setUint32(42,off,true);
    delen.push(new Uint8Array(h.buffer),n,d);cd.push(new Uint8Array(z.buffer),n);off+=30+n.length+d.length}
  const cdLen=cd.reduce((t,x)=>t+x.length,0),eind=new DataView(new ArrayBuffer(22));eind.setUint32(0,0x06054b50,true);eind.setUint16(8,bestanden.length,true);eind.setUint16(10,bestanden.length,true);eind.setUint32(12,cdLen,true);eind.setUint32(16,off,true);
  return new Blob([...delen,...cd,new Uint8Array(eind.buffer)],{type:'application/zip'})}
async function dataUrlBytes(u){return new Uint8Array(await dataUrlBlob(u).arrayBuffer())}
function leesfoutTekst(x){const sn=id=>id==='negeer'?'(negeren)':S.soorten.find(s=>s.id===id)?.naam||(id?'?':'(niet gekoppeld)');
  return`Leesfout pakbon ${x.d}${x.datumBon&&x.datumBon!==x.d?` (datum op de bon: ${x.datumBon})`:''}
Gemeld door ${x.wie} op ${new Date(x.t).toLocaleString('nl-NL')}${x.versie?` · app ${x.versie}`:''}
${x.notitie?'Opmerking: '+x.notitie+'\n':''}
Regels zoals gelezen (art.nr | gelezen aantal → na aanpassen | naam | gekoppeld aan | details):
`+x.regels.map(r=>`${r.a||'?'} | ${r.o??r.n}${r.o!=null&&r.o!==r.n?' → '+r.n:''} | ${r.naam} | ${sn(r.doel)}${r.tw?' | twijfel':''}${r.sj!==undefined?` | cijferlezing ${r.sj||'-'}, tekstlezing ${r.ts||'-'}${r.bk?'':', nummer onbekend'}`:''}`).join('\n')+`\n\n--- ruwe tekst ---\n${x.tekst}`}
async function leesfoutZip(ids){const best=[],delen=[];
  best.push(['LEESMIJ-voor-Claude.txt',`Dit is een melding uit de app Brood Opzet (Coop Vogelenzang), app-versie ${APP_BOUW}.
Onderwerp: het scannen van de broodpakbon leest iets verkeerd.
Claude: gebruik dit in de chat waar Brood Opzet wordt ontwikkeld (pakbon scannen: leesPagina, koppelRegels, leesAantal).
Bakker: ${S.bakker||'onbekend'} · winkel: ${(typeof winkelNaam==='function'&&winkelNaam())||''}
Aantal meldingen: ${ids.length}

Per melding: melding-<datum>.txt (wat er gelezen is) en pakbon-<datum>.jpg (de foto).
koppelingen.json: welke artikelnummers bij welke broodsoort horen.
`]);
  const ko={soorten:S.soorten.filter(s=>s.type==='vers'&&s.naam.trim()).map(s=>({id:s.id,naam:s.naam,artnr:artnrsVan(s),gesneden:s.gesneden})),pakbonNamen:S.pakbonNamen||{},negeer:S.pakbonNegeer||[]};
  best.push(['koppelingen.json',JSON.stringify(ko,null,1)]);
  for(const id of ids){const x=S.pbFouten[id];if(!x)continue;let tag=x.d,k=2;while(delen.includes(tag))tag=x.d+'-'+k++;delen.push(tag);
    best.push([`melding-${tag}.txt`,leesfoutTekst(x)]);best.push([`melding-${tag}.json`,JSON.stringify(x,null,1)]);
    const f=S.notfotos[id];if(typeof f==='string'&&f.startsWith('data:'))best.push([`pakbon-${tag}.jpg`,await dataUrlBytes(f)])}
  const naam=ids.length===1?`brood-opzet-leesfout-pakbon-${S.pbFouten[ids[0]].d}.zip`:`brood-opzet-leesfouten-pakbon-${iso()}.zip`;
  return new File([maakZip(best)],naam,{type:'application/zip'})}
async function deelLeesfout(id){const ids=id==='alle'?Object.values(S.pbFouten).sort((a,b)=>a.t-b.t).map(x=>x.id):[id];if(!ids.length||!S.pbFouten[ids[0]])return;
  try{await deelBestand(await leesfoutZip(ids))}catch(e){console.warn(e);toast('Delen lukte niet')}}
/* scannen zonder internet: leesprogramma uit de map ocr/ naast de app (bewaard door de service worker) */
let OCR_LOKAAL=null;
async function ocrLokaal(){if(OCR_LOKAAL!==null)return OCR_LOKAAL;
  try{OCR_LOKAAL=location.protocol.startsWith('http')&&(await (await fetch('ocr/ok.txt')).text()).trim()==='ok'}catch(e){OCR_LOKAAL=false}return OCR_LOKAAL}
const OCR_BESTANDEN=['ok.txt','tesseract.min.js','worker.min.js','tesseract-core-simd-lstm.wasm.js','tesseract-core-lstm.wasm.js','eng.traineddata.gz','pdf.min.js','pdf.worker.min.js'];
async function ocrVoorbereiden(){try{if(!heeft('scan')||L.ocrKlaar===2||!navigator.onLine||!('caches'in window)||!(await ocrLokaal()))return;
  for(const f of OCR_BESTANDEN){const u=new URL('ocr/'+f,location.href).href;if(!(await caches.match(u)))await fetch(u)}
  L.ocrKlaar=2;bewaarL()}catch(e){}}
