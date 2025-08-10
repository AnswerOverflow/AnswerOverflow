import { api } from "@packages/convex/convex/_generated/api.js";
import { ConvexHttpClient } from "convex/browser";
import { DiscordREST } from "dfx/DiscordREST";
import { DiscordGateway } from "dfx/gateway";
import { Config, Effect, Layer } from "effect";
import { DiscordGatewayLayer } from "./framework/discord-gateway";

const upsertServer = (guildId: string) =>
	Effect.gen(function* () {
		const rest = yield* DiscordREST;
		// biome-ignore lint/style/noNonNullAssertion: Setup
		const httpClient = new ConvexHttpClient(process.env.CONVEX_URL!);
		const externalSecret = yield* Config.string("EXTERNAL_WRITE_SECRET");
		const guild = yield* rest.getGuild(guildId, {});
		yield* Effect.log(`Upserting server ${guild.name} (${guild.id})`);
		yield* Effect.promise(() =>
			httpClient.mutation(api.servers.upsertServerExternal, {
				data: {
					discordId: guild.id,
					name: guild.name ?? guild.id,
					icon: guild.icon ?? undefined,
					description: guild.description ?? undefined,
					vanityInviteCode: guild.vanity_url_code ?? undefined,
					bitfield: 0,
					kickedTime: undefined,
					vanityUrl: undefined,
					customDomain: undefined,
					subpath: undefined,
					stripeCustomerId: undefined,
					stripeSubscriptionId: undefined,
					plan: "FREE",
					approximateMemberCount: guild.approximate_member_count ?? 0,
				},
				apiKey: externalSecret,
			}),
		);
	});

const make = Effect.gen(function* () {
	const gateway = yield* DiscordGateway;

	const convexUrl = process.env.CONVEX_URL;
	const externalSecret = process.env.EXTERNAL_WRITE_SECRET;
	if (!convexUrl) {
		yield* Effect.logError("Missing CONVEX_URL env var");
	}
	if (!externalSecret) {
		yield* Effect.logError("Missing EXTERNAL_WRITE_SECRET env var");
	}

	yield* gateway
		.handleDispatch("READY", (readyData) =>
			Effect.gen(function* () {
				const guildIds = readyData.guilds.map((g) => g.id);
				yield* Effect.forEach(guildIds, (guildId) =>
					upsertServer(guildId).pipe(Effect.delay(1000)),
				);
			}),
		)
		.pipe(Effect.forkScoped);
}).pipe(Effect.annotateLogs({ service: "GuildParity" }));

export const GuildParityLive = Layer.scopedDiscard(make).pipe(
	Layer.provide(DiscordGatewayLayer),
);
