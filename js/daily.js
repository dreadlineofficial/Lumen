/* Lumen daily challenges: three small puzzles, the same for everyone each day, 100 ✦ Glow each (once a day).
   The Glow is checked by firestore.rules: a puzzle is started (dailies/{uid}_{day}_{game}) and paid out at least 15 s later. */
const L=window.Lumen,{esc,toast}=L;
const $=s=>document.querySelector(s);
const DAY=()=>Math.floor(Date.now()/864e5);
const REWARD=100;
const GAMES=[
  {k:'mines',icon:'💣',name:'Minesweeper',desc:'Clear the field without hitting a mine. 9 × 9, 10 mines.',col:'#3a5bff,#1a2a6b'},
  {k:'memory',icon:'🧠',name:'Memory',desc:'Flip cards two at a time and find all 8 pairs.',col:'#ff5c8a,#6b1a3a'},
  {k:'slide',icon:'🧩',name:'Slide',desc:'Slide the tiles back into order, 1 to 8.',col:'#2fd6a0,#0b4a3a'}];
let doneToday={},cur=null;
const C=()=>L.cloud,me=()=>C()?.me?.();
// same puzzle for everyone today
function rng(seed){let s=0;for(const ch of seed)s=(s*31+ch.charCodeAt(0))|0;s=s>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%1e6)/1e6}}
const did=g=>`${me().uid}_${DAY()}_${g}`;

async function loadDone(){doneToday={};if(!me())return render();const {F,D}=C();
  await Promise.all(GAMES.map(g=>F.getDoc(D('dailies',did(g.k))).then(s=>{if(s.exists())doneToday[g.k]=s.data().done?'done':'started'}).catch(()=>{})));render()}
// drawn in two places: the top of the Hub and the top of Games
function render(){document.querySelectorAll('#dailyBox,#hubDaily').forEach(paint)}
function paint(box){const left=GAMES.filter(g=>doneToday[g.k]!=='done').length;
  const reward=L.plan?.bonus?L.plan.bonus(REWARD):REWARD;
  box.innerHTML=`<div class="daily-h"><h2 class="hsec" style="margin:0">📅 Daily challenges</h2><span class="muted">${left?`${left} left today · ✦ ${reward} each`:'All done for today. New puzzles at midnight (UTC).'}</span></div>
    <div class="daily-row">${GAMES.map(g=>{const st=doneToday[g.k];return`<button class="daily-card${st==='done'?' done':''}" data-daily="${g.k}" style="--g:linear-gradient(135deg,${g.col})"><span class="dc-i">${g.icon}</span><b>${g.name}</b><small>${esc(g.desc)}</small><em>${st==='done'?'✓ Done today':`✦ ${reward}`}</em></button>`}).join('')}</div>`;
  box.querySelectorAll('[data-daily]').forEach(b=>b.onclick=()=>open(b.dataset.daily))}

async function open(k){if(!me())return L.openModal('authModal');const g=GAMES.find(x=>x.k===k);if(!g)return;
  // start the clock on the server (only the first time today)
  if(!doneToday[k]){const {F,D}=C();try{await F.setDoc(D('dailies',did(k)),{g:k,start:F.serverTimestamp(),done:false});doneToday[k]='started'}catch(e){if(e.code!=='permission-denied')return toast('Couldn’t start: '+e.message);doneToday[k]='started'}}
  cur={k,g,t0:Date.now(),won:false};
  $('#dailyCard').innerHTML=`<button class="il-x" data-close aria-label="Close">✕</button><div class="dg-head"><span class="dg-i">${g.icon}</span><div><h2>${g.name}</h2><p class="muted">${esc(g.desc)} ${doneToday[k]==='done'?'You already earned today’s Glow: this one is just for fun.':`Win to earn ✦ ${L.plan?.bonus?L.plan.bonus(REWARD):REWARD}.`}</p></div></div><div id="dgBoard"></div><div class="dg-foot" id="dgFoot"></div>`;
  L.openModal('dailyModal');({mines,memory,slide})[k]()}
async function win(){if(!cur||cur.won)return;cur.won=true;const k=cur.k;const foot=$('#dgFoot');
  if(doneToday[k]==='done'){foot.innerHTML='🎉 Solved! (today’s Glow is already yours)';return}
  foot.innerHTML='🎉 Solved! Adding your Glow…';const {F,D,db}=C();
  const tryClaim=async n=>{const p=C().profile(),amt=L.plan?.bonus?L.plan.bonus(REWARD):REWARD;const b=F.writeBatch(db);b.update(D('dailies',did(k)),{done:true});b.update(D('users',me().uid),{coins:(+p.coins||0)+amt,lastDaily:did(k)});
    try{await b.commit();doneToday[k]='done';foot.innerHTML=`🎉 Solved! <b>+${amt} ✦ Glow</b>`;toast(`+${amt} ✦ Glow for today’s ${cur?.g?.name||'puzzle'}!`);render()}
    catch(e){if(n<4)setTimeout(()=>tryClaim(n+1),5000);else foot.innerHTML='Solved, but the Glow couldn’t be added (try again in a moment, or re-publish the rules).'}};
  tryClaim(0)}
const lose=msg=>{$('#dgFoot').innerHTML=`${msg} <button id="dgRetry">Try again</button>`;$('#dgRetry').onclick=()=>open(cur.k)};

/* ---------- Minesweeper ---------- */
function mines(){const N=9,M=10,r=rng('mines'+DAY());let board=null,flags=new Set(),open=new Set(),over=false,flagMode=false;
  const idx=(x,y)=>y*N+x,nb=i=>{const x=i%N,y=(i/N)|0,o=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<N&&ny<N)o.push(idx(nx,ny))}return o};
  const make=first=>{const cells=[...Array(N*N).keys()].filter(i=>i!==first&&!nb(first).includes(i));for(let i=cells.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]]}
    board=new Set(cells.slice(0,M))};
  const count=i=>nb(i).filter(j=>board.has(j)).length;
  const reveal=i=>{if(open.has(i)||flags.has(i))return;open.add(i);if(!board.has(i)&&count(i)===0)nb(i).forEach(reveal)};
  const el=$('#dgBoard');el.className='mines';
  const draw=()=>{el.innerHTML=`<div class="ms-grid" style="--n:${N}">${[...Array(N*N).keys()].map(i=>{const o=open.has(i),f=flags.has(i),m=board&&board.has(i),c=board&&o&&!m?count(i):0;
      return`<button class="ms-c${o?' o':''}${o&&m?' boom':''}${f?' f':''}" data-i="${i}" ${o?'disabled':''}>${o?(m?'💣':c||''):f?'🚩':''}</button>`}).join('')}</div>`;
    $('#dgFoot').innerHTML=over?$('#dgFoot').innerHTML:`<button id="msFlag" class="${flagMode?'btn-acc':''}">🚩 Flag mode ${flagMode?'on':'off'}</button><span class="muted">${M-flags.size} mines left · right-click or long-press to flag</span>`;
    $('#msFlag')&&($('#msFlag').onclick=()=>{flagMode=!flagMode;draw()});
    el.querySelectorAll('[data-i]').forEach(b=>{const i=+b.dataset.i;let t=0;
      b.onclick=()=>act(i,flagMode);b.oncontextmenu=e=>{e.preventDefault();act(i,true)};
      b.ontouchstart=()=>{t=setTimeout(()=>{t=-1;act(i,true)},420)};b.ontouchend=e=>{if(t===-1)e.preventDefault();else clearTimeout(t)}})};
  const act=(i,flag)=>{if(over)return;if(flag){if(!open.has(i)){flags.has(i)?flags.delete(i):flags.add(i);draw()}return}
    if(flags.has(i))return;if(!board)make(i);if(board.has(i)){over=true;board.forEach(j=>open.add(j));draw();lose('💥 Boom! That was a mine.');return}
    reveal(i);if(open.size===N*N-M){over=true;draw();win();return}draw()};
  draw()}

/* ---------- Memory ---------- */
function memory(){const r=rng('memory'+DAY()),E=['🦊','🐙','🍉','🚀','🌵','🎧','🦄','🍩','🐸','🌙','🎈','🔮'];
  const pick=[...E].sort(()=>r()-.5).slice(0,8),cards=[...pick,...pick];for(let i=cards.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]]}
  const got=new Set();let up=[],moves=0,lock=false;const el=$('#dgBoard');el.className='memory';
  const draw=()=>{el.innerHTML=`<div class="mm-grid">${cards.map((c,i)=>`<button class="mm-c${up.includes(i)||got.has(i)?' up':''}${got.has(i)?' got':''}" data-i="${i}"><span class="mm-f">${c}</span><span class="mm-b">✦</span></button>`).join('')}</div>`;
    $('#dgFoot').innerHTML=`<span class="muted">${moves} moves · ${got.size/2} of 8 pairs</span>`;
    el.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>flip(+b.dataset.i))};
  const flip=i=>{if(lock||got.has(i)||up.includes(i))return;up.push(i);if(up.length===2){moves++;const [a,b]=up;if(cards[a]===cards[b]){got.add(a);got.add(b);up=[];if(got.size===16){draw();win();return}}
      else{lock=true;draw();setTimeout(()=>{up=[];lock=false;draw()},750);return}}draw()};
  draw()}

/* ---------- Slide (8-puzzle) ---------- */
function slide(){const r=rng('slide'+DAY());let t=[1,2,3,4,5,6,7,8,0],moves=0;
  const nbrs=z=>{const x=z%3,y=(z/3)|0,o=[];if(x>0)o.push(z-1);if(x<2)o.push(z+1);if(y>0)o.push(z-3);if(y<2)o.push(z+3);return o};
  let last=-1;for(let k=0;k<80;k++){const z=t.indexOf(0),opts=nbrs(z).filter(n=>n!==last),n=opts[Math.floor(r()*opts.length)];[t[z],t[n]]=[t[n],t[z]];last=z}
  if(t.join()==='1,2,3,4,5,6,7,8,0'){const z=t.indexOf(0),n=nbrs(z)[0];[t[z],t[n]]=[t[n],t[z]]}
  const el=$('#dgBoard');el.className='slide';
  const draw=()=>{el.innerHTML=`<div class="sl-grid">${t.map((v,i)=>v?`<button class="sl-c" data-i="${i}">${v}</button>`:'<span class="sl-e"></span>').join('')}</div>`;$('#dgFoot').innerHTML=`<span class="muted">${moves} moves</span>`;
    el.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>mv(+b.dataset.i))};
  const mv=i=>{const z=t.indexOf(0);if(!nbrs(z).includes(i))return;[t[z],t[i]]=[t[i],t[z]];moves++;draw();if(t.join()==='1,2,3,4,5,6,7,8,0')win()};
  draw()}

L.daily={render:loadDone,paint:render,open};
const prevV=L.onView;L.onView=v=>{prevV?.(v);if(v==='games'||v==='hub')loadDone()};
const prevP=L.onProfile;L.onProfile=p=>{prevP?.(p);if(p&&$('#v-games')?.classList.contains('on')&&!Object.keys(doneToday).length)loadDone()};
loadDone();
