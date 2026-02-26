const Replace = require("../lib/replace")
const { parseMessage } = require("../lib/MessageBuilder")
const { sendLog } = require("../lib/Logger")

module.exports = {
    name: "guildMemberRemove",
    run: async (client, member) => {
        const guild = member.guild;
        const avatarUrl = member.user.avatar ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${member.user.discriminator % 5}.png`;

        let db = await client.database({ guildId: guild.id}, "modules_bye");

        if (!db) return;

        const messageFromDb = Replace(db.message,
            [
                ["{user}", member.user.username],
                ["{server}", guild.name],
                ["{memberCount}", guild.memberCount],
                ["{userId}", member.user.id],
                ["{avatarUrl}", avatarUrl],
            ]
        );

        const message = parseMessage(messageFromDb);

        const channelId = db.channelId;

        try {
            const channel = await guild.channels.fetch(channelId);
            if(channel && typeof channel.send === 'function') {
                await channel.send(message);
            } else {
                client.log(`[BYE] No se encontro el canal especificado en ${guild.id}`)
                await sendLog({ message: "**Error!** No se configuro un canal donde enviar las despedidas.", guild })
            }

        } catch(e) {
            client.log("[BYE]", e);
            await sendLog({ message: "**Error!** Configuracion incorrecta del modulo de Despedidas", guild })
        }

    }}