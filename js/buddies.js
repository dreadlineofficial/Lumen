/* Lumen 3D buddies: little characters that wander your profile bar and card.
   One shared WebGL renderer draws every visible buddy, then copies the frame onto that buddy's own 2D canvas. */
import * as T from './three.js?v=1';

const TAU=Math.PI*2,rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[(Math.random()*a.length)|0];
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const angLerp=(a,b,t)=>{let d=((b-a+Math.PI)%TAU+TAU)%TAU-Math.PI;return a+d*t};

/* ---------- shared renderer ---------- */
let gl=null,glW=0,glH=0;
function renderer(){if(!gl){gl=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});gl.setPixelRatio(1);gl.outputColorSpace=T.SRGBColorSpace;gl.toneMapping=T.ACESFilmicToneMapping;gl.toneMappingExposure=1.15;gl.setClearColor(0,0)}return gl}
function ensureSize(w,h){if(w>glW||h>glH){glW=Math.max(w,glW);glH=Math.max(h,glH);renderer().setSize(glW,glH,false)}}

/* ---------- small helpers ---------- */
const M=(c,o={})=>new T.MeshStandardMaterial({color:c,roughness:.55,metalness:0,...o});
const mesh=(g,m,p=[0,0,0],s)=>{const x=new T.Mesh(g,m);x.position.set(...p);if(s)x.scale.set(...s);return x};
function textSprite(txt,color='#fff',size=64){const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');x.font=`bold ${size*.7}px sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillStyle=color;x.shadowColor='rgba(0,0,0,.5)';x.shadowBlur=6;x.fillText(txt,size/2,size/2);
  const sp=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false}));sp.scale.set(.08,.08,1);return sp}
function eyes(r=.018,gap=.045,y=0,z=.1){const g=new T.Group(),b=M(0x111116,{roughness:.2}),w=new T.MeshBasicMaterial({color:0xffffff});
  for(const s of[-1,1]){const e=mesh(new T.SphereGeometry(r,16,12),b,[s*gap/2,y,z]);e.add(mesh(new T.SphereGeometry(r*.35,8,6),w,[r*.35,r*.35,r*.75]));g.add(e)}return g}
// floating "Zzz", "♪" and "!" bubbles
function puff(inst,txt,color){const s=textSprite(txt,color);s.position.set(inst.actor.position.x+rnd(-.03,.05),inst.actor.position.y+inst.top,0.1);s.userData={life:1.4,vy:.09};inst.scene.add(s);inst.fx.push(s)}

/* ---------- Ted (models/ted.glb + bottle and phone from models/ted-props.glb) ---------- */
let tedP=null,propsP=null;
const loadTed=()=>tedP||(tedP=new T.GLTFLoader().loadAsync(new URL('../models/ted.glb',import.meta.url).href));
const loadProps=()=>propsP||(propsP=new T.GLTFLoader().loadAsync(new URL('../models/ted-props.glb',import.meta.url).href).catch(()=>null));
// bake a set of meshes into one group, centred, scaled to a height, optionally turned
function bake(scene,test,height,rotY=0,anchor='center'){const parts=[];scene.updateMatrixWorld(true);scene.traverse(o=>{if(o.isMesh&&test(o.name))parts.push(o)});if(!parts.length)return null;
  const g=new T.Group();for(const o of parts){const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);const m=new T.Mesh(geo,o.material.clone());g.add(m)}
  const b=new T.Box3().setFromObject(g),c=b.getCenter(new T.Vector3()),sz=b.getSize(new T.Vector3());const k=height/sz.y,rot=new T.Matrix4().makeRotationY(rotY);
  g.children.forEach(m=>{m.geometry.translate(-c.x,anchor==='bottom'?-b.min.y:-c.y,-c.z);m.geometry.scale(k,k,k);m.geometry.applyMatrix4(rot)});return g}
function chairMesh(){const g=new T.Group(),wood=M(0x8a5a33,{roughness:.7}),dark=M(0x6b4325,{roughness:.75}),cush=M(0xb5342b,{roughness:.9});
  const seatY=.072,w=.19,d=.16,bz=-.075;
  g.add(mesh(new T.BoxGeometry(w,.016,d),wood,[0,seatY,bz]));
  g.add(mesh(new T.BoxGeometry(w*.86,.012,d*.82),cush,[0,seatY+.013,bz+.004]));
  for(const sx of[-1,1])for(const sz of[-1,1])g.add(mesh(new T.BoxGeometry(.014,seatY,.014),dark,[sx*(w/2-.012),seatY/2,bz+sz*(d/2-.012)]));
  for(const sx of[-1,1])g.add(mesh(new T.BoxGeometry(.014,.2,.014),dark,[sx*(w/2-.012),seatY+.1,bz-d/2+.008]));
  for(const y of[.13,.2,.255])g.add(mesh(new T.BoxGeometry(w-.02,.026,.01),wood,[0,seatY+y-.06,bz-d/2+.008]));
  const outer=new T.Group();g.scale.setScalar(.85);outer.add(g);return outer}
function fallbackPhone(){const g=new T.Group();g.add(mesh(new T.BoxGeometry(.034,.064,.007),M(0x1a1c22,{roughness:.3})));g.add(mesh(new T.PlaneGeometry(.03,.058),new T.MeshBasicMaterial({color:0x7fb4ff}),[0,0,.0036]));return g}
function fallbackBottle(){const g=new T.Group(),glass=new T.MeshPhysicalMaterial({color:0x5a2e0c,roughness:.15,metalness:0,transmission:0,clearcoat:1});
  g.add(mesh(new T.CylinderGeometry(.014,.014,.045,20),glass,[0,.0225,0]));g.add(mesh(new T.CylinderGeometry(.006,.014,.014,20),glass,[0,.052,0]));g.add(mesh(new T.CylinderGeometry(.006,.006,.018,16),glass,[0,.068,0]));return g}
async function makeTed(inst){const [gltf,props]=await Promise.all([loadTed(),loadProps()]);const root=T.cloneSkinned(gltf.scene);
  root.traverse(o=>{if(o.isMesh){o.frustumCulled=false;if(o.material){o.material=o.material.clone();o.material.roughness=Math.max(.75,o.material.roughness??.8)}}});
  const mixer=new T.AnimationMixer(root),A={};for(const n of['walk_cycle','sit_phone','beer'])A[n]=mixer.clipAction(gltf.animations.find(a=>a.name===n));
  A.sit_phone.setLoop(T.LoopOnce);A.sit_phone.clampWhenFinished=true;A.beer.setLoop(T.LoopOnce);A.beer.clampWhenFinished=true;
  const idle=mixer.clipAction(gltf.animations.find(a=>a.name==='beer').clone());idle.play();idle.paused=true;idle.time=0;let cur=idle;
  const fade=(to,d=.35)=>{if(to===cur)return;to.reset();to.play();if(to===idle){to.paused=true;to.time=0}cur.crossFadeTo(to,d,false);cur=to};
  const B=n=>root.getObjectByName(n);const mouthB=B('mouth')||B('jaw')||B('head');const handR=B('handR'),handL=B('handL'),head=B('head'),armL=B('upper_armL'),armR=B('upper_armR');
  // props: the beer bottle and phone from the accessories model, with drawn fallbacks
  const bottle=(props&&bake(props.scene,n=>n==='Cylinder',.11,0,'bottom'))||fallbackBottle();
  const phone=(props&&bake(props.scene,n=>/^pC(ube|ylinder)/.test(n),.075,-Math.PI/2))||fallbackPhone();
  bottle.traverse(o=>{if(o.isMesh){o.material.color?.offsetHSL(0,.1,.12);o.material.roughness=.18;if('emissive' in o.material){o.material.emissive.set(0x3a1a05)}}});
  const feedCv=document.createElement('canvas');feedCv.width=72;feedCv.height=128;const fx=feedCv.getContext('2d'),feedTex=new T.CanvasTexture(feedCv);feedTex.colorSpace=T.SRGBColorSpace;
  const cards=Array.from({length:8},(_,i)=>({h:22+((i*37)%18),c:['#ff8fb8','#8fd3ff','#ffd76a','#9dffd8','#c8a8ff'][i%5]}));let scrollY=0;
  function drawFeed(dt){scrollY+=dt*(Math.sin(performance.now()/900)>-.2?38:4);fx.fillStyle='#101218';fx.fillRect(0,0,72,128);let y=-(scrollY%220);
    for(let k=0;k<16;k++){const c=cards[k%8];fx.fillStyle='#1d2130';fx.fillRect(5,y,62,c.h+18);fx.fillStyle=c.c;fx.fillRect(9,y+4,54,c.h);fx.fillStyle='#5a6075';fx.fillRect(9,y+c.h+7,34,4);fx.fillRect(9,y+c.h+13,22,3);y+=c.h+24}
    fx.fillStyle='#000';fx.fillRect(0,0,72,7);fx.fillStyle='#fff';fx.fillRect(4,2,10,3);feedTex.needsUpdate=true}
  {const pb=new T.Box3().setFromObject(phone),ps=pb.getSize(new T.Vector3());const scr=mesh(new T.PlaneGeometry(ps.x*.86,ps.y*.88),new T.MeshBasicMaterial({map:feedTex,toneMapped:false}),[0,0,pb.max.z+.0008]);phone.add(scr)}
  const camPos=new T.Vector3(0,.55,3),lookPt=new T.Vector3();let reactT=0,sipped=false;
  const chair=chairMesh();chair.visible=phone.visible=bottle.visible=false;
  const holder=new T.Group();holder.add(root);root.scale.setScalar(.85);inst.scene.add(chair,phone,bottle);
  const v=new T.Vector3(),hv=new T.Vector3(),lv=new T.Vector3(),Z=new T.Vector3(0,0,1),qa=new T.Quaternion();
  let prop=null,chairT=0,chairOn=false,spread=.3;
  return{obj:holder,top:.44,speed:.09,walkChance:.28,
    walkStart(){fade(A.walk_cycle,.25)},walkStop(){fade(idle,.3)},
    walkFacing:d=>d>0?-.55:-(Math.PI-.55),faceYaw:0,
    actions:{
      sit:{w:3,yaw:.55,dur:A.sit_phone.getClip().duration+.2,start(){chairOn=true;chair.position.set(holder.position.x,0,0);fade(A.sit_phone,.3);prop=phone;phone.visible=true},end(){chairOn=false;phone.visible=false;prop=null;fade(idle,.4)}},
      drink:{w:2.4,yaw:1.05,dur:A.beer.getClip().duration,start(){fade(A.beer,.3);prop=bottle;bottle.visible=true},end(){bottle.visible=false;prop=null;fade(idle,.3)}},
      look:{w:.6,dur:3,tick(t){holder.rotation.y=Math.sin(t*1.6)*.45}},
    },
    update(dt,t,inst){mixer.update(dt);
      // keep his paws out of his tummy: open the upper arms a little after each animation frame
      const drinkingNow=prop===bottle&&handR.getWorldPosition(v).y>.23;spread=lerp(spread,inst.state==='walk'?.12:drinkingNow?.05:inst.act&&prop===phone?.26:.34,Math.min(1,dt*5));
      armL.quaternion.multiply(qa.setFromAxisAngle(Z,-spread));armR.quaternion.multiply(qa.setFromAxisAngle(Z,spread));
      if(chairOn){chair.position.x=holder.position.x;chair.rotation.y=holder.rotation.y}chairT=clamp(chairT+(chairOn?dt:-dt)*3.5,0,1);chair.visible=chairT>0;const u=chairT-1,s=chairOn?1+2.7*u*u*u+1.7*u*u:ease(chairT);chair.scale.setScalar(Math.max(.001,s));
      if(prop){root.updateMatrixWorld(true);handR.getWorldPosition(v);head.getWorldPosition(hv);
        if(prop===bottle){const drinking=clamp((v.y-.225)/.045,0,1);
          // held by the body in his right paw; tipped up to his mouth when the paw rises
          // holding: upright in the paw. drinking: neck at his mouth, bottle tipped up and out in front
          // tip the bottle in Ted's own facing direction (tilt first, then his turn), neck resting on his mouth bone
          const th=-2.0*drinking,len=.105,yaw=holder.rotation.y;mouthB.getWorldPosition(hv);
          const dx=Math.sin(yaw)*Math.sin(th),dy=Math.cos(th),dz=Math.cos(yaw)*Math.sin(th);
          const bx=hv.x+Math.sin(yaw)*.012-dx*len,by=hv.y-dy*len,bz=hv.z+Math.cos(yaw)*.012-dz*len;
          prop.rotation.order='YXZ';prop.position.set(lerp(v.x,bx,drinking),lerp(v.y-.045,by,drinking),lerp(v.z+.012,bz,drinking));prop.rotation.set(th,yaw*drinking,0)}
        else{const sc=Math.sin(performance.now()/260)*.003;prop.position.set(v.x,v.y+.012+sc,v.z+.025);lookPt.copy(hv).lerp(camPos,.55);prop.lookAt(lookPt);drawFeed(dt);
          reactT-=dt;if(reactT<=0&&inst.act){reactT=rnd(1.4,3);puff(inst,pick(['❤️','👍','😂','🔥']),'#fff')}}}
      if(prop===bottle){const up=handR.getWorldPosition(v).y>.262;if(up&&!sipped){sipped=true;puff(inst,'glug','#ffd28a')}else if(!up)sipped=false}}}}

/* ---------- procedural buddies ---------- */
// shared: eyes that blink on their own
function blinker(eyeGroup){let next=rnd(1.5,4),t=0;return dt=>{t+=dt;if(t>next){const k=t-next;eyeGroup.scale.y=k<.06?1-k/.06*.9:k<.14?.1+(k-.06)/.08*.9:1;if(k>.14){t=0;next=rnd(1.8,4.5)}}}}
const put=(p,m)=>(p.add(m),m);
const toon=(c,o={})=>new T.MeshPhysicalMaterial({color:c,roughness:.45,clearcoat:.4,clearcoatRoughness:.4,sheen:.6,sheenColor:new T.Color(0xffffff),...o});

function makeBlob(){const g=new T.Group(),body=new T.Group();g.add(body);
  const mat=new T.MeshPhysicalMaterial({color:0x4fe3a8,roughness:.08,clearcoat:1,clearcoatRoughness:.05,sheen:.8,sheenColor:new T.Color(0xc8ffe9),transmission:.15,thickness:.2,ior:1.3});
  const blob=mesh(new T.SphereGeometry(.11,40,32),mat,[0,.1,0],[1,.86,1]);body.add(blob);
  const inner=mesh(new T.SphereGeometry(.05,20,16),new T.MeshBasicMaterial({color:0x9dffd8,transparent:true,opacity:.25}),[.02,.09,-.02]);body.add(inner);
  const shine=mesh(new T.SphereGeometry(.022,16,12),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.8}),[-.045,.16,.07],[1,.6,.4]);body.add(shine);
  const ey=eyes(.017,.06,.115,.088);body.add(ey);const blink=blinker(ey);
  const mouth=mesh(new T.TorusGeometry(.016,.004,8,20,Math.PI),new T.MeshBasicMaterial({color:0x163a2c}),[0,.088,.098]);mouth.rotation.z=Math.PI;body.add(mouth);
  const cheek=new T.MeshBasicMaterial({color:0xff8fb8,transparent:true,opacity:.55});for(const s of[-1,1])body.add(mesh(new T.CircleGeometry(.013,16),cheek,[s*.058,.092,.093]));
  const drip=mesh(new T.SphereGeometry(.014,12,10),mat,[.07,.03,.05],[1,1.4,1]);body.add(drip);
  let hopT=0;return{obj:g,top:.24,speed:.14,
    walkStart(){hopT=0},walkTick(dt){hopT+=dt*2.4;const k=hopT%1,h=Math.sin(k*Math.PI),land=k<.12||k>.88;body.position.y=h*.075;body.scale.set(land?1.14:1-h*.05,land?.82:1+h*.1,land?1.14:1-h*.05);mouth.scale.y=1+h*.6},
    walkStop(){body.position.y=0;body.scale.set(1,1,1);mouth.scale.y=1},walkFacing:d=>d>0?.5:-.5,faceYaw:0,
    actions:{
      bounce:{dur:1.6,start(i){puff(i,'boing','#9dffd8')},tick(t){const k=t/1.6,h=Math.sin(k*Math.PI);body.position.y=h*.22;body.rotation.y=ease(k)*TAU;body.scale.set(1-h*.08,1+h*.15,1-h*.08)},end(){body.position.y=0;body.rotation.y=0;body.scale.set(1,1,1)}},
      melt:{dur:2.4,tick(t){const k=t<.9?ease(t/.9):t>1.8?1-ease((t-1.8)/.6):1;body.scale.set(1+k*.55,1-k*.6,1+k*.55);drip.position.y=.03-k*.025}},
      wiggle:{dur:1.6,tick(t){body.rotation.z=Math.sin(t*20)*.18*(1-t/1.6);ey.position.x=Math.sin(t*20)*.006}},
      split:{dur:2.2,start(i){puff(i,'!','#fff')},tick(t){const k=Math.sin(Math.min(t/2.2,1)*Math.PI);body.scale.set(1+k*.35,1-k*.2,1);inner.position.x=.02+Math.sin(t*12)*.03}},
    },update(dt,t){blink(dt);if(!this.moving){blob.scale.y=.86+Math.sin(t*3)*.025;blob.scale.x=1-Math.sin(t*3)*.012}shine.position.x=-.045+Math.sin(t*.7)*.005}}}

function makeBot(){const g=new T.Group(),body=new T.Group();g.add(body);
  const shell=toon(0xeef1f6,{roughness:.3,metalness:.15,sheen:0}),dark=M(0x1d222c,{roughness:.35,metalness:.3}),accent=M(0x6b7cff,{roughness:.4}),glow=new T.MeshBasicMaterial({color:0x4dd8ff});
  const torso=mesh(new T.CapsuleGeometry(.055,.04,8,20),shell,[0,.115,0],[1.1,1,.85]);body.add(torso);
  body.add(mesh(new T.CircleGeometry(.016,20),glow,[0,.12,.05]));const chestRing=mesh(new T.TorusGeometry(.02,.003,8,24),accent,[0,.12,.049]);body.add(chestRing);
  const head=new T.Group();head.position.set(0,.205,0);body.add(head);
  head.add(mesh(new T.BoxGeometry(.13,.085,.095),shell));for(const s of[-1,1])put(head,mesh(new T.CylinderGeometry(.018,.018,.012,16),accent,[s*.07,0,0])).rotation.z=Math.PI/2;
  const visor=mesh(new T.BoxGeometry(.105,.05,.01),dark,[0,0,.048]);head.add(visor);
  const ey=new T.Group();ey.position.set(0,0,.054);head.add(ey);const eL=mesh(new T.CapsuleGeometry(.006,.01,4,8),glow,[-.025,0,0]),eR=mesh(new T.CapsuleGeometry(.006,.01,4,8),glow,[.025,0,0]);ey.add(eL,eR);const blink=blinker(ey);
  head.add(mesh(new T.CylinderGeometry(.003,.003,.05),dark,[0,.065,0]));const tip=mesh(new T.SphereGeometry(.012,16,12),new T.MeshBasicMaterial({color:0xff5c7a}),[0,.094,0]);head.add(tip);
  const arms=[-1,1].map(s=>{const sh=new T.Group();sh.position.set(s*.072,.15,0);body.add(sh);sh.add(mesh(new T.SphereGeometry(.014,12,10),accent));
    const arm=mesh(new T.CapsuleGeometry(.009,.05,4,10),shell,[0,-.035,0]);sh.add(arm);sh.add(mesh(new T.SphereGeometry(.013,12,10),dark,[0,-.07,0]));return sh});
  const tread=new T.Group();tread.position.y=.032;body.add(tread);tread.add(mesh(new T.BoxGeometry(.12,.05,.075),dark));
  const wheels=[-.04,0,.04].map(x=>{const w=mesh(new T.CylinderGeometry(.022,.022,.08,16),accent,[x,0,0]);w.rotation.x=Math.PI/2;tread.add(w);return w});
  return{obj:g,top:.32,speed:.12,
    walkStart(){},walkTick(dt,t){wheels.forEach(w=>w.rotation.y+=dt*9);body.rotation.x=.06;head.rotation.z=Math.sin(t*10)*.03;arms[0].rotation.x=Math.sin(t*6)*.5;arms[1].rotation.x=-Math.sin(t*6)*.5},
    walkStop(){body.rotation.x=0;head.rotation.z=0;arms.forEach(a=>a.rotation.x=0)},
    walkFacing:d=>d>0?.9:-.9,faceYaw:0,
    actions:{
      scan:{dur:2.8,tick(t){head.rotation.y=Math.sin(t*2.6)*.9;glow.color.setHSL(.53+Math.sin(t*8)*.05,1,.6);visor.scale.y=1+Math.sin(t*20)*.05},end(){head.rotation.y=0;glow.color.set(0x4dd8ff);visor.scale.y=1}},
      spin:{dur:1.3,tick(t){body.rotation.y=ease(t/1.3)*TAU;arms.forEach((a,i)=>a.rotation.z=(i?-1:1)*Math.sin(t/1.3*Math.PI)*1.2)},end(){body.rotation.y=0;arms.forEach(a=>a.rotation.z=0)}},
      wave:{dur:2,start(i){puff(i,'hi!','#9fd8ff')},tick(t){arms[1].rotation.z=-2.4+Math.sin(t*12)*.35;head.rotation.z=-.15},end(){arms[1].rotation.z=0;head.rotation.z=0}},
      beep:{dur:1.4,start(i){puff(i,'!','#ffd76a')},tick(t){body.position.y=Math.max(0,Math.sin(t*9))*.03;tip.material.color.setHSL(t*2%1,1,.6)},end(){body.position.y=0;tip.material.color.set(0xff5c7a)}},
    },update(dt,t){blink(dt);chestRing.rotation.z+=dt*2;if(!this.moving)torso.scale.y=1+Math.sin(t*2.4)*.015}}}

function makePip(){const g=new T.Group(),body=new T.Group();g.add(body);const yel=toon(0xffd84d,{roughness:.85}),org=M(0xff9a2e,{roughness:.6}),belly=toon(0xfff1b8,{roughness:.9});
  const torso=mesh(new T.SphereGeometry(.075,32,24),yel,[0,.085,0],[1,1.05,1]);body.add(torso);body.add(mesh(new T.SphereGeometry(.055,24,18),belly,[0,.075,.032],[1,1.1,.6]));
  const head=new T.Group();head.position.set(0,.17,.01);body.add(head);
  head.add(mesh(new T.SphereGeometry(.052,32,24),yel));const ey=eyes(.009,.042,.012,.045);head.add(ey);const blink=blinker(ey);
  const beakT=mesh(new T.ConeGeometry(.013,.026,12),org,[0,-.002,.058]);beakT.rotation.x=Math.PI/2;head.add(beakT);
  const beakB=mesh(new T.ConeGeometry(.01,.018,12),org,[0,-.012,.054]);beakB.rotation.x=Math.PI/2;head.add(beakB);
  const blush=new T.MeshBasicMaterial({color:0xff9db8,transparent:true,opacity:.6});for(const s of[-1,1])head.add(mesh(new T.CircleGeometry(.009,12),blush,[s*.035,-.006,.042]));
  for(const [x,r] of[[-.008,-.4],[.006,0],[.016,.4]]){const f=mesh(new T.ConeGeometry(.006,.03,6),yel,[x,.06,-.005]);f.rotation.z=r;head.add(f)}
  const tail=new T.Group();tail.position.set(0,.09,-.07);body.add(tail);for(const r of[-.5,0,.5]){const f=mesh(new T.ConeGeometry(.01,.035,6),yel,[0,0,0]);f.rotation.set(-1.1,0,r);tail.add(f)}
  const wings=[-1,1].map(s=>{const p=new T.Group();p.position.set(s*.072,.105,0);body.add(p);p.add(mesh(new T.SphereGeometry(.035,16,12),yel,[0,-.02,0],[.35,.85,1]));return p});
  const feet=[-1,1].map(s=>{const f=new T.Group();f.position.set(s*.03,.012,.01);body.add(f);f.add(mesh(new T.CylinderGeometry(.005,.005,.02,6),org,[0,.005,0]));for(const r of[-.5,0,.5]){const toe=mesh(new T.BoxGeometry(.005,.004,.022),org,[0,-.004,.008]);toe.rotation.y=r;f.add(toe)}return f});
  return{obj:g,top:.27,speed:.1,
    walkStart(){},walkTick(dt,t){body.rotation.z=Math.sin(t*14)*.12;body.position.y=Math.abs(Math.sin(t*14))*.014;feet[0].position.y=.012+Math.max(0,Math.sin(t*14))*.012;feet[1].position.y=.012+Math.max(0,-Math.sin(t*14))*.012;wings.forEach((w,i)=>w.rotation.z=(i?-1:1)*(.15+Math.abs(Math.sin(t*14))*.25));tail.rotation.y=Math.sin(t*14)*.3},
    walkStop(){body.rotation.z=0;body.position.y=0;feet.forEach(f=>f.position.y=.012);wings.forEach(w=>w.rotation.z=0);tail.rotation.y=0},
    walkFacing:d=>d>0?.9:-.9,faceYaw:0,
    actions:{
      peck:{dur:2.2,tick(t){const p=Math.max(0,Math.sin(t*9));head.rotation.x=p*.9;head.position.y=.17-p*.035;head.position.z=.01+p*.02;tail.rotation.x=-p*.3},end(){head.rotation.x=0;head.position.set(0,.17,.01);tail.rotation.x=0}},
      flap:{dur:2,start(i){puff(i,'♪','#ffe45c')},tick(t){const f=Math.sin(t*32);wings[0].rotation.z=.5+f*.7;wings[1].rotation.z=-.5-f*.7;body.position.y=Math.sin(Math.min(t/2,1)*Math.PI)*.08;feet.forEach(x=>x.rotation.x=.4)},end(){wings.forEach(w=>w.rotation.z=0);body.position.y=0;feet.forEach(x=>x.rotation.x=0)}},
      dance:{dur:2.6,start(i){puff(i,'♫','#ffe45c')},tick(t){body.rotation.y=Math.sin(t*6)*.6;body.position.y=Math.abs(Math.sin(t*12))*.02;head.rotation.z=Math.sin(t*12)*.2;wings.forEach((w,i)=>w.rotation.z=(i?-1:1)*(.3+Math.sin(t*12)*.3))},end(){body.rotation.y=0;body.position.y=0;head.rotation.z=0;wings.forEach(w=>w.rotation.z=0)}},
      tilt:{dur:1.6,tick(t){head.rotation.z=Math.sin(Math.min(t,1.2)/1.2*Math.PI)*.45}},
    },update(dt,t){blink(dt);if(!this.moving)torso.scale.y=1.05+Math.sin(t*3.2)*.02}}}

function makeBoo(){const g=new T.Group(),body=new T.Group();g.add(body);
  const prof=[new T.Vector2(0,.235)];for(let i=1;i<=16;i++){const a=i/16;prof.push(new T.Vector2(Math.sin(a*Math.PI/2)*.085,.235-a*.13))}prof.push(new T.Vector2(.088,.06),new T.Vector2(.09,.015));
  const geo=new T.LatheGeometry(prof,48);const pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const y=pos.getY(i);if(y<.04){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,y+Math.sin(Math.atan2(z,x)*7)*.014*(1-y/.04))}}geo.computeVertexNormals();
  const mat=new T.MeshPhysicalMaterial({color:0xf6f7ff,emissive:0x9fb0ff,emissiveIntensity:.3,roughness:.35,clearcoat:.6,transparent:true,opacity:.93,side:T.DoubleSide});
  const sh=mesh(geo,mat,[0,.03,0]);body.add(sh);const ey=eyes(.014,.048,.19,.075);body.add(ey);const blink=blinker(ey);
  const mouth=mesh(new T.CircleGeometry(.011,20),new T.MeshBasicMaterial({color:0x2a2240}),[0,.15,.084]);mouth.scale.y=1.3;body.add(mouth);
  const tongue=mesh(new T.CircleGeometry(.006,12),new T.MeshBasicMaterial({color:0xff7aa8}),[0,.144,.0845]);body.add(tongue);
  const blush=new T.MeshBasicMaterial({color:0xffa3c6,transparent:true,opacity:.5});for(const s of[-1,1])body.add(mesh(new T.CircleGeometry(.011,14),blush,[s*.045,.165,.08]));
  const arms=[-1,1].map(s=>{const a=new T.Group();a.position.set(s*.083,.13,0);body.add(a);put(a,mesh(new T.CapsuleGeometry(.012,.02,4,10),mat,[s*.012,0,0])).rotation.z=s*1.2;return a});
  const glowLight=new T.PointLight(0xaab8ff,.6,.6);glowLight.position.set(0,.15,.1);body.add(glowLight);
  let trailT=0;
  return{obj:g,top:.32,speed:.09,
    walkStart(){},walkTick(dt,t){body.rotation.z=-.12*Math.sign(this.dir||1);arms.forEach((a,i)=>a.rotation.z=Math.sin(t*5+i)*.3)},walkStop(){body.rotation.z=0;arms.forEach(a=>a.rotation.z=0)},walkFacing:d=>d>0?.6:-.6,faceYaw:0,
    actions:{
      spook:{dur:1.7,start(i){puff(i,'boo!','#cfd8ff')},tick(t){const k=Math.sin(Math.min(t/1.2,1)*Math.PI);body.scale.setScalar(1+k*.3);body.rotation.z=Math.sin(t*30)*.07*k;arms.forEach((a,i)=>a.rotation.z=(i?-1:1)*k*1.4);mouth.scale.set(1+k,1.3+k*1.5,1)},end(){body.scale.setScalar(1);body.rotation.z=0;arms.forEach(a=>a.rotation.z=0);mouth.scale.set(1,1.3,1)}},
      vanish:{dur:2.8,tick(t){mat.opacity=.93*(t<1?1-t:t>1.8?Math.min(1,t-1.8):0);glowLight.intensity=mat.opacity*.6},end(){mat.opacity=.93;glowLight.intensity=.6}},
      twirl:{dur:1.6,tick(t){body.rotation.y=ease(t/1.6)*TAU*2;body.position.y=.04+Math.sin(t/1.6*Math.PI)*.05}},
      wave:{dur:1.8,start(i){puff(i,'hi','#cfd8ff')},tick(t){arms[1].rotation.z=-1.6+Math.sin(t*12)*.4},end(){arms[1].rotation.z=0}},
    },update(dt,t,inst){blink(dt);body.position.y=.045+Math.sin(t*2.2)*.022;tongue.visible=Math.sin(t*.9)>.6;
      trailT+=dt;if(this.moving&&trailT>.25){trailT=0;puff(inst,'✦','#cfd8ff')}}}}

function makeMochi(){const g=new T.Group(),body=new T.Group();g.add(body);const fur=toon(0xf3e6d6,{roughness:.95}),pat=toon(0xe08a3c,{roughness:.95}),pink=M(0xff9db8),dark=M(0x2a2228);
  const torso=mesh(new T.CapsuleGeometry(.055,.07,8,20),fur,[0,.07,0]);torso.rotation.z=Math.PI/2;torso.scale.set(1,1,.95);body.add(torso);
  for(const x of[-.03,0,.03])put(body,mesh(new T.TorusGeometry(.055,.006,6,20,Math.PI*.7),pat,[x,.07,0])).rotation.set(0,Math.PI/2,Math.PI*.15);
  const head=new T.Group();head.position.set(.085,.13,0);body.add(head);head.add(mesh(new T.SphereGeometry(.053,32,24),fur,[0,0,0],[1,.95,1.05]));
  head.add(mesh(new T.SphereGeometry(.025,16,12),pat,[-.01,.035,0],[1,.6,1.4]));head.add(mesh(new T.SphereGeometry(.022,16,12),fur,[.04,-.012,0],[.9,.7,1.1]));
  for(const s of[-1,1]){const ear=mesh(new T.ConeGeometry(.02,.038,4),s<0?pat:fur,[-.005,.05,s*.03]);ear.rotation.x=s*.3;head.add(ear);const inEar=mesh(new T.ConeGeometry(.011,.024,4),pink,[0,.048,s*.03]);inEar.rotation.x=s*.3;head.add(inEar)}
  const ey=eyes(.009,.04,.012,0);ey.rotation.y=Math.PI/2;ey.position.x=.048;head.add(ey);const blink=blinker(ey);
  head.add(mesh(new T.SphereGeometry(.006,8,6),pink,[.058,-.004,0]));
  const wmat=new T.LineBasicMaterial({color:0x6b5a50});for(const s of[-1,1])for(const dy of[-.004,.004]){const lg=new T.BufferGeometry().setFromPoints([new T.Vector3(.055,-.008,s*.012),new T.Vector3(.07,-.008+dy*2,s*.045)]);head.add(new T.Line(lg,wmat))}
  const tail=new T.Group();tail.position.set(-.09,.08,0);body.add(tail);
  const curve=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(-.04,.03,0),new T.Vector3(-.035,.09,0),new T.Vector3(-.005,.115,0)]);tail.add(mesh(new T.TubeGeometry(curve,20,.011,8),pat));
  const legs=[[.05,.03],[.05,-.03],[-.05,.03],[-.05,-.03]].map(([x,z])=>{const l=new T.Group();l.position.set(x,.04,z);body.add(l);l.add(mesh(new T.CapsuleGeometry(.011,.02,4,8),fur,[0,-.02,0]));l.add(mesh(new T.SphereGeometry(.013,10,8),fur,[.004,-.036,0],[1.2,.6,1]));return l});
  let sleeping=false;
  return{obj:g,top:.25,speed:.1,
    walkStart(){},walkTick(dt,t){legs.forEach((l,i)=>l.rotation.z=Math.sin(t*16+(i===0||i===3?Math.PI:0))*.55);body.position.y=Math.abs(Math.sin(t*16))*.007;head.rotation.z=Math.sin(t*8)*.04;tail.rotation.z=Math.sin(t*8)*.2},
    walkStop(){legs.forEach(l=>l.rotation.z=0);body.position.y=0;head.rotation.z=0},
    walkFacing:d=>d>0?-.35:-(Math.PI-.35),faceYaw:-Math.PI/2+.5,
    actions:{
      nap:{dur:6.5,start(){sleeping=true},tick(t,i){const k=Math.min(t/.6,1)*(t>5.9?1-(t-5.9)/.6:1);body.scale.y=1-k*.32;head.position.y=.13-k*.055;head.rotation.z=-k*.25;ey.scale.y=Math.max(.1,1-k*.95);legs.forEach(l=>l.scale.y=1-k*.6);if(Math.random()<.05)puff(i,'z','#cfd8ff')},end(){sleeping=false;body.scale.y=1;head.position.y=.13;head.rotation.z=0;ey.scale.y=1;legs.forEach(l=>l.scale.y=1)}},
      stretch:{dur:2.2,tick(t){const k=Math.sin(Math.min(t/2.2,1)*Math.PI);body.scale.x=1+k*.25;legs[0].rotation.z=legs[1].rotation.z=-k*.8;head.position.y=.13-k*.04;tail.rotation.z=k*.6},end(){body.scale.x=1;legs.forEach(l=>l.rotation.z=0);head.position.y=.13;tail.rotation.z=0}},
      groom:{dur:2.4,tick(t){legs[0].rotation.z=-1.6+Math.sin(t*10)*.3;legs[0].position.y=.07;head.rotation.z=.3+Math.sin(t*10)*.08},end(){legs[0].rotation.z=0;legs[0].position.y=.04;head.rotation.z=0}},
      wag:{dur:2,start(i){puff(i,'♥','#ff9db8')},tick(t){tail.rotation.x=Math.sin(t*14)*.6},end(){tail.rotation.x=0}},
    },update(dt,t){if(!sleeping){blink(dt);tail.rotation.y=Math.sin(t*2)*.2;head.rotation.y=Math.sin(t*.6)*.15}if(!this.moving&&!sleeping)torso.scale.x=1+Math.sin(t*2.6)*.02}}}
const KINDS={buddy_blob:makeBlob,buddy_bot:makeBot,buddy_pip:makePip,buddy_boo:makeBoo,buddy_mochi:makeMochi};

/* ---------- instances ---------- */
const insts=new Map();
const io=new IntersectionObserver(es=>es.forEach(e=>{const i=insts.get(e.target);if(i)i.visible=e.isIntersecting}));
function lights(scene){scene.add(new T.HemisphereLight(0xffffff,0x6b6680,2.1));const d=new T.DirectionalLight(0xfff2e0,2.2);d.position.set(1.2,2,2.4);scene.add(d);const r=new T.DirectionalLight(0x9fb4ff,1.1);r.position.set(-2,1,-1.5);scene.add(r)}
async function attach(cv){if(insts.has(cv))return;const id=cv.dataset.buddy,key=cv.dataset.bkey;
  if(key){for(const [old,i] of insts){if(i.key===key&&i.buddy===id&&!old.isConnected){insts.delete(old);io.unobserve(old);i.cv=cv;i.ctx=cv.getContext('2d');i.goneAt=0;i.visible=true;insts.set(cv,i);io.observe(cv);if(i.cam)layout(i);return}}}const card=cv.classList.contains('buddy-card')||cv.closest('.buddy-stage');
  const inst={key,buddy:id,cv,ctx:cv.getContext('2d'),scene:new T.Scene(),visible:true,fx:[],state:'idle',timer:rnd(.5,1.5),t:rnd(0,10),dir:1,target:0,act:null,card:!!card};insts.set(cv,inst);io.observe(cv);
  lights(inst.scene);
  const shadow=mesh(new T.CircleGeometry(.09,24),new T.MeshBasicMaterial({color:0,transparent:true,opacity:.28,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.001;inst.scene.add(shadow);inst.shadow=shadow;
  try{inst.kind=id==='buddy_ted'?await makeTed(inst):KINDS[id]?.(inst)}catch(e){console.warn('buddy',id,e)}
  if(!inst.kind||!insts.has(cv)){insts.delete(cv);return}
  inst.actor=inst.kind.obj;if(id!=='buddy_ted'){inst.actor.children[0].scale.multiplyScalar(1.5);inst.kind.top*=1.5;inst.kind.speed*=1.3}inst.scene.add(inst.actor);inst.top=inst.kind.top;inst.shadow.scale.setScalar(id==='buddy_ted'?1:1.2);
  inst.cam=new T.OrthographicCamera(-1,1,1,-1,.01,20);inst.cam.position.set(0,.55,3);inst.cam.lookAt(0,.2,0);
  layout(inst);inst.actor.position.x=rnd(-inst.half*.6,inst.half*.6);inst.actor.rotation.y=inst.kind.faceYaw}
function layout(inst){const r=inst.cv.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);const w=Math.max(2,Math.round(r.width*dpr)),h=Math.max(2,Math.round(r.height*dpr));
  if(inst.cv.width!==w||inst.cv.height!==h){inst.cv.width=w;inst.cv.height=h}
  const viewH=inst.card?.62:.56,aspect=w/h,c=inst.cam;c.top=viewH*.62;c.bottom=-viewH*.38;c.left=-viewH*aspect/2;c.right=viewH*aspect/2;c.updateProjectionMatrix();
  inst.half=Math.max(.05,viewH*aspect/2-.16);inst.w=w;inst.h=h}
function detach(cv){const i=insts.get(cv);if(!i)return;insts.delete(cv);io.unobserve(cv);i.scene.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh){o.geometry?.dispose()}})}

/* brain: idle → wander → do something → idle */
function think(inst,dt){const k=inst.kind,a=inst.actor;inst.timer-=dt;k.moving=inst.state==='walk';
  if(inst.state==='idle'){a.rotation.y=angLerp(a.rotation.y,k.faceYaw,dt*3);
    if(inst.timer<=0){if(Math.random()<(k.walkChance??.55)&&inst.half>.1){inst.target=rnd(-inst.half,inst.half);if(Math.abs(inst.target-a.position.x)<.08)inst.target=-a.position.x;inst.dir=Math.sign(inst.target-a.position.x)||1;k.dir=inst.dir;inst.state='walk';inst.sp=0;k.walkStart?.()}
      else{const names=Object.keys(k.actions),tot=names.reduce((a,n)=>a+(k.actions[n].w??1),0);let r=Math.random()*tot,n=names[0];for(const x of names){r-=k.actions[x].w??1;if(r<=0){n=x;break}}inst.act=k.actions[n];inst.actT=0;inst.state='act';inst.act.start?.(inst);inst.timer=inst.act.dur}}}
  else if(inst.state==='walk'){a.rotation.y=angLerp(a.rotation.y,k.walkFacing(inst.dir),dt*6);inst.sp=lerp(inst.sp||0,Math.min(k.speed,Math.abs(inst.target-a.position.x)*3+.02),Math.min(1,dt*4));a.position.x+=inst.dir*inst.sp*dt;k.walkTick?.(dt,inst.t);
    if((inst.target-a.position.x)*inst.dir<=0){a.position.x=inst.target;inst.state='idle';inst.timer=rnd(1,3.5);k.walkStop?.()}}
  else if(inst.state==='act'){inst.actT+=dt;a.rotation.y=angLerp(a.rotation.y,inst.act.yaw??k.faceYaw,dt*4);inst.act.tick?.(inst.actT,inst);
    if(inst.timer<=0){inst.act.end?.(inst);inst.act=null;inst.state='idle';inst.timer=rnd(1.5,4)}}
  inst.shadow.position.x=a.position.x;inst.shadow.scale.setScalar(1-Math.min(.5,a.position.y*3));
  k.update?.(dt,inst.t,inst);
  for(const s of inst.fx.slice()){s.userData.life-=dt;s.position.y+=s.userData.vy*dt;s.material.opacity=Math.min(1,s.userData.life);if(s.userData.life<=0){inst.scene.remove(s);s.material.map.dispose();s.material.dispose();inst.fx.splice(inst.fx.indexOf(s),1)}}}

/* ---------- loop ---------- */
let last=performance.now(),acc=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.1,(now-last)/1000);last=now;acc+=dt;if(acc<1/30||document.hidden)return;const step=acc;acc=0;
  const r=renderer();
  for(const inst of insts.values()){if(!inst.cv.isConnected){if(!inst.goneAt)inst.goneAt=now;else if(now-inst.goneAt>4000)detach(inst.cv);continue}if(!inst.kind||!inst.visible)continue;
    inst.t+=step;think(inst,step);
    const rect=inst.cv.getBoundingClientRect();if(!rect.width)continue;if(Math.abs(rect.width*Math.min(2,devicePixelRatio||1)-inst.w)>2)layout(inst);
    ensureSize(inst.w,inst.h);r.setViewport(0,0,inst.w,inst.h);r.setScissor(0,0,inst.w,inst.h);r.setScissorTest(true);r.clear();r.render(inst.scene,inst.cam);
    inst.ctx.clearRect(0,0,inst.w,inst.h);inst.ctx.drawImage(r.domElement,0,glH-inst.h,inst.w,inst.h,0,0,inst.w,inst.h)}}
requestAnimationFrame(frame);

/* pick up buddy canvases as Lumen renders them */
const scan=root=>root.querySelectorAll?.('canvas[data-buddy]').forEach(cv=>attach(cv));
new MutationObserver(ms=>{for(const m of ms){m.addedNodes.forEach(n=>{if(n.nodeType!==1)return;if(n.matches('canvas[data-buddy]'))attach(n);else scan(n)})}}).observe(document.body,{childList:true,subtree:true});
scan(document);
window.Lumen.buddies={count:()=>insts.size,insts};
