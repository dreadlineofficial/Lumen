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

/* profile effect layer */
function fxLayer(id){if(!byId[id]||byId[id].type!=='fx')return'';const n=id.slice(3);let p='';
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
    case'storm':p='<b class="flash"></b>'+(()=>{let r='';for(let i=0;i<30;i++)r+=`<i style="${css({left:R(-10,110)+'%','--h':R(12,24)+'px','--d':R(.5,.9)+'s','--dl':-R(0,.9)+'s',opacity:R(.2,.45)})}"></i>`;return r})();break;
  }
  return`<div class="fxl fx-${n}" aria-hidden="true">${p}</div>`}

/* avatar decoration */
function deco(id){if(!byId[id]||byId[id].type!=='deco')return'';const n=id.slice(5);
  const inner=n==='orbit'?'<b>❤</b><b>❤</b><b>❤</b>':n==='sparkle'?'<b>✦</b><b>✦</b><b>✧</b><b>✦</b>':n==='crown'?'<b>👑</b>':'';
  return`<i class="deco deco-${n}" aria-hidden="true">${inner}</i>`}
const plateCls=id=>byId[id]?.type==='plate'?` plate plate-${id.slice(6)}`:'';
// 3D buddies are drawn by js/buddies.js onto these canvases
let buddyLoad=null;
const BUDDIES_ON=false; // buddies are switched off for now
function buddyCanvas(id,size,key){if(!BUDDIES_ON)return'';if(byId[id]?.type!=='buddy')return'';if(!buddyLoad)buddyLoad=import('./buddies.js?v=3').catch(e=>{console.warn('buddies failed',e);buddyLoad=null});
  return`<canvas class="buddy buddy-${size}" data-buddy="${id}"${key?` data-bkey="${key}"`:''} aria-hidden="true"></canvas>`}
const nfxCls=id=>byId[id]?.type==='nfx'?` nfx-${id.slice(4)}`:'';
function applyTheme(id){document.body.dataset.theme=byId[id]?.type==='theme'?id.slice(6):''}

window.Lumen.cos={BUDDIES_ON,CATALOG,byId,fxLayer,deco,plateCls,nfxCls,applyTheme,buddyCanvas};
applyTheme(window.Lumen.cfg.theme);
})();
