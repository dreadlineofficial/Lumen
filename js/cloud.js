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
let me=null,myProfile=null,lastMuted='[]';
/* update a list in place: only what changed is touched, so animated GIFs, nameplates and buddies keep playing */
function morph(el,html){if(!el)return;const t=document.createElement('template');t.innerHTML=html;morphKids(el,t.content)}
function morphKids(a,b){const an=[...a.childNodes],bn=[...b.childNodes];
  for(let i=0;i<bn.length;i++){const x=an[i],y=bn[i];if(!x){a.appendChild(y);continue}
    if(x.nodeType!==y.nodeType||x.nodeName!==y.nodeName||(x.nodeType===1&&(x.dataset.k||'')!==(y.dataset.k||''))){a.replaceChild(y,x);continue}
    if(x.nodeType!==1){if(x.nodeValue!==y.nodeValue)x.nodeValue=y.nodeValue;continue}
    if(x.nodeName==='CANVAS'){if(x.dataset.buddy!==y.dataset.buddy)a.replaceChild(y,x);else if((x.dataset.bx||'')!==(y.dataset.bx||''))x.dataset.bx=y.dataset.bx||'';continue}
    morphEl(x,y)}
  for(let i=an.length-1;i>=bn.length;i--)an[i].remove()}
function morphEl(x,y){const media=x.hasAttribute('data-media')&&x.getAttribute('data-media')===y.getAttribute('data-media');
  // a big picture (chat photo/GIF, animated avatar or banner) that finished loading keeps its picture even if the new HTML was made before it loaded
  if(media&&mediaNow(x.getAttribute('data-media'))){const u=mediaNow(x.getAttribute('data-media'));if(x.tagName==='IMG'&&!y.hasAttribute('src'))y.setAttribute('src',u);else if(x.tagName!=='IMG'&&!/background-image/.test(y.getAttribute('style')||''))y.setAttribute('style',(y.getAttribute('style')||'')+`;background-image:url('${u}')`)}
  for(const at of [...x.attributes])if(!y.hasAttribute(at.name))x.removeAttribute(at.name);
  for(const at of [...y.attributes])if(x.getAttribute(at.name)!==at.value)x.setAttribute(at.name,at.value);
  if(x.nodeName!=='INPUT'&&x.nodeName!=='TEXTAREA')morphKids(x,y)}
L.morph=morph;
/* Lumen premium: subs/{uid} holds an end date per plan. Lite, Upgrade, Pro, Ultimate (+ the Ultimate admin renewal) */
let mySub={},adminOn=false;const tsMs=v=>v?.toMillis?.()||(v instanceof Date?+v:0);const liveK=k=>tsMs(mySub[k])>Date.now();
const plan={sub:()=>mySub,lite:()=>liveK('lite')||liveK('pro')||liveK('ultimate'),up:()=>liveK('upgrade'),pro:()=>liveK('pro')||liveK('ultimate'),ult:()=>liveK('ultimate'),
  staff:()=>liveK('pro')||(liveK('ultimate')&&liveK('ultAdmin')),until:k=>tsMs(mySub[k]),
  top:()=>liveK('ultimate')?'ultimate':liveK('pro')?'pro':liveK('lite')?'lite':'',
  price:p=>plan.lite()&&p%10===0?p*9/10:p,bonus:x=>plan.lite()?Math.floor(x*21/20):x,
  uploadMB:()=>plan.up()?15:plan.lite()?10:4,chatMB:()=>plan.up()?5:plan.lite()?1:0,maxParts:()=>plan.up()?24:plan.lite()?16:8};
L.plan=plan;
/* big pictures (Lite): media/{id} plus up to 24 pieces of 900 KB; shown through blob URLs, cached */
const MPART=900000,mediaCache=new Map();
const mediaId=v=>{const m=/^media:([A-Za-z0-9]{16,30})$/.exec(v||'');return m?m[1]:''};
const mediaNow=id=>{const v=mediaCache.get(id);return typeof v==='string'?v:''};
function loadMedia(id){if(!id)return Promise.resolve('');if(mediaCache.has(id))return Promise.resolve(mediaCache.get(id));
  const p=(async()=>{const d=(await F.getDoc(D('media',id))).data();if(!d)return'';let data=d.data||'';
    if(d.parts>0)data=(await Promise.all([...Array(d.parts).keys()].map(i=>F.getDoc(D('media',id,'parts',String(i))).then(x=>x.data()?.d||'')))).join('');
    if(!/^data:image\/(gif|png|webp|jpeg);base64,/.test(data))return'';const url=URL.createObjectURL(await (await fetch(data)).blob());
    mediaCache.set(id,url);document.querySelectorAll(`[data-media="${id}"]`).forEach(el=>{if(el.tagName==='IMG')el.src=url;else el.style.backgroundImage=`url('${url}')`});return url})().catch(()=>{mediaCache.delete(id);return''});
  mediaCache.set(id,p);return p}
async function putMedia(data,kind){const id=[...crypto.getRandomValues(new Uint8Array(20))].map(x=>'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'[x%56]).join('');
  const parts=data.length>MPART?Math.ceil(data.length/MPART):0,bs=[F.writeBatch(db)];
  bs[0].set(D('media',id),{uid:me.uid,kind,data:parts?'':data,parts,at:F.serverTimestamp()});
  for(let i=0;i<parts;i++){const k=i>>3;(bs[k]||=F.writeBatch(db)).set(D('media',id,'parts',String(i)),{d:data.slice(i*MPART,(i+1)*MPART)})}
  for(let i=0;i<bs.length;i++){if(bs.length>2)toast(`Uploading… ${Math.round(100*i/bs.length)}%`);await bs[i].commit()}
  mediaCache.set(id,URL.createObjectURL(await (await fetch(data)).blob()));return id}
const readURL=f=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(f)});
L.media={put:putMedia,load:loadMedia,id:mediaId};
const PREM_ITEMS={lite:['nfx_gold','fx_golddust','deco_laurel'],upgrade:['fx_prism','deco_prism','plate_prism','nfx_prism'],pro:['fx_circuit','deco_proorbit','plate_pro','nfx_pro'],ultimate:['fx_nebula','deco_crownhalo','plate_ult','nfx_ult']};
const entitled=t=>t==='lite'?plan.lite():t==='upgrade'?plan.up():t==='pro'?plan.pro():t==='ultimate'?plan.ult():false;
plan.wears=id=>{for(const[t,l]of Object.entries(PREM_ITEMS))if(l.includes(id))return entitled(t);return null};
/* someone's tier, as shown on their profile (only while it lasts) */
const tierOf=u=>u?.tier&&tsMs(u.tierUntil)>Date.now()?u.tier:'';const upOf=u=>!!u?.up&&tsMs(u.upUntil)>Date.now();
const TIER_TXT={lite:'LITE',pro:'PRO',ultimate:'ULTIMATE'};
function tierTag(u){const t=tierOf(u),up=upOf(u);if(!t&&!up)return'';return`<span class="ptag ptag-${t||'up'}" title="Lumen ${t?t[0].toUpperCase()+t.slice(1):'Upgrade'}${t&&up?' + Upgrade':''}">${t?TIER_TXT[t]:'UPGRADE'}${t&&up?'<i>+</i>':''}</span>`}
/* keep the profile in step with the plan: tier tag, and premium-only things switch off when a plan ends */
let syncing=false,subReady=false,syncT=0;
// waits a moment so a just-redeemed plan and the profile both settle before comparing them
function syncTier(){clearTimeout(syncT);syncT=setTimeout(doSync,2500)}
async function doSync(){if(!me||!myProfile||syncing||!subReady)return;const t=plan.top(),p=myProfile,d={};
  const tu=t?mySub[t]:0;if((p.tier||'')!==t||(t&&tsMs(p.tierUntil)!==tsMs(tu))){d.tier=t;d.tierUntil=t?tu:0}
  const up=plan.up();if(!!p.up!==up||(up&&tsMs(p.upUntil)!==tsMs(mySub.upgrade))){d.up=up;d.upUntil=up?mySub.upgrade:0}
  for(const k of['fx','deco','plate','nfx'])if(p[k]&&plan.wears(p[k])===false&&!(p.owned||[]).includes(p[k]))d[k]='';
  if(p.buddy&&!plan.lite())d.buddy='';if((p.stickers||[]).length&&!plan.lite())d.stickers=[];
  if(!plan.lite()){if(['script','pixel','gothic','wide'].includes(p.nameFont))d.nameFont='sans';if(p.cardBorder&&p.cardBorder!=='none')d.cardBorder='';
    if(['aurora','holo','midnight'].includes(p.cardStyle))d.cardStyle='glass';if(/^media:/.test(p.avatar||''))d.avatar='';if(/^media:/.test(p.banner||''))d.banner=''}
  if(!Object.keys(d).length)return;syncing=true;try{await F.updateDoc(D('users',me.uid),d)}catch(e){console.warn('plan sync',e.code||e.message)}syncing=false}
L.syncTier=syncTier;
/* Labs: early features for Lite members */
const LABS=['tilt','fade','bubbles'];
function applyLabs(){const on=plan.lite();LABS.forEach(k=>{const el=$('#lab_'+k);if(el){el.disabled=!on;el.checked=!!cfg['lab_'+k]}document.body.classList.toggle('lab-'+k,on&&!!cfg['lab_'+k])});const l=$('#labLock');if(l)l.style.display=on?'none':''}
LABS.forEach(k=>$('#lab_'+k)?.addEventListener('change',e=>{cfg['lab_'+k]=e.target.checked;save();applyLabs()}));
document.addEventListener('mousemove',e=>{if(!document.body.classList.contains('lab-tilt'))return;const c=e.target.closest?.('.pcard');document.querySelectorAll('.pcard.tilting').forEach(x=>{if(x!==c){x.classList.remove('tilting');x.style.transform=''}});
  if(!c||c.closest('.sitem,.bundle,.ph-demo'))return;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.classList.add('tilting');c.style.transform=`perspective(900px) rotateY(${x*10}deg) rotateX(${-y*10}deg)`},{passive:true});
let unsubs=[];const stopAll=()=>{unsubs.forEach(u=>u());unsubs=[];};

/* ---------- users, presence, styled names ---------- */
const users=new Map(),presence=new Map(),fetchedAt=new Map();
function getUser(uid,fresh){if(users.has(uid)&&!fresh){if(Date.now()-(fetchedAt.get(uid)||0)>=60000){fetchedAt.set(uid,Date.now());F.getDoc(D('users',uid)).then(s=>{if(s.exists())users.set(uid,Promise.resolve({uid,...s.data()}))}).catch(()=>{})}return users.get(uid)}fetchedAt.set(uid,Date.now());const p=F.getDoc(D('users',uid)).then(s=>s.exists()?{uid,...s.data()}:{uid,name:'Unknown',bio:''}).catch(()=>({uid,name:'Unknown'}));users.set(uid,p);return p}
const okColor=(c,d='#d6b8ff')=>/^#[0-9a-f]{6}$/i.test(c||'')?c:d;
// online | idle | offline | null (unknown: not a friend)
function status(uid){if(uid===me?.uid)return document.visibilityState==='visible'?'online':'idle';const p=presence.get(uid);if(!p)return null;
  if(!p.seen||p.state==='offline'||Date.now()-ms(p.seen)>ONLINE_MS)return'offline';return p.state==='idle'?'idle':'online'}
function statusText(uid){const s=status(uid);if(s==='online')return'Online';if(s==='idle')return'Idle';if(s==='offline'){const p=presence.get(uid);return p?.seen?'Last seen '+ago(ms(p.seen)):'Offline'}return''}
function ringBg(u){const c1=okColor(u.nameC1||u.color),c2=okColor(u.nameC2,'#9ff0e6');
  return u.ring==='solid'?okColor(u.color):u.ring==='gradient'?`linear-gradient(135deg,${c1},${c2})`:u.ring==='rainbow'?'conic-gradient(#ff5c7a,#ffc59e,#ffd200,#38ef7d,#22d3ee,#9b6bff,#ff5c7a)':''}
function pic(u,size=36,uid){const mid=mediaId(u?.avatar),a=mid?mediaNow(mid):safeImg(u?.avatar);if(mid&&!a)loadMedia(mid);const st=uid?status(uid):null,ring=ringBg(u||{});
  return`<div class="pic${st?' st-'+st:''}${ring?' ring':''}" style="width:${size}px;height:${size}px;font-size:${Math.round(size*.4)}px;--psz:${size}px;${ring?`--ring:${ring};`:''}">${mid?`<img data-media="${mid}"${a?` src="${a}"`:''} alt="">`:a?`<img src="${a}" alt="">`:`<span>${esc((u?.name||'?')[0].toUpperCase())}</span>`}${L.cos?.deco(u?.deco)||''}</div>`}
const graphemes=s=>{try{return[...new Intl.Segmenter().segment(String(s||''))].map(x=>x.segment)}catch{return[...String(s||'')]}};
function nameHTML(u,{badges=true}={}){const c1=okColor(u.nameC1||u.color),c2=okColor(u.nameC2,'#9ff0e6'),st=u.nameStyle||'solid';
  const style=st==='gradient'||st==='animated'?`background-image:linear-gradient(90deg,${c1},${c2},${c1});`:st==='glow'?`color:${c1};text-shadow:0 0 12px ${c1}aa;`:`color:${c1};`;
  const b=badges&&u.badges?`<span class="ubadges">${esc(graphemes(u.badges).filter(x=>x.trim()).slice(0,5).join(''))}</span>`:'';
  return`<span class="uname n-${st} f-${u.nameFont||'sans'}${L.cos?.nfxCls(u.nfx)||''}" style="${style}">${esc(u.name||'Unknown')}</span>${badges?tierTag(u):''}${b}`}
function actText(uid){if(!cfg.seeOthers)return'';const p=presence.get(uid);if(!p?.act||status(uid)==='offline'||!status(uid))return'';const a=p.act;
  const lb=a.lobby&&/^[A-Z0-9]{3,12}$/.test(a.lobby.code)?a.lobby:null;if(a.kind==='game'&&lb)return`🎮 Hosting a <b>${esc(a.label)}</b> lobby (${+lb.n||1}/${+lb.max||5}) <button class="nb-join" data-nbjoin="${lb.code}">Join</button>`;
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

function renderMe(){if(!myProfile)return;const mc=$('#meChip'),cls='me-chip'+(L.cos?.plateCls(myProfile.plate)||'');if(mc.className!==cls)mc.className=cls;
  const bh=L.cos?.buddyCanvas(myProfile.buddy,'bar','me:chip',myProfile)||'';const oldB=mc.querySelector('canvas.buddy');
  if((oldB?.dataset.buddy||'')!==(bh?myProfile.buddy:'')){oldB?.remove();if(bh)mc.insertAdjacentHTML('afterbegin',bh)}else if(oldB)oldB.dataset.bx=myProfile.buddyX>=0?String(myProfile.buddyX):'';
  const ph=pic(myProfile,38,me.uid).replace('class="pic','id="mePic" class="pic'),mp=$('#mePic');if(mp._src!==ph){const t=document.createElement('template');t.innerHTML=ph;const n=t.content.firstElementChild;if(mp._src)morphEl(mp,n);else mp.replaceWith(n);$('#mePic')._src=ph}
  const sh=L.cos?.stickerLayer(myProfile.stickers,myProfile)||'';if(mc._stk!==sh){mc.querySelector(':scope>.stk-layer')?.remove();if(sh)mc.insertAdjacentHTML('beforeend',sh);mc._stk=sh}
  const nh=nameHTML(myProfile,{badges:false});if($('#meName')._src!==nh){$('#meName').innerHTML=nh;$('#meName')._src=nh}const st=statusText(me.uid);if($('#meSt').textContent!==st)$('#meSt').textContent=st}
F.onAuthStateChanged(auth,async u=>{stopAll();me=u;presence.clear();mySub={};adminOn=false;
  if(!u){myProfile=null;L.onProfile?.(null);$('#meChip').className='me-chip';$('#meChip canvas.buddy')?.remove();$('#mePic').outerHTML=`<div class="pic" id="mePic" style="width:38px;height:38px">?</div>`;$('#meName').textContent='Sign in';$('#meSt').textContent='Chat, friends & posts';renderSignedOut();return}
  await ensureProfile(u,u.displayName||u.email?.split('@')[0]);
  unsubs.push(F.onSnapshot(D('users',u.uid),s=>{myProfile={uid:u.uid,...s.data()};users.set(u.uid,Promise.resolve(myProfile));fetchedAt.set(u.uid,Date.now()+1e12);renderMe();syncTier();if(JSON.stringify(myProfile.mutedPosts||[])!==lastMuted){lastMuted=JSON.stringify(myProfile.mutedPosts||[]);mutedCount();if(allFeed.length)drawFeed()}
    if((myProfile.theme||'')!==(cfg.theme||'')){cfg.theme=myProfile.theme||'';save();L.cos?.applyTheme(cfg.theme)}L.onProfile?.(myProfile);if(!sideUid.chat)showSide('chat',u.uid)}));
  if(!panes.dm.convo)panes.dm.msgs.innerHTML='<div class="sysmsg">Pick a friend on the left to start chatting.</div>';
  mySub={};adminOn=false;subReady=false;unsubs.push(F.onSnapshot(D('subs',u.uid),s=>{mySub=s.data()||{};subReady=!s.metadata.hasPendingWrites;
    // the Lumen owner always has Ultimate (and its control panel), for good
    if(u.uid===ADMIN_UID&&!s.metadata.hasPendingWrites&&!(tsMs(mySub.ultimate)>Date.now()+3e11&&tsMs(mySub.ultAdmin)>Date.now()+3e11)){const forever=new Date('2126-01-01T00:00:00Z');F.setDoc(D('subs',u.uid),{ultimate:forever,ultAdmin:forever},{merge:true}).catch(e=>console.warn('owner plan',e.code||e.message))}startAdmin();syncTier();renderMe();applyLabs();L.onPlan?.(plan)},()=>{}));
  startPresence();listenFriends();listenServer();listenFeed();listenMyPosts();startAdmin();renderRooms();openConvo(panes.room,panes.room.convo||{type:'room',id:rooms()[0]||'general'})});
function renderSignedOut(){$('#navAdmin').style.display='none';document.body.classList.remove('is-banned');const b=`<div class="banner">Sign in (bottom-left) to use this.</div>`;$('#friendList').innerHTML=b;$('#reqList').innerHTML='';$('#feed').innerHTML=b;
  Object.values(panes).forEach(p=>{p.unsub?.();p.convo=null;p.msgs.innerHTML=b;p.status.className='status';p.status.innerHTML=''});$('#roomList').innerHTML='';$('#chatSide').innerHTML='';$('#frSide').innerHTML='';$('#reqBadge').style.display='none'}

/* ---------- profile card ---------- */
const GRADS=['linear-gradient(135deg,#3b5bff,#9b6bff,#ff9a5c)','linear-gradient(135deg,#0f2027,#2c5364)','linear-gradient(135deg,#ff5c7a,#ffc59e)','linear-gradient(135deg,#11998e,#38ef7d)','linear-gradient(135deg,#1a0608,#5a1020)','linear-gradient(135deg,#232526,#414345)','linear-gradient(135deg,#9fb4ff,#9ff0e6)','linear-gradient(135deg,#f7971e,#ffd200)'];
function banStyle(u){const mid=mediaId(u.banner);if(mid){const url=mediaNow(mid);if(!url)loadMedia(mid);return`background:${GRADS[+u.bannerG||0]||GRADS[0]};${url?`background-image:url('${url}');`:''}background-size:cover;background-position:center" data-media="${mid}`}const img=safeImg(u.banner);if(img)return`background-image:url('${img}')`;return`background:${GRADS[+u.bannerG||0]||GRADS[0]}`}
function cardBg(u){const c=okColor(u.color),c1=okColor(u.nameC1||u.color),c2=okColor(u.nameC2,'#9ff0e6');
  return u.cardStyle==='tint'?`background:linear-gradient(180deg,${c}33,${c}11 60%,rgba(20,20,28,.85))`:u.cardStyle==='gradient'?`background:linear-gradient(160deg,${c1}55,${c2}33 55%,rgba(20,20,28,.9))`:u.cardStyle==='dark'?'background:#0b0c12'
    :!tierOf(u)?'':u.cardStyle==='aurora'?`background:linear-gradient(200deg,${c1}40,transparent 45%),linear-gradient(20deg,${c2}40,transparent 50%),#0d0f1a`
    :u.cardStyle==='holo'?'background:linear-gradient(125deg,rgba(255,154,213,.22),rgba(168,192,255,.22),rgba(138,243,255,.2),rgba(199,255,158,.18),rgba(255,229,143,.2)),#12131c'
    :u.cardStyle==='midnight'?'background:radial-gradient(120% 80% at 50% 0,#1b1f4a,#07080f 70%)':''}
function card(u,{uid,buttons='',compact=false,preview=false}={}){const links=String(u.links||'').split('\n').map(l=>l.trim()).filter(l=>/^https?:\/\/\S+$/i.test(l)).slice(0,3);const act=uid?actText(uid):'',st=uid?statusText(uid):'';
  const tier=tierOf(u),border=tier&&/^[a-z]{2,12}$/.test(u.cardBorder||'')&&u.cardBorder!=='none'?' cb-'+u.cardBorder:'';
  return`<div class="pcard${compact?' compact':''}${tier?' tier-'+tier:''}${border}" style="--pc:${okColor(u.color)};${cardBg(u)}">${L.cos?.fxLayer(u.fx)||''}<div class="ban" style="${banStyle(u)}">${L.cos?.buddyCanvas(u.buddy,'card',(uid||u.uid||'me')+':card:'+(compact?'c':'f')+(preview?':p':''),preview?undefined:u)||''}</div><div class="body">${pic(u,compact?80:92,uid)}
   <h3>${nameHTML(u)}${u.pronouns?`<span class="pron">${esc(u.pronouns)}</span>`:''}</h3>
   ${u.status||u.emoji?`<div class="stat">${esc(u.emoji||'')} ${esc(u.status||'')}</div>`:''}
   ${st?`<div class="st-line st-${status(uid)}"><i></i>${esc(st)}</div>`:''}
   ${act?`<div class="act" style="font-size:13px;margin-top:4px">${act}</div>`:''}
   <div class="sect"><b>About me</b><p>${u.bio?fmt(u.bio):'<span class="muted">Nothing here yet.</span>'}</p></div>
   ${u.favGame?`<div class="sect"><b>Favourite game</b><p>🎮 ${esc(u.favGame)}</p></div>`:''}
   ${links.length?`<div class="sect"><b>Links</b>${links.map(l=>`<a href="${esc(l)}" target="_blank" rel="noopener">${esc(l.replace(/^https?:\/\//,''))}</a>`).join('')}</div>`:''}
   ${buttons?`<div class="row" style="margin-top:16px;flex-wrap:wrap">${buttons}</div>`:''}</div></div>`}
function relButtons(uid,{close=false}={}){const fr=friendships.find(f=>f.users.includes(uid));const mb=uid!==me?.uid&&me?`<button data-mute="${uid}">${muted().includes(uid)?'🙉 Show their posts':'🙈 Hide their posts'}</button>`:'';
  return mb+(uid===me?.uid?`<button class="btn-acc" data-goprof>Edit profile</button>`:fr?.status==='accepted'?`<button class="btn-acc" data-dm="${uid}">Message</button><button data-unfriend="${fr.id}">Remove</button>`:fr?`<button disabled>Request ${fr.from===me.uid?'sent':'received'}</button>`:`<button class="btn-acc" data-add="${uid}">Add friend</button>`)+(close?'<button data-close>Close</button>':'')}

/* side panels (Discord-style profile on the right) */
const sideUid={chat:null,fr:null};
async function showSide(where,uid){sideUid[where]=uid;const el=$(where==='chat'?'#chatSide':'#frSide');if(!uid){el.innerHTML='';el._uid=null;return}
  const u=await getUser(uid,uid!==me?.uid);if(sideUid[where]!==uid)return;const h=card(u,{uid,buttons:relButtons(uid),compact:true});if(el._uid===uid)morph(el,h);else el.innerHTML=h;el._uid=uid;bindPeople(el)}
const refreshSides=()=>{['chat','fr'].forEach(w=>{if(sideUid[w])showSide(w,sideUid[w])})};
async function showUser(uid){const onChat=$('#v-chat').classList.contains('on'),onFr=$('#v-friends').classList.contains('on');
  if(onChat&&innerWidth>1100)return showSide('chat',uid);if(onFr&&innerWidth>1100)return showSide('fr',uid);
  const u=await getUser(uid,uid!==me?.uid);$('#userCard').innerHTML=card(u,{uid,buttons:relButtons(uid,{close:true})});bindPeople($('#userCard'));openModal('userModal')}

/* ---------- my profile tab ---------- */
let draft={};
const PF={buddyX:'#pBuddyX',cardBorder:'#pCardBorder',name:'#pName',pronouns:'#pPron',emoji:'#pEmoji',status:'#pStatus',bio:'#pBio',favGame:'#pFav',links:'#pLinks',color:'#pColor',nameStyle:'#pNameStyle',nameC1:'#pN1',nameC2:'#pN2',nameFont:'#pNameFont',badges:'#pBadges',ring:'#pRing',cardStyle:'#pCardStyle'};
function formToDraft(){for(const[k,s]of Object.entries(PF))draft[k]=$(s).value;draft.name=draft.name.trim()}
function preview(){formToDraft();draft.buddyX=$('#pBuddyWander').checked?-1:Math.round(+$('#pBuddyX').value);$('#pBuddyX').disabled=draft.buddyX<0;
  const bb=$('#pBuddyBox');bb.style.display=draft.buddy&&plan.lite()?'':'none';
  if(draft.buddy){const bar=$('#pBuddyBar');const html=`<div class="person${L.cos?.plateCls(draft.plate)||''}">${L.cos?.buddyCanvas(draft.buddy,'bar','me:prof-bar',{...draft,tier:myProfile?.tier,tierUntil:myProfile?.tierUntil})||''}${pic(draft,40)}<div class="info"><b>${nameHTML(draft,{badges:false})}</b><span>Online</span></div></div>`;morph(bar,html)}
  $('#pPreview').innerHTML=card(draft,{uid:me?.uid});$$('#pSwatches button').forEach((b,i)=>b.style.outline=!safeImg(draft.banner)&&!mediaId(draft.banner)&&(+draft.bannerG||0)===i?'2px solid #fff':'none')}
// premium options are visible to everyone (so people know they exist) but only pickable with Lite
function lockPrem(){const on=plan.lite();$$('#v-profile option[data-lite]').forEach(o=>{o.disabled=!on;o.textContent=o.textContent.replace(/ 🔒$/,'')+(on?'':' 🔒')});$('#pPremNote').style.display=on?'none':''}
/* stickers (beta, Lite): pick up to 3 of your stickers, drag them anywhere on your profile bar, size and tilt them */
let stkSel=0;
function stickerEditor(){const box=$('#pStkBox');if(!box)return;const own=(L.shopStickers?.()||[]).filter(i=>(myProfile?.owned||[]).includes(i.id)||i.uid===me?.uid);
  box.style.display=plan.lite()?'':'none';if(!plan.lite())return;const st=draft.stickers=Array.isArray(draft.stickers)?draft.stickers.slice(0,3):[];if(stkSel>=st.length)stkSel=Math.max(0,st.length-1);
  const bar=`<div class="person stk-edit${L.cos?.plateCls(draft.plate)||''}" id="pStkBar">${L.cos?.stickerLayer(st)||''}${pic(draft,40)}<div class="info"><b>${nameHTML(draft,{badges:false})}</b><span>Online</span></div></div>`;
  const cur=st[stkSel];
  $('#pStkArea').innerHTML=(own.length?`<div class="stk-pick">${own.map(i=>`<button type="button" class="stk-chip" data-addstk="${i.id}" title="Add ${esc(i.name)}"><i class="stk-thumb cstk-${i.id}"></i><span>${esc(i.name)}</span></button>`).join('')}</div>`:'<p class="muted" style="font-size:12px;margin:4px 0">You don’t have any stickers yet. Find them in <b>Shop → Stickers</b>.</p>')
    +bar+(cur?`<div class="stk-ctl"><span class="muted" style="font-size:12px">Sticker ${stkSel+1} of ${st.length} · drag it on the bar</span><label>Size <input type="range" id="pStkS" min="50" max="200" value="${cur.s}"></label><label>Tilt <input type="range" id="pStkR" min="-45" max="45" value="${cur.r}"></label><button type="button" id="pStkDel">Remove</button></div>`:st.length?'':'<p class="muted" style="font-size:12px;margin:6px 0 0">Tap a sticker above to put it on your bar (up to 3).</p>');
  $$('#pStkArea [data-addstk]').forEach(b=>b.onclick=()=>{if(st.length>=3)return toast('Up to 3 stickers');st.push({id:b.dataset.addstk,x:[70,85,55][st.length]||70,y:50,s:100,r:0});stkSel=st.length-1;stickerEditor()});
  if(cur){$('#pStkS').oninput=e=>{cur.s=+e.target.value;paintStk()};$('#pStkR').oninput=e=>{cur.r=+e.target.value;paintStk()};$('#pStkDel').onclick=()=>{st.splice(stkSel,1);stkSel=0;stickerEditor()}}
  const barEl=$('#pStkBar');barEl.querySelectorAll('.stk').forEach(el=>{el.onpointerdown=e=>{e.preventDefault();stkSel=+el.dataset.si;const r=barEl.getBoundingClientRect(),s=st[stkSel];
      barEl.querySelectorAll('.stk').forEach(x=>x.classList.toggle('sel',x===el));
      const mv=ev=>{s.x=Math.max(0,Math.min(100,Math.round((ev.clientX-r.left)/r.width*100)));s.y=Math.max(0,Math.min(100,Math.round((ev.clientY-r.top)/r.height*100)));el.style.left=s.x+'%';el.style.top=s.y+'%'};
      const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);stickerEditor()};addEventListener('pointermove',mv);addEventListener('pointerup',up)}});
  barEl.querySelector(`.stk[data-si="${stkSel}"]`)?.classList.add('sel')}
function paintStk(){const el=$(`#pStkBar .stk[data-si="${stkSel}"]`),s=draft.stickers?.[stkSel];if(el&&s){el.style.setProperty('--s',s.s/100);el.style.setProperty('--r',s.r+'deg')}}
L.onPlan=(prev=>p=>{prev?.(p);if($('#v-profile')?.classList.contains('on'))stickerEditor()})(L.onPlan);
L.onStickers=()=>{if($('#v-profile')?.classList.contains('on')&&$('#pStkBox'))stickerEditor()};
// "Place on my bar" from the Shop: open your profile with the sticker added
L.placeSticker=id=>{if(!plan.lite())return L.shopGo?.('premium');L.go('profile');setTimeout(()=>{draft.stickers=draft.stickers||[];if(!draft.stickers.some(s=>s.id===id)){if(draft.stickers.length>=3){toast('You can have up to 3 stickers. Remove one first.');}else{draft.stickers.push({id,x:[70,85,55][draft.stickers.length]||70,y:50,s:100,r:0});stkSel=draft.stickers.length-1}}
  stickerEditor();$('#pStkBox')?.scrollIntoView({behavior:'smooth',block:'center'});toast('Drag your sticker where you want it, then press Save profile')},120)};
function openProfile(){const p=myProfile||{};draft={...p};
  const def={nameStyle:'solid',nameFont:'sans',ring:'none',cardStyle:'glass',cardBorder:'none',buddyX:-1};lockPrem();
  $('#pBuddyWander').checked=!(p.buddyX>=0);
  for(const[k,s]of Object.entries(PF))$(s).value=k==='buddyX'?(p.buddyX>=0?p.buddyX:50):k==='color'?okColor(p.color):k==='nameC1'?okColor(p.nameC1||p.color):k==='nameC2'?okColor(p.nameC2,'#9ff0e6'):(p[k]??def[k]??'');
  $('#pShare').checked=cfg.share;$('#pShareGame').checked=cfg.shareGame;$('#pShareYt').checked=cfg.shareYt;$('#pShareWeb').checked=cfg.shareWeb;$('#pSeeOthers').checked=cfg.seeOthers;
  $('#pEmail').textContent='Signed in as '+(me?.email||'');draft.stickers=(p.stickers||[]).map(s=>({...s}));stkSel=0;stickerEditor();preview()}
$('#pSwatches').innerHTML=GRADS.map((g,i)=>`<button type="button" data-g="${i}" style="background:${g}" title="Banner colour"></button>`).join('');
$$('#pSwatches button').forEach(b=>b.onclick=()=>{draft.banner='';draft.bannerG=+b.dataset.g;preview()});
Object.values(PF).forEach(s=>{$(s).addEventListener('input',preview);$(s).addEventListener('change',preview)});$('#pBuddyWander').addEventListener('change',preview);
$('#pPicBtn').onclick=()=>$('#pPicIn').click();
// Lite keeps GIFs animated and photos sharp (up to 10 MB, 15 MB with Upgrade); free pictures are shrunk to fit
async function bigPick(f,kind){const mb=plan.uploadMB();if(f.size>mb*1048576){toast(`That file is ${(f.size/1048576).toFixed(1)} MB. Your limit is ${mb} MB.`);return''}
  if(f.type==='image/gif')return readURL(f);const max=kind==='avatar'?512:1800;let d=await L.shrinkImage(f,max,.9);return d}
$('#pPicIn').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  if(plan.lite()){const d=await bigPick(f,'avatar');if(d){draft.avatar=d;preview()}return}
  if(f.type==='image/gif')toast('Animated pictures need Lumen Lite, so this one is a still');draft.avatar=await L.shrinkImage(f,200,.85);preview()};
$('#pPicDel').onclick=()=>{draft.avatar='';preview()};
$('#pBanBtn').onclick=()=>$('#pBanIn').click();
$('#pBanIn').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(plan.lite()){const d=await bigPick(f,'banner');if(d){draft.banner=d;preview()}return}let d=await L.shrinkImage(f,900,.75);if(d.length>300000)d=await L.shrinkImage(f,640,.6);draft.banner=d;preview()};
$('#pBanDel').onclick=()=>{draft.banner='';preview()};
const pick=(v,list,d)=>list.includes(v)?v:d;
$('#pSave').onclick=async()=>{if(!me)return openModal('authModal');formToDraft();const name=draft.name.slice(0,24);if(name.length<2)return toast('Name needs 2+ characters');
  const d={name,nameLower:name.toLowerCase(),bio:String(draft.bio||'').slice(0,300),avatar:draft.avatar||'',banner:draft.banner||'',bannerG:+draft.bannerG||0,color:okColor(draft.color),
    pronouns:draft.pronouns.slice(0,20),emoji:draft.emoji.slice(0,4),status:draft.status.slice(0,80),favGame:draft.favGame.slice(0,40),links:String(draft.links||'').slice(0,400),
    nameStyle:pick(draft.nameStyle,['solid','gradient','animated','glow'],'solid'),nameC1:okColor(draft.nameC1),nameC2:okColor(draft.nameC2,'#9ff0e6'),nameFont:pick(draft.nameFont,['sans','serif','mono','round','display',...(plan.lite()?['script','pixel','gothic','wide']:[])],'sans'),stickers:plan.lite()?(draft.stickers||[]).slice(0,3).map(s=>({id:String(s.id),x:Math.round(s.x),y:Math.round(s.y),s:Math.round(s.s),r:Math.round(s.r)})):[],buddyX:$('#pBuddyWander').checked?-1:Math.max(0,Math.min(100,Math.round(+$('#pBuddyX').value||0))),cardBorder:plan.lite()?pick(draft.cardBorder,['none','gold','neon','rainbow','glow','ice'],'none'):'',
    badges:graphemes(draft.badges).filter(x=>x.trim()).slice(0,5).join(''),ring:pick(draft.ring,['none','solid','gradient','rainbow'],'none'),cardStyle:pick(draft.cardStyle,['glass','tint','gradient','dark',...(plan.lite()?['aurora','holo','midnight']:[])],'glass')};
  cfg.share=$('#pShare').checked;cfg.shareGame=$('#pShareGame').checked;cfg.shareYt=$('#pShareYt').checked;cfg.shareWeb=$('#pShareWeb').checked;cfg.seeOthers=$('#pSeeOthers').checked;save();
  $('#pSave').disabled=true;
  try{// big pictures go into pieces first; the profile then points at them
    if(plan.lite()&&/^data:/.test(d.avatar)&&d.avatar.length>=120000){toast('Uploading your picture…');d.avatar='media:'+await putMedia(d.avatar,'avatar');draft.avatar=d.avatar}
    if(plan.lite()&&/^data:/.test(d.banner)&&d.banner.length>=880000){toast('Uploading your banner…');d.banner='media:'+await putMedia(d.banner,'banner');draft.banner=d.banner}
    if(/^data:/.test(d.avatar)&&d.avatar.length>=120000)d.avatar=await L.shrinkImage(await (await fetch(d.avatar)).blob(),200,.85)}catch(e){$('#pSave').disabled=false;return toast('Upload failed: '+(e.code==='permission-denied'?'that needs Lumen Lite':e.message))}
  try{await F.updateDoc(D('users',me.uid),d);pushPresence();renderFriends();toast('Profile saved ✨')}catch(e){toast('Could not save: '+e.message)}$('#pSave').disabled=false};
$('#pOut').onclick=async()=>{try{await F.setDoc(D('presence',me.uid),{seen:F.serverTimestamp(),state:'offline',act:null})}catch{}await F.signOut(auth);L.go('hub')};
$('#pResetPw').onclick=async()=>{try{await F.sendPasswordResetEmail(auth,me.email);toast('Reset email sent to '+me.email)}catch(e){toast(nice(e))}};
const prevOnView=L.onView;L.onView=v=>{prevOnView?.(v);if(v==='profile'){$('#profSignedOut').style.display=me?'none':'';$('#profWrap').style.display=me?'':'none';if(me)openProfile()}};

/* ---------- presence: online / idle / offline + activity ---------- */
function myAct(){const a=L.getActivity();if(!cfg.share||!a)return null;if(a.kind==='game'&&!cfg.shareGame)return null;if(a.kind==='youtube'&&!cfg.shareYt)return null;if(a.kind==='web'&&!cfg.shareWeb)return null;const lb=a.kind==='game'&&a.lobby&&/^[A-Z0-9]{3,12}$/.test(a.lobby.code)?{code:a.lobby.code,n:+a.lobby.n||1,max:+a.lobby.max||5}:null;return{kind:a.kind,label:String(a.label).slice(0,120),...(lb?{lobby:lb}:{})}}
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
let rerender=null;const soon=()=>{clearTimeout(rerender);rerender=setTimeout(()=>{renderFriends();renderRooms();refreshSides();refreshDmHead();L.onLobbies?.()},120)};
function listenFriends(){unsubs.push(F.onSnapshot(F.query(C('friendships'),F.where('users','array-contains',me.uid)),s=>{
  friendships=s.docs.map(d=>({id:d.id,...d.data()}));const fr=friendIds();setTimeout(prefetchChats,1500);
  fr.forEach(uid=>{if(!presUnsub.has(uid))presUnsub.set(uid,F.onSnapshot(D('presence',uid),p=>{presence.set(uid,p.data()||{});soon()},()=>{}))});
  [...presUnsub.keys()].filter(k=>!fr.includes(k)).forEach(k=>{presUnsub.get(k)();presUnsub.delete(k);presence.delete(k)});soon()}));
  unsubs.push(()=>{presUnsub.forEach(u=>u());presUnsub.clear()});
  const t=setInterval(soon,30000);unsubs.push(()=>clearInterval(t))}
const rank=uid=>({online:0,idle:1,offline:2}[status(uid)]??3);
async function personRow(uid,{buttons='',sub='',click=''}={}){const u=await getUser(uid);
  return`<div data-k="${uid}" class="person${L.cos?.plateCls(u.plate)||''}${click?' clickable':''}${panes.dm.convo?.id===uid&&click==='dm'?' on':''}" ${click==='dm'?`data-open="${uid}"`:''}>${L.cos?.stickerLayer(u.stickers,u)||''}${click==='dm'?L.cos?.buddyCanvas(u.buddy,'bar',uid+':bar:dm',u)||'':''}${pic(u,40,uid)}<div class="info"><b data-user="${uid}">${nameHTML(u)}</b><span class="${sub.includes('<b>')?'act':''}">${sub}</span></div>${buttons}</div>`}
async function renderFriends(){if(!me)return;
  const acc=friendIds().sort((a,b)=>rank(a)-rank(b)),inc=friendships.filter(f=>f.status==='pending'&&f.from!==me.uid),out=friendships.filter(f=>f.status==='pending'&&f.from===me.uid);
  const other=f=>f.users.find(x=>x!==me.uid);const online=acc.filter(u=>status(u)!=='offline').length;
  const rows=await Promise.all(acc.map(uid=>personRow(uid,{sub:actText(uid)||esc(statusText(uid)),click:'dm'})));
  const adminRow=inbox.includes(ADMIN_UID)&&!acc.includes(ADMIN_UID)?(await personRow(ADMIN_UID,{sub:'<b>Lumen admin</b> · messaged you',click:'dm'})).replace('class="person','class="person admin-row'):'';
  morph($('#friendList'),adminRow+(acc.length?`<div class="fr-count"><span class="st-dot st-online"></span>${online} online · ${acc.length} friends</div>`:'')+(rows.join('')||'<p class="muted">No friends yet. Search for people above.</p>'));
  morph($('#reqList'),(await Promise.all([...inc.map(f=>personRow(other(f),{buttons:`<button class="ib" data-accept="${f.id}" title="Accept">✓</button><button class="ib" data-unfriend="${f.id}" title="Decline">✕</button>`,sub:'Wants to be friends'})),...out.map(f=>personRow(other(f),{buttons:`<button class="ib" data-unfriend="${f.id}" title="Cancel">✕</button>`,sub:'Request sent'}))])).join('')||'<p class="muted" style="font-size:13px">No requests.</p>');
  $('#reqBadge').style.display=inc.length?'':'none';$('#reqBadge').textContent=inc.length;bindPeople($('#v-friends'))}
function bindPeople(root){
  root.querySelectorAll('[data-open]').forEach(r=>r.onclick=e=>{if(e.target.closest('button'))return;openDm(r.dataset.open)});
  root.querySelectorAll('[data-user]').forEach(b=>b.onclick=e=>{if(b.closest('[data-open]'))return;e.stopPropagation();showUser(b.dataset.user)});
  root.querySelectorAll('[data-dm]').forEach(b=>b.onclick=()=>{closeModal('userModal');openDm(b.dataset.dm)});
  root.querySelectorAll('[data-mute]').forEach(b=>b.onclick=async()=>{const on=!muted().includes(b.dataset.mute);await setMuted(b.dataset.mute,on);b.textContent=on?'🙉 Show their posts':'🙈 Hide their posts'});
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
const rooms=()=>serverChannels||cfg.rooms.split(',').map(s=>s.trim().toLowerCase().replace(/[^\w-]/g,'')).filter(Boolean);
function mkPane(sel){const el=$(sel);const ty=document.createElement('div');ty.className='typing';el.querySelector('form').before(ty);return{el,ty,msgs:el.querySelector('.msgs'),pt:el.querySelector('.pt'),status:el.querySelector('.status'),form:el.querySelector('form'),input:el.querySelector('form input'),convo:null,unsub:null}}
const panes={room:mkPane('#roomPane'),dm:mkPane('#dmPane')};
async function renderRooms(){if(!me)return;const on=friendIds().filter(u=>status(u)!=='offline').sort((a,b)=>rank(a)-rank(b));
  const fr=await Promise.all(on.map(async uid=>{const u=await getUser(uid);return`<button data-k="${uid}" class="room${L.cos?.plateCls(u.plate)||''}" data-user="${uid}">${L.cos?.stickerLayer(u.stickers,u)||''}${pic(u,26,uid)}<span>${nameHTML(u,{badges:false})}</span></button>`}));
  morph($('#roomList'),rooms().map(r=>`<button class="room ${panes.room.convo?.id===r?'on':''}" data-room="${r}"><span class="hash">#</span>${r}</button>`).join('')+
    `<div class="dc-title" style="margin-top:16px">Friends online — ${on.length}</div>`+(fr.join('')||'<p class="muted" style="font-size:12px;padding:0 10px">Nobody online right now.</p>'));
  $$('#roomList [data-room]').forEach(b=>b.onclick=()=>openConvo(panes.room,{type:'room',id:b.dataset.room}));
  $$('#roomList [data-user]').forEach(b=>b.onclick=()=>showUser(b.dataset.user))}
L.onRooms=()=>renderRooms();
const convoPath=c=>c.type==='room'?['rooms',c.id,'messages']:['dms',pairId(me.uid,c.id),'messages'];
async function refreshDmHead(){const p=panes.dm;if(p.convo?.type!=='dm')return;const uid=p.convo.id;const u=await getUser(uid);
  morph(p.pt,`${pic(u,28,uid)}<span>${nameHTML(u)}</span>`);const act=actText(uid);p.status.className='status st-'+status(uid);p.status.innerHTML=`<i></i>${act||esc(statusText(uid))}`}
function openDm(uid){L.go('friends');openConvo(panes.dm,{type:'dm',id:uid});showSide('fr',uid)}
const msgCache=new Map(),cKey=c=>convoPath(c).join('/');
async function openConvo(p,c){if(!me)return;p.convo=c;p.unsub?.();p.unsub=null;const key=cKey(c);
  if(c.type==='room'){p.pt.innerHTML=`<span class="hash">#</span>${esc(c.id)}`;p.status.className='status';p.status.innerHTML='<i></i>Connecting…';renderRooms();p.input.placeholder=`Message #${c.id}`}
  else{refreshDmHead();renderFriends();p.input.placeholder='Message';getUser(c.id).then(u=>{if(p.convo===c)p.input.placeholder='Message '+(u.name||'')})}
  const cached=msgCache.get(key);
  if(cached)drawMsgs(p,c,cached,true);else{p.msgs.dataset.c='';p.msgs.dataset.n=0;p.msgs.innerHTML='<div class="sysmsg">Loading…</div>'}
  watchTyping(p,c);
  p.unsub=F.onSnapshot(F.query(C(...convoPath(c)),F.orderBy('at','desc'),F.limit(80)),s=>{
    const docs=s.docs.map(d=>({id:d.id,...d.data()})).reverse();msgCache.set(key,docs);if(p.convo!==c)return;
    if(c.type==='room'){p.status.className='status ok';p.status.innerHTML='<i></i>Live'}
    drawMsgs(p,c,docs,false,s.metadata.hasPendingWrites)},
    e=>{if(p.convo!==c)return;p.status.className='status';p.status.innerHTML='<i></i>No access';p.msgs.innerHTML=`<div class="sysmsg">${esc(e.code==='permission-denied'?'You can only message friends.':e.message)}</div>`});
  unsubs.push(()=>p.unsub?.())}
async function drawMsgs(p,c,docs,fromCache,pending){const us=await Promise.all(docs.map(m=>getUser(m.uid)));if(p.convo!==c)return;
    const box=p.msgs,fromBottom=box.scrollHeight-box.scrollTop-box.clientHeight,prevCount=+box.dataset.n||0;
    p.docs=docs;
    morph(box,docs.map((m,i)=>{const u=us[i],g=safeImg(m.gif),prev=docs[i-1],mid=/^[A-Za-z0-9]{16,30}$/.test(m.media||'')?m.media:'';if(mid&&!mediaNow(mid))loadMedia(mid);
      const grouped=prev&&prev.uid===m.uid&&ms(m.at)-ms(prev.at)<5*60e3&&!m.reply;
      const rx=Object.entries(m.react||{}).reduce((a,[who,e])=>{(a[e]||=[]).push(who);return a},{});
      const reply=m.reply?`<button class="dreply" data-jump="${esc(m.reply.id)}"><span class="ri">↩</span><span data-rname="${esc(m.reply.uid)}"></span><span class="rt">${esc(m.reply.text||'Picture')}</span></button>`:'';
      const body=`${reply}${m.text?`<div class="dtext">${fmt(m.text)}${m.edited?' <small class="edited">(edited)</small>':''}</div>`:''}${g?`<img class="gif" src="${g}" alt="GIF">`:''}${mid?`<img class="gif chat-pic" data-media="${mid}"${mediaNow(mid)?` src="${mediaNow(mid)}"`:''} alt="Picture">`:''}`+
        (Object.keys(rx).length?`<div class="dreacts">${Object.entries(rx).map(([e,w])=>`<button data-react="${esc(e)}" class="${w.includes(me.uid)?'mine':''}">${esc(e)} <b>${w.length}</b></button>`).join('')}</div>`:'');
      const tools=m.id?`<div class="dtools"><button data-rx title="React">😊</button><button data-reply title="Reply">↩</button>${m.uid===me.uid&&m.text?'<button data-edit title="Edit">✏️</button>':''}${m.text?'<button data-copy title="Copy text">📋</button>':''}${m.uid===me.uid||(c.type==='room'&&isAdmin())?'<button data-del title="Delete">🗑</button>':''}</div>`:'';
      const at=` data-mid="${m.id||''}" data-k="${m.id||i}"`;const mineC=m.uid===me.uid?' me-msg':'';
      return grouped?`<div class="dmsg grouped${mineC}"${at}>${tools}<span class="dtime">${new Date(ms(m.at)).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span><div class="dbody">${body}</div></div>`
        :`<div class="dmsg${mineC}"${at}>${tools}<div class="dav" data-user="${m.uid}">${pic(u,40,friendIds().includes(m.uid)||m.uid===me.uid?m.uid:null)}</div><div class="dbody"><div class="dhead"><b data-user="${m.uid}">${nameHTML(u)}</b><span class="muted">${when(m.at)}</span></div>${body}</div></div>`}).join('')
      ||`<div class="sysmsg">${c.type==='room'?'No messages yet. Say hi 👋':'This is the start of your private chat. Only you two can read it.'}</div>`);
    box.querySelectorAll('[data-user]').forEach(b=>b.onclick=()=>showUser(b.dataset.user));
    box.querySelectorAll('[data-rname]').forEach(el=>getUser(el.dataset.rname).then(u=>el.textContent=u.name||'Someone'));
    bindMsgTools(p,c);
    // new chat or my own message: jump to the end. A new message from someone: glide down to it,
    // unless I've scrolled far up to read older messages, then show a "new message" button instead.
    const switched=box.dataset.c!==JSON.stringify(c),grew=docs.length>prevCount&&!switched;box.dataset.c=JSON.stringify(c);box.dataset.n=docs.length;
    if(switched||pending)box.scrollTop=box.scrollHeight;
    else if(grew){if(fromBottom<600){box.scrollTop=box.scrollHeight-box.clientHeight-fromBottom;box.scrollTo({top:box.scrollHeight,behavior:'smooth'})}else showJump(p)}}
// warm the cache for the chats people are most likely to open, so they appear instantly
let prefetched=false;
async function prefetchChats(){if(prefetched||!me)return;prefetched=true;const ids=friendIds().sort((a,b)=>rank(a)-rank(b)).slice(0,8);if(inbox.includes(ADMIN_UID)&&me.uid!==ADMIN_UID)ids.unshift(ADMIN_UID);
  for(const uid of ids){const c={type:'dm',id:uid},key=cKey(c);if(msgCache.has(key))continue;
    try{const s=await F.getDocs(F.query(C(...convoPath(c)),F.orderBy('at','desc'),F.limit(40)));if(!msgCache.has(key))msgCache.set(key,s.docs.map(d=>({id:d.id,...d.data()})).reverse());s.docs.forEach(d=>getUser(d.data().uid))}catch{}}}

/* ---------- "… is typing" ---------- */
const typingKey=c=>c.type==='room'?'r_'+c.id:'d_'+pairId(me.uid,c.id);
let lastTyping=0,typingTo=null;
function sendTyping(p,on){if(!me||!p.convo||banned)return;const k=typingKey(p.convo);
  if(on){if(Date.now()-lastTyping<3000&&typingTo===k)return;lastTyping=Date.now();typingTo=k;F.setDoc(D('typing',k),{[me.uid]:F.serverTimestamp()},{merge:true}).catch(()=>{})}
  else if(typingTo){const t=typingTo;typingTo=null;lastTyping=0;F.setDoc(D('typing',t),{[me.uid]:null},{merge:true}).catch(()=>{})}}
function watchTyping(p,c){p.tyUnsub?.();clearInterval(p.tyTimer);p.ty.innerHTML='';const seen=new Map();
  const show=async()=>{const now=Date.now(),who=[...seen].filter(([u,t])=>now-t<6000).map(([u])=>u);if(p.convo!==c)return;
    if(!who.length){p.ty.innerHTML='';return}const names=(await Promise.all(who.map(getUser))).map(u=>esc(u.name||'Someone'));
    p.ty.innerHTML=`<span class="tdots"><i></i><i></i><i></i></span><b>${names.length>2?`${names.length} people are`:names.join(' and ')+(names.length>1?' are':' is')}</b> typing…`};
  const stamp=new Map();
  p.tyUnsub=F.onSnapshot(D('typing',typingKey(c)),s=>{const d=s.data()||{};for(const u of [...seen.keys()])if(!(u in d)){seen.delete(u);stamp.delete(u)}
    for(const [u,v] of Object.entries(d)){if(u===me.uid)continue;const t=v?.toMillis?.();if(!t){seen.delete(u);stamp.delete(u);continue}if(stamp.get(u)!==t){stamp.set(u,t);seen.set(u,Date.now())}}
    show()},()=>{});
  p.tyTimer=setInterval(show,1000);unsubs.push(()=>{p.tyUnsub?.();clearInterval(p.tyTimer)})}
function showJump(p){let j=p.el.querySelector('.jump-new');if(!j){j=document.createElement('button');j.className='jump-new';j.textContent='New message ↓';p.el.appendChild(j);
    j.onclick=()=>{p.msgs.scrollTo({top:p.msgs.scrollHeight,behavior:'smooth'});j.remove()};p.msgs.addEventListener('scroll',function f(){if(p.msgs.scrollHeight-p.msgs.scrollTop-p.msgs.clientHeight<80){j.remove();p.msgs.removeEventListener('scroll',f)}})}}
async function sendMsg(p,text,gif,media){if(!me){openModal('authModal');return}if(!p.convo)return toast('Pick a chat first');text=(text||'').trim().slice(0,1000);if(!text&&!gif&&!media)return;
  if(p.editing){const id=p.editing;setEdit(p,null);if(!text)return;try{await F.updateDoc(D(...convoPath(p.convo),id),{text,edited:F.serverTimestamp()})}catch(e){toast('Couldn’t edit: '+e.message)}return}
  const r=p.replyTo;setReply(p,null);
  try{await F.addDoc(C(...convoPath(p.convo)),{uid:me.uid,text,gif:gif||'',...(media?{media}:{}),...(r?{reply:{id:r.id,uid:r.uid,text:String(r.text||'').slice(0,140)}}:{}),at:F.serverTimestamp()})}catch(e){toast('Not sent: '+e.message)}}
/* reply / edit bar above the message box */
function bar(p){let b=p.el.querySelector('.reply-bar');if(!b){b=document.createElement('div');b.className='reply-bar';p.form.before(b)}return b}
function setReply(p,m){p.replyTo=m;if(m)p.editing=null;const b=bar(p);if(!m){if(!p.editing)b.innerHTML='';return}
  b.innerHTML=`<span>↩ Replying to <b data-rn></b>: ${esc(String(m.text||'a picture').slice(0,80))}</span><button type="button" class="ib" title="Cancel">✕</button>`;getUser(m.uid).then(u=>{const x=b.querySelector('[data-rn]');if(x)x.textContent=u.name||'them'});
  b.querySelector('button').onclick=()=>setReply(p,null);p.input.focus()}
function setEdit(p,m){p.editing=m?.id||null;if(m)p.replyTo=null;const b=bar(p);if(!m){b.innerHTML='';p.input.value='';return}
  b.innerHTML=`<span>✏️ Editing your message · Enter to save</span><button type="button" class="ib" title="Cancel">✕</button>`;b.querySelector('button').onclick=()=>setEdit(p,null);p.input.value=m.text||'';p.input.focus()}
const QUICK=['👍','❤️','😂','😮','😢','🔥'];
function bindMsgTools(p,c){const box=p.msgs,find=el=>(p.docs||[]).find(m=>m.id===el.closest('[data-mid]')?.dataset.mid);
  box.querySelectorAll('[data-reply]').forEach(b=>b.onclick=()=>{const m=find(b);if(m)setReply(p,m)});
  box.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{const m=find(b);if(m)setEdit(p,m)});
  box.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{const m=find(b);try{await navigator.clipboard.writeText(m?.text||'');toast('Copied')}catch{}});
  box.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{const m=find(b);if(!m||!confirm('Delete this message for everyone?'))return;try{await F.deleteDoc(D(...convoPath(c),m.id));toast('Message deleted')}catch(e){toast('Couldn’t delete: '+e.message)}});
  const react=async(m,e)=>{const nr={...(m.react||{})};if(nr[me.uid]===e)delete nr[me.uid];else nr[me.uid]=e;try{await F.updateDoc(D(...convoPath(c),m.id),{react:nr})}catch(err){toast('Couldn’t react: '+err.message)}};
  box.querySelectorAll('[data-react]').forEach(b=>b.onclick=()=>{const m=find(b);if(m)react(m,b.dataset.react)});
  box.querySelectorAll('[data-rx]').forEach(b=>b.onclick=e=>{e.stopPropagation();const m=find(b);if(!m)return;box.querySelector('.rx-pop')?.remove();const pop=document.createElement('div');pop.className='rx-pop';
    pop.innerHTML=QUICK.map(q=>`<button>${q}</button>`).join('');b.closest('.dmsg').appendChild(pop);pop.querySelectorAll('button').forEach(x=>x.onclick=()=>{pop.remove();react(m,x.textContent)});
    setTimeout(()=>addEventListener('click',()=>pop.remove(),{once:true}))});
  box.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{const t=box.querySelector(`[data-mid="${CSS.escape(b.dataset.jump)}"]`);if(!t)return toast('That message is too far back');t.scrollIntoView({behavior:'smooth',block:'center'});t.classList.add('flash');setTimeout(()=>t.classList.remove('flash'),1400)});
  box.querySelectorAll('.dmsg').forEach(d=>d.ondblclick=e=>{if(e.target.closest('button,a,img'))return;const m=find(d);if(m)setReply(p,m)})}
/* pictures in chat (Lite: 1 MB, Upgrade: 5 MB) */
async function attachPic(p){if(!plan.lite())return confirm('Sending pictures in chat comes with Lumen Lite. See Lite in the Shop?')&&L.shopGo?.('premium');
  const inp=document.createElement('input');inp.type='file';inp.accept='image/png,image/jpeg,image/webp,image/gif';inp.onchange=async()=>{const f=inp.files[0];if(!f)return;const mb=plan.chatMB();
    let d=f.size<=mb*1048576?await readURL(f):f.type==='image/gif'?'':await L.shrinkImage(f,1600,.82);if(!d)return toast(`That GIF is over your ${mb} MB limit${mb<5?' (Upgrade raises it to 5 MB)':''}`);
    if(d.length>mb*1048576*1.37)d=await L.shrinkImage(f,1100,.75);if(d.length>mb*1048576*1.37)return toast(`That picture is over your ${mb} MB limit`);
    try{toast('Sending picture…');const id=await putMedia(d,'chat');await sendMsg(p,p.input.value,'',id);p.input.value=''}catch(e){toast('Couldn’t send: '+(e.code==='permission-denied'?'over your plan’s limit':e.message))}};inp.click()}
Object.values(panes).forEach(p=>{p.form.onsubmit=e=>{e.preventDefault();const v=p.input.value;p.input.value='';sendTyping(p,false);sendMsg(p,v)};
  p.input.addEventListener('input',()=>sendTyping(p,!!p.input.value.trim()));p.input.addEventListener('blur',()=>sendTyping(p,false));
  p.form.querySelector('[data-gifbtn]').onclick=async()=>{const g=await pickGif();if(g)sendMsg(p,'',g)};
  const pb=document.createElement('button');pb.type='button';pb.className='ib';pb.title='Send a picture (Lumen Lite)';pb.textContent='📷';pb.onclick=()=>attachPic(p);p.form.querySelector('[data-gifbtn]').after(pb);
  p.input.addEventListener('keydown',e=>{if(e.key==='Escape'){setReply(p,null);setEdit(p,null)}
    if(e.key==='ArrowUp'&&!p.input.value){const m=[...(p.docs||[])].reverse().find(x=>x.uid===me?.uid&&x.text&&x.id);if(m){e.preventDefault();setEdit(p,m)}}})});
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
$('#postImg').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;postImage=f.type==='image/gif'&&f.size<640000?await readURL(f):await L.shrinkImage(f,1100,.8);if(f.type==='image/gif'&&f.size>=640000)toast('That GIF is too big to stay animated in a post (max 600 KB), so it’s posted as a still');$('#postThumb').src=postImage;$('#postThumb').style.display='';$('#postImgClear').style.display=''};
$('#postImgClear').onclick=()=>{postImage='';$('#postThumb').style.display='none';$('#postImgClear').style.display='none'};
$('#postBtn').onclick=async()=>{if(!me)return openModal('authModal');const text=$('#postText').value.trim().slice(0,2000);if(!text&&!postImage)return toast('Write something or add an image');
  $('#postBtn').disabled=true;try{const data={uid:me.uid,text,image:postImage,at:F.serverTimestamp()},ref=F.doc(C('posts')),ment=L.hub?.mentionsIn(text)||[];const b=F.writeBatch(db);b.set(ref,data);
    for(const id of ment){b.set(D('projects',id,'mentions',ref.id),{uid:me.uid,at:F.serverTimestamp()});b.update(D('projects',id),{mentions:F.increment(1),lastMention:ref.id})}
    try{await b.commit()}catch(err){if(!ment.length)throw err;await F.setDoc(ref,data)}$('#postText').value='';$('#postImgClear').click();toast('Posted')}catch(e){toast('Could not post: '+e.message)}$('#postBtn').disabled=false};
const postAgo=t=>ago(ms(t));
let feedPosts=new Map();
const VIEW_GLOW=10,COMMENT_GLOW=50; // must match earnOk in firestore.rules
const REASONS={useless:'Useless or low-effort post',spam:'Spam or repeated posts',rude:'Rude or harmful',other:'Something else'};
const muted=()=>myProfile?.mutedPosts||[];
let allFeed=[];
function listenFeed(){unsubs.push(F.onSnapshot(F.query(C('posts'),F.orderBy('at','desc'),F.limit(40)),s=>{allFeed=s.docs.map(d=>({id:d.id,...d.data()}));drawFeed()}));
  unsubs.push(()=>{openCmts.forEach(u=>u());openCmts.clear()})}
async function drawFeed(){const all=allFeed,mu=muted(),posts=all.filter(p=>!mu.includes(p.uid)),hidden=all.length-posts.length;
  feedPosts=new Map(all.map(p=>[p.id,p]));L.onFeed?.();const us=await Promise.all(posts.map(p=>getUser(p.uid)));const fr=friendIds();
  $('#feed').innerHTML=(hidden||mu.length?`<div class="feed-muted">🙈 ${hidden?`${hidden} post${hidden>1?'s':''} hidden from people you muted.`:'You have muted some people.'} <button data-mutelist>Manage</button></div>`:'')+posts.map((p,i)=>{const u=us[i],img=safeImg(p.image),sid=fr.includes(p.uid)||p.uid===me.uid?p.uid:null,likes=p.likes||[],liked=likes.includes(me.uid);
    return`<div class="card post" id="p-${p.id}" data-pid="${p.id}"><div class="post-h"><div data-user="${p.uid}" style="cursor:pointer">${pic(u,42,sid)}</div><div><b data-user="${p.uid}">${nameHTML(u)}</b><span>${postAgo(p.at)}</span></div><div class="post-tools">${isAdmin()&&p.uid!==me.uid?`<button class="ib" data-delpost="${p.id}" title="Remove post (admin)">🗑</button>`:''}${p.uid!==me.uid?`<button class="ib" data-pmore="${p.id}" title="More">⋯</button>`:''}</div></div>
    ${p.flagged?`<div class="post-flag">🚩 Reported and checked by the Lumen team${p.uid===me.uid?`: <b>${esc(p.flagged.reason||'')}</b>. This post earns no Glow.${p.flagged.note?` <i>“${esc(p.flagged.note)}”</i>`:''}`:'. It earns no Glow.'}</div>`:''}
    ${p.text?`<div class="post-t">${fmt(p.text)}</div>`:''}${img?`<img class="post-img" src="${img}" alt="">`:''}
    <div class="post-a"><button class="like${liked?' on':''}" data-like="${p.id}">${liked?'❤️':'🤍'} <span>${likes.length}</span></button><button data-cm="${p.id}">💬 ${p.ecomments?p.ecomments:''} Comments</button><span class="views" title="Views">👁 ${p.views||0}</span>${p.uid===me.uid?`<button data-delpost="${p.id}">Delete</button>`:''}</div><div class="cmts" id="c-${p.id}" style="display:none"></div></div>`}).join('')||'<p class="muted">No posts yet. Be the first!</p>';
  bindPeople($('#feed'));L.hub?.linkMentions($('#feed'));
  $$('#feed [data-cm]').forEach(b=>b.onclick=()=>toggleCmts(b.dataset.cm));
  $$('#feed [data-like]').forEach(b=>b.onclick=()=>toggleLike(b.dataset.like,b));
  $$('#feed [data-delpost]').forEach(b=>b.onclick=()=>{if(confirm('Delete this post?'))F.deleteDoc(D('posts',b.dataset.delpost)).catch(e=>toast(e.message))});
  $$('#feed .post').forEach(el=>viewObs.observe(el));
  $$('#feed [data-pmore]').forEach(b=>b.onclick=e=>{e.stopPropagation();postMenu(b,feedPosts.get(b.dataset.pmore))});
  $('#feed [data-mutelist]')&&($('#feed [data-mutelist]').onclick=muteList);
  [...openCmts.entries()].forEach(([id,u])=>{u();openCmts.delete(id);if($('#c-'+id))toggleCmts(id)})}
/* the ⋯ menu on someone's post */
function postMenu(btn,p){if(!p)return;document.querySelector('.pmenu')?.remove();const m=document.createElement('div');m.className='pmenu card';
  m.innerHTML=`<button data-a="mute">🙈 Hide posts from this person</button><button data-a="report">🚩 Report this post</button>`;btn.closest('.post').appendChild(m);
  getUser(p.uid).then(u=>{const b=m.querySelector('[data-a=mute]');if(b)b.textContent=`🙈 Hide posts from ${u.name||'this person'}`});
  m.querySelector('[data-a=mute]').onclick=()=>{m.remove();setMuted(p.uid,true)};m.querySelector('[data-a=report]').onclick=()=>{m.remove();reportPost(p)};
  setTimeout(()=>addEventListener('click',function off(e){if(!m.contains(e.target)){m.remove();removeEventListener('click',off)}}))}
async function setMuted(uid,on){if(!me)return;const list=muted().filter(x=>x!==uid);if(on)list.push(uid);
  try{await F.updateDoc(D('users',me.uid),{mutedPosts:list.slice(-300)});const u=await getUser(uid);toast(on?`Posts from ${u.name||'them'} are hidden. Undo any time in Posts → Manage.`:`Showing posts from ${u.name||'them'} again`)}catch(e){toast('Couldn’t change that: '+e.message)}}
L.setMuted=setMuted;L.isMuted=uid=>muted().includes(uid);
// the Muted button (Posts) and Muted people (Profile → Privacy) open the same list
function mutedCount(){const n=muted().length;const c=$('#mutedCount');if(c)c.textContent=n?n:'';const pn=$('#pMutedNote');if(pn)pn.textContent=n?`${n} ${n===1?'person':'people'} hidden from your feed.`:'Nobody muted. Hide someone from the ⋯ menu on their post.'}
$('#mutedBtn')&&($('#mutedBtn').onclick=()=>{if(!me)return openModal('authModal');muteList()});$('#pMutedBtn')&&($('#pMutedBtn').onclick=()=>{if(!me)return openModal('authModal');muteList()});
async function muteList(){const ids=muted();const rows=await Promise.all(ids.map(async id=>{const u=await getUser(id);return`<div class="person">${pic(u,34)}<div class="info"><b>${nameHTML(u,{badges:false})}</b><span>Posts hidden</span></div><button data-unmute="${id}">Show again</button></div>`}));
  $('#userCard').innerHTML=`<h2>🙈 Muted people</h2><p class="muted" style="font-size:13px">You won't see posts from these people. They aren't told.</p><div class="list">${rows.join('')||'<p class="muted">Nobody muted.</p>'}</div><div class="row" style="margin-top:14px"><button data-close>Close</button></div>`;
  $$('#userCard [data-unmute]').forEach(b=>b.onclick=async()=>{await setMuted(b.dataset.unmute,false);b.closest('.person').remove();if(!$('#userCard [data-unmute]'))$('#userCard .list').innerHTML='<p class="muted">Nobody muted.</p>'});
  if(ids.length>1){$('#userCard .list').insertAdjacentHTML('afterend','<button id="unmuteAll" style="margin-top:10px">Show everyone again</button>');$('#unmuteAll').onclick=async()=>{try{await F.updateDoc(D('users',me.uid),{mutedPosts:[]});toast('Everyone’s posts are back in your feed');closeModal('userModal')}catch(e){toast(e.message)}}}
  openModal('userModal')}
function reportPost(p){$('#userCard').innerHTML=`<h2>🚩 Report post</h2><p class="muted" style="font-size:13px">The Lumen team checks every report. If they agree, the post earns no Glow and its author is told why. Only the team sees who reported it.</p>
    <div class="rep-reasons">${Object.entries(REASONS).map(([k,l],i)=>`<label class="chk"><input type="radio" name="repR" value="${k}" ${i?'':'checked'}> ${l}</label>`).join('')}</div>
    <label>Anything else? (optional)</label><input id="repNote" maxlength="200" placeholder="e.g. it's just the letter a">
    <div class="row" style="margin-top:14px"><button class="btn-acc" id="repGo">Send report</button><button data-close>Cancel</button></div>`;openModal('userModal');
  $('#repGo').onclick=async()=>{const reason=document.querySelector('input[name=repR]:checked')?.value||'useless';
    try{await F.setDoc(D('reports',p.id+'_'+me.uid),{post:p.id,postUid:p.uid,by:me.uid,reason,note:$('#repNote').value.trim().slice(0,200),status:'open',at:F.serverTimestamp()});closeModal('userModal');toast('Report sent. Thanks for keeping Posts good.')}
    catch(e){toast(e.code==='permission-denied'?'You’ve already reported this post':'Couldn’t send: '+e.message)}}}
async function toggleLike(pid,btn){if(banned)return toast('Your account is banned');const p=feedPosts.get(pid);if(!p)return;const liked=(p.likes||[]).includes(me.uid);
  btn.classList.toggle('on',!liked);btn.innerHTML=`${liked?'🤍':'❤️'} <span>${(p.likes||[]).length+(liked?-1:1)}</span>`;if(!liked)btn.classList.add('pop');
  try{await F.updateDoc(D('posts',pid),{likes:liked?F.arrayRemove(me.uid):F.arrayUnion(me.uid)})}catch(e){toast('Couldn’t like: '+e.message)}}

/* views: a post counts as viewed after it's been on screen for a moment.
   Never your own post, and at most 2 views per account per post per day (the rules enforce this). */
const dayNo=()=>Math.floor(Date.now()/864e5);
const VKEY='hub.views';
function viewLog(){try{const v=JSON.parse(localStorage.getItem(VKEY)||'{}');return v.day===dayNo()?v:{day:dayNo(),n:{}}}catch{return{day:dayNo(),n:{}}}}
const seenThisVisit=new Set(),viewTimers=new Map();
const viewObs=new IntersectionObserver(es=>es.forEach(e=>{const pid=e.target.dataset.pid;if(!pid)return;
  if(e.isIntersecting&&e.intersectionRatio>=.5){if(!viewTimers.has(pid))viewTimers.set(pid,setTimeout(()=>{viewTimers.delete(pid);countView(pid)},1200))}
  else{clearTimeout(viewTimers.get(pid));viewTimers.delete(pid)}}),{threshold:[0,.5]});
async function countView(pid){if(!me||banned||seenThisVisit.has(pid)||document.hidden||!$('#v-posts').classList.contains('on'))return;const p=feedPosts.get(pid);if(!p||p.uid===me.uid)return;
  seenThisVisit.add(pid);const log=viewLog();let n=log.n[pid]||0;
  while(n<2){n++;const vid=`${me.uid}_${dayNo()}_${n}`;const b=F.writeBatch(db);
    b.set(D('posts',pid,'views',vid),{uid:me.uid});b.update(D('posts',pid),{views:F.increment(1),lastView:vid});
    try{await b.commit();break}catch(e){console.warn('view not counted',vid,e.code,e.message);if(e.code!=='permission-denied')break}}
  log.n[pid]=n;try{localStorage.setItem(VKEY,JSON.stringify(log))}catch{}}

function toggleCmts(id){const box=$('#c-'+id);if(openCmts.has(id)){openCmts.get(id)();openCmts.delete(id);box.style.display='none';return}
  box.style.display='';box.innerHTML='<span class="muted">Loading…</span>';
  openCmts.set(id,F.onSnapshot(F.query(C('posts',id,'comments'),F.orderBy('at','asc'),F.limit(100)),async s=>{const cs=s.docs.map(d=>({id:d.id,...d.data()}));const us=await Promise.all(cs.map(c=>getUser(c.uid)));
    const draftTxt=box.querySelector('input')?.value||'';const owner=feedPosts.get(id)?.uid;
    box.innerHTML=cs.map((c,i)=>{const g=safeImg(c.gif);return`<div class="cmt"><div data-user="${c.uid}" style="cursor:pointer">${pic(us[i],30)}</div><div class="bub"><small><b data-user="${c.uid}">${nameHTML(us[i])}</b> · ${postAgo(c.at)}${c.uid===me.uid||owner===me.uid||isAdmin()?` · <a href="#" data-delc="${c.id}" style="color:inherit">delete</a>`:''}</small>${fmt(c.text||'')}${g?`<img class="gif" src="${g}" alt="GIF">`:''}</div></div>`}).join('')+
      `<form class="cmt-in"><button type="button" class="ib" data-emoji="#ci-${id}">😊</button><button type="button" class="ib gif-b" data-gif>GIF</button><input id="ci-${id}" data-rich placeholder="Write a comment…" maxlength="500" value="${esc(draftTxt)}"><button class="btn-acc">Send</button></form>`;
    bindPeople(box);
    box.querySelectorAll('[data-delc]').forEach(a=>a.onclick=e=>{e.preventDefault();F.deleteDoc(D('posts',id,'comments',a.dataset.delc)).catch(err=>toast(err.message))});
    const send=async(text,gif)=>{if(banned)return toast('Your account is banned');const data={uid:me.uid,text:(text||'').slice(0,500),gif:gif||'',at:F.serverTimestamp()};
      try{if(owner&&owner!==me.uid){const ref=F.doc(C('posts',id,'comments'));const b=F.writeBatch(db);b.set(ref,data);b.update(D('posts',id),{ecomments:F.increment(1),lastComment:ref.id});await b.commit()}
        else await F.addDoc(C('posts',id,'comments'),data)}catch(e){toast('Not sent: '+e.message)}};
    box.querySelector('form').onsubmit=e=>{e.preventDefault();const i=e.target.querySelector('input');if(i.value.trim()){send(i.value.trim());i.value=''}};
    box.querySelector('[data-gif]').onclick=async()=>{const g=await pickGif();if(g)send('',g)}},e=>box.innerHTML=`<span class="muted">${esc(e.message)}</span>`))}

/* ---------- post analytics + collecting Glow ---------- */
let myPosts=[];
function listenMyPosts(){unsubs.push(F.onSnapshot(F.query(C('posts'),F.where('uid','==',me.uid)),s=>{myPosts=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>ms(b.at)-ms(a.at));renderAnalytics();
    // tell the author when the Lumen team accepts a report on one of their posts (once per post, on this device)
    const seen=cfg.seenFlags||(cfg.seenFlags=[]);for(const p of myPosts){if(!p.flagged||seen.includes(p.id))continue;seen.push(p.id);cfg.seenFlags=seen.slice(-100);save();
      const msg=`Your post “${(p.text||'Image post').slice(0,40)}” was reported and the Lumen team agreed: ${p.flagged.reason||''}${p.flagged.note?' ('+p.flagged.note+')':''}. It earns no Glow.`;
      L.notify?.pop?.('🚩','Your post was reported',msg,'posts');toast(msg)}}))}
const unpaid=p=>p.flagged?0:((p.views||0)-(p.paidViews||0))*VIEW_GLOW+((p.ecomments||0)-(p.paidComments||0))*COMMENT_GLOW;
function renderAnalytics(){const box=$('#analytics');if(!box||!me)return;
  const tot=myPosts.reduce((a,p)=>({views:a.views+(p.views||0),likes:a.likes+(p.likes||[]).length,comments:a.comments+(p.ecomments||0),earned:a.earned+(p.paidViews||0)*VIEW_GLOW+(p.paidComments||0)*COMMENT_GLOW,owed:a.owed+unpaid(p)}),{views:0,likes:0,comments:0,earned:0,owed:0});
  const max=Math.max(1,...myPosts.map(p=>p.views||0));
  box.innerHTML=`<div class="an-stats">${[['👁','Views',tot.views],['❤️','Likes',tot.likes],['💬','Comments',tot.comments],['✦','Glow earned',tot.earned]].map(([i,l,v])=>`<div class="card an-stat"><span>${i} ${l}</span><b>${v.toLocaleString()}</b></div>`).join('')}</div>
    <div class="card an-collect"><div><b>✦ ${tot.owed.toLocaleString()} Glow waiting</b><span class="muted">Every view from someone else earns ${VIEW_GLOW} Glow (up to 2 per person per day) and every comment from someone else earns ${COMMENT_GLOW}.</span></div><button class="claim" id="collectBtn" ${tot.owed?'':'disabled'}>Collect</button></div>
    <div class="card"><table class="an-table"><thead><tr><th>Post</th><th>Views</th><th>Likes</th><th>Comments</th><th>Glow</th></tr></thead><tbody>${myPosts.map(p=>`<tr><td><div class="an-post">${safeImg(p.image)?`<img src="${safeImg(p.image)}" alt="">`:''}<span>${esc((p.text||'Image post').replace(/^#{1,3}\s*/gm,'').slice(0,70))}</span></div><small class="muted">${postAgo(p.at)}</small></td>
      <td><div class="an-bar"><i style="width:${Math.round((p.views||0)/max*100)}%"></i></div>${p.views||0}</td><td>${(p.likes||[]).length}</td><td>${p.ecomments||0}</td><td>${p.flagged?`<span class="rep-tag" title="${esc((p.flagged.reason||'')+(p.flagged.note?': '+p.flagged.note:''))}">🚩 0</span>`:unpaid(p)?`<span class="price">+${unpaid(p)}</span>`:'✓'}</td></tr>${p.flagged?`<tr class="rep-row"><td colspan="5">🚩 This post was reported and the Lumen team agreed: <b>${esc(p.flagged.reason||'')}</b>${p.flagged.note?` · “${esc(p.flagged.note)}”`:''}. It earns no Glow.</td></tr>`:''}`).join('')||'<tr><td colspan="5" class="muted">You haven’t posted yet.</td></tr>'}</tbody></table></div>`;
  $('#collectBtn').onclick=collectAll}
async function collectAll(){const btn=$('#collectBtn');btn.disabled=true;let got=0;
  for(const p of myPosts.filter(p=>unpaid(p)>0)){const amt=plan.bonus(unpaid(p));const b=F.writeBatch(db);
    b.update(D('posts',p.id),{paidViews:p.views||0,paidComments:p.ecomments||0});
    b.update(D('users',me.uid),{coins:(+myProfile.coins||0)+got+amt,lastEarn:p.id});
    try{await b.commit();got+=amt}catch(e){toast('Couldn’t collect: '+e.message);break}}
  if(got)toast(`+${got.toLocaleString()} ✦ Glow collected`);renderAnalytics()}
$('#postTabs')?.addEventListener('click',e=>{const b=e.target.closest('[data-pt]');if(!b)return;$$('#postTabs button').forEach(x=>x.classList.toggle('on',x===b));$('#feedWrap').style.display=b.dataset.pt==='feed'?'':'none';$('#analytics').style.display=b.dataset.pt==='an'?'':'none';if(b.dataset.pt==='an')renderAnalytics()});

/* ---------- server channels, bans, admin inbox ---------- */
let serverChannels=null,banned=false,inbox=[];
const ADMIN_UID='P1z4pyemPiZqpS65YBTdzI469yO2';
const isOwner=()=>me?.uid===ADMIN_UID;
const isAdmin=()=>isOwner()||(!!me&&plan.staff());
function listenServer(){unsubs.push(F.onSnapshot(D('server','config'),s=>{const c=s.data()?.channels;serverChannels=Array.isArray(c)&&c.length?c:null;renderRooms();renderAdmin()},()=>{}));
  unsubs.push(F.onSnapshot(D('bans',me.uid),s=>{banned=s.exists();document.body.classList.toggle('is-banned',banned);if(banned)toast('This account has been banned by the admin')},()=>{}));
  unsubs.push(F.onSnapshot(C('inbox',me.uid,'from'),s=>{inbox=s.docs.map(d=>d.id);renderFriends()},()=>{}))}

/* ---------- admin control panel ---------- */
let allUsers=[],adminQ='',admTab='overview';const adminPosts=new Map();
L.onAdminData=()=>{if(['overview','creators','projects','hub','shop'].includes(admTab))renderAdmin()};
function startAdmin(){$('#navAdmin').style.display=isAdmin()?'':'none';if(!isAdmin()||adminOn)return;adminOn=true;L.onAdminStart?.()
  unsubs.push(F.onSnapshot(F.query(C('users'),F.orderBy('nameLower'),F.limit(500)),s=>{allUsers=s.docs.map(d=>({uid:d.id,...d.data()}));renderAdmin()}));
  unsubs.push(F.onSnapshot(C('bans'),s=>{bannedSet=new Set(s.docs.map(d=>d.id));renderAdmin()}));
  unsubs.push(F.onSnapshot(F.query(C('reports'),F.where('status','==','open')),s=>{reports=s.docs.map(d=>({id:d.id,...d.data()}));renderAdmin()},()=>{}));
  if(!isOwner())return;
  unsubs.push(F.onSnapshot(C('codes'),s=>{glowCodes=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>ms(b.at)-ms(a.at));renderAdmin()},()=>{}));
  unsubs.push(F.onSnapshot(C('pcodes'),s=>{premCodes=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>ms(b.at)-ms(a.at));renderAdmin()},()=>{}))}
let bannedSet=new Set(),glowCodes=[],premCodes=[],reports=[];
/* premium code presets (days per plan; Ultimate is for life, its control-panel access renews yearly) */
const PRESETS=[['lite','Lumen Lite · 1 year',{lite:365},5000],['lite30','Lumen Lite · 30-day trial',{lite:30},0],['upgrade','Upgrade · 3 months',{upgrade:90},0],['liteup','Lite + Upgrade · 1 year',{lite:365,upgrade:365},5000],
  ['pro','Lumen Pro · 1 year',{pro:365},5000],['ultimate','Lumen Ultimate · forever (+1 yr control panel)',{ultimate:36500,ultAdmin:365},5000],['ultadmin','Ultimate control panel renewal · 1 year',{ultAdmin:365},0]];
const grantTxt=g=>Object.entries(g||{}).map(([k,d])=>`${{lite:'Lite',upgrade:'Upgrade',pro:'Pro',ultimate:'Ultimate',ultAdmin:'Ultimate panel'}[k]||k} ${d>=36500?'forever':d%365===0?d/365+' yr':d+' days'}`).join(' + ');
function renderAdmin(){const box=$('#adminBox');if(!box||!isAdmin())return;
  if(document.activeElement&&box.contains(document.activeElement)&&document.activeElement.matches('textarea,input:not(#admQ)'))return; // don't wipe a form mid-typing
  const chans=serverChannels||rooms();const hc=L.hubCounts?.()||{apps:0,queue:0,creators:0,live:0};
  const list=allUsers.filter(u=>!adminQ||u.nameLower?.includes(adminQ)||u.uid.toLowerCase().includes(adminQ));
  const TABS=[['overview','📊','Overview'],['users','👥','Users'],['creators','🛠','Creators',hc.apps],['projects','📦','Projects',hc.queue],['shop','🎨','Shop items',hc.shop],['hub','🏠','Hub'],['reports','🚩','Reports',reports.length?new Set(reports.map(r=>r.post)).size:0],['codes','✦','Glow codes'],['pcodes','💎','Premium codes'],['channels','#','Channels']].filter(t=>isOwner()||!['codes','pcodes'].includes(t[0]));
  if(!isOwner()&&['codes','pcodes'].includes(admTab))admTab='overview';
  const tabsHTML=`<div class="adm-tabs">${TABS.map(([k,i,l,n])=>`<button data-atab="${k}" class="${admTab===k?'on':''}"><span>${i}</span>${l}${n?`<em>${n}</em>`:''}</button>`).join('')}</div>`;
  const stat=(i,l,v,go)=>`<button class="card an-stat"${go?` data-atab="${go}"`:''}><span>${i} ${l}</span><b>${(+v||0).toLocaleString()}</b></button>`;
  const users=`<div class="card"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><h2>Accounts <em class="count">${allUsers.length}</em></h2><input id="admQ" placeholder="Search name or ID" value="${esc(adminQ)}" style="max-width:280px"></div>
     <div class="list adm-users" style="margin-top:10px">${list.map(u=>`<div class="person${bannedSet.has(u.uid)?' banned':''}">${pic(u,38)}<div class="info"><input class="adm-name" data-uid="${u.uid}" value="${esc(u.name||'')}" maxlength="24"><span class="muted" style="font-size:11px">✦ ${(+u.coins||0).toLocaleString()} · ${u.uid}${bannedSet.has(u.uid)?' · banned':''}${u.uid===ADMIN_UID?' · admin':''}</span></div>
       ${tierOf(u)?`<span class="ptag ptag-${tierOf(u)}">${TIER_TXT[tierOf(u)]}</span>`:''}${isOwner()?`<button class="ib" data-gift="${u.uid}" title="Gift Glow">🎁</button>`:''}${u.uid===ADMIN_UID||u.uid===me.uid?'':`<button class="ib" data-admdm="${u.uid}" title="Message">💬</button>${bannedSet.has(u.uid)?`<button class="ib" data-unban="${u.uid}" title="Unban">↩</button>`:`<button class="ib" data-ban="${u.uid}" title="Delete profile and ban">⛔</button>`}`}</div>`).join('')||'<p class="muted">No accounts match.</p>'}</div></div>`;
  const codes=`<div class="card"><h2>✦ Glow codes</h2><p class="muted" style="font-size:13px">Make a code worth any amount. People redeem it in the Shop, once each, until it runs out.</p>
     <form class="row" id="mkCode" style="margin:10px 0;flex-wrap:wrap"><input id="codeAmt" type="number" min="1" placeholder="Glow amount" style="flex:1;min-width:120px"><input id="codeUses" type="number" min="1" value="1" title="How many people can use it" style="width:90px"><button class="btn-acc">Generate</button></form>
     <div class="list">${glowCodes.map(c=>`<div class="person"><div class="info"><b style="font-family:'JetBrains Mono',monospace;letter-spacing:.04em">${esc(c.id)}</b><span>✦ ${(+c.amount).toLocaleString()} · used ${c.uses}/${c.maxUses}</span></div><button class="ib" data-copycode="${esc(c.id)}" title="Copy">📋</button><button class="ib" data-delcode="${esc(c.id)}" title="Delete">✕</button></div>`).join('')||'<p class="muted">No codes yet.</p>'}</div></div>`;
  const pcodes=`<div class="card"><h2>💎 Premium codes</h2><p class="muted" style="font-size:13px">Give these to people to unlock Lumen Lite, Upgrade, Pro or Ultimate. Nobody is charged: the code is the purchase. Each person can use a code once.</p>
     <form class="row" id="mkPCode" style="margin:10px 0;flex-wrap:wrap"><select id="pcPreset" style="flex:1;min-width:220px">${PRESETS.map(([k,l,,gl])=>`<option value="${k}">${l}${gl?' · +✦ '+gl.toLocaleString():''}</option>`).join('')}</select><input id="pcUses" type="number" min="1" value="1" title="How many people can use it" style="width:90px"><button class="btn-acc">Generate</button></form>
     <div class="list">${premCodes.map(c=>`<div class="person"><div class="info"><b style="font-family:'JetBrains Mono',monospace;letter-spacing:.04em">${esc(c.id)}</b><span>${esc(grantTxt(c.grants))}${c.glow?' · ✦ '+(+c.glow).toLocaleString():''} · used ${c.uses}/${c.maxUses}</span></div><button class="ib" data-copycode="${esc(c.id)}" title="Copy">📋</button><button class="ib" data-delpcode="${esc(c.id)}" title="Delete">✕</button></div>`).join('')||'<p class="muted">No premium codes yet.</p>'}</div></div>`;
  const channels=`<div class="card"><h2>Global server channels</h2><p class="muted" style="font-size:13px">Everyone sees these rooms in Chat.</p><div class="list" style="margin:10px 0">${chans.map(c=>`<div class="person"><div class="info"><b># ${esc(c)}</b></div><button class="ib" data-rmch="${esc(c)}" title="Remove">✕</button></div>`).join('')}</div>
     <form class="row" id="addCh"><input id="newCh" placeholder="new-channel" maxlength="30"><button class="btn-acc">Add</button></form></div>`;
  const todo=[reports.length&&[`🚩 ${new Set(reports.map(r=>r.post)).size} reported post${new Set(reports.map(r=>r.post)).size>1?'s':''} to check`,'reports'],hc.shop&&[`🎨 ${hc.shop} shop item${hc.shop>1?'s':''} to review`,'shop'],hc.apps&&[`🛠 ${hc.apps} creator application${hc.apps>1?'s':''} waiting`,'creators'],hc.queue&&[`📦 ${hc.queue} project${hc.queue>1?'s':''} to review`,'projects']].filter(Boolean);
  const overview=`<div class="an-stats">${stat('👥','Accounts',allUsers.length,'users')}${stat('🟢','Online friends',friendIds().filter(u=>status(u)!=='offline').length)}${stat('⛔','Banned',bannedSet.size,'users')}${stat('🛠','Creators',hc.creators,'creators')}${stat('📦','Live projects',hc.live,'projects')}${isOwner()?stat('✦','Glow codes',glowCodes.length,'codes')+stat('💎','Premium',allUsers.filter(u=>tierOf(u)).length,'pcodes'):stat('💎','Premium members',allUsers.filter(u=>tierOf(u)).length)}</div>
     ${isOwner()?'':`<div class="banner" style="margin-bottom:14px">💎 You have the control panel through Lumen ${plan.ult()&&!liveK('pro')?'Ultimate':'Pro'}. Glow gifts and codes stay with the Lumen owner.</div>`}
     <div class="card"><h2>📥 To do</h2><div class="list">${todo.map(([t,k])=>`<button class="adm-todo" data-atab="${k}">${t}<span>Open →</span></button>`).join('')||'<p class="muted">All caught up. Nothing waiting for you.</p>'}</div></div>
     <div class="adm-quick">${[['users','👥','Manage accounts',isOwner()?'Rename, gift Glow, message, ban':'Rename, message, ban'],['hub','🏠','Customise the Hub','Banner, announcement, featured picks'],['projects','📦','Review projects','Approve, feature, hide or delete'],['channels','#','Chat channels','Add and remove global rooms']].map(([k,i,t,d])=>`<button class="card" data-atab="${k}"><span style="font-size:24px">${i}</span><b>${t}</b><span class="muted">${d}</span></button>`).join('')}</div>`;
  const byPost=[...reports.reduce((m,r)=>{(m.get(r.post)||m.set(r.post,[]).get(r.post)).push(r);return m},new Map())];
  const repPane=`<div class="card"><h2>🚩 Post reports</h2><p class="muted" style="font-size:13px">Accept a report and the post earns no more Glow; its author gets a notification with the reason. Dismiss it if the post is fine.</p>
     <div class="list">${byPost.map(([pid,rs])=>{const p=feedPosts.get(pid)||adminPosts.get(pid);const counts=rs.reduce((a,r)=>(a[r.reason]=(a[r.reason]||0)+1,a),{});const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'useless';
       return`<div class="rep-item"><div class="rep-post">${p?`${safeImg(p.image)?`<img src="${safeImg(p.image)}" alt="">`:''}<span>${esc((p.text||'Image post').slice(0,200))}</span>`:'<span class="muted">Loading post…</span>'}</div>
         <div class="rep-meta"><b data-repuser="${rs[0].postUid}">by …</b> · ${rs.length} report${rs.length>1?'s':''}: ${Object.entries(counts).map(([k,n])=>`${esc(REASONS[k]||k)} ×${n}`).join(', ')}${rs.filter(r=>r.note).map(r=>`<div class="muted" style="font-size:12px">“${esc(r.note)}”</div>`).join('')}</div>
         <div class="row" style="gap:8px;flex-wrap:wrap"><input data-repnote="${pid}" maxlength="300" placeholder="Note for the author (optional)" style="flex:1;min-width:180px"><button class="btn-acc" data-repok="${pid}" data-reason="${top}">Accept · no Glow</button><button data-repno="${pid}">Dismiss</button></div></div>`}).join('')||'<p class="muted">No reports waiting. 🎉</p>'}</div></div>`;
  const pane={overview,users,codes,pcodes,channels,reports:repPane}[admTab];
  box.innerHTML=tabsHTML+`<div class="adm-pane" id="admPane">${pane||''}</div>`;
  box.querySelectorAll('[data-atab]').forEach(b=>b.onclick=()=>{admTab=b.dataset.atab;renderAdmin();box.scrollIntoView({block:'start'})});
  if(!pane){L.hub?.renderAdminTab(admTab,$('#admPane'));return}
  if($('#admQ'))$('#admQ').oninput=e=>{adminQ=e.target.value.trim().toLowerCase();const pos=e.target.selectionStart;renderAdmin();const q=$('#admQ');q.focus();q.setSelectionRange(pos,pos)};
  box.querySelectorAll('.adm-name').forEach(i=>i.onchange=async()=>{const name=i.value.trim().slice(0,24);if(name.length<2)return toast('Name needs 2+ characters');try{await F.updateDoc(D('users',i.dataset.uid),{name,nameLower:name.toLowerCase()});users.delete(i.dataset.uid);toast('Renamed')}catch(e){adminErr(e)}});
  box.querySelectorAll('[data-admdm]').forEach(b=>b.onclick=async()=>{const uid=b.dataset.admdm;try{await F.setDoc(D('inbox',uid,'from',me.uid),{at:F.serverTimestamp()})}catch{}openDm(uid)});
  box.querySelectorAll('[data-ban]').forEach(b=>b.onclick=async()=>{const u=allUsers.find(x=>x.uid===b.dataset.ban);if(!confirm(`Delete ${u?.name||'this account'}'s profile and ban them? They won't be able to post, chat or sign up again with this account.`))return;
    const bt=F.writeBatch(db);bt.set(D('bans',b.dataset.ban),{at:F.serverTimestamp(),name:u?.name||''});bt.delete(D('users',b.dataset.ban));try{await bt.commit();toast('Profile deleted and account banned')}catch(e){adminErr(e)}});
  box.querySelectorAll('[data-gift]').forEach(b=>b.onclick=async()=>{const u=allUsers.find(x=>x.uid===b.dataset.gift);const raw=prompt(`How much Glow to gift ${u?.name||'this account'}? (current: ${(+u?.coins||0).toLocaleString()})`,'1000');if(raw===null)return;
    const amt=Math.floor(Number(String(raw).replace(/[^0-9.-]/g,'')));if(!Number.isFinite(amt)||amt<=0)return toast('Enter a positive number');
    try{const fresh=await F.getDoc(D('users',b.dataset.gift));const next=Math.min(1e9,(+fresh.data()?.coins||0)+amt);await F.updateDoc(D('users',b.dataset.gift),{coins:next,gift:{amount:amt,at:F.serverTimestamp(),id:Date.now().toString(36)+Math.random().toString(36).slice(2,6)}});toast(`Gifted ✦ ${amt.toLocaleString()} to ${u?.name||'them'}`)}catch(e){adminErr(e)}});
  box.querySelectorAll('[data-unban]').forEach(b=>b.onclick=async()=>{try{await F.deleteDoc(D('bans',b.dataset.unban));toast('Unbanned')}catch(e){toast(e.message)}});
  box.querySelectorAll('[data-rmch]').forEach(b=>b.onclick=()=>saveChannels(chans.filter(c=>c!==b.dataset.rmch)));
  if($('#mkCode'))$('#mkCode').onsubmit=async e=>{e.preventDefault();const amount=Math.floor(+$('#codeAmt').value),maxUses=Math.max(1,Math.floor(+$('#codeUses').value||1));if(!(amount>0))return toast('Enter how much Glow the code is worth');
    const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',r=crypto.getRandomValues(new Uint8Array(12));const raw=[...r].map(x=>A[x%A.length]).join('');const code=`LUMEN-${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8)}`;
    try{await F.setDoc(D('codes',code),{amount,maxUses,uses:0,at:F.serverTimestamp()});try{await navigator.clipboard.writeText(code)}catch{}toast(`Code ${code} made and copied`)}catch(err){adminErr(err)}};
  box.querySelectorAll('[data-repuser]').forEach(el=>getUser(el.dataset.repuser).then(u=>el.textContent='by '+(u.name||'someone')));
  byPost.forEach(([pid])=>{if(!feedPosts.get(pid)&&!adminPosts.has(pid)){adminPosts.set(pid,null);F.getDoc(D('posts',pid)).then(s=>{adminPosts.set(pid,s.exists()?{id:pid,...s.data()}:{id:pid,text:'(post deleted)'});renderAdmin()}).catch(()=>{})}});
  const settle=async(pid,ok,reason)=>{const bt=F.writeBatch(db);for(const r of reports.filter(r=>r.post===pid))bt.update(D('reports',r.id),{status:ok?'accepted':'dismissed'});
    if(ok&&(adminPosts.get(pid)?.text!=='(post deleted)'))bt.update(D('posts',pid),{flagged:{reason:REASONS[reason]||reason,note:(box.querySelector(`[data-repnote="${pid}"]`)?.value||'').trim().slice(0,300),at:F.serverTimestamp()}});
    try{await bt.commit();toast(ok?'Report accepted: the post earns no Glow and its author has been told':'Report dismissed')}catch(e){adminErr(e)}};
  box.querySelectorAll('[data-repok]').forEach(b=>b.onclick=()=>settle(b.dataset.repok,true,b.dataset.reason));
  box.querySelectorAll('[data-repno]').forEach(b=>b.onclick=()=>settle(b.dataset.repno,false));
  if($('#mkPCode'))$('#mkPCode').onsubmit=async e=>{e.preventDefault();const pr=PRESETS.find(p=>p[0]===$('#pcPreset').value);if(!pr)return;const maxUses=Math.max(1,Math.floor(+$('#pcUses').value||1));
    const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',r=crypto.getRandomValues(new Uint8Array(12));const raw=[...r].map(x=>A[x%A.length]).join('');const code=`${{lite30:'LITE',liteup:'LITE',ultadmin:'ULT'}[pr[0]]||pr[0].slice(0,4).toUpperCase()}-${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8)}`;
    try{await F.setDoc(D('pcodes',code),{grants:pr[2],glow:pr[3],maxUses,uses:0,label:pr[1],at:F.serverTimestamp()});try{await navigator.clipboard.writeText(code)}catch{}toast(`Code ${code} made and copied`)}catch(err){adminErr(err)}};
  box.querySelectorAll('[data-delpcode]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this premium code? Nobody else can redeem it after this.'))return;try{await F.deleteDoc(D('pcodes',b.dataset.delpcode))}catch(err){adminErr(err)}});
  box.querySelectorAll('[data-copycode]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copycode);toast('Copied')}catch{prompt('Copy this code',b.dataset.copycode)}});
  box.querySelectorAll('[data-delcode]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this code? Nobody else can redeem it after this.'))return;try{await F.deleteDoc(D('codes',b.dataset.delcode))}catch(err){adminErr(err)}});
  if($('#addCh'))$('#addCh').onsubmit=e=>{e.preventDefault();const c=$('#newCh').value.trim().toLowerCase().replace(/[^\w-]/g,'').slice(0,30);if(!c)return;if(chans.includes(c))return toast('Already exists');saveChannels([...chans,c])}}
function adminErr(e){toast(e.code==='permission-denied'?'Firebase refused this. Re-publish the latest firestore.rules in the Firebase console (Firestore → Rules → Publish).':e.message)}
async function saveChannels(list){if(!list.length)return toast('Keep at least one channel');try{await F.setDoc(D('server','config'),{channels:list});toast('Channels updated')}catch(e){adminErr(e)}}

/* shared with shop.js */
L.cloud={F,D,db,me:()=>me,profile:()=>myProfile,card,pic,nameHTML,getUser,isAdmin,isOwner,tierOf,tierTag,feed:()=>feedPosts};L.openUser=showUser;L.cloud.friendLobbies=()=>!me||!cfg.seeOthers?[]:friendIds().filter(u=>status(u)&&status(u)!=='offline').map(u=>({uid:u,lb:presence.get(u)?.act?.lobby})).filter(x=>x.lb&&/^[A-Z0-9]{3,12}$/.test(x.lb.code)).map(x=>({uid:x.uid,code:x.lb.code,n:+x.lb.n||1,max:+x.lb.max||5}));L.openDm=openDm;L.cloud.openDmId=()=>panes.dm.convo?.type==='dm'?panes.dm.convo.id:null;
L.onCloudReady?.();
