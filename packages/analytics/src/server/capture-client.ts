import { Config, Context, Effect, Layer } from "effect";
import { PostHog } from "posthog-node";

const createPostHogCaptureClient = Effect.gen(function* () {
	const apiKey = yield* Config.string("POSTHOG_API_KEY").pipe(
		Effect.catchAll(() => Effect.succeed(undefined)),
	);
	if (!apiKey) {
		return undefined;
	}
	return new PostHog(apiKey, {
		host: "https://us.posthog.com",
	});
});

export class PostHogCaptureClient extends Context.Tag("PostHogCaptureClient")<
	PostHogCaptureClient,
	Effect.Effect.Success<typeof createPostHogCaptureClient>
>() {}

export const PostHogCaptureClientLayer = Layer.effect(
	PostHogCaptureClient,
	createPostHogCaptureClient,
);
