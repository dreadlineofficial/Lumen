/* Lumen online features (Firebase): accounts, profiles, friends + DMs, rooms, online status, activity, posts, GIFs. */
import * as F from './firebase.js';
const L=window.Lumen,{esc,safeImg,toast,openModal,closeModal,cfg,save}=L;
const fmt=t=>L.fmt?L.fmt(t):L.linkify(t);
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const CONF=window.LUMEN_CONFIG||{};
const ONLINE_MS=150000;

/* ---------- not set up yet ---------- */
if(!CONF.firebase){
  const msg=`<div class="banner">Online features aren't switched on yet. Whoever runs this copy of Lumen needs to follow <b>SETUP.md</b> in the repo (about 10 minutes, free).</div>`;
  ['#roomPane .msgs','#dmPane .msgs','#feed'].forEach(s=>$(s).innerHTML=msg);$('#v-profile .sub').insertAdjacentHTML('afterend',msg);$('#profWrap').style.display='none';
  $('#meName').textContent='Offline mode';$('#meSt').textContent='Online features not set up';
  $('#meChip').onclick=()=>toast('Online features need setting up first (see SETUP.md)');
  $$('[data-pane-form]').forEach(f=>f.onsubmit=e=>{e.preventDefault();toast('Chat isn’t set up yet')});
  throw new Error('Lumen: no Firebase config, running offline');
}

const app=F.initializeApp(CONF.firebase);
const auth=F.getAuth(app),db=F.getFirestore(app);
if(/^(localhost|127\.)/.test(location.hostname)&&new URLSearchParams(location.search).has('emu')){F.connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});F.connectFirestoreEmulator(db,'127.0.0.1',8080)}
const D=(...p)=>F.doc(db,...p),C=(...p)=>F.collection(db,...p);
const ms=t=>t?.toMillis?.()??Date.now();
const ago=m=>{const d=Date.now()-m;return d<60e3?'just now':d<36e5?Math.floor(d/6e4)+'m ago':d<864e5?Math.floor(d/36e5)+'h ago':Math.floor(d/864e5)+'d ago'};
const when=t=>{const d=new Date(ms(t));return Date.now()-d<864e5?d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString()};
const pairId=(a,b)=>[a,b].sort().join('_');
let me=null,myProfile=null;
let unsubs=[];const stopAll=()=>{unsubs.forEach(u=>u());unsubs=[];};

/* ---------- users, presence, styled names ---------- */
const users=new Map(),presence=new Map(),fetchedAt=new Map();
function getUser(uid,fresh){if(users.has(uid)&&!fresh&&Date.now()-(fetchedAt.get(uid)||0)<60000)return users.get(uid);fetchedAt.set(uid,Date.now());const p=F.getDoc(D('users',uid)).then(s=>s.exists()?{uid,...s.data()}:{uid,name:'Unknown',bio:''}).catch(()=>({uid,name:'Unknown'}));users.set(uid,p);return p}
const okColor=(c,d='#d6b8ff')=>/^#[0-9a-f]{6}$/i.test(c||'')?c:d;
// online | idle | offline | null (unknown: not a friend)
function status(uid){if(uid===me?.uid)return document.visibilityState==='visible'?'online':'idle';const p=presence.get(uid);if(!p)return null;
  if(!p.seen||p.state==='offline'||Date.now()-ms(p.seen)>ONLINE_MS)return'offline';return p.state==='idle'?'idle':'online'}
function statusText(uid){const s=status(uid);if(s==='online')return'Online';if(s==='idle')return'Idle';if(s==='offline'){const p=presence.get(uid);return p?.seen?'Last seen '+ago(ms(p.seen)):'Offline'}return''}
function ringBg(u){const c1=okColor(u.nameC1||u.color),c2=okColor(u.nameC2,'#9ff0e6');
  return u.ring==='solid'?okColor(u.color):u.ring==='gradient'?`linear-gradient(135deg,${c1},${c2})`:u.ring==='rainbow'?'conic-gradient(#ff5c7a,#ffc59e,#ffd200,#38ef7d,#22d3ee,#9b6bff,#ff5c7a)':''}
function pic(u,size=36,uid){const a=safeImg(u?.avatar),st=uid?status(uid):null,ring=ringBg(u||{});
  return`<div class="pic${st?' st-'+st:''}${ring?' ring':''}" style="width:${size}px;height:${size}px;font-size:${Math.round(size*.4)}px;--psz:${size}px;${ring?`--ring:${ring};`:''}">${a?`<img src="${a}" alt="">`:`<span>${esc((u?.name||'?')[0].toUpperCase())}</span>`}${L.cos?.deco(u?.deco)||''}</div>`}
const graphemes=s=>{try{return[...new Intl.Segmenter().segment(String(s||''))].map(x=>x.segment)}catch{return[...String(s||'')]}};
function nameHTML(u,{badges=true}={}){const c1=okColor(u.nameC1||u.color),c2=okColor(u.nameC2,'#9ff0e6'),st=u.nameStyle||'solid';
  const style=st==='gradient'||st==='animated'?`background-image:linear-gradient(90deg,${c1},${c2},${c1});`:st==='glow'?`color:${c1};text-shadow:0 0 12px ${c1}aa;`:`color:${c1};`;
  const b=badges&&u.badges?`<span class="ubadges">${esc(graphemes(u.badges).filter(x=>x.trim()).slice(0,5).join(''))}</span>`:'';
  return`<span class="uname n-${st} f-${u.nameFont||'sans'}${L.cos?.nfxCls(u.nfx)||''}" style="${style}">${esc(u.name||'Unknown')}</span>${b}`}
function actText(uid){if(!cfg.seeOthers)return'';const p=presence.get(uid);if(!p?.act||status(uid)==='offline'||!status(uid))return'';const a=p.act;
  return a.kind==='game'?`🎮 Playing <b>${esc(a.label)}</b>`:a.kind==='youtube'?`▶ Watching <b>YouTube</b>`:a.kind==='web'?`🌐 On <b>${esc(a.label)}</b>`:''}

/* ---------- auth ---------- */
let signup=false;
function authMode(s){signup=s;$('#authH').textContent=s?'Create your account':'Sign in to Lumen';$('#nameRow').style.display=s?'':'none';$('#aName').required=s;$('#authGo').textContent=s?'Create account':'Sign in';$('#authSwap').textContent=s?'Have an account? Sign in':'New here? Create an account';$('#aPass').autocomplete=s?'new-password':'current-password';$('#authErr').textContent=''}
authMode(false);
$('#authSwap').onclick=e=>{e.preventDefault();authMode(!signup)};
const nice=e=>({'auth/invalid-credential':'Wrong email or password','auth/email-already-in-use':'That email already has an account','auth/weak-password':'Password needs 6+ characters','auth/invalid-email':'That email doesn’t look right','auth/popup-closed-by-user':'Sign-in window closed','auth/operation-not-allowed':'This sign-in method isn’t turned on in Firebase','auth/unauthorized-domain':'This website isn’t on the Firebase authorised domains list'}[e.code]||e.message);
let pendingName=null;const profileJobs=new Map();
$('#authForm').onsubmit=async e=>{e.preventDefault();$('#authErr').textContent='';try{
  if(signup){const name=$('#aName').value.trim();if(name.length<2)throw{message:'Pick a display name (2+ characters)'};
    pendingName=name;const c=await F.createUserWithEmailAndPassword(auth,$('#aEmail').value,$('#aPass').value);await ensureProfile(c.user,name)}
  else await F.signInWithEmailAndPassword(auth,$('#aEmail').value,$('#aPass').value);closeModal('authModal')}catch(err){$('#authErr').textContent=nice(err)}};
$('#authGoogle').onclick=async()=>{try{const c=await F.signInWithPopup(auth,new F.GoogleAuthProvider());await ensureProfile(c.user,c.user.displayName);closeModal('authModal')}catch(err){$('#authErr').textContent=nice(err)}};
$('#authReset').onclick=async e=>{e.preventDefault();const em=$('#aEmail').value;if(!em)return $('#authErr').textContent='Type your email first';try{await F.sendPasswordResetEmail(auth,em);toast('Reset email sent')}catch(err){$('#authErr').textContent=nice(err)}};
// one profile creation per user, so sign-up and the auth listener can't race and overwrite the chosen name
function ensureProfile(u,name){if(!profileJobs.has(u.uid))profileJobs.set(u.uid,makeProfile(u,pendingName||name).catch(e=>{profileJobs.delete(u.uid);throw e}).finally(()=>{pendingName=null}));return profileJobs.get(u.uid)}
async function makeProfile(u,name){const r=D('users',u.uid);const s=await F.getDoc(r);if(!s.exists()){name=String(name||'').trim().slice(0,24);if(name.length<2)name='Player'+Math.floor(Math.random()*900+100);await F.setDoc(r,{name,nameLower:name.toLowerCase(),bio:'',avatar:'',createdAt:F.serverTimestamp()})}}
$('#meChip').onclick=()=>me?L.go('profile'):(authMode(false),openModal('authModal'));

function renderMe(){if(!myProfile)return;const mc=$('#meChip');mc.className='me-chip'+(L.cos?.plateCls(myProfile.plate)||'');const oldB=mc.querySelector('canvas.buddy');if((oldB?.dataset.buddy||'')!==(myProfile.buddy||'')){oldB?.remove();if(myProfile.buddy)mc.insertAdjacentHTML('afterbegin',L.cos.buddyCanvas(myProfile.buddy,'bar'))}$('#mePic').outerHTML=pic(myProfile,38,me.uid).replace('class="pic','id="mePic" class="pic');$('#meName').innerHTML=nameHTML(myProfile,{badges:false});$('#meSt').textContent=statusText(me.uid)}
F.onAuthStateChanged(auth,async u=>{stopAll();me=u;presence.clear();
  if(!u){myProfile=null;L.onProfile?.(null);$('#meChip').className='me-chip';$('#meChip canvas.buddy')?.remove();$('#mePic').outerHTML=`<div class="pic" id="mePic" style="width:38px;height:38px">?</div>`;$('#meName').textContent='Sign in';$('#meSt').textContent='Chat, friends & posts';renderSignedOut();return}
  await ensureProfile(u,u.displayName||u.email?.split('@')[0]);
  unsubs.push(F.onSnapshot(D('users',u.uid),s=>{myProfile={uid:u.uid,...s.data()};users.set(u.uid,Promise.resolve(myProfile));fetchedAt.set(u.uid,Date.now()+1e12);renderMe();
    if((myProfile.theme||'')!==(cfg.theme||'')){cfg.theme=myProfile.theme||'';save();L.cos?.applyTheme(cfg.theme)}L.onProfile?.(myProfile);if(!sideUid.chat)showSide('chat',u.uid)}));
  startPresence();listenFriends();listenFeed();renderRooms();openConvo(panes.room,panes.room.convo||{type:'room',id:rooms()[0]||'general'})});
function renderSignedOut(){const b=`<div class="banner">Sign in (bottom-left) to use this.</div>`;$('#friendList').innerHTML=b;$('#reqList').innerHTML='';$('#feed').innerHTML=b;
  Object.values(panes).forEach(p=>{p.unsub?.();p.convo=null;p.msgs.innerHTML=b;p.status.className='status';p.status.innerHTML=''});$('#roomList').innerHTML='';$('#chatSide').innerHTML='';$('#frSide').innerHTML='';$('#reqBadge').style.display='none'}

/* ---------- profile card ---------- */
const GRADS=['linear-gradient(135deg,#3b5bff,#9b6bff,#ff9a5c)','linear-gradient(135deg,#0f2027,#2c5364)','linear-gradient(135deg,#ff5c7a,#ffc59e)','linear-gradient(135deg,#11998e,#38ef7d)','linear-gradient(135deg,#1a0608,#5a1020)','linear-gradient(135deg,#232526,#414345)','linear-gradient(135deg,#9fb4ff,#9ff0e6)','linear-gradient(135deg,#f7971e,#ffd200)'];
function banStyle(u){const img=safeImg(u.banner);if(img)return`background-image:url('${img}')`;return`background:${GRADS[+u.bannerG||0]||GRADS[0]}`}
function cardBg(u){const c=okColor(u.color),c1=okColor(u.nameC1||u.color),c2=okColor(u.nameC2,'#9ff0e6');
  return u.cardStyle==='tint'?`background:linear-gradient(180deg,${c}33,${c}11 60%,rgba(20,20,28,.85))`:u.cardStyle==='gradient'?`background:linear-gradient(160deg,${c1}55,${c2}33 55%,rgba(20,20,28,.9))`:u.cardStyle==='dark'?'background:#0b0c12':''}
function card(u,{uid,buttons='',compact=false}={}){const links=String(u.links||'').split('\n').map(l=>l.trim()).filter(l=>/^https?:\/\/\S+$/i.test(l)).slice(0,3);const act=uid?actText(uid):'',st=uid?statusText(uid):'';
  return`<div class="pcard${compact?' compact':''}" style="--pc:${okColor(u.color)};${cardBg(u)}">${L.cos?.fxLayer(u.fx)||''}<div class="ban" style="${banStyle(u)}">${L.cos?.buddyCanvas(u.buddy,'card')||''}</div><div class="body">${pic(u,compact?80:92,uid)}
   <h3>${nameHTML(u)}${u.pronouns?`<span class="pron">${esc(u.pronouns)}</span>`:''}</h3>
   ${u.status||u.emoji?`<div class="stat">${esc(u.emoji||'')} ${esc(u.status||'')}</div>`:''}
   ${st?`<div class="st-line st-${status(uid)}"><i></i>${esc(st)}</div>`:''}
   ${act?`<div class="act" style="font-size:13px;margin-top:4px">${act}</div>`:''}
   <div class="sect"><b>About me</b><p>${u.bio?fmt(u.bio):'<span class="muted">Nothing here yet.</span>'}</p></div>
   ${u.favGame?`<div class="sect"><b>Favourite game</b><p>🎮 ${esc(u.favGame)}</p></div>`:''}
   ${links.length?`<div class="sect"><b>Links</b>${links.map(l=>`<a href="${esc(l)}" target="_blank" rel="noopener">${esc(l.replace(/^https?:\/\//,''))}</a>`).join('')}</div>`:''}
   ${buttons?`<div class="row" style="margin-top:16px;flex-wrap:wrap">${buttons}</div>`:''}</div></div>`}
function relButtons(uid,{close=false}={}){const fr=friendships.find(f=>f.users.includes(uid));
  return(uid===me?.uid?`<button class="btn-acc" data-goprof>Edit profile</button>`:fr?.status==='accepted'?`<button class="btn-acc" data-dm="${uid}">Message</button><button data-unfriend="${fr.id}">Remove</button>`:fr?`<button disabled>Request ${fr.from===me.uid?'sent':'received'}</button>`:`<button class="btn-acc" data-add="${uid}">Add friend</button>`)+(close?'<button data-close>Close</button>':'')}

/* side panels (Discord-style profile on the right) */
const sideUid={chat:null,fr:null};
async function showSide(where,uid){sideUid[where]=uid;const el=$(where==='chat'?'#chatSide':'#frSide');if(!uid){el.innerHTML='';return}
  const u=await getUser(uid,uid!==me?.uid);if(sideUid[where]!==uid)return;el.innerHTML=card(u,{uid,buttons:relButtons(uid),compact:true});bindPeople(el)}
const refreshSides=()=>{['chat','fr'].forEach(w=>{if(sideUid[w])showSide(w,sideUid[w])})};
async function showUser(uid){const onChat=$('#v-chat').classList.contains('on'),onFr=$('#v-friends').classList.contains('on');
  if(onChat&&innerWidth>1100)return showSide('chat',uid);if(onFr&&innerWidth>1100)return showSide('fr',uid);
  const u=await getUser(uid,uid!==me?.uid);$('#userCard').innerHTML=card(u,{uid,buttons:relButtons(uid,{close:true})});bindPeople($('#userCard'));openModal('userModal')}

/* ---------- my profile tab ---------- */
let draft={};
const PF={name:'#pName',pronouns:'#pPron',emoji:'#pEmoji',status:'#pStatus',bio:'#pBio',favGame:'#pFav',links:'#pLinks',color:'#pColor',nameStyle:'#pNameStyle',nameC1:'#pN1',nameC2:'#pN2',nameFont:'#pNameFont',badges:'#pBadges',ring:'#pRing',cardStyle:'#pCardStyle'};
function formToDraft(){for(const[k,s]of Object.entries(PF))draft[k]=$(s).value;draft.name=draft.name.trim()}
function preview(){formToDraft();$('#pPreview').innerHTML=card(draft,{uid:me?.uid});$$('#pSwatches button').forEach((b,i)=>b.style.outline=!safeImg(draft.banner)&&(+draft.bannerG||0)===i?'2px solid #fff':'none')}
function openProfile(){const p=myProfile||{};draft={...p};
  const def={nameStyle:'solid',nameFont:'sans',ring:'none',cardStyle:'glass'};
  for(const[k,s]of Object.entries(PF))$(s).value=k==='color'?okColor(p.color):k==='nameC1'?okColor(p.nameC1||p.color):k==='nameC2'?okColor(p.nameC2,'#9ff0e6'):(p[k]??def[k]??'');
  $('#pShare').checked=cfg.share;$('#pShareGame').checked=cfg.shareGame;$('#pShareYt').checked=cfg.shareYt;$('#pShareWeb').checked=cfg.shareWeb;$('#pSeeOthers').checked=cfg.seeOthers;
  $('#pEmail').textContent='Signed in as '+(me?.email||'');preview()}
$('#pSwatches').innerHTML=GRADS.map((g,i)=>`<button type="button" data-g="${i}" style="background:${g}" title="Banner colour"></button>`).join('');
$$('#pSwatches button').forEach(b=>b.onclick=()=>{draft.banner='';draft.bannerG=+b.dataset.g;preview()});
Object.values(PF).forEach(s=>{$(s).addEventListener('input',preview);$(s).addEventListener('change',preview)});
$('#pPicBtn').onclick=()=>$('#pPicIn').click();
$('#pPicIn').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;draft.avatar=await L.shrinkImage(f,200,.85);preview()};
$('#pPicDel').onclick=()=>{draft.avatar='';preview()};
$('#pBanBtn').onclick=()=>$('#pBanIn').click();
$('#pBanIn').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;let d=await L.shrinkImage(f,900,.75);if(d.length>300000)d=await L.shrinkImage(f,640,.6);draft.banner=d;preview()};
$('#pBanDel').onclick=()=>{draft.banner='';preview()};
const pick=(v,list,d)=>list.includes(v)?v:d;
$('#pSave').onclick=async()=>{if(!me)return openModal('authModal');formToDraft();const name=draft.name.slice(0,24);if(name.length<2)return toast('Name needs 2+ characters');
  const d={name,nameLower:name.toLowerCase(),bio:String(draft.bio||'').slice(0,300),avatar:draft.avatar||'',banner:draft.banner||'',bannerG:+draft.bannerG||0,color:okColor(draft.color),
    pronouns:draft.pronouns.slice(0,20),emoji:draft.emoji.slice(0,4),status:draft.status.slice(0,80),favGame:draft.favGame.slice(0,40),links:String(draft.links||'').slice(0,400),
    nameStyle:pick(draft.nameStyle,['solid','gradient','animated','glow'],'solid'),nameC1:okColor(draft.nameC1),nameC2:okColor(draft.nameC2,'#9ff0e6'),nameFont:pick(draft.nameFont,['sans','serif','mono','round','display'],'sans'),
    badges:graphemes(draft.badges).filter(x=>x.trim()).slice(0,5).join(''),ring:pick(draft.ring,['none','solid','gradient','rainbow'],'none'),cardStyle:pick(draft.cardStyle,['glass','tint','gradient','dark'],'glass')};
  cfg.share=$('#pShare').checked;cfg.shareGame=$('#pShareGame').checked;cfg.shareYt=$('#pShareYt').checked;cfg.shareWeb=$('#pShareWeb').checked;cfg.seeOthers=$('#pSeeOthers').checked;save();
  $('#pSave').disabled=true;try{await F.updateDoc(D('users',me.uid),d);pushPresence();renderFriends();toast('Profile saved ✨')}catch(e){toast('Could not save: '+e.message)}$('#pSave').disabled=false};
$('#pOut').onclick=async()=>{try{await F.setDoc(D('presence',me.uid),{seen:F.serverTimestamp(),state:'offline',act:null})}catch{}await F.signOut(auth);L.go('games')};
$('#pResetPw').onclick=async()=>{try{await F.sendPasswordResetEmail(auth,me.email);toast('Reset email sent to '+me.email)}catch(e){toast(nice(e))}};
const prevOnView=L.onView;L.onView=v=>{prevOnView?.(v);if(v==='profile'){$('#profSignedOut').style.display=me?'none':'';$('#profWrap').style.display=me?'':'none';if(me)openProfile()}};

/* ---------- presence: online / idle / offline + activity ---------- */
function myAct(){const a=L.getActivity();if(!cfg.share||!a)return null;if(a.kind==='game'&&!cfg.shareGame)return null;if(a.kind==='youtube'&&!cfg.shareYt)return null;if(a.kind==='web'&&!cfg.shareWeb)return null;return{kind:a.kind,label:String(a.label).slice(0,120)}}
let lastSig='';
function pushPresence(state){if(!me)return;state=state||(document.visibilityState==='visible'?'online':'idle');const act=state==='offline'?null:myAct();
  F.setDoc(D('presence',me.uid),{seen:F.serverTimestamp(),state,act}).catch(()=>{});lastSig=state+JSON.stringify(act);renderMe()}
function startPresence(){pushPresence();const t=setInterval(()=>pushPresence(),60000);unsubs.push(()=>clearInterval(t))}
document.addEventListener('visibilitychange',()=>{if(me)pushPresence()});
addEventListener('pagehide',()=>{if(me)pushPresence('offline')});
L.onActivity=()=>{if(me&&(document.visibilityState==='visible'?'online':'idle')+JSON.stringify(myAct())!==lastSig)pushPresence()};
L.onPanic=()=>{if(me)F.setDoc(D('presence',me.uid),{seen:F.serverTimestamp(),state:'offline',act:null}).catch(()=>{})};

/* ---------- friends ---------- */
let friendships=[];const presUnsub=new Map();
const friendIds=()=>friendships.filter(f=>f.status==='accepted').map(f=>f.users.find(x=>x!==me.uid));
let rerender=null;const soon=()=>{clearTimeout(rerender);rerender=setTimeout(()=>{renderFriends();renderRooms();refreshSides();refreshDmHead()},120)};
function listenFriends(){unsubs.push(F.onSnapshot(F.query(C('friendships'),F.where('users','array-contains',me.uid)),s=>{
  friendships=s.docs.map(d=>({id:d.id,...d.data()}));const fr=friendIds();
  fr.forEach(uid=>{if(!presUnsub.has(uid))presUnsub.set(uid,F.onSnapshot(D('presence',uid),p=>{presence.set(uid,p.data()||{});soon()},()=>{}))});
  [...presUnsub.keys()].filter(k=>!fr.includes(k)).forEach(k=>{presUnsub.get(k)();presUnsub.delete(k);presence.delete(k)});soon()}));
  unsubs.push(()=>{presUnsub.forEach(u=>u());presUnsub.clear()});
  const t=setInterval(soon,30000);unsubs.push(()=>clearInterval(t))}
const rank=uid=>({online:0,idle:1,offline:2}[status(uid)]??3);
async function personRow(uid,{buttons='',sub='',click=''}={}){const u=await getUser(uid);
  return`<div class="person${L.cos?.plateCls(u.plate)||''}${click?' clickable':''}${panes.dm.convo?.id===uid&&click==='dm'?' on':''}" ${click==='dm'?`data-open="${uid}"`:''}>${L.cos?.buddyCanvas(u.buddy,'bar')||''}${pic(u,40,uid)}<div class="info"><b data-user="${uid}">${nameHTML(u)}</b><span class="${sub.includes('<b>')?'act':''}">${sub}</span></div>${buttons}</div>`}
async function renderFriends(){if(!me)return;
  const acc=friendIds().sort((a,b)=>rank(a)-rank(b)),inc=friendships.filter(f=>f.status==='pending'&&f.from!==me.uid),out=friendships.filter(f=>f.status==='pending'&&f.from===me.uid);
  const other=f=>f.users.find(x=>x!==me.uid);const online=acc.filter(u=>status(u)!=='offline').length;
  const rows=await Promise.all(acc.map(uid=>personRow(uid,{sub:actText(uid)||esc(statusText(uid)),click:'dm'})));
  $('#friendList').innerHTML=(acc.length?`<div class="fr-count"><span class="st-dot st-online"></span>${online} online · ${acc.length} friends</div>`:'')+(rows.join('')||'<p class="muted">No friends yet. Search for people above.</p>');
  $('#reqList').innerHTML=(await Promise.all([...inc.map(f=>personRow(other(f),{buttons:`<button class="ib" data-accept="${f.id}" title="Accept">✓</button><button class="ib" data-unfriend="${f.id}" title="Decline">✕</button>`,sub:'Wants to be friends'})),...out.map(f=>personRow(other(f),{buttons:`<button class="ib" data-unfriend="${f.id}" title="Cancel">✕</button>`,sub:'Request sent'}))])).join('')||'<p class="muted" style="font-size:13px">No requests.</p>';
  $('#reqBadge').style.display=inc.length?'':'none';$('#reqBadge').textContent=inc.length;bindPeople($('#v-friends'))}
function bindPeople(root){
  root.querySelectorAll('[data-open]').forEach(r=>r.onclick=e=>{if(e.target.closest('button'))return;openDm(r.dataset.open)});
  root.querySelectorAll('[data-user]').forEach(b=>b.onclick=e=>{if(b.closest('[data-open]'))return;e.stopPropagation();showUser(b.dataset.user)});
  root.querySelectorAll('[data-dm]').forEach(b=>b.onclick=()=>{closeModal('userModal');openDm(b.dataset.dm)});
  root.querySelectorAll('[data-goprof]').forEach(b=>b.onclick=()=>{closeModal('userModal');L.go('profile')});
  root.querySelectorAll('[data-add]').forEach(b=>b.onclick=async()=>{const o=b.dataset.add;try{await F.setDoc(D('friendships',pairId(me.uid,o)),{users:[me.uid,o].sort(),from:me.uid,status:'pending',at:F.serverTimestamp()});toast('Request sent');b.disabled=true;b.textContent='✓'}catch(e){toast('Could not send: '+e.message)}});
  root.querySelectorAll('[data-accept]').forEach(b=>b.onclick=()=>F.updateDoc(D('friendships',b.dataset.accept),{status:'accepted'}).then(()=>toast('Friend added')).catch(e=>toast(e.message)));
  root.querySelectorAll('[data-unfriend]').forEach(b=>b.onclick=()=>{if(confirm('Remove?'))F.deleteDoc(D('friendships',b.dataset.unfriend)).then(()=>closeModal('userModal')).catch(e=>toast(e.message))})}
$('#findForm').onsubmit=async e=>{e.preventDefault();if(!me)return openModal('authModal');const q=$('#findIn').value.trim().toLowerCase();if(!q){$('#findList').innerHTML='';return}
  const s=await F.getDocs(F.query(C('users'),F.orderBy('nameLower'),F.startAt(q),F.endAt(q+''),F.limit(15)));
  const rows=await Promise.all(s.docs.filter(d=>d.id!==me.uid).map(d=>{users.set(d.id,Promise.resolve({uid:d.id,...d.data()}));fetchedAt.set(d.id,Date.now());const fr=friendships.find(f=>f.users.includes(d.id));
    return personRow(d.id,{buttons:fr?.status==='accepted'?`<button class="ib" data-dm="${d.id}" title="Message">💬</button>`:fr?'<button disabled class="ib">…</button>':`<button class="ib" data-add="${d.id}" title="Add friend">＋</button>`})}));
  $('#findList').innerHTML=(rows.join('')||'<p class="muted" style="font-size:13px">Nobody found with that name.</p>')+'<a href="#" class="muted" style="font-size:12px" data-clearfind>clear</a>';bindPeople($('#findList'));
  $('#findList [data-clearfind]').onclick=e=>{e.preventDefault();$('#findList').innerHTML='';$('#findIn').value=''}};

/* ---------- message panes (rooms + DMs) ---------- */
const rooms=()=>cfg.rooms.split(',').map(s=>s.trim().toLowerCase().replace(/[^\w-]/g,'')).filter(Boolean);
function mkPane(sel){const el=$(sel);return{el,msgs:el.querySelector('.msgs'),pt:el.querySelector('.pt'),status:el.querySelector('.status'),form:el.querySelector('form'),input:el.querySelector('form input'),convo:null,unsub:null}}
const panes={room:mkPane('#roomPane'),dm:mkPane('#dmPane')};
async function renderRooms(){if(!me)return;const on=friendIds().filter(u=>status(u)!=='offline').sort((a,b)=>rank(a)-rank(b));
  const fr=await Promise.all(on.map(async uid=>{const u=await getUser(uid);return`<button class="room${L.cos?.plateCls(u.plate)||''}" data-user="${uid}">${L.cos?.buddyCanvas(u.buddy,'bar')||''}${pic(u,26,uid)}<span>${nameHTML(u,{badges:false})}</span></button>`}));
  $('#roomList').innerHTML=rooms().map(r=>`<button class="room ${panes.room.convo?.id===r?'on':''}" data-room="${r}"><span class="hash">#</span>${r}</button>`).join('')+
    `<div class="dc-title" style="margin-top:16px">Friends online — ${on.length}</div>`+(fr.join('')||'<p class="muted" style="font-size:12px;padding:0 10px">Nobody online right now.</p>');
  $$('#roomList [data-room]').forEach(b=>b.onclick=()=>openConvo(panes.room,{type:'room',id:b.dataset.room}));
  $$('#roomList [data-user]').forEach(b=>b.onclick=()=>showUser(b.dataset.user))}
L.onRooms=()=>renderRooms();
const convoPath=c=>c.type==='room'?['rooms',c.id,'messages']:['dms',pairId(me.uid,c.id),'messages'];
async function refreshDmHead(){const p=panes.dm;if(p.convo?.type!=='dm')return;const uid=p.convo.id;const u=await getUser(uid);
  p.pt.innerHTML=`${pic(u,28,uid)}<span>${nameHTML(u)}</span>`;const act=actText(uid);p.status.className='status st-'+status(uid);p.status.innerHTML=`<i></i>${act||esc(statusText(uid))}`}
function openDm(uid){L.go('friends');openConvo(panes.dm,{type:'dm',id:uid});showSide('fr',uid)}
async function openConvo(p,c){if(!me)return;p.convo=c;p.unsub?.();
  if(c.type==='room'){p.pt.innerHTML=`<span class="hash">#</span>${esc(c.id)}`;p.status.className='status';p.status.innerHTML='<i></i>Connecting…';renderRooms()}
  else{await refreshDmHead();renderFriends()}
  p.input.placeholder=c.type==='room'?`Message #${c.id}`:'Message '+((await getUser(c.id)).name||'');
  p.msgs.innerHTML='<div class="sysmsg">Loading…</div>';
  p.unsub=F.onSnapshot(F.query(C(...convoPath(c)),F.orderBy('at','desc'),F.limit(100)),async s=>{
    if(c.type==='room'){p.status.className='status ok';p.status.innerHTML='<i></i>Live'}
    const docs=s.docs.map(d=>d.data()).reverse();const us=await Promise.all(docs.map(m=>getUser(m.uid)));
    const box=p.msgs,atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<80;
    box.innerHTML=docs.map((m,i)=>{const u=us[i],g=safeImg(m.gif),prev=docs[i-1];
      const grouped=prev&&prev.uid===m.uid&&ms(m.at)-ms(prev.at)<5*60e3;
      const body=`${m.text?`<div class="dtext">${fmt(m.text)}</div>`:''}${g?`<img class="gif" src="${g}" alt="GIF">`:''}`;
      return grouped?`<div class="dmsg grouped"><span class="dtime">${new Date(ms(m.at)).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span><div class="dbody">${body}</div></div>`
        :`<div class="dmsg"><div class="dav" data-user="${m.uid}">${pic(u,40,friendIds().includes(m.uid)||m.uid===me.uid?m.uid:null)}</div><div class="dbody"><div class="dhead"><b data-user="${m.uid}">${nameHTML(u)}</b><span class="muted">${when(m.at)}</span></div>${body}</div></div>`}).join('')
      ||`<div class="sysmsg">${c.type==='room'?'No messages yet. Say hi 👋':'This is the start of your private chat. Only you two can read it.'}</div>`;
    box.querySelectorAll('[data-user]').forEach(b=>b.onclick=()=>showUser(b.dataset.user));
    if(atBottom||s.metadata.hasPendingWrites||box.dataset.c!==JSON.stringify(c))box.scrollTop=1e9;box.dataset.c=JSON.stringify(c)},
    e=>{p.status.className='status';p.status.innerHTML='<i></i>No access';p.msgs.innerHTML=`<div class="sysmsg">${esc(e.code==='permission-denied'?'You can only message friends.':e.message)}</div>`});
  unsubs.push(()=>p.unsub?.())}
async function sendMsg(p,text,gif){if(!me){openModal('authModal');return}if(!p.convo)return toast('Pick a chat first');text=(text||'').trim().slice(0,1000);if(!text&&!gif)return;
  try{await F.addDoc(C(...convoPath(p.convo)),{uid:me.uid,text,gif:gif||'',at:F.serverTimestamp()})}catch(e){toast('Not sent: '+e.message)}}
Object.values(panes).forEach(p=>{p.form.onsubmit=e=>{e.preventDefault();const v=p.input.value;p.input.value='';sendMsg(p,v)};
  p.form.querySelector('[data-gifbtn]').onclick=async()=>{const g=await pickGif();if(g)sendMsg(p,'',g)}});
const vOn=L.onView;L.onView=v=>{vOn?.(v);if(v==='friends'&&me&&!sideUid.fr)showSide('fr',me.uid)};

/* ---------- GIF library (GIPHY) ---------- */
const CATS=['Trending','lol','yes','no','love','wow','sad','dance','hello','thank you','facepalm','gg','cat','dog','anime','sports'];
let gifResolve=null,gifQ='',gifOff=0,gifBusy=false,gifMore=true;
$('#gifCats').innerHTML=CATS.map(c=>`<button type="button" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
function pickGif(){return new Promise(r=>{gifResolve=r;$('#gifUrl').value='';$('#gifQ').value='';openModal('gifModal');
  if(!CONF.giphyKey){$('#gifCats').style.display='none';$('#gifGrid').innerHTML='<p class="muted" style="grid-column:1/-1;font-size:13px">The GIF library needs a free GIPHY key added once to <code>js/config.js</code> by whoever runs this site (see SETUP.md). You can still paste a GIF link below.</p>'}
  else{$('#gifCats').style.display='';loadGifs('')}setTimeout(()=>$('#gifQ').focus(),50)})}
function doneGif(u){closeModal('gifModal');const r=gifResolve;gifResolve=null;r?.(u)}
$('#gifModal').addEventListener('click',e=>{if(e.target===$('#gifModal')||e.target.closest('[data-close]'))doneGif(null)});
async function loadGifs(q,more){if(!CONF.giphyKey||gifBusy)return;if(!more){gifQ=q;gifOff=0;gifMore=true;$('#gifGrid').innerHTML='';$('#gifGrid').scrollTop=0}if(!gifMore)return;gifBusy=true;
  $$('#gifCats button').forEach(b=>b.classList.toggle('on',(b.dataset.cat==='Trending'&&!gifQ)||b.dataset.cat===gifQ));
  try{const r=await fetch(`https://api.giphy.com/v1/gifs/${gifQ?'search':'trending'}?api_key=${encodeURIComponent(CONF.giphyKey)}&limit=30&offset=${gifOff}&rating=pg-13${gifQ?'&q='+encodeURIComponent(gifQ):''}`);const j=await r.json();
    const items=(j.data||[]).map(g=>{const s=g.images?.fixed_width?.url||g.images?.fixed_height_small?.url,b=g.images?.fixed_height?.url||s;return s?`<img src="${esc(s)}" data-g="${esc(b)}" alt="${esc(g.title||'')}" loading="lazy">`:''}).join('');
    gifOff+=30;gifMore=(j.data||[]).length===30;$('#gifGrid').insertAdjacentHTML('beforeend',items||(more?'':'<p class="muted">No GIFs found.</p>'));
    $$('#gifGrid [data-g]').forEach(i=>i.onclick=()=>doneGif(i.dataset.g))}catch{if(!more)$('#gifGrid').innerHTML='<p class="muted">GIF search failed.</p>'}gifBusy=false}
$('#gifGrid').addEventListener('scroll',e=>{const g=e.target;if(g.scrollTop+g.clientHeight>g.scrollHeight-200)loadGifs(gifQ,true)});
$('#gifCats').addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(b){$('#gifQ').value=b.dataset.cat==='Trending'?'':b.dataset.cat;loadGifs(b.dataset.cat==='Trending'?'':b.dataset.cat)}});
$('#gifForm').onsubmit=e=>{e.preventDefault();loadGifs($('#gifQ').value.trim())};
$('#gifUrlForm').onsubmit=e=>{e.preventDefault();const u=$('#gifUrl').value.trim();if(!/^https:\/\/\S+$/i.test(u))return toast('Paste an https:// link');doneGif(u)};

/* ---------- posts ---------- */
let postImage='';const openCmts=new Map();
$('#postImgBtn').onclick=()=>$('#postImg').click();
$('#postImg').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;postImage=await L.shrinkImage(f,1100,.8);$('#postThumb').src=postImage;$('#postThumb').style.display='';$('#postImgClear').style.display=''};
$('#postImgClear').onclick=()=>{postImage='';$('#postThumb').style.display='none';$('#postImgClear').style.display='none'};
$('#postBtn').onclick=async()=>{if(!me)return openModal('authModal');const text=$('#postText').value.trim().slice(0,2000);if(!text&&!postImage)return toast('Write something or add an image');
  $('#postBtn').disabled=true;try{await F.addDoc(C('posts'),{uid:me.uid,text,image:postImage,at:F.serverTimestamp()});$('#postText').value='';$('#postImgClear').click();toast('Posted')}catch(e){toast('Could not post: '+e.message)}$('#postBtn').disabled=false};
const postAgo=t=>ago(ms(t));
function listenFeed(){unsubs.push(F.onSnapshot(F.query(C('posts'),F.orderBy('at','desc'),F.limit(40)),async s=>{
  const posts=s.docs.map(d=>({id:d.id,...d.data()}));const us=await Promise.all(posts.map(p=>getUser(p.uid)));const fr=friendIds();
  $('#feed').innerHTML=posts.map((p,i)=>{const u=us[i],img=safeImg(p.image),sid=fr.includes(p.uid)||p.uid===me.uid?p.uid:null;return`<div class="card post" id="p-${p.id}"><div class="post-h"><div data-user="${p.uid}" style="cursor:pointer">${pic(u,42,sid)}</div><div><b data-user="${p.uid}">${nameHTML(u)}</b><span>${postAgo(p.at)}</span></div></div>
    ${p.text?`<div class="post-t">${fmt(p.text)}</div>`:''}${img?`<img class="post-img" src="${img}" alt="">`:''}
    <div class="post-a"><button data-cm="${p.id}">💬 Comments</button>${p.uid===me.uid?`<button data-delpost="${p.id}">Delete</button>`:''}</div><div class="cmts" id="c-${p.id}" style="display:none"></div></div>`}).join('')||'<p class="muted">No posts yet. Be the first!</p>';
  bindPeople($('#feed'));
  $$('#feed [data-cm]').forEach(b=>b.onclick=()=>toggleCmts(b.dataset.cm));
  $$('#feed [data-delpost]').forEach(b=>b.onclick=()=>{if(confirm('Delete this post?'))F.deleteDoc(D('posts',b.dataset.delpost)).catch(e=>toast(e.message))});
  openCmts.forEach((u,id)=>{u();openCmts.delete(id);if($('#c-'+id))toggleCmts(id)})}));
  unsubs.push(()=>{openCmts.forEach(u=>u());openCmts.clear()})}
function toggleCmts(id){const box=$('#c-'+id);if(openCmts.has(id)){openCmts.get(id)();openCmts.delete(id);box.style.display='none';return}
  box.style.display='';box.innerHTML='<span class="muted">Loading…</span>';
  openCmts.set(id,F.onSnapshot(F.query(C('posts',id,'comments'),F.orderBy('at','asc'),F.limit(100)),async s=>{const cs=s.docs.map(d=>({id:d.id,...d.data()}));const us=await Promise.all(cs.map(c=>getUser(c.uid)));
    const draftTxt=box.querySelector('input')?.value||'';
    box.innerHTML=cs.map((c,i)=>{const g=safeImg(c.gif);return`<div class="cmt"><div data-user="${c.uid}" style="cursor:pointer">${pic(us[i],30)}</div><div class="bub"><small><b data-user="${c.uid}">${nameHTML(us[i])}</b> · ${postAgo(c.at)}${c.uid===me.uid?` · <a href="#" data-delc="${c.id}" style="color:inherit">delete</a>`:''}</small>${fmt(c.text||'')}${g?`<img class="gif" src="${g}" alt="GIF">`:''}</div></div>`}).join('')+
      `<form class="cmt-in"><button type="button" class="ib" data-emoji="#ci-${id}">😊</button><button type="button" class="ib gif-b" data-gif>GIF</button><input id="ci-${id}" data-rich placeholder="Write a comment…" maxlength="500" value="${esc(draftTxt)}"><button class="btn-acc">Send</button></form>`;
    bindPeople(box);
    box.querySelectorAll('[data-delc]').forEach(a=>a.onclick=e=>{e.preventDefault();F.deleteDoc(D('posts',id,'comments',a.dataset.delc)).catch(err=>toast(err.message))});
    const send=(text,gif)=>F.addDoc(C('posts',id,'comments'),{uid:me.uid,text:(text||'').slice(0,500),gif:gif||'',at:F.serverTimestamp()}).catch(e=>toast('Not sent: '+e.message));
    box.querySelector('form').onsubmit=e=>{e.preventDefault();const i=e.target.querySelector('input');if(i.value.trim()){send(i.value.trim());i.value=''}};
    box.querySelector('[data-gif]').onclick=async()=>{const g=await pickGif();if(g)send('',g)}},e=>box.innerHTML=`<span class="muted">${esc(e.message)}</span>`))}

/* shared with shop.js */
L.cloud={F,D,me:()=>me,profile:()=>myProfile,card,pic,nameHTML};
L.onCloudReady?.();
