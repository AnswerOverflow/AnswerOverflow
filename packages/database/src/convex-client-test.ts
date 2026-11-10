import { readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import aggregate from "@convex-dev/aggregate/test";
import { convexTest } from "@packages/convex-test";
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";
import { Context, Duration, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import betterAuthSchema from "../convex/betterAuth/schema";
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

async function buildModules(
	rootDir: string,
	pathPrefix: string = "",
): Promise<Record<string, () => Promise<unknown>>> {
	const convexFiles = await findConvexFiles(rootDir);
	const modules: Record<string, () => Promise<unknown>> = {};
	for (const file of convexFiles) {
		const normalizedPrefix = pathPrefix ? `${pathPrefix}/` : "";
		const normalizedPath = `/convex/${normalizedPrefix}${file.replace(/\\/g, "/")}`;
		const fullPath = resolve(rootDir, file);
		modules[normalizedPath] = async () => {
			return await import(fullPath);
		};
	}
	return modules;
}

const createTestService = Effect.gen(function* () {
	const [modules, betterAuthModules] = yield* Effect.all([
		Effect.promise(() => buildModules(convexDir)),
		Effect.promise(() =>
			buildModules(join(convexDir, "betterAuth"), "betterAuth"),
		),
	]);
	const testClient = convexTest(schema, modules);
	testClient.registerComponent(
		"betterAuth",
		betterAuthSchema,
		betterAuthModules,
	);

	aggregate.register(testClient, "rootChannelMessageCounts");
	aggregate.register(testClient, "threadMessageCounts");
	aggregate.register(testClient, "threadCounts");

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

	// convex-test keeps its database in a process-wide global, and every test
	// builds a fresh instance. A job scheduled with `runAfter(0)` fires on a
	// later tick; if the next test has replaced the global by then, the job
	// writes to a database with no open transaction ("Write outside of
	// transaction"). Run every due job to completion before this instance is
	// dropped.
	const drainDueScheduledFunctions = async () => {
		for (let i = 0; i < 100; i++) {
			await new Promise((resolve) => setTimeout(resolve, 0));
			await testClient.finishInProgressScheduledFunctions();
			const jobs = (await testClient.run((ctx) =>
				ctx.db.system.query("_scheduled_functions").collect(),
			)) as Array<{
				_id: Id<"_scheduled_functions">;
				scheduledTime: number;
				state: { kind: string };
			}>;
			const active = jobs.filter(
				(job) =>
					job.state.kind === "inProgress" ||
					(job.state.kind === "pending" && job.scheduledTime <= Date.now()),
			);
			if (active.length === 0) {
				// Jobs scheduled further out would otherwise fire into a later
				// test's database. Cancel them.
				await testClient.run(async (ctx) => {
					for (const job of jobs) {
						if (job.state.kind === "pending") {
							await ctx.scheduler.cancel(job._id);
						}
					}
				});
				return;
			}
		}
		throw new Error("Scheduled functions did not settle after 100 ticks");
	};

	return {
		use,
		client: adaptedClient,
		drainDueScheduledFunctions,
		createAuthenticatedClient,
		getQueryCallCount: testClient.getQueryCallCount,
		resetQueryCallCounts: testClient.resetQueryCallCounts,
	};
});

export class ConvexClientTest extends Context.Tag("ConvexClientTest")<
	ConvexClientTest,
	Effect.Effect.Success<typeof createTestService>
>() {}

const ConvexClientTestSharedLayer = Layer.scopedContext(
	Effect.gen(function* () {
		const service = yield* createTestService;
		yield* Effect.addFinalizer(() =>
			Effect.promise(() => service.drainDueScheduledFunctions()),
		);
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
