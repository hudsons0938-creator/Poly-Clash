/* UI controller: accounts, menus, shop, locker, leaderboard, admin. */
window.App=(function(){
const $=id=>document.getElementById(id),DT=window.DATA,B=window.Backend;
let P=null,tab="c",sel=null,svT=0,CFG={announce:"",coinMult:1,bagMult:1,botHp:1};
const esc=s=>String(s).replace(/[&<>"']/g,c=>"&#"+c.charCodeAt(0)+";");
const hex=n=>"#"+n.toString(16).padStart(6,"0");
const lvOf=p=>1+Math.floor(Math.sqrt(p.xp/100));
const pw=k=>!!P&&(P.role==="mega"||!!(P.powers&&P.powers[k]))&&!!(P.on&&P.on[k]);
const PWS=[["god","God Mode (hits deal 100)"],["inf","Infinite stamina"],["speed","Speed boost"],["coins","Give self coins"],["unlock","Unlock everything (self)"]];
function toast(t){const e=$("toast");e.textContent=t;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),2800)}
function mega(){if(P&&P.role==='mega'){P.chars=DT.CH.map(c=>c.id);P.weapons=DT.WP.map(w=>w.id);P.skins=DT.SKINS.map((x,i)=>i)}}
function save(){return B.save(P)}
function hdr(){if(!P)return;$("who").textContent=P.username+(P.role!=="player"?" ["+P.role.toUpperCase()+"]":"")+(P.guest?" (guest)":"");$("coins").textContent=P.coins+" coins";
 $("stats").textContent="Level "+lvOf(P)+"  |  Wins "+P.wins+"  |  Bot kills "+P.kills+"  |  "+P.chars.length+"/"+DT.CH.length+" fighters";
 $("adminBtn").classList.toggle("hide",P.role==="player")}
function reward(r){P.coins+=Math.round((r.coins||0)*CFG.coinMult);P.xp+=r.xp||0;P.kills+=r.kills||0;P.wins+=r.wins||0;hdr();clearTimeout(svT);svT=setTimeout(save,800)}
function go(id){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("on"));$(id).classList.add("on");
 if(P)hdr();if(id==="lockerScreen")locker();if(id==="shopScreen")shop();if(id==="boardScreen")board("wins");if(id==="adminScreen")admin();if(id==="guideScreen")guide()}
async function login(fn){const u=$("uIn").value.trim(),p=$("pIn").value;$("authMsg").textContent="...";const r=await fn.call(B,u,p);if(r.error){$("authMsg").textContent=r.error;return}P=r.p;mega();$("authMsg").textContent="";go("menuScreen")}
function roll(bag){const w=bag.w,t=w.reduce((a,b)=>a+b,0);let r=Math.random()*t,ri=0;for(;ri<w.length-1;ri++){r-=w[ri];if(r<=0)break}
 const isW=Math.random()<.25,pool=(isW?DT.WP:DT.CH).filter(x=>x.rar===ri);return{w:isW,x:pool[Math.floor(Math.random()*pool.length)]}}
function shop(){
 $("bagGrid").innerHTML=DT.BAGS.map((b,i)=>'<button class="btn" data-i="'+i+'"><b>'+b.n+'</b><br><small>'+Math.round(b.c*CFG.bagMult)+' coins</small></button>').join("");
 document.querySelectorAll("#bagGrid .btn").forEach(el=>el.onclick=()=>{const b=DT.BAGS[+el.dataset.i],cost=Math.round(b.c*CFG.bagMult);
  if(P.coins<cost){toast("Not enough coins");return}
  P.coins-=cost;const r=roll(b),list=r.w?P.weapons:P.chars;let t=r.x.name+" ("+DT.RAR[r.x.rar][0]+(r.w?" weapon":"")+")";
  if(list.indexOf(r.x.id)>=0){const back=Math.floor(cost*.3);P.coins+=back;t+=" - DUPLICATE +"+back}else{list.push(r.x.id);t+=" - NEW!"}
  $("shopRes").style.color=hex(DT.RAR[r.x.rar][1]);$("shopRes").textContent=t;hdr();save()});
}
function locker(){
 const mg=P.role==="mega";
 $("lockInfo").textContent="Fighters "+P.chars.length+"/"+DT.CH.length+"  |  Weapons "+P.weapons.length+"/"+DT.WP.length+"  |  Skins "+P.skins.length+"/"+DT.SKINS.length;
 let h="";
 if(tab==="s")h=DT.SKINS.map((k,i)=>{const own=mg||P.skins.indexOf(i)>=0;return'<div class="card2'+(P.skin===i?" sel":"")+'" data-i="'+i+'" style="border-color:'+(k[1]===null?"#888":hex(k[1]))+'"><b>'+k[0]+'</b><small>'+(own?"Owned":"1000 coins")+'</small></div>'}).join("");
 else{const isC=tab==="c",list=isC?P.chars:P.weapons,src=isC?DT.CH:DT.WP,cur=isC?P.char:P.weapon;
  h=list.slice().sort((a,b)=>src[b].rar-src[a].rar).map(id=>{const x=src[id];return'<div class="card2'+(id===cur?" sel":"")+'" data-i="'+id+'" style="border-color:'+hex(DT.RAR[x.rar][1])+'"><b>'+x.name+'</b><small>'+DT.RAR[x.rar][0]+(isC?" - "+x.realm+" - "+x.pw:" - dmg "+x.dmg.toFixed(1)+" - range "+x.rng)+'</small>'+(isC?'<small>Lv '+(P.lv[id]||1)+' - HP x'+x.hp.toFixed(2)+' DMG x'+x.dmg.toFixed(2)+' SPD x'+x.spd.toFixed(2)+' AGI x'+x.agi.toFixed(2)+'</small><small>'+DT.POWERS[DT.PIDX[x.pw]].d+'</small>':(x.ls?'<small>Lifesteal</small>':''))+'</div>'}).join("")}
 $("lockGrid").innerHTML=h;
 document.querySelectorAll(".card2").forEach(el=>el.onclick=()=>{const i=+el.dataset.i;
  if(tab==="s"){if(!(mg||P.skins.indexOf(i)>=0)){if(P.coins<1000){toast("Not enough coins");return}P.coins-=1000;P.skins.push(i);hdr()}P.skin=i}
  else if(tab==="c")P.char=i;else P.weapon=i;
  save();locker()});
 $("upBtn").classList.toggle("hide",tab!=="c");$("upBtn").textContent="UPGRADE SELECTED - "+150*(P.lv[P.char]||1)+" COINS";
}
function guide(){$("guideList").innerHTML='<div>Every fighter has one power. Skills: 1 Strike (cone), 2 Bolt (projectile), 3 Slam (area), 4 Rush (dash attack), R Ultimate (huge area). Skill hits trigger your power:</div>'+DT.POWERS.map(p=>'<div><b style="color:'+hex(p.col)+'">'+p.n+'</b> - '+p.d+'</div>').join("")+'<div>Rarity: HP and damage +22% per tier (Common x1.0 up to Secret x2.1), speed +3% and agility +4% per tier. Agility shortens dash and skill cooldowns.</div>'}
async function board(cat){
 $("boardTabs").innerHTML=[["wins","Wins"],["kills","Bot Kills"],["coins","Coins"],["collection","Collection"],["level","Level"]].map(c=>'<button class="btn" data-c="'+c[0]+'">'+c[1]+'</button>').join("");
 document.querySelectorAll("#boardTabs .btn").forEach(b=>b.onclick=()=>board(b.dataset.c));
 $("boardList").textContent="Loading...";const rows=await B.board(cat);
 $("boardList").innerHTML=rows.length?rows.map((r,i)=>"<div>#"+(i+1)+" <b>"+esc(r.username)+"</b> - "+r.val+"</div>").join(""):"<div>No players yet</div>";
}
function admin(){
 const mega=P.role==="mega",can=k=>mega||(P.powers&&P.powers[k]);
 $("pwBox").innerHTML=PWS.filter(p=>p[0]!=="coins"&&p[0]!=="unlock"&&can(p[0])).map(p=>'<div class="row"><span>'+p[1]+'</span><button class="tg'+(P.on&&P.on[p[0]]?" act":"")+'" data-k="'+p[0]+'">'+(P.on&&P.on[p[0]]?"ON":"OFF")+'</button></div>').join("");
 document.querySelectorAll("#pwBox .tg").forEach(b=>b.onclick=()=>{P.on=P.on||{};P.on[b.dataset.k]=!P.on[b.dataset.k];save();admin()});
 $("selfCoin").classList.toggle("hide",!can("coins"));$("selfUnlock").classList.toggle("hide",!can("unlock"));$("megaBox").classList.toggle("hide",!mega);
 if(mega){megaList();$("cfgNews").value=CFG.announce||"";$("cfgCoin").value=CFG.coinMult;$("cfgBag").value=CFG.bagMult;$("cfgBot").value=CFG.botHp}
}
async function megaList(){
 const l=await B.adminList($("psearch").value.trim());
 $("plist").innerHTML=l.map(p=>'<div class="pl" data-u="'+esc(p.username)+'"><b>'+esc(p.username)+'</b> '+(p.role!=="player"?"["+p.role+"] ":"")+"- "+p.coins+" coins</div>").join("");
 document.querySelectorAll(".pl").forEach(e=>e.onclick=()=>{sel=l.find(x=>esc(x.username)===e.dataset.u);showSel()});
}
function showSel(){if(!sel)return;$("selBox").classList.remove("hide");$("selName").textContent=sel.username+" ("+sel.role+")";
 $("selPw").innerHTML=PWS.map(p=>'<label><input type="checkbox" data-k="'+p[0]+'"'+(sel.powers&&sel.powers[p[0]]?" checked":"")+"> "+p[1]+"</label>").join("");
 $("roleBtn").textContent=sel.role==="admin"?"REMOVE ADMIN":"MAKE ADMIN"}
const readPw=()=>{const o={};document.querySelectorAll("#selPw input").forEach(i=>{if(i.checked)o[i.dataset.k]=true});return o};
async function patch(pt){if(!sel)return;if(sel.role==="mega"){toast("Can't edit the mega admin");return}const ok=await B.adminPatch(sel.username,pt);toast(ok?"Done":"Failed");await megaList();sel=(await B.adminList(sel.username)).find(x=>x.username===sel.username)||sel;showSel()}
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
$("inBtn").onclick=()=>login(B.signIn);$("upBtn2").onclick=()=>login(B.signUp);
$("guestBtn").onclick=()=>{P=B.guest();go("menuScreen")};
$("outBtn").onclick=async()=>{if(!P.guest)await save();await B.signOut();P=null;go("homeScreen")};
$("lvlGrid").innerHTML=["Rookie","Easy","Normal","Skilled","Hard","Veteran","Elite","Master","Nightmare","Impossible"].map((n,i)=>'<button class="btn" data-l="'+(i+1)+'"><b>Lv '+(i+1)+' '+n+'</b><br><small>'+(20*(i+1)+10)+' coins/kill</small></button>').join("");
document.querySelectorAll("#lvlGrid .btn").forEach(b=>b.onclick=()=>Game.start({mode:"grind",level:+b.dataset.l}));
$("pubBtn").onclick=()=>Game.start({mode:"online",room:"public-1"});
$("mkBtn").onclick=()=>{const c=Math.random().toString(36).slice(2,8).toUpperCase();$("onMsg").textContent="Your party code: "+c+" (share it!)";Game.start({mode:"online",room:"p-"+c});toast("Party code: "+c)};
$("joinBtn").onclick=()=>{const c=$("codeIn").value.trim().toUpperCase();if(c.length<4){$("onMsg").textContent="Enter a party code";return}Game.start({mode:"online",room:"p-"+c})};
$("leaveBtn").onclick=()=>{Game.stop();save();go("menuScreen")};
$("tabC").onclick=()=>{tab="c";locker()};$("tabW").onclick=()=>{tab="w";locker()};$("tabS").onclick=()=>{tab="s";locker()};
$("upBtn").onclick=()=>{const L=P.lv[P.char]||1,c=150*L;if(P.coins<c){toast("Not enough coins");return}P.coins-=c;P.lv[P.char]=L+1;hdr();save();locker()};
$("selfCoinBtn").onclick=()=>{P.coins+=Number($("selfAmt").value)||0;hdr();save();toast("Coins added")};
$("selfUnlock").onclick=()=>{P.chars=DT.CH.map(c=>c.id);P.weapons=DT.WP.map(w=>w.id);P.skins=DT.SKINS.map((x,i)=>i);hdr();save();toast("Everything unlocked")};
$("plRef").onclick=megaList;
$("cfgSave").onclick=async()=>{const v={announce:$("cfgNews").value.trim(),coinMult:Math.max(0,Number($("cfgCoin").value)||1),bagMult:Math.max(0,Number($("cfgBag").value)||1),botHp:Math.max(.1,Number($("cfgBot").value)||1)};const ok=await B.setConfig(v);if(ok){CFG=v;$("news").textContent=v.announce}toast(ok?"Live settings saved - players get them on next load":"Save failed")};
$("grantBtn").onclick=()=>patch({addCoins:Number($("grantAmt").value)||0});
$("unlockBtn").onclick=()=>patch({unlockAll:true});
$("roleBtn").onclick=()=>patch(sel&&sel.role==="admin"?{role:"player"}:{role:"admin",powers:readPw()});
$("pwSave").onclick=()=>{if(sel&&sel.role==="player"){toast("Make them admin first");return}patch({powers:readPw()})};
addEventListener("beforeunload",()=>{if(P)save()});
$("modeNote").textContent=B.cloud?"Online accounts ON: your progress follows you to any device.":"Local mode: progress saves on this device only. See README to enable cross-device accounts.";
B.session().then(p=>{if(p){P=p;mega();go("menuScreen")}});
B.config().then(c=>{CFG=c;$("news").textContent=c.announce||""});
return{P:()=>P,cfg:()=>CFG,pw,reward,toast,go};
})();
