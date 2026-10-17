/* 10 power kits (matching DATA.POWERS order). Each: 4 moves + an awakened finisher.
   Move fn(f,K): K has later, cone, around, shot, hazard, addWall, lunge, tp, behind, tgt, point, buff, play, fwd, face, foesOf, sendHit. */
(function(){
const H=(dmg,kind,o)=>Object.assign({dmg,kind},o||{});
const D=f=>f.S?f.S.dmg*(f.awT>0?1.35:1)*(f.buff.dmg>0?1.4:1):1;
const r=(a,b)=>a+Math.random()*(b-a);
function barrage(f,K,n,col,extra,last){K.play(f,"barrage",.12*n+.15);for(let i=0;i<n;i++)K.later(f,.08+i*.11,()=>{K.cone(f,4.6,1.8,H(2.4*D(f),"light",Object.assign({stun:.45,kb:2,col},extra||{})));FX.burst(f.x+K.fwd(f)[0]*2.4,f.y+3.2,f.z+K.fwd(f)[1]*2.4,col,3,6,.3,.25)});
 K.later(f,.08+n*.11,()=>K.cone(f,4.8,1.9,last||H(6*D(f),"knock",{kb:30,up:8,col})))}
const KITS=[
{n:"Flame",col:0xff6a00,moves:[
 {n:"Blazing Barrage",cd:9,rng:4.5,fn(f,K){barrage(f,K,5,0xff6a00,{burn:1})}},
 {n:"Fire Rocket",cd:7,rng:35,fn(f,K){K.play(f,"cast1",.4);K.later(f,.15,()=>K.shot(f,{speed:55,r:1.8,size:.9,col:0xff6a00,life:1.2,h:H(5*D(f),"light",{stun:.4,col:0xff6a00}),onEnd(x,y,z){FX.boom(x,y+1,z,0xff6a00,4);FX.shake(.4);K.around(f,x,z,5.5,H(10*D(f),"knock",{kb:26,up:10,burn:1,col:0xff6a00}),y);World.crater(x,z,2.5)}}))}},
 {n:"Flame Pillar",cd:11,rng:25,fn(f,K){K.play(f,"stomp",.45);const p=K.point(f,25);K.later(f,.35,()=>{FX.pillar(p[0],p[1],0xff6a00,16,2.4,.8);FX.shake(.4);K.around(f,p[0],p[1],3.4,H(13*D(f),"launch",{up:30,kb:2,burn:1,col:0xff6a00}),0);World.crater(p[0],p[1],3)})}},
 {n:"Blaze Dash",cd:8,rng:18,fn(f,K){K.play(f,"dashF",.32);K.lunge(f,62,.3,H(9*D(f),"knock",{kb:30,up:8,burn:1,col:0xff6a00}),0xff6a00);for(let i=1;i<=4;i++)K.later(f,i*.07,()=>K.hazard(f,f.x,f.z,2.2,2.5,H(2*D(f),"light",{stun:.15,kb:0,burn:1,col:0xff6a00}),0xff5a00,.5))}}],
 fin:{n:"Inferno Nova",fn(f,K){K.play(f,"finisher",1.1);f.vy=24;K.later(f,.7,()=>{FX.boom(f.x,f.y+2,f.z,0xff6a00,14);FX.boom(f.x,f.y+2,f.z,0xffd54a,8);FX.flash("#ff8a3a",.5);FX.shake(1.2);K.around(f,f.x,f.z,18,H(38*D(f),"knock",{kb:44,up:16,burn:1,unblock:1,col:0xff6a00}),f.y);World.crater(f.x,f.z,9);World.damageProps(f.x,f.z,18,99,0,0)})}}},
{n:"Frost",col:0x66e0ff,moves:[
 {n:"Ice Shards",cd:6,rng:30,fn(f,K){K.play(f,"cast1",.38);K.later(f,.14,()=>{const F=K.fwd(f);[-.18,0,.18].forEach(a=>{const c=Math.cos(a),s=Math.sin(a);K.shot(f,{dir:[F[0]*c-F[1]*s,F[0]*s+F[1]*c],shape:"shard",speed:60,size:.8,col:0x9fe8ff,life:.9,h:H(4.5*D(f),"light",{stun:.45,slow:3,col:0x66e0ff})})})})}},
 {n:"Frozen Ground",cd:11,rng:8,fn(f,K){K.play(f,"stomp",.5);K.later(f,.32,()=>{FX.spikes(f.x,f.z,0x9fe8ff,14,9);FX.ring(f.x,.3,f.z,0x66e0ff,14,.5);FX.shake(.4);K.around(f,f.x,f.z,9.5,H(9*D(f),"freeze",{stun:1.5,col:0x66e0ff}),f.y)})}},
 {n:"Glacier Fist",cd:9,rng:5,fn(f,K){K.play(f,"thrust",.55);K.later(f,.28,()=>{K.cone(f,5.2,1.6,H(13*D(f),"freeze",{stun:1.3,col:0x66e0ff,guardDmg:70}));FX.burst(f.x+K.fwd(f)[0]*3,f.y+3,f.z+K.fwd(f)[1]*3,0x9fe8ff,16,12,.4,.4)})}},
 {n:"Frost Step",cd:10,rng:22,fn(f,K){const t=K.tgt(f,22);if(!t){K.play(f,"dashF",.3);K.lunge(f,50,.25);return}K.behind(f,t);K.play(f,"m1",.4,Rig.m1Keys(f,3));K.later(f,.12,()=>K.cone(f,4.6,2.2,H(8*D(f),"knock",{kb:30,up:9,slow:2,col:0x66e0ff})))}}],
 fin:{n:"Absolute Zero",fn(f,K){K.play(f,"finisher",1.2);K.later(f,.5,()=>{FX.flash("#bff",.5);FX.ring(f.x,.3,f.z,0x9fe8ff,34,.8);FX.spikes(f.x,f.z,0x9fe8ff,30,20);K.around(f,f.x,f.z,22,H(6*D(f),"freeze",{stun:2.4,unblock:1,col:0x66e0ff}),f.y)});K.later(f,1.4,()=>{FX.shake(1);K.foesOf(f).forEach(t=>{if(Math.hypot(t.x-f.x,t.z-f.z)<23){FX.boom(t.x,t.y+2.5,t.z,0x9fe8ff,4);K.sendHit(f,t,H(30*D(f),"knock",{kb:34,up:14,unblock:1,col:0x66e0ff}))}})})}}},
{n:"Thunder",col:0xffe14d,moves:[
 {n:"Lightning Lunge",cd:7,rng:20,fn(f,K){K.play(f,"dashF",.25);K.lunge(f,80,.2,H(9*D(f),"stun",{stun:1.1,col:0xffe14d}),0xffe14d);FX.bolt(f.x,f.y+3,f.z,f.x+K.fwd(f)[0]*16,f.y+3,f.z+K.fwd(f)[1]*16,0xffe14d)}},
 {n:"Thunder Clap",cd:10,rng:7,fn(f,K){K.play(f,"thrust",.45);K.later(f,.22,()=>{for(let i=0;i<5;i++){const a=i/5*6.28;FX.bolt(f.x+Math.cos(a)*6,30,f.z+Math.sin(a)*6,f.x+Math.cos(a)*6,0,f.z+Math.sin(a)*6,0xffe14d)}FX.ring(f.x,.5,f.z,0xffe14d,12,.4);FX.flash("#fff7c2",.25);FX.shake(.5);K.around(f,f.x,f.z,8.5,H(9*D(f),"stun",{stun:1.3,col:0xffe14d}),f.y)})}},
 {n:"Chain Bolt",cd:8,rng:30,fn(f,K){K.play(f,"cast1",.4);K.later(f,.15,()=>{let from=f,hit=new Set();for(let j=0;j<4;j++){let b=null,bd=j?13:30;K.foesOf(f).forEach(t=>{if(hit.has(t))return;const d=Math.hypot(t.x-from.x,t.z-from.z);if(d<bd){bd=d;b=t}});if(!b)break;FX.bolt(from.x,from.y+3,from.z,b.x,b.y+3,b.z,0xffe14d);K.sendHit(f,b,H(10*D(f),"stun",{stun:.9,col:0xffe14d}));hit.add(b);from=b}if(!hit.size){const F=K.fwd(f);FX.bolt(f.x,f.y+3,f.z,f.x+F[0]*25,f.y+3,f.z+F[1]*25,0xffe14d)}})}},
 {n:"Storm Kick",cd:8,rng:4.5,fn(f,K){K.play(f,"kickup",.45);K.later(f,.15,()=>{if(K.cone(f,4.6,1.9,H(10*D(f),"launch",{up:32,kb:2,col:0xffe14d})))f.vy=26;FX.bolt(f.x,f.y+1,f.z,f.x,f.y+12,f.z,0xffe14d)})}}],
 fin:{n:"Heaven's Strike",fn(f,K){K.play(f,"finisher",1.4);for(let i=0;i<8;i++)K.later(f,.25+i*.12,()=>{K.foesOf(f).forEach(t=>{if(Math.hypot(t.x-f.x,t.z-f.z)<30){FX.bolt(t.x+r(-1,1),40,t.z+r(-1,1),t.x,t.y,t.z,0xffe14d);K.sendHit(f,t,H(3*D(f),"stun",{stun:.5,unblock:1,col:0xffe14d}))}});FX.shake(.3)});
  K.later(f,1.35,()=>{FX.flash("#fff",.6);FX.shake(1);K.foesOf(f).forEach(t=>{if(Math.hypot(t.x-f.x,t.z-f.z)<30){FX.pillar(t.x,t.z,0xffe14d,40,3,.6);World.crater(t.x,t.z,4);K.sendHit(f,t,H(18*D(f),"knock",{kb:30,up:20,unblock:1,col:0xffe14d}))}})})}}},
{n:"Gravity",col:0x9b59ff,moves:[
 {n:"Pull",cd:8,rng:30,fn(f,K){K.play(f,"cast1",.45);const t=K.tgt(f,30);K.later(f,.15,()=>{if(!t)return;const F=K.fwd(f);FX.beam(f.x,f.y+3,f.z,t.x,t.y+3,t.z,0x9b59ff,.35,.3);K.sendHit(f,t,H(5*D(f),"stun",{stun:.9,pull:[f.x+F[0]*2.6,f.z+F[1]*2.6],col:0x9b59ff}))})}},
 {n:"Crush",cd:10,rng:20,fn(f,K){K.play(f,"stomp",.5);const p=K.point(f,20);K.later(f,.32,()=>{FX.ring(p[0],.3,p[1],0x9b59ff,8,.5);FX.pillar(p[0],p[1],0x9b59ff,10,2.5,.4);World.crater(p[0],p[1],4);FX.shake(.5);K.around(f,p[0],p[1],4,H(13*D(f),"slam",{col:0x9b59ff}),0)})}},
 {n:"Orbit Toss",cd:7,rng:35,fn(f,K){K.play(f,"rise",.55);const t=K.tgt(f,35);let best=null,bd=25;World.props.forEach(p=>{if(!p.alive||p.held||p.fly)return;const d=Math.hypot(p.x-f.x,p.z-f.z);if(d<bd){bd=d;best=p}});
  K.later(f,.35,()=>{if(best&&t){const dx=t.x-best.x,dz=t.z-best.z,d=Math.hypot(dx,dz)||1;best.y=6;best.fly={vx:dx/d*55,vy:6+d*.08,vz:dz/d*55,owner:f,hit:new Set()};FX.burst(best.x,3,best.z,0x9b59ff,14,8,.4,.5)}else K.shot(f,{speed:45,size:1.3,col:0x6a3fb0,life:1.2,h:H(12*D(f),"knock",{kb:28,up:8,col:0x9b59ff})})})}},
 {n:"Repulse",cd:9,rng:8,fn(f,K){K.play(f,"thrust",.45);K.later(f,.2,()=>{FX.ring(f.x,2.5,f.z,0x9b59ff,16,.45);FX.ring(f.x,.4,f.z,0xffffff,12,.4);FX.shake(.5);K.around(f,f.x,f.z,10,H(8*D(f),"knock",{kb:42,up:10,col:0x9b59ff}),f.y);World.damageProps(f.x,f.z,10,40,0,0)})}}],
 fin:{n:"Black Star",fn(f,K){K.play(f,"finisher",1.6);const F=K.fwd(f),cx=f.x+F[0]*8,cz=f.z+F[1]*8;const orb=new THREE.Mesh(new THREE.SphereGeometry(2.5,20,14),new THREE.MeshBasicMaterial({color:0x10001a}));orb.position.set(cx,7,cz);f.rig.g.parent.add(orb);
  for(let i=0;i<10;i++)K.later(f,.1+i*.12,()=>{orb.scale.setScalar(1+i*.12);FX.ring(cx,7,cz,0x9b59ff,6,.3,true,f.r);K.foesOf(f).forEach(t=>{const dx=cx-t.x,dz=cz-t.z,d=Math.hypot(dx,dz);if(d<30&&d>1.5){t.x+=dx/d*Math.min(d,2.2);t.z+=dz/d*Math.min(d,2.2);if(t.rid)K.sendHit(f,t,H(1,"stun",{stun:.4,pull:[t.x,t.z],unblock:1,col:0x9b59ff}))}})});
  K.later(f,1.35,()=>{orb.parent&&orb.parent.remove(orb);FX.boom(cx,5,cz,0x9b59ff,14);FX.flash("#c9a2ff",.5);FX.shake(1.2);World.crater(cx,cz,9);World.damageProps(cx,cz,16,99,0,0);K.around(f,cx,cz,16,H(36*D(f),"knock",{kb:40,up:18,unblock:1,col:0x9b59ff}),0)})}}},
{n:"Shadow",col:0x8a4fb0,moves:[
 {n:"Shade Step",cd:7,rng:25,fn(f,K){const t=K.tgt(f,25);if(!t){K.play(f,"dashF",.3);K.lunge(f,55,.22);return}K.behind(f,t);K.play(f,"m1",.35,Rig.m1Keys(f,1));K.later(f,.1,()=>K.cone(f,4.4,2.2,H((Math.random()<.3?16:8)*D(f),"stun",{stun:.9,col:0x8a4fb0})))}},
 {n:"Shadow Grab",cd:9,rng:20,fn(f,K){K.play(f,"cast1",.5);const t=K.tgt(f,20);K.later(f,.2,()=>{if(!t)return;const F=K.fwd(f);FX.beam(f.x,f.y+3,f.z,t.x,t.y+3,t.z,0x2a0838,.5,.4);K.sendHit(f,t,H(6*D(f),"stun",{stun:1.1,pull:[f.x+F[0]*2.4,f.z+F[1]*2.4],col:0x8a4fb0}))})}},
 {n:"Night Barrage",cd:9,rng:4.5,fn(f,K){barrage(f,K,6,0x8a4fb0)}},
 {n:"Umbral Spike",cd:10,rng:22,fn(f,K){K.play(f,"stomp",.45);const p=K.point(f,22);K.later(f,.3,()=>{FX.spikes(p[0],p[1],0x3a1050,8,3);FX.shake(.3);K.around(f,p[0],p[1],3.5,H(12*D(f),"launch",{up:28,kb:3,col:0x8a4fb0}),0)})}}],
 fin:{n:"Eclipse",fn(f,K){K.play(f,"finisher",1.5);FX.flash("#000",.85);const ts=K.foesOf(f).filter(t=>Math.hypot(t.x-f.x,t.z-f.z)<32);const ox=f.x,oz=f.z;
  ts.forEach((t,j)=>{for(let i=0;i<5;i++)K.later(f,.25+j*.4+i*.07,()=>{K.behind(f,t);FX.spark(t.x,t.y+3,t.z,0xb06fe0,true);K.sendHit(f,t,H((i===4?20:4)*D(f),i===4?"knock":"stun",{stun:.6,kb:34,up:12,unblock:1,col:0x8a4fb0}))})});
  K.later(f,.4+ts.length*.4,()=>{FX.flash("#000",.4)})}}},
{n:"Wind",col:0xb8ffd8,moves:[
 {n:"Gale Slash",cd:6,rng:30,fn(f,K){K.play(f,"cast1",.38);K.later(f,.14,()=>K.shot(f,{shape:"blade",speed:58,size:1,col:0xc8fff0,life:.9,pierce:1,r:2.4,h:H(8*D(f),"knock",{kb:24,up:6,col:0xb8ffd8})}))}},
 {n:"Cyclone Spin",cd:9,rng:6,fn(f,K){K.play(f,"spin",.8);K.lunge(f,14,.75);for(let i=0;i<5;i++)K.later(f,.1+i*.14,()=>{FX.ring(f.x,2,f.z,0xb8ffd8,6,.25);K.around(f,f.x,f.z,4.5,i<4?H(2.5*D(f),"light",{stun:.4,kb:1,col:0xb8ffd8}):H(6*D(f),"knock",{kb:32,up:12,col:0xb8ffd8}),f.y)})}},
 {n:"Updraft",cd:8,rng:6,fn(f,K){K.play(f,"rise",.45);K.later(f,.2,()=>{FX.pillar(f.x,f.z,0xc8fff0,14,4,.5);K.around(f,f.x,f.z,6.5,H(8*D(f),"launch",{up:34,kb:2,col:0xb8ffd8}),f.y);f.vy=20})}},
 {n:"Air Burst",cd:7,rng:25,fn(f,K){K.play(f,"dashF",.25);FX.ring(f.x,2.5,f.z,0xffffff,5,.3,true,f.r);K.lunge(f,95,.2,H(7*D(f),"knock",{kb:30,up:9,col:0xb8ffd8}),0xc8fff0);FX.speed(1)}}],
 fin:{n:"Tempest",fn(f,K){K.play(f,"finisher",1.6);const p=K.point(f,25);const tw=new THREE.Mesh(new THREE.ConeGeometry(6,22,18,1,true),new THREE.MeshBasicMaterial({color:0xc8fff0,transparent:true,opacity:.5,side:THREE.DoubleSide}));tw.rotation.x=Math.PI;tw.position.set(p[0],11,p[1]);f.rig.g.parent.add(tw);
  for(let i=0;i<12;i++)K.later(f,.1+i*.1,()=>{tw.rotation.y+=1.2;FX.burst(p[0],r(1,18),p[1],0xc8fff0,4,10,.4,.4,0);K.foesOf(f).forEach(t=>{const dx=p[0]-t.x,dz=p[1]-t.z,d=Math.hypot(dx,dz);if(d<18){t.x+=dx/d*Math.min(d,1.8);t.z+=dz/d*Math.min(d,1.8);K.sendHit(f,t,H(2*D(f),"stun",{stun:.4,pull:[t.x,t.z],unblock:1,col:0xb8ffd8}))}});World.damageProps(p[0],p[1],8,30,0,0)});
  K.later(f,1.35,()=>{tw.parent&&tw.parent.remove(tw);FX.boom(p[0],6,p[1],0xc8fff0,10);FX.shake(1);K.around(f,p[0],p[1],12,H(26*D(f),"launch",{up:40,kb:20,unblock:1,col:0xb8ffd8}),0)})}}},
{n:"Blood",col:0xd50000,moves:[
 {n:"Crimson Fist",cd:8,rng:5,fn(f,K){K.play(f,"thrust",.5);K.later(f,.24,()=>K.cone(f,5,1.7,H(13*D(f),"knock",{kb:32,up:8,heal:.5,col:0xd50000,guardDmg:60})))}},
 {n:"Blood Lance",cd:7,rng:35,fn(f,K){K.play(f,"cast1",.38);K.later(f,.14,()=>K.shot(f,{shape:"shard",speed:80,size:.9,col:0xff1a1a,life:.7,pierce:1,h:H(10*D(f),"stun",{stun:.7,heal:.3,col:0xd50000})}))}},
 {n:"Frenzy",cd:16,rng:99,fn(f,K){K.play(f,"awaken",.5);f.lock=.35;K.buff(f,"spd",7);K.buff(f,"dmg",7);FX.ring(f.x,.3,f.z,0xd50000,8,.5);FX.burst(f.x,3,f.z,0xd50000,20,10,.4,.5)}},
 {n:"Red Rain",cd:11,rng:25,fn(f,K){K.play(f,"rise",.5);const p=K.point(f,25);for(let i=0;i<10;i++)K.later(f,.25+i*.08,()=>{const x=p[0]+r(-5,5),z=p[1]+r(-5,5);FX.beam(x,22,z,x,0,z,0xd50000,.25,.25);FX.burst(x,.5,z,0xd50000,4,6,.3,.3);K.around(f,x,z,2.6,H(3*D(f),"light",{stun:.5,kb:1,heal:.3,col:0xd50000}),0)})}}],
 fin:{n:"Sanguine Moon",fn(f,K){K.play(f,"finisher",1.5);const moon=new THREE.Mesh(new THREE.SphereGeometry(6,24,16),new THREE.MeshBasicMaterial({color:0xb00000}));moon.position.set(f.x,30,f.z);f.rig.g.parent.add(moon);FX.flash("#600",.5);
  for(let i=0;i<6;i++)K.later(f,.2+i*.15,()=>K.foesOf(f).forEach(t=>{if(Math.hypot(t.x-f.x,t.z-f.z)<26){FX.beam(t.x,t.y+3,t.z,f.x,f.y+3,f.z,0xd50000,.2,.2);K.sendHit(f,t,H(4*D(f),"stun",{stun:.5,heal:.6,unblock:1,col:0xd50000}))}}));
  K.later(f,1.3,()=>{moon.parent&&moon.parent.remove(moon);FX.boom(f.x,3,f.z,0xd50000,10);FX.shake(1);K.around(f,f.x,f.z,26,H(16*D(f),"knock",{kb:36,up:14,heal:.4,unblock:1,col:0xd50000}),f.y)})}}},
{n:"Crystal",col:0x7df9ff,moves:[
 {n:"Crystal Wall",cd:12,rng:8,fn(f,K){K.play(f,"stomp",.45);K.later(f,.3,()=>{const F=K.fwd(f),x=f.x+F[0]*4,z=f.z+F[1]*4,side=Math.abs(F[0])>Math.abs(F[1]);K.addWall(f,x,z,side?1.6:9,side?9:1.6,7,0x7df9ff,6);FX.shake(.4);K.around(f,x,z,4.5,H(8*D(f),"launch",{up:24,kb:8,col:0x7df9ff}),0)})}},
 {n:"Shard Burst",cd:7,rng:12,fn(f,K){K.play(f,"thrust",.45);K.later(f,.2,()=>{for(let i=0;i<10;i++){const a=f.r+(i-4.5)*.22;K.shot(f,{dir:[Math.sin(a),Math.cos(a)],shape:"shard",speed:48,size:.7,col:0xb5fbff,life:.5,h:H(4*D(f),"light",{stun:.4,kb:3,col:0x7df9ff})})}})}},
 {n:"Gem Fist",cd:10,rng:5,fn(f,K){K.play(f,"charge",.7);K.later(f,.45,()=>{Rig.play(f,"thrust",.3);K.cone(f,5.4,1.7,H(15*D(f),"knock",{kb:40,up:10,unblock:1,col:0x7df9ff}));FX.burst(f.x+K.fwd(f)[0]*3,f.y+3,f.z+K.fwd(f)[1]*3,0x7df9ff,18,14,.45,.4)})}},
 {n:"Prism Guard",cd:15,rng:99,fn(f,K){K.play(f,"awaken",.45);f.lock=.3;f.sh=40;K.buff(f,"shield",6);FX.ring(f.x,2.5,f.z,0x7df9ff,5,.5,true,f.r);FX.burst(f.x,3,f.z,0x7df9ff,16,8,.4,.5)}}],
 fin:{n:"Diamond Storm",fn(f,K){K.play(f,"finisher",1.4);for(let i=1;i<=5;i++)K.later(f,.3+i*.15,()=>{FX.spikes(f.x,f.z,0x7df9ff,10+i*5,i*5);FX.shake(.4);K.foesOf(f).forEach(t=>{const d=Math.hypot(t.x-f.x,t.z-f.z);if(d>(i-1)*5&&d<i*5+1.5)K.sendHit(f,t,H(30*D(f),"launch",{up:34,kb:12,unblock:1,col:0x7df9ff}))});World.damageProps(f.x,f.z,i*5,50,0,0)})}}},
{n:"Venom",col:0x7cff3a,moves:[
 {n:"Toxic Spit",cd:7,rng:30,fn(f,K){K.play(f,"cast1",.4);K.later(f,.15,()=>K.shot(f,{speed:36,vy:9,grav:30,size:.8,col:0x7cff3a,life:1.5,h:H(6*D(f),"light",{stun:.5,poison:1,col:0x7cff3a}),onEnd(x,y,z){K.hazard(f,x,z,4,4,H(1.5*D(f),"light",{stun:.1,kb:0,poison:1,col:0x7cff3a}),0x5ccc2a,.5)}}))}},
 {n:"Serpent Strike",cd:7,rng:18,fn(f,K){K.play(f,"dashpunch",.3);K.lunge(f,66,.22,H(9*D(f),"stun",{stun:1,poison:1,col:0x7cff3a}),0x7cff3a)}},
 {n:"Acid Pool",cd:12,rng:6,fn(f,K){K.play(f,"stomp",.45);K.later(f,.3,()=>{K.hazard(f,f.x,f.z,7,4.5,H(2*D(f),"light",{stun:.2,kb:0,poison:1,col:0x7cff3a}),0x4caa22,.45);FX.ring(f.x,.3,f.z,0x7cff3a,10,.4)})}},
 {n:"Venom Fang",cd:9,rng:4.5,fn(f,K){barrage(f,K,3,0x7cff3a,{poison:1},H(7*D(f),"launch",{up:26,kb:3,poison:1,col:0x7cff3a}))}}],
 fin:{n:"Plague Burst",fn(f,K){K.play(f,"finisher",1.2);K.later(f,.7,()=>{FX.boom(f.x,3,f.z,0x7cff3a,16);FX.flash("#5f3",.4);FX.shake(1);K.hazard(f,f.x,f.z,16,5,H(2*D(f),"light",{stun:.1,kb:0,poison:1,col:0x7cff3a}),0x4caa22,.5);K.around(f,f.x,f.z,20,H(28*D(f),"knock",{kb:38,up:14,poison:1,unblock:1,col:0x7cff3a}),f.y)})}}},
{n:"Time",col:0xf0d9a0,moves:[
 {n:"Rewind",cd:12,rng:99,fn(f,K){const h=f.hist[0];K.play(f,"awaken",.35);f.lock=.25;if(h){K.tp(f,h[0],h[1])}f.hp=Math.min(f.mhp,f.hp+12);f.burn=f.poison=null;f.slowT=0;FX.ring(f.x,2.5,f.z,0xf0d9a0,6,.5,true,f.r)}},
 {n:"Stop Punch",cd:10,rng:5,fn(f,K){K.play(f,"thrust",.45);K.later(f,.22,()=>{K.cone(f,5,1.6,H(8*D(f),"freeze",{stun:2,col:0xf0d9a0}));FX.ring(f.x+K.fwd(f)[0]*3,3,f.z+K.fwd(f)[1]*3,0xf0d9a0,5,.5,true,f.r)})}},
 {n:"Accelerate",cd:16,rng:99,fn(f,K){K.play(f,"awaken",.4);f.lock=.3;K.buff(f,"spd",6);K.buff(f,"haste",6);FX.ring(f.x,.3,f.z,0xf0d9a0,8,.5);FX.burst(f.x,3,f.z,0xf0d9a0,16,8,.4,.5)}},
 {n:"Clock Hands",cd:9,rng:8,fn(f,K){K.play(f,"spin",.6);[.15,.4].forEach((t,i)=>K.later(f,t,()=>{FX.ring(f.x,2.5,f.z,0xf0d9a0,10,.3);K.around(f,f.x,f.z,8,i?H(9*D(f),"knock",{kb:32,up:10,col:0xf0d9a0}):H(5*D(f),"stun",{stun:.6,col:0xf0d9a0}),f.y)}))}}],
 fin:{n:"Zero Hour",fn(f,K){K.play(f,"finisher",1);K.later(f,.5,()=>{FX.flash("#e9dcb6",.7);FX.ring(f.x,.3,f.z,0xf0d9a0,50,1);K.around(f,f.x,f.z,40,H(10*D(f),"freeze",{stun:3.6,unblock:1,col:0xf0d9a0}),f.y);f.cd=[0,0,0,0]})}}}
,
{n:"Cosmic",col:0xff4dff,moves:[
 {n:"Star Barrage",cd:7,rng:4.5,fn(f,K){barrage(f,K,7,0xff4dff,{},H(9*D(f),"launch",{up:28,kb:4,col:0xff4dff}))}},
 {n:"Nova Beam",cd:7,rng:30,fn(f,K){K.play(f,"thrust",.5);K.later(f,.22,()=>{const F=K.fwd(f);FX.beam(f.x+F[0]*1.5,f.y+3,f.z+F[1]*1.5,f.x+F[0]*32,f.y+3,f.z+F[1]*32,0xff4dff,.9,.45);FX.shake(.4);K.foesOf(f).forEach(t=>{const dx=t.x-f.x,dz=t.z-f.z,along=dx*F[0]+dz*F[1],side=Math.abs(dx*F[1]-dz*F[0]);if(along>0&&along<32&&side<2.4)K.sendHit(f,t,H(15*D(f),"knock",{kb:40,up:10,col:0xff4dff}))});World.damageProps(f.x+F[0]*16,f.z+F[1]*16,10,60,F[0],F[1])})}},
 {n:"Gravity Well",cd:9,rng:25,fn(f,K){K.play(f,"cast1",.45);const p=K.point(f,25);K.later(f,.2,()=>{FX.ring(p[0],.3,p[1],0xff4dff,10,.5);K.foesOf(f).forEach(t=>{if(Math.hypot(t.x-p[0],t.z-p[1])<9)K.sendHit(f,t,H(9*D(f),"launch",{up:30,kb:2,pull:[p[0],p[1]],col:0xff4dff}))})})}},
 {n:"Comet Dash",cd:7,rng:25,fn(f,K){K.play(f,"dashF",.25);K.lunge(f,100,.22,H(12*D(f),"launch",{up:26,kb:6,col:0xff4dff}),0xff4dff);FX.speed(1)}}],
 fin:{n:"Big Bang",fn(f,K){K.play(f,"finisher",1.3);f.vy=26;K.later(f,.8,()=>{FX.boom(f.x,f.y+2,f.z,0xff4dff,18);FX.boom(f.x,f.y+2,f.z,0xffffff,9);FX.flash("#f9f",.6);FX.shake(1.4);K.around(f,f.x,f.z,24,H(60*D(f),"knock",{kb:50,up:20,unblock:1,col:0xff4dff}),f.y);World.crater(f.x,f.z,12);World.damageProps(f.x,f.z,24,999,0,0)})}}}
];
window.KITS=KITS;
if(window.DATA)KITS.forEach((k,i)=>{const p=window.DATA.POWERS[i];if(p)p.d="Moves: "+k.moves.map(m=>m.n).join(", ")+". Awakened finisher: "+k.fin.n+"."});
})();
