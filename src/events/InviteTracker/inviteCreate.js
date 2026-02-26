module.exports = {
    name: "inviteCreate",
    run: (client, invite) => {
        const cached = client.inviteCache.get(invite.guild.id) || new Map();
        cached.set(invite.code, invite.uses);
        client.inviteCache.set(invite.guild.id, cached);
    }
};
