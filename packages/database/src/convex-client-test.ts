import { readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { convexTest } from "@packages/convex-test";
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";
import { Context, Duration, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import {
	type ConvexClientShared,
	ConvexClientUnified,
	ConvexError,
	type WrappedUnifiedClient,
} from "./convex-unified-client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const convexDir = join(projectRoot, "convex");

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
			} else if (
				entry.isFile() &&
				/\.(ts|js)$/.test(entry.name) &&
				!entry.name.endsWith(".d.ts") &&
				!entry.name.endsWith(".test.ts")
			) {
				files.push(relativePath);
			}
		}
	} catch {}
	return files;
}

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
	const modules = yield* Effect.promise(buildModules);
	const testClient = convexTest(schema, modules);

	const adaptedClient: ConvexClientShared = {
		query: <Query extends FunctionReference<"query">>(
			query: Query,
			args: FunctionArgs<Query>,
		) => {
			return testClient.query(query, args) as FunctionReturnType<Query>;
		},
		mutation: <Mutation extends FunctionReference<"mutation">>(
			mutation: Mutation,
			args: FunctionArgs<Mutation>,
		) => {
			return testClient.mutation(
				mutation,
				args,
			) as FunctionReturnType<Mutation>;
		},
		action: <Action extends FunctionReference<"action">>(
			action: Action,
			args: FunctionArgs<Action>,
		) => {
			return testClient.action(action, args) as FunctionReturnType<Action>;
		},
		onUpdate: <Query extends FunctionReference<"query">>(
			query: Query,
			args: FunctionArgs<Query>,
			callback: (result: FunctionReturnType<Query>) => void,
		) => {
			const unsubscribeFn = testClient.onUpdate(query, args, callback);
			const unsubscribe = Object.assign(
				() => {
					unsubscribeFn();
				},
				{
					unsubscribe: unsubscribeFn,
					getCurrentValue: async () => {
						return (await testClient.query(
							query,
							args,
						)) as FunctionReturnType<Query>;
					},
				},
			);
			return unsubscribe;
		},
	};

	const use = <A>(
		fn: (
			client: ConvexClientShared,
			convexApi: {
				api: typeof api;
				internal: typeof internal;
			},
		) => A | Promise<A>,
	) => {
		return Effect.tryPromise({
			async try(): Promise<Awaited<A>> {
				const result = await fn(adaptedClient, { api, internal });
				return result as Awaited<A>;
			},
			catch(cause) {
				if (cause instanceof Error) {
					console.error("ConvexError cause:", cause.message, cause.stack);
				} else {
					console.error("ConvexError cause:", cause);
				}
				return new ConvexError({ cause });
			},
		}).pipe(
			Effect.timeout(Duration.seconds(15)),
			Effect.withSpan("use_convex_test_client"),
		) as Effect.Effect<Awaited<A>, ConvexError>;
	};

	const createAuthenticatedClient = (_token: string): ConvexClientShared =>
		adaptedClient;

	return {
		use,
		client: adaptedClient,
		createAuthenticatedClient,
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
		const unifiedService: WrappedUnifiedClient = {
			client: service.client,
			createAuthenticatedClient: service.createAuthenticatedClient,
			use: service.use,
		};
		return Context.make(ConvexClientTest, service).pipe(
			Context.add(ConvexClientUnified, unifiedService),
		);
	}),
);

export const ConvexClientTestLayer = ConvexClientTestSharedLayer;

export const ConvexClientTestUnifiedLayer = ConvexClientTestSharedLayer;
