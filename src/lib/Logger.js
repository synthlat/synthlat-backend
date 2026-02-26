const { EmbedBuilder } = require("discord.js")

async function sendLog({ version = 1, message, guild }) {
    if(!guild || !message) console.log("[ERROR] @Logger: Missing parameters")

    if(typeof guild != "object" || typeof message != "string" || typeof version != "number") {
        console.log("[ERROR] @Logger: Incorrect types")
    }

    if(version === 1) {
        const embed = new EmbedBuilder()
            .setDescription(message)
            .setColor("#842bff")
            .setTimestamp(Date.now())

        const channel = await guild.channels.fetch("1193690833434722427")
        await channel.send({ embeds: [embed] });

    } else {
        console.log("[ERROR] @Logger: Incorrect version")
    }


}

module.exports = { sendLog }