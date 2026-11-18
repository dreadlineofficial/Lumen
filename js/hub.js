/* Lumen Hub, Lumen Creators and play counts.
   - Hub page: admin-customised banner, featured picks, most played games, popular posts, new creator projects
   - Creator Dashboard: apply, then submit games and websites (each one is reviewed by the admin)
   - Games tab and Web "Featured" page show approved creator projects
   - Admin tabs (Creators, Projects, Hub) are rendered here for the control panel in cloud.js */
const L=window.Lumen,{esc,toast,safeImg}=L;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const BUILTINS=[{key:'b_nightbound',title:'Nightbound',type:'game',desc:'1v4 asymmetric horror · online multiplayer',url:()=>L.cfg.nbUrl,art:'radial-gradient(circle at 30% 20%,#5a1020,#1a0608 60%,#06070b)'},
  {key:'b_offal',title:'OFFAL',type:'game',desc:'Horror · demo',url:()=>'games/offal.html',image:'games/offal-poster.webp'}];
let me=null,hubCfg={},live=[],plays={},myApp=null,myProjects=[],allApps=[],allProjects=[],unsubs=[];
const C=()=>L.cloud;
const stop=()=>{unsubs.forEach(u=>u());unsubs=[]};
const isAdmin=()=>C()?.isAdmin?.();
const isCreator=()=>myApp?.status==='approved';
const projKey=p=>'p_'+p.id;
const fmtN=n=>(+n||0).toLocaleString();

/* ---------- live data ---------- */
function start(){const {F,D,db}=C();const col=(...p)=>F.collection(db,...p);
  unsubs.push(F.onSnapshot(D('server','hub'),s=>{hubCfg=s.data()||{};refresh()},()=>{}));
  unsubs.push(F.onSnapshot(F.query(col('projects'),F.where('status','==','approved')),s=>{live=s.docs.map(d=>({id:d.id,...d.data()}));refresh()},()=>{}));
  unsubs.push(F.onSnapshot(col('plays'),s=>{plays=Object.fromEntries(s.docs.map(d=>[d.id,+d.data().count||0]));refresh()},()=>{}));
  unsubs.push(F.onSnapshot(D('creatorApps',me),s=>{myApp=s.exists()?s.data():null;$('#navCreator').style.display=isCreator()?'':'none';refresh()},()=>{}));
  unsubs.push(F.onSnapshot(F.query(col('projects'),F.where('uid','==',me)),s=>{myProjects=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.at?.toMillis?.()||0)-(a.at?.toMillis?.()||0));renderCreator()},()=>{}));
  if(isAdmin()){unsubs.push(F.onSnapshot(col('creatorApps'),s=>{allApps=s.docs.map(d=>({id:d.id,...d.data()}));L.onAdminData?.()},()=>{}));
    unsubs.push(F.onSnapshot(col('projects'),s=>{allProjects=s.docs.map(d=>({id:d.id,...d.data()}));L.onAdminData?.()},()=>{}))}}
const prevP=L.onProfile;L.onProfile=p=>{prevP?.(p);const uid=p?.uid||null;if(uid===me)return;stop();me=uid;myApp=null;myProjects=[];live=[];plays={};hubCfg={};
  if($('#navCreator'))$('#navCreator').style.display='none';if(me&&C())start();refresh()};
L.onFeed=()=>{if($('#v-hub')?.classList.contains('on'))renderHub()};
function refresh(){renderHub();renderCreator();L.rerenderGames?.();L.browser?.refresh?.()}

/* ---------- plays: +1 per person per game per day ---------- */
async function play(key){if(!me||!C())return;const {F,D,db}=C();const day=Math.floor(Date.now()/864e5),rec=`${me}_${day}`;
  const seen='hub.play.'+key+'.'+day;try{if(localStorage.getItem(seen))return}catch{}
  try{const b=F.writeBatch(db);b.set(D('plays',key,'by',rec),{at:F.serverTimestamp()});
    if(key in plays)b.update(D('plays',key),{count:F.increment(1)});else b.set(D('plays',key),{count:1});await b.commit();try{localStorage.setItem(seen,'1')}catch{}}catch{}}

/* ---------- shared cards ---------- */
const allGames=()=>[...BUILTINS.filter(g=>!(hubCfg.hiddenBuiltins||[]).includes(g.key)).map(g=>({...g,url:g.url()})),...live.filter(p=>p.type==='game').map(p=>({...p,key:projKey(p)}))];
const findItem=key=>key.startsWith('b_')?(()=>{const g=BUILTINS.find(x=>x.key===key);return g&&{...g,url:g.url()}})():(()=>{const p=live.find(x=>projKey(x)===key);return p&&{...p,key}})();
function art(it){const img=safeImg(it.image)||(it.image&&it.image.startsWith('games/')?it.image:'');return img?`background-image:url('${esc(img)}');background-size:cover;background-position:center`:`background:${it.art||`linear-gradient(135deg,hsl(${(it.title||'x').length*47%360} 70% 45%),hsl(${(it.title||'x').length*47%360+60} 70% 20%))`}`}
function card(it,{small=false}={}){const pl=plays[it.key]||0;
  return`<button class="hcard${small?' small':''}" data-open="${esc(it.key)}"><div class="hart" style="${art(it)}">${it.image?'':`<span>${esc(it.title)}</span>`}<em class="htype">${it.type==='site'?'🌐 Website':'🎮 Game'}</em>${it.featured||(hubCfg.pinned||[]).includes(it.key)?'<em class="hfeat">⭐ Featured</em>':''}</div>
    <div class="hmeta"><b>${esc(it.title)}</b><span class="by" data-by="${esc(it.uid||'')}">${it.uid?'':'Lumen'}</span><span class="pl">▶ ${fmtN(pl)} play${pl===1?'':'s'}</span></div></button>`}
async function fillCreators(root){for(const el of root.querySelectorAll('[data-by]')){const uid=el.dataset.by;if(!uid)continue;const u=await C().getUser(uid);el.textContent='by '+(u.name||'a creator')}}
function bindOpen(root){root.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openItem(b.dataset.open))}
function openItem(key){const it=findItem(key);if(!it)return toast('That isn’t available any more');play(key);
  if(it.type==='site')L.browser.open(it.url);else L.openView(it.url,it.title,{kind:'game',label:it.title})}

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
  const fresh=live.slice().sort((a,b)=>(b.at?.toMillis?.()||0)-(a.at?.toMillis?.()||0)).slice(0,6).map(p=>({...p,key:projKey(p)}));
  const posts=hubCfg.hidePosts?[]:popularPosts();
  const postHTML=await Promise.all(posts.map(async p=>{const u=await C().getUser(p.uid);const img=safeImg(p.image);
    return`<button class="hpost" data-goto="posts">${img?`<div class="hpimg" style="background-image:url('${img}')"></div>`:''}<div class="hpbody"><div class="hpuser">${C().pic(u,26)}<b>${C().nameHTML(u,{badges:false})}</b></div><p>${esc((p.text||'').replace(/^#{1,3}\s*/gm,'').slice(0,140))||'<span class="muted">Image post</span>'}</p><span class="muted">❤️ ${(p.likes||[]).length} · 👁 ${p.views||0} · 💬 ${p.ecomments||0}</span></div></button>`}));
  box.innerHTML=hero+
    (pinned.length?`<h2 class="hsec">⭐ Featured</h2><div class="hrow">${pinned.map(i=>card(i)).join('')}</div>`:'')+
    (hubCfg.hideTop?'':`<h2 class="hsec">🔥 Most played</h2><div class="hgrid">${top.map(g=>card(g)).join('')}</div>`)+
    (posts.length?`<h2 class="hsec">📰 Popular this week</h2><div class="hposts">${postHTML.join('')}</div>`:'')+
    (hubCfg.hideNew||!fresh.length?'':`<h2 class="hsec">✨ New from Lumen creators</h2><div class="hgrid">${fresh.map(p=>card(p)).join('')}</div>`)+
    (isCreator()?'':`<div class="hcta card"><div><b>🛠 Make things for Lumen</b><p class="muted">Become a Lumen creator to get your games and websites onto the Hub, the Games tab and Web → Featured.</p></div><button class="btn-acc" data-goto="creator">${myApp?.status==='pending'?'Application sent ✓':'Apply'}</button></div>`);
  bindOpen(box);bindGo(box);fillCreators(box)}
function bindGo(root){root.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>L.go(b.dataset.goto))}

/* ---------- Games tab: creator games + hidden built-ins ---------- */
L.hub={play,builtinHidden:key=>(hubCfg.hiddenBuiltins||[]).includes(key),
  decorateGames(grid){const games=live.filter(p=>p.type==='game');if(!games.length)return;
    grid.insertAdjacentHTML('beforeend',`<div class="gsec">🛠 From Lumen creators</div>`+games.map(p=>card({...p,key:projKey(p)})).join(''));bindOpen(grid);fillCreators(grid)},
  featuredPage(el,openUrl){const sites=live.filter(p=>p.type==='site').sort((a,b)=>(plays[projKey(b)]||0)-(plays[projKey(a)]||0));
    el.innerHTML=`<div class="ytp"><div class="yt-top"><span class="yt-logo" style="background:linear-gradient(135deg,#ffd76a,#ff9a5c)">⭐</span><b>Featured</b><span class="muted" style="font-size:13px">Websites made by Lumen creators</span></div>
      ${sites.length?`<div class="hgrid">${sites.map(p=>card({...p,key:projKey(p)})).join('')}</div>`:`<p class="muted">No featured websites yet.${me?' Lumen creators can add theirs from the Creator Dashboard.':' Sign in to see them.'}</p>`}</div>`;
    el.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{const p=findItem(b.dataset.open);if(!p)return;play(b.dataset.open);openUrl(p.url)});fillCreators(el)},
  renderAdminTab};
const prevView=L.onView;L.onView=v=>{prevView?.(v);if(v==='hub')renderHub();if(v==='creator')renderCreator()};

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
  const tot=myProjects.reduce((a,p)=>a+(plays[projKey(p)]||0),0),liveN=myProjects.filter(p=>p.status==='approved').length,pend=myProjects.filter(p=>p.status==='pending').length,feat=myProjects.filter(p=>(hubCfg.pinned||[]).includes(projKey(p))).length;
  const f=editing||{};
  box.innerHTML=`<div class="an-stats">${[['📦','Projects',myProjects.length],['✅','Live',liveN],['⏳','In review',pend],['▶','Total plays',tot],['⭐','Featured',feat]].map(([i,l,v])=>`<div class="card an-stat"><span>${i} ${l}</span><b>${fmtN(v)}</b></div>`).join('')}</div>
    <div class="cr-grid"><div class="card"><h2>${editing?'Edit project':'New project'}</h2><p class="muted" style="font-size:13px">${editing?'Saving sends it back for review.':'It goes live once the admin approves it.'}</p>
      <label>Type</label><div class="seg" id="crType"><button type="button" data-t="game" class="${(f.type||'game')==='game'?'on':''}">🎮 Game</button><button type="button" data-t="site" class="${f.type==='site'?'on':''}">🌐 Website</button></div>
      <label>Title</label><input id="crTitle" maxlength="60" value="${esc(f.title||'')}" placeholder="My awesome game">
      <label>Link (must start with https://)</label><input id="crUrl" maxlength="500" value="${esc(f.url||'')}" placeholder="https://…">
      <label>Short description</label><textarea id="crDesc" rows="2" maxlength="300">${esc(f.desc||'')}</textarea>
      <label>Cover image</label><div class="row"><button type="button" id="crImgBtn">🖼 Upload</button><input type="file" id="crImg" accept="image/*" hidden><span class="muted" id="crImgName" style="font-size:12px">${f.image?'Image set':''}</span></div>
      <div class="row" style="margin-top:16px"><button class="btn-acc" id="crSave" style="flex:1">${editing?'Save and resubmit':'Submit for review'}</button>${editing?'<button id="crCancel">Cancel</button>':''}</div>
      <p class="muted" style="font-size:12px;margin:10px 0 0">Tip: games must work when opened inside another page (most HTML5 games on itch.io, GitHub Pages or your own site do). Sites that refuse to be embedded will open in a new tab.</p></div>
    <div class="card"><h2>My projects</h2><div class="list">${myProjects.map(p=>{const st=(hubCfg.pinned||[]).includes(projKey(p))&&p.status==='approved'?['⭐ Featured','feat']:{approved:['● Live','live'],pending:['⏳ In review','pend'],rejected:['✕ Not approved','rej']}[p.status]||['?',''];
      return`<div class="cr-proj"><div class="hart mini" style="${art(p)}"></div><div class="info"><b>${esc(p.title)}</b><span><em class="pill ${st[1]}">${st[0]}</em> ${p.type==='site'?'Website':'Game'} · ▶ ${fmtN(plays[projKey(p)]||0)}</span></div>
        <button class="ib" data-edit="${p.id}" title="Edit">✏️</button><button class="ib" data-del="${p.id}" title="Delete">🗑</button></div>`}).join('')||'<p class="muted">Nothing yet. Submit your first project on the left.</p>'}</div></div></div>`;
  $$('#crType button').forEach(b=>b.onclick=()=>{$$('#crType button').forEach(x=>x.classList.toggle('on',x===b))});
  $('#crImgBtn').onclick=()=>$('#crImg').click();$('#crImg').onchange=async e=>{const fl=e.target.files[0];if(!fl)return;newImage=await L.shrinkImage(fl,640,.78);if(newImage.length>290000)newImage=await L.shrinkImage(fl,360,.6);$('#crImgName').textContent='✓ '+fl.name};
  $('#crSave').onclick=saveProject;$('#crCancel')?.addEventListener('click',()=>{editing=null;newImage=null;renderCreator()});
  box.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editing=myProjects.find(p=>p.id===b.dataset.edit);newImage=null;renderCreator();box.scrollIntoView({behavior:'smooth'})});
  box.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this project?'))return;try{await C().F.deleteDoc(C().D('projects',b.dataset.del))}catch(e){toast(e.message)}})}
async function apply(){const about=$('#crAbout').value.trim();if(about.length<10)return toast('Tell the admin a little about what you’ll make');
  try{await C().F.setDoc(C().D('creatorApps',me),{uid:me,about:about.slice(0,600),links:$('#crLinks').value.trim().slice(0,400),status:'pending',at:C().F.serverTimestamp()});toast('Application sent')}catch(e){toast('Couldn’t apply: '+e.message)}}
async function saveProject(){const type=$('#crType .on')?.dataset.t||'game',title=$('#crTitle').value.trim(),url=$('#crUrl').value.trim(),desc=$('#crDesc').value.trim();
  if(title.length<2)return toast('Give it a title');if(!/^https:\/\/\S+$/i.test(url))return toast('The link must start with https://');
  const data={uid:me,type,title:title.slice(0,60),url:url.slice(0,500),desc:desc.slice(0,300),image:newImage??editing?.image??'',status:'pending',featured:editing?.featured||false,at:C().F.serverTimestamp()};
  try{if(editing)await C().F.setDoc(C().D('projects',editing.id),data);else await C().F.addDoc(C().F.collection(C().db,'projects'),data);toast(editing?'Saved: back in review':'Submitted for review');editing=null;newImage=null;renderCreator()}catch(e){toast('Couldn’t save: '+e.message)}}

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
      <label class="chk"><input type="checkbox" id="hbTop" ${hubCfg.hideTop?'':'checked'}> 🔥 Most played games</label>
      <label class="chk"><input type="checkbox" id="hbPosts" ${hubCfg.hidePosts?'':'checked'}> 📰 Popular posts this week</label>
      <label class="chk"><input type="checkbox" id="hbNew" ${hubCfg.hideNew?'':'checked'}> ✨ New from Lumen creators</label>
      <h2 style="margin-top:18px">⭐ Featured</h2><p class="muted" style="font-size:13px">Pick what appears in the Featured row (also from the Projects tab with ☆).</p>
      <div class="list">${[...BUILTINS.map(g=>({...g,key:g.key})),...live.map(p=>({...p,key:projKey(p)}))].map(i=>`<label class="chk" style="margin:4px 0"><input type="checkbox" data-pinbox="${esc(i.key)}" ${(hubCfg.pinned||[]).includes(i.key)?'checked':''}> ${esc(i.title)} <span class="muted" style="font-size:12px">${i.type==='site'?'website':'game'}</span></label>`).join('')}</div></div></div>
    <button class="btn-acc" id="hbSave" style="margin-top:16px;padding:12px 26px">Save Hub</button>`;
    $$('#hbHue button').forEach(b=>b.onclick=()=>$$('#hbHue button').forEach(x=>x.classList.toggle('on',x===b)));
    $('#hbSave').onclick=()=>saveHub({kicker:$('#hbKick').value.trim(),title:$('#hbTitle').value.trim(),subtitle:$('#hbSub').value.trim(),announce:$('#hbAnn').value.trim(),hue:$('#hbHue .on')?.dataset.h||'aurora',
      hideTop:!$('#hbTop').checked,hidePosts:!$('#hbPosts').checked,hideNew:!$('#hbNew').checked,pinned:$$('[data-pinbox]').filter(c=>c.checked).map(c=>c.dataset.pinbox)},'Hub saved');return}}
async function saveHub(data,msg){try{await C().F.setDoc(C().D('server','hub'),data,{merge:true});if(msg)toast(msg)}catch(e){toast(e.code==='permission-denied'?'Firebase refused this. Re-publish the latest firestore.rules.':e.message)}}
L.hubCounts=()=>({apps:allApps.filter(a=>a.status==='pending').length,queue:allProjects.filter(p=>p.status==='pending').length,creators:allApps.filter(a=>a.status==='approved').length,live:allProjects.filter(p=>p.status==='approved').length});
if(C()?.profile?.())L.onProfile(C().profile());
renderHub();
