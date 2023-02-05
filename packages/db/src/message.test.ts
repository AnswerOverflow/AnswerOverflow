describe("TODO", () => {
  test.todo("try upserting a message w/ ignored account");
  describe("Add Authors To Messages", () => {
    it("should add an author with no user server settings to the message", async () => {
      await ao_bot_discord_account_router.upsert(author);
      const message_with_author = await addAuthorsToMessages([message], prisma);
      expect(message_with_author).toEqual([toMessageWithDiscordAccount(message, author, false)]);
    });
    it("should add an author with a user server settings set to not display messages to the message", async () => {
      await ao_bot_user_server_settings_router.upsertWithDeps({
        server_id: server.id,
        user: author,
        flags: {
          can_publicly_display_messages: false,
        },
      });
      const message_with_author = await addAuthorsToMessages([message], prisma);
      expect(message_with_author).toEqual([toMessageWithDiscordAccount(message, author, false)]);
    });
    it("should add an author with a user server settings set to display messages to the message", async () => {
      await ao_bot_user_server_settings_router.upsertWithDeps({
        server_id: server.id,
        user: author,
        flags: {
          can_publicly_display_messages: true,
        },
      });
      const message_with_author = await addAuthorsToMessages([message], prisma);
      expect(message_with_author).toEqual([toMessageWithDiscordAccount(message, author, true)]);
    });
    it("should add an author with two user server settings, one set to display and one set to not", async () => {
      await ao_bot_user_server_settings_router.upsertWithDeps({
        server_id: server.id,
        user: author,
        flags: {
          can_publicly_display_messages: true,
        },
      });
      const server2 = mockServer();
      await ao_bot_server_router.upsert(server2);
      await ao_bot_user_server_settings_router.upsertWithDeps({
        server_id: server2.id,
        user: author,
        flags: {
          can_publicly_display_messages: false,
        },
      });
      const message1 = mockMessage(server, channel, author);
      const message2 = mockMessage(server2, channel, author);
      const message_with_author = await addAuthorsToMessages([message1, message2], prisma);

      expect(message_with_author).toEqual([
        toMessageWithDiscordAccount(message1, author, true),
        toMessageWithDiscordAccount(message2, author, false),
      ]);
    });
    it("should fail adding an author who does not exist", async () => {
      await expect(
        addAuthorsToMessages([mockMessage(server, channel, mockAccount())], prisma)
      ).resolves.toEqual([]);
    });
  });
});
