/* Lumen Hub, Lumen Creators and play counts.
   - Hub page: admin-customised banner, featured picks, most played games, popular posts, new creator projects
   - Creator Dashboard: apply, then submit games and websites (each one is reviewed by the admin)
   - Games tab and Web "Featured" page show approved creator projects
   - Admin tabs (Creators, Projects, Hub) are rendered here for the control panel in cloud.js */
const L=window.Lumen,{esc,toast,safeImg}=L;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const BUILTINS=[{key:'b_nightbound',title:'Nightbound',type:'game',desc:'1v4 asymmetric horror · online multiplayer',url:()=>L.cfg.nbUrl,art:'radial-gradient(circle at 30% 20%,#5a1020,#1a0608 60%,#06070b)'},
  {key:'b_offal',title:'OFFAL',type:'game',desc:'Horror · demo',url:()=>'games/offal.html',image:'games/offal-poster.webp'},
  {key:'b_fixinggood',title:'Fixing Good',type:'game',desc:'Desert crime action · story mode',url:()=>'games/fixing-good.html',image:'games/fixing-good-poster.webp'},
  {key:'b_lumisleap',title:"Lumi's Leap",type:'game',desc:'2D platformer · six worlds',url:()=>'games/lumis-leap.html',image:'games/lumis-leap-poster.webp'}];
let me=null,hubCfg={},live=[],plays={},trend={},myItems=[],allItems=[],myApp=null,myProjects=[],allApps=[],allProjects=[],unsubs=[];
const C=()=>L.cloud;
const stop=()=>{unsubs.forEach(u=>u());unsubs=[]};
const isAdmin=()=>C()?.isAdmin?.();
const isCreator=()=>myApp?.status==='approved'||!!isAdmin();
const projKey=p=>'p_'+p.id;
const fmtN=n=>(+n||0).toLocaleString();
const DAY=()=>Math.floor(Date.now()/864e5);
const RATE={min:20,mention:50,review:50};
const unpaid=p=>RATE.min*Math.max(0,(p.minutes||0)-(p.paidMin||0))+RATE.mention*Math.max(0,(p.mentions||0)-(p.paidMent||0))+RATE.review*Math.max(0,(p.upReviews||0)-(p.paidRev||0))+Math.max(0,(p.sold||0)-(p.paidSold||0));
const earned=p=>RATE.min*(p.minutes||0)+RATE.mention*(p.mentions||0)+RATE.review*(p.upReviews||0)+(p.sold||0);

/* ---------- live data ---------- */
function start(){const {F,D,db}=C();const col=(...p)=>F.collection(db,...p);
  unsubs.push(F.onSnapshot(D('server','hub'),s=>{hubCfg=s.data()||{};refresh()},()=>{}));
  unsubs.push(F.onSnapshot(F.query(col('projects'),F.where('status','==','approved')),s=>{live=s.docs.map(d=>({id:d.id,...d.data()}));refresh()},()=>{}));
  unsubs.push(F.onSnapshot(col('plays'),s=>{const t=DAY();plays={};trend={};s.docs.forEach(d=>{const x=d.data();plays[d.id]=+x.count||0;let w=0;for(let i=0;i<7;i++)w+=+x['d'+(t-i)]||0;trend[d.id]=w});refresh()},()=>{}));
  unsubs.push(F.onSnapshot(D('creatorApps',me),s=>{myApp=s.exists()?s.data():null;$('#navCreator').style.display=isCreator()?'':'none';refresh()},()=>{}));
  unsubs.push(F.onSnapshot(F.query(col('projects'),F.where('uid','==',me)),s=>{myProjects=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.at?.toMillis?.()||0)-(a.at?.toMillis?.()||0));renderCreator()},()=>{}));
  unsubs.push(F.onSnapshot(F.query(col('shopItems'),F.where('uid','==',me)),s=>{myItems=s.docs.map(d=>({id:d.id,...d.data()}));myItems.forEach(i=>L.cos.refresh(i.id,i.at?.toMillis?.()));renderCreator()},()=>{}));
  adminOn=false;startAdminHub()}
// the review lists (shop items, creator applications, projects); for Pro / Ultimate staff the panel turns on a moment after sign-in
let adminOn=false;
function startAdminHub(){if(adminOn||!me||!isAdmin())return;adminOn=true;const {F}=C(),col=n=>F.collection(C().db,n);
  unsubs.push(F.onSnapshot(col('shopItems'),s=>{allItems=s.docs.map(d=>({id:d.id,...d.data()}));allItems.forEach(i=>L.cos.refresh(i.id,i.at?.toMillis?.()));L.onAdminData?.()},()=>{}));
  unsubs.push(F.onSnapshot(col('creatorApps'),s=>{allApps=s.docs.map(d=>({id:d.id,...d.data()}));L.onAdminData?.()},()=>{}));
  unsubs.push(F.onSnapshot(col('projects'),s=>{allProjects=s.docs.map(d=>({id:d.id,...d.data()}));L.onAdminData?.()},()=>{}));
  $('#navCreator').style.display=isCreator()?'':'none';refresh()}
L.onAdminStart=(prev=>()=>{prev?.();startAdminHub()})(L.onAdminStart);
const prevP=L.onProfile;L.onProfile=p=>{prevP?.(p);const uid=p?.uid||null;if(uid===me)return;stop();me=uid;myApp=null;myProjects=[];myItems=[];allItems=[];live=[];plays={};hubCfg={};
  if($('#navCreator'))$('#navCreator').style.display='none';if(me&&C())start();refresh()};
L.onFeed=()=>{if($('#v-hub')?.classList.contains('on'))renderHub()};
function refresh(){renderHub();renderCreator();renderGameHub();if(gpKey&&$('#v-gamepage')?.classList.contains('on'))renderGamePage();L.browser?.refresh?.()}

/* ---------- plays: +1 per person per game per day ---------- */
async function play(key){if(!me||!C())return;const {F,D,db}=C();const day=Math.floor(Date.now()/864e5),rec=`${me}_${day}`;
  const seen='hub.play.'+key+'.'+day;try{if(localStorage.getItem(seen))return}catch{}
  try{const b=F.writeBatch(db);b.set(D('plays',key,'by',rec),{at:F.serverTimestamp()});
    if(key in plays)b.update(D('plays',key),{count:F.increment(1),['d'+day]:F.increment(1)});else b.set(D('plays',key),{count:1,['d'+day]:1});await b.commit();try{localStorage.setItem(seen,'1')}catch{}}catch{}}

/* ---------- shared cards ---------- */
const allGames=()=>[...BUILTINS.filter(g=>!(hubCfg.hiddenBuiltins||[]).includes(g.key)).map(g=>({...g,url:g.url()})),...live.filter(p=>p.type==='game').map(p=>({...p,key:projKey(p)}))];
const findItem=key=>key.startsWith('b_')?(()=>{const g=BUILTINS.find(x=>x.key===key);return g&&{...g,url:g.url()}})():(()=>{const p=live.find(x=>projKey(x)===key);return p&&{...p,key}})();
function art(it){const img=safeImg(it.image)||(it.image&&it.image.startsWith('games/')?it.image:'');
  if(img){const x=it.ix??50,y=it.iy??50,z=it.iz||100,ar=(+it.ar||0)/100,size=!ar?(z===100?'cover':`${z}% auto`):ar>=1.6?`auto ${z}%`:`${z}% auto`;return`background-image:url('${esc(img)}');background-size:${size};background-position:${x}% ${y}%;background-repeat:no-repeat`}
  return img?'':`background:${it.art||`linear-gradient(135deg,hsl(${(it.title||'x').length*47%360} 70% 45%),hsl(${(it.title||'x').length*47%360+60} 70% 20%))`}`}
function card(it,{small=false}={}){const pl=plays[it.key]||0;
  return`<button class="hcard${small?' small':''}" data-open="${esc(it.key)}"><div class="hart" style="${art(it)}">${it.image?'':`<span>${esc(it.title)}</span>`}<em class="htype">${it.type==='site'?'🌐 Website':'🎮 Game'}</em>${it.featured||(hubCfg.pinned||[]).includes(it.key)?'<em class="hfeat">⭐ Featured</em>':''}${it.price>0?`<em class="hprice">${unlocked(it)?'✓ Unlocked':'✦ '+fmtN(it.price)}</em>`:''}</div>
    <div class="hmeta"><b>${esc(it.title)}</b><span class="by" data-by="${esc(it.uid||'')}">${it.uid?'':'Lumen'}</span><span class="pl">▶ ${fmtN(pl)} play${pl===1?'':'s'}${it.upReviews?` · 👍 ${fmtN(it.upReviews)}`:''}${trend[it.key]&&it.type!=='site'?` · 📈 ${fmtN(trend[it.key])} this week`:''}</span></div></button>`}
async function fillCreators(root){for(const el of root.querySelectorAll('[data-by]')){const uid=el.dataset.by;if(!uid)continue;const u=await C().getUser(uid);el.textContent='by '+(u.name||'a creator')}}
function bindOpen(root){root.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openItem(b.dataset.open))}
function openItem(key){const it=findItem(key);if(!it)return toast('That isn’t available any more');if(it.type==='site'){play(key);L.browser.open(it.url)}else openGame(key)}
const unlocked=it=>!(it.price>0)||it.uid===me||isAdmin()||(C()?.profile?.()?.owned||[]).includes(it.key||'p_'+it.id);
const linkCache=new Map();
async function gameLink(p){if(p.url)return p.url;if(linkCache.has(p.id))return linkCache.get(p.id);
  try{const s=await C().F.getDoc(C().D('projects',p.id,'private','link'));const u=s.data()?.url||'';if(u)linkCache.set(p.id,u);return u}catch{return''}}
async function launch(key){const it=findItem(key);if(!it)return toast('That isn’t available any more');
  if(!unlocked(it)){openGame(key);return toast(`Unlock ${it.title} first (✦ ${fmtN(it.price)})`)}
  const url=await gameLink(it);if(!url)return toast('Couldn’t open this game');play(key);L.openView(url,it.title,{kind:'game',label:it.title,key});startTimer(key)}
async function unlockGame(key){const it=findItem(key),prof=C().profile();if(!it||!prof)return toast('Sign in first');const coins=+prof.coins||0;const cost=L.plan?.price(it.price)??it.price;
  if(coins<cost)return toast(`You need ✦ ${fmtN(cost)} Glow (you have ${fmtN(coins)})`);
  if(!confirm(`Unlock ${it.title} for ✦ ${fmtN(cost)}${cost<it.price?' (Lite 10% off)':''}? You keep it forever.`))return;
  const {F,D,db}=C();const b=F.writeBatch(db);b.update(D('users',me),{coins:coins-cost,owned:[...(prof.owned||[]),key],lastBuy:key});b.update(D('projects',it.id),{sales:F.increment(1),sold:F.increment(it.cut),lastBuyer:me});
  try{await b.commit();toast(`${it.title} unlocked! 🎉`);setTimeout(renderGamePage,300)}catch(e){toast('Couldn’t unlock: '+(e.code==='permission-denied'?'try again in a moment':e.message))}}

/* ---------- Hub page ---------- */
const HUES={aurora:'linear-gradient(120deg,#3b5bff,#9b6bff 45%,#ff9a5c)',ocean:'linear-gradient(120deg,#0b3a8f,#1aa0d8 60%,#2fe0d0)',ember:'linear-gradient(120deg,#5a1020,#e8601a 60%,#ffc15e)',forest:'linear-gradient(120deg,#063d22,#2fd67a 70%,#d6c36b)',night:'linear-gradient(120deg,#0b0b18,#3b1a78 60%,#7a2b9e)'};
function popularPosts(){const posts=[...(C()?.feed?.()?.values?.()||[])];const week=Date.now()-7*864e5;
  return posts.filter(p=>(p.at?.toMillis?.()||Date.now())>week).map(p=>({...p,score:(p.likes||[]).length*3+(p.views||0)+(p.ecomments||0)*2})).sort((a,b)=>b.score-a.score).slice(0,4)}
async function renderHub(){const box=$('#hubBox');if(!box)return;const name=C()?.profile?.()?.name;
  const hero=`<div class="hhero" style="background:${HUES[hubCfg.hue]||HUES.aurora}"><div class="hhero-in"><span class="hkick">${esc(hubCfg.kicker||'Lumen Hub')}</span><h1>${esc(hubCfg.title||(name?`Welcome back, ${name}.`:'Welcome to Lumen.'))}</h1><p>${esc(hubCfg.subtitle||'Games, friends, creators and everything else, in one place.')}</p>
    <div class="row" style="flex-wrap:wrap;gap:8px;margin-top:16px"><button class="btn-acc" data-goto="games">🎮 Play</button><button class="hdaily-btn" data-daily-jump>📅 Daily challenges</button><button data-goto="chat">💬 Chat</button><button data-goto="posts">📰 Posts</button>${isCreator()?'<button data-goto="creator">🛠 Create</button>':''}</div></div></div>
    ${hubCfg.announce?`<div class="hannounce">📣 ${L.fmt?L.fmt(hubCfg.announce):esc(hubCfg.announce)}</div>`:''}
    <div id="hubDaily" class="daily hub-daily"></div>`;
  if(!me){box.innerHTML=hero+`<div class="banner" style="margin-top:20px">Sign in (bottom-left) to see what's popular, play creators' games and become a Lumen creator.</div><h2 class="hsec">🎮 Games</h2><div class="hgrid">${allGames().map(g=>card(g)).join('')}</div>`;bindOpen(box);bindGo(box);return}
  const pinned=(hubCfg.pinned||[]).map(findItem).filter(Boolean);
  const top=allGames().sort((a,b)=>(plays[b.key]||0)-(plays[a.key]||0)).slice(0,6);
  const hot=allGames().filter(g=>trend[g.key]).sort((a,b)=>trend[b.key]-trend[a.key]).slice(0,8);
  const fresh=live.slice().sort((a,b)=>(b.at?.toMillis?.()||0)-(a.at?.toMillis?.()||0)).slice(0,6).map(p=>({...p,key:projKey(p)}));
  const posts=hubCfg.hidePosts?[]:popularPosts();
  const postHTML=await Promise.all(posts.map(async p=>{const u=await C().getUser(p.uid);const img=safeImg(p.image);
    return`<button class="hpost" data-goto="posts">${img?`<div class="hpimg" style="background-image:url('${img}')"></div>`:''}<div class="hpbody"><div class="hpuser">${C().pic(u,26)}<b>${C().nameHTML(u,{badges:false})}</b></div><p>${esc((p.text||'').replace(/^#{1,3}\s*/gm,'').slice(0,140))||'<span class="muted">Image post</span>'}</p><span class="muted">❤️ ${(p.likes||[]).length} · 👁 ${p.views||0} · 💬 ${p.ecomments||0}</span></div></button>`}));
  box.innerHTML=hero+
    (pinned.length?`<h2 class="hsec">⭐ Featured</h2><div class="hrow">${pinned.map(i=>card(i)).join('')}</div>`:'')+
    (hubCfg.hideTrend||!hot.length?'':`<h2 class="hsec">📈 Trending this week <button class="hsec-more" data-goto="games">Game hub →</button></h2><div class="hrow">${hot.map(g=>card(g)).join('')}</div>`)+
    (hubCfg.hideTop?'':`<h2 class="hsec">🔥 Most played</h2><div class="hgrid">${top.map(g=>card(g)).join('')}</div>`)+
    (posts.length?`<h2 class="hsec">📰 Popular this week</h2><div class="hposts">${postHTML.join('')}</div>`:'')+
    (hubCfg.hideNew||!fresh.length?'':`<h2 class="hsec">✨ New from Lumen creators</h2><div class="hgrid">${fresh.map(p=>card(p)).join('')}</div>`)+
    (isCreator()?'':`<div class="hcta card"><div><b>🛠 Make things for Lumen</b><p class="muted">Become a Lumen creator to get your games and websites onto the Hub, the Games tab and Web → Featured.</p></div><button class="btn-acc" data-goto="creator">${myApp?.status==='pending'?'Application sent ✓':'Apply'}</button></div>`);
  bindOpen(box);bindGo(box);fillCreators(box)}
function bindGo(root){root.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>L.go(b.dataset.goto));L.daily?.paint();
  root.querySelectorAll('[data-daily-jump]').forEach(b=>b.onclick=()=>$('#hubDaily')?.scrollIntoView({behavior:'smooth',block:'center'}))}

/* ---------- Games tab: creator games + hidden built-ins ---------- */
L.hub={gamesTab,play,openGame,mentionsIn,linkMentions,builtinHidden:key=>(hubCfg.hiddenBuiltins||[]).includes(key),
  featuredPage(el,openUrl){const sites=live.filter(p=>p.type==='site').sort((a,b)=>(plays[projKey(b)]||0)-(plays[projKey(a)]||0));
    el.innerHTML=`<div class="ytp"><div class="yt-top"><span class="yt-logo" style="background:linear-gradient(135deg,#ffd76a,#ff9a5c)">⭐</span><b>Featured</b><span class="muted" style="font-size:13px">Websites made by Lumen creators</span></div>
      ${sites.length?`<div class="hgrid">${sites.map(p=>card({...p,key:projKey(p)})).join('')}</div>`:`<p class="muted">No featured websites yet.${me?' Lumen creators can add theirs from the Creator Dashboard.':' Sign in to see them.'}</p>`}</div>`;
    el.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{const p=findItem(b.dataset.open);if(!p)return;play(b.dataset.open);openUrl(p.url)});fillCreators(el)},
  renderAdminTab};
// Games page: Play (games, daily challenges) and Create (the creator dashboard) in one place
let gTab='play';
function gamesTab(t){gTab=t==='create'?'create':'play';$$('#ghTabs [data-gt]').forEach(b=>b.classList.toggle('on',b.dataset.gt===gTab));$('#ghPlay').hidden=gTab!=='play';$('#ghCreate').hidden=gTab!=='create';if(gTab==='create')renderCreator();else renderGameHub()}
$$('#ghTabs [data-gt]').forEach(b=>b.onclick=()=>gamesTab(b.dataset.gt));
const prevView=L.onView;L.onView=v=>{prevView?.(v);if(v==='hub')renderHub();if(v==='games'&&gTab==='create')renderCreator();if(v==='games')renderGameHub();if(v!=='gamepage'){stopReviews()}else $('nav [data-v=games]')?.classList.add('on')};

/* ---------- images ---------- */
const readURL=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)});
const MAX_DOC=880000; // a Firestore record holds at most 1 MB
async function thumbFrom(file){if(file.size>3*1024*1024){toast('Pick an image smaller than 3 MB');return null}
  if(file.type==='image/gif'){const d=await readURL(file);if(d.length<MAX_DOC)return d} // small GIFs stay animated
  let img;try{img=await createImageBitmap(file)}catch{toast('That file isn’t an image Lumen can read');return null}
  for(const [max,q] of [[1600,.88],[1280,.85],[1280,.75],[1024,.72],[800,.7],[640,.62]]){const k=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);let out=c.toDataURL('image/webp',q);if(!out.startsWith('data:image/webp'))out=c.toDataURL('image/jpeg',q);if(out.length<MAX_DOC)return out}
  toast('Couldn’t shrink that image enough');return null}
async function gifInfo(file){const buf=new Uint8Array(await file.arrayBuffer());const sig=String.fromCharCode(...buf.slice(0,6));if(!/^GIF8[79]a$/.test(sig))return{ok:false,why:'That isn’t a GIF file.'};
  let transparent=false,frames=0;for(let i=0;i<buf.length-3;i++){if(buf[i]===0x21&&buf[i+1]===0xF9&&buf[i+2]===0x04){frames++;if(buf[i+3]&1)transparent=true}}
  return{ok:true,transparent,frames,w:buf[6]|buf[7]<<8,h:buf[8]|buf[9]<<8}}

/* ---------- Creator Dashboard ---------- */
let editing=null,newImage=null,cov={ix:50,iy:50,iz:100,ar:0};
function renderCreator(){const box=$('#creatorBox');if(!box)return;
  const ae=document.activeElement;if(ae&&box.contains(ae)&&ae.matches('input:not([type=file]),textarea'))return; // don't wipe a form mid-typing
  if(!me){box.innerHTML='<div class="banner">Sign in (bottom-left) to apply as a Lumen creator.</div>';return}
  if(!isCreator()){const st=myApp?.status;
    box.innerHTML=`<div class="cr-apply card"><div class="cr-steps"><div class="${st?'done':'now'}"><b>1</b>Apply</div><div class="${st==='pending'?'now':st==='approved'?'done':''}"><b>2</b>Admin review</div><div><b>3</b>Publish your projects</div></div>
      ${st==='pending'?`<h2>Application sent ✓</h2><p class="muted">The Lumen admin will review it soon. You'll get the Creator Dashboard as soon as you're accepted.</p>`:
        `${st==='rejected'?'<div class="banner">Your last application wasn’t accepted. You can update it and apply again.</div>':''}
        <h2>Become a Lumen creator</h2><p class="muted">Creators can publish their own games and websites on Lumen: the Hub, the Games tab and Web → Featured. Everything is reviewed by the admin before it goes live.</p>
        <label>What will you make?</label><textarea id="crAbout" rows="4" maxlength="600" placeholder="e.g. I make browser games with Scratch and JavaScript…">${esc(myApp?.about||'')}</textarea>
        <label>Links to your work (optional)</label><textarea id="crLinks" rows="2" maxlength="400" placeholder="https://…">${esc(myApp?.links||'')}</textarea>
        <button class="btn-acc" id="crApply" style="margin-top:14px">Send application</button>`}</div>`;
    $('#crApply')?.addEventListener('click',apply);return}
  const sum=f=>myProjects.reduce((a,p)=>a+f(p),0),itemWait=myItems.reduce((a,i)=>a+Math.max(0,(i.earned||0)-(i.paidEarned||0)),0),wait=sum(unpaid)+itemWait,itemTot=myItems.reduce((a,i)=>a+(i.earned||0),0);
  const tot=myProjects.reduce((a,p)=>a+(plays[projKey(p)]||0),0),liveN=myProjects.filter(p=>p.status==='approved').length,pend=myProjects.filter(p=>p.status==='pending').length,feat=myProjects.filter(p=>(hubCfg.pinned||[]).includes(projKey(p))).length;
  const f=editing||{};
  box.innerHTML=`<div class="card cr-earn"><div><span class="hkick">✦ Creator earnings</span><b class="cr-big">${fmtN(wait)} <small>Glow waiting</small></b>
      <span class="muted" style="font-size:13px">You've earned ✦ ${fmtN(sum(earned)+itemTot)} in total. Other people playing your games earn you <b>${RATE.min} per minute</b>, every post that mentions a game <b>${RATE.mention}</b>, every positive review <b>${RATE.review}</b>, and you keep <b>90% of every sale</b> of your shop items. Your own plays, posts and reviews don't count.</span></div>
      <button class="btn-acc" id="crCollect" ${wait?'':'disabled'}>Collect ✦ ${fmtN(wait)}</button></div>
    <div class="an-stats">${[['📦','Projects',myProjects.length],['✅','Live',liveN],['⏳','In review',pend],['▶','Total plays',tot],['⏱','Minutes played',sum(p=>p.minutes||0)],['💬','Mentions',sum(p=>p.mentions||0)],['👍','Positive reviews',sum(p=>p.upReviews||0)],['⭐','Featured',feat]].map(([i,l,v])=>`<div class="card an-stat"><span>${i} ${l}</span><b>${fmtN(v)}</b></div>`).join('')}</div>
    <div class="cr-grid"><div class="card"><h2>${editing?'Edit project':'New project'}</h2><p class="muted" style="font-size:13px">${isAdmin()?'You’re the admin, so it goes live straight away.':editing?'Changing the link, picture or type sends it back for review. Title, description, framing and price changes go live right away.':'It goes live once the admin approves it.'}</p>
      <label>Type</label><div class="seg" id="crType"><button type="button" data-t="game" class="${(f.type||'game')==='game'?'on':''}">🎮 Game</button><button type="button" data-t="site" class="${f.type==='site'?'on':''}">🌐 Website</button></div>
      <label>Title</label><input id="crTitle" maxlength="60" value="${esc(f.title||'')}" placeholder="My awesome game">
      <label>Link (must start with https://)</label><input id="crUrl" maxlength="500" value="${esc(f.url||linkCache.get(f.id)||'')}" placeholder="https://…">
      <div id="crPriceRow" ${(f.type||'game')==='game'?'':'hidden'}><label>Price to play in ✦ Glow <span class="muted" style="font-size:12px">(0 = free; you keep 90% of every unlock)</span></label><input id="crPrice" type="number" min="0" max="5000" step="10" value="${f.price||0}">
        <p class="muted" style="font-size:12px;margin:6px 0 0">Paid games are unlocked once per person. Their link is hidden until someone unlocks them.</p></div>
      <label>Short description</label><textarea id="crDesc" rows="2" maxlength="300">${esc(f.desc||'')}</textarea>
      <label>Cover image <span class="muted" style="font-size:12px">(up to 3 MB; small GIFs stay animated)</span></label><div class="row"><button type="button" id="crImgBtn">🖼 Upload</button><input type="file" id="crImg" accept="image/*" hidden><span class="muted" id="crImgName" style="font-size:12px">${f.image?'Image set':''}</span></div>
      <div class="pl-ed" id="covEd" ${(newImage||f.image)?'':'hidden'}><div class="hcard cov-prev"><div class="hart" id="covPrev" style="${art({image:newImage||f.image,...cov})}"></div><div class="hmeta"><b>${esc(f.title||'Your game')}</b><span class="pl">How it looks on the Hub and Game hub</span></div></div>
        <div class="pl-sl"><label>Zoom <span id="covZv">${cov.iz}%</span></label><input type="range" id="covZ" min="100" max="300" value="${cov.iz}">
          <label>Left ↔ right</label><input type="range" id="covX" min="0" max="100" value="${cov.ix}"><label>Up ↕ down</label><input type="range" id="covY" min="0" max="100" value="${cov.iy}">
          <button type="button" id="covC">⊕ Center</button><p class="muted">Tip: drag the picture to move it.</p></div></div>
      <div class="row" style="margin-top:16px"><button class="btn-acc" id="crSave" style="flex:1">${editing?'Save and resubmit':'Submit for review'}</button>${editing?'<button id="crCancel">Cancel</button>':''}</div>
      <p class="muted" style="font-size:12px;margin:10px 0 0">Tip: games must work when opened inside another page (most HTML5 games on itch.io, GitHub Pages or your own site do). Sites that refuse to be embedded will open in a new tab.</p></div>
    <div class="card"><h2>My projects</h2><div class="list">${myProjects.map(p=>{const st=(hubCfg.pinned||[]).includes(projKey(p))&&p.status==='approved'?['⭐ Featured','feat']:{approved:['● Live','live'],pending:['⏳ In review','pend'],rejected:['✕ Not approved','rej']}[p.status]||['?',''];
      return`<div class="cr-proj"><div class="hart mini" style="${art(p)}"></div><div class="info"><b>${esc(p.title)}</b><span><em class="pill ${st[1]}">${st[0]}</em> ${p.type==='site'?'Website':'Game'} · ▶ ${fmtN(plays[projKey(p)]||0)}${p.type==='game'?` · ⏱ ${fmtN(p.minutes||0)} min · 💬 ${fmtN(p.mentions||0)} · 👍 ${fmtN(p.upReviews||0)}${p.price>0?` · ✦ ${fmtN(p.price)} · ${fmtN(p.sales||0)} unlocked`:''}`:''}</span></div>
        ${p.status==='approved'&&p.type==='game'?`<button class="ib" data-page="${p.id}" title="Open its game page">↗</button>`:''}<button class="ib" data-edit="${p.id}" title="Edit">✏️</button><button class="ib" data-del="${p.id}" title="Delete">🗑</button></div>`}).join('')||'<p class="muted">Nothing yet. Submit your first project on the left.</p>'}</div></div></div>`+shopSection();
  $$('#crType button').forEach(b=>b.onclick=()=>{$$('#crType button').forEach(x=>x.classList.toggle('on',x===b));$('#crPriceRow').hidden=b.dataset.t!=='game'});
  bindCover();
  $('#crImgBtn').onclick=()=>$('#crImg').click();$('#crImg').onchange=async e=>{const fl=e.target.files[0];if(!fl)return;const out=await thumbFrom(fl);if(!out)return;newImage=out;cov={ix:50,iy:50,iz:100,ar:await imgRatio(out)};$('#covEd').hidden=false;bindCover();$('#crImgName').textContent=`✓ ${fl.name} (${(fl.size/1048576).toFixed(1)} MB${out.startsWith('data:image/gif')?', animated':''})`};
  $('#crSave').onclick=saveProject;$('#crCancel')?.addEventListener('click',()=>{editing=null;newImage=null;cov={ix:50,iy:50,iz:100,ar:0};renderCreator()});
  $('#crCollect').onclick=collect;bindShop(box);box.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>openGame('p_'+b.dataset.page));
  box.querySelectorAll('[data-edit]').forEach(b=>b.onclick=async()=>{editing=myProjects.find(p=>p.id===b.dataset.edit);if(editing.price>0)await gameLink(editing);newImage=null;cov={ix:editing.ix??50,iy:editing.iy??50,iz:editing.iz||100,ar:editing.ar||0};renderCreator();box.scrollIntoView({behavior:'smooth'})});
  box.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this project?'))return;try{await C().F.deleteDoc(C().D('projects',b.dataset.del))}catch(e){toast(e.message)}})}
const imgRatio=src=>new Promise(res=>{const i=new Image();i.onload=()=>res(Math.round(i.naturalWidth/i.naturalHeight*100)||160);i.onerror=()=>res(160);i.src=src});
/* drag a preview to move the picture; f(dxPercent,dyPercent) */
function dragMove(el,f){if(!el)return;el.style.touchAction='none';el.style.cursor='grab';el.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();el.setPointerCapture(e.pointerId);let lx=e.clientX,ly=e.clientY;const r=el.getBoundingClientRect();el.style.cursor='grabbing';
  el.onpointermove=ev=>{f((ev.clientX-lx)/r.width*100,(ev.clientY-ly)/r.height*100);lx=ev.clientX;ly=ev.clientY};el.onpointerup=el.onpointercancel=()=>{el.onpointermove=null;el.style.cursor='grab'}}}
const clampP=v=>Math.max(0,Math.min(100,v));
function bindCover(){const prev=$('#covPrev');if(!prev)return;const img=newImage||editing?.image;
  const draw=()=>{prev.setAttribute('style',art({image:img,...cov}));$('#covZv').textContent=Math.round(cov.iz)+'%';$('#covZ').value=cov.iz;$('#covX').value=cov.ix;$('#covY').value=cov.iy};draw();
  $('#covZ').oninput=e=>{cov.iz=+e.target.value;draw()};$('#covX').oninput=e=>{cov.ix=+e.target.value;draw()};$('#covY').oninput=e=>{cov.iy=+e.target.value;draw()};
  $('#covC').onclick=()=>{cov.ix=50;cov.iy=50;draw()};
  dragMove(prev,(dx,dy)=>{cov.ix=clampP(cov.ix-dx*1.6);cov.iy=clampP(cov.iy-dy*1.6);draw()});
  if(img&&!cov.ar)imgRatio(img).then(a=>{cov.ar=a;draw()})}

/* ---------- shop creations ---------- */
const CTYPES={fx:['✨','Profile effect','Plays over the big profile card, like the rain and snow effects. A wide, looping transparent GIF works best.',['fill','tile','place']],
  deco:['💫','Avatar decoration','Sits around the profile picture, like a frame, halo or crown. A square image with a see-through middle works best.',['place']],
  plate:['🎴','Nameplate','Fills the background behind the name in member lists. A wide image works best.',['fill','place']],
  sticker:['🏷️','Sticker','A small picture people place anywhere on their profile bar (beta). Use a PNG or GIF with a transparent background, cropped close to the drawing. Making and buying stickers needs Lumen Lite.',['place']]};
const MODES={fill:['🖼 Fill','Covers the whole area; zoom and move it'],tile:['🔁 Repeat','Repeats as a pattern; set the tile size'],place:['📍 Place','Put it exactly where you want, at any size']};
let shopEdit=null,shopImg=null,shopSrc='gif',shopType='fx',pl={mode:'fill',x:50,y:50,scale:100,op:100};const PREV='c_preview00000000';
const plDefault=(type,mode)=>({mode,x:50,y:50,scale:mode==='tile'?33:mode==='place'?(type==='deco'?100:40):100,op:100});
function cosPreview(type,id){const c=C(),u=c.profile()||{name:'You'};
  if(type==='fx')return c.card({...u,fx:id,bio:''},{compact:true});
  if(type==='deco')return`<div style="display:grid;place-items:center;padding:24px">${c.pic({...u,deco:id},96)}</div>`;
  if(type==='sticker')return`<div class="prev-plate${L.cos.plateCls(u.plate)}" style="position:relative">${L.cos.stickerLayer([{id,x:72,y:50,s:110,r:-8}])}${c.pic(u,36)}<div><div style="font-weight:600">${c.nameHTML(u,{badges:false})}</div><div style="font-size:12px;opacity:.8">Online</div></div></div>`;
  return`<div class="prev-plate${L.cos.plateCls(id)}">${c.pic(u,36)}<div><div style="font-weight:600">${c.nameHTML(u,{badges:false})}</div><div style="font-size:12px;opacity:.8">Online</div></div></div>`}
function shopSection(){const f=shopEdit||{};const modes=CTYPES[shopType][3];
  const st={approved:['● In the Shop','live'],pending:['⏳ In review','pend'],rejected:['✕ Not approved','rej']};
  const sizeLbl=pl.mode==='tile'?'Tile size':pl.mode==='fill'?'Zoom':'Size';
  return`<div class="card cr-shop"><h2>🎨 Shop creations</h2><p class="muted" style="margin-top:0">Make your own profile effects, avatar decorations, nameplates and (with Lumen Lite) stickers from a <b>GIF</b> or a <b>photo</b>, then place it exactly where you want. Once the admin approves it, it's sold in <b>Shop → 🛠 Creator</b> and you keep <b>90% of every sale</b>.</p>
    <div class="cr-grid"><div><h3 style="margin:6px 0 0">${shopEdit?'Edit item':'New item'}</h3>${shopEdit&&!isAdmin()?'<p class="muted" style="font-size:12px;margin:4px 0 0">Name, description, price and placement changes go live right away. A new picture or type goes back for review.</p>':''}
      <label>Type</label><div class="seg" id="csType">${Object.entries(CTYPES).map(([k,[i,l]])=>`<button type="button" data-ct="${k}" class="${shopType===k?'on':''}">${i} ${l}${k==='sticker'?(L.plan?.lite()?' <em class="pill pend" style="font-size:9px">BETA</em>':' 🔒'):''}</button>`).join('')}</div>
      <p class="muted" style="font-size:12.5px;margin:8px 0 0">${CTYPES[shopType][2]}</p>
      <label>Picture</label><div class="seg" id="csSrc"><button type="button" data-src="gif" class="${shopSrc==='gif'?'on':''}">🎞 Animated GIF</button><button type="button" data-src="photo" class="${shopSrc==='photo'?'on':''}">🖼 Photo</button></div>
      <p class="muted" style="font-size:12px;margin:6px 0 0">${shopSrc==='gif'?`A GIF with a transparent background, up to ${L.plan?.uploadMB()||4} MB.`:`A PNG, JPG or WebP up to ${Math.max(3,L.plan?.uploadMB()||3)} MB. PNGs keep their transparent background${L.plan?.lite()?'':'; Lumen shrinks big photos to fit'}.`}${L.plan?.lite()?' <span class="ptag ptag-lite">LITE</span>':''}</p>
      <div class="row" style="margin-top:8px"><button type="button" id="csFileBtn">${shopSrc==='gif'?'🎞 Choose GIF':'🖼 Choose photo'}</button><input type="file" id="csFile" accept="${shopSrc==='gif'?'image/gif':'image/png,image/jpeg,image/webp'}" hidden><span class="muted" id="csFileName" style="font-size:12px">${shopImg?(shopEdit&&!shopEdit._new?'Current picture':'✓ Picture ready'):''}</span></div>
      <label>Name</label><input id="csName" maxlength="30" value="${esc(f.name||'')}" placeholder="Neon rain">
      <label>Short description (optional)</label><input id="csDesc" maxlength="120" value="${esc(f.desc||'')}">
      <label>Price in ✦ Glow (50 to 5,000)</label><input id="csPrice" type="number" min="50" max="5000" step="10" value="${f.price||300}">
      <div class="row" style="margin-top:16px"><button class="btn-acc" id="csSave" style="flex:1">${shopEdit?'Save and resubmit':'Submit for review'}</button>${shopEdit?'<button id="csCancel">Cancel</button>':''}</div></div>
    <div><label>Preview <span class="muted" style="font-size:12px">${shopImg?'· drag it to move the picture':''}</span></label><div class="cs-prev" id="csPrev">${shopImg?cosPreview(shopType,PREV):'<p class="muted" style="padding:30px;text-align:center">Choose a picture to see it here.</p>'}</div>
      <div class="pl-ed2" ${shopImg&&shopType!=='sticker'?'':'hidden'}>${modes.length>1?`<label>How it appears</label><div class="seg" id="csMode">${modes.map(m=>`<button type="button" data-cm="${m}" class="${pl.mode===m?'on':''}" title="${MODES[m][1]}">${MODES[m][0]}</button>`).join('')}</div><p class="muted" style="font-size:12px;margin:6px 0 0">${MODES[pl.mode][1]}.</p>`:''}
        <div class="pl-grid"><div><label>${sizeLbl} <span id="csSv">${pl.scale}%</span></label><input type="range" id="csS" min="${pl.mode==='fill'?100:10}" max="${pl.mode==='fill'?300:pl.mode==='tile'?100:250}" value="${pl.scale}"></div>
          <div><label>Opacity <span id="csOv">${pl.op}%</span></label><input type="range" id="csO" min="10" max="100" value="${pl.op}"></div>
          <div><label>Left ↔ right</label><input type="range" id="csX" min="0" max="100" value="${pl.x}"></div>
          <div><label>Up ↕ down</label><input type="range" id="csY" min="0" max="100" value="${pl.y}"></div></div>
        <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button type="button" id="csCenter">⊕ Center</button>${['↖ Top left:0:0','↗ Top right:100:0','↙ Bottom left:0:100','↘ Bottom right:100:100'].map(t=>{const [l,x,y]=t.split(':');return`<button type="button" data-snap="${x},${y}">${l}</button>`}).join('')}</div></div></div></div>
    <h3>My shop items</h3><div class="list">${myItems.map(i=>{const s=st[i.status]||['?',''];return`<div class="cr-proj"><div class="cs-mini">${cosPreview(i.type,i.id)}</div><div class="info"><b>${esc(i.name)}</b><span><em class="pill ${s[1]}">${s[0]}</em> ${CTYPES[i.type]?.[1]||''} · ✦ ${fmtN(i.price)} · ${fmtN(i.sales||0)} sold · earned ✦ ${fmtN(i.earned||0)}</span></div>
      ${i.status==='approved'?(i.type==='sticker'?`<button class="ib" data-cseq="${i.id}" title="Place on my profile bar (free for you)">📌</button>`:`<button class="ib" data-cseq="${i.id}" title="${C().profile()?.[i.type]===i.id?'Unequip':'Equip (free for you)'}">${C().profile()?.[i.type]===i.id?'✅':'👕'}</button>`):''}<button class="ib" data-csedit="${i.id}" title="Edit">✏️</button><button class="ib" data-csdel="${i.id}" title="Delete">🗑</button></div>`}).join('')||'<p class="muted">None yet.</p>'}</div></div>`}
function applyPl(){if(!shopImg)return;L.cos.previewRule(PREV,shopImg,pl);const q=id=>$(id);if(q('#csS')){q('#csS').value=pl.scale;q('#csSv').textContent=Math.round(pl.scale)+'%';q('#csO').value=pl.op;q('#csOv').textContent=pl.op+'%';q('#csX').value=pl.x;q('#csY').value=pl.y}}
function bindShop(box){
  box.querySelectorAll('[data-ct]').forEach(b=>b.onclick=()=>{if(b.dataset.ct==='sticker'&&!L.plan?.lite()){toast('Making stickers needs Lumen Lite (Shop → Lumen Lite)');return}shopType=b.dataset.ct;const ms=CTYPES[shopType][3];if(!ms.includes(pl.mode))pl=plDefault(shopType,ms[0]);keepForm();renderCreator()});
  box.querySelectorAll('[data-src]').forEach(b=>b.onclick=()=>{if(shopSrc===b.dataset.src)return;shopSrc=b.dataset.src;keepForm();renderCreator()});
  box.querySelectorAll('[data-cm]').forEach(b=>b.onclick=()=>{pl=plDefault(shopType,b.dataset.cm);keepForm();renderCreator()});
  if(shopImg)L.cos.previewRule(PREV,shopImg,pl);
  const sl=(id,k)=>{const el=$(id);if(el)el.oninput=e=>{pl[k]=+e.target.value;applyPl()}};sl('#csS','scale');sl('#csO','op');sl('#csX','x');sl('#csY','y');
  $('#csCenter')&&($('#csCenter').onclick=()=>{pl.x=50;pl.y=50;applyPl()});
  box.querySelectorAll('[data-snap]').forEach(b=>b.onclick=()=>{const [x,y]=b.dataset.snap.split(',').map(Number);pl.x=x;pl.y=y;applyPl()});
  // drag on the preview: a small picture follows the pointer; a big one (fill) moves the other way, like panning
  if(shopImg)dragMove($('#csPrev'),(dx,dy)=>{const k=pl.mode==='fill'?-1.6:pl.mode==='tile'?-1:1/Math.max(.15,1-pl.scale/100);pl.x=clampP(pl.x+dx*k);pl.y=clampP(pl.y+dy*k);applyPl()});
  $('#csFileBtn').onclick=()=>$('#csFile').click();
  $('#csFile').onchange=async e=>{const fl=e.target.files[0];if(!fl)return;let d;
    if(shopSrc==='gif'){const info=await gifInfo(fl);if(!info.ok)return toast(info.why);if(!info.transparent)return toast('That GIF has no transparent background. Export it with transparency (e.g. ezgif.com → Effects → Transparency), or switch to Photo.');
      const mb=L.plan?.uploadMB()||4;if(fl.size>mb*1024*1024)return toast(`That GIF is ${(fl.size/1048576).toFixed(1)} MB. Your limit is ${mb} MB${mb<15?(mb<10?' (Lumen Lite raises it to 10 MB)':' (Upgrade raises it to 15 MB)'):''}.`);d=await readURL(fl)}
    else{d=await photoFrom(fl);if(!d)return}
    keepForm();shopImg=d;if(shopEdit)shopEdit._new=true;renderCreator();$('#csFileName')&&($('#csFileName').textContent='✓ '+fl.name)};
  $('#csSave').onclick=saveItem;$('#csCancel')?.addEventListener('click',()=>{shopEdit=null;shopImg=null;formKeep=null;pl=plDefault(shopType,CTYPES[shopType][3][0]);renderCreator()});
  box.querySelectorAll('[data-csedit]').forEach(b=>b.onclick=async()=>{const it=myItems.find(i=>i.id===b.dataset.csedit);const s=await C().F.getDoc(C().D('shopImgs',it.id)).catch(()=>null);const d=s?.data()||{};if(d.parts>0){const ps=await Promise.all([...Array(d.parts).keys()].map(i=>C().F.getDoc(C().D('shopImgs',it.id,'parts',String(i))).then(x=>x.data()?.d||'').catch(()=>'')));d.data=ps.join('')}
    shopEdit={...it};shopType=it.type;shopImg=d.data||null;shopSrc=/^data:image\/gif/.test(d.data||'')?'gif':'photo';formKeep=null;
    pl={mode:it.mode||'fill',x:d.x??50,y:d.y??50,scale:d.scale??(it.mode==='tile'?33:100),op:d.op??100};renderCreator();$('.cr-shop')?.scrollIntoView({behavior:'smooth'})});
  box.querySelectorAll('[data-cseq]').forEach(b=>b.onclick=async()=>{await L.equipOwn?.(b.dataset.cseq);renderCreator()});
  box.querySelectorAll('[data-csdel]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this shop item? People who bought it keep it in their list but it stops showing.'))return;const {F,D,db}=C();const bt=F.writeBatch(db);bt.delete(D('shopItems',b.dataset.csdel));bt.delete(D('shopImgs',b.dataset.csdel));for(let i=0;i<24;i++)bt.delete(D('shopImgs',b.dataset.csdel,'parts',String(i)));try{await bt.commit();toast('Deleted')}catch(e){toast(e.message)}});
  if(formKeep){for(const [k,v] of Object.entries(formKeep)){const el=$(k);if(el)el.value=v}formKeep=null}}
// the form re-renders when the type/picture/mode changes: keep what was typed
const PART=900000;let formKeep=null;const keepForm=()=>{formKeep={'#csName':$('#csName')?.value,'#csDesc':$('#csDesc')?.value,'#csPrice':$('#csPrice')?.value}};
async function photoFrom(file){const mb=Math.max(3,L.plan?.uploadMB()||3);if(file.size>mb*1024*1024){toast(`Pick a photo smaller than ${mb} MB`);return null}if(!/^image\/(png|jpeg|webp)$/.test(file.type)){toast('Use a PNG, JPG or WebP photo');return null}
  const d=await readURL(file);if(d.length<(L.plan?.lite()?L.plan.maxParts()*PART:880000))return d;
  let img;try{img=await createImageBitmap(file)}catch{toast('That photo couldn’t be read');return null}
  for(const [max,q] of [[1400,.9],[1200,.85],[1000,.8],[800,.75],[640,.7]]){const k=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);let out=c.toDataURL('image/webp',q);if(!out.startsWith('data:image/webp'))out=c.toDataURL(file.type==='image/jpeg'?'image/jpeg':'image/png',q);if(out.length<880000)return out}
  toast('Couldn’t shrink that photo enough');return null}
async function saveItem(){const {F,D,db}=C();const name=$('#csName').value.trim(),desc=$('#csDesc').value.trim(),price=Math.round((+$('#csPrice').value||0)/10)*10;
  if(shopType==='sticker'&&!L.plan?.lite())return toast('Making stickers needs Lumen Lite');
  if(name.length<2)return toast('Give it a name');if(!(price>=50&&price<=5000))return toast('The price must be between 50 and 5,000 Glow');if(!shopImg)return toast('Choose a GIF or photo');
  const mode=CTYPES[shopType][3].includes(pl.mode)?pl.mode:CTYPES[shopType][3][0];
  const big=!shopEdit||shopEdit._new||shopType!==shopEdit.type; // a new picture or type needs review (the admin skips it)
  const id=shopEdit?.id||('c_'+[...crypto.getRandomValues(new Uint8Array(14))].map(x=>'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'[x%56]).join(''));
  const r=v=>Math.round(v);const b=F.writeBatch(db);const base={name:name.slice(0,30),desc:desc.slice(0,120),price,cut:price*9/10,mode,at:F.serverTimestamp()};
  if(!big)b.update(D('shopItems',id),base);
  else{const data={...base,type:shopType,status:isAdmin()?'approved':'pending'};if(shopEdit)b.update(D('shopItems',id),data);else b.set(D('shopItems',id),{...data,uid:me})}
  // a Firestore record holds at most 1 MB, so a big picture is split into pieces (shopImgs/{id}/parts/0…23); 8 pieces per write
  const parts=shopImg.length>PART?Math.ceil(shopImg.length/PART):0;if(parts>(L.plan?.maxParts()||8)){$('#csSave').disabled=false;return toast('That picture is too big for your plan')}
  const later=[];
  const place={mode,type:shopType,x:r(pl.x),y:r(pl.y),scale:Math.max(10,Math.min(400,r(pl.scale))),op:Math.max(10,Math.min(100,r(pl.op)))};
  if(!big&&!shopEdit._new){const cur=(await F.getDoc(D('shopImgs',id))).data()||{};b.set(D('shopImgs',id),{...cur,...place,uid:me})}
  else{b.set(D('shopImgs',id),{uid:me,data:parts?'':shopImg,...(parts?{parts}:{}),...place});for(let i=0;i<parts;i++)(i<8?b:(later[(i>>3)-1]||=F.writeBatch(db))).set(D('shopImgs',id,'parts',String(i)),{d:shopImg.slice(i*PART,(i+1)*PART)})}
  $('#csSave').disabled=true;try{await b.commit();if(later.length&&!shopEdit)shopEdit={id,type:shopType,status:isAdmin()?'approved':'pending',_new:true};for(const x of later){toast('Uploading… '+Math.round(100*(later.indexOf(x)+1)/(later.length+1))+'%');await x.commit()}toast(!big?'Saved: your changes are live':isAdmin()?'Published to the Shop':shopEdit?'Saved: back in review':'Submitted for review');L.cos.previewRule(id,shopImg,{...pl,mode});shopEdit=null;shopImg=null;formKeep=null;pl=plDefault(shopType,CTYPES[shopType][3][0]);renderCreator()}
  catch(e){toast('Couldn’t save: '+(e.code==='permission-denied'?'Firebase refused it (re-publish the latest rules?)':e.message));$('#csSave').disabled=false}}

async function apply(){const about=$('#crAbout').value.trim();if(about.length<10)return toast('Tell the admin a little about what you’ll make');
  try{await C().F.setDoc(C().D('creatorApps',me),{uid:me,about:about.slice(0,600),links:$('#crLinks').value.trim().slice(0,400),status:'pending',at:C().F.serverTimestamp()});toast('Application sent')}catch(e){toast('Couldn’t apply: '+e.message)}}
async function saveProject(){const {F,D,db}=C();const type=$('#crType .on')?.dataset.t||'game',title=$('#crTitle').value.trim(),url=$('#crUrl').value.trim(),desc=$('#crDesc').value.trim();
  if(title.length<2)return toast('Give it a title');if(!/^https:\/\/\S+$/i.test(url))return toast('The link must start with https://');
  const price=type==='game'?Math.max(0,Math.min(5000,Math.round((+$('#crPrice')?.value||0)/10)*10)):0,cut=price*9/10;
  const image=newImage??editing?.image??'';const framing={};
  if(image){if(!cov.ar)cov.ar=await imgRatio(image);Object.assign(framing,{ix:Math.round(cov.ix),iy:Math.round(cov.iy),iz:Math.round(cov.iz),ar:Math.max(5,Math.min(2000,Math.round(cov.ar)||160))})}
  const oldUrl=editing?(editing.url||linkCache.get(editing.id)||''):'';
  // the link, picture, type or free/paid switch changed: that needs review (the admin skips it)
  const big=!editing||newImage||type!==editing.type||url!==oldUrl||(price>0)!==(editing.price>0);
  const b=F.writeBatch(db);const ref=editing?D('projects',editing.id):F.doc(F.collection(db,'projects'));
  if(!big){b.update(ref,{title:title.slice(0,60),desc:desc.slice(0,300),...framing,price,cut,at:F.serverTimestamp()})}
  else{const data={type,title:title.slice(0,60),url:price>0?'':url.slice(0,500),desc:desc.slice(0,300),image,...framing,price,cut,status:isAdmin()?'approved':'pending',at:F.serverTimestamp()};
    if(editing)b.update(ref,data);else b.set(ref,{...data,uid:me,featured:false});
    if(price>0)b.set(F.doc(db,'projects',ref.id,'private','link'),{url:url.slice(0,500)})}
  try{await b.commit();if(price>0)linkCache.set(ref.id,url);toast(!big?'Saved: your changes are live':isAdmin()?'Published':editing?'Saved: back in review':'Submitted for review');editing=null;newImage=null;cov={ix:50,iy:50,iz:100,ar:0};renderCreator()}
  catch(e){toast('Couldn’t save: '+(e.code==='permission-denied'?'Firebase refused it (re-publish the latest rules?)':e.message))}}

/* ---------- admin tabs ---------- */
function renderAdminTab(tab,el){const {F,D}=C();const upd=async(ref,data,msg)=>{try{await F.updateDoc(ref,data);if(msg)toast(msg)}catch(e){toast(e.code==='permission-denied'?'Firebase refused this. Re-publish the latest firestore.rules.':e.message)}};
  if(tab==='creators'){const pend=allApps.filter(a=>a.status==='pending'),ok=allApps.filter(a=>a.status==='approved');
    el.innerHTML=`<div class="adm-cols"><div class="card"><h2>⏳ Applications <em class="count">${pend.length}</em></h2><div class="list">${pend.map(a=>`<div class="adm-app"><div class="row" style="gap:10px"><b data-uname="${a.id}">…</b><span class="muted" style="font-size:12px">${a.at?.toDate?.().toLocaleDateString()||''}</span></div><p>${esc(a.about||'')}</p>${a.links?`<p class="muted" style="font-size:12.5px">${L.fmt?L.fmt(a.links):esc(a.links)}</p>`:''}
        <div class="row"><button class="btn-acc" data-appok="${a.id}">✓ Accept</button><button data-appno="${a.id}">✕ Reject</button></div></div>`).join('')||'<p class="muted">No applications waiting.</p>'}</div></div>
      <div class="card"><h2>🛠 Creators <em class="count">${ok.length}</em></h2><div class="list">${ok.map(a=>`<div class="person"><div class="info"><b data-uname="${a.id}">…</b><span>${allProjects.filter(p=>p.uid===a.id).length} projects</span></div><button class="ib" data-revoke="${a.id}" title="Remove creator access">⛔</button></div>`).join('')||'<p class="muted">No creators yet.</p>'}</div></div></div>`;
    el.querySelectorAll('[data-uname]').forEach(async b=>{const u=await C().getUser(b.dataset.uname);b.textContent=u.name||b.dataset.uname});
    el.querySelectorAll('[data-appok]').forEach(b=>b.onclick=()=>upd(D('creatorApps',b.dataset.appok),{status:'approved'},'Accepted as a Lumen creator'));
    el.querySelectorAll('[data-appno]').forEach(b=>b.onclick=()=>upd(D('creatorApps',b.dataset.appno),{status:'rejected'},'Application rejected'));
    el.querySelectorAll('[data-revoke]').forEach(b=>b.onclick=()=>{if(confirm('Remove this person’s creator access? Their projects stay until you delete them.'))upd(D('creatorApps',b.dataset.revoke),{status:'rejected'},'Creator access removed')});return}
  if(tab==='projects'){const pend=allProjects.filter(p=>p.status==='pending'),liveP=allProjects.filter(p=>p.status==='approved'),rej=allProjects.filter(p=>p.status==='rejected');
    const row=(p,acts)=>`<div class="adm-proj"><div class="hart mini" style="${art(p)}"></div><div class="info"><b>${esc(p.title)}</b><span>${p.type==='site'?'🌐 Website':'🎮 Game'} · <span data-uname="${p.uid}">…</span> · ▶ ${fmtN(plays[projKey(p)]||0)}</span>${p.price>0?`<span class="muted" style="font-size:12px">🔒 Paid game · ✦ ${fmtN(p.price)} · ${fmtN(p.sales||0)} unlocked · <a href="#" data-showlink="${p.id}">show link</a></span>`:`<a href="${esc(p.url)}" target="_blank" rel="noopener" class="muted" style="font-size:12px;word-break:break-all">${esc(p.url)}</a>`}${p.desc?`<p class="muted" style="font-size:12.5px;margin:4px 0 0">${esc(p.desc)}</p>`:''}</div><div class="acts">${acts}</div></div>`;
    el.innerHTML=`<div class="card"><h2>⏳ Review queue <em class="count">${pend.length}</em></h2><div class="list">${pend.map(p=>row(p,`<button class="ib" data-try="${p.id}" title="Try it">▶</button><button class="btn-acc" data-pok="${p.id}">Approve</button><button data-pno="${p.id}">Reject</button>`)).join('')||'<p class="muted">Nothing waiting for review.</p>'}</div></div>
      <div class="card" style="margin-top:16px"><h2>● Live on Lumen <em class="count">${liveP.length}</em></h2><div class="list">${liveP.map(p=>row(p,`<button class="ib" data-try="${p.id}" title="Try it">▶</button><button class="ib" data-pin="${p.id}" title="${(hubCfg.pinned||[]).includes(projKey(p))?'Unfeature':'Feature on the Hub'}">${(hubCfg.pinned||[]).includes(projKey(p))?'⭐':'☆'}</button><button class="ib" data-pno="${p.id}" title="Hide (send back to rejected)">🙈</button><button class="ib" data-pdel="${p.id}" title="Delete">🗑</button>`)).join('')||'<p class="muted">No creator projects live yet.</p>'}</div></div>
      <div class="card" style="margin-top:16px"><h2>🎮 Built-in games</h2><div class="list">${BUILTINS.map(g=>`<div class="person"><div class="info"><b>${g.title}</b><span>▶ ${fmtN(plays[g.key]||0)} plays · ${(hubCfg.hiddenBuiltins||[]).includes(g.key)?'hidden':'showing'}</span></div><button class="ib" data-pin="${g.key}" title="Feature on the Hub">${(hubCfg.pinned||[]).includes(g.key)?'⭐':'☆'}</button><button class="ib" data-hideb="${g.key}" title="Show or hide on the Games tab">${(hubCfg.hiddenBuiltins||[]).includes(g.key)?'🙈':'👁'}</button></div>`).join('')}</div></div>
      ${rej.length?`<div class="card" style="margin-top:16px"><h2>✕ Not approved / hidden <em class="count">${rej.length}</em></h2><div class="list">${rej.map(p=>row(p,`<button class="ib" data-pok="${p.id}" title="Approve">✓</button><button class="ib" data-pdel="${p.id}" title="Delete">🗑</button>`)).join('')}</div></div>`:''}`;
    el.querySelectorAll('[data-uname]').forEach(async b=>{const u=await C().getUser(b.dataset.uname);b.textContent=u.name||'creator'});
    const get=id=>allProjects.find(p=>p.id===id);
    el.querySelectorAll('[data-try]').forEach(b=>b.onclick=async()=>{const p=get(b.dataset.try);const u=await gameLink(p);if(!u)return toast('No link');if(p.type==='site')L.browser.open(u);else L.openView(u,p.title,{kind:'game',label:p.title})});
    el.querySelectorAll('[data-showlink]').forEach(a=>a.onclick=async e=>{e.preventDefault();const u=await gameLink(get(a.dataset.showlink));a.outerHTML=u?`<a href="${esc(u)}" target="_blank" rel="noopener" style="word-break:break-all">${esc(u)}</a>`:'no link'});
    el.querySelectorAll('[data-pok]').forEach(b=>b.onclick=()=>upd(D('projects',b.dataset.pok),{status:'approved'},'Approved: it’s live'));
    el.querySelectorAll('[data-pno]').forEach(b=>b.onclick=()=>upd(D('projects',b.dataset.pno),{status:'rejected'},'Hidden from Lumen'));
    el.querySelectorAll('[data-pdel]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this project for good?'))return;try{await F.deleteDoc(D('projects',b.dataset.pdel));toast('Deleted')}catch(e){toast(e.message)}});
    el.querySelectorAll('[data-pin]').forEach(b=>b.onclick=()=>{const key=b.dataset.pin.startsWith('b_')?b.dataset.pin:'p_'+b.dataset.pin;const pin=new Set(hubCfg.pinned||[]);pin.has(key)?pin.delete(key):pin.add(key);saveHub({pinned:[...pin]})});
    el.querySelectorAll('[data-hideb]').forEach(b=>b.onclick=()=>{const h=new Set(hubCfg.hiddenBuiltins||[]);h.has(b.dataset.hideb)?h.delete(b.dataset.hideb):h.add(b.dataset.hideb);saveHub({hiddenBuiltins:[...h]})});return}
  if(tab==='shop'){const pend=allItems.filter(i=>i.status==='pending'),liveI=allItems.filter(i=>i.status==='approved'),rej=allItems.filter(i=>i.status==='rejected');
    const row=(i,acts)=>`<div class="adm-item"><div class="cs-mini big">${cosPreview(i.type,i.id)}</div><div class="info"><b>${esc(i.name)}</b><span>${CTYPES[i.type]?.[0]} ${CTYPES[i.type]?.[1]} · ✦ ${fmtN(i.price)} · <span data-uname="${i.uid}">…</span>${i.sales?` · ${fmtN(i.sales)} sold`:''}</span>${i.desc?`<p class="muted" style="font-size:12.5px;margin:4px 0 0">${esc(i.desc)}</p>`:''}<div class="acts">${acts}</div></div></div>`;
    el.innerHTML=`<div class="card"><h2>⏳ Waiting for review <em class="count">${pend.length}</em></h2><p class="muted" style="font-size:13px;margin-top:0">Check that each GIF looks good, is transparent and is appropriate before it goes into the Shop.</p><div class="adm-items">${pend.map(i=>row(i,`<button class="btn-acc" data-iok="${i.id}">✓ Approve</button><button data-ino="${i.id}">✕ Reject</button>`)).join('')||'<p class="muted">Nothing waiting.</p>'}</div></div>
      <div class="card" style="margin-top:16px"><h2>● In the Shop <em class="count">${liveI.length}</em></h2><div class="adm-items">${liveI.map(i=>row(i,`<button data-ino="${i.id}">🙈 Take down</button><button data-idel="${i.id}">🗑 Delete</button>`)).join('')||'<p class="muted">No creator items in the Shop yet.</p>'}</div></div>
      ${rej.length?`<div class="card" style="margin-top:16px"><h2>✕ Not approved <em class="count">${rej.length}</em></h2><div class="adm-items">${rej.map(i=>row(i,`<button data-iok="${i.id}">✓ Approve</button><button data-idel="${i.id}">🗑 Delete</button>`)).join('')}</div></div>`:''}`;
    el.querySelectorAll('[data-uname]').forEach(async b=>{const u=await C().getUser(b.dataset.uname);b.textContent='by '+(u.name||'creator')});
    el.querySelectorAll('[data-iok]').forEach(b=>b.onclick=async()=>{const it=allItems.find(i=>i.id===b.dataset.iok);b.disabled=true;
      const img=await L.cos.loadImg(it.id).catch(()=>null);
      if(!img||img.broken){b.disabled=false;return toast('This picture didn’t finish uploading, so it would show up broken. Ask the creator to open it on Games → Create and press Save again.')}
      const ok=await new Promise(r=>{const im=new Image();im.onload=()=>r(im.naturalWidth>0);im.onerror=()=>r(false);im.src=img.data});
      if(!ok){b.disabled=false;return toast('That picture can’t be opened (the file is damaged). Ask the creator to upload it again.')}
      L.cos.refresh(it.id,'approved:'+Date.now());await upd(D('shopItems',it.id),{status:'approved',cut:Math.round(it.price*9/10),at:F.serverTimestamp()},'Approved: it’s in the Shop, ready to buy and wear');b.disabled=false});
    el.querySelectorAll('[data-ino]').forEach(b=>b.onclick=()=>upd(D('shopItems',b.dataset.ino),{status:'rejected'},'Not approved'));
    el.querySelectorAll('[data-idel]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this item for good?'))return;const bt=F.writeBatch(C().db);bt.delete(D('shopItems',b.dataset.idel));bt.delete(D('shopImgs',b.dataset.idel));for(let i=0;i<8;i++)bt.delete(D('shopImgs',b.dataset.idel,'parts',String(i)));try{await bt.commit();toast('Deleted')}catch(e){toast(e.message)}});return}
  if(tab==='hub'){el.innerHTML=`<div class="adm-cols"><div class="card"><h2>🏠 Hub banner</h2>
      <label>Small label</label><input id="hbKick" maxlength="40" value="${esc(hubCfg.kicker||'')}" placeholder="Lumen Hub">
      <label>Headline</label><input id="hbTitle" maxlength="80" value="${esc(hubCfg.title||'')}" placeholder="Welcome back, NAME. (default)">
      <label>Subtitle</label><input id="hbSub" maxlength="160" value="${esc(hubCfg.subtitle||'')}" placeholder="Games, friends, creators and everything else, in one place.">
      <label>Colour</label><div class="seg" id="hbHue">${Object.entries(HUES).map(([k,g])=>`<button type="button" data-h="${k}" class="${(hubCfg.hue||'aurora')===k?'on':''}" style="background:${g};color:#fff">${k}</button>`).join('')}</div>
      <label>Announcement (optional, shows under the banner)</label><textarea id="hbAnn" rows="2" maxlength="300">${esc(hubCfg.announce||'')}</textarea></div>
    <div class="card"><h2>🧩 Sections</h2>
      <label class="chk"><input type="checkbox" id="hbTrend" ${hubCfg.hideTrend?'':'checked'}> 📈 Trending games this week</label>
      <label class="chk"><input type="checkbox" id="hbTop" ${hubCfg.hideTop?'':'checked'}> 🔥 Most played games</label>
      <label class="chk"><input type="checkbox" id="hbPosts" ${hubCfg.hidePosts?'':'checked'}> 📰 Popular posts this week</label>
      <label class="chk"><input type="checkbox" id="hbNew" ${hubCfg.hideNew?'':'checked'}> ✨ New from Lumen creators</label>
      <h2 style="margin-top:18px">⭐ Featured</h2><p class="muted" style="font-size:13px">Pick what appears in the Featured row (also from the Projects tab with ☆).</p>
      <div class="list">${[...BUILTINS.map(g=>({...g,key:g.key})),...live.map(p=>({...p,key:projKey(p)}))].map(i=>`<label class="chk" style="margin:4px 0"><input type="checkbox" data-pinbox="${esc(i.key)}" ${(hubCfg.pinned||[]).includes(i.key)?'checked':''}> ${esc(i.title)} <span class="muted" style="font-size:12px">${i.type==='site'?'website':'game'}</span></label>`).join('')}</div></div></div>
    <button class="btn-acc" id="hbSave" style="margin-top:16px;padding:12px 26px">Save Hub</button>`;
    $$('#hbHue button').forEach(b=>b.onclick=()=>$$('#hbHue button').forEach(x=>x.classList.toggle('on',x===b)));
    $('#hbSave').onclick=()=>saveHub({kicker:$('#hbKick').value.trim(),title:$('#hbTitle').value.trim(),subtitle:$('#hbSub').value.trim(),announce:$('#hbAnn').value.trim(),hue:$('#hbHue .on')?.dataset.h||'aurora',
      hideTrend:!$('#hbTrend').checked,hideTop:!$('#hbTop').checked,hidePosts:!$('#hbPosts').checked,hideNew:!$('#hbNew').checked,pinned:$$('[data-pinbox]').filter(c=>c.checked).map(c=>c.dataset.pinbox)},'Hub saved');return}}
async function saveHub(data,msg){try{await C().F.setDoc(C().D('server','hub'),data,{merge:true});if(msg)toast(msg)}catch(e){toast(e.code==='permission-denied'?'Firebase refused this. Re-publish the latest firestore.rules.':e.message)}}
async function collect(){const {F,D,db}=C();const btn=$('#crCollect');btn.disabled=true;let got=0;
  const bonus=x=>L.plan?.bonus(x)??x;
  for(const p of myProjects.filter(p=>unpaid(p)>0)){const amt=bonus(unpaid(p));const b=F.writeBatch(db);
    b.update(D('projects',p.id),{paidMin:p.minutes||0,paidMent:p.mentions||0,paidRev:p.upReviews||0,paidSold:p.sold||0});
    b.update(D('users',me),{coins:(+C().profile()?.coins||0)+got+amt,lastProj:p.id});
    try{await b.commit();got+=amt}catch(e){toast(e.code==='permission-denied'?'Couldn’t collect yet (new plays just came in, or the rules need re-publishing). Try again.':e.message);break}}
  for(const it of myItems.filter(i=>(i.earned||0)>(i.paidEarned||0))){const amt=bonus(it.earned-(it.paidEarned||0));const b=F.writeBatch(db);
    b.update(D('shopItems',it.id),{paidEarned:it.earned});b.update(D('users',me),{coins:(+C().profile()?.coins||0)+got+amt,lastItem:it.id});
    try{await b.commit();got+=amt}catch(e){toast(e.code==='permission-denied'?'Couldn’t collect yet (a sale just came in). Try again.':e.message);break}}
  if(got)toast(`+${fmtN(got)} ✦ Glow collected`);renderCreator()}

/* ---------- playtime: +1 minute for the creator for every full minute someone else plays ---------- */
let timer=null,secs=0;const timeM={};
function stopTimer(){clearInterval(timer);timer=null;secs=0}
function startTimer(key){stopTimer();if(!me||!key.startsWith('p_'))return;const p=findItem(key);if(!p||p.uid===me)return;
  timer=setInterval(()=>{const v=L.viewing?.();if(!v||v.act?.key!==key)return stopTimer();
    if(document.hidden||$('#study')?.classList.contains('on')||$('#cover')?.classList.contains('on'))return;
    secs+=5;if(secs>=60){secs=0;tick(key)}},5000)}
async function tick(key){const {F,D,db}=C();const id=key.slice(2),rec=`${me}_${DAY()}`,ref=D('projects',id,'time',rec),k=id+rec;
  try{if(timeM[k]===undefined){const s=await F.getDoc(ref).catch(()=>null);timeM[k]=s?.exists()?+s.data().m||0:0}
    if(timeM[k]>=240)return;const b=F.writeBatch(db);b.set(ref,{m:timeM[k]+1,at:F.serverTimestamp()});b.update(D('projects',id),{minutes:F.increment(1)});await b.commit();timeM[k]++}catch{}}
L.hubTick=tick;

/* ---------- mentions: a game's name in a post becomes a link ---------- */
const reEsc=t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const nameRe=t=>new RegExp('(^|[^\\p{L}\\p{N}])('+reEsc(t)+')(?=$|[^\\p{L}\\p{N}])','iu');
const mentionable=()=>allGames().filter(g=>(g.title||'').length>=3).sort((a,b)=>b.title.length-a.title.length);
function mentionsIn(text){if(!me)return[];return mentionable().filter(g=>g.key.startsWith('p_')&&g.uid!==me&&nameRe(g.title).test(text)).slice(0,5).map(g=>g.key.slice(2))}
function linkMentions(root){const games=mentionable();if(!root||!games.length)return;
  root.querySelectorAll('.post-t').forEach(el=>{if(el.dataset.ml)return;el.dataset.ml='1';
    const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('a,code,.gmention')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});const nodes=[];while(w.nextNode())nodes.push(w.currentNode);
    for(const n of nodes){let txt=n.nodeValue,frag=null;
      for(;;){let best=null;for(const g of games){const m=nameRe(g.title).exec(txt);if(m&&(!best||m.index+m[1].length<best.i))best={i:m.index+m[1].length,len:m[2].length,g}}
        if(!best)break;frag=frag||document.createDocumentFragment();frag.append(txt.slice(0,best.i));
        const a=document.createElement('a');a.className='gmention';a.dataset.game=best.g.key;a.href='#';a.textContent='🎮 '+txt.substr(best.i,best.len);frag.append(a);txt=txt.slice(best.i+best.len)}
      if(frag){frag.append(txt);n.replaceWith(frag)}}})}
document.addEventListener('click',e=>{const a=e.target.closest('.gmention');if(!a)return;e.preventDefault();openGame(a.dataset.game)});

/* ---------- Game hub (Games tab) ---------- */
let ghFilter='all',ghQ='';const creatorNames={};
function renderGameHub(){const box=$('#ghBox');if(!box)return;
  const games=allGames().map(g=>({...g,cname:creatorNames[g.uid]||''}));
  games.forEach(g=>{if(g.uid&&!creatorNames[g.uid])C()?.getUser(g.uid).then(u=>{creatorNames[g.uid]=u.name||'';if(ghQ)renderGameHub()})});
  const q=ghQ.toLowerCase();const match=g=>!q||[g.title,g.desc,g.cname].some(x=>(x||'').toLowerCase().includes(q));
  const at=g=>g.at?.toMillis?.()||0;
  const sorts={all:(a,b)=>(plays[b.key]||0)-(plays[a.key]||0),trending:(a,b)=>(trend[b.key]||0)-(trend[a.key]||0)||(plays[b.key]||0)-(plays[a.key]||0),top:(a,b)=>(plays[b.key]||0)-(plays[a.key]||0),new:(a,b)=>at(b)-at(a),rated:(a,b)=>(b.upReviews||0)-(a.upReviews||0)};
  const filt={creators:g=>g.key.startsWith('p_'),lumen:g=>g.key.startsWith('b_')}[ghFilter]||(()=>true);
  const list=games.filter(match).filter(filt).sort(sorts[ghFilter]||sorts.all);
  const hot=games.filter(g=>trend[g.key]).sort(sorts.trending).slice(0,8);
  $$('#ghChips button').forEach(b=>b.classList.toggle('on',b.dataset.f===ghFilter));
  const fromCr=games.filter(g=>g.key.startsWith('p_')).sort((a,b)=>at(b)-at(a)).slice(0,8);
  box.innerHTML=(!q&&ghFilter==='all'&&hot.length?`<h2 class="hsec">📈 Trending this week</h2><div class="hrow">${hot.map(g=>card(g)).join('')}</div>`:'')+
    (!q&&ghFilter==='all'&&fromCr.length?`<h2 class="hsec">🛠 New from Lumen creators <button class="gh-mk" data-gtab="create">Make your own →</button></h2><div class="hrow">${fromCr.map(g=>card(g)).join('')}</div>`:'')+
    `<h2 class="hsec">${q?`Results for “${esc(ghQ)}”`:{all:'🎮 All games',trending:'📈 Trending',top:'🔥 Most played',new:'✨ Newest',rated:'👍 Top rated',creators:'🛠 From Lumen creators',lumen:'⭐ Lumen originals'}[ghFilter]} <em class="count">${list.length}</em></h2>`+
    (list.length?`<div class="hgrid">${list.map(g=>card(g)).join('')}</div>`:`<p class="muted">No games found${q?' for that search':''}.</p>`);
  bindOpen(box);fillCreators(box);box.querySelectorAll('[data-gtab]').forEach(b=>b.onclick=e=>{e.stopPropagation();gamesTab(b.dataset.gtab)})}
$('#ghQ')?.addEventListener('input',e=>{ghQ=e.target.value.trim();renderGameHub()});
$('#ghChips')?.addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;ghFilter=b.dataset.f;renderGameHub()});

/* ---------- game pages + reviews ---------- */
let gpKey=null,reviews=[],revUnsub=null,revUp=true;
function stopReviews(){revUnsub?.();revUnsub=null}
function revCol(key){const {F,db}=C();return key.startsWith('p_')?F.collection(db,'projects',key.slice(2),'reviews'):F.collection(db,'reviews',key,'list')}
function openGame(key){const it=findItem(key);if(!it)return toast('That game isn’t available any more');gpKey=key;reviews=[];stopReviews();
  L.go('gamepage');if(me&&C())revUnsub=C().F.onSnapshot(revCol(key),s=>{reviews=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.at?.toMillis?.()||0)-(a.at?.toMillis?.()||0));renderGamePage()},()=>{});
  renderGamePage();window.scrollTo?.(0,0);$('#v-gamepage')?.scrollIntoView({block:'start'})}
async function renderGamePage(){const box=$('#gpBox');const it=gpKey&&findItem(gpKey);if(!box)return;if(!it){box.innerHTML='<p class="muted">This game isn’t available any more.</p>';return}
  const mine=reviews.find(r=>r.id===me),up=reviews.filter(r=>r.up).length,pct=reviews.length?Math.round(up/reviews.length*100):0,own=it.uid&&it.uid===me;
  const others=allGames().filter(g=>g.key!==gpKey).sort((a,b)=>(trend[b.key]||0)-(trend[a.key]||0)||(plays[b.key]||0)-(plays[a.key]||0)).slice(0,4);
  const us=await Promise.all(reviews.map(r=>C().getUser(r.uid)));const creator=it.uid?await C().getUser(it.uid):null;
  if(findItem(gpKey)!==null&&gpKey!==(it.key))return;
  const draft=$('#gpText')?.value;box.dataset.key=gpKey;
  box.innerHTML=`<button class="gp-back" data-goto="games">‹ Game hub</button>
    <div class="gp-hero card"><div class="gp-art" style="${art(it)}">${it.image?'':`<span>${esc(it.title)}</span>`}</div>
      <div class="gp-info"><span class="hkick">🎮 Game · ${creator?`by <a href="#" data-user="${it.uid}">${esc(creator.name||'a creator')}</a>`:'Lumen original'}</span><h1>${esc(it.title)}</h1>${it.desc?`<p>${esc(it.desc)}</p>`:''}
        <div class="gp-stats"><span>▶ <b>${fmtN(plays[gpKey]||0)}</b> plays</span>${it.uid?`<span>⏱ <b>${fmtN(it.minutes||0)}</b> min played</span><span>💬 <b>${fmtN(it.mentions||0)}</b> mentions</span>`:''}<span>👍 <b>${reviews.length?pct+'%':'–'}</b> of ${fmtN(reviews.length)} review${reviews.length===1?'':'s'}</span>${trend[gpKey]?`<span>📈 <b>${fmtN(trend[gpKey])}</b> this week</span>`:''}</div>
        <div class="row" style="flex-wrap:wrap;gap:8px;margin-top:16px">${unlocked(it)?'<button class="btn-acc gp-play" id="gpPlay">▶ Play now</button>':`<button class="btn-acc gp-play" id="gpUnlock">🔓 Unlock for ✦ ${fmtN(L.plan?.price(it.price)??it.price)}${L.plan?.lite()?' <s style="opacity:.6">'+fmtN(it.price)+'</s>':''}</button>`}<button id="gpMention" title="Write a post about it">✍️ Post about it</button></div></div></div>
    <div class="gp-grid"><div class="card"><h2>Reviews</h2>
      ${reviews.length?`<div class="gp-bar"><span style="width:${pct}%"></span></div><p class="muted" style="font-size:13px;margin:6px 0 14px">${up} recommend it · ${reviews.length-up} don't</p>`:''}
      ${!me?'<div class="banner">Sign in to write a review.</div>':own?'<div class="banner">This is your game. Reviews from players show up here, and every positive one earns you ✦ 50 Glow.</div>':
        `<div class="gp-form"><div class="seg" id="gpUp"><button type="button" data-up="1" class="${(mine?mine.up:revUp)?'on':''}" ${mine?'disabled':''}>👍 Recommend</button><button type="button" data-up="0" class="${(mine?!mine.up:!revUp)?'on':''}" ${mine?'disabled':''}>👎 Not for me</button></div>
          <textarea id="gpText" rows="3" maxlength="500" placeholder="What did you think?">${esc(draft??mine?.text??'')}</textarea>
          <div class="row" style="justify-content:space-between"><span class="muted" style="font-size:12px">${mine?'You can edit your words; the 👍/👎 stays.':'One review per person.'}</span><button class="btn-acc" id="gpSend">${mine?'Update review':'Post review'}</button></div></div>`}
      <div class="list gp-revs">${reviews.map((r,i)=>`<div class="gp-rev"><div data-user="${r.uid}" style="cursor:pointer">${C().pic(us[i],36)}</div><div class="bub"><div class="row" style="gap:8px"><b data-user="${r.uid}" style="cursor:pointer">${C().nameHTML(us[i],{badges:false})}</b><em class="pill ${r.up?'live':'rej'}">${r.up?'👍 Recommends':'👎 Not for them'}</em><span class="muted" style="font-size:12px">${r.at?.toDate?.().toLocaleDateString()||''}</span>${isAdmin()?`<button class="ib" data-delrev="${r.id}" title="Remove review (admin)" style="margin-left:auto">🗑</button>`:''}</div>${r.text?`<p>${esc(r.text)}</p>`:''}</div></div>`).join('')||'<p class="muted">No reviews yet. Be the first!</p>'}</div></div>
    <div class="gp-side"><div class="card"><h2>💡 Tip</h2><p class="muted" style="font-size:14px;margin:0">Write <b>${esc(it.title)}</b> in a post and it turns into a link to this page.${it.uid?' Each post that mentions it earns the creator ✦ 50 Glow.':''}</p></div>
      ${others.length?`<div class="card"><h2>More games</h2><div class="gp-more">${others.map(g=>card(g,{small:true})).join('')}</div></div>`:''}</div></div>`;
  bindGo(box);bindOpen(box.querySelector('.gp-more')||document.createElement('div'));fillCreators(box);
  box.querySelectorAll('[data-user]').forEach(el=>el.onclick=e=>{e.preventDefault();L.openUser?.(el.dataset.user)});
  $('#gpPlay')&&($('#gpPlay').onclick=()=>launch(gpKey));$('#gpUnlock')&&($('#gpUnlock').onclick=()=>me?unlockGame(gpKey):toast('Sign in first'));
  $('#gpMention').onclick=()=>{L.go('posts');const t=$('#postText');if(t){t.value=(t.value?t.value+' ':'')+it.title+' ';t.focus()}};
  $$('#gpUp button').forEach(b=>b.onclick=()=>{revUp=b.dataset.up==='1';$$('#gpUp button').forEach(x=>x.classList.toggle('on',x===b))});
  $('#gpSend')?.addEventListener('click',sendReview);
  box.querySelectorAll('[data-delrev]').forEach(b=>b.onclick=async()=>{if(!confirm('Remove this review?'))return;try{await C().F.deleteDoc(C().F.doc(revCol(gpKey),b.dataset.delrev))}catch(e){toast(e.message)}})}
async function sendReview(){const {F,D,db}=C();const text=$('#gpText').value.trim().slice(0,500),mine=reviews.find(r=>r.id===me),ref=F.doc(revCol(gpKey),me);
  try{if(mine){await F.updateDoc(ref,{text,at:F.serverTimestamp()});toast('Review updated');return}
    const up=$('#gpUp .on')?.dataset.up!=='0';if(!text&&!up)return toast('Say why it’s not for you');
    const b=F.writeBatch(db);b.set(ref,{uid:me,up,text,at:F.serverTimestamp()});
    if(up&&gpKey.startsWith('p_'))b.update(D('projects',gpKey.slice(2)),{upReviews:F.increment(1),lastReview:me});
    await b.commit();$('#gpText').value='';toast('Review posted')}catch(e){toast(e.code==='permission-denied'?'Couldn’t post the review (you can only review a game once).':e.message)}}
$('#brand')?.addEventListener('click',()=>L.go('hub'));

L.hubCounts=()=>({shop:allItems.filter(i=>i.status==='pending').length,apps:allApps.filter(a=>a.status==='pending').length,queue:allProjects.filter(p=>p.status==='pending').length,creators:allApps.filter(a=>a.status==='approved').length,live:allProjects.filter(p=>p.status==='approved').length});
if(C()?.profile?.())L.onProfile(C().profile());
renderHub();renderGameHub();
