/* Lumen cosmetics: catalog + renderers for profile effects, avatar decorations, nameplates, name effects and themes.
   Prices here must match the PRICES map in firestore.rules. */
(()=>{
const CATALOG=[
 // profile effects: animated layer over the whole profile card
 {id:'fx_aurora',type:'fx',name:'Aurora',price:400,desc:'Northern lights drift across your card'},
 {id:'fx_snow',type:'fx',name:'Snowfall',price:300,desc:'Soft snow, gently swaying'},
 {id:'fx_sakura',type:'fx',name:'Sakura',price:350,desc:'Cherry blossom petals tumbling down'},
 {id:'fx_fireflies',type:'fx',name:'Fireflies',price:350,desc:'Glowing fireflies wander and blink'},
 {id:'fx_stars',type:'fx',name:'Starfield',price:300,desc:'A sky full of twinkling stars'},
 {id:'fx_matrix',type:'fx',name:'Digital Rain',price:450,desc:'Falling streams of glowing code'},
 {id:'fx_embers',type:'fx',name:'Embers',price:400,desc:'Sparks rising from a fire'},
 {id:'fx_bubbles',type:'fx',name:'Bubbles',price:250,desc:'Shimmering bubbles float up'},
 {id:'fx_confetti',type:'fx',name:'Confetti',price:300,desc:'A constant little celebration'},
 {id:'fx_rain',type:'fx',name:'Midnight Rain',price:250,desc:'Cool rain streaking past'},
 {id:'fx_hearts',type:'fx',name:'Lovestruck',price:300,desc:'Hearts float up and fade'},
 {id:'fx_storm',type:'fx',name:'Thunderstorm',price:500,desc:'Lightning flashes in the dark'},
 {id:'fx_meteor',type:'fx',name:'Meteor Shower',price:450,desc:'Shooting stars streak across the sky'},
 {id:'fx_leaves',type:'fx',name:'Autumn',price:300,desc:'Orange leaves spin on the breeze'},
 {id:'fx_pixel',type:'fx',name:'8-Bit',price:350,desc:'Chunky pixels drift up like an old game'},
 {id:'fx_glitter',type:'fx',name:'Gold Glitter',price:400,desc:'Fine gold sparkles everywhere'},
 {id:'fx_lanterns',type:'fx',name:'Lanterns',price:450,desc:'Warm paper lanterns float into the night'},
 {id:'fx_grid',type:'fx',name:'Neon Grid',price:400,desc:'A retro horizon that scrolls forever'},
 {id:'fx_fog',type:'fx',name:'Haunted Fog',price:300,desc:'Thick mist rolls slowly past'},
 {id:'fx_blood',type:'fx',name:'Bleeding',price:500,desc:'Blood seeps down from the top and drips off'},
 {id:'fx_bloodrain',type:'fx',name:'Blood Rain',price:450,desc:'A red downpour that splashes at the bottom'},
 {id:'fx_eyes',type:'fx',name:'They\'re Watching',price:450,desc:'Red eyes blink open in the dark'},
 {id:'fx_static',type:'fx',name:'Cursed Signal',price:400,desc:'Broken TV static, scanlines and a face in the noise'},
 {id:'fx_hands',type:'fx',name:'Handprints',price:450,desc:'Bloody handprints slap onto the glass'},
 {id:'fx_claws',type:'fx',name:'Claw Marks',price:400,desc:'Something rakes its claws across your card'},
 {id:'fx_flicker',type:'fx',name:'Dying Light',price:350,desc:'The light flickers and something stands in the dark'},
 {id:'fx_galaxy',type:'fx',name:'Galaxy Swirl',price:500,desc:'A spiral galaxy turns behind you'},
 // 3D buddies: little characters that live on your profile bar and card
 {id:'buddy_ted',type:'buddy',name:'Ted',price:500,desc:'Walks around, pulls up a chair to scroll his phone, sips a soda'},
 {id:'buddy_blob',type:'buddy',name:'Blob',price:300,desc:'A squishy slime that bounces everywhere'},
 {id:'buddy_bot',type:'buddy',name:'Bit',price:400,desc:'A tiny robot that rolls, scans and beeps'},
 {id:'buddy_pip',type:'buddy',name:'Pip',price:300,desc:'A chick that waddles, pecks and flaps'},
 {id:'buddy_boo',type:'buddy',name:'Boo',price:350,desc:'A friendly ghost that floats and vanishes'},
 {id:'buddy_mochi',type:'buddy',name:'Mochi',price:400,desc:'A cat that trots, stretches and naps'},
 // avatar decorations: frame around your picture everywhere
 {id:'fx_bokeh',type:'fx',name:'Bokeh',price:350,desc:'Soft out-of-focus lights drifting',tag:'new'},
 {id:'fx_butterflies',type:'fx',name:'Butterflies',price:400,desc:'Butterflies fluttering past',tag:'new'},
 {id:'fx_sunrays',type:'fx',name:'Sunbeams',price:350,desc:'Warm light rays slowly turning',tag:'new'},
 {id:'fx_ripples',type:'fx',name:'Ripples',price:300,desc:'Rings spreading on still water',tag:'new'},
 {id:'fx_sparks',type:'fx',name:'Electric',price:400,desc:'Crackling electric sparks',tag:'new'},
 // premium-only: worn for free while the plan is active (they must match liteItems/upItems/proItems/ultItems in firestore.rules)
 {id:'nfx_gold',type:'nfx',name:'Liquid Gold',price:0,tier:'lite',desc:'Molten gold with a moving shine. Lite only'},
 {id:'fx_golddust',type:'fx',name:'Gold Dust',price:0,tier:'lite',desc:'Glittering gold dust and a soft gold sheen'},
 {id:'deco_laurel',type:'deco',name:'Gold Ring',price:0,tier:'lite',desc:'A polished gold ring with a travelling glint'},
 {id:'fx_prism',type:'fx',name:'Prism',price:0,tier:'upgrade',desc:'Rainbow light beams sweeping across'},
 {id:'deco_prism',type:'deco',name:'Prism Ring',price:0,tier:'upgrade',desc:'A spinning ring of rainbow light'},
 {id:'plate_prism',type:'plate',name:'Prism',price:0,tier:'upgrade',desc:'Refracted rainbow light'},
 {id:'nfx_prism',type:'nfx',name:'Prism',price:0,tier:'upgrade',desc:'Rainbow foil with a white flash'},
 {id:'fx_circuit',type:'fx',name:'Circuit',price:0,tier:'pro',desc:'Glowing circuits with pulses of light'},
 {id:'deco_proorbit',type:'deco',name:'Pro Orbit',price:0,tier:'pro',desc:'Two electric rings in orbit'},
 {id:'plate_pro',type:'plate',name:'Pro Current',price:0,tier:'pro',desc:'Electric blue current'},
 {id:'nfx_pro',type:'nfx',name:'Voltage',price:0,tier:'pro',desc:'Electric blue with a live flicker'},
 {id:'fx_nebula',type:'fx',name:'Ultimate Nebula',price:0,tier:'ultimate',desc:'A violet and gold nebula with falling stars'},
 {id:'deco_crownhalo',type:'deco',name:'Ultimate Crown',price:0,tier:'ultimate',desc:'A floating crown over a gold halo'},
 {id:'plate_ult',type:'plate',name:'Ultimate',price:0,tier:'ultimate',desc:'Violet and molten gold'},
 {id:'nfx_ult',type:'nfx',name:'Ultimate',price:0,tier:'ultimate',desc:'Violet into molten gold, glowing'},
 {id:'deco_neon',type:'deco',name:'Neon Ring',price:250,desc:'A colour-shifting neon halo'},
 {id:'deco_halo',type:'deco',name:'Angel Halo',price:300,desc:'A golden halo that floats'},
 {id:'deco_flame',type:'deco',name:'On Fire',price:400,desc:'Flickering flames around you'},
 {id:'deco_crown',type:'deco',name:'Royalty',price:350,desc:'A crown, slightly tilted'},
 {id:'deco_orbit',type:'deco',name:'Heart Orbit',price:300,desc:'Hearts circle your picture'},
 {id:'deco_catears',type:'deco',name:'Cat Ears',price:250,desc:'Exactly what it sounds like'},
 {id:'deco_glitch',type:'deco',name:'Glitch',price:400,desc:'RGB split, slightly broken'},
 {id:'deco_sparkle',type:'deco',name:'Sparkle',price:300,desc:'Little stars twinkle around you'},
 // nameplates: animated background on your profile bar (lists, sidebar, member list)
 {id:'plate_ocean',type:'plate',name:'Deep Ocean',price:200,desc:'Slow blue waves'},
 {id:'plate_sunset',type:'plate',name:'Golden Hour',price:200,desc:'Warm sunset glow'},
 {id:'plate_galaxy',type:'plate',name:'Galaxy',price:350,desc:'Drifting stars and nebula'},
 {id:'plate_vapor',type:'plate',name:'Vaporwave',price:300,desc:'Pink and cyan retro grid'},
 {id:'plate_forest',type:'plate',name:'Forest',price:200,desc:'Calm green canopy'},
 {id:'plate_lava',type:'plate',name:'Lava',price:350,desc:'Molten, flowing heat'},
 {id:'plate_holo',type:'plate',name:'Holographic',price:450,desc:'Iridescent foil that shifts'},
 {id:'plate_sakura',type:'plate',name:'Blossom',price:250,desc:'Pink petals drifting by'},
 // name effects
 {id:'nfx_ice',type:'nfx',name:'Frostbite',price:300,desc:'Icy blue with a frozen glow',tag:'new'},
 {id:'nfx_toxic',type:'nfx',name:'Toxic',price:300,desc:'Radioactive green that pulses',tag:'new'},
 {id:'nfx_glitch',type:'nfx',name:'Glitch',price:400,desc:'RGB split that jitters',tag:'new'},
 {id:'nfx_wave',type:'nfx',name:'Ocean Wave',price:350,desc:'Deep blue water rolling through',tag:'new'},
 {id:'nfx_sparkle',type:'nfx',name:'Starlight',price:350,desc:'Silver shimmer with a twinkle',tag:'new'},
 {id:'nfx_shadow',type:'nfx',name:'Long Shadow',price:250,desc:'Bold with a deep purple shadow',tag:'new'},
 {id:'nfx_retro',type:'nfx',name:'Retro 84',price:350,desc:'Eighties chrome sunset',tag:'new'},
 {id:'nfx_candy',type:'nfx',name:'Candy',price:300,desc:'Sweet pink and blue stripes',tag:'new'},
 {id:'nfx_rainbow',type:'nfx',name:'Rainbow',price:300,desc:'Your name cycles every colour'},
 {id:'nfx_chrome',type:'nfx',name:'Chrome',price:350,desc:'Polished metal with a shine'},
 {id:'nfx_fire',type:'nfx',name:'Inferno',price:400,desc:'Burning gradient with heat glow'},
 {id:'nfx_neon',type:'nfx',name:'Neon Sign',price:300,desc:'Buzzing, glowing tube light'},
 // app themes
 {id:'theme_sakura',type:'theme',name:'Sakura',price:300,desc:'Soft pinks and plum night',sw:['#ff8fb8','#ffc6d9','#2a1020']},
 {id:'theme_ocean',type:'theme',name:'Abyss',price:300,desc:'Deep sea blues and teal',sw:['#2f9bff','#2fe0d0','#04121f']},
 {id:'theme_ember',type:'theme',name:'Ember',price:300,desc:'Charcoal with glowing orange',sw:['#ff7a2f','#ffc15e','#160b05']},
 {id:'theme_emerald',type:'theme',name:'Emerald',price:300,desc:'Rich greens and gold',sw:['#2fd67a','#d6c36b','#04140c']},
 {id:'theme_synthwave',type:'theme',name:'Synthwave',price:450,desc:'Neon magenta and cyan',sw:['#ff2bd6','#2be8ff','#12021f']},
 {id:'theme_mono',type:'theme',name:'Graphite',price:250,desc:'Clean greyscale, no distractions',sw:['#e6e6e6','#9a9a9a','#0b0b0c']},
 {id:'theme_aurora',type:'theme',name:'Aurora',price:400,desc:'Green and violet polar lights',sw:['#5cffb1','#a46bff','#050b14']},
];
const byId=Object.fromEntries(CATALOG.map(i=>[i.id,i]));
const R=(a,b)=>a+Math.random()*(b-a);
const css=o=>Object.entries(o).map(([k,v])=>`${k}:${v}`).join(';');

/* creator-made items (id "c_…"): a transparent GIF stored in shopImgs/{id}, loaded once and turned into a CSS rule */
const CID=/^c_[A-Za-z0-9]{8,24}$/;const custom=new Map();
const IMG=/^data:image\/(gif|png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/;
function ensure(id){if(!CID.test(id)||custom.has(id))return;custom.set(id,null);
  const go=()=>{const c=window.Lumen.cloud;if(!c?.F||!c.me?.()){setTimeout(()=>{custom.delete(id)},4000);return}
    c.F.getDoc(c.D('shopImgs',id)).then(async s=>{const d=s.data();if(!d)return;if(d.parts>0&&d.parts<=24)d.data=(await Promise.all([...Array(d.parts).keys()].map(i=>c.F.getDoc(c.D('shopImgs',id,'parts',String(i))).then(x=>x.data()?.d||'')))).join('');if(!IMG.test(d.data||''))return;addRule(id,d.data,d)}).catch(()=>custom.delete(id))};
  window.Lumen.cloud?go():setTimeout(go,1500)}
const num=(v,d,a,b)=>{v=Math.round(+v);return Number.isFinite(v)?Math.min(b,Math.max(a,v)):d};
/* placement: mode fill (cover, zoomable), tile (repeating pattern) or place (free size and position); x/y in %, scale in %, opacity in % */
function ruleCSS(id,data,o={}){const u=`url("${data}")`,m=['fill','tile','place'].includes(o.mode)?o.mode:'fill',x=num(o.x,50,0,100),y=num(o.y,50,0,100),op=num(o.op,100,10,100)/100;
  const s=num(o.scale,m==='tile'?33:100,10,400);
  const fx=m==='tile'?`background-repeat:repeat;background-size:${s}% auto;background-position:${x}% ${y}%`
    :m==='place'?`background-repeat:no-repeat;background-size:${s}% auto;background-position:${x}% ${y}%`
    :`background-repeat:no-repeat;background-size:cover;background-position:${x}% ${y}%;transform:scale(${Math.max(1,s/100)});transform-origin:${x}% ${y}%`;
  // decorations and nameplates keep the picture's own shape in every size (rows, chips, cards): a wide picture is sized by width, a tall one by height
  const ar=+o.ar||1,dsz=(m==='fill')===(ar>=1)?`auto ${s}%`:`${s}% auto`; // fill = covers the round frame, place/tile = whole picture visible
  const plate=m==='place'?`${u} ${x}% ${y}%/auto ${s}% no-repeat`:m==='tile'?`${u} ${x}% ${y}%/auto 100% repeat-x`:`${u} ${x}% ${y}%/cover no-repeat`;
  return`.cfx-${id}{background-image:${u};${fx};opacity:${op}}.cdeco-${id}{background-image:${u};background-size:${dsz};background-position:${x}% ${y}%;background-repeat:no-repeat;opacity:${op}}.cplate-${id}::before{background:${plate}!important;opacity:${(op*.85).toFixed(2)}}`}
const rules=new Map();
function addRule(id,data,o){o={...(o||{})};custom.set(id,{mode:o.mode});
  if(!o.ar){const im=new Image();im.onload=()=>{if(im.naturalWidth&&im.naturalHeight&&rules.get(id)?.dataset.src===String(data.length))addRule(id,data,{...o,ar:im.naturalWidth/im.naturalHeight})};im.src=data}let el=rules.get(id);if(!el){el=document.createElement('style');el.dataset.cos=id;document.head.appendChild(el);rules.set(id,el)}el.dataset.src=String(data.length);el.textContent=ruleCSS(id,data,o)}
/* live preview while a creator edits (replaces the rule each time) */
function previewRule(id,data,o){addRule(id,data,typeof o==='string'?{mode:o}:o)}

/* profile effect layer */
function fxLayer(id){if(CID.test(id||'')){ensure(id);return`<div class="fxl cfx cfx-${id}" aria-hidden="true"></div>`}if(!byId[id]||byId[id].type!=='fx')return'';const n=id.slice(3);let p='';
  const make=(count,fn)=>{for(let i=0;i<count;i++)p+=fn(i)};
  switch(n){
    case'snow':make(34,()=>`<i style="${css({left:R(0,100)+'%','--s':R(2.5,6)+'px','--d':R(7,14)+'s','--dl':-R(0,14)+'s','--x':R(-30,30)+'px',opacity:R(.5,.95)})}"></i>`);break;
    case'sakura':make(18,()=>`<i style="${css({left:R(0,100)+'%','--s':R(8,13)+'px','--d':R(8,15)+'s','--dl':-R(0,15)+'s','--x':R(-60,60)+'px','--r':R(360,900)+'deg'})}"></i>`);break;
    case'rain':make(42,()=>`<i style="${css({left:R(-10,110)+'%','--h':R(10,22)+'px','--d':R(.55,1.1)+'s','--dl':-R(0,1.1)+'s',opacity:R(.25,.6)})}"></i>`);break;
    case'stars':make(46,()=>`<i style="${css({left:R(0,100)+'%',top:R(0,100)+'%','--s':R(1,3)+'px','--d':R(2,5)+'s','--dl':-R(0,5)+'s'})}"></i>`);break;
    case'fireflies':make(16,()=>`<i style="${css({left:R(5,95)+'%',top:R(10,95)+'%','--d':R(6,12)+'s','--dl':-R(0,12)+'s','--b':R(1.5,3.5)+'s','--x':R(-40,40)+'px','--y':R(-40,40)+'px'})}"></i>`);break;
    case'embers':make(26,()=>`<i style="${css({left:R(0,100)+'%','--s':R(2,4.5)+'px','--d':R(4,8)+'s','--dl':-R(0,8)+'s','--x':R(-40,40)+'px'})}"></i>`);break;
    case'bubbles':make(16,()=>`<i style="${css({left:R(0,95)+'%','--s':R(8,22)+'px','--d':R(7,13)+'s','--dl':-R(0,13)+'s','--x':R(-25,25)+'px'})}"></i>`);break;
    case'confetti':make(30,()=>`<i style="${css({left:R(0,100)+'%','--c':`hsl(${R(0,360)|0} 90% 62%)`,'--d':R(5,9)+'s','--dl':-R(0,9)+'s','--x':R(-50,50)+'px','--r':R(360,1080)+'deg'})}"></i>`);break;
    case'hearts':make(14,()=>`<i style="${css({left:R(0,95)+'%','--s':R(10,18)+'px','--d':R(5,9)+'s','--dl':-R(0,9)+'s','--x':R(-30,30)+'px'})}">❤</i>`);break;
    case'matrix':{const ch='アイウエオカキクケコサシスセソ0123456789ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘ';make(14,()=>{let s='';for(let k=0;k<14;k++)s+=ch[(Math.random()*ch.length)|0]+'<br>';return`<i style="${css({left:R(0,96)+'%','--d':R(4,9)+'s','--dl':-R(0,9)+'s',opacity:R(.35,.8)})}">${s}</i>`});break}
    case'aurora':p='<b class="a1"></b><b class="a2"></b><b class="a3"></b>';break;
    case'meteor':make(6,()=>`<i style="${css({left:R(20,120)+'%',top:R(-20,40)+'%','--d':R(2.5,5)+'s','--dl':-R(0,5)+'s'})}"></i>`);p+=(()=>{let r='';for(let i=0;i<24;i++)r+=`<b class="st" style="${css({left:R(0,100)+'%',top:R(0,100)+'%','--d':R(2,5)+'s','--dl':-R(0,5)+'s'})}"></b>`;return r})();break;
    case'leaves':make(14,()=>`<i style="${css({left:R(0,100)+'%','--s':R(10,16)+'px','--c':['#e8742a','#d9481c','#f2a33a','#b8441e'][(Math.random()*4)|0],'--d':R(7,12)+'s','--dl':-R(0,12)+'s','--x':R(-70,70)+'px','--r':R(360,1080)+'deg'})}"></i>`);break;
    case'pixel':make(26,()=>`<i style="${css({left:R(0,100)+'%','--s':[4,6,8][(Math.random()*3)|0]+'px','--c':['#5cff9d','#5cc8ff','#ff5ca8','#ffe45c'][(Math.random()*4)|0],'--d':R(4,9)+'s','--dl':-R(0,9)+'s'})}"></i>`);break;
    case'glitter':make(40,()=>`<i style="${css({left:R(0,100)+'%',top:R(0,100)+'%','--s':R(2,4.5)+'px','--d':R(1.2,3)+'s','--dl':-R(0,3)+'s'})}"></i>`);break;
    case'lanterns':make(9,()=>`<i style="${css({left:R(2,92)+'%','--s':R(12,20)+'px','--d':R(10,18)+'s','--dl':-R(0,18)+'s','--x':R(-20,20)+'px'})}"></i>`);break;
    case'grid':p='<b class="sun"></b><b class="floor"></b>';break;
    case'fog':p='<b class="f1"></b><b class="f2"></b><b class="f3"></b>';break;
    case'blood':p='<b class="pool"></b>';make(11,()=>{const l=R(2,96);return`<i style="${css({left:l+'%','--w':R(5,12)+'px','--h':R(25,70)+'%','--d':R(5,11)+'s','--dl':-R(0,11)+'s'})}"><s></s></i>`});break;
    case'bloodrain':make(46,()=>`<i style="${css({left:R(-5,105)+'%','--h':R(10,24)+'px','--d':R(.5,1)+'s','--dl':-R(0,1)+'s',opacity:R(.45,.9)})}"></i>`);p+=(()=>{let r='';for(let i=0;i<8;i++)r+=`<b class="spl" style="${css({left:R(0,96)+'%','--d':R(.6,1.2)+'s','--dl':-R(0,1.2)+'s'})}"></b>`;return r})();break;
    case'eyes':make(9,()=>`<i style="${css({left:R(4,88)+'%',top:R(6,86)+'%','--s':R(.6,1.25),'--d':R(4,9)+'s','--dl':-R(0,9)+'s'})}"><s></s><s></s></i>`);break;
    case'static':p='<b class="noise"></b><b class="lines"></b><b class="roll"></b><b class="ghost"></b>';break;
    case'hands':make(6,i=>`<i style="${css({left:R(2,80)+'%',top:R(5,70)+'%','--r':R(-35,35)+'deg','--s':R(.8,1.3),'--d':'7s','--dl':-(i*1.15)+'s'})}"></i>`);break;
    case'claws':p='<b class="set s1"><s></s><s></s><s></s></b><b class="set s2"><s></s><s></s><s></s></b>';break;
    case'flicker':p='<b class="dark"></b><b class="figure"></b>';break;
    case'galaxy':p='<b class="core"></b><b class="arms"></b><b class="arms a2"></b>';break;
    case'bokeh':make(16,()=>`<i style="${css({left:R(-5,95)+'%',top:R(-5,95)+'%','--s':R(18,52)+'px','--c':['#ffd6a8','#a8d8ff','#ffb3d9','#c8b3ff','#b3ffd9'][(Math.random()*5)|0],'--d':R(9,18)+'s','--dl':-R(0,18)+'s','--x':R(-40,40)+'px','--y':R(-30,30)+'px'})}"></i>`);break;
    case'butterflies':make(5,()=>`<i style="${css({top:R(10,80)+'%','--d':R(9,15)+'s','--dl':-R(0,15)+'s','--y':R(-30,30)+'px','--h':R(0,360)+'deg','--s':R(14,22)+'px'})}"><s></s><s></s></i>`);break;
    case'sunrays':p='<b class="rays"></b><b class="glow"></b>';break;
    case'ripples':make(6,()=>`<i style="${css({left:R(8,92)+'%',top:R(10,90)+'%','--d':R(3.5,6)+'s','--dl':-R(0,6)+'s'})}"></i>`);break;
    case'sparks':make(9,()=>`<i style="${css({left:R(3,95)+'%',top:R(3,90)+'%','--r':R(0,360)+'deg','--d':R(1.6,3.2)+'s','--dl':-R(0,3)+'s','--w':R(16,40)+'px'})}"></i>`);break;
    case'golddust':p='<b class="sheen"></b>';make(40,()=>`<i style="${css({left:R(0,100)+'%','--s':R(1.5,4)+'px','--d':R(5,10)+'s','--dl':-R(0,10)+'s','--x':R(-25,25)+'px'})}"></i>`);break;
    case'prism':p='<b class="beam b1"></b><b class="beam b2"></b><b class="beam b3"></b>';make(18,()=>`<i style="${css({left:R(0,100)+'%',top:R(0,100)+'%','--d':R(1.5,3.5)+'s','--dl':-R(0,3.5)+'s','--h':R(0,360)+'deg'})}"></i>`);break;
    case'circuit':p='<b class="grid"></b>';make(7,i=>`<i style="${css({top:(8+i*13)+'%','--d':R(2.2,4)+'s','--dl':-R(0,4)+'s'})}"></i>`);break;
    case'nebula':p='<b class="cloud c1"></b><b class="cloud c2"></b><b class="cloud c3"></b>';make(26,()=>`<i style="${css({left:R(0,100)+'%',top:R(0,100)+'%','--s':R(1,3)+'px','--d':R(2,5)+'s','--dl':-R(0,5)+'s'})}"></i>`);p+=(()=>{let r='';for(let i=0;i<4;i++)r+=`<s style="${css({left:R(20,110)+'%',top:R(-20,30)+'%','--d':R(3,6)+'s','--dl':-R(0,6)+'s'})}"></s>`;return r})();break;
    case'storm':p='<b class="flash"></b>'+(()=>{let r='';for(let i=0;i<30;i++)r+=`<i style="${css({left:R(-10,110)+'%','--h':R(12,24)+'px','--d':R(.5,.9)+'s','--dl':-R(0,.9)+'s',opacity:R(.2,.45)})}"></i>`;return r})();break;
  }
  return`<div class="fxl fx-${n}" aria-hidden="true">${p}</div>`}

/* avatar decoration */
function deco(id){if(CID.test(id||'')){ensure(id);return`<i class="deco cdeco cdeco-${id}" aria-hidden="true"></i>`}if(!byId[id]||byId[id].type!=='deco')return'';const n=id.slice(5);
  const inner=n==='crownhalo'?'<b>👑</b>':n==='proorbit'?'<b></b><b></b>':n==='orbit'?'<b>❤</b><b>❤</b><b>❤</b>':n==='sparkle'?'<b>✦</b><b>✦</b><b>✧</b><b>✦</b>':n==='crown'?'<b>👑</b>':'';
  return`<i class="deco deco-${n}" aria-hidden="true">${inner}</i>`}
const plateCls=id=>CID.test(id||'')?(ensure(id),` plate cplate cplate-${id}`):byId[id]?.type==='plate'?` plate plate-${id.slice(6)}`:'';
// 3D buddies are drawn by js/buddies.js onto these canvases
let buddyLoad=null;
const BUDDIES_ON=true; // buddies are back as a premium beta (buying one needs Lumen Lite)
function buddyCanvas(id,size,key){if(!BUDDIES_ON)return'';if(byId[id]?.type!=='buddy')return'';if(!buddyLoad)buddyLoad=import('./buddies.js?v=4').catch(e=>{console.warn('buddies failed',e);buddyLoad=null});
  return`<canvas class="buddy buddy-${size}" data-buddy="${id}"${key?` data-bkey="${key}"`:''} aria-hidden="true"></canvas>`}
const nfxCls=id=>byId[id]?.type==='nfx'?` nfx-${id.slice(4)}`:'';
function applyTheme(id){document.body.dataset.theme=byId[id]?.type==='theme'?id.slice(6):''}

/* bundles: must match bundles() in firestore.rules */
const BUNDLES=[
 {id:'bundle_horror',name:'Nightmare Pack',emoji:'🩸',desc:'Blood rain, watching eyes, a dying light and a glitched frame. Not for the faint-hearted.',items:['fx_bloodrain','fx_eyes','fx_flicker','deco_glitch'],price:1200,g:'linear-gradient(135deg,#2a0306,#7a0d14 55%,#140203)'},
 {id:'bundle_cozy',name:'Cozy Winter',emoji:'☕',desc:'Snowfall, floating lanterns, a calm forest plate and the warm Ember theme.',items:['fx_snow','fx_lanterns','plate_forest','theme_ember'],price:900,g:'linear-gradient(135deg,#3a1a08,#a5521c 55%,#1a3326)'},
 {id:'bundle_neon',name:'Neon Nights',emoji:'🌆',desc:'A full synthwave look: neon grid, neon ring, vapor plate, neon name and the Synthwave theme.',items:['fx_grid','deco_neon','plate_vapor','nfx_neon','theme_synthwave'],price:1200,g:'linear-gradient(135deg,#2b0b3f,#ff2bd6 55%,#0b3a5c)'},
 {id:'bundle_dream',name:'Daydream',emoji:'🌸',desc:'Sakura petals, an angel halo, a blossom plate and the Sakura theme.',items:['fx_sakura','deco_halo','plate_sakura','theme_sakura'],price:850,g:'linear-gradient(135deg,#5a1a3a,#ff8fb8 55%,#ffd9e6)'},
 {id:'bundle_space',name:'Deep Space',emoji:'🪐',desc:'Galaxy swirl, meteor shower, galaxy plate and orbiting hearts.',items:['fx_galaxy','fx_meteor','plate_galaxy','deco_orbit'],price:1150,g:'linear-gradient(135deg,#0a0420,#3b1a78 55%,#1c3b8f)'},
 {id:'bundle_names',name:'Name Glow-Up',emoji:'🔤',desc:'Four new name effects: Frostbite, Toxic, Glitch and Starlight.',items:['nfx_ice','nfx_toxic','nfx_glitch','nfx_sparkle'],price:1000,g:'linear-gradient(135deg,#0b2a3f,#3aa8ff 50%,#7dff3a)'}];
window.Lumen.cos={BUNDLES,CID,ensure,previewRule,BUDDIES_ON,CATALOG,byId,fxLayer,deco,plateCls,nfxCls,applyTheme,buddyCanvas};
applyTheme(window.Lumen.cfg.theme);
})();
