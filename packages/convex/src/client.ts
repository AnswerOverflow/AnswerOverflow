import { Config, Context, Effect, Layer } from "effect";
import type { Server } from "../convex/schema.js";
import {
	ConvexClientHttp,
	ConvexClientHttpLayer,
} from "./convex-client-http.js";

const service = Effect.gen(function* () {
	const externalSecret = yield* Config.string("EXTERNAL_WRITE_SECRET");
	const convexClient = yield* ConvexClientHttp;

	const upsertServer = (data: Server) =>
		convexClient.use((client, { api }) =>
			client.mutation(api.servers.upsertServerExternal, {
				data,
				apiKey: externalSecret,
			}),
		);

	return {
		upsertServer,
	};
});

export class Convex extends Context.Tag("Convex")<
	Convex,
	Effect.Effect.Success<typeof service>
>() {}

export const ConvexLayer = Layer.effect(Convex, service).pipe(
	Layer.provide(ConvexClientHttpLayer),
);
