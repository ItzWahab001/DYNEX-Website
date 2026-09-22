const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dynex_dashboard_guild_settings (
      guild_id TEXT PRIMARY KEY,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_by TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS dynex_dashboard_audit_logs (
      id BIGSERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_dynex_audit_guild_time
      ON dynex_dashboard_audit_logs(guild_id, created_at DESC);
  `);
}

async function getSettings(guildId) {
  const { rows } = await pool.query(
    "SELECT settings FROM dynex_dashboard_guild_settings WHERE guild_id=$1",
    [guildId]
  );
  return rows[0]?.settings || {};
}

async function saveSettings(guildId, settings, userId) {
  await pool.query(
    `INSERT INTO dynex_dashboard_guild_settings(guild_id, settings, updated_by)
     VALUES($1,$2::jsonb,$3)
     ON CONFLICT(guild_id)
     DO UPDATE SET settings=EXCLUDED.settings, updated_by=EXCLUDED.updated_by, updated_at=NOW()`,
    [guildId, JSON.stringify(settings), userId]
  );
}

async function audit(guildId, userId, action, details={}) {
  await pool.query(
    "INSERT INTO dynex_dashboard_audit_logs(guild_id,user_id,action,details) VALUES($1,$2,$3,$4::jsonb)",
    [guildId, userId, action, JSON.stringify(details)]
  );
}

async function recentAudit(guildId, limit=30) {
  const { rows } = await pool.query(
    `SELECT id,user_id,action,details,created_at
     FROM dynex_dashboard_audit_logs
     WHERE guild_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [guildId, limit]
  );
  return rows;
}

module.exports = { pool, initDb, getSettings, saveSettings, audit, recentAudit };
