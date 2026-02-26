const { PermissionsBitField, InteractionType, EmbedBuilder, ApplicationCommandType } = require("discord.js");

module.exports = {
    name: "interactionCreate",
    run: async (client, interaction) => {

        if (!interaction.guild)
            return interaction.reply({ content: "You can only use commands on servers." });

        if (interaction.type !== InteractionType.ApplicationCommand) return;

        // Select the command based on the interaction type
        let command;
        switch (interaction.commandType) {
            case ApplicationCommandType.ChatInput:
                command = client.slashCommands.get(interaction.commandName);
                break;
            case ApplicationCommandType.User:
                command = client.userCommands.get(interaction.commandName);
                break;
            case ApplicationCommandType.Message:
                command = client.messageCommands.get(interaction.commandName);
                break;
            default:
                return; // If it doesn't match any type, exit.
        }

        if (!command) return;

        let embed = new EmbedBuilder().setColor(client.config.color.red);

        // Restriction for beta commands
        if (command.beta && interaction.guild.id !== "948350314782801990") {
            return interaction.reply({ content: "This command is in development.", ephemeral: true });
        }

        // Bot permissions verification
        if (command.botPerms?.length) {
            const me = interaction.guild.members.me;
            if (!me || !me.permissions.has(PermissionsBitField.resolve(command.botPerms))) {
                embed.setTitle("PERMISSION ERROR")
                    .setDescription("I do not have sufficient permissions.");
                return interaction.reply({ embeds: [embed] });
            }
        }

        // User permissions verification
        if (command.userPerms?.length) {
            if (!interaction.member.permissions.has(PermissionsBitField.resolve(command.userPerms))) {
                embed.setTitle("PERMISSION ERROR")
                    .setDescription("You do not have sufficient permissions.");
                return interaction.reply({ embeds: [embed] });
            }
        }

        try {
            await command.run(client, interaction);
        } catch (error) {
            if (interaction.replied) {
                await interaction.editReply({ content: "An error occurred! Please notify the support team." }).catch(() => {});
            } else {
                await interaction.reply({ ephemeral: true, content: "An error occurred! Please notify the support team." }).catch(() => {});
            }
            console.error(error);
        }
    }
};
