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

	// Create a wrapper that implements ConvexClientShared
	const sharedClient: ConvexClientShared = {
		query: <Query extends FunctionReference<"query">>(
			query: Query,
			...args: OptionalRestArgs<Query>
		) => {
			const queryArgs = (args[0] ?? {}) as FunctionArgs<Query>;
			return testClient.query(query, queryArgs) as FunctionReturnType<Query>;
		},
		mutation: <
			Mutation extends
				| FunctionReference<"mutation", "public">
				| FunctionReference<"mutation", "internal">,
		>(
			mutation: Mutation,
			...args: OptionalRestArgs<Mutation>
		) => {
			const mutationArgs = (args[0] ?? {}) as FunctionArgs<Mutation>;
			return testClient.mutation(
				mutation,
				mutationArgs,
			) as FunctionReturnType<Mutation>;
		},
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
			// Use the built-in onUpdate from convex-test
			return testClient.onUpdate(query, args, callback);
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

	return {
		use,
		client: sharedClient,
		getQueryCallCount: testClient.getQueryCallCount,
		resetQueryCallCounts: testClient.resetQueryCallCounts,
	};
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
