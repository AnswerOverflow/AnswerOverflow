import { Context, Effect, Layer } from "effect";
import {
	PostHogClient,
	PostHogClientLayer,
	PostHogClientLayerForServer,
} from "./posthog-client";

export {
	channelWithDiscordInfoToAnalyticsData,
	memberToAnalyticsUser,
	messageToAnalyticsMessage,
	serverWithDiscordInfoToAnalyticsData,
	threadWithDiscordInfoToAnalyticsData,
} from "./discord-helpers";
export type {
	BaseProps,
	ChannelProps,
	ChannelPropsWithDiscordData,
	ChannelPropsWithSettings,
	MessageProps,
	MessageType,
	ServerProps,
	ServerPropsWithDiscordData,
	ServerPropsWithSettings,
	ThreadProps,
	UserProps,
	UserType,
} from "./types";

export type ServerAnalyticsOptions = {
	to?: Date;
	from?: Date;
};

export const service = Effect.gen(function* () {
	const client = yield* PostHogClient;

	const getTopQuestionSolversForServer = () =>
		Effect.gen(function* () {
			const result = yield* Effect.promise(() =>
				client
					.query()
					.addSeries("Solved Question", {
						sampling: "total",
					})
					.execute({
						type: "table",
						date_from: "All time",
						breakdown_hide_other_aggregation: true,
						breakdown: "Question Solver Id",
					}),
			);
			return result.results["Solved Question"];
		});

	const getTopPages = () =>
		Effect.gen(function* () {
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
				client
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
				client
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

	const getPageViewsForServer = () =>
		Effect.gen(function* () {
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

	const getServerInvitesClicked = () =>
		Effect.gen(function* () {
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

	const getQuestionsAndAnswers = () =>
		Effect.gen(function* () {
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

export const ServerAnalyticsLayer = (
	opts: ServerAnalyticsOptions & {
		serverId: string;
	},
) =>
	Layer.effect(Analytics, service).pipe(
		Layer.provide(PostHogClientLayerForServer(opts)),
	);
