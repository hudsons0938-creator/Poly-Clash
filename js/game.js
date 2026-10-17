/* PolyClash city brawler: JJS-style combat.
   M1 x4 (hits 1-3 stun, 4th knocks back) | hold Space + 4th = uppercut | in the air 4th = downslam
   dash (Q) + M1 = dash punch | F block (tap right before a hit = parry) | 4th M1 / heavy moves break guard
   Q while stunned/ragdolled = evasive | E pick up / throw props | G awaken | R finisher while awakened. */
window.Game=(function(){
const $=id=>document.getElementById(id),DT=window.DATA;
const P=()=>window.App.P(),pw=k=>window.App.pw(k);
const GRAV=72,WALK=13,RUN=22;
let on=false,scene,cam,ren,raf=0,t0=0,time=0,mode,lvl=1,label="",ch=null,myId="",pf,low=false;
let me=null;const bots=[],rem=new Map(),proj=[],hazards=[],walls=[];
let yaw=0,pitch=.32,dist=13,keys={},md=0,joy={x:0,z:0},jumpHeld=false,camT=null,fovKick=0;
let combo={n:0,t:0},tgt=null,tgtT=0,spT=0,bt=0,ct=0,hudT=0,KITS=null;
let training={lvl:3,auto:true},host=false,ultCD=0,botSeq=0,bst=0;
const insaneActive=()=>!!(window.App&&App.insane&&App.insane())&&(mode==="grind"||mode==="personal"||(mode==="online"&&host));
const canTrain=()=>mode==="grind"||mode==="personal"||(mode==="online"&&host);
const rnd=(a,b)=>a+Math.random()*(b-a);
const TOUCH="ontouchstart" in window;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// ---------- fighters ----------
function nameTag(f){const c=document.createElement("canvas");c.width=256;c.height=100;const t=new THREE.CanvasTexture(c);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false}));s.scale.set(4.6,1.8,1);s.position.y=6.9;s.renderOrder=5;f.rig.g.add(s);f.tag={c,t,s,last:-1};drawTag(f)}
function drawTag(f){const T=f.tag;if(!T)return;const hp=Math.max(0,Math.round(f.hp));if(hp===T.last)return;T.last=hp;const x=T.c.getContext("2d");x.clearRect(0,0,256,100);x.textAlign="center";x.lineWidth=5;x.strokeStyle="#000";
 if(f.title){x.font="bold 20px system-ui,sans-serif";x.fillStyle="#ffd54a";x.strokeText("« "+f.title+" »",128,26);x.fillText("« "+f.title+" »",128,26)}
 x.font="bold 26px system-ui,sans-serif";x.fillStyle=f.isMe?"#ffd54a":"#fff";x.strokeText(f.name,128,56);x.fillText(f.name,128,56);
 if(!f.isMe){x.fillStyle="#000a";x.fillRect(38,68,180,14);x.fillStyle=f.hp/f.mhp>.35?"#3ddc5a":"#ff3b3b";x.fillRect(40,70,176*clamp(f.hp/f.mhp,0,1),10)}T.t.needsUpdate=true}
function statsFor(p){const c=DT.CH[p.char]||DT.CH[0],w=DT.WP[p.weapon]||DT.WP[0],L=(p.lv&&p.lv[p.char])||1;
 return{c,w,mhp:Math.round(100*c.hp*(1+L*.08)),dmg:c.dmg*(1+L*.1)*(1+(w.dmg-1)*.3),spd:c.spd,agi:c.agi,rng:1+(w.rng-3)*.12,kit:p.xKit&&DT.PIDX[p.xKit]!==undefined?DT.PIDX[p.xKit]:(DT.PIDX[c.pw]||0)}}
function makeFighter(o){
 const look=window.Rig.lookFor(o.charId,o.col);const rig=window.Rig.build(look,o.glow);rig.g.traverse(m=>{if(m.isMesh)m.castShadow=!m.userData.ol&&(!low||m.parent===rig.torso||m.parent===rig.hips||m.parent===rig.head)});scene.add(rig.g);
 const f=Object.assign({rig,look,x:0,y:0,z:0,vx:0,vy:0,vz:0,r:0,st:"free",stT:0,cd:[0,0,0,0],m1i:-1,m1T:0,m1CD:0,dashT:0,dashCD:0,dashDir:"F",blk:false,blkT:9,guard:100,awk:0,awT:0,fin:false,evT:0,inv:0,carry:null,pend:[],lock:0,root:null,buff:{},sh:0,ph:0,anState:"idle",fl:0,mv:false,air:false,dead:false,rt:0,hist:[],histT:0},o);
 f.kitDef=KITS[f.kit%KITS.length];nameTag(f);
 const ice=new THREE.Mesh(new THREE.BoxGeometry(2.4,5.4,2.4),new THREE.MeshStandardMaterial({color:0xaee9ff,transparent:true,opacity:.55,roughness:.1}));ice.position.y=2.7;ice.visible=false;rig.g.add(ice);f.ice=ice;
 return f}
function removeFighter(f){if(f&&f.rig)scene.remove(f.rig.g);if(f&&f.carry)dropProp(f)}
const alive=f=>f&&!f.dead;
function foesOf(f){if(f.isMe){const a=bots.filter(alive);rem.forEach(r=>{if(alive(r))a.push(r)});return a}if(f.isBot){const a=alive(me)?[me]:[];rem.forEach(r=>{if(alive(r)&&!r.isBotGhost)a.push(r)});return a}return alive(me)?[me]:[]}
function face(f,x,z){f.r=Math.atan2(x-f.x,z-f.z)}
function fwd(f){return[Math.sin(f.r),Math.cos(f.r)]}
function nearest(f,range,needFront){let b=null,bd=range;const F=fwd(f);for(const t of foesOf(f)){const dx=t.x-f.x,dz=t.z-f.z,d=Math.hypot(dx,dz);if(needFront&&d>3&&(dx*F[0]+dz*F[1])/d<-.2)continue;if(d<bd){bd=d;b=t}}return b}
function camFwd(){return[-Math.sin(yaw),-Math.cos(yaw)]}
function aimFor(f){// choose who to attack: closest foe, preferring camera direction for the local player
 if(!f.isMe)return nearest(f,12);let b=null,bs=1e9;const C=camFwd();for(const t of foesOf(f)){const dx=t.x-f.x,dz=t.z-f.z,d=Math.hypot(dx,dz);if(d>14)continue;const dot=(dx*C[0]+dz*C[1])/(d||1);const s=d-dot*5;if(dot>-.3&&s<bs){bs=s;b=t}}return b}
function aim(f){const t=aimFor(f);if(t)face(f,t.x,t.z);else if(f.isMe){const C=camFwd();if(f.mv||md)f.r=Math.atan2(C[0],C[1])}return t}
const grounded=f=>f.y<=.01;
const free=f=>f.st==="free"&&f.lock<=0&&!f.dead;
function later(f,s,fn){f.pend.push({t:s,fn})}
function interrupt(f){f.pend.length=0;f.act=null;f.lock=0;f.root=null;f.dashT=0;f.blk=false;if(f.carry)dropProp(f)}
// ---------- damage ----------
function dmgMul(f){let m=f.S?f.S.dmg:1;if(f.awT>0)m*=1.35;if(f.buff.dmg>0)m*=1.4;if(f.isMe&&insaneActive())m*=25;return m}
function sendHit(att,t,h){const dx=t.x-att.x,dz=t.z-att.z,d=Math.hypot(dx,dz)||1;if(h.dx===undefined){h.dx=dx/d;h.dz=dz/d}
 if(t.rid){if(ch)ch.hit({to:t.rid,by:att.bid||myId,h,ax:att.x,az:att.z});t.fl=6;hitFx(t,h);if(att.isMe){combo.n++;combo.t=2;tgt=t;tgtT=4}gainAwk(att,h.dmg*1.1);if(h.kind==="launch")openExt(att,t);return true}
 const ok=receive(t,att,h);if(ok&&h.kind==="launch")openExt(att,t);return ok}
function openExt(att,t){if(!(att.isMe||att.isBot))return;att.extT=.62;att.extTgt=t}
function hitFx(t,h){if(h.quiet)return;const heavy=h.kind!=="light";FX.spark(t.x,t.y+3,t.z,h.col||0xffffff,heavy);if(heavy){FX.shake(.45);FX.hitstop(.09);fovKick=5}else{FX.shake(.18);FX.hitstop(.045);fovKick=2}}
function gainAwk(f,a){if(f.awT>0)return;f.awk=Math.min(100,f.awk+a*.9)}
function receive(t,att,h){
 if(t.dead||t.inv>0)return false;
 const ax=att.x,az=att.z,dx=h.dx!==undefined?h.dx:(t.x-ax),dz=h.dz!==undefined?h.dz:(t.z-az),dl=Math.hypot(dx,dz)||1,nx=dx/dl,nz=dz/dl;
 let dmg=h.dmg;if(att&&att.isMe&&pw("god"))dmg=Math.max(dmg,100);
 // block / parry
 if(t.blk&&!h.unblock&&h.kind!=="hang"){const F=fwd(t);if(-(F[0]*nx+F[1]*nz)>.15){
  if(t.blkT<.22){// parry
   FX.ring(t.x,t.y+3,t.z,0xffffff,4,.35,true,t.r);FX.spark(t.x+F[0]*1.5,t.y+3.2,t.z+F[1]*1.5,0xffffff,true);FX.hitstop(.12);Rig.play(t,"parry",.35);t.lock=.25;
   if(att.rid&&ch)ch.hit({to:att.rid,by:myId,h:{dmg:0,kind:"stun",stun:1.2,col:0xffffff},ax:t.x,az:t.z});else if(att.st!==undefined&&!att.rid){interrupt(att);att.st="stun";att.stT=1.2}
   if(t.isMe)FX.banner("PARRY!","#9ff");return false}
  t.guard-=h.kind==="light"?14:h.guardDmg||45;FX.spark(t.x+F[0]*1.3,t.y+3,t.z+F[1]*1.3,0x9fd3ff,false);t.vx+=nx*6;t.vz+=nz*6;
  if(t.guard<=0){t.guard=0;interrupt(t);t.st="stun";t.stT=1.7;FX.ring(t.x,t.y+3,t.z,0xff3b3b,5,.4,true,t.r);if(t.isMe||att.isMe)FX.banner("GUARD BREAK","#ff6b6b")}
  else{t.hp-=dmg*.12;hitDone(t,att,dmg*.12)}return false}}
 if(t.sh>0){const a=Math.min(t.sh,dmg);t.sh-=a;dmg-=a;FX.burst(t.x,t.y+3,t.z,0x7df9ff,6,8,.3,.3)}
 t.hp-=dmg;t.fl=6;if(att&&!att.rid)gainAwk(att,dmg*1.1);gainAwk(t,dmg*.6);
 if(att&&!att.rid&&att.isMe){combo.n++;combo.t=2;tgt=t;tgtT=4}
 if(h.heal&&att&&!att.rid)att.hp=Math.min(att.mhp,att.hp+dmg*h.heal);
 if(h.burn)t.burn={t:3,d:dmg*.12};if(h.poison)t.poison={t:5,d:dmg*.09};if(h.slow)t.slowT=Math.max(t.slowT||0,h.slow);
 hitFx(t,h);
 if(h.kind==="launch"){if(t.launchImm>0){h.kind="knock";h.kb=Math.max(h.kb||0,18);h.up=Math.min(h.up||8,10)}else t.launchImm=3}
 if(att&&att.isMe&&insaneActive())t.insaneHit=2;
 const k=h.kind;
 if(k==="light"||k==="stun"||k==="freeze"){interrupt(t);t.st="stun";t.stT=Math.max(t.stT||0,h.stun||.5);if(k==="light"){t.vx=nx*(h.kb||5);t.vz=nz*(h.kb||5)}if(k==="freeze"){t.frozen=t.stT}if(h.to){t.x=h.to[0];t.z=h.to[1]}}
 else if(k==="air"){interrupt(t);t.st="stun";t.stT=Math.max(t.stT||0,h.stun||.75);t.hang=Math.max(t.hang||0,h.hang||.75);t.vy=Math.max(t.vy,1.5);t.vx=nx*(h.kb||2);t.vz=nz*(h.kb||2);t.y=Math.max(t.y,.6)}
 else if(k==="hang"){t.hang=Math.max(t.hang||0,h.hang||.9);t.vy=0;if(h.lift)t.y=Math.max(t.y,h.lift);t.vx*=.2;t.vz*=.2;if(t.st==="ragdoll")t.stT=Math.max(t.stT,1.2);else{interrupt(t);t.st="stun";t.stT=Math.max(t.stT||0,1)}}
 else if(k==="knock"||k==="launch"||k==="slam"){interrupt(t);t.st="ragdoll";t.stT=k==="launch"?1.3:1.0;t.vx=nx*(h.kb||28);t.vz=nz*(h.kb||28);t.vy=k==="slam"?-48:(h.up||8);t.spin=0;t.slam=k==="slam";if(k==="slam"&&grounded(t)){World.crater(t.x,t.z,3.5);FX.dust(t.x,.3,t.z,10);t.vy=14;FX.shake(.6)}}
 if(h.pull){t.x=h.pull[0];t.z=h.pull[1]}
 hitDone(t,att,dmg);return true}
function hitDone(t,att,dmg){drawTag(t);if(t.hp<=0&&!t.dead){if(t.isMe)die(att);else if(t.isBot)killBot(t,att)}}
// hit everything in front of f
function cone(f,range,arc,h,yr){const F=fwd(f);let n=0;for(const t of foesOf(f)){const dx=t.x-f.x,dz=t.z-f.z,d=Math.hypot(dx,dz);if(Math.abs(t.y-f.y)>(yr||4))continue;if(d<range&&(d<1.6||(dx*F[0]+dz*F[1])/d>Math.cos(arc/2))){sendHit(f,t,Object.assign({},h));n++}}
 World.damageProps(f.x+F[0]*range*.6,f.z+F[1]*range*.6,range*.55,h.dmg*1.5,F[0],F[1],f.y);return n}
function around(f,x,z,r,h,y){let n=0;for(const t of foesOf(f)){if(Math.hypot(t.x-x,t.z-z)<r&&Math.abs(t.y-(y||0))<Math.max(5,r)){const H=Object.assign({},h);const dx=t.x-x,dz=t.z-z,d=Math.hypot(dx,dz)||1;H.dx=dx/d;H.dz=dz/d;sendHit(f,t,H);n++}}World.damageProps(x,z,r,h.dmg*1.5,0,0);return n}
// ---------- props: pick up + throw ----------
function pickup(f,p){p.held=f;f.carry=p;Rig.play(f,"pickup",.3);f.lock=.25}
function dropProp(f){const p=f.carry;if(!p)return;f.carry=null;p.held=null;p.fly={vx:rnd(-3,3),vy:4,vz:rnd(-3,3),owner:null}}
function throwProp(f){const p=f.carry;if(!p)return;f.carry=null;p.held=null;const t=aim(f)||nearest(f,40,true);if(t)face(f,t.x,t.z);let F=fwd(f);
 const sp=46/Math.sqrt(p.def.mass*.5+.6),g=GRAV*.55;let vy=4;
 if(t){const d=Math.hypot(t.x-f.x,t.z-f.z),tt=Math.max(.05,d/sp);vy=clamp((t.y+2.5-(f.y+5.2)+.5*g*tt*tt)/tt,-5,30)}p.fly={vx:F[0]*sp,vy,vz:F[1]*sp,owner:f,hit:new Set()};p.y=f.y+5.2;Rig.play(f,"throw",.35);f.lock=.25;FX.speed(.3)}
function updProps(dt){
 for(const p of World.props){
  if(!p.alive)continue;
  if(p.held){const f=p.held;p.x=f.x;p.z=f.z;p.y=f.y+5.4;p.g.position.set(p.x,p.y,p.z);p.g.rotation.set(0,f.r,p.type==="bench"?0:.0);continue}
  if(!p.fly)continue;const F=p.fly;F.vy-=GRAV*.55*dt;p.x+=F.vx*dt;p.y+=F.vy*dt;p.z+=F.vz*dt;p.g.position.set(p.x,p.y,p.z);p.g.rotation.x+=dt*6;p.g.rotation.z+=dt*4;
  const owner=F.owner;let end=false;
  if(owner){const list=owner.isMe?foesOf(owner):(owner.isBot?[me]:[]);for(const t of list){if(!alive(t)||F.hit.has(t))continue;if(Math.hypot(t.x-p.x,t.z-p.z)<p.def.r+1.4&&Math.abs(t.y+2.5-p.y)<3.5){F.hit.add(t);sendHit(owner,t,{dmg:9+p.def.mass*6,kind:"knock",kb:30,up:9,col:0xffffff});end=true}}}
  const b=World.blocked(p.x,p.y,p.z);if(b){World.wallCrater(p.x,p.y,p.z,-Math.sign(F.vx),-Math.sign(F.vz),1.8);end=true}
  World.props.forEach(q=>{if(q!==p&&q.alive&&!q.held&&!q.fly&&Math.hypot(q.x-p.x,q.z-p.z)<q.def.r+p.def.r&&p.y<3){World.breakProp(q,F.vx,F.vz,1);end=true}});
  if(p.y<=0){p.y=0;if(Math.hypot(F.vx,F.vz)>12||F.vy<-18){end=true;World.crater(p.x,p.z,1.6)}else{p.fly=null;p.g.rotation.set(0,p.g.rotation.y,0);p.g.position.y=0}}
  if(end){World.breakProp(p,F.vx,F.vz,1.3);FX.shake(.25)}
 }
}
// ---------- projectiles + hazards ----------
const pgeo={};
function shot(f,o){// o: speed,r,life,col,size,h,pierce,grav,onEnd,dir,shape,y
 const F=o.dir||fwd(f),sz=o.size||.8;let geo=o.shape==="blade"?new THREE.BoxGeometry(sz*4,.25,sz*1.1):o.shape==="shard"?new THREE.ConeGeometry(sz*.5,sz*2.4,5):new THREE.SphereGeometry(sz,12,8);
 const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:o.col,fog:false}));if(o.shape==="shard")m.rotation.x=Math.PI/2;
 const g=new THREE.Group();g.add(m);const y=o.y!==undefined?o.y:f.y+3.2;g.position.set(f.x+F[0]*1.5,y,f.z+F[1]*1.5);g.rotation.y=Math.atan2(F[0],F[1]);scene.add(g);
 proj.push(Object.assign({g,x:g.position.x,y,z:g.position.z,vx:F[0]*o.speed,vy:o.vy||0,vz:F[1]*o.speed,l:o.life||1.2,f,hit:new Set()},o))}
function updProj(dt){for(let i=proj.length-1;i>=0;i--){const p=proj[i];p.l-=dt;if(p.grav)p.vy-=p.grav*dt;
 if(p.home){const t=p.home;if(alive(t)){const dx=t.x-p.x,dz=t.z-p.z,d=Math.hypot(dx,dz)||1,s=Math.hypot(p.vx,p.vz);p.vx+=(dx/d*s-p.vx)*dt*3;p.vz+=(dz/d*s-p.vz)*dt*3}}
 p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.g.position.set(p.x,p.y,p.z);p.g.rotation.y=Math.atan2(p.vx,p.vz);if(Math.random()<.7)FX.trail(p.x,p.y-1.5,p.z,p.col);
 let end=p.l<=0||p.y<=.2||World.blocked(p.x,p.y,p.z);
 for(const t of foesOf(p.f)){if(p.hit.has(t))continue;if(Math.hypot(t.x-p.x,t.z-p.z)<(p.r||1.6)&&p.y>t.y-1&&p.y<t.y+6){p.hit.add(t);sendHit(p.f,t,Object.assign({},p.h));if(!p.pierce){end=true;break}}}
 if(World.damageProps(p.x,p.z,(p.r||1.6)*.6,p.h.dmg,p.vx,p.vz,p.y-1)&&!p.pierce)end=true;
 if(end){scene.remove(p.g);proj.splice(i,1);FX.burst(p.x,p.y,p.z,p.col,8,8,.35,.35);if(p.onEnd)p.onEnd(p.x,Math.max(0,p.y),p.z)}}}
function hazard(f,x,z,r,life,h,col,every){const m=new THREE.Mesh(new THREE.CircleGeometry(r,28),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.45,depthWrite:false,fog:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.08,z);scene.add(m);hazards.push({f,x,z,r,l:life,h,col,m,tick:0,every:every||.5})}
function updHaz(dt){for(let i=hazards.length-1;i>=0;i--){const z=hazards[i];z.l-=dt;z.tick-=dt;if(Math.random()<.5)FX.burst(z.x+rnd(-z.r,z.r)*.7,.3,z.z+rnd(-z.r,z.r)*.7,z.col,1,3,.3,.6,-6);
 if(z.tick<=0){z.tick=z.every;for(const t of foesOf(z.f))if(Math.hypot(t.x-z.x,t.z-z.z)<z.r&&t.y<2)sendHit(z.f,t,Object.assign({},z.h))}
 z.m.material.opacity=.45*Math.min(1,z.l);if(z.l<=0){scene.remove(z.m);hazards.splice(i,1)}}}
function addWall(f,x,z,w,d,h,col,life){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:.3,transparent:true,opacity:.85,roughness:.1}));m.position.set(x,h/2,z);m.rotation.y=0;scene.add(m);const b={x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,h};World.B.push(b);walls.push({m,b,l:life})}
function updWalls(dt){for(let i=walls.length-1;i>=0;i--){const w=walls[i];w.l-=dt;if(w.l<=0){scene.remove(w.m);const k=World.B.indexOf(w.b);if(k>=0)World.B.splice(k,1);World.spawnDebris(w.m.position.x,2,w.m.position.z,[0x7df9ff],10,.8,.6);walls.splice(i,1)}}}
// ---------- moves ----------
const K={later,cone,around,shot,hazard,addWall,receive,sendHit,nearest,aim,fwd,face,foesOf,interrupt,grounded,
 lunge(f,sp,dur,h,col){const F=fwd(f);f.root={vx:F[0]*sp,vz:F[1]*sp,t:dur,h,col,hit:new Set()}},
 tp(f,x,z){FX.burst(f.x,f.y+2.5,f.z,f.kitDef.col,14,10,.4,.4);f.x=x;f.z=z;World.resolve(f);FX.burst(f.x,f.y+2.5,f.z,f.kitDef.col,14,10,.4,.4)},
 behind(f,t){const F=fwd(t);K.tp(f,t.x-F[0]*2.2,t.z-F[1]*2.2);face(f,t.x,t.z)},
 tgt(f,range){return aim(f)||nearest(f,range)},
 point(f,range){const t=K.tgt(f,range);if(t&&Math.hypot(t.x-f.x,t.z-f.z)<range)return[t.x,t.z,t];const F=fwd(f);return[f.x+F[0]*Math.min(10,range),f.z+F[1]*Math.min(10,range),null]},
 buff(f,k,s){f.buff[k]=s},
 FX:()=>window.FX,World:()=>window.World,play:(f,a,d,lk)=>{Rig.play(f,a,d);f.lock=lk!==undefined?lk:d*.85}
};
function useMove(f,i){if(!free(f)||f.carry)return false;if(f.cd[i]>0)return false;const mv=f.kitDef.moves[i];f.cd[i]=mv.cd*(f.awT>0?.6:1)*(f.isMe&&insaneActive()?.25:1);if(f.blk)f.blk=false;aim(f);mv.fn(f,K);if(f.isMe)pushState(true);return true}
function finisher(f){if(!free(f)||f.awT<=0||f.fin)return false;f.fin=true;aim(f);f.inv=1.4;FX.slowmo(.35,.7);FX.banner(f.kitDef.fin.n.toUpperCase(),"#"+f.kitDef.col.toString(16).padStart(6,"0"));f.kitDef.fin.fn(f,K);if(f.isMe)pushState(true);return true}
function awaken(f){if(!free(f)||f.awk<100||f.awT>0)return false;f.awk=0;f.awT=30;f.fin=false;f.inv=1.1;Rig.play(f,"awaken",1.0);f.lock=.95;
 FX.slowmo(.4,.6);if(f.isMe){FX.banner("AWAKENED","#"+f.kitDef.col.toString(16).padStart(6,"0"));FX.flash("#fff",.6)}
 later(f,.75,()=>{FX.ring(f.x,.3,f.z,f.kitDef.col,22,.7);FX.ring(f.x,3,f.z,0xffffff,14,.5,true,f.r);FX.boom(f.x,2,f.z,f.kitDef.col,6);FX.shake(.8);around(f,f.x,f.z,9,{dmg:6,kind:"knock",kb:34,up:10,col:f.kitDef.col});World.crater(f.x,f.z,5)});
 f.rig.glow.forEach(g=>{g.material=new THREE.MeshStandardMaterial({color:f.kitDef.col,emissive:f.kitDef.col,emissiveIntensity:1.4});g.visible=true});if(f.isMe)pushState(true);return true}
// ---------- M1 + movement actions ----------
function m1(f){
 if(f.carry){if(free(f))throwProp(f);return}
 if(f.dead||f.m1CD>0)return;
 const dashing=f.dashT>0&&f.dashDir==="F";
 if(!dashing&&!free(f))return;
 const t=aim(f);const col=f.awT>0?f.kitDef.col:0xffffff;
 if(f.airC&&!grounded(f)&&!dashing){airM1(f,col);return}
 if(dashing){// dash punch
  f.dashT=0;Rig.play(f,"dashpunch",.38);f.lock=.32;f.m1CD=.7;K.lunge(f,30,.14);
  later(f,.1,()=>{cone(f,4.6*f.S.rng,1.7,{dmg:8*dmgMul(f),kind:"knock",kb:36,up:7,col,guardDmg:60})});if(f.isMe)pushState(true);return}
 const i=f.m1T>0?(f.m1i+1)%4:0;f.m1i=i;f.m1T=.85;
 if(t){const d=Math.hypot(t.x-f.x,t.z-f.z);if(d>3&&d<9)K.lunge(f,Math.min(26,(d-2.5)*7),.12)}
 if(i<3){Rig.play(f,"m1",.3,Rig.m1Keys(f,i));f.lock=.24;f.anM1=i;
  later(f,.1,()=>cone(f,4.3*f.S.rng,1.9,{dmg:4.5*dmgMul(f),kind:"light",stun:.6,kb:4,col}))}
 else{f.m1CD=1.0;f.m1T=0;
  if(!grounded(f)){Rig.play(f,"downslam",.42);f.lock=.36;f.vy=-10;later(f,.14,()=>cone(f,4.8*f.S.rng,2.2,{dmg:7*dmgMul(f),kind:"slam",col,guardDmg:60},7))}
  else if(jumpHeldFor(f)){Rig.play(f,"uppercut",.45);f.lock=.38;later(f,.14,()=>{if(cone(f,4.4*f.S.rng,1.9,{dmg:6.5*dmgMul(f),kind:"launch",kb:3,up:30,col,guardDmg:60})){f.vy=27}})}
  else{Rig.play(f,"m1",.42,Rig.m1Keys(f,3));f.lock=.36;later(f,.15,()=>cone(f,4.6*f.S.rng,2.0,{dmg:7*dmgMul(f),kind:"knock",kb:42,up:8,col,guardDmg:60}))}}
 if(f.isMe)pushState(true)}
function jumpHeldFor(f){return f.isMe?jumpHeld:f.wantUp}
// ---------- aerial combat ----------
// A launcher (uppercut, launch moves) opens a short window: press JUMP to dash up after the target.
// In the air you get up to 3 hits that keep both of you floating, then the 4th click slams them down.
function extend(f){const t=f.extTgt;f.extT=0;if(!alive(t))return;
 const dx=f.x-t.x,dz=f.z-t.z,d=Math.hypot(dx,dz)||1;FX.burst(f.x,f.y+2.5,f.z,0xffffff,10,10,.35,.3);
 const lift=Math.max(t.y,3.4);f.x=t.x+dx/d*2.3;f.z=t.z+dz/d*2.3;f.y=lift;f.vy=0;f.vx=f.vz=0;f.hang=.85;face(f,t.x,t.z);f.st="free";f.lock=0;f.root=null;f.dashT=0;f.m1CD=0;f.m1T=0;
 f.airC={hits:0,t:2.4};sendHit(f,t,{dmg:0,kind:"hang",hang:.95,lift,unblock:1,col:0xffffff,quiet:1});
 Rig.play(f,"dashF",.25);FX.ring(t.x,t.y+3,t.z,0x9ff,5,.35,true,f.r);FX.speed(.8);
 if(f.isMe){FX.slowmo(.45,.12);FX.banner("EXTEND!","#7ff");pushState(true)}}
function airM1(f,col){const A=f.airC;const ac=col===0xffffff?0x9ff0ff:col;
 if(A.hits<3){const i=A.hits;Rig.play(f,"m1",.26,Rig.m1Keys(f,i));f.lock=.2;f.anM1=i;f.m1CD=.16;f.hang=Math.max(f.hang||0,.45);
  later(f,.08,()=>{if(!f.airC)return;const t=nearest(f,9);if(t&&Math.abs(t.y-f.y)<7){const dx=f.x-t.x,dz=f.z-t.z,d=Math.hypot(dx,dz)||1;if(d>2.4){f.x=t.x+dx/d*2.3;f.z=t.z+dz/d*2.3}f.y=Math.max(.5,t.y);face(f,t.x,t.z)}
   const n=cone(f,4.8*f.S.rng,2.3,{dmg:4.2*dmgMul(f),kind:"air",stun:.75,hang:.75,kb:1,col:ac},6);
   if(n){A.hits++;A.t=1.6;f.hang=.75;const F=fwd(f);FX.ring(f.x+F[0]*2.5,f.y+3,f.z+F[1]*2.5,ac,3,.25,true,f.r);if(f.isMe&&A.hits===3)FX.banner("SLAM IT! [CLICK]","#ffd54a")}else f.airC=null})}
 else{f.airC=null;f.m1CD=.9;f.m1T=0;Rig.play(f,"downslam",.42);f.lock=.36;f.vy=-14;f.hang=0;
  later(f,.12,()=>{if(cone(f,5*f.S.rng,2.4,{dmg:10*dmgMul(f),kind:"slam",col,guardDmg:80,unblock:1},7)){if(f.isMe){FX.banner("AIR COMBO!","#ffd54a");FX.flash("#fff",.25)}FX.shake(.7)}})}
 if(f.isMe)pushState(true)}
function wallJump(f){f.wj=(f.wj||0)+1;f.vy=27;f.vx=f.wallN[0]*17;f.vz=f.wallN[1]*17;f.r=Math.atan2(f.wallN[0],f.wallN[1]);f.wallT=0;f.root=null;f.wjT=.35;
 Rig.play(f,"m1",.42,Rig.m1Keys({look:{style:2}},3));FX.dust(f.x-f.wallN[0],f.y+1.5,f.z-f.wallN[1],5);FX.ring(f.x-f.wallN[0]*.9,f.y+2.5,f.z-f.wallN[1]*.9,0xffffff,3,.3,true,f.r);if(f.isMe){feed("WALL JUMP");pushState(true)}}
function dash(f,dx,dz){
 if(f.dead)return;
 if(f.st!=="free"){// evasive
  if(f.evT>0)return;f.evT=pw("inf")&&f.isMe?2:20;interrupt(f);f.st="free";f.stT=0;f.inv=.6;f.vy=10;f.y=Math.max(f.y,.5);const F=fwd(f);f.vx=-F[0]*20;f.vz=-F[1]*20;f.frozen=0;
  FX.ring(f.x,f.y+3,f.z,0xffffff,6,.4);FX.burst(f.x,f.y+3,f.z,0xffffff,14,12,.35,.35);if(f.isMe)FX.banner("EVASIVE","#fff");return}
 if(f.lock>0||f.dashCD>0||f.carry)return;
 let dir="F",ddx=dx,ddz=dz;if(!ddx&&!ddz){const F=fwd(f);ddx=F[0];ddz=F[1]}
 else{const F=fwd(f);const dot=ddx*F[0]+ddz*F[1],crs=ddx*F[1]-ddz*F[0];dir=dot>.5?"F":dot<-.5?"B":crs>0?"R":"L";if(dir==="F"||!aimFor(f))f.r=Math.atan2(ddx,ddz),dir="F"}
 f.dashDir=dir;f.dashT=.24;f.dashV=[ddx*48,ddz*48];f.dashCD=(pw("inf")&&f.isMe?.25:1.5)/f.S.agi;f.inv=dir==="F"?0:.15;f.blk=false;
 Rig.play(f,"dash"+dir,.26);FX.dust(f.x,.3,f.z,4);if(f.isMe){FX.speed(.6);pushState(true)}}
function jump(f){if(f.dead)return;
 if(f.extT>0&&f.extTgt&&f.st==="free"&&!f.carry){extend(f);return}
 if(f.lock>0||f.st!=="free")return;
 if(!grounded(f)){if(f.wallT>0&&(f.wj||0)<3&&!f.carry)wallJump(f);else if(f.isMe&&insaneActive()&&!f.carry){f.vy=30;FX.ring(f.x,f.y+.3,f.z,0xff3b3b,4,.3)}return}
 f.vy=(f.carry?18:25)*(f.isMe&&insaneActive()?1.35:1);FX.dust(f.x,.2,f.z,3)}
// ---------- per-fighter update ----------
function physics(f,dt){
 const wasAir=!grounded(f);
 if(f.hang>0){f.hang-=dt;if(f.vy<-3)f.vy=-3;f.vy-=GRAV*.1*dt}else f.vy-=GRAV*dt;f.y+=f.vy*dt;
 if(f.y<=0){const impact=f.vy;f.y=0;
  if(f.st==="ragdoll"){if(impact<-30||f.slam){World.crater(f.x,f.z,3);FX.dust(f.x,.3,f.z,10);FX.shake(.5);f.vy=impact<-30?10:0;f.slam=false;f.vx*=.6;f.vz*=.6;if(!f.dead){f.hp-=4;drawTag(f);if(f.hp<=0)hitDone(f,null,0)}}else{f.vy=0}}
  else{if(wasAir&&impact<-30)FX.dust(f.x,.2,f.z,4);f.vy=0}}
 if(f.root){f.root.t-=dt;f.vx=f.root.vx;f.vz=f.root.vz;if(f.root.h){for(const t of foesOf(f)){if(f.root.hit.has(t))continue;if(Math.hypot(t.x-f.x,t.z-f.z)<2.8&&Math.abs(t.y-f.y)<4){f.root.hit.add(t);sendHit(f,t,Object.assign({},f.root.h))}}World.damageProps(f.x,f.z,1.5,20,f.vx,f.vz,f.y)}if(f.root.col)FX.trail(f.x,f.y,f.z,f.root.col);if(f.root.t<=0){f.root=null;f.vx*=.2;f.vz*=.2}}
 else if(f.dashT>0){f.dashT-=dt;f.vx=f.dashV[0];f.vz=f.dashV[1];if(Math.random()<.6)FX.trail(f.x,f.y,f.z,0xdddddd);if(f.dashT<=0){f.vx*=.25;f.vz*=.25}}
 const fr=grounded(f)?(f.st==="ragdoll"?3.5:12):1.2;
 if(f.st==="ragdoll"||f.st==="stun"||!f.ctrl){f.vx*=Math.exp(-fr*dt);f.vz*=Math.exp(-fr*dt)}
 const sp=Math.hypot(f.vx,f.vz);
 f.x+=f.vx*dt;f.z+=f.vz*dt;
 const hit=World.resolve(f,.9);
 if(grounded(f)){f.wj=0;if(f.airC)f.airC=null}
 if(hit&&!hit.prop&&!grounded(f)&&f.st==="free"){f.wallT=.3;f.wallN=[hit.nx,hit.nz]}
 if(hit&&hit.b&&!hit.b.round&&((f.insaneHit>0&&f.st==="ragdoll"&&sp>10)||(f.isMe&&insaneActive()&&(f.dashT>0||f.root)))){World.smash(hit.b,f.x,f.z)}
 if(hit&&f.st==="ragdoll"&&sp>16){// smashed into a wall or prop
  if(hit.prop){World.breakProp(hit.prop,f.vx,f.vz,1.2);f.vx*=.6;f.vz*=.6}
  else{World.wallCrater(f.x-hit.nx*.9,f.y+2.5,f.z-hit.nz*.9,hit.nx,hit.nz,2.6);FX.shake(.45);FX.dust(f.x,f.y+2,f.z,6);f.vx=hit.nx*4;f.vz=hit.nz*4;f.hp-=5;drawTag(f);if(f.hp<=0)hitDone(f,null,0);f.stT=Math.max(f.stT,.6)}}
 if(f.st==="ragdoll"&&sp>14)World.damageProps(f.x,f.z,1,25,f.vx,f.vz,f.y);
 f.air=!grounded(f)}
function tickStatus(f,dt){
 if(f.burn){f.burn.t-=dt;f.hp-=f.burn.d*dt;if(Math.random()<.4)FX.burst(f.x,f.y+rnd(1,4),f.z,0xff7a1a,1,3,.35,.4,-8);if(f.burn.t<=0)f.burn=null}
 if(f.poison){f.poison.t-=dt;f.hp-=f.poison.d*dt;f.slowT=Math.max(f.slowT||0,.2);if(Math.random()<.3)FX.burst(f.x,f.y+rnd(1,4),f.z,0x7cff3a,1,2,.3,.4,-6);if(f.poison.t<=0)f.poison=null}
 if((f.burn||f.poison)&&f.hp<=0&&!f.dead)hitDone(f,f.lastBy,0);
 if(f.slowT>0)f.slowT-=dt;if(f.frozen>0){f.frozen-=dt}f.ice.visible=f.frozen>0;
 for(const k in f.buff)if(f.buff[k]>0)f.buff[k]-=dt;
 if(f.sh>0&&!(f.buff.shield>0))f.sh=0;
 if(f.awT>0){f.awT-=dt;FX.aura(f,f.kitDef.col,low?.35:.8);if(f.awT<=0){f.rig.glow.forEach(g=>g.visible=false)}}
 if(f.buff.spd>0)FX.aura(f,0xff3333,.3);
 const cdRate=(f.buff.haste>0?2:1)*dt;for(let i=0;i<4;i++)f.cd[i]=Math.max(0,f.cd[i]-cdRate);
 f.extT=Math.max(0,(f.extT||0)-dt);f.wallT=Math.max(0,(f.wallT||0)-dt);f.wjT=Math.max(0,(f.wjT||0)-dt);f.launchImm=Math.max(0,(f.launchImm||0)-dt);f.insaneHit=Math.max(0,(f.insaneHit||0)-dt);if(f.airC){f.airC.t-=dt;if(f.airC.t<=0)f.airC=null}
 f.m1CD=Math.max(0,f.m1CD-dt);f.m1T=Math.max(0,f.m1T-dt);f.dashCD=Math.max(0,f.dashCD-dt);f.evT=Math.max(0,f.evT-dt);f.inv=Math.max(0,f.inv-dt);f.lock=Math.max(0,f.lock-dt);
 if(!f.blk)f.guard=Math.min(100,f.guard+dt*18);else f.blkT+=dt;
 // queued hits
 for(let i=f.pend.length-1;i>=0;i--){const p=f.pend[i];p.t-=dt;if(p.t<=0){f.pend.splice(i,1);p.fn()}}
 // states
 if(f.st!=="free"){f.stT-=dt;if(f.st==="ragdoll"){f.spin=(f.spin||0)+dt*(grounded(f)?0:4);if(f.stT<=0&&grounded(f)){f.st="down";f.stT=.45}}
  else if(f.stT<=0){if(f.st==="down"){f.st="free";Rig.play(f,"getup",.4);f.lock=.3;f.inv=.5}else f.st="free"}}
 f.histT-=dt;if(f.histT<=0){f.histT=.1;f.hist.push([f.x,f.z]);if(f.hist.length>22)f.hist.shift()}
}
function animState(f,moving,running){
 f.anState=f.st==="ragdoll"?"ragdoll":f.st==="down"?"down":f.st==="stun"?"stun":f.blk?"block":f.carry?"carry":!grounded(f)?"air":moving?(running?"run":"walk"):"idle"}
function control(f,dt){// local player input
 const C=camFwd(),R=[-C[1],C[0]];
 const kw=((keys.KeyW||keys.ArrowUp)?1:0)-((keys.KeyS||keys.ArrowDown)?1:0)||-joy.z,kd=((keys.KeyD)?1:0)-((keys.KeyA)?1:0)||joy.x;
 const L=Math.hypot(kw,kd),wx=L?(C[0]*kw+R[0]*kd)/Math.max(1,L):0,wz=L?(C[1]*kw+R[1]*kd)/Math.max(1,L):0;
 f.inDir=[wx,wz];
 yaw+=((keys.ArrowLeft?1:0)-(keys.ArrowRight?1:0))*2.4*dt;
 const canMove=f.st==="free"&&f.lock<=0&&f.dashT<=0&&!f.root;
 f.blk=!!(keys.KeyF)&&f.st==="free"&&f.lock<=0&&!f.carry&&grounded(f);if(!f.blk)f.blkT=0;
 const running=(keys.ShiftLeft||keys.ShiftRight||Math.hypot(joy.x,joy.z)>.85);
 let spd=(running?RUN:WALK)*f.S.spd*(pw("speed")?1.5:1)*(f.awT>0?1.15:1)*(f.buff.spd>0?1.4:1)*(f.slowT>0?.5:1)*(f.blk?.35:1)*(f.carry?.75:1)*(insaneActive()?1.6:1);
 f.ctrl=canMove;
 if(canMove&&L>.1&&!(f.wjT>0)){const s=Math.min(1,L);f.vx=wx*spd*s;f.vz=wz*spd*s;const tr=Math.atan2(wx,wz);let d=tr-f.r;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;f.r+=d*Math.min(1,dt*14);f.mv=true}
 else{f.mv=false;if(canMove&&grounded(f)){f.vx*=Math.exp(-20*dt);f.vz*=Math.exp(-20*dt)}}
 if(canMove)f.ph+=dt*(running?13:9)*Math.min(1,L);
 animState(f,f.mv,running);
 if(keys.KeyJ||md)m1(f);
}
// ---------- bots ----------
function botThink(b,dt){
 const L=b.lv;b.think-=dt;b.wantUp=false;
 let T=null,d=1e9;for(const t of foesOf(b)){const dd=Math.hypot(t.x-b.x,t.z-b.z);if(dd<d){d=dd;T=t}}
 if(!T){b.mv=false;b.ctrl=true;b.vx*=.8;b.vz*=.8;animState(b,false,false);return}
 if(b.st!=="free"){b.blk=false;if(L>=6&&b.st==="ragdoll"&&b.evT<=0&&Math.random()<dt*L*.08)dash(b);animState(b,false,false);b.ctrl=false;return}
 if(b.extT>0&&L>=5&&Math.random()<dt*6)jump(b);
 if(b.airC&&!grounded(b)&&b.m1CD<=0&&d<5.5&&b.lock<=0){face(b,T.x,T.z);m1(b)}
 const can=b.lock<=0&&b.dashT<=0&&!b.root;b.ctrl=can;
 if(b.think<=0){b.think=rnd(.12,.3)*(1.4-L*.06);
  b.blk=(T.lock>0||T.act)&&d<5.5&&T.st==="free"&&Math.random()<L*.05&&!b.carry;b.blkT=b.blk?b.blkT:0;
  if(can){
   const ready=[0,1,2,3].filter(i=>b.cd[i]<=0&&d<=b.kitDef.moves[i].rng);
   if(b.awk>=100&&L>=3&&d<10)awaken(b);
   else if(b.awT>0&&!b.fin&&d<14&&L>=5&&Math.random()<.3)finisher(b);
   else if(b.carry&&d<30){face(b,T.x,T.z);throwProp(b)}
   else if(L>=2&&ready.length&&Math.random()<.18+L*.035){face(b,T.x,T.z);useMove(b,ready[Math.floor(Math.random()*ready.length)])}
   else if(d>7&&d<16&&b.dashCD<=0&&Math.random()<.25+L*.03){face(b,T.x,T.z);const F=fwd(b);dash(b,F[0],F[1])}
   else if(L>=4&&!b.carry&&d>12&&d<40&&Math.random()<.08){const p=World.nearestProp(b.x,b.z,4,true);if(p)pickup(b,p)}
   else if(d<4.4&&!b.blk&&Math.random()<.45+L*.05){face(b,T.x,T.z);b.wantUp=L>=3&&b.m1i===2&&Math.random()<.4;m1(b)}
  }}
 if(b.dashT>0&&d<4.5&&b.m1CD<=0&&Math.random()<.5)m1(b);
 let moving=false;
 if(can&&!b.blk&&d>3.2&&grounded(b)){const s=(d>14?RUN:WALK)*(.75+L*.035)*(b.slowT>0?.5:1)*(b.awT>0?1.15:1)*(b.carry?.75:1);face(b,T.x,T.z);const F=fwd(b);b.vx=F[0]*s;b.vz=F[1]*s;moving=true;b.ph+=dt*(d>14?13:9)}
 else if(can&&grounded(b)){b.vx*=Math.exp(-20*dt);b.vz*=Math.exp(-20*dt);if(d<8)face(b,T.x,T.z)}
 b.mv=moving;animState(b,moving,d>14);
}
function spawnBot(L){L=clamp(L||training.lvl||lvl,1,10);
 const cid=Math.floor(Math.random()*(DT.NORMAL_CH||DT.CH.length)),c=DT.CH[cid],a=Math.random()*6.283;
 const b=makeFighter({name:"Bot Lv"+L,charId:cid,col:c.col,glow:0xff3344,kit:DT.PIDX[c.pw]||0,isBot:true,lv:L,think:0,bid:myId+"_b"+(++botSeq)});
 const hp=Math.round((80+L*45)*window.App.cfg().botHp);b.hp=b.mhp=hp;b.S={dmg:.75+L*.11,spd:1,agi:1+L*.03,rng:1};
 for(let k=0;k<30;k++){b.x=me.x+Math.cos(a+k)*rnd(14,26);b.z=me.z+Math.sin(a+k)*rnd(14,26);if(!World.blocked(b.x,1,b.z))break}
 World.resolve(b);FX.ring(b.x,.3,b.z,0xff3344,6,.6);FX.pillar(b.x,b.z,0xff3344,8,1.4,.5);bots.push(b);drawTag(b);return b}
function killBot(b,att){b.dead=true;b.rt=2.2;b.st="ragdoll";const c=20*b.lv+10;
 if(att&&att.rid&&!att.isBotGhost){if(ch)ch.hit({to:att.rid,by:b.bid,k:1,bot:1,c,xp:10+5*b.lv})}
 else{window.App.reward({coins:c,xp:10+5*b.lv,kills:1});feed("KO! +"+c+" coins");FX.banner("K.O.","#ffd54a")}
 spT=2}
function die(att){me.dead=true;me.rt=3.5;me.st="ragdoll";me.stT=3;interrupt(me);if(ch&&me.lastBy)ch.hit({to:me.lastBy,by:myId,k:1});feed("Knocked out! Respawning...");FX.banner("KNOCKED OUT","#ff5050")}
function respawn(){me.dead=false;me.hp=me.mhp;me.st="free";me.stT=0;me.inv=2;me.burn=me.poison=null;me.frozen=0;me.awk=Math.min(me.awk,50);const s=spawnPoint();me.x=s[0];me.z=s[1];me.y=0;me.vx=me.vz=me.vy=0;drawTag(me)}
function spawnPoint(){for(let i=0;i<40;i++){const x=rnd(-20,20),z=rnd(-20,20);if(!World.blocked(x,1,z)&&!World.props.some(p=>p.alive&&Math.hypot(p.x-x,p.z-z)<3))return[x,z]}return[0,0]}
// ---------- Super Insane Mode: key 5 ultimate combo ----------
function ultimate(){if(!insaneActive()||me.dead||ultCD>0||!free(me))return;ultCD=5;me.inv=3.2;
 const t=nearest(me,45);FX.banner("SUPER INSANE COMBO","#ff3b3b");FX.flash("#f33",.35);FX.slowmo(.55,.5);
 const boom=(x,z)=>{FX.boom(x,2,z,0xff3b3b,14);FX.boom(x,2,z,0xffd54a,8);FX.ring(x,.3,z,0xffffff,40,.9);FX.shake(1.6);FX.flash("#fff",.55);World.crater(x,z,10);World.damageProps(x,z,28,999,0,0);World.smashNear(x,z,32);around(me,x,z,24,{dmg:40*dmgMul(me),kind:"knock",kb:60,up:24,unblock:1,col:0xff3b3b},me.y)};
 if(!t){Rig.play(me,"finisher",1);me.vy=28;later(me,.75,()=>{me.vy=-70});later(me,1.0,()=>boom(me.x,me.z));return}
 K.behind(me,t);
 for(let i=0;i<6;i++)later(me,.05+i*.07,()=>{if(alive(t))face(me,t.x,t.z);Rig.play(me,"m1",.18,Rig.m1Keys(me,i%3));FX.spark(t.x,t.y+3,t.z,i%2?0xff3b3b:0xffd54a,true);if(alive(t))sendHit(me,t,{dmg:2*dmgMul(me),kind:"stun",stun:1,col:0xff3b3b,unblock:1})});
 later(me,.5,()=>{Rig.play(me,"uppercut",.4);FX.bolt(t.x,t.y,t.z,t.x,t.y+16,t.z,0xff3b3b);t.vy=34;t.y=Math.max(t.y,1);if(alive(t))sendHit(me,t,{dmg:3*dmgMul(me),kind:"launch",up:34,kb:2,unblock:1,col:0xff3b3b});me.vy=34});
 later(me,.78,()=>{const dx=me.x-t.x,dz=me.z-t.z,d=Math.hypot(dx,dz)||1;me.x=t.x+dx/d*2.2;me.z=t.z+dz/d*2.2;me.y=Math.max(t.y,3);me.vy=0;me.hang=.6;t.hang=.6;face(me,t.x,t.z);FX.ring(t.x,t.y+3,t.z,0xffd54a,6,.3,true,me.r)});
 for(let i=0;i<3;i++)later(me,.84+i*.08,()=>{Rig.play(me,"m1",.16,Rig.m1Keys(me,i));FX.spark(t.x,t.y+3,t.z,0xffd54a,true);t.hang=.4;me.hang=.4});
 later(me,1.12,()=>{Rig.play(me,"downslam",.4);t.vy=-80;me.vy=-80;t.hang=0;me.hang=0;FX.speed(1)});
 later(me,1.3,()=>boom(t.x,t.z));
}
// ---------- online ----------
let lastAn="",lastSt=0;
function pushState(force){if(!ch||!me)return;bt=force?0:bt}
function sendBots(){for(const b of bots){const a=b.act;ch.state({id:b.bid,n:b.name,x:+b.x.toFixed(2),y:+b.y.toFixed(2),z:+b.z.toFixed(2),r:+b.r.toFixed(2),hp:b.dead?0:Math.round(b.hp),mh:b.mhp,c:b.charId,k:0,w:0,an:b.anState,a:a?a.name+(a.name==="m1"?(b.anM1||0):""):"",as:0,aw:b.awT>0?1:0,cr:"",ph:+b.ph.toFixed(2),bot:1})}}
function sendState(){const a=me.act;ch.state({id:myId,n:pf.username,x:+me.x.toFixed(2),y:+me.y.toFixed(2),z:+me.z.toFixed(2),r:+me.r.toFixed(2),hp:me.dead?0:Math.round(me.hp),mh:me.mhp,c:pf.char,k:pf.skin||0,w:pf.weapon,an:me.anState,a:a?a.name+(a.name==="m1"?me.anM1:""):"",as:a?+(a.t).toFixed(2):0,aw:me.awT>0?1:0,cr:me.carry?me.carry.type:"",ph:+me.ph.toFixed(2),ins:insaneActive()?1:0})}
function onState(p){
 let r=rem.get(p.id);
 if(!r){const c=DT.CH[p.c]||DT.CH[0];const sk=DT.SKINS[p.k];r=makeFighter({name:p.n,charId:p.c||0,col:sk&&sk[1]!=null?sk[1]:c.col,glow:p.bot?0xff3344:(DT.WP[p.w]||DT.WP[0]).col,kit:DT.PIDX[c.pw]||0,rid:p.id,isRemote:true,isBotGhost:!!p.bot});r.S={dmg:1,spd:1,agi:1,rng:1};r.x=p.x;r.z=p.z;rem.set(p.id,r);
  if(!p.bot&&window.Backend.titles)window.Backend.titles([p.n]).then(o=>{if(o[p.n]){r.title=o[p.n];r.tag.last=-1;drawTag(r)}})}
 r.tx=p.x;r.ty=p.y;r.tz=p.z;r.r=p.r;r.hp=p.hp;r.mhp=p.mh;r.seen=performance.now();r.dead=p.hp<=0;r.anState=p.an||"idle";r.ph=p.ph||0;r.st=p.an==="stun"?"stun":p.an==="ragdoll"?"ragdoll":"free";
 if(p.a&&p.a!==r.lastA){const n=p.a.indexOf("m1")===0?"m1":p.a;if(n==="m1")Rig.play(r,"m1",.3,Rig.m1Keys(r,+p.a.slice(2)||0));else Rig.play(r,n,.4);if(Rig.A[n]&&["thrust","cast1","stomp","spin","rise","charge","barrage","sweep","kickup","finisher","awaken"].indexOf(n)>=0)FX.burst(r.x,r.y+3,r.z,r.kitDef.col,10,8,.35,.4)}
 r.lastA=p.a;if(p.aw&&!r.awT){r.awT=30;r.rig.glow.forEach(g=>{g.material=new THREE.MeshStandardMaterial({color:r.kitDef.col,emissive:r.kitDef.col,emissiveIntensity:1.4});g.visible=true})}if(!p.aw&&r.awT){r.awT=0;r.rig.glow.forEach(g=>g.visible=false)}
 drawTag(r)}
function onHit(p){
 if(!me)return;
 if(p.to!==myId){// a hit on one of my bots (private server host)
  if(p.k)return;const b=bots.find(x=>x.bid===p.to);if(b&&!b.dead){const src=rem.get(p.by)||{x:p.ax,z:p.az,rid:p.by};receive(b,Object.assign({},src,{rid:p.by,x:p.ax,z:p.az}),p.h||{dmg:5,kind:"light"})}return}
 if(p.k){if(p.bot){window.App.reward({coins:p.c||30,xp:p.xp||15,kills:1});feed("Bot KO! +"+(p.c||30)+" coins")}else{window.App.reward({coins:100,xp:40,wins:1});feed("KO! +100 coins")}FX.banner("K.O.","#ffd54a");return}
 me.lastBy=p.by;const src=rem.get(p.by)||{x:p.ax,z:p.az,rid:p.by};receive(me,Object.assign({},src,{rid:p.by,x:p.ax,z:p.az}),p.h||{dmg:5,kind:"light"})}
function onLeave(k){for(const [id,r] of rem)if(id===k||id.indexOf(k)===0){removeFighter(r);rem.delete(id)}}
// ---------- HUD ----------
function feed(t){$("feed").textContent=t;clearTimeout(feed.t);feed.t=setTimeout(()=>{$("feed").textContent=""},2500)}
let mvU=null;
function buildMoves(){const k=me.kitDef,h=k.moves.map((m,i)=>'<button class="mv" data-m="'+i+'"><i>'+(i+1)+'</i><b>'+m.n+'</b><span class="cdv"></span></button>').join("")+'<button class="mv aw" data-m="g"><i>G</i><b>Awaken</b><span class="cdv"></span></button><button class="mv fin" data-m="r"><i>R</i><b>'+k.fin.n+'</b><span class="cdv"></span></button>'+(insaneActive()?'<button class="mv ult" data-m="u"><i>5</i><b>INSANE COMBO</b><span class="cdv"></span></button>':'');
 $("moves").innerHTML=h;$("moves").querySelectorAll(".mv").forEach(b=>b.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();const m=b.dataset.m;if(m==="g")awaken(me);else if(m==="r")finisher(me);else if(m==="u")ultimate();else useMove(me,+m)}));mvU=$("moves").querySelector(".ult");
 $("hudName").textContent=pf.username+" · "+k.n+" "+(Rig.STYLE_NAMES[me.look.style]||"")}
function hud(){
 $("hpB").style.width=clamp(me.hp/me.mhp*100,0,100)+"%";$("hpT").textContent=Math.ceil(Math.max(0,me.hp))+" / "+me.mhp;
 const aw=me.awT>0?me.awT/30*100:me.awk;$("awB").style.width=aw+"%";$("awB").classList.toggle("on",me.awT>0);$("awB").classList.toggle("rdy",me.awk>=100&&me.awT<=0);$("awT").textContent=me.awT>0?"AWAKENED "+Math.ceil(me.awT)+"s":me.awk>=100?"AWAKENING READY [G]":"AWAKENING "+Math.floor(me.awk)+"%";
 $("evB").textContent=me.evT>0?"EVASIVE "+Math.ceil(me.evT)+"s":"EVASIVE READY "+(TOUCH?"(DASH when hit)":"[Q]");$("evB").classList.toggle("rdy",me.evT<=0);
 const mv=$("moves").children;for(let i=0;i<4;i++){const c=me.cd[i],m=mv[i];m.classList.toggle("cd",c>0);m.lastChild.textContent=c>0?c.toFixed(1):""}
 mv[4].classList.toggle("cd",!(me.awk>=100&&me.awT<=0));mv[4].classList.toggle("rdy",me.awk>=100&&me.awT<=0);mv[5].classList.toggle("cd",!(me.awT>0&&!me.fin));mv[5].classList.toggle("rdy",me.awT>0&&!me.fin);
 if(combo.n>1&&combo.t>0){$("combo").textContent=combo.n+" HIT"+(combo.n>1?"S":"");$("combo").classList.add("on")}else $("combo").classList.remove("on");
 if(tgt&&tgtT>0&&!tgt.dead){$("tgt").classList.remove("hide");$("tgtN").textContent=tgt.name;$("tgtB").style.width=clamp(tgt.hp/tgt.mhp*100,0,100)+"%"}else $("tgt").classList.add("hide");
 $("extP").classList.toggle("on",me.extT>0);if(me.extT>0)$("extF").style.width=(me.extT/.62*100)+"%";
 $("airP").classList.toggle("on",!!me.airC);if(me.airC)$("airP").textContent="AIR "+me.airC.hits+"/3"+(me.airC.hits>=3?" · CLICK TO SLAM":"");
 const ia=insaneActive();$("insB").classList.toggle("hide",!(window.App.insane&&App.insane()));$("insB").textContent=ia?"SUPER INSANE":"INSANE · OFF IN PUBLIC";$("insB").classList.toggle("off",!ia);
 if(ia&&mvU)mvU.lastChild.textContent=ultCD>0?ultCD.toFixed(1):"";
 if(canTrain()){$("tLvl").textContent="Lv "+training.lvl;$("tAuto").textContent="AUTO: "+(training.auto?"ON":"OFF");$("tAuto").classList.toggle("act",training.auto);$("tCount").textContent=bots.filter(alive).length+" bots"}
 const near=!me.carry&&World.nearestProp(me.x,me.z,3.2,true);$("grabHint").classList.toggle("hide",!near&&!me.carry);$("grabHint").textContent=me.carry?"[E] / click THROW":"[E] PICK UP";
}
// ---------- main ----------
function start(o){
 stop();pf=P();mode=o.mode;lvl=o.level||1;host=!!o.host;training={lvl:mode==="grind"?lvl:3,auto:mode==="grind"};ultCD=0;botSeq=0;myId=pf.username+"_"+Math.random().toString(36).slice(2,6);label="";
 KITS=window.KITS;low=("ontouchstart" in window)||innerWidth<700;
 document.querySelectorAll(".screen").forEach(s=>s.classList.remove("on"));
 scene=new THREE.Scene();cam=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,1200);
 ren=new THREE.WebGLRenderer({antialias:!low,powerPreference:"high-performance"});ren.setSize(innerWidth,innerHeight);ren.setPixelRatio(Math.min(devicePixelRatio||1,low?1.25:1.75));
 ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.25;
 document.body.appendChild(ren.domElement);
 Rig.setQuality(low);World.build(scene,{low});FX.init(scene,cam,$("fxc"),low);if(low){cam.far=320;cam.updateProjectionMatrix();scene.fog.near=60;scene.fog.far=240}
 const S=statsFor(pf),sk=DT.SKINS[pf.skin||0];
 me=makeFighter({name:pf.username,charId:pf.char,col:sk&&sk[1]!=null?sk[1]:S.c.col,glow:S.w.col,kit:S.kit,isMe:true});me.tag.s.visible=false;me.title=pf.title||"";me.S=S;me.hp=me.mhp=S.mhp;const sp=spawnPoint();me.x=sp[0];me.z=sp[1];me.ctrl=true;drawTag(me);
 if(mode==="online"){ch=window.Backend.join(o.room,{id:myId,name:pf.username},{state:onState,hit:onHit,leave:onLeave});
  if(ch)label=o.room.indexOf("p-")===0?"PARTY "+o.room.slice(2).toUpperCase():"PUBLIC SERVER";
  else{window.App.toast("Online needs the free Supabase setup. Starting offline practice.");mode="grind";lvl=3;label="OFFLINE PRACTICE"}}
 if(mode==="personal")label="MY ARENA · PRIVATE";
 if(mode==="online"&&host&&ch)label+=" · HOST";
 if(mode==="grind"&&!label)label="GRIND LV"+lvl+" "+["ROOKIE","EASY","NORMAL","SKILLED","HARD","VETERAN","ELITE","MASTER","NIGHTMARE","IMPOSSIBLE"][lvl-1];
 $("arena").textContent=label;$("gameUI").classList.remove("hide");document.body.classList.add("ingame");
 if("ontouchstart" in window){$("touch").classList.remove("hide");$("hint").classList.add("hide")}
 buildMoves();combo={n:0,t:0};tgt=null;
 $("train").classList.toggle("hide",!canTrain());$("gAdmin").classList.toggle("hide",!(window.App.staff&&App.staff()));
 try{history.pushState({arena:1},"")}catch(e){}
 yaw=Math.PI*.25;pitch=.32;spT=1;bt=0;time=0;t0=performance.now();on=true;raf=requestAnimationFrame(loop)}
function stop(){on=false;cancelAnimationFrame(raf);if(ch){ch.close();ch=null}if(document.pointerLockElement)document.exitPointerLock();
 if(FX&&FX.clear)FX.clear();bots.forEach(removeFighter);bots.length=0;rem.forEach(removeFighter);rem.clear();proj.length=0;hazards.length=0;walls.length=0;
 if(ren){ren.dispose();ren.domElement.remove();ren=null}scene=null;me=null;$("gameUI").classList.add("hide");document.body.classList.remove("ingame");$("adminScreen").classList.remove("overlay");keys={};md=0;joy.x=joy.z=0;jumpHeld=false}
function loop(ts){
 if(!on)return;raf=requestAnimationFrame(loop);
 const rdt=Math.min(.05,(ts-t0)/1000||.016);t0=ts;frame(rdt,true)}
function frame(rdt,draw){
 const dt=rdt*FX.timeScale(rdt);time+=dt;
 // local player
 if(me.dead){me.rt-=rdt;if(me.rt<=0)respawn()}
 tickStatus(me,dt);if(!me.dead)control(me,dt);else{me.ctrl=false;animState(me,false,false)}
 physics(me,dt);
 // bots
 if(canTrain()&&training.auto){const want=mode==="grind"?Math.min(3,1+Math.floor((training.lvl-1)/4)):1;if(bots.filter(alive).length<want){spT-=rdt;if(spT<=0){spawnBot(training.lvl);spT=2}}}
 if(ultCD>0)ultCD-=rdt;
 if(insaneActive()&&!me.dead){FX.aura(me,Math.random()<.5?0xff2a2a:0xffd54a,low?.5:1);if(Math.random()<rdt*3)FX.bolt(me.x+rnd(-1.5,1.5),me.y+rnd(4,6),me.z+rnd(-1.5,1.5),me.x+rnd(-1,1),me.y+rnd(0,2),me.z+rnd(-1,1),0xff3b3b)}
 for(let i=bots.length-1;i>=0;i--){const b=bots[i];if(b.dead){b.rt-=dt;b.anState="down";physics(b,dt);Rig.update(b,dt,time);b.rig.g.position.set(b.x,b.y,b.z);b.rig.g.rotation.y=b.r;if(b.rt<=0){FX.burst(b.x,2,b.z,0xffffff,14,8,.4,.5);removeFighter(b);bots.splice(i,1)}continue}
  tickStatus(b,dt);botThink(b,dt);physics(b,dt)}
 // remote players
 const now=performance.now();rem.forEach((r,id)=>{const k=Math.min(1,dt*14);if(r.tx!==undefined){r.x+=(r.tx-r.x)*k;r.y+=((r.ty||0)-r.y)*k;r.z+=(r.tz-r.z)*k}if(r.awT>0)FX.aura(r,r.kitDef.col,.5);if(now-r.seen>6000){removeFighter(r);rem.delete(id)}});
 updProps(dt);updProj(dt);updHaz(dt);updWalls(dt);World.update(dt,me);
 // draw fighters
 const all=[me,...bots];rem.forEach(r=>all.push(r));
 for(const f of all){Rig.update(f,dt,time);f.rig.g.position.set(f.x,f.y,f.z);let r=f.r;f.rig.g.rotation.y=r;
  if(f.fl>0){f.fl-=dt*60;f.rig.root.traverse(m=>{if(m.isMesh&&m.material&&m.material.emissive&&!m.material._fl){m.material=m.material.clone();m.material._fl=1}if(m.isMesh&&m.material._fl)m.material.emissive.setHex(f.fl>0?0x662222:0)})}
  if(f.inv>0&&f.isMe&&!f.dead)f.rig.g.visible=Math.floor(time*20)%2===0||f.inv<.3;else f.rig.g.visible=true}
 // online sync
 if(ch){bt-=rdt;if(bt<=0){bt=.08;sendState()}if(host&&bots.length){bst-=rdt;if(bst<=0){bst=.15;sendBots()}}ct-=rdt;if(ct<=0){ct=1;$("arena").textContent=label+" · "+ch.count()+" online"}}
 // camera
 const sh=FX.update(dt,rdt);
 pitch=clamp(pitch,-.15,1.15);const tx=me.x,ty=me.y+3.6,tz=me.z;
 let cx=tx+Math.sin(yaw)*Math.cos(pitch)*dist,cy=ty+Math.sin(pitch)*dist,cz=tz+Math.cos(yaw)*Math.cos(pitch)*dist;
 const cc=World.camClip(tx,ty,tz,cx,cy,cz);
 if(!camT)camT=new THREE.Vector3(cc[0],cc[1],cc[2]);camT.set(camT.x+(cc[0]-camT.x)*Math.min(1,rdt*18),camT.y+(cc[1]-camT.y)*Math.min(1,rdt*18),camT.z+(cc[2]-camT.z)*Math.min(1,rdt*18));
 cam.position.set(camT.x+sh.sx,camT.y+sh.sy,camT.z);cam.lookAt(tx,ty,tz);
 fovKick=Math.max(0,fovKick-rdt*20);const fov=70+fovKick+(me.dashT>0?6:0);if(Math.abs(cam.fov-fov)>.05){cam.fov+= (fov-cam.fov)*Math.min(1,rdt*12);cam.updateProjectionMatrix()}
 if(combo.t>0){combo.t-=rdt;if(combo.t<=0)combo.n=0}if(tgtT>0)tgtT-=rdt;
 hudT-=rdt;if(hudT<=0){hudT=.05;hud()}
 if(draw)ren.render(scene,cam)}
// ---------- input ----------
const isTyping=e=>e.target&&(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA");
addEventListener("keydown",e=>{if(!on||isTyping(e))return;if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Tab"].indexOf(e.code)>=0)e.preventDefault();if(e.repeat)return;keys[e.code]=1;const c=e.code;
 if(c==="Space"){jumpHeld=true;jump(me)}
 else if(c==="Digit1"||c==="Numpad1")useMove(me,0);else if(c==="Digit2"||c==="Numpad2")useMove(me,1);else if(c==="Digit3"||c==="Numpad3")useMove(me,2);else if(c==="Digit4"||c==="Numpad4")useMove(me,3);else if(c==="Digit5"||c==="Numpad5")ultimate();
 else if(c==="KeyQ")dash(me,me.inDir?me.inDir[0]:0,me.inDir?me.inDir[1]:0);else if(c==="KeyG")awaken(me);else if(c==="KeyR")finisher(me);
 else if(c==="KeyE"){if(me.carry){if(free(me))throwProp(me)}else if(free(me)){const p=World.nearestProp(me.x,me.z,3.2,true);if(p)pickup(me,p)}}
 else if(c==="KeyF"){me.blkT=0}});
addEventListener("keyup",e=>{keys[e.code]=0;if(e.code==="Space")jumpHeld=false});
addEventListener("blur",()=>{keys={};md=0;jumpHeld=false});
addEventListener("mousedown",e=>{if(on&&e.target.tagName==="CANVAS"&&e.target!==$("fxc")){if(e.button===0)md=1;if(!document.pointerLockElement&&!("ontouchstart" in window)&&e.target.requestPointerLock)e.target.requestPointerLock()}});
addEventListener("mouseup",()=>{md=0});
addEventListener("mousemove",e=>{if(on&&document.pointerLockElement){yaw-=e.movementX*.0032;pitch+=e.movementY*.0028}});
addEventListener("wheel",e=>{if(on)dist=clamp(dist+e.deltaY*.01,7,24)},{passive:true});
addEventListener("resize",()=>{if(ren){cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight);FX.resize()}});
// touch: joystick, camera drag, buttons
const acts={m1:[()=>{md=1},()=>{md=0}],s0:[()=>useMove(me,0)],s1:[()=>useMove(me,1)],s2:[()=>useMove(me,2)],s3:[()=>useMove(me,3)],dash:[()=>dash(me,me.inDir?me.inDir[0]:0,me.inDir?me.inDir[1]:0)],aw:[()=>{if(me.awT>0)finisher(me);else awaken(me)}],
 jump:[()=>{jumpHeld=true;jump(me)},()=>{jumpHeld=false}],blk:[()=>{keys.KeyF=1;me.blkT=0},()=>{keys.KeyF=0}],grab:[()=>{if(me.carry){if(free(me))throwProp(me)}else if(free(me)){const p=World.nearestProp(me.x,me.z,3.5,true);if(p)pickup(me,p)}}]};
document.querySelectorAll(".tb").forEach(b=>{const a=acts[b.dataset.a];if(!a)return;b.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();if(on&&me)a[0]()});if(a[1]){b.addEventListener("pointerup",a[1]);b.addEventListener("pointerleave",a[1]);b.addEventListener("pointercancel",a[1])}});
$("tLvlDn").onclick=()=>{training.lvl=Math.max(1,training.lvl-1)};$("tLvlUp").onclick=()=>{training.lvl=Math.min(10,training.lvl+1)};
$("tSpawn").onclick=trainSpawn;$("tAuto").onclick=()=>{training.auto=!training.auto;spT=1};$("tClear").onclick=()=>{bots.forEach(b=>{if(!b.dead){b.dead=true;b.rt=.4}})};
$("gHome").onclick=()=>window.App.go("menuScreen");$("gAdmin").onclick=()=>window.App.openAdmin(true);
["tLvlDn","tLvlUp","tSpawn","tAuto","tClear","gHome","gAdmin","leaveBtn"].forEach(id=>{const e=$(id);e.addEventListener("pointerdown",ev=>ev.stopPropagation());e.addEventListener("mousedown",ev=>ev.stopPropagation())});
const jy=$("joy"),kn=$("knob");
function mj(e){e.preventDefault();const r=jy.getBoundingClientRect();let t=null;for(const x of e.touches)if(x.clientX<r.right+60){t=x;break}if(!t)return;let x=t.clientX-r.left-r.width/2,z=t.clientY-r.top-r.height/2;const d=Math.hypot(x,z);if(d>50){x=x/d*50;z=z/d*50}kn.style.transform="translate("+x+"px,"+z+"px)";joy.x=x/50;joy.z=z/50}
function ej(e){if(e.touches&&[...e.touches].some(t=>t.target===jy||t.target===kn))return;joy.x=joy.z=0;kn.style.transform="translate(0,0)"}
jy.addEventListener("touchstart",mj,{passive:false});jy.addEventListener("touchmove",mj,{passive:false});jy.addEventListener("touchend",ej);jy.addEventListener("touchcancel",ej);
const cp=$("camPad");let lt=null;
cp.addEventListener("touchstart",e=>{const t=e.changedTouches[0];lt={id:t.identifier,x:t.clientX,y:t.clientY}},{passive:true});
cp.addEventListener("touchmove",e=>{if(!lt)return;for(const t of e.changedTouches)if(t.identifier===lt.id){yaw-=(t.clientX-lt.x)*.008;pitch+=(t.clientY-lt.y)*.006;lt.x=t.clientX;lt.y=t.clientY}},{passive:true});
cp.addEventListener("touchend",()=>{lt=null});
function refresh(){if(!on)return;buildMoves();$("train").classList.toggle("hide",!canTrain())}
function trainSpawn(){if(!canTrain()||!on)return;if(bots.filter(alive).length>=8){window.App.toast("Max 8 bots at once");return}spawnBot(training.lvl)}
return{start,stop,refresh,get active(){return on},_debug:()=>({me,bots,World,K,useMove,m1,dash,awaken,finisher,pickup,throwProp,keys,setJump:v=>{jumpHeld=v},onState,onHit,rem,info:()=>{let m=0;scene.traverse(o=>{if(o.isMesh)m++});return{meshes:m,calls:ren.info.render.calls,tris:ren.info.render.triangles}},step:(n,d)=>{for(let i=0;i<n;i++)frame(d||1/60,false)},setYaw:v=>{yaw=v},joy,extend,ultimate,training,trainSpawn,insaneActive,wallJump,setMode:v=>{mode=v}})};
})();
