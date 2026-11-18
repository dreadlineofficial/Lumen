/* Lumen Hub, Lumen Creators and play counts.
   - Hub page: admin-customised banner, featured picks, most played games, popular posts, new creator projects
   - Creator Dashboard: apply, then submit games and websites (each one is reviewed by the admin)
   - Games tab and Web "Featured" page show approved creator projects
   - Admin tabs (Creators, Projects, Hub) are rendered here for the control panel in cloud.js */
const L=window.Lumen,{esc,toast,safeImg}=L;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const BUILTINS=[{key:'b_nightbound',title:'Nightbound',type:'game',desc:'1v4 asymmetric horror · online multiplayer',url:()=>L.cfg.nbUrl,art:'radial-gradient(circle at 30% 20%,#5a1020,#1a0608 60%,#06070b)'},
  {key:'b_offal',title:'OFFAL',type:'game',desc:'Horror · demo',url:()=>'games/offal.html',image:'games/offal-poster.webp'}];
let me=null,hubCfg={},live=[],plays={},trend={},myApp=null,myProjects=[],allApps=[],allProjects=[],unsubs=[];
const C=()=>L.cloud;
const stop=()=>{unsubs.forEach(u=>u());unsubs=[]};
const isAdmin=()=>C()?.isAdmin?.();
const isCreator=()=>myApp?.status==='approved';
const projKey=p=>'p_'+p.id;
const fmtN=n=>(+n||0).toLocaleString();
const DAY=()=>Math.floor(Date.now()/864e5);
const RATE={min:20,mention:50,review:50};
const unpaid=p=>RATE.min*Math.max(0,(p.minutes||0)-(p.paidMin||0))+RATE.mention*Math.max(0,(p.mentions||0)-(p.paidMent||0))+RATE.review*Math.max(0,(p.upReviews||0)-(p.paidRev||0));
const earned=p=>RATE.min*(p.minutes||0)+RATE.mention*(p.mentions||0)+RATE.review*(p.upReviews||0);

/* ---------- live data ---------- */
function start(){const {F,D,db}=C();const col=(...p)=>F.collection(db,...p);
  unsubs.push(F.onSnapshot(D('server','hub'),s=>{hubCfg=s.data()||{};refresh()},()=>{}));
  unsubs.push(F.onSnapshot(F.query(col('projects'),F.where('status','==','approved')),s=>{live=s.docs.map(d=>({id:d.id,...d.data()}));refresh()},()=>{}));
  unsubs.push(F.onSnapshot(col('plays'),s=>{const t=DAY();plays={};trend={};s.docs.forEach(d=>{const x=d.data();plays[d.id]=+x.count||0;let w=0;for(let i=0;i<7;i++)w+=+x['d'+(t-i)]||0;trend[d.id]=w});refresh()},()=>{}));
  unsubs.push(F.onSnapshot(D('creatorApps',me),s=>{myApp=s.exists()?s.data():null;$('#navCreator').style.display=isCreator()?'':'none';refresh()},()=>{}));
  unsubs.push(F.onSnapshot(F.query(col('projects'),F.where('uid','==',me)),s=>{myProjects=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.at?.toMillis?.()||0)-(a.at?.toMillis?.()||0));renderCreator()},()=>{}));
  if(isAdmin()){unsubs.push(F.onSnapshot(col('creatorApps'),s=>{allApps=s.docs.map(d=>({id:d.id,...d.data()}));L.onAdminData?.()},()=>{}));
    unsubs.push(F.onSnapshot(col('projects'),s=>{allProjects=s.docs.map(d=>({id:d.id,...d.data()}));L.onAdminData?.()},()=>{}))}}
const prevP=L.onProfile;L.onProfile=p=>{prevP?.(p);const uid=p?.uid||null;if(uid===me)return;stop();me=uid;myApp=null;myProjects=[];live=[];plays={};hubCfg={};
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
function art(it){const img=safeImg(it.image)||(it.image&&it.image.startsWith('games/')?it.image:'');return img?`background-image:url('${esc(img)}');background-size:cover;background-position:center`:`background:${it.art||`linear-gradient(135deg,hsl(${(it.title||'x').length*47%360} 70% 45%),hsl(${(it.title||'x').length*47%360+60} 70% 20%))`}`}
function card(it,{small=false}={}){const pl=plays[it.key]||0;
  return`<button class="hcard${small?' small':''}" data-open="${esc(it.key)}"><div class="hart" style="${art(it)}">${it.image?'':`<span>${esc(it.title)}</span>`}<em class="htype">${it.type==='site'?'🌐 Website':'🎮 Game'}</em>${it.featured||(hubCfg.pinned||[]).includes(it.key)?'<em class="hfeat">⭐ Featured</em>':''}</div>
    <div class="hmeta"><b>${esc(it.title)}</b><span class="by" data-by="${esc(it.uid||'')}">${it.uid?'':'Lumen'}</span><span class="pl">▶ ${fmtN(pl)} play${pl===1?'':'s'}${it.upReviews?` · 👍 ${fmtN(it.upReviews)}`:''}${trend[it.key]&&it.type!=='site'?` · 📈 ${fmtN(trend[it.key])} this week`:''}</span></div></button>`}
async function fillCreators(root){for(const el of root.querySelectorAll('[data-by]')){const uid=el.dataset.by;if(!uid)continue;const u=await C().getUser(uid);el.textContent='by '+(u.name||'a creator')}}
function bindOpen(root){root.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openItem(b.dataset.open))}
function openItem(key){const it=findItem(key);if(!it)return toast('That isn’t available any more');if(it.type==='site'){play(key);L.browser.open(it.url)}else openGame(key)}
function launch(key){const it=findItem(key);if(!it)return toast('That isn’t available any more');play(key);L.openView(it.url,it.title,{kind:'game',label:it.title,key});startTimer(key)}

/* ---------- Hub page ---------- */
const HUES={aurora:'linear-gradient(120deg,#3b5bff,#9b6bff 45%,#ff9a5c)',ocean:'linear-gradient(120deg,#0b3a8f,#1aa0d8 60%,#2fe0d0)',ember:'linear-gradient(120deg,#5a1020,#e8601a 60%,#ffc15e)',forest:'linear-gradient(120deg,#063d22,#2fd67a 70%,#d6c36b)',night:'linear-gradient(120deg,#0b0b18,#3b1a78 60%,#7a2b9e)'};
function popularPosts(){const posts=[...(C()?.feed?.()?.values?.()||[])];const week=Date.now()-7*864e5;
  return posts.filter(p=>(p.at?.toMillis?.()||Date.now())>week).map(p=>({...p,score:(p.likes||[]).length*3+(p.views||0)+(p.ecomments||0)*2})).sort((a,b)=>b.score-a.score).slice(0,4)}
async function renderHub(){const box=$('#hubBox');if(!box)return;const name=C()?.profile?.()?.name;
  const hero=`<div class="hhero" style="background:${HUES[hubCfg.hue]||HUES.aurora}"><div class="hhero-in"><span class="hkick">${esc(hubCfg.kicker||'Lumen Hub')}</span><h1>${esc(hubCfg.title||(name?`Welcome back, ${name}.`:'Welcome to Lumen.'))}</h1><p>${esc(hubCfg.subtitle||'Games, friends, creators and everything else, in one place.')}</p>
    <div class="row" style="flex-wrap:wrap;gap:8px;margin-top:16px"><button class="btn-acc" data-goto="games">🎮 Play</button><button data-goto="chat">💬 Chat</button><button data-goto="posts">📰 Posts</button>${isCreator()?'<button data-goto="creator">🛠 Creator Dashboard</button>':''}</div></div></div>
    ${hubCfg.announce?`<div class="hannounce">📣 ${L.fmt?L.fmt(hubCfg.announce):esc(hubCfg.announce)}</div>`:''}`;
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
function bindGo(root){root.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>L.go(b.dataset.goto))}

/* ---------- Games tab: creator games + hidden built-ins ---------- */
L.hub={play,openGame,mentionsIn,linkMentions,builtinHidden:key=>(hubCfg.hiddenBuiltins||[]).includes(key),
  featuredPage(el,openUrl){const sites=live.filter(p=>p.type==='site').sort((a,b)=>(plays[projKey(b)]||0)-(plays[projKey(a)]||0));
    el.innerHTML=`<div class="ytp"><div class="yt-top"><span class="yt-logo" style="background:linear-gradient(135deg,#ffd76a,#ff9a5c)">⭐</span><b>Featured</b><span class="muted" style="font-size:13px">Websites made by Lumen creators</span></div>
      ${sites.length?`<div class="hgrid">${sites.map(p=>card({...p,key:projKey(p)})).join('')}</div>`:`<p class="muted">No featured websites yet.${me?' Lumen creators can add theirs from the Creator Dashboard.':' Sign in to see them.'}</p>`}</div>`;
    el.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{const p=findItem(b.dataset.open);if(!p)return;play(b.dataset.open);openUrl(p.url)});fillCreators(el)},
  renderAdminTab};
const prevView=L.onView;L.onView=v=>{prevView?.(v);if(v==='hub')renderHub();if(v==='creator')renderCreator();if(v==='games')renderGameHub();if(v!=='gamepage'){stopReviews()}else $('nav [data-v=games]')?.classList.add('on')};

/* ---------- Creator Dashboard ---------- */
let editing=null,newImage=null;
function renderCreator(){const box=$('#creatorBox');if(!box)return;
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
  const sum=f=>myProjects.reduce((a,p)=>a+f(p),0),wait=sum(unpaid);
  const tot=myProjects.reduce((a,p)=>a+(plays[projKey(p)]||0),0),liveN=myProjects.filter(p=>p.status==='approved').length,pend=myProjects.filter(p=>p.status==='pending').length,feat=myProjects.filter(p=>(hubCfg.pinned||[]).includes(projKey(p))).length;
  const f=editing||{};
  box.innerHTML=`<div class="card cr-earn"><div><span class="hkick">✦ Creator earnings</span><b class="cr-big">${fmtN(wait)} <small>Glow waiting</small></b>
      <span class="muted" style="font-size:13px">You've earned ✦ ${fmtN(sum(earned))} in total. Other people playing your games earn you <b>${RATE.min} per minute</b>, every post that mentions a game <b>${RATE.mention}</b>, and every positive review <b>${RATE.review}</b>. Your own plays, posts and reviews don't count.</span></div>
      <button class="btn-acc" id="crCollect" ${wait?'':'disabled'}>Collect ✦ ${fmtN(wait)}</button></div>
    <div class="an-stats">${[['📦','Projects',myProjects.length],['✅','Live',liveN],['⏳','In review',pend],['▶','Total plays',tot],['⏱','Minutes played',sum(p=>p.minutes||0)],['💬','Mentions',sum(p=>p.mentions||0)],['👍','Positive reviews',sum(p=>p.upReviews||0)],['⭐','Featured',feat]].map(([i,l,v])=>`<div class="card an-stat"><span>${i} ${l}</span><b>${fmtN(v)}</b></div>`).join('')}</div>
    <div class="cr-grid"><div class="card"><h2>${editing?'Edit project':'New project'}</h2><p class="muted" style="font-size:13px">${editing?'Saving sends it back for review.':'It goes live once the admin approves it.'}</p>
      <label>Type</label><div class="seg" id="crType"><button type="button" data-t="game" class="${(f.type||'game')==='game'?'on':''}">🎮 Game</button><button type="button" data-t="site" class="${f.type==='site'?'on':''}">🌐 Website</button></div>
      <label>Title</label><input id="crTitle" maxlength="60" value="${esc(f.title||'')}" placeholder="My awesome game">
      <label>Link (must start with https://)</label><input id="crUrl" maxlength="500" value="${esc(f.url||'')}" placeholder="https://…">
      <label>Short description</label><textarea id="crDesc" rows="2" maxlength="300">${esc(f.desc||'')}</textarea>
      <label>Cover image</label><div class="row"><button type="button" id="crImgBtn">🖼 Upload</button><input type="file" id="crImg" accept="image/*" hidden><span class="muted" id="crImgName" style="font-size:12px">${f.image?'Image set':''}</span></div>
      <div class="row" style="margin-top:16px"><button class="btn-acc" id="crSave" style="flex:1">${editing?'Save and resubmit':'Submit for review'}</button>${editing?'<button id="crCancel">Cancel</button>':''}</div>
      <p class="muted" style="font-size:12px;margin:10px 0 0">Tip: games must work when opened inside another page (most HTML5 games on itch.io, GitHub Pages or your own site do). Sites that refuse to be embedded will open in a new tab.</p></div>
    <div class="card"><h2>My projects</h2><div class="list">${myProjects.map(p=>{const st=(hubCfg.pinned||[]).includes(projKey(p))&&p.status==='approved'?['⭐ Featured','feat']:{approved:['● Live','live'],pending:['⏳ In review','pend'],rejected:['✕ Not approved','rej']}[p.status]||['?',''];
      return`<div class="cr-proj"><div class="hart mini" style="${art(p)}"></div><div class="info"><b>${esc(p.title)}</b><span><em class="pill ${st[1]}">${st[0]}</em> ${p.type==='site'?'Website':'Game'} · ▶ ${fmtN(plays[projKey(p)]||0)}${p.type==='game'?` · ⏱ ${fmtN(p.minutes||0)} min · 💬 ${fmtN(p.mentions||0)} · 👍 ${fmtN(p.upReviews||0)}`:''}</span></div>
        ${p.status==='approved'&&p.type==='game'?`<button class="ib" data-page="${p.id}" title="Open its game page">↗</button>`:''}<button class="ib" data-edit="${p.id}" title="Edit">✏️</button><button class="ib" data-del="${p.id}" title="Delete">🗑</button></div>`}).join('')||'<p class="muted">Nothing yet. Submit your first project on the left.</p>'}</div></div></div>`;
  $$('#crType button').forEach(b=>b.onclick=()=>{$$('#crType button').forEach(x=>x.classList.toggle('on',x===b))});
  $('#crImgBtn').onclick=()=>$('#crImg').click();$('#crImg').onchange=async e=>{const fl=e.target.files[0];if(!fl)return;newImage=await L.shrinkImage(fl,640,.78);if(newImage.length>290000)newImage=await L.shrinkImage(fl,360,.6);$('#crImgName').textContent='✓ '+fl.name};
  $('#crSave').onclick=saveProject;$('#crCancel')?.addEventListener('click',()=>{editing=null;newImage=null;renderCreator()});
  $('#crCollect').onclick=collect;box.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>openGame('p_'+b.dataset.page));
  box.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editing=myProjects.find(p=>p.id===b.dataset.edit);newImage=null;renderCreator();box.scrollIntoView({behavior:'smooth'})});
  box.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this project?'))return;try{await C().F.deleteDoc(C().D('projects',b.dataset.del))}catch(e){toast(e.message)}})}
async function apply(){const about=$('#crAbout').value.trim();if(about.length<10)return toast('Tell the admin a little about what you’ll make');
  try{await C().F.setDoc(C().D('creatorApps',me),{uid:me,about:about.slice(0,600),links:$('#crLinks').value.trim().slice(0,400),status:'pending',at:C().F.serverTimestamp()});toast('Application sent')}catch(e){toast('Couldn’t apply: '+e.message)}}
async function saveProject(){const type=$('#crType .on')?.dataset.t||'game',title=$('#crTitle').value.trim(),url=$('#crUrl').value.trim(),desc=$('#crDesc').value.trim();
  if(title.length<2)return toast('Give it a title');if(!/^https:\/\/\S+$/i.test(url))return toast('The link must start with https://');
  const data={type,title:title.slice(0,60),url:url.slice(0,500),desc:desc.slice(0,300),image:newImage??editing?.image??'',status:'pending',at:C().F.serverTimestamp()};
  try{if(editing)await C().F.updateDoc(C().D('projects',editing.id),data);else{data.uid=me;data.featured=false}if(editing);else await C().F.addDoc(C().F.collection(C().db,'projects'),data);toast(editing?'Saved: back in review':'Submitted for review');editing=null;newImage=null;renderCreator()}catch(e){toast('Couldn’t save: '+e.message)}}

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
    const row=(p,acts)=>`<div class="adm-proj"><div class="hart mini" style="${art(p)}"></div><div class="info"><b>${esc(p.title)}</b><span>${p.type==='site'?'🌐 Website':'🎮 Game'} · <span data-uname="${p.uid}">…</span> · ▶ ${fmtN(plays[projKey(p)]||0)}</span><a href="${esc(p.url)}" target="_blank" rel="noopener" class="muted" style="font-size:12px;word-break:break-all">${esc(p.url)}</a>${p.desc?`<p class="muted" style="font-size:12.5px;margin:4px 0 0">${esc(p.desc)}</p>`:''}</div><div class="acts">${acts}</div></div>`;
    el.innerHTML=`<div class="card"><h2>⏳ Review queue <em class="count">${pend.length}</em></h2><div class="list">${pend.map(p=>row(p,`<button class="ib" data-try="${p.id}" title="Try it">▶</button><button class="btn-acc" data-pok="${p.id}">Approve</button><button data-pno="${p.id}">Reject</button>`)).join('')||'<p class="muted">Nothing waiting for review.</p>'}</div></div>
      <div class="card" style="margin-top:16px"><h2>● Live on Lumen <em class="count">${liveP.length}</em></h2><div class="list">${liveP.map(p=>row(p,`<button class="ib" data-try="${p.id}" title="Try it">▶</button><button class="ib" data-pin="${p.id}" title="${(hubCfg.pinned||[]).includes(projKey(p))?'Unfeature':'Feature on the Hub'}">${(hubCfg.pinned||[]).includes(projKey(p))?'⭐':'☆'}</button><button class="ib" data-pno="${p.id}" title="Hide (send back to rejected)">🙈</button><button class="ib" data-pdel="${p.id}" title="Delete">🗑</button>`)).join('')||'<p class="muted">No creator projects live yet.</p>'}</div></div>
      <div class="card" style="margin-top:16px"><h2>🎮 Built-in games</h2><div class="list">${BUILTINS.map(g=>`<div class="person"><div class="info"><b>${g.title}</b><span>▶ ${fmtN(plays[g.key]||0)} plays · ${(hubCfg.hiddenBuiltins||[]).includes(g.key)?'hidden':'showing'}</span></div><button class="ib" data-pin="${g.key}" title="Feature on the Hub">${(hubCfg.pinned||[]).includes(g.key)?'⭐':'☆'}</button><button class="ib" data-hideb="${g.key}" title="Show or hide on the Games tab">${(hubCfg.hiddenBuiltins||[]).includes(g.key)?'🙈':'👁'}</button></div>`).join('')}</div></div>
      ${rej.length?`<div class="card" style="margin-top:16px"><h2>✕ Not approved / hidden <em class="count">${rej.length}</em></h2><div class="list">${rej.map(p=>row(p,`<button class="ib" data-pok="${p.id}" title="Approve">✓</button><button class="ib" data-pdel="${p.id}" title="Delete">🗑</button>`)).join('')}</div></div>`:''}`;
    el.querySelectorAll('[data-uname]').forEach(async b=>{const u=await C().getUser(b.dataset.uname);b.textContent=u.name||'creator'});
    const get=id=>allProjects.find(p=>p.id===id);
    el.querySelectorAll('[data-try]').forEach(b=>b.onclick=()=>{const p=get(b.dataset.try);if(p.type==='site')L.browser.open(p.url);else L.openView(p.url,p.title,{kind:'game',label:p.title})});
    el.querySelectorAll('[data-pok]').forEach(b=>b.onclick=()=>upd(D('projects',b.dataset.pok),{status:'approved'},'Approved: it’s live'));
    el.querySelectorAll('[data-pno]').forEach(b=>b.onclick=()=>upd(D('projects',b.dataset.pno),{status:'rejected'},'Hidden from Lumen'));
    el.querySelectorAll('[data-pdel]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this project for good?'))return;try{await F.deleteDoc(D('projects',b.dataset.pdel));toast('Deleted')}catch(e){toast(e.message)}});
    el.querySelectorAll('[data-pin]').forEach(b=>b.onclick=()=>{const key=b.dataset.pin.startsWith('b_')?b.dataset.pin:'p_'+b.dataset.pin;const pin=new Set(hubCfg.pinned||[]);pin.has(key)?pin.delete(key):pin.add(key);saveHub({pinned:[...pin]})});
    el.querySelectorAll('[data-hideb]').forEach(b=>b.onclick=()=>{const h=new Set(hubCfg.hiddenBuiltins||[]);h.has(b.dataset.hideb)?h.delete(b.dataset.hideb):h.add(b.dataset.hideb);saveHub({hiddenBuiltins:[...h]})});return}
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
  for(const p of myProjects.filter(p=>unpaid(p)>0)){const amt=unpaid(p);const b=F.writeBatch(db);
    b.update(D('projects',p.id),{paidMin:p.minutes||0,paidMent:p.mentions||0,paidRev:p.upReviews||0});
    b.update(D('users',me),{coins:(+C().profile()?.coins||0)+got+amt,lastProj:p.id});
    try{await b.commit();got+=amt}catch(e){toast(e.code==='permission-denied'?'Couldn’t collect yet (new plays just came in, or the rules need re-publishing). Try again.':e.message);break}}
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
  box.innerHTML=(!q&&ghFilter==='all'&&hot.length?`<h2 class="hsec">📈 Trending this week</h2><div class="hrow">${hot.map(g=>card(g)).join('')}</div>`:'')+
    `<h2 class="hsec">${q?`Results for “${esc(ghQ)}”`:{all:'🎮 All games',trending:'📈 Trending',top:'🔥 Most played',new:'✨ Newest',rated:'👍 Top rated',creators:'🛠 From Lumen creators',lumen:'⭐ Lumen originals'}[ghFilter]} <em class="count">${list.length}</em></h2>`+
    (list.length?`<div class="hgrid">${list.map(g=>card(g)).join('')}</div>`:`<p class="muted">No games found${q?' for that search':''}.</p>`);
  bindOpen(box);fillCreators(box)}
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
        <div class="row" style="flex-wrap:wrap;gap:8px;margin-top:16px"><button class="btn-acc gp-play" id="gpPlay">▶ Play now</button><button id="gpMention" title="Write a post about it">✍️ Post about it</button></div></div></div>
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
  $('#gpPlay').onclick=()=>launch(gpKey);
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

L.hubCounts=()=>({apps:allApps.filter(a=>a.status==='pending').length,queue:allProjects.filter(p=>p.status==='pending').length,creators:allApps.filter(a=>a.status==='approved').length,live:allProjects.filter(p=>p.status==='approved').length});
if(C()?.profile?.())L.onProfile(C().profile());
renderHub();renderGameHub();
