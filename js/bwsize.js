/* Web tab size: Normal (with an adjustable width/height), Stretch (fills the whole window)
   and Minimize (a small floating window that stays on screen while you use the rest of Lumen).
   Only CSS changes: the browser's pages never reload when you switch. */
(()=>{
const L=window.Lumen,{cfg,save,toast}=L;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const bw=$('#bw'),view=$('#v-web');if(!bw)return;
const MODES=['normal','stretch','mini'];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

/* ---------- extra UI ---------- */
$('#bwFull').insertAdjacentHTML('beforebegin','<button class="ib" id="bwSize" title="Browser size: normal, stretch, minimize">⤢</button>');
bw.insertAdjacentHTML('afterbegin',`<div class="bw-minibar" id="bwMini"><span class="bw-mini-t" id="bwMiniT">🌐 Web</span><button class="ib" data-bm="stretch" title="Stretch">⤢</button><button class="ib" id="bwMiniOpen" title="Open in the Web tab">▭</button><button class="ib" id="bwMiniX" title="Close the mini window">✕</button></div>`);
bw.insertAdjacentHTML('beforeend',`<div class="bw-grip" id="bwGrip" title="Drag to resize"></div>
  <div class="bw-sizemenu" id="bwSizeMenu" hidden><b>Browser size</b>
    <div class="seg"><button type="button" data-bm="normal">▭ Normal</button><button type="button" data-bm="stretch">⤢ Stretch</button><button type="button" data-bm="mini">▁ Minimize</button></div>
    <label>Width <span id="bwWv"></span></label><input type="range" id="bwWr" min="35" max="100">
    <label>Height <span id="bwHv"></span></label><input type="range" id="bwHr" min="35" max="100">
    <div class="row" style="justify-content:space-between;margin-top:10px"><button type="button" id="bwSizeReset">Reset</button><button type="button" class="btn-acc" id="bwSizeDone">Done</button></div>
    <p class="muted">Drag the bottom-right corner to resize. Minimized, the browser floats over the rest of Lumen: drag it by its top bar, and it keeps playing while you chat or play.</p></div>`);
const menu=$('#bwSizeMenu');

/* ---------- apply ---------- */
function apply(){const m=MODES.includes(cfg.bwMode)?cfg.bwMode:'normal';document.body.classList.remove('bw-normal','bw-stretch','bw-mini');document.body.classList.add('bw-'+m);
  const w=clamp(+cfg.bwW||100,35,100),h=clamp(+cfg.bwH||100,35,100);bw.style.setProperty('--bww',w+'%');bw.style.setProperty('--bwh',h+'%');document.body.classList.toggle('bw-custom',w<100||h<100);
  const mw=clamp(+cfg.miniW||420,260,innerWidth-16),mh=clamp(+cfg.miniH||270,170,innerHeight-16);
  const mx=clamp(cfg.miniX??innerWidth-mw-20,8,innerWidth-mw-8),my=clamp(cfg.miniY??innerHeight-mh-20,8,innerHeight-mh-8);
  Object.entries({'--mw':mw+'px','--mh':mh+'px','--mx':mx+'px','--my':my+'px'}).forEach(([k,v])=>bw.style.setProperty(k,v));
  $$('#bwSizeMenu [data-bm]').forEach(b=>b.classList.toggle('on',b.dataset.bm===m));
  $('#bwWr').value=w;$('#bwHr').value=h;$('#bwWv').textContent=w+'%';$('#bwHv').textContent=h+'%';
  $('#bwSize').textContent=m==='stretch'?'⤡':'⤢';miniTitle()}
function setMode(m,{silent}={}){if(!MODES.includes(m))return;const was=cfg.bwMode;cfg.bwMode=m;save();apply();menu.hidden=true;
  if(m==='mini'&&view.classList.contains('on'))L.go(L.cfg.lastNonWeb&&L.cfg.lastNonWeb!=='web'?L.cfg.lastNonWeb:'hub');
  if(m!=='mini'&&!view.classList.contains('on'))L.go('web');
  if(!silent&&was!==m)toast(m==='mini'?'Browser minimized: it floats over Lumen. Drag its top bar to move it.':m==='stretch'?'Stretched: press ⤡ (or Esc) to go back':'Browser back to normal')}
function miniTitle(){const t=$('#bwTabs .bw-tab.on .t')?.textContent;$('#bwMiniT').textContent='🌐 '+(t||'Web')}
new MutationObserver(miniTitle).observe($('#bwTabs'),{childList:true,subtree:true,characterData:true});

/* ---------- controls ---------- */
$('#bwSize').onclick=e=>{e.stopPropagation();if(cfg.bwMode==='stretch')return setMode('normal');menu.hidden=!menu.hidden};
bw.addEventListener('click',e=>{const b=e.target.closest('[data-bm]');if(b)setMode(b.dataset.bm)});
document.addEventListener('click',e=>{if(!menu.hidden&&!e.target.closest('#bwSizeMenu,#bwSize'))menu.hidden=true});
$('#bwSizeDone').onclick=()=>menu.hidden=true;
$('#bwSizeReset').onclick=()=>{cfg.bwW=100;cfg.bwH=100;delete cfg.miniW;delete cfg.miniH;delete cfg.miniX;delete cfg.miniY;save();apply()};
$('#bwWr').oninput=e=>{cfg.bwW=+e.target.value;if(cfg.bwMode!=='normal')cfg.bwMode='normal';apply()};
$('#bwHr').oninput=e=>{cfg.bwH=+e.target.value;if(cfg.bwMode!=='normal')cfg.bwMode='normal';apply()};
['#bwWr','#bwHr'].forEach(s=>$(s).onchange=()=>save());
$('#bwMiniOpen').onclick=()=>setMode('normal');
$('#bwMiniX').onclick=()=>{cfg.bwMode='normal';save();apply();toast('Mini browser closed. Your tabs are still in the Web tab.')};
addEventListener('keydown',e=>{if(e.key==='Escape'&&cfg.bwMode==='stretch'&&!document.querySelector('.modal.on')){setMode('normal')}});
addEventListener('resize',apply);

/* ---------- drag to resize / move (pointer capture keeps working over the page inside) ---------- */
function drag(el,onMove,done){el.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button,input'))return;e.preventDefault();el.setPointerCapture(e.pointerId);document.body.classList.add('bw-dragging');
  const r=bw.getBoundingClientRect(),vr=view.getBoundingClientRect(),start={x:e.clientX,y:e.clientY,r,vr};
  const mv=ev=>onMove(ev.clientX-start.x,ev.clientY-start.y,start);
  const up=()=>{el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);document.body.classList.remove('bw-dragging');save();done?.()};
  el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)})}
drag($('#bwGrip'),(dx,dy,s)=>{if(cfg.bwMode==='mini'){cfg.miniW=Math.round(s.r.width+dx);cfg.miniH=Math.round(s.r.height+dy);cfg.miniX=s.r.left;cfg.miniY=s.r.top}
  else if(cfg.bwMode==='normal'){const cs=getComputedStyle(view),iw=s.vr.width-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),ih=s.vr.height-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
    // the browser is centred, so dragging the corner grows it on both sides
    cfg.bwW=Math.round(clamp((s.r.width+dx*2)/iw*100,35,100));cfg.bwH=Math.round(clamp((s.r.height+dy*2)/ih*100,35,100))}apply()});
drag($('#bwMini'),(dx,dy,s)=>{cfg.miniX=Math.round(s.r.left+dx);cfg.miniY=Math.round(s.r.top+dy);apply()});

/* opening the Web tab brings a minimized browser back; remember where you were for "minimize" */
const prev=L.onView;L.onView=v=>{prev?.(v);if(v==='web'&&cfg.bwMode==='mini')setMode('normal',{silent:true});if(v!=='web'){cfg.lastNonWeb=v}if(v!=='web'&&cfg.bwMode==='stretch'){cfg.bwMode='normal';save();apply()}};
apply();
})();
