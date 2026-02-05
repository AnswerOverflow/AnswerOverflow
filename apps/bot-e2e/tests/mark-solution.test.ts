import { afterAll, beforeAll, describe, expect, test } from "bun:test";
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

const GUILD_NAME = "AO Integration";
const CHANNEL_NAME = "general";
const MARK_SOLUTION_COMMAND = "✅ Mark Solution";

describe("Mark Solution E2E", () => {
	let client: Client;
	let guild: Guild;
	let channel: TextChannel;

	beforeAll(async () => {
		client = await getClient();
		guild = getGuild(client, GUILD_NAME);
		channel = getTextChannel(guild, CHANNEL_NAME);

		console.log(`Using guild: ${guild.name} (${guild.id})`);
		console.log(`Using channel: ${channel.name} (${channel.id})`);
	});

	afterAll(async () => {
		await cleanup();
	});

	test("should mark a message as solution in a thread", async () => {
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

		console.log("✅ Mark solution command invoked successfully");
	});
});
