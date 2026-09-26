import {
	Config,
	ConfigProvider,
	Context,
	Effect,
	Layer,
	Redacted,
} from "effect";
import type { z } from "zod";

/** The subset of PostHog's query API used by dashboard analytics. */
export type TrendsQuery = {
	readonly kind: "TrendsQuery";
	readonly series: readonly {
		readonly kind: "EventsNode";
		readonly event: string;
		readonly math: "total";
	}[];
	readonly dateRange: { readonly date_from: string; readonly date_to?: string };
	readonly interval: "day" | "week";
	readonly filterTestAccounts: false;
	readonly properties: readonly {
		readonly type: "event";
		readonly key: string;
		readonly operator: "exact";
		readonly value: string;
	}[];
	readonly trendsFilter: {
		readonly display: "ActionsLineGraph" | "ActionsTable";
	};
	readonly breakdownFilter?: {
		readonly breakdown: string;
		readonly breakdown_type: "event";
		readonly breakdown_hide_other_aggregation: true;
	};
};

/** A safe analytics failure; response bodies and credentials are never logged. */
export class PostHogQueryError extends Error {
	readonly _tag = "PostHogQueryError";

	constructor(
		readonly reason: "network" | "http" | "response" | "timeout",
		readonly status?: number,
		cause?: unknown,
	) {
		super(
			`PostHog query failed (${reason}${status === undefined ? "" : `, HTTP ${status}`})`,
			{ cause },
		);
	}
}

/** Creates a query adapter. Requests are cancellable and responses are parsed at the boundary. */
export function createPostHogClient(config: {
	readonly apiKey: Redacted.Redacted<string>;
	readonly projectId: string;
	readonly baseURL: URL;
}) {
	const endpoint = new URL(
		`/api/projects/${encodeURIComponent(config.projectId)}/query/`,
		config.baseURL,
	);
	return {
		query: <A>(query: TrendsQuery, schema: z.ZodType<A>) =>
			Effect.acquireUseRelease(
				Effect.sync(() => new AbortController()),
				(controller) =>
					Effect.gen(function* () {
						const response = yield* Effect.tryPromise({
							try: () =>
								fetch(endpoint, {
									method: "POST",
									headers: {
										Authorization: `Bearer ${Redacted.value(config.apiKey)}`,
										"Content-Type": "application/json",
									},
									body: JSON.stringify({ query, refresh: "blocking" }),
									signal: controller.signal,
								}),
							catch: (cause) =>
								new PostHogQueryError("network", undefined, cause),
						});
						if (!response.ok) {
							return yield* Effect.fail(
								new PostHogQueryError("http", response.status),
							);
						}
						const body: unknown = yield* Effect.tryPromise({
							try: () => response.json(),
							catch: () => new PostHogQueryError("response", response.status),
						});
						const parsed = schema.safeParse(body);
						if (!parsed.success) {
							return yield* Effect.fail(
								new PostHogQueryError("response", response.status),
							);
						}
						return parsed.data;
					}),
				(controller) => Effect.sync(() => controller.abort()),
			).pipe(
				Effect.timeoutFail({
					duration: "25 seconds",
					onTimeout: () => new PostHogQueryError("timeout"),
				}),
			),
	};
}

/** Direct PostHog queries, independent of event capture. */
export class PostHogClient extends Context.Tag("PostHogClient")<
	PostHogClient,
	ReturnType<typeof createPostHogClient>
>() {}

/** Reads required production configuration once when the analytics layer is built. */
export const PostHogClientLayer = Layer.effect(
	PostHogClient,
	Effect.suspend(() =>
		Effect.gen(function* () {
			const apiKey = yield* Config.redacted("POSTHOG_PERSONAL_API_KEY").pipe(
				Config.validate({
					message: "POSTHOG_PERSONAL_API_KEY must not be empty",
					validation: (value) => Redacted.value(value).length > 0,
				}),
			);
			const projectId = yield* Config.string("POSTHOG_PROJECT_ID").pipe(
				Config.validate({
					message: "POSTHOG_PROJECT_ID must be a numeric project ID",
					validation: (value) => /^\d+$/.test(value),
				}),
			);
			return createPostHogClient({
				apiKey,
				projectId,
				baseURL: new URL("https://us.posthog.com"),
			});
		}).pipe(
			Effect.withConfigProvider(
				ConfigProvider.fromJson({
					// Convex supports direct env reads, but not the membership checks used
					// by Effect's default environment provider. Parse an explicit snapshot.
					POSTHOG_PERSONAL_API_KEY: process.env.POSTHOG_PERSONAL_API_KEY,
					POSTHOG_PROJECT_ID: process.env.POSTHOG_PROJECT_ID,
				}),
			),
		),
	),
);
