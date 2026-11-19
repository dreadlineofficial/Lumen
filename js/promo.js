/* Fixing Good campaign: a handful of tasteful spots around Lumen.
   - never shown to people who already own it, and each spot appears at most once on a page
   - every spot can be closed with ✕ and stays hidden for 3 days on this device
   - the owner switches the whole campaign off in Admin → Hub ("Fixing Good ads around Lumen")
   Spots: Hub banner, Game hub strip, one "Sponsored" card in the Content feed, a card on other games' pages,
   the first Store banner slide, a Store spotlight band and a "Sponsored" result in the Store (market.js). */
const L=window.Lumen,{esc}=L;
const KEY='lumen.fgads',DAYS=3;
const shut=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
const closed=slot=>{const t=shut()[slot];return!!t&&Date.now()-t<DAYS*864e5};
function hide(slot,el){const s=shut();s[slot]=Date.now();try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}el?.remove();L.toast?.('Hidden for a few days')}
// Fixing Good as it is right now (the owner can rename it, change its price, pictures and description)
function item(){const h=L.hub;if(!h?.data)return null;const d=h.data();if(d.hubCfg.fgPromo===false)return null;return h.findItem(h.fgKey())||null}
// only advertise to people who don't have it yet
function live(slot){const it=item();if(!it||L.hub.inLib(it)||(slot&&closed(slot)))return null;return it}
const price=it=>it.price>0?'✦ '+(L.plan?.price?.(it.price)??it.price).toLocaleString():'Free';
const tag=it=>{const l=(it.desc||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);return l[1]||l[0]||'A desert crime story. Fix what’s broken, at any cost.'};
const kick=it=>(it.desc||'').split(/\n+/)[0]?.trim()||'Desert crime action · story mode';
const go=it=>L.market?L.market.open(it.key):L.hub.openGame(it.key);
function bind(el,it,slot){el.querySelectorAll('[data-fgopen]').forEach(b=>b.onclick=e=>{e.preventDefault();go(it)});el.querySelector('[data-fgx]')?.addEventListener('click',e=>{e.stopPropagation();hide(slot,el)})}
const x=`<button class="fg-x" data-fgx title="Hide this for a few days" aria-label="Hide">✕</button>`;

// Hub: one banner under the header
function hub(box){if(!box||box.querySelector('.fg-ad'))return;const it=live('hub');if(!it)return;
  const el=document.createElement('div');el.className='fg-ad';
  el.innerHTML=`<div class="fg-art" style="${L.hub.art(it)}"></div><div class="fg-in"><span class="fg-kick">Lumen presents</span><h2>${esc(it.title)}</h2><p>${esc(tag(it))}</p>
    <div class="fg-row"><button class="btn-acc" data-fgopen>See it in the Store</button><span class="fg-price">${price(it)}</span><span class="fg-note">${esc(kick(it))}</span></div></div>${x}`;
  const after=box.querySelector('#hubDaily')||box.querySelector('.hannounce')||box.querySelector('.hhero');after?after.after(el):box.prepend(el);bind(el,it,'hub')}
// Game hub: a slim strip above your library
function lib(box){if(!box||box.querySelector('.fg-strip'))return;const it=live('lib');if(!it)return;
  const el=document.createElement('div');el.className='fg-strip';
  el.innerHTML=`<div class="fg-thumb" style="${L.hub.art(it)}"></div><div class="fg-in"><b>${esc(it.title)}</b><span>${esc(kick(it))}</span></div><button class="btn-acc" data-fgopen>${price(it)} · View</button>${x}`;
  const bar=box.querySelector('.gh-bar');bar?bar.after(el):box.prepend(el);bind(el,it,'lib')}
// Content: one "Sponsored" card after the fifth post (only in the full feed)
function feed(box,filter){if(!box||filter!=='all'||box.querySelector('.fg-feed'))return;const it=live('feed');if(!it)return;const posts=box.querySelectorAll('.post');if(posts.length<5)return;
  const el=document.createElement('div');el.className='card post fg-feed';
  el.innerHTML=`<div class="fg-spons">📣 Sponsored · Lumen</div><button class="fg-feed-art" data-fgopen style="${L.hub.art(it)}" aria-label="${esc(it.title)}"></button>
    <div class="fg-feed-in"><div><b>${esc(it.title)}</b><span>${esc(tag(it))}</span></div><button class="btn-acc" data-fgopen>${price(it)} · View</button></div>${x}`;
  posts[4].after(el);bind(el,it,'feed')}
// other games' pages: a small "you might like" card in the side column
function side(col,key){if(!col||col.querySelector('.fg-side'))return;const it=live();if(!it||it.key===key)return;
  const el=document.createElement('div');el.className='card fg-side';
  el.innerHTML=`<span class="fg-spons">📣 You might like</span><button class="fg-side-art" data-fgopen style="${L.hub.art(it)}" aria-label="${esc(it.title)}"></button><b>${esc(it.title)}</b><p class="muted">${esc(kick(it))}</p><button class="btn-acc" data-fgopen>${price(it)} · See it</button>`;
  col.prepend(el);bind(el,it,'side')}
// Store: a wide spotlight band (market.js puts it on the home page; links use the Store's own data-open)
function band(){const it=live('band');if(!it)return'';
  return`<section class="fg-band mk-surface" data-slot="band"><div class="fg-band-art" style="${L.hub.art(it)}"></div><div class="fg-band-in"><span class="mk-kick">Spotlight</span><h2>${esc(it.title)}</h2><p>${esc(tag(it))}</p>
    <div class="mk-btns"><button class="mk-btn mk-cta" data-open="${esc(it.key)}">Shop now · ${price(it)}</button><button class="mk-btn" data-cart="${esc(it.key)}">🛒 Add to cart</button></div></div><button class="fg-x dark" data-fgband title="Hide this for a few days" aria-label="Hide">✕</button></section>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-fgband]');if(b){e.stopPropagation();hide('band',b.closest('.fg-band'))}},true);
L.promo={item,live,hub,lib,feed,side,band};
