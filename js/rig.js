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
let RAMP=null;function ramp(){if(RAMP)return RAMP;const c=document.createElement("canvas");c.width=4;c.height=1;const x=c.getContext("2d");["#6f6f80","#b9b4b4","#ffffff","#ffffff"].forEach((v,i)=>{x.fillStyle=v;x.fillRect(i,0,1,1)});RAMP=new (T().CanvasTexture)(c);RAMP.minFilter=RAMP.magFilter=T().NearestFilter;return RAMP}
function mats(){if(MAT)return;MAT=new (T().MeshToonMaterial)({vertexColors:true,gradientMap:ramp()});
 OLMAT=new (T().MeshBasicMaterial)({color:0x0b0b0e,side:T().BackSide});OLMAT.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace("#include <begin_vertex>","vec3 transformed = vec3( position ) + normal * 0.036;")}}
function merge(P){if(!P.parts.length)return null;let nv=0,ni=0;const gs=P.parts.map(p=>{const g=p.geo.clone();g.applyMatrix4(p.m);nv+=g.attributes.position.count;ni+=g.index?g.index.count:g.attributes.position.count;return{g,col:new (T().Color)(p.col),src:p.geo}});
 const pos=new Float32Array(nv*3),nor=new Float32Array(nv*3),col=new Float32Array(nv*3),idx=new (nv>65535?Uint32Array:Uint16Array)(ni);let ov=0,oi=0;
 for(const {g,col:c,src} of gs){const pa=g.attributes.position,na=g.attributes.normal;pos.set(pa.array,ov*3);nor.set(na.array,ov*3);
  if(!src.boundingBox)src.computeBoundingBox();const y0=src.boundingBox.min.y,yh=(src.boundingBox.max.y-y0)||1,sp=src.attributes.position,sn=src.attributes.normal;
  for(let i=0;i<pa.count;i++){const t=(sp.getY(i)-y0)/yh,k=Math.min(1.08,Math.max(.68,.8+.2*t+.06*(sn?sn.getY(i):0)));col[(ov+i)*3]=c.r*k;col[(ov+i)*3+1]=c.g*k;col[(ov+i)*3+2]=c.b*k}
  if(g.index){for(let i=0;i<g.index.count;i++)idx[oi+i]=g.index.array[i]+ov;oi+=g.index.count}else{for(let i=0;i<pa.count;i++)idx[oi+i]=ov+i;oi+=pa.count}ov+=pa.count;g.dispose()}
 const G=new (T().BufferGeometry)();G.setAttribute("position",new (T().BufferAttribute)(pos,3));G.setAttribute("normal",new (T().BufferAttribute)(nor,3));G.setAttribute("color",new (T().BufferAttribute)(col,3));G.setIndex(new (T().BufferAttribute)(idx,1));G.computeBoundingSphere();return G}
function attach(P,parent){mats();const G=merge(P);if(!G)return null;const m=new (T().Mesh)(G,MAT);m.castShadow=true;parent.add(m);if(!LOW){const o=new (T().Mesh)(G,OLMAT);o.userData.ol=1;o.castShadow=false;parent.add(o)}return m}
function piv(x,y,z,parent){const g=new (T().Group)();g.position.set(x,y,z);parent.add(g);return g}
// ---------- faces ----------
const faces={};
function faceTex(look,ex){// ex: 0 normal, 1 fierce (attacking/blocking), 2 hurt
 const k=look.id+"_"+ex;if(faces[k])return faces[k];
 const S=LOW?256:512,c=document.createElement("canvas");c.width=c.height=S;const x=c.getContext("2d");x.scale(S/256,S/256);
 const st=look.style,a=look.arch,eye=look.eye,brow="#"+shade(look.hair===0xe8e8e8?0x8a8a8a:look.hair,.5).toString(16).padStart(6,"0"),glowEye=a===18;
 const lowerMask=[4,11,16].indexOf(a)>=0;
 const rg=(cx,cy,r,col)=>{const g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,col);g.addColorStop(1,"rgba(0,0,0,0)");x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,6.3);x.fill()};
 // soft skin shading: brow shadow, cheek warmth, jaw shadow, nose bridge highlight
 rg(82,104,40,"rgba(60,25,15,.10)");rg(174,104,40,"rgba(60,25,15,.10)");
 if(!lowerMask){rg(64,164,30,"rgba(220,80,70,.16)");rg(192,164,30,"rgba(220,80,70,.16)");rg(128,236,70,"rgba(40,15,10,.14)")}
 rg(128,130,14,"rgba(255,255,255,.14)");
 x.save();x.translate(128,134);x.scale(1.36,1.36);x.translate(-128,-128);
 const drawEye=(cx,side)=>{
  if(ex===2){x.strokeStyle="#1a1010";x.lineWidth=7;x.lineCap="round";x.lineJoin="round";x.beginPath();x.moveTo(cx-18*side,104);x.lineTo(cx+12*side,116);x.lineTo(cx-18*side,128);x.stroke();
   x.lineWidth=2;x.strokeStyle="rgba(26,16,16,.5)";x.beginPath();x.moveTo(cx-20,138);x.quadraticCurveTo(cx,142,cx+18,138);x.stroke();return}
  const hgt=ex===1?24:30,top=118-hgt/2;
  // eyelid crease
  x.strokeStyle="rgba(70,35,25,.45)";x.lineWidth=2;x.beginPath();x.moveTo(cx-20,top-6);x.quadraticCurveTo(cx-4*side,top-16,cx+22,top-4);x.stroke();
  x.save();x.beginPath();x.moveTo(cx-24,118);x.quadraticCurveTo(cx-6*side,top-8,cx+24,top+4);x.quadraticCurveTo(cx+28,124,cx+16,132);x.quadraticCurveTo(cx-6,138,cx-24,118);x.closePath();
  const sg=x.createLinearGradient(0,top,0,138);sg.addColorStop(0,"#d9dde3");sg.addColorStop(.35,"#ffffff");sg.addColorStop(1,"#f1f1f1");x.fillStyle=sg;x.fill();x.clip();
  const ix=cx+2*side,iy=121;
  const g=x.createRadialGradient(ix,iy+4,2,ix,iy,17);g.addColorStop(0,glowEye?"#ffffff":shadeHex(eye,1.7));g.addColorStop(.45,glowEye?"#7fe7ff":eye);g.addColorStop(.85,glowEye?"#1aa8e0":shadeHex(eye,.6));g.addColorStop(1,"#050505");
  x.fillStyle=g;x.beginPath();x.arc(ix,iy,16.5,0,6.3);x.fill();
  // iris fibres
  x.strokeStyle=glowEye?"rgba(255,255,255,.35)":"rgba(255,255,255,.18)";x.lineWidth=1;for(let i=0;i<14;i++){const t=i/14*6.283;x.beginPath();x.moveTo(ix+Math.cos(t)*8,iy+Math.sin(t)*8);x.lineTo(ix+Math.cos(t)*14,iy+Math.sin(t)*14);x.stroke()}
  x.fillStyle=glowEye?"#e6fbff":"#050505";x.beginPath();x.arc(ix,iy,6.5,0,6.3);x.fill();
  // upper lid shadow on the eyeball
  const ls=x.createLinearGradient(0,top-4,0,top+12);ls.addColorStop(0,"rgba(0,0,0,.35)");ls.addColorStop(1,"rgba(0,0,0,0)");x.fillStyle=ls;x.fillRect(cx-30,top-8,60,22);
  x.fillStyle="#fff";x.beginPath();x.ellipse(ix-5*side,iy-7,5.5,4.5,-.4,0,6.3);x.fill();x.beginPath();x.arc(ix+7*side,iy+6,2.4,0,6.3);x.fill();x.fillStyle="rgba(255,255,255,.6)";x.beginPath();x.arc(ix+1*side,iy-11,1.6,0,6.3);x.fill();
  x.restore();
  // lashes
  x.strokeStyle="#120a06";x.lineWidth=6.5;x.lineCap="round";x.beginPath();x.moveTo(cx-25,119);x.quadraticCurveTo(cx-6*side,top-9,cx+26,top+3);x.stroke();
  x.lineWidth=5;x.beginPath();x.moveTo(cx+20*side,top+1);x.lineTo(cx+32*side,top-5);x.stroke();x.lineWidth=3.5;x.beginPath();x.moveTo(cx+12*side,top-3);x.lineTo(cx+20*side,top-10);x.stroke();
  x.lineWidth=2;x.strokeStyle="rgba(18,10,6,.75)";x.beginPath();x.moveTo(cx-18,131);x.quadraticCurveTo(cx,138,cx+16,132);x.stroke();
  // under-eye line
  x.strokeStyle="rgba(90,45,35,.25)";x.lineWidth=1.5;x.beginPath();x.moveTo(cx-14,143);x.quadraticCurveTo(cx,147,cx+12,143);x.stroke()};
 drawEye(82,-1);drawEye(174,1);
 // brows: tapered, with hair strokes
 const bA=ex===1?.42:[.3,.05,.22,.38,-.12][st]||.2;
 [[82,-1],[174,1]].forEach(([cx,s])=>{x.save();x.translate(cx,86+(ex===1?6:0));x.rotate(-bA*s);x.fillStyle=brow;x.beginPath();x.moveTo(-32*s,4);x.quadraticCurveTo(0,-8,30*s,-2);x.lineTo(30*s,4);x.quadraticCurveTo(0,4,-32*s,12);x.closePath();x.fill();
  x.strokeStyle="rgba(0,0,0,.25)";x.lineWidth=1;for(let i=0;i<8;i++){const px=-26*s+i*7*s;x.beginPath();x.moveTo(px,8);x.lineTo(px+6*s,0);x.stroke()}x.restore()});
 x.restore();
 // nose: shadow side + nostrils + tip highlight
 x.strokeStyle="rgba(70,32,22,.4)";x.lineWidth=4;x.lineCap="round";x.beginPath();x.moveTo(134,132);x.quadraticCurveTo(140,152,136,162);x.stroke();
 x.fillStyle="rgba(60,25,18,.45)";x.beginPath();x.ellipse(120,165,4,2.5,0,0,6.3);x.ellipse(138,165,4,2.5,0,0,6.3);x.fill();rg(129,158,7,"rgba(255,255,255,.25)");
 // mouth
 x.save();x.translate(128,190);x.scale(1.25,1.25);x.translate(-128,-190);
 if(!lowerMask){
  if(ex===1){x.fillStyle="#4a0f0f";x.beginPath();x.moveTo(102,184);x.quadraticCurveTo(128,218,156,184);x.quadraticCurveTo(128,190,102,184);x.fill();x.fillStyle="#fff";x.beginPath();x.moveTo(106,185);x.quadraticCurveTo(128,191,152,185);x.lineTo(150,191);x.quadraticCurveTo(128,196,108,191);x.fill();x.fillStyle="#c04a4a";x.beginPath();x.ellipse(128,203,10,4,0,0,6.3);x.fill()}
  else if(ex===2){x.fillStyle="#3e0e0e";x.beginPath();x.ellipse(128,194,13,10,0,0,6.3);x.fill();x.fillStyle="#fff";x.fillRect(119,185,18,3)}
  else{x.strokeStyle="#5a2418";x.lineWidth=4.5;x.lineCap="round";x.beginPath();x.moveTo(108,189);x.quadraticCurveTo(130,[197,193,191,188,193][st],152,185);x.stroke();
   x.strokeStyle="rgba(150,60,50,.35)";x.lineWidth=3;x.beginPath();x.moveTo(116,199);x.quadraticCurveTo(130,203,144,198);x.stroke()}
 }
 x.restore();
 // character extras
 if(a===15){x.strokeStyle="#7a2020";x.lineWidth=5;x.beginPath();x.moveTo(56,74);x.lineTo(100,156);x.stroke();x.lineWidth=3;[[64,92],[76,112],[88,134]].forEach(p=>{x.beginPath();x.moveTo(p[0]-7,p[1]+5);x.lineTo(p[0]+9,p[1]-5);x.stroke()})}
 if(a===11||a===19){x.fillStyle=a===11?"#c62828":"#d8ad3d";x.fillRect(58,150,36,6);x.fillRect(162,150,36,6);x.fillRect(62,162,28,5);x.fillRect(166,162,28,5)}
 if(a===7||a===3){x.strokeStyle="rgba(60,30,20,.35)";x.lineWidth=2;for(let i=0;i<60;i++){const px=100+Math.random()*56,py=208+Math.random()*30;x.beginPath();x.moveTo(px,py);x.lineTo(px+1,py+2);x.stroke()}}// stubble
 if(a===12){x.fillStyle="rgba(30,30,30,.55)";x.fillRect(118,176,22,4)}// moustache
 if(ex===2){x.fillStyle="rgba(120,200,255,.85)";x.beginPath();x.moveTo(208,64);x.quadraticCurveTo(222,90,208,95);x.quadraticCurveTo(194,90,208,64);x.fill()}
 const t=new (T().CanvasTexture)(c);t.anisotropy=8;
 return faces[k]=new (T().MeshToonMaterial)({map:t,gradientMap:ramp(),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2})}
function shadeHex(h,k){const C=new (T().Color)(h);C.multiplyScalar(k);C.r=Math.min(1,C.r);C.g=Math.min(1,C.g);C.b=Math.min(1,C.b);return "#"+C.getHexString()}
// ---------- looks ----------
function lookFor(id,shirt){
 const a=Math.floor(id/20)%20;let s=(id*2654435761>>>0)||1;const r=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296};
 const pants=[0x1c1c22,0x2a2f45,0x3b2a20,0x202a20,0x111111,0x4a4a52][Math.floor(r()*6)];
 return{id,arch:a,style:STYLE[a],shirt:shirt,accent:mixc(shirt,r()<.5?0xffffff:0x000000,.45),pants,skin:SKIN[Math.floor(r()*SKIN.length)],hair:HAIR[Math.floor(r()*HAIR.length)],eye:EYES[Math.floor(r()*EYES.length)],shoe:[0xf2f2f2,0x1a1a1a,0xc62828,0x1565c0,0xd8ad3d][Math.floor(r()*5)]}
}
// ---------- body ----------
function stretch(P,sy,cut,shift){const S=new (T().Matrix4)().makeScale(1,sy,1),M=new (T().Matrix4)().makeTranslation(0,shift||0,0);P.parts.forEach(p=>{const y=p.m.elements[13];if(cut===undefined||y>cut)p.m.premultiply(S);else p.m.premultiply(M)})}
const METAL=0xb9bec8,DMETAL=0x6d727c,LEATHER=0x5a3a22,WHITE=0xf3f3f3,BLACK=0x161618,GOLD=0xd8ad3d,FUR=0x8a6a4a,BONE=0xe9e1c8;
function build(look,glow){
 const g=new (T().Group)(),root=piv(0,0,0,g);
 const st=look.style,a=look.arch,big=st===3?1.1:1;root.scale.set(big,big,big);
 const sh=look.shirt,ac=look.accent,pa=look.pants,pa2=shade(pa,.7),sk=look.skin,sk2=shade(sk,.86),sk3=shade(sk,1.06);
 const tank=st===0,gi=st===1,ninja=st===2,armor=st===3,coat=st===4;
 const top=ninja?mixc(sh,BLACK,.55):sh,top2=shade(top,.78),giC=mixc(top,WHITE,.15);
 const rivets=(P,xs,y,z,col)=>xs.forEach(px=>P.add(sph(.035),col||DMETAL,px,y,z));
 const stitch=(P,x0,x1,y,z,col)=>{for(let px=x0;px<=x1+.001;px+=.09)P.add(rbox(.045,.014,.012,.005),col,px,y,z)};
 // builders
 const Hp=Part(),Tp=Part(),Hd=Part(),U={},F={},LU={},LD={};[1,-1].forEach(s=>{U[s]=Part();F[s]=Part();LU[s]=Part();LD[s]=Part()});
 // ===== pelvis =====
 Hp.add(rbox(1.32,.62,.74,.16),pa,0,.05,0);
 Hp.add(rbox(1.44,.2,.8,.08),gi?BLACK:LEATHER,0,.33,0);
 if(!gi){for(let i=-2;i<=2;i++)Hp.add(rbox(.07,.24,.04,.02),shade(LEATHER,.75),i*.3,.33,.405);stitch(Hp,-.66,.66,.41,.405,shade(LEATHER,1.3))}
 if(gi){Hp.add(rbox(.32,.24,.22,.07),BLACK,.25,.3,.42);Hp.add(rbox(.14,.55,.06,.03),BLACK,.18,.0,.43,0,0,.15);Hp.add(rbox(.14,.5,.06,.03),BLACK,.34,.02,.43,0,0,-.1);Hp.add(rbox(.16,.04,.07,.01),GOLD,.18,-.22,.44,0,0,.15)}
 else{Hp.add(rbox(.32,.24,.08,.04),armor||a===19?GOLD:METAL,0,.33,.41);Hp.add(rbox(.18,.12,.04,.02),shade(armor||a===19?GOLD:METAL,.7),0,.33,.45)}
 if(ninja){Hp.add(rbox(.3,.3,.18,.06),LEATHER,-.5,.16,.38);Hp.add(rbox(.3,.3,.18,.06),LEATHER,.5,.16,.38);Hp.add(rbox(.32,.08,.2,.03),shade(LEATHER,.8),-.5,.29,.39);Hp.add(rbox(.32,.08,.2,.03),shade(LEATHER,.8),.5,.29,.39)}
 if(armor){for(let i=-1;i<=1;i++){Hp.add(rbox(.4,.52,.1,.05),METAL,i*.42,-.2,.4,.1);rivets(Hp,[i*.42-.12,i*.42+.12],-.02,.46)}}
 Hp.add(rbox(.5,.05,.02,.01),pa2,-.38,.0,.375);Hp.add(rbox(.5,.05,.02,.01),pa2,.38,.0,.375);
 Hp.add(rbox(.04,.4,.02,.01),pa2,0,-.08,.375);// fly seam
 // ===== torso =====
 Tp.add(rbox(1.1,.64,.66,.2),top,0,.32,0);
 Tp.add(rbox(1.66,.84,.8,.26),top,0,.94,0);
 Tp.add(rbox(1.36,.5,.6,.2),top,0,1.18,-.05);// trapezius/upper back
 // chest muscles + abs read through the fabric
 Tp.add(rbox(.6,.38,.12,.14),shade(top,1.06),-.31,1.03,.36);Tp.add(rbox(.6,.38,.12,.14),shade(top,1.06),.31,1.03,.36);
 for(let i=0;i<3;i++)for(let j=-1;j<=1;j+=2)Tp.add(rbox(.24,.15,.06,.06),shade(top,1.03),j*.14,.68-i*.17,.36);
 Tp.add(rbox(.03,.9,.02,.01),top2,-.77,.7,0);Tp.add(rbox(.03,.9,.02,.01),top2,.77,.7,0);// side seams
 Tp.add(rbox(1.0,.06,.02,.01),top2,0,.62,.41);
 if(tank){Tp.add(rbox(.92,.64,.04,.02),shade(top,1.12),0,.9,.39);Tp.add(rbox(.66,.32,.6,.14),sk,0,1.3,0);Tp.add(rbox(.26,.08,.04,.03),sk2,-.18,1.25,.3,0,0,-.25);Tp.add(rbox(.26,.08,.04,.03),sk2,.18,1.25,.3,0,0,.25);// collarbones
  Tp.add(rbox(.34,.44,.05,.02),shade(top,.9),-.28,1.06,.42);Tp.add(rbox(.34,.44,.05,.02),shade(top,.9),.28,1.06,.42);Tp.add(rbox(.22,.12,.06,.03),WHITE,0,.92,.42)}
 if(gi){Tp.add(rbox(.22,1.05,.05,.02),shade(top,.75),-.12,.85,.42,0,0,-.55);Tp.add(rbox(.22,.95,.05,.02),shade(top,.75),.2,.9,.425,0,0,.6);Tp.add(rbox(.52,.2,.04,.02),sk,0,1.22,.41);Tp.add(rbox(.3,.12,.03,.02),sk2,0,1.12,.415)}
 if(ninja){Tp.add(rbox(1.0,.16,.82,.06),LEATHER,0,1.0,0,0,0,.75);Tp.add(rbox(.2,.2,.06,.04),METAL,.12,1.1,.44);Tp.add(rbox(.5,.4,.06,.03),DMETAL,0,.95,.42);for(let i=0;i<4;i++)Tp.add(rbox(.04,.04,.03,.01),METAL,-.18+i*.12,.95,.46)}
 if(armor){Tp.add(rbox(1.62,.92,.88,.26),METAL,0,.95,0);Tp.add(rbox(1.62,.08,.9,.04),DMETAL,0,.55,0);Tp.add(rbox(1.2,.06,.04,.02),DMETAL,0,.75,.45);Tp.add(rbox(.12,.6,.04,.02),DMETAL,0,1.0,.46);Tp.add(rbox(.5,.5,.04,.1),GOLD,0,1.0,.47,0,0,.78);rivets(Tp,[-.65,-.45,.45,.65],1.25,.45);rivets(Tp,[-.65,.65],.75,.45)}
 if(coat){Tp.add(rbox(1.64,.9,.88,.24),sh,0,.92,0);Tp.add(rbox(.28,.95,.06,.03),shade(sh,.7),-.22,.8,.45,0,0,-.18);Tp.add(rbox(.28,.95,.06,.03),shade(sh,.7),.22,.8,.45,0,0,.18);Tp.add(rbox(.5,.9,.04,.02),mixc(sh,WHITE,.6),0,.86,.43);
  for(let i=0;i<3;i++){Tp.add(sph(.055),GOLD,-.33,.62+i*.22,.47);Tp.add(sph(.055),GOLD,.33,.62+i*.22,.47)}Tp.add(rbox(1.1,.46,.96,.18),sh,0,1.42,-.05);Tp.add(rbox(.1,.25,.06,.03),shade(sh,.7),-.42,.95,.46);Tp.add(rbox(.3,.04,.04,.02),GOLD,.45,1.1,.46)}
 if(!coat&&!armor&&!gi&&!tank){Tp.add(rbox(.62,.13,.72,.05),top2,0,1.31,0);Tp.add(rbox(.04,.5,.03,.01),METAL,.0,1.05,.42)}
 if(glow!==undefined&&!armor&&!coat){Tp.add(rbox(.26,.26,.04,.05),glow,.42,1.08,.43,0,0,.78);Tp.add(rbox(.14,.14,.05,.03),mixc(glow,WHITE,.5),.42,1.08,.45,0,0,.78)}
 Tp.add(cyl(.22,.25,.34),sk,0,1.42,0);Tp.add(rbox(.12,.18,.06,.03),sk2,0,1.38,.2);// neck + throat
 // ===== head =====
 const neck=new (T().Group)();neck.position.set(0,1.42,0);const head=piv(0,.62,0,neck);
 Hd.add(rbox(1.0,1.06,.98,.36),sk,0,0,0);
 [-1,1].forEach(s=>{Hd.add(rbox(.14,.28,.22,.07),sk2,s*.53,-.02,-.02);Hd.add(rbox(.05,.16,.1,.03),shade(sk,.72),s*.6,-.02,0)});// ears
 Hd.add(rbox(.13,.2,.12,.05),sk2,0,-.06,.5);Hd.add(rbox(.2,.08,.1,.04),sk2,0,-.15,.5);// nose bridge + tip
 Hd.add(rbox(.3,.12,.06,.05),sk3,0,-.47,.45);// chin
 if([4,11,16].indexOf(a)>=0){const mc=a===11?0x2a2a2a:BLACK;Hd.add(rbox(1.04,.5,1.0,.2),mc,0,-.28,.02);for(let i=0;i<3;i++)Hd.add(rbox(.9,.02,.02,.01),shade(mc,1.6),0,-.15-i*.12,.52)}
 if(a===6){Hd.add(rbox(.9,.98,.12,.2),0xeeeeee,0,0,.5);Hd.add(rbox(.26,.09,.04,.02),BLACK,-.2,.06,.57);Hd.add(rbox(.26,.09,.04,.02),BLACK,.2,.06,.57);Hd.add(rbox(.06,.4,.04,.02),0xb00020,-.2,-.2,.57);Hd.add(rbox(.06,.4,.04,.02),0xb00020,.2,-.2,.57);Hd.add(rbox(.5,.04,.03,.01),0x999999,0,-.38,.57);Hd.add(rbox(.04,.6,.03,.01),0x999999,0,.2,.57)}
 hair(Hd,look);
 // ===== arms =====
 const sleeveC=tank?sk:gi?giC:top,foreC=tank||gi?sk:(armor?METAL:(coat?sh:top)),handC=tank||a===13?WHITE:(armor?DMETAL:sk);
 [1,-1].forEach(s=>{const u=U[s],f=F[s];
  u.add(sph(.34),tank?sk:(armor?METAL:top),0,-.02,0);
  u.add(rbox(.52,.82,.52,.2),sleeveC,0,-.4,0);
  u.add(rbox(.36,.42,.2,.16),shade(sleeveC,1.05),0,-.42,.2);// biceps
  u.add(rbox(.32,.34,.18,.14),shade(sleeveC,.95),0,-.38,-.2);// triceps
  if(tank){u.add(cyl(.29,.29,.12),ac,0,-.5,0);u.add(cyl(.295,.295,.03),shade(ac,.7),0,-.45,0)}
  else if(!gi&&!armor)u.add(cyl(.28,.28,.07),top2,0,-.76,0);// sleeve hem
  if(gi)u.add(cyl(.3,.4,.38),giC,0,-.7,0);
  if(armor){u.add(rbox(.8,.38,.8,.18),METAL,s*.06,.06,0,0,0,s*-.25);u.add(rbox(.84,.1,.84,.05),GOLD,s*.06,-.1,0,0,0,s*-.25);u.add(rbox(.66,.24,.66,.12),DMETAL,s*.05,-.18,0,0,0,s*-.2);rivets(u,[-.25,0,.25],.06,.4)}
  if(coat)u.add(cyl(.29,.29,.1),shade(sh,.7),0,-.78,0);
  f.add(sph(.26),foreC,0,0,0);
  f.add(rbox(.5,.4,.5,.2),foreC,0,-.22,0);f.add(rbox(.44,.42,.44,.18),foreC,0,-.56,0);// tapered forearm
  if(tank||gi)f.add(rbox(.04,.5,.03,.01),sk2,0,-.38,.24);// tendon line
  if(gi)f.add(cyl(.28,.28,.1),giC,0,-.05,0);
  if(ninja){f.add(rbox(.5,.48,.52,.1),DMETAL,0,-.42,.02);for(let i=0;i<3;i++)f.add(rbox(.52,.04,.54,.02),METAL,0,-.26-i*.14,.02);f.add(rbox(.06,.4,.06,.02),METAL,s*.27,-.42,.02)}
  if(armor){f.add(rbox(.56,.52,.56,.12),DMETAL,0,-.48,0);f.add(rbox(.58,.08,.58,.04),GOLD,0,-.24,0);rivets(f,[-.15,.15],-.5,.29)}
  if(coat)f.add(cyl(.3,.32,.2),mixc(sh,WHITE,.6),0,-.66,0);
  f.add(cyl(.25,.25,.12),tank?WHITE:(ninja?LEATHER:ac),0,-.76,0);
  f.add(rbox(.5,.36,.5,.14),handC,0,-.95,0);
  for(let i=0;i<4;i++){f.add(rbox(.12,.17,.15,.05),shade(handC,.9),(i-1.5)*.118,-1.07,.19);f.add(rbox(.1,.06,.1,.03),shade(handC,1.08),(i-1.5)*.118,-.99,.25)}
  f.add(rbox(.14,.14,.3,.06),shade(handC,.88),s*.2,-.93,.14,0,s*.3,0);
  if(tank){for(let i=0;i<4;i++)f.add(rbox(.53,.05,.53,.02),i%2?0xdcdcdc:0xeeeeee,0,-.8-i*.1,0,0,0,(i%2?.1:-.1))}
 });
 // ===== legs =====
 [1,-1].forEach(s=>{const u=LU[s],d=LD[s];
  u.add(rbox(.62,.96,.66,.22),pa,0,-.44,0);
  u.add(rbox(.44,.5,.2,.18),shade(pa,1.04),0,-.36,.24);// thigh muscle
  u.add(rbox(.04,.32,.36,.02),pa2,s*.315,-.36,0);u.add(rbox(.04,.08,.36,.02),pa2,s*.315,-.22,0);// pocket + flap
  u.add(rbox(.02,.9,.02,.01),pa2,s*.31,-.44,-.2);// outer seam
  if(gi)u.add(rbox(.66,.9,.7,.24),giC,0,-.44,0);
  if(coat)u.add(rbox(.68,.7,.72,.2),sh,0,-.25,0);
  const legC=gi?giC:pa;
  d.add(sph(.28),legC,0,0,0);
  d.add(rbox(.56,.78,.6,.2),legC,0,-.38,0);
  d.add(rbox(.4,.36,.2,.16),shade(legC,1.04),0,-.32,-.25);// calf
  d.add(rbox(.6,.08,.64,.04),shade(legC,.8),0,-.66,0);// cuff
  if(armor){d.add(rbox(.52,.42,.22,.12),METAL,0,-.08,.3);d.add(sph(.08),GOLD,0,-.08,.42);d.add(rbox(.6,.5,.64,.14),DMETAL,0,-.52,0)}
  if(ninja){for(let i=0;i<4;i++)d.add(rbox(.6,.06,.64,.02),0xd8d0b8,0,-.28-i*.12,0,0,0,(i%2?.12:-.12))}
  const shoe=ninja?0x222222:armor?DMETAL:look.shoe,sole=shoe===0xf2f2f2?0x2a2a2a:0xf0f0f0;
  d.add(rbox(.66,.14,1.0,.06),sole,0,-.9,.12);
  d.add(rbox(.6,.04,.98,.02),shade(sole,.75),0,-.96,.12);// tread line
  d.add(rbox(.6,.32,.86,.14),shoe,0,-.74,.09);
  d.add(rbox(.5,.13,.24,.06),shade(shoe,.85),0,-.8,.48);
  if(!ninja&&!armor){
   d.add(rbox(.3,.18,.3,.08),shade(shoe,1.1),0,-.58,.2,-.4,0,0);// tongue
   for(let i=0;i<3;i++){d.add(rbox(.32,.035,.06,.015),sole,0,-.62+i*.0,.24+i*.1);d.add(sph(.025),METAL,-.15,-.62,.24+i*.1);d.add(sph(.025),METAL,.15,-.62,.24+i*.1)}
   d.add(rbox(.04,.12,.5,.02),ac,s*.305,-.76,.08,0,0,0);d.add(rbox(.26,.14,.06,.03),ac,0,-.62,-.34)}
 });
 // ===== per-archetype gear =====
 const both=(fn)=>[1,-1].forEach(fn);
 switch(a){
  case 0:Tp.add(tor(.36,.025),GOLD,0,1.3,.08,Math.PI/2.4,0,0);both(s=>F[s].add(cyl(.27,.27,.16),0xc62828,0,-.62,0));break;// chain + wristbands
  case 1:both(s=>{for(let i=0;i<3;i++)F[s].add(rbox(.5,.05,.5,.02),0xe8dcc0,0,-.3-i*.12,0,0,0,(i%2?.1:-.1))});break;
  case 2:Tp.add(rbox(.18,1.2,.06,.03),0x8b0000,0,.85,.43,0,0,.62);Hp.add(tor(.72,.05),0xc9a46a,0,.2,0,Math.PI/2,0,0,1,.95,1);break;// sash + rope belt
  case 3:Tp.add(tor(.34,.035),METAL,0,1.28,.1,Math.PI/2.3,0,0);both(s=>LD[s].add(rbox(.5,.36,.2,.12),BLACK,0,-.06,.3));break;
  case 4:Tp.add(rbox(.04,.5,.03,.01),0xdddddd,-.2,1.05,.43);Tp.add(rbox(.04,.5,.03,.01),0xdddddd,.2,1.05,.43);Hp.add(rbox(.3,.26,.08,.05),BONE,0,.33,.43);for(let i=0;i<5;i++)Hp.add(tor(.06,.02),METAL,.45+i*.07,.1-i*.06,.4,0,Math.PI/2,0);break;// hood strings, skull buckle, chain
  case 5:Tp.add(rbox(.7,1.2,.06,.04),0x8b1a1a,0,.4,.48);Tp.add(rbox(.3,.3,.03,.05),GOLD,0,.6,.52,0,0,.78);break;// tabard
  case 6:both(s=>F[s].add(rbox(.52,.38,.52,.14),0x111111,0,-.95,0));break;// black gloves
  case 7:both(s=>{U[s].add(con(.1,.3,5),DMETAL,s*.15,.28,.0,0,0,-s*.5);U[s].add(con(.1,.3,5),DMETAL,s*.05,.32,.18,0,0,-s*.3)});Hp.add(rbox(1.6,.34,.86,.1),GOLD,0,.33,0);break;// spiked shoulders + big belt
  case 8:Tp.add(rbox(.14,1.3,.06,.03),LEATHER,0,.85,.43,0,0,-.62);Tp.add(rbox(.5,1.2,.4,.12),0x5a3a1a,.2,1.0,-.6,0,0,-.25);for(let i=0;i<4;i++)Tp.add(con(.06,.4,4),0xd8d0b8,.05+i*.1,1.75-i*.04,-.6,0,0,-.25);break;// strap + quiver
  case 9:for(let i=0;i<12;i++){const t=i/12*6.283;Tp.add(sph(.065),0x6b3e1f,Math.sin(t)*.45,1.2-Math.abs(Math.cos(t))*.28,Math.cos(t)*.42+.05)}break;// prayer beads
  case 10:Tp.add(rbox(.8,1.25,.06,.04),0x1d3f8a,0,.4,.48);Tp.add(rbox(.34,.34,.04,.04),WHITE,0,.6,.52);Tp.add(rbox(.1,.3,.05,.02),0xc62828,0,.6,.55);Tp.add(rbox(.3,.08,.05,.02),0xc62828,0,.64,.55);break;// tabard with cross
  case 11:Tp.add(rbox(.12,1.3,.06,.03),LEATHER,0,.85,.43,0,0,.62);Tp.add(rbox(.12,1.3,.06,.03),LEATHER,0,.85,.44,0,0,-.62);both(s=>{LU[s].add(rbox(.22,.4,.14,.05),LEATHER,s*.33,-.5,.05);LU[s].add(con(.05,.35,4),METAL,s*.33,-.22,.05)});break;// X straps + kunai holsters
  case 12:both(s=>{U[s].add(rbox(.75,.18,.7,.06),0x8b0000,s*.05,-.05,0,0,0,s*-.3);U[s].add(rbox(.72,.18,.68,.06),0x6b0000,s*.05,-.22,0,0,0,s*-.3);U[s].add(rbox(.7,.18,.66,.06),0x8b0000,s*.05,-.39,0,0,0,s*-.3)});Hp.add(rbox(1.5,.24,.84,.08),0x3b2a7a,0,.2,0);break;// sode plates + obi
  case 13:U[1].add(rbox(.8,.4,.8,.18),GOLD,.06,.06,0,0,0,-.25);for(let i=-3;i<=3;i++)Hp.add(rbox(.16,.55,.06,.03),LEATHER,i*.2,-.32,.4);break;// one pauldron + leather strips
  case 14:Tp.add(rbox(.24,.24,.05,.05),0x9fd3ff,0,1.0,.43,0,0,.78);Tp.add(tor(.3,.02),GOLD,0,1.25,.1,Math.PI/2.5,0,0);Hp.add(rbox(1.5,.26,.84,.08),0x3b2a7a,0,.2,0);break;// amulet + sash
  case 15:for(let i=0;i<14;i++){const t=i/14*Math.PI-Math.PI/2;Tp.add(con(.12,.4,5),i%2?FUR:shade(FUR,.8),Math.sin(t)*.72,1.35,Math.cos(t)*.35-.05,-.5+Math.cos(t)*.5,0,-Math.sin(t)*.9)}for(let i=0;i<5;i++)Tp.add(con(.04,.18,4),BONE,-.2+i*.1,1.12-Math.abs(i-2)*.05,.44,Math.PI,0,0);break;// fur collar + bone necklace
  case 16:both(s=>F[s].add(rbox(.06,.06,.6,.02),METAL,s*.27,-.7,.3));break;// hidden blades
  case 17:{Tp.add(cyl(.7,.7,.12,20),0x8a5a2a,0,.95,-.52,Math.PI/2,0,0);Tp.add(cyl(.2,.2,.14,12),GOLD,0,.95,-.6,Math.PI/2,0,0);for(let i=0;i<8;i++){const t=i/8*6.283;Tp.add(sph(.04),GOLD,Math.cos(t)*.6,.95+Math.sin(t)*.6,-.6)}break}// round shield on back
  case 18:{const rc=0x3ad0ff;Tp.add(rbox(.04,.4,.03,.01),rc,-.25,1.0,.43);Tp.add(rbox(.3,.04,.03,.01),rc,-.25,1.1,.43);Tp.add(rbox(.04,.3,.03,.01),rc,.25,.95,.43,0,0,.4);break}// runes
  case 19:Hp.add(rbox(1.62,.36,.86,.1),GOLD,0,.33,0);Hp.add(rbox(.62,.5,.1,.12),GOLD,0,.33,.46);Hp.add(rbox(.4,.3,.04,.08),0xc62828,0,.33,.52);Hp.add(sph(.08),0x9fd3ff,0,.33,.55);rivets(Hp,[-.6,-.45,.45,.6],.33,.45,0xf5e6a0);Tp.add(rbox(.16,1.3,.06,.03),0xc62828,0,.85,.43,0,0,.62);break;// title belt + sash
 }
 // ===== assemble =====
 const hips=piv(0,2.45,0,root);attach(Hp,hips);
 head.scale.setScalar(.86);
 stretch(LU[1],1.22);stretch(LU[-1],1.22);stretch(LD[1],1.25,-.7,-.2);stretch(LD[-1],1.25,-.7,-.2);
 const torso=piv(0,.3,0,hips);attach(Tp,torso);
 torso.add(neck);
 const faceM=a===6?null:new (T().Mesh)(new (T().PlaneGeometry)(.92,.92),faceTex(look,0));if(faceM){faceM.position.set(0,0,.535);faceM.renderOrder=2;head.add(faceM)}
 attach(Hd,head);
 if(a===18){const em=new (T().MeshStandardMaterial)({color:0x7fe7ff,emissive:0x3ad0ff,emissiveIntensity:2});[-1,1].forEach(s=>{const e=new (T().Mesh)(sph(.06),em);e.position.set(s*.18,.02,.52);head.add(e)})}
 if(a===14){const em=new (T().MeshStandardMaterial)({color:0x9fd3ff,emissive:0x3a9dff,emissiveIntensity:1.5});const e=new (T().Mesh)(sph(.09),em);e.position.set(0,1.0,.47);torso.add(e)}
 const arm=s=>{const sp=piv(s*1.04,1.14,0,torso);attach(U[s],sp);const el=piv(0,-.8,0,sp);attach(F[s],el);return{sp,el}};
 const L=arm(1),R=arm(-1);
 const leg=s=>{const hp=piv(s*.36,-.15,0,hips);attach(LU[s],hp);const kn=piv(0,-1.1,0,hp);attach(LD[s],kn);return{hp,kn}};
 const LL=leg(1),RL=leg(-1);
 // cloth: capes, coat tails, scarves (sway in update)
 const sway=[];
 const chain=(parent,x,y,z,w,len,n,col,thick,ang,trim)=>{let p=parent;const segs=[];for(let i=0;i<n;i++){const pv=piv(i?0:x,i?-len/n:y,i?0:z,p);const C=Part();const sw=w*(1-i*.06);C.add(rbox(sw,len/n+.04,thick,Math.min(.04,thick/2.2)),i%2?shade(col,.92):col,0,-len/n/2,0);
   if(trim&&i===n-1)C.add(rbox(sw+.02,.1,thick+.02,.03),trim,0,-len/n+.02,0);if(trim&&i===0)C.add(rbox(sw*.9,.06,thick+.02,.02),trim,0,-.04,0);attach(C,pv);segs.push(pv);p=pv}sway.push({segs,ang:ang||0});return segs};
 const capeCol={4:0x141414,6:0x3a0f4a,17:0x1d3f8a,18:0x0d1b3a,19:0xb3202a}[a];
 if(capeCol!==undefined){chain(torso,0,1.28,-.44,1.45,2.7,5,capeCol,.07,.12,a===19||a===17?GOLD:shade(capeCol,1.6));const cl=Part();cl.add(sph(.1),GOLD,-.6,1.28,-.36);cl.add(sph(.1),GOLD,.6,1.28,-.36);attach(cl,torso)}
 if(coat){chain(hips,-.38,-.05,-.36,.62,1.7,3,sh,.08,.05,shade(sh,.7));chain(hips,.38,-.05,-.36,.62,1.7,3,sh,.08,.05,shade(sh,.7))}
 if(gi){chain(hips,.25,.22,.44,.12,.6,2,BLACK,.05,-.1);chain(hips,.38,.22,.44,.12,.55,2,BLACK,.05,-.1)}
 if(ninja||a===2||a===8){const sc={2:0x8b0000,8:0x7a5a2a}[a]||0xb3202a;const Sc=Part();Sc.add(tor(.5,.13),sc,0,1.32,0,Math.PI/2,0,0,1,1,.9);Sc.add(tor(.46,.1),shade(sc,.8),0,1.42,0,Math.PI/2,0,0,1,1,.9);attach(Sc,torso);chain(torso,.25,1.28,-.4,.3,1.6,4,sc,.06,.2,shade(sc,.7));chain(torso,-.05,1.25,-.42,.28,1.2,3,sc,.06,.15,shade(sc,.7))}
 // glowing fists (awakening)
 const fg=side=>{const m=new (T().Mesh)(rbox(.62,.48,.62,.16),new (T().MeshStandardMaterial)({color:glow||0xffffff,emissive:glow||0xffffff,emissiveIntensity:.8}));m.position.y=-.97;m.visible=false;side.el.add(m);return m};
 const glowL=fg(L),glowR=fg(R);
 return{g,root,hips,torso,neck,head,L,R,LL,RL,glow:[glowL,glowR],cur:{},look,chest:torso,face:faceM,sway,ex:0};
}
// ---------- hair & headwear ----------
function hair(P,look){
 const a=look.arch,h=look.hair,h2=shade(h,1.25),h3=shade(h,.75),T0=.5;
 const spikes=(n,len,col,tilt,y0,rad)=>{for(let i=0;i<n;i++){const t=i/n*6.283;const lean=tilt||.75;P.add(con(.2,len,6),i%2?col:shade(col,1.15),Math.sin(t)*(rad||.32),(y0||T0)+.12,Math.cos(t)*(rad||.32)-.05,Math.cos(t)*lean,0,-Math.sin(t)*lean);const t2=t+3.14/n;P.add(con(.11,len*.7,5),shade(col,1.3),Math.sin(t2)*(rad||.32)*1.1,(y0||T0)+.1,Math.cos(t2)*(rad||.32)*1.1-.05,Math.cos(t2)*lean*1.1,0,-Math.sin(t2)*lean*1.1)}};
 const cap=(col,y)=>{P.add(rbox(1.06,.34,1.06,.16),col,0,(y||T0)-.02,-.01);P.add(rbox(.5,.06,.9,.03),shade(col,1.35),.15,(y||T0)+.15,0,0,0,-.12);for(let i=0;i<6;i++)P.add(rbox(.04,.05,.9,.02),shade(col,.8),-.4+i*.16,(y||T0)+.14,0)};
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
 r.hips.position.y=2.45;
}
window.Rig={build,lookFor,update,play,m1Keys,setQuality,ARCH,STYLE,STYLE_NAMES,A};
})();
