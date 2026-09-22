const $=s=>document.querySelector(s);
const state={guilds:[],guild:null,overview:null,settings:{},dirty:false,page:"overview"};

const defaults={
  modules:{
    moderation:{enabled:true,logActions:true,antiSpam:true,timeoutMinutes:10},
    security:{enabled:true,antiRaid:true,antiNuke:true,lockdown:false},
    automod:{enabled:true,spam:true,links:true,mentions:true,words:true},
    welcome:{enabled:false,channel:"",message:"Welcome {user} to {server}!"},
    roles:{enabled:false,autorole:true,roleId:""},
    tickets:{enabled:false,categoryId:"",transcript:true},
    giveaways:{enabled:false,defaultDuration:"1h"},
    music:{enabled:true,volume:70,autoDisconnect:true},
    community:{enabled:true,leveling:true,economy:true,suggestions:true},
    ai:{enabled:false,moderation:true,teacher:true},
    logging:{enabled:true,channel:"",messageDelete:true,memberJoin:true,memberLeave:true}
  },
  appearance:{accent:"blue",compact:false},
  general:{prefix:",",timezone:"Asia/Kolkata"}
};

async function api(url,opts={}){const r=await fetch(url,{credentials:"include",headers:{"Content-Type":"application/json",...(opts.headers||{})},...opts});let d={};try{d=await r.json()}catch{}if(r.status===401){location.href="/";throw new Error("Session expired")}if(!r.ok)throw new Error(d.error||"Request failed");return d}
function merge(a,b){return {...a,...b,modules:{...a.modules,...b.modules}}}
function toast(msg,ok=true){const t=$("#toast");t.textContent=msg;t.className=ok?"show":"show bad";setTimeout(()=>t.className="",2600)}
function esc(x){return String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
function iconFor(page){return ({moderation:"✦",security:"◈",automod:"盾",welcome:"♢",roles:"♙",tickets:"▣",giveaways:"◇",music:"♫",community:"♧",ai:"✧",logging:"≡"})[page]||"◫"}

async function init(){
  const me=await api("/api/me");
  if(!me.authenticated){location.href="/";return}
  $("#userBox").textContent=(me.user.username||"U").slice(0,2).toUpperCase();
  const g=await api("/api/guilds");state.guilds=g.guilds;
  renderServerButton();
  if(!state.guilds.length){renderEmpty();return}
  const installed=state.guilds.find(x=>x.botInstalled)||state.guilds[0];
  await selectGuild(installed);
  document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.page=b.dataset.page;renderPage()});
  $("#serverSelect").onclick=openServers;$("#closeModal").onclick=()=>$("#serverModal").classList.add("hidden");
  $("#serverSearch").oninput=()=>renderServerList($("#serverSearch").value);
  $("#saveBtn").onclick=save;$("#mobileSave").onclick=save;
  $("#logout").onclick=async()=>{await fetch("/auth/logout",{method:"POST"});location.href="/"};
  $("#menuBtn").onclick=()=>$("#sidebar").classList.toggle("open");
}
function renderServerButton(){
  const s=$("#serverSelect");const g=state.guild;
  s.innerHTML=`<div class="server-avatar">${g?"${esc(g.name).slice(0,1).toUpperCase()}":"D"}</div><div><strong>${g?esc(g.name):"Select server"}</strong><small>${g?"Manage Server":"Choose a server"}</small></div><span>⌄</span>`;
}
function openServers(){renderServerList();$("#serverModal").classList.remove("hidden")}
function renderServerList(q=""){
  const list=state.guilds.filter(g=>g.name.toLowerCase().includes(q.toLowerCase()));
  $("#serverList").innerHTML=list.map(g=>`<div class="server-item" data-id="${g.id}"><div class="server-avatar">${esc(g.name[0])}</div><div><b>${esc(g.name)}</b><small>${g.botInstalled?"DYNEX installed":"DYNEX not installed"}</small></div></div>`).join("")||"<p style='color:#71809a'>No matching servers.</p>";
  document.querySelectorAll(".server-item").forEach(x=>x.onclick=async()=>{const g=state.guilds.find(v=>v.id===x.dataset.id);if(!g.botInstalled)return toast("DYNEX is not installed in this server.",false);$("#serverModal").classList.add("hidden");await selectGuild(g)});
}
async function selectGuild(g){
  state.guild=g;renderServerButton();$("#content").innerHTML="<div class='card'>Loading server data…</div>";
  try{state.overview=await api(`/api/guilds/${g.id}/overview`);state.settings=merge(structuredClone(defaults),state.overview.settings||{});renderPage()}catch(e){toast(e.message,false)}
}
function renderPage(){
  const titles={overview:"Server Overview",analytics:"Analytics",audit:"Audit Log",moderation:"Moderation",security:"Security",automod:"AutoMod",welcome:"Welcome & Farewell",roles:"Roles",tickets:"Tickets",giveaways:"Giveaways",music:"Music",community:"Community",ai:"AI Tools",logging:"Logging"};
  $("#pageTitle").textContent=titles[state.page]||"Dashboard";$("#pageCrumb").textContent=titles[state.page]||"Dashboard";
  if(state.page==="overview")return renderOverview();
  if(state.page==="analytics")return renderAnalytics();
  if(state.page==="audit")return renderAudit();
  renderModule(state.page);
}
function renderOverview(){
  const o=state.overview;
  $("#content").innerHTML=`<div class="hero-row"><div class="welcome-card"><span class="tag">DYNEX CONTROL CENTER</span><h3>Welcome back, ${esc(state.guild.name)}.</h3><p>Configure every DYNEX module from one clean workspace. Changes are stored in PostgreSQL and ready for the bot-side configuration bridge.</p><button class="btn primary" onclick="document.querySelector('[data-page=security]').click()">Configure Security →</button></div><div class="card"><div class="card-top"><div><h3>DYNEX Status</h3><p>Live bot connection</p></div><div class="icon">●</div></div><h2 style="margin:8px 0;color:#52eca0">Online</h2><p>Guild access verified via Discord OAuth2.</p></div></div>
  <div class="stats"><div class="stat"><small>Members</small><strong>${o.guild.memberCount??"—"}</strong></div><div class="stat"><small>Channels</small><strong>${o.counts.channels}</strong></div><div class="stat"><small>Roles</small><strong>${o.counts.roles}</strong></div><div class="stat"><small>Text / Voice</small><strong>${o.counts.textChannels}/${o.counts.voiceChannels}</strong></div></div>
  <div class="section-head"><div><h3>Quick controls</h3><p>Most-used DYNEX modules</p></div></div>
  <div class="grid three">${["moderation","security","automod","welcome","roles","logging"].map(page=>moduleCard(page)).join("")}</div>`;
}
function moduleCard(page){
  const names={moderation:"Moderation",security:"Security",automod:"AutoMod",welcome:"Welcome & Farewell",roles:"Roles",logging:"Logging"};
  const descriptions={moderation:"Warnings, timeouts, bans and moderation controls.",security:"Anti-raid, anti-nuke and emergency lockdown.",automod:"Spam, links, mentions and word filters.",welcome:"Welcome/farewell messages and onboarding.",roles:"Auto roles and role-based automation.",logging:"Audit-friendly server event logging."};
  return `<div class="card"><div class="card-top"><div class="icon">${iconFor(page)}</div><span class="tag">${state.settings.modules[page]?.enabled?"ACTIVE":"OFF"}</span></div><h3>${names[page]}</h3><p>${descriptions[page]}</p><button class="btn ghost" style="margin-top:15px;padding:9px 12px" onclick="document.querySelector('[data-page=${page}]').click()">Configure</button></div>`
}
function renderAnalytics(){
  $("#content").innerHTML=`<div class="section-head"><div><h3>Server analytics</h3><p>Live counts from Discord. Historical metrics can be added through the bot bridge.</p></div></div><div class="grid three">${["Members","Channels","Roles"].map((x,i)=>`<div class="card"><p>${x}</p><h2>${[state.overview.guild.memberCount,state.overview.counts.channels,state.overview.counts.roles][i]}</h2><div style="height:8px;background:#172238;border-radius:99px;margin-top:15px"><div style="height:100%;width:${[82,58,43][i]}%;background:linear-gradient(90deg,#2f7dff,#3bdcff);border-radius:99px"></div></div></div>`).join("")}</div>`;
}
async function renderAudit(){
  $("#content").innerHTML="<div class='card'>Loading audit log…</div>";
  try{const d=await api(`/api/guilds/${state.guild.id}/audit`);$("#content").innerHTML=`<div class="section-head"><div><h3>Recent changes</h3><p>Dashboard configuration activity.</p></div></div><div class="card"><table class="table"><thead><tr><th>Action</th><th>User</th><th>Time</th></tr></thead><tbody>${d.logs.map(x=>`<tr><td>${esc(x.action)}</td><td>${esc(x.user_id)}</td><td>${new Date(x.created_at).toLocaleString()}</td></tr>`).join("")||"<tr><td colspan=3>No changes yet.</td></tr>"}</tbody></table></div>`}catch(e){toast(e.message,false)}
}
function renderModule(page){
  const m=state.settings.modules[page]||{enabled:false};const names={moderation:"Moderation",security:"Security",automod:"AutoMod",welcome:"Welcome & Farewell",roles:"Roles",tickets:"Tickets",giveaways:"Giveaways",music:"Music",community:"Community",ai:"AI Tools",logging:"Logging"};
  const descriptions={moderation:"Control moderation behavior and staff actions.",security:"Protect the server from raids, nukes and mass abuse.",automod:"Configure automated detection and filtering.",welcome:"Build your server onboarding experience.",roles:"Automate roles and member assignment.",tickets:"Ticket categories, transcripts and support flow.",giveaways:"Default giveaway behavior and timing.",music:"Playback defaults and voice lifecycle.",community:"Leveling, economy and community engagement.",ai:"AI-assisted moderation and teacher tools.",logging:"Choose which events DYNEX records."};
  const bool=(key,label,help="")=>`<div class="card"><div class="card-top"><div><h3>${label}</h3><p>${help}</p></div><label class="switch"><input type="checkbox" data-key="${key}" ${m[key]?"checked":""}><span class="slider"></span></label></div></div>`;
  let controls="";
  if(page==="moderation")controls=bool("logActions","Moderation logs","Record staff actions")+bool("antiSpam","Anti-spam","Slow down repeated messages")+bool("timeoutMinutes","Timeout protection","Use configured timeout policy");
  else if(page==="security")controls=bool("antiRaid","Anti-raid","Detect raid-like joins")+bool("antiNuke","Anti-nuke","Protect channels, roles and permissions")+bool("lockdown","Emergency lockdown","Enable only when needed");
  else if(page==="automod")controls=bool("spam","Spam filter")+bool("links","Link filter")+bool("mentions","Mention protection")+bool("words","Word filter");
  else if(page==="welcome")controls=bool("enabled","Module enabled","Send welcome/farewell messages")+field("channel","Channel ID","text")+field("message","Welcome message","textarea");
  else if(page==="roles")controls=bool("enabled","Module enabled")+bool("autorole","Auto role","Assign a role to new members")+field("roleId","Role ID","text");
  else if(page==="tickets")controls=bool("enabled","Module enabled")+bool("transcript","Transcripts","Store ticket transcripts")+field("categoryId","Category ID","text");
  else if(page==="giveaways")controls=bool("enabled","Module enabled")+field("defaultDuration","Default duration","text");
  else if(page==="music")controls=bool("enabled","Music enabled")+bool("autoDisconnect","Auto disconnect","Leave inactive voice channels")+field("volume","Default volume","number");
  else if(page==="community")controls=bool("enabled","Community module")+bool("leveling","Leveling")+bool("economy","Economy")+bool("suggestions","Suggestions");
  else if(page==="ai")controls=bool("enabled","AI tools")+bool("moderation","AI moderation")+bool("teacher","AI teacher");
  else if(page==="logging")controls=bool("enabled","Logging enabled")+bool("messageDelete","Message delete logs")+bool("memberJoin","Member join logs")+bool("memberLeave","Member leave logs")+field("channel","Log channel ID","text");
  $("#content").innerHTML=`<div class="section-head"><div><h3>${names[page]}</h3><p>${descriptions[page]}</p></div><span class="tag">${m.enabled?"ENABLED":"DISABLED"}</span></div><div class="grid">${controls}</div><div class="notice">Changes are local to this dashboard until you press <b>Save Changes</b>. The bot must read <code>dynex_dashboard_guild_settings</code> to apply them in real time.</div>`;
  document.querySelectorAll("[data-key]").forEach(el=>el.onchange=()=>{m[el.dataset.key]=el.type==="checkbox"?el.checked:el.value;state.dirty=true});
  document.querySelectorAll("[data-field]").forEach(el=>el.oninput=()=>{m[el.dataset.field]=el.value;state.dirty=true});
}
function field(key,label,type){const m=state.settings.modules[state.page]||{};return `<div class="card"><div class="field"><label>${label}</label><${type==="textarea"?"textarea":"input"} class="${type==='number'?'input':'input'}" data-field="${key}" ${type==="number"?'type="number"':''}>${type==="textarea"?esc(m[key]||""):""}</${type==="textarea"?"textarea":"input"}></div></div>`}
async function save(){if(!state.guild)return;try{await api(`/api/guilds/${state.guild.id}/settings`,{method:"PUT",body:JSON.stringify({settings:state.settings})});state.dirty=false;toast("Changes saved to PostgreSQL.");}catch(e){toast(e.message,false)}}
init().catch(e=>{console.error(e);document.getElementById("content").innerHTML=`<div class="card"><h3>Dashboard error</h3><p>${esc(e.message)}</p></div>`});
