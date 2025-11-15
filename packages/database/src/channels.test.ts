// Tests for channel functions

import { expect, it } from "@effect/vitest";
import { Effect, Exit } from "effect";
import type { Id } from "../convex/_generated/dataModel";
import type { Channel, ChannelSettings, Server } from "../convex/schema";
import { Database } from "./database";
import { DatabaseTestLayer } from "./database-test";

const testServer: Server = {
	name: "Test Server",
	description: "Test Description",
	icon: "https://example.com/icon.png",
	vanityInviteCode: "test",
	vanityUrl: "test",
	discordId: "server123",
	plan: "FREE",
	approximateMemberCount: 0,
};

const createTestChannel = (
	id: string,
	serverId: Id<"servers">,
	overrides?: Partial<Channel>,
): Channel => ({
	id,
	serverId,
	name: `Channel ${id}`,
	type: 0, // GuildText
	parentId: undefined,
	inviteCode: undefined,
	archivedTimestamp: undefined,
	solutionTagId: undefined,
	lastIndexedSnowflake: undefined,
	...overrides,
});

const createTestSettings = (
	channelId: string,
	overrides?: Partial<ChannelSettings>,
): ChannelSettings => ({
	channelId,
	indexingEnabled: false,
	markSolutionEnabled: false,
	sendMarkSolutionInstructionsInNewThreads: false,
	autoThreadEnabled: false,
	forumGuidelinesConsentEnabled: false,
	...overrides,
});

// Simple query tests

it.scoped("getChannelByDiscordId returns channel with flags", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		const settings = createTestSettings("channel123", {
			indexingEnabled: true,
		});

		yield* database.channels.upsertChannelWithSettings({ channel, settings });

		const liveData = yield* database.channels.findChannelByDiscordId({
			discordId: "channel123",
		});

		expect(liveData?.id).toBe("channel123");
		expect(liveData?.flags.indexingEnabled).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("getChannelByDiscordId returns null for non-existent channel", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const liveData = yield* database.channels.findChannelByDiscordId({
			discordId: "nonexistent",
		});

		expect(liveData).toBeNull();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findChannelByInviteCode returns channel by invite code", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId, {
			inviteCode: "abc123",
		});

		yield* database.channels.upsertChannelWithSettings({ channel });

		const liveData = yield* database.channels.findChannelByInviteCode({
			inviteCode: "abc123",
		});

		expect(liveData?.id).toBe("channel123");
		expect(liveData?.inviteCode).toBe("abc123");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findChannelByInviteCode returns null for non-existent invite", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const liveData = yield* database.channels.findChannelByInviteCode({
			inviteCode: "nonexistent",
		});

		expect(liveData).toBeNull();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findAllChannelsByServerId returns all channels for server", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel1 = createTestChannel("channel1", serverId);
		const channel2 = createTestChannel("channel2", serverId, { type: 15 }); // Forum
		const channel3 = createTestChannel("channel3", serverId, { type: 5 }); // Announcement

		yield* database.channels.upsertChannelWithSettings({ channel: channel1 });
		yield* database.channels.upsertChannelWithSettings({ channel: channel2 });
		yield* database.channels.upsertChannelWithSettings({ channel: channel3 });

		const liveData = yield* database.channels.findAllChannelsByServerId({
			serverId,
		});

		expect(liveData?.length).toBe(3);
		expect(liveData?.some((c) => c.id === "channel1")).toBe(true);
		expect(liveData?.some((c) => c.id === "channel2")).toBe(true);
		expect(liveData?.some((c) => c.id === "channel3")).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findAllThreadsByParentId returns threads for parent channel", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const parentChannel = createTestChannel("parent123", serverId);
		const thread1 = createTestChannel("thread1", serverId, {
			parentId: "parent123",
			type: 11, // PublicThread
		});
		const thread2 = createTestChannel("thread2", serverId, {
			parentId: "parent123",
			type: 11, // PublicThread
		});

		yield* database.channels.upsertChannelWithSettings({
			channel: parentChannel,
		});
		yield* database.channels.upsertChannelWithSettings({ channel: thread1 });
		yield* database.channels.upsertChannelWithSettings({ channel: thread2 });

		const liveData = yield* database.channels.findAllThreadsByParentId({
			parentId: "parent123",
		});

		expect(liveData?.length).toBe(2);
		expect(liveData?.every((t) => t.parentId === "parent123")).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findAllThreadsByParentId respects limit parameter", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const parentChannel = createTestChannel("parent456", serverId);
		yield* database.channels.upsertChannelWithSettings({
			channel: parentChannel,
		});

		// Create 5 threads
		for (let i = 1; i <= 5; i++) {
			const thread = createTestChannel(`thread${i}`, serverId, {
				parentId: "parent456",
				type: 11,
			});
			yield* database.channels.upsertChannelWithSettings({ channel: thread });
		}

		const liveData = yield* database.channels.findAllThreadsByParentId({
			parentId: "parent456",
			limit: 3,
		});

		expect(liveData?.length).toBe(3);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findLatestThreads returns latest threads", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create multiple threads
		for (let i = 1; i <= 5; i++) {
			const thread = createTestChannel(`thread${i}`, serverId, {
				type: 11, // PublicThread
			});
			yield* database.channels.upsertChannelWithSettings({ channel: thread });
		}

		const liveData = yield* database.channels.findLatestThreads({ take: 3 });

		expect(liveData?.length).toBe(3);
		expect(liveData?.every((t) => t.type === 11)).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

// Mutation tests

it.scoped("createChannel creates new channel", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("newchannel", serverId);
		const settings = createTestSettings("newchannel");

		yield* database.channels.createChannel({ channel, settings });

		const liveData = yield* database.channels.findChannelByDiscordId({
			discordId: "newchannel",
		});

		expect(liveData?.id).toBe("newchannel");
		expect(liveData?.flags).toBeDefined();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("createManyChannels creates multiple channels", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channels = [
			{
				channel: createTestChannel("multi1", serverId),
				settings: createTestSettings("multi1"),
			},
			{
				channel: createTestChannel("multi2", serverId),
				settings: createTestSettings("multi2"),
			},
			{
				channel: createTestChannel("multi3", serverId),
			},
		];

		yield* database.channels.createManyChannels({ channels });

		const liveData = yield* database.channels.findManyChannelsById({
			ids: ["multi1", "multi2", "multi3"],
		});

		expect(liveData?.length).toBe(3);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("updateChannel updates existing channel", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("updatechannel", serverId);
		yield* database.channels.createChannel({ channel });

		const updatedChannel = createTestChannel("updatechannel", serverId, {
			name: "Updated Channel Name",
		});
		const updatedSettings = createTestSettings("updatechannel", {
			indexingEnabled: true,
		});

		yield* database.channels.updateChannel({
			id: "updatechannel",
			channel: updatedChannel,
			settings: updatedSettings,
		});

		const liveData = yield* database.channels.findChannelByDiscordId({
			discordId: "updatechannel",
		});

		expect(liveData?.name).toBe("Updated Channel Name");
		expect(liveData?.flags.indexingEnabled).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("updateManyChannels updates multiple channels", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel1 = createTestChannel("batch1", serverId);
		const channel2 = createTestChannel("batch2", serverId);
		const channel3 = createTestChannel("batch3", serverId);

		yield* database.channels.createChannel({ channel: channel1 });
		yield* database.channels.createChannel({ channel: channel2 });
		yield* database.channels.createChannel({ channel: channel3 });

		const updatedChannels = [
			createTestChannel("batch1", serverId, { name: "Updated Batch 1" }),
			createTestChannel("batch2", serverId, { name: "Updated Batch 2" }),
			createTestChannel("batch3", serverId, { name: "Updated Batch 3" }),
		];

		yield* database.channels.updateManyChannels({ channels: updatedChannels });

		const liveData = yield* database.channels.findManyChannelsById({
			ids: ["batch1", "batch2", "batch3"],
		});

		expect(liveData?.find((c) => c.id === "batch1")?.name).toBe(
			"Updated Batch 1",
		);
		expect(liveData?.find((c) => c.id === "batch2")?.name).toBe(
			"Updated Batch 2",
		);
		expect(liveData?.find((c) => c.id === "batch3")?.name).toBe(
			"Updated Batch 3",
		);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("deleteChannel deletes channel and its threads", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const parentChannel = createTestChannel("parent789", serverId);
		const thread1 = createTestChannel("thread789a", serverId, {
			parentId: "parent789",
			type: 11,
		});
		const thread2 = createTestChannel("thread789b", serverId, {
			parentId: "parent789",
			type: 11,
		});

		yield* database.channels.createChannel({ channel: parentChannel });
		yield* database.channels.createChannel({ channel: thread1 });
		yield* database.channels.createChannel({ channel: thread2 });

		// Delete parent channel
		yield* database.channels.deleteChannel({ id: "parent789" });

		// Verify parent is deleted
		const parentLiveData = yield* database.channels.findChannelByDiscordId({
			discordId: "parent789",
		});
		expect(parentLiveData).toBeNull();

		// Verify threads are deleted
		const threadsLiveData = yield* database.channels.findAllThreadsByParentId({
			parentId: "parent789",
		});
		expect(threadsLiveData?.length).toBe(0);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertManyChannels creates and updates channels", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create one channel first
		const existingChannel = createTestChannel("upsert1", serverId);
		yield* database.channels.createChannel({ channel: existingChannel });

		// Upsert: update existing, create new
		const channels = [
			{
				create: createTestChannel("upsert1", serverId, {
					name: "Updated Upsert 1",
				}),
				update: createTestChannel("upsert1", serverId, {
					name: "Updated Upsert 1",
				}),
				settings: createTestSettings("upsert1", { indexingEnabled: true }),
			},
			{
				create: createTestChannel("upsert2", serverId),
				settings: createTestSettings("upsert2"),
			},
		];

		yield* database.channels.upsertManyChannels({ channels });

		const liveData = yield* database.channels.findManyChannelsById({
			ids: ["upsert1", "upsert2"],
		});

		expect(liveData?.length).toBe(2);
		expect(liveData?.find((c) => c.id === "upsert1")?.name).toBe(
			"Updated Upsert 1",
		);
		expect(liveData?.find((c) => c.id === "upsert2")).toBeDefined();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

// Complex tests with LiveData reactivity

it.scoped(
	"findAllChannelsByServerId updates when channels are added or removed",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			yield* database.servers.upsertServer(testServer);
			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: "server123",
			});
			const serverId = serverLiveData?._id;

			if (!serverId) {
				throw new Error("Server not found");
			}

			// Set up watch
			const liveData = yield* database.channels.findAllChannelsByServerId(
				{
					serverId,
				},
				{ subscribe: true },
			);

			expect(liveData?.data?.length).toBe(0);

			// Add channel
			const channel1 = createTestChannel("react1", serverId);
			yield* database.channels.createChannel({ channel: channel1 });

			expect(liveData?.data?.length).toBe(1);
			expect(liveData?.data?.[0]?.id).toBe("react1");

			// Add another channel
			const channel2 = createTestChannel("react2", serverId);
			yield* database.channels.createChannel({ channel: channel2 });

			expect(liveData?.data?.length).toBe(2);

			// Delete a channel
			yield* database.channels.deleteChannel({ id: "react1" });

			expect(liveData?.data?.length).toBe(1);
			expect(liveData?.data?.[0]?.id).toBe("react2");
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"findAllThreadsByParentId updates when threads are added or removed",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			yield* database.servers.upsertServer(testServer);
			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: "server123",
			});
			const serverId = serverLiveData?._id;

			if (!serverId) {
				throw new Error("Server not found");
			}

			const parentChannel = createTestChannel("parentreact", serverId);
			yield* database.channels.createChannel({ channel: parentChannel });

			// Set up watch
			const liveData = yield* database.channels.findAllThreadsByParentId(
				{
					parentId: "parentreact",
				},
				{ subscribe: true },
			);

			expect(liveData?.data?.length).toBe(0);

			// Add thread
			const thread1 = createTestChannel("threadreact1", serverId, {
				parentId: "parentreact",
				type: 11,
			});
			yield* database.channels.createChannel({ channel: thread1 });

			expect(liveData?.data?.length).toBe(1);

			// Add another thread
			const thread2 = createTestChannel("threadreact2", serverId, {
				parentId: "parentreact",
				type: 11,
			});
			yield* database.channels.createChannel({ channel: thread2 });

			expect(liveData?.data?.length).toBe(2);

			// Delete thread
			yield* database.channels.deleteChannel({ id: "threadreact1" });

			expect(liveData?.data?.length).toBe(1);
			expect(liveData?.data?.[0]?.id).toBe("threadreact2");
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("getChannelByDiscordId updates when channel settings change", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("settingschannel", serverId);
		yield* database.channels.createChannel({ channel });

		// Set up watch
		const liveData = yield* database.channels.findChannelByDiscordId(
			{
				discordId: "settingschannel",
			},
			{ subscribe: true },
		);

		expect(liveData?.data?.flags.indexingEnabled).toBe(false);

		// Update settings
		const updatedChannel = createTestChannel("settingschannel", serverId);
		const updatedSettings = createTestSettings("settingschannel", {
			indexingEnabled: true,
			autoThreadEnabled: true,
		});

		yield* database.channels.updateChannel({
			id: "settingschannel",
			channel: updatedChannel,
			settings: updatedSettings,
		});

		expect(liveData?.data?.flags.indexingEnabled).toBe(true);
		expect(liveData?.data?.flags.autoThreadEnabled).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findManyChannelsById updates when channels change", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel1 = createTestChannel("batchreact1", serverId);
		const channel2 = createTestChannel("batchreact2", serverId);
		const channel3 = createTestChannel("batchreact3", serverId);

		yield* database.channels.createChannel({ channel: channel1 });
		yield* database.channels.createChannel({ channel: channel2 });
		yield* database.channels.createChannel({ channel: channel3 });

		// Set up watch
		const allChannels = yield* database.channels.findAllChannelsByServerId(
			{
				serverId,
			},
			{ subscribe: true },
		);
		const getLiveData = () =>
			allChannels?.data?.filter((c) =>
				["batchreact1", "batchreact2", "batchreact3"].includes(c.id),
			);

		expect(getLiveData()?.length).toBe(3);

		// Update one channel
		const updatedChannel = createTestChannel("batchreact1", serverId, {
			name: "Updated Batch React 1",
		});
		yield* database.channels.updateChannel({
			id: "batchreact1",
			channel: updatedChannel,
		});

		const updatedChannelData = getLiveData()?.find(
			(c) => c.id === "batchreact1",
		);
		expect(updatedChannelData?.name).toBe("Updated Batch React 1");

		// Delete one channel
		yield* database.channels.deleteChannel({ id: "batchreact2" });

		expect(getLiveData()?.length).toBe(2);
		expect(getLiveData()?.some((c) => c.id === "batchreact2")).toBe(false);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

// Error cases

it.scoped("updateChannel throws error if channel does not exist", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const fakeChannel = createTestChannel("nonexistent", serverId);

		const result = yield* database.channels
			.updateChannel({
				id: "nonexistent",
				channel: fakeChannel,
			})
			.pipe(Effect.exit);

		expect(Exit.isFailure(result)).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findChannelsBeforeId returns channels before given ID", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create channels with sequential IDs (string comparison)
		const channel1 = createTestChannel("channel001", serverId);
		const channel2 = createTestChannel("channel002", serverId);
		const channel3 = createTestChannel("channel003", serverId);
		const channel4 = createTestChannel("channel004", serverId);

		yield* database.channels.createChannel({ channel: channel1 });
		yield* database.channels.createChannel({ channel: channel2 });
		yield* database.channels.createChannel({ channel: channel3 });
		yield* database.channels.createChannel({ channel: channel4 });

		// Get channels before channel004
		const liveData = yield* database.channels.findChannelsBeforeId({
			serverId,
			id: "channel004",
			take: 2,
		});

		expect(liveData?.length).toBe(2);
		// Should be ordered descending
		expect(liveData?.[0]?.id).toBe("channel003");
		expect(liveData?.[1]?.id).toBe("channel002");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);
