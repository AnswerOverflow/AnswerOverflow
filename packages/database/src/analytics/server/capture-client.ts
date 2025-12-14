import { Context, Effect, Layer } from "effect";
import { PostHog } from "posthog-node";

const createPostHogCaptureClient = Effect.gen(function* () {
	yield* Effect.void;
	const apiKey = process.env.NEXT_PUBLIC_POSTHOG_TOKEN;
	if (!apiKey) {
		console.warn("PostHog API key is not set, no analytics will be captured");
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
