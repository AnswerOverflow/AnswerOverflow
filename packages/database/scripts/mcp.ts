#!/usr/bin/env bun
import { McpSchema, McpServer } from "@effect/ai";
import { NodeRuntime, NodeSink, NodeStream } from "@effect/platform-node";
import { Data, Effect, Layer, Logger } from "effect";
import { api } from "../convex/_generated/api";
import { ConvexClientLiveUnifiedLayer } from "../src/convex-client-live";
import { ConvexClientUnified } from "../src/convex-unified-client";
import {
	FUNCTION_TYPE_MAP,
	NAMESPACE_STRUCTURE,
} from "../src/generated/function-types";

class McpConvexError extends Data.TaggedError("McpConvexError")<{
	cause: unknown;
}> {}

function serializeBigInts(obj: unknown): unknown {
	if (obj === null || obj === undefined) return obj;
	if (typeof obj === "bigint") return obj.toString();
	if (Array.isArray(obj)) return obj.map(serializeBigInts);
	if (typeof obj === "object") {
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj)) {
			result[key] = serializeBigInts(value);
		}
		return result;
	}
	return obj;
}

function deepConvertBigInts(obj: unknown): unknown {
	if (obj === null || obj === undefined) return obj;
	if (typeof obj === "string") {
		if (/^\d{15,}$/.test(obj)) {
			try {
				return BigInt(obj);
			} catch {
				return obj;
			}
		}
		return obj;
	}
	if (typeof obj === "number" && obj > Number.MAX_SAFE_INTEGER) {
		return BigInt(obj);
	}
	if (Array.isArray(obj)) return obj.map(deepConvertBigInts);
	if (typeof obj === "object") {
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj)) {
			result[key] = deepConvertBigInts(value);
		}
		return result;
	}
	return obj;
}

const QUERY_FUNCTIONS = Object.fromEntries(
	Object.entries(FUNCTION_TYPE_MAP).filter(([, type]) => type === "query"),
);

const registerTools = Effect.gen(function* () {
	const convexClient = yield* ConvexClientUnified;
	const backendAccessToken = process.env.BACKEND_ACCESS_TOKEN;

	if (!backendAccessToken) {
		yield* Effect.logError(
			"BACKEND_ACCESS_TOKEN environment variable is required",
		);
		return yield* Effect.fail(new Error("BACKEND_ACCESS_TOKEN not set"));
	}

	const server = yield* McpServer.McpServer;

	yield* server.addTool({
		tool: new McpSchema.Tool({
			name: "list_queries",
			description: "List all available Convex queries (read-only operations)",
			inputSchema: {
				type: "object",
				properties: {
					namespace: {
						type: "string",
						description: "Filter by namespace (e.g., 'servers', 'channels')",
					},
				},
			},
		}),
		handle: (payload: { namespace?: string } | undefined) =>
			Effect.sync(() => {
				const namespaceFilter = payload?.namespace;

				const queries: Array<{ path: string }> = [];

				for (const path of Object.keys(QUERY_FUNCTIONS)) {
					const [namespace] = path.split(".");
					if (namespaceFilter && namespace !== namespaceFilter) continue;
					queries.push({ path });
				}

				return new McpSchema.CallToolResult({
					isError: false,
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									namespaces: Object.keys(NAMESPACE_STRUCTURE),
									queries: queries.sort((a, b) => a.path.localeCompare(b.path)),
									count: queries.length,
								},
								null,
								2,
							),
						},
					],
				});
			}),
	});

	yield* server.addTool({
		tool: new McpSchema.Tool({
			name: "query",
			description:
				"Execute a Convex query (read-only). Use list_queries to see available queries.",
			inputSchema: {
				type: "object",
				properties: {
					fn: {
						type: "string",
						description:
							"The query function path (e.g., 'servers.getServerByDiscordId')",
					},
					args: {
						type: "object",
						additionalProperties: true,
						description: "Arguments to pass to the query",
					},
				},
				required: ["fn"],
			},
		}),
		handle: (
			payload: { fn?: string; args?: Record<string, unknown> } | undefined,
		) =>
			Effect.gen(function* () {
				const { fn, args: rawArgs } = payload ?? {};

				if (!fn) {
					return new McpSchema.CallToolResult({
						isError: true,
						content: [{ type: "text", text: "fn is required" }],
					});
				}

				const funcType = QUERY_FUNCTIONS[fn];

				if (!funcType) {
					const availableQueries = Object.keys(QUERY_FUNCTIONS).join(", ");
					return new McpSchema.CallToolResult({
						isError: true,
						content: [
							{
								type: "text",
								text: `Unknown or non-query function: ${fn}. Available queries: ${availableQueries}`,
							},
						],
					});
				}

				const [namespace, funcName] = fn.split(".");
				if (!namespace || !funcName) {
					return new McpSchema.CallToolResult({
						isError: true,
						content: [{ type: "text", text: `Invalid function path: ${fn}` }],
					});
				}

				const processedArgs = deepConvertBigInts(rawArgs ?? {});
				const fullArgs = {
					...(processedArgs as Record<string, unknown>),
					backendAccessToken,
				};

				const namespaceObj = api.private[namespace as keyof typeof api.private];
				if (!namespaceObj || typeof namespaceObj !== "object") {
					return new McpSchema.CallToolResult({
						isError: true,
						content: [
							{ type: "text", text: `Namespace not found: ${namespace}` },
						],
					});
				}

				const funcRef = (namespaceObj as Record<string, unknown>)[funcName];
				if (!funcRef) {
					return new McpSchema.CallToolResult({
						isError: true,
						content: [
							{
								type: "text",
								text: `Function not found: ${funcName} in ${namespace}`,
							},
						],
					});
				}

				const result = yield* Effect.tryPromise({
					try: () =>
						convexClient.client.query(funcRef as never, fullArgs as never),
					catch: (e) => new McpConvexError({ cause: e }),
				});

				return new McpSchema.CallToolResult({
					isError: false,
					content: [
						{
							type: "text",
							text: JSON.stringify(serializeBigInts(result), null, 2),
						},
					],
				});
			}).pipe(
				Effect.catchAll((error) =>
					Effect.succeed(
						new McpSchema.CallToolResult({
							isError: true,
							content: [
								{
									type: "text",
									text:
										error._tag === "McpConvexError"
											? `Convex error: ${String((error as McpConvexError).cause)}`
											: `Error: ${String(error)}`,
								},
							],
						}),
					),
				),
			),
	});
});

const ToolsLayer = Layer.scopedDiscard(registerTools).pipe(
	Layer.provide(ConvexClientLiveUnifiedLayer),
);

const ServerLayer = McpServer.layerStdio({
	name: "AnswerOverflow Database",
	version: "1.0.0",
	stdin: NodeStream.stdin,
	stdout: NodeSink.stdout,
}).pipe(Layer.provide(Logger.add(Logger.prettyLogger({ stderr: true }))));

const FullLayer = ToolsLayer.pipe(Layer.provide(ServerLayer));

NodeRuntime.runMain(Layer.launch(FullLayer));
