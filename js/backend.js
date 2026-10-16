/* Backend adapter: local accounts (default) or Supabase (if config.js is filled in). Same API either way. */
(function(){
const C=window.PC_CONFIG||{},D=window.DATA;
const cloud=!!(window.supabase&&/^https?:/.test(C.SUPABASE_URL||"")&&C.SUPABASE_ANON_KEY&&!/PASTE/.test(C.SUPABASE_URL));
const sb=cloud?window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY):null;
const get=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
const set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const blank=(u,g)=>({username:u,guest:!!g,coins:500,wins:0,kills:0,xp:0,chars:[D.START],weapons:[0],char:D.START,weapon:0,skins:[0],skin:0,lv:{},role:"player",powers:{},on:{}});
const fix=p=>Object.assign(blank(p.username),p);
const bad=(u,p)=>!/^[a-z0-9_]{3,16}$/i.test(u)?"Username: 3-16 letters, numbers or _":(p.length<6?"Password must be 6+ characters":null);
const email=u=>u.toLowerCase()+"@polyclash-players.com";
async function sha(s){try{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("pc:"+s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("")}catch(e){let h=5381;for(const c of s)h=((h*33)^c.charCodeAt(0))>>>0;return"x"+h}}
async function cload(){
 const {data:{user}}=await sb.auth.getUser();if(!user)return null;
 const {data:r}=await sb.from("profiles").select("*").eq("id",user.id).single();if(!r)return null;
 const {data:ro}=await sb.from("admin_roles").select("role,powers").eq("user_id",user.id).maybeSingle();
 return fix(Object.assign({},r.data||{},{id:user.id,username:r.username,coins:r.coins,wins:r.wins,kills:r.kills,xp:r.xp,role:ro?(ro.role==="owner"?"mega":ro.role):"player",powers:ro?(ro.powers||{}):{}}));
}
const API={cloud,
async signUp(u,p){const e=bad(u,p);if(e)return{error:e};
 if(cloud){const {error}=await sb.rpc("pc_register",{p_username:u,p_password:p});if(error)return{error:error.message||"Could not create account"};return API.signIn(u,p)}
 const a=get("pc_acc")||{},k=u.toLowerCase();if(a[k])return{error:"Username taken on this device"};
 const pr=blank(u);if(u.toLowerCase()===String(C.LOCAL_MEGA_USERNAME||"").toLowerCase())pr.role="mega";
 a[k]={pw:await sha(p),p:pr};set("pc_acc",a);set("pc_sess",k);return{p:pr}},
async signIn(u,p){
 if(cloud){if(!u||!p)return{error:"Enter your username and password"};const {error}=await sb.auth.signInWithPassword({email:email(u),password:p});if(error)return{error:/invalid login|invalid_credentials/i.test(error.message+" "+(error.code||""))?"Wrong username or password":"Login failed: "+error.message};const pr=await cload();return pr?{p:pr}:{error:"Profile not found"}}
 const a=get("pc_acc")||{},k=u.toLowerCase();if(!a[k]||a[k].pw!==await sha(p))return{error:"Wrong username or password"};set("pc_sess",k);return{p:fix(a[k].p)}},
async session(){
 if(cloud){const {data:{session}}=await sb.auth.getSession();return session?cload():null}
 const k=get("pc_sess"),a=get("pc_acc")||{};return k&&a[k]?fix(a[k].p):null},
async signOut(){if(cloud)await sb.auth.signOut();try{localStorage.removeItem("pc_sess")}catch(e){}},
guest(){return Object.assign(fix(get("pc_guest")||blank("Guest"+Math.floor(1000+Math.random()*9000))),{guest:true,role:"player",powers:{}})},
async save(p){
 if(p.guest){set("pc_guest",p);return}
 if(cloud){await sb.from("profiles").update({coins:p.coins,wins:p.wins,kills:p.kills,xp:p.xp,data:{chars:p.chars,weapons:p.weapons,char:p.char,weapon:p.weapon,skins:p.skins,skin:p.skin,lv:p.lv,on:p.on}}).eq("id",p.id);return}
 const a=get("pc_acc")||{},k=p.username.toLowerCase();if(a[k]){a[k].p=p;set("pc_acc",a)}},
async board(cat){let rows;
 if(cloud){const {data}=await sb.from("profiles").select("username,coins,wins,kills,xp,data").order(cat==="coins"?"coins":cat==="kills"?"kills":"wins",{ascending:false}).limit(100);rows=(data||[]).map(r=>({username:r.username,coins:r.coins,wins:r.wins,kills:r.kills,xp:r.xp,n:((r.data&&r.data.chars)||[]).length}))}
 else rows=Object.values(get("pc_acc")||{}).map(a=>({username:a.p.username,coins:a.p.coins,wins:a.p.wins,kills:a.p.kills,xp:a.p.xp,n:a.p.chars.length}));
 const f={wins:r=>r.wins,kills:r=>r.kills,coins:r=>r.coins,collection:r=>r.n,level:r=>1+Math.floor(Math.sqrt(r.xp/100))};
 return rows.map(r=>({username:r.username,val:f[cat](r)})).sort((a,b)=>b.val-a.val).slice(0,20)},
async adminList(q){
 if(cloud){let r=sb.from("profiles").select("id,username,coins").order("created_at",{ascending:false}).limit(100);if(q)r=r.ilike("username","%"+q+"%");const {data}=await r;const {data:ro}=await sb.from("admin_roles").select("user_id,role,powers");const m={};(ro||[]).forEach(x=>m[x.user_id]=x);
  return(data||[]).map(x=>({username:x.username,coins:x.coins,role:m[x.id]?(m[x.id].role==="owner"?"mega":m[x.id].role):"player",powers:m[x.id]?(m[x.id].powers||{}):{}}))}
 return Object.values(get("pc_acc")||{}).map(a=>a.p).filter(p=>!q||p.username.toLowerCase().includes(q.toLowerCase())).map(p=>({username:p.username,coins:p.coins,role:p.role,powers:p.powers||{}}))},
async adminPatch(u,pt){
 if(cloud){const {data:r}=await sb.from("profiles").select("id,coins,data").eq("username",u).single();if(!r)return false;
  const up={},d=r.data||{};if(pt.addCoins)up.coins=r.coins+pt.addCoins;if(pt.unlockAll){d.chars=D.CH.map(c=>c.id);d.weapons=D.WP.map(w=>w.id);d.skins=D.SKINS.map((x,i)=>i);up.data=d}
  if(Object.keys(up).length)await sb.from("profiles").update(up).eq("id",r.id);
  if(pt.role==="player")await sb.from("admin_roles").delete().eq("user_id",r.id);
  else if(pt.role||pt.powers)await sb.from("admin_roles").upsert({user_id:r.id,role:pt.role||"admin",powers:pt.powers||{}});
  return true}
 const a=get("pc_acc")||{},x=a[u.toLowerCase()];if(!x)return false;const p=x.p;
 if(pt.addCoins)p.coins+=pt.addCoins;if(pt.unlockAll){p.chars=D.CH.map(c=>c.id);p.weapons=D.WP.map(w=>w.id);p.skins=D.SKINS.map((x,i)=>i)}
 if(pt.role)p.role=pt.role;if(pt.powers)p.powers=pt.powers;set("pc_acc",a);return true},
async config(){const d={announce:"",coinMult:1,bagMult:1,botHp:1};try{if(cloud){const {data}=await sb.from("game_config").select("value").eq("key","main").maybeSingle();return Object.assign(d,(data&&data.value)||{})}return Object.assign(d,get("pc_cfg")||{})}catch(e){return d}},
async setConfig(v){if(cloud){const {error}=await sb.from("game_config").upsert({key:"main",value:v});return !error}set("pc_cfg",v);return true},
join(room,me,on){if(!cloud)return null;
 const ch=sb.channel("pc:"+room,{config:{presence:{key:me.id},broadcast:{self:false}}});
 ch.on("broadcast",{event:"s"},p=>on.state(p.payload)).on("broadcast",{event:"h"},p=>on.hit(p.payload)).on("presence",{event:"leave"},x=>on.leave(x.key));
 ch.subscribe(st=>{if(st==="SUBSCRIBED")ch.track({id:me.id,name:me.name})});
 return{state:p=>ch.send({type:"broadcast",event:"s",payload:p}),hit:p=>ch.send({type:"broadcast",event:"h",payload:p}),count:()=>Object.keys(ch.presenceState()).length,close:()=>sb.removeChannel(ch)}}
};
window.Backend=API;
})();
