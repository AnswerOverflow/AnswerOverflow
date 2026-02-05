import {
	afterAll,
	beforeAll,
	describe,
	expect,
	setDefaultTimeout,
	test,
} from "bun:test";
import type { Client, Guild, TextChannel } from "discord.js-selfbot-v13";
import { waitForReaction } from "../src/assertions";
import {
	cleanup,
	createThread,
	findCommand,
	getClient,
	getGuild,
	getTextChannel,
	invokeMessageContextMenu,
	sendMessage,
} from "../src/client";
import { CHANNELS, GUILD_NAME } from "../src/test-channels";

setDefaultTimeout(30000);

const MARK_SOLUTION_COMMAND = "✅ Mark Solution";

describe("Mark Solution E2E", () => {
	let client: Client;
	let guild: Guild;
	let channel: TextChannel;

	beforeAll(async () => {
		client = await getClient();
		guild = getGuild(client, GUILD_NAME);
		channel = getTextChannel(guild, CHANNELS.MARK_SOLUTION_ENABLED);

		console.log(`Using guild: ${guild.name} (${guild.id})`);
		console.log(`Using channel: ${channel.name} (${channel.id})`);
	});

	afterAll(async () => {
		await cleanup();
	});

	test("should mark a message as solution and add reaction", async () => {
		const timestamp = new Date().toISOString();

		const message = await sendMessage(
			channel,
			`E2E Test Question - ${timestamp}`,
		);
		expect(message.id).toBeDefined();

		const thread = await createThread(message, `E2E Test Thread ${timestamp}`);
		expect(thread.id).toBeDefined();

		const threadMessage = await sendMessage(
			thread,
			`This is the answer to mark as solved - ${timestamp}`,
		);
		expect(threadMessage.id).toBeDefined();

		const command = await findCommand(guild.id, MARK_SOLUTION_COMMAND, 3);

		await invokeMessageContextMenu(
			guild.id,
			thread.id,
			threadMessage.id,
			command,
		);

		console.log("Command invoked, waiting for bot response...");

		const hasReaction = await waitForReaction(threadMessage, "✅", {
			timeout: 15000,
		});

		if (!hasReaction) {
			console.log("❌ Bot did not add reaction within timeout");
			console.log("This could mean:");
			console.log("  - Bot is not running");
			console.log("  - Channel doesn't have mark solution enabled");
			console.log("  - Bot doesn't have permission to react");
		}

		expect(hasReaction).toBe(true);
		console.log("✅ Bot added checkmark reaction to solution message");
	});
});
