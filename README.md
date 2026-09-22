# DYNEX Dashboard Pro

A production-oriented Discord dashboard inspired by the layout and information density shown in the supplied reference video, with a stronger DYNEX blue/black visual system.

## Included
- Discord OAuth2 (`identify guilds`) with CSRF state
- Persistent PostgreSQL Express sessions
- Railway/reverse-proxy-safe cookies
- Server selection restricted to servers where the user has Manage Server/Admin
- Verification that DYNEX is installed in the selected server
- Live guild, channel and role counts from Discord
- PostgreSQL-backed guild settings
- Audit log
- Responsive mobile dashboard with collapsible sidebar
- Modules: Moderation, Security, AutoMod, Welcome, Roles, Tickets, Giveaways, Music, Community, AI, Logging
- No bot token in frontend code

## Railway deployment

Create a separate Railway service from this folder/repository.

Set:
- `NODE_ENV=production`
- `DASHBOARD_URL=https://YOUR-RAILWAY-DOMAIN`
- `DISCORD_CLIENT_ID=1550980325176246342`
- `DISCORD_CLIENT_SECRET=<Discord Developer Portal Client Secret>`
- `DISCORD_BOT_TOKEN=${{ASTRYX.BOT_TOKEN}}`
- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `SESSION_SECRET=<32+ random characters>`
- `SUPPORT_SERVER=https://discord.gg/bXXFRQ82z`

Discord Developer Portal → OAuth2 → Redirects:
`https://YOUR-RAILWAY-DOMAIN/auth/discord/callback`

The frontend uses the same DYNEX theme but the backend is required for OAuth, sessions and PostgreSQL.

## Bot bridge

The dashboard persists JSON settings in:
`dynex_dashboard_guild_settings`

Your DYNEX bot should read that table (or expose a small internal service/repository) and apply module settings to its real subsystems. The dashboard deliberately does not pretend that a UI toggle can change an unrelated bot module by itself.

## Local
```bash
cp .env.example .env
npm install
npm start
```
