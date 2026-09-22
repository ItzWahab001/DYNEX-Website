# DYNEX Dashboard

A real DYNEX Discord dashboard foundation with the DYNEX blue/black visual identity, Discord OAuth2 login, server selection, permission checks, bot-install checks, live Discord guild/role/channel data, PostgreSQL-backed settings, audit logs, rate limiting, Helmet and a health endpoint.

## What is real
- Discord OAuth2 login (identify + guilds)
- Only servers where the logged-in user has Manage Server/Administrator are shown
- Verifies DYNEX is installed before dashboard configuration
- Reads live guild, role and channel data through Discord API
- Saves dashboard settings to PostgreSQL
- Audit log for settings changes
- Secure server-side bot token handling
- Responsive DYNEX-themed UI

## Important integration note
The dashboard cannot magically change every existing bot subsystem unless the bot reads these settings. This package stores configuration in PostgreSQL so the existing ASTRYX/DYNEX bot can consume the same settings. Add a small bot-side bridge/repository that reads `dashboard_guild_settings` and applies each module's configuration. Do NOT put BOT_TOKEN or DISCORD_CLIENT_SECRET in the frontend.

## Local / Railway
1. Copy `.env.example` to `.env`.
2. Set `DASHBOARD_URL` to the public dashboard URL.
3. In Discord Developer Portal add `${DASHBOARD_URL}/auth/discord/callback` as an OAuth2 redirect URI.
4. Set `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DATABASE_URL`, and a long `SESSION_SECRET`.
5. `npm install && npm start`.

For Railway, deploy this folder as a separate service in the same project as the bot and PostgreSQL. Set `DATABASE_URL` to the Railway Postgres variable/reference. Keep secrets in Railway Variables, never in GitHub.
