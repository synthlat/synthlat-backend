const Replace = require("../../lib/replace");
const { parseMessage } = require("../../lib/MessageBuilder");

module.exports = {
    name: "guildMemberRemove",
    run: async (client, member) => {
        const guild = member.guild;

        const db = await client.database({ guildId: guild.id }, "modules_invitetracker");
        if (!db || !db.enabled) return;

        const avatarUrl = member.user.avatar
            ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${member.user.discriminator % 5}.png`;

        const inviterData = client.inviterMap?.get(member.id);

        const messageFromDb = Replace(db.leaveMessage, [
            ["{user}", member.user.username],
            ["{server}", guild.name],
            ["{memberCount}", guild.memberCount],
            ["{userId}", member.user.id],
            ["{avatarUrl}", avatarUrl],
            ["{inviter}", inviterData?.inviterTag || "Desconocido"],
            ["{code}", inviterData?.code || "Desconocido"],
        ]);

        const message = parseMessage(messageFromDb);

        try {
            const channel = await guild.channels.fetch(db.channelId);
            if (channel && typeof channel.send === "function") {
                await channel.send(message);
            }
        } catch (e) {
            client.log(`[InviteTracker] Error al enviar leaveMessage: ${e.message}`);
        }

        // Limpiar del mapa una vez que salio
        client.inviterMap?.delete(member.id);
    }
};
