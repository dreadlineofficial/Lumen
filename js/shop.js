/* Lumen Shop: earn ✦ Glow daily, buy and equip cosmetics. Every purchase is checked by firestore.rules. */
const L=window.Lumen,{esc,toast}=L;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const TABS=[['fx','✨ Profile effects'],['deco','💫 Decorations'],['plate','🎴 Nameplates'],['nfx','🔤 Name effects'],['theme','🎨 Themes'],['owned','🎒 Owned']];
const SLOT={buddy:'buddy',fx:'fx',deco:'deco',plate:'plate',nfx:'nfx',theme:'theme'};
let tab='fx',prof=null,busy=false;
const owned=()=>prof?.owned||[];
const coins=()=>+prof?.coins||0;
const nextClaim=()=>{const t=prof?.lastClaim?.toMillis?.();return t?t+20*3600e3:0};

function preview(it){const c=L.cloud,me=prof||{name:'You'};
  if(it.type==='buddy')return`<div class="buddy-stage">${L.cos.buddyCanvas(it.id,'card')}</div>`;
  if(it.type==='fx')return c.card({...me,fx:it.id,bio:''},{compact:true});
  if(it.type==='deco')return c.pic({...me,deco:it.id},84);
  if(it.type==='plate')return`<div class="prev-plate${L.cos.plateCls(it.id)}">${c.pic(me,36)}<div><div style="font-weight:600">${c.nameHTML(me,{badges:false})}</div><div style="font-size:12px;opacity:.8">Online</div></div></div>`;
  if(it.type==='nfx')return`<div class="prev-name">${c.nameHTML({...me,nfx:it.id},{badges:false})}</div>`;
  if(it.type==='theme')return`<div class="theme-sw">${it.sw.map((x,i)=>`<div style="background:${i===2?x:`linear-gradient(160deg,${x},${it.sw[2]})`}"></div>`).join('')}</div>`;
  return''}
function render(){const grid=$('#shopGrid');if(!grid)return;
  $('#glowBal').textContent=coins().toLocaleString();
  const nc=nextClaim(),ready=!nc||Date.now()>=nc;const cb=$('#claimBtn');
  cb.disabled=!prof||!ready;cb.textContent=!prof?'Sign in to earn Glow':!prof.lastClaim?'🎁 Claim 500 welcome Glow':ready?'🎁 Claim daily +150':`Next reward in ${Math.ceil((nc-Date.now())/36e5)}h`;
  $$('#shopTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));
  const items=L.cos.CATALOG.filter(i=>(i.type!=='buddy'||L.cos.BUDDIES_ON)&&(tab==='owned'?owned().includes(i.id):i.type===tab));
  grid.innerHTML=items.map(it=>{const own=owned().includes(it.id),eq=prof&&prof[SLOT[it.type]]===it.id;
    const btn=!prof?`<button disabled>Sign in</button>`:eq?`<button data-unequip="${it.id}">Unequip</button>`:own?`<button class="btn-acc" data-equip="${it.id}">Equip</button>`:`<button class="${coins()>=it.price?'btn-acc':''}" data-buy="${it.id}" ${coins()>=it.price?'':'disabled'}>Buy</button>`;
    return`<div class="card sitem${eq?' equipped':''}"><div class="prev">${eq?'<span class="tag">Equipped</span>':own?'<span class="tag">Owned</span>':''}${preview(it)}</div>
      <div class="meta"><b>${esc(it.name)}</b><span>${esc(it.desc)}</span><div class="act-row"><span class="price">${own?'':'✦ '+it.price}</span>${btn}</div></div></div>`}).join('')||`<p class="muted">${tab==='owned'?'Nothing yet. Claim your Glow and treat yourself.':'Nothing here.'}</p>`;
  grid.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>buy(b.dataset.buy));
  grid.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>equip(b.dataset.equip,true));
  grid.querySelectorAll('[data-unequip]').forEach(b=>b.onclick=()=>equip(b.dataset.unequip,false))}

async function upd(data){const {F,D,me}=L.cloud;await F.updateDoc(D('users',me().uid),data)}
async function claim(){if(busy||!prof)return;busy=true;const bonus=prof.lastClaim?150:500;
  try{await upd({coins:coins()+bonus,lastClaim:L.cloud.F.serverTimestamp()});toast(`+${bonus} ✦ Glow`)}catch(e){toast('Couldn’t claim: '+(e.code==='permission-denied'?'not ready yet':e.message))}busy=false}
async function buy(id){const it=L.cos.byId[id];if(busy||!prof||!it)return;if(coins()<it.price)return toast('Not enough Glow');
  if(!confirm(`Buy ${it.name} for ✦ ${it.price}?`))return;busy=true;
  try{await upd({coins:coins()-it.price,owned:[...owned(),id],lastBuy:id});toast(`${it.name} unlocked!`);await equip(id,true,true)}catch(e){toast('Purchase failed: '+e.message)}busy=false}
async function equip(id,on,quiet){const it=L.cos.byId[id];if(!it)return;const slot=SLOT[it.type];
  try{await upd({[slot]:on?id:''});if(it.type==='theme'){L.cfg.theme=on?id:'';L.save();L.cos.applyTheme(L.cfg.theme)}if(!quiet)toast(on?`${it.name} equipped`:`${it.name} removed`)}catch(e){toast('Couldn’t equip: '+e.message)}}

$('#shopTabs').innerHTML=TABS.map(([k,l])=>`<button data-t="${k}">${l}</button>`).join('');
$('#shopTabs').onclick=e=>{const b=e.target.closest('[data-t]');if(b){tab=b.dataset.t;render()}};
$('#claimBtn').onclick=claim;
async function redeem(e){e.preventDefault();if(!prof)return toast('Sign in first');const code=$('#codeIn').value.trim().toUpperCase().replace(/\s+/g,'');if(!code)return;
  const {F,D,db,me}=L.cloud;const btn=$('#codeForm button');btn.disabled=true;
  try{const snap=await F.getDoc(D('codes',code));if(!snap.exists()){toast('That code doesn’t exist');btn.disabled=false;return}const c=snap.data();
    if((c.uses||0)>=c.maxUses){toast('That code has been used up');btn.disabled=false;return}
    const usedSnap=await F.getDoc(D('codes',code,'used',me().uid)).catch(()=>null);if(usedSnap?.exists()){toast('You’ve already redeemed this code');btn.disabled=false;return}
    const b=F.writeBatch(db);b.set(D('codes',code,'used',me().uid),{at:F.serverTimestamp()});b.update(D('codes',code),{uses:F.increment(1)});b.update(D('users',me().uid),{coins:coins()+c.amount,lastCode:code});
    await b.commit();$('#codeIn').value='';toast(`+${(+c.amount).toLocaleString()} ✦ Glow!`)}
  catch(err){toast(err.code==='permission-denied'?'That code can’t be redeemed (used up, already used by you, or not active yet)':'Couldn’t redeem: '+err.message)}btn.disabled=false}
$('#codeForm').onsubmit=redeem;
const prevP=L.onProfile;L.onProfile=p=>{prevP?.(p);prof=p;render()};
const prevV=L.onView;L.onView=v=>{prevV?.(v);if(v==='shop')render()};
if(L.cloud)prof=L.cloud.profile();
setInterval(()=>{if($('#v-shop').classList.contains('on'))render()},60000);
render();
