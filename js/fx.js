/* Visual effects: particles, hit sparks, shockwaves, explosions, beams, lightning,
   screen shake, hit-stop, slow-mo, speed lines and screen flashes. */
(function(){
const T=()=>window.THREE;
let scene,cam,cv,cx,low=false;
const parts=[],objs=[];let shakeA=0,stop=0,slowT=0,slowS=1,speedA=0,flashA=0,flashC="#fff";
let geo,sgeo;const mats={};
function bm(c,o){const k=c+"_"+(o||1);if(!mats[k])mats[k]=new (T().MeshBasicMaterial)({color:c,transparent:o<1,opacity:o||1,fog:false});return mats[k]}
let starTex;
function init(sc,camera,canvas,lowQ){scene=sc;cam=camera;cv=canvas;cx=cv.getContext("2d");low=lowQ;parts.length=0;objs.length=0;shakeA=stop=slowT=speedA=flashA=0;slowS=1;
 geo=new (T().OctahedronGeometry)(.5,0);sgeo=new (T().SphereGeometry)(1,16,10);
 const c=document.createElement("canvas");c.width=c.height=64;const x=c.getContext("2d");const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,"rgba(255,255,255,1)");g.addColorStop(.25,"rgba(255,255,255,.9)");g.addColorStop(1,"rgba(255,255,255,0)");x.fillStyle=g;x.beginPath();
 for(let i=0;i<8;i++){const a=i/8*6.283,r=i%2?10:32;x.lineTo(32+Math.cos(a)*r,32+Math.sin(a)*r)}x.closePath();x.fill();starTex=new (T().CanvasTexture)(c);
 resize()}
function resize(){if(cv){cv.width=innerWidth;cv.height=innerHeight}}
function P(x,y,z,c,vx,vy,vz,s,l,g){if(parts.length>(low?160:420)){const o=parts.shift();scene.remove(o.m)}const m=new (T().Mesh)(geo,bm(c));m.position.set(x,y,z);m.scale.setScalar(s);scene.add(m);parts.push({m,vx,vy,vz,s,l,L:l,g:g===undefined?20:g})}
function burst(x,y,z,c,n,sp,s,l,g){for(let i=0;i<n;i++){const a=Math.random()*6.283,b=Math.random()*3.14-1.57,v=sp*(.4+Math.random()*.8);P(x,y,z,c,Math.cos(a)*Math.cos(b)*v,Math.sin(b)*v+sp*.3,Math.sin(a)*Math.cos(b)*v,(s||.4)*(.5+Math.random()),(l||.5)*(.6+Math.random()*.6),g)}}
function dust(x,y,z,n){for(let i=0;i<n;i++){const a=Math.random()*6.283;P(x+Math.cos(a),y,z+Math.sin(a),[0xbdb6a8,0x9a958c,0xd8d0c0][i%3],Math.cos(a)*4,1+Math.random()*3,Math.sin(a)*4,.7+Math.random()*.8,.7+Math.random()*.5,-2)}}
function obj(m,l,upd){scene.add(m);objs.push({m,l,L:l,upd})}
function spark(x,y,z,c,big){const s=new (T().Sprite)(new (T().SpriteMaterial)({map:starTex,color:c,transparent:true,depthTest:false,blending:T().AdditiveBlending}));s.position.set(x,y,z);const S=big?4.5:2.6;s.scale.set(S,S,1);s.material.rotation=Math.random()*6;obj(s,big?.22:.14,(o,t)=>{o.m.scale.setScalar(S*(1+t*.8));o.m.material.opacity=1-t});burst(x,y,z,c,big?14:7,big?14:9,.22,.3,10);if(big)burst(x,y,z,0xffffff,6,16,.15,.25,0)}
function ring(x,y,z,c,r,l,vert,ry){const m=new (T().Mesh)(new (T().RingGeometry)(.7,1,40),new (T().MeshBasicMaterial)({color:c,transparent:true,side:T().DoubleSide,depthWrite:false,fog:false}));m.position.set(x,y,z);if(vert){m.rotation.y=ry||0}else m.rotation.x=-Math.PI/2;obj(m,l||.45,(o,t)=>{const s=.5+t*r;o.m.scale.set(s,s,s);o.m.material.opacity=1-t})}
function boom(x,y,z,c,r){const m=new (T().Mesh)(sgeo,new (T().MeshBasicMaterial)({color:c,transparent:true,depthWrite:false,fog:false}));m.position.set(x,y,z);obj(m,.5,(o,t)=>{o.m.scale.setScalar(.3+r*Math.sqrt(t));o.m.material.opacity=.9*(1-t)});
 const w=new (T().Mesh)(sgeo,new (T().MeshBasicMaterial)({color:0xffffff,transparent:true,depthWrite:false,fog:false}));w.position.set(x,y,z);obj(w,.18,(o,t)=>{o.m.scale.setScalar(.2+r*.6*t);o.m.material.opacity=1-t});
 ring(x,.2,z,c,r*1.6,.5);burst(x,y,z,c,low?10:22,r*4,.5,.7,8);dust(x,.3,z,low?4:10)}
function beam(x1,y1,z1,x2,y2,z2,c,w,l){const d=Math.hypot(x2-x1,y2-y1,z2-z1);const m=new (T().Mesh)(new (T().CylinderGeometry)(w,w,d,10,1,true),new (T().MeshBasicMaterial)({color:c,transparent:true,depthWrite:false,fog:false,side:T().DoubleSide}));
 m.position.set((x1+x2)/2,(y1+y2)/2,(z1+z2)/2);m.lookAt(x2,y2,z2);m.rotateX(Math.PI/2);obj(m,l||.35,(o,t)=>{o.m.scale.set(1-t*.8,1,1-t*.8);o.m.material.opacity=1-t*t});
 const core=new (T().Mesh)(new (T().CylinderGeometry)(w*.4,w*.4,d,8,1,true),new (T().MeshBasicMaterial)({color:0xffffff,transparent:true,fog:false}));core.position.copy(m.position);core.quaternion.copy(m.quaternion);obj(core,l||.35,(o,t)=>{o.m.material.opacity=1-t})}
function bolt(x1,y1,z1,x2,y2,z2,c){const pts=[];const n=10;for(let i=0;i<=n;i++){const t=i/n,j=(i===0||i===n)?0:1.2;pts.push(new (T().Vector3)(x1+(x2-x1)*t+(Math.random()-.5)*j,y1+(y2-y1)*t+(Math.random()-.5)*j,z1+(z2-z1)*t+(Math.random()-.5)*j))}
 const g=new (T().BufferGeometry)().setFromPoints(pts);for(let k=0;k<2;k++){const l=new (T().Line)(g,new (T().LineBasicMaterial)({color:k?0xffffff:c,transparent:true,fog:false}));obj(l,.22,(o,t)=>{o.m.material.opacity=1-t})}
 beam(x1,y1,z1,x2,y2,z2,c,.18,.2)}
function pillar(x,z,c,h,r,l){const m=new (T().Mesh)(new (T().CylinderGeometry)(r,r*1.2,h,14,1,true),new (T().MeshBasicMaterial)({color:c,transparent:true,side:T().DoubleSide,depthWrite:false,fog:false}));m.position.set(x,h/2,z);obj(m,l||.6,(o,t)=>{o.m.scale.set(1+t*.4,Math.min(1,t*6),1+t*.4);o.m.position.y=h/2*Math.min(1,t*6);o.m.material.opacity=.85*(1-t)});ring(x,.2,z,c,r*2.5,.5);burst(x,1,z,c,12,10,.4,.6,-6)}
function spikes(x,z,c,n,r){for(let i=0;i<n;i++){const a=i/n*6.283,d=r*(.4+Math.random()*.6);const m=new (T().Mesh)(new (T().ConeGeometry)(.6,3.5,5),new (T().MeshStandardMaterial)({color:c,emissive:c,emissiveIntensity:.35,transparent:true,roughness:.2}));m.position.set(x+Math.cos(a)*d,0,z+Math.sin(a)*d);m.rotation.set(Math.sin(a)*.4,0,-Math.cos(a)*.4);obj(m,1.1,(o,t)=>{o.m.position.y=Math.min(1,t*8)*1.5-(t>.8?(t-.8)*8:0);o.m.material.opacity=t>.8?1-(t-.8)*5:1})}}
function aura(f,c,rate){if(Math.random()>rate)return;const a=Math.random()*6.283;P(f.x+Math.cos(a)*1.1,f.y+Math.random()*4.5,f.z+Math.sin(a)*1.1,c,0,5+Math.random()*4,0,.25+Math.random()*.3,.5,-4)}
function trail(x,y,z,c){P(x+(Math.random()-.5)*.6,y+Math.random()*3,z+(Math.random()-.5)*.6,c,0,1,0,.3,.3,0)}
function shake(a){shakeA=Math.max(shakeA,a)}
function hitstop(s){stop=Math.max(stop,s)}
function slowmo(sc,s){slowS=sc;slowT=s}
function speed(a){speedA=Math.max(speedA,a)}
function flash(c,a){flashC=c;flashA=Math.max(flashA,a)}
let bannerT=0;
function banner(txt,col){const e=document.getElementById("banner");if(!e)return;e.textContent=txt;e.style.color=col||"#fff";e.classList.remove("show");void e.offsetWidth;e.classList.add("show");bannerT=1.6}
// returns the time scale for this frame (0 during hit-stop)
function timeScale(rdt){if(stop>0){stop-=rdt;return .02}if(slowT>0){slowT-=rdt;return slowS}return 1}
function update(dt,rdt){
 for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.l-=dt;p.vy-=p.g*dt;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;if(p.m.position.y<.1){p.m.position.y=.1;p.vy*=-.3}p.m.scale.setScalar(Math.max(.01,p.s*(p.l/p.L)));p.m.rotation.x+=dt*6;p.m.rotation.y+=dt*5;if(p.l<=0){scene.remove(p.m);parts.splice(i,1)}}
 for(let i=objs.length-1;i>=0;i--){const o=objs[i];o.l-=dt;const t=1-Math.max(0,o.l)/o.L;if(o.upd)o.upd(o,t);if(o.l<=0){scene.remove(o.m);if(o.m.material&&o.m.material!==mats)o.m.material.dispose&&o.m.material.dispose();objs.splice(i,1)}}
 const sx=(Math.random()-.5)*shakeA,sy=(Math.random()-.5)*shakeA;shakeA=Math.max(0,shakeA-rdt*2.6);
 // overlay: speed lines + flash
 if(cx){cx.clearRect(0,0,cv.width,cv.height);
  if(speedA>.05){const W=cv.width,H=cv.height,n=Math.round(30*speedA);cx.strokeStyle="rgba(255,255,255,"+(.5*speedA)+")";cx.lineWidth=2;cx.beginPath();for(let i=0;i<n;i++){const a=Math.random()*6.283,r1=Math.min(W,H)*(.42+Math.random()*.2),r2=r1+60+Math.random()*160;cx.moveTo(W/2+Math.cos(a)*r1,H/2+Math.sin(a)*r1);cx.lineTo(W/2+Math.cos(a)*r2,H/2+Math.sin(a)*r2)}cx.stroke()}
  if(flashA>.01){cx.globalAlpha=flashA;cx.fillStyle=flashC;cx.fillRect(0,0,cv.width,cv.height);cx.globalAlpha=1}}
 speedA=Math.max(0,speedA-rdt*3);flashA=Math.max(0,flashA-rdt*3.5);
 if(bannerT>0){bannerT-=rdt;if(bannerT<=0){const e=document.getElementById("banner");if(e)e.classList.remove("show")}}
 return{sx,sy};
}
function clear(){parts.forEach(p=>scene&&scene.remove(p.m));objs.forEach(o=>scene&&scene.remove(o.m));parts.length=0;objs.length=0;if(cx)cx.clearRect(0,0,cv.width,cv.height);shakeA=stop=slowT=speedA=flashA=0}
window.FX={init,resize,burst,dust,spark,ring,boom,beam,bolt,pillar,spikes,aura,trail,shake,hitstop,slowmo,speed,flash,banner,timeScale,update,clear};
})();
