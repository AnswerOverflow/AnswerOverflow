import { DiscordREST, Ix } from "dfx";
import { InteractionsRegistry } from "dfx/gateway";
import { Effect, Layer } from "effect";
import { DiscordGatewayLayer } from "./framework/discord-gateway";
import { DiscordApplication } from "./framework/discord-rest";

export const HelloLayer = Layer.effectDiscard(
	Effect.gen(function* () {
		const registry = yield* InteractionsRegistry;
		const _rest = yield* DiscordREST;
		const _application = yield* DiscordApplication;

		const hello = Ix.global(
			{
				name: "hello",
				description: "A basic command",
			},
			Effect.gen(function* () {
				const _context = yield* Ix.Interaction;

				return {
					type: 4,
					data: {
						content: "Hello, world!",
					},
				};
			}),
		);

		yield* registry.register(
			Ix.builder.add(hello).catchAllCause(Effect.logError),
		);
	}),
).pipe(Layer.provide(DiscordGatewayLayer));
