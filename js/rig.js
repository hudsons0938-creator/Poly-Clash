/* Character models + animation system.
   Blocky jointed rig (shoulders, elbows, hips, knees, waist, neck), 20 looks and 5 fighting styles.
   Poses are flat objects: tx/ty/tz=torso, hx/hy=head, la?, ra?=arms, ll?, rl?=legs (x=swing, o=outward, b=bend),
   y=body height offset, rx/ry/rz=whole-body rotation. Negative arm/leg x = forward. */
(function(){
const T=()=>window.THREE;
const ARCH=["Striker","Monk","Ronin","Brawler","Reaper","Warden","Phantom","Titan","Hunter","Sage","Knight","Viper","Samurai","Gladiator","Mage","Berserker","Assassin","Guardian","Specter","Champion"];
// fighting style per archetype: 0 Boxer, 1 Martial artist, 2 Ninja/blade, 3 Heavy, 4 Phantom
const STYLE=[0,1,2,0,4,3,4,3,4,1,3,2,2,0,1,0,2,3,4,1];
const STYLE_NAMES=["Boxer","Martial Artist","Ninja","Heavyweight","Phantom"];
const SKIN=[0xffdbac,0xf1c27d,0xe0ac69,0xc68642,0x8d5524,0x5c3a1e];
const HAIR=[0x111111,0x2b1b0e,0x6b3e1f,0xd9b44a,0xf2f2f2,0xb3202a,0x2950c8,0x8e3fd1,0x1fa36a,0xff7ab8];
const mats={};
function mat(c,o){const k=c+"|"+(o?JSON.stringify(o):"");if(!mats[k])mats[k]=new (T().MeshStandardMaterial)(Object.assign({color:c,roughness:.55,metalness:.05},o||{}));return mats[k]}
const faces={};
function faceMat(skin,kind,eye){const k=skin+"_"+kind+"_"+eye;if(faces[k])return faces[k];
 const c=document.createElement("canvas");c.width=c.height=64;const x=c.getContext("2d");
 x.fillStyle="#"+skin.toString(16).padStart(6,"0");x.fillRect(0,0,64,64);
 const ec=eye||"#111";
 if(kind===1){x.fillStyle="#eee";x.fillRect(6,10,52,40);x.fillStyle="#111";x.fillRect(14,24,12,6);x.fillRect(38,24,12,6);x.fillStyle="#b00";x.fillRect(24,40,16,3)}// mask
 else{
  x.fillStyle="#fff";x.fillRect(13,25,13,10);x.fillRect(38,25,13,10);
  x.fillStyle=ec;x.fillRect(18,26,8,9);x.fillRect(38,26,8,9);
  x.fillStyle="#fff";x.fillRect(20,27,3,3);x.fillRect(40,27,3,3);
  x.fillStyle="#1a1a1a";x.save();x.translate(19,21);x.rotate(.28);x.fillRect(-8,-2,16,4);x.restore();x.save();x.translate(45,21);x.rotate(-.28);x.fillRect(-8,-2,16,4);x.restore();
  if(kind===2){x.fillStyle="#222";x.fillRect(4,40,56,24)}// lower mask
  else{x.fillStyle="#5a2a1a";x.fillRect(25,46,14,3)}
 }
 const t=new (T().CanvasTexture)(c);t.magFilter=T().NearestFilter;
 const sm=mat(skin);faces[k]=[sm,sm,sm,sm,new (T().MeshStandardMaterial)({map:t,roughness:.6}),sm];return faces[k]}
function box(w,h,d,m,x,y,z,parent){const b=new (T().Mesh)(new (T().BoxGeometry)(w,h,d),m);b.position.set(x||0,y||0,z||0);b.castShadow=true;b.receiveShadow=false;if(parent)parent.add(b);return b}
function piv(x,y,z,parent){const g=new (T().Group)();g.position.set(x,y,z);parent.add(g);return g}
function cone(r,h,m,x,y,z,parent,rx,rz){const c=new (T().Mesh)(new (T().ConeGeometry)(r,h,5),m);c.position.set(x,y,z);c.rotation.set(rx||0,0,rz||0);c.castShadow=true;parent.add(c);return c}

/* look = {id, shirt, pants, skin, hair, arch, glow} */
function lookFor(id,shirt){
 const a=Math.floor(id/20)%20;let s=id*2654435761>>>0;const r=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296};
 return{id,arch:a,style:STYLE[a],shirt:shirt,pants:[0x1c1c22,0x2a2f45,0x3b2a20,0x202a20,0x111111][Math.floor(r()*5)],skin:SKIN[Math.floor(r()*SKIN.length)],hair:HAIR[Math.floor(r()*HAIR.length)]}
}
function build(look,glow){
 const g=new (T().Group)(),root=piv(0,0,0,g);
 const big=look.style===3?1.12:1;root.scale.set(big,big,big);
 const sh=mat(look.shirt),pa=mat(look.pants),sk=mat(look.skin),hr=mat(look.hair),dk=mat(0x151515),gl=mat(glow||0xffffff,{emissive:glow||0xffffff,emissiveIntensity:.6});
 const hips=piv(0,2.05,0,root);
 box(1.3,.55,.7,pa,0,.05,0,hips);// pelvis
 const torso=piv(0,.3,0,hips);
 box(1.45,1.25,.72,sh,0,.65,0,torso);// chest
 box(1.5,.18,.75,dk,0,.08,0,torso);// belt
 const neck=piv(0,1.3,0,torso);
 const head=box(.95,.95,.95,faceMat(look.skin,[4,6,16,11].indexOf(look.arch)>=0?(look.arch===6?1:2):0,look.arch===18?"#38f":"#111"),0,.52,0,neck);
 const arm=s=>{const sp=piv(s*.95,1.12,0,torso);box(.5,.85,.5,sh,0,-.38,0,sp);const el=piv(0,-.8,0,sp);box(.46,.8,.46,sk,0,-.38,0,el);const hand=box(.5,.36,.5,look.arch===3||look.arch===13?mat(0xf5f5f5):sk,0,-.86,0,el);return{sp,el,hand}};
 const leg=s=>{const hp=piv(s*.36,-.15,0,hips);box(.6,.95,.62,pa,0,-.45,0,hp);const kn=piv(0,-.9,0,hp);box(.56,.85,.58,pa,0,-.4,0,kn);box(.6,.25,.82,dk,0,-.86,.1,kn);return{hp,kn}};
 const L=arm(1),R=arm(-1),LL=leg(1),RL=leg(-1);
 // fists glow with weapon colour
 const fg=s=>{const m=new (T().Mesh)(new (T().BoxGeometry)(.56,.4,.56),gl);m.position.y=-.86;m.visible=false;(s>0?L:R).el.add(m);return m};
 const glowL=fg(1),glowR=fg(-1);
 accessory(look,head,torso,neck,hr,sh);
 return{g,root,hips,torso,neck,head,L,R,LL,RL,glow:[glowL,glowR],cur:{},look,chest:torso};
}
function accessory(look,head,torso,neck,hr,sh){
 const a=look.arch,H=head,top=.48,gold=mat(0xd8ad3d,{metalness:.6,roughness:.3}),steel=mat(0x8a8f99,{metalness:.7,roughness:.35}),cloth=mat(0x1b1b1b);
 const spiky=(n,m,h)=>{for(let i=0;i<n;i++){const ang=i/n*6.283;cone(.22,h||.6,m||hr,Math.cos(ang)*.28,top+.2,Math.sin(ang)*.28-.05,H,Math.sin(ang)*.6,-Math.cos(ang)*.6)}cone(.25,(h||.6)+.15,m||hr,0,top+.3,0,H)};
 const cap=m=>box(1.02,.28,1.02,m||hr,0,top-.02,0,H);
 const cape=c=>{const p=new (T().Mesh)(new (T().BoxGeometry)(1.4,2.4,.08),mat(c));p.position.set(0,-.2,-.42);p.rotation.x=.12;p.castShadow=true;torso.add(p)};
 const hood=c=>{const m=mat(c);box(1.12,.3,1.1,m,0,top+.06,-.02,H);box(1.12,1.05,.2,m,0,0,-.52,H);box(.15,1.05,1.05,m,.56,0,0,H);box(.15,1.05,1.05,m,-.56,0,0,H)};
 const pads=m=>{box(.7,.3,.7,m,.95,1.25,0,torso);box(.7,.3,.7,m,-.95,1.25,0,torso)};
 const helm=(m,visor)=>{box(1.08,.55,1.08,m,0,.25,0,H);box(1.08,.9,.16,m,0,0,-.5,H);box(.12,.9,1.08,m,.52,0,0,H);box(.12,.9,1.08,m,-.52,0,0,H);if(visor)box(1.0,.2,.1,mat(0x111111),0,0,.5,H)};
 switch(a){
  case 0:spiky(6);box(1.0,.14,1.0,mat(0xc62828),0,.2,0,H);break;
  case 1:{const t=new (T().Mesh)(new (T().TorusGeometry)(.55,.1,6,14),mat(0x6b3e1f));t.rotation.x=Math.PI/2;t.position.y=1.2;torso.add(t);break}
  case 2:cap();box(.3,1.1,.3,hr,0,-.1,-.6,H);box(1.0,.25,.9,mat(0x8b0000),0,1.25,0,torso);break;
  case 3:cap();break;
  case 4:hood(0x1a1a1a);cape(0x111111);break;
  case 5:helm(steel);pads(steel);break;
  case 6:cap(mat(0x222222));cape(0x3a0f4a);break;
  case 7:pads(mat(0x5a3a1a));box(1.6,.3,.8,gold,0,.1,0,torso);break;
  case 8:box(1.04,.24,1.04,mat(0x355e3b),0,top,0,H);box(1.04,.06,.5,mat(0x355e3b),0,top-.1,.7,H);box(1.0,.25,.9,mat(0x7a5a2a),0,1.25,0,torso);break;
  case 9:cap(mat(0xf2f2f2));box(.7,.5,.2,mat(0xf2f2f2),0,-.55,.45,H);box(.3,1.2,.3,mat(0xf2f2f2),0,-.1,-.6,H);break;
  case 10:helm(steel,true);pads(steel);cone(.12,.5,mat(0xc62828),0,.75,0,H);break;
  case 11:for(let i=0;i<5;i++)box(.18,.5,.22,hr,0,top+.2,-.4+i*.2,H);break;
  case 12:cap();{const k=new (T().Mesh)(new (T().SphereGeometry)(.22,8,6),hr);k.position.set(0,top+.3,-.1);H.add(k)}pads(mat(0x8b0000));break;
  case 13:helm(gold);box(.15,.5,1.1,mat(0xc62828),0,.7,0,H);break;
  case 14:cone(.75,1.5,mat(0x3b2a7a),0,top+.75,0,H);box(1.5,.08,1.5,mat(0x3b2a7a),0,top+.02,0,H);break;
  case 15:spiky(8,hr,.5);cone(.16,.7,mat(0xf5f0e0),.5,top+.1,0,H,0,-.9);cone(.16,.7,mat(0xf5f0e0),-.5,top+.1,0,H,0,.9);break;
  case 16:hood(0x2a2a3a);break;
  case 17:helm(gold,true);cape(0x1d3f8a);break;
  case 18:spiky(7,mat(0x9fd3ff,{emissive:0x3388ff,emissiveIntensity:.5}),.8);cape(0x0d1b3a);break;
  case 19:spiky(5,gold,.7);cape(0xb3202a);break;
 }
}
// ---------- animation ----------
const lerp=(a,b,t)=>a+(b-a)*t;
const KEYS=["tx","ty","tz","hx","hy","lax","lao","lab","rax","rao","rab","llx","llo","llb","rlx","rlo","rlb","y","rx","ry","rz"];
function mix(a,b,t){const o={};for(const k of KEYS)o[k]=lerp(a[k]||0,b[k]||0,t);return o}
const ss=t=>t*t*(3-2*t);
function sample(keys,t){// keys: [[time,pose],...] time 0..1
 if(t<=keys[0][0])return keys[0][1];
 for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const a=keys[i-1],b=keys[i];return mix(a[1],b[1],ss((t-a[0])/(b[0]-a[0]||1)))}
 return keys[keys.length-1][1];
}
// guard stances per style
const GUARD=[
 {lax:-.9,lao:-.25,lab:1.9,rax:-.75,rao:-.25,rab:1.9,tx:.12,ty:.25,llx:-.25,rlx:.2,llb:.3,rlb:.3,y:-.1},// boxer
 {lax:-1.1,lao:.1,lab:.9,rax:-.5,rao:-.1,rab:1.6,tx:.05,ty:.45,llx:-.4,rlx:.35,llo:.15,rlo:.15,llb:.4,rlb:.4,y:-.2},// martial
 {lax:.3,lao:.2,lab:.4,rax:-.6,rao:-.3,rab:1.4,tx:.25,ty:.2,llx:-.35,rlx:.3,llb:.5,rlb:.5,y:-.25},// ninja
 {lax:-.5,lao:.35,lab:1.3,rax:-.5,rao:.35,rab:1.3,tx:.15,llo:.12,rlo:.12,llb:.2,rlb:.2,y:-.05},// heavy
 {lax:.1,lao:.35,lab:.3,rax:.1,rao:.35,rab:.3,tx:-.05,hx:.15,llb:.1,rlb:.1}// phantom (loose, arms out)
];
function loco(f,time){
 const st=f.look?f.look.style:0,G=GUARD[st],p=f.ph||0,s=Math.sin(p),c=Math.cos(p);
 if(f.anState==="ragdoll")return{rx:-1.35+(f.spin||0),lax:-2.6,lao:.6,rax:-2.6,rao:.6,llx:-.4,llo:.3,rlx:.2,rlo:.3,hx:-.4,y:-1.3};
 if(f.anState==="down")return{rx:-1.5,lax:-2.8,lao:.3,rax:-2.8,rao:.3,llo:.15,rlo:.15,y:-1.7};
 if(f.anState==="stun"){const w=Math.sin(time*18)*.06;return{tx:-.35,hx:-.45+w,lax:.2,lao:.35,rax:.25,rao:.35,lab:.3,rab:.3,llb:.35,rlb:.2,y:-.15,rz:w}}
 if(f.anState==="block")return{lax:-1.45,lao:-.55,lab:1.9,rax:-1.45,rao:-.55,rab:1.9,tx:.2,hx:.15,llx:-.3,rlx:.3,llb:.5,rlb:.5,y:-.3};
 if(f.anState==="carry"){const w=f.mv?s:0;return{lax:-2.95,lao:.15,lab:.35,rax:-2.95,rao:.15,rab:.35,tx:-.05,llx:w*.5,rlx:-w*.5,llb:Math.max(0,-c)*.6,rlb:Math.max(0,c)*.6}}
 if(f.anState==="air"){const up=f.vy>0;return{lax:-.6,lao:.5,lab:.8,rax:-.4,rao:.5,rab:.8,llx:-.7,llb:up?1.3:.5,rlx:.2,rlb:up?.9:.3,tx:.1}}
 if(f.anState==="run"){
  if(st===2||st===4)return{tx:.75,hx:-.45,lax:1.25,lao:.15,lab:.15,rax:1.25,rao:.15,rab:.15,llx:s*1.25,rlx:-s*1.25,llb:Math.max(0,-c)*1.6+.2,rlb:Math.max(0,c)*1.6+.2,y:-.25+Math.abs(c)*.18};// arms-back sprint
  return{tx:.38,hx:-.2,ty:s*.12,lax:-s*1.25-.15,lab:1.5,rax:s*1.25-.15,rab:1.5,llx:s*1.2,rlx:-s*1.2,llb:Math.max(0,-c)*1.5+.15,rlb:Math.max(0,c)*1.5+.15,y:-.15+Math.abs(c)*.2};
 }
 if(f.anState==="walk"){const g=mix(G,{},.5);return Object.assign(g,{tx:.1,ty:s*.08,lax:(G.lax||0)*.4-s*.55,rax:(G.rax||0)*.4+s*.55,llx:s*.7,rlx:-s*.7,llb:Math.max(0,-c)*.8,rlb:Math.max(0,c)*.8,llo:0,rlo:0,y:Math.abs(c)*.08-.03})}
 const b=Math.sin(time*2.2)*.04;return Object.assign({},G,{y:(G.y||0)+b,tx:(G.tx||0)+b*.5});
}
// ---------- action animations ----------
// M1 sets: 4 hits per style
const P=(o)=>o;
const M1=[
 [// boxer: jab, cross, hook, haymaker
  [[0,P({ty:.4,lax:-.9,lab:1.9,rax:-.8,rab:1.9,tx:.1})],[.35,P({ty:-.3,lax:-1.6,lab:.1,lao:-.1,rax:-.8,rab:1.9,tx:.25,llx:-.4,rlx:.3})],[1,P({ty:.2,lax:-1.0,lab:1.6,rax:-.8,rab:1.9,tx:.12})]],
  [[0,P({ty:-.2,rax:-.8,rab:1.9,lax:-.9,lab:1.9})],[.35,P({ty:.6,rax:-1.65,rab:.05,rao:-.1,lax:-.7,lab:1.9,tx:.3,llx:-.45,rlx:.4})],[1,P({ty:.1,rax:-.8,rab:1.9,lax:-.9,lab:1.9,tx:.1})]],
  [[0,P({ty:.5,lax:-1.2,lao:.9,lab:1.6,rax:-.8,rab:1.9})],[.4,P({ty:-.8,lax:-1.4,lao:-.6,lab:1.5,rax:-.8,rab:1.9,tx:.2,llx:-.3,rlx:.3})],[1,P({ty:-.2,lax:-.9,lab:1.8,rax:-.8,rab:1.9})]],
  [[0,P({ty:-.6,rax:-.3,rao:.9,rab:1.2,lax:-.9,lab:1.9,tx:-.1,y:-.2})],[.45,P({ty:1.0,rax:-1.7,rao:-.2,rab:.0,lax:-.3,lab:1.4,tx:.45,llx:-.6,rlx:.5,y:-.1})],[1,P({ty:.4,rax:-1.0,rab:1.2,lax:-.8,lab:1.8,tx:.2})]]
 ],
 [// martial: palm, elbow, knee, spin kick
  [[0,P({ty:.4,lax:-.6,lab:1.4})],[.35,P({ty:-.4,lax:-1.55,lab:0,lao:.0,rax:-.4,rab:1.6,tx:.2,llx:-.5,rlx:.4,y:-.2})],[1,P({ty:.2,lax:-1,lab:.9,rax:-.5,rab:1.6})]],
  [[0,P({ty:-.5,rax:-.6,rao:.8,rab:2.2})],[.4,P({ty:.7,rax:-1.2,rao:-.4,rab:2.4,lax:-.6,lab:1.4,tx:.25,llx:-.4,rlx:.3})],[1,P({ty:.2,rax:-.6,rab:1.6,lax:-1,lab:.9})]],
  [[0,P({lax:-1.2,lab:1.8,rax:-1.2,rab:1.8,tx:.2})],[.4,P({lax:-1.5,lab:2.0,rax:-1.5,rab:2.0,tx:.35,rlx:-1.6,rlb:2.0,y:.3})],[1,P({lax:-1,lab:.9,rax:-.5,rab:1.6})]],
  [[0,P({ry:0,lax:-.3,lao:.6,rax:-.3,rao:.6,tx:-.1})],[.5,P({ry:3.14,rlx:-1.3,rlo:.9,tx:-.35,lax:.2,lao:1.0,rax:.2,rao:1.0,y:.25})],[1,P({ry:6.28,lax:-1,lab:.9,rax:-.5,rab:1.6})]]
 ],
 [// ninja: quick slash-chops and a flip kick
  [[0,P({rax:.2,rao:.9,rab:.3,tx:.3})],[.3,P({rax:-1.4,rao:-.5,rab:.1,ty:-.6,tx:.4,llx:-.6,rlx:.5,y:-.3})],[1,P({rax:-.6,rab:1.4,tx:.25})]],
  [[0,P({lax:.2,lao:.9,lab:.3,tx:.3})],[.3,P({lax:-1.4,lao:-.5,lab:.1,ty:.6,tx:.4,llx:-.5,rlx:.5,y:-.3})],[1,P({lax:.3,lab:.4,tx:.25})]],
  [[0,P({tx:.2,y:-.3})],[.35,P({rlx:-1.5,rlo:.3,lax:.5,lao:.6,rax:.5,rao:.6,tx:-.3,ry:-.5,y:.1})],[1,P({tx:.25})]],
  [[0,P({tx:.5,y:-.6,llb:1.2,rlb:1.2})],[.5,P({rx:-2.2,rlx:-1.6,llx:-.4,llb:1.2,y:1.0,lax:.6,rax:.6})],[1,P({rx:-6.28,tx:.25,y:0})]]
 ],
 [// heavy: hammer fists
  [[0,P({lax:-2.2,lab:1.2,tx:-.15})],[.45,P({lax:-1.2,lab:.2,tx:.4,ty:-.3,y:-.2})],[1,P({lax:-.5,lab:1.3,tx:.15})]],
  [[0,P({rax:-2.2,rab:1.2,tx:-.15})],[.45,P({rax:-1.2,rab:.2,tx:.4,ty:.3,y:-.2})],[1,P({rax:-.5,rab:1.3,tx:.15})]],
  [[0,P({ty:-.8,lax:-.4,lao:1.2,rax:-.4,rao:1.2})],[.45,P({ty:.8,lax:-1.5,lao:-.3,rax:-1.2,rao:.4,tx:.25})],[1,P({lax:-.5,lab:1.3,rax:-.5,rab:1.3})]],
  [[0,P({lax:-3.0,lab:.3,rax:-3.0,rab:.3,tx:-.3,y:.1})],[.5,P({lax:-1.0,lab:.1,rax:-1.0,rab:.1,tx:.8,y:-.6,llb:.8,rlb:.8,llx:-.5})],[1,P({lax:-.5,lab:1.3,rax:-.5,rab:1.3,tx:.15})]]
 ],
 [// phantom: claw swipes and a shadow palm
  [[0,P({rax:-.4,rao:1.2,rab:.3})],[.3,P({rax:-1.5,rao:-.7,rab:.2,ty:-.5,tx:.2})],[1,P({rax:.1,rao:.35,rab:.3})]],
  [[0,P({lax:-.4,lao:1.2,lab:.3})],[.3,P({lax:-1.5,lao:-.7,lab:.2,ty:.5,tx:.2})],[1,P({lax:.1,lao:.35,lab:.3})]],
  [[0,P({lax:-2.5,rax:-2.5,lab:.3,rab:.3})],[.35,P({lax:-1.4,rax:-1.4,lao:-.3,rao:-.3,tx:.35,y:-.2})],[1,P({lax:.1,rax:.1})]],
  [[0,P({rax:.6,rab:1.8,ty:-.9,tx:-.1})],[.4,P({rax:-1.6,rab:0,ty:.7,tx:.45,llx:-.6,rlx:.5,lax:.6,lao:.6})],[1,P({rax:.1,rao:.35})]]
 ]
];
const A={
 uppercut:[[0,{rax:.3,rab:1.6,tx:.3,y:-.6,llb:1,rlb:1}],[.45,{rax:-3.0,rab:.1,rao:-.1,tx:-.25,ty:.4,y:.4,llx:.2,rlx:-.4}],[1,{rax:-2.4,rab:.4,y:.2}]],
 downslam:[[0,{lax:-3.0,rax:-3.0,lab:.4,rab:.4,tx:-.4,llb:1.2,rlb:1.2}],[.45,{lax:-.8,rax:-.8,lab:.1,rab:.1,tx:.9,llb:.4,rlb:.4}],[1,{lax:-.4,rax:-.4,tx:.5}]],
 dashpunch:[[0,{rax:.4,rab:1.4,tx:.5,llx:-.8,rlx:.8}],[.3,{rax:-1.65,rab:0,ty:.5,tx:.6,llx:-1.0,rlx:1.0,llb:.6,y:-.3}],[1,{rax:-1.4,rab:.2,tx:.4}]],
 throw:[[0,{lax:-3.0,rax:-3.0,lab:.3,rab:.3,tx:-.35}],[.4,{lax:-1.3,rax:-1.3,lab:.1,rab:.1,tx:.5,llx:-.5,rlx:.4}],[1,{lax:-.5,rax:-.5,tx:.2}]],
 pickup:[[0,{tx:.8,lax:-1.4,rax:-1.4,y:-.8,llb:1.4,rlb:1.4}],[1,{lax:-2.95,rax:-2.95,lab:.35,rab:.35}]],
 getup:[[0,{rx:-1.5,y:-1.7,lax:-2.8,rax:-2.8}],[.5,{rx:-.4,y:-.9,tx:.6,llb:1.6,rlb:1.6,lax:-.5,rax:-.5}],[1,{}]],
 dashF:[[0,{tx:.6,lax:1.0,rax:1.0,llx:-.6,rlx:.9,rlb:.8,y:-.3}],[1,{tx:.4,lax:.8,rax:.8,y:-.2}]],
 dashB:[[0,{tx:-.45,lax:-.8,lao:.5,rax:-.8,rao:.5,llx:-.7,rlx:-.3,y:-.15}],[1,{tx:-.2}]],
 dashL:[[0,{tz:.45,rz:.25,lax:-.3,lao:.9,rax:-.3,rao:.9,llo:.5,y:-.2}],[1,{tz:.2}]],
 dashR:[[0,{tz:-.45,rz:-.25,lax:-.3,lao:.9,rax:-.3,rao:.9,rlo:.5,y:-.2}],[1,{tz:-.2}]],
 parry:[[0,{lax:-1.45,lao:-.55,lab:1.9,rax:-1.45,rao:-.55,rab:1.9}],[.4,{lax:-.6,lao:1.3,rax:-.6,rao:1.3,tx:-.2}],[1,{}]],
 // skill animations
 thrust:[[0,{lax:.4,rax:.4,lab:1.6,rab:1.6,tx:-.2,ty:-.5}],[.35,{lax:-1.6,rax:-1.6,lab:0,rab:0,lao:-.25,rao:-.25,tx:.35,ty:0,llx:-.6,rlx:.5,y:-.25}],[1,{lax:-1.3,rax:-1.3,tx:.2}]],
 cast1:[[0,{rax:.6,rab:1.2,ty:-.7}],[.35,{rax:-1.65,rab:0,ty:.4,tx:.25,llx:-.5,rlx:.4}],[1,{rax:-1.2,ty:.2}]],
 stomp:[[0,{rlx:-1.5,rlb:1.2,lax:-.5,lao:.8,rax:-.5,rao:.8,y:.2}],[.45,{rlx:.1,rlb:.1,y:-.4,tx:.3,lao:1.1,rao:1.1}],[1,{tx:.1}]],
 spin:[[0,{lao:1.5,rao:1.5}],[.5,{ry:6.28,lao:1.5,rao:1.5,y:.2}],[1,{ry:12.56,lao:1.2,rao:1.2}]],
 rise:[[0,{y:-.6,llb:1.2,rlb:1.2,tx:.4}],[.4,{lax:-3.0,rax:-3.0,y:.6,tx:-.25}],[1,{lax:-2.8,rax:-2.8,tx:-.1}]],
 charge:[[0,{lax:.3,lao:.9,rax:.3,rao:.9,tx:.2,y:-.3,hx:.2}],[.5,{lax:.5,lao:1.2,rax:.5,rao:1.2,tx:.1,y:-.4}],[1,{lax:-2.6,rax:-2.6,y:.1}]],
 barrage:[[0,{lax:-1.6,lab:0,rax:-.8,rab:1.8,ty:-.3,tx:.3}],[.25,{rax:-1.6,rab:0,lax:-.8,lab:1.8,ty:.3,tx:.3}],[.5,{lax:-1.6,lab:0,rax:-.8,rab:1.8,ty:-.3,tx:.3}],[.75,{rax:-1.6,rab:0,lax:-.8,lab:1.8,ty:.3,tx:.3}],[1,{lax:-1.6,lab:0,rax:-.8,rab:1.8,ty:-.3,tx:.3}]],
 sweep:[[0,{y:-.8,llb:1.6,rlb:1.6,tx:.4}],[.5,{y:-1.0,rlx:-1.4,rlo:.9,ry:3.14,tx:.5,lax:.3,lao:.9}],[1,{y:-.5,ry:6.28,tx:.3}]],
 kickup:[[0,{rlx:.6,rlb:1.2,tx:.2}],[.4,{rlx:-2.6,rlb:0,tx:-.4,lax:.5,lao:.7,rax:.5,rao:.7,y:.2}],[1,{rlx:-.5,tx:0}]],
 awaken:[[0,{tx:.5,lax:.4,lao:.3,lab:1.8,rax:.4,rao:.3,rab:1.8,y:-.5,hx:.4,llb:.8,rlb:.8}],[.6,{tx:.5,lax:.5,lao:.35,lab:1.9,rax:.5,rao:.35,rab:1.9,y:-.55,hx:.45,llb:.8,rlb:.8}],[.8,{tx:-.3,lax:-.5,lao:1.4,rax:-.5,rao:1.4,hx:-.4,y:.2}],[1,{tx:-.2,lao:1.2,rao:1.2,hx:-.3}]],
 finisher:[[0,{lax:-3.0,rax:-3.0,lab:.2,rab:.2,y:.4,tx:-.3}],[.4,{lax:-3.0,rax:-3.0,lab:.2,rab:.2,y:.5,tx:-.35}],[.6,{lax:-1.5,rax:-1.5,lab:0,rab:0,tx:.6,y:-.3,llx:-.6,rlx:.5}],[1,{lax:-1.2,rax:-1.2,tx:.3}]]
};
function play(f,name,dur,keysOverride){f.act={keys:keysOverride||A[name]||A.thrust,t:0,dur:dur||.4,name};}
function m1Keys(f,i){return M1[f.look?f.look.style:0][i%4]}
function update(f,dt,time){
 let pose=loco(f,time);
 if(f.act){f.act.t+=dt/f.act.dur;if(f.act.t>=1&&!f.act.hold)f.act=null;else pose=mix(pose,sample(f.act.keys,Math.min(1,f.act.t)),Math.min(1,f.act.t*8+.4))}
 const c=f.rig.cur,k=1-Math.exp(-dt*(f.act?30:16));
 for(const key of KEYS){const v=pose[key]||0;c[key]=c[key]===undefined?v:c[key]+(v-c[key])*k}
 // big rotations (ry spins, flips) must not lag
 if(f.act){const raw=sample(f.act.keys,Math.min(1,f.act.t));c.ry=raw.ry||0;c.rx=Math.abs(raw.rx||0)>2?raw.rx:c.rx}
 apply(f.rig,c);
}
function apply(r,c){
 r.root.position.y=c.y;r.root.rotation.set(c.rx,c.ry,c.rz);
 r.torso.rotation.set(c.tx,c.ty,c.tz);r.neck.rotation.set(c.hx,c.hy,0);
 r.L.sp.rotation.set(c.lax,0,c.lao);r.L.el.rotation.x=-c.lab;
 r.R.sp.rotation.set(c.rax,0,-c.rao);r.R.el.rotation.x=-c.rab;
 r.LL.hp.rotation.set(c.llx,0,c.llo);r.LL.kn.rotation.x=c.llb;
 r.RL.hp.rotation.set(c.rlx,0,-c.rlo);r.RL.kn.rotation.x=c.rlb;
 // keep feet near the ground when crouching (y<0 lowers the hips)
 r.hips.position.y=2.05+Math.min(0,c.y)*.0;
}
window.Rig={build,lookFor,update,play,m1Keys,ARCH,STYLE,STYLE_NAMES,A};
})();
