const axios = require("axios");
const crypto = require("crypto");

const API = "https://discord.com/api/v10";
const clientId = process.env.DISCORD_CLIENT_ID;
const redirectUri = `${process.env.DASHBOARD_URL}/auth/discord/callback`;

function oauthUrl(state) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds",
    state
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

function randomState() {
  return crypto.randomBytes(24).toString("hex");
}

async function tokenExchange(code) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: process.env.DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri
  });
  const { data } = await axios.post(`${API}/oauth2/token`, body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 10000
  });
  return data;
}

async function api(path, token) {
  const { data } = await axios.get(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 10000
  });
  return data;
}

async function botApi(path) {
  const { data } = await axios.get(`${API}${path}`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    timeout: 10000
  });
  return data;
}

function canManage(guild) {
  const p = BigInt(guild.permissions || "0");
  return (p & 8n) !== 0n || (p & 32n) !== 0n;
}

async function user(token) { return api("/users/@me", token); }
async function userGuilds(token) { return api("/users/@me/guilds", token); }
async function botGuilds() { return botApi("/users/@me/guilds"); }
async function guild(guildId) { return botApi(`/guilds/${guildId}`); }
async function roles(guildId) { return botApi(`/guilds/${guildId}/roles`); }
async function channels(guildId) { return botApi(`/guilds/${guildId}/channels`); }

module.exports = {
  oauthUrl, randomState, tokenExchange, user, userGuilds, botGuilds,
  guild, roles, channels, canManage
};
