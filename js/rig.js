/* Character models + animation system.
   Detailed jointed rig: rounded body parts, fingers/knuckles, shoes with soles and laces, outfits per fighting
   style (tank top + hand wraps, gi + belt, ninja suit + scarf + arm guards, armour, long coat), 20 hair/headwear
   styles, anime faces with expressions, swaying capes/coat tails/scarves, and cel-style outlines.
   Each body segment is merged into ONE mesh with vertex colours so detailed fighters stay cheap to draw.
   Poses are flat objects: tx/ty/tz=torso, hx/hy=head, la?, ra?=arms, ll?, rl?=legs (x=swing, o=outward, b=bend),
   y=body height offset, rx/ry/rz=whole-body rotation. Negative arm/leg x = forward. */
(function(){
const T=()=>window.THREE;
const ARCH=["Striker","Monk","Ronin","Brawler","Reaper","Warden","Phantom","Titan","Hunter","Sage","Knight","Viper","Samurai","Gladiator","Mage","Berserker","Assassin","Guardian","Specter","Champion"];
// fighting style per archetype: 0 Boxer, 1 Martial artist, 2 Ninja/blade, 3 Heavy, 4 Phantom
const STYLE=[0,1,2,0,4,3,4,3,4,1,3,2,2,0,1,0,2,3,4,1];
const STYLE_NAMES=["Boxer","Martial Artist","Ninja","Heavyweight","Phantom"];
const SKIN=[0xffdbac,0xf1c27d,0xe0ac69,0xc68642,0x8d5524,0x5c3a1e];
const HAIR=[0x161616,0x2b1b0e,0x6b3e1f,0xd9b44a,0xe8e8e8,0xb3202a,0x2950c8,0x8e3fd1,0x1fa36a,0xff7ab8];
const EYES=["#3b2a1a","#1f5fd6","#2e9e4f","#b3202a","#d9a020","#7b3fd1","#111111"];
let LOW=false;
function setQuality(low){LOW=!!low}
// ---------- geometry helpers ----------
const shade=(c,k)=>{const C=new (T().Color)(c).multiplyScalar(k);C.r=Math.min(1,C.r);C.g=Math.min(1,C.g);C.b=Math.min(1,C.b);return C.getHex()};
const mixc=(a,b,t)=>{const A=new (T().Color)(a),B=new (T().Color)(b);return A.lerp(B,t).getHex()};
const gcache={};
function rbox(w,h,d,r){// rounded box with smooth normals
 const q=LOW?3:5,key=[w,h,d,r,q].map(v=>v.toFixed(3)).join("_");if(gcache[key])return gcache[key];
 r=Math.min(r,w/2-.001,h/2-.001,d/2-.001);
 const g=new (T().BoxGeometry)(w,h,d,q,q,q),p=g.attributes.position,n=g.attributes.normal;const H=[w/2,h/2,d/2],I=H.map(x=>x-r);
 const map=(u,a)=>{const i=Math.round((u+H[a])/(2*H[a])*q),ed=Math.min(i,q-i),s=i<q/2?-1:1;if(ed===0)return s*H[a];if(q===5&&ed===1)return s*(I[a]+r*.55);return s*I[a]};
 for(let i=0;i<p.count;i++){const v=[map(p.getX(i),0),map(p.getY(i),1),map(p.getZ(i),2)];const c=v.map((x,a)=>Math.max(-I[a],Math.min(I[a],x)));const dv=v.map((x,a)=>x-c[a]);const L=Math.hypot(dv[0],dv[1],dv[2]);
  if(L>1e-6){p.setXYZ(i,c[0]+dv[0]/L*r,c[1]+dv[1]/L*r,c[2]+dv[2]/L*r);n.setXYZ(i,dv[0]/L,dv[1]/L,dv[2]/L)}else p.setXYZ(i,v[0],v[1],v[2])}
 return gcache[key]=g}
const sph=(r)=>gcache["s"+r]||(gcache["s"+r]=new (T().SphereGeometry)(r,LOW?8:14,LOW?6:10));
const cyl=(a,b,h,s)=>{const k="c"+[a,b,h,s].join("_");return gcache[k]||(gcache[k]=new (T().CylinderGeometry)(a,b,h,s||(LOW?8:14)))};
const con=(r,h,s)=>{const k="k"+[r,h,s].join("_");return gcache[k]||(gcache[k]=new (T().ConeGeometry)(r,h,s||(LOW?5:7)))};
const tor=(R,r,arc)=>{const k="t"+[R,r,arc].join("_");return gcache[k]||(gcache[k]=new (T().TorusGeometry)(R,r,LOW?5:8,LOW?12:20,arc||Math.PI*2))};
// a builder collects coloured parts and merges them into one mesh
function Part(){const parts=[];const _m=new (T().Matrix4)(),_q=new (T().Quaternion)(),_e=new (T().Euler)(),_v=new (T().Vector3)(),_s=new (T().Vector3)();
 return{parts,add(geo,col,x,y,z,rx,ry,rz,sx,sy,sz){_e.set(rx||0,ry||0,rz||0);_q.setFromEuler(_e);_v.set(x||0,y||0,z||0);_s.set(sx||1,sy||1,sz||1);parts.push({geo,col,m:new (T().Matrix4)().compose(_v,_q,_s)});return this}}}
let MAT=null,OLMAT=null;
function mats(){if(MAT)return;MAT=new (T().MeshStandardMaterial)({vertexColors:true,roughness:.62,metalness:.04});
 OLMAT=new (T().MeshBasicMaterial)({color:0x0b0b0e,side:T().BackSide});OLMAT.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace("#include <begin_vertex>","vec3 transformed = vec3( position ) + normal * 0.032;")}}
function merge(P){if(!P.parts.length)return null;let nv=0,ni=0;const gs=P.parts.map(p=>{const g=p.geo.clone();g.applyMatrix4(p.m);nv+=g.attributes.position.count;ni+=g.index?g.index.count:g.attributes.position.count;return{g,col:new (T().Color)(p.col)}});
 const pos=new Float32Array(nv*3),nor=new Float32Array(nv*3),col=new Float32Array(nv*3),idx=new (nv>65535?Uint32Array:Uint16Array)(ni);let ov=0,oi=0;
 for(const {g,col:c} of gs){const pa=g.attributes.position,na=g.attributes.normal;pos.set(pa.array,ov*3);nor.set(na.array,ov*3);for(let i=0;i<pa.count;i++){col[(ov+i)*3]=c.r;col[(ov+i)*3+1]=c.g;col[(ov+i)*3+2]=c.b}
  if(g.index){for(let i=0;i<g.index.count;i++)idx[oi+i]=g.index.array[i]+ov;oi+=g.index.count}else{for(let i=0;i<pa.count;i++)idx[oi+i]=ov+i;oi+=pa.count}ov+=pa.count;g.dispose()}
 const G=new (T().BufferGeometry)();G.setAttribute("position",new (T().BufferAttribute)(pos,3));G.setAttribute("normal",new (T().BufferAttribute)(nor,3));G.setAttribute("color",new (T().BufferAttribute)(col,3));G.setIndex(new (T().BufferAttribute)(idx,1));G.computeBoundingSphere();return G}
function attach(P,parent){mats();const G=merge(P);if(!G)return null;const m=new (T().Mesh)(G,MAT);m.castShadow=true;parent.add(m);if(!LOW){const o=new (T().Mesh)(G,OLMAT);o.userData.ol=1;o.castShadow=false;parent.add(o)}return m}
function piv(x,y,z,parent){const g=new (T().Group)();g.position.set(x,y,z);parent.add(g);return g}
// ---------- faces ----------
const faces={};
function faceTex(look,ex){// ex: 0 normal, 1 angry/attacking, 2 hurt
 const k=look.id+"_"+ex;if(faces[k])return faces[k];
 const c=document.createElement("canvas");c.width=c.height=256;const x=c.getContext("2d");
 const st=look.style,a=look.arch,eye=look.eye,brow="#"+shade(look.hair,.55).toString(16).padStart(6,"0"),glowEye=a===18;
 const lowerMask=[4,11,16].indexOf(a)>=0;
 x.save();x.translate(128,132);x.scale(1.22,1.22);x.translate(-128,-128);
 // eyes
 const drawEye=(cx,side)=>{
  if(ex===2){x.strokeStyle="#1a1010";x.lineWidth=7;x.lineCap="round";x.beginPath();x.moveTo(cx-18*side,104);x.lineTo(cx+12*side,116);x.lineTo(cx-18*side,128);x.stroke();return}
  const hgt=ex===1?24:30,top=118-hgt/2;
  x.save();x.beginPath();x.moveTo(cx-24,118);x.quadraticCurveTo(cx-6*side,top-8,cx+24,top+4);x.quadraticCurveTo(cx+28,124,cx+16,132);x.quadraticCurveTo(cx-6,138,cx-24,118);x.closePath();
  x.fillStyle="#fbfbfb";x.fill();x.clip();
  const g=x.createRadialGradient(cx+2*side,120,2,cx+2*side,120,17);g.addColorStop(0,glowEye?"#e8fbff":eye);g.addColorStop(.75,glowEye?"#3ad0ff":eye);g.addColorStop(1,"#0a0a0a");
  x.fillStyle=g;x.beginPath();x.arc(cx+2*side,121,16,0,6.3);x.fill();
  x.fillStyle=glowEye?"#b9f3ff":"#050505";x.beginPath();x.arc(cx+2*side,121,7,0,6.3);x.fill();
  x.fillStyle="#fff";x.beginPath();x.arc(cx-4*side,114,5,0,6.3);x.fill();x.beginPath();x.arc(cx+8*side,127,2.5,0,6.3);x.fill();x.restore();
  x.strokeStyle="#140c08";x.lineWidth=6;x.lineCap="round";x.beginPath();x.moveTo(cx-25,119);x.quadraticCurveTo(cx-6*side,top-9,cx+26,top+3);x.stroke();
  x.lineWidth=7;x.beginPath();x.moveTo(cx+22*side,top+2);x.lineTo(cx+31*side,top-3);x.stroke();
  x.lineWidth=2;x.strokeStyle="rgba(20,12,8,.7)";x.beginPath();x.moveTo(cx-18,131);x.quadraticCurveTo(cx,138,cx+16,132);x.stroke()};
 drawEye(82,-1);drawEye(174,1);
 // brows
 const bA=ex===1?.42:[.3,.05,.22,.38,-.12][st]||.2;
 [[82,-1],[174,1]].forEach(([cx,s])=>{x.save();x.translate(cx,86+(ex===1?6:0));x.rotate(-bA*s);x.fillStyle=brow;x.beginPath();x.moveTo(-30,0);x.lineTo(30,-4*s);x.lineTo(30,6);x.lineTo(-30,9);x.closePath();x.fill();x.restore()});
 x.restore();
 // nose
 x.strokeStyle="rgba(60,30,20,.35)";x.lineWidth=4;x.lineCap="round";x.beginPath();x.moveTo(132,138);x.lineTo(136,160);x.lineTo(126,163);x.stroke();
 // mouth
 x.save();x.translate(128,190);x.scale(1.25,1.25);x.translate(-128,-190);
 if(!lowerMask){
  if(ex===1){x.fillStyle="#5a1414";x.beginPath();x.moveTo(104,186);x.quadraticCurveTo(128,214,154,186);x.closePath();x.fill();x.fillStyle="#fff";x.fillRect(108,186,42,6)}
  else if(ex===2){x.fillStyle="#4a1010";x.beginPath();x.ellipse(128,194,13,10,0,0,6.3);x.fill()}
  else{x.strokeStyle="#5a2a1a";x.lineWidth=5;x.lineCap="round";x.beginPath();x.moveTo(110,190);x.quadraticCurveTo(130,[196,192,190,188,192][st],150,186);x.stroke()}
 }
 x.restore();
 // extras
 if(a===15){x.strokeStyle="#7a2020";x.lineWidth=5;x.beginPath();x.moveTo(60,80);x.lineTo(100,150);x.stroke();x.lineWidth=3;[[66,100],[78,118],[90,136]].forEach(p=>{x.beginPath();x.moveTo(p[0]-6,p[1]+4);x.lineTo(p[0]+8,p[1]-4);x.stroke()})}
 if(a===11||a===19){x.fillStyle=a===11?"#c62828":"#d8ad3d";x.fillRect(62,148,34,6);x.fillRect(160,148,34,6);x.fillRect(66,160,26,5);x.fillRect(164,160,26,5)}
 if(a===0||a===3){x.fillStyle="rgba(230,90,90,.25)";x.beginPath();x.ellipse(70,158,16,8,0,0,6.3);x.ellipse(186,158,16,8,0,0,6.3);x.fill()}
 if(ex===2){x.fillStyle="rgba(120,200,255,.85)";x.beginPath();x.moveTo(206,70);x.quadraticCurveTo(218,92,206,96);x.quadraticCurveTo(194,92,206,70);x.fill()}
 const t=new (T().CanvasTexture)(c);t.anisotropy=4;
 return faces[k]=new (T().MeshStandardMaterial)({map:t,transparent:true,roughness:.7,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2})}
// ---------- looks ----------
function lookFor(id,shirt){
 const ov=window.DATA&&DATA.CH[id]&&DATA.CH[id].arch;const a=ov!==undefined&&ov!==null?ov:Math.floor(id/20)%20;let s=(id*2654435761>>>0)||1;const r=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296};
 const pants=[0x1c1c22,0x2a2f45,0x3b2a20,0x202a20,0x111111,0x4a4a52][Math.floor(r()*6)];
 return{id,arch:a,style:STYLE[a],shirt:shirt,accent:mixc(shirt,r()<.5?0xffffff:0x000000,.45),pants,skin:SKIN[Math.floor(r()*SKIN.length)],hair:HAIR[Math.floor(r()*HAIR.length)],eye:EYES[Math.floor(r()*EYES.length)],shoe:[0xf2f2f2,0x1a1a1a,0xc62828,0x1565c0,0xd8ad3d][Math.floor(r()*5)]}
}
// ---------- body ----------
const METAL=0xb9bec8,DMETAL=0x6d727c,LEATHER=0x5a3a22,WHITE=0xf3f3f3,BLACK=0x161618,GOLD=0xd8ad3d;
function build(look,glow){
 const g=new (T().Group)(),root=piv(0,0,0,g);
 const st=look.style,a=look.arch,big=st===3?1.1:1;root.scale.set(big,big,big);
 const sh=look.shirt,sh2=shade(sh,.78),ac=look.accent,pa=look.pants,pa2=shade(pa,.7),sk=look.skin,sk2=shade(sk,.86),hr=look.hair;
 const tank=st===0,gi=st===1,ninja=st===2,armor=st===3,coat=st===4;
 const top=ninja?mixc(sh,BLACK,.55):sh,top2=shade(top,.8);
 // ----- pelvis -----
 const hips=piv(0,2.05,0,root),Hp=Part();
 Hp.add(rbox(1.32,.62,.74,.16),pa,0,.05,0);
 Hp.add(rbox(1.44,.2,.8,.08),gi?BLACK:LEATHER,0,.33,0);
 if(gi){Hp.add(rbox(.3,.22,.2,.06),BLACK,.25,.3,.42);Hp.add(rbox(.14,.5,.06,.03),BLACK,.18,.02,.43,0,0,.15);Hp.add(rbox(.14,.46,.06,.03),BLACK,.34,.04,.43,0,0,-.1)}
 else Hp.add(rbox(.3,.22,.08,.04),armor||a===19?GOLD:METAL,0,.33,.41);
 if(ninja){Hp.add(rbox(.3,.3,.18,.06),LEATHER,-.5,.16,.38);Hp.add(rbox(.3,.3,.18,.06),LEATHER,.5,.16,.38)}
 if(armor){for(let i=-1;i<=1;i++)Hp.add(rbox(.4,.5,.1,.05),METAL,i*.42,-.18,.4,.1)}
 Hp.add(rbox(.5,.05,.02,.01),pa2,-.38,.0,.375);Hp.add(rbox(.5,.05,.02,.01),pa2,.38,.0,.375);// pocket seams
 attach(Hp,hips);
 // ----- torso -----
 const torso=piv(0,.3,0,hips),Tp=Part();
 Tp.add(rbox(1.26,.62,.7,.18),top,0,.32,0);// abdomen
 Tp.add(rbox(1.54,.82,.8,.22),top,0,.92,0);// chest
 Tp.add(rbox(1.0,.06,.02,.01),top2,0,.62,.41);
 if(tank){Tp.add(rbox(.9,.62,.04,.02),shade(top,1.12),0,.9,.39);Tp.add(rbox(.62,.3,.6,.12),sk,0,1.3,0);// neckline skin
  Tp.add(rbox(.34,.44,.05,.02),shade(top,.9),-.28,1.06,.4);Tp.add(rbox(.34,.44,.05,.02),shade(top,.9),.28,1.06,.4)}
 if(gi){Tp.add(rbox(.2,1.0,.05,.02),shade(top,.75),-.12,.85,.41,0,0,-.55);Tp.add(rbox(.2,.9,.05,.02),shade(top,.75),.2,.9,.415,0,0,.6);Tp.add(rbox(.5,.18,.04,.02),sk,0,1.22,.4)}
 if(ninja){Tp.add(rbox(1.0,.16,.82,.06),LEATHER,0,1.0,0,0,0,.75);Tp.add(rbox(.5,.4,.06,.03),DMETAL,0,.95,.42)}
 if(armor){Tp.add(rbox(1.6,.9,.86,.25),METAL,0,.95,0);Tp.add(rbox(1.2,.06,.04,.02),DMETAL,0,.75,.44);Tp.add(rbox(.12,.6,.04,.02),DMETAL,0,1.0,.45);Tp.add(rbox(.5,.5,.04,.1),GOLD,0,1.0,.46,0,0,.78,1,1,1)}
 if(coat){Tp.add(rbox(1.62,.88,.86,.24),sh,0,.92,0);Tp.add(rbox(.28,.95,.06,.03),shade(sh,.7),-.22,.8,.44,0,0,-.18);Tp.add(rbox(.28,.95,.06,.03),shade(sh,.7),.22,.8,.44,0,0,.18);Tp.add(rbox(.5,.9,.04,.02),mixc(sh,WHITE,.6),0,.86,.42);
  for(let i=0;i<3;i++)Tp.add(sph(.05),GOLD,0,.62+i*.22,.45);Tp.add(rbox(1.1,.45,.95,.18),sh,0,1.42,-.05)}// high collar
 if(!coat&&!armor&&!gi&&!tank){Tp.add(rbox(.6,.12,.7,.05),top2,0,1.31,0)}
 // power emblem on chest
 if(glow!==undefined&&!armor&&!coat)Tp.add(rbox(.24,.24,.04,.05),glow,.42,1.08,.42,0,0,.78);
 Tp.add(cyl(.22,.25,.34),sk,0,1.42,0);// neck
 attach(Tp,torso);
 // ----- head -----
 const neck=piv(0,1.42,0,torso),head=piv(0,.62,0,neck),Hd=Part();
 Hd.add(rbox(1.0,1.04,.98,.26),sk,0,0,0);
 Hd.add(rbox(.14,.26,.2,.06),sk2,-.53,-.02,-.02);Hd.add(rbox(.14,.26,.2,.06),sk2,.53,-.02,-.02);// ears
 Hd.add(rbox(.12,.18,.1,.04),sk2,0,-.06,.5);// nose
 Hd.add(rbox(.62,.16,.1,.05),sk,0,-.42,.42);// jaw/chin line
 if([4,11,16].indexOf(a)>=0)Hd.add(rbox(1.04,.48,1.0,.2),a===11?0x2a2a2a:BLACK,0,-.28,.02);// lower mask
 if(a===6){Hd.add(rbox(.9,.98,.12,.2),0xeeeeee,0,0,.5);Hd.add(rbox(.24,.08,.04,.02),BLACK,-.2,.06,.57);Hd.add(rbox(.24,.08,.04,.02),BLACK,.2,.06,.57);Hd.add(rbox(.06,.4,.04,.02),0xb00020,-.2,-.2,.57);Hd.add(rbox(.06,.4,.04,.02),0xb00020,.2,-.2,.57)}
 hair(Hd,look);
 const faceM=a===6?null:new (T().Mesh)(new (T().PlaneGeometry)(.92,.92),faceTex(look,0));if(faceM){faceM.position.set(0,0,.495);faceM.renderOrder=2;head.add(faceM)}
 attach(Hd,head);
 if(a===18){const em=new (T().MeshStandardMaterial)({color:0x7fe7ff,emissive:0x3ad0ff,emissiveIntensity:2});[-1,1].forEach(s=>{const e=new (T().Mesh)(sph(.06),em);e.position.set(s*.18,.02,.52);head.add(e)})}
 // ----- arms -----
 const arm=s=>{const sp=piv(s*.98,1.12,0,torso),U=Part(),el=piv(0,-.8,0,sp),F=Part();
  const sleeve=tank?sk:gi?mixc(top,WHITE,.15):top;
  U.add(sph(.33),tank?sk:(armor?METAL:top),0,-.02,0);
  U.add(rbox(.52,.82,.52,.2),sleeve,0,-.4,0);
  if(tank)U.add(cyl(.28,.28,.12),ac,0,-.48,0);
  if(gi)U.add(cyl(.3,.38,.36),mixc(top,WHITE,.15),0,-.7,0);
  if(armor){U.add(rbox(.78,.36,.78,.18),METAL,s*.06,.06,0,0,0,s*-.25);U.add(rbox(.82,.1,.82,.05),GOLD,s*.06,-.1,0,0,0,s*-.25)}
  if(coat)U.add(cyl(.29,.29,.1),shade(sh,.7),0,-.78,0);
  attach(U,sp);
  const fore=tank||gi?sk:(armor?METAL:(coat?sh:top));
  F.add(sph(.25),fore,0,0,0);
  F.add(rbox(.47,.74,.47,.18),fore,0,-.38,0);
  if(gi)F.add(cyl(.27,.27,.1),mixc(top,WHITE,.15),0,-.05,0);
  if(ninja){F.add(rbox(.5,.48,.52,.1),DMETAL,0,-.42,.02);for(let i=0;i<3;i++)F.add(rbox(.52,.04,.54,.02),METAL,0,-.26-i*.14,.02)}
  if(armor)F.add(rbox(.54,.5,.54,.12),DMETAL,0,-.48,0);
  if(coat)F.add(cyl(.29,.31,.2),mixc(sh,WHITE,.6),0,-.66,0);
  F.add(cyl(.25,.25,.12),tank?WHITE:(ninja?LEATHER:ac),0,-.74,0);// wrist band / cuff
  // fist: palm + 4 knuckles + thumb
  const hand=tank||a===13?WHITE:(armor?DMETAL:sk),hand2=shade(hand,.88);
  F.add(rbox(.5,.36,.5,.14),hand,0,-.95,0);
  for(let i=0;i<4;i++)F.add(rbox(.12,.16,.14,.05),hand2,(i-1.5)*.118,-1.06,.2);
  F.add(rbox(.14,.14,.3,.06),hand2,s*.2,-.93,.14,0,s*.3,0);
  if(tank){for(let i=0;i<3;i++)F.add(rbox(.52,.05,.52,.02),0xdcdcdc,0,-.82-i*.12,0)}
  attach(F,el);
  return{sp,el}};
 const L=arm(1),R=arm(-1);
 // ----- legs -----
 const leg=s=>{const hp=piv(s*.36,-.15,0,hips),U=Part(),kn=piv(0,-.9,0,hp),D=Part();
  U.add(rbox(.62,.96,.66,.22),pa,0,-.44,0);
  U.add(rbox(.04,.3,.36,.02),pa2,s*.315,-.36,0);// side pocket
  if(gi)U.add(rbox(.66,.9,.7,.24),mixc(top,WHITE,.15),0,-.44,0);
  if(coat){U.add(rbox(.68,.7,.72,.2),sh,0,-.25,0)}
  attach(U,hp);
  D.add(sph(.27),gi?mixc(top,WHITE,.15):pa,0,0,0);
  D.add(rbox(.56,.78,.6,.2),gi?mixc(top,WHITE,.15):pa,0,-.38,0);
  if(armor){D.add(rbox(.5,.4,.2,.12),METAL,0,-.08,.3);D.add(rbox(.6,.5,.64,.14),DMETAL,0,-.55,0)}
  if(ninja){for(let i=0;i<4;i++)D.add(rbox(.6,.06,.64,.02),0xd8d0b8,0,-.3-i*.13,0,0,0,(i%2?.12:-.12))}
  // shoe: sole, upper, toe cap, laces, heel tab
  const shoe=ninja?0x222222:armor?DMETAL:look.shoe,sole=shoe===0xf2f2f2?0x2a2a2a:0xf0f0f0;
  D.add(rbox(.64,.14,.98,.06),sole,0,-.9,.12);
  D.add(rbox(.6,.3,.86,.14),shoe,0,-.75,.09);
  D.add(rbox(.5,.12,.22,.06),shade(shoe,.85),0,-.8,.48);
  if(!ninja&&!armor){for(let i=0;i<3;i++)D.add(rbox(.3,.035,.06,.015),sole,0,-.6-i*.0,.18+i*.11);D.add(rbox(.26,.14,.06,.03),ac,0,-.6,-.34)}
  attach(D,kn);
  return{hp,kn}};
 const LL=leg(1),RL=leg(-1);
 // ----- cloth: capes, coat tails, scarves (sway in update) -----
 const sway=[];
 const chain=(parent,x,y,z,w,len,n,col,thick,ang)=>{let p=parent;const segs=[];for(let i=0;i<n;i++){const pv=piv(i?0:x,i?-len/n:y,i?0:z,p);const C=Part();C.add(rbox(w*(1-i*.06),len/n+.04,thick,Math.min(.04,thick/2.2)),i%2?shade(col,.92):col,0,-len/n/2,0);attach(C,pv);segs.push(pv);p=pv}sway.push({segs,ang:ang||0});return segs};
 const capeCol={4:0x141414,6:0x3a0f4a,17:0x1d3f8a,18:0x0d1b3a,19:0xb3202a}[a];
 if(capeCol!==undefined)chain(torso,0,1.28,-.44,1.45,2.7,4,capeCol,.07,.12);
 if(coat){chain(hips,-.38,-.05,-.36,.62,1.7,3,sh,.08,.05);chain(hips,.38,-.05,-.36,.62,1.7,3,sh,.08,.05)}
 if(ninja||a===2||a===8){const sc={2:0x8b0000,8:0x7a5a2a}[a]||0xb3202a;const Sc=Part();Sc.add(tor(.5,.13),sc,0,1.32,0,Math.PI/2,0,0,1,1,.9);attach(Sc,torso);chain(torso,.25,1.28,-.4,.3,1.6,3,sc,.06,.2);chain(torso,-.05,1.25,-.42,.28,1.2,3,sc,.06,.15)}
 // ----- glowing fists (awakening) -----
 const fg=side=>{const m=new (T().Mesh)(rbox(.62,.48,.62,.16),new (T().MeshStandardMaterial)({color:glow||0xffffff,emissive:glow||0xffffff,emissiveIntensity:.8}));m.position.y=-.97;m.visible=false;side.el.add(m);return m};
 const glowL=fg(L),glowR=fg(R);
 return{g,root,hips,torso,neck,head,L,R,LL,RL,glow:[glowL,glowR],cur:{},look,chest:torso,face:faceM,sway,ex:0};
}
// ---------- hair & headwear ----------
function hair(P,look){
 const a=look.arch,h=look.hair,h2=shade(h,1.25),h3=shade(h,.75),T0=.5;
 const spikes=(n,len,col,tilt,y0,rad)=>{for(let i=0;i<n;i++){const t=i/n*6.283;const lean=tilt||.75;P.add(con(.2,len,6),i%2?col:shade(col,1.15),Math.sin(t)*(rad||.32),(y0||T0)+.12,Math.cos(t)*(rad||.32)-.05,Math.cos(t)*lean,0,-Math.sin(t)*lean)}};
 const cap=(col,y)=>P.add(rbox(1.06,.34,1.06,.16),col,0,(y||T0)-.02,-.01);
 const bangs=(col,n)=>{for(let i=0;i<n;i++){const x=(i-(n-1)/2)*.2;P.add(con(.13,.42,5),i%2?col:shade(col,1.12),x,T0-.1,.47,Math.PI*.82,0,x*.6)}};
 const backHair=(col,len)=>P.add(rbox(1.04,len,.3,.12),col,0,T0-len/2+.1,-.42);
 const sideburns=(col)=>{P.add(rbox(.1,.4,.26,.05),col,-.51,.12,-.05);P.add(rbox(.1,.4,.26,.05),col,.51,.12,-.05)};
 const helm=(col,col2,visor)=>{P.add(rbox(1.12,.7,1.12,.3),col,0,.22,-.01);P.add(rbox(1.14,.12,1.14,.05),col2,0,-.05,0);P.add(rbox(.14,.8,1.12,.06),col,-.56,-.05,-.01);P.add(rbox(.14,.8,1.12,.06),col,.56,-.05,-.01);P.add(rbox(1.12,.8,.14,.06),col,0,-.05,-.56);if(visor){P.add(rbox(1.0,.24,.1,.05),0x111111,0,.05,.55);for(let i=-2;i<=2;i++)P.add(rbox(.04,.2,.04,.01),col2,i*.18,.05,.6)}};
 const hood=(col)=>{P.add(rbox(1.2,.36,1.18,.18),col,0,T0+.08,-.02);P.add(rbox(1.2,1.12,.22,.1),col,0,.02,-.55);P.add(rbox(.18,1.12,1.12,.08),col,.6,.02,-.02);P.add(rbox(.18,1.12,1.12,.08),col,-.6,.02,-.02);P.add(con(.35,.6,6),col,0,T0+.05,-.6,-.9,0,0)};
 const pads=()=>{};
 switch(a){
  case 0:cap(h);spikes(10,.75,h,.8);spikes(5,.95,h2,.35,.62,.16);bangs(h,5);P.add(rbox(1.08,.14,1.08,.06),0xc62828,0,.24,0);P.add(rbox(.12,.5,.06,.03),0xc62828,-.15,.1,-.56,0,0,.3);P.add(rbox(.12,.45,.06,.03),0xc62828,.05,.12,-.56,0,0,-.2);break;
  case 1:P.add(sph(.08),shade(look.skin,.8),0,T0+.02,.0);for(let i=0;i<9;i++){P.add(sph(.075),0x3a2a1a,-.36+i*.09,.32-Math.abs(i-4)*.0,.48)}break;// bald + forehead dots
  case 2:cap(h);backHair(h,1.0);bangs(h,4);P.add(rbox(.26,1.3,.26,.1),h3,0,-.3,-.62,.25,0,0);P.add(rbox(.32,.14,.32,.06),0x8b0000,0,.32,-.58);break;// ronin long hair + ponytail
  case 3:cap(h);sideburns(h);for(let i=0;i<6;i++)P.add(rbox(.18,.18,.6,.06),i%2?h:h2,-.45+i*.18,T0+.14,0);break;// short spiky buzz
  case 4:hood(0x1a1a1a);break;
  case 5:helm(METAL,DMETAL,false);P.add(rbox(.16,.5,.7,.06),0xc62828,0,.62,-.05);break;
  case 6:cap(0x222222);backHair(0x222222,.7);break;
  case 7:P.add(rbox(.6,.08,.04,.02),0x5a3a1a,0,.15,.5);break;// bald titan with headband line
  case 8:cap(h);backHair(h,.5);P.add(rbox(1.1,.28,1.1,.14),0x355e3b,0,T0+.02,0);P.add(rbox(1.0,.06,.55,.03),0x2c4c30,0,T0-.08,.62);break;// cap with brim
  case 9:cap(WHITE);backHair(WHITE,1.2);P.add(rbox(.66,.62,.24,.12),WHITE,0,-.62,.42);P.add(con(.18,.5,6),WHITE,0,-1.05,.42,Math.PI,0,0);P.add(rbox(.5,.08,.06,.03),WHITE,-.26,-.22,.5,0,0,.2);P.add(rbox(.5,.08,.06,.03),WHITE,.26,-.22,.5,0,0,-.2);break;// sage beard
  case 10:helm(METAL,DMETAL,true);P.add(con(.12,.7,6),0xc62828,0,.75,0);P.add(con(.1,.6,6),0xc62828,0,.7,-.25,-.5,0,0);break;
  case 11:for(let i=0;i<7;i++)P.add(con(.14,.55+Math.sin(i/6*3.14)*.25,5),i%2?h:h2,0,T0+.25,-.48+i*.16,0,0,0);sideburns(h3);break;// mohawk
  case 12:cap(h);P.add(sph(.22),h,0,T0+.3,-.1);P.add(rbox(.5,.1,.1,.04),0xffffff,0,T0+.18,-.1);bangs(h,2);break;// topknot
  case 13:helm(GOLD,shade(GOLD,.7),false);for(let i=0;i<7;i++)P.add(rbox(.1,.4,.18,.04),0xc62828,0,.66+Math.sin(i/6*3.14)*.12,-.5+i*.16);break;// crest
  case 14:cap(h);P.add(cyl(.95,.95,.06,24),0x3b2a7a,0,T0+.04,0);P.add(con(.55,1.3,10),0x3b2a7a,0,T0+.72,-.05,-.18,0,0);P.add(cyl(.56,.58,.14,16),GOLD,0,T0+.14,0);break;// mage hat
  case 15:cap(h);spikes(12,.6,h,.95);P.add(con(.16,.8,6),0xf5f0e0,.52,T0+.12,0,0,0,-.95);P.add(con(.16,.8,6),0xf5f0e0,-.52,T0+.12,0,0,0,.95);backHair(h,.9);break;// horns + wild hair
  case 16:hood(0x2a2a3a);break;
  case 17:helm(GOLD,shade(GOLD,.7),true);break;
  case 18:spikes(9,.95,0x9fd3ff,.7);spikes(4,1.1,0xd8f1ff,.3,.62,.14);break;
  case 19:cap(GOLD);spikes(7,.7,GOLD,.6);P.add(cyl(.56,.6,.16,16),GOLD,0,T0+.1,0);for(let i=0;i<6;i++){const t=i/6*6.28;P.add(con(.07,.28,4),0xc62828,Math.sin(t)*.56,T0+.3,Math.cos(t)*.56)}break;// crown
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
 const R=f.rig;
 // facial expression: hurt when stunned/knocked, fierce while attacking
 if(R.face){const ex=(f.anState==="stun"||f.anState==="ragdoll"||f.anState==="down"||f.dead)?2:(f.act&&f.act.name!=="getup"&&f.act.name!=="pickup")||f.blk?1:0;if(ex!==R.ex){R.ex=ex;R.face.material=faceTex(R.look,ex)}}
 // cloth sway from movement
 if(R.sway.length){const sp=Math.min(30,Math.hypot(f.vx||0,f.vz||0)),up=(f.vy||0)>0?0:Math.min(.6,-(f.vy||0)*.02);
  for(const c of R.sway)c.segs.forEach((s,i)=>{s.rotation.x=(i?.06:c.ang)+sp*(i?.012:.035)+up*(i?.2:.6)+Math.sin(time*3.2+i*.9+(f.x||0)*.1)*(.04+sp*.003)})}
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
window.Rig={build,lookFor,update,play,m1Keys,setQuality,ARCH,STYLE,STYLE_NAMES,A};
})();
