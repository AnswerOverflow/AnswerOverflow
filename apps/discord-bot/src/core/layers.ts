import { PostHogCaptureClientLayer } from "@packages/database/analytics/server/capture-client";
import { DatabaseTestLayer } from "@packages/database/database-test";
import { ConvexStorageLayer } from "@packages/database/storage";
import { Layer } from "effect";
import { DiscordClientTestLayer } from "../core/discord-client-test-layer";

export const TestLayer = Layer.mergeAll(
	DiscordClientTestLayer,
	DatabaseTestLayer,
	ConvexStorageLayer.pipe(Layer.provide(DatabaseTestLayer)),
	PostHogCaptureClientLayer,
);
