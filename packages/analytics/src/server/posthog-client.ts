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

export const makeServerAnalyticsClient = (opts: ServerAnalyticsOptions) =>
	Effect.gen(function* () {
		const apiKey = yield* Config.string("POSTHOG_PERSONAL_API_KEY");
		const projectId = yield* Config.string("POSTHOG_PROJECT_ID");
		return new PostHogQueryClient({
			events,
			apiKey,
			projectId,
			globalFilters: {
				filters: {
					compare: "exact",
					property: "Server Id",
					value: opts.serverId,
				},
			},
			executionOptions: {
				type: "line",
				// @ts-expect-error
				// biome-ignore lint/style/noNonNullAssertion: we know the date is not null
				date_to: opts.to?.toISOString().split("T")[0]!,
				// @ts-expect-error
				// biome-ignore lint/style/noNonNullAssertion: we know the date is not null
				date_from: opts.from?.toISOString().split("T")[0]!,
			},
		});
	});

export const PostHogClientLayerForServer = (opts: ServerAnalyticsOptions) =>
	Layer.effect(PostHogClient, makeServerAnalyticsClient(opts));

export type ServerAnalyticsOptions = {
	serverId: string;
	to?: Date;
	from?: Date;
};
