const { ApplicationCommandOptionType } = require("discord.js");

module.exports = {
    name: "simular",
    description: "Simula eventos del bot para pruebas.",
    userPerms: [],
    botPerms: [],
    options: [
        {
            name: "evento",
            description: "Selecciona el evento a simular",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: "Miembros - Ingreso al servidor", value: "guildMemberAdd" },
                { name: "Miembros - Salio del servidor", value: "guildMemberRemove" },
            ]
        },
    ],

    run: async (client, interaction) => {
        const event = interaction.options.getString("evento");

        try {
            await interaction.deferReply({ ephemeral: true });
        } catch (error) {
            console.error("Error al diferir la interaccion:", error);
            return;
        }

        try {
            switch (event) {
                case "guildMemberAdd":
                    client.emit(event, interaction.member);
                    break;
                case "guildMemberRemove":
                    // Pre-poblar inviterMap para que el leaveMessage del InviteTracker tenga datos
                    if (!client.inviterMap) client.inviterMap = new Map();
                    client.inviterMap.set(interaction.member.id, {
                        inviterId: interaction.member.id,
                        inviterTag: interaction.member.user.username + " (simulado)",
                        code: "SIMTEST",
                        uses: 99,
                    });
                    client.emit(event, interaction.member);
                    break;
                default:
                    return interaction.editReply({ content: "Evento no reconocido." });
            }
            await interaction.editReply({ content: `Evento **${event}** simulado correctamente.` });
        } catch (error) {
            console.error(`Error simulando evento ${event}:`, error);
            await interaction.editReply({ content: `Hubo un error al simular el evento **${event}**.` }).catch(() => {});
        }
    }};
