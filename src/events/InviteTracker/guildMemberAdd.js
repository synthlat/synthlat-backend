const Replace = require("../../lib/replace");
const { parseMessage } = require("../../lib/MessageBuilder");

module.exports = {
    name: "guildMemberAdd",
    run: async (client, member) => {
        const guild = member.guild;

        const db = await client.database({ guildId: guild.id }, "modules_invitetracker");
        if (!db || !db.enabled) return;

        const avatarUrl = member.user.avatar
            ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${member.user.discriminator % 5}.png`;

        // Detectar que invite se uso comparando el cache con las actuales
        let usedInvite = null;
        let inviter = null;

        try {
            const cachedInvites = client.inviteCache.get(guild.id) || new Map();
            const currentInvites = await guild.invites.fetch();

            for (const invite of currentInvites.values()) {
                const cachedUses = cachedInvites.get(invite.code) ?? 0;
                if (invite.uses > cachedUses) {
                    usedInvite = invite;
                    inviter = invite.inviter;
                    break;
                }
            }

            // Actualizar cache con los usos actuales
            client.inviteCache.set(guild.id, new Map(currentInvites.map(i => [i.code, i.uses])));

            // Guardar quien invito al miembro para el leaveMessage
            if (usedInvite && inviter) {
                client.inviterMap.set(member.id, {
                    inviterId: inviter.id,
                    inviterTag: inviter.username,
                    code: usedInvite.code,
                    uses: usedInvite.uses,
                });

                // Actualizar contador de invites del invitador en la DB
                if (!db.users) db.users = {};
                if (!db.users[inviter.id]) db.users[inviter.id] = { invites: 0 };
                db.users[inviter.id].invites += 1;
                await db.save();
            }
        } catch (e) {
            client.log(`[InviteTracker] Error al obtener invites: ${e.message}`);
        }

        const inviterInvites = inviter ? (db.users?.[inviter.id]?.invites ?? 1) : 0;

        const messageFromDb = Replace(db.joinMessage, [
            ["{user}", member.user.username],
            ["{server}", guild.name],
            ["{memberCount}", guild.memberCount],
            ["{userId}", member.user.id],
            ["{avatarUrl}", avatarUrl],
            ["{inviter}", inviter?.username || "Desconocido"],
            ["{code}", usedInvite?.code || "Desconocido"],
            ["{uses}", String(usedInvite?.uses ?? 0)],
            ["{inviterInvites}", String(inviterInvites)],
        ]);

        const message = parseMessage(messageFromDb);

        try {
            const channel = await guild.channels.fetch(db.channelId);
            if (channel && typeof channel.send === "function") {
                await channel.send(message);
            }
        } catch (e) {
            client.log(`[InviteTracker] Error al enviar joinMessage: ${e.message}`);
        }
    }
};
