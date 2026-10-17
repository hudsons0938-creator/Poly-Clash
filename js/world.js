/* City map: streets, buildings (solid), breakable + throwable props, debris, craters, lighting. */
(function(){
const T=()=>window.THREE;
let scene,sun,hemi,low=false;
const B=[];// building AABBs {x0,x1,z0,z1,h}
const props=[];const debris=[];const decals=[];const smashed=[];
const HALF=170;
const rnd=(a,b)=>a+Math.random()*(b-a);
const mc={};function M(c,o){const k=c+JSON.stringify(o||0);if(!mc[k])mc[k]=new (T().MeshStandardMaterial)(Object.assign({color:c,roughness:.8},o||{}));return mc[k]}
function mesh(geo,m,x,y,z,parent,shadow){const o=new (T().Mesh)(geo,m);o.position.set(x,y,z);if(shadow!==false){o.castShadow=!low;o.receiveShadow=true}(parent||scene).add(o);return o}
// ---------- textures ----------
function winTex(){const c=document.createElement("canvas");c.width=64;c.height=64;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,64,64);
 for(let i=0;i<2;i++)for(let j=0;j<2;j++){const lit=Math.random()<.35;x.fillStyle=lit?"#ffe9a8":"#3a4a5e";x.fillRect(6+i*32,8+j*32,20,20);x.fillStyle="rgba(255,255,255,.25)";x.fillRect(6+i*32,8+j*32,20,4)}
 const t=new (T().CanvasTexture)(c);t.wrapS=t.wrapT=T().RepeatWrapping;return t}
function crackTex(){const c=document.createElement("canvas");c.width=c.height=128;const x=c.getContext("2d");const g=x.createRadialGradient(64,64,4,64,64,62);g.addColorStop(0,"rgba(10,10,10,.95)");g.addColorStop(.45,"rgba(30,30,30,.7)");g.addColorStop(1,"rgba(0,0,0,0)");x.fillStyle=g;x.beginPath();x.arc(64,64,62,0,6.3);x.fill();
 x.strokeStyle="rgba(0,0,0,.9)";x.lineWidth=2.5;for(let i=0;i<11;i++){let a=Math.random()*6.28,px=64,py=64;x.beginPath();x.moveTo(px,py);for(let s=0;s<5;s++){a+=rnd(-.5,.5);px+=Math.cos(a)*12;py+=Math.sin(a)*12;x.lineTo(px,py)}x.stroke()}
 return new (T().CanvasTexture)(c)}
let CRACK,WIN;
// ---------- sky ----------
function sky(){const c=document.createElement("canvas");c.width=4;c.height=256;const x=c.getContext("2d");const g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,"#2b5fa8");g.addColorStop(.45,"#8db7e6");g.addColorStop(.6,"#f3d7b0");g.addColorStop(1,"#e8c9a0");x.fillStyle=g;x.fillRect(0,0,4,256);
 const t=new (T().CanvasTexture)(c);const s=new (T().Mesh)(new (T().SphereGeometry)(900,24,12),new (T().MeshBasicMaterial)({map:t,side:T().BackSide,fog:false}));scene.add(s)}
// ---------- buildings ----------
function building(cx,cz,w,d,h){const before=scene.children.length;
 const geo=new (T().BoxGeometry)(w,h,d),uv=geo.attributes.uv;
 const fx=[d/6,d/6,0,0,w/6,w/6],fy=h/6;// faces: +x,-x,+y,-y,+z,-z
 for(let f=0;f<6;f++)for(let v=0;v<4;v++){const i=f*4+v;if(f===2||f===3){uv.setXY(i,0,0);continue}uv.setXY(i,uv.getX(i)*Math.max(1,Math.round(fx[f])),uv.getY(i)*Math.max(1,Math.round(fy)))}
 const base=[0x8b8f98,0xa3876b,0x6f7c8c,0x9c6b5a,0xb8b2a6,0x58626e,0x7a6f8f][Math.floor(Math.random()*7)];
 const side=new (T().MeshStandardMaterial)({color:base,map:WIN,roughness:.85}),roof=M(0x3d4048);
 const b=mesh(geo,[side,side,roof,roof,side,side],cx,h/2,cz);b.castShadow=!low;
 // ledge + rooftop clutter
 mesh(new (T().BoxGeometry)(w+.6,.5,d+.6),M(0x2e3036),cx,h+.25,cz);
 if(Math.random()<.6)mesh(new (T().BoxGeometry)(rnd(2,4),rnd(1.5,3),rnd(2,4)),M(0x9a9da3),cx+rnd(-w/4,w/4),h+1.5,cz+rnd(-d/4,d/4));
 if(Math.random()<.3){const tw=mesh(new (T().CylinderGeometry)(1.6,1.6,3,10),M(0x6b4a2b),cx+rnd(-w/4,w/4),h+3.5,cz+rnd(-d/4,d/4));}
 // shop front stripe + awning at street level
 mesh(new (T().BoxGeometry)(w+.1,3.2,d+.1),M(0x25272d),cx,1.6,cz,null,false);
 if(Math.random()<.5){const col=[0xc62828,0x1565c0,0x2e7d32,0xf9a825,0x6a1b9a][Math.floor(Math.random()*5)];mesh(new (T().BoxGeometry)(w*.8,.3,1.4),M(col),cx,3.6,cz+d/2+.6)}
 if(Math.random()<.35){const nc=[0xff2fd0,0x00e5ff,0xffe14d,0xff5a36][Math.floor(Math.random()*4)];mesh(new (T().BoxGeometry)(.3,4,1.6),new (T().MeshStandardMaterial)({color:nc,emissive:nc,emissiveIntensity:1.2}),cx+w/2+.2,8,cz+rnd(-d/3,d/3),null,false)}
 B.push({x0:cx-w/2,x1:cx+w/2,z0:cz-d/2,z1:cz+d/2,h,cx,cz,w,d,meshes:scene.children.slice(before)});
}
// ---------- props ----------
const PT={
 trash:{r:.8,hp:15,throw:1,mass:1,cols:[0x2f6b3a,0x555555],mk(g){mesh(new (T().CylinderGeometry)(.7,.6,1.7,12),M(0x2f6b3a,{metalness:.3}),0,.85,0,g);mesh(new (T().CylinderGeometry)(.78,.78,.15,12),M(0x24502c),0,1.75,0,g)}},
 bench:{r:1.5,hp:20,throw:1,mass:1.6,cols:[0x8b5a2b,0x333333],mk(g){const w=M(0x8b5a2b),m=M(0x2b2b2b,{metalness:.5});mesh(new (T().BoxGeometry)(3.2,.2,1),w,0,1,0,g);mesh(new (T().BoxGeometry)(3.2,.9,.15),w,0,1.55,-.45,g);mesh(new (T().BoxGeometry)(.15,1,1),m,-1.4,.5,0,g);mesh(new (T().BoxGeometry)(.15,1,1),m,1.4,.5,0,g)}},
 hydrant:{r:.6,hp:12,throw:1,mass:.8,cols:[0xc62828],mk(g){const m=M(0xc62828,{metalness:.3});mesh(new (T().CylinderGeometry)(.35,.45,1.2,10),m,0,.6,0,g);mesh(new (T().SphereGeometry)(.38,10,6),m,0,1.25,0,g);mesh(new (T().CylinderGeometry)(.14,.14,1.1,6),m,0,.85,0,g).rotation.z=1.57}},
 cone:{r:.5,hp:5,throw:1,mass:.4,cols:[0xff6d00,0xffffff],mk(g){mesh(new (T().ConeGeometry)(.45,1.2,10),M(0xff6d00),0,.65,0,g);mesh(new (T().BoxGeometry)(1,.1,1),M(0xff6d00),0,.05,0,g)}},
 mailbox:{r:.7,hp:15,throw:1,mass:1,cols:[0x1e4fa8],mk(g){const m=M(0x1e4fa8,{metalness:.3});mesh(new (T().BoxGeometry)(.9,1.1,.9),m,0,1.2,0,g);mesh(new (T().CylinderGeometry)(.45,.45,.9,10,1,false,0,Math.PI),m,0,1.75,0,g).rotation.z=1.57;mesh(new (T().BoxGeometry)(.15,.7,.15),M(0x222222),0,.35,0,g)}},
 crate:{r:1,hp:14,throw:1,mass:1.2,cols:[0xa0703a,0x6b4a2b],mk(g){mesh(new (T().BoxGeometry)(1.6,1.6,1.6),M(0xa0703a),0,.8,0,g);mesh(new (T().BoxGeometry)(1.65,.2,1.65),M(0x6b4a2b),0,.8,0,g)}},
 barrier:{r:1.4,hp:30,throw:1,mass:2.2,cols:[0xb0b0b0],mk(g){mesh(new (T().BoxGeometry)(3,1.1,.9),M(0xb0b0b0),0,.55,0,g);mesh(new (T().BoxGeometry)(3,.3,.5),M(0xc62828),0,1.2,0,g)}},
 lamp:{r:.5,hp:25,throw:0,mass:3,cols:[0x3a3a3a,0xfff3c4],mk(g){mesh(new (T().CylinderGeometry)(.15,.22,7,8),M(0x3a3a3a,{metalness:.5}),0,3.5,0,g);mesh(new (T().BoxGeometry)(1.8,.15,.3),M(0x3a3a3a),.8,7,0,g);mesh(new (T().BoxGeometry)(.7,.3,.5),new (T().MeshStandardMaterial)({color:0xfff3c4,emissive:0xfff3c4,emissiveIntensity:1}),1.5,6.8,0,g,false)}},
 tree:{r:.8,hp:30,throw:0,mass:3,cols:[0x5a3a1a,0x2f8a3a],mk(g){mesh(new (T().CylinderGeometry)(.35,.45,3.4,8),M(0x5a3a1a),0,1.7,0,g);mesh(new (T().IcosahedronGeometry)(2.2,0),M(0x2f8a3a,{flatShading:true}),0,4.6,0,g);mesh(new (T().IcosahedronGeometry)(1.6,0),M(0x3fa04a,{flatShading:true}),.8,5.6,.4,g)}},
 car:{r:2.3,hp:60,throw:0,mass:6,cols:[0,0x222222,0x9fd3ff],mk(g,col){const b=M(col,{metalness:.4,roughness:.4});mesh(new (T().BoxGeometry)(2.2,1,4.4),b,0,.9,0,g);mesh(new (T().BoxGeometry)(1.9,.9,2.2),M(0x9fd3ff,{metalness:.6,roughness:.15}),0,1.8,-.2,g);[[-1,1.4],[1,1.4],[-1,-1.4],[1,-1.4]].forEach(p=>{const w=mesh(new (T().CylinderGeometry)(.45,.45,.4,12),M(0x111111),p[0]*1.05,.45,p[1],g);w.rotation.z=1.57})}}
};
function addProp(type,x,z,ry,col){const def=PT[type],g=new (T().Group)();def.mk(g,col);g.position.set(x,0,z);g.rotation.y=ry||0;scene.add(g);
 const p={type,def,g,x,z,y:0,ry:ry||0,hx:x,hz:z,hry:ry||0,hp:def.hp,alive:true,held:null,fly:null,rt:0,col};if(type==="car")p.def=Object.assign({},def,{cols:[col,0x222222,0x9fd3ff]});props.push(p);return p}
// ---------- build ----------
function build(sc,q){scene=sc;low=!!q.low;B.length=0;props.length=0;debris.length=0;decals.length=0;smashed.length=0;
 WIN=winTex();CRACK=crackTex();
 scene.background=new (T().Color)(0x9fbfe0);scene.fog=new (T().Fog)(0xc9d6e3,90,320);sky();
 hemi=new (T().HemisphereLight)(0xdde8ff,0x4a4038,.75);scene.add(hemi);
 sun=new (T().DirectionalLight)(0xfff1dc,1.05);sun.position.set(60,110,40);sun.castShadow=true;
 const sm=low?1024:2048;sun.shadow.mapSize.set(sm,sm);const sc2=sun.shadow.camera;sc2.left=-55;sc2.right=55;sc2.top=55;sc2.bottom=-55;sc2.near=10;sc2.far=300;sun.shadow.bias=-.0006;sun.shadow.normalBias=.4;scene.add(sun);scene.add(sun.target);
 // ground (sidewalk/concrete)
 const gnd=mesh(new (T().PlaneGeometry)(HALF*2+300,HALF*2+300),M(0x86847e),0,0,0);gnd.rotation.x=-Math.PI/2;gnd.castShadow=false;
 const road=M(0x2c2e33),line=new (T().MeshBasicMaterial)({color:0xf2c230}),white=new (T().MeshBasicMaterial)({color:0xeeeeee});
 const RD=[-120,-60,0,60,120],RW=16;
 RD.forEach(r=>{const a=mesh(new (T().PlaneGeometry)(RW,HALF*2),road,r,.02,0);a.rotation.x=-Math.PI/2;a.castShadow=false;const b=mesh(new (T().PlaneGeometry)(HALF*2,RW),road,0,.021,r);b.rotation.x=-Math.PI/2;b.castShadow=false});
 // lane dashes + crosswalks (instanced)
 const dashG=new (T().PlaneGeometry)(.35,3),N=[];
 RD.forEach(r=>{for(let s=-HALF;s<HALF;s+=8){if(RD.some(o=>Math.abs(s-o)<RW/2+1))continue;N.push([r,s,0],[s,r,1])}});
 const im=new (T().InstancedMesh)(dashG,line,N.length),o=new (T().Object3D)();N.forEach((n,i)=>{o.position.set(n[0],.03,n[1]);o.rotation.set(-Math.PI/2,0,n[2]?Math.PI/2:0);o.updateMatrix();im.setMatrixAt(i,o.matrix)});scene.add(im);
 const cw=[];RD.forEach(a=>RD.forEach(b=>{for(let k=-6;k<=6;k+=2){cw.push([a+k,b+RW/2+1.5,0],[a+k,b-RW/2-1.5,0],[a+RW/2+1.5,b+k,1],[a-RW/2-1.5,b+k,1])}}));
 const cg=new (T().PlaneGeometry)(.9,3),ci=new (T().InstancedMesh)(cg,white,cw.length);cw.forEach((n,i)=>{o.position.set(n[0],.03,n[1]);o.rotation.set(-Math.PI/2,0,n[2]?Math.PI/2:0);o.updateMatrix();ci.setMatrixAt(i,o.matrix)});scene.add(ci);
 // blocks between roads: centres at ±30, ±90, ±150
 const C=[-150,-90,-30,30,90,150];
 C.forEach(bx=>C.forEach(bz=>{
  const plaza=Math.abs(bx)===30&&Math.abs(bz)===30;
  if(plaza){plazaBlock(bx,bz);return}
  const edge=Math.abs(bx)===150||Math.abs(bz)===150;
  const n=Math.random()<.5?2:1;
  if(n===1)building(bx,bz,rnd(26,38),rnd(26,38),edge?rnd(45,90):rnd(18,60));
  else{const sx=Math.random()<.5;for(let i=-1;i<=1;i+=2){const w=sx?17:rnd(26,36),d=sx?rnd(26,36):17;building(bx+(sx?i*10.5:0),bz+(sx?0:i*10.5),w,d,edge?rnd(40,85):rnd(14,55))}}
  sidewalkProps(bx,bz);
 }));
 // skyline beyond the boundary
 for(let i=0;i<40;i++){const a=i/40*6.283,R=rnd(200,260);const h=rnd(40,120),w=rnd(20,40);mesh(new (T().BoxGeometry)(w,h,w),M(0x7d8796),Math.cos(a)*R,h/2,Math.sin(a)*R,null,false)}
 // parked cars and cones on roads
 RD.forEach(r=>{for(let s=-150;s<=150;s+=30){if(Math.random()<.35)addProp("car",r+5.5,s+rnd(-6,6),0,[0xc62828,0x1565c0,0xeeeeee,0x222222,0xf9a825,0x2e7d32][Math.floor(Math.random()*6)]);if(Math.random()<.3)addProp("car",s+rnd(-6,6),r-5.5,Math.PI/2,[0xc62828,0x1565c0,0xeeeeee,0x222222,0xf9a825][Math.floor(Math.random()*5)]);if(Math.random()<.25)addProp("cone",r+rnd(-3,3),s+rnd(-8,8))}});
}
function plazaBlock(bx,bz){
 const sx=Math.sign(bx),sz=Math.sign(bz);
 // tiles
 const t=mesh(new (T().PlaneGeometry)(44,44),M(0xb7aa95),bx,.025,bz);t.rotation.x=-Math.PI/2;t.castShadow=false;
 for(let i=0;i<4;i++)addProp("tree",bx+rnd(-16,16),bz+rnd(-16,16));
 for(let i=0;i<4;i++){const a=i*Math.PI/2;addProp("bench",bx+Math.cos(a)*9,bz+Math.sin(a)*9,-a+Math.PI/2)}
 for(let i=0;i<3;i++)addProp("crate",bx+rnd(-18,18),bz+rnd(-18,18),rnd(0,3));
 addProp("trash",bx+12*sx,bz+3);addProp("trash",bx-3,bz+12*sz);addProp("barrier",bx-14*sx,bz-14*sz,.8);
 addProp("lamp",bx+18,bz+18);addProp("lamp",bx-18,bz-18);
 if(sx>0&&sz>0){// fountain near the centre crossroads
  mesh(new (T().CylinderGeometry)(5,5.4,1.2,20),M(0x9a958c),bx-12,.6,bz-12);mesh(new (T().CylinderGeometry)(4.4,4.4,.2,20),new (T().MeshStandardMaterial)({color:0x3f8fd6,roughness:.1,metalness:.2}),bx-12,1.15,bz-12);mesh(new (T().CylinderGeometry)(.6,.9,3,10),M(0x9a958c),bx-12,2,bz-12);
  B.push({x0:bx-17,x1:bx-7,z0:bz-17,z1:bz-7,h:1.2,round:1});
 }
}
function sidewalkProps(bx,bz){
 const e=20.5;// sidewalk ring around each block
 const spots=[[e,0],[-e,0],[0,e],[0,-e],[e,12],[-e,-12],[12,e],[-12,-e]];
 spots.forEach((s,i)=>{const x=bx+s[0]+rnd(-2,2),z=bz+s[1]+rnd(-2,2);if(B.some(b=>x>b.x0-1.5&&x<b.x1+1.5&&z>b.z0-1.5&&z<b.z1+1.5))return;
  const r=Math.random();const ry=Math.abs(s[0])>Math.abs(s[1])?Math.PI/2*Math.sign(s[0]):(s[1]<0?Math.PI:0);
  if(i<4)addProp("lamp",x,z,ry+Math.PI/2);else addProp(r<.35?"trash":r<.6?"bench":r<.72?"hydrant":r<.85?"mailbox":"crate",x,z,ry)});
}
// ---------- collision ----------
function resolve(f,rad){// push a fighter out of buildings + solid props; returns hit info
 let hit=null;rad=rad||.9;
 for(const b of B){if(f.y>b.h)continue;
  if(f.x>b.x0-rad&&f.x<b.x1+rad&&f.z>b.z0-rad&&f.z<b.z1+rad){
   const dl=f.x-(b.x0-rad),dr=b.x1+rad-f.x,dn=f.z-(b.z0-rad),df=b.z1+rad-f.z,m=Math.min(dl,dr,dn,df);
   if(m===dl){f.x=b.x0-rad;hit={nx:-1,nz:0,b}}else if(m===dr){f.x=b.x1+rad;hit={nx:1,nz:0,b}}else if(m===dn){f.z=b.z0-rad;hit={nx:0,nz:-1,b}}else{f.z=b.z1+rad;hit={nx:0,nz:1,b}}
  }}
 for(const p of props){if(!p.alive||p.held||p.fly||f.y>2.2)continue;const dx=f.x-p.x,dz=f.z-p.z,d=Math.hypot(dx,dz),R=p.def.r+rad*.6;if(d<R&&d>0){f.x=p.x+dx/d*R;f.z=p.z+dz/d*R;if(!hit)hit={prop:p,nx:dx/d,nz:dz/d}}}
 const L=HALF-2;if(f.x<-L)f.x=-L;if(f.x>L)f.x=L;if(f.z<-L)f.z=-L;if(f.z>L)f.z=L;
 return hit;
}
function blocked(x,y,z){for(const b of B)if(y<b.h&&x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1)return b;return null}
function camClip(tx,ty,tz,cx,cy,cz){// march from target to camera, stop before buildings
 const steps=24;let lx=tx,ly=ty,lz=tz;for(let i=1;i<=steps;i++){const t=i/steps,x=tx+(cx-tx)*t,y=ty+(cy-ty)*t,z=tz+(cz-tz)*t;if(blocked(x,y,z)||y<.5)return[lx,Math.max(ly,1),lz];lx=x;ly=y;lz=z}return[cx,cy,cz]}
// ---------- breaking ----------
function spawnDebris(x,y,z,cols,n,pw,size){
 for(let i=0;i<n;i++){if(debris.length>(low?120:260)){const o=debris.shift();scene.remove(o.m)}
  const s=(size||.5)*rnd(.4,1.1),m=mesh(new (T().BoxGeometry)(s,s*rnd(.5,1),s*rnd(.6,1.2)),M(cols[i%cols.length]),x+rnd(-.5,.5),y+rnd(0,1),z+rnd(-.5,.5));
  const a=Math.random()*6.283,sp=rnd(3,10)*(pw||1);debris.push({m,vx:Math.cos(a)*sp,vy:rnd(6,14)*(pw||1)*.8,vz:Math.sin(a)*sp,rx:rnd(-8,8),rz:rnd(-8,8),l:rnd(5,8)})}
}
function breakProp(p,dx,dz,pw){if(!p.alive)return;p.alive=false;p.held=null;p.fly=null;p.g.visible=false;p.rt=25;
 spawnDebris(p.x,p.y+.8,p.z,p.def.cols.map(c=>c||p.col||0x777777),p.type==="car"?16:9,pw||1,p.type==="car"?.9:.5);
 if(window.FX){FX.dust(p.x,p.y+.5,p.z,6);if(p.type==="car"){FX.boom(p.x,1.2,p.z,0xff7a1a,5);FX.shake(.5)}}
 return true}
function damageProps(x,z,r,dmg,dx,dz,y){let n=0;for(const p of props){if(!p.alive||p.held)continue;if(y!==undefined&&Math.abs((p.y||0)-y)>4)continue;if(Math.hypot(p.x-x,p.z-z)<r+p.def.r){p.hp-=dmg;n++;if(p.hp<=0)breakProp(p,dx,dz,1.2);else if(window.FX)FX.dust(p.x,1,p.z,2)}}return n}
function crater(x,z,s){if(decals.length>(low?14:30)){const o=decals.shift();scene.remove(o.m)}
 const m=new (T().Mesh)(new (T().PlaneGeometry)(s*2,s*2),new (T().MeshBasicMaterial)({map:CRACK,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));m.rotation.x=-Math.PI/2;m.rotation.z=Math.random()*6;m.position.set(x,.05+decals.length*.001,z);scene.add(m);decals.push({m,l:25});
 spawnDebris(x,.2,z,[0x7d7d78,0x5a5a55],Math.round(s*2.5),.7,.45)}
function wallCrater(x,y,z,nx,nz,s){if(decals.length>(low?14:30)){const o=decals.shift();scene.remove(o.m)}
 const m=new (T().Mesh)(new (T().PlaneGeometry)(s*2,s*2),new (T().MeshBasicMaterial)({map:CRACK,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));m.position.set(x-nx*.85,y,z-nz*.85);m.lookAt(x+nx*5,y,z+nz*5);m.position.x+=nx*.06;m.position.z+=nz*.06;scene.add(m);decals.push({m,l:25});
 spawnDebris(x,y,z,[0x8b8f98,0x6f6a62],8,.8,.5)}
// ---------- building destruction (Super Insane Mode) ----------
function smash(b,hx,hz){if(!b||b.dead||!b.meshes)return false;b.dead=true;b.rt=45;b.meshes.forEach(m=>m.visible=false);const i=B.indexOf(b);if(i>=0)B.splice(i,1);smashed.push(b);
 const n=low?20:45;for(let k=0;k<n;k++){const x=b.cx+(Math.random()-.5)*b.w,z=b.cz+(Math.random()-.5)*b.d,y=Math.random()*Math.min(b.h,30);spawnDebris(x,y,z,[0x8b8f98,0x6f6a62,0x3a4a5e,0xffe9a8],1,1.6,1.4)}
 if(window.FX){for(let k=0;k<4;k++)FX.boom(b.cx+(Math.random()-.5)*b.w*.6,Math.random()*10+2,b.cz+(Math.random()-.5)*b.d*.6,0xbdb6a8,6);FX.shake(1.2)}
 crater(hx!==undefined?hx:b.cx,hz!==undefined?hz:b.cz,6);return true}
function smashNear(x,z,r){let n=0;B.slice().forEach(b=>{if(b.meshes&&!b.round){const cx=Math.max(b.x0,Math.min(x,b.x1)),cz=Math.max(b.z0,Math.min(z,b.z1));if(Math.hypot(cx-x,cz-z)<r){smash(b,cx,cz);n++}}});return n}
// ---------- per-frame ----------
function update(dt,focus){
 if(focus){sun.position.set(focus.x+60,110,focus.z+40);sun.target.position.set(focus.x,0,focus.z)}
 for(let i=debris.length-1;i>=0;i--){const d=debris[i];d.l-=dt;d.vy-=32*dt;d.m.position.x+=d.vx*dt;d.m.position.y+=d.vy*dt;d.m.position.z+=d.vz*dt;
  if(d.m.position.y<.15){d.m.position.y=.15;d.vy*=-.3;d.vx*=.6;d.vz*=.6;d.rx*=.5;d.rz*=.5}
  d.m.rotation.x+=d.rx*dt;d.m.rotation.z+=d.rz*dt;
  if(d.l<1){d.m.scale.setScalar(Math.max(.01,d.l))}if(d.l<=0){scene.remove(d.m);debris.splice(i,1)}}
 for(let i=decals.length-1;i>=0;i--){const d=decals[i];d.l-=dt;if(d.l<3)d.m.material.opacity=d.l/3;if(d.l<=0){scene.remove(d.m);decals.splice(i,1)}}
 for(let i=smashed.length-1;i>=0;i--){const b=smashed[i];b.rt-=dt;if(b.rt<=0){b.dead=false;b.meshes.forEach(m=>m.visible=true);B.push(b);smashed.splice(i,1)}}
 for(const p of props){
  if(!p.alive){p.rt-=dt;if(p.rt<=0){p.alive=true;p.hp=p.def.hp;p.x=p.hx;p.z=p.hz;p.y=0;p.g.position.set(p.x,0,p.z);p.g.rotation.set(0,p.hry,0);p.g.visible=true}continue}
 }
}
function nearestProp(x,z,r,throwable){let b=null,bd=r;for(const p of props){if(!p.alive||p.held||p.fly)continue;if(throwable&&!p.def.throw)continue;const d=Math.hypot(p.x-x,p.z-z)-p.def.r*.5;if(d<bd){bd=d;b=p}}return b}
window.World={build,update,smash,smashNear,resolve,camClip,blocked,breakProp,damageProps,crater,wallCrater,spawnDebris,nearestProp,props,B,HALF};
})();
