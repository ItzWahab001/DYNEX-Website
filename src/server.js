require('dotenv').config({quiet:true});
const express=require('express');
const session=require('express-session');
const helmet=require('helmet');
const rateLimit=require('express-rate-limit');
const path=require('path');
const discord=require('./discord');
const db=require('./db');

for(const k of ['DISCORD_CLIENT_ID','DISCORD_CLIENT_SECRET','DISCORD_BOT_TOKEN','DASHBOARD_URL','SESSION_SECRET','DATABASE_URL']) if(!process.env[k]) console.warn(`[DYNEX] Missing environment variable: ${k}`);
const app=express();
app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'100kb'}));
app.use(rateLimit({windowMs:60*1000,max:120,standardHeaders:true,legacyHeaders:false}));
app.use(session({secret:process.env.SESSION_SECRET||'change-me',resave:false,saveUninitialized:false,cookie:{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:7*24*60*60*1000}}));
app.use(express.static(path.join(__dirname,'..','public')));

function auth(req,res,next){ if(!req.session.user) return res.status(401).json({error:'Not authenticated'}); next(); }
async function managedGuild(req,res,next){
  try{
    const list=await discord.userGuilds(req.session.accessToken);
    const g=list.find(x=>x.id===req.params.guildId);
    if(!g || !discord.canManage(g)) return res.status(403).json({error:'You do not have Manage Server permission for this server.'});
    const bots=await discord.botGuilds();
    const installed=bots.some(x=>x.id===g.id);
    req.userGuild=g; req.botInstalled=installed;
    if(!installed) return res.status(409).json({error:'DYNEX is not installed on this server.',code:'BOT_NOT_INSTALLED'});
    next();
  }catch(e){console.error(e.response?.data||e.message);res.status(502).json({error:'Discord API request failed'});}
}

app.get('/auth/discord',(req,res)=>res.redirect(discord.oauthUrl()));
app.get('/auth/discord/callback',async(req,res)=>{try{if(!req.query.code) return res.redirect('/?error=oauth'); const t=await discord.tokenExchange(req.query.code); const u=await discord.user(t.access_token); req.session.user=u; req.session.accessToken=t.access_token; res.redirect('/dashboard.html');}catch(e){console.error(e.response?.data||e.message);res.redirect('/?error=oauth');}});
app.post('/auth/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/me',(req,res)=>res.json({authenticated:Boolean(req.session.user),user:req.session.user||null}));
app.get('/api/guilds',auth,async(req,res)=>{try{const mine=await discord.userGuilds(req.session.accessToken);const bots=await discord.botGuilds();const installed=new Set(bots.map(x=>x.id));res.json({guilds:mine.filter(discord.canManage).map(g=>({...g,botInstalled:installed.has(g.id)}))});}catch(e){res.status(502).json({error:'Discord API request failed'});}});
app.get('/api/guilds/:guildId',auth,managedGuild,async(req,res)=>{try{const [g,roles,channels,settings]=await Promise.all([discord.botGuild(req.params.guildId),discord.roles(req.params.guildId),discord.channels(req.params.guildId),db.getSettings(req.params.guildId)]);res.json({guild:g,roles,channels,settings});}catch(e){console.error(e.response?.data||e.message);res.status(502).json({error:'Could not load server data'});}});
app.put('/api/guilds/:guildId/settings',auth,managedGuild,async(req,res)=>{try{const settings=req.body||{};await db.saveSettings(req.params.guildId,settings,req.session.user.id);await db.audit(req.params.guildId,req.session.user.id,'settings.update',settings);res.json({ok:true,settings});}catch(e){console.error(e);res.status(500).json({error:'Could not save settings'});}});
app.get('/api/guilds/:guildId/audit',auth,managedGuild,async(req,res)=>{try{const r=await db.pool.query('SELECT id,user_id,action,details,created_at FROM dashboard_audit_log WHERE guild_id=$1 ORDER BY id DESC LIMIT 100',[req.params.guildId]);res.json({logs:r.rows});}catch(e){res.status(500).json({error:'Could not load audit log'});}});
app.get('/health',async(req,res)=>{try{await db.pool.query('SELECT 1');res.json({ok:true,service:'DYNEX Dashboard',time:new Date().toISOString()});}catch(e){res.status(503).json({ok:false});}});
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'..','public','index.html')));
(async()=>{try{await db.initDb();const port=Number(process.env.PORT||3000);app.listen(port,()=>console.log(`DYNEX Dashboard listening on :${port}`));}catch(e){console.error('Startup failed:',e);process.exit(1);}})();
