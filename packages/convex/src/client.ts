import { ConvexHttpClient } from "convex/browser";
import { Config, Context, Effect, Layer } from "effect";
import { api } from "../convex/_generated/api.js";
import type { Server } from "../convex/schema.js";

const createService = () =>
	Effect.gen(function* () {
		const convexUrl = yield* Config.string("CONVEX_URL");
		const externalSecret = yield* Config.string("EXTERNAL_WRITE_SECRET");
		const httpClient = new ConvexHttpClient(convexUrl);

		const upsertServer = (data: Server) =>
			Effect.tryPromise(() =>
				httpClient.mutation(api.servers.upsertServerExternal, {
					data,
					apiKey: externalSecret,
				}),
			);

		return {
			upsertServer,
		};
	});

export class Convex extends Context.Tag("ConvexService")<
	Convex,
	Effect.Effect.Success<ReturnType<typeof createService>>
>() {}

export const ConvexLayer = Layer.effect(Convex, createService());
