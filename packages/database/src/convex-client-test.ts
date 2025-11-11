// Build modules object using Bun's glob to bypass import.meta.glob

import { readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { convexTest, type TestConvex } from "@packages/convex-test";
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
	OptionalRestArgs,
} from "convex/server";
import { Context, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import {
	type ConvexClientShared,
	ConvexClientUnified,
	ConvexError,
	type WrappedUnifiedClient,
} from "./convex-unified-client";

type TestConvexClient = ConvexClientShared & TestConvex<typeof schema>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const convexDir = join(projectRoot, "convex");

// Recursively find all .ts and .js files in convex directory
async function findConvexFiles(
	dir: string,
	basePath: string = "",
): Promise<string[]> {
	const files: string[] = [];
	try {
		const entries = await readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			const relativePath = join(basePath, entry.name);
			if (entry.isDirectory()) {
				files.push(...(await findConvexFiles(fullPath, relativePath)));
			} else if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) {
				files.push(relativePath);
			}
		}
	} catch {
		// Ignore errors
	}
	return files;
}

// Build modules object in the format convex-test expects
async function buildModules(): Promise<Record<string, () => Promise<unknown>>> {
	const convexFiles = await findConvexFiles(convexDir);
	const modules: Record<string, () => Promise<unknown>> = {};
	for (const file of convexFiles) {
		const normalizedPath = `/convex/${file.replace(/\\/g, "/")}`;
		const fullPath = resolve(convexDir, file);
		modules[normalizedPath] = async () => {
			return await import(fullPath);
		};
	}
	return modules;
}

const createTestService = Effect.gen(function* () {
	// Build modules and pass as second parameter to bypass import.meta.glob
	const modules = yield* Effect.promise(buildModules);
	const testClient = convexTest(schema, modules);

	// Track query calls for testing
	// Use a string-based key since Map object keys use reference equality
	// which might not work if query references are different instances
	const queryCallCounts = new Map<string, number>();
	const getQueryCallCount = (
		query: FunctionReference<"query">,
		args: unknown,
	) => {
		const argsKey = JSON.stringify(args);
		// Create a string key - function references should be stable, so we'll use
		// the query object itself converted to string (it should have some identifier)
		// If that doesn't work, we'll need to iterate and match by argsKey
		const queryStr = JSON.stringify(query);
		const key = `${queryStr}:${argsKey}`;
		return queryCallCounts.get(key) ?? 0;
	};
	const resetQueryCallCounts = () => {
		queryCallCounts.clear();
	};

	// Track all active watch queries so we can refresh them after mutations
	const activeWatches = new Set<() => Promise<void>>();

	// Wrap mutation to trigger watch updates after mutations complete
	const wrappedMutation = async <
		Mutation extends FunctionReference<"mutation" | "internalMutation">,
	>(
		mutation: Mutation,
		...args: OptionalRestArgs<Mutation>
	) => {
		const mutationArgs = (args[0] ?? {}) as FunctionArgs<Mutation>;
		const result = await testClient.mutation(mutation, mutationArgs);
		// After mutation completes, refresh all active watches
		await Promise.all(Array.from(activeWatches).map((refresh) => refresh()));
		return result as FunctionReturnType<Mutation>;
	};

	// Create a wrapper that implements ConvexClientShared
	const sharedClient: ConvexClientShared = {
		query: <Query extends FunctionReference<"query">>(
			query: Query,
			...args: OptionalRestArgs<Query>
		) => {
			const queryArgs = (args[0] ?? {}) as FunctionArgs<Query>;
			return testClient.query(query, queryArgs) as FunctionReturnType<Query>;
		},
		mutation: wrappedMutation,
		action: <Action extends FunctionReference<"action">>(
			action: Action,
			...args: OptionalRestArgs<Action>
		) => {
			const actionArgs = (args[0] ?? {}) as FunctionArgs<Action>;
			return testClient.action(
				action,
				actionArgs,
			) as FunctionReturnType<Action>;
		},
		onUpdate: <Query extends FunctionReference<"query">>(
			query: Query,
			args: FunctionArgs<Query>,
			callback: (result: FunctionReturnType<Query>) => void,
		) => {
			// Track query call - use string key matching getQueryCallCount
			const argsKey = JSON.stringify(args);
			const queryStr = JSON.stringify(query);
			const queryKey = `${queryStr}:${argsKey}`;
			queryCallCounts.set(queryKey, (queryCallCounts.get(queryKey) ?? 0) + 1);

			// For test client, create a refresh function that queries and calls callback
			let _currentValue: FunctionReturnType<Query> | undefined;
			const refreshValue = async () => {
				try {
					const newValue = await testClient.query(query, args);
					_currentValue = newValue;
					callback(newValue);
				} catch {
					// Ignore errors for now - could be enhanced to handle errors
				}
			};

			// Register this watch to be refreshed after mutations
			activeWatches.add(refreshValue);

			// Run initial query (async, don't await)
			refreshValue();

			// Return unsubscribe function
			return () => {
				activeWatches.delete(refreshValue);
			};
		},
	};

	const use = <A>(
		fn: (
			client: TestConvexClient,
			convexApi: {
				api: typeof api;
				internal: typeof internal;
			},
		) => A | Promise<A>,
	) => {
		return Effect.tryPromise({
			async try(): Promise<Awaited<A>> {
				// Merge sharedClient methods with the original test client
				const result = await fn(
					{ ...testClient, ...sharedClient },
					{ api, internal },
				);
				return result as Awaited<A>;
			},
			catch(cause) {
				// Log the actual error for debugging
				if (cause instanceof Error) {
					console.error("ConvexError cause:", cause.message, cause.stack);
				} else {
					console.error("ConvexError cause:", cause);
				}
				return new ConvexError({ cause });
			},
		}).pipe(Effect.withSpan("use_convex_test_client")) as Effect.Effect<
			Awaited<A>,
			ConvexError
		>;
	};

	return { use, client: sharedClient, getQueryCallCount, resetQueryCallCounts };
});

export class ConvexClientTest extends Context.Tag("ConvexClientTest")<
	ConvexClientTest,
	Effect.Effect.Success<typeof createTestService>
>() {}

const ConvexClientTestSharedLayer = Layer.effectContext(
	Effect.gen(function* () {
		const service = yield* createTestService;
		// Ensure the service matches WrappedUnifiedClient type
		const unifiedService: WrappedUnifiedClient = {
			client: service.client,
			use: service.use,
		};
		return Context.make(ConvexClientTest, service).pipe(
			Context.add(ConvexClientUnified, unifiedService),
		);
	}),
);

export const ConvexClientTestLayer = ConvexClientTestSharedLayer;

export const ConvexClientTestUnifiedLayer = ConvexClientTestSharedLayer;
