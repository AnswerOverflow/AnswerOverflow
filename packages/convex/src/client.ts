import { Context, Effect, Layer } from "effect";
import type { Server } from "../convex/schema.js";
import {
	ConvexClient,
	ConvexClientHttpLayer,
	ConvexClientTestLayer,
} from "./convex-client.js";

const service = Effect.gen(function* () {
	const externalSecret = "hello"; //yield* Config.string("EXTERNAL_WRITE_SECRET");
	const convexClient = yield* ConvexClient;

	const upsertServer = (data: Server) =>
		convexClient.use((client, { api }) =>
			client.mutation(api.servers.upsertServerExternal, {
				data,
				apiKey: externalSecret,
			}),
		);

	const getServerById = (discordId: string) =>
		convexClient.use((client, { api }) =>
			client.query(api.servers.publicGetServerByDiscordId, {
				discordId,
			}),
		);

	return {
		upsertServer,
		getServerById,
	};
});

export class Convex extends Context.Tag("Convex")<
	Convex,
	Effect.Effect.Success<typeof service>
>() {}

export const ConvexLayer = Layer.effect(Convex, service).pipe(
	Layer.provide(ConvexClientHttpLayer),
);

export const ConvexTestLayer = Layer.effect(Convex, service).pipe(
	Layer.provide(ConvexClientTestLayer),
);
