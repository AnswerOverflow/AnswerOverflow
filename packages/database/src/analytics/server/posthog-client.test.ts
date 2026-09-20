// @vitest-environment node
import { createServer } from "node:http";
import { Effect, Either, Fiber, Redacted } from "effect";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makeAnalytics } from "./index";
import { createPostHogClient, PostHogClient } from "./posthog-client";

type CapturedRequest = {
	method: string | undefined;
	url: string | undefined;
	authorization: string | undefined;
	body: unknown;
};
const requests: CapturedRequest[] = [];
let responseBody: unknown;
let responseStatus = 200;
let rawBody: string | undefined;
let stallBody = false;
let onResponseClosed: () => void = () => {};
let onResponseStarted: () => void = () => {};
const server = createServer(async (request, response) => {
	let text = "";
	for await (const chunk of request) text += chunk;
	const body: unknown = JSON.parse(text);
	requests.push({
		method: request.method,
		url: request.url,
		authorization: request.headers.authorization,
		body,
	});
	response.writeHead(responseStatus, { "Content-Type": "application/json" });
	if (stallBody) {
		response.on("close", () => onResponseClosed());
		response.write('{"results":');
		onResponseStarted();
		return;
	}
	response.end(rawBody === undefined ? JSON.stringify(responseBody) : rawBody);
});
let client: ReturnType<typeof createPostHogClient>;
const scope = {
	serverId: "123456789012345678",
	from: new Date("2026-09-01T10:30:00Z"),
	to: new Date("2026-09-02T15:00:00Z"),
};
function analytics(options: Parameters<typeof makeAnalytics>[0] = scope) {
	return makeAnalytics(options).pipe(
		Effect.provideService(PostHogClient, client),
	);
}
function trend(order = 0, data = [3, 0]) {
	return {
		action: { order, id: "upstream-event" },
		count: data.reduce((total, value) => total + value, 0),
		data,
		days: ["2026-09-01", "2026-09-02"],
		labels: ["1-Sep-2026", "2-Sep-2026"],
		label: "Upstream display label",
	};
}
beforeAll(async () => {
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	if (!address || typeof address === "string")
		throw new Error("Missing test server address");
	client = createPostHogClient({
		apiKey: Redacted.make("test-personal-key"),
		projectId: "123",
		baseURL: new URL(`http://127.0.0.1:${address.port}`),
	});
});
afterAll(async () => {
	server.closeAllConnections();
	await new Promise<void>((resolve, reject) =>
		server.close((error) => (error ? reject(error) : resolve())),
	);
});
beforeEach(() => {
	requests.length = 0;
	responseStatus = 200;
	rawBody = undefined;
	stallBody = false;
	responseBody = {
		results: [trend()],
		extra_api_metadata: { safe_to_ignore: true },
	};
});

describe("direct PostHog dashboard queries", () => {
	it("uses the query endpoint and maps current results/count fields to the chart contract", async () => {
		const result = await Effect.runPromise(
			analytics().pipe(Effect.flatMap((a) => a.server.getPageViewsForServer())),
		);
		expect(result).toEqual({
			type: "area",
			results: {
				"Page Views": {
					data: [3, 0],
					days: ["2026-09-01", "2026-09-02"],
					labels: ["1-Sep-2026", "2-Sep-2026"],
					label: "Page Views",
					aggregated_value: 3,
				},
			},
		});
		expect(requests).toEqual([
			{
				method: "POST",
				url: "/api/projects/123/query/",
				authorization: "Bearer test-personal-key",
				body: {
					refresh: "blocking",
					query: {
						kind: "TrendsQuery",
						series: [
							{ kind: "EventsNode", event: "Message Page View", math: "total" },
						],
						dateRange: { date_from: "2026-09-01", date_to: "2026-09-02" },
						interval: "day",
						filterTestAccounts: false,
						properties: [
							{
								type: "event",
								key: "Server Id",
								operator: "exact",
								value: scope.serverId,
							},
						],
						trendsFilter: { display: "ActionsLineGraph" },
					},
				},
			},
		]);
	});
	it("maps questions and answers by series order, even if response order differs", async () => {
		responseBody = { results: [trend(1, [1, 0]), trend(0, [3, 0])] };
		const result = await Effect.runPromise(
			analytics().pipe(
				Effect.flatMap((a) => a.server.getQuestionsAndAnswers()),
			),
		);
		expect(result.results["Questions Asked"]?.aggregated_value).toBe(3);
		expect(result.results["Questions Solved"]?.aggregated_value).toBe(1);
	});
	it("keeps zero-valued invite buckets and uses weekly intervals for all time", async () => {
		responseBody = { results: [trend(0, [0, 0])] };
		const result = await Effect.runPromise(
			analytics({ serverId: scope.serverId }).pipe(
				Effect.flatMap((a) => a.server.getServerInvitesClicked()),
			),
		);
		expect(result.type).toBe("bar");
		expect(result.results["Invite Clicked"]?.aggregated_value).toBe(0);
		expect(requests[0]?.body).toMatchObject({
			query: { dateRange: { date_from: "all" }, interval: "week" },
		});
	});
	it("keys leaderboards by breakdown_value rather than changing display labels", async () => {
		responseBody = {
			results: [
				{
					breakdown_value: "123456789012345678",
					aggregated_value: 12,
					label: "Changed label",
					data: [],
					days: [],
				},
				{ breakdown_value: null, aggregated_value: 4 },
				{ breakdown_value: "", aggregated_value: 2 },
				{
					breakdown_value: "$$_posthog_breakdown_other_$$",
					aggregated_value: 1,
				},
			],
		};
		const result = await Effect.runPromise(
			analytics().pipe(
				Effect.flatMap((a) => a.server.getTopQuestionSolversForServer()),
			),
		);
		expect(result).toEqual({ "123456789012345678": { aggregated_value: 12 } });
		expect(requests[0]?.body).toMatchObject({
			query: {
				series: [{ event: "Solved Question" }],
				trendsFilter: { display: "ActionsTable" },
				breakdownFilter: {
					breakdown: "Question Solver Id",
					breakdown_type: "event",
					breakdown_hide_other_aggregation: true,
				},
			},
		});
	});
	it("preserves a legitimate empty leaderboard", async () => {
		responseBody = { results: [] };
		expect(
			await Effect.runPromise(
				analytics().pipe(Effect.flatMap((a) => a.server.getTopPages())),
			),
		).toEqual({});
	});
	it("queries global popularity for the last 30 days without a server filter", async () => {
		responseBody = { results: [] };
		const a = await Effect.runPromise(
			makeAnalytics().pipe(Effect.provideService(PostHogClient, client)),
		);
		await Effect.runPromise(a.global.getPopularPostPages());
		await Effect.runPromise(a.global.getPopularServers());
		expect(requests.map((r) => r.body)).toEqual([
			expect.objectContaining({
				query: expect.objectContaining({
					properties: [],
					dateRange: { date_from: "-30d" },
					breakdownFilter: expect.objectContaining({ breakdown: "Message Id" }),
				}),
			}),
			expect.objectContaining({
				query: expect.objectContaining({
					properties: [],
					dateRange: { date_from: "-30d" },
					breakdownFilter: expect.objectContaining({ breakdown: "Server Id" }),
				}),
			}),
		]);
	});
	it.each([
		{ result: [trend()] },
		{ results: [] },
		{ results: [trend(), trend()] },
		{ results: [trend(9)] },
		{ results: [{ ...trend(), count: "3" }] },
		{ results: [{ ...trend(), days: [] }] },
	])("rejects malformed or incomplete time series", async (body) => {
		responseBody = body;
		const result = await Effect.runPromise(
			analytics().pipe(
				Effect.flatMap((a) => a.server.getPageViewsForServer()),
				Effect.either,
			),
		);
		expect(Either.isLeft(result) && result.left.reason).toBe("response");
	});
	it("rejects non-ID breakdown values before they can reach database lookups", async () => {
		responseBody = {
			results: [{ breakdown_value: "unexpected-label", aggregated_value: 3 }],
		};
		const result = await Effect.runPromise(
			analytics().pipe(
				Effect.flatMap((a) => a.server.getTopPages()),
				Effect.either,
			),
		);
		expect(Either.isLeft(result) && result.left.reason).toBe("response");
	});
	it("surfaces HTTP errors without exposing the response body", async () => {
		responseStatus = 429;
		responseBody = { detail: "sensitive upstream response" };
		const result = await Effect.runPromise(
			analytics().pipe(
				Effect.flatMap((a) => a.server.getTopPages()),
				Effect.either,
			),
		);
		if (!Either.isLeft(result)) throw new Error("Expected a query failure");
		expect(result.left).toMatchObject({
			_tag: "PostHogQueryError",
			reason: "http",
			status: 429,
		});
		expect(String(result.left)).not.toContain("sensitive");
		expect(String(result.left)).not.toContain("test-personal-key");
	});
	it("rejects invalid JSON as a typed response failure", async () => {
		rawBody = "not JSON";
		const result = await Effect.runPromise(
			analytics().pipe(
				Effect.flatMap((a) => a.server.getPageViewsForServer()),
				Effect.either,
			),
		);
		expect(Either.isLeft(result) && result.left.reason).toBe("response");
	});
	it("aborts an in-flight response body when the owning fiber is interrupted", async () => {
		stallBody = true;
		const started = new Promise<void>((resolve) => {
			onResponseStarted = resolve;
		});
		const closed = new Promise<void>((resolve) => {
			onResponseClosed = resolve;
		});
		const fiber = Effect.runFork(
			analytics().pipe(Effect.flatMap((a) => a.server.getPageViewsForServer())),
		);
		await started;
		await Effect.runPromise(Fiber.interrupt(fiber));
		await closed;
	});
});
