require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const db = require("./db");
const discord = require("./discord");

const app = express();
const PORT = Number(process.env.PORT || 8080);

const required = [
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_BOT_TOKEN",
  "DASHBOARD_URL",
  "SESSION_SECRET",
  "DATABASE_URL"
];
for (const key of required) {
  if (!process.env[key]) console.warn(`[DYNEX] Missing environment variable: ${key}`);
}

app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false }));

const limiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api", limiter);

app.use(session({
  store: new pgSession({
    pool: db.pool,
    tableName: "dynex_dashboard_sessions",
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || "change-me",
  resave: false,
  saveUninitialized: false,
  proxy: true,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: "auto",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

function requireAuth(req, res, next) {
  if (!req.session.user || !req.session.accessToken) {
    return res.status(401).json({ authenticated: false });
  }
  next();
}

async function managedGuild(req, guildId) {
  const guilds = await discord.userGuilds(req.session.accessToken);
  const found = guilds.find(g => g.id === guildId);
  if (!found || !discord.canManage(found)) {
    const err = new Error("You do not have Manage Server permission for this server.");
    err.status = 403;
    throw err;
  }
  const botGuilds = await discord.botGuilds();
  if (!botGuilds.some(g => g.id === guildId)) {
    const err = new Error("DYNEX is not installed in this server.");
    err.status = 409;
    throw err;
  }
  return found;
}

app.get("/auth/discord", (req, res) => {
  const state = discord.randomState();
  req.session.oauthState = state;
  req.session.save(() => res.redirect(discord.oauthUrl(state)));
});

app.get("/auth/discord/callback", async (req, res) => {
  try {
    if (!req.query.code || !req.query.state || req.query.state !== req.session.oauthState) {
      return res.redirect("/?error=oauth_state");
    }

    const tokens = await discord.tokenExchange(req.query.code);
    const me = await discord.user(tokens.access_token);

    await new Promise((resolve, reject) =>
      req.session.regenerate(err => err ? reject(err) : resolve())
    );
    req.session.user = me;
    req.session.accessToken = tokens.access_token;

    await new Promise((resolve, reject) =>
      req.session.save(err => err ? reject(err) : resolve())
    );

    console.log(`[DYNEX] OAuth session saved for ${me.username} (${req.sessionID})`);
    res.redirect("/dashboard.html");
  } catch (err) {
    console.error("[DYNEX] OAuth callback failed:", err.response?.data || err.message);
    res.redirect("/?error=oauth");
  }
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", (req, res) => {
  res.json({
    authenticated: Boolean(req.session.user && req.session.accessToken),
    user: req.session.user || null
  });
});

app.get("/api/guilds", requireAuth, async (req, res) => {
  try {
    const [userGuilds, botGuilds] = await Promise.all([
      discord.userGuilds(req.session.accessToken),
      discord.botGuilds()
    ]);
    const botIds = new Set(botGuilds.map(g => g.id));
    const guilds = userGuilds
      .filter(discord.canManage)
      .map(g => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        owner: g.owner,
        botInstalled: botIds.has(g.id)
      }));
    res.json({ guilds });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(502).json({ error: "Unable to load Discord servers." });
  }
});

app.get("/api/guilds/:guildId/overview", requireAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    await managedGuild(req, guildId);
    const [g, roles, channels, settings] = await Promise.all([
      discord.guild(guildId),
      discord.roles(guildId),
      discord.channels(guildId),
      db.getSettings(guildId)
    ]);
    res.json({
      guild: {
        id: g.id, name: g.name, icon: g.icon,
        ownerId: g.owner_id, memberCount: g.approximate_member_count
      },
      counts: {
        roles: roles.length,
        channels: channels.length,
        textChannels: channels.filter(c => c.type === 0).length,
        voiceChannels: channels.filter(c => [2,13].includes(c.type)).length
      },
      settings
    });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Unable to load server." });
  }
});

app.get("/api/guilds/:guildId/settings", requireAuth, async (req, res) => {
  try {
    await managedGuild(req, req.params.guildId);
    res.json({ settings: await db.getSettings(req.params.guildId) });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message });
  }
});

app.put("/api/guilds/:guildId/settings", requireAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    await managedGuild(req, guildId);
    const settings = req.body?.settings;
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return res.status(400).json({ error: "Invalid settings payload." });
    }
    await db.saveSettings(guildId, settings, req.session.user.id);
    await db.audit(guildId, req.session.user.id, "settings.updated", {
      keys: Object.keys(settings)
    });
    res.json({ ok: true, settings });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message });
  }
});

app.get("/api/guilds/:guildId/audit", requireAuth, async (req, res) => {
  try {
    await managedGuild(req, req.params.guildId);
    res.json({ logs: await db.recentAudit(req.params.guildId) });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message });
  }
});

app.get("/api/health", async (req, res) => {
  try {
    await db.pool.query("SELECT 1");
    res.json({ ok: true, service: "DYNEX Dashboard", database: "ok", time: new Date().toISOString() });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/auth/")) return next();
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

async function start() {
  await db.initDb();
  app.listen(PORT, () => console.log(`[DYNEX] Dashboard listening on :${PORT}`));
}

start().catch(err => {
  console.error("[DYNEX] Startup failed:", err);
  process.exit(1);
});
