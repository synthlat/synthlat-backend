const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionType, ComponentType } = require("discord.js");
const { applyPunishment } = require("../../lib/applyPunishment");

module.exports = {
    name: "interactionCreate",
    run: async (client, interaction) => {
        if (interaction.type !== InteractionType.MessageComponent) return;
        if (interaction.componentType !== ComponentType.Button) return;

        const { customId, guild, user } = interaction;

        if (!customId.startsWith("rpt_accept_") && !customId.startsWith("rpt_deny_")) return;

        const isAccept = customId.startsWith("rpt_accept_");
        const reportId = customId.replace("rpt_accept_", "").replace("rpt_deny_", "");

        const db = await client.database({ guildId: guild.id }, "modules_reports");
        if (!db || !db.enabled) return;

        // Verificar que quien interactua tiene rol de admin
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) return;

        const hasAdminRole = db.adminRoles?.some(roleId => member.roles.cache.has(roleId));
        if (!hasAdminRole) {
            return interaction.reply({ content: "No tienes permisos para gestionar reportes.", ephemeral: true });
        }

        const reportData = db.pendingReports?.find(r => r.reportId === reportId);
        if (!reportData) {
            return interaction.reply({ content: "Este reporte ya fue procesado o expiró.", ephemeral: true });
        }

        await interaction.deferUpdate();

        // Deshabilitar botones inmediatamente
        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("rpt_accept_done")
                .setLabel("Aceptar")
                .setStyle(ButtonStyle.Success)
                .setEmoji("✅")
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId("rpt_deny_done")
                .setLabel("Denegar")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("❌")
                .setDisabled(true),
        );

        // Construir embed actualizado
        const originalEmbed = interaction.message.embeds[0];
        const updatedEmbed = EmbedBuilder.from(originalEmbed);

        // Reemplazar campo de estado
        const fields = updatedEmbed.data.fields?.filter(f => f.name !== "Estado") ?? [];

        if (isAccept) {
            let punishmentText = "Sin castigo";

            try {
                const reportedMember = await guild.members.fetch(reportData.reportedUserId).catch(() => null);
                if (reportedMember) {
                    const reason = `Reporte aceptado por ${user.username}`;
                    punishmentText = await applyPunishment(reportedMember, guild, db.punishment, reason);
                } else {
                    punishmentText = "Usuario ya no está en el servidor";
                }
            } catch (e) {
                client.log(`[Reports] Error al aplicar castigo: ${e.message}`);
                punishmentText = `Error: ${e.message}`;
            }

            fields.push({
                name: "Estado",
                value: `✅ **Aceptado** por <@${user.id}> (${user.username})\n**Castigo:** ${punishmentText}`,
            });
            updatedEmbed.setColor("#22c55e");
        } else {
            fields.push({
                name: "Estado",
                value: `❌ **Denegado** por <@${user.id}> (${user.username})`,
            });
            updatedEmbed.setColor("#ef4444");
        }

        updatedEmbed.setFields(...fields);

        await interaction.message.edit({ embeds: [updatedEmbed], components: [disabledRow] });

        db.pendingReports = db.pendingReports.filter(r => r.reportId !== reportId);
        await db.save().catch(e => client.log(`[Reports] Error guardando DB: ${e.message}`));
    }
};
