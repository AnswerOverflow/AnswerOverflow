import {
	afterAll,
	beforeAll,
	describe,
	expect,
	setDefaultTimeout,
	test,
} from "bun:test";
import type { Client, Guild, TextChannel } from "discord.js-selfbot-v13";
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

describe("Smoke Tests", () => {
	let client: Client;
	let guild: Guild;
	let channel: TextChannel;

	beforeAll(async () => {
		client = await getClient();
		guild = getGuild(client, GUILD_NAME);
		channel = getTextChannel(guild, CHANNELS.PLAYGROUND);
	});

	afterAll(async () => {
		await cleanup();
	});

	test("can send message and create thread", async () => {
		const timestamp = new Date().toISOString();

		const message = await sendMessage(channel, `Smoke test - ${timestamp}`);
		expect(message.id).toBeDefined();
		expect(message.content).toContain("Smoke test");

		const thread = await createThread(message, `Smoke Thread ${timestamp}`);
		expect(thread.id).toBeDefined();
		expect(thread.name).toContain("Smoke Thread");

		const threadMessage = await sendMessage(thread, "Reply in thread");
		expect(threadMessage.id).toBeDefined();

		console.log("✅ Basic Discord operations work");
	});

	test("can find bot commands", async () => {
		const markSolution = await findCommand(guild.id, "✅ Mark Solution", 3);
		expect(markSolution).toBeDefined();
		expect(markSolution.application_id).toBeDefined();

		console.log(
			`✅ Found Mark Solution command (app: ${markSolution.application_id})`,
		);
	});

	test("can invoke mark solution command", async () => {
		const timestamp = new Date().toISOString();

		const message = await sendMessage(channel, `Invoke test - ${timestamp}`);
		const thread = await createThread(message, `Invoke Thread ${timestamp}`);
		const threadMessage = await sendMessage(thread, "Answer to mark");

		const command = await findCommand(guild.id, "✅ Mark Solution", 3);

		await invokeMessageContextMenu(
			guild.id,
			thread.id,
			threadMessage.id,
			command,
		);

		console.log("✅ Mark solution command invoked successfully");
	});
});
