/* Notifications: a pop-up card and a red dot when you get a message, a like, a gift or a friend request.
   Pop-ups never show while the Learning Portal or a cover page is up (only the dots wait for you). */
const L=window.Lumen,{esc}=L;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const C=()=>L.cloud;
let me=null,unsubs=[];const dmUnsubs=new Map();
const unreadDm=new Set();let newLikes=0,newGift=0,newReq=0;
const ms=t=>t?.toMillis?.()??Date.now();
const K=k=>`hub.n.${me}.${k}`;
const load=(k,d)=>{try{const v=localStorage.getItem(K(k));return v===null?d:JSON.parse(v)}catch{return d}};
const keep=(k,v)=>{try{localStorage.setItem(K(k),JSON.stringify(v))}catch{}};
const hiddenNow=()=>document.body.classList.contains('in-portal')||$('#study')?.classList.contains('on')||$('#cover')?.classList.contains('on');
const viewOn=v=>$('#v-'+v)?.classList.contains('on');
const popOn=()=>L.cfg.notifPop!==false;

/* ---------- pop-up cards ---------- */
const stack=document.createElement('div');stack.id='notifStack';document.body.appendChild(stack);
function pop(icon,title,text,go,picHTML){if(!popOn()||hiddenNow())return;
  const n=document.createElement('button');n.className='notif';n.innerHTML=`<span class="notif-ic">${picHTML||icon}</span><span class="notif-t"><b>${title}</b>${text?`<small>${text}</small>`:''}</span><span class="notif-x" title="Dismiss">×</span>`;
  n.onclick=e=>{n.remove();if(!e.target.closest('.notif-x'))go?.()};
  stack.prepend(n);while(stack.children.length>4)stack.lastChild.remove();
  requestAnimationFrame(()=>n.classList.add('in'));setTimeout(()=>{n.classList.remove('in');setTimeout(()=>n.remove(),400)},6500)}

/* ---------- red dots ---------- */
function dot(view,on,count){const b=$(`nav .nav-btn[data-v="${view}"]`);if(!b)return;let d=b.querySelector('.ndot');
  if(on&&!d){d=document.createElement('i');d.className='ndot';b.appendChild(d)}if(!on)d?.remove();else d.textContent=count>1?(count>9?'9+':count):''}
function dots(){dot('friends',unreadDm.size+newReq>0,unreadDm.size+newReq);dot('posts',newLikes>0,newLikes);dot('shop',newGift>0,newGift);
  $$('#friendList [data-open]').forEach(r=>{const on=unreadDm.has(r.dataset.open);let d=r.querySelector('.ndot');if(on&&!d){d=document.createElement('i');d.className='ndot';r.appendChild(d)}if(!on)d?.remove()});
  const total=unreadDm.size+newLikes+newGift+newReq;$('#mobFab')?.classList.toggle('has-notif',total>0)}
new MutationObserver(()=>{if(me)dots()}).observe($('#friendList')||document.body,{childList:true});
const prevView=L.onView;L.onView=v=>{prevView?.(v);if(v==='posts'){newLikes=0}if(v==='shop'){newGift=0}if(v==='friends'){newReq=0}dots()};

/* ---------- messages: the latest message of each private chat ---------- */
const openDmId=()=>viewOn('friends')&&document.visibilityState==='visible'&&!hiddenNow()?C()?.openDmId?.():null;
function watchDm(uid){if(dmUnsubs.has(uid))return;const {F,db}=C();let first=true;
  dmUnsubs.set(uid,F.onSnapshot(F.query(F.collection(db,'dms',[me,uid].sort().join('_'),'messages'),F.orderBy('at','desc'),F.limit(1)),async s=>{
    const m=s.docs[0]?.data();const wasFirst=first;first=false;if(!m&&load('dm.'+uid,null)===null)keep('dm.'+uid,0);if(!m||m.uid===me||!m.at)return;
    const t=ms(m.at),seen=load('dm.'+uid,null);if(seen===null&&wasFirst){keep('dm.'+uid,t);return}if(t<=(seen||0))return;
    if(openDmId()===uid){keep('dm.'+uid,t);return}
    unreadDm.add(uid);dots();
    if(!wasFirst||Date.now()-t<10*60e3){const u=await C().getUser(uid);pop('💬',`${esc(u.name||'Someone')} messaged you`,esc(m.text?m.text.slice(0,80):'Sent a GIF'),()=>L.openDm?.(uid),C().pic(u,34))}},()=>{}))}
setInterval(()=>{const id=openDmId();if(id&&unreadDm.has(id)){unreadDm.delete(id);keep('dm.'+id,Date.now());dots()}},1200);

/* ---------- start / stop with the account ---------- */
function stop(){unsubs.forEach(u=>u());unsubs=[];dmUnsubs.forEach(u=>u());dmUnsubs.clear();unreadDm.clear();newLikes=newGift=newReq=0;dots()}
function start(){const {F,D,db}=C();const col=(...p)=>F.collection(db,...p);
  // friends (and the admin, if they messaged you): watch each chat; new friend requests
  let inbox=[],friends=[];const sync=()=>{const want=new Set([...friends,...inbox]);want.forEach(watchDm);[...dmUnsubs.keys()].filter(k=>!want.has(k)).forEach(k=>{dmUnsubs.get(k)();dmUnsubs.delete(k);unreadDm.delete(k)});dots()};
  let reqInit=load('reqs',null);
  unsubs.push(F.onSnapshot(F.query(col('friendships'),F.where('users','array-contains',me)),async s=>{const all=s.docs.map(d=>d.data());
    friends=all.filter(f=>f.status==='accepted').map(f=>f.users.find(x=>x!==me));sync();
    const inc=all.filter(f=>f.status==='pending'&&f.from!==me).map(f=>f.from);
    if(reqInit===null){reqInit=inc}else{for(const uid of inc.filter(x=>!reqInit.includes(x))){newReq++;const u=await C().getUser(uid);pop('👋',`${esc(u.name||'Someone')} sent you a friend request`,'',()=>L.go('friends'),C().pic(u,34))}reqInit=inc}
    keep('reqs',reqInit);dots()},()=>{}));
  unsubs.push(F.onSnapshot(col('inbox',me,'from'),s=>{inbox=s.docs.map(d=>d.id);sync()},()=>{}));
  // likes on your posts
  let known=load('likes',null);
  unsubs.push(F.onSnapshot(F.query(col('posts'),F.where('uid','==',me)),async s=>{const fresh=known===null;known=known||{};const next={};
    for(const d of s.docs){const likes=d.data().likes||[],prev=known[d.id];next[d.id]=likes;if(fresh||!prev)continue;
      for(const uid of likes.filter(x=>x!==me&&!prev.includes(x))){newLikes++;dots();const u=await C().getUser(uid);
        pop('❤️',`${esc(u.name||'Someone')} liked your post`,esc((d.data().text||'').replace(/^#{1,3}\s*/gm,'').slice(0,70)),()=>{L.go('posts');setTimeout(()=>$('#p-'+d.id)?.scrollIntoView({behavior:'smooth',block:'center'}),300)},C().pic(u,34))}}
    known=next;keep('likes',known);dots()},()=>{}))}
function checkGift(p){const g=p?.gift;if(!g?.id)return;const seen=load('gift',null);if(seen===g.id)return;keep('gift',g.id);
  if(seen===null&&Date.now()-ms(g.at)>3*864e5)return; // old gift from before notifications existed
  newGift++;dots();pop('🎁',`You were gifted ✦ ${(+g.amount||0).toLocaleString()} Glow`,'From the Lumen admin',()=>L.go('shop'))}
const prevP=L.onProfile;L.onProfile=p=>{prevP?.(p);const uid=p?.uid||null;if(uid!==me){stop();me=uid;if(me&&C())start()}if(me)checkGift(p)};
if(C()?.profile?.())L.onProfile(C().profile());
L.notify={pop};
