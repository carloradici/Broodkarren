/* ================= start ================= */
{const q=new URLSearchParams(location.search),u=q.get('uitnodiging'),k=q.get('koppel');
 if((u||k)&&L.gekoppeld)setTimeout(()=>toonSheet(`<div class="pkop"><span style="width:60px"></span><b>Al gekoppeld</b><button data-a="sluit" style="font-weight:700">Begrepen</button></div><div class="pinhoud"><div class="kaartje"><div class="sub">Dit toestel is al gekoppeld met <b>${esc(winkelNaam())}</b>. ${u?'Een uitnodiging werkt alleen op een toestel dat nog niet gekoppeld is. Open de link op de telefoon van de nieuwe ondernemer, of test hem in een privévenster van Safari.':'Deze koppelcode is voor een ander toestel. Er is niets veranderd.'}</div></div></div>`),900);
 if(u||k){if(u&&!L.gekoppeld){L.uitnodiging=u.toUpperCase().replace(/[^A-Z0-9]/g,'');koppelTab='code'}if(k&&!L.gekoppeld)L.koppelcode=k.toUpperCase().replace(/[^A-Z0-9]/g,'');bewaarL();try{history.replaceState(null,'',location.pathname+location.hash)}catch(e){}}}
if(window.ReactNativeWebView||window.__BEGINSTAAT__!==undefined)document.querySelector('.test')?.remove();
for(const d of Object.keys(S.derving))borgHistorie(d);
controleerSessie();
weerLaden();
function volgHash(){const h=location.hash;if(!L.sessie||!h)return;const weg=()=>history.replaceState(null,'',location.pathname+location.search);
  if(h==='#materiaal'){tab='meer';sub='materiaal';weg();render()}
  else if(h==='#berichten'){tab='meer';sub='berichten';weg();render()}
  else if(h==='#tebetalen'){weg();if(betalenMag()){tab='meer';sub='tebetalen';tbTab='planning';render()}}
  else if(h==='#uren'){weg();if(urenMag()){tab='uren';urenView='klok';sub=null;render()}}
  else if(h==='#checklists'){weg();tab='check';sub=null;clDatum=null;render()}
  else if(h.startsWith('#chat-')){const id=decodeURIComponent(h.slice(6));weg();tab='meer';sub='berichten';render();if(S.berichten[id])openChat(id)}
  else if(h==='#levering'){weg();tab='lijst';sub=null;datum=iso();volgVandaag=true;render();if(mag('vinken')&&!S.levering[iso()])openLevering()}
  else if(h==='#weekoverzicht'&&isAdmin()){weg();tab='meer';sub='weekoverzicht';woWeek=null;render()}}
window.addEventListener('hashchange',volgHash);setTimeout(volgHash,300);
document.body.insertAdjacentHTML('beforeend','<div id="cijferblok2" class="cijferblok2" role="dialog" aria-label="Cijfers invoeren"></div>');
setTimeout(()=>{if(L.sessie&&mag('vinken'))ocrVoorbereiden()},15000);
db=maakDb();
if(L.modus==='lokaal')syncStatus='lokaal';
else if(L.gekoppeld)syncStatus=db?'start':'offline';
if(L.sessie&&ik())tab=startTab(prof());
render();nieuwsNaStart();
(async()=>{
  if(L.modus==='lokaal'||!db)return;
  try{const ses=await db.sessie();
    if(!ses){if(L.gekoppeld){L.gekoppeld=false;bewaarL()}render();return}
    await naInloggen(ses);
  }catch(e){zetStatus('offline');render()}
})();

if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
