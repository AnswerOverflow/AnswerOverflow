import { Effect } from "effect";
import * as fc from "effect/FastCheck";
import type {
	Channel,
	DiscordAccount,
	Message,
	Server,
} from "../../convex/schema";
import { Database } from "../database";
import { Gen } from "./generators";

const sample = <T>(arb: fc.Arbitrary<T>): T => fc.sample(arb, 1)[0]!;

export const createServer = (overrides: Partial<Server> = {}) =>
	Effect.gen(function* () {
		const database = yield* Database;
		const data: Server = { ...sample(Gen.server), ...overrides };
		yield* database.private.servers.upsertServer(data);
		return data;
	});

export const createChannel = (
	serverId: bigint,
	overrides: Partial<Omit<Channel, "serverId">> = {},
) =>
	Effect.gen(function* () {
		const database = yield* Database;
		const data: Channel = { ...sample(Gen.channel), serverId, ...overrides };
		yield* database.private.channels.upsertChannel({ channel: data });
		return data;
	});

export const enableChannelIndexing = (channelId: bigint) =>
	Effect.gen(function* () {
		const database = yield* Database;
		yield* database.private.channels.updateChannelSettings({
			channelId,
			settings: { indexingEnabled: true },
		});
	});

export const createAuthor = (overrides: Partial<DiscordAccount> = {}) =>
	Effect.gen(function* () {
		const database = yield* Database;
		const data: DiscordAccount = {
			...sample(Gen.discordAccount),
			...overrides,
		};
		yield* database.private.discord_accounts.upsertDiscordAccount({
			account: data,
		});
		return data;
	});

export const makeMessagesPublic = (serverId: bigint) =>
	Effect.gen(function* () {
		const database = yield* Database;
		yield* database.private.server_preferences.upsertServerPreferences({
			serverId,
			plan: "FREE",
			considerAllMessagesPublicEnabled: true,
		});
	});

export const createMessage = (
	base: { authorId: bigint; serverId: bigint; channelId: bigint },
	overrides: Partial<Message> = {},
) =>
	Effect.gen(function* () {
		const database = yield* Database;
		const data: Message = { ...sample(Gen.message), ...base, ...overrides };
		yield* database.private.messages.upsertMessage({
			message: data,
			ignoreChecks: true,
		});
		return data;
	});

const CHANNEL_TYPE = {
	GuildText: 0,
	GuildForum: 15,
	PublicThread: 11,
} as const;

export const createForumThreadWithReplies = () =>
	Effect.gen(function* () {
		const server = yield* createServer();
		const forum = yield* createChannel(server.discordId, {
			type: CHANNEL_TYPE.GuildForum,
		});
		const thread = yield* createChannel(server.discordId, {
			type: CHANNEL_TYPE.PublicThread,
			parentId: forum.id,
		});
		const author = yield* createAuthor();

		yield* enableChannelIndexing(forum.id);
		yield* makeMessagesPublic(server.discordId);

		const base = {
			authorId: author.id,
			serverId: server.discordId,
			channelId: thread.id,
		};

		let nextMessageId = thread.id + 1n;

		return {
			server,
			forum,
			thread,
			author,
			addMessage: (overrides: Partial<Message> = {}) => {
				const id = nextMessageId++;
				return createMessage(base, { id, ...overrides });
			},
			addRootMessage: () => createMessage(base, { id: thread.id }),
		};
	});

export const createTextChannelThreadWithReplies = () =>
	Effect.gen(function* () {
		const server = yield* createServer();
		const textChannel = yield* createChannel(server.discordId, {
			type: CHANNEL_TYPE.GuildText,
		});
		const thread = yield* createChannel(server.discordId, {
			type: CHANNEL_TYPE.PublicThread,
			parentId: textChannel.id,
		});
		const author = yield* createAuthor();

		yield* enableChannelIndexing(textChannel.id);
		yield* makeMessagesPublic(server.discordId);

		const base = {
			authorId: author.id,
			serverId: server.discordId,
			channelId: thread.id,
		};

		let nextMessageId = thread.id + 1n;

		return {
			server,
			textChannel,
			thread,
			author,
			addMessage: (overrides: Partial<Message> = {}) => {
				const id = nextMessageId++;
				return createMessage(base, { id, ...overrides });
			},
			addRootMessage: () => createMessage(base, { id: thread.id }),
		};
	});

export const createTextChannelWithMessages = () =>
	Effect.gen(function* () {
		const server = yield* createServer();
		const channel = yield* createChannel(server.discordId, {
			type: CHANNEL_TYPE.GuildText,
		});
		const author = yield* createAuthor();

		yield* enableChannelIndexing(channel.id);
		yield* makeMessagesPublic(server.discordId);

		const base = {
			authorId: author.id,
			serverId: server.discordId,
			channelId: channel.id,
		};

		let nextMessageId = channel.id + 1n;

		return {
			server,
			channel,
			author,
			addMessage: (overrides: Partial<Message> = {}) => {
				const id = nextMessageId++;
				return createMessage(base, {
					id,
					parentChannelId: undefined,
					...overrides,
				});
			},
		};
	});
