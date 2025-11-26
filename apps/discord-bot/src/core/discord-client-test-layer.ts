import { ConfigProvider, Context, Effect, Layer } from "effect";
import {
	DiscordClientMock,
	DiscordClientMockLayer,
} from "./discord-client-mock";
import { DiscordClient } from "./discord-client-service";
import { createDiscordService, Discord } from "./discord-service";

const DiscordTokenLayer = Layer.setConfigProvider(
	ConfigProvider.fromJson({
		DISCORD_TOKEN: "mock-token-not-used",
	}),
);

const MockClientLayer = DiscordClientMockLayer().pipe(
	Layer.provide(DiscordTokenLayer),
);

const MockDiscordClientLayer = Layer.effectContext(
	Effect.gen(function* () {
		const mock = yield* DiscordClientMock;
		return Context.make(DiscordClient, mock.client);
	}),
).pipe(Layer.provide(MockClientLayer));

const TestDiscordLayer = Layer.effect(Discord, createDiscordService).pipe(
	Layer.provide(MockDiscordClientLayer),
	Layer.provide(DiscordTokenLayer),
);

export const DiscordClientTestLayer = Layer.mergeAll(
	MockClientLayer,
	MockDiscordClientLayer,
	TestDiscordLayer,
	DiscordTokenLayer,
);
