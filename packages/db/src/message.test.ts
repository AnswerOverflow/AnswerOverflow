// describe("TODO", () => {
//   test.todo("try upserting a message w/ ignored account");
//   describe("Add Authors To Messages", () => {
//     it("should add an author with no user server settings to the message", async () => {
//       await aoBotDiscordAccountRouter.upsert(author);
//       const messageWithAuthor = await addAuthorsToMessages([message]);
//       expect(messageWithAuthor).toEqual([toMessageWithDiscordAccount(message, author, false)]);
//     });
//     it("should add an author with a user server settings set to not display messages to the message", async () => {
//       await aoBotUserServerSettingsRouter.upsertWithDeps({
//         serverId: server.id,
//         user: author,
//         flags: {
//           canPubliclyDisplayMessages: false,
//         },
//       });
//       const messageWithAuthor = await addAuthorsToMessages([message]);
//       expect(messageWithAuthor).toEqual([toMessageWithDiscordAccount(message, author, false)]);
//     });
//     it("should add an author with a user server settings set to display messages to the message", async () => {
//       await aoBotUserServerSettingsRouter.upsertWithDeps({
//         serverId: server.id,
//         user: author,
//         flags: {
//           canPubliclyDisplayMessages: true,
//         },
//       });
//       const messageWithAuthor = await addAuthorsToMessages([message]);
//       expect(messageWithAuthor).toEqual([toMessageWithDiscordAccount(message, author, true)]);
//     });
//     it("should add an author with two user server settings, one set to display and one set to not", async () => {
//       await aoBotUserServerSettingsRouter.upsertWithDeps({
//         serverId: server.id,
//         user: author,
//         flags: {
//           canPubliclyDisplayMessages: true,
//         },
//       });
//       const server2 = mockServer();
//       await aoBotServerRouter.upsert(server2);
//       await aoBotUserServerSettingsRouter.upsertWithDeps({
//         serverId: server2.id,
//         user: author,
//         flags: {
//           canPubliclyDisplayMessages: false,
//         },
//       });
//       const message1 = mockMessage(server, channel, author);
//       const message2 = mockMessage(server2, channel, author);
//       const messageWithAuthor = await addAuthorsToMessages([message1, message2]);

//       expect(messageWithAuthor).toEqual([
//         toMessageWithDiscordAccount(message1, author, true),
//         toMessageWithDiscordAccount(message2, author, false),
//       ]);
//     });
//     it("should fail adding an author who does not exist", async () => {
//       await expect(
//         addAuthorsToMessages([mockMessage(server, channel, mockDiscordAccount())])
//       ).resolves.toEqual([]);
//     });
//   });
// });

it("todo", () => {});
