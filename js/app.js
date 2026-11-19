/* Lumen core: settings, games, web viewer, study / swap / panic, timetable. Online features live in cloud.js. */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const IN_APP=/LumenApp\//.test(navigator.userAgent);
const KEY='hub.cfg.v1';
const DEF={notifPop:true,nbPublic:true,bwMode:'normal',bwW:100,bwH:100,panicAction:'redirect',panicUrl:'https://www.google.com',panicKey:'`',studyKey:'v',swapKey:'b',startMode:'study',startUrl:'lumen:doc',hotCorner:true,schedule:[],swapMute:true,
 navPos:'left',navStyle:'full',density:'comfy',fontScale:'100',radius:'28',blur:'24',anim:true,hiddenNav:[],
 histDisguise:true,histTitle:'Google Classroom',wipe:false,blurPanic:false,grade:'mid',
 title:'Learning Portal',icon:'',portal:'Learning Portal',brand:'Lumen',acc:'#7c5cff',acc2:'#22d3ee',bg:'#06070b',
 rooms:'general,games,random',nbUrl:'nightbound/index.html',extra:'',games:[],searchEngine:'google',
 webLinks:'YouTube | lumen:youtube\nWikipedia | https://en.m.wikipedia.org\nDesmos | https://www.desmos.com/calculator\nCoolmath | https://www.coolmathgames.com',
 jumpLinks:'Google | https://www.google.com\nGoogle Classroom | https://classroom.google.com\nGoogle Docs | https://docs.google.com',
 share:true,shareGame:true,shareYt:true,shareWeb:false,seeOthers:true,timetable:[],materials:[]};
let cfg;try{cfg={...DEF,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{cfg={...DEF}}
if(cfg.studyKey==='\\')cfg.studyKey='v';
if('startStudy' in cfg){if(cfg.startStudy===false&&cfg.startMode==='study')cfg.startMode='lumen';delete cfg.startStudy}
if(cfg.nbUrl==='../index.html')cfg.nbUrl=DEF.nbUrl;
cfg.portal='Learning Portal';if(!cfg.title||cfg.title==='Lumen')cfg.title='Learning Portal';if(['aiKey','aiOn','startMode','startUrl','startStudy'].some(k=>k in cfg)){delete cfg.aiKey;delete cfg.aiOn;delete cfg.startMode;delete cfg.startUrl;delete cfg.startStudy;try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch{}}
if(cfg.extra){String(cfg.extra).split('\n').map(l=>l.split('|')).filter(p=>p.length>1&&p[1].trim()).forEach(p=>cfg.games.push({id:'g'+Date.now()+Math.random().toString(36).slice(2,6),name:p[0].trim(),url:p[1].trim(),emoji:'🎮',color:'#7c5cff'}));cfg.extra=''}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch{}};
const toast=t=>{const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2200)};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const linkify=s=>esc(s).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
const safeImg=u=>typeof u==='string'&&(/^https:\/\/[^\s"'<>]+$/i.test(u)||/^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(u))?u:'';
const lines=t=>String(t||'').split('\n').map(l=>l.split('|')).filter(p=>p.length>1&&p[1].trim()).map(p=>({name:p[0].trim(),url:fixUrl(p[1].trim())}));
const fixUrl=u=>/^[a-z]+:/i.test(u)||u.startsWith('/')||/^[\w-]+\/.*\.html/.test(u)?u:'https://'+u;
const favUrl=d=>'https://www.google.com/s2/favicons?sz=64&domain='+encodeURIComponent(d);
const openModal=id=>$('#'+id).classList.add('on'),closeModal=id=>$('#'+id).classList.remove('on');
$$('.modal').forEach(m=>{m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-close]')){e.preventDefault();m.classList.remove('on')}})});

/* image helper: shrink to a JPEG data URL */
async function shrinkImage(file,max,q=.82){const img=await createImageBitmap(file);const s=Math.min(1,max/Math.max(img.width,img.height));
  const c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);
  const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
  let out=c.toDataURL('image/jpeg',q);while(out.length>700000&&q>.3){q-=.15;out=c.toDataURL('image/jpeg',q)}return out}

/* ---------- activity (what you're doing), handed to cloud.js ---------- */
let activity=null;
function setActivity(a){activity=a;window.Lumen?.onActivity?.(a)}

/* ---------- look ---------- */
function applyLook(){const r=document.documentElement.style;r.setProperty('--acc',cfg.acc);r.setProperty('--acc2',cfg.acc2);r.setProperty('--bg',cfg.bg);
  $('#brand').textContent=cfg.brand||'Lumen';
  if(!$('#study').classList.contains('on')){document.title=cfg.title||'Lumen';$('#fav').href=cfg.icon?favUrl(cfg.icon):'data:,'}
  $('#kPanic').textContent=cfg.panicKey;$('#kStudy').textContent=cfg.studyKey;$('#kSwap').textContent=cfg.swapKey;
  $('#sPortal').textContent=cfg.portal;$('#sLogo').textContent=(cfg.portal||'L')[0];applyLayout()}
function applyLayout(){const b=document.body.classList,r=document.documentElement.style;
  b.toggle('nav-right',cfg.navPos==='right');b.toggle('nav-top',cfg.navPos==='top');b.toggle('nav-icons',cfg.navStyle==='icons'&&cfg.navPos!=='top');
  b.toggle('compact',cfg.density==='compact');b.toggle('anim-off',!cfg.anim);
  r.setProperty('--r',cfg.radius+'px');r.setProperty('--blur',cfg.blur+'px');$('#app').style.zoom=(+cfg.fontScale||100)/100;
  $$('nav .nav-btn').forEach(n=>{if(n.id==='navAdmin'||n.id==='navCreator')return;n.style.display=(cfg.hiddenNav||[]).includes(n.dataset.v)?'none':''})}

/* ---------- navigation ---------- */
function go(v){if(v==='admin'&&$('#navAdmin').style.display==='none')v='hub';if(v==='creator'){v='games';setTimeout(()=>window.Lumen?.hub?.gamesTab?.('create'))}$$('.nav-btn').forEach(x=>x.classList.toggle('on',x.dataset.v===v));$$('.view').forEach(e=>e.classList.toggle('on',e.id==='v-'+v));
  if(v==='settings')fillSettings();if(v==='timetable')renderTT();window.Lumen?.onView?.(v)}
$$('.nav-btn').forEach(b=>b.onclick=()=>go(b.dataset.v));

/* ---------- viewer (games + web pages) ---------- */
let view=null; // {url,title,act,opts}
function ytId(u){const m=String(u).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);return m&&m[1]}
// opts.html: a game uploaded to the Store runs from its own HTML in a sandbox (its own origin), so it can't reach Lumen's account data
function openView(url,title,act,opts){
  const w=$('#viewer');w.querySelector('iframe')?.remove();const f=document.createElement('iframe');
  if(opts?.html){f.sandbox='allow-scripts allow-pointer-lock allow-forms allow-modals allow-popups allow-downloads allow-orientation-lock';f.srcdoc=opts.html}else f.src=url;
  f.allow='fullscreen; autoplay; gamepad; microphone; encrypted-media; picture-in-picture';f.referrerPolicy='strict-origin-when-cross-origin';
  w.appendChild(f);w.style.display='flex';$('#viewTitle').textContent=title;view={url,title,act,opts};
  f.addEventListener('load',()=>hookFrame(f));hookFrame(f);setActivity(act)}
function closeView(){const w=$('#viewer');w.querySelector('iframe')?.remove();w.style.display='none';view=null;setActivity(null)}
// same-origin frames (Nightbound): keep panic keys working and track audio so Swap can mute it
function hookFrame(f){try{const w=f.contentWindow;if(!w)return;
  const inner=()=>{try{w.document.querySelectorAll('iframe').forEach(x=>{if(!x.__lumenHook){x.__lumenHook=1;x.addEventListener('load',()=>hookFrame(x));hookFrame(x)}})}catch{}};
  // watch each new document for frames (the first one is often a blank page that gets replaced)
  if(w.__lumenDoc!==w.document){w.__lumenDoc=w.document;try{new w.MutationObserver(inner).observe(w.document.documentElement,{childList:true,subtree:true})}catch{}}inner();
  if(w.__lumen)return;w.__lumen=1;w.addEventListener('keydown',onKey,true);
  const A=w.AudioContext;if(A&&!A.__lumen){const ctxs=w.__lumenCtx=[];const P=class extends A{constructor(...a){super(...a);ctxs.push(this)}};P.__lumen=1;w.AudioContext=P;if(w.webkitAudioContext)w.webkitAudioContext=P}}catch{}}
function setFrameMuted(m){const f=$('#viewer iframe');if(!f)return;try{const w=f.contentWindow;(w.__lumenCtx||[]).forEach(c=>m?c.suspend():c.resume());
  w.document.querySelectorAll('audio,video').forEach(v=>m?(v.__p=!v.paused,v.pause()):(v.__p&&v.play()))}catch{}
  // cross-origin YouTube: pause/play through its player API
  try{f.contentWindow.postMessage(JSON.stringify({event:'command',func:m?'pauseVideo':'playVideo',args:[]}),'*')}catch{}}
$('#closeView').onclick=closeView;$('#fsBtn').onclick=()=>$('#viewer').requestFullscreen?.();
$('#vReload').onclick=()=>{if(view)openView(view.url,view.title,view.act,view.opts)};
$('#vCloak').onclick=()=>{if(!view)return;if(view.opts?.html)return toast('Games uploaded to the Store can only be played here');cloak(view.url,view.title)};

/* games */
const BUILTIN=[{name:'Nightbound',url:()=>cfg.nbUrl,desc:'1v4 asymmetric horror · online multiplayer',art:'radial-gradient(circle at 30% 20%,#5a1020,#1a0608 60%,#06070b)',fg:'#ff4d6d'},
  {name:'Fixing Good',url:()=>'games/fixing-good.html',desc:'Desert crime action · story mode',art:"url('games/fixing-good-poster.webp') center/cover",fg:'transparent',poster:true},
  {name:"Lumi's Leap",url:()=>'games/lumis-leap.html',desc:'2D platformer · six worlds',art:"url('games/lumis-leap-poster.webp') center/cover",fg:'transparent',poster:true}];
// uploaded game files live in IndexedDB (too big for localStorage)
const gdb=()=>new Promise((ok,no)=>{const r=indexedDB.open('lumen-games',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
async function gfile(op,id,val){const db=await gdb();return new Promise((ok,no)=>{const tx=db.transaction('files',op==='get'?'readonly':'readwrite'),st=tx.objectStore('files');
  const r=op==='get'?st.get(id):op==='put'?st.put(val,id):st.delete(id);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
let blobUrl=null;
async function playCustom(g){if(g.file){try{const f=await gfile('get',g.id);if(!f)return toast('That game file is missing on this device');if(blobUrl)URL.revokeObjectURL(blobUrl);
    blobUrl=URL.createObjectURL(new Blob([f],{type:'text/html'}));openView(blobUrl,g.name,{kind:'game',label:g.name})}catch{toast('Could not open the game file')}}
  else openView(fixUrl(g.url),g.name,{kind:'game',label:g.name})}
function renderGames(){
  const bkey=g=>'b_'+g.name.toLowerCase().replace(/[^a-z0-9]/g,'');
  const b=[].map((g,i)=>`<div class="card game-card" data-b="${i}"><div class="game-art" style="background:${g.art};color:${g.fg}">${g.poster?'':esc(g.name)}</div><div class="meta"><b>${esc(g.name)}</b><span>${esc(g.desc)}</span></div></div>`);
  const c=(cfg.games||[]).map(g=>{const col=/^#[0-9a-f]{6}$/i.test(g.color)?g.color:'#7c5cff';return`<div class="card game-card" data-c="${esc(g.id)}"><button class="g-del" data-del="${esc(g.id)}" title="Remove">✕</button><div class="game-art" style="background:radial-gradient(circle at 30% 20%,${col},#0b0b12 75%);color:#fff"><span style="font-size:52px;font-style:normal">${esc(g.emoji||'🎮')}</span></div><div class="meta"><b>${esc(g.name)}</b><span>${g.file?'Your file · this device':'Custom link'}</span></div></div>`});
  $('#gameGrid').innerHTML=b.join('')+c.join('')+`<div class="card game-card add-game" id="addGame"><div class="game-art"><span style="font-size:46px;font-style:normal">＋</span></div><div class="meta"><b>Add a game</b><span>A link or an HTML file</span></div></div>`;
  $$('#gameGrid [data-b]').forEach(e=>e.onclick=()=>{const g=BUILTIN[e.dataset.b];window.Lumen?.hub?.play(bkey(g));openView(g.url(),g.name,{kind:'game',label:g.name})});
  $$('#gameGrid [data-c]').forEach(e=>e.onclick=ev=>{if(ev.target.closest('[data-del]'))return;playCustom(cfg.games.find(g=>g.id===e.dataset.c))});
  $$('#gameGrid [data-del]').forEach(x=>x.onclick=async()=>{const g=cfg.games.find(g=>g.id===x.dataset.del);if(!confirm(`Remove ${g.name}?`))return;cfg.games=cfg.games.filter(y=>y!==g);save();if(g.file)gfile('del',g.id).catch(()=>{});renderGames()});
  $('#addGame').onclick=()=>{$('#gName').value='';$('#gEmoji').value='';$('#gUrl').value='';$('#gFile').value='';openModal('gameModal');setTimeout(()=>$('#gName').focus(),50)}}
$$('input[name=gSrc]').forEach(r=>r.onchange=()=>{const f=$('input[name=gSrc]:checked').value==='file';$('#gFileRow').style.display=f?'':'none';$('#gUrlRow').style.display=f?'none':''});
$('#gFile').onchange=()=>{const f=$('#gFile').files[0];if(f&&!$('#gName').value)$('#gName').value=f.name.replace(/\.html?$/i,'').replace(/[-_]+/g,' ').slice(0,30)};
$('#gSave').onclick=async()=>{const name=$('#gName').value.trim();if(!name)return toast('Give the game a name');const file=$('input[name=gSrc]:checked').value==='file';
  const g={id:'g'+Date.now().toString(36),name,emoji:$('#gEmoji').value.trim()||'🎮',color:$('#gColor').value};
  if(file){const f=$('#gFile').files[0];if(!f)return toast('Choose an HTML file');try{await gfile('put',g.id,await f.arrayBuffer());g.file=true}catch{return toast('Could not save the file (browser storage full?)')}}
  else{const u=$('#gUrl').value.trim();if(!u)return toast('Paste the game link');g.url=u}
  cfg.games.push(g);save();closeModal('gameModal');renderGames();toast(name+' added')};

/* about:blank cloak */
const NOFRAME=/(^|\.)(youtube\.com|instagram\.com|tiktok\.com|discord\.com|reddit\.com|x\.com|twitter\.com|facebook\.com|netflix\.com|twitch\.tv|spotify\.com|roblox\.com|github\.com|chatgpt\.com|claude\.ai|duckduckgo\.com|bing\.com)$/i;
function cloak(url,title,force){if(IN_APP){window.open(url,'_blank');toast('Opened in your phone’s browser');return null}const id=ytId(url);if(id)url=`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
  let host='';try{host=new URL(url).hostname}catch{}
  if(/^(www\.)?google\.[a-z.]+$/i.test(host)&&!/igu=1/.test(url))url+=(url.includes('?')?'&':'?')+'igu=1';
  try{url=new URL(url).href}catch{}
  if(!force&&!FRAMEABLE.test(url)){const n=window.open(url,'_blank');if(!n){toast('Allow pop-ups for this site');return null}try{n.opener=null}catch{}
    toast(`${host.replace(/^www\./,'')} can't be cloaked (it refuses to load inside other pages), so it opened in a normal tab. That tab shows in your history.`);return null}
  const w=window.open('about:blank','_blank');if(!w){toast('Allow pop-ups for this site');return null}
  w.document.write(`<!doctype html><title>${esc(title||cfg.title||'Google')}</title><link rel="icon" href="${cfg.icon?favUrl(cfg.icon):'data:,'}"><style>html,body{margin:0;height:100%;overflow:hidden}iframe{border:0;width:100%;height:100%}</style><iframe src="${esc(url)}" allow="fullscreen; autoplay; microphone; encrypted-media"></iframe>`);w.document.close();toast('Opened in a cloaked tab, so it won\'t show in your history');return w}
$('#stealthBtn').onclick=()=>{if(cloak(location.href.split('#')[0],cfg.title,true))location.replace(fixUrl(cfg.panicUrl||'https://www.google.com'))};

/* ---------- timetable ---------- */
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const normDay=d=>{d=String(d).trim().slice(0,3).toLowerCase();const i=DAYS.findIndex(x=>x.toLowerCase()===d);return i<0?'Mon':DAYS[i]};
const normTime=t=>{const m=String(t).trim().match(/(\d{1,2})[:.]?(\d{2})?\s*(am|pm)?/i);if(!m)return'09:00';let h=+m[1];const mi=m[2]||'00';if(m[3]){if(/pm/i.test(m[3])&&h<12)h+=12;if(/am/i.test(m[3])&&h===12)h=0}return String(h).padStart(2,'0')+':'+mi};
const mins=t=>{const[h,m]=String(t).split(':').map(Number);return h*60+m};
function parseTT(text){return text.split(/\r?\n/).map(l=>l.split(/[,\t;|]/).map(s=>s.trim())).filter(p=>p.length>=4&&/^(sun|mon|tue|wed|thu|fri|sat)/i.test(p[0])).map(p=>({day:normDay(p[0]),start:normTime(p[1]),end:normTime(p[2]),subject:p[3]}))}
function renderTT(){$('#ttBody').innerHTML=cfg.timetable.map((c,i)=>`<tr><td><select data-i="${i}" data-k="day">${DAYS.map(d=>`<option ${d===c.day?'selected':''}>${d}</option>`).join('')}</select></td><td><input type="time" data-i="${i}" data-k="start" value="${c.start}"></td><td><input type="time" data-i="${i}" data-k="end" value="${c.end}"></td><td><input data-i="${i}" data-k="subject" value="${esc(c.subject)}"></td><td><button class="x" data-del="${i}">✕</button></td></tr>`).join('')||'<tr><td colspan="5" class="muted">No classes yet. Press “+ Add class”.</td></tr>';
  $$('#ttBody [data-k]').forEach(e=>e.onchange=()=>{cfg.timetable[e.dataset.i][e.dataset.k]=e.value;save();showNow()});
  $$('#ttBody [data-del]').forEach(b=>b.onclick=()=>{cfg.timetable.splice(b.dataset.del,1);save();renderTT()});
  $('#matBody').innerHTML=cfg.materials.map((m,i)=>`<tr><td><input data-mi="${i}" data-k="subject" value="${esc(m.subject)}"></td><td><textarea rows="2" data-mi="${i}" data-k="notes">${esc(m.notes)}</textarea></td><td><button class="x" data-mdel="${i}">✕</button></td></tr>`).join('');
  $$('#matBody [data-mi]').forEach(e=>e.onchange=()=>{cfg.materials[e.dataset.mi][e.dataset.k]=e.value;save()});
  $$('#matBody [data-mdel]').forEach(b=>b.onclick=()=>{cfg.materials.splice(b.dataset.mdel,1);save();renderTT()});showNow()}
function currentClass(){const d=new Date(),day=DAYS[d.getDay()],n=d.getHours()*60+d.getMinutes();const today=cfg.timetable.filter(c=>c.day===day).sort((a,b)=>mins(a.start)-mins(b.start));
  const now=today.find(c=>n>=mins(c.start)&&n<mins(c.end));if(now)return{c:now,state:'now'};const next=today.find(c=>mins(c.start)>n);if(next)return{c:next,state:'next'};
  const prev=today.filter(c=>mins(c.end)<=n).pop();if(prev)return{c:prev,state:'earlier'};return{c:cfg.timetable[0]||{subject:'Maths',start:'',end:''},state:'none'}}
function showNow(){const{c,state}=currentClass();$('#nowBox').innerHTML=cfg.timetable.length?`Study mode right now would open <b style="color:var(--text)">${esc(c.subject)}</b> (${state==='now'?'on now':state==='next'?'next class':state==='earlier'?'last class today':'no class today'})`:''}
$('#ttAdd').onclick=()=>{cfg.timetable.push({day:DAYS[new Date().getDay()]==='Sun'||DAYS[new Date().getDay()]==='Sat'?'Mon':DAYS[new Date().getDay()],start:'09:00',end:'10:00',subject:''});save();renderTT();$$('#ttBody [data-k=subject]').pop()?.focus()};
$('#ttSample').onclick=()=>{const subs=['Maths','English','Science','History','Geography','Computing','French'];cfg.timetable=[];['Mon','Tue','Wed','Thu','Fri'].forEach((d,di)=>['08:50','09:50','11:10','12:10','14:00'].forEach((s,i)=>{cfg.timetable.push({day:d,start:s,end:String(mins(s)+50>=0?Math.floor((mins(s)+50)/60):0).padStart(2,'0')+':'+String((mins(s)+50)%60).padStart(2,'0'),subject:subs[(di*2+i)%subs.length]})}));save();renderTT()};
$('#ttUploadBtn').onclick=()=>$('#ttFile').click();
$('#ttFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;const rows=parseTT(await f.text());e.target.value='';if(!rows.length)return toast('No rows found. Use: Day, Start, End, Subject');cfg.timetable=rows;save();renderTT();toast(`Loaded ${rows.length} classes`)};
$('#ttExport').onclick=()=>{const csv='Day,Start,End,Subject\n'+cfg.timetable.map(c=>[c.day,c.start,c.end,c.subject].join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='timetable.csv';a.click()};
$('#matAdd').onclick=()=>{cfg.materials.push({subject:'',notes:''});save();renderTT()};

/* ---------- study mode & swap ---------- */
let clockT,swapped=false;
function enterStudy({keep=false}={}){if(!keep)closeView();else{setFrameMuted(cfg.swapMute);if(cfg.swapMute)window.Lumen?.browser?.pause(true)}swapped=keep;
  const{c,state}=currentClass();const sub=c.subject||'Study';const lib=libFor(sub);const lvl=lib&&(lib[cfg.grade]||lib.mid||lib.upper||lib.lower);
  $('#sSubject').textContent=sub;$('#sBanner').style.background=lib?.color||'#1967d2';
  $('#sInfo').textContent=(state==='now'?`${c.day} · ${c.start}–${c.end} · Current lesson`:state==='next'?`Next lesson at ${c.start}`:'Revision notes')+' · '+({lower:'MYP 1–3',mid:'MYP 4–5',upper:'IB Diploma'}[cfg.grade]||'');
  const s=sub.toLowerCase();const own=cfg.materials.filter(m=>{const t=m.subject.toLowerCase().trim();return t&&(s.includes(t)||t.includes(s))});
  const pages={};if(own.length)pages['Class notes']=own.map(m=>'<ul>'+m.notes.split('\n').filter(Boolean).map(l=>`<li>${linkify(l)}</li>`).join('')+'</ul>').join('');
  Object.assign(pages,lvl||{'Notes':`<p>No built-in notes for <b>${esc(sub)}</b> yet. Add your own on the Timetable page.</p>`});
  const names=Object.keys(pages);const show=n=>{$('#sTabs').innerHTML=names.map(x=>`<button class="${x===n?'on':''}">${esc(x)}</button>`).join('');$$('#sTabs button').forEach((b,i)=>b.onclick=()=>show(names[i]));$('#sContent').innerHTML=`<div class="s-card"><h2>${esc(n)}</h2>${pages[n]}</div>`};show(names[0]);
  document.title=sub+' – '+cfg.portal;$('#fav').href=favUrl('classroom.google.com');$('#study').classList.add('on');document.body.classList.add('in-portal');$('#study').scrollTop=0;
  const tick=()=>$('#sClock').textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});tick();clearInterval(clockT);clockT=setInterval(tick,10000);
  if(!keep)setActivity(null);else window.Lumen?.onActivity?.(null)}
function exitStudy(){const wasOn=studyOn();$('#study').classList.remove('on');document.body.classList.remove('in-portal');if(wasOn)setTimeout(showNews,400);clearInterval(clockT);applyLook();if(swapped){setFrameMuted(false);window.Lumen?.browser?.pause(false);swapped=false;window.Lumen?.onActivity?.(activity)}}
const studyOn=()=>$('#study').classList.contains('on');
$('#studyBtn').onclick=()=>enterStudy();$('#sBack').ondblclick=exitStudy;

/* ---------- panic & switch ---------- */
function disguiseHistory(){if(!cfg.histDisguise)return;const t=cfg.histTitle||'Google Classroom';
  try{document.title=t;$('#fav').href=favUrl('classroom.google.com');history.replaceState(null,t,location.pathname.replace(/[^/]*$/,'')+'?'+t.toLowerCase().replace(/[^a-z0-9]+/g,'-'))}catch{}
  try{if(window.top!==window.self)window.top.document.title=t}catch{}}
function leaveTo(url){url=fixUrl(url||'https://www.google.com');document.body.innerHTML='';
  try{if(window.top!==window.self)window.top.location.replace(url);else location.replace(url)}catch{location.replace(url)}}
/* ---------- cover pages (startup page + timed pages) ---------- */
let coverOn=false,coverSwap=false;
// sites that never load inside another page: show the essay decoy instead of a "refused to connect" error
const REFUSES=/(^|\.)(classroom\.google\.com|docs\.google\.com|drive\.google\.com|mail\.google\.com|accounts\.google\.com|github\.com|instagram\.com|tiktok\.com|discord\.com|reddit\.com|x\.com|twitter\.com|facebook\.com|netflix\.com|twitch\.tv|spotify\.com|roblox\.com|chatgpt\.com|bing\.com|duckduckgo\.com|instructure\.com|teams\.microsoft\.com|office\.com|outlook\.live\.com)$/i;
function decoyHTML(kind){const today=new Date().toLocaleDateString([],{day:'numeric',month:'long',year:'numeric'});
  const shell=(title,body)=>`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{margin:0;background:#f1f3f4;font:15px/1.6 Arial,sans-serif;color:#202124}.bar{background:#fff;border-bottom:1px solid #dadce0;padding:10px 18px;display:flex;gap:14px;align-items:center}.ic{width:30px;height:38px;border-radius:3px;background:#4285f4;position:relative}.ic:after{content:"";position:absolute;left:7px;right:7px;top:12px;height:14px;border-top:2px solid #fff;border-bottom:2px solid #fff}.tb{background:#fff;border-bottom:1px solid #dadce0;padding:6px 18px;color:#444;font-size:13px;display:flex;gap:18px}.page{background:#fff;width:min(816px,92%);margin:22px auto;min-height:1056px;padding:72px 84px;box-sizing:border-box;box-shadow:0 1px 3px rgba(60,64,67,.3);outline:none}h1{font-size:24px;font-weight:400;margin:0 0 6px}p{margin:0 0 14px;text-align:justify}.q{margin:0 0 26px}.ans{border-bottom:1px solid #999;height:28px;margin-top:8px}</style></head><body><div class="bar"><div class="ic"></div><div><div style="font-size:18px">${title}</div><div style="font-size:12px;color:#5f6368">File&nbsp;&nbsp;Edit&nbsp;&nbsp;View&nbsp;&nbsp;Insert&nbsp;&nbsp;Format&nbsp;&nbsp;Tools&nbsp;&nbsp;Help</div></div></div><div class="tb"><span>100%</span><span>Normal text</span><span>Arial</span><span>11</span><b>B</b><i>I</i><u>U</u></div><div class="page" contenteditable spellcheck="false">${body}</div></body></html>`;
  if(kind==='worksheet')return shell('Maths worksheet',`<h1>Algebra practice</h1><p style="color:#5f6368">${today}</p>${['Solve 3x + 7 = 22','Expand (x + 4)(x − 3)','Factorise x² + 9x + 20','Solve the simultaneous equations 2x + y = 11 and x − y = 1','Find the gradient of the line through (2, 5) and (6, 13)','Make r the subject of A = πr²'].map((q,i)=>`<div class="q"><b>${i+1}.</b> ${q}<div class="ans"></div><div class="ans"></div></div>`).join('')}`);
  return shell('Essay draft',`<h1>How far did the Industrial Revolution change everyday life?</h1><p style="color:#5f6368">${today}</p><p>The Industrial Revolution transformed Britain between roughly 1760 and 1840, reshaping not only how goods were produced but where and how people lived. Mechanised factories drew workers away from agricultural villages and into rapidly growing towns such as Manchester and Leeds, where the population more than doubled within a generation.</p><p>Working life changed most visibly. Instead of seasonal labour governed by daylight and harvests, factory work was measured by the clock, with shifts of twelve hours or more. Children were employed in large numbers until reforms such as the Factory Act of 1833 began to limit their hours.</p><p>Living conditions, however, often failed to keep pace with this growth. Overcrowded housing, poor sanitation and polluted water led to outbreaks of cholera and typhus. It was only later in the nineteenth century that public health legislation began to address these problems.</p><p>On the other hand, the period also brought cheaper goods, new forms of transport and, eventually, rising living standards. The railways in particular shrank distances and created a national market…</p>`)}
// sites known to load fine inside Lumen; anything else opens as the real page in this tab
const FRAMEABLE=/^https:\/\/((www\.)?google\.[a-z.]+\/(webhp|search)\?[^#]*igu=1|([a-z]+\.)?(m\.)?wikipedia\.org\/|(www\.)?desmos\.com\/|(www\.)?geogebra\.org\/|(www\.)?youtube-nocookie\.com\/embed\/|dreadlineofficial\.github\.io\/)/i;
function openReal(url){try{sessionStorage.setItem('hub.realcover',String(Date.now()))}catch{}closeView();window.Lumen?.onPanic?.();toast(document.documentElement.dataset.lumenExt==='1'?'Opening… press your key to come back to Lumen':'Opening… press your browser’s Back button to return to Lumen');
  // switching before Lumen has finished loading would replace Lumen in the history, so Back couldn't return to it
  const go=()=>setTimeout(()=>location.assign(url),250);if(document.readyState==='complete')go();else addEventListener('load',go,{once:true})}
// coming back with the Back button: don't bounce straight to the startup page again
addEventListener('pageshow',e=>{if(e.persisted){coverOn=false;$('#cover')?.classList.remove('on');applyLook()}});
function showCover(url,{fromSwap=false}={}){url=String(url||'').trim()||'lumen:doc';
  if(url==='lumen:study'){if(fromSwap){setFrameMuted(true);window.Lumen?.browser?.pause(true)}enterStudy({keep:fromSwap});return}
  let host='';try{if(!url.startsWith('lumen:'))host=new URL(fixUrl(url)).hostname}catch{}
  if(url.startsWith('lumen:')){const kind=url.slice(6)==='worksheet'?'worksheet':'doc';coverSwap=fromSwap;if(fromSwap){setFrameMuted(true);window.Lumen?.browser?.pause(true)}
    const f=$('#coverFrame');f.removeAttribute('src');f.srcdoc=decoyHTML(kind);f.onload=()=>{try{f.contentWindow.addEventListener('keydown',onKey,true);f.contentWindow.addEventListener('mousemove',e=>{if(e.clientX<=3&&e.clientY<=3&&(e.movementX||e.movementY))cornerHit()})}catch{}};
    $('#cover').classList.add('on');coverOn=true;window.Lumen?.onActivity?.(null);document.title=kind==='worksheet'?'Maths worksheet':'Essay draft';$('#fav').href=favUrl('docs.google.com');return}
  $('#coverFrame').removeAttribute('srcdoc');url=fixUrl(url);try{url=new URL(url).href}catch{}
  // Google can be shown inside Lumen in its special embeddable mode
  if(/^https?:\/\/(www\.)?google\.[a-z.]+\/?(\?.*)?$/i.test(url)&&!/igu=1/.test(url))url='https://www.google.com/webhp?igu=1';
  else if(/^https?:\/\/(www\.)?google\.[a-z.]+\/search\?/i.test(url)&&!/igu=1/.test(url))url+='&igu=1';
  const id=ytId(url);if(id)url=`https://www.youtube-nocookie.com/embed/${id}`;
  if(!FRAMEABLE.test(url)){openReal(url);return}
  coverSwap=fromSwap;if(fromSwap){setFrameMuted(true);window.Lumen?.browser?.pause(true)}
  $('#coverFrame').src=url;$('#cover').classList.add('on');coverOn=true;window.Lumen?.onActivity?.(null);
  let h='';try{h=new URL(url).hostname.replace(/^www\./,'')}catch{}document.title=h.includes('google')?'Google':h||'New Tab';$('#fav').href=favUrl(h||'google.com')}
function hideCover(){if(!coverOn)return;setTimeout(showNews,400);coverOn=false;$('#cover').classList.remove('on');$('#coverFrame').removeAttribute('srcdoc');$('#coverFrame').src='about:blank';if(coverSwap){setFrameMuted(false);window.Lumen?.browser?.pause(false)}coverSwap=false;applyLook();window.Lumen?.onActivity?.(activity)}
// cross-origin pages swallow key presses; pull focus back so Panic keeps working
addEventListener('blur',()=>{if(coverOn)setTimeout(()=>{if(document.activeElement===$('#coverFrame')){$('#coverFrame').blur();window.focus()}},0)});
$('#coverHot').addEventListener('mouseenter',()=>setTimeout(()=>{if($('#coverHot').matches(':hover'))cornerHit()},120));
let hotN=0,hotT;$('#coverHot').onclick=()=>{hotN++;clearTimeout(hotT);hotT=setTimeout(()=>hotN=0,600);if(hotN>=3){hotN=0;hideCover()}};
function scheduledCover(){const d=new Date(),day=DAYS[d.getDay()],n=d.getHours()*60+d.getMinutes();
  return(cfg.schedule||[]).find(r=>r.url&&r.start&&r.end&&(r.day==='all'||r.day===day||(r.day==='weekdays'&&d.getDay()%6!==0))&&n>=mins(r.start)&&n<mins(r.end))}
function renderSched(){const opts=[['all','Every day'],['weekdays','Weekdays'],...DAYS.map(d=>[d,d])];
  $('#schedBody').innerHTML=(cfg.schedule||[]).map((r,i)=>`<tr><td><select data-si="${i}" data-k="day">${opts.map(([v,t])=>`<option value="${v}" ${r.day===v?'selected':''}>${t}</option>`).join('')}</select></td><td><input type="time" data-si="${i}" data-k="start" value="${r.start}"></td><td><input type="time" data-si="${i}" data-k="end" value="${r.end}"></td><td><input data-si="${i}" data-k="url" value="${esc(r.url)}" placeholder="https://…"></td><td><button data-test="${i}">Test</button></td><td><button class="x" data-sdel="${i}">✕</button></td></tr>`).join('')||'<tr><td colspan="6" class="muted">No timed pages yet.</td></tr>';
  $$('#schedBody [data-si]').forEach(e=>e.onchange=()=>{cfg.schedule[e.dataset.si][e.dataset.k]=e.value;save()});
  $$('#schedBody [data-sdel]').forEach(b=>b.onclick=()=>{cfg.schedule.splice(b.dataset.sdel,1);save();renderSched()});
  $$('#schedBody [data-test]').forEach(b=>b.onclick=()=>{showCover(cfg.schedule[b.dataset.test].url);toast('Press Panic to come back')})}
$('#schedAdd').onclick=()=>{cfg.schedule=cfg.schedule||[];cfg.schedule.push({day:'weekdays',start:'09:00',end:'10:00',url:''});save();renderSched()};

function cleanup(){closeView();window.Lumen?.browser?.wipe();window.Lumen?.onPanic?.();if(cfg.wipe){try{sessionStorage.clear();Object.keys(localStorage).filter(k=>k.startsWith('hub.chat.')).forEach(k=>localStorage.removeItem(k))}catch{}}}
function panic(){if(coverOn){hideCover();return}const sc=scheduledCover();if(sc){showCover(sc.url,{fromSwap:true});return}
  if(cfg.panicAction==='study'){enterStudy();return}
  cleanup();disguiseHistory();
  setTimeout(()=>{if(cfg.panicAction==='close'&&window.LumenApp){LumenApp.close();leaveTo(cfg.panicUrl)}else if(cfg.panicAction==='close'){try{(window.top!==window.self?window.top:window).close()}catch{}setTimeout(()=>leaveTo(cfg.panicUrl),120)}else leaveTo(cfg.panicUrl)},cfg.histDisguise?180:0)}
function switchTo(url){cleanup();disguiseHistory();setTimeout(()=>leaveTo(url),cfg.histDisguise?150:0)}
$('#panicBtn').onclick=panic;
$('#fabPanic').onclick=panic;$('#fabStudy').onclick=()=>studyOn()?exitStudy():enterStudy();
function renderJump(){$('#jumpList').innerHTML=lines(cfg.jumpLinks).map((l,i)=>{let h='';try{h=new URL(l.url).hostname}catch{}return`<button class="person" data-j="${i}" style="text-align:left"><img src="${favUrl(h)}" width="20" height="20" alt=""><div class="info"><b>${esc(l.name)}</b><span>${esc(h)}</span></div></button>`}).join('')||'<p class="muted">Add pages in Settings → “Switch to” pages.</p>';
  $$('#jumpList [data-j]').forEach(b=>b.onclick=()=>switchTo(lines(cfg.jumpLinks)[b.dataset.j].url))}
$('#jumpBtn').onclick=()=>{renderJump();openModal('jumpModal');setTimeout(()=>$('#jumpIn').focus(),50)};
$('#jumpForm').onsubmit=e=>{e.preventDefault();const v=$('#jumpIn').value.trim();if(v)switchTo(v)};

let capturing=false;
const typing=t=>t&&(/INPUT|TEXTAREA|SELECT/.test(t.tagName)||t.isContentEditable);
const same=(a,b)=>String(a).toLowerCase()===String(b).toLowerCase();
// Panic, Study and Swap work everywhere in Lumen (and in Lumen's own games). Inside a text box,
// a single press types the letter and a quick double-press triggers the action instead.
const tap={key:'',at:0};
// a game in fullscreen (or holding the mouse) would hide the portal: let go of both first
function leaveFullscreen(){try{const f=$('#viewer iframe'),fd=f?.contentDocument;fd?.exitPointerLock?.();if(fd?.fullscreenElement)fd.exitFullscreen?.()}catch{}
  try{document.exitPointerLock?.();if(document.fullscreenElement)document.exitFullscreen?.()}catch{}}
function runKey(which){leaveFullscreen();try{if(document.activeElement?.tagName==='IFRAME'){document.activeElement.blur();window.focus()}}catch{}if(which==='panic')return panic();
  if(which==='study')return studyOn()?exitStudy():enterStudy();
  if(studyOn())exitStudy();else{const sc=scheduledCover();sc?showCover(sc.url,{fromSwap:true}):enterStudy({keep:true})}}
// is this window (or a frame inside it) the game in Lumen's viewer?
function inViewer(w){try{for(let i=0;w&&i<6;i++){const fe=w.frameElement;if(!fe)return false;if(fe.closest?.('#viewer'))return true;w=w.parent}}catch{}return false}
function onKey(e){if(capturing)return;const t=e.target;
  if(['Shift','Control','Alt','Meta'].includes(e.key))return;
  const which=e.key===cfg.panicKey?'panic':same(e.key,cfg.studyKey)?'study':same(e.key,cfg.swapKey)?'swap':null;
  const inFrame=!!t?.ownerDocument&&t.ownerDocument!==document;
  if(!which){if(!inFrame||typing(t))tap.key='';return}
  if(e.repeat){if(inFrame){e.preventDefault();e.stopPropagation()}return}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(coverOn){e.preventDefault();e.stopPropagation();hideCover();return}
  // inside a game, letters belong to the game: Study and Swap need a quick double-tap there (Panic stays one press)
  const inGame=which!=='panic'&&!studyOn()&&!coverOn&&inFrame&&inViewer(t.ownerDocument.defaultView);
  if(inGame&&!typing(t)){const now=Date.now();if(tap.key!==which||now-tap.at>650){tap.key=which;tap.at=now;return}tap.key='';e.preventDefault();e.stopPropagation();runKey(which);return}
  if(typing(t)&&e.key.length===1&&!t.readOnly){const now=Date.now();
    if(tap.key!==which||now-tap.at>450){tap.key=which;tap.at=now;return}
    tap.key='';try{const v=t.value,p=t.selectionStart;if(v[p-1]&&same(v[p-1],e.key)){t.value=v.slice(0,p-1)+v.slice(p);t.setSelectionRange(p-1,p-1)}}catch{}}
  e.preventDefault();e.stopPropagation();runKey(which)}
addEventListener('keydown',onKey,true);
let cornerT=0,cornerAt=0;
function cornerHit(){if(!cfg.hotCorner||Date.now()-cornerAt<1500)return;cornerAt=Date.now();if(coverOn)hideCover();else if(!studyOn())enterStudy()}
// only a real move *into* the corner counts (browsers also send fake moves when a page loads)
let wasOut=false;
addEventListener('mousemove',e=>{const inC=e.clientX<=3&&e.clientY<=3,moved=e.movementX||e.movementY;
  if(!inC){if(moved)wasOut=true;if(cornerT){clearTimeout(cornerT);cornerT=0}return}
  if(moved&&wasOut&&!cornerT)cornerT=setTimeout(()=>{cornerT=0;wasOut=false;cornerHit()},120)},{passive:true});
addEventListener('blur',()=>{if(cfg.blurPanic)setTimeout(()=>{if(!document.hasFocus()&&document.activeElement?.tagName!=='IFRAME')panic()},150)});

/* ---------- settings ---------- */
const FIELDS=['searchEngine','navPos','navStyle','density','fontScale','radius','blur','panicAction','panicUrl','histTitle','panicKey','studyKey','swapKey','grade','title','icon','brand','acc','acc2','bg','nbUrl','webLinks','jumpLinks','rooms'];
const CHECKS=['histDisguise','wipe','blurPanic','swapMute','anim','hotCorner','notifPop','nbPublic'];
function fillSettings(){guideKeys();FIELDS.forEach(f=>$('#s_'+f).value=cfg[f]);CHECKS.forEach(f=>$('#s_'+f).checked=cfg[f]);renderSched();$('#fsVal').textContent=cfg.fontScale+'%';
  $('#navToggles').innerHTML=$$('nav .nav-btn').filter(n=>n.id!=='navAdmin'&&n.id!=='navCreator').map(n=>`<label class="chk" style="margin:0 10px 0 0"><input type="checkbox" data-nav="${n.dataset.v}" ${(cfg.hiddenNav||[]).includes(n.dataset.v)?'':'checked'}> ${n.textContent.trim()}</label>`).join('')}
// layout controls preview live
['navPos','navStyle','density','fontScale','radius','blur'].forEach(f=>$('#s_'+f).addEventListener('input',()=>{cfg[f]=$('#s_'+f).value;$('#fsVal').textContent=cfg.fontScale+'%';applyLayout()}));
$('#s_anim').addEventListener('change',()=>{cfg.anim=$('#s_anim').checked;applyLayout()});
$('#navToggles').addEventListener('change',e=>{const v=e.target.dataset.nav;if(!v)return;const h=new Set(cfg.hiddenNav||[]);e.target.checked?h.delete(v):h.add(v);if(v==='settings'&&h.has(v)){e.target.checked=true;return toast('Settings has to stay visible')}cfg.hiddenNav=[...h];applyLayout()});
['panicKey','studyKey','swapKey'].forEach(f=>{const el=$('#s_'+f);el.onfocus=()=>{capturing=true;el.value='Press a key…'};el.onblur=()=>{capturing=false;if(el.value==='Press a key…')el.value=cfg[f]};
  el.onkeydown=e=>{e.preventDefault();if(e.key==='Tab'||e.key==='Escape'){el.blur();return}el.value=e.key.length===1?e.key.toLowerCase():e.key;el.blur()}});
$$('[data-preset]').forEach(b=>b.onclick=()=>{const[t,i]=b.dataset.preset.split('|');$('#s_title').value=t;$('#s_icon').value=i});
$('#saveBtn').onclick=()=>{const keys=['panicKey','studyKey','swapKey'].map(f=>$('#s_'+f).value);if(new Set(keys.map(k=>k.toLowerCase())).size<3)return toast('Panic, study and swap need different keys');
  const oldRooms=cfg.rooms;FIELDS.forEach(f=>cfg[f]=$('#s_'+f).value);CHECKS.forEach(f=>cfg[f]=$('#s_'+f).checked);save();applyLook();renderGames();window.Lumen?.browser?.refresh();if(oldRooms!==cfg.rooms)window.Lumen?.onRooms?.();toast('Saved')};
$('#exportAll').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(cfg,null,2)],{type:'application/json'}));a.download='lumen-settings.json';a.click()};
$('#importAll').onclick=()=>$('#importFile').click();
$('#importFile').onchange=async e=>{try{cfg={...DEF,...JSON.parse(await e.target.files[0].text())};save();location.reload()}catch{toast('Invalid file')}};
$('#resetAll').onclick=()=>{if(confirm('Reset all settings and timetable on this device?')){Object.keys(localStorage).filter(k=>k.startsWith('hub.')).forEach(k=>localStorage.removeItem(k));location.reload()}};

try{if(localStorage.getItem('hub.bwnote'))$('#bwNote').style.display='none'}catch{}
$('#bwNoteX').onclick=e=>{e.preventDefault();$('#bwNote').style.display='none';try{localStorage.setItem('hub.bwnote','1')}catch{}};

try{document.getElementById('lumenVer').textContent=window.LUMEN_VERSION||''}catch{}
// the ?lv= marker from the update check isn't needed once loaded
try{const u=new URL(location.href);if(u.searchParams.has('lv')){u.searchParams.delete('lv');history.replaceState(history.state,'',u.toString())}}catch{}
function extStatus(){const el=document.getElementById('extStatus');if(!el)return;const on=document.documentElement.dataset.lumenExt==='1';el.innerHTML=on?'<span style="color:#7ee2a8">● Installed and working</span>':'<span class="muted">○ Not installed in this browser</span>'}
setTimeout(extStatus,1800);document.addEventListener('click',e=>{if(e.target.closest?.('[data-v=settings]'))setTimeout(extStatus,50)});

document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g){e.preventDefault();closeModal('newsModal');go(g.dataset.go)}});
function guideKeys(){$$('.k-study').forEach(k=>k.textContent=cfg.studyKey);$$('.k-swap').forEach(k=>k.textContent=cfg.swapKey);$$('.k-panic').forEach(k=>k.textContent=cfg.panicKey)}

/* ---------- What's New (shown when you come back from study mode or a cover page) ---------- */
const NEWS={id:'2026-11-19m',items:[
  ['🛍','The new Lumen Store','Games, ebooks, documents and more from Lumen creators, with a cart, wishlist and reviews. Creators can sell their own things too.','shop'],
  ['🔥','Fixing Good','The desert crime story everyone’s talking about. Find it in the Store.','shop'],
  ['📅','Daily challenges on the Hub','Your three daily puzzles now sit right on the Hub. ✦ 100 Glow each.','hub'],
  ['🔥','5 days only: 10% off','Upgrade, Pro and Ultimate are 10% off until 24 November. See Shop → Lumen Lite.','shop'],
  ['📅','Daily challenges','Minesweeper, Memory and Slide: new puzzles every day, ✦ 100 Glow each. Right on the Hub (and at the top of Games).','games'],
  ['🛠','Create from Games','The creator tools moved into Games → Create, and creators\' games now show up right on the Games page (free or priced in Glow).','games'],
  ['🙈','Mute and report posts','Tap ⋯ on a post to hide posts from that person, or report a useless post. If the Lumen team agrees, it earns no Glow.','posts'],
  ['🎮','Two new games','Lumi\'s Leap, a brand-new platformer with six worlds, and Fixing Good, a desert crime story. Both are in the Games tab.','games'],
  ['🏷️','Stickers (beta)','Place little pictures anywhere on your profile bar. Stickers are made by Lumen creators and need Lumen Lite.','shop'],
  ['🛍','A proper store','Departments, aisles, search, sorting and filters in the Shop.','shop'],
  ['🧸','Put your buddy anywhere','Lite members choose where their buddy stands on their profile bar.','profile'],
]};
function showNews(){if(cfg.seenNews===NEWS.id||studyOn()||coverOn)return;
  $('#newsList').innerHTML=NEWS.items.map(([i,t,d,goTo])=>`<div class="news-item"><span class="news-ic">${esc(i)}</span><div><b>${esc(t)}</b><p>${esc(d)}</p>${goTo?`<button class="news-go" data-go="${goTo}">${goTo==='timetable'?'Set it up →':'Open →'}</button>`:''}</div></div>`).join('');
  openModal('newsModal');cfg.seenNews=NEWS.id;save()}

/* shared with cloud.js */
window.Lumen={IN_APP,openView,viewing:()=>view,rerenderGames:renderGames,showCover,NOFRAME,cfg,save,esc,linkify,safeImg,toast,openModal,closeModal,shrinkImage,go,lines,favUrl,ytId,cloak,setActivity,showCover,getActivity:()=>studyOn()||coverOn?null:activity};

/* ---------- boot ---------- */
applyLook();renderGames();
if(IN_APP){document.body.classList.add('in-app');$('#stealthBtn').closest('.card')?.querySelector('#stealthBtn')?.remove()}
// Lumen always opens on the Learning Portal (except when coming back from a page it opened)
let backFromReal=false;try{const t=+sessionStorage.getItem('hub.realcover');sessionStorage.removeItem('hub.realcover');const nav=performance.getEntriesByType?.('navigation')?.[0]?.type;backFromReal=nav==='back_forward'&&t>0&&Date.now()-t<36e5}catch{}
if(!backFromReal)enterStudy();
requestAnimationFrame(()=>document.documentElement.classList.remove('booting'));
