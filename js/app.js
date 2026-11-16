/* Lumen core: settings, games, web viewer, study / swap / panic, timetable. Online features live in cloud.js. */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const KEY='hub.cfg.v1';
const DEF={panicAction:'redirect',panicUrl:'https://www.google.com',panicKey:'`',studyKey:'v',swapKey:'b',startStudy:true,swapMute:true,
 histDisguise:true,histTitle:'Google Classroom',wipe:false,blurPanic:false,grade:'mid',
 title:'Lumen',icon:'',portal:'Learning Portal',brand:'Lumen',acc:'#7c5cff',acc2:'#22d3ee',bg:'#06070b',
 rooms:'general,games,random',nbUrl:'nightbound/index.html',extra:'',
 webLinks:'YouTube | https://www.youtube.com\nWikipedia | https://en.m.wikipedia.org\nDesmos | https://www.desmos.com/calculator\nCoolmath | https://www.coolmathgames.com',
 jumpLinks:'Google | https://www.google.com\nGoogle Classroom | https://classroom.google.com\nGoogle Docs | https://docs.google.com',
 share:true,shareGame:true,shareYt:true,shareWeb:false,seeOthers:true,timetable:[],materials:[]};
let cfg;try{cfg={...DEF,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{cfg={...DEF}}
if(cfg.studyKey==='\\')cfg.studyKey='v';
if(cfg.nbUrl==='../index.html')cfg.nbUrl=DEF.nbUrl;
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
  $('#sPortal').textContent=cfg.portal;$('#sLogo').textContent=(cfg.portal||'L')[0];}

/* ---------- navigation ---------- */
function go(v){$$('.nav-btn').forEach(x=>x.classList.toggle('on',x.dataset.v===v));$$('.view').forEach(e=>e.classList.toggle('on',e.id==='v-'+v));
  if(v==='settings')fillSettings();if(v==='timetable')renderTT();window.Lumen?.onView?.(v)}
$$('.nav-btn').forEach(b=>b.onclick=()=>go(b.dataset.v));

/* ---------- viewer (games + web pages) ---------- */
let view=null; // {url,title,act}
function ytId(u){const m=String(u).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);return m&&m[1]}
function openView(url,title,act){
  const w=$('#viewer');w.querySelector('iframe')?.remove();const f=document.createElement('iframe');
  f.src=url;f.allow='fullscreen; autoplay; gamepad; microphone; encrypted-media; picture-in-picture';f.referrerPolicy='strict-origin-when-cross-origin';
  w.appendChild(f);w.style.display='flex';$('#viewTitle').textContent=title;view={url,title,act};
  f.addEventListener('load',()=>hookFrame(f));hookFrame(f);setActivity(act)}
function closeView(){const w=$('#viewer');w.querySelector('iframe')?.remove();w.style.display='none';view=null;setActivity(null)}
// same-origin frames (Nightbound): keep panic keys working and track audio so Swap can mute it
function hookFrame(f){try{const w=f.contentWindow;if(!w||w.__lumen)return;w.__lumen=1;w.addEventListener('keydown',onKey,true);
  const A=w.AudioContext;if(A&&!A.__lumen){const ctxs=w.__lumenCtx=[];const P=class extends A{constructor(...a){super(...a);ctxs.push(this)}};P.__lumen=1;w.AudioContext=P;if(w.webkitAudioContext)w.webkitAudioContext=P}}catch{}}
function setFrameMuted(m){const f=$('#viewer iframe');if(!f)return;try{const w=f.contentWindow;(w.__lumenCtx||[]).forEach(c=>m?c.suspend():c.resume());
  w.document.querySelectorAll('audio,video').forEach(v=>m?(v.__p=!v.paused,v.pause()):(v.__p&&v.play()))}catch{}
  // cross-origin YouTube: pause/play through its player API
  try{f.contentWindow.postMessage(JSON.stringify({event:'command',func:m?'pauseVideo':'playVideo',args:[]}),'*')}catch{}}
$('#closeView').onclick=closeView;$('#fsBtn').onclick=()=>$('#viewer').requestFullscreen?.();
$('#vReload').onclick=()=>{if(view)openView(view.url,view.title,view.act)};
$('#vCloak').onclick=()=>{if(view)cloak(view.url,view.title)};

/* games */
function games(){const g=[{name:'Nightbound',url:cfg.nbUrl,desc:'1v4 asymmetric horror · online multiplayer',art:'radial-gradient(circle at 30% 20%,#5a1020,#1a0608 60%,#06070b)',fg:'#ff4d6d'}];
  lines(cfg.extra).forEach((p,i)=>g.push({...p,desc:'Custom game',art:`linear-gradient(135deg,hsl(${i*70+200} 60% 25%),hsl(${i*70+250} 60% 12%))`,fg:'#fff'}));return g}
function renderGames(){$('#gameGrid').innerHTML=games().map((g,i)=>`<div class="card game-card" data-i="${i}"><div class="game-art" style="background:${g.art};color:${g.fg}">${esc(g.name)}</div><div class="meta"><b>${esc(g.name)}</b><span>${esc(g.desc)}</span></div></div>`).join('');
  $$('.game-card').forEach(c=>c.onclick=()=>{const g=games()[c.dataset.i];openView(g.url,g.name,{kind:'game',label:g.name})})}

/* web */
async function openWeb(raw){let u=String(raw).trim();if(!u)return;if(!/^https?:\/\//i.test(u))u=/\s/.test(u)||!/\./.test(u)?'https://www.bing.com/search?q='+encodeURIComponent(u):'https://'+u;
  const id=ytId(u);
  if(id){openView(`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&enablejsapi=1`,'YouTube',{kind:'youtube',label:'a YouTube video'});
    try{const r=await fetch('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent('https://www.youtube.com/watch?v='+id));const j=await r.json();
      if(view&&view.url.includes(id)){view.title=j.title;$('#viewTitle').textContent=j.title;view.act={kind:'youtube',label:j.title};setActivity(view.act)}}catch{}return}
  if(/^https?:\/\/(www\.|m\.)?youtube\.com\/?(\?|$)/i.test(u)){toast('Paste a YouTube video link in the box to play it here');$('#urlIn').focus();return}
  let host;try{host=new URL(u).hostname.replace(/^www\./,'')}catch{return toast('That doesn’t look like a link')}
  openView(u,host,{kind:'web',label:host})}
function renderWeb(){$('#webGrid').innerHTML=lines(cfg.webLinks).map((l,i)=>{let h='';try{h=new URL(l.url).hostname}catch{}return`<div class="card tile" data-i="${i}"><div class="ic"><img src="${favUrl(h)}" alt=""></div><b>${esc(l.name)}</b><span>${esc(h)}</span></div>`}).join('');
  $$('.tile').forEach(t=>t.onclick=()=>openWeb(lines(cfg.webLinks)[t.dataset.i].url))}
$('#urlForm').onsubmit=e=>{e.preventDefault();openWeb($('#urlIn').value)};

/* about:blank cloak */
function cloak(url,title){const w=window.open('about:blank','_blank');if(!w){toast('Allow pop-ups for this site');return null}
  w.document.write(`<!doctype html><title>${esc(title||cfg.title||'Google')}</title><link rel="icon" href="${cfg.icon?favUrl(cfg.icon):'data:,'}"><style>html,body{margin:0;height:100%;overflow:hidden}iframe{border:0;width:100%;height:100%}</style><iframe src="${esc(url)}" allow="fullscreen; autoplay; microphone; encrypted-media"></iframe>`);w.document.close();return w}
$('#stealthBtn').onclick=()=>{if(cloak(location.href.split('#')[0],cfg.title))location.replace(fixUrl(cfg.panicUrl||'https://www.google.com'))};

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
function enterStudy({keep=false}={}){if(!keep)closeView();else setFrameMuted(cfg.swapMute);swapped=keep;
  const{c,state}=currentClass();const sub=c.subject||'Study';const lib=libFor(sub);const lvl=lib&&(lib[cfg.grade]||lib.mid);
  $('#sSubject').textContent=sub;$('#sBanner').style.background=lib?.color||'#1967d2';
  $('#sInfo').textContent=(state==='now'?`${c.day} · ${c.start}–${c.end} · Current lesson`:state==='next'?`Next lesson at ${c.start}`:'Revision notes')+' · '+({lower:'Key Stage 3',mid:'GCSE',upper:'A-level'}[cfg.grade]||'');
  const s=sub.toLowerCase();const own=cfg.materials.filter(m=>{const t=m.subject.toLowerCase().trim();return t&&(s.includes(t)||t.includes(s))});
  const pages={};if(own.length)pages['Class notes']=own.map(m=>'<ul>'+m.notes.split('\n').filter(Boolean).map(l=>`<li>${linkify(l)}</li>`).join('')+'</ul>').join('');
  Object.assign(pages,lvl||{'Notes':`<p>No built-in notes for <b>${esc(sub)}</b> yet. Add your own on the Timetable page.</p>`});
  const names=Object.keys(pages);const show=n=>{$('#sTabs').innerHTML=names.map(x=>`<button class="${x===n?'on':''}">${esc(x)}</button>`).join('');$$('#sTabs button').forEach((b,i)=>b.onclick=()=>show(names[i]));$('#sContent').innerHTML=`<div class="s-card"><h2>${esc(n)}</h2>${pages[n]}</div>`};show(names[0]);
  document.title=sub+' – '+cfg.portal;$('#fav').href=favUrl('classroom.google.com');$('#study').classList.add('on');$('#study').scrollTop=0;
  const tick=()=>$('#sClock').textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});tick();clearInterval(clockT);clockT=setInterval(tick,10000);
  if(!keep)setActivity(null);else window.Lumen?.onActivity?.(null)}
function exitStudy(){$('#study').classList.remove('on');clearInterval(clockT);applyLook();if(swapped){setFrameMuted(false);swapped=false;window.Lumen?.onActivity?.(activity)}}
const studyOn=()=>$('#study').classList.contains('on');
$('#studyBtn').onclick=()=>enterStudy();$('#sBack').ondblclick=exitStudy;

/* ---------- panic & switch ---------- */
function disguiseHistory(){if(!cfg.histDisguise)return;const t=cfg.histTitle||'Google Classroom';
  try{document.title=t;$('#fav').href=favUrl('classroom.google.com');history.replaceState(null,t,location.pathname.replace(/[^/]*$/,'')+'?'+t.toLowerCase().replace(/[^a-z0-9]+/g,'-'))}catch{}
  try{if(window.top!==window.self)window.top.document.title=t}catch{}}
function leaveTo(url){url=fixUrl(url||'https://www.google.com');document.body.innerHTML='';
  try{if(window.top!==window.self)window.top.location.replace(url);else location.replace(url)}catch{location.replace(url)}}
function cleanup(){closeView();window.Lumen?.onPanic?.();if(cfg.wipe){try{sessionStorage.clear();Object.keys(localStorage).filter(k=>k.startsWith('hub.chat.')).forEach(k=>localStorage.removeItem(k))}catch{}}}
function panic(){if(cfg.panicAction==='study'){enterStudy();return}
  cleanup();disguiseHistory();
  setTimeout(()=>{if(cfg.panicAction==='close'){try{(window.top!==window.self?window.top:window).close()}catch{}setTimeout(()=>leaveTo(cfg.panicUrl),120)}else leaveTo(cfg.panicUrl)},cfg.histDisguise?180:0)}
function switchTo(url){cleanup();disguiseHistory();setTimeout(()=>leaveTo(url),cfg.histDisguise?150:0)}
$('#panicBtn').onclick=panic;
function renderJump(){$('#jumpList').innerHTML=lines(cfg.jumpLinks).map((l,i)=>{let h='';try{h=new URL(l.url).hostname}catch{}return`<button class="person" data-j="${i}" style="text-align:left"><img src="${favUrl(h)}" width="20" height="20" alt=""><div class="info"><b>${esc(l.name)}</b><span>${esc(h)}</span></div></button>`}).join('')||'<p class="muted">Add pages in Settings → “Switch to” pages.</p>';
  $$('#jumpList [data-j]').forEach(b=>b.onclick=()=>switchTo(lines(cfg.jumpLinks)[b.dataset.j].url))}
$('#jumpBtn').onclick=()=>{renderJump();openModal('jumpModal');setTimeout(()=>$('#jumpIn').focus(),50)};
$('#jumpForm').onsubmit=e=>{e.preventDefault();const v=$('#jumpIn').value.trim();if(v)switchTo(v)};

let capturing=false;
const typing=t=>t&&(/INPUT|TEXTAREA|SELECT/.test(t.tagName)||t.isContentEditable);
const same=(a,b)=>String(a).toLowerCase()===String(b).toLowerCase();
function onKey(e){if(capturing)return;const t=e.target;
  if(e.key===cfg.panicKey){e.preventDefault();e.stopPropagation();panic();return}
  if(typing(t)||e.ctrlKey||e.metaKey||e.altKey)return;
  if(same(e.key,cfg.studyKey)){e.preventDefault();e.stopPropagation();studyOn()?exitStudy():enterStudy()}
  else if(same(e.key,cfg.swapKey)){e.preventDefault();e.stopPropagation();studyOn()?exitStudy():enterStudy({keep:true})}}
addEventListener('keydown',onKey,true);
addEventListener('blur',()=>{if(cfg.blurPanic)setTimeout(()=>{if(!document.hasFocus()&&document.activeElement?.tagName!=='IFRAME')panic()},150)});

/* ---------- settings ---------- */
const FIELDS=['panicAction','panicUrl','histTitle','panicKey','studyKey','swapKey','grade','portal','title','icon','brand','acc','acc2','bg','nbUrl','extra','webLinks','jumpLinks','rooms'];
const CHECKS=['histDisguise','wipe','blurPanic','startStudy','swapMute'];
function fillSettings(){FIELDS.forEach(f=>$('#s_'+f).value=cfg[f]);CHECKS.forEach(f=>$('#s_'+f).checked=cfg[f])}
['panicKey','studyKey','swapKey'].forEach(f=>{const el=$('#s_'+f);el.onfocus=()=>{capturing=true;el.value='Press a key…'};el.onblur=()=>{capturing=false;if(el.value==='Press a key…')el.value=cfg[f]};
  el.onkeydown=e=>{e.preventDefault();if(e.key==='Tab'||e.key==='Escape'){el.blur();return}el.value=e.key.length===1?e.key.toLowerCase():e.key;el.blur()}});
$$('[data-preset]').forEach(b=>b.onclick=()=>{const[t,i]=b.dataset.preset.split('|');$('#s_title').value=t;$('#s_icon').value=i});
$('#saveBtn').onclick=()=>{const keys=['panicKey','studyKey','swapKey'].map(f=>$('#s_'+f).value);if(new Set(keys.map(k=>k.toLowerCase())).size<3)return toast('Panic, study and swap need different keys');
  const oldRooms=cfg.rooms;FIELDS.forEach(f=>cfg[f]=$('#s_'+f).value);CHECKS.forEach(f=>cfg[f]=$('#s_'+f).checked);save();applyLook();renderGames();renderWeb();if(oldRooms!==cfg.rooms)window.Lumen?.onRooms?.();toast('Saved')};
$('#exportAll').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(cfg,null,2)],{type:'application/json'}));a.download='lumen-settings.json';a.click()};
$('#importAll').onclick=()=>$('#importFile').click();
$('#importFile').onchange=async e=>{try{cfg={...DEF,...JSON.parse(await e.target.files[0].text())};save();location.reload()}catch{toast('Invalid file')}};
$('#resetAll').onclick=()=>{if(confirm('Reset all settings and timetable on this device?')){Object.keys(localStorage).filter(k=>k.startsWith('hub.')).forEach(k=>localStorage.removeItem(k));location.reload()}};

/* shared with cloud.js */
window.Lumen={cfg,save,esc,linkify,safeImg,toast,openModal,closeModal,shrinkImage,go,getActivity:()=>studyOn()?null:activity};

/* ---------- boot ---------- */
applyLook();renderGames();renderWeb();
if(cfg.startStudy)enterStudy();
