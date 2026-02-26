module.exports = {
    name: "clientReady",
    run: async (client) => {

        let db = await client.database({ guildId: "123"}, "guilds");
        db.test = "example text";

        await db.save()

        client.log("[ready] I'm ready! PowerDiscord by ronaldzav.");

    }};