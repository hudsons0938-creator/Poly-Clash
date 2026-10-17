/* 400 characters, 60 weapons (10 secret), 6 bags. Deterministic, so every device sees the same IDs. */
(function(){
const RAR=[["Common",0x9aa5b1],["Uncommon",0x4cd964],["Rare",0x3498db],["Epic",0xa55eea],["Legendary",0xf7b731],["Secret",0xff2d55]];
const COUNT=[160,100,70,40,20,10];
let s=1337;const rnd=()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const A=["Shadow","Neon","Crimson","Frost","Storm","Jade","Void","Solar","Iron","Ember","Lunar","Toxic","Cyber","Astral","Savage","Silent","Golden","Rogue","Mythic","Primal"];
const N=["Striker","Monk","Ronin","Brawler","Reaper","Warden","Phantom","Titan","Hunter","Sage","Knight","Viper","Samurai","Gladiator","Mage","Berserker","Assassin","Guardian","Specter","Champion"];
const REALMS=["Shadow Realm","Neon City","Sky Temple","Ember Wastes","Frost Spire","Jade Dynasty","Void Rift","Steel Kingdom"];
const POW=["Flame","Frost","Thunder","Gravity","Shadow","Wind","Blood","Crystal","Venom","Time"];
const rs=[];COUNT.forEach((n,r)=>{for(let i=0;i<n;i++)rs.push(r)});
for(let i=rs.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[rs[i],rs[j]]=[rs[j],rs[i]]}
const CH=rs.map((r,i)=>{const m=1+r*.22;return{id:i,name:A[i%20]+" "+N[Math.floor(i/20)],rar:r,realm:REALMS[Math.floor(rnd()*8)],pw:POW[Math.floor(rnd()*10)],col:0x444444+Math.floor(rnd()*0xaaaaaa),hp:m*(.9+rnd()*.3),dmg:m*(.9+rnd()*.3),spd:1+r*.03+rnd()*.1,agi:1+r*.04+((i*37)%10)/100}});
const TY=[["Sword",1,.4,3],["Axe",1.3,.55,3],["Spear",1,.45,4.2],["Hammer",1.6,.8,3],["Dagger",.7,.25,2.4],["Scythe",1.25,.6,3.6],["Katana",1.1,.35,3.2],["Gauntlets",.9,.3,2.6],["Staff",.95,.4,4],["Whip",.85,.38,4.6]];
const PRE=["Rusty","Iron","Mythril","Dragon","Celestial"];
const WP=[];for(let r=0;r<5;r++)TY.forEach((t,i)=>WP.push({id:r*10+i,name:PRE[r]+" "+t[0],rar:r,dmg:t[1]*(1+r*.4),cd:t[2],rng:t[3],ls:0,col:RAR[r][1]}));
[["Void Reaper",3.4,.45,4],["Sunbreaker",3.6,.5,3.4],["Moonfang",3.2,.3,2.8],["Chrono Blade",3.5,.35,3.4],["Abyss Edge",3.3,.4,3.2],["Star Cleaver",3.8,.6,3.8],["Phantom Fists",3,.22,2.6],["Titan's Wrath",4.2,.8,3.4],["Omega Katana",3.7,.3,3.4],["Infinity Edge",4.5,.4,4]].forEach((t,i)=>WP.push({id:50+i,name:t[0],rar:5,dmg:t[1],cd:t[2],rng:t[3],ls:.12,col:0xff2d55}));
const BAGS=[{n:"Common Bag",c:100,w:[70,25,5,0,0,0]},{n:"Uncommon Bag",c:300,w:[30,45,20,5,0,0]},{n:"Rare Bag",c:800,w:[0,25,50,20,5,0]},{n:"Epic Bag",c:2000,w:[0,0,25,50,22,3]},{n:"Legendary Bag",c:5000,w:[0,0,0,30,60,10]},{n:"Secret Bag",c:15000,w:[0,0,0,0,50,50]}];
const POWERS=[{n:"Flame",fx:"burn",col:0xff6a00,d:"Skill hits set enemies on fire (damage over 3s)."},
{n:"Frost",fx:"slow",col:0x66e0ff,d:"Skill hits slow enemies for 3s."},
{n:"Thunder",fx:"stun",col:0xffe14d,d:"Skill hits stun enemies for 1s."},
{n:"Gravity",fx:"pull",col:0x9b59ff,d:"Skill hits pull enemies toward you."},
{n:"Shadow",fx:"crit",col:0x8a4fb0,d:"Skill hits have a 25% chance to deal double damage."},
{n:"Wind",fx:"push",col:0xb8ffd8,d:"Skill hits blast enemies far away."},
{n:"Blood",fx:"vamp",col:0xd50000,d:"Skill hits heal you for 25% of the damage dealt."},
{n:"Crystal",fx:"shield",col:0x7df9ff,d:"Skill hits build a damage-absorbing shield."},
{n:"Venom",fx:"poison",col:0x7cff3a,d:"Skill hits poison enemies (slow + damage over 5s)."},
{n:"Time",fx:"haste",col:0xf0d9a0,d:"Skill hits shave 0.5s off all your cooldowns."}];
const PIDX={};POWERS.forEach((p,i)=>{PIDX[p.n]=i});
const SKINS=[["Default",null],["Crimson",0xc62828],["Ocean",0x1976d2],["Toxic",0x43a047],["Royal",0x7e57c2],["Gold",0xd8ad3d],["Obsidian",0x212121],["Snow",0xeceff1],["Sunset",0xff7043],["Neon Pink",0xff2fd0],["Cyan",0x00e5ff],["Blood Moon",0x8b0000]];
// ---- admin-exclusive content (never drops from bags; only granted by admins) ----
RAR.push(["Exclusive",0xffd700]);
POWERS.push({n:"Cosmic",fx:"crit",col:0xff4dff,d:"Exclusive cosmic power."});PIDX.Cosmic=POWERS.length-1;
[["Overlord",19,0xd8ad3d],["Void Emperor",4,0x2a0838],["Celestial Judge",17,0xf2f2f2],["Storm Sovereign",18,0x1e88e5]].forEach((x,i)=>CH.push({id:400+i,name:x[0],rar:6,realm:"Admin Realm",pw:"Cosmic",col:x[2],hp:2.4,dmg:2.4,spd:1.25,agi:1.3,arch:x[1],ex:1}));
[["Admin Gavel",5.2,.35,3.6,3],["Ban Hammer",6,.5,3.8,3],["Cosmic Blade",5,.3,4,0]].forEach((x,i)=>WP.push({id:60+i,name:x[0],rar:6,dmg:x[1],cd:x[2],rng:x[3],ls:.15,col:0xffd700,type:x[4],ex:1}));
const TITLES=["Champion","Legend","Grandmaster","Untouchable","Combo King","Air Ace","VIP","Tester","Moderator","Founder"];
const XPOWERS=[["god","God Mode"],["inf","No dash/evasive cooldown"],["speed","Speed boost"]];
window.DATA={RAR,CH,WP,BAGS,POWERS,PIDX,SKINS,START:rs.indexOf(0),TITLES,XPOWERS,NORMAL_CH:400,NORMAL_WP:60};
})();
