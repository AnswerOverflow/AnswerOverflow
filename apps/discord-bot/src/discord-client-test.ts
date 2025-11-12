import { ConfigProvider, Context, Effect, Layer } from "effect";
import { DiscordClient } from "./discord-client-service";
import { Discord, createDiscordService } from "./discord-service";
import {
	DiscordClientMock,
	DiscordClientMockLayer,
} from "./discord-client-mock";

// Provide a dummy token for Effect Config system (not used in mock)
const DiscordTokenLayer = Layer.setConfigProvider(
	ConfigProvider.fromJson({
		DISCORD_BOT_TOKEN: "mock-token-not-used",
	}),
);

const MockClientLayer = DiscordClientMockLayer().pipe(
	Layer.provide(DiscordTokenLayer),
);

/**
 * Test layer that provides a mock Discord client service
 * Use this in tests instead of the real DiscordClientLayer
 *
 * The mock service provides:
 * - A real Discord.js Client instance (works offline)
 * - Utility functions to seed the cache with test data
 * - Helper functions to create mock Guild/Channel objects
 * - Event emitters for testing event handlers
 */
// Provide DiscordClient using the mock client - this overrides DiscordClientLayer
// This must be provided before DiscordLayer, which requires DiscordClient
const MockDiscordClientLayer = Layer.effectContext(
	Effect.gen(function* () {
		const mock = yield* DiscordClientMock;
		// Return the client from the mock service as DiscordClient
		return Context.make(DiscordClient, mock.client);
	}),
).pipe(Layer.provide(MockClientLayer));

// Create a test-specific DiscordLayer that uses the mock client
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
