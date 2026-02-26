const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");

module.exports = {
    name: "amigos",
    description: "Gestiona tu lista de amigos del bot.",
    userPerms: [],
    botPerms: [],
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "agregar",
            description: "Agrega un usuario a tu lista de amigos.",
            options: [
                {
                    type: ApplicationCommandOptionType.User,
                    name: "usuario",
                    description: "Usuario a agregar",
                    required: true,
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "eliminar",
            description: "Elimina un usuario de tu lista de amigos.",
            options: [
                {
                    type: ApplicationCommandOptionType.User,
                    name: "usuario",
                    description: "Usuario a eliminar",
                    required: true,
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "lista",
            description: "Muestra tu lista de amigos.",
        },
    ],

    run: async (client, interaction) => {
        try {
            await interaction.deferReply({ ephemeral: true });
        } catch (error) {
            console.error("Error al diferir la interaccion:", error);
            return;
        }

        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        const db = await client.database({ userId }, "users");
        if (!db.friends) db.friends = [];

        if (sub === "agregar") {
            const target = interaction.options.getUser("usuario");

            if (target.id === userId) {
                return interaction.editReply({ content: "No puedes agregarte a ti mismo." });
            }
            if (target.bot) {
                return interaction.editReply({ content: "No puedes agregar bots." });
            }
            if (db.friends.includes(target.id)) {
                return interaction.editReply({ content: `**${target.username}** ya está en tu lista de amigos.` });
            }

            db.friends.push(target.id);
            await db.save();

            return interaction.editReply({ content: `✅ **${target.username}** agregado a tu lista de amigos.` });
        }

        if (sub === "eliminar") {
            const target = interaction.options.getUser("usuario");

            if (!db.friends.includes(target.id)) {
                return interaction.editReply({ content: `**${target.username}** no está en tu lista de amigos.` });
            }

            db.friends = db.friends.filter(id => id !== target.id);
            await db.save();

            return interaction.editReply({ content: `✅ **${target.username}** eliminado de tu lista de amigos.` });
        }

        if (sub === "lista") {
            if (!db.friends.length) {
                return interaction.editReply({ content: "Tu lista de amigos está vacía. Usa `/amigos agregar` para añadir amigos." });
            }

            const embed = new EmbedBuilder()
                .setColor("#5865f2")
                .setTitle("👥 Tu lista de amigos")
                .setDescription(db.friends.map((id, i) => `${i + 1}. <@${id}>`).join("\n"))
                .setFooter({ text: `${db.friends.length} amigo(s) en total` });

            return interaction.editReply({ embeds: [embed] });
        }
    }
};
