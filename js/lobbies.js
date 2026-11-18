/* Nightbound lobbies in Lumen.
   Nightbound (inside Lumen's game viewer) reports its lobby every 2 seconds. While you host one:
   - friends see "Hosting a Nightbound lobby" with a Join button (through your shared activity)
   - unless you turn it off in Settings, everyone on Lumen sees it on the Hub, the Game hub and Nightbound's page
   Join opens Nightbound with the room code filled in (Nightbound's own ?join= link). */
const L=window.Lumen,{esc,toast}=L;
const $=s=>document.querySelector(s);
const C=()=>L.cloud;
let me=null,mine=null,lastMsg=0,published=null,beat=0,pub=[],unsub=null,friendSeen=null;
const CODE=/^[A-Z0-9]{3,12}$/;

/* ---------- what my own Nightbound says ---------- */
addEventListener('message',e=>{const d=e.data;if(!d||d.nbLumen!==1)return;const f=$('#viewer iframe');if(!f||e.source!==f.contentWindow)return;
  lastMsg=Date.now();mine=d;sync()});
setInterval(()=>{if(mine&&Date.now()-lastMsg>7000){mine=null;sync()}},3000);
const hosting=()=>mine&&mine.state==='lobby'&&mine.host&&mine.mode==='online'&&mine.gm!=='fortnight'&&CODE.test(mine.code||'')?{code:mine.code,n:+mine.n||1,max:+mine.max||5}:null;
let lastSig='';
function sync(){const h=hosting(),sig=h?`${h.code}/${h.n}/${h.max}`:'';
  // shared activity (friends): only while Nightbound is the game on screen
  const v=L.viewing?.();if(v?.act?.key==='b_nightbound'||v?.act?.label==='Nightbound'){const a={...v.act,lobby:h};if(sig!==lastSig)L.setActivity(a)}
  lastSig=sig;publish(h)}
async function publish(h){if(!me||!C())return;const {F,D}=C();const want=h&&L.cfg.nbPublic!==false?h:null;const sig=want?`${want.code}/${want.n}/${want.max}`:'';
  if(sig===published&&(!want||Date.now()-beat<30000))return;
  try{if(want){beat=Date.now();published=sig;await F.setDoc(D('lobbies',me),{code:want.code,n:Math.min(16,Math.max(1,want.n)),max:Math.min(16,Math.max(1,want.max)),name:(C().profile()?.name||'').slice(0,24),at:F.serverTimestamp()})}
    else if(published){published='';await F.deleteDoc(D('lobbies',me))}}catch{}}
setInterval(()=>{if(published)publish(hosting())},10000);
addEventListener('pagehide',()=>{if(published&&me)try{C().F.deleteDoc(C().D('lobbies',me))}catch{}});

/* ---------- everybody else's lobbies ---------- */
function all(){const now=Date.now(),out=new Map();
  for(const l of pub)if(l.id!==me&&now-(l.at?.toMillis?.()||now)<90000&&CODE.test(l.code||''))out.set(l.id,{uid:l.id,code:l.code,n:l.n,max:l.max,name:l.name,friend:false});
  for(const f of C()?.friendLobbies?.()||[])out.set(f.uid,{...out.get(f.uid),...f,friend:true});
  return[...out.values()].sort((a,b)=>b.friend-a.friend||b.n-a.n)}
function join(code){code=String(code||'').toUpperCase();if(!CODE.test(code))return toast('That lobby code isn’t valid');
  if(hosting()?.code===code)return toast('That’s your own lobby');
  L.hub?.play?.('b_nightbound');const base=L.cfg.nbUrl||'nightbound/index.html';
  L.openView(base+(base.includes('?')?'&':'?')+'join='+encodeURIComponent(code),'Nightbound',{kind:'game',label:'Nightbound',key:'b_nightbound'});toast('Joining the lobby…')}
L.joinNightbound=join;
document.addEventListener('click',e=>{const b=e.target.closest('[data-nbjoin]');if(!b)return;e.preventDefault();e.stopPropagation();join(b.dataset.nbjoin)},true);

function lobbyHTML(list,{title=true}={}){if(!list.length)return'';
  return`${title?`<h2 class="hsec">🟢 Nightbound lobbies open now <em class="count">${list.length}</em></h2>`:''}<div class="nbl-list">${list.map(l=>`<div class="nbl"><span class="nbl-live"></span><div class="nbl-i"><b>${esc(l.name||'Someone')}’s lobby</b><small>${l.friend?'👥 Friend · ':''}${l.n}/${l.max||5} players · code ${esc(l.code)}</small></div><button class="btn-acc" data-nbjoin="${esc(l.code)}">Join</button></div>`).join('')}</div>`}
async function render(){const list=all();
  await Promise.all(list.filter(l=>!l.name).map(async l=>{l.name=(await C().getUser(l.uid)).name}));
  for(const [sel,opts] of [['#hubLobbies',{}],['#ghLobbies',{}],['#gpLobbies',{title:false}]]){let el=$(sel);if(!el)continue;el.innerHTML=lobbyHTML(list,opts)}
  const gp=$('#gpLobbyCard');if(gp)gp.style.display=list.length?'':'none';
  // tell me when a friend starts hosting
  const fr=new Set(list.filter(l=>l.friend).map(l=>l.uid+':'+l.code));
  if(friendSeen)for(const l of list.filter(l=>l.friend&&!friendSeen.has(l.uid+':'+l.code)))L.notify?.pop('🎮',`${esc(l.name||'A friend')} is hosting a Nightbound lobby`,`${l.n}/${l.max||5} players · click to join`,()=>join(l.code));
  friendSeen=fr}
// the Hub, Game hub and Nightbound's page get a slot for the list (they re-render, so re-add it)
function slots(){const hub=$('#hubBox .hhero');if(hub&&!$('#hubLobbies')){const d=document.createElement('div');d.id='hubLobbies';(document.querySelector('#hubBox .hannounce')||hub).after(d)}
  const gh=$('#ghBox');if(gh&&!$('#ghLobbies')){const d=document.createElement('div');d.id='ghLobbies';gh.before(d)}
  const side=$('#gpBox .gp-side');if(side&&!$('#gpLobbyCard')&&$('#gpBox')?.dataset.key==='b_nightbound'){side.insertAdjacentHTML('afterbegin','<div class="card" id="gpLobbyCard"><h2>🟢 Open lobbies</h2><div id="gpLobbies"></div></div>')}
  render()}
['#hubBox','#gpBox'].forEach(s=>{const el=$(s);if(el)new MutationObserver(()=>{if(!el.querySelector(s==='#hubBox'?'#hubLobbies':'#gpLobbyCard'))slots()}).observe(el,{childList:true})});
L.onLobbies=()=>render();

const prevP=L.onProfile;L.onProfile=p=>{prevP?.(p);const uid=p?.uid||null;if(uid===me)return;unsub?.();unsub=null;pub=[];friendSeen=null;
  if(published&&me){try{C().F.deleteDoc(C().D('lobbies',me))}catch{}published=''}me=uid;
  if(me&&C()){const {F,db}=C();unsub=F.onSnapshot(F.collection(db,'lobbies'),s=>{pub=s.docs.map(d=>({id:d.id,...d.data()}));render()},()=>{});setTimeout(()=>{friendSeen=friendSeen||new Set()},4000)}slots()};
setInterval(render,20000);
if(C()?.profile?.())L.onProfile(C().profile());slots();
