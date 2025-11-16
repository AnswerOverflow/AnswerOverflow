import { DatabaseTestLayer } from "@packages/database/database-test";
import { Layer } from "effect";
import { DiscordClientTestLayer } from "../core/discord-client-test-layer";

export const TestLayer = Layer.mergeAll(
	DiscordClientTestLayer,
	DatabaseTestLayer,
);
