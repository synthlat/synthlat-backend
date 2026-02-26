const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ApplicationCommandOptionType, PermissionFlagsBits } = require("discord.js");

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

module.exports = {
    name: "tickets",
    description: "Gestiona el módulo de tickets.",
    userPerms: ["ManageGuild"],
    botPerms: [],
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "panel",
            description: "Envía el panel de tickets al canal configurado.",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "nombre",
                    description: "Nombre del panel a enviar (deja vacío para enviar todos)",
                    required: false,
                    autocomplete: true,
                },
            ],
        },
    ],

    autocomplete: async (client, interaction) => {
        const focused = interaction.options.getFocused().toLowerCase();
        const db = await client.database({ guildId: interaction.guild.id }, "modules_tickets").catch(() => null);
        const panels = db?.panels ?? [];

        const choices = panels
            .filter(p => p.name.toLowerCase().includes(focused))
            .slice(0, 25)
            .map(p => ({ name: p.name, value: p.name }));

        await interaction.respond(choices);
    },

    run: async (client, interaction) => {
        try {
            await interaction.deferReply({ ephemeral: true });
        } catch (error) {
            console.error("Error al diferir la interaccion:", error);
            return;
        }

        const sub = interaction.options.getSubcommand();
        const guild = interaction.guild;

        if (sub === "panel") {
            const panelName = interaction.options.getString("nombre");

            const db = await client.database({ guildId: guild.id }, "modules_tickets");
            if (!db || !db.enabled) {
                return interaction.editReply({ content: "El módulo de tickets no está activado." });
            }

            let panels = db.panels ?? [];
            if (panelName) {
                panels = panels.filter(p => p.name.toLowerCase() === panelName.toLowerCase());
                if (!panels.length) {
                    return interaction.editReply({ content: `No se encontró un panel con el nombre **${panelName}**.` });
                }
            }

            if (!panels.length) {
                return interaction.editReply({ content: "No hay paneles configurados." });
            }

            let sent = 0;
            for (const panel of panels) {
                if (!panel.categories?.length) continue;

                const channel = await guild.channels.fetch(panel.channelId).catch(() => null);
                if (!channel || typeof channel.send !== "function") continue;

                const embeds = buildEmbeds(panel.panelMessage?.embeds);
                const content = panel.panelMessage?.content || null;

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`tkt_select_${panel.id}`)
                    .setPlaceholder("Selecciona una categoría...")
                    .addOptions(panel.categories.map(cat => {
                        const opt = { label: cat.label, value: cat.value };
                        if (cat.description) opt.description = cat.description;
                        if (cat.emoji) opt.emoji = cat.emoji;
                        return opt;
                    }));

                const row = new ActionRowBuilder().addComponents(selectMenu);

                const sentMsg = await channel.send({ content, embeds, components: [row] }).catch(e => {
                    client.log(`[Tickets] Error al enviar panel "${panel.name}": ${e.message}`);
                    return null;
                });

                if (sentMsg) {
                    panel.messageId = sentMsg.id;
                    sent++;
                }
            }

            if (sent > 0) await db.save();

            return interaction.editReply({ content: `✅ ${sent} panel(es) enviado(s).` });
        }
    }
};
