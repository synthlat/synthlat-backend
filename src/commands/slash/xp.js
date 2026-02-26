const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const { xpForNextLevel, progressBar } = require("../../lib/levelUtils");

module.exports = {
    name: "xp",
    description: "Muestra el nivel y XP de un usuario en el servidor.",
    userPerms: [],
    botPerms: [],
    options: [
        {
            name: "usuario",
            description: "Usuario a consultar (deja vacío para verte a ti mismo)",
            type: ApplicationCommandOptionType.User,
            required: false,
        }
    ],

    run: async (client, interaction) => {
        try {
            await interaction.deferReply({ ephemeral: false });
        } catch (error) {
            console.error("Error al diferir la interaccion:", error);
            return;
        }

        const target = interaction.options.getUser("usuario") ?? interaction.user;
        const guild = interaction.guild;

        const db = await client.database({ guildId: guild.id }, "modules_levels");
        if (!db || !db.enabled) {
            return interaction.editReply({ content: "El módulo de niveles no está activado en este servidor." });
        }

        const userData = db.users?.[target.id] ?? { xp: 0, level: 0 };
        const { base, multiplier } = db.curve;
        const xpNeeded = xpForNextLevel(userData.level, base, multiplier);
        const percent = Math.round((userData.xp / xpNeeded) * 100);
        const bar = progressBar(userData.xp, xpNeeded);

        const embed = new EmbedBuilder()
            .setColor("#842bff")
            .setAuthor({
                name: target.username,
                iconURL: target.displayAvatarURL({ dynamic: true }),
            })
            .addFields(
                { name: "Nivel", value: `**${userData.level}**`, inline: true },
                { name: "XP", value: `**${userData.xp}** / ${xpNeeded}`, inline: true },
                { name: `Progreso — ${percent}%`, value: bar },
            )
            .setFooter({ text: `${guild.name}` });

        await interaction.editReply({ embeds: [embed] });
    }
};
