/* Lumen Shop: earn ✦ Glow daily, buy and equip cosmetics, bundles, Lumen premium. Every purchase is checked by firestore.rules. */
const L=window.Lumen,{esc,toast}=L;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const TABS=[['home','🛍','Featured'],['premium','💎','Lumen Lite'],['bundles','🎁','Bundles'],['fx','✨','Profile effects'],['deco','💫','Decorations'],['plate','🎴','Nameplates'],['nfx','🔤','Name effects'],['theme','🎨','Themes'],['buddy','🧸','Buddies','Beta'],['creator','🛠','Creator'],['owned','🎒','Owned']];
const SLOT={buddy:'buddy',fx:'fx',deco:'deco',plate:'plate',nfx:'nfx',theme:'theme'};
const TYPE_LABEL={fx:'Profile effect',deco:'Avatar decoration',plate:'Nameplate',nfx:'Name effect',theme:'App theme',buddy:'3D buddy'};
const TIER_NAME={lite:'Lite',upgrade:'Upgrade',pro:'Pro',ultimate:'Ultimate'};
let tab='home',prof=null,busy=false,citems=[],cunsub=null,openId=null,view='';const cnames={};
const P=()=>L.plan||{lite:()=>false,up:()=>false,pro:()=>false,ult:()=>false,price:p=>p,bonus:x=>x,wears:()=>null,top:()=>'',until:()=>0};
const getItem=id=>L.cos.byId[id]||citems.find(i=>i.id===id);
const owned=()=>prof?.owned||[];
const coins=()=>+prof?.coins||0;
const fmt=n=>(+n||0).toLocaleString();
const nextClaim=()=>{const t=prof?.lastClaim?.toMillis?.();return t?t+20*3600e3:0};
const BUN=()=>L.cos.BUNDLES||[];
const bundlesWith=id=>BUN().filter(b=>b.items.includes(id));
const sumOf=b=>b.items.reduce((s,i)=>s+(L.cos.byId[i]?.price||0),0);

/* ---------- what you can do with an item ---------- */
function state(it){const own=owned().includes(it.id),prem=it.tier||'',wear=prem?P().wears(it.id)===true:false,mine=!!prof&&it.uid&&it.uid===prof.uid;
  const eq=!!prof&&prof[SLOT[it.type]]===it.id,cost=P().price(it.price||0);
  return{own:own||wear,eq,prem,wear,mine,cost,full:it.price||0,locked:it.type==='buddy'&&!P().lite()}}
function priceHTML(it,s=state(it)){if(s.prem)return`<span class="price prem-price">💎 ${TIER_NAME[s.prem]}</span>`;if(s.own)return'<span class="price muted">Owned</span>';if(s.mine)return'<span class="price">Yours</span>';
  return`<span class="price">✦ ${fmt(s.cost)}${s.cost<s.full?` <s>${fmt(s.full)}</s>`:''}</span>`}
function buttonHTML(it,s=state(it),big){const c=big?' big':'';
  if(!prof)return`<button disabled class="${c}">Sign in</button>`;
  if(s.eq)return`<button class="${c}" data-unequip="${it.id}">Unequip</button>`;
  if(s.own)return`<button class="btn-acc${c}" data-equip="${it.id}">${s.prem?'Wear':'Equip'}</button>`;
  if(s.prem)return`<button class="btn-gold${c}" data-gotab="premium">Get ${TIER_NAME[s.prem]}</button>`;
  if(s.mine)return`<button class="btn-acc${c}" data-ownequip="${it.id}">Equip (free)</button>`;
  if(s.locked)return`<button class="btn-gold${c}" data-gotab="premium">💎 Lite only</button>`;
  const ok=coins()>=s.cost;return`<button class="${ok?'btn-acc':''}${c}" data-buy="${it.id}" ${ok?'':'disabled'}>${ok?'Buy':'Need ✦ '+fmt(s.cost-coins())}</button>`}

/* ---------- previews on your own profile ---------- */
const meBase=()=>({...(prof||{}),name:prof?.name||'You'});
function preview(it,{size='small',as=''}={}){const c=L.cloud,me=meBase(),slot=SLOT[it.type],u={...me,[slot]:it.id};
  const v=as||({fx:'card',deco:'pic',plate:'bar',nfx:'name',theme:'theme',buddy:'buddy'})[it.type];
  if(v==='card')return c.card({...u,bio:size==='big'?(me.bio||'This is how your profile card looks to everyone.'):''},{compact:size!=='big'});
  if(v==='pic')return`<div class="prev-pic">${c.pic(u,size==='big'?150:84)}</div>`;
  if(v==='bar')return`<div class="prev-bars${size==='big'?' big':''}"><div class="person${L.cos.plateCls(u.plate)}">${L.cos.buddyCanvas(u.buddy,'bar','shop:'+it.id+':bar')}${c.pic(u,40)}<div class="info"><b>${c.nameHTML(u,{badges:false})}</b><span>🎮 Playing <b>Nightbound</b></span></div></div>${size==='big'?`<div class="person${L.cos.plateCls(u.plate)}" style="opacity:.92">${c.pic(u,32)}<div class="info"><b>${c.nameHTML(u,{badges:false})}</b><span>Online</span></div></div>`:''}</div>`;
  if(v==='name')return`<div class="prev-name${size==='big'?' big':''}">${c.nameHTML(u,{badges:false})}</div>`;
  if(v==='buddy')return`<div class="buddy-stage${size==='big'?' big':''}">${L.cos.buddyCanvas(it.id,'card','shop:'+it.id+':'+size)}</div>`;
  if(v==='theme')return`<div class="theme-sw${size==='big'?' big':''}">${it.sw.map((x,i)=>`<div style="background:${i===2?x:`linear-gradient(160deg,${x},${it.sw[2]})`}"></div>`).join('')}</div>`;
  return''}
const VIEWS={fx:[['card','Profile card']],deco:[['pic','Picture'],['card','Profile card'],['bar','Profile bar']],plate:[['bar','Profile bar']],nfx:[['name','Name'],['card','Profile card'],['bar','Profile bar']],theme:[['theme','Colours']],buddy:[['buddy','Stage'],['bar','Profile bar'],['card','Profile card']]};

function card(it){const s=state(it);
  return`<div class="card sitem${s.eq?' equipped':''}${s.prem?' prem prem-'+s.prem:''}"><button class="prev" data-view="${it.id}" title="Preview ${esc(it.name)}">
    <span class="tags">${s.eq?'<span class="tag">Equipped</span>':s.own?'<span class="tag">Owned</span>':''}${it.tag==='new'?'<span class="tag t-new">NEW</span>':''}${s.prem?`<span class="tag t-prem">💎 ${TIER_NAME[s.prem]}</span>`:''}${it.type==='buddy'?'<span class="tag t-beta">BETA</span>':''}</span>
    ${preview(it)}<span class="zoom">⤢ Preview</span></button>
    <div class="meta"><b>${esc(it.name)}</b><span>${it.uid?`${TYPE_LABEL[it.type]} · by ${esc(cnames[it.uid]||'…')}`:esc(it.desc)}</span><div class="act-row">${priceHTML(it,s)}${buttonHTML(it,s)}</div></div></div>`}
function grid(list,empty){return`<div class="shop-grid">${list.map(card).join('')||`<p class="muted">${empty||'Nothing here.'}</p>`}</div>`}
const catalog=type=>L.cos.CATALOG.filter(i=>i.type===type).sort((a,b)=>(!!a.tier-!!b.tier)||((b.tag==='new')-(a.tag==='new')));

/* ---------- bundles ---------- */
function bundleCard(b,wide){const me=meBase(),u={...me};for(const i of b.items){const it=L.cos.byId[i];if(it&&it.type!=='theme')u[SLOT[it.type]]=i}
  const have=b.items.filter(i=>owned().includes(i)).length,all=have===b.items.length,cost=P().price(b.price),save=Math.round((1-b.price/sumOf(b))*100);
  const btn=!prof?'<button disabled>Sign in</button>':all?`<button data-wearbundle="${b.id}" class="btn-acc">Wear the look</button>`:`<button class="${coins()>=cost?'btn-acc':''}" data-buybundle="${b.id}" ${coins()>=cost?'':'disabled'}>${coins()>=cost?'Buy bundle':'Need ✦ '+fmt(cost-coins())}</button>`;
  return`<div class="card bundle${wide?' wide':''}" style="--bg:${b.g}"><div class="b-art"><span class="b-save">SAVE ${save}%</span><div class="b-card">${L.cloud.card({...u,bio:''},{compact:true})}</div>${u.plate?`<div class="b-bar">${preview(L.cos.byId[u.plate])}</div>`:''}</div>
    <div class="meta"><b>${b.emoji} ${esc(b.name)}</b><span>${esc(b.desc)}</span>
      <div class="b-items">${b.items.map(i=>{const it=L.cos.byId[i];return`<button class="chip${owned().includes(i)?' have':''}" data-view="${i}">${owned().includes(i)?'✓ ':''}${esc(it?.name||i)}</button>`}).join('')}</div>
      <div class="act-row"><span class="price">${all?'All owned':`✦ ${fmt(cost)} <s>${fmt(sumOf(b))}</s>`}</span>${btn}</div>${have&&!all?`<small class="muted">You own ${have} of ${b.items.length}. The rest come with the bundle.</small>`:''}</div></div>`}

/* ---------- premium ---------- */
const PERKS=[['🎞','10 MB uploads','GIFs and photos up to 10 MB for your profile picture and banner'],['🛠','10 MB creator uploads','Bigger, smoother GIFs for the effects you make and sell'],['🏷','Lite tag','A shining LITE tag next to your name, everywhere'],['✦','5,000 Glow','Dropped straight into your balance when you join'],
  ['👑','Liquid Gold name','An animated gold name effect only Lite members can wear'],['🎨','More customisation','Script, pixel, gothic and wide fonts, card borders and 3 new card styles'],['🖼','Pictures in chat','Send photos up to 1 MB in chats and rooms'],['🧪','Early access','Turn on Labs in Settings and try new features first'],
  ['🏷️','10% off everything','Every item, bundle, creator effect and paid game costs 10% less Glow'],['📈','+5% Glow','5% extra on every payout: daily rewards, posts and creator earnings']];
const PLANS=[{k:'lite',name:'Lumen Lite',price:'₹2,999',per:'per year',hot:'Most popular',lines:['Everything on the left','Liquid Gold name, Gold Dust and Gold Ring','10% off and +5% Glow','5,000 Glow welcome bonus']},
  {k:'upgrade',name:'Upgrade',price:'₹999',per:'every 3 months',lines:['15 MB creator and profile uploads','5 MB pictures in chat','Upgrade-only Prism effects: card, ring, plate and name','Stacks on top of Lite']},
  {k:'pro',name:'Lumen Pro',price:'₹15,999',per:'per year',lines:['Everything in Lite','The Lumen control panel','PRO tag with electric Pro effects','Circuit card, Pro Orbit, Voltage name','Priority creator review (you publish instantly)']},
  {k:'ultimate',name:'Lumen Ultimate',price:'₹25,000',per:'one time, yours forever',note:'+ ₹5,000 a year to keep the control panel',lines:['Everything in Pro and Lite, permanently','ULTIMATE tag with Ultimate-only effects','Ultimate Nebula, Ultimate Crown, violet-gold name and plate','Control panel (renew yearly)']}];
function planStatus(){const p=P();if(!prof)return'';const rows=[];const d=k=>{const t=p.until(k);return t>Date.now()+3e9*100?'forever':new Date(t).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})};
  for(const k of['ultimate','pro','lite','upgrade','ultAdmin'])if(p.until(k)>Date.now())rows.push(`<span class="ps-row"><b>${k==='ultAdmin'?'Ultimate control panel':'Lumen '+TIER_NAME[k]}</b> · ${p.until(k)>Date.now()+50*365*864e5?'forever':'until '+d(k)}</span>`);
  return rows.length?`<div class="prem-status">💎 You're a member. ${rows.join('')}</div>`:''}
function premiumPage(){const me=meBase(),demo={...me,nfx:'nfx_gold',fx:'fx_golddust',deco:'deco_laurel',tier:'lite',tierUntil:new Date(Date.now()+864e5),bio:me.bio||'Shining since today.'};
  const tierItems=t=>L.cos.CATALOG.filter(i=>i.tier===t);
  return`<div class="prem">
  <section class="prem-hero">${L.cos.fxLayer('fx_golddust').replace('fxl','fxl prem-dust')}
    <div class="ph-copy"><span class="ph-kicker">✦ LUMEN PREMIUM</span><h2 class="ph-title">Lumen <span class="gold-text">Lite</span></h2>
      <p class="ph-sub">Your name in liquid gold. Bigger uploads, pictures in chat, 10% off the whole shop, 5% more Glow on everything and 5,000 Glow the moment you join.</p>
      <div class="ph-price"><b>₹2,999</b><span>/ year</span></div>
      <div class="row ph-cta"><button class="btn-gold big" data-scroll="premRedeem">Redeem a Lite code</button><button class="big" data-scroll="premPlans">Compare plans</button></div>
      ${planStatus()}<p class="ph-note">Lumen doesn't take payments. Plans are unlocked with a code from the Lumen team.</p></div>
    <div class="ph-demo"><div class="ph-glow"></div>${L.cloud.card(demo,{compact:false})}<span class="ph-label">This could be your card</span></div>
  </section>
  <section class="prem-perks">${PERKS.map(([i,t,d])=>`<div class="perk"><span class="pi">${i}</span><b>${t}</b><span>${d}</span></div>`).join('')}</section>
  <section class="prem-names"><h3>Names that can't be bought with Glow</h3><div class="pn-row">${[['nfx_gold','Lite'],['nfx_prism','Upgrade'],['nfx_pro','Pro'],['nfx_ult','Ultimate']].map(([id,t])=>`<div class="pn"><div class="prev-name">${L.cloud.nameHTML({...me,nfx:id},{badges:false})}</div><span class="ptag ptag-${t==='Upgrade'?'up':t.toLowerCase()}">${t.toUpperCase()}</span></div>`).join('')}</div></section>
  <section class="prem-plans" id="premPlans">${PLANS.map(pl=>`<div class="plan plan-${pl.k}${pl.hot?' hot':''}">${pl.hot?`<span class="hot">${pl.hot}</span>`:''}<span class="ptag ptag-${pl.k==='upgrade'?'up':pl.k}">${pl.k==='upgrade'?'UPGRADE':pl.k.toUpperCase()}</span><h3>${pl.name}</h3>
      <div class="pl-price"><b>${pl.price}</b><span>${pl.per}</span></div>${pl.note?`<small class="pl-note">${pl.note}</small>`:''}<ul>${pl.lines.map(l=>`<li>${l}</li>`).join('')}</ul>
      <button class="${pl.k==='lite'?'btn-gold':''}" data-scroll="premRedeem">${P()[pl.k==='upgrade'?'up':pl.k==='ultimate'?'ult':pl.k]?.()?'✓ Active':'Redeem a code'}</button></div>`).join('')}</section>
  <section class="prem-items"><h3>Members-only cosmetics</h3><p class="muted">Free to wear while your plan is active. Tap any of them to see it on your own profile.</p>
    ${['lite','upgrade','pro','ultimate'].map(t=>`<h4><span class="ptag ptag-${t==='upgrade'?'up':t}">${t.toUpperCase()}</span></h4>${grid(tierItems(t))}`).join('')}</section>
  <section class="prem-table card"><h3>Side by side</h3><div class="pt-wrap"><table><thead><tr><th></th><th>Free</th><th>Lite</th><th>Upgrade</th><th>Pro</th><th>Ultimate</th></tr></thead><tbody>
    ${[['Profile picture and banner','300 KB','10 MB','15 MB','10 MB','10 MB'],['Creator item uploads','4 MB','10 MB','15 MB','10 MB','10 MB'],['Pictures in chat','—','1 MB','5 MB','1 MB','1 MB'],['Shop discount','—','10%','—','10%','10%'],['Extra Glow on payouts','—','+5%','—','+5%','+5%'],['Welcome Glow','—','5,000','—','5,000','5,000'],['Profile tag','—','LITE','UPGRADE','PRO','ULTIMATE'],['Exclusive effects','—','Gold','Prism','Electric','Nebula & Crown'],['3D buddies (beta)','—','✓','—','✓','✓'],['Labs early access','—','✓','—','✓','✓'],['Control panel','—','—','—','✓','✓ (₹5,000/yr)'],['Price','Free','₹2,999/yr','₹999/3 mo','₹15,999/yr','₹25,000 once']].map(r=>`<tr>${r.map((c,i)=>i?`<td>${c}</td>`:`<th>${c}</th>`).join('')}</tr>`).join('')}
    </tbody></table></div><p class="muted" style="font-size:12px;margin-top:10px">Upgrade is an add-on: with Lite or on its own. Pro and Ultimate include everything in Lite.</p></section>
  <section class="prem-redeem card" id="premRedeem"><div><h3>Got a code?</h3><p class="muted">Codes from the Lumen team unlock Lite, Upgrade, Pro or Ultimate straight away. Glow codes work here too.</p></div>
    <form class="row code-form" data-redeem><input placeholder="LITE-XXXX-XXXX-XXXX" autocomplete="off" spellcheck="false"><button class="btn-gold">Redeem</button></form></section>
  </div>`}

/* ---------- pages ---------- */
function home(){const fresh=L.cos.CATALOG.filter(i=>i.tag==='new'),picks=['fx_galaxy','deco_flame','plate_holo','nfx_fire','fx_aurora','theme_synthwave'].map(i=>L.cos.byId[i]).filter(Boolean);
  const pop=citems.slice().sort((a,b)=>(b.sales||0)-(a.sales||0)).slice(0,4);
  return`<button class="lite-banner" data-gotab="premium">${L.cos.fxLayer('fx_golddust')}<span class="lb-copy"><span class="ph-kicker">✦ NEW · LUMEN PREMIUM</span><b>Your name, in <span class="gold-text">liquid gold</span>.</b><span>Lumen Lite: 10% off everything, +5% Glow, 10 MB uploads, pictures in chat and 5,000 Glow to start.</span></span><span class="lb-name">${L.cloud.nameHTML({...meBase(),nfx:'nfx_gold',tier:'lite',tierUntil:new Date(Date.now()+864e5)})}</span><span class="lb-go">See Lite →</span></button>
  <div class="shop-sec"><div class="sec-h"><h2>New arrivals</h2><button data-gotab="fx">All effects →</button></div>${grid(fresh)}</div>
  <div class="shop-sec"><div class="sec-h"><h2>Bundles</h2><button data-gotab="bundles">All bundles →</button></div><div class="bundle-row">${BUN().slice(0,3).map(b=>bundleCard(b)).join('')}</div></div>
  <div class="shop-sec"><div class="sec-h"><h2>Staff picks</h2></div>${grid(picks)}</div>
  ${pop.length?`<div class="shop-sec"><div class="sec-h"><h2>Popular from creators</h2><button data-gotab="creator">Creator shop →</button></div>${grid(pop)}</div>`:''}`}
function creatorPage(){const list=citems.slice().sort((a,b)=>(b.sales||0)-(a.sales||0));
  list.forEach(i=>{if(!cnames[i.uid])L.cloud?.getUser(i.uid).then(u=>{cnames[i.uid]=u.name||'a creator';render()})});
  return`<div class="shop-cr-intro card"><b>🛠 Made by Lumen creators</b><span class="muted">Profile effects, decorations and nameplates made by the community and checked by the Lumen team. Creators keep 90% of every sale.${prof?'':' Sign in to buy.'}</span></div>`+grid(list,'No creator items yet. Lumen creators can make them on their Creator page.')}
function ownedPage(){const cat=L.cos.CATALOG.filter(i=>owned().includes(i.id)||(i.tier&&P().wears(i.id)===true)),cr=citems.filter(i=>owned().includes(i.id)||(prof&&i.uid===prof.uid));
  return grid([...cat,...cr],'Nothing yet. Claim your Glow and treat yourself.')}

function render(){const box=$('#shopGrid');if(!box)return;
  $('#glowBal').textContent=fmt(coins());
  const nc=nextClaim(),ready=!nc||Date.now()>=nc,cb=$('#claimBtn'),b=P().bonus(prof?.lastClaim?150:500);
  cb.disabled=!prof||!ready;cb.textContent=!prof?'Sign in to earn Glow':!prof.lastClaim?`🎁 Claim ${fmt(b)} welcome Glow`:ready?`🎁 Claim daily +${b}`:`Next reward in ${Math.ceil((nc-Date.now())/36e5)}h`;
  const t=P().top();$('#shopPlan').innerHTML=t?`<span class="ptag ptag-${t}">${t.toUpperCase()}</span> 10% off · +5% Glow`:'';
  $('#shopTabs').innerHTML=TABS.filter(([k])=>k!=='buddy'||L.cos.BUDDIES_ON).map(([k,i,l,x])=>`<button data-t="${k}" class="${tab===k?'on':''}${k==='premium'?' t-prem':''}"><span>${i}</span>${l}${x?`<em>${x}</em>`:''}</button>`).join('');
  box.className='shop-page shop-'+tab;
  box.innerHTML=tab==='home'?home():tab==='premium'?premiumPage():tab==='bundles'?`<p class="sub" style="margin:0 0 16px">Whole looks for less. Bundles give you every piece at once, cheaper than buying them one by one.</p><div class="bundle-row">${BUN().map(b=>bundleCard(b,true)).join('')}</div>`
    :tab==='creator'?creatorPage():tab==='owned'?ownedPage()
    :tab==='buddy'?`<div class="banner beta-note">🧪 <b>Buddies are in beta.</b> 3D characters that live on your profile bar and card. Buying one needs Lumen Lite (or Pro / Ultimate). They may change while we work on them.</div>`+grid(catalog('buddy'))
    :grid(catalog(tab));
  bind(box);if(openId)openItem(openId,true)}
function bind(root){
  root.querySelectorAll('[data-buy]').forEach(b=>b.onclick=e=>{e.stopPropagation();buy(b.dataset.buy)});
  root.querySelectorAll('[data-equip]').forEach(b=>b.onclick=e=>{e.stopPropagation();equip(b.dataset.equip,true)});
  root.querySelectorAll('[data-ownequip]').forEach(b=>b.onclick=e=>{e.stopPropagation();equipOwn(b.dataset.ownequip)});
  root.querySelectorAll('[data-unequip]').forEach(b=>b.onclick=e=>{e.stopPropagation();equip(b.dataset.unequip,false)});
  root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>openItem(b.dataset.view));
  root.querySelectorAll('[data-gotab]').forEach(b=>b.onclick=()=>go(b.dataset.gotab));
  root.querySelectorAll('[data-buybundle]').forEach(b=>b.onclick=()=>buyBundle(b.dataset.buybundle));
  root.querySelectorAll('[data-wearbundle]').forEach(b=>b.onclick=()=>wearBundle(b.dataset.wearbundle));
  root.querySelectorAll('[data-scroll]').forEach(b=>b.onclick=()=>{$('#'+b.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'center'});$('#'+b.dataset.scroll+' input')?.focus({preventScroll:true})});
  root.querySelectorAll('form[data-redeem]').forEach(f=>f.onsubmit=e=>{e.preventDefault();redeem(f.querySelector('input'),f.querySelector('button'))})}
function go(t){closeItem();tab=t;render();$('#shopTabs')?.scrollIntoView({behavior:'smooth',block:'start'})}

/* ---------- the listing: click any item to see it big, on your own profile ---------- */
function openItem(id,refresh){const it=getItem(id);if(!it)return;const vs=VIEWS[it.type]||[['card','Profile card']];if(!refresh||openId!==id)view=vs[0][0];openId=id;const s=state(it);
  const bs=bundlesWith(id);const by=it.uid?` · by ${esc(cnames[it.uid]||'a creator')}`:'';
  $('#itemCard').innerHTML=`<button class="il-x" data-close aria-label="Close">✕</button><div class="il">
    <div class="il-stage il-${it.type}${s.prem?' prem-'+s.prem:''}">${vs.length>1?`<div class="il-views">${vs.map(([k,l])=>`<button data-iv="${k}" class="${view===k?'on':''}">${l}</button>`).join('')}</div>`:''}
      <div class="il-show il-v-${view}">${preview(it,{size:'big',as:view})}</div><span class="il-hint">Previewing on <b>your</b> profile</span></div>
    <div class="il-info"><span class="il-type">${TYPE_LABEL[it.type]||'Item'}${by}</span><h2>${esc(it.name)}</h2>
      <div class="il-tags">${it.tag==='new'?'<span class="tag t-new">NEW</span>':''}${s.prem?`<span class="tag t-prem">💎 ${TIER_NAME[s.prem]} only</span>`:''}${it.type==='buddy'?'<span class="tag t-beta">BETA · Lite to buy</span>':''}${s.eq?'<span class="tag">Equipped</span>':s.own?'<span class="tag">Owned</span>':''}</div>
      <p>${esc(it.desc||'')}</p>
      <div class="il-buy">${s.prem?`<div class="il-price"><b>Included with ${TIER_NAME[s.prem]}</b><span>Free to wear while your plan is active</span></div>`
        :s.own?'<div class="il-price"><b>You own this</b></div>':`<div class="il-price"><b>✦ ${fmt(s.cost)}</b>${s.cost<s.full?`<s>✦ ${fmt(s.full)}</s><span class="ptag ptag-lite">LITE −10%</span>`:prof&&!P().lite()&&it.price%10===0?`<span class="muted">✦ ${fmt(it.price*9/10)} with Lite</span>`:''}<span class="muted">You have ✦ ${fmt(coins())}</span></div>`}
        ${buttonHTML(it,s,true)}</div>
      ${bs.map(b=>`<button class="il-bundle" data-gotab="bundles"><span>${b.emoji}</span><span><b>Part of ${esc(b.name)}</b><small>${b.items.length} items for ✦ ${fmt(P().price(b.price))}, save ${Math.round((1-b.price/sumOf(b))*100)}%</small></span><span>→</span></button>`).join('')}
    </div></div>`;
  const m=$('#itemModal');m.classList.add('on');bind($('#itemCard'));
  $('#itemCard').querySelectorAll('[data-iv]').forEach(b=>b.onclick=()=>{view=b.dataset.iv;openItem(id,true)})}
function closeItem(){openId=null;$('#itemModal')?.classList.remove('on')}
new MutationObserver(()=>{if(!$('#itemModal').classList.contains('on'))openId=null}).observe($('#itemModal'),{attributes:true,attributeFilter:['class']});
addEventListener('keydown',e=>{if(e.key==='Escape'&&openId)closeItem()});

/* ---------- creator-made items ---------- */
async function equipOwn(id){if(!prof)return;const it=getItem(id)||{id,type:(await L.cloud.F.getDoc(L.cloud.D('shopItems',id))).data()?.type,name:'Your item'};
  if(prof[SLOT[it.type]]===id)return equip(id,false);
  try{if(!owned().includes(id))await upd({owned:[...owned(),id],lastBuy:id});await upd({[SLOT[it.type]]:id});toast(`${it.name||'Item'} equipped`)}catch(e){toast('Couldn’t equip: '+(e.code==='permission-denied'?'it has to be approved first':e.message))}}
L.equipOwn=equipOwn;
function listenCreator(){cunsub?.();cunsub=null;citems=[];if(!prof||!L.cloud)return;const {F,db}=L.cloud;
  cunsub=F.onSnapshot(F.query(F.collection(db,'shopItems'),F.where('status','==','approved')),s=>{citems=s.docs.map(d=>({id:d.id,...d.data()}));render()},()=>{})}
L.shopItem=getItem;

/* ---------- buying ---------- */
async function upd(data){const {F,D,me}=L.cloud;await F.updateDoc(D('users',me().uid),data)}
async function claim(){if(busy||!prof)return;busy=true;const bonus=P().bonus(prof.lastClaim?150:500);
  try{await upd({coins:coins()+bonus,lastClaim:L.cloud.F.serverTimestamp()});toast(`+${bonus} ✦ Glow${P().lite()?' (Lite +5%)':''}`)}catch(e){toast('Couldn’t claim: '+(e.code==='permission-denied'?'not ready yet':e.message))}busy=false}
async function buy(id){const it=getItem(id);if(busy||!prof||!it)return;const cost=P().price(it.price);if(coins()<cost)return toast('Not enough Glow');
  if(it.type==='buddy'&&!P().lite())return go('premium');
  if(!confirm(`Buy ${it.name} for ✦ ${fmt(cost)}${cost<it.price?' (Lite 10% off)':''}?`))return;busy=true;
  if(L.cos.CID.test(id)){const {F,D,db,me}=L.cloud;const b=F.writeBatch(db);b.update(D('users',me().uid),{coins:coins()-cost,owned:[...owned(),id],lastBuy:id});b.update(D('shopItems',id),{sales:F.increment(1),earned:F.increment(it.cut),lastBuyer:me().uid});
    try{await b.commit();toast(`${it.name} unlocked!`);await equip(id,true,true)}catch(e){toast('Purchase failed: '+(e.code==='permission-denied'?'this item isn’t for sale right now':e.message))}busy=false;return}
  try{await upd({coins:coins()-cost,owned:[...owned(),id],lastBuy:id});toast(`${it.name} unlocked!`);await equip(id,true,true)}catch(e){toast('Purchase failed: '+(e.code==='permission-denied'?'re-publish the latest rules, or check your plan':e.message))}busy=false}
async function buyBundle(bid){const b=BUN().find(x=>x.id===bid);if(!b||busy||!prof)return;const cost=P().price(b.price);if(coins()<cost)return toast('Not enough Glow');
  if(!confirm(`Buy the ${b.name} bundle (${b.items.length} items) for ✦ ${fmt(cost)}?`))return;busy=true;
  try{await upd({coins:coins()-cost,owned:[...new Set([...owned(),...b.items])],lastBuy:bid});toast(`${b.emoji} ${b.name} unlocked!`);await wearBundle(bid,true)}catch(e){toast('Purchase failed: '+(e.code==='permission-denied'?'re-publish the latest rules':e.message))}busy=false}
async function wearBundle(bid,quiet){const b=BUN().find(x=>x.id===bid);if(!b)return;const d={};for(const i of b.items){const it=L.cos.byId[i];if(it&&!d[SLOT[it.type]])d[SLOT[it.type]]=i}
  try{await upd(d);if(d.theme){L.cfg.theme=d.theme;L.save();L.cos.applyTheme(d.theme)}toast(quiet?'Wearing the whole look ✨':`${b.name} look on`)}catch(e){toast('Couldn’t equip: '+e.message)}}
async function equip(id,on,quiet){const it=getItem(id);if(!it)return;const slot=SLOT[it.type];
  try{await upd({[slot]:on?id:''});if(it.type==='theme'){L.cfg.theme=on?id:'';L.save();L.cos.applyTheme(L.cfg.theme)}if(!quiet)toast(on?`${it.name} equipped`:`${it.name} removed`)}catch(e){toast('Couldn’t equip: '+(e.code==='permission-denied'&&it.tier?`that needs Lumen ${TIER_NAME[it.tier]}`:e.message))}}

/* ---------- codes: Glow codes and premium codes in one box ---------- */
const tsMs=v=>v?.toMillis?.()||(v instanceof Date?+v:0);
async function redeem(input,btn){if(!prof)return toast('Sign in first');const code=input.value.trim().toUpperCase().replace(/\s+/g,'');if(!code)return;
  const {F,D,db,me}=L.cloud;btn.disabled=true;const done=()=>{btn.disabled=false};
  try{const ps=await F.getDoc(D('pcodes',code)).catch(()=>null);
    if(ps?.exists()){const c=ps.data();if((c.uses||0)>=c.maxUses){toast('That code has been used up');return done()}
      const used=await F.getDoc(D('pcodes',code,'used',me().uid)).catch(()=>null);if(used?.exists()){toast('You’ve already redeemed this code');return done()}
      const now=Date.now(),sub=P().sub?.()||{},nx={};for(const[k,days]of Object.entries(c.grants||{}))nx[k]=new Date(Math.max(tsMs(sub[k]),now)+days*864e5);
      const all={...sub,...nx},live=k=>tsMs(all[k])>now,top=live('ultimate')?'ultimate':live('pro')?'pro':live('lite')?'lite':'';
      const b=F.writeBatch(db);b.set(D('pcodes',code,'used',me().uid),{at:F.serverTimestamp()});b.update(D('pcodes',code),{uses:F.increment(1)});b.set(D('subs',me().uid),{...nx,lastCode:code},{merge:true});
      b.update(D('users',me().uid),{lastPCode:code,...(c.glow?{coins:coins()+c.glow}:{}),tier:top,tierUntil:top?all[top]:0,up:live('upgrade'),upUntil:live('upgrade')?all.upgrade:0});
      await b.commit();input.value='';celebrate(c);return done()}
    const snap=await F.getDoc(D('codes',code));if(!snap.exists()){toast('That code doesn’t exist');return done()}const c=snap.data();
    if((c.uses||0)>=c.maxUses){toast('That code has been used up');return done()}
    const usedSnap=await F.getDoc(D('codes',code,'used',me().uid)).catch(()=>null);if(usedSnap?.exists()){toast('You’ve already redeemed this code');return done()}
    const b=F.writeBatch(db);b.set(D('codes',code,'used',me().uid),{at:F.serverTimestamp()});b.update(D('codes',code),{uses:F.increment(1)});b.update(D('users',me().uid),{coins:coins()+c.amount,lastCode:code});
    await b.commit();input.value='';toast(`+${fmt(c.amount)} ✦ Glow!`)}
  catch(err){toast(err.code==='permission-denied'?'That code can’t be redeemed (used up, already used by you, or your clock is off)':'Couldn’t redeem: '+err.message)}done()}
function celebrate(c){const g=c.grants||{},k=g.ultimate?'ultimate':g.pro?'pro':g.lite?'lite':g.upgrade?'upgrade':'ultAdmin';
  const name=k==='ultAdmin'?'your Ultimate control panel':'Lumen '+TIER_NAME[k];
  const el=document.createElement('div');el.className='prem-celebrate';el.innerHTML=`${L.cos.fxLayer(k==='ultimate'?'fx_nebula':k==='pro'?'fx_circuit':k==='upgrade'?'fx_prism':'fx_golddust')}<div class="pc-box"><span class="ptag ptag-${k==='upgrade'?'up':k==='ultAdmin'?'ultimate':k}">${k==='upgrade'?'UPGRADE':k==='ultAdmin'?'ULTIMATE':k.toUpperCase()}</span><h2>Welcome to ${name}</h2><p>${c.glow?`✦ ${fmt(c.glow)} Glow added. `:''}Your perks are on. Head to your profile to try the new options${k==='ultAdmin'?'':', or wear your members-only effects'}.</p><button class="btn-gold big">Let's go</button></div>`;
  document.body.appendChild(el);el.querySelector('button').onclick=()=>{el.remove();go('premium')};el.onclick=e=>{if(e.target===el)el.remove()}}

$('#shopTabs').onclick=e=>{const b=e.target.closest('[data-t]');if(b){closeItem();tab=b.dataset.t;render()}};
$('#claimBtn').onclick=claim;
$('#codeForm').onsubmit=e=>{e.preventDefault();redeem($('#codeIn'),$('#codeForm button'))};
L.shopGo=t=>{L.go?.('shop');go(t)};
const prevP=L.onProfile;L.onProfile=p=>{prevP?.(p);const was=prof?.uid;prof=p;if((p?.uid||null)!==(was||null))listenCreator();if($('#v-shop').classList.contains('on'))render()};
const prevPl=L.onPlan;L.onPlan=p=>{prevPl?.(p);if($('#v-shop').classList.contains('on'))render()};
const prevV=L.onView;L.onView=v=>{prevV?.(v);if(v==='shop')render();else closeItem()};
if(L.cloud){prof=L.cloud.profile();if(prof)listenCreator()}
setInterval(()=>{if($('#v-shop').classList.contains('on')&&!openId)render()},60000);
render();
