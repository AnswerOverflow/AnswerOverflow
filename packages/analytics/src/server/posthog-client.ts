import { PostHog as PostHogQueryClient } from "@typelytics/posthog";
import { Config, Context, Effect, Layer } from "effect";
import { events } from "./events";

const createPostHogService = Effect.gen(function* () {
	const posthogPersonalApiKey = yield* Config.string(
		"POSTHOG_PERSONAL_API_KEY",
	);
	const posthogProjectId = yield* Config.string("POSTHOG_PROJECT_ID");

	const posthogQueryClient = new PostHogQueryClient({
		events: events,
		host: "us.posthog.com",
		apiKey: posthogPersonalApiKey,
		projectId: posthogProjectId,
	});

	return posthogQueryClient;
});

export class PostHogClient extends Context.Tag("PostHogClient")<
	PostHogClient,
	Effect.Effect.Success<typeof createPostHogService>
>() {}

export const PostHogClientLayer = Layer.effect(
	PostHogClient,
	createPostHogService,
);
