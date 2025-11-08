// Build modules object using Bun's glob to bypass import.meta.glob

import { convexTest, type TestConvex } from "convex-test";
import { Context, Effect, Layer } from "effect";
import { readdir } from "fs/promises";
import { join, resolve } from "path";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import {
  type ConvexClientShared,
  ConvexClientUnified,
  ConvexError,
} from "./convex-unified-client";

type TestConvexClient = ConvexClientShared & TestConvex<typeof schema>;

const projectRoot = resolve(import.meta.dir, "..");
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
  const client = convexTest(schema, modules);

  const use = <T>(
    fn: (
      client: TestConvexClient,
      convexApi: {
        api: typeof api;
        internal: typeof internal;
      }
    ) => T
  ) =>
    Effect.tryPromise({
      async try() {
        return fn(client, { api, internal });
      },
      catch(cause) {
        return new ConvexError({ cause });
      },
    }).pipe(Effect.withSpan("use_convex_test_client"));

  return { use, client };
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
