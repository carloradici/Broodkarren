/* ================= 10.10 chat ================= */
/* Gesprekken staan in S.berichten (sleutel 'berichten'). Soorten: privé (medewerker ↔ beheer), 'team' en mededelingen ('med').
   Berichten in b.r (map), reacties in b.re, stemmen in b.st, gelezen in b.lees, bevestigd in b.bev: allemaal maps, zodat samenvoegen veilig is.
   Instellingen in S.berichten._inst. Foto's en spraak als notfoto 'cm…'/'ca…'. */
const CHAT_EMO=['👍','✅','❤️','😂','😮','🙏'];
const CHAT_SNEL_STD=['👍 Oké','Komt eraan','Bedankt!','Ik bel je zo'];
const CHAT_MELD_STD=['Deeg bijna op','Oven storing','Levering niet compleet','Materiaal op'];
let chatId=null,chatAntw=null,chatBijlage=null,chatZoek='',chatFilter='alles',chatOpname=null,chatBasisJ=null,chatBasisT='';
function chatInst(){const i=isObj(S.berichten._inst)?S.berichten._inst:{};
  return{snel:Array.isArray(i.snel)?i.snel:CHAT_SNEL_STD,meld:Array.isArray(i.meld)?i.meld:CHAT_MELD_STD,team:i.team!==false,herinner:i.herinner??4,bewaar:i.bewaar??6,media:i.media??3,auto:i.auto!==false}}
function chatInstZet(k,v){if(!isObj(S.berichten._inst))S.berichten._inst={};S.berichten._inst[k]=v;bewaar()}
const chatBer=()=>Object.values(S.berichten).filter(b=>isObj(b)&&b.id&&S.berichten[b.id]===b);
const chatSoort=b=>b.type==='team'?'team':b.type==='med'?'med':'prive';
const mijnSleutel=()=>isAdmin()?'beheer':(ik()?.id||'');
function chatVanMij(b){const u=ik();return!!u&&(b.uid?b.uid===u.id:b.van===u.naam)}
function chatZichtbaar(b){const s=chatSoort(b);if(s==='team')return chatInst().team;if(s==='med')return true;return isAdmin()||chatVanMij(b)}
/* alle berichten van een gesprek, oudste eerst; geplande berichten van een ander pas na het tijdstip */
function chatMsgs(b,ookGepland){const l=[];if(b.tekst)l.push({id:'0',uid:b.vanBeheer?'':(b.uid||''),beheer:!!b.vanBeheer,van:b.vanBeheer?(b.wie||'Beheerder'):b.van,tekst:b.tekst,t:b.t||0});
  for(const[id,r]of Object.entries(isObj(b.r)?b.r:{}))if(isObj(r)&&(r.tekst||r.foto||r.audio||r.link||r.peil||r.weg))l.push({id,...r});
  const nu=Date.now();return l.map(m=>({...m,tm:m.op||m.t||0})).filter(m=>ookGepland||!m.op||m.op<=nu||chatIsMijn(m)).sort((a,c)=>a.tm-c.tm)}
function chatIsMijn(m){if(m.auto)return false;if(m.beheer)return isAdmin();const u=ik();return!!u&&(m.uid?m.uid===u.id:m.van===u.naam)}
const chatLaatste=b=>{const nu=Date.now(),l=chatMsgs(b).filter(m=>m.tm<=nu);return l[l.length-1]||{tekst:'',t:b.t||0,tm:b.t||0}};
function chatLeesVan(b,k){if(isObj(b.lees)&&b.lees[k]!=null)return b.lees[k];if(chatSoort(b)==='prive'){if(k==='beheer')return b.gelezen===false?0:9e15;return b.nieuwM?0:9e15}return 0}
function chatOngelezen(b){if(!chatZichtbaar(b))return 0;const k=mijnSleutel(),tot=chatLeesVan(b,k);if(chatSoort(b)==='prive'&&!isAdmin()&&!chatVanMij(b))return 0;
  return chatMsgs(b).filter(m=>!chatIsMijn(m)&&!m.auto&&m.tm>tot).length}
function chatGelezenZet(b){const k=mijnSleutel();if(!k||!chatOngelezen(b))return false;if(!isObj(b.lees))b.lees={};b.lees[k]=Date.now();
  if(chatSoort(b)==='prive'){if(isAdmin())b.gelezen=true;else b.nieuwM=false}return true}
const ongelezen=()=>isAdmin()?chatBer().filter(b=>chatOngelezen(b)).length:0;
const ongelezenM=()=>isAdmin()?0:chatBer().filter(b=>chatOngelezen(b)).length;
const chatTotaal=()=>chatBer().reduce((t,b)=>t+(chatOngelezen(b)?1:0),0);
function chatTitel(b){const s=chatSoort(b);return s==='team'?'👥 Teamchat':s==='med'?'📢 Mededeling':isAdmin()?(b.van||'Medewerker'):'Beheerder'}
function chatNaam(m){if(m.auto)return'Brood Opzet';if(m.beheer)return m.van||'Beheerder';return m.van||S.gebruikers.find(g=>g.id===m.uid)?.naam||'?'}
function chatOpen_(b){if(chatSoort(b)!=='prive')return false;const l=chatMsgs(b).filter(m=>!m.beheer&&!m.auto);if(!l.length)return false;const t=l[l.length-1].tm;return!(b.af&&b.af.t>=t)}
const chatGearch=b=>!!b.arch&&b.arch>=chatLaatste(b).tm;
const chatGedempt=b=>!!(isObj(b.demp)&&b.demp[mijnSleutel()]);
function chatWacht(b,m){if(L.modus==='lokaal'||!L.gekoppeld)return false;const bj=basis['berichten']||'';if(bj!==chatBasisT){chatBasisT=bj;try{chatBasisJ=JSON.parse(bj||'{}')}catch(e){chatBasisJ={}}}
  const sb=chatBasisJ&&chatBasisJ[b.id];if(!sb)return true;if(m.id==='0')return false;return!(isObj(sb.r)&&sb.r[m.id])}
function chatDagKop(t){const d=iso(new Date(t));return d===iso()?'Vandaag':d===plusDagen(iso(),-1)?'Gisteren':datumTekst(d)}
const chatTijd=t=>tijdTekst(t);
function chatCssLaad(){if(document.getElementById('chatCss2'))return;const st=document.createElement('style');st.id='chatCss2';st.textContent=`
:root{--cbMijn:#fde7cf;--cbMijnRand:#f6c58f;--cbAnder:var(--kaart);--cbAuto:#eef3ea}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--cbMijn:#5a3714;--cbMijnRand:#7a4c1d;--cbAuto:#25301f}}
:root[data-theme="dark"]{--cbMijn:#5a3714;--cbMijnRand:#7a4c1d;--cbAuto:#25301f}
#chatOv{position:fixed;inset:0;z-index:9;background:var(--achter);display:none;flex-direction:column}
#chatOv.open{display:flex}
#chatOv .ckop{display:flex;align-items:center;gap:8px;padding:calc(env(safe-area-inset-top,0px) + 10px) 12px 10px;background:var(--oranje,#f17d04);color:#fff}
#chatOv .ckop button{background:none;border:0;color:#fff;font-size:17px;font-weight:700;padding:6px 8px}
#chatOv .ckop .ctitel{flex:1;min-width:0}#chatOv .ckop .ctitel b{display:block;font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#chatOv .ckop .ctitel span{font-size:12px;opacity:.9}
#chatOv .clijst{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:10px 12px 14px;display:flex;flex-direction:column;gap:6px}
.cdag{align-self:center;font-size:12px;color:var(--grijs);background:var(--kaart);border:1px solid var(--lijn);border-radius:10px;padding:2px 10px;margin:8px 0 2px}
.cb{max-width:82%;align-self:flex-start;background:var(--cbAnder);border:1px solid var(--lijn);border-radius:16px 16px 16px 4px;padding:7px 11px;color:var(--tekst);position:relative}
.cb.mijn{align-self:flex-end;background:var(--cbMijn);border-color:var(--cbMijnRand);border-radius:16px 16px 4px 16px}
.cb.auto{align-self:center;background:var(--cbAuto);border-radius:12px;font-size:14px;max-width:92%}
.cb.zoek{outline:2px solid var(--oranje,#f17d04)}
.cnaam{font-size:12px;font-weight:800;color:var(--oranje,#f17d04);margin-bottom:2px}
.ctekst{font-size:16px;line-height:1.35;word-wrap:break-word;overflow-wrap:anywhere}
.ctekst .cnoem{font-weight:800;color:var(--oranje,#f17d04)}
.ctijd{font-size:11px;color:var(--grijs);margin-top:3px;text-align:right;white-space:nowrap}
.ctijd .cv2{color:#1e88e5;font-weight:800}
.cquote{border-left:3px solid var(--oranje,#f17d04);padding:2px 8px;margin-bottom:4px;font-size:13px;color:var(--grijs);background:rgba(127,127,127,.08);border-radius:4px}
.cfoto{display:block;max-width:220px;max-height:260px;border-radius:10px;margin:2px 0}
.cb audio{width:220px;max-width:100%;height:36px}
.creac{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}.creac span{background:var(--achter);border:1px solid var(--lijn);border-radius:10px;padding:0 6px;font-size:13px}
.clink{display:block;width:100%;text-align:left;border:1px solid var(--lijn);background:var(--achter);color:var(--tekst);border-radius:10px;padding:8px 10px;font-size:15px;margin:2px 0}
.cpeil{min-width:220px}.cpeil .cpo{display:block;width:100%;text-align:left;border:1px solid var(--lijn);background:var(--achter);color:var(--tekst);border-radius:10px;padding:7px 10px;margin-top:5px;position:relative;overflow:hidden;font-size:15px}
.cpeil .cpo i{position:absolute;left:0;top:0;bottom:0;background:rgba(241,125,4,.22)}.cpeil .cpo span{position:relative}.cpeil .cpo.aan{border-color:var(--oranje,#f17d04);font-weight:800}
.cvoet{background:var(--kaart);border-top:1px solid var(--lijn);padding:8px 10px calc(8px + env(safe-area-inset-bottom,0px))}
.csnel{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;-webkit-overflow-scrolling:touch}.csnel button{flex:none;border:1px solid var(--lijn);background:var(--achter);color:var(--tekst);border-radius:16px;padding:5px 11px;font-size:14px;white-space:nowrap}
.cantw{display:none;align-items:center;gap:8px;background:var(--achter);border-left:3px solid var(--oranje,#f17d04);border-radius:6px;padding:4px 8px;margin-bottom:6px;font-size:13px;color:var(--grijs)}.cantw.aan{display:flex}.cantw span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cantw button{background:none;border:0;color:var(--grijs);font-size:18px}
.crij{display:flex;gap:6px;align-items:flex-end}
.crij textarea{flex:1;min-height:42px;max-height:130px;resize:none;border:1px solid var(--lijn);border-radius:20px;padding:10px 14px;font-size:16px;font-family:inherit;background:var(--achter);color:var(--tekst);line-height:1.3}
.crij .crond{flex:none;width:42px;height:42px;border-radius:50%;border:1px solid var(--lijn);background:var(--achter);color:var(--tekst);font-size:20px;padding:0}
.crij .cstuur{flex:none;height:42px;border-radius:21px;border:0;background:var(--oranje,#f17d04);color:#fff;font-weight:800;padding:0 16px;font-size:16px}
.cnoemlijst{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}.cnoemlijst button{border:1px solid var(--oranje,#f17d04);background:none;color:var(--oranje,#f17d04);border-radius:14px;padding:3px 10px;font-size:14px}
.copname{display:none;align-items:center;gap:10px;color:#e53935;font-weight:800;margin-bottom:6px}.copname.aan{display:flex}
.csys{align-self:center;font-size:13px;color:var(--grijs);margin:4px 0}
.cbalk{margin:10px 16px 0;background:var(--oranjeLicht,#fff3e6);border:1px solid var(--oranje,#f17d04);border-radius:14px;padding:10px 12px;color:var(--tekst)}
.cbalk b{display:block;margin-bottom:2px}.cbalk .knoppen{padding:6px 0 0;justify-content:flex-start}
.tabbol{display:inline-block;width:8px;height:8px;border-radius:50%;background:#e30613;margin-left:4px;vertical-align:2px}
.cgebruikers .rij .naam{font-size:16px}
`;document.head.appendChild(st)}
/* ---------- berichten maken ---------- */
function chatNieuwId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function chatPrive(uid,maak){const g=S.gebruikers.find(x=>x.id===uid);if(!g)return null;
  const al=chatBer().filter(b=>chatSoort(b)==='prive'&&(b.uid===uid||(!b.uid&&b.van===g.naam))).sort((a,c)=>chatLaatste(c).tm-chatLaatste(a).tm)[0];if(al)return al;
  if(!maak)return null;const id='p_'+uid;if(!S.berichten[id])S.berichten[id]={id,van:g.naam,uid,t:Date.now(),r:{},lees:{}};return S.berichten[id]}
function chatTeam(){if(!S.berichten.team)S.berichten.team={id:'team',type:'team',t:Date.now(),r:{},lees:{}};return S.berichten.team}
function chatVoegToe(b,m){const mij=ik();if(!mij)return null;b.r=isObj(b.r)?b.r:{};const id=chatNieuwId();
  const x={van:mij.naam,uid:mij.id,beheer:isAdmin(),t:Date.now(),...m};for(const k of Object.keys(x))if(x[k]===undefined||x[k]===null||x[k]==='')delete x[k];
  b.r[id]=x;if(!isObj(b.lees))b.lees={};b.lees[mijnSleutel()]=Date.now();
  if(chatSoort(b)==='prive'){if(isAdmin()){b.nieuwM=true;b.gelezen=true}else{b.gelezen=false;b.nieuwM=false}}
  if(chatGearch(b)&&!isAdmin())delete b.arch;return id}
function chatAuto(tekst){if(!chatInst().team||!chatInst().auto)return;const b=chatTeam();b.r[chatNieuwId()]={auto:true,van:'Brood Opzet',tekst:String(tekst).slice(0,300),t:Date.now()}}
/* ---------- scherm ---------- */
function chatOv(){let o=document.getElementById('chatOv');if(!o){o=document.createElement('div');o.id='chatOv';o.setAttribute('role','dialog');document.body.appendChild(o)}return o}
function openChat(id,opts={}){const b=S.berichten[id];if(!b)return;chatCssLaad();chatId=id;chatAntw=null;if(!opts.houdBijlage)chatBijlage=null;
  const o=chatOv();const k=chatSoort(b),adm=isAdmin();
  const leden=k==='team'?S.gebruikers.filter(g=>g.actief!==false).length:0;
  o.innerHTML=`<div class="ckop"><button data-c="dicht">‹</button><div class="ctitel"><b id="cTitel">${esc(chatTitel(b))}</b><span id="cSub">${k==='team'?leden+' leden':k==='med'?'Aan iedereen':''}</span></div><button data-c="menu" aria-label="Meer">⋯</button></div>
   <div class="clijst" id="chatLijst"></div>
   ${k==='med'&&!adm?`<div class="cvoet" id="cVoet"></div>`:`<div class="cvoet" id="cVoet">
     <div class="cnoemlijst" id="cNoem" style="display:none"></div>
     <div class="csnel" id="cSnel">${(adm?chatInst().snel:chatInst().meld).map(t=>`<button data-c="snel">${esc(t)}</button>`).join('')}</div>
     <div class="cantw" id="cAntw"><span></span><button data-c="antwweg">✕</button></div>
     <div class="copname" id="cOpname"><span>● Opnemen <b id="cOpTijd">0:00</b></span><button class="knop rand klein" data-c="opstop">Stop en stuur</button><button class="knop rand klein" data-c="opweg">Annuleer</button></div>
     <div class="crij"><button class="crond" data-c="plus" aria-label="Bijlage">＋</button><textarea id="chatTekst" rows="1" maxlength="1000" placeholder="Bericht"></textarea><button class="crond" data-c="mic" id="cMic" aria-label="Spraakbericht">🎤</button><button class="cstuur" data-c="stuur" id="cStuur" style="display:none">Stuur</button></div>
     <input type="file" accept="image/*" id="chatFotoIn" style="display:none"></div>`}`;
  o.classList.add('open');
  const ta=document.getElementById('chatTekst');if(ta){const c=(L.chatConcept||{})[id];if(c){ta.value=c;chatInvoer(ta)}}
  chatBijlageToon();chatVernieuw(true);if(opts.zoekMsg)setTimeout(()=>{const el=document.querySelector(`#chatLijst [data-m="${CSS.escape(opts.zoekMsg)}"]`);if(el){el.classList.add('zoek');el.scrollIntoView({block:'center'})}},60);
  if(sub==='berichten'&&tab==='meer')render()}
function chatDicht(){const o=document.getElementById('chatOv');if(o){o.classList.remove('open');o.innerHTML=''}if(chatOpname)chatOpnameStop(false);chatId=null;chatAntw=null;chatBijlage=null;render()}
function chatVernieuw(naarOnder){const b=S.berichten[chatId],el=document.getElementById('chatLijst');if(!b||!el){if(chatId&&!b)chatDicht();return}
  const onder=naarOnder||el.scrollHeight-el.scrollTop-el.clientHeight<80;
  if(document.visibilityState!=='hidden'&&chatGelezenZet(b))bewaar();
  el.innerHTML=chatLijstHtml(b);if(onder)el.scrollTop=el.scrollHeight;
  const t=document.getElementById('cTitel');if(t)t.textContent=chatTitel(b)}
function chatLijstHtml(b){const k=chatSoort(b),adm=isAdmin(),l=chatMsgs(b,true),uit=[];let dag='';const ander=k==='prive'?(adm?(b.uid||S.gebruikers.find(g=>g.naam===b.van)?.id||''):'beheer'):null;
  if(k==='med'){uit.push(chatMedKop(b))}
  for(const m of l){const d=iso(new Date(m.tm));if(d!==dag){dag=d;uit.push(`<div class="cdag">${esc(chatDagKop(m.tm))}</div>`)}uit.push(chatBubbel(b,m,k,ander))}
  if(k==='prive'&&b.af&&!chatOpen_(b))uit.push(`<div class="csys">✓ Afgehandeld door ${esc(b.af.wie||'beheerder')} · ${esc(chatDagKop(b.af.t))} ${tijdTekst(b.af.t)}</div>`);
  if(!l.length&&k!=='med')uit.push(`<p class="leeg">${k==='team'?'Nog geen berichten in de teamchat. Iedereen leest mee.':'Nog geen berichten. Typ hieronder je bericht.'}</p>`);
  return uit.join('')}
function chatTekstHtml(t){let h=esc(t).replace(/\n/g,'<br>');for(const g of S.gebruikers){const n=(g.naam||'').split(' ')[0];if(n)h=h.replace(new RegExp('@'+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','g'),`<span class="cnoem">@${esc(n)}</span>`)}return h}
function chatBubbel(b,m,k,ander){const mijn=chatIsMijn(m);if(m.auto)return`<div class="cb auto" data-m="${esc(m.id)}"><div class="ctekst">🤖 ${chatTekstHtml(m.tekst||'')}</div><div class="ctijd">${tijdTekst(m.tm)}</div></div>`;
  const naam=!mijn&&(k!=='prive'||m.ov)?`<div class="cnaam">${m.ov?'🔁 Overdracht · ':''}${esc(chatNaam(m))}</div>`:(m.ov?`<div class="cnaam">🔁 Overdracht</div>`:'');
  let inh='';if(m.weg)inh=`<div class="ctekst" style="font-style:italic;color:var(--grijs)">Bericht verwijderd</div>`;else{
    if(m.antw){const o=chatMsgs(b,true).find(x=>x.id===m.antw);if(o)inh+=`<div class="cquote"><b>${esc(chatNaam(o))}</b><br>${esc((o.weg?'Bericht verwijderd':o.tekst||(o.foto?'📷 Foto':o.audio?'🎤 Spraakbericht':o.link?'📎 '+chatLinkLabel(o.link):'📊 Stemming')).slice(0,90))}</div>`}
    if(m.foto){const f=S.notfotos[m.foto];inh+=f?`<img class="cfoto" src="${f}" alt="Foto" data-c="foto" data-v="${esc(m.foto)}">`:`<div class="ctekst" style="color:var(--grijs)">📷 Foto niet meer beschikbaar</div>`}
    if(m.audio){const f=S.notfotos[m.audio];inh+=f?`<audio controls preload="none" src="${f}"></audio>`:`<div class="ctekst" style="color:var(--grijs)">🎤 Spraakbericht niet meer beschikbaar</div>`}
    if(m.link)inh+=`<button class="clink" data-c="link" data-v="${esc(m.id)}">📎 ${esc(chatLinkLabel(m.link))} ›</button>`;
    if(m.peil)inh+=chatPeilHtml(b,m);
    if(m.tekst)inh+=`<div class="ctekst">${chatTekstHtml(m.tekst)}</div>`}
  const re=isObj(b.re)&&isObj(b.re[m.id])?Object.values(b.re[m.id]).filter(Boolean):[];const rg={};for(const e of re)rg[e]=(rg[e]||0)+1;
  const reac=Object.keys(rg).length?`<div class="creac">${Object.entries(rg).map(([e,n])=>`<span>${e}${n>1?' '+n:''}</span>`).join('')}</div>`:'';
  let v='';if(mijn&&!m.weg){if(m.op&&m.op>Date.now())v=` · ⏰ ${esc(chatDagKop(m.op))} ${tijdTekst(m.op)}`;else if(chatWacht(b,m))v=' ⏱';else if(ander!==null){v=chatLeesVan(b,ander)>=m.tm?' <span class="cv2">✓✓</span>':' ✓'}else{const n=Object.entries(isObj(b.lees)?b.lees:{}).filter(([x,t])=>x!==mijnSleutel()&&t>=m.tm).length;v=n?` <span class="cv2">✓✓ ${n}</span>`:' ✓'}}
  return`<div class="cb ${mijn?'mijn':''}" data-c="msg" data-m="${esc(m.id)}">${naam}${inh}${reac}<div class="ctijd">${m.gew&&!m.weg?'gewijzigd · ':''}${tijdTekst(m.tm)}${v}</div></div>`}
/* mededeling: bovenaan wie het gelezen heeft */
function chatMedKop(b){const adm=isAdmin(),mw=S.gebruikers.filter(g=>g.rol!=='admin'&&g.actief!==false),bev=isObj(b.bev)?b.bev:{},k=mijnSleutel();
  const tot=b.tot?`<div class="hulp" style="margin:4px 0 0">Vast bovenaan Klaarzetten t/m ${esc(datumTekst(b.tot))}</div>`:'';
  if(adm){const n=mw.filter(g=>bev[g.id]).length;return`<div class="cbalk"><b>📢 Mededeling aan iedereen</b>${tot}<div class="hulp" style="margin:4px 0 0">${n} van ${mw.length} hebben bevestigd: ${mw.map(g=>`${bev[g.id]?'✓':'○'} ${esc(g.naam)}`).join(' · ')||'nog geen medewerkers'}</div></div>`}
  return`<div class="cbalk"><b>📢 Mededeling van de beheerder</b>${tot}${bev[k]?`<div class="hulp" style="margin:4px 0 0">✓ Je hebt bevestigd dat je dit gelezen hebt</div>`:`<div class="knoppen"><button class="knop klein" data-c="bevestig" data-v="${esc(b.id)}">✓ Gelezen</button><button class="knop rand klein" data-c="medprive">Reageer privé</button></div>`}</div>`}
/* stemming */
function chatPeilHtml(b,m){const st=isObj(b.st)&&isObj(b.st[m.id])?b.st[m.id]:{},k=mijnSleutel(),n=m.peil.opties.map((_,i)=>Object.values(st).filter(x=>x===i).length),tot=n.reduce((a,c)=>a+c,0)||1;
  const wie=i=>Object.entries(st).filter(([,x])=>x===i).map(([u])=>u==='beheer'?'Beheerder':S.gebruikers.find(g=>g.id===u)?.naam||'?');
  return`<div class="cpeil"><div class="ctekst"><b>📊 ${esc(m.peil.vraag)}</b></div>${m.peil.opties.map((o,i)=>`<button class="cpo ${st[k]===i?'aan':''}" data-c="stem" data-v="${esc(m.id)}" data-n="${i}"><i style="width:${Math.round(n[i]/tot*100)}%"></i><span>${st[k]===i?'✓ ':''}${esc(o)} · ${n[i]}${isAdmin()&&n[i]?` (${esc(wie(i).join(', '))})`:''}</span></button>`).join('')}</div>`}
/* koppelingen naar de app */
function chatLinkLabel(l){if(!l)return'';if(l.t==='soort')return'Broodsoort: '+(S.soorten.find(s=>s.id===l.id)?.naam||'?');if(l.t==='lev')return'Levering '+datumTekst(l.d);if(l.t==='derv')return'Dervinglijst '+datumTekst(l.d);if(l.t==='dag')return'Klaarzetten '+datumTekst(l.d);return'Link'}
function chatLinkOpen(l){if(!l)return;const o=document.getElementById('chatOv');if(o){o.classList.remove('open')}chatId=null;
  if(l.t==='soort'){render();openInfo(l.id)}else if(l.t==='lev'){tab='meer';sub='pakbonnen';render();if(S.levering[l.d])openPakbon(l.d)}else if(l.t==='derv'){tab='derving';dervDatum=l.d;render();if(S.dervReg[l.d]?.[l.id])openKassa(l.id,l.d)}else if(l.t==='dag'){tab='lijst';datum=l.d;volgVandaag=l.d===iso();sub=null;render()}}
function chatBijlageToon(){const el=document.getElementById('cAntw');if(!el)return;const t=chatAntw?(()=>{const b=S.berichten[chatId],o=b&&chatMsgs(b,true).find(x=>x.id===chatAntw);return o?'↩︎ '+chatNaam(o)+': '+(o.tekst||(o.foto?'Foto':o.audio?'Spraakbericht':'Bericht')):''})():chatBijlage?'📎 '+chatLinkLabel(chatBijlage):'';
  el.classList.toggle('aan',!!t);el.querySelector('span').textContent=t;chatKnop()}
function chatInvoer(ta){ta.style.height='auto';ta.style.height=Math.min(130,ta.scrollHeight)+'px';chatKnop();
  L.chatConcept=L.chatConcept||{};if(ta.value)L.chatConcept[chatId]=ta.value;else delete L.chatConcept[chatId];clearTimeout(chatInvoer.t);chatInvoer.t=setTimeout(bewaarL,400);
  const b=S.berichten[chatId],nl=document.getElementById('cNoem');if(nl&&b&&chatSoort(b)==='team'){const m=/@([^\s@]*)$/.exec(ta.value.slice(0,ta.selectionStart));
    if(m){const z=m[1].toLowerCase(),l=S.gebruikers.filter(g=>g.actief!==false&&g.id!==ik()?.id&&g.naam.toLowerCase().startsWith(z)).slice(0,6);nl.innerHTML=l.map(g=>`<button data-c="noem" data-v="${esc(g.naam.split(' ')[0])}">@${esc(g.naam.split(' ')[0])}</button>`).join('');nl.style.display=l.length?'flex':'none'}else nl.style.display='none'}}
function chatKnop(){const ta=document.getElementById('chatTekst'),s=document.getElementById('cStuur'),m=document.getElementById('cMic');if(!ta||!s||!m)return;const vol=!!ta.value.trim()||!!chatBijlage;s.style.display=vol?'':'none';m.style.display=vol?'none':''}
function chatStuur(extra={}){const b=S.berichten[chatId]||null,ta=document.getElementById('chatTekst'),t=(ta?.value||'').trim();if(!b)return;
  if(!t&&!extra.foto&&!extra.audio&&!chatBijlage&&!extra.peil)return;
  const{houdTekst,...ex}=extra,m={tekst:t.slice(0,1000),antw:chatAntw||undefined,link:chatBijlage||undefined,...ex};
  if(chatSoort(b)==='team'){const noem=S.gebruikers.filter(g=>{const n=(g.naam||'').split(' ')[0];return n&&new RegExp('@'+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(t)}).map(g=>g.id);if(noem.length)m.noem=noem}
  chatVoegToe(b,m);log(chatSoort(b)==='prive'?(isAdmin()?`Bericht aan ${b.van}`:'Bericht aan beheerder'):chatSoort(b)==='team'?'Bericht in teamchat':'Mededeling');
  if(ta&&!houdTekst){ta.value='';chatInvoer(ta)}chatAntw=null;chatBijlage=null;chatBijlageToon();bewaar();chatVernieuw(true);setTimeout(()=>stuurPush({}),1500)}
/* foto */
function chatFoto(file){verkleinNaar(file,1000,u=>{const id='cm'+chatNieuwId();S.notfotos[id]=u;chatStuur({foto:id,houdTekst:false})})}
/* spraak */
async function chatOpnameStart(){if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Spraakberichten werken niet op dit toestel');return}
  try{const str=await navigator.mediaDevices.getUserMedia({audio:true}),type=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(t=>MediaRecorder.isTypeSupported?.(t))||'';
    const rec=new MediaRecorder(str,type?{mimeType:type,audioBitsPerSecond:32000}:{}),stukken=[];rec.ondataavailable=e=>{if(e.data.size)stukken.push(e.data)};
    chatOpname={rec,str,stukken,start:Date.now(),sturen:true,type:type||'audio/mp4'};rec.onstop=()=>{const o=chatOpname;chatOpname=null;str.getTracks().forEach(x=>x.stop());document.getElementById('cOpname')?.classList.remove('aan');clearInterval(o?.klok);
      if(!o||!o.sturen||!stukken.length)return;const blob=new Blob(stukken,{type:o.type}),r=new FileReader();r.onload=()=>{if(String(r.result).length>900000){toast('Spraakbericht is te lang');return}const id='ca'+chatNieuwId();S.notfotos[id]=r.result;chatStuur({audio:id,houdTekst:true})};r.readAsDataURL(blob)};
    rec.start();document.getElementById('cOpname')?.classList.add('aan');chatOpname.klok=setInterval(()=>{const s=Math.floor((Date.now()-(chatOpname?.start||Date.now()))/1000),el=document.getElementById('cOpTijd');if(el)el.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');if(s>=60)chatOpnameStop(true)},250)}
  catch(e){toast('Geen toegang tot de microfoon. Sta de microfoon toe in de instellingen.')}}
function chatOpnameStop(sturen){if(!chatOpname)return;chatOpname.sturen=sturen;try{chatOpname.rec.stop()}catch(e){}}
/* ---------- menu's ---------- */
function chatMsgMenu(mid){const b=S.berichten[chatId];if(!b)return;const m=chatMsgs(b,true).find(x=>x.id===mid);if(!m||m.auto)return;const mijn=chatIsMijn(m),vers=Date.now()-(m.t||0)<5*60000,k=chatSoort(b);
  const mijnRe=isObj(b.re)&&isObj(b.re[mid])?b.re[mid][mijnSleutel()]:null;
  const lezers=Object.entries(isObj(b.lees)?b.lees:{}).filter(([x,t])=>x!==mijnSleutel()&&t>=m.tm).map(([x])=>x==='beheer'?'Beheerder':S.gebruikers.find(g=>g.id===x)?.naam||'?');
  toonSheet(`<div class="pkop"><span style="width:60px"></span><b>Bericht</b><button data-a="sluit" style="font-weight:700">Sluiten</button></div><div class="pinhoud">
   ${m.weg?'':`<div class="chips" style="justify-content:center;font-size:24px">${CHAT_EMO.map(e=>`<button class="chip ${mijnRe===e?'aan':''}" style="font-size:22px" data-c="reageer" data-v="${esc(mid)}" data-n="${e}">${e}</button>`).join('')}</div>`}
   <div class="sectie" style="margin:12px 0 0">
    ${m.weg||(k==='med'&&!isAdmin())?'':`<div class="rij"><button class="regel" data-c="antw" data-v="${esc(mid)}"><div class="groei"><div class="naam">↩︎ Antwoorden</div></div></button></div>`}
    ${m.tekst&&!m.weg?`<div class="rij"><button class="regel" data-c="kopieer" data-v="${esc(mid)}"><div class="groei"><div class="naam">📋 Kopiëren</div></div></button></div>`:''}
    ${mijn&&vers&&m.tekst&&!m.weg&&mid!=='0'?`<div class="rij"><button class="regel" data-c="wijzig" data-v="${esc(mid)}"><div class="groei"><div class="naam">✏️ Wijzigen</div><div class="sub">Kan tot 5 minuten na versturen</div></div></button></div>`:''}
    ${((mijn&&vers)||isAdmin())&&!m.weg&&mid!=='0'?`<div class="rij"><button class="regel" data-c="msgweg" data-v="${esc(mid)}"><div class="groei"><div class="naam" style="color:var(--rood)">🗑 Verwijderen</div></div></button></div>`:''}
   </div>
   ${mijn&&k!=='prive'?`<p class="hulp">Gelezen door: ${lezers.length?esc(lezers.join(', ')):'nog niemand'}</p>`:''}</div>`)}
function chatMenu(){const b=S.berichten[chatId];if(!b)return;const k=chatSoort(b),adm=isAdmin();
  const r=(c,t,sub2,v)=>`<div class="rij"><button class="regel" data-c="${c}" ${v!=null?`data-v="${esc(v)}"`:''}><div class="groei"><div class="naam">${t}</div>${sub2?`<div class="sub">${sub2}</div>`:''}</div></button></div>`;
  toonSheet(`<div class="pkop"><span style="width:60px"></span><b>${esc(chatTitel(b))}</b><button data-a="sluit" style="font-weight:700">Sluiten</button></div><div class="pinhoud"><div class="sectie" style="margin:0">
   ${k==='prive'&&adm?r('afhandel',chatOpen_(b)?'✓ Afgehandeld':'↺ Weer open zetten',chatOpen_(b)?'De medewerker ziet dat het geregeld is':''):''}
   ${r('demp',chatGedempt(b)?'🔔 Meldingen weer aan':'🔕 Dempen','Geen pushmeldingen voor dit gesprek'+(k==='team'?' (behalve als iemand je @noemt)':''))}
   ${adm&&k!=='team'?r('archief',chatGearch(b)?'📤 Uit het archief halen':'🗄 Archiveren','Bij een nieuw bericht komt het vanzelf terug'):''}
   ${r('zoekhier','🔍 Zoeken in dit gesprek')}
   ${r('pdf','📄 Gesprek delen of printen','Als PDF')}
   ${adm?r('chatweg','<span style="color:var(--rood)">🗑 Gesprek verwijderen</span>',afwStap==='chatweg'?'<b>Zeker? Tik nogmaals</b>':''):''}
  </div></div>`)}
function chatPlusMenu(){const b=S.berichten[chatId];if(!b)return;const k=chatSoort(b);
  const r=(c,t,s2)=>`<div class="rij"><button class="regel" data-c="${c}"><div class="groei"><div class="naam">${t}</div>${s2?`<div class="sub">${s2}</div>`:''}</div></button></div>`;
  toonSheet(`<div class="pkop"><span style="width:60px"></span><b>Toevoegen</b><button data-a="sluit" style="font-weight:700">Sluiten</button></div><div class="pinhoud"><div class="sectie" style="margin:0">
   ${r('fotokies','📷 Foto','Camera of fotorol')}${r('linkkies','📎 Uit de app','Broodsoort, levering, dervinglijst of klaarzetlijst')}
   ${k==='team'||isAdmin()?r('peilmaak','📊 Stemming','Bijv. wie kan zaterdag extra komen?'):''}
   ${r('plan','⏰ Bericht inplannen','Typ eerst je bericht, kies dan het tijdstip')}</div></div>`)}
function chatLinkKies(stap){const r=(c,v,t,s2)=>`<div class="rij"><button class="regel" data-c="${c}" data-v="${esc(v)}"><div class="groei"><div class="naam">${esc(t)}</div>${s2?`<div class="sub">${esc(s2)}</div>`:''}</div></button></div>`;let h='';
  if(!stap)h=r('linkstap','soort','🥖 Broodsoort')+r('linkstap','lev','🚚 Levering / pakbon')+r('linkstap','derv','🧾 Dervinglijst')+r('linkstap','dag','📋 Klaarzetlijst van een dag');
  else if(stap==='soort')h=volg(S.soorten.filter(s=>s.naam.trim())).map(s=>r('linkzet','soort|'+s.id,s.naam)).join('');
  else if(stap==='lev')h=Object.keys(S.levering).filter(d=>S.levering[d]).sort().reverse().slice(0,21).map(d=>r('linkzet','lev|'+d,'Levering '+datumTekst(d))).join('')||'<p class="leeg">Nog geen leveringen.</p>';
  else if(stap==='derv'){const l=[];for(const d of Object.keys(S.dervReg).sort().reverse().slice(0,14))for(const x of Object.values(S.dervReg[d]||{}))l.push(r('linkzet','derv|'+d+'|'+x.id,'Dervinglijst '+datumTekst(d),(x.t?tijdTekst(x.t)+' · ':'')+(x.wie||'')));h=l.join('')||'<p class="leeg">Nog geen dervinglijsten.</p>'}
  else if(stap==='dag')h=[0,1,-1,2,-2].map(n=>plusDagen(iso(),n)).map(d=>r('linkzet','dag|'+d,'Klaarzetten '+datumTekst(d))).join('');
  toonSheet(`<div class="pkop">${stap?`<button data-c="linkkies">‹ Terug</button>`:'<span style="width:60px"></span>'}<b>Uit de app</b><button data-a="sluit" style="font-weight:700">Sluiten</button></div><div class="pinhoud"><div class="sectie" style="margin:0">${h}</div></div>`)}
function chatPeilMaak(){toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Stemming</b><button data-c="peilstuur" style="font-weight:700">Versturen</button></div><div class="pinhoud">
   <label>Vraag</label><input class="veld" id="cpVraag" maxlength="120" placeholder="Bijv. Wie kan zaterdag extra komen?">
   <label>Keuzes (één per regel)</label><textarea class="veld" id="cpOpties" rows="4" placeholder="Ja&#10;Nee&#10;Alleen 's ochtends">Ja
Nee</textarea><div class="fout" id="fout"></div></div>`)}
function chatPlanMaak(){const ta=document.getElementById('chatTekst');if(!ta||!ta.value.trim()){toast('Typ eerst je bericht');return}const d=new Date(Date.now()+3600e3);d.setMinutes(0,0,0);
  const w=`${iso(d)}T${String(d.getHours()).padStart(2,'0')}:00`;
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Inplannen</b><button data-c="planzet" style="font-weight:700">Inplannen</button></div><div class="pinhoud">
   <p class="hulp">“${esc(ta.value.trim().slice(0,120))}”</p><label>Versturen op</label><input class="veld" type="datetime-local" id="cpTijd" value="${w}"><div class="fout" id="fout"></div>
   <p class="hulp">De ander ziet het bericht pas op dat moment${S.push?' en krijgt dan een pushmelding':''}.</p></div>`)}
/* PDF van een gesprek */
async function chatPdf(){const b=S.berichten[chatId];if(!b)return;toast('PDF maken…');try{await laadPdf();const{jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'});let y=18;
  const reg=(t,sz=10,vet=false)=>{doc.setFont('helvetica',vet?'bold':'normal');doc.setFontSize(sz);for(const r of doc.splitTextToSize(String(t).replace(/[^\x20-\x7E -ÿ€\n]/g,''),180)){if(y>282){doc.addPage();y=18}doc.text(r,15,y);y+=sz*.45}};
  reg((winkelNaam()||'Brood Opzet')+' – '+chatTitel(b).replace(/[^\x20-\x7E -ÿ]/g,'').trim(),14,true);y+=2;reg('Afgedrukt '+new Date().toLocaleString('nl-NL'),9);y+=3;
  for(const m of chatMsgs(b)){reg(`${new Date(m.tm).toLocaleString('nl-NL',{dateStyle:'short',timeStyle:'short'})}  ${chatNaam(m)}${m.ov?' (overdracht)':''}`,9,true);
    reg(m.weg?'(verwijderd)':[m.tekst,m.foto?'[foto]':'',m.audio?'[spraakbericht]':'',m.link?'[link: '+chatLinkLabel(m.link)+']':'',m.peil?'[stemming: '+m.peil.vraag+']':''].filter(Boolean).join(' '),10);y+=2}
  await deelBestand(new File([doc.output('blob')],`gesprek-${chatTitel(b).replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase()||'chat'}-${iso()}.pdf`,{type:'application/pdf'}))}catch(e){console.warn(e);toast('PDF maken lukte niet')}}
/* ---------- lijst met gesprekken ---------- */
function berichtenHtml(){chatCssLaad();const adm=isAdmin(),inst=chatInst(),alle=chatBer().filter(chatZichtbaar),z=chatZoek.trim().toLowerCase();
  let h=`<div class="kop"><div class="koprij"><h1>Berichten</h1>${adm?info('berichten'):''}</div><p>${adm?'Gesprekken met medewerkers, de teamchat en mededelingen.':'Je gesprekken met de beheerder, de teamchat en mededelingen.'}</p></div>
   <div class="zoekbalk"><input class="veld" id="chatZoekIn" type="search" placeholder="🔍 Zoeken in berichten" autocomplete="off" value="${esc(chatZoek)}"></div>`;
  if(z){const res=[];for(const b of alle)for(const m of chatMsgs(b))if(!m.weg&&(m.tekst||'').toLowerCase().includes(z))res.push({b,m});res.sort((a,c)=>c.m.tm-a.m.tm);
    return h+(res.length?`<div class="sectie">${res.slice(0,60).map(({b,m})=>`<div class="rij"><button class="regel" data-c="open" data-v="${esc(b.id)}" data-m="${esc(m.id)}"><div class="groei"><div class="naam" style="font-size:15px">${esc(chatTitel(b))} · ${esc(chatNaam(m))}</div><div class="sub">${esc(m.tekst.slice(0,120))} · ${esc(chatDagKop(m.tm))} ${tijdTekst(m.tm)}</div></div></button></div>`).join('')}</div>`:'<p class="leeg">Niets gevonden.</p>')}
  h+=`<div class="knoppen" style="justify-content:flex-start;flex-wrap:wrap">${adm?`<button class="knop klein" data-c="nieuw">+ Nieuw gesprek</button><button class="knop rand klein" data-c="mednieuw">📢 Mededeling</button><button class="knop rand klein" data-c="inst">⚙︎ Instellingen</button>`:`<button class="knop klein" data-c="mijnchat">+ Bericht aan de beheerder</button>`}</div>`;
  if(adm)h+=`<div class="chips" style="margin:0 16px 8px">${[['alles','Alles'],['open',`Open (${alle.filter(chatOpen_).length})`],['archief',`Archief (${alle.filter(chatGearch).length})`]].map(([k,t])=>`<button class="chip ${chatFilter===k?'aan':''}" data-c="filter" data-v="${k}">${t}</button>`).join('')}</div>`;
  let l=alle.filter(b=>chatSoort(b)==='team'?(chatMsgs(b).length||inst.team):chatMsgs(b,true).length);
  if(adm&&chatFilter==='open')l=l.filter(chatOpen_);else if(adm&&chatFilter==='archief')l=l.filter(chatGearch);else if(adm)l=l.filter(b=>!chatGearch(b));
  l.sort((a,c)=>(chatSoort(c)==='team')-(chatSoort(a)==='team')||chatLaatste(c).tm-chatLaatste(a).tm);
  if(inst.team&&chatFilter==='alles'&&!l.some(b=>chatSoort(b)==='team'))l.unshift({id:'team',type:'team',r:{},_nieuw:true});
  const rij=b=>{const x=chatLaatste(b),n=b._nieuw?0:chatOngelezen(b),k=chatSoort(b),mijnx=chatIsMijn(x);
    const tag=k==='prive'&&adm?(chatOpen_(b)?'<span class="fstatus oranje">open</span>':b.af?'<span class="fstatus groen">✓ afgehandeld</span>':''):'';
    const prev=x.weg?'Bericht verwijderd':x.tekst||(x.foto?'📷 Foto':x.audio?'🎤 Spraakbericht':x.link?'📎 '+chatLinkLabel(x.link):x.peil?'📊 '+x.peil.vraag:'');
    return`<div class="rij"><button class="regel" data-c="open" data-v="${esc(b.id)}"><div class="groei"><div class="naam" style="${n?'':'font-weight:500'}">${n?'<span class="bolletje"></span>':''}${esc(chatTitel(b))} ${tag}${chatGedempt(b)?' 🔕':''}</div><div class="sub">${b._nieuw?'Iedereen leest mee':`${mijnx?'Jij: ':k!=='prive'&&!x.auto&&x.tekst?esc(chatNaam(x).split(' ')[0])+': ':''}${esc(prev.slice(0,90))}${prev.length>90?'…':''} · ${esc(chatDagKop(x.tm))} ${tijdTekst(x.tm)}`}</div></div>${n?`<span class="telbol">${n}</span>`:''}<span class="sub" style="font-size:22px;margin-left:6px">›</span></button></div>`};
  h+=l.length?`<div class="sectie">${l.map(rij).join('')}</div>`:`<p class="leeg">${chatFilter==='open'?'Geen open meldingen. 👌':chatFilter==='archief'?'Niets in het archief.':'Nog geen berichten.'}</p>`;
  return h}
function chatKiesPersoon(){const l=S.gebruikers.filter(g=>g.rol!=='admin'&&g.actief!==false).sort((a,c)=>a.naam.localeCompare(c.naam,'nl'));
  toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Nieuw gesprek</b><span style="width:70px"></span></div><div class="pinhoud"><p class="hulp">Met wie?</p>
   ${l.length?`<div class="sectie cgebruikers" style="margin:0">${l.map(g=>`<div class="rij"><button class="regel" data-c="met" data-v="${g.id}"><div class="groei"><div class="naam">${prof(g.id).emoji?prof(g.id).emoji+' ':''}${esc(g.naam)}</div></div><span class="sub">›</span></button></div>`).join('')}</div>`:'<p class="leeg">Nog geen medewerkers.</p>'}</div>`)}
function chatMedMaak(){toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Mededeling</b><button data-c="medstuur" style="font-weight:700">Versturen</button></div><div class="pinhoud">
   <p class="hulp">Gaat naar alle medewerkers, met een pushmelding. Zij tikken op “Gelezen” en jij ziet wie het gelezen heeft.</p>
   <textarea class="veld" id="cmTekst" rows="4" maxlength="800" placeholder="Bijv. Zaterdag extra croissants bakken"></textarea>
   <label class="schakel" style="margin:12px 0 0;color:var(--tekst);font-weight:400">Vast bovenaan Klaarzetten<input type="checkbox" id="cmVast"></label>
   <label>t/m</label><input class="veld" type="date" id="cmTot" value="${plusDagen(iso(),3)}" min="${iso()}" style="width:180px"><div class="fout" id="fout"></div></div>`)}
function chatInstToon(){const i=chatInst();toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Chat-instellingen</b><button data-c="instbewaar" style="font-weight:700">Bewaren</button></div><div class="pinhoud">
   <label class="schakel" style="margin:6px 0 0;color:var(--tekst);font-weight:400">Teamchat (iedereen leest mee)<input type="checkbox" id="ciTeam" ${i.team?'checked':''}></label>
   <label class="schakel" style="margin:10px 0 0;color:var(--tekst);font-weight:400">Automatische berichten in de teamchat<input type="checkbox" id="ciAuto" ${i.auto?'checked':''}></label>
   <p class="hulp">Levering ingevuld, materiaal op en dag afgesloten.</p>
   <label>Snelle antwoorden (voor jou, één per regel)</label><textarea class="veld" id="ciSnel" rows="4">${esc(i.snel.join('\n'))}</textarea>
   <label>Snelle meldingen (voor medewerkers, één per regel)</label><textarea class="veld" id="ciMeld" rows="4">${esc(i.meld.join('\n'))}</textarea>
   <label>Herinnering bij open melding na (uur, 0 = uit)</label><input class="veld" id="ciHer" inputmode="numeric" value="${i.herinner}" style="width:90px">
   <label>Berichten bewaren (maanden, 0 = altijd)</label><input class="veld" id="ciBew" inputmode="numeric" value="${i.bewaar}" style="width:90px">
   <label>Foto's en spraakberichten bewaren (maanden)</label><input class="veld" id="ciMed" inputmode="numeric" value="${i.media}" style="width:90px"></div>`)}
/* mededeling vast bovenaan Klaarzetten */
function chatBalkKlaarzetten(){const vandaag=iso(),k=mijnSleutel();const l=chatBer().filter(b=>chatSoort(b)==='med'&&b.tot&&b.tot>=vandaag);if(!l.length)return'';chatCssLaad();
  return l.map(b=>{const m=chatMsgs(b)[0];const bev=isObj(b.bev)&&b.bev[k];return`<div class="cbalk"><b>📢 ${esc((m?.tekst||'').slice(0,200))}</b><div class="knoppen">${!isAdmin()&&!bev?`<button class="knop klein" data-c="bevestig" data-v="${esc(b.id)}">✓ Gelezen</button>`:''}<button class="knop rand klein" data-c="open" data-v="${esc(b.id)}">Openen</button></div></div>`}).join('')}
/* overdracht bij uitloggen */
function chatOverdrachtVraag(actie){bewerk={soort:'overdracht',actie};toonSheet(`<div class="pkop"><button data-a="sluit">Annuleren</button><b>Overdracht</b><span style="width:60px"></span></div><div class="pinhoud">
   <p class="hulp">Wil je iets doorgeven aan de volgende dienst? Die ziet het bij het inloggen.</p><textarea class="veld" id="ovTekst" rows="3" maxlength="500" placeholder="Bijv. Oven 2 doet raar, kaiserdeeg staat in de koeling"></textarea>
   <div class="knoppen" style="flex-wrap:wrap"><button class="knop" data-c="ovstuur">Doorgeven en ${actie==='wissel'?'wisselen':'uitloggen'}</button><button class="knop rand" data-c="ovzonder">${actie==='wissel'?'Wisselen':'Uitloggen'} zonder bericht</button></div></div>`)}
function chatOverdrachtRegels(){const b=S.berichten.team;if(!b)return[];const k=mijnSleutel(),tot=Math.max(chatLeesVan(b,k),L.ovGezien||0),grens=Date.now()-18*3600e3;
  return chatMsgs(b).filter(m=>m.ov&&!chatIsMijn(m)&&m.tm>grens&&m.tm>tot&&!m.weg).map(m=>`🔁 ${chatNaam(m)}: ${m.tekst}`)}
/* opruimen volgens bewaartermijn (alleen op het toestel van de beheerder) */
function chatOpruimen(){if(!kanBeheren())return;const i=chatInst(),nu=Date.now(),grens=i.bewaar>0?nu-i.bewaar*30.5*864e5:0,mg=nu-Math.max(1,i.media)*30.5*864e5;
  for(const b of chatBer()){for(const[id,m]of Object.entries(isObj(b.r)?b.r:{})){if(!isObj(m))continue;
      if((m.foto||m.audio)&&(m.t||0)<mg){for(const f of[m.foto,m.audio])if(f&&S.notfotos[f])S.notfotos[f]=null}
      if(grens&&(m.t||0)<grens){for(const f of[m.foto,m.audio])if(f&&S.notfotos[f])S.notfotos[f]=null;delete b.r[id];if(isObj(b.re))delete b.re[id];if(isObj(b.st))delete b.st[id]}}
    if(grens&&b.tekst&&(b.t||0)<grens){delete b.tekst}
    if(grens&&b.id!=='team'&&!chatMsgs(b,true).length&&(b.t||0)<grens)delete S.berichten[b.id]}}
/* ---------- klikken ---------- */
document.addEventListener('click',async e=>{const el=e.target.closest('[data-c]');if(!el)return;L.laatsteActie=Date.now();const c=el.dataset.c,v=el.dataset.v;
  const b=chatId?S.berichten[chatId]:null;
  try{switch(c){
  case'open':{sluit();if(v==='team'){chatTeam();bewaar()}openChat(v,{zoekMsg:el.dataset.m});return}
  case'dicht':chatDicht();return;
  case'mijnchat':{const t=chatPrive(ik()?.id,true);openChat(t.id);return}
  case'nieuw':if(!isAdmin())return;chatKiesPersoon();return;
  case'met':{if(!isAdmin())return;sluit();const t=chatPrive(v,true);openChat(t.id);return}
  case'mednieuw':if(!isAdmin())return;chatMedMaak();return;
  case'medstuur':{if(!isAdmin())return;const t=document.getElementById('cmTekst').value.trim();if(!t){document.getElementById('fout').textContent='Typ de mededeling.';return}
    const vast=document.getElementById('cmVast').checked,tot=document.getElementById('cmTot').value;const id='m_'+chatNieuwId();S.berichten[id]={id,type:'med',t:Date.now(),r:{},lees:{},bev:{},...(vast&&tot?{tot}:{})};chatVoegToe(S.berichten[id],{tekst:t.slice(0,800)});
    log('Mededeling aan iedereen');bewaar();sluit();openChat(id);setTimeout(()=>stuurPush({}),1500);return}
  case'bevestig':{const t=S.berichten[v];if(!t)return;if(!isObj(t.bev))t.bev={};t.bev[mijnSleutel()]=Date.now();chatGelezenZet(t);bewaar();if(chatId)chatVernieuw();render();toast('✓ Bevestigd');return}
  case'medprive':{const t=chatPrive(ik()?.id,true);openChat(t.id);return}
  case'inst':if(!isAdmin())return;chatInstToon();return;
  case'instbewaar':{if(!isAdmin())return;const lijst=id=>document.getElementById(id).value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,12),n=(id,d)=>{const x=parseInt(document.getElementById(id).value,10);return isFinite(x)&&x>=0?Math.min(x,99):d};
    if(!isObj(S.berichten._inst))S.berichten._inst={};Object.assign(S.berichten._inst,{team:document.getElementById('ciTeam').checked,auto:document.getElementById('ciAuto').checked,snel:lijst('ciSnel'),meld:lijst('ciMeld'),herinner:n('ciHer',4),bewaar:n('ciBew',6),media:Math.max(1,n('ciMed',3))});
    log('Chat-instellingen aangepast');bewaar();sluit();render();toast('Opgeslagen');return}
  case'filter':chatFilter=v;render();return;
  case'stuur':chatStuur();return;
  case'snel':{const ta=document.getElementById('chatTekst');if(!ta)return;const t=el.textContent;if(!isAdmin()||!ta.value.trim()){const oud=ta.value;ta.value=t;chatStuur();if(oud&&isAdmin()){ta.value=oud;chatInvoer(ta)}}else{ta.value=(ta.value+' '+t).trim();chatInvoer(ta)}return}
  case'noem':{const ta=document.getElementById('chatTekst');ta.value=ta.value.replace(/@[^\s@]*$/,'@'+v+' ');chatInvoer(ta);ta.focus();return}
  case'antwweg':chatAntw=null;chatBijlage=null;chatBijlageToon();return;
  case'plus':chatPlusMenu();return;
  case'fotokies':sluit();document.getElementById('chatFotoIn')?.click();return;
  case'linkkies':chatLinkKies(null);return;
  case'linkstap':chatLinkKies(v);return;
  case'linkzet':{const[t,a1,a2]=v.split('|');chatBijlage=t==='soort'?{t,id:a1}:t==='derv'?{t,d:a1,id:a2}:{t,d:a1};sluit();chatBijlageToon();document.getElementById('chatTekst')?.focus();return}
  case'link':{const m=b&&chatMsgs(b,true).find(x=>x.id===v);if(m?.link)chatLinkOpen(m.link);return}
  case'peilmaak':chatPeilMaak();return;
  case'peilstuur':{const vr=document.getElementById('cpVraag').value.trim(),op=document.getElementById('cpOpties').value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,8);
    if(!vr||op.length<2){document.getElementById('fout').textContent='Vul een vraag en minstens twee keuzes in.';return}sluit();const ta=document.getElementById('chatTekst'),oud=ta?.value||'';if(ta)ta.value='';chatStuur({peil:{vraag:vr.slice(0,120),opties:op.map(x=>x.slice(0,60))}});if(ta&&oud){ta.value=oud;chatInvoer(ta)}return}
  case'stem':{if(!b)return;if(!isObj(b.st))b.st={};if(!isObj(b.st[v]))b.st[v]={};const k=mijnSleutel(),n=+el.dataset.n;if(b.st[v][k]===n)delete b.st[v][k];else b.st[v][k]=n;bewaar();chatVernieuw();return}
  case'plan':chatPlanMaak();return;
  case'planzet':{const w=document.getElementById('cpTijd').value,t=w?new Date(w).getTime():NaN;if(!isFinite(t)||t<Date.now()+60000){document.getElementById('fout').textContent='Kies een tijdstip in de toekomst.';return}sluit();chatStuur({op:t});toast('⏰ Ingepland');return}
  case'msg':{if(e.target.closest('audio,a,.clink,.cpo,img'))return;chatMsgMenu(el.dataset.m);return}
  case'foto':{const f=S.notfotos[v];if(f)toonFoto(f);return}
  case'reageer':{if(!b)return;if(!isObj(b.re))b.re={};if(!isObj(b.re[v]))b.re[v]={};const k=mijnSleutel(),em=el.dataset.n;if(b.re[v][k]===em)delete b.re[v][k];else b.re[v][k]=em;bewaar();sluit();chatVernieuw();return}
  case'antw':chatAntw=v;chatBijlage=null;sluit();chatBijlageToon();document.getElementById('chatTekst')?.focus();return;
  case'kopieer':{const m=b&&chatMsgs(b,true).find(x=>x.id===v);sluit();try{await navigator.clipboard.writeText(m?.tekst||'');toast('Gekopieerd')}catch(x){toast('Kopiëren lukte niet')}return}
  case'wijzig':{const m=b?.r?.[v];if(!m||!chatIsMijn({...m,id:v})||Date.now()-(m.t||0)>5*60000)return;sluit();const n=prompt('Bericht wijzigen',m.tekst||'');if(n==null||!n.trim())return;m.tekst=n.trim().slice(0,1000);m.gew=Date.now();bewaar();chatVernieuw();return}
  case'msgweg':{const m=b?.r?.[v];if(!m)return;if(!(isAdmin()||(chatIsMijn({...m,id:v})&&Date.now()-(m.t||0)<=5*60000)))return;if(!confirm('Dit bericht verwijderen?'))return;
    for(const f of[m.foto,m.audio])if(f&&S.notfotos[f])S.notfotos[f]=null;b.r[v]={van:m.van,uid:m.uid,beheer:m.beheer,t:m.t,weg:true};bewaar();sluit();chatVernieuw();return}
  case'menu':chatMenu();return;
  case'afhandel':{if(!isAdmin()||!b)return;if(chatOpen_(b))b.af={t:Date.now(),wie:ik().naam};else delete b.af;log(`Gesprek met ${b.van} ${b.af?'afgehandeld':'weer open'}`);bewaar();sluit();chatVernieuw(true);return}
  case'demp':{if(!b)return;if(!isObj(b.demp))b.demp={};const k=mijnSleutel();if(b.demp[k])delete b.demp[k];else b.demp[k]=true;bewaar();sluit();toast(b.demp[k]?'🔕 Gedempt':'🔔 Meldingen aan');return}
  case'archief':{if(!isAdmin()||!b)return;if(chatGearch(b))delete b.arch;else b.arch=Date.now();bewaar();sluit();const ar=!!b.arch;chatDicht();toast(ar?'Gearchiveerd':'Uit het archief gehaald');return}
  case'zoekhier':{sluit();const z=prompt('Zoeken in dit gesprek');if(!z)return;const m=b&&chatMsgs(b).filter(x=>(x.tekst||'').toLowerCase().includes(z.toLowerCase())).pop();if(!m){toast('Niets gevonden');return}
    document.querySelectorAll('#chatLijst .cb.zoek').forEach(x=>x.classList.remove('zoek'));const x=document.querySelector(`#chatLijst [data-m="${CSS.escape(m.id)}"]`);if(x){x.classList.add('zoek');x.scrollIntoView({block:'center'})}return}
  case'pdf':sluit();chatPdf();return;
  case'chatweg':{if(!isAdmin()||!b)return;if(afwStap!=='chatweg'){afwStap='chatweg';chatMenu();return}afwStap=null;for(const m of Object.values(b.r||{}))for(const f of[m?.foto,m?.audio])if(f&&S.notfotos[f])S.notfotos[f]=null;
    delete S.berichten[b.id];bewaar();sluit();chatDicht();toast('Gesprek verwijderd');return}
  case'mic':chatOpnameStart();return;
  case'opstop':chatOpnameStop(true);return;
  case'opweg':chatOpnameStop(false);return;
  case'vraaghier':{sluit();chatBijlage={t:'soort',id:v};if(isAdmin()){if(!chatInst().team){toast('Zet eerst de teamchat aan');chatBijlage=null;return}const t=chatTeam();openChat(t.id,{houdBijlage:true})}else{const t=chatPrive(ik()?.id,true);openChat(t.id,{houdBijlage:true})}return}
  case'ovstuur':case'ovzonder':{const act=bewerk?.actie;if(c==='ovstuur'){const t=document.getElementById('ovTekst').value.trim();if(t){const tb=chatTeam();chatVoegToe(tb,{tekst:t.slice(0,500),ov:true});bewaar();setTimeout(()=>stuurPush({}),800)}}
    sluit();chatOverdrachtKlaar=true;const x=document.createElement('button');x.dataset.a=act==='wissel'?'wissel':'uitloggen';x.style.display='none';document.body.appendChild(x);x.click();x.remove();return}
  case'ovreageer':{sluit();const t=chatTeam();bewaar();openChat(t.id);return}
  }}catch(x){meldFout(x,'Berichten')}});
let chatOverdrachtKlaar=false;
document.addEventListener('input',e=>{if(e.target.id==='chatTekst')chatInvoer(e.target);else if(e.target.id==='chatZoekIn'){chatZoek=e.target.value;const p=e.target.selectionStart;render();const n=document.getElementById('chatZoekIn');if(n){n.focus();try{n.setSelectionRange(p,p)}catch(x){}}}});
document.addEventListener('change',e=>{if(e.target.id==='chatFotoIn'&&e.target.files&&e.target.files[0]){const f=e.target.files[0];e.target.value='';chatFoto(f)}});
document.addEventListener('keydown',e=>{if(e.target.id==='chatTekst'&&e.key==='Enter'&&!e.shiftKey&&window.matchMedia('(pointer:fine)').matches){e.preventDefault();chatStuur()}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&chatId)chatVernieuw()});
/* ingeplande berichten: bij openen van de app de pushmelding laten versturen (als er geen vaste planning in Supabase is) */
function chatPlanPush(){const nu=Date.now();if(nu-(L.chatPlanPush||0)<10*60000)return;if(chatBer().some(b=>Object.values(isObj(b.r)?b.r:{}).some(m=>isObj(m)&&m.op&&m.op<=nu&&nu-m.op<12*3600e3))){L.chatPlanPush=nu;bewaarL();setTimeout(()=>stuurPush({}),3000)}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')try{chatPlanPush()}catch(e){}});
setTimeout(()=>{try{chatPlanPush()}catch(e){}},5000);
