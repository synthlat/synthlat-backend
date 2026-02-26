const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionType, ComponentType, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: "interactionCreate",
    run: async (client, interaction) => {
        if (interaction.type !== InteractionType.MessageComponent) return;
        if (interaction.componentType !== ComponentType.Button) return;

        const { customId, guild, user } = interaction;

        if (!customId.startsWith("tv_public_") && !customId.startsWith("tv_private_")) return;

        const isPublic = customId.startsWith("tv_public_");
        const channelId = customId.replace("tv_public_", "").replace("tv_private_", "");

        // Verificar que el canal temporal sigue activo
        if (!client.tempVoiceChannels?.has(channelId)) {
            return interaction.reply({ content: "Este canal ya no existe o expiró.", ephemeral: true });
        }

        // Solo el creador puede modificar el canal
        const channelData = client.tempVoiceChannels.get(channelId);
        if (channelData.creatorId !== user.id) {
            return interaction.reply({ content: "Solo el creador del canal puede modificarlo.", ephemeral: true });
        }

        const voiceChannel = guild.channels.cache.get(channelId);
        if (!voiceChannel) {
            return interaction.reply({ content: "No se encontró el canal de voz.", ephemeral: true });
        }

        await interaction.deferUpdate();

        try {
            if (isPublic) {
                // Modo público: solo mantener los permisos de mod del creador
                await voiceChannel.permissionOverwrites.set([
                    { id: channelData.creatorId, allow: [PermissionFlagsBits.MoveMembers, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers] },
                ]);
            } else {
                // Modo privado: bloquear @everyone, permitir al creador y sus amigos
                const friendsDb = await client.database({ userId: user.id }, "users");
                const friendIds = friendsDb?.friends ?? [];

                // Fetchear solo los amigos que están en el servidor (evita error de resolución)
                const friendMembers = (
                    await Promise.all(friendIds.map(id => guild.members.fetch(id).catch(() => null)))
                ).filter(m => m !== null);

                const overwrites = [
                    { id: guild.roles.everyone, deny: [PermissionFlagsBits.Connect] },
                    { id: user.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers] },
                    ...friendMembers.map(m => ({ id: m.id, allow: [PermissionFlagsBits.Connect] })),
                ];

                await voiceChannel.permissionOverwrites.set(overwrites);
            }
        } catch (e) {
            client.log(`[TempVoice] Error al cambiar modo del canal: ${e.message}`);
            return;
        }

        // Actualizar el panel con el nuevo estado
        const updatedEmbed = new EmbedBuilder()
            .setColor(isPublic ? "#22c55e" : "#ef4444")
            .setTitle("🎙️ Panel de Control")
            .setDescription(`Canal creado por <@${channelData.creatorId}>. Modo actual: **${isPublic ? "🌐 Público" : "🔒 Privado"}**`)
            .addFields(
                { name: "🌐 Público", value: "Cualquier miembro puede unirse libremente.", inline: true },
                { name: "🔒 Privado", value: "Solo tus amigos del bot pueden unirse. Usa `/amigos` para gestionar tu lista.", inline: true },
            );

        const updatedRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`tv_public_${channelId}`)
                .setLabel("Público")
                .setStyle(ButtonStyle.Success)
                .setEmoji("🌐")
                .setDisabled(isPublic),
            new ButtonBuilder()
                .setCustomId(`tv_private_${channelId}`)
                .setLabel("Privado")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🔒")
                .setDisabled(!isPublic),
        );

        await interaction.message.edit({ embeds: [updatedEmbed], components: [updatedRow] });
    }
};
