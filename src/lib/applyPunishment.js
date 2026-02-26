/**
 * Aplica el castigo configurado a un miembro.
 * @param {GuildMember} member
 * @param {Guild} guild
 * @param {{ type: string, duration: number }} punishment
 * @param {string} reason
 * @returns {Promise<string>} Texto descriptivo del castigo aplicado
 */
async function applyPunishment(member, guild, punishment, reason) {
    switch (punishment?.type) {
        case "timeout": {
            const ms = (punishment.duration ?? 15) * 60 * 1000;
            await member.timeout(ms, reason);
            return `Timeout de ${punishment.duration ?? 15} minutos`;
        }
        case "kick":
            await member.kick(reason);
            return "Expulsado del servidor";
        case "ban":
            await guild.bans.create(member.id, { deleteMessageSeconds: 86400, reason });
            return "Baneado del servidor";
        default:
            return "Sin castigo aplicado";
    }
}

module.exports = { applyPunishment };
