const { ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: "voiceStateUpdate",
    run: async (client, oldState, newState) => {
        const guild = newState.guild ?? oldState.guild;

        const db = await client.database({ guildId: guild.id }, "modules_tempvoice");
        if (!db || !db.enabled) return;

        if (!client.tempVoiceChannels) client.tempVoiceChannels = new Map();
        if (!db.activeChannels) db.activeChannels = [];

        // Usuario entró al canal "crear canal temporal"
        if (newState.channelId === db.channelId) {
            const member = newState.member;

            // Prevención de DoS: Límite de 1 canal por usuario
            const userHasChannel = [...client.tempVoiceChannels.entries()].find(
                ([, ch]) => ch.creatorId === member.id && ch.guildId === guild.id
            );

            if (userHasChannel) {
                try { await member.voice.setChannel(userHasChannel[0]); } catch (e) {}
                return;
            }

            // Verificar roles permitidos
            if (db.allowedRoles?.length) {
                const hasRole = db.allowedRoles.some(roleId => member.roles.cache.has(roleId));
                if (!hasRole) return;
            }

            const channelName = (db.channelName || "{user}'s Channel").replace("{user}", member.user.username);

            try {
                const tempChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildVoice,
                    parent: db.categoryId ?? null,
                    userLimit: db.defaultLimit ?? 3,
                    permissionOverwrites: [
                        {
                            id: member.id,
                            allow: [
                                PermissionFlagsBits.MoveMembers,
                                PermissionFlagsBits.MuteMembers,
                                PermissionFlagsBits.DeafenMembers,
                            ],
                        },
                    ],
                });

                await member.voice.setChannel(tempChannel);

                client.tempVoiceChannels.set(tempChannel.id, {
                    guildId: guild.id,
                    creatorId: member.id,
                });

                // Persistir en DB
                db.activeChannels.push(tempChannel.id);
                await db.save().catch(e => client.log(`[TempVoice] Error guardando DB: ${e.message}`));

                // Enviar panel de control en el chat del canal de voz
                const panelEmbed = new EmbedBuilder()
                    .setColor("#5865f2")
                    .setTitle("🎙️ Panel de Control")
                    .setDescription(`Canal creado por <@${member.id}>. Configura la visibilidad:`)
                    .addFields(
                        { name: "🌐 Público", value: "Cualquier miembro puede unirse libremente.", inline: true },
                        { name: "🔒 Privado", value: "Solo tus amigos del bot pueden unirse. Usa `/amigos` para gestionar tu lista.", inline: true },
                    );

                const panelRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`tv_public_${tempChannel.id}`)
                        .setLabel("Público")
                        .setStyle(ButtonStyle.Success)
                        .setEmoji("🌐"),
                    new ButtonBuilder()
                        .setCustomId(`tv_private_${tempChannel.id}`)
                        .setLabel("Privado")
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji("🔒"),
                );

                await tempChannel.send({ embeds: [panelEmbed], components: [panelRow] });
            } catch (e) {
                client.log(`[TempVoice] Error al crear canal temporal: ${e.message}`);
            }
        }

        // Usuario salió de un canal temporal
        if (oldState.channelId && client.tempVoiceChannels.has(oldState.channelId)) {
            const oldChannel = oldState.channel;

            if (oldChannel && oldChannel.members.size === 0) {
                try {
                    await oldChannel.delete("Canal temporal vacío");
                } catch (e) {
                    client.log(`[TempVoice] Error al eliminar canal temporal: ${e.message}`);
                } finally {
                    client.tempVoiceChannels.delete(oldState.channelId);
                    db.activeChannels = db.activeChannels.filter(id => id !== oldState.channelId);
                    await db.save().catch(e => client.log(`[TempVoice] Error guardando DB: ${e.message}`));
                }
            }
        }
    }
};
