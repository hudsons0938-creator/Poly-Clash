/* UI controller: accounts, menus, shop, locker, leaderboard, admin. */
window.App=(function(){
const $=id=>document.getElementById(id),DT=window.DATA,B=window.Backend;
let P=null,tab="c",sel=null,svT=0,CFG={announce:"",coinMult:1,bagMult:1,botHp:1};
const esc=s=>String(s).replace(/[&<>"']/g,c=>"&#"+c.charCodeAt(0)+";");
const hex=n=>"#"+n.toString(16).padStart(6,"0");
const lvOf=p=>1+Math.floor(Math.sqrt(p.xp/100));
const pw=k=>!!P&&((P.role==="mega"||!!(P.powers&&P.powers[k]))&&!!(P.on&&P.on[k])||!!(P.gpowers&&P.gpowers[k]&&!(P.on&&P.on[k]===false)));
const staff=()=>!!P&&P.role!=="player"&&!P.guest;
const insane=()=>!!P&&P.role==="mega"&&!!(P.on&&P.on.insane);
const PWS=[["god","God Mode (hits deal 100)"],["inf","No dash/evasive cooldown"],["speed","Speed boost"],["coins","Give self coins"],["unlock","Unlock everything (self)"],["give","Give coins & items to players"],["mod","Ban & timeout players"],["grant","Grant exclusives, titles & timed powers"]];
function toast(t){const e=$("toast");e.textContent=t;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),2800)}
function mega(){if(P&&P.role==='mega'){P.chars=DT.CH.map(c=>c.id);P.weapons=DT.WP.map(w=>w.id);P.skins=DT.SKINS.map((x,i)=>i)}}
function save(){return B.save(P)}
function hdr(){if(!P)return;$("who").textContent=P.username+(P.role!=="player"?" ["+P.role.toUpperCase()+"]":"")+(P.guest?" (guest)":"");$("coins").textContent=P.coins+" coins";
 $("stats").innerHTML=(P.title?'<span class="ttl">« '+esc(P.title)+' »</span>':"")+"Level "+lvOf(P)+" &nbsp;·&nbsp; "+P.wins+" wins &nbsp;·&nbsp; "+P.kills+" bot KOs &nbsp;·&nbsp; "+ownC().filter(i=>!(DT.CH[i]&&DT.CH[i].ex)).length+"/"+DT.NORMAL_CH+" fighters";
 const fc=DT.CH[P.char]||DT.CH[0];$("heroName").textContent=fc.name;$("heroSub").textContent=DT.RAR[fc.rar][0]+" · "+(P.xKit||fc.pw)+" power";$("heroName").style.color=hex(DT.RAR[fc.rar][1]);
 if($("menuScreen").classList.contains("on")&&window.Thumbs)Thumbs.hero($("heroCv"),P);
 $("adminBtn").classList.toggle("hide",!staff())}
function reward(r){P.coins+=Math.round((r.coins||0)*CFG.coinMult);P.xp+=r.xp||0;P.kills+=r.kills||0;P.wins+=r.wins||0;hdr();clearTimeout(svT);svT=setTimeout(save,800)}
function go(id){if(id!=="homeScreen"&&id!=="menuScreen"){try{history.pushState({s:id},"")}catch(e){}}if(window.Game&&Game.active){Game.stop();if(P)save()}if(!P&&id!=="homeScreen")id="homeScreen";document.querySelectorAll(".screen").forEach(s=>s.classList.remove("on"));$(id).classList.add("on");
 if(P)hdr();if(id==="menuScreen"&&P&&window.Thumbs)setTimeout(()=>Thumbs.hero($("heroCv"),P),30);if(id==="lockerScreen")locker();if(id==="shopScreen")shop();if(id==="boardScreen")board("wins");if(id==="adminScreen"){$("adminScreen").classList.remove("overlay");admOverlay=false;admin()}if(id==="guideScreen")guide()}
let busy=false;
async function login(fn){if(busy)return;busy=true;const u=$("uIn").value.trim(),p=$("pIn").value;$("authMsg").textContent="Please wait...";let r;try{r=await fn.call(B,u,p)}catch(e){r={error:"Connection problem - try again"}}finally{busy=false}if(r.error){$("authMsg").textContent=r.error;return}P=r.p;mega();$("authMsg").textContent="";go("menuScreen")}
function roll(bag){const w=bag.w,t=w.reduce((a,b)=>a+b,0);let r=Math.random()*t,ri=0;for(;ri<w.length-1;ri++){r-=w[ri];if(r<=0)break}
 const isW=Math.random()<.25,pool=(isW?DT.WP:DT.CH).filter(x=>x.rar===ri);return{w:isW,x:pool[Math.floor(Math.random()*pool.length)]}}
function shop(){
 $("bagGrid").innerHTML=DT.BAGS.map((b,i)=>'<button class="bag" data-i="'+i+'">'+Thumbs.img("b:"+i,"bagi")+'<b>'+b.n+'</b><small>'+Math.round(b.c*CFG.bagMult)+' coins</small></button>').join("");Thumbs.scan($("bagGrid"));
 document.querySelectorAll("#bagGrid .bag").forEach(el=>el.onclick=()=>{const b=DT.BAGS[+el.dataset.i],cost=Math.round(b.c*CFG.bagMult);
  if(P.coins<cost){toast("Not enough coins");return}
  P.coins-=cost;const r=roll(b),list=r.w?P.weapons:P.chars;let t=r.x.name+" ("+DT.RAR[r.x.rar][0]+(r.w?" weapon":"")+")";let dup=false;
  if(list.indexOf(r.x.id)>=0){const back=Math.floor(cost*.3);P.coins+=back;t+=" - DUPLICATE +"+back;dup=true}else{list.push(r.x.id);t+=" - NEW!"}
  const col=hex(DT.RAR[r.x.rar][1]);$("shopRes").innerHTML='<div class="pull" style="--rc:'+col+'">'+Thumbs.img((r.w?"w:":"c:")+r.x.id,"pullimg")+'<div><b style="color:'+col+'">'+esc(r.x.name)+'</b><small>'+DT.RAR[r.x.rar][0]+(r.w?" weapon":" fighter")+(dup?" · duplicate":" · NEW!")+'</small></div></div>';Thumbs.scan($("shopRes"));
  $("shopRes").classList.remove("pop");void $("shopRes").offsetWidth;$("shopRes").classList.add("pop");hdr();save()});
}
const ownC=()=>{const a=P.chars.slice();(P.xChars||[]).forEach(i=>{if(a.indexOf(i)<0)a.push(i)});return a};
const ownW=()=>{const a=P.weapons.slice();(P.xWeapons||[]).forEach(i=>{if(a.indexOf(i)<0)a.push(i)});return a};
function locker(){
 const mg=P.role==="mega",oc=ownC(),ow=ownW();
 const nx=oc.filter(i=>DT.CH[i]&&DT.CH[i].ex).length,wx=ow.filter(i=>DT.WP[i]&&DT.WP[i].ex).length;$("lockInfo").textContent="Fighters "+(oc.length-nx)+"/"+DT.NORMAL_CH+(nx?" (+"+nx+" exclusive)":"")+"  |  Weapons "+(ow.length-wx)+"/"+DT.NORMAL_WP+(wx?" (+"+wx+" exclusive)":"")+"  |  Skins "+P.skins.length+"/"+DT.SKINS.length+(P.xKit?"  |  Granted power: "+P.xKit:"");
 ["tabC","tabW","tabS"].forEach((id,i)=>$(id).classList.toggle("on",tab==="cws"[i]));
 let h="";
 if(tab==="s")h=DT.SKINS.map((k,i)=>{const own=mg||P.skins.indexOf(i)>=0;return'<div class="card2'+(P.skin===i?" sel":"")+(own?"":" lock")+'" data-i="'+i+'" style="--rc:'+(k[1]===null?"#9aa5b1":hex(k[1]))+'">'+Thumbs.img("s:"+P.char+":"+i)+'<b>'+k[0]+'</b><small>'+(own?(P.skin===i?"Equipped":"Owned"):"1000 coins")+'</small></div>'}).join("");
 else{const isC=tab==="c",list=isC?oc:ow,src=isC?DT.CH:DT.WP,cur=isC?P.char:P.weapon;
  h=list.slice().filter(id=>src[id]).sort((a,b)=>src[b].rar-src[a].rar).map(id=>{const x=src[id],rc=hex(DT.RAR[x.rar][1]);return'<div class="card2'+(id===cur?" sel":"")+(x.ex?" ex":"")+'" data-i="'+id+'" style="--rc:'+rc+'">'+Thumbs.img((isC?"c:":"w:")+id)+'<b>'+esc(x.name)+'</b><small class="rar">'+DT.RAR[x.rar][0]+(isC?" · "+x.pw:" · dmg "+x.dmg.toFixed(1))+'</small>'+(isC?'<small>Lv '+(P.lv[id]||1)+' · '+(window.Rig?Rig.STYLE_NAMES[Rig.STYLE[x.arch!==undefined?x.arch:Math.floor(id/20)%20]]:"")+'</small>':'<small>range '+x.rng+(x.ls?' · lifesteal':'')+'</small>')+(id===cur?'<i class="eq">EQUIPPED</i>':'')+'</div>'}).join("")}
 $("lockGrid").innerHTML=h;Thumbs.scan($("lockGrid"));
 document.querySelectorAll(".card2").forEach(el=>el.onclick=()=>{const i=+el.dataset.i;
  if(tab==="s"){if(!(mg||P.skins.indexOf(i)>=0)){if(P.coins<1000){toast("Not enough coins");return}if(!confirm("Buy this skin for 1000 coins?"))return;P.coins-=1000;P.skins.push(i);hdr()}P.skin=i}
  else if(tab==="c")P.char=i;else P.weapon=i;
  save();locker();hdr()});
 $("upBtn").classList.toggle("hide",tab!=="c");$("upBtn").textContent="UPGRADE "+((DT.CH[P.char]||{}).name||"")+" - "+150*(P.lv[P.char]||1)+" COINS";
}
function guide(){const st=(window.Rig&&Rig.STYLE_NAMES)||[];$("guideList").innerHTML='<div><b>COMBAT</b><br>Click/J: 4-hit punch combo. Hits 1-3 stun, hit 4 knocks back.<br>Hold Space on hit 4: <b>uppercut</b> (launch). Hit 4 in the air: <b>downslam</b>.<br>Q dash, then click: <b>dash punch</b>. Q while stunned or knocked down: <b>evasive</b> (20s cooldown).<br>Hold F to block. Tap F right before a hit to <b>parry</b>. Hit 4 and heavy moves break guard.<br>E near a trash can, bench, crate, cone, hydrant or barrier: pick it up, E/click to throw.<br>Deal and take damage to fill <b>Awakening</b>. G to awaken (stronger, faster, glowing), then R for your finisher.<br>Smash enemies into walls, cars, lamps and benches to break them.</div><div><b>AIR COMBAT</b><br>Launch someone (uppercut or a launch move), then press <b>Jump</b> during the flash to <b>extend</b>: you dash up after them.<br>In the air you get <b>3 hits</b> that keep you both floating, then click again to <b>slam</b> them into the ground.<br>Someone who was just launched can&#39;t be launched again for 3 seconds, so you can&#39;t loop forever.<br>Jump into a wall while in the air, then press Jump again to <b>wall jump</b> (up to 3 in a row).</div><div><b>TRAINING</b><br>Grind Arena and My Arena have a training panel: pick a bot level, spawn bots, and toggle auto-spawn. Hosts of private parties can spawn bots for everyone.</div><div><b>FIGHTING STYLES</b><br>Your fighter&#39;s name sets the look and style: '+st.join(", ")+'.</div>'+DT.POWERS.map(p=>'<div><b style="color:'+hex(p.col)+'">'+p.n+'</b> - '+p.d+'</div>').join("")}
async function board(cat){
 $("boardTabs").innerHTML=[["wins","Wins"],["kills","Bot Kills"],["coins","Coins"],["collection","Collection"],["level","Level"]].map(c=>'<button class="btn" data-c="'+c[0]+'">'+c[1]+'</button>').join("");
 document.querySelectorAll("#boardTabs .btn").forEach(b=>b.onclick=()=>board(b.dataset.c));
 $("boardList").textContent="Loading...";const rows=await B.board(cat);
 $("boardList").innerHTML=rows.length?rows.map((r,i)=>"<div>#"+(i+1)+" <b>"+esc(r.username)+"</b> - "+r.val+"</div>").join(""):"<div>No players yet</div>";
}
let admOverlay=false,insp=null;
function openAdmin(over){admOverlay=!!over;const sc=$("adminScreen");if(over){sc.classList.add("on","overlay")}else{sc.classList.remove("overlay");go("adminScreen");return}admin()}
function closeAdmin(){const sc=$("adminScreen");if(admOverlay){sc.classList.remove("on","overlay");admOverlay=false}else go("menuScreen")}
function admTab(t){document.querySelectorAll(".admTabs button").forEach(b=>b.classList.toggle("on",b.dataset.at===t));document.querySelectorAll(".atab").forEach(x=>x.classList.toggle("on",x.id==="at_"+t));if(t==="log")loadLog();if(t==="pl"&&!$("plist").innerHTML)megaList()}
function admin(){
 const mega=P.role==="mega",can=k=>mega||(P.powers&&P.powers[k]);
 $("pwBox").innerHTML=PWS.filter(p=>["god","inf","speed"].indexOf(p[0])>=0&&can(p[0])).map(p=>'<div class="row pwr"><span>'+p[1]+'</span><button class="tg'+(P.on&&P.on[p[0]]?" act":"")+'" data-k="'+p[0]+'">'+(P.on&&P.on[p[0]]?"ON":"OFF")+'</button></div>').join("");
 document.querySelectorAll("#pwBox .tg").forEach(b=>b.onclick=()=>{P.on=P.on||{};P.on[b.dataset.k]=!P.on[b.dataset.k];save();admin()});
 $("insaneBox").classList.toggle("hide",!mega);$("insaneTg").textContent=insane()?"ON":"OFF";$("insaneTg").classList.toggle("act",insane());
 $("selfCoin").classList.toggle("hide",!can("coins"));$("selfUnlock").classList.toggle("hide",!can("unlock"));
 $("liveTab").classList.toggle("hide",!mega);
 if(mega){$("cfgNews").value=CFG.announce||"";$("cfgCoin").value=CFG.coinMult;$("cfgBag").value=CFG.bagMult;$("cfgBot").value=CFG.botHp}
}
async function megaList(){
 $("plist").innerHTML='<div class="mu">Loading...</div>';let l=[];try{l=await B.aFind($("psearch").value.trim())}catch(e){$("plist").innerHTML='<div class="mu">'+esc(e.message)+'</div>';return}
 $("plist").innerHTML=l.map(p=>'<div class="pl" data-id="'+esc(p.id)+'"><b>'+esc(p.username)+'</b>'+(p.role!=="player"?' <i class="tagx">'+(p.role==="owner"?"MEGA":"ADMIN")+'</i>':'')+(p.banned?' <i class="tagx ban">BANNED</i>':'')+'<span>'+p.coins+' coins</span></div>').join("")||'<div class="mu">No players found</div>';
 document.querySelectorAll(".pl").forEach(e=>e.onclick=()=>inspect(e.dataset.id));
}
const DUR=[["Permanent",0],["10 minutes",10],["1 hour",60],["1 day",1440],["7 days",10080],["30 days",43200]];
const durSel=id=>'<select id="'+id+'">'+DUR.map(d=>'<option value="'+d[1]+'">'+d[0]+'</option>').join("")+'</select>';
const left=u=>{if(!u)return"permanent";const m=Math.max(0,Math.round((new Date(u)-new Date())/60000));return m>=1440?Math.round(m/1440)+"d left":m>=60?Math.round(m/60)+"h left":m+"m left"};
function grantName(g){if(g.kind==="char")return(DT.CH[+g.item]||{}).name||g.item;if(g.kind==="weapon")return(DT.WP[+g.item]||{}).name||g.item;if(g.kind==="power"){const x=DT.XPOWERS.find(p=>p[0]===g.item);return x?x[1]:g.item}return g.item}
async function inspect(id){
 const box=$("insp");box.innerHTML='<div class="mu">Loading...</div>';let d;try{d=await B.aInspect(id)}catch(e){box.innerHTML='<div class="mu">'+esc(e.message)+'</div>';return}
 if(!d){box.innerHTML='<div class="mu">Not found</div>';return}insp=d;
 const mega=P.role==="mega",can=k=>mega||(P.powers&&P.powers[k]),isOwner=d.role==="owner",self=d.username===P.username,dd=d.data||{};
 const lvl=1+Math.floor(Math.sqrt((d.xp||0)/100));
 const chars=(dd.chars||[]).length,weps=(dd.weapons||[]).length,skins=(dd.skins||[]).length;
 let h='<div class="insp"><div class="ihead"><b>'+esc(d.username)+'</b> <i class="tagx">'+(isOwner?"MEGA ADMIN":d.role.toUpperCase())+'</i>'+(d.ban?' <i class="tagx ban">'+(d.ban.until?"TIMED OUT":"BANNED")+'</i>':'')+'</div>';
 h+='<div class="istats"><span>'+d.coins+' coins</span><span>Lv '+lvl+'</span><span>'+d.wins+' wins</span><span>'+d.kills+' bot KOs</span><span>'+chars+' fighters</span><span>'+weps+' weapons</span><span>'+skins+' skins</span></div>';
 if(d.ban)h+='<div class="warn">'+(d.ban.until?"Timed out until "+new Date(d.ban.until).toLocaleString():"Permanently banned")+(d.ban.reason?" - "+esc(d.ban.reason):"")+'</div>';
 if(isOwner&&!self)h+='<div class="mu">The Mega Admin account cannot be changed.</div>';
 else{
  if(can("give")||(self&&can("coins"))){h+='<h4>COINS</h4><div class="row"><input id="iAmt" type="number" value="1000"><button class="btn gold" data-a="cAdd">ADD</button><button class="btn red" data-a="cSub">REMOVE</button></div><div class="row q"><button class="btn sm" data-a="q1">+1K</button><button class="btn sm" data-a="q10">+10K</button><button class="btn sm" data-a="q100">+100K</button><button class="btn sm" data-a="q0">SET TO 0</button></div>'}
  if(can("give")||(self&&can("unlock"))){h+='<h4>INVENTORY</h4><div class="row"><select id="iKind"><option value="chars">Fighter</option><option value="weapons">Weapon</option><option value="skins">Skin</option></select><input id="iItem" list="iList" placeholder="Type a name"><datalist id="iList"></datalist></div><div class="row"><button class="btn gold" data-a="iAdd">GIVE ITEM</button><button class="btn red" data-a="iDel">TAKE ITEM</button></div><div class="row q"><button class="btn sm" data-a="unlock">UNLOCK ALL</button><button class="btn sm" data-a="maxup">MAX UPGRADES</button><button class="btn sm red" data-a="reset">RESET TO STARTER</button></div>'}
  if(can("grant")){h+='<h4>EXCLUSIVES, POWERS &amp; TITLES</h4><p class="tiny">These never make anyone an admin. Timed grants remove themselves.</p><div class="row"><select id="gKind"><option value="char">Exclusive fighter</option><option value="weapon">Exclusive weapon</option><option value="kit">Exclusive power kit</option><option value="power">Power (God, speed...)</option><option value="title">Title</option></select><select id="gItem"></select><input id="gTitle" class="hide" placeholder="Custom title (optional)" maxlength="24"></div><div class="row">'+durSel("gDur")+'<button class="btn gold" data-a="grant">GRANT</button></div>';
   h+='<div class="glist">'+((d.grants||[]).map(g=>'<div class="gi"><span><b>'+esc(grantName(g))+'</b> <small>'+g.kind+' · '+left(g.until)+'</small></span><button class="btn sm red" data-rv="'+g.id+'">REVOKE</button></div>').join("")||'<div class="mu">No active grants</div>')+'</div>'}
  if(can("mod")&&!self){h+='<h4>MODERATION</h4><div class="row"><input id="bWhy" placeholder="Reason" maxlength="80">'+durSel("bDur").replace('<option value="0">Permanent</option>','').replace('</select>','<option value="0">Permanent ban</option></select>')+'</div><div class="row"><button class="btn red" data-a="ban">TIMEOUT / BAN</button>'+(d.ban?'<button class="btn gold" data-a="unban">UNBAN</button>':'')+'</div>'}
  if(mega&&!self){h+='<h4>ADMIN ROLE</h4><div class="pwl">'+PWS.map(p=>'<label><input type="checkbox" data-k="'+p[0]+'"'+(d.powers&&d.powers[p[0]]?" checked":"")+'> '+p[1]+'</label>').join("")+'</div><div class="row"><button class="btn red" data-a="role">'+(d.role==="admin"?"REMOVE ADMIN":"MAKE ADMIN")+'</button>'+(d.role==="admin"?'<button class="btn" data-a="pw">SAVE POWERS</button>':'')+'</div>'}
 }
 box.innerHTML=h+'</div>';
 const fill=()=>{const k=$("iKind");if(!k)return;const src=k.value==="chars"?DT.CH.filter(c=>!c.ex):k.value==="weapons"?DT.WP.filter(w=>!w.ex):DT.SKINS.map((s,i)=>({id:i,name:s[0]}));$("iList").innerHTML=src.map(x=>'<option value="'+esc(x.name)+'">').join("")};
 if($("iKind")){$("iKind").onchange=fill;fill()}
 const gfill=()=>{const k=$("gKind");if(!k)return;let o=[];if(k.value==="char")o=DT.CH.filter(c=>c.ex).map(c=>[c.id,c.name]);else if(k.value==="weapon")o=DT.WP.filter(w=>w.ex).map(w=>[w.id,w.name]);else if(k.value==="kit")o=window.KITS.slice(10).map(x=>[x.n,x.n+" kit"]);else if(k.value==="power")o=DT.XPOWERS;else o=DT.TITLES.map(t=>[t,t]);
  $("gItem").innerHTML=o.map(x=>'<option value="'+esc(x[0])+'">'+esc(x[1])+'</option>').join("");$("gTitle").classList.toggle("hide",k.value!=="title")};
 if($("gKind")){$("gKind").onchange=gfill;gfill()}
 box.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>act(b.dataset.a));
 box.querySelectorAll("[data-rv]").forEach(b=>b.onclick=()=>run("Revoke this grant?",()=>B.aRevoke(insp.id,+b.dataset.rv),"Revoked"));
}
async function run(q,fn,ok){if(q&&!confirm(q))return;try{await fn();toast(ok||"Done");B.localLog&&B.localLog({admin_name:P.username,target_name:insp.username,action:ok||"change"})}catch(e){toast(e.message||"Failed");return}
 if(insp.username===P.username){const fresh=await B.session();if(fresh){P=fresh;mega();hdr()}}
 inspect(insp.id);megaList()}
function findItem(kind,name){const n=String(name||"").trim().toLowerCase();if(kind==="skins"){const i=DT.SKINS.findIndex(s=>s[0].toLowerCase()===n);return i}const src=kind==="chars"?DT.CH:DT.WP;const x=src.find(i=>!i.ex&&i.name.toLowerCase()===n);return x?x.id:-1}
function act(a){const d=insp,dd=d.data||{},amt=()=>Math.round(Number(($("iAmt")||{}).value)||0);
 const list=k=>(dd[k]&&dd[k].slice())||(k==="chars"?[DT.START]:k==="weapons"?[0]:[0]);
 if(a==="cAdd")return run("Give "+amt()+" coins to "+d.username+"?",()=>B.aCoins(d.id,amt()),"Coins added");
 if(a==="cSub")return run("Remove "+amt()+" coins from "+d.username+"?",()=>B.aCoins(d.id,-amt()),"Coins removed");
 if(a==="q1"||a==="q10"||a==="q100"){const v={q1:1000,q10:10000,q100:100000}[a];return run(null,()=>B.aCoins(d.id,v),"+"+v+" coins")}
 if(a==="q0")return run("Set "+d.username+"'s coins to 0?",()=>B.aCoins(d.id,-d.coins),"Coins reset");
 if(a==="iAdd"||a==="iDel"){const k=$("iKind").value,id=findItem(k,$("iItem").value);if(id<0){toast("Pick an item from the list");return}const l=list(k);
  if(a==="iAdd"){if(l.indexOf(id)>=0){toast("They already own it");return}l.push(id)}else{const i=l.indexOf(id);if(i<0){toast("They don't own it");return}l.splice(i,1)}
  return run(a==="iDel"?"Take "+$("iItem").value+" from "+d.username+"?":null,()=>B.aSetData(d.id,k,l),a==="iAdd"?"Item given":"Item taken")}
 if(a==="unlock")return run("Unlock every normal fighter, weapon and skin for "+d.username+"?",async()=>{await B.aSetData(d.id,"chars",DT.CH.filter(c=>!c.ex).map(c=>c.id));await B.aSetData(d.id,"weapons",DT.WP.filter(w=>!w.ex).map(w=>w.id));await B.aSetData(d.id,"skins",DT.SKINS.map((s,i)=>i))},"Everything unlocked");
 if(a==="maxup")return run("Max out upgrades on all of "+d.username+"'s fighters?",()=>{const lv={};list("chars").forEach(i=>lv[i]=20);return B.aSetData(d.id,"lv",lv)},"Upgrades maxed");
 if(a==="reset")return run("Reset "+d.username+" to the starter fighter and weapon? This removes everything else they own.",async()=>{await B.aSetData(d.id,"chars",[DT.START]);await B.aSetData(d.id,"weapons",[0]);await B.aSetData(d.id,"skins",[0]);await B.aSetData(d.id,"lv",{})},"Inventory reset");
 if(a==="grant"){const k=$("gKind").value,it=k==="title"&&$("gTitle").value.trim()?$("gTitle").value.trim():$("gItem").value,m=+$("gDur").value;return run("Grant "+(k==="title"?'the title "'+it+'"':grantName({kind:k,item:it}))+" to "+d.username+(m?" for "+DUR.find(x=>x[1]===m)[0]:" permanently")+"?",()=>B.aGrant(d.id,k,it,m),"Granted")}
 if(a==="ban"){const m=+$("bDur").value,why=$("bWhy").value.trim();return run((m?"Time out ":"PERMANENTLY BAN ")+d.username+(m?" for "+DUR.find(x=>x[1]===m)[0]:"")+"?",()=>B.aBan(d.id,m,why),m?"Timed out":"Banned")}
 if(a==="unban")return run("Unban "+d.username+"?",()=>B.aUnban(d.id),"Unbanned");
 if(a==="role"){const mk=d.role!=="admin";const pw={};document.querySelectorAll("#insp .pwl input").forEach(i=>{if(i.checked)pw[i.dataset.k]=true});return run(mk?"Make "+d.username+" an admin?":"Remove admin from "+d.username+"?",async()=>{const ok=await B.adminPatch(d.username,mk?{role:"admin",powers:pw}:{role:"player"});if(!ok)throw new Error("Failed")},mk?"Now an admin":"Admin removed")}
 if(a==="pw"){const pw={};document.querySelectorAll("#insp .pwl input").forEach(i=>{if(i.checked)pw[i.dataset.k]=true});return run(null,async()=>{const ok=await B.adminPatch(d.username,{powers:pw});if(!ok)throw new Error("Failed")},"Powers saved")}
}
async function loadLog(){$("logList").innerHTML='<div class="mu">Loading...</div>';let l=[];try{l=await B.aLog()}catch(e){}
 $("logList").innerHTML=l.map(e=>'<div class="logi"><small>'+new Date(e.at).toLocaleString()+'</small> <b>'+esc(e.admin_name||"?")+'</b> '+esc(e.action)+' <b>'+esc(e.target_name||"")+'</b>'+(e.detail&&Object.keys(e.detail).length?' <small>'+esc(JSON.stringify(e.detail))+'</small>':'')+'</div>').join("")||'<div class="mu">No actions yet</div>'}
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
$("inBtn").onclick=()=>login(B.signIn);$("upBtn2").onclick=()=>login(B.signUp);
$("guestBtn").onclick=()=>{P=B.guest();go("menuScreen")};
$("outBtn").onclick=async()=>{if(!P.guest)await save();await B.signOut();P=null;go("homeScreen")};
$("lvlGrid").innerHTML=["Rookie","Easy","Normal","Skilled","Hard","Veteran","Elite","Master","Nightmare","Impossible"].map((n,i)=>'<button class="btn" data-l="'+(i+1)+'"><b>Lv '+(i+1)+' '+n+'</b><br><small>'+(20*(i+1)+10)+' coins/kill</small></button>').join("");
document.querySelectorAll("#lvlGrid .btn").forEach(b=>b.onclick=()=>Game.start({mode:"grind",level:+b.dataset.l}));
$("pubBtn").onclick=()=>Game.start({mode:"online",room:"public-1"});
$("mkBtn").onclick=()=>{const c=Math.random().toString(36).slice(2,8).toUpperCase();$("onMsg").textContent="Your party code: "+c+" (share it!)";Game.start({mode:"online",room:"p-"+c,host:true});toast("Party code: "+c+" - you are the host")};
$("myArena").onclick=()=>Game.start({mode:"personal"});
$("joinBtn").onclick=()=>{const c=$("codeIn").value.trim().toUpperCase();if(c.length<4){$("onMsg").textContent="Enter a party code";return}Game.start({mode:"online",room:"p-"+c})};
$("leaveBtn").onclick=()=>{Game.stop();save();go("menuScreen")};
$("tabC").onclick=()=>{tab="c";locker()};$("tabW").onclick=()=>{tab="w";locker()};$("tabS").onclick=()=>{tab="s";locker()};
$("upBtn").onclick=()=>{const L=P.lv[P.char]||1,c=150*L;if(P.coins<c){toast("Not enough coins");return}P.coins-=c;P.lv[P.char]=L+1;hdr();save();locker()};
$("selfCoinBtn").onclick=()=>{P.coins+=Number($("selfAmt").value)||0;hdr();save();toast("Coins added")};
$("selfUnlock").onclick=()=>{P.chars=DT.CH.filter(c=>!c.ex||P.role==="mega").map(c=>c.id);P.weapons=DT.WP.filter(w=>!w.ex||P.role==="mega").map(w=>w.id);P.skins=DT.SKINS.map((x,i)=>i);hdr();save();toast("Everything unlocked")};
$("plRef").onclick=megaList;$("psearch").onkeydown=e=>{if(e.key==="Enter")megaList()};$("admClose").onclick=closeAdmin;$("logRef").onclick=loadLog;document.querySelectorAll(".admTabs button").forEach(b=>b.onclick=()=>admTab(b.dataset.at));
$("insaneTg").onclick=()=>{P.on=P.on||{};P.on.insane=!P.on.insane;save();admin();toast(P.on.insane?"SUPER INSANE MODE ON":"Super Insane Mode off");if(window.Game&&Game.active&&Game.refresh)Game.refresh()};
$("cfgSave").onclick=async()=>{const v={announce:$("cfgNews").value.trim(),coinMult:Math.max(0,Number($("cfgCoin").value)||1),bagMult:Math.max(0,Number($("cfgBag").value)||1),botHp:Math.max(.1,Number($("cfgBot").value)||1)};const ok=await B.setConfig(v);if(ok){CFG=v;$("news").textContent=v.announce}toast(ok?"Live settings saved - players get them on next load":"Save failed")};
addEventListener("beforeunload",()=>{if(P)save()});
// phone/browser Back: leave the arena or close the admin overlay instead of leaving the site
addEventListener("popstate",()=>{if($("adminScreen").classList.contains("overlay")){closeAdmin();try{history.pushState({arena:1},"")}catch(e){}return}if(window.Game&&Game.active){go("menuScreen");return}const on=document.querySelector(".screen.on");if(P&&on&&on.id!=="menuScreen"&&on.id!=="homeScreen")go("menuScreen")});
$("modeNote").textContent=B.cloud?"Online accounts ON: your progress follows you to any device.":"Local mode: progress saves on this device only. See README to enable cross-device accounts.";
B.session().then(p=>{if(p){P=p;mega();go("menuScreen")}});
B.config().then(c=>{CFG=c;$("news").textContent=c.announce||""});
return{P:()=>P,cfg:()=>CFG,pw,reward,toast,go,staff,insane,openAdmin,closeAdmin,save:()=>save()};
})();
