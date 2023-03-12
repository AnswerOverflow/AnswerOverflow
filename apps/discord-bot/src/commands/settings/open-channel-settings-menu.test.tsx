describe("Channel Settings Slash Command", () => {
	// it("uses /channel-settings without manage guild permissions", async () => {
	//   const command = mockInteracion(
	//     client,
	//     "channel-settings",
	//     "1048055954618454026",
	//     guild,
	//     textChannel,
	//     members.guildMemberDefault
	//   );
	//   command.reply = jest.fn();
	//   await emitEvent(client, Events.InteractionCreate, command);
	//   expect(command.reply).not.toHaveBeenCalled();
	// });
	// it("uses /channel-settings as an admin", async () => { });
	// it("uses /channel-settings with manage guild permissions", async () => { });
	test.todo("Verify default member permissions");
	test.todo("Verify bot permissions");
	test.todo("Verify channel type");
	test.todo("Verify running in guild");
	test.todo("Verify error handling for missing permissions");
	test.todo("Verify error handling for backend");
	test.todo("Verify reacord reply is called with right args");
});
