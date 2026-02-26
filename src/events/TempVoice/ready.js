module.exports = {
    name: "ready",
    run: async (client) => {
        if (!client.tempVoiceChannels) client.tempVoiceChannels = new Map();

        for (const guild of client.guilds.cache.values()) {
            const db = await client.database({ guildId: guild.id }, "modules_tempvoice").catch(() => null);
            if (!db || !db.enabled || !db.activeChannels?.length) continue;

            const surviving = [];

            for (const channelId of db.activeChannels) {
                const channel = guild.channels.cache.get(channelId)
                    ?? await guild.channels.fetch(channelId).catch(() => null);

                if (!channel || channel.members.size === 0) {
                    // Canal vacío o ya no existe, eliminar
                    await channel?.delete("Canal temporal vacío (limpieza al iniciar)").catch(() => {});
                } else {
                    // Canal con miembros, mantenerlo registrado en memoria
                    surviving.push(channelId);
                    client.tempVoiceChannels.set(channelId, { guildId: guild.id, creatorId: null });
                }
            }

            db.activeChannels = surviving;
            await db.save();
        }

        client.log("[TempVoice] Cleanup completado.");
    }
};
