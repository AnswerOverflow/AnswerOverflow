import { Database } from "@packages/database/database";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import { catchAllCauseWithReport } from "../utils/error-reporting";

async function fetchImageAsDataUri(url: string): Promise<string | null> {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.error(`Failed to fetch image: ${response.status}`);
			return null;
		}

		const contentType = response.headers.get("content-type") ?? "image/png";
		const arrayBuffer = await response.arrayBuffer();
		const base64 = Buffer.from(arrayBuffer).toString("base64");
		return `data:${contentType};base64,${base64}`;
	} catch (error) {
		console.error("Error fetching image:", error);
		return null;
	}
}

export function syncBotIdentityToDiscord(guildId: string) {
	return Effect.gen(function* () {
		const database = yield* Database;
		const discord = yield* Discord;

		const customization =
			yield* database.private.server_preferences.getBotCustomizationForServer({
				serverId: BigInt(guildId),
			});

		if (!customization) {
			yield* Console.log(
				`No bot customization for guild ${guildId}, skipping sync`,
			);
			return;
		}

		const updatePayload: {
			nick?: string | null;
			avatar?: string | null;
			banner?: string | null;
			bio?: string | null;
		} = {};

		if (customization.botNickname !== undefined) {
			updatePayload.nick = customization.botNickname ?? null;
		}

		if (customization.botBio !== undefined) {
			updatePayload.bio = customization.botBio ?? null;
		}

		if (customization.botAvatarUrl) {
			const dataUri = yield* Effect.tryPromise({
				try: () => fetchImageAsDataUri(customization.botAvatarUrl!),
				catch: (error) => new Error(`Failed to fetch avatar: ${error}`),
			});
			if (dataUri) {
				updatePayload.avatar = dataUri;
			}
		}

		if (customization.botBannerUrl) {
			const dataUri = yield* Effect.tryPromise({
				try: () => fetchImageAsDataUri(customization.botBannerUrl!),
				catch: (error) => new Error(`Failed to fetch banner: ${error}`),
			});
			if (dataUri) {
				updatePayload.banner = dataUri;
			}
		}

		if (Object.keys(updatePayload).length === 0) {
			yield* Console.log(
				`No updates to apply for guild ${guildId}, skipping sync`,
			);
			return;
		}

		yield* Console.log(`Syncing bot identity for guild ${guildId}:`, {
			hasNickname: !!updatePayload.nick,
			hasAvatar: !!updatePayload.avatar,
			hasBanner: !!updatePayload.banner,
			hasBio: !!updatePayload.bio,
		});

		yield* discord.updateBotMemberProfile(guildId, updatePayload);

		yield* Console.log(`Successfully synced bot identity for guild ${guildId}`);
	}).pipe(
		Effect.withSpan("bot_identity_sync.sync", {
			attributes: { "discord.guild_id": guildId },
		}),
		catchAllCauseWithReport((cause) =>
			Console.error(`Failed to sync bot identity for guild ${guildId}:`, cause),
		),
	);
}

function syncAllServersWithCustomization() {
	return Effect.gen(function* () {
		const database = yield* Database;
		const discord = yield* Discord;

		const guilds = yield* discord.getGuilds();
		const guildIds = new Set(guilds.map((g) => g.id));

		const serversWithCustomization =
			yield* database.private.server_preferences.getServersWithBotCustomization(
				{},
			);

		yield* Console.log(
			`Found ${serversWithCustomization.length} servers with bot customization`,
		);

		for (const server of serversWithCustomization) {
			const guildId = server.serverId.toString();
			if (!guildIds.has(guildId)) {
				yield* Console.log(
					`Skipping server ${guildId} - bot is not in this guild`,
				);
				continue;
			}

			yield* syncBotIdentityToDiscord(guildId);
		}

		yield* Console.log("Finished syncing all servers with bot customization");
	}).pipe(
		Effect.withSpan("bot_identity_sync.sync_all"),
		catchAllCauseWithReport((cause) =>
			Console.error(
				"Failed to sync all servers with bot customization:",
				cause,
			),
		),
	);
}

export const BotIdentitySyncHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("guildCreate", (guild) =>
			Effect.gen(function* () {
				yield* Console.log(
					`Bot joined guild ${guild.id}, syncing bot identity...`,
				);
				yield* syncBotIdentityToDiscord(guild.id);
			}),
		);

		yield* discord.client.on("clientReady", () =>
			Effect.gen(function* () {
				if (process.env.NODE_ENV === "development") {
					return;
				}
				yield* Console.log(
					"Bot ready, syncing all servers with customization...",
				);
				yield* syncAllServersWithCustomization();
			}),
		);

		yield* Console.log("Bot identity sync handler registered");
	}),
);
