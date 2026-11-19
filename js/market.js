/* Lumen Store: the Marketplace for everything Lumen creators make (games, ebooks, documents, resources, anything),
   bought with ✦ Glow or got for free. Products are the creators' "projects" (see hub.js and firestore.rules):
   - a product is delivered as a link (hidden until you own it), an uploaded file (up to 3 MB) or an uploaded HTML game
   - games you own live in the Game hub; everything else in Store → My purchases
   - cart and wishlist are kept on this device; every purchase is checked by firestore.rules
   The old Shop (profile cosmetics) lives on in the Cosmetics tab (shop.js). */
const L=window.Lumen,{esc,toast}=L;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const C=()=>L.cloud,H=()=>L.hub;
const fmtN=n=>(+n||0).toLocaleString();
const fmtSize=b=>b>=1048576?(b/1048576).toFixed(1)+' MB':Math.max(1,Math.round(b/1024))+' KB';
const CATS=[['all','🛍','Everything'],['game','🎮','Games'],['ebook','📚','eBooks'],['doc','📄','Documents'],['asset','🧰','Resources'],['other','📦','Other']];
const SORTS=[['popular','Most popular'],['new','Newest'],['rated','Top rated'],['low','Price: low to high'],['high','Price: high to low']];
const store=(k,v)=>{try{if(v===undefined)return JSON.parse(localStorage.getItem(k)||'[]');localStorage.setItem(k,JSON.stringify(v))}catch{}return[]};
let pane='market',cat='all',q='',sort='popular',priceF='any',hideOwned=false,openKey=null,busy=false;
let cart=store('lumen.cart'),wish=store('lumen.wish');
let reviews=[],revUnsub=null,revKey=null,revUp=true,heroI=0;const names={};

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
function seller(uid){if(!uid)return'Lumen';if(names[uid]!=null)return names[uid]||'a creator';names[uid]='';C()?.getUser(uid).then(u=>{names[uid]=u?.name||'a creator';$$(`[data-seller="${uid}"]`).forEach(e=>e.textContent=names[uid])}).catch(()=>{});return'…'}
function what(it){if(it.type==='game')return it.deliver==='html'?['🧩','Playable HTML game','Runs right here in Lumen and goes into your Game hub.']:['🎮','Online game','Plays inside Lumen and goes into your Game hub.'];
  if(it.deliver==='file')return['📎',`${esc(it.fname||'File')}`,`${fmtSize(it.fsize||0)} · download it straight from Lumen, any time.`];
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
function use(it){if(it.type==='game')return H().launch(it.key);if(it.deliver==='file')return download(it);return openLink(it)}

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
  if(!confirm(`Buy ${items.length} item${items.length===1?'':'s'} for ✦ ${fmtN(total)}?`))return;
  busy=true;const st={coins:coins(),owned:[...ownedKeys()]},done=[];
  for(const it of items){try{await buyOne(it,st);done.push(it)}catch(e){toast(`Stopped at ${it.title}: ${why(e)}`);break}}
  cart=cart.filter(k=>!done.some(d=>d.key===k));store('lumen.cart',cart);busy=false;closeCart();if(done.length)thanks(done);render()}
function thanks(list){const el=document.createElement('div');el.className='mk-thanks';
  el.innerHTML=`<div class="mk-thanks-box card"><div class="mk-check">✓</div><h2>${list.length===1?`${esc(list[0].title)} is yours`:`${list.length} items are yours`}</h2>
    <p class="muted">${list.some(i=>i.type==='game')?'Games are in your Game hub. ':''}${list.some(i=>i.type!=='game')?'Everything else is in Store → My purchases. ':''}You own ${list.length===1?'it':'them'} forever.</p>
    <div class="mk-thanks-list">${list.map(it=>`<div class="mk-line"><div class="hart mini" style="${H().art(it)}"></div><b>${esc(it.title)}</b><button class="btn-acc" data-use="${esc(it.key)}">${useLabel(it)}</button></div>`).join('')}</div>
    <button data-x style="margin-top:14px">Keep shopping</button></div>`;
  document.body.appendChild(el);el.onclick=e=>{const u=e.target.closest('[data-use]');if(u){el.remove();const it=byKey(u.dataset.use);if(it)use(it);return}if(e.target===el||e.target.closest('[data-x]'))el.remove()}}
const useLabel=it=>it.type==='game'?'▶ Play':it.deliver==='file'?'⬇ Download':'↗ Open link';

/* ---------- cart + wishlist ---------- */
function toggleCart(key){const it=byKey(key);if(!it)return;if(has(it))return toast('You already own this');
  if(cart.includes(key)){cart=cart.filter(k=>k!==key);toast('Removed from your cart')}else{cart=[...cart,key];toast(`🛒 ${it.title} added to your cart`)}store('lumen.cart',cart);render();paintCart()}
function toggleWish(key){if(wish.includes(key)){wish=wish.filter(k=>k!==key)}else{wish=[key,...wish];toast('♥ Saved to your wishlist')}store('lumen.wish',wish);render()}
function cartBadge(){const n=cart.filter(k=>{const it=byKey(k);return it&&!has(it)}).length;const b=$('#mkCartN');if(b){b.textContent=n||'';b.hidden=!n}}
function openCart(){let el=$('#mkCart');if(!el){el=document.createElement('div');el.id='mkCart';el.className='mk-drawer';document.body.appendChild(el);
    el.onclick=e=>{if(e.target===el||e.target.closest('[data-close]'))return closeCart();const r=e.target.closest('[data-rm]');if(r){cart=cart.filter(k=>k!==r.dataset.rm);store('lumen.cart',cart);paintCart();render();return}
      const o=e.target.closest('[data-go]');if(o){closeCart();open(o.dataset.go);return}if(e.target.closest('[data-checkout]'))checkout()}}
  el.classList.add('on');paintCart()}
function closeCart(){$('#mkCart')?.classList.remove('on')}
function paintCart(){cartBadge();const el=$('#mkCart');if(!el||!el.classList.contains('on'))return;
  const items=cart.map(byKey).filter(Boolean),buyable=items.filter(it=>!has(it)),full=buyable.reduce((a,it)=>a+it.price,0),total=buyable.reduce((a,it)=>a+cost(it),0),left=coins()-total;
  el.innerHTML=`<div class="mk-panel"><div class="mk-panel-head"><h2>🛒 Your cart <em class="count">${buyable.length}</em></h2><button class="ib" data-close title="Close">✕</button></div>
    <div class="mk-panel-list">${items.map(it=>`<div class="mk-line${has(it)?' owned':''}"><button class="hart mini" data-go="${esc(it.key)}" style="${H().art(it)}"></button><div class="info"><b data-go="${esc(it.key)}">${esc(it.title)}</b><span>${label(it).slice(0,2).join(' ')}${has(it)?' · ✓ already yours':''}</span></div><span class="mk-lprice">${it.price?'✦ '+fmtN(cost(it)):'Free'}</span><button class="ib" data-rm="${esc(it.key)}" title="Remove">🗑</button></div>`).join('')||'<p class="muted" style="padding:20px;text-align:center">Your cart is empty.<br>Add things from the Store with 🛒.</p>'}</div>
    ${buyable.length?`<div class="mk-sum"><div><span>Subtotal</span><span>✦ ${fmtN(full)}</span></div>${total<full?`<div class="mk-save"><span>💎 Lite 10% off</span><span>− ✦ ${fmtN(full-total)}</span></div>`:''}<div class="mk-total"><span>Total</span><b>✦ ${fmtN(total)}</b></div>
      <div class="muted"><span>Your Glow</span><span>✦ ${fmtN(coins())}${me()?` → ${left<0?'<b style="color:var(--danger)">not enough</b>':'✦ '+fmtN(left)}`:''}</span></div>
      <button class="btn-acc mk-checkout" data-checkout ${!me()||left<0?'disabled':''}>${!me()?'Sign in to check out':left<0?`Need ✦ ${fmtN(-left)} more`:`Check out · ✦ ${fmtN(total)}`}</button></div>`:''}</div>`}

/* ---------- product cards ---------- */
function stars(it){return it.upReviews?`<span class="mk-rate">👍 ${fmtN(it.upReviews)}</span>`:''}
function priceTag(it){if(has(it))return'<span class="mk-price own">✓ Owned</span>';if(!it.price)return'<span class="mk-price free">Free</span>';const c=cost(it);return`<span class="mk-price">✦ ${fmtN(c)}${c<it.price?` <s>${fmtN(it.price)}</s>`:''}</span>`}
function action(it,big){const k=esc(it.key),cls=big?' big':'';
  if(!me())return`<button class="mk-act${cls}" disabled>Sign in</button>`;
  if(has(it))return`<button class="btn-acc mk-act${cls}" data-use="${k}">${useLabel(it)}</button>`;
  if(!it.price)return`<button class="btn-acc mk-act${cls}" data-buy="${k}">＋ Get free</button>`;
  if(canOpen(it))return`<button class="btn-acc mk-act${cls}" data-use="${k}">${useLabel(it)}</button>`;
  return big?`<button class="btn-acc mk-act${cls}" data-buy="${k}">Buy now · ✦ ${fmtN(cost(it))}</button>`:`<button class="mk-act${cart.includes(it.key)?' in':''}" data-cart="${k}" title="${cart.includes(it.key)?'In your cart (click to remove)':'Add to cart'}">${cart.includes(it.key)?'✓ In cart':'🛒 Add'}</button>`}
function pcard(it){const k=esc(it.key),[ic,lb]=label(it);
  return`<div class="mk-card" data-pk="${k}"><button class="mk-img" data-open="${k}" style="${H().art(it)}" aria-label="${esc(it.title)}">${it.image?'':`<span>${esc(it.title)}</span>`}<em class="mk-badge">${ic} ${lb}</em>${pinned(it)?'<em class="mk-flag">⭐ Featured</em>':it.builtin?'<em class="mk-flag lumen">Lumen original</em>':Date.now()-at(it)<7*864e5?'<em class="mk-flag new">NEW</em>':''}</button>
    <button class="mk-heart${wish.includes(it.key)?' on':''}" data-wish="${k}" title="${wish.includes(it.key)?'Remove from wishlist':'Save to wishlist'}">${wish.includes(it.key)?'♥':'♡'}</button>
    <div class="mk-body"><b class="mk-title" data-open="${k}">${esc(it.title)}</b><span class="mk-by">by <span data-seller="${esc(it.uid||'')}">${esc(seller(it.uid))}</span></span>
      <span class="mk-meta">${stars(it)}${it.sales?`<span>${fmtN(it.sales)} ${it.price?'sold':'got it'}</span>`:''}${it.type==='game'&&plays(it)?`<span>▶ ${fmtN(plays(it))}</span>`:''}</span>
      <div class="mk-foot">${priceTag(it)}${action(it)}</div></div></div>`}
const grid=(list,empty)=>list.length?`<div class="mk-grid">${list.map(pcard).join('')}</div>`:`<div class="mk-empty card"><div style="font-size:40px">🛍</div><p class="muted">${empty}</p></div>`;
const row=(title,list,more)=>list.length?`<div class="mk-sec"><h2 class="hsec">${title}${more?` <button class="hsec-more" data-cat="${more}">See all →</button>`:''}</h2><div class="mk-row">${list.map(pcard).join('')}</div></div>`:'';

/* ---------- the storefront ---------- */
function filtered(){const ql=q.toLowerCase();
  let list=products().filter(it=>cat==='all'||it.type===cat||(cat==='other'&&!['game','ebook','doc','asset'].includes(it.type)));
  if(ql)list=list.filter(it=>[it.title,it.desc,names[it.uid],label(it)[1]].some(x=>(x||'').toLowerCase().includes(ql)));
  if(priceF==='free')list=list.filter(it=>!it.price);if(priceF==='paid')list=list.filter(it=>it.price>0);
  if(priceF==='afford')list=list.filter(it=>cost(it)<=coins());if(hideOwned)list=list.filter(it=>!has(it));
  const s={popular:(a,b)=>pop(b)-pop(a),new:(a,b)=>at(b)-at(a),rated:(a,b)=>(b.upReviews||0)-(a.upReviews||0)||pop(b)-pop(a),low:(a,b)=>a.price-b.price||pop(b)-pop(a),high:(a,b)=>b.price-a.price||pop(b)-pop(a)}[sort];
  return list.sort(s)}
function sidebar(){const all=products();const n=c=>c==='all'?all.length:all.filter(it=>it.type===c).length;
  return`<aside class="mk-side card"><h3>Departments</h3><div class="mk-cats">${CATS.map(([k,i,l])=>`<button data-cat="${k}" class="${cat===k?'on':''}"><span>${i} ${l}</span><em>${n(k)}</em></button>`).join('')}</div>
    <h3>Price</h3><div class="mk-cats">${[['any','Any price'],['free','🆓 Free'],['paid','✦ Paid'],['afford','💰 I can afford']].map(([k,l])=>`<button data-price="${k}" class="${priceF===k?'on':''}"><span>${l}</span></button>`).join('')}</div>
    <label class="chk"><input type="checkbox" id="mkHide" ${hideOwned?'checked':''}> Hide things I own</label>
    <div class="mk-sell"><b>🛠 Sell on Lumen</b><p class="muted">Upload games, ebooks, documents or anything else, set a price and keep 90% of every sale.</p><button data-sell>${H()?.data().isCreator?'Open Creator Dashboard':'Become a creator'}</button></div></aside>`}
function hero(list){if(!list.length)return'';heroI%=list.length;
  return`<div class="mk-hero">${list.map((it,i)=>`<div class="mk-slide${i===heroI?' on':''}" data-open="${esc(it.key)}"><div class="mk-slide-art" style="${H().art(it)}"></div><div class="mk-slide-in"><span class="hkick">${pinned(it)?'⭐ Featured':'🔥 Popular right now'} · ${label(it).slice(0,2).join(' ')}</span><h2>${esc(it.title)}</h2>${it.desc?`<p>${esc(it.desc.slice(0,140))}${it.desc.length>140?'…':''}</p>`:''}<div class="row" style="gap:10px;margin-top:14px">${priceTag(it)}<button class="btn-acc" data-open="${esc(it.key)}">View</button></div></div></div>`).join('')}
    ${list.length>1?`<div class="mk-dots">${list.map((_,i)=>`<button data-hero="${i}" class="${i===heroI?'on':''}" aria-label="Slide ${i+1}"></button>`).join('')}</div>`:''}</div>`}
function storefront(){const all=products(),list=filtered(),home=cat==='all'&&!q&&priceF==='any'&&!hideOwned;
  const feat=[...all.filter(pinned),...all.filter(it=>!pinned(it)&&it.image).sort((a,b)=>pop(b)-pop(a))].slice(0,5);
  const cc=CATS.find(c=>c[0]===cat);
  return`<div class="mk-layout">${sidebar()}<div class="mk-main">
    ${home?hero(feat)+`<div class="mk-tiles">${CATS.slice(1).map(([k,i,l])=>`<button class="mk-tile t-${k}" data-cat="${k}"><span>${i}</span><b>${l}</b><em>${all.filter(it=>it.type===k).length} items</em></button>`).join('')}</div>`
      +row('🔥 Best sellers',all.filter(it=>it.price>0&&!it.builtin).sort((a,b)=>(b.sales||0)-(a.sales||0)||pop(b)-pop(a)).slice(0,10))
      +row('✨ New arrivals',all.filter(it=>!it.builtin).sort((a,b)=>at(b)-at(a)).slice(0,10))
      +row('🆓 Free to get',all.filter(it=>!it.price&&!has(it)).sort((a,b)=>pop(b)-pop(a)).slice(0,10))
      +row('🎮 Top games',all.filter(it=>it.type==='game').sort((a,b)=>pop(b)-pop(a)).slice(0,10),'game'):''}
    <div class="mk-bar"><div><h2 class="hsec" style="margin:0">${q?`Results for “${esc(q)}”`:home?'🛍 All products':`${cc[1]} ${cc[2]}`}</h2><span class="muted">${list.length} item${list.length===1?'':'s'}</span></div>
      <label class="mk-sort">Sort by <select id="mkSort">${SORTS.map(([k,l])=>`<option value="${k}" ${sort===k?'selected':''}>${l}</option>`).join('')}</select></label></div>
    ${grid(list,q?'Nothing matches that search. Try another word.':'Nothing here yet. Lumen creators can add the first one!')}</div></div>`}

/* ---------- a product's page ---------- */
function revCol(key){const {F,db}=C();return key.startsWith('p_')?F.collection(db,'projects',key.slice(2),'reviews'):F.collection(db,'reviews',key,'list')}
function listenReviews(key){if(revKey===key)return;revUnsub?.();revUnsub=null;reviews=[];revKey=key;if(!me()||!C())return;
  revUnsub=C().F.onSnapshot(revCol(key),s=>{reviews=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.at?.toMillis?.()||0)-(a.at?.toMillis?.()||0));render()},()=>{})}
function stopReviews(){revUnsub?.();revUnsub=null;revKey=null;reviews=[]}
function productPage(it){const [ic,lb]=label(it),cc=catOf(it),up=reviews.filter(r=>r.up).length,pct=reviews.length?Math.round(up/reviews.length*100):0,mine=reviews.find(r=>r.id===me()),own=it.uid&&it.uid===me();
  const [wi,wt,wd]=what(it),c=cost(it),draft=$('#mkRevText')?.value;
  const more=products().filter(x=>x.key!==it.key&&x.uid===it.uid&&it.uid).sort((a,b)=>pop(b)-pop(a)).slice(0,8);
  const like=products().filter(x=>x.key!==it.key&&x.type===it.type&&!more.includes(x)).sort((a,b)=>pop(b)-pop(a)).slice(0,8);
  const date=it.at?.toDate?.()?.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
  return`<nav class="mk-crumbs"><a href="#" data-home>Store</a> › <a href="#" data-cat="${cc[0]}">${cc[2]}</a> › <span>${esc(it.title)}</span></nav>
  <div class="mk-prod"><div class="mk-gallery"><div class="mk-cover" style="${H().art(it)}">${it.image?'':`<span>${esc(it.title)}</span>`}</div>
      <div class="mk-specs card"><h3>Details</h3><dl><dt>Category</dt><dd>${ic} ${lb}</dd><dt>Seller</dt><dd>${it.uid?`<a href="#" data-user="${it.uid}" data-seller="${it.uid}">${esc(seller(it.uid))}</a>`:'Lumen'}</dd>
        <dt>You get</dt><dd>${wi} ${wt}</dd>${it.deliver==='file'||it.deliver==='html'?`<dt>Size</dt><dd>${fmtSize(it.fsize||0)}</dd>`:''}${date?`<dt>Released</dt><dd>${date}</dd>`:''}
        <dt>${it.price?'Sold':'Got it'}</dt><dd>${fmtN(it.sales||0)}</dd>${it.type==='game'?`<dt>Plays</dt><dd>${fmtN(plays(it))}</dd>`:''}</dl></div></div>
    <div class="mk-buy"><span class="hkick">${ic} ${lb}${it.builtin?' · Lumen original':''}</span><h1>${esc(it.title)}</h1>
      <div class="mk-byline">by ${it.uid?`<a href="#" data-user="${it.uid}" data-seller="${it.uid}">${esc(seller(it.uid))}</a>`:'<b>Lumen</b>'}${reviews.length?` · <a href="#mkReviews" data-jump>👍 ${pct}% of ${fmtN(reviews.length)} review${reviews.length===1?'':'s'}</a>`:it.upReviews?` · 👍 ${fmtN(it.upReviews)}`:''}</div>
      <div class="mk-pricebox card">${has(it)?`<div class="mk-big-price own">✓ You own this</div><p class="muted">${it.type==='game'?'It’s in your Game hub.':'It’s in Store → My purchases.'}</p>`:
          !it.price?'<div class="mk-big-price">Free</div><p class="muted">Get it once and keep it in your library.</p>':`<div class="mk-big-price">✦ ${fmtN(c)}${c<it.price?` <s>${fmtN(it.price)}</s> <em class="pill live">💎 Lite −10%</em>`:''}</div><p class="muted">${me()?coins()>=c?`You have ✦ ${fmtN(coins())}. After buying: ✦ ${fmtN(coins()-c)}.`:`You have ✦ ${fmtN(coins())}: ✦ ${fmtN(c-coins())} short. Claim free Glow daily at the top of the Store.`:'Sign in to buy it with ✦ Glow.'}</p>`}
        <div class="mk-btns">${own?`<button class="btn-acc mk-act big" data-use="${esc(it.key)}">${useLabel(it)}</button><button data-sell>✏️ Edit in Creator Dashboard</button>`:action(it,true)}
          ${!has(it)&&!own&&it.price>0&&me()?`<button class="mk-act big${cart.includes(it.key)?' in':''}" data-cart="${esc(it.key)}">${cart.includes(it.key)?'✓ In your cart':'🛒 Add to cart'}</button>`:''}
          <button class="mk-act big${wish.includes(it.key)?' in':''}" data-wish="${esc(it.key)}">${wish.includes(it.key)?'♥ Wishlisted':'♡ Wishlist'}</button></div>
        <ul class="mk-perks"><li><b>${wi}</b> <span><b>${wt}</b><br><span class="muted">${wd}</span></span></li><li><b>♾</b> <span>Yours forever, on any device you sign in on</span></li>${it.uid&&it.price?'<li><b>🤝</b> <span>90% goes straight to the creator</span></li>':''}</ul></div>
      ${it.type==='game'&&canOpen(it)?`<button class="mk-link" data-game="${esc(it.key)}">🎮 Open its game page →</button>`:''}</div></div>
  <div class="mk-cols"><div><div class="card mk-desc"><h2>About this ${lb.toLowerCase()}</h2>${it.desc?`<p>${esc(it.desc)}</p>`:'<p class="muted">The creator didn’t write a description.</p>'}</div>
    <div class="card" id="mkReviews"><h2>Reviews</h2>${reviews.length?`<div class="mk-revsum"><b>${pct}%</b><div style="flex:1"><div class="gp-bar"><span style="width:${pct}%"></span></div><span class="muted">${up} recommend it · ${reviews.length-up} don't</span></div></div>`:''}
      ${!me()?'<div class="banner">Sign in to write a review.</div>':own?'<div class="banner">This is yours. Reviews from people show up here, and every positive one earns you ✦ 50 Glow.</div>':!has(it)&&!canOpen(it)?'<p class="muted" style="font-size:13px">Get it first to write a review.</p>':
        `<div class="gp-form"><div class="seg" id="mkUp"><button type="button" data-up="1" class="${(mine?mine.up:revUp)?'on':''}" ${mine?'disabled':''}>👍 Recommend</button><button type="button" data-up="0" class="${(mine?!mine.up:!revUp)?'on':''}" ${mine?'disabled':''}>👎 Not for me</button></div>
          <textarea id="mkRevText" rows="3" maxlength="500" placeholder="What did you think?">${esc(draft??mine?.text??'')}</textarea>
          <div class="row" style="justify-content:space-between"><span class="muted" style="font-size:12px">${mine?'You can edit your words; the 👍/👎 stays.':'One review per person.'}</span><button class="btn-acc" id="mkRevSend">${mine?'Update review':'Post review'}</button></div></div>`}
      <div class="list gp-revs" id="mkRevList">${reviews.map(r=>`<div class="gp-rev"><div class="bub"><div class="row" style="gap:8px"><b data-user="${r.uid}" data-seller="${r.uid}" style="cursor:pointer">${esc(seller(r.uid))}</b><em class="pill ${r.up?'live':'rej'}">${r.up?'👍 Recommends':'👎 Not for them'}</em><span class="muted" style="font-size:12px">${r.at?.toDate?.().toLocaleDateString()||''}</span></div>${r.text?`<p>${esc(r.text)}</p>`:''}</div></div>`).join('')||'<p class="muted">No reviews yet.</p>'}</div></div></div>
    <div class="mk-aside">${more.length?`<div class="card"><h2>More from ${it.uid?`<span data-seller="${it.uid}">${esc(seller(it.uid))}</span>`:'Lumen'}</h2><div class="mk-mini">${more.map(pcard).join('')}</div></div>`:''}</div></div>
  ${row('You might also like',like)}`}
async function sendReview(){const it=byKey(openKey);if(!it)return;const {F,D,db}=C();const text=$('#mkRevText').value.trim().slice(0,500),mine=reviews.find(r=>r.id===me()),ref=F.doc(revCol(it.key),me());
  try{if(mine){await F.updateDoc(ref,{text,at:F.serverTimestamp()});toast('Review updated');return}
    const up=$('#mkUp .on')?.dataset.up!=='0';if(!text&&!up)return toast('Say why it’s not for you');
    const b=F.writeBatch(db);b.set(ref,{uid:me(),up,text,at:F.serverTimestamp()});if(up&&!it.builtin)b.update(D('projects',it.id),{upReviews:F.increment(1),lastReview:me()});
    await b.commit();$('#mkRevText').value='';toast('Review posted')}catch(e){toast(e.code==='permission-denied'?'Couldn’t post the review (one review per person).':e.message)}}

/* ---------- wishlist + purchases ---------- */
function wishPane(){const list=wish.map(byKey).filter(Boolean);
  return`<h2 class="hsec">♡ Your wishlist <em class="count">${list.length}</em></h2>${grid(list,'Nothing saved yet. Tap ♡ on anything in the Store to keep it here.')}`}
function libPane(){if(!me())return'<div class="banner">Sign in (bottom-left) to see what you own.</div>';
  const list=products().filter(it=>has(it)&&!it.builtin||(it.builtin&&it.price>0&&has(it))).sort((a,b)=>ownedKeys().indexOf(b.key)-ownedKeys().indexOf(a.key));
  const games=list.filter(it=>it.type==='game'),other=list.filter(it=>it.type!=='game');
  const line=it=>{const [ic,lb]=label(it),[wi,wt]=what(it);return`<div class="mk-own-row card"><button class="hart mini" data-open="${esc(it.key)}" style="${H().art(it)}"></button><div class="info"><b data-open="${esc(it.key)}">${esc(it.title)}</b><span>${ic} ${lb} · by <span data-seller="${esc(it.uid||'')}">${esc(seller(it.uid))}</span> · ${wi} ${wt}${it.deliver==='file'?` · ${fmtSize(it.fsize||0)}`:''}</span></div><button class="btn-acc" data-use="${esc(it.key)}">${useLabel(it)}</button></div>`};
  return`<div class="mk-own"><h2 class="hsec">📥 Downloads & files <em class="count">${other.length}</em></h2>${other.map(line).join('')||'<p class="muted">Ebooks, documents and resources you buy or get show up here.</p>'}
    <h2 class="hsec">🎮 Games <em class="count">${games.length}</em> <button class="hsec-more" data-gohub>Game hub →</button></h2>${games.map(line).join('')||'<p class="muted">Games you buy or get go into your Game hub.</p>'}</div>`}

/* ---------- render ---------- */
function render(){const box=$('#mkBox');if(!box)return;cartBadge();$$('#mkPanes [data-p]').forEach(b=>b.classList.toggle('on',b.dataset.p===pane));
  $('#mkPane').hidden=pane==='cos';$('#cosPane').hidden=pane!=='cos';$('#mkSearch').hidden=pane==='cos';if(pane==='cos'||!H())return;
  const ae=document.activeElement;if(ae&&box.contains(ae)&&ae.matches('textarea,input:not([type=checkbox])'))return; // don't wipe a review mid-typing
  if(openKey){const it=byKey(openKey);if(!it){openKey=null;stopReviews()}else{listenReviews(it.key);box.innerHTML=productPage(it);paintCart();return}}
  box.innerHTML=pane==='wish'?wishPane():pane==='lib'?libPane():storefront();paintCart()}
function open(key){const it=byKey(key);if(!it)return toast('That isn’t in the Store any more');pane='market';openKey=key;L.go('shop');render();$('#v-shop')?.scrollIntoView({block:'start'});$('main')?.scrollTo?.({top:0})}
function show(c){pane='market';openKey=null;stopReviews();if(c)cat=c;L.go('shop');render()}
function setPane(p){pane=p;openKey=null;stopReviews();render()}

$('#mkBox').addEventListener('click',e=>{const t=e.target;const g=s=>t.closest(s);let b;
  if((b=g('[data-wish]')))return toggleWish(b.dataset.wish);
  if((b=g('[data-cart]')))return toggleCart(b.dataset.cart);
  if((b=g('[data-buy]')))return buyNow(b.dataset.buy);
  if((b=g('[data-use]'))){const it=byKey(b.dataset.use);return it&&use(it)}
  if((b=g('[data-hero]'))){heroI=+b.dataset.hero;$$('.mk-slide').forEach((s,i)=>s.classList.toggle('on',i===heroI));$$('.mk-dots button').forEach((s,i)=>s.classList.toggle('on',i===heroI));return}
  if((b=g('[data-user]'))){e.preventDefault();return L.openUser?.(b.dataset.user)}
  if((b=g('[data-open]')))return open(b.dataset.open);
  if((b=g('[data-cat]'))){e.preventDefault();cat=b.dataset.cat;openKey=null;stopReviews();render();$('main')?.scrollTo?.({top:0});return}
  if((b=g('[data-price]'))){priceF=b.dataset.price;return render()}
  if(g('[data-home]')){e.preventDefault();cat='all';q='';$('#mkQ').value='';openKey=null;stopReviews();return render()}
  if(g('[data-sell]'))return L.go('creator');
  if(g('[data-gohub]'))return L.go('games');
  if((b=g('[data-game]')))return H().openGame(b.dataset.game);
  if(g('[data-jump]')){e.preventDefault();return $('#mkReviews')?.scrollIntoView({behavior:'smooth'})}
  if((b=g('#mkUp [data-up]'))){revUp=b.dataset.up==='1';$$('#mkUp button').forEach(x=>x.classList.toggle('on',x===b));return}
  if(g('#mkRevSend'))return sendReview()});
$('#mkBox').addEventListener('change',e=>{if(e.target.id==='mkSort'){sort=e.target.value;render()}if(e.target.id==='mkHide'){hideOwned=e.target.checked;render()}});
$('#mkPanes').addEventListener('click',e=>{const b=e.target.closest('[data-p]');if(b)setPane(b.dataset.p)});
$('#mkQ').addEventListener('input',e=>{q=e.target.value.trim();pane='market';openKey=null;stopReviews();render()});
$('#mkCartBtn').onclick=openCart;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCart()});
setInterval(()=>{const s=$$('.mk-slide');if(s.length<2||!$('#v-shop')?.classList.contains('on')||document.hidden)return;heroI=(heroI+1)%s.length;s.forEach((x,i)=>x.classList.toggle('on',i===heroI));$$('.mk-dots button').forEach((x,i)=>x.classList.toggle('on',i===heroI))},6500);

// the cosmetics shop still opens straight to its own tabs (Lite, bundles…)
const prevShopGo=L.shopGo;L.shopGo=t=>{pane='cos';openKey=null;render();prevShopGo?.(t)};
const prevP=L.onProfile;L.onProfile=p=>{prevP?.(p);if($('#v-shop')?.classList.contains('on'))render();else cartBadge()};
const prevV=L.onView;L.onView=v=>{prevV?.(v);if(v==='shop')render();else{closeCart();stopReviews();openKey=null}};
L.market={open,show,buyNow,download,html,forget:id=>fileCache.delete(id),refresh:()=>{if($('#v-shop')?.classList.contains('on'))render();else cartBadge()}};
render();
