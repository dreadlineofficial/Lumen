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

/* ---------- Ted (from models/ted.glb) ---------- */
let tedP=null;
const loadTed=()=>tedP||(tedP=new T.GLTFLoader().loadAsync(new URL('../models/ted.glb',import.meta.url).href));
function chairMesh(){const g=new T.Group(),wood=M(0x8a5a33,{roughness:.7}),dark=M(0x6b4325,{roughness:.75}),cush=M(0xb5342b,{roughness:.9});
  const seatY=.072,w=.19,d=.16,bz=-.075;
  g.add(mesh(new T.BoxGeometry(w,.016,d),wood,[0,seatY,bz]));                 // seat
  g.add(mesh(new T.BoxGeometry(w*.86,.012,d*.82),cush,[0,seatY+.013,bz+.004])); // cushion
  for(const sx of[-1,1])for(const sz of[-1,1])g.add(mesh(new T.BoxGeometry(.014,seatY,.014),dark,[sx*(w/2-.012),seatY/2,bz+sz*(d/2-.012)])); // legs
  for(const sx of[-1,1])g.add(mesh(new T.BoxGeometry(.014,.2,.014),dark,[sx*(w/2-.012),seatY+.1,bz-d/2+.008])); // back posts
  for(const y of[.13,.2,.255])g.add(mesh(new T.BoxGeometry(w-.02,.026,.01),wood,[0,seatY+y-.06,bz-d/2+.008])); // back slats
  const outer=new T.Group();g.scale.setScalar(.85);outer.add(g);return outer}
function phoneMesh(){const g=new T.Group();g.add(mesh(new T.BoxGeometry(.04,.075,.008),M(0xb08cff,{roughness:.35,metalness:.1})));
  g.add(mesh(new T.CircleGeometry(.005,12),M(0x222228),[.011,.026,-.0042]));
  const scr=mesh(new T.PlaneGeometry(.034,.066),new T.MeshBasicMaterial({color:0x7fb4ff}),[0,0,.0042]);g.add(scr);g.userData.scr=scr;return g}
function canMesh(){const g=new T.Group();const c=document.createElement('canvas');c.width=64;c.height=32;const x=c.getContext('2d');x.fillStyle='#d11f2b';x.fillRect(0,0,64,32);x.fillStyle='#fff';x.font='bold 15px sans-serif';x.fillText('FIZZ',12,22);
  g.add(mesh(new T.CylinderGeometry(.024,.024,.07,24),new T.MeshStandardMaterial({map:new T.CanvasTexture(c),roughness:.35,metalness:.3})));
  g.add(mesh(new T.CylinderGeometry(.021,.024,.008,24),M(0xcfd3da,{metalness:.8,roughness:.25}),[0,.039,0]));return g}
async function makeTed(inst){const gltf=await loadTed();const root=T.cloneSkinned(gltf.scene);
  root.traverse(o=>{if(o.isMesh){o.frustumCulled=false;if(o.material){o.material=o.material.clone();o.material.roughness=Math.max(.75,o.material.roughness??.8)}}});
  const mixer=new T.AnimationMixer(root),A={};for(const n of['walk_cycle','sit_phone','beer'])A[n]=mixer.clipAction(gltf.animations.find(a=>a.name===n));
  A.sit_phone.setLoop(T.LoopOnce);A.sit_phone.clampWhenFinished=true;A.beer.setLoop(T.LoopOnce);A.beer.clampWhenFinished=true;
  // a calm idle pose: the first frame of the drinking animation, held still
  const idle=mixer.clipAction(gltf.animations.find(a=>a.name==='beer').clone());idle.play();idle.paused=true;idle.time=0;let cur=idle;
  const fade=(to,d=.35)=>{if(to===cur)return;to.reset();to.play();if(to===idle){to.paused=true;to.time=0}cur.crossFadeTo(to,d,false);cur=to};
  const handR=root.getObjectByName('handR'),handL=root.getObjectByName('handL'),head=root.getObjectByName('head');const lv=new T.Vector3();
  const chair=chairMesh(),phone=phoneMesh(),can=canMesh();chair.visible=phone.visible=can.visible=false;
  const holder=new T.Group();holder.add(root);root.scale.setScalar(.85);inst.scene.add(chair);inst.scene.add(phone);inst.scene.add(can);
  const v=new T.Vector3(),hv=new T.Vector3();let prop=null,chairT=0,chairOn=false,yawFace=0;
  return{obj:holder,top:.44,speed:.11,
    walkStart(){fade(A.walk_cycle,.25)},walkStop(){fade(idle,.3)},
    walkFacing:d=>d>0?-.55:-(Math.PI-.55),faceYaw:0,
    actions:{
      sit:{yaw:.8,dur:A.sit_phone.getClip().duration+.2,start(){chairOn=true;chair.position.set(holder.position.x,0,0);fade(A.sit_phone,.3);prop=phone;phone.visible=true},end(){chairOn=false;phone.visible=false;prop=null;fade(idle,.4)}},
      drink:{dur:A.beer.getClip().duration,start(){fade(A.beer,.3);prop=can;can.visible=true},end(){can.visible=false;prop=null;fade(idle,.3)}},
      hop:{dur:1.1,start(){},tick(t){const k=(t*2)%1;holder.position.y=Math.sin(k*Math.PI)*.06;holder.scale.y=1-Math.max(0,.12-Math.sin(k*Math.PI)*.12)},end(){holder.position.y=0;holder.scale.y=1}},
      look:{dur:2.4,start(){},tick(t){holder.rotation.y=Math.sin(t*2.6)*.6},end(){}},
    },
    update(dt){mixer.update(dt);
      // the chair pops in and out with a little bounce
      if(chairOn){chair.position.x=holder.position.x;chair.rotation.y=holder.rotation.y}chairT=clamp(chairT+(chairOn?dt:-dt)*3.5,0,1);chair.visible=chairT>0;const u=chairT-1,s=chairOn?1+2.7*u*u*u+1.7*u*u:ease(chairT);chair.scale.setScalar(Math.max(.001,s));
      if(prop){root.updateMatrixWorld(true);handR.getWorldPosition(v);head.getWorldPosition(hv);if(prop===can){handL.getWorldPosition(lv);v.lerp(lv,.5)}prop.position.copy(v);
        if(prop===phone){prop.position.y+=.012;prop.position.z+=.02;prop.lookAt(hv);phone.userData.scr.material.color.setHSL(.6,.7,.62+Math.sin(performance.now()/300)*.06)}
        else{const drinking=clamp((v.y-.29)/.05,0,1);prop.position.z+=.03;prop.position.y-=.01;prop.rotation.set(-drinking*1.1,0,0)}}}}}

/* ---------- procedural buddies ---------- */
function makeBlob(){const g=new T.Group(),body=new T.Group();g.add(body);
  const mat=new T.MeshPhysicalMaterial({color:0x5cf0b5,roughness:.15,clearcoat:1,clearcoatRoughness:.1,sheen:.5,sheenColor:new T.Color(0xbfffe6)});
  const b=mesh(new T.SphereGeometry(.11,32,24),mat,[0,.1,0],[1,.85,1]);body.add(b);const e=eyes(.017,.06,.11,.085);body.add(e);
  const cheek=new T.MeshBasicMaterial({color:0xff8fb8,transparent:true,opacity:.6});for(const s of[-1,1])body.add(mesh(new T.CircleGeometry(.012,16),cheek,[s*.055,.085,.094]));
  let hopT=0;return{obj:g,top:.24,speed:.14,
    walkStart(){hopT=0},walkTick(dt){hopT+=dt*2.4;const k=hopT%1,h=Math.sin(k*Math.PI);body.position.y=h*.07;body.scale.set(1+(1-h)*.12*(k<.15||k>.85),1-(1-h)*.18*(k<.15||k>.85)+h*.06,1)},
    walkStop(){body.position.y=0;body.scale.set(1,1,1)},walkFacing:d=>d>0?.5:-.5,faceYaw:0,
    actions:{
      bounce:{dur:1.4,tick(t){const k=t/1.4,h=Math.sin(k*Math.PI);body.position.y=h*.2;body.rotation.y=ease(k)*TAU;body.scale.setScalar(1+h*.05)},end(){body.position.y=0;body.rotation.y=0;body.scale.set(1,1,1)}},
      melt:{dur:2.2,tick(t){const k=t<1?ease(t):t>1.6?1-ease((t-1.6)/.6):1;body.scale.set(1+k*.45,1-k*.55,1+k*.45)},end(){body.scale.set(1,1,1)}},
      wiggle:{dur:1.6,tick(t){body.rotation.z=Math.sin(t*18)*.15*(1-t/1.6)},end(){body.rotation.z=0}},
    },update(dt,t){if(!this.moving)b.scale.y=.85+Math.sin(t*3)*.02}}}
function makeBot(){const g=new T.Group(),body=new T.Group();g.add(body);
  const shell=M(0xe8ecf3,{roughness:.35,metalness:.2}),dark=M(0x1d222c,{roughness:.3}),glow=new T.MeshBasicMaterial({color:0x4dd8ff});
  body.add(mesh(new T.BoxGeometry(.13,.1,.1),shell,[0,.1,0]));const head=new T.Group();head.position.set(0,.19,0);body.add(head);
  head.add(mesh(new T.BoxGeometry(.12,.08,.09),shell));head.add(mesh(new T.BoxGeometry(.1,.045,.01),dark,[0,0,.046]));
  const eL=mesh(new T.BoxGeometry(.018,.018,.004),glow,[-.025,0,.052]),eR=mesh(new T.BoxGeometry(.018,.018,.004),glow,[.025,0,.052]);head.add(eL,eR);
  head.add(mesh(new T.CylinderGeometry(.004,.004,.05),dark,[0,.065,0]));const tip=mesh(new T.SphereGeometry(.012,12,8),new T.MeshBasicMaterial({color:0xff5c7a}),[0,.093,0]);head.add(tip);
  const wheel=mesh(new T.CylinderGeometry(.035,.035,.09,20),dark,[0,.035,0]);wheel.rotation.z=Math.PI/2;body.add(wheel);
  for(const s of[-1,1])body.add(mesh(new T.BoxGeometry(.02,.06,.03),shell,[s*.078,.1,0]));
  return{obj:g,top:.3,speed:.12,
    walkStart(){},walkTick(dt,t){wheel.rotation.x+=dt*8;body.rotation.x=.08;head.rotation.z=Math.sin(t*10)*.03},walkStop(){body.rotation.x=0;head.rotation.z=0},
    walkFacing:d=>d>0?.9:-.9,faceYaw:0,
    actions:{
      scan:{dur:2.6,tick(t){head.rotation.y=Math.sin(t*3)*.9;glow.color.setHSL(.53+Math.sin(t*8)*.04,1,.6)},end(){head.rotation.y=0;glow.color.set(0x4dd8ff)}},
      spin:{dur:1.2,tick(t){body.rotation.y=ease(t/1.2)*TAU},end(){body.rotation.y=0}},
      beep:{dur:1.4,start(i){puff(i,'!','#ffd76a')},tick(t){body.position.y=Math.max(0,Math.sin(t*9))*.03;tip.material.color.setHSL(t*2%1,1,.6)},end(){body.position.y=0;tip.material.color.set(0xff5c7a)}},
    },update(dt,t){eL.scale.y=eR.scale.y=(t%3.2)<.12?.15:1}}}
function makePip(){const g=new T.Group(),body=new T.Group();g.add(body);const yel=M(0xffd84d,{roughness:.8}),org=M(0xff9a2e,{roughness:.6});
  body.add(mesh(new T.SphereGeometry(.075,24,18),yel,[0,.085,0]));const head=new T.Group();head.position.set(0,.17,.01);body.add(head);
  head.add(mesh(new T.SphereGeometry(.05,24,18),yel));head.add(eyes(.009,.04,.01,.043));const beak=mesh(new T.ConeGeometry(.012,.028,10),org,[0,-.005,.055]);beak.rotation.x=Math.PI/2;head.add(beak);
  head.add(mesh(new T.SphereGeometry(.012,8,6),yel,[0,.052,0]));
  const wings=[-1,1].map(s=>{const w=mesh(new T.SphereGeometry(.035,16,12),yel,[s*.072,.09,0],[.4,.8,1]);body.add(w);return w});
  for(const s of[-1,1])body.add(mesh(new T.BoxGeometry(.012,.02,.025),org,[s*.03,.008,.01]));
  return{obj:g,top:.26,speed:.1,
    walkStart(){},walkTick(dt,t){body.rotation.z=Math.sin(t*14)*.12;body.position.y=Math.abs(Math.sin(t*14))*.012},walkStop(){body.rotation.z=0;body.position.y=0},
    walkFacing:d=>d>0?.9:-.9,faceYaw:0,
    actions:{
      peck:{dur:2,tick(t){head.rotation.x=Math.max(0,Math.sin(t*9))*.9;head.position.y=.17-Math.max(0,Math.sin(t*9))*.03},end(){head.rotation.x=0;head.position.y=.17}},
      flap:{dur:1.8,start(i){puff(i,'♪','#ffe45c')},tick(t){const f=Math.sin(t*30);wings[0].rotation.z=.4+f*.6;wings[1].rotation.z=-.4-f*.6;body.position.y=Math.sin(Math.min(t/1.8,1)*Math.PI)*.07},end(){wings.forEach(w=>w.rotation.z=0);body.position.y=0}},
      tilt:{dur:1.6,tick(t){head.rotation.z=Math.sin(Math.min(t,1.2)/1.2*Math.PI)*.45},end(){head.rotation.z=0}},
    },update(){}}}
function makeBoo(){const g=new T.Group(),body=new T.Group();g.add(body);
  const pts=[];for(let i=0;i<=20;i++){const a=i/20;pts.push(new T.Vector2(Math.sin(a*Math.PI*.5+.0001)*.075*(a<.5?1:1),.2-a*.2))}
  const geo=new T.LatheGeometry([new T.Vector2(0,.22),...Array.from({length:14},(_,i)=>{const a=i/13;return new T.Vector2(Math.sin(a*Math.PI/2)*.08,.22-a*.12)}),new T.Vector2(.082,.06),new T.Vector2(.084,.02)],32);
  const pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const y=pos.getY(i);if(y<.03){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,y+Math.sin(Math.atan2(z,x)*6)*.012)}}geo.computeVertexNormals();
  const mat=new T.MeshPhysicalMaterial({color:0xf4f6ff,emissive:0x8fa6ff,emissiveIntensity:.25,roughness:.4,transparent:true,opacity:.92,side:T.DoubleSide});
  const sh=mesh(geo,mat,[0,.03,0]);body.add(sh);body.add(eyes(.013,.045,.18,.07));
  const mouth=mesh(new T.CircleGeometry(.01,16),new T.MeshBasicMaterial({color:0x222233}),[0,.15,.078]);mouth.scale.y=1.4;body.add(mouth);
  for(const s of[-1,1]){const arm=mesh(new T.SphereGeometry(.02,12,8),mat,[s*.085,.12,0],[1,.6,.8]);body.add(arm)}
  return{obj:g,top:.3,speed:.09,
    walkStart(){},walkTick(dt,t){body.rotation.z=-.1*Math.sign(this.dir||1)},walkStop(){body.rotation.z=0},walkFacing:d=>d>0?.6:-.6,faceYaw:0,
    actions:{
      spook:{dur:1.6,start(i){puff(i,'boo!','#cfd8ff')},tick(t){const k=Math.sin(Math.min(t/1.2,1)*Math.PI);body.scale.setScalar(1+k*.25);body.rotation.z=Math.sin(t*30)*.06*k},end(){body.scale.setScalar(1);body.rotation.z=0}},
      vanish:{dur:2.6,tick(t){mat.opacity=.92*(t<1?1-t:t>1.6?(t-1.6):0)},end(){mat.opacity=.92}},
      twirl:{dur:1.5,tick(t){body.rotation.y=ease(t/1.5)*TAU},end(){body.rotation.y=0}},
    },update(dt,t){body.position.y=.04+Math.sin(t*2.2)*.02}}}
function makeMochi(){const g=new T.Group(),body=new T.Group();g.add(body);const fur=M(0xf1e4d4,{roughness:.9}),pat=M(0xe08a3c,{roughness:.9}),pink=M(0xff9db8);
  const torso=mesh(new T.SphereGeometry(.07,24,18),fur,[0,.07,0],[1.35,.85,1]);body.add(torso);
  const head=new T.Group();head.position.set(.075,.13,0);body.add(head);head.add(mesh(new T.SphereGeometry(.052,24,18),fur));
  head.add(mesh(new T.SphereGeometry(.02,12,8),pat,[0,.035,.02]));
  for(const s of[-1,1]){const ear=mesh(new T.ConeGeometry(.018,.035,4),s<0?pat:fur,[0,.05,s*.03]);ear.rotation.x=s*.25;head.add(ear)}
  const ey=eyes(.008,.036,.008,.0);ey.rotation.y=Math.PI/2;ey.position.x=.047;head.add(ey);head.add(mesh(new T.SphereGeometry(.006,8,6),pink,[.052,-.008,0]));
  const curve=new T.CatmullRomCurve3([new T.Vector3(-.09,.08,0),new T.Vector3(-.13,.12,0),new T.Vector3(-.12,.18,0),new T.Vector3(-.09,.2,0)]);
  const tail=new T.Group();tail.position.set(-.08,.06,0);body.add(tail);const tm=mesh(new T.TubeGeometry(curve,16,.011,8),pat,[.08,-.06,0]);tail.add(tm);
  const legs=[[.05,.03],[.05,-.03],[-.05,.03],[-.05,-.03]].map(([x,z])=>{const l=mesh(new T.CylinderGeometry(.011,.011,.04,8),fur,[x,.02,z]);body.add(l);return l});
  let sleeping=false;
  return{obj:g,top:.24,speed:.1,
    walkStart(){},walkTick(dt,t){legs.forEach((l,i)=>l.rotation.z=Math.sin(t*16+(i%2?Math.PI:0))*.5);body.position.y=Math.abs(Math.sin(t*16))*.006},walkStop(){legs.forEach(l=>l.rotation.z=0);body.position.y=0},
    walkFacing:d=>d>0?-.35:-(Math.PI-.35),faceYaw:-Math.PI/2+.5,
    actions:{
      nap:{dur:6,start(i){sleeping=true},tick(t,i){const k=Math.min(t/.6,1)*(t>5.4?1-(t-5.4)/.6:1);body.scale.y=1-k*.3;head.position.y=.13-k*.05;if(((t*10)|0)%14===0&&Math.random()<.2)puff(i,'z','#cfd8ff')},end(){sleeping=false;body.scale.y=1;head.position.y=.13}},
      stretch:{dur:2,tick(t){const k=Math.sin(Math.min(t/2,1)*Math.PI);body.scale.x=1+k*.25;head.position.y=.13-k*.03;torso.rotation.z=-k*.15},end(){body.scale.x=1;head.position.y=.13;torso.rotation.z=0}},
      wag:{dur:2,tick(t){tail.rotation.x=Math.sin(t*14)*.5},end(){tail.rotation.x=0}},
    },update(dt,t){if(!sleeping)tail.rotation.z=Math.sin(t*2)*.15}}}
const KINDS={buddy_blob:makeBlob,buddy_bot:makeBot,buddy_pip:makePip,buddy_boo:makeBoo,buddy_mochi:makeMochi};

/* ---------- instances ---------- */
const insts=new Map();
const io=new IntersectionObserver(es=>es.forEach(e=>{const i=insts.get(e.target);if(i)i.visible=e.isIntersecting}));
function lights(scene){scene.add(new T.HemisphereLight(0xffffff,0x6b6680,2.1));const d=new T.DirectionalLight(0xfff2e0,2.2);d.position.set(1.2,2,2.4);scene.add(d);const r=new T.DirectionalLight(0x9fb4ff,1.1);r.position.set(-2,1,-1.5);scene.add(r)}
async function attach(cv){if(insts.has(cv))return;const id=cv.dataset.buddy;const card=cv.classList.contains('buddy-card')||cv.closest('.buddy-stage');
  const inst={cv,ctx:cv.getContext('2d'),scene:new T.Scene(),visible:true,fx:[],state:'idle',timer:rnd(.5,1.5),t:rnd(0,10),dir:1,target:0,act:null,card:!!card};insts.set(cv,inst);io.observe(cv);
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
    if(inst.timer<=0){if(Math.random()<.55&&inst.half>.1){inst.target=rnd(-inst.half,inst.half);if(Math.abs(inst.target-a.position.x)<.08)inst.target=-a.position.x;inst.dir=Math.sign(inst.target-a.position.x)||1;k.dir=inst.dir;inst.state='walk';k.walkStart?.()}
      else{const names=Object.keys(k.actions);const n=pick(names);inst.act=k.actions[n];inst.actT=0;inst.state='act';inst.act.start?.(inst);inst.timer=inst.act.dur}}}
  else if(inst.state==='walk'){a.rotation.y=angLerp(a.rotation.y,k.walkFacing(inst.dir),dt*6);a.position.x+=inst.dir*k.speed*dt;k.walkTick?.(dt,inst.t);
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
  for(const inst of insts.values()){if(!inst.cv.isConnected){detach(inst.cv);continue}if(!inst.kind||!inst.visible)continue;
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
