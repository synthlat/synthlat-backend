module.exports = {
    name: "inviteDelete",
    run: (client, invite) => {
        const cached = client.inviteCache.get(invite.guild.id);
        if (cached) cached.delete(invite.code);
    }
};
