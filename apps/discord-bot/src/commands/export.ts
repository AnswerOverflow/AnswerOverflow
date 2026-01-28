import type { ChatInputCommandInteraction, Message } from "discord.js";
import { AttachmentBuilder, ChannelType, MessageFlags } from "discord.js";
import { Array as Arr, Effect, Layer, Metric } from "effect";
import { Discord } from "../core/discord-service";
import { commandExecuted } from "../metrics";
import { catchAllWithReport } from "../utils/error-reporting";

type ExportMetadata = {
	serverName: string;
	channelName: string;
	threadName: string;
};

type ExportedMessage = {
	id: string;
	author: {
		id: string;
		username: string;
		displayName: string;
	};
	content: string;
	timestamp: string;
	attachments: Array<{
		name: string;
		url: string;
	}>;
	embeds: Array<{
		title: string | null;
		description: string | null;
		url: string | null;
	}>;
};

const THREAD_CHANNEL_TYPES = [
	ChannelType.PublicThread,
	ChannelType.PrivateThread,
	ChannelType.AnnouncementThread,
];

function isThreadChannel(type: ChannelType): boolean {
	return THREAD_CHANNEL_TYPES.includes(type);
}

function messageToExportable(message: Message): ExportedMessage {
	return {
		id: message.id,
		author: {
			id: message.author.id,
			username: message.author.username,
			displayName: message.author.displayName,
		},
		content: message.content,
		timestamp: message.createdAt.toISOString(),
		attachments: Arr.fromIterable(message.attachments.values()).map((a) => ({
			name: a.name,
			url: a.url,
		})),
		embeds: message.embeds.map((e) => ({
			title: e.title,
			description: e.description,
			url: e.url,
		})),
	};
}

function formatAsMarkdown(
	metadata: ExportMetadata,
	messages: Array<ExportedMessage>,
): string {
	const lines: Array<string> = [
		`# ${metadata.threadName}`,
		"",
		`**Server:** ${metadata.serverName}`,
		`**Channel:** ${metadata.channelName}`,
		"",
		"---",
		"",
	];

	for (const msg of messages) {
		const date = new Date(msg.timestamp);
		const formatted = date.toLocaleString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
		lines.push(`### ${msg.author.displayName} — ${formatted}`);
		if (msg.content) {
			lines.push("", msg.content);
		}
		for (const attachment of msg.attachments) {
			lines.push("", `[${attachment.name}](${attachment.url})`);
		}
		for (const embed of msg.embeds) {
			if (embed.title || embed.description) {
				lines.push("");
				if (embed.title) lines.push(`> **${embed.title}**`);
				if (embed.description) lines.push(`> ${embed.description}`);
				if (embed.url) lines.push(`> ${embed.url}`);
			}
		}
		lines.push("");
	}

	return lines.join("\n");
}

function formatAsJson(
	metadata: ExportMetadata,
	messages: Array<ExportedMessage>,
): string {
	return JSON.stringify(
		{
			server: metadata.serverName,
			channel: metadata.channelName,
			thread: metadata.threadName,
			messages,
		},
		null,
		2,
	);
}

async function fetchAllMessages(
	interaction: ChatInputCommandInteraction,
): Promise<Array<Message>> {
	const channel = interaction.channel;
	if (!channel) throw new Error("No channel available");

	if (!isThreadChannel(channel.type)) {
		throw new Error("This command can only be used in threads");
	}

	const allMessages: Array<Message> = [];
	let lastId: string | undefined;

	for (;;) {
		const batch = await channel.messages.fetch({
			limit: 100,
			...(lastId ? { before: lastId } : {}),
		});

		if (batch.size === 0) break;

		allMessages.push(...batch.values());
		lastId = batch.last()?.id;

		if (batch.size < 100) break;
	}

	allMessages.reverse();
	return allMessages;
}

export const handleExportCommand = Effect.fn("export_command")(function* (
	interaction: ChatInputCommandInteraction,
) {
	yield* Effect.annotateCurrentSpan({
		"discord.guild_id": interaction.guildId ?? "unknown",
		"discord.channel_id": interaction.channelId ?? "unknown",
		"discord.user_id": interaction.user.id,
	});
	yield* Metric.increment(commandExecuted("export"));

	const discord = yield* Discord;

	const format = interaction.options.getString("format") ?? "markdown";
	const isEphemeral = interaction.options.getBoolean("ephemeral") ?? true;

	yield* discord.callClient(() =>
		interaction.deferReply(
			isEphemeral ? { flags: MessageFlags.Ephemeral } : {},
		),
	);

	if (!interaction.channel || !interaction.guildId) {
		yield* discord.callClient(() =>
			interaction.editReply({
				content: "This command can only be used in a server.",
			}),
		);
		return;
	}

	if (!isThreadChannel(interaction.channel.type)) {
		yield* discord.callClient(() =>
			interaction.editReply({
				content: "This command can only be used inside a thread.",
			}),
		);
		return;
	}

	const messages = yield* Effect.tryPromise({
		try: () => fetchAllMessages(interaction),
		catch: (error) =>
			new Error(
				error instanceof Error ? error.message : "Failed to fetch messages",
			),
	});

	if (messages.length === 0) {
		yield* discord.callClient(() =>
			interaction.editReply({
				content: "No messages found in this channel.",
			}),
		);
		return;
	}

	const thread = interaction.channel;
	const threadName = thread.name;
	const serverName = interaction.guild?.name ?? "Unknown Server";
	const parentChannel = thread.isThread() ? thread.parent : null;
	const channelName = parentChannel?.name ?? "Unknown Channel";

	const metadata: ExportMetadata = {
		serverName,
		channelName,
		threadName,
	};

	const exportable = messages.map(messageToExportable);

	const isJson = format === "json";
	const content = isJson
		? formatAsJson(metadata, exportable)
		: formatAsMarkdown(metadata, exportable);

	const extension = isJson ? "json" : "md";
	const fileName = `${threadName}.${extension}`;

	const attachment = new AttachmentBuilder(Buffer.from(content, "utf-8"), {
		name: fileName,
	});

	yield* discord.callClient(() =>
		interaction.editReply({
			content: `Exported ${messages.length} messages as ${isJson ? "JSON" : "Markdown"}.\n-# The contents of this thread was read directly from Discord and will not be saved unless indexing is enabled for the channel.`,
			files: [attachment],
		}),
	);
});

export const ExportCommandHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					!interaction.isChatInputCommand() ||
					interaction.commandName !== "export"
				) {
					return;
				}
				yield* handleExportCommand(interaction).pipe(
					catchAllWithReport((error) =>
						Effect.gen(function* () {
							const discord = yield* Discord;
							yield* discord.callClient(() =>
								interaction.editReply({
									content: `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
								}),
							);
						}),
					),
				);
			}),
		);
	}),
);
