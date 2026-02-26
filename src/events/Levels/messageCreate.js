const Replace = require("../../lib/replace");
const { parseMessage } = require("../../lib/MessageBuilder");
const { xpForNextLevel } = require("../../lib/levelUtils");

module.exports = {
    name: "messageCreate",
    run: async (client, message) => {
        if (message.author.bot || !message.guild) return;

        const guild = message.guild;
        const db = await client.database({ guildId: guild.id }, "modules_levels");
        if (!db || !db.enabled) return;

        const userId = message.author.id;
        const now = Date.now();
        const cooldownMs = (db.xpRates?.cooldown ?? 60) * 1000;

        // Determinar tipo de accion y XP antes del cooldown
        let xpGain;
        let actionType;
        if (message.attachments.size > 0) {
            xpGain = db.xpRates?.image ?? 25;
            actionType = "image";
        } else if (message.reference) {
            xpGain = db.xpRates?.reply ?? 20;
            actionType = "reply";
        } else {
            xpGain = db.xpRates?.message ?? 15;
            actionType = "message";
        }

        // Cooldown independiente por usuario y tipo de accion
        if (!client.levelCooldowns) client.levelCooldowns = new Map();
        if (!client.levelCooldowns.has(guild.id)) client.levelCooldowns.set(guild.id, new Map());
        const guildCooldowns = client.levelCooldowns.get(guild.id);
        const cooldownKey = `${userId}:${actionType}`;
        if (now - (guildCooldowns.get(cooldownKey) ?? 0) < cooldownMs) return;
        guildCooldowns.set(cooldownKey, now);

        // Inicializar datos del usuario si no existen
        if (!db.users) db.users = {};
        if (!db.users[userId]) db.users[userId] = { xp: 0, level: 0 };

        const userData = db.users[userId];
        userData.xp += xpGain;

        // Verificar subida de nivel
        const { base, multiplier } = db.curve;
        let leveledUp = false;

        while (userData.xp >= xpForNextLevel(userData.level, base, multiplier)) {
            userData.xp -= xpForNextLevel(userData.level, base, multiplier);
            userData.level += 1;
            leveledUp = true;
        }

        await db.save();

        if (!leveledUp) return;

        // Enviar notificacion de subida de nivel
        const { type, channelId, message: notifTemplate } = db.notification;
        if (type === "none" || !notifTemplate) return;

        // Clonar para no mutar el documento de la DB
        const notifMessage = JSON.parse(JSON.stringify(notifTemplate));

        const payload = parseMessage(Replace(notifMessage, [
            ["{user}", `<@${userId}>`],
            ["{level}", String(userData.level)],
            ["{server}", guild.name],
        ]));

        try {
            switch (type) {
                case "current":
                    await message.channel.send(payload);
                    break;
                case "channel": {
                    if (!channelId) break;
                    const channel = await guild.channels.fetch(channelId);
                    if (channel && typeof channel.send === "function") {
                        await channel.send(payload);
                    }
                    break;
                }
                case "dm":
                    await message.author.send(payload).catch(() => {});
                    break;
            }
        } catch (e) {
            client.log(`[Levels] Error al enviar notificacion: ${e.message}`);
        }
    }
};
