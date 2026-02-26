### Use SimpleMongoDB in events/commands:
Only available if simplemongodb is enabled in `config.discremy.js`. 
```js
// Exmaple: let db = await client.database(query, collection);
    let db = await client.database({ guildId = interaction.guildId }, "guilds");
    db.data = "custom data";
    
    await db.save()
    
```

### Structure of a slash command:
```js
module.exports = {
    name: "example",
    description: "Example command.",
    userPerms: [],
    botPerms: [],
    options: [
        {
            name: "option",
            description: "Description to this option.",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: "One", value: "one-option" },
                { name: "Two", value: "two-option" },
            ]
        },
    ],
    
    run: async (client, interaction) => {

        await interaction.reply("Hello World");
    }};
```

### Structure of event:
```js
module.exports = {
    name: "messageCreate",
    run: async (client, message) => {

        if(message.content == "hello") {
            return await interaction.channel.send("Hello World");
        };
        
    }};
```