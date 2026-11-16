/* Lumen browser: tabs, address bar, new-tab page and built-in search. Pages open inside Lumen. */
(()=>{
const L=window.Lumen,{esc,toast,cfg,save}=L;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const body=$('#bwBody');
let tabs=[],active=null,seq=0;
const HKEY='hub.browser.history';
const recent=()=>{try{return JSON.parse(localStorage.getItem(HKEY)||'[]')}catch{return[]}};
const addRecent=(url,title)=>{if(cfg.wipeBrowsing)return;const r=recent().filter(x=>x.url!==url);r.unshift({url,title,at:Date.now()});try{localStorage.setItem(HKEY,JSON.stringify(r.slice(0,30)))}catch{}};
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch{return''}};

/* turn whatever was typed into a destination */
function resolve(input){let u=String(input||'').trim();if(!u||u==='lumen:newtab')return{internal:'newtab'};
  if(u.startsWith('lumen:search?q='))return{internal:'search',q:decodeURIComponent(u.slice(15))};
  const looksUrl=/^https?:\/\//i.test(u)||(!/\s/.test(u)&&/^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/i.test(u));
  if(!looksUrl)return{internal:'search',q:u};
  if(!/^https?:\/\//i.test(u))u='https://'+u;
  const id=L.ytId(u);if(id)return{url:`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&enablejsapi=1`,show:u,yt:id};
  if(/^https?:\/\/(www\.)?google\.[a-z.]+\/?(\?.*)?$/i.test(u))return{url:'https://www.google.com/webhp?igu=1',show:u};
  return{url:u,show:u}}

function newTab(input,{focus=true}={}){const t={id:++seq,hist:[],idx:-1,title:'New tab',fav:'',frame:null,page:null};tabs.push(t);
  t.page=document.createElement('div');t.page.className='bw-page';body.appendChild(t.page);
  t.frame=document.createElement('iframe');t.frame.allow='fullscreen; autoplay; encrypted-media; picture-in-picture; clipboard-write';t.frame.referrerPolicy='strict-origin-when-cross-origin';body.appendChild(t.frame);
  t.frame.addEventListener('load',()=>{try{const d=t.frame.contentDocument;if(d&&d.title){t.title=d.title;renderTabs()}}catch{}});
  activate(t);go(t,input||'lumen:newtab',true);if(focus&&!input)setTimeout(()=>$('#bwIn').focus(),30);return t}
function closeTab(t){const i=tabs.indexOf(t);t.frame.remove();t.page.remove();tabs.splice(i,1);
  if(!tabs.length){newTab();return}if(active===t)activate(tabs[Math.min(i,tabs.length-1)]);renderTabs()}
function activate(t){active=t;tabs.forEach(x=>{const cur=x.hist[x.idx];x.frame.classList.toggle('on',x===t&&!!cur?.url);x.page.classList.toggle('on',x===t&&!cur?.url)});renderTabs();syncBar()}
function go(t,input,push){const r=resolve(input);const entry={...r,input};
  if(push){t.hist=t.hist.slice(0,t.idx+1);t.hist.push(entry);t.idx=t.hist.length-1}
  show(t)}
function show(t){const e=t.hist[t.idx];$('#bwHint').style.display='none';
  if(e.internal){t.frame.removeAttribute('src');t.frame.src='about:blank';
    if(e.internal==='newtab'){t.title='New tab';t.fav='';newTabPage(t)}else{t.title=e.q+' – Search';t.fav='';searchPage(t,e.q)}
    if(t===active)L.setActivity(null)}
  else{t.frame.src=e.url;t.title=e.yt?'YouTube':host(e.show);t.fav=L.favUrl(host(e.show)||'youtube.com');addRecent(e.show,t.title);
    if(e.yt)ytTitle(t,e.yt);
    // most big sites refuse to be framed; nudge after a moment for anything that isn't known-friendly
    if(!/youtube-nocookie|wikipedia|desmos|google\.com\/webhp|lumen|github\.io|scratch\.mit/i.test(e.url))setTimeout(()=>{if(active===t&&t.hist[t.idx]===e)$('#bwHint').style.display=''},2500);
    if(t===active)L.setActivity(e.yt?{kind:'youtube',label:'a YouTube video'}:{kind:'web',label:host(e.show)})}
  if(t===active)activate(t);else renderTabs()}
async function ytTitle(t,id){try{const r=await fetch('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent('https://www.youtube.com/watch?v='+id));const j=await r.json();t.title=j.title;renderTabs();if(t===active)L.setActivity({kind:'youtube',label:j.title})}catch{}}

function renderTabs(){$('#bwTabs').innerHTML=tabs.map(t=>`<button class="bw-tab ${t===active?'on':''}" data-t="${t.id}">${t.fav?`<img src="${t.fav}" alt="">`:'<span>✦</span>'}<span class="t">${esc(t.title)}</span><span class="x" data-x="${t.id}">×</span></button>`).join('')+`<button class="bw-new" id="bwNew" title="New tab">＋</button>`;
  $$('#bwTabs [data-t]').forEach(b=>b.onclick=e=>{const t=tabs.find(x=>x.id==b.dataset.t);if(e.target.closest('[data-x]'))closeTab(t);else activate(t)});
  $('#bwNew').onclick=()=>newTab()}
function syncBar(){const t=active;if(!t)return;const e=t.hist[t.idx]||{};
  $('#bwIn').value=e.internal==='search'?e.q:e.internal?'':e.show||'';$('#bwLock').textContent=e.internal?'🔍':'🔒';
  $('#bwBack').disabled=t.idx<=0;$('#bwFwd').disabled=t.idx>=t.hist.length-1;
  body.classList.toggle('internal',!!e.internal);
  const links=L.lines(cfg.webLinks);$('#bwStar').textContent=e.show&&links.some(l=>l.url===e.show)?'★':'☆'}

/* ---- built-in pages ---- */
function newTabPage(t){const hr=new Date().getHours();const greet=hr<12?'Good morning':hr<18?'Good afternoon':'Good evening';
  const tiles=L.lines(cfg.webLinks);const rec=recent().slice(0,8);
  t.page.innerHTML=`<div class="np"><div class="clock" data-clock></div><div class="greet">${greet}. Where to?</div>
    <form data-s><input placeholder="Search, or type an address" autocomplete="off"></form>
    <div class="tiles">${tiles.map((l,i)=>`<button class="tl" data-go="${esc(l.url)}"><img src="${L.favUrl(host(l.url))}" alt="">${esc(l.name)}</button>`).join('')}</div>
    ${rec.length?`<div class="recent"><div class="side-h" style="padding-left:4px">Recently visited · <a data-clear style="display:inline;color:var(--mute)">clear</a></div>${rec.map(r=>`<a data-go="${esc(r.url)}">${esc(r.title)} <span class="muted">· ${esc(host(r.url))}</span></a>`).join('')}</div>`:''}</div>`;
  const tick=()=>{const c=t.page.querySelector('[data-clock]');if(c)c.textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})};tick();
  t.page.querySelector('[data-s]').onsubmit=e=>{e.preventDefault();go(t,e.target.querySelector('input').value,true)};
  t.page.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(t,b.dataset.go,true));
  t.page.querySelector('[data-clear]')?.addEventListener('click',()=>{localStorage.removeItem(HKEY);newTabPage(t)})}
setInterval(()=>$$('[data-clock]').forEach(c=>c.textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})),10000);

function calc(q){if(!/^[\d\s+\-*/().^%]+$/.test(q)||!/\d/.test(q)||!/[+\-*/^%]/.test(q))return null;try{const v=Function('"use strict";return ('+q.replace(/\^/g,'**')+')')();return Number.isFinite(v)?v:null}catch{return null}}
async function searchPage(t,q){const c=calc(q);
  t.page.innerHTML=`<div class="sr"><h2 style="font-size:28px;margin:0 0 4px">${esc(q)}</h2>
    ${c!==null?`<div class="card ans"><span class="muted">Calculator</span><div style="font-size:34px;font-weight:600">${esc(q)} = ${+c.toFixed(10)}</div></div>`:''}
    <div data-sum></div><div data-res><p class="muted">Searching…</p></div>
    <div class="ext"><span class="muted" style="align-self:center;font-size:13px">Search elsewhere (opens in a cloaked tab):</span>
      <button data-ext="https://duckduckgo.com/?q=">DuckDuckGo</button><button data-ext="https://www.google.com/search?q=">Google</button><button data-ext="https://www.youtube.com/results?search_query=">YouTube</button></div></div>`;
  t.page.querySelectorAll('[data-ext]').forEach(b=>b.onclick=()=>L.cloak(b.dataset.ext+encodeURIComponent(q),q));
  const W='https://en.wikipedia.org';
  try{const [s,r]=await Promise.all([
      fetch(`${W}/api/rest_v1/page/summary/${encodeURIComponent(q.replace(/ /g,'_'))}`).then(x=>x.ok?x.json():null).catch(()=>null),
      fetch(`${W}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&origin=*&srlimit=12`).then(x=>x.json())]);
    if(t.hist[t.idx]?.q!==q)return;
    if(s&&s.type!=='disambiguation'&&s.extract)t.page.querySelector('[data-sum]').innerHTML=`<div class="card ans" style="display:flex;gap:16px">${s.thumbnail?`<img src="${esc(s.thumbnail.source)}" style="width:90px;height:90px;object-fit:cover;border-radius:14px">`:''}<div><b style="font-size:18px">${esc(s.title)}</b><p style="margin:6px 0 0;color:var(--mute)">${esc(s.extract)}</p></div></div>`;
    const res=r?.query?.search||[];
    t.page.querySelector('[data-res]').innerHTML=res.map(x=>{const u=`https://en.m.wikipedia.org/wiki/${encodeURIComponent(x.title.replace(/ /g,'_'))}`;
      return`<div class="res"><div class="u">wikipedia.org › ${esc(x.title)}</div><a data-go="${u}">${esc(x.title)}</a><p>${esc(x.snippet.replace(/<[^>]+>/g,''))}…</p></div>`}).join('')||'<p class="muted">No results.</p>';
    t.page.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>go(t,a.dataset.go,true))}
  catch{t.page.querySelector('[data-res]').innerHTML='<p class="muted">Search is unavailable right now.</p>'}}

/* ---- toolbar ---- */
$('#bwForm').onsubmit=e=>{e.preventDefault();go(active,$('#bwIn').value,true);$('#bwIn').blur()};
$('#bwBack').onclick=()=>{if(active.idx>0){active.idx--;show(active)}};
$('#bwFwd').onclick=()=>{if(active.idx<active.hist.length-1){active.idx++;show(active)}};
$('#bwReload').onclick=()=>show(active);
$('#bwHome').onclick=()=>go(active,'lumen:newtab',true);
const curUrl=()=>{const e=active?.hist[active.idx];return e&&!e.internal?e.show:null};
$('#bwCloak').onclick=()=>{const u=curUrl();if(u)L.cloak(u,active.title);else toast('Open a page first')};
$('#bwHintCloak').onclick=e=>{e.preventDefault();$('#bwCloak').click()};
$('#bwHintX').onclick=e=>{e.preventDefault();$('#bwHint').style.display='none'};
$('#bwFull').onclick=()=>$('#bw').requestFullscreen?.();
$('#bwStar').onclick=()=>{const u=curUrl();if(!u)return toast('Open a page first');const ls=L.lines(cfg.webLinks);
  if(ls.some(l=>l.url===u)){cfg.webLinks=cfg.webLinks.split('\n').filter(l=>!l.includes(u)).join('\n');toast('Removed from shortcuts')}
  else{cfg.webLinks=(cfg.webLinks.trim()+'\n'+(active.title||host(u)).replace(/\|/g,'')+' | '+u).trim();toast('Added to shortcuts')}save();syncBar()};

/* ---- hooks used by the rest of Lumen ---- */
L.browser={open(url){L.go('web');const e=active?.hist[active.idx];if(active&&e?.internal==='newtab')go(active,url,true);else newTab(url)},
  pause(m){const f=active?.frame;try{f?.contentWindow.postMessage(JSON.stringify({event:'command',func:m?'pauseVideo':'playVideo',args:[]}),'*')}catch{}},
  wipe(){tabs.slice().forEach(t=>{t.frame.remove();t.page.remove()});tabs=[];active=null;if(cfg.wipe)localStorage.removeItem(HKEY);newTab(null,{focus:false})},
  refresh(){tabs.forEach(t=>{if(t.hist[t.idx]?.internal==='newtab')newTabPage(t)})}};
newTab(null,{focus:false});
})();
