/* Menu previews: renders a picture of every fighter, weapon, skin and bag with one small offscreen
   renderer, lazily (only cards on screen), and caches the result. Also drives the live 3D fighter on the menu. */
(function(){
const T=()=>window.THREE,DT=()=>window.DATA;
let R=null,scene,cam,key,cache={},queue=[],busy=false,io=null;
const SIZE=176;
function setup(){if(R)return;R=new (T().WebGLRenderer)({antialias:true,alpha:true,preserveDrawingBuffer:true});R.setSize(SIZE,SIZE);R.setPixelRatio(1);R.toneMapping=T().ACESFilmicToneMapping;R.toneMappingExposure=1.25;
 scene=new (T().Scene)();cam=new (T().PerspectiveCamera)(28,1,.1,100);
 scene.add(new (T().HemisphereLight)(0xffffff,0x6a5a7a,.9));key=new (T().DirectionalLight)(0xfff1dc,1.1);key.position.set(4,8,8);scene.add(key);const rim=new (T().DirectionalLight)(0x88bbff,.7);rim.position.set(-6,4,-6);scene.add(rim)}
// ---- weapon models (one per weapon type) ----
const M=(c,o)=>new (T().MeshStandardMaterial)(Object.assign({color:c,roughness:.35,metalness:.55},o||{}));
function weapon(w){const g=new (T().Group)(),col=w.col,blade=M(0xd9dde3,{metalness:.85,roughness:.2}),edge=M(col,{emissive:w.rar>=4?col:0,emissiveIntensity:.35}),grip=M(0x3b2a1a,{metalness:.1,roughness:.8}),gold=M(0xd8ad3d);
 const B=(geo,m,x,y,z,rx,ry,rz)=>{const o=new (T().Mesh)(geo,m);o.position.set(x||0,y||0,z||0);o.rotation.set(rx||0,ry||0,rz||0);g.add(o);return o};
 const box=(a,b,c)=>new (T().BoxGeometry)(a,b,c),cyl=(a,b,h,s)=>new (T().CylinderGeometry)(a,b,h,s||10);
 const SECRET={50:5,51:3,52:4,53:0,54:6,55:1,56:7,57:3,58:6,59:0};
 const type=w.type!==undefined?w.type:(w.id>=50&&w.id<60?SECRET[w.id]:w.id%10);
 switch(type){
  case 0:B(box(.32,2.6,.06),blade,0,1.5,0);B(box(.36,.3,.08),edge,0,2.85,0,0,0,.78);B(box(1,.14,.2),gold,0,.2,0);B(cyl(.08,.08,.7),grip,0,-.25,0);B(new (T().SphereGeometry)(.12),gold,0,-.65,0);B(box(.06,2.4,.07),edge,0,1.4,0);break;// sword
  case 1:B(cyl(.07,.07,3),grip,0,.6,0);B(box(1,.9,.08),blade,.45,1.8,0);B(box(.12,.9,.1),edge,.95,1.8,0);break;// axe
  case 2:B(cyl(.06,.06,3.6),grip,0,.6,0);B(new (T().ConeGeometry)(.2,.9,4),blade,0,2.85,0);B(box(.3,.1,.1),edge,0,2.35,0);break;// spear
  case 3:B(cyl(.08,.08,2.6),grip,0,.4,0);B(box(1.1,.7,.7),M(0x8a8f99),0,1.8,0);B(box(1.14,.16,.74),edge,0,1.8,0);B(box(.2,.74,.74),gold,0,1.8,0);break;// hammer
  case 4:B(box(.22,1.1,.05),blade,0,.85,0);B(new (T().ConeGeometry)(.11,.3,4),blade,0,1.55,0);B(box(.5,.1,.14),edge,0,.28,0);B(cyl(.06,.06,.5),grip,0,0,0);break;// dagger
  case 5:{B(cyl(.06,.06,3.4),grip,0,.6,0);const s=B(new (T().TorusGeometry)(.9,.07,6,20,Math.PI*.7),blade,-.6,2.2,0);s.rotation.z=.4;B(box(.2,.2,.2),edge,0,2.3,0);break}// scythe
  case 6:{for(let i=0;i<8;i++)B(box(.18,.36,.05),blade,Math.sin(i*.09)*.25,.9+i*.32,0,0,0,-i*.03);B(box(.5,.08,.5),gold,0,.65,0);B(cyl(.07,.07,.9),M(0x111111,{metalness:.1}),0,.15,0);B(box(.04,2.5,.06),edge,.08,2,0);break}// katana
  case 7:B(box(.9,.7,.8),M(col),0,.6,0);for(let i=0;i<4;i++)B(box(.18,.22,.2),gold,-.3+i*.2,.95,.35);B(cyl(.42,.42,.5),M(0x333333),0,0,0);break;// gauntlets
  case 8:B(cyl(.07,.08,3.6),grip,0,.6,0);B(new (T().OctahedronGeometry)(.35),M(col,{emissive:col,emissiveIntensity:.6}),0,2.65,0);B(new (T().TorusGeometry)(.35,.05,6,16),gold,0,2.65,0);break;// staff
  default:{for(let i=0;i<14;i++)B(new (T().SphereGeometry)(.07,6,4),edge,Math.sin(i*.6)*.5,.4+i*.18,Math.cos(i*.6)*.2);B(cyl(.07,.07,.6),grip,0,0,0)}// whip
 }
 g.rotation.z=-.65;g.position.y=-.4;return g}
function bag(i){const g=new (T().Group)(),cols=[0x9aa5b1,0x4cd964,0x3498db,0xa55eea,0xf7b731,0xff2d55],c=cols[i%6];
 const body=new (T().Mesh)(new (T().SphereGeometry)(1,24,16),M(c,{metalness:.2,roughness:.55}));body.scale.set(1,.9,.85);g.add(body);
 const neck=new (T().Mesh)(new (T().CylinderGeometry)(.35,.55,.5,16),M(c,{metalness:.2,roughness:.6}));neck.position.y=.95;g.add(neck);
 const tie=new (T().Mesh)(new (T().TorusGeometry)(.4,.08,8,20),M(0xd8ad3d));tie.rotation.x=Math.PI/2;tie.position.y=.85;g.add(tie);
 const star=new (T().Mesh)(new (T().OctahedronGeometry)(.32),M(0xffffff,{emissive:c,emissiveIntensity:.5}));star.position.set(0,0,.85);g.add(star);return g}
function render(kind,id,extra){setup();
 // clear previous subject
 for(let i=scene.children.length-1;i>=0;i--){const o=scene.children[i];if(o.userData.subj)scene.remove(o)}
 let subj,cy=0,dist=6;
 if(kind==="c"||kind==="s"){const d=DT(),c=d.CH[id]||d.CH[0],col=kind==="s"?(d.SKINS[extra]&&d.SKINS[extra][1]!=null?d.SKINS[extra][1]:c.col):c.col;
  const look=Rig.lookFor(id,col);const rig=Rig.build(look,0xffd54a);const f={rig,look,ph:0,anState:"idle",vy:0,vx:0,vz:0};for(let s=0;s<12;s++)Rig.update(f,.016,s*.016);subj=rig.g;subj.rotation.y=.45;
  if(kind==="c"){cy=4.6;dist=7.2}else{cy=3;dist=12.5}}
 else if(kind==="w"){subj=weapon(DT().WP[id]||DT().WP[0]);cy=1.2;dist=7.5}
 else if(kind==="b"){subj=bag(id);cy=.1;dist=6}
 subj.userData.subj=1;scene.add(subj);cam.position.set(0,cy+.6,dist);cam.lookAt(0,cy,0);R.render(scene,cam);return R.domElement.toDataURL("image/png")}
function pump(){if(busy)return;busy=true;const step=()=>{const job=queue.shift();if(!job){busy=false;return}
 if(!cache[job.k]){try{cache[job.k]=render(job.kind,job.id,job.x)}catch(e){cache[job.k]=""}}
 document.querySelectorAll('img[data-th="'+job.k+'"]').forEach(im=>{if(cache[job.k])im.src=cache[job.k];im.classList.add("ok")});requestAnimationFrame(step)};requestAnimationFrame(step)}
function want(k){if(cache[k]!==undefined){document.querySelectorAll('img[data-th="'+k+'"]').forEach(im=>{if(cache[k])im.src=cache[k];im.classList.add("ok")});return}const [kind,id,x]=k.split(":");if(!queue.some(j=>j.k===k))queue.push({k,kind,id:+id,x:x!==undefined?+x:undefined});pump()}
// call after inserting <img data-th="kind:id[:extra]"> elements
function scan(root){if(!window.THREE||!window.Rig)return;const imgs=(root||document).querySelectorAll("img[data-th]:not(.ok)");
 if(!("IntersectionObserver" in window)){imgs.forEach(im=>want(im.dataset.th));return}
 if(!io)io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);want(e.target.dataset.th)}}),{rootMargin:"200px"});
 imgs.forEach(im=>io.observe(im))}
const img=(k,cls)=>'<img class="th '+(cls||"")+'" data-th="'+k+'" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">';
// ---- live rotating fighter on the main menu ----
let H=null;
function hero(canvas,p){if(!window.THREE||!canvas)return;if(!H){const r=new (T().WebGLRenderer)({canvas,antialias:true,alpha:true});r.toneMapping=T().ACESFilmicToneMapping;r.toneMappingExposure=1.25;r.shadowMap.enabled=true;
  const sc=new (T().Scene)(),c=new (T().PerspectiveCamera)(30,1,.1,100);sc.add(new (T().HemisphereLight)(0xffffff,0x6a5a7a,.9));const l=new (T().DirectionalLight)(0xfff1dc,1.1);l.position.set(4,9,7);l.castShadow=true;sc.add(l);const rim=new (T().DirectionalLight)(0xb48cff,.9);rim.position.set(-6,5,-5);sc.add(rim);
  const disk=new (T().Mesh)(new (T().CylinderGeometry)(2.6,2.8,.25,40),new (T().MeshStandardMaterial)({color:0x2b2350,roughness:.4,metalness:.3}));disk.position.y=-.13;disk.receiveShadow=true;sc.add(disk);
  const ring=new (T().Mesh)(new (T().TorusGeometry)(2.7,.05,8,60),new (T().MeshStandardMaterial)({color:0xffd54a,emissive:0xffd54a,emissiveIntensity:.8}));ring.rotation.x=Math.PI/2;sc.add(ring);
  H={r,sc,c,f:null,key:"",t:0,raf:0}}
 const d=DT(),c=d.CH[p.char]||d.CH[0],sk=d.SKINS[p.skin||0],col=sk&&sk[1]!=null?sk[1]:c.col,k=p.char+"_"+col;
 if(H.key!==k){if(H.f)H.sc.remove(H.f.rig.g);const look=Rig.lookFor(p.char,col);const rig=Rig.build(look,(d.WP[p.weapon]||d.WP[0]).col);rig.g.traverse(m=>{if(m.isMesh&&!m.userData.ol)m.castShadow=true});H.sc.add(rig.g);H.f={rig,look,ph:0,anState:"idle",vy:0,vx:0,vz:0};H.key=k}
 const loop=()=>{if(!canvas.isConnected||canvas.offsetParent===null){H.raf=0;return}const w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==w*Math.min(2,devicePixelRatio)){H.r.setPixelRatio(Math.min(2,devicePixelRatio));H.r.setSize(w,h,false);H.c.aspect=w/h;H.c.updateProjectionMatrix()}
  H.t+=.016;H.f.rig.g.rotation.y=Math.sin(H.t*.6)*.6+.3;Rig.update(H.f,.016,H.t);H.c.position.set(0,4.2,13.5);H.c.lookAt(0,2.9,0);H.r.render(H.sc,H.c);H.raf=requestAnimationFrame(loop)};
 if(!H.raf)H.raf=requestAnimationFrame(loop)}
window.Thumbs={scan,img,want,hero,render};
})();
