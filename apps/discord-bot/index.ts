import { Database, DatabaseLayer } from "@packages/database/database";
import { Effect, Layer } from "effect";
import { DiscordClient } from "./src/discord-client";
import { DiscordClientRealLayer } from "./src/discord-client-real";

const program = Effect.gen(function* () {
	const discord = yield* DiscordClient;
	const database = yield* Database;

	yield* discord.on("clientReady", (_client) =>
		Effect.gen(function* () {
			console.log("Normal client ready event");
			yield* Effect.void;
			return;
		}),
	);

	const allServers = yield* database.servers.publicGetAllServers();
	const serverCount = allServers?.data?.length ?? 0;
	console.log(`Initial server count: ${serverCount}`);

	// Subscribe to ready event
	yield* discord.on("clientReady", (client) =>
		Effect.gen(function* () {
			const servers = yield* database.servers.publicGetAllServers();
			// LiveData might not have data immediately, so we handle undefined
			const serverCount = servers?.data?.length ?? 0;
			console.log(`Logged in as ${client.user.tag}! ${serverCount} servers`);
			const guilds = yield* discord.getGuilds();
			// Upsert each server entry
			yield* Effect.forEach(guilds, (guild) => {
				console.log(`Upserting server ${guild.id} ${guild.name}`);
				// Extract server fields (excluding _id and _creationTime)
				return database.servers.upsertServer({
					discordId: guild.id,
					name: guild.name,
					icon: guild.icon ? guild.icon.toString() : undefined,
					description: guild.description ?? undefined,
					vanityInviteCode: guild.vanityURLCode ?? undefined,
					plan: "FREE",
					approximateMemberCount:
						guild.approximateMemberCount ?? guild.memberCount ?? 0,
				});
			});
		}),
	);

	// Subscribe to messageCreate event
	yield* discord.on("messageCreate", (message) =>
		Effect.sync(() => {
			if (message.content === "!ping") {
				console.log("Received ping command!");
			}
		}),
	);

	// Login to Discord and wait for ready
	yield* discord.login();

	// Get and log guild count
	const guilds = yield* discord.getGuilds();
	console.log(`Bot is in ${guilds.length} guilds`);

	// Keep the bot running
	return yield* Effect.never;
});

// Run the program with the DiscordClientRealLayer
Effect.runPromise(
	Effect.scoped(
		program.pipe(
			Effect.provide(Layer.mergeAll(DiscordClientRealLayer, DatabaseLayer)),
		),
	),
).catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
