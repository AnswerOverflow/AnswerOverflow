import { Effect, Layer } from "effect";
import {
	Database,
	DatabaseLayer,
} from "../../../packages/database/src/database";
import { DiscordGatewayLayer } from "./framework/discord-gateway";
import { DiscordClient } from "./services/discord";

export const syncGuild = (guildId: string) =>
	Effect.gen(function* () {
		console.log("syncing guild", guildId);
		const client = yield* DiscordClient;
		const database = yield* Database;
		const guild = yield* client.getGuild(guildId);
		yield* database.servers.upsertServer({
			discordId: guild.id,
			name: guild.name ?? guild.id,
			icon: guild.icon ?? undefined,
			description: guild.description ?? undefined,
			vanityInviteCode: guild.vanityURLCode ?? undefined,
			approximateMemberCount: guild.approximateMemberCount ?? 0,
			plan: "FREE",
		});
		const created = yield* database.servers.getServerById(guild.id);
		console.log("created", created);
	});

export const make = Effect.gen(function* () {
	const client = yield* DiscordClient;

	client.effectOn("ready", (readyData) =>
		Effect.gen(function* () {
			const guildIds = readyData.guilds.cache.map((g) => g.id);
			yield* Effect.forEach(guildIds, (guildId) => syncGuild(guildId));
		}),
	);

	client.effectOn("guildUpdate", (guildUpdateData) =>
		Effect.gen(function* () {
			const guildId = guildUpdateData.id;
			yield* syncGuild(guildId);
		}),
	);
}).pipe(Effect.annotateLogs({ service: "GuildParity" }));

export const GuildParityLive = Layer.scopedDiscard(make).pipe(
	Layer.provide(DiscordGatewayLayer),
	Layer.provide(DatabaseLayer),
);
