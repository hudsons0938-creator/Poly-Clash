/* 3D arena engine: M1 combo, skills 1-4, dash, block, ultimate. Grind bots + online (Supabase realtime). */
window.Game=(function(){
const $=id=>document.getElementById(id),DT=window.DATA,CD=[4,6,8,5],SK=["Strike","Bolt","Slam","Rush"];
const BN=["ROOKIE","EASY","NORMAL","SKILLED","HARD","VETERAN","ELITE","MASTER","NIGHTMARE","IMPOSSIBLE"];
let sf=0,on=false,scene,cam,ren,me,bots=[],rem=new Map(),proj=[],fxs=[],keys={},yaw=0,t0=0,raf=0,ch=null,mode,lvl=1,pf,myId,label="",joy={x:0,z:0},md=0,spT=0,bt=0,ct=0,fT=0;
const P=()=>window.App.P(),pw=k=>window.App.pw(k);
function tag(t){const c=document.createElement("canvas");c.width=256;c.height=64;const x=c.getContext("2d");x.font="bold 32px sans-serif";x.textAlign="center";x.lineWidth=6;x.strokeStyle="#000";x.fillStyle="#fff";x.strokeText(t,128,44);x.fillText(t,128,44);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false}));s.scale.set(4,1,1);return s}
function model(col,wc){
 const g=new THREE.Group(),M=c=>new THREE.MeshStandardMaterial({color:c,roughness:.4});
 const box=(w,h,d,m,x,y,z,p)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);(p||g).add(b);return b};
 const tm=box(1.1,1.4,.6,M(col),0,1.9,0);box(.7,.7,.7,M(0xffdbac),0,2.9,0);
 const piv=(x,y)=>{const q=new THREE.Group();q.position.set(x,y,0);g.add(q);return q};
 const ra=piv(.85,2.5),la=piv(-.85,2.5),ll=piv(-.3,1.2),rl=piv(.3,1.2);
 box(.35,1.2,.35,M(col),0,-.5,0,ra);box(.15,.15,1.8,M(wc),0,-1,.9,ra);box(.35,1.2,.35,M(col),0,-.5,0,la);
 box(.4,1.2,.4,M(0x222222),0,-.6,0,ll);box(.4,1.2,.4,M(0x222222),0,-.6,0,rl);
 return{g,ra,ll,rl,tm};
}
function mk(name,col,wc,mh,at){const m=model(col,wc);scene.add(m.g);const f={at:at||0,m,g:m.g,x:0,z:0,y:0,vy:0,hp:mh,mhp:mh,name,r:0,fl:0,blk:0,sw:0,kx:0,kz:0,dead:0,inv:0,ph:0,px:0,pz:0};const t=tag(name);t.position.y=4.2;m.g.add(t);return f}
function arena(){
 scene.background=new THREE.Color(0x0a0a10);scene.fog=new THREE.FogExp2(0x0a0a10,.012);
 scene.add(new THREE.AmbientLight(0xffffff,.7));const dl=new THREE.DirectionalLight(0xffffff,.9);dl.position.set(20,40,15);scene.add(dl);
 const fl=new THREE.Mesh(new THREE.CylinderGeometry(46,46,1,64),new THREE.MeshStandardMaterial({color:0x15151c}));fl.position.y=-.5;scene.add(fl);
 const rg=new THREE.Mesh(new THREE.TorusGeometry(46,.5,8,64),new THREE.MeshStandardMaterial({color:0xd8ad3d,emissive:0x553300}));rg.rotation.x=Math.PI/2;scene.add(rg);
 for(let i=0;i<16;i++){const a=i/16*6.283,p=new THREE.Mesh(new THREE.CylinderGeometry(1,1.3,9,8),new THREE.MeshStandardMaterial({color:0x7a1c1c}));p.position.set(Math.cos(a)*50,4.5,Math.sin(a)*50);scene.add(p)}
 for(let i=0;i<8;i++){const a=i/8*6.283+.4,h=2+i%3*2,b=new THREE.Mesh(new THREE.BoxGeometry(3,h,3),new THREE.MeshStandardMaterial({color:0x2a2a35}));b.position.set(Math.cos(a)*18,h/2,Math.sin(a)*18);scene.add(b)}
}
function skinCol(i,d){const s=DT.SKINS[i||0];return s&&s[1]!=null?s[1]:d}
function stats(){const p=P(),c=DT.CH[p.char],w=DT.WP[p.weapon],L=p.lv[p.char]||1;return{c,w,mhp:Math.round(100*c.hp*(1+L*.08)),dmg:12*c.dmg*(1+L*.1)*w.dmg,spd:.14*c.spd*(pw("speed")?1.5:1),rng:w.rng,cd:w.cd,ls:w.ls||0,agi:c.agi,pi:DT.PIDX[c.pw],pc:DT.POWERS[DT.PIDX[c.pw]].col,fk:DT.POWERS[DT.PIDX[c.pw]].fx}}
const dm=m=>pw("god")?100:me.S.dmg*m;
const foes=()=>{const a=bots.filter(b=>!b.dead);rem.forEach(r=>{if(!r.dead)a.push(r)});return a};
const feed=t=>{$("feed").textContent=t;fT=2.5};
const ult=a=>{me.ul=Math.min(100,me.ul+a)};
function fx(x,z,c,r){const m=new THREE.Mesh(new THREE.RingGeometry(.5,1,32),new THREE.MeshBasicMaterial({color:c,transparent:true,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.set(x,.1,z);scene.add(m);fxs.push({m,l:0,r})}
function dmg(t,d,kx,kz){
 if(t.dead||t.inv>0)return;if(t.blk)d*=.2;if(t.sh>0){const a=Math.min(t.sh,d);t.sh-=a;d-=a}t.hp-=d;t.fl=6;t.kx=(kx||0)*.5;t.kz=(kz||0)*.5;
 if(t===me)ult(d*.3);
 if(t.hp<=0){if(t===me)die();else killBot(t)}
}
function hit(t,d,kx,kz){
 const f=sf?me.S.fk:null;if(f==="crit"&&Math.random()<.25)d*=2;if(f==="push"){kx*=2.5;kz*=2.5}if(f==="pull"){kx=-kx*.6;kz=-kz*.6}if(f==="vamp")me.hp=Math.min(me.mhp,me.hp+d*.25);if(f==="haste")for(let i=0;i<4;i++)me.cd[i]=Math.max(0,me.cd[i]-.5);if(f==="shield")me.sh=Math.min(40,(me.sh||0)+8);
 if(me.S.ls)me.hp=Math.min(me.mhp,me.hp+d*me.S.ls);ult(d*.2);
 if(t.rid){if(ch)ch.hit({to:t.rid,d:Math.round(d),by:myId,kx,kz,f});t.fl=6}else{dmg(t,d,kx,kz);if(f)status(t,f,d)}
}
function status(t,f,d){if(f==="burn"){t.dot=3;t.dd=d*.2}else if(f==="poison"){t.dot=5;t.dd=d*.1;t.slow=2}else if(f==="slow")t.slow=3;else if(f==="stun")t.stun=1}
function tick(f,dt){if(f.dot>0){f.dot-=dt;f.hp-=f.dd*dt;f.fl=Math.max(f.fl,2);if(f.hp<=0&&!f.dead){if(f===me)die();else killBot(f)}}if(f.slow>0)f.slow-=dt;if(f.stun>0)f.stun-=dt}
function killBot(b){b.dead=1;b.rt=1.5;spT=1.5;const c=20*lvl+10;window.App.reward({coins:c,xp:10+5*lvl,kills:1});feed("KO! +"+c+" coins")}
function die(){me.dead=1;me.rt=3;me.g.rotation.x=-1.4;if(ch&&me.lastBy)ch.hit({to:me.lastBy,k:1});feed("Knocked out! Respawning...")}
function aim(){let b=null,bl=14;for(const t of foes()){const L=Math.hypot(t.x-me.x,t.z-me.z);if(L<bl){bl=L;b=t}}if(b)me.r=Math.atan2(b.x-me.x,b.z-me.z)}
function cone(range,arc,d,kb){const fx_=Math.sin(me.r),fz=Math.cos(me.r);for(const t of foes()){const dx=t.x-me.x,dz=t.z-me.z,L=Math.hypot(dx,dz)||1;if(L<range&&(L<1.5||(dx*fx_+dz*fz)/L>Math.cos(arc/2)))hit(t,d,dx/L*kb,dz/L*kb)}}
function m1(){
 if(me.dead||me.ac>0)return;aim();me.ac=me.S.cd;me.sw=1;me.cmb=me.cmbT>0?me.cmb+1:1;me.cmbT=1.2;
 const fin=me.cmb>=4;if(fin)me.cmb=0;cone(me.S.rng,2.2,dm(fin?1.6:1),fin?3:.8);
}
function skill(i){
 if(me.dead||me.cd[i]>0)return;aim();me.cd[i]=CD[i]*(1-.03*me.S.c.rar)/me.S.agi;me.sw=1;sf=1;
 if(i===0)cone(me.S.rng+2,2.6,dm(2),3);
 if(i===1){const m=new THREE.Mesh(new THREE.SphereGeometry(.8),new THREE.MeshBasicMaterial({color:me.S.pc}));scene.add(m);proj.push({x:me.x,z:me.z,dx:Math.sin(me.r),dz:Math.cos(me.r),l:70,d:dm(1.8),m})}
 if(i===2){for(const t of foes()){const dx=t.x-me.x,dz=t.z-me.z,L=Math.hypot(dx,dz)||1;if(L<7)hit(t,dm(2.2),dx/L*4,dz/L*4)}fx(me.x,me.z,me.S.pc,7)}
 if(i===3){me.dt=14;me.dvx=Math.sin(me.r)*.9;me.dvz=Math.cos(me.r)*.9;me.rush=dm(1.6);me.rh=new Set()}
 sf=0;
}
function ultra(){if(me.dead||me.ul<100)return;me.ul=0;aim();me.sw=1;sf=1;for(const t of foes()){const dx=t.x-me.x,dz=t.z-me.z,L=Math.hypot(dx,dz)||1;if(L<12)hit(t,dm(5),dx/L*6,dz/L*6)}fx(me.x,me.z,0xffffff,12);fx(me.x,me.z,me.S.pc,9);me.ul=0;sf=0}
function dash(){if(me.dead||me.dc>0)return;const a=Math.hypot(me.lx,me.lz)?[me.lx,me.lz]:[Math.sin(me.r),Math.cos(me.r)];me.dc=1.5/me.S.agi;me.dt=8;me.dvx=a[0]*.8;me.dvz=a[1]*.8;me.rush=0;me.inv=14}
function jump(){if(!me.dead&&me.y<=0){me.vy=.35}}
function place(f,k){const mv=Math.hypot(f.x-f.px,f.z-f.pz)>.02;f.px=f.x;f.pz=f.z;f.ph+=mv?.35*k:0;f.m.ll.rotation.x=mv?Math.sin(f.ph)*.7:0;f.m.rl.rotation.x=mv?-Math.sin(f.ph)*.7:0;
 const s=f.sw,a=f.m.ra;a.rotation.z=0;let rx=mv?Math.sin(f.ph+3)*.4:0,ry=0,ox=0;
 if(s>0){if(f.at===0)rx=-2.4+(1-s)*3;else if(f.at===1){rx=-1.5;a.rotation.z=1-(1-s)*2.2}else if(f.at===2){rx=-1.5;ry=(1-s)*6.283}else{rx=-1.57;ox=Math.sin(s*3.14)*1.2}}
 a.rotation.x=rx;f.sw=Math.max(0,f.sw-.07*k);f.fl=Math.max(0,f.fl-k);f.m.tm.material.emissive.setHex(f.fl>0?0xffffff:0);
 f.g.position.set(f.x+Math.sin(f.r)*ox,f.y,f.z+Math.cos(f.r)*ox);f.g.rotation.y=f.r+ry}
function clamp(f){const L=Math.hypot(f.x,f.z);if(L>44){f.x*=44/L;f.z*=44/L}}
function updMe(k,dt){
 const S=me.S;
 if(me.dead){me.rt-=dt;if(me.rt<=0){me.dead=0;me.hp=me.mhp;me.g.rotation.x=0;me.x=(Math.random()-.5)*30;me.z=(Math.random()-.5)*30;me.inv=120;me.lastBy=null}return}
 tick(me,dt);if(me.stun>0){me.x+=me.kx*k;me.z+=me.kz*k;me.kx*=.85;me.kz*=.85;clamp(me);return}
 yaw+=((keys.ArrowLeft?1:0)-(keys.ArrowRight?1:0))*.04*k;
 const f=[-Math.sin(yaw),-Math.cos(yaw)],r=[Math.cos(yaw),-Math.sin(yaw)];
 const kw=((keys.KeyW||keys.ArrowUp)?1:0)-((keys.KeyS||keys.ArrowDown)?1:0)||-joy.z,kd=(keys.KeyD?1:0)-(keys.KeyA?1:0)||joy.x;
 const L=Math.hypot(kw,kd)||1,wx=(f[0]*kw+r[0]*kd)/L,wz=(f[1]*kw+r[1]*kd)/L;me.lx=kw||kd?wx:0;me.lz=kw||kd?wz:0;
 me.blk=keys.KeyF&&me.st>2?1:0;
 const sp=keys.ShiftLeft&&me.st>0&&(kw||kd);
 if((sp||me.blk)&&!pw("inf"))me.st=Math.max(0,me.st-(sp?.7:.4)*k);else me.st=Math.min(100,me.st+.35*k);
 const spd=S.spd*(sp?1.6:1)*(me.blk?.4:1)*(me.slow>0?.5:1);
 if(me.dt>0){me.x+=me.dvx*k;me.z+=me.dvz*k;me.dt-=k;if(me.rush)for(const t of foes())if(!me.rh.has(t)&&Math.hypot(t.x-me.x,t.z-me.z)<2.4){me.rh.add(t);sf=me.rush>0?1:0;hit(t,me.rush,me.dvx*5,me.dvz*5);sf=0}}
 else if(kw||kd){me.x+=wx*spd*k;me.z+=wz*spd*k;me.r=Math.atan2(wx,wz)}
 me.x+=me.kx*k;me.z+=me.kz*k;me.kx*=.85;me.kz*=.85;
 me.vy-=.02*k;me.y+=me.vy*k;if(me.y<=0){me.y=0;me.vy=0}
 clamp(me);
 for(let i=0;i<4;i++)me.cd[i]=Math.max(0,me.cd[i]-dt);
 me.ac=Math.max(0,me.ac-dt);me.cmbT=Math.max(0,me.cmbT-dt);me.dc=Math.max(0,me.dc-dt);me.inv=Math.max(0,me.inv-k);
 if(keys.KeyJ||md)m1();
}
function botAI(b,k,dt){
 if(b.dead){b.rt-=dt;b.g.rotation.x=-1.4;if(b.rt<=0){scene.remove(b.g);b.gone=1}return}
 tick(b,dt);if(b.dead)return;if(b.stun>0){b.x+=b.kx*k;b.z+=b.kz*k;b.kx*=.85;b.kz*=.85;return}
 const dx=me.x-b.x,dz=me.z-b.z,L=Math.hypot(dx,dz)||1;b.r=Math.atan2(dx,dz);
 b.x+=b.kx*k;b.z+=b.kz*k;b.kx*=.85;b.kz*=.85;
 b.blk=me.sw>.5&&L<4&&Math.random()<b.lv*.02?1:0;
 if(L>2.4&&!b.blk){const s=(.05+b.lv*.014)*k*(b.slow>0?.5:1);b.x+=dx/L*s;b.z+=dz/L*s}
 b.ac-=dt;b.sk-=dt;
 if(L<=2.8&&b.ac<=0&&!me.dead){b.ac=1.2-b.lv*.08;b.sw=1;dmg(me,b.bd*(.8+Math.random()*.4),dx/L*3,dz/L*3)}
 if(b.lv>=4&&b.sk<=0&&L>4&&L<20){b.sk=6-b.lv*.3;const m=new THREE.Mesh(new THREE.SphereGeometry(.7),new THREE.MeshBasicMaterial({color:0xff3344}));scene.add(m);proj.push({x:b.x,z:b.z,dx:dx/L,dz:dz/L,l:70,d:b.bd*1.4,e:1,m})}
 clamp(b);
}
function spawnBot(){const a=Math.random()*6.283,b=mk("Bot Lv"+lvl,[0xc62828,0x8e24aa,0x1565c0][lvl%3],0xaaaaaa,Math.round((80+lvl*45)*window.App.cfg().botHp),Math.floor(Math.random()*4));b.x=Math.cos(a)*25;b.z=Math.sin(a)*25;b.lv=lvl;b.bd=5+lvl*3.5;b.ac=1;b.sk=4;bots.push(b)}
function onState(p){
 let r=rem.get(p.id);
 if(!r){const c=DT.CH[p.c]||DT.CH[0],w=DT.WP[p.w]||DT.WP[0];r=mk(p.n,skinCol(p.k,c.col),w.col,p.mh||100,(DT.PIDX[c.pw]||0)%4);r.rid=p.id;rem.set(p.id,r)}
 r.tx=p.x;r.tz=p.z;r.r=p.r;r.hp=p.hp;r.mhp=p.mh;r.seen=performance.now();r.dead=p.hp<=0?1:0;r.g.rotation.x=r.dead?-1.4:0;if(p.a)r.sw=1;
}
function onHit(p){
 if(p.to!==myId)return;
 if(p.k){window.App.reward({coins:100,xp:40,wins:1});feed("KO! +100 coins");return}
 me.lastBy=p.by;dmg(me,p.d,p.kx,p.kz);if(p.f)status(me,p.f,p.d);
}
function onLeave(k){for(const [id,r] of rem)if(id===k||id.indexOf(k)===0){scene.remove(r.g);rem.delete(id)}}
function start(o){
 stop();pf=P();mode=o.mode;lvl=o.level||1;myId=pf.username+"_"+Math.random().toString(36).slice(2,6);label="";
 document.querySelectorAll(".screen").forEach(s=>s.classList.remove("on"));
 scene=new THREE.Scene();cam=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,500);
 ren=new THREE.WebGLRenderer({antialias:true});ren.setSize(innerWidth,innerHeight);ren.setPixelRatio(Math.min(devicePixelRatio||1,2));document.body.appendChild(ren.domElement);
 arena();
 const S=stats();me=mk(pf.username,skinCol(pf.skin,S.c.col),S.w.col,S.mhp,S.pi%4);Object.assign(me,{S,st:100,ul:0,cd:[0,0,0,0],cmb:0,cmbT:0,ac:0,dt:0,dc:0,rush:0,rh:new Set(),x:-6,lx:0,lz:0});
 if(mode==="online"){ch=window.Backend.join(o.room,{id:myId,name:pf.username},{state:onState,hit:onHit,leave:onLeave});
  if(ch)label=o.room.indexOf("p-")===0?"PARTY "+o.room.slice(2).toUpperCase():"PUBLIC SERVER";
  else{window.App.toast("Online needs the free Supabase setup (see README). Starting offline practice.");mode="grind";lvl=3;label="OFFLINE PRACTICE"}}
 if(mode==="grind"&&!label)label="GRIND LV"+lvl+" "+BN[lvl-1];
 $("arena").textContent=label;$("gameUI").classList.remove("hide");
 if("ontouchstart"in window)$("touch").classList.remove("hide");
 $("skills").innerHTML=[0,1,2,3].map(i=>'<div class="skb" id="sk'+i+'"></div>').join("")+'<div class="skb" id="skQ"></div><div class="skb" id="skR"></div><div class="skb">F Block</div><div class="skb">J/Click Hit</div>';
 yaw=0;spT=0;bt=0;t0=performance.now();on=true;raf=requestAnimationFrame(loop);
}
function stop(){on=false;cancelAnimationFrame(raf);if(ch){ch.close();ch=null}if(document.pointerLockElement)document.exitPointerLock();if(ren){ren.dispose();ren.domElement.remove();ren=null}$("gameUI").classList.add("hide");bots=[];rem.clear();proj=[];fxs=[];keys={};md=0;joy.x=joy.z=0}
function loop(ts){
 if(!on)return;raf=requestAnimationFrame(loop);
 const dt=Math.min(.05,(ts-t0)/1000||.016);t0=ts;const k=dt*60;
 updMe(k,dt);
 bots.forEach(b=>botAI(b,k,dt));bots=bots.filter(b=>!b.gone);
 if(mode==="grind"&&!bots.some(b=>!b.dead)){spT-=dt;if(spT<=0){spawnBot();spT=1.5}}
 const now=performance.now();
 rem.forEach((r,id)=>{r.x+=((r.tx===undefined?r.x:r.tx)-r.x)*.25*k;r.z+=((r.tz===undefined?r.z:r.tz)-r.z)*.25*k;if(now-r.seen>5000){scene.remove(r.g);rem.delete(id)}});
 for(let i=proj.length-1;i>=0;i--){const p=proj[i];p.x+=p.dx*.6*k;p.z+=p.dz*.6*k;p.l-=k;p.m.position.set(p.x,1.8,p.z);let h=false;
  if(p.e){if(!me.dead&&Math.hypot(me.x-p.x,me.z-p.z)<1.6){dmg(me,p.d,p.dx*3,p.dz*3);h=true}}
  else for(const t of foes())if(Math.hypot(t.x-p.x,t.z-p.z)<1.8){sf=1;hit(t,p.d,p.dx*4,p.dz*4);sf=0;h=true;break}
  if(h||p.l<=0){scene.remove(p.m);proj.splice(i,1)}}
 for(let i=fxs.length-1;i>=0;i--){const e=fxs[i];e.l+=k;const s=1+e.l/18*e.r;e.m.scale.set(s,s,1);e.m.material.opacity=Math.max(0,1-e.l/18);if(e.l>=18){scene.remove(e.m);fxs.splice(i,1)}}
 place(me,k);bots.forEach(b=>place(b,k));rem.forEach(r=>place(r,k));
 if(ch){bt-=dt;if(bt<=0){bt=.1;ch.state({id:myId,n:pf.username,x:me.x,z:me.z,r:me.r,hp:me.dead?0:me.hp,mh:me.mhp,c:pf.char,w:pf.weapon,k:pf.skin||0,a:me.sw>.8?1:0})}
  ct-=dt;if(ct<=0){ct=1;$("arena").textContent=label+" - "+ch.count()+" online"}}
 cam.position.lerp(new THREE.Vector3(me.x+Math.sin(yaw)*11,7+me.y,me.z+Math.cos(yaw)*11),.15);cam.lookAt(me.x,2,me.z);
 $("hpB").style.width=Math.max(0,me.hp/me.mhp*100)+"%";$("hpT").textContent=Math.ceil(Math.max(0,me.hp))+" / "+me.mhp;$("stB").style.width=me.st+"%";$("ulB").style.width=me.ul+"%";
 for(let i=0;i<4;i++)$("sk"+i).textContent=(i+1)+" "+me.S.c.pw+" "+SK[i]+" "+(me.cd[i]>0?me.cd[i].toFixed(1):"OK");
 $("skQ").textContent="Q Dash "+(me.dc>0?me.dc.toFixed(1):"OK");$("skR").textContent="R Ultimate "+(me.ul>=100?"READY":Math.floor(me.ul)+"%");
 if(fT>0){fT-=dt;if(fT<=0)$("feed").textContent=""}
 ren.render(scene,cam);
}
addEventListener("keydown",e=>{if(!on)return;if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Tab"].indexOf(e.code)>=0)e.preventDefault();if(e.repeat)return;keys[e.code]=1;const c=e.code;
 if(c==="Digit1")skill(0);else if(c==="Digit2")skill(1);else if(c==="Digit3")skill(2);else if(c==="Digit4")skill(3);else if(c==="KeyR")ultra();else if(c==="KeyQ")dash();else if(c==="Space")jump()});
addEventListener("keyup",e=>{keys[e.code]=0});
addEventListener("blur",()=>{keys={};md=0});
addEventListener("mousedown",e=>{if(on&&e.target.tagName==="CANVAS"){md=1;if(!document.pointerLockElement&&!("ontouchstart"in window)&&e.target.requestPointerLock)e.target.requestPointerLock()}});
addEventListener("mouseup",()=>{md=0});
addEventListener("mousemove",e=>{if(on&&document.pointerLockElement)yaw-=e.movementX*.0035});
addEventListener("resize",()=>{if(ren){cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight)}});
const acts={m1:[()=>{md=1},()=>{md=0}],s0:[()=>skill(0)],s1:[()=>skill(1)],s2:[()=>skill(2)],s3:[()=>skill(3)],dash:[dash],ult:[ultra],jump:[jump],blk:[()=>{keys.KeyF=1},()=>{keys.KeyF=0}],spr:[()=>{keys.ShiftLeft=1},()=>{keys.ShiftLeft=0}]};
document.querySelectorAll(".tb").forEach(b=>{const a=acts[b.dataset.a];b.addEventListener("pointerdown",e=>{e.preventDefault();if(on)a[0]()});if(a[1]){b.addEventListener("pointerup",a[1]);b.addEventListener("pointerleave",a[1]);b.addEventListener("pointercancel",a[1])}});
const jy=$("joy"),kn=$("knob");
function mj(e){e.preventDefault();const r=jy.getBoundingClientRect(),t=e.touches[0];let x=t.clientX-r.left-r.width/2,z=t.clientY-r.top-r.height/2;const d=Math.hypot(x,z);if(d>45){x=x/d*45;z=z/d*45}kn.style.transform="translate("+x+"px,"+z+"px)";joy.x=x/45;joy.z=z/45}
function ej(){joy.x=joy.z=0;kn.style.transform="translate(0,0)"}
jy.addEventListener("touchstart",mj,{passive:false});jy.addEventListener("touchmove",mj,{passive:false});jy.addEventListener("touchend",ej);jy.addEventListener("touchcancel",ej);
return{start,stop,get active(){return on}};
})();
