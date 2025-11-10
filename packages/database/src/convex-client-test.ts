// Build modules object using Bun's glob to bypass import.meta.glob

import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server";
import { convexTest, type TestConvex } from "convex-test";
import { Context, Effect, Layer } from "effect";
import { readdir } from "fs/promises";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import {
  type ConvexClientShared,
  ConvexClientUnified,
  ConvexError,
  type Watch,
} from "./convex-unified-client";

type TestConvexClient = ConvexClientShared & TestConvex<typeof schema>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const convexDir = join(projectRoot, "convex");

// Recursively find all .ts and .js files in convex directory
async function findConvexFiles(
  dir: string,
  basePath: string = ""
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
    const normalizedPath = "/convex/" + file.replace(/\\/g, "/");
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

  // Track all active watch queries so we can refresh them after mutations
  const activeWatches = new Set<() => Promise<void>>();

  // Wrap mutation to trigger watch updates after mutations complete
  const wrappedMutation = async <
    Mutation extends FunctionReference<"mutation">,
  >(
    mutation: Mutation,
    ...args: OptionalRestArgs<Mutation>
  ) => {
    const result = await testClient.mutation(mutation, ...args);
    // After mutation completes, refresh all active watches
    await Promise.all(Array.from(activeWatches).map((refresh) => refresh()));
    return result;
  };

  // Create a wrapper that implements ConvexClientShared
  const sharedClient: ConvexClientShared = {
    query: testClient.query.bind(testClient),
    mutation: wrappedMutation,
    action: testClient.action.bind(testClient),
    watchQuery: async <Query extends FunctionReference<"query">>(
      query: Query,
      ...args: OptionalRestArgs<Query>
    ) => {
      // Extract args
      const queryArgs = (args[0] ?? {}) as FunctionArgs<Query>;

      // For test client, create a Watch implementation that refreshes on mutations
      let currentValue: FunctionReturnType<Query> | undefined;
      const callbacks = new Set<() => void>();

      // Create deferred to wait for first update
      let resolveDeferred: (() => void) | undefined;
      const deferred = new Promise<void>((resolve) => {
        resolveDeferred = resolve;
      });

      let firstUpdate = true;
      // Refresh function that always triggers callbacks (like Convex does)
      const refreshValue = async () => {
        try {
          const newValue = await testClient.query(query, queryArgs);
          currentValue = newValue;
          // Always call callbacks, regardless of whether value changed
          callbacks.forEach((cb) => cb());
        } catch {
          // Ignore errors for now - could be enhanced to handle errors
        } finally {
          // Resolve deferred on first update (even if there was an error)
          if (firstUpdate) {
            firstUpdate = false;
            resolveDeferred?.();
          }
        }
      };

      // Run initial query (async, don't await yet)
      refreshValue();

      // Wait for first update before returning watch
      await deferred;

      const watch: Watch<FunctionReturnType<Query>> = {
        onUpdate: (callback: () => void) => {
          callbacks.add(callback);
          // Register this watch to be refreshed after mutations
          if (callbacks.size === 1) {
            activeWatches.add(refreshValue);
          }
          // Call the callback immediately if we have a value
          if (currentValue !== undefined) {
            // Use setTimeout to avoid calling synchronously
            setTimeout(() => callback(), 0);
          }
          return () => {
            callbacks.delete(callback);
            // Unregister when no more callbacks
            if (callbacks.size === 0) {
              activeWatches.delete(refreshValue);
            }
          };
        },
        localQueryResult: () => currentValue,
      };

      return watch;
    },
  };

  const use = <T>(
    fn: (
      client: TestConvexClient,
      convexApi: {
        api: typeof api;
        internal: typeof internal;
      }
    ) => T | Promise<T>
  ) =>
    Effect.tryPromise({
      async try() {
        // Merge sharedClient methods with the original test client
        return await fn({ ...testClient, ...sharedClient }, { api, internal });
      },
      catch(cause) {
        return new ConvexError({ cause });
      },
    }).pipe(Effect.withSpan("use_convex_test_client"));

  return { use, client: sharedClient };
});

export class ConvexClientTest extends Context.Tag("ConvexClientTest")<
  ConvexClientTest,
  Effect.Effect.Success<typeof createTestService>
>() {}

const ConvexClientTestSharedLayer = Layer.effectContext(
  Effect.gen(function* () {
    const service = yield* createTestService;
    return Context.make(ConvexClientTest, service).pipe(
      Context.add(ConvexClientUnified, service)
    );
  })
);

export const ConvexClientTestLayer = Layer.service(ConvexClientTest).pipe(
  Layer.provide(ConvexClientTestSharedLayer)
);

export const ConvexClientTestUnifiedLayer = Layer.service(
  ConvexClientUnified
).pipe(Layer.provide(ConvexClientTestSharedLayer));
