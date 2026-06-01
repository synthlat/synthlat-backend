const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, InteractionType, ComponentType, PermissionFlagsBits } = require("discord.js");
const discordTranscripts = require("discord-html-transcripts");

function buildEmbeds(embedData) {
    if (!embedData?.length) return [];
    return embedData.map(e => {
        const eb = new EmbedBuilder();
        if (e.title) eb.setTitle(e.title);
        if (e.description) eb.setDescription(e.description);
        if (e.color) eb.setColor(e.color);
        if (e.footer?.text) eb.setFooter(e.footer);
        if (e.image) eb.setImage(e.image);
        if (e.thumbnail) eb.setThumbnail(e.thumbnail);
        return eb;
    });
}

function buildControlRow(claimed, claimer) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("tkt_claim")
            .setLabel(claimed ? `Reclamado por ${claimer}` : "Reclamar")
            .setStyle(claimed ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setEmoji("🙋")
            .setDisabled(!!claimed),
        new ButtonBuilder()
            .setCustomId("tkt_close")
            .setLabel("Cerrar Ticket")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("🔒"),
    );
}

module.exports = {
    name: "interactionCreate",
    run: async (client, interaction) => {
        if (interaction.type !== InteractionType.MessageComponent) return;

        const { customId, guild, user } = interaction;

        if (!client.cooldowns) client.cooldowns = new Map();
        const cooldownKey = `tkt_comp_${user.id}_${customId}`;
        if (client.cooldowns.has(cooldownKey)) {
            return interaction.reply({ content: "Espera unos segundos antes de realizar esta acción.", ephemeral: true });
        }
        client.cooldowns.set(cooldownKey, Date.now());
        setTimeout(() => client.cooldowns.delete(cooldownKey), 3000);

        // ─── Selección de categoría → crear ticket ───────────────────────────
        if (interaction.componentType === ComponentType.StringSelect && customId.startsWith("tkt_select_")) {
            const panelId = customId.replace("tkt_select_", "");

            const db = await client.database({ guildId: guild.id }, "modules_tickets");
            if (!db || !db.enabled) return;

            const panel = db.panels?.find(p => p.id === panelId);
            if (!panel) return;

            const categoryValue = interaction.values[0];
            const category = panel.categories?.find(c => c.value === categoryValue);
            if (!category) return;

            await interaction.deferReply({ ephemeral: true });

            // Verificar ticket ya abierto
            if (!db.activeTickets) db.activeTickets = [];
            const existing = db.activeTickets.find(
                t => t.userId === user.id && t.panelId === panelId && t.categoryValue === categoryValue
            );
            if (existing) {
                return interaction.editReply({ content: `Ya tienes un ticket abierto en esta categoría: <#${existing.channelId}>` });
            }

            // Número y nombre del canal
            if (!panel.ticketCount) panel.ticketCount = 0;
            panel.ticketCount++;
            const channelName = (panel.namingScheme || "ticket-{number}").replace("{number}", panel.ticketCount);

            // Roles de soporte: general del panel + específicos de la categoría
            const supportRoleIds = [...new Set([...(panel.supportRoles ?? []), ...(category.supportRoles ?? [])])];

            const permissionOverwrites = [
                { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
                ...supportRoleIds.map(roleId => ({
                    id: roleId,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                })),
            ];

            let ticketChannel;
            try {
                ticketChannel = await guild.channels.create({
                    name: channelName,
                    parent: category.categoryId ?? null,
                    permissionOverwrites,
                });
            } catch (e) {
                client.log(`[Tickets] Error al crear canal: ${e.message}`);
                return interaction.editReply({ content: "Error al crear el ticket. Inténtalo de nuevo." });
            }

            // Mensaje de bienvenida con botones de reclamar y cerrar
            const ticketContent = (category.ticketMessage?.content || "").replace("{user}", `<@${user.id}>`);
            const ticketEmbeds = buildEmbeds(category.ticketMessage?.embeds);

            const controlMsg = await ticketChannel.send({
                content: ticketContent || null,
                embeds: ticketEmbeds,
                components: [buildControlRow(false, null)],
            }).catch(() => null);

            // Persistir en DB
            db.activeTickets.push({
                channelId: ticketChannel.id,
                userId: user.id,
                panelId,
                categoryValue,
                number: panel.ticketCount,
                controlMessageId: controlMsg?.id ?? null,
                claimedBy: null,
            });
            await db.save().catch(e => client.log(`[Tickets] Error guardando DB: ${e.message}`));

            // Refrescar el panel para reiniciar el select menu
            try {
                const panelChannel = await guild.channels.fetch(panel.channelId).catch(() => null);
                if (panelChannel && panel.messageId) {
                    const panelMessage = await panelChannel.messages.fetch(panel.messageId).catch(() => null);
                    if (panelMessage) {
                        const freshSelect = new StringSelectMenuBuilder()
                            .setCustomId(`tkt_select_${panel.id}`)
                            .setPlaceholder("Selecciona una categoría...")
                            .addOptions(panel.categories.map(cat => {
                                const opt = { label: cat.label, value: cat.value };
                                if (cat.description) opt.description = cat.description;
                                if (cat.emoji) opt.emoji = cat.emoji;
                                return opt;
                            }));
                        await panelMessage.edit({ components: [new ActionRowBuilder().addComponents(freshSelect)] });
                    }
                }
            } catch (e) {
                client.log(`[Tickets] Error al refrescar panel: ${e.message}`);
            }

            return interaction.editReply({ content: `✅ Ticket creado: <#${ticketChannel.id}>` });
        }

        // ─── Reclamar ticket ──────────────────────────────────────────────────
        if (interaction.componentType === ComponentType.Button && customId === "tkt_claim") {
            const db = await client.database({ guildId: guild.id }, "modules_tickets");
            if (!db || !db.enabled) return;

            const ticketData = db.activeTickets?.find(t => t.channelId === interaction.channel.id);
            if (!ticketData) return;

            // Solo roles de soporte pueden reclamar
            const panel = db.panels?.find(p => p.id === ticketData.panelId);
            const category = panel?.categories?.find(c => c.value === ticketData.categoryValue);
            const supportRoleIds = [...new Set([...(panel?.supportRoles ?? []), ...(category?.supportRoles ?? [])])];

            const member = await guild.members.fetch(user.id).catch(() => null);
            const isSupport = supportRoleIds.some(roleId => member?.roles.cache.has(roleId));

            if (!isSupport) {
                return interaction.reply({ content: "Solo el staff puede reclamar tickets.", ephemeral: true });
            }

            if (ticketData.claimedBy) {
                return interaction.reply({ content: `Este ticket ya fue reclamado por <@${ticketData.claimedBy}>.`, ephemeral: true });
            }

            ticketData.claimedBy = user.id;
            await db.save().catch(e => client.log(`[Tickets] Error guardando DB: ${e.message}`));

            await interaction.deferUpdate().catch(() => {});

            // Actualizar botones del mensaje de control
            if (ticketData.controlMessageId) {
                const ctrlMsg = await interaction.channel.messages.fetch(ticketData.controlMessageId).catch(() => null);
                if (ctrlMsg) await ctrlMsg.edit({ components: [buildControlRow(true, user.username)] }).catch(() => {});
            }

            await interaction.channel.send({ content: `🙋 <@${user.id}> ha reclamado este ticket.` }).catch(() => {});
        }

        // ─── Cerrar ticket ────────────────────────────────────────────────────
        if (interaction.componentType === ComponentType.Button && customId === "tkt_close") {
            const db = await client.database({ guildId: guild.id }, "modules_tickets");
            if (!db || !db.enabled) return;

            const ticketData = db.activeTickets?.find(t => t.channelId === interaction.channel.id);
            if (!ticketData) {
                return interaction.reply({ content: "No se encontró información de este ticket.", ephemeral: true });
            }

            // Verificar permisos: creador o rol de soporte
            const panel = db.panels?.find(p => p.id === ticketData.panelId);
            const category = panel?.categories?.find(c => c.value === ticketData.categoryValue);
            const supportRoleIds = [...new Set([...(panel?.supportRoles ?? []), ...(category?.supportRoles ?? [])])];

            const member = await guild.members.fetch(user.id).catch(() => null);
            const isCreator = ticketData.userId === user.id;
            const isSupport = supportRoleIds.some(roleId => member?.roles.cache.has(roleId));

            if (!isCreator && !isSupport) {
                return interaction.reply({ content: "No tienes permiso para cerrar este ticket.", ephemeral: true });
            }

            await interaction.deferUpdate().catch(() => {});

            // Generar transcript y enviar al creador por DM
            try {
                const transcriptFile = await discordTranscripts.createTranscript(interaction.channel, {
                    limit: 1000,
                    filename: `transcript-${interaction.channel.name}.html`,
                    poweredBy: false,
                });
                const creator = await client.users.fetch(ticketData.userId).catch(() => null);
                if (creator) {
                    await creator.send({
                        content: `📋 Transcript de tu ticket **${interaction.channel.name}** (cerrado por ${user.username}):`,
                        files: [transcriptFile],
                    }).catch(() => {});
                }
            } catch (e) {
                client.log(`[Tickets] Error al generar transcript: ${e.message}`);
            }

            // Eliminar de DB y borrar canal
            db.activeTickets = db.activeTickets.filter(t => t.channelId !== interaction.channel.id);
            await db.save().catch(e => client.log(`[Tickets] Error guardando DB: ${e.message}`));

            await interaction.channel.delete(`Ticket cerrado por ${user.username}`).catch(() => {});
        }
    }
};
