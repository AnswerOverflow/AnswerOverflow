import { PostHog as PostHogQueryClient } from "@typelytics/posthog";
import { Config, Context, Effect, Layer } from "effect";
import { events } from "./events";
import { PostHogClient, PostHogClientLayer } from "./posthog-client";

export type ServerAnalyticsOptions = {
	serverId: string;
	to?: Date;
	from?: Date;
};

export type BaseProps = {
	"Answer Overflow Account Id": string;
};

const getPosthogQueryClientForDashboard = (
	opts: ServerAnalyticsOptions,
	apiKey: string,
	projectId: string,
) => {
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
};

export const service = Effect.gen(function* () {
	const posthogPersonalApiKey = yield* Config.string(
		"POSTHOG_PERSONAL_API_KEY",
	);
	const posthogProjectId = yield* Config.string("POSTHOG_PROJECT_ID");
	const posthogQueryClient = yield* PostHogClient;

	const getTopQuestionSolversForServer = (opts: ServerAnalyticsOptions) =>
		Effect.gen(function* () {
			const client = getPosthogQueryClientForDashboard(
				opts,
				posthogPersonalApiKey,
				posthogProjectId,
			);
			const result = yield* Effect.promise(() =>
				client
					.query()
					.addSeries("Solved Question", {
						sampling: "total",
					})
					.execute({
						type: "table",
						date_from: opts.from && "All time",
						breakdown_hide_other_aggregation: true,
						breakdown: "Question Solver Id",
					}),
			);
			return result.results["Solved Question"];
		});

	const getTopPages = (opts: ServerAnalyticsOptions) =>
		Effect.gen(function* () {
			const client = getPosthogQueryClientForDashboard(
				opts,
				posthogPersonalApiKey,
				posthogProjectId,
			);
			const result = yield* Effect.promise(() =>
				client
					.query()
					.addSeries("Message Page View", {
						sampling: "total",
					})
					.execute({
						type: "table",
						breakdown_hide_other_aggregation: true,
						refresh: true,
						breakdown: "Message Id",
					}),
			);
			return result.results["Message Page View"];
		});

	const getPopularPostPages = () =>
		Effect.gen(function* () {
			const result = yield* Effect.promise(() =>
				posthogQueryClient
					.query()
					.addSeries("Message Page View", {
						sampling: "total",
					})
					.execute({
						type: "table",
						breakdown_hide_other_aggregation: true,
						refresh: true,
						date_from: "Last 30 days",
						breakdown: "Message Id",
					}),
			);
			return result.results["Message Page View"];
		});

	const getPopularServers = () =>
		Effect.gen(function* () {
			const result = yield* Effect.promise(() =>
				posthogQueryClient
					.query()
					.addSeries("Message Page View", {
						sampling: "total",
					})
					.execute({
						type: "table",
						breakdown_hide_other_aggregation: true,
						refresh: true,
						date_from: "Last 30 days",
						breakdown: "Server Id",
					}),
			);
			return result.results["Message Page View"];
		});

	const getPageViewsForServer = (opts: ServerAnalyticsOptions) =>
		Effect.gen(function* () {
			const client = getPosthogQueryClientForDashboard(
				opts,
				posthogPersonalApiKey,
				posthogProjectId,
			);
			return yield* Effect.promise(() =>
				client
					.query()
					.addSeries("Message Page View", {
						label: "Page Views",
						sampling: "total",
					})
					.execute({ type: "area" }),
			);
		});

	const getServerInvitesClicked = (opts: ServerAnalyticsOptions) =>
		Effect.gen(function* () {
			const client = getPosthogQueryClientForDashboard(
				opts,
				posthogPersonalApiKey,
				posthogProjectId,
			);
			return yield* Effect.promise(() =>
				client
					.query()
					.addSeries("Server Invite Click", {
						label: "Invite Clicked",
						sampling: "total",
					})
					.execute({ type: "bar" }),
			);
		});

	const getQuestionsAndAnswers = (opts: ServerAnalyticsOptions) =>
		Effect.gen(function* () {
			const client = getPosthogQueryClientForDashboard(
				opts,
				posthogPersonalApiKey,
				posthogProjectId,
			);
			return yield* Effect.promise(() =>
				client
					.query()
					.addSeries("Asked Question", {
						label: "Questions Asked",
						sampling: "total",
					})
					.addSeries("Solved Question", {
						label: "Questions Solved",
						sampling: "total",
					})
					.execute({ type: "area" }),
			);
		});

	return {
		server: {
			getTopQuestionSolversForServer,
			getTopPages,
			getPageViewsForServer,
			getServerInvitesClicked,
			getQuestionsAndAnswers,
		},
		global: {
			getPopularPostPages,
			getPopularServers,
		},
	};
});

export class Analytics extends Context.Tag("Analytics")<
	Analytics,
	Effect.Effect.Success<typeof service>
>() {}

export const AnalyticsLayer = Layer.effect(Analytics, service).pipe(
	Layer.provide(PostHogClientLayer),
);
