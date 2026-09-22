const axios = require('axios');
const API='https://discord.com/api/v10';
const scopes='identify guilds';
function oauthUrl(){
  const p=new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,response_type:'code',redirect_uri:`${process.env.DASHBOARD_URL.replace(/\/$/,'')}/auth/discord/callback`,scope:scopes});
  return `${API}/oauth2/authorize?${p}`;
}
async function tokenExchange(code){
  const body=new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,client_secret:process.env.DISCORD_CLIENT_SECRET,grant_type:'authorization_code',code,redirect_uri:`${process.env.DASHBOARD_URL.replace(/\/$/,'')}/auth/discord/callback`});
  const r=await axios.post(`${API}/oauth2/token`,body.toString(),{headers:{'Content-Type':'application/x-www-form-urlencoded'}}); return r.data;
}
async function user(access){return (await axios.get(`${API}/users/@me`,{headers:{Authorization:`Bearer ${access}`}})).data;}
async function userGuilds(access){return (await axios.get(`${API}/users/@me/guilds`,{headers:{Authorization:`Bearer ${access}`}})).data;}
async function botGuilds(){return (await axios.get(`${API}/users/@me/guilds`,{headers:{Authorization:`Bot ${process.env.DISCORD_BOT_TOKEN}`}})).data;}
async function botGuild(guildId){return (await axios.get(`${API}/guilds/${guildId}`,{headers:{Authorization:`Bot ${process.env.DISCORD_BOT_TOKEN}`}})).data;}
async function roles(guildId){return (await axios.get(`${API}/guilds/${guildId}/roles`,{headers:{Authorization:`Bot ${process.env.DISCORD_BOT_TOKEN}`}})).data;}
async function channels(guildId){return (await axios.get(`${API}/guilds/${guildId}/channels`,{headers:{Authorization:`Bot ${process.env.DISCORD_BOT_TOKEN}`}})).data;}
function canManage(g){return Boolean((BigInt(g.permissions||0)&8n)===8n || (BigInt(g.permissions||0)&32n)===32n);}
module.exports={oauthUrl,tokenExchange,user,userGuilds,botGuilds,botGuild,roles,channels,canManage};
