import { PostHog as PostHogQueryClient } from "@typelytics/posthog";
import { Context, Effect, Layer } from "effect";
import { events } from "./events";

const createPostHogService = Effect.gen(function* () {
	yield* Effect.void;
	const posthogPersonalApiKey = process.env.POSTHOG_PERSONAL_API_KEY!;
	const posthogProjectId = process.env.POSTHOG_PROJECT_ID!;

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
		yield* Effect.void;
		const apiKey = process.env.POSTHOG_PERSONAL_API_KEY!;
		const projectId = process.env.POSTHOG_PROJECT_ID!;
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
				date_to: opts.to?.toISOString().split("T")[0]!,
				// @ts-expect-error
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
