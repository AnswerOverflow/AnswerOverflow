import { Context, Effect, Layer } from "effect";
import { z } from "zod";
import {
	PostHogClient,
	PostHogClientLayer,
	PostHogQueryError,
	type TrendsQuery,
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

/** Inclusive calendar dates for a dashboard's analytics. No start means all time. */
export type ServerAnalyticsOptions = {
	readonly to?: Date;
	readonly from?: Date;
};

type ServerScope = ServerAnalyticsOptions & { readonly serverId: string };
type Series = { readonly event: string; readonly label: string };
type ChartData = {
	data: number[];
	aggregated_value: number;
	days: string[];
	labels: string[];
	label: string;
};

const countSchema = z.number().finite().nonnegative();
const timeSeriesSchema = z.object({
	results: z.array(
		z
			.object({
				count: countSchema,
				data: z.array(countSchema),
				days: z.array(z.string()),
				labels: z.array(z.string()),
				action: z.object({ order: z.number().int().nonnegative() }),
			})
			.refine(
				(row) =>
					row.data.length === row.days.length &&
					row.days.length === row.labels.length,
			),
	),
});
const breakdownSchema = z.object({
	results: z.array(
		z.object({
			breakdown_value: z.string().nullable(),
			aggregated_value: countSchema,
		}),
	),
});

/** Builds dashboard queries and projects current PostHog responses into chart data. */
export const makeAnalytics = (scope?: ServerScope) =>
	Effect.gen(function* () {
		const client = yield* PostHogClient;
		const queryFor = (
			series: readonly Series[],
			breakdown?: string,
			popular = false,
		): TrendsQuery => ({
			kind: "TrendsQuery",
			series: series.map(({ event }) => ({
				kind: "EventsNode",
				event,
				math: "total",
			})),
			dateRange: {
				date_from: popular
					? "-30d"
					: scope?.from
						? scope.from.toISOString().slice(0, 10)
						: "all",
				...(!popular && scope?.to
					? { date_to: scope.to.toISOString().slice(0, 10) }
					: {}),
			},
			interval: popular || scope?.from ? "day" : "week",
			filterTestAccounts: false,
			properties: scope
				? [
						{
							type: "event",
							key: "Server Id",
							operator: "exact",
							value: scope.serverId,
						},
					]
				: [],
			trendsFilter: {
				display: breakdown ? "ActionsTable" : "ActionsLineGraph",
			},
			...(breakdown
				? {
						breakdownFilter: {
							breakdown,
							breakdown_type: "event",
							breakdown_hide_other_aggregation: true,
						},
					}
				: {}),
		});

		const timeSeries = <Type extends "area" | "bar">(
			type: Type,
			series: readonly Series[],
		) =>
			Effect.gen(function* () {
				const response = yield* client.query(
					queryFor(series),
					timeSeriesSchema,
				);
				const results: Record<string, ChartData> = {};
				for (const row of response.results) {
					const definition = series[row.action.order];
					if (!definition || Object.hasOwn(results, definition.label)) {
						return yield* Effect.fail(new PostHogQueryError("response"));
					}
					results[definition.label] = {
						data: row.data,
						aggregated_value: row.count,
						days: row.days,
						labels: row.labels,
						label: definition.label,
					};
				}
				if (Object.keys(results).length !== series.length) {
					return yield* Effect.fail(new PostHogQueryError("response"));
				}
				return { type, results };
			});

		const breakdown = (event: string, property: string, popular = false) =>
			Effect.gen(function* () {
				const response = yield* client.query(
					queryFor([{ event, label: event }], property, popular),
					breakdownSchema,
				);
				const results: Record<string, { aggregated_value: number }> = {};
				for (const row of response.results) {
					const id = row.breakdown_value;
					// Missing properties and PostHog's synthetic buckets are not Discord IDs.
					if (
						id === null ||
						id === "" ||
						id === "$$_posthog_breakdown_null_$$" ||
						id === "$$_posthog_breakdown_other_$$"
					)
						continue;
					if (!/^[0-9]+$/.test(id) || Object.hasOwn(results, id)) {
						return yield* Effect.fail(new PostHogQueryError("response"));
					}
					results[id] = { aggregated_value: row.aggregated_value };
				}
				return results;
			});

		return {
			server: {
				getTopQuestionSolversForServer: () =>
					breakdown("Solved Question", "Question Solver Id"),
				getTopPages: () => breakdown("Message Page View", "Message Id"),
				getPageViewsForServer: () =>
					timeSeries("area", [
						{ event: "Message Page View", label: "Page Views" },
					]),
				getServerInvitesClicked: () =>
					timeSeries("bar", [
						{ event: "Server Invite Click", label: "Invite Clicked" },
					]),
				getQuestionsAndAnswers: () =>
					timeSeries("area", [
						{ event: "Asked Question", label: "Questions Asked" },
						{ event: "Solved Question", label: "Questions Solved" },
					]),
			},
			global: {
				getPopularPostPages: () =>
					breakdown("Message Page View", "Message Id", true),
				getPopularServers: () =>
					breakdown("Message Page View", "Server Id", true),
			},
		};
	});

/** Dashboard analytics with explicit labels and totals. */
export class Analytics extends Context.Tag("Analytics")<
	Analytics,
	Effect.Effect.Success<ReturnType<typeof makeAnalytics>>
>() {}

/** Global analytics over the last 30 days. */
export const AnalyticsLayer = Layer.effect(Analytics, makeAnalytics()).pipe(
	Layer.provide(PostHogClientLayer),
);

/** Analytics restricted to one server and the selected date range. */
export const ServerAnalyticsLayer = (opts: ServerScope) =>
	Layer.effect(Analytics, makeAnalytics(opts)).pipe(
		Layer.provide(PostHogClientLayer),
	);
