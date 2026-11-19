/* Lumen Store: the Marketplace for everything Lumen creators make (games, ebooks, documents, resources, anything),
   bought with ✦ Glow or got for free, laid out like an online shop: search bar with departments, category bar,
   home page with deal cards and carousels, results with filters, product pages with a buy box, cart and checkout.
   Products are the creators' "projects" (see hub.js and firestore.rules):
   - a product is delivered as a link (hidden until you own it), an uploaded file (up to 3 MB) or an uploaded HTML game
   - games you own live in the Game hub; everything else in Store → Your purchases
   - cart and wishlist are kept on this device; every purchase is checked by firestore.rules
   Profile cosmetics (shop.js) live in the Cosmetics tab. */
const L=window.Lumen,{esc,toast}=L;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const C=()=>L.cloud,H=()=>L.hub;
const fmtN=n=>(+n||0).toLocaleString();
const fmtSize=b=>b>=1048576?(b/1048576).toFixed(1)+' MB':Math.max(1,Math.round(b/1024))+' KB';
const CATS=[['all','🛍','All departments'],['game','🎮','Games'],['ebook','📚','eBooks'],['doc','📄','Documents'],['asset','🧰','Resources'],['other','📦','Other']];
const SORTS=[['featured','Featured'],['best','Best sellers'],['new','Newest arrivals'],['rated','Avg. customer review'],['low','Price: low to high'],['high','Price: high to low']];
const PRICES=[['any','Any price'],['free','Free'],['u100','Under ✦100'],['100','✦100 to ✦500'],['500','✦500 to ✦1,000'],['o1000','✦1,000 and above'],['afford','I can afford it']];
const store=(k,v)=>{try{if(v===undefined)return JSON.parse(localStorage.getItem(k)||'[]');localStorage.setItem(k,JSON.stringify(v))}catch{}return[]};
let pane='market',cat='all',q='',sort='featured',priceF='any',minStars=0,hideOwned=false,browse=false,openKey=null,busy=false;
let cart=store('lumen.cart'),wish=store('lumen.wish');
let reviews=[],revUnsub=null,revKey=null,revUp=true,heroI=0,galI=0;const names={};

/* ---------- data ---------- */
const me=()=>H()?.data?.().me||null;
const prof=()=>C()?.profile?.()||null;
const coins=()=>+prof()?.coins||0;
const ownedKeys=()=>prof()?.owned||[];
const cost=it=>L.plan?.price?.(it.price||0)??(it.price||0);
function products(){const h=H();if(!h)return[];const d=h.data();
  const b=h.BUILTINS.filter(g=>!(d.hubCfg.hiddenBuiltins||[]).includes(g.key)).map(g=>({...g,url:g.url(),price:g.price||0,builtin:true}));
  const p=d.live.filter(x=>x.type!=='site').map(x=>({...x,key:'p_'+x.id,price:+x.price||0}));
  return[...b,...p]}
const byKey=k=>products().find(p=>p.key===k);
const has=it=>H().inLib(it);
const canOpen=it=>has(it)||H().unlocked(it);
const plays=it=>H().data().plays[it.key]||0;
const at=it=>it.at?.toMillis?.()||(it.builtin?1:0);
const pinned=it=>(H().data().hubCfg.pinned||[]).includes(it.key);
const pop=it=>(it.sales||0)*3+plays(it)+(it.upReviews||0)*5+(H().data().trend[it.key]||0)*2;
const catOf=it=>CATS.find(c=>c[0]===it.type)||CATS[5];
const label=it=>(H().PTYPES[it.type]||H().PTYPES.other);
const nRev=it=>(it.upReviews||0)+(it.downReviews||0);
const rating=it=>{const n=nRev(it);return n?Math.round((1+4*(it.upReviews||0)/n)*2)/2:0};
function bestSellers(){const s=new Set();for(const [k] of CATS.slice(1)){const top=products().filter(it=>it.type===k&&(it.sales||0)>0).sort((a,b)=>(b.sales||0)-(a.sales||0))[0];if(top)s.add(top.key)}return s}
function seller(uid){if(!uid)return'Lumen';if(names[uid]!=null)return names[uid]||'a creator';names[uid]='';C()?.getUser(uid).then(u=>{names[uid]=u?.name||'a creator';$$(`[data-seller="${uid}"]`).forEach(e=>e.textContent=names[uid])}).catch(()=>{});return'…'}
const pubName=it=>it.brand||seller(it.uid);
const byHTML=it=>it.brand?esc(it.brand):it.uid?`<span data-seller="${esc(it.uid)}">${esc(seller(it.uid))}</span>`:'Lumen';
// the pictures: the uploaded cover first, then the creator's picture links (Google Drive links become direct images)
function pics(it){const l=[];if(L.safeImg(it.image)||(it.image||'').startsWith('games/'))l.push({style:H().art({...it,gallery:[]})});
  for(const u of it.gallery||[]){const i=H().imgUrl(u);if(i)l.push({src:i,style:`background-image:url('${esc(i)}');background-size:contain;background-position:center;background-repeat:no-repeat;background-color:#f4f5f8`})}
  if(!l.length)l.push({style:H().art(it)});return l}
const RISKY=/\.(exe|msi|bat|cmd|com|scr|ps1|vbs|apk|jar|dmg|pkg|app|sh|deb|appimage)$/i;
function what(it){if(it.type==='game'&&it.deliver==='file')return['💾','Downloadable game',`${fmtSize(it.fsize||0)} · download ${esc(it.fname||'it')} and run it on your own computer.`];
  if(it.type==='game')return it.deliver==='html'?['🧩','Playable HTML game','Runs right here in Lumen and goes into your Game hub.']:['🎮','Online game','Plays inside Lumen and goes into your Game hub.'];
  if(it.deliver==='file')return['📎',esc(it.fname||'File'),`${fmtSize(it.fsize||0)} · download it straight from Lumen, any time.`];
  return['🔗','Download link','Hosted by the creator (e.g. Google Drive or MediaFire). The link unlocks when you own it.']}

/* ---------- files: uploaded products sit in projects/{id}/private/file (+ up to 6 pieces) ---------- */
const fileCache=new Map();
async function fileData(id){if(fileCache.has(id))return fileCache.get(id);const {F,D}=C();
  const s=await F.getDoc(D('projects',id,'private','file'));const m=s.data();if(!m)throw new Error('missing');
  const parts=await Promise.all([...Array(m.parts).keys()].map(i=>F.getDoc(D('projects',id,'private','file','parts',String(i))).then(x=>x.data()?.d||'')));
  const out={...m,data:parts.join('')};fileCache.set(id,out);return out}
function bytes(dataUrl){const b64=dataUrl.slice(dataUrl.indexOf(',')+1),bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u}
async function html(id){const f=await fileData(id);return new TextDecoder().decode(bytes(f.data))}
async function download(it){toast('Preparing '+(it.fname||it.title)+'…');
  try{const f=await fileData(it.id);
    // saved as a plain download (never opened inside Lumen), so a file can't run as a page here
    const url=URL.createObjectURL(new Blob([bytes(f.data)],{type:'application/octet-stream'}));
    const a=document.createElement('a');a.href=url;a.download=(f.name||it.title||'download').replace(/[\\/:*?"<>|]+/g,'_');document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
  catch(e){toast('Couldn’t download it'+(e.code==='permission-denied'?': you don’t own it yet':''))}}
async function openLink(it){const u=await H().gameLink(it);if(!u)return toast('Couldn’t find the download link');window.open(u,'_blank','noopener')}
function use(it){if(it.deliver==='file')return download(it);if(it.type==='game')return H().launch(it.key);return openLink(it)}
const useLabel=it=>it.deliver==='file'?'⬇ Download':it.type==='game'?'▶ Play now':'↗ Open link';

/* ---------- buying: one product per write, checked by firestore.rules (gameBuyOk / catalogBuyOk) ---------- */
async function buyOne(it,st){const {F,D,db}=C();const c=cost(it);if(st.coins<c)throw new Error(`not enough Glow for ${it.title}`);
  const owned=[...st.owned,it.key],b=F.writeBatch(db);
  b.update(D('users',me()),{coins:st.coins-c,owned,lastBuy:it.key});
  if(!it.builtin)b.update(D('projects',it.id),{sales:F.increment(1),sold:F.increment(+it.cut||0),lastBuyer:me()});
  await b.commit();st.coins-=c;st.owned=owned}
const why=e=>e.code==='permission-denied'?'Firebase refused it (it may have just changed price, or the rules need re-publishing)':e.message;
async function buyNow(key){const it=byKey(key);if(!it)return toast('That isn’t in the Store any more');if(!me())return toast('Sign in first (bottom-left)');
  if(has(it))return toast('You already own '+it.title);if(it.uid===me())return toast('This is yours');if(busy)return;
  const c=cost(it);if(coins()<c)return toast(`You need ✦ ${fmtN(c)} Glow (you have ${fmtN(coins())}). Claim free Glow every day at the top of the Store.`);
  if(c>0&&!confirm(`Buy ${it.title} for ✦ ${fmtN(c)}${c<it.price?' (Lite 10% off)':''}? You'll have ✦ ${fmtN(coins()-c)} left. It's yours forever.`))return;
  busy=true;try{await buyOne(it,{coins:coins(),owned:[...ownedKeys()]});cart=cart.filter(k=>k!==key);store('lumen.cart',cart);thanks([it])}catch(e){toast('Couldn’t buy it: '+why(e))}busy=false;render()}
async function checkout(){if(!me())return toast('Sign in first');if(busy)return;const items=cart.map(byKey).filter(it=>it&&!has(it)&&it.uid!==me());
  if(!items.length){cart=[];store('lumen.cart',cart);return render()}
  const total=items.reduce((a,it)=>a+cost(it),0);if(total>coins())return toast(`Your cart costs ✦ ${fmtN(total)} but you have ✦ ${fmtN(coins())}. Remove something or claim more Glow.`);
  if(!confirm(`Place your order: ${items.length} item${items.length===1?'':'s'} for ${total?'✦ '+fmtN(total):'free'}?`))return;
  busy=true;const st={coins:coins(),owned:[...ownedKeys()]},done=[];
  for(const it of items){try{await buyOne(it,st);done.push(it)}catch(e){toast(`Stopped at ${it.title}: ${why(e)}`);break}}
  cart=cart.filter(k=>!done.some(d=>d.key===k));store('lumen.cart',cart);busy=false;closeCart();if(done.length)thanks(done);render()}
function thanks(list){const el=document.createElement('div');el.className='mk-thanks';const spent=list.reduce((a,it)=>a+cost(it),0);
  el.innerHTML=`<div class="mk-thanks-box mk-surface"><div class="mk-ok"><span>✓</span><div><b>Order placed, thank you!</b><small>${list.length} item${list.length===1?'':'s'}${spent?` · ✦ ${fmtN(spent)}`:' · free'} · instant access</small></div></div>
    <p class="mk-muted">${list.some(i=>i.type==='game')?'Games are in your Game hub. ':''}${list.some(i=>i.type!=='game')?'Everything else is in Your purchases. ':''}Yours forever.</p>
    <div class="mk-thanks-list">${list.map(it=>`<div class="mk-line"><div class="mk-thumb" style="${H().art(it)}"></div><div class="info"><b>${esc(it.title)}</b><span class="mk-green">Ready now</span></div><button class="mk-btn" data-use="${esc(it.key)}">${useLabel(it)}</button></div>`).join('')}</div>
    <div class="mk-btns"><button class="mk-btn mk-cta" data-x>Continue shopping</button><button class="mk-btn" data-orders>Your purchases</button></div></div>`;
  document.body.appendChild(el);el.onclick=e=>{const u=e.target.closest('[data-use]');if(u){el.remove();const it=byKey(u.dataset.use);if(it)use(it);return}
    if(e.target.closest('[data-orders]')){el.remove();return setPane('lib')}if(e.target===el||e.target.closest('[data-x]'))el.remove()}}

/* ---------- cart + wishlist ---------- */
function toggleCart(key,quiet){const it=byKey(key);if(!it)return;if(has(it))return toast('You already own this');
  if(it.uid&&it.uid===me())return toast('This is your own listing');
  if(cart.includes(key)){cart=cart.filter(k=>k!==key);toast('Removed from your cart')}else{cart=[...cart,key];const c=$('.mk-cart-ico');c?.classList.remove('bump');void c?.offsetWidth;c?.classList.add('bump');if(!quiet)openCart(true)}store('lumen.cart',cart);render();paintCart()}
function toggleWish(key){if(wish.includes(key)){wish=wish.filter(k=>k!==key);toast('Removed from your wishlist')}else{wish=[key,...wish];toast('♥ Added to your wishlist')}store('lumen.wish',wish);render()}
const cartItems=()=>cart.map(byKey).filter(it=>it&&!has(it));
function cartBadge(){const n=cartItems().length;const b=$('#mkCartN');if(b){b.textContent=n;b.hidden=!n}}
let justAdded=false;
function openCart(added){justAdded=!!added;let el=$('#mkCart');if(!el){el=document.createElement('div');el.id='mkCart';el.className='mk-drawer';document.body.appendChild(el);
    el.onclick=e=>{if(e.target===el||e.target.closest('[data-close]'))return closeCart();let r;
      if((r=e.target.closest('[data-rm]'))){cart=cart.filter(k=>k!==r.dataset.rm);store('lumen.cart',cart);paintCart();render();return}
      if((r=e.target.closest('[data-later]'))){cart=cart.filter(k=>k!==r.dataset.later);if(!wish.includes(r.dataset.later))wish=[r.dataset.later,...wish];store('lumen.cart',cart);store('lumen.wish',wish);paintCart();render();toast('Saved to your wishlist');return}
      if((r=e.target.closest('[data-go]'))){closeCart();open(r.dataset.go);return}if(e.target.closest('[data-checkout]'))checkout()}}
  el.classList.add('on');paintCart()}
function closeCart(){$('#mkCart')?.classList.remove('on')}
function paintCart(){cartBadge();const el=$('#mkCart');if(!el||!el.classList.contains('on'))return;
  const items=cartItems(),full=items.reduce((a,it)=>a+it.price,0),total=items.reduce((a,it)=>a+cost(it),0),left=coins()-total,last=byKey(cart[cart.length-1]);
  el.innerHTML=`<div class="mk-panel mk-surface"><div class="mk-panel-head"><h2>Shopping cart</h2><button class="mk-x" data-close title="Close">✕</button></div>
    ${justAdded&&last?`<div class="mk-added"><span>✓</span> <b>Added to cart</b></div>`:''}
    <div class="mk-panel-list">${items.map(it=>`<div class="mk-line"><button class="mk-thumb" data-go="${esc(it.key)}" style="${H().art(it)}"></button><div class="info"><b data-go="${esc(it.key)}">${esc(it.title)}</b><span class="mk-green">Instant access</span><span class="mk-muted">${label(it).slice(0,2).join(' ')} · by ${byHTML(it)}</span>
        <span class="mk-links"><a href="#" data-rm="${esc(it.key)}">Delete</a> | <a href="#" data-later="${esc(it.key)}">Save for later</a></span></div><b class="mk-lprice">${it.price?'✦ '+fmtN(cost(it)):'FREE'}</b></div>`).join('')||'<div class="mk-empty"><div style="font-size:42px">🛒</div><b>Your cart is empty</b><p class="mk-muted">Add things from the Store and they’ll wait here.</p></div>'}</div>
    ${items.length?`<div class="mk-sum">${total<full?`<div class="mk-save"><span>💎 Lite saves you</span><span>✦ ${fmtN(full-total)}</span></div>`:''}
      <div class="mk-subtotal">Subtotal (${items.length} item${items.length===1?'':'s'}): <b>${total?'✦ '+fmtN(total):'FREE'}</b></div>
      <div class="mk-muted">Your balance: ✦ ${fmtN(coins())}${me()?` · after checkout: ${left<0?'<b class="mk-red">not enough</b>':'✦ '+fmtN(left)}`:''}</div>
      <button class="mk-btn mk-cta mk-wide" data-checkout ${!me()||left<0?'disabled':''}>${!me()?'Sign in to check out':left<0?`Need ✦ ${fmtN(-left)} more`:'Proceed to checkout'}</button></div>`:''}</div>`;justAdded=false}

/* ---------- small pieces ---------- */
function stars(it,{count=true,big=false}={}){const n=nRev(it);if(!n)return count?'<span class="mk-norate">No ratings yet</span>':'';const r=rating(it);
  return`<span class="mk-rating${big?' big':''}"><span class="mk-stars" style="--r:${r}" title="${r} out of 5" aria-label="${r} out of 5 stars"></span>${count?`<a href="#" data-revs class="mk-rc">${fmtN(n)}</a>`:''}</span>`}
function priceHTML(it,big){if(!it.price)return`<span class="mk-price${big?' big':''} free">FREE</span>`;const c=cost(it);
  return`<span class="mk-price${big?' big':''}"><sup>✦</sup>${fmtN(c)}</span>${c<it.price?` <span class="mk-was">List: <s>✦${fmtN(it.price)}</s></span>`:''}`}
function pcard(it,{mini=false,best=null}={}){const k=esc(it.key),[ic,lb]=label(it),own=has(it),bs=best?.has(it.key);
  if(mini)return`<button class="mk-mini" data-open="${k}"><div class="mk-mini-img" style="${pics(it)[0].style}">${it.image?'':`<span>${esc(it.title)}</span>`}</div><span class="mk-mini-t">${esc(it.title)}</span>${stars(it,{count:false})}<span>${own?'<span class="mk-own">✓ Owned</span>':priceHTML(it)}</span></button>`;
  return`<div class="mk-card" data-pk="${k}"><div class="mk-imgwrap"><button class="mk-img" data-open="${k}" style="${pics(it)[0].style}" aria-label="${esc(it.title)}">${H().coverOf(it)?'':`<span>${esc(it.title)}</span>`}</button>${pics(it).length>1?`<em class="mk-npics">🖼 ${pics(it).length}</em>`:''}
      ${bs?'<em class="mk-tag best">Best seller</em>':pinned(it)?'<em class="mk-tag pick">Lumen’s choice</em>':Date.now()-at(it)<7*864e5&&!it.builtin?'<em class="mk-tag new">New</em>':''}
      <button class="mk-heart${wish.includes(it.key)?' on':''}" data-wish="${k}" title="${wish.includes(it.key)?'Remove from wishlist':'Add to wishlist'}">${wish.includes(it.key)?'♥':'♡'}</button></div>
    <div class="mk-body"><a href="#" class="mk-title" data-open="${k}">${esc(it.title)}</a><span class="mk-by">${ic} ${lb} · ${it.uid?byHTML(it):'Lumen'}</span>
      ${stars(it)}${it.sales>=5?`<span class="mk-sold">${fmtN(it.sales)}+ ${it.price?'bought':'got it'}</span>`:''}
      <div class="mk-pr">${own?'<span class="mk-own">✓ In your library</span>':priceHTML(it)}</div>
      ${own?'':'<span class="mk-green">Instant access</span>'}
      ${cardBtn(it)}</div></div>`}
// the card's button: Add to cart (paid or free), ✓ Added, or open what you own
function cardBtn(it){const k=esc(it.key);if(!me())return'<button class="mk-btn mk-cta mk-addcart" disabled>🛒 Sign in to buy</button>';
  if(has(it))return`<button class="mk-btn mk-addcart" data-use="${k}">${useLabel(it)}</button>`;
  if(it.uid===me())return`<button class="mk-btn mk-addcart" data-open="${k}">Your listing</button>`;
  return cart.includes(it.key)?`<button class="mk-btn mk-in mk-addcart" data-cart="${k}" title="Click to remove">✓ Added to cart</button>`:`<button class="mk-btn mk-cta mk-addcart" data-cart="${k}">🛒 Add to cart</button>`}
const carousel=(title,list,more)=>list.length?`<section class="mk-box mk-surface"><div class="mk-box-h"><h2>${title}</h2>${more?`<a href="#" ${more}>See more</a>`:''}</div><div class="mk-car">${list.map(it=>pcard(it,{mini:true})).join('')}</div></section>`:'';

/* ---------- home ---------- */
function quad(title,list,link){const tiles=list.slice(0,4);if(!tiles.length)return'';
  return`<div class="mk-quad mk-surface"><h2>${title}</h2><div class="mk-quad-g">${tiles.map(it=>`<button data-open="${esc(it.key)}"><div style="${pics(it)[0].style}">${H().coverOf(it)?'':`<span>${esc(it.title)}</span>`}</div><span>${esc(it.title)}</span></button>`).join('')}</div><a href="#" ${link}>See more</a></div>`}
function home(){const all=products();
  const feat=[...all.filter(pinned),...all.filter(it=>!pinned(it)&&H().coverOf(it)).sort((a,b)=>pop(b)-pop(a))].slice(0,5);heroI%=Math.max(1,feat.length);
  const games=all.filter(it=>it.type==='game').sort((a,b)=>pop(b)-pop(a)),free=all.filter(it=>!it.price&&!has(it)).sort((a,b)=>pop(b)-pop(a)),fresh=all.filter(it=>!it.builtin).sort((a,b)=>at(b)-at(a));
  const read=all.filter(it=>it.type==='ebook'||it.type==='doc').sort((a,b)=>pop(b)-pop(a));
  const dept=CATS.slice(1,5).map(([k,i,l])=>`<button data-mkcat="${k}"><div class="mk-dept t-${k}">${i}</div><span>${l}</span></button>`).join('');
  return`<div class="mk-hero">${feat.map((it,i)=>`<div class="mk-slide${i===heroI?' on':''}" data-open="${esc(it.key)}"><div class="mk-slide-art" style="${pics(it)[0].style.replace('background-size:contain','background-size:cover')}"></div><div class="mk-slide-in"><span class="mk-kick">${pinned(it)?'Lumen’s choice':'Trending now'} · ${label(it)[1]}</span><h2>${esc(it.title)}</h2>${it.desc?`<p>${esc(it.desc.slice(0,120))}${it.desc.length>120?'…':''}</p>`:''}<span class="mk-hero-p">${it.price?'✦ '+fmtN(cost(it)):'Free'}</span></div></div>`).join('')||'<div class="mk-slide on"><div class="mk-slide-in"><span class="mk-kick">Lumen Store</span><h2>Games, ebooks and more from Lumen creators</h2></div></div>'}
      ${feat.length>1?`<button class="mk-arrow l" data-heronav="-1" aria-label="Previous">‹</button><button class="mk-arrow r" data-heronav="1" aria-label="Next">›</button>`:''}</div>
    <div class="mk-quads">${quad('Top games right now',games,'data-mkcat="game"')}${quad('Free to get',free,'data-mkdeal="free"')}${quad('New arrivals',fresh,'data-mksort="new"')}
      <div class="mk-quad mk-surface"><h2>Shop by department</h2><div class="mk-quad-g">${dept}</div><a href="#" data-mkcat="all" data-browse>See all departments</a></div>
      ${me()?'':'<div class="mk-quad mk-surface mk-signin"><h2>Sign in for the best experience</h2><p class="mk-muted">Buy with ✦ Glow, keep a wishlist and get things free.</p></div>'}</div>
    ${carousel('Best sellers in Lumen Store',all.filter(it=>it.price>0&&it.sales).sort((a,b)=>(b.sales||0)-(a.sales||0)).slice(0,14),'data-mksort="best"')}
    ${carousel('Free picks for you',free.slice(0,14),'data-mkdeal="free"')}
    ${carousel('Popular in eBooks & Documents',read.slice(0,14),'data-mkcat="ebook"')}
    ${carousel('New releases',fresh.slice(0,14),'data-mksort="new"')}
    ${wish.length?carousel('From your wishlist',wish.map(byKey).filter(Boolean).slice(0,14),'data-p="wish"'):''}
    <section class="mk-box mk-surface"><div class="mk-box-h"><h2>Recommended for you</h2><a href="#" data-mkcat="all" data-browse>See all results</a></div><div class="mk-grid">${all.slice().sort((a,b)=>pop(b)-pop(a)).slice(0,10).map(it=>pcard(it,{best:bestSellers()})).join('')}</div></section>
    <div class="mk-sellband mk-surface"><div><b>Make something? Sell it on Lumen.</b><span class="mk-muted">Upload a game, ebook or file, set a price in Glow and keep 90% of every sale.</span></div><button class="mk-btn mk-cta" data-sell>${H()?.data().isCreator?'Open Creator Dashboard':'Start selling'}</button></div>`}

/* ---------- results ---------- */
function filtered(){const ql=q.toLowerCase();
  let list=products().filter(it=>cat==='all'||it.type===cat||(cat==='other'&&!['game','ebook','doc','asset'].includes(it.type)));
  if(ql)list=list.filter(it=>[it.title,it.desc,it.brand,names[it.uid],label(it)[1],label(it)[2]].some(x=>(x||'').toLowerCase().includes(ql)));
  const pr={free:p=>!p,u100:p=>p>0&&p<100,'100':p=>p>=100&&p<=500,'500':p=>p>500&&p<=1000,o1000:p=>p>1000}[priceF];
  if(pr)list=list.filter(it=>pr(it.price));if(priceF==='afford')list=list.filter(it=>cost(it)<=coins());
  if(minStars)list=list.filter(it=>rating(it)>=minStars);if(hideOwned)list=list.filter(it=>!has(it));
  const s={featured:(a,b)=>(pinned(b)-pinned(a))||pop(b)-pop(a),best:(a,b)=>(b.sales||0)-(a.sales||0)||pop(b)-pop(a),new:(a,b)=>at(b)-at(a),rated:(a,b)=>rating(b)-rating(a)||nRev(b)-nRev(a),low:(a,b)=>a.price-b.price||pop(b)-pop(a),high:(a,b)=>b.price-a.price||pop(b)-pop(a)}[sort];
  return list.sort(s)}
function results(){const all=products(),list=filtered(),cc=CATS.find(c=>c[0]===cat),best=bestSellers();const n=c=>c==='all'?all.length:all.filter(it=>it.type===c).length;
  const side=`<aside class="mk-filters mk-surface"><h3>Department</h3>${CATS.map(([k,,l])=>`<a href="#" data-mkcat="${k}" data-browse class="${cat===k?'on':''}">${l} <span>(${n(k)})</span></a>`).join('')}
    <h3>Customer reviews</h3>${[4,3,2].map(s=>`<a href="#" data-stars="${minStars===s?0:s}" class="${minStars===s?'on':''}"><span class="mk-stars" style="--r:${s}"></span> &amp; up</a>`).join('')}
    <h3>Price</h3>${PRICES.map(([k,l])=>`<a href="#" data-price="${k}" class="${priceF===k?'on':''}">${l}</a>`).join('')}
    <h3>Availability</h3><label class="mk-chk"><input type="checkbox" id="mkHide" ${hideOwned?'checked':''}> Hide things I own</label>
    ${cat!=='all'||priceF!=='any'||minStars||hideOwned||q?'<a href="#" data-clear class="mk-clear">✕ Clear all filters</a>':''}</aside>`;
  return`<div class="mk-results"><div class="mk-resbar mk-surface"><span>${list.length?`1-${list.length} of `:''}<b>${list.length}</b> result${list.length===1?'':'s'}${q?` for <b class="mk-q">"${esc(q)}"</b>`:''}${cat!=='all'?` in <b>${cc[2]}</b>`:''}</span>
      <label class="mk-sort">Sort by: <select id="mkSort">${SORTS.map(([k,l])=>`<option value="${k}" ${sort===k?'selected':''}>${l}</option>`).join('')}</select></label></div>
    <div class="mk-resgrid">${side}<div class="mk-resmain">${list.length?`<div class="mk-grid">${list.map(it=>pcard(it,{best})).join('')}</div>`:`<div class="mk-empty mk-surface"><div style="font-size:42px">🔎</div><b>No results${q?` for "${esc(q)}"`:''}</b><p class="mk-muted">Try checking your spelling, use fewer words, or clear the filters.</p></div>`}</div></div></div>`}

/* ---------- a product's page ---------- */
function revCol(key){const {F,db}=C();return key.startsWith('p_')?F.collection(db,'projects',key.slice(2),'reviews'):F.collection(db,'reviews',key,'list')}
function listenReviews(key){if(revKey===key)return;revUnsub?.();revUnsub=null;reviews=[];revKey=key;if(!me()||!C())return;
  revUnsub=C().F.onSnapshot(revCol(key),s=>{reviews=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.at?.toMillis?.()||0)-(a.at?.toMillis?.()||0));render()},()=>{})}
function stopReviews(){revUnsub?.();revUnsub=null;revKey=null;reviews=[]}
function productPage(it){const [ic,lb]=label(it),cc=catOf(it),own=it.uid&&it.uid===me(),mine=reviews.find(r=>r.id===me());
  // the star rating: built-in games count every review we can see; creator products use their counters
  const up=reviews.length?reviews.filter(r=>r.up).length:(it.upReviews||0),tot=reviews.length||nRev(it),rIt={upReviews:up,downReviews:tot-up},pct=tot?Math.round(up/tot*100):0;
  const [wi,wt,wd]=what(it),c=cost(it),draft=$('#mkRevText')?.value,best=bestSellers();
  const more=products().filter(x=>x.key!==it.key&&x.uid===it.uid&&it.uid&&(x.brand||'')===(it.brand||'')).sort((a,b)=>pop(b)-pop(a)).slice(0,14);
  const like=products().filter(x=>x.key!==it.key&&x.type===it.type&&!more.includes(x)).sort((a,b)=>pop(b)-pop(a)).slice(0,14);
  const date=it.at?.toDate?.()?.toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'});
  const ps=pics(it);if(galI>=ps.length)galI=0;
  const lines=(it.desc||'').split(/\n+/).map(x=>x.trim()).filter(Boolean),bullets=lines.length>1?lines.slice(0,6):[];
  const buy=has(it)?`<div class="mk-bb-own">✓ You own this</div><p class="mk-muted">${it.type==='game'?'It’s in your Game hub.':'It’s in Your purchases.'}</p><button class="mk-btn mk-cta mk-wide" data-use="${esc(it.key)}">${useLabel(it)}</button>`:
    own?`<div class="mk-bb-own">This is your listing</div><button class="mk-btn mk-cta mk-wide" data-use="${esc(it.key)}">${useLabel(it)}</button><button class="mk-btn mk-wide" data-sell>✏️ Edit in Creator Dashboard</button>`:
    `${priceHTML(it,true)}<div class="mk-green mk-bb-l">Instant access · yours forever</div>${me()&&it.price?`<p class="mk-muted">Your balance: ✦ ${fmtN(coins())}${coins()<c?` · <b class="mk-red">✦ ${fmtN(c-coins())} short</b>`:''}</p>`:''}
     ${!me()?'<button class="mk-btn mk-wide" disabled>Sign in to buy</button>':
       `<button class="mk-btn ${cart.includes(it.key)?'mk-in':'mk-cta'} mk-wide mk-addcart" data-cart="${esc(it.key)}">${cart.includes(it.key)?'✓ Added to cart · remove':'🛒 Add to cart'}</button><button class="mk-btn mk-buy mk-wide" data-buy="${esc(it.key)}">${it.price?'Buy now':'Get it now, free'}</button>`}
     ${cart.includes(it.key)?'<a href="#" class="mk-a mk-gocart" data-gocart>Go to cart ›</a>':''}
     ${canOpen(it)&&!has(it)&&it.price?`<button class="mk-btn mk-wide" data-use="${esc(it.key)}">${useLabel(it)} (admin)</button>`:''}`;
  return`<nav class="mk-crumbs"><a href="#" data-mkhome>Store</a> › <a href="#" data-mkcat="${cc[0]}" data-browse>${cc[2]}</a> › <span>${esc(it.title)}</span></nav>
  <div class="mk-pdp mk-surface">
    <div class="mk-gal"><div class="mk-gal-in">${ps.length>1?`<div class="mk-thumbs">${ps.map((x,i)=>`<button class="${i===galI?'on':''}" data-gal="${i}" style="${x.style}" aria-label="Picture ${i+1}"></button>`).join('')}</div>`:''}
      <div class="mk-cover" id="mkCover" style="${ps[galI].style}">${H().coverOf(it)?'':`<span>${esc(it.title)}</span>`}${ps.length>1?`<button class="mk-gnav l" data-galnav="-1" aria-label="Previous picture">‹</button><button class="mk-gnav r" data-galnav="1" aria-label="Next picture">›</button><em class="mk-gcount">${galI+1} / ${ps.length}</em>`:''}</div></div>
      <div class="mk-gal-acts"><button class="mk-btn" data-wish="${esc(it.key)}">${wish.includes(it.key)?'♥ On your wishlist':'♡ Add to wishlist'}</button><button class="mk-btn" data-sharec="${esc(it.key)}">📣 Share</button></div></div>
    <div class="mk-info"><h1>${esc(it.title)}</h1>
      <div class="mk-byline">${it.uid?`Visit the <a href="#" data-pub="${esc(it.brand||'')}" data-uid="${esc(it.uid)}">${byHTML(it)} store</a>`:'By <b>Lumen</b>'}</div>
      <div class="mk-rateline">${tot?`<b>${rating(rIt).toFixed(1)}</b> ${stars(rIt,{count:false})} <a href="#mkReviews" data-jump>${fmtN(tot)} rating${tot===1?'':'s'}</a>`:'<span class="mk-norate">No ratings yet</span>'}${best.has(it.key)?' <em class="mk-tag best inl">#1 Best seller in '+cc[2]+'</em>':''}</div>
      ${it.sales?`<div class="mk-muted">${fmtN(it.sales)}${it.sales>=10?'+':''} ${it.price?'bought':'people got it'}</div>`:''}
      <hr><div class="mk-pricebig">${has(it)?'<span class="mk-own">✓ In your library</span>':priceHTML(it,true)}</div>${c<it.price&&!has(it)?'<div class="mk-green">💎 Lite members save 10%</div>':''}
      ${RISKY.test(it.fname||'')?'<div class="mk-warn">⚠️ This is a program you run on your own computer. Only run downloads from creators you trust, and check your school allows it.</div>':''}
      <hr><h3>About this item</h3>${bullets.length?`<ul class="mk-about">${bullets.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>`:`<p class="mk-desc">${it.desc?esc(it.desc):'<span class="mk-muted">The creator didn’t write a description.</span>'}</p>`}
      <table class="mk-spec"><tr><th>Category</th><td>${ic} ${lb}</td></tr><tr><th>Format</th><td>${wi} ${wt}</td></tr>${it.deliver==='file'||it.deliver==='html'?`<tr><th>File size</th><td>${fmtSize(it.fsize||0)}</td></tr>`:''}
        <tr><th>Published by</th><td>${byHTML(it)}</td></tr>${it.deliver==='file'&&it.fname?`<tr><th>File</th><td>${esc(it.fname)}</td></tr>`:''}${date?`<tr><th>Released</th><td>${date}</td></tr>`:''}${it.type==='game'?`<tr><th>Plays</th><td>${fmtN(plays(it))}</td></tr>`:''}</table>
      ${it.type==='game'&&canOpen(it)?`<a href="#" class="mk-a" data-game="${esc(it.key)}">🎮 Open its game page</a>`:''}</div>
    <div class="mk-bb">${buy}
      <dl class="mk-bb-dl"><dt>Delivery</dt><dd>${wi} ${wd}</dd><dt>Sold by</dt><dd>${byHTML(it)}</dd><dt>Payment</dt><dd>🔒 Secure, with ✦ Glow</dd>${it.uid&&it.price?'<dt>Creator</dt><dd>Gets 90% of the price</dd>':''}</dl></div></div>
  ${carousel('Products related to this item',like)}${more.length?carousel(`More from ${byHTML(it)}`,more):''}
  ${lines.length>1||(it.desc||'').length>200?`<section class="mk-box mk-surface"><h2>Product description</h2><p class="mk-desc">${esc(it.desc)}</p></section>`:''}
  <section class="mk-box mk-surface mk-revs" id="mkReviews"><div class="mk-rev-sum"><h2>Customer reviews</h2>${tot?`<div class="mk-rateline">${stars(rIt,{count:false,big:true})} <b>${rating(rIt).toFixed(1)} out of 5</b></div><div class="mk-muted">${fmtN(tot)} rating${tot===1?'':'s'}</div>
        <div class="mk-hist"><span>👍 Recommend</span><div><i style="width:${pct}%"></i></div><span>${pct}%</span></div><div class="mk-hist"><span>👎 Not for me</span><div><i style="width:${100-pct}%"></i></div><span>${100-pct}%</span></div>`:'<p class="mk-muted">No ratings yet.</p>'}
      <hr><h3>Review this product</h3>
      ${!me()?'<p class="mk-muted">Sign in to write a review.</p>':own?'<p class="mk-muted">This is yours. Every positive review earns you ✦ 50 Glow.</p>':!has(it)&&!canOpen(it)?'<p class="mk-muted">Get it first, then share your thoughts with other people.</p>':
        `<div class="mk-revform"><div class="mk-seg" id="mkUp"><button type="button" data-up="1" class="${(mine?mine.up:revUp)?'on':''}" ${mine?'disabled':''}>👍 Recommend</button><button type="button" data-up="0" class="${(mine?!mine.up:!revUp)?'on':''}" ${mine?'disabled':''}>👎 Not for me</button></div>
          <textarea id="mkRevText" rows="3" maxlength="500" placeholder="What did you like or dislike?">${esc(draft??mine?.text??'')}</textarea>
          <button class="mk-btn mk-wide" id="mkRevSend">${mine?'Update your review':'Write a customer review'}</button><span class="mk-muted" style="font-size:12px">${mine?'You can edit your words; the 👍/👎 stays.':'One review per person.'}</span></div>`}</div>
    <div class="mk-rev-list"><h3>${tot?'Top reviews':'Reviews'}</h3>${reviews.map(r=>`<div class="mk-rev"><div class="mk-rev-u"><span class="mk-av">${esc((seller(r.uid)||'?')[0].toUpperCase())}</span><b data-user="${r.uid}" data-seller="${r.uid}">${esc(seller(r.uid))}</b></div>
        <div class="mk-rateline"><span class="mk-stars" style="--r:${r.up?5:1}"></span> <b>${r.up?'Recommends it':'Not for them'}</b></div><div class="mk-muted" style="font-size:12px">Reviewed on ${r.at?.toDate?.().toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'})||'just now'}</div>${r.text?`<p>${esc(r.text)}</p>`:''}</div>`).join('')||'<p class="mk-muted">No reviews yet. Be the first to tell people what you think.</p>'}</div></section>`}
async function sendReview(){const it=byKey(openKey);if(!it)return;const {F,D,db}=C();const text=$('#mkRevText').value.trim().slice(0,500),mine=reviews.find(r=>r.id===me()),ref=F.doc(revCol(it.key),me());
  try{if(mine){await F.updateDoc(ref,{text,at:F.serverTimestamp()});toast('Review updated');return}
    const up=$('#mkUp .on')?.dataset.up!=='0';if(!text&&!up)return toast('Say why it’s not for you');
    const b=F.writeBatch(db);b.set(ref,{uid:me(),up,text,at:F.serverTimestamp()});if(!it.builtin)b.update(D('projects',it.id),up?{upReviews:F.increment(1),lastReview:me()}:{downReviews:F.increment(1),lastReview:me()});
    await b.commit();$('#mkRevText').value='';toast('Thanks for your review!')}catch(e){toast(e.code==='permission-denied'?'Couldn’t post the review (one review per person).':e.message)}}

/* ---------- wishlist + purchases ---------- */
function wishPane(){const list=wish.map(byKey).filter(Boolean);
  return`<section class="mk-box mk-surface"><div class="mk-box-h"><h2>Your wishlist</h2><span class="mk-muted">${list.length} item${list.length===1?'':'s'}</span></div>
    ${list.length?`<div class="mk-wl">${list.map(it=>`<div class="mk-wl-row"><button class="mk-thumb big" data-open="${esc(it.key)}" style="${H().art(it)}"></button><div class="info"><a href="#" class="mk-title" data-open="${esc(it.key)}">${esc(it.title)}</a><span class="mk-muted">by ${byHTML(it)}</span>${stars(it)}<div>${has(it)?'<span class="mk-own">✓ Owned</span>':priceHTML(it)}</div></div>
      <div class="mk-wl-acts">${cardBtn(it)}<a href="#" data-wish="${esc(it.key)}">Remove</a></div></div>`).join('')}</div>`:'<div class="mk-empty"><div style="font-size:42px">♡</div><b>Your wishlist is empty</b><p class="mk-muted">Tap ♡ on anything in the Store to save it here.</p></div>'}</section>`}
function libPane(){if(!me())return'<section class="mk-box mk-surface"><h2>Your purchases</h2><p class="mk-muted">Sign in (bottom-left) to see what you own.</p></section>';
  const list=products().filter(it=>has(it)&&(!it.builtin||it.price>0)).sort((a,b)=>ownedKeys().indexOf(b.key)-ownedKeys().indexOf(a.key));
  return`<section class="mk-box mk-surface"><div class="mk-box-h"><h2>Your purchases</h2><span class="mk-muted">${list.length} item${list.length===1?'':'s'}</span></div>
    ${list.map(it=>{const [ic,lb]=label(it),[wi,wt]=what(it);return`<div class="mk-order"><div class="mk-order-h"><span><small>TYPE</small>${ic} ${lb}</span><span><small>PRICE</small>${it.price?'✦ '+fmtN(it.price):'Free'}</span><span><small>SOLD BY</small>${byHTML(it)}</span></div>
      <div class="mk-order-b"><button class="mk-thumb big" data-open="${esc(it.key)}" style="${H().art(it)}"></button><div class="info"><a href="#" class="mk-title" data-open="${esc(it.key)}">${esc(it.title)}</a><span class="mk-green">✓ Ready · ${wi} ${wt}${it.deliver==='file'?` · ${fmtSize(it.fsize||0)}`:''}</span></div>
        <div class="mk-wl-acts"><button class="mk-btn mk-cta" data-use="${esc(it.key)}">${useLabel(it)}</button><button class="mk-btn" data-open="${esc(it.key)}">Write a review</button></div></div></div>`}).join('')||'<div class="mk-empty"><div style="font-size:42px">📦</div><b>Nothing here yet</b><p class="mk-muted">Games, ebooks and files you buy or get show up here.</p></div>'}
    ${list.some(it=>it.type==='game')?'<a href="#" class="mk-a" data-gohub>🎮 Go to your Game hub</a>':''}</section>`}

/* ---------- render ---------- */
function render(){const box=$('#mkBox');if(!box)return;cartBadge();
  $$('#mkPanes [data-p]').forEach(b=>b.classList.toggle('on',b.dataset.p===pane));
  $$('#mkPanes [data-mkcat]').forEach(b=>b.classList.toggle('on',pane==='market'&&!openKey&&browse&&b.dataset.mkcat===cat&&priceF==='any'&&sort==='featured'));
  $('#mkPane').hidden=pane==='cos';$('#cosPane').hidden=pane!=='cos';$('#mkHead').classList.toggle('cos',pane==='cos');if(pane==='cos'||!H())return;
  const ae=document.activeElement;if(ae&&box.contains(ae)&&ae.matches('textarea,input:not([type=checkbox])'))return; // don't wipe a review mid-typing
  if($('#mkDept'))$('#mkDept').value=cat;
  if(openKey){const it=byKey(openKey);if(!it){openKey=null;stopReviews()}else{listenReviews(it.key);box.innerHTML=productPage(it);paintCart();return}}
  box.innerHTML=pane==='wish'?wishPane():pane==='lib'?libPane():(browse||q||cat!=='all'||priceF!=='any'||minStars||hideOwned||sort!=='featured')?results():home();paintCart()}
const top=()=>{$('main')?.scrollTo?.({top:0});$('#v-shop')?.scrollIntoView({block:'start'})};
function open(key){const it=byKey(key);if(!it)return toast('That isn’t in the Store any more');pane='market';if(openKey!==key)galI=0;openKey=key;L.go('shop');render();top()}
function show(c){pane='market';openKey=null;stopReviews();cat=c||'all';browse=true;L.go('shop');render();top()}
function setPane(p){pane=p;openKey=null;stopReviews();render();top()}
function goHome(){pane='market';cat='all';q='';sort='featured';priceF='any';minStars=0;hideOwned=false;browse=false;openKey=null;stopReviews();if($('#mkQ'))$('#mkQ').value='';render();top()}

// one click handler for the store header and the page (links are all data-* attributes)
function onClick(e){const t=e.target;const g=s=>t.closest(s);let b;
  if((b=g('[data-wish]'))){e.preventDefault();return toggleWish(b.dataset.wish)}
  if((b=g('[data-cart]')))return toggleCart(b.dataset.cart);
  if((b=g('[data-buy]')))return buyNow(b.dataset.buy);
  if((b=g('[data-use]'))){const it=byKey(b.dataset.use);return it&&use(it)}
  if((b=g('[data-sharec]')))return L.shareToContent?.(b.dataset.sharec);
  if((b=g('[data-heronav]'))){e.stopPropagation();const s=$$('.mk-slide');if(!s.length)return;heroI=(heroI+ +b.dataset.heronav+s.length)%s.length;s.forEach((x,i)=>x.classList.toggle('on',i===heroI));return}
  if((b=g('[data-gal]'))){galI=+b.dataset.gal;return render()}
  if((b=g('[data-galnav]'))){e.stopPropagation();const n=pics(byKey(openKey)||{}).length||1;galI=(galI+ +b.dataset.galnav+n)%n;return render()}
  if((b=g('[data-pub]'))){e.preventDefault();pane='market';q=b.dataset.pub||pubName({uid:b.dataset.uid});$('#mkQ').value=q;cat='all';browse=true;openKey=null;stopReviews();render();return top()}
  if(g('[data-gocart]')){e.preventDefault();return openCart()}
  if((b=g('[data-user]'))){e.preventDefault();return L.openUser?.(b.dataset.user)}
  if((b=g('[data-open]'))){e.preventDefault();return open(b.dataset.open)}
  if(g('[data-mkhome]')){e.preventDefault();return goHome()}
  if((b=g('[data-p]'))){e.preventDefault();return setPane(b.dataset.p)}
  if((b=g('[data-mkcat]'))){e.preventDefault();pane='market';cat=b.dataset.mkcat;browse=b.hasAttribute('data-browse')||cat!=='all';priceF='any';sort='featured';openKey=null;stopReviews();render();return top()}
  if((b=g('[data-mkdeal]'))){e.preventDefault();pane='market';cat='all';priceF=b.dataset.mkdeal;sort='featured';browse=true;openKey=null;stopReviews();render();return top()}
  if((b=g('[data-mksort]'))){e.preventDefault();pane='market';cat='all';priceF='any';sort=b.dataset.mksort;browse=true;openKey=null;stopReviews();render();return top()}
  if((b=g('[data-price]'))){e.preventDefault();priceF=b.dataset.price;browse=true;return render()}
  if((b=g('[data-stars]'))){e.preventDefault();minStars=+b.dataset.stars;browse=true;return render()}
  if(g('[data-clear]')){e.preventDefault();cat='all';priceF='any';minStars=0;hideOwned=false;q='';$('#mkQ').value='';browse=true;return render()}
  if(g('[data-sell]'))return L.go('creator');
  if(g('[data-gohub]')){e.preventDefault();return L.go('games')}
  if((b=g('[data-game]'))){e.preventDefault();return H().openGame(b.dataset.game)}
  if(g('[data-jump]')||g('[data-revs]')){e.preventDefault();if(!openKey){const k=g('[data-pk]')?.dataset.pk;if(k){open(k);setTimeout(()=>$('#mkReviews')?.scrollIntoView({behavior:'smooth'}),80)}return}return $('#mkReviews')?.scrollIntoView({behavior:'smooth'})}
  if((b=g('#mkUp [data-up]'))){revUp=b.dataset.up==='1';$$('#mkUp button').forEach(x=>x.classList.toggle('on',x===b));return}
  if(g('#mkRevSend'))return sendReview()}
$('#mkBox').addEventListener('click',onClick);
$('#mkPanes').addEventListener('click',onClick);
$('#mkHead .mk-top').addEventListener('click',e=>{if(e.target.closest('#mkSearch'))return;onClick(e)});
$('#mkBox').addEventListener('change',e=>{if(e.target.id==='mkSort'){sort=e.target.value;browse=true;render()}if(e.target.id==='mkHide'){hideOwned=e.target.checked;browse=true;render()}});
const search=()=>{q=$('#mkQ').value.trim();cat=$('#mkDept').value;pane='market';openKey=null;stopReviews();browse=true;render()};
$('#mkSearch').addEventListener('submit',e=>{e.preventDefault();search();top()});
$('#mkQ').addEventListener('input',search);
$('#mkDept').addEventListener('change',()=>{if(q||browse||cat!=='all')search()});
$('#mkCartBtn').onclick=e=>{e.stopPropagation();openCart()};
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCart()});
setInterval(()=>{const s=$$('.mk-slide');if(s.length<2||!$('#v-shop')?.classList.contains('on')||document.hidden||$('.mk-hero:hover'))return;heroI=(heroI+1)%s.length;s.forEach((x,i)=>x.classList.toggle('on',i===heroI))},6500);

// the cosmetics shop still opens straight to its own tabs (Lite, bundles…)
const prevShopGo=L.shopGo;L.shopGo=t=>{pane='cos';openKey=null;render();prevShopGo?.(t)};
const prevP=L.onProfile;L.onProfile=p=>{prevP?.(p);if($('#v-shop')?.classList.contains('on'))render();else cartBadge()};
const prevV=L.onView;L.onView=v=>{prevV?.(v);if(v==='shop')render();else{closeCart();stopReviews();openKey=null}};
L.market={open,show,buyNow,download,html,forget:id=>fileCache.delete(id),refresh:()=>{if($('#v-shop')?.classList.contains('on'))render();else cartBadge()}};
render();
