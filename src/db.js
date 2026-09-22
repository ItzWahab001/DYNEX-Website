const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

async function initDb(){
  if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  await pool.query(`CREATE TABLE IF NOT EXISTS dashboard_guild_settings (
    guild_id TEXT PRIMARY KEY,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS dashboard_audit_log (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`);
}
async function getSettings(guildId){
  const r=await pool.query('SELECT settings FROM dashboard_guild_settings WHERE guild_id=$1',[guildId]);
  return r.rows[0]?.settings || {};
}
async function saveSettings(guildId, settings, userId){
  await pool.query(`INSERT INTO dashboard_guild_settings(guild_id,settings,updated_at,updated_by) VALUES($1,$2,NOW(),$3)
    ON CONFLICT(guild_id) DO UPDATE SET settings=EXCLUDED.settings,updated_at=NOW(),updated_by=EXCLUDED.updated_by`,[guildId,settings,userId]);
}
async function audit(guildId,userId,action,details={}){ await pool.query('INSERT INTO dashboard_audit_log(guild_id,user_id,action,details) VALUES($1,$2,$3,$4)',[guildId,userId,action,details]); }
module.exports={pool,initDb,getSettings,saveSettings,audit};
