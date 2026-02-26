module.exports = {
    name: "ready",
    run: async (client) => {
        client.inviteCache = new Map();
        client.inviterMap = new Map();

        for (const guild of client.guilds.cache.values()) {
            try {
                const invites = await guild.invites.fetch();
                client.inviteCache.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
            } catch (e) {
                // Sin permisos MANAGE_GUILD en este servidor
            }
        }

        client.log("[InviteTracker] Invite cache initialized.");
    }
};
