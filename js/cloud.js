/* Lumen online features (Firebase): accounts, profiles, friends, private chats, rooms, activity, posts. */
import * as F from './firebase.js';
const L=window.Lumen,{esc,linkify,safeImg,toast,openModal,closeModal,cfg,save}=L;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const CONF=window.LUMEN_CONFIG||{};
const ONLINE_MS=150000;

/* ---------- not set up yet ---------- */
if(!CONF.firebase){
  const msg=`<div class="banner">Online features aren't switched on yet. Whoever runs this copy of Lumen needs to follow <b>SETUP.md</b> in the repo (about 10 minutes, free).</div>`;
  ['#v-chat .sub','#v-friends .sub','#v-posts .sub'].forEach(s=>$(s).insertAdjacentHTML('afterend',msg));
  $('#meName').textContent='Offline mode';$('#meSt').textContent='Online features not set up';
  $('#meChip').onclick=()=>toast('Online features need setting up first (see SETUP.md)');
  $('#v-profile .sub').insertAdjacentHTML('afterend',msg);$('#profWrap').style.display='none';
  $('#chatForm').onsubmit=e=>{e.preventDefault();toast('Chat isn’t set up yet')};
  throw new Error('Lumen: no Firebase config, running offline');
}

const app=F.initializeApp(CONF.firebase);
const auth=F.getAuth(app),db=F.getFirestore(app);
if(/^(localhost|127\.)/.test(location.hostname)&&new URLSearchParams(location.search).has('emu')){F.connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});F.connectFirestoreEmulator(db,'127.0.0.1',8080)}
const D=(...p)=>F.doc(db,...p),C=(...p)=>F.collection(db,...p);
const ms=t=>t?.toMillis?.()??Date.now();
const when=t=>{const d=Date.now()-ms(t);return d<60e3?'just now':d<36e5?Math.floor(d/6e4)+'m ago':d<864e5?Math.floor(d/36e5)+'h ago':new Date(ms(t)).toLocaleDateString()};
const pairId=(a,b)=>[a,b].sort().join('_');
let me=null,myProfile=null;
let unsubs=[];const stopAll=()=>{unsubs.forEach(u=>u());unsubs=[];};

/* ---------- profile cache ---------- */
const users=new Map(),presence=new Map();
const fetchedAt=new Map();
function getUser(uid,fresh){if(users.has(uid)&&!fresh&&Date.now()-(fetchedAt.get(uid)||0)<60000)return users.get(uid);fetchedAt.set(uid,Date.now());const p=F.getDoc(D('users',uid)).then(s=>s.exists()?{uid,...s.data()}:{uid,name:'Unknown',bio:''}).catch(()=>({uid,name:'Unknown'}));users.set(uid,p);return p}
function pic(u,size=36,online=false){const a=safeImg(u?.avatar);return`<div class="pic${online?' online':''}" style="width:${size}px;height:${size}px;font-size:${Math.round(size*.4)}px">${a?`<img src="${a}" alt="">`:esc((u?.name||'?')[0].toUpperCase())}</div>`}
const isOnline=uid=>{const p=presence.get(uid);return p&&Date.now()-ms(p.seen)<ONLINE_MS};
function actText(uid){if(!cfg.seeOthers)return'';const p=presence.get(uid);if(!p||!isOnline(uid)||!p.act)return'';const a=p.act;
  return a.kind==='game'?`🎮 Playing ${esc(a.label)}`:a.kind==='youtube'?`▶ Watching ${esc(a.label)}`:a.kind==='web'?`🌐 On ${esc(a.label)}`:''}

/* ---------- auth ---------- */
let signup=false;
function authMode(s){signup=s;$('#authH').textContent=s?'Create your account':'Sign in to Lumen';$('#nameRow').style.display=s?'':'none';$('#aName').required=s;$('#authGo').textContent=s?'Create account':'Sign in';$('#authSwap').textContent=s?'Have an account? Sign in':'New here? Create an account';$('#aPass').autocomplete=s?'new-password':'current-password';$('#authErr').textContent=''}
authMode(false);
$('#authSwap').onclick=e=>{e.preventDefault();authMode(!signup)};
const nice=e=>({'auth/invalid-credential':'Wrong email or password','auth/email-already-in-use':'That email already has an account','auth/weak-password':'Password needs 6+ characters','auth/invalid-email':'That email doesn’t look right','auth/popup-closed-by-user':'Sign-in window closed','auth/operation-not-allowed':'This sign-in method isn’t turned on in Firebase','auth/unauthorized-domain':'This website isn’t on the Firebase authorised domains list'}[e.code]||e.message);
$('#authForm').onsubmit=async e=>{e.preventDefault();$('#authErr').textContent='';try{
  if(signup){const name=$('#aName').value.trim();if(name.length<2)throw{message:'Pick a display name (2+ characters)'};
    const c=await F.createUserWithEmailAndPassword(auth,$('#aEmail').value,$('#aPass').value);await ensureProfile(c.user,name)}
  else await F.signInWithEmailAndPassword(auth,$('#aEmail').value,$('#aPass').value);closeModal('authModal')}catch(err){$('#authErr').textContent=nice(err)}};
$('#authGoogle').onclick=async()=>{try{const c=await F.signInWithPopup(auth,new F.GoogleAuthProvider());await ensureProfile(c.user,c.user.displayName);closeModal('authModal')}catch(err){$('#authErr').textContent=nice(err)}};
$('#authReset').onclick=async e=>{e.preventDefault();const em=$('#aEmail').value;if(!em)return $('#authErr').textContent='Type your email first';try{await F.sendPasswordResetEmail(auth,em);toast('Reset email sent')}catch(err){$('#authErr').textContent=nice(err)}};
async function ensureProfile(u,name){const r=D('users',u.uid);const s=await F.getDoc(r);if(!s.exists()){name=(name||'Player').slice(0,24);await F.setDoc(r,{name,nameLower:name.toLowerCase(),bio:'',avatar:'',createdAt:F.serverTimestamp()})}}
$('#meChip').onclick=()=>me?L.go('profile'):(authMode(false),openModal('authModal'));

F.onAuthStateChanged(auth,async u=>{stopAll();me=u;presence.clear();
  if(!u){myProfile=null;$('#mePic').outerHTML=`<div class="pic" id="mePic" style="width:38px;height:38px">?</div>`;$('#meName').textContent='Sign in';$('#meSt').textContent='Chat, friends & posts';renderSignedOut();return}
  await ensureProfile(u,u.displayName||u.email?.split('@')[0]);
  unsubs.push(F.onSnapshot(D('users',u.uid),s=>{myProfile={uid:u.uid,...s.data()};users.set(u.uid,Promise.resolve(myProfile));fetchedAt.set(u.uid,Date.now()+1e12);
    $('#mePic').outerHTML=pic(myProfile,38).replace('class="pic"','class="pic" id="mePic"');$('#meName').textContent=myProfile.name;$('#meSt').textContent='View profile'}));
  startPresence();listenFriends();listenFeed();renderConvos();openConvo(convo||{type:'room',id:rooms()[0]||'general'})});
function renderSignedOut(){const b=`<div class="banner">Sign in (bottom-left) to use this.</div>`;$('#friendList').innerHTML=b;$('#reqList').innerHTML='';$('#feed').innerHTML=b;$('#msgs').innerHTML=b;$('#roomList').innerHTML='';$('#status').className='status';$('#status').innerHTML='<i></i>Signed out';$('#reqBadge').style.display='none'}

/* ---------- profile card (preview + viewing others) ---------- */
const GRADS=['linear-gradient(135deg,#3b5bff,#9b6bff,#ff9a5c)','linear-gradient(135deg,#0f2027,#2c5364)','linear-gradient(135deg,#ff5c7a,#ffc59e)','linear-gradient(135deg,#11998e,#38ef7d)','linear-gradient(135deg,#1a0608,#5a1020)','linear-gradient(135deg,#232526,#414345)','linear-gradient(135deg,#9fb4ff,#9ff0e6)','linear-gradient(135deg,#f7971e,#ffd200)'];
const okColor=c=>/^#[0-9a-f]{6}$/i.test(c||'')?c:'#d6b8ff';
function banStyle(u){const img=safeImg(u.banner);if(img)return`background-image:url('${img}')`;return`background:${GRADS[+u.bannerG||0]||GRADS[0]}`}
function card(u,{uid,online,act,buttons=''}={}){const links=String(u.links||'').split('\n').map(l=>l.trim()).filter(l=>/^https?:\/\/\S+$/i.test(l)).slice(0,3);
  return`<div class="pcard" style="--pc:${okColor(u.color)}"><div class="ban" style="${banStyle(u)}"></div><div class="body">${pic(u,92,online)}
   <h3 style="color:${okColor(u.color)}">${esc(u.name||'Your name')}${u.pronouns?`<span class="pron">${esc(u.pronouns)}</span>`:''}</h3>
   ${u.status||u.emoji?`<div class="stat">${esc(u.emoji||'')} ${esc(u.status||'')}</div>`:''}
   ${uid?`<div class="muted" style="font-size:13px;margin-top:4px">${online?'<span style="color:#4ade80">● Online</span>':'Offline'}</div>`:''}
   ${act?`<div class="act" style="font-size:13px;margin-top:2px">${act}</div>`:''}
   <div class="sect"><b>About me</b><p>${esc(u.bio)||'<span class="muted">Nothing here yet.</span>'}</p></div>
   ${u.favGame?`<div class="sect"><b>Favourite game</b><p>🎮 ${esc(u.favGame)}</p></div>`:''}
   ${links.length?`<div class="sect"><b>Links</b>${links.map(l=>`<a href="${esc(l)}" target="_blank" rel="noopener">${esc(l.replace(/^https?:\/\//,''))}</a>`).join('')}</div>`:''}
   ${buttons?`<div class="row" style="margin-top:16px;flex-wrap:wrap">${buttons}</div>`:''}</div></div>`}

/* ---------- my profile tab ---------- */
let draft={};
function formToDraft(){Object.assign(draft,{name:$('#pName').value.trim(),pronouns:$('#pPron').value.trim(),emoji:$('#pEmoji').value.trim(),status:$('#pStatus').value.trim(),bio:$('#pBio').value,favGame:$('#pFav').value.trim(),links:$('#pLinks').value,color:$('#pColor').value})}
function preview(){formToDraft();$('#pPreview').innerHTML=card(draft);$$('#pSwatches button').forEach((b,i)=>b.style.outline=!safeImg(draft.banner)&&(+draft.bannerG||0)===i?'2px solid #fff':'none')}
function openProfile(){const p=myProfile||{};draft={...p};
  $('#pName').value=p.name||'';$('#pPron').value=p.pronouns||'';$('#pEmoji').value=p.emoji||'';$('#pStatus').value=p.status||'';$('#pBio').value=p.bio||'';$('#pFav').value=p.favGame||'';$('#pLinks').value=p.links||'';$('#pColor').value=okColor(p.color);
  $('#pShare').checked=cfg.share;$('#pShareGame').checked=cfg.shareGame;$('#pShareYt').checked=cfg.shareYt;$('#pShareWeb').checked=cfg.shareWeb;$('#pSeeOthers').checked=cfg.seeOthers;
  $('#pEmail').textContent='Signed in as '+(me?.email||'');preview()}
$('#pSwatches').innerHTML=GRADS.map((g,i)=>`<button type="button" data-g="${i}" style="background:${g}" title="Banner colour"></button>`).join('');
$$('#pSwatches button').forEach(b=>b.onclick=()=>{draft.banner='';draft.bannerG=+b.dataset.g;preview()});
['#pName','#pPron','#pEmoji','#pStatus','#pBio','#pFav','#pLinks','#pColor'].forEach(s=>$(s).addEventListener('input',preview));
$('#pPicBtn').onclick=()=>$('#pPicIn').click();
$('#pPicIn').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;draft.avatar=await L.shrinkImage(f,200,.85);preview()};
$('#pPicDel').onclick=()=>{draft.avatar='';preview()};
$('#pBanBtn').onclick=()=>$('#pBanIn').click();
$('#pBanIn').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;let d=await L.shrinkImage(f,900,.75);if(d.length>300000)d=await L.shrinkImage(f,640,.6);draft.banner=d;preview()};
$('#pBanDel').onclick=()=>{draft.banner='';preview()};
$('#pSave').onclick=async()=>{if(!me)return openModal('authModal');formToDraft();const name=draft.name.slice(0,24);if(name.length<2)return toast('Name needs 2+ characters');
  const d={name,nameLower:name.toLowerCase(),bio:String(draft.bio||'').slice(0,300),avatar:draft.avatar||'',banner:draft.banner||'',bannerG:+draft.bannerG||0,color:okColor(draft.color),pronouns:draft.pronouns.slice(0,20),emoji:draft.emoji.slice(0,4),status:draft.status.slice(0,80),favGame:draft.favGame.slice(0,40),links:String(draft.links||'').slice(0,400)};
  cfg.share=$('#pShare').checked;cfg.shareGame=$('#pShareGame').checked;cfg.shareYt=$('#pShareYt').checked;cfg.shareWeb=$('#pShareWeb').checked;cfg.seeOthers=$('#pSeeOthers').checked;save();
  $('#pSave').disabled=true;try{await F.updateDoc(D('users',me.uid),d);pushPresence();renderFriends();toast('Profile saved ✨')}catch(e){toast('Could not save: '+e.message)}$('#pSave').disabled=false};
$('#pOut').onclick=async()=>{try{await F.setDoc(D('presence',me.uid),{seen:null,act:null})}catch{}await F.signOut(auth);L.go('games')};
$('#pResetPw').onclick=async()=>{try{await F.sendPasswordResetEmail(auth,me.email);toast('Reset email sent to '+me.email)}catch(e){toast(nice(e))}};
const prevOnView=L.onView;L.onView=v=>{prevOnView?.(v);if(v==='profile'){$('#profSignedOut').style.display=me?'none':'';$('#profWrap').style.display=me?'':'none';if(me)openProfile()}};

/* ---------- someone else's profile ---------- */
async function showUser(uid){const u=await getUser(uid,uid!==me?.uid);const fr=friendships.find(f=>f.users.includes(uid));
  const btns=uid===me?.uid?`<button class="btn-acc" data-goprof>Edit profile</button>`:fr?.status==='accepted'?`<button class="btn-acc" data-dm="${uid}">Message</button><button data-unfriend="${fr.id}">Remove friend</button>`:fr?`<button disabled>Request ${fr.from===me.uid?'sent':'received'}</button>`:`<button class="btn-acc" data-add="${uid}">Add friend</button>`;
  $('#userCard').innerHTML=card(u,{uid,online:isOnline(uid),act:actText(uid),buttons:btns+'<button data-close>Close</button>'});
  $('#userCard [data-goprof]')?.addEventListener('click',()=>{closeModal('userModal');L.go('profile')});
  bindPeople($('#userCard'));openModal('userModal')}

/* ---------- presence & activity ---------- */
function myAct(){const a=L.getActivity();if(!cfg.share||!a)return null;if(a.kind==='game'&&!cfg.shareGame)return null;if(a.kind==='youtube'&&!cfg.shareYt)return null;if(a.kind==='web'&&!cfg.shareWeb)return null;return{kind:a.kind,label:String(a.label).slice(0,120)}}
let lastAct;
function pushPresence(force){if(!me)return;const act=myAct();F.setDoc(D('presence',me.uid),{seen:F.serverTimestamp(),act}).catch(()=>{});lastAct=JSON.stringify(act)}
function startPresence(){pushPresence();const t=setInterval(()=>{if(document.visibilityState==='visible')pushPresence()},60000);unsubs.push(()=>clearInterval(t))}
L.onActivity=()=>{if(me&&JSON.stringify(myAct())!==lastAct)pushPresence()};
L.onPanic=()=>{if(me)F.setDoc(D('presence',me.uid),{seen:F.serverTimestamp(),act:null}).catch(()=>{})};

/* ---------- friends ---------- */
let friendships=[];const presUnsub=new Map();
function listenFriends(){unsubs.push(F.onSnapshot(F.query(C('friendships'),F.where('users','array-contains',me.uid)),s=>{
  friendships=s.docs.map(d=>({id:d.id,...d.data()}));
  const fr=friendships.filter(f=>f.status==='accepted').map(f=>f.users.find(x=>x!==me.uid));
  // watch each friend's presence
  fr.forEach(uid=>{if(!presUnsub.has(uid))presUnsub.set(uid,F.onSnapshot(D('presence',uid),p=>{presence.set(uid,p.data()||{});renderFriends();renderConvos()},()=>{}))});
  [...presUnsub.keys()].filter(k=>!fr.includes(k)).forEach(k=>{presUnsub.get(k)();presUnsub.delete(k)});
  renderFriends();renderConvos()}));
  unsubs.push(()=>{presUnsub.forEach(u=>u());presUnsub.clear()});
  const t=setInterval(renderFriends,30000);unsubs.push(()=>clearInterval(t))}
async function personRow(uid,buttons,sub){const u=await getUser(uid);return`<div class="person">${pic(u,42,isOnline(uid))}<div class="info"><b data-user="${uid}">${esc(u.name)}</b><span class="${sub?'act':''}">${sub||esc(u.bio||'')}</span></div>${buttons}</div>`}
async function renderFriends(){if(!me)return;
  const acc=friendships.filter(f=>f.status==='accepted'),inc=friendships.filter(f=>f.status==='pending'&&f.from!==me.uid),out=friendships.filter(f=>f.status==='pending'&&f.from===me.uid);
  const other=f=>f.users.find(x=>x!==me.uid);
  acc.sort((a,b)=>isOnline(other(b))-isOnline(other(a)));
  $('#friendList').innerHTML=(await Promise.all(acc.map(f=>personRow(other(f),`<button data-dm="${other(f)}">Message</button>`,actText(other(f))||(isOnline(other(f))?'Online':''))))).join('')||'<p class="muted">No friends yet. Search for people on the left.</p>';
  $('#reqList').innerHTML=(await Promise.all([...inc.map(f=>personRow(other(f),`<button class="btn-acc" data-accept="${f.id}">Accept</button><button data-unfriend="${f.id}">✕</button>`,'Wants to be friends')),...out.map(f=>personRow(other(f),`<button data-unfriend="${f.id}">Cancel</button>`,'Request sent'))])).join('')||'<p class="muted">No requests.</p>';
  $('#reqBadge').style.display=inc.length?'':'none';$('#reqBadge').textContent=inc.length;bindPeople($('#v-friends'))}
function bindPeople(root){
  root.querySelectorAll('[data-user]').forEach(b=>b.onclick=()=>showUser(b.dataset.user));
  root.querySelectorAll('[data-dm]').forEach(b=>b.onclick=()=>{closeModal('userModal');L.go('chat');openConvo({type:'dm',id:b.dataset.dm})});
  root.querySelectorAll('[data-add]').forEach(b=>b.onclick=async()=>{const o=b.dataset.add;try{await F.setDoc(D('friendships',pairId(me.uid,o)),{users:[me.uid,o].sort(),from:me.uid,status:'pending',at:F.serverTimestamp()});toast('Request sent');b.disabled=true;b.textContent='Sent'}catch(e){toast('Could not send: '+e.message)}});
  root.querySelectorAll('[data-accept]').forEach(b=>b.onclick=()=>F.updateDoc(D('friendships',b.dataset.accept),{status:'accepted'}).then(()=>toast('Friend added')).catch(e=>toast(e.message)));
  root.querySelectorAll('[data-unfriend]').forEach(b=>b.onclick=()=>{if(confirm('Remove?'))F.deleteDoc(D('friendships',b.dataset.unfriend)).then(()=>closeModal('userModal')).catch(e=>toast(e.message))})}
$('#findForm').onsubmit=async e=>{e.preventDefault();if(!me)return openModal('authModal');const q=$('#findIn').value.trim().toLowerCase();if(!q)return;
  const s=await F.getDocs(F.query(C('users'),F.orderBy('nameLower'),F.startAt(q),F.endAt(q+''),F.limit(15)));
  const rows=await Promise.all(s.docs.filter(d=>d.id!==me.uid).map(d=>{users.set(d.id,Promise.resolve({uid:d.id,...d.data()}));const fr=friendships.find(f=>f.users.includes(d.id));
    return personRow(d.id,fr?.status==='accepted'?`<button data-dm="${d.id}">Message</button>`:fr?'<button disabled>Pending</button>':`<button class="btn-acc" data-add="${d.id}">Add</button>`)}));
  $('#findList').innerHTML=rows.join('')||'<p class="muted">Nobody found with that name.</p>';bindPeople($('#findList'))};

/* ---------- chat: rooms + private messages ---------- */
const rooms=()=>cfg.rooms.split(',').map(s=>s.trim().toLowerCase().replace(/[^\w-]/g,'')).filter(Boolean);
let convo=null,convoUnsub=null;
async function renderConvos(){if(!me)return;const fr=friendships.filter(f=>f.status==='accepted').map(f=>f.users.find(x=>x!==me.uid));
  const dms=await Promise.all(fr.map(async uid=>{const u=await getUser(uid);return`<button class="room ${convo?.type==='dm'&&convo.id===uid?'on':''}" data-c="dm:${uid}">${pic(u,24,isOnline(uid))}<span>${esc(u.name)}</span></button>`}));
  $('#roomList').innerHTML=`<div class="side-h">Rooms</div>`+rooms().map(r=>`<button class="room ${convo?.type==='room'&&convo.id===r?'on':''}" data-c="room:${r}"># ${r}</button>`).join('')+`<div class="side-h">Friends</div>`+(dms.join('')||'<p class="muted" style="font-size:12px;padding:0 10px">Add friends to chat privately.</p>');
  $$('#roomList [data-c]').forEach(b=>b.onclick=()=>{const[t,...id]=b.dataset.c.split(':');openConvo({type:t,id:id.join(':')})})}
L.onRooms=()=>renderConvos();
function convoPath(c){return c.type==='room'?['rooms',c.id,'messages']:['dms',pairId(me.uid,c.id),'messages']}
async function openConvo(c){if(!me)return;convo=c;convoUnsub?.();renderConvos();
  $('#roomName').textContent=c.type==='room'?'#'+c.id:(await getUser(c.id)).name;$('#chatSub').textContent=c.type==='room'?'Public room: everyone signed in can read it.':'Private chat: only you two can read it.';
  $('#msgs').innerHTML='<div class="sysmsg">Loading…</div>';$('#status').className='status';$('#status').innerHTML='<i></i>Connecting…';
  convoUnsub=F.onSnapshot(F.query(C(...convoPath(c)),F.orderBy('at','desc'),F.limit(80)),async s=>{
    $('#status').className='status ok';$('#status').innerHTML='<i></i>Live';
    const docs=s.docs.map(d=>d.data()).reverse();const us=await Promise.all(docs.map(m=>getUser(m.uid)));
    const box=$('#msgs'),atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<80;
    box.innerHTML=docs.map((m,i)=>{const u=us[i],mine=m.uid===me.uid,g=safeImg(m.gif);return`<div class="msg${mine?' me':''}"><div data-user="${m.uid}" style="cursor:pointer">${pic(u,32)}</div><div class="bub"><small>${esc(u.name)} · ${when(m.at)}</small>${linkify(m.text||'')}${g?`<img class="gif" src="${g}" alt="GIF">`:''}</div></div>`}).join('')||'<div class="sysmsg">No messages yet. Say hi 👋</div>';
    box.querySelectorAll('[data-user]').forEach(b=>b.onclick=()=>showUser(b.dataset.user));if(atBottom||s.metadata.hasPendingWrites||box.dataset.c!==JSON.stringify(c))box.scrollTop=1e9;box.dataset.c=JSON.stringify(c)},
    e=>{$('#status').className='status';$('#status').innerHTML='<i></i>No access';$('#msgs').innerHTML=`<div class="sysmsg">${esc(e.code==='permission-denied'?'You can only message friends.':e.message)}</div>`});
  unsubs.push(()=>convoUnsub?.())}
async function sendMsg(text,gif){if(!me){openModal('authModal');return}if(!convo)return;text=(text||'').trim().slice(0,1000);if(!text&&!gif)return;
  try{await F.addDoc(C(...convoPath(convo)),{uid:me.uid,text,gif:gif||'',at:F.serverTimestamp()})}catch(e){toast('Not sent: '+e.message)}}
$('#chatForm').onsubmit=e=>{e.preventDefault();const v=$('#chatInput').value;$('#chatInput').value='';sendMsg(v)};
$('#chatGif').onclick=async()=>{const g=await pickGif();if(g)sendMsg('',g)};

/* ---------- GIF picker ---------- */
let gifResolve=null;
function pickGif(){return new Promise(r=>{gifResolve=r;$('#gifGrid').innerHTML=CONF.giphyKey?'':'<p class="muted" style="grid-column:1/-1;font-size:13px">GIF search needs a GIPHY key in js/config.js. You can still paste a GIF link below.</p>';$('#gifUrl').value='';openModal('gifModal');if(CONF.giphyKey)searchGifs('');setTimeout(()=>$('#gifQ').focus(),50)})}
function doneGif(u){closeModal('gifModal');const r=gifResolve;gifResolve=null;r?.(u)}
$('#gifModal').addEventListener('click',e=>{if(e.target===$('#gifModal')||e.target.closest('[data-close]'))doneGif(null)});
async function searchGifs(q){if(!CONF.giphyKey)return;try{const r=await fetch(`https://api.giphy.com/v1/gifs/${q?'search':'trending'}?api_key=${encodeURIComponent(CONF.giphyKey)}&limit=24&rating=pg-13${q?'&q='+encodeURIComponent(q):''}`);const j=await r.json();
  $('#gifGrid').innerHTML=(j.data||[]).map(g=>{const s=g.images?.fixed_height_small?.url,b=g.images?.fixed_height?.url||s;return s?`<img src="${esc(s)}" data-g="${esc(b)}" alt="">`:''}).join('')||'<p class="muted">No GIFs found.</p>';
  $$('#gifGrid [data-g]').forEach(i=>i.onclick=()=>doneGif(i.dataset.g))}catch{$('#gifGrid').innerHTML='<p class="muted">GIF search failed.</p>'}}
$('#gifForm').onsubmit=e=>{e.preventDefault();searchGifs($('#gifQ').value.trim())};
$('#gifUrlForm').onsubmit=e=>{e.preventDefault();const u=$('#gifUrl').value.trim();if(!/^https:\/\/\S+$/i.test(u))return toast('Paste an https:// link');doneGif(u)};

/* ---------- posts ---------- */
let postImage='';const openCmts=new Map();
$('#postImgBtn').onclick=()=>$('#postImg').click();
$('#postImg').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;postImage=await L.shrinkImage(f,1100,.8);$('#postThumb').src=postImage;$('#postThumb').style.display='';$('#postImgClear').style.display=''};
$('#postImgClear').onclick=()=>{postImage='';$('#postThumb').style.display='none';$('#postImgClear').style.display='none'};
$('#postBtn').onclick=async()=>{if(!me)return openModal('authModal');const text=$('#postText').value.trim().slice(0,2000);if(!text&&!postImage)return toast('Write something or add an image');
  $('#postBtn').disabled=true;try{await F.addDoc(C('posts'),{uid:me.uid,text,image:postImage,at:F.serverTimestamp()});$('#postText').value='';$('#postImgClear').click();toast('Posted')}catch(e){toast('Could not post: '+e.message)}$('#postBtn').disabled=false};
function listenFeed(){unsubs.push(F.onSnapshot(F.query(C('posts'),F.orderBy('at','desc'),F.limit(40)),async s=>{
  const posts=s.docs.map(d=>({id:d.id,...d.data()}));const us=await Promise.all(posts.map(p=>getUser(p.uid)));
  $('#feed').innerHTML=posts.map((p,i)=>{const u=us[i],img=safeImg(p.image);return`<div class="card post" id="p-${p.id}"><div class="post-h"><div data-user="${p.uid}" style="cursor:pointer">${pic(u,42)}</div><div><b data-user="${p.uid}">${esc(u.name)}</b><span>${when(p.at)}</span></div></div>
    ${p.text?`<div class="post-t">${linkify(p.text)}</div>`:''}${img?`<img class="post-img" src="${img}" alt="">`:''}
    <div class="post-a"><button data-cm="${p.id}">💬 Comments</button>${p.uid===me.uid?`<button data-delpost="${p.id}">Delete</button>`:''}</div><div class="cmts" id="c-${p.id}" style="display:none"></div></div>`}).join('')||'<p class="muted">No posts yet. Be the first!</p>';
  bindPeople($('#feed'));
  $$('#feed [data-cm]').forEach(b=>b.onclick=()=>toggleCmts(b.dataset.cm));
  $$('#feed [data-delpost]').forEach(b=>b.onclick=()=>{if(confirm('Delete this post?'))F.deleteDoc(D('posts',b.dataset.delpost)).catch(e=>toast(e.message))});
  openCmts.forEach((u,id)=>{u();openCmts.delete(id);if($('#c-'+id))toggleCmts(id)})}));
  unsubs.push(()=>{openCmts.forEach(u=>u());openCmts.clear()})}
function toggleCmts(id){const box=$('#c-'+id);if(openCmts.has(id)){openCmts.get(id)();openCmts.delete(id);box.style.display='none';return}
  box.style.display='';box.innerHTML='<span class="muted">Loading…</span>';
  openCmts.set(id,F.onSnapshot(F.query(C('posts',id,'comments'),F.orderBy('at','asc'),F.limit(100)),async s=>{const cs=s.docs.map(d=>({id:d.id,...d.data()}));const us=await Promise.all(cs.map(c=>getUser(c.uid)));
    const draft=box.querySelector('input')?.value||'';
    box.innerHTML=cs.map((c,i)=>{const g=safeImg(c.gif);return`<div class="cmt"><div data-user="${c.uid}" style="cursor:pointer">${pic(us[i],30)}</div><div class="bub"><small>${esc(us[i].name)} · ${when(c.at)}${c.uid===me.uid?` · <a href="#" data-delc="${c.id}" style="color:inherit">delete</a>`:''}</small>${linkify(c.text||'')}${g?`<img class="gif" src="${g}" alt="GIF">`:''}</div></div>`}).join('')+
      `<form class="cmt-in"><button type="button" data-gif>GIF</button><input placeholder="Write a comment…" maxlength="500" value="${esc(draft)}"><button class="btn-acc">Send</button></form>`;
    bindPeople(box);
    box.querySelectorAll('[data-delc]').forEach(a=>a.onclick=e=>{e.preventDefault();F.deleteDoc(D('posts',id,'comments',a.dataset.delc)).catch(err=>toast(err.message))});
    const send=(text,gif)=>F.addDoc(C('posts',id,'comments'),{uid:me.uid,text:(text||'').slice(0,500),gif:gif||'',at:F.serverTimestamp()}).catch(e=>toast('Not sent: '+e.message));
    box.querySelector('form').onsubmit=e=>{e.preventDefault();const i=e.target.querySelector('input');if(i.value.trim()){send(i.value.trim());i.value=''}};
    box.querySelector('[data-gif]').onclick=async()=>{const g=await pickGif();if(g)send('',g)}},e=>box.innerHTML=`<span class="muted">${esc(e.message)}</span>`))}
