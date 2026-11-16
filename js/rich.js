/* Rich text (bold, italic, underline, strike, code, spoilers), keyboard shortcuts, and the emoji picker. */
(()=>{
const L=window.Lumen,{esc}=L;
const $=s=>document.querySelector(s);

/* ---- formatting: **bold** *italic* __underline__ ~~strike~~ `code` ||spoiler|| ---- */
function fmtPlain(s){return esc(s)
  .replace(/`([^`\n]+)`/g,'<code>$1</code>')
  .replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>')
  .replace(/__([^_\n]+)__/g,'<u>$1</u>')
  .replace(/~~([^~\n]+)~~/g,'<s>$1</s>')
  .replace(/\|\|([^|\n]+)\|\|/g,'<span class="spoiler" tabindex="0">$1</span>')
  .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g,'$1<i>$2</i>')
  .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?]|$)/g,'$1<i>$2</i>')}
// links are cut out first so formatting never touches a URL
L.fmt=function(text){const s=String(text||'');const re=/https?:\/\/[^\s<]+/g;let out='',last=0,m;
  while((m=re.exec(s))){out+=fmtPlain(s.slice(last,m.index));const u=esc(m[0]);out+=`<a href="${u}" target="_blank" rel="noopener">${u}</a>`;last=m.index+m[0].length}
  return out+fmtPlain(s.slice(last))};
document.addEventListener('click',e=>{const sp=e.target.closest('.spoiler');if(sp)sp.classList.add('show')});

/* ---- wrap the selection in a text box ---- */
function wrap(el,mark){const a=el.selectionStart,b=el.selectionEnd,v=el.value;const sel=v.slice(a,b);
  if(sel.startsWith(mark)&&sel.endsWith(mark)&&sel.length>=mark.length*2){el.setRangeText(sel.slice(mark.length,-mark.length),a,b,'select')}
  else if(v.slice(a-mark.length,a)===mark&&v.slice(b,b+mark.length)===mark){el.setSelectionRange(a-mark.length,b+mark.length);el.setRangeText(sel,a-mark.length,b+mark.length,'select')}
  else{el.setRangeText(mark+sel+mark,a,b,'end');if(!sel)el.setSelectionRange(a+mark.length,a+mark.length);else el.setSelectionRange(a+mark.length,a+mark.length+sel.length)}
  el.focus();el.dispatchEvent(new Event('input',{bubbles:true}))}
L.wrapText=wrap;
const KEYS={b:'**',i:'*',u:'__',e:'`'};
document.addEventListener('keydown',e=>{const el=e.target;if(!el.matches?.('[data-rich]')||!(e.ctrlKey||e.metaKey))return;const k=e.key.toLowerCase();
  if(KEYS[k]&&!e.shiftKey){e.preventDefault();wrap(el,KEYS[k])}
  else if(e.shiftKey&&k==='x'){e.preventDefault();wrap(el,'~~')}
  else if(e.shiftKey&&k==='s'){e.preventDefault();wrap(el,'||')}},true);
// toolbar buttons: <button data-wrap="**" data-for="#id">
document.addEventListener('mousedown',e=>{const b=e.target.closest('[data-wrap]');if(!b)return;e.preventDefault();const el=$(b.dataset.for);if(el)wrap(el,b.dataset.wrap)});

/* ---- emoji picker ---- */
let data=null,target=null;const RKEY='hub.emoji.recent';
const pop=document.createElement('div');pop.className='emoji-pop card';pop.innerHTML=`<input class="ep-q" placeholder="Search emoji"><div class="ep-tabs"></div><div class="ep-grid"></div>`;document.body.appendChild(pop);
const ICONS=['🕘','😀','👋','🐻','🍔','✈️','⚽','💡','❤️','🏁'];
const recent=()=>{try{return JSON.parse(localStorage.getItem(RKEY)||'[]')}catch{return[]}};
async function load(){if(!data){const r=await fetch('js/emoji.json?v=1');data=await r.json()}return data}
function grid(list){pop.querySelector('.ep-grid').innerHTML=list.length?list.map(e=>`<button type="button" data-e="${e}">${e}</button>`).join(''):'<p class="muted" style="grid-column:1/-1">No emoji found</p>'}
function showGroup(g){pop.querySelectorAll('.ep-tabs button').forEach((b,i)=>b.classList.toggle('on',i===g+1));
  grid(g<0?recent():data.list.filter(e=>e[1]===g).map(e=>e[0]))}
pop.querySelector('.ep-q').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();if(!q){showGroup(recent().length?-1:0);return}
  grid(data.list.filter(x=>x[2].includes(q)).slice(0,160).map(x=>x[0]))});
pop.addEventListener('click',e=>{const b=e.target.closest('[data-e]');if(!b||!target)return;const em=b.dataset.e;
  const a=target.selectionStart??target.value.length;target.setRangeText(em,a,target.selectionEnd??a,'end');target.focus();target.dispatchEvent(new Event('input',{bubbles:true}));
  const r=[em,...recent().filter(x=>x!==em)].slice(0,32);try{localStorage.setItem(RKEY,JSON.stringify(r))}catch{}});
pop.querySelector('.ep-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-g]');if(b)showGroup(+b.dataset.g)});
L.emojiPicker=async function(btn,input){if(pop.classList.contains('on')&&target===input){pop.classList.remove('on');return}
  target=input;await load();pop.querySelector('.ep-tabs').innerHTML=ICONS.map((ic,i)=>`<button type="button" data-g="${i-1}" title="${i?data.groups[i-1]:'Recent'}">${ic}</button>`).join('');
  pop.querySelector('.ep-q').value='';showGroup(recent().length?-1:0);
  const r=btn.getBoundingClientRect();pop.classList.add('on');const h=pop.offsetHeight,w=pop.offsetWidth;
  pop.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left))+'px';pop.style.top=(r.top-h-8>8?r.top-h-8:Math.min(innerHeight-h-8,r.bottom+8))+'px';
  setTimeout(()=>pop.querySelector('.ep-q').focus(),20)};
document.addEventListener('mousedown',e=>{if(pop.classList.contains('on')&&!pop.contains(e.target)&&!e.target.closest('[data-emoji]'))pop.classList.remove('on')});
document.addEventListener('keydown',e=>{if(e.key==='Escape')pop.classList.remove('on')});
document.addEventListener('click',e=>{const b=e.target.closest('[data-emoji]');if(b){e.preventDefault();L.emojiPicker(b,document.querySelector(b.dataset.emoji))}});
})();
