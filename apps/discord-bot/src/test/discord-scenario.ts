import type { Guild, GuildBasedChannel, Message } from "discord.js";
import { ChannelType, MessageType } from "discord.js";
import { Effect } from "effect";
import type { ChannelSettings } from "@packages/database/convex/schema";
import { Database } from "@packages/database/database";
import { DiscordClientMock } from "../core/discord-client-mock";
import { generateSnowflakeId } from "./snowflake.ts";

interface GuildInput {
	id?: string;
	name?: string;
	icon?: string | null;
	description?: string | null;
	vanityURLCode?: string | null;
	memberCount?: number;
}

interface ChannelInput {
	id?: string;
	name?: string;
	type?: ChannelType;
	parentId?: string | null;
}

interface UserInput {
	id?: string;
	username?: string;
	bot?: boolean;
}

interface MessageInput {
	id?: string;
	content?: string;
	type?: MessageType;
	author?: UserInput;
	inDM?: boolean;
	inVoice?: boolean;
	hasThread?: boolean;
	attachments?: Array<{ name?: string | null }>;
	memberNickname?: string | null;
}

type ChannelSettingsInput = Partial<
	Pick<
		ChannelSettings,
		| "autoThreadEnabled"
		| "indexingEnabled"
		| "markSolutionEnabled"
		| "sendMarkSolutionInstructionsInNewThreads"
		| "forumGuidelinesConsentEnabled"
	>
>;

interface TextChannelScenarioInput {
	guild?: GuildInput;
	channel?: ChannelInput;
	settings?: ChannelSettingsInput;
	messages?: MessageInput[];
}

interface ThreadTracker {
	wasCreated: () => boolean;
	name: () => string;
	startThread: (options: {
		name: string;
		reason: string;
	}) => Promise<Message["thread"]>;
}

interface TextChannelScenarioOutput {
	guild: Guild;
	channel: GuildBasedChannel;
	messages: Message[];
	threadTrackers: Map<string, ThreadTracker>;
}

const createThreadTracker = (): ThreadTracker => {
	let created = false;
	let threadName = "";
	return {
		wasCreated: () => created,
		name: () => threadName,
		startThread: async (options: { name: string; reason: string }) => {
			created = true;
			threadName = options.name;
			return {
				id: generateSnowflakeId(),
				name: options.name,
			} as unknown as Message["thread"];
		},
	};
};

const textChannel = (
	input: TextChannelScenarioInput = {},
): Effect.Effect<
	TextChannelScenarioOutput,
	unknown,
	DiscordClientMock | Database
> =>
	Effect.gen(function* () {
		const database = yield* Database;
		const discordMock = yield* DiscordClientMock;

		const guildId = input.guild?.id ?? generateSnowflakeId();
		const channelId = input.channel?.id ?? generateSnowflakeId();

		const guild = discordMock.utilities.createMockGuild({
			id: guildId,
			name: input.guild?.name ?? "Test Server",
			icon: input.guild?.icon ?? null,
			description: input.guild?.description ?? null,
			vanityURLCode: input.guild?.vanityURLCode ?? null,
			memberCount: input.guild?.memberCount ?? 0,
		});
		discordMock.utilities.seedGuild(guild);

		const channelType = input.channel?.type ?? ChannelType.GuildText;
		let channel: GuildBasedChannel;

		if (channelType === ChannelType.GuildForum) {
			channel = discordMock.utilities.createMockForumChannel(guild, {
				id: channelId,
				name: input.channel?.name ?? "test-channel",
			});
		} else if (channelType === ChannelType.GuildAnnouncement) {
			channel = discordMock.utilities.createMockNewsChannel(guild, {
				id: channelId,
				name: input.channel?.name ?? "test-channel",
				parentId: input.channel?.parentId ?? null,
			});
		} else {
			channel = discordMock.utilities.createMockTextChannel(guild, {
				id: channelId,
				name: input.channel?.name ?? "test-channel",
				parentId: input.channel?.parentId ?? null,
			});
		}
		discordMock.utilities.seedChannel(channel);

		yield* database.private.servers.upsertServer({
			name: guild.name,
			discordId: BigInt(guild.id),
			plan: "FREE",
			approximateMemberCount: guild.approximateMemberCount ?? 0,
		});

		const settings = input.settings ?? {};
		yield* database.private.channels.upsertChannelWithSettings({
			channel: {
				id: BigInt(channel.id),
				serverId: BigInt(guild.id),
				name: channel.name,
				type: channel.type,
			},
			settings: {
				channelId: BigInt(channel.id),
				autoThreadEnabled: settings.autoThreadEnabled ?? false,
				indexingEnabled: settings.indexingEnabled ?? false,
				markSolutionEnabled: settings.markSolutionEnabled ?? false,
				sendMarkSolutionInstructionsInNewThreads:
					settings.sendMarkSolutionInstructionsInNewThreads ?? false,
				forumGuidelinesConsentEnabled:
					settings.forumGuidelinesConsentEnabled ?? false,
			},
		});

		const messages: Message[] = [];
		const threadTrackers = new Map<string, ThreadTracker>();

		for (const msgInput of input.messages ?? []) {
			const messageId = msgInput.id ?? generateSnowflakeId();
			const tracker = createThreadTracker();
			threadTrackers.set(messageId, tracker);

			const baseChannel = {
				...channel,
				isDMBased: () => msgInput.inDM ?? false,
				isVoiceBased: () => msgInput.inVoice ?? false,
			};

			let messageChannel: Message["channel"];
			if (msgInput.inDM) {
				messageChannel = {
					...baseChannel,
					type: ChannelType.DM,
					isDMBased: () => true,
				} as unknown as Message["channel"];
			} else if (msgInput.inVoice) {
				messageChannel = {
					...baseChannel,
					type: ChannelType.GuildVoice,
					isVoiceBased: () => true,
				} as unknown as Message["channel"];
			} else {
				messageChannel = baseChannel as unknown as Message["channel"];
			}

			const attachmentsSize = msgInput.attachments?.length ?? 0;
			const firstAttachmentName = msgInput.attachments?.[0]?.name ?? null;

			const message = {
				id: messageId,
				channel: messageChannel,
				content: msgInput.content ?? "Test message",
				cleanContent: msgInput.content ?? "Test message",
				type: msgInput.type ?? MessageType.Default,
				author: {
					id: msgInput.author?.id ?? generateSnowflakeId(),
					bot: msgInput.author?.bot ?? false,
					system: false,
					displayName: msgInput.author?.username ?? "TestUser",
				},
				member: {
					nickname: msgInput.memberNickname ?? null,
				},
				thread: msgInput.hasThread
					? ({
							id: generateSnowflakeId(),
							name: "Existing Thread",
						} as unknown as Message["thread"])
					: null,
				attachments: {
					size: attachmentsSize,
					first: () =>
						attachmentsSize > 0 ? { name: firstAttachmentName } : null,
				},
				startThread: tracker.startThread,
			} as unknown as Message;

			messages.push(message);
		}

		return {
			guild,
			channel,
			messages,
			threadTrackers,
		};
	});

const forumChannel = (
	input: Omit<TextChannelScenarioInput, "channel"> & {
		channel?: Omit<ChannelInput, "type">;
	} = {},
) =>
	textChannel({
		...input,
		channel: {
			...input.channel,
			type: ChannelType.GuildForum,
		},
	});

const newsChannel = (
	input: Omit<TextChannelScenarioInput, "channel"> & {
		channel?: Omit<ChannelInput, "type">;
	} = {},
) =>
	textChannel({
		...input,
		channel: {
			...input.channel,
			type: ChannelType.GuildAnnouncement,
		},
	});

export const DiscordScenario = {
	textChannel,
	forumChannel,
	newsChannel,
};

export type { ThreadTracker, TextChannelScenarioOutput };
