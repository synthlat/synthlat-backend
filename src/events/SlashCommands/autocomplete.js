const { InteractionType } = require("discord.js");

module.exports = {
    name: "interactionCreate",
    run: async (client, interaction) => {
        if (interaction.type !== InteractionType.ApplicationCommandAutocomplete) return;

        const command = client.slashCommands.get(interaction.commandName);
        if (!command?.autocomplete) return;

        try {
            await command.autocomplete(client, interaction);
        } catch (error) {
            console.error(`[Autocomplete] Error en ${interaction.commandName}:`, error);
        }
    }
};
