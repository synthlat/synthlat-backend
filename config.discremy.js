require('dotenv').config();
const { GatewayIntentBits } = require("discord.js")

module.exports = {
    bot: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
    },
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [],
    api: {
        enabled: false,
        port: 3000
    },
    modules: {
        mongodb: {
            enabled: true,
            uri: process.env.MONGO_URI,
            name: process.env.DB_NAME,
        }
    },
    color: {
        red: "#ffffff"
    },
    encryptionKey: process.env.ENCRYPTION_KEY
}