import { ConvexClient } from "convex/browser";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server";
import { Config, Context, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api";
import {
  type ConvexClientShared,
  ConvexClientUnified,
  ConvexError,
  type Watch,
} from "./convex-unified-client";

type HttpConvexClient = ConvexClientShared & ConvexClient;

const createHttpService = Effect.gen(function* () {
  const convexUrl = yield* Config.string("CONVEX_URL");

  const client = new ConvexClient(convexUrl);

  // Create a wrapper that implements ConvexClientShared
  const sharedClient: ConvexClientShared = {
    query: client.query.bind(client),
    mutation: client.mutation.bind(client),
    action: client.action.bind(client),
    watchQuery: <Query extends FunctionReference<"query">>(
      query: Query,
      ...args: OptionalRestArgs<Query>
    ) => {
      // Extract args - ConvexClient.onUpdate expects args as an object
      const queryArgs = (args[0] ?? {}) as FunctionArgs<Query>;

      // Create a Watch-like object using onUpdate
      let currentValue: FunctionReturnType<Query> | undefined;
      const callbacks = new Set<() => void>();

      const unsubscribe = client.onUpdate(query, queryArgs, (result) => {
        currentValue = result;
        callbacks.forEach((cb) => cb());
      });

      const watch: Watch<FunctionReturnType<Query>> = {
        onUpdate: (callback: () => void) => {
          callbacks.add(callback);
          return () => {
            callbacks.delete(callback);
            // If no more callbacks, unsubscribe
            if (callbacks.size === 0) {
              unsubscribe();
            }
          };
        },
        localQueryResult: () => currentValue ?? unsubscribe.getCurrentValue(),
      };

      return watch;
    },
  };

  const use = <T>(
    fn: (
      client: HttpConvexClient,
      convexApi: {
        api: typeof api;
        internal: typeof internal;
      }
    ) => T
  ) =>
    Effect.tryPromise({
      async try() {
        // Merge sharedClient methods with the original client
        const mergedClient = Object.assign(
          client,
          sharedClient
        ) as HttpConvexClient;
        return fn(mergedClient, { api, internal });
      },
      catch(cause) {
        return new ConvexError({ cause });
      },
    }).pipe(Effect.withSpan("use_convex_http_client"));

  return { use, client: sharedClient };
});

export class ConvexClientHttp extends Context.Tag("ConvexClientHttp")<
  ConvexClientHttp,
  Effect.Effect.Success<typeof createHttpService>
>() {}

const ConvexClientHttpSharedLayer = Layer.effectContext(
  Effect.gen(function* () {
    const service = yield* createHttpService;
    return Context.make(ConvexClientHttp, service).pipe(
      Context.add(ConvexClientUnified, service)
    );
  })
);

export const ConvexClientHttpLayer = Layer.service(ConvexClientHttp).pipe(
  Layer.provide(ConvexClientHttpSharedLayer)
);

export const ConvexClientHttpUnifiedLayer = Layer.service(
  ConvexClientUnified
).pipe(Layer.provide(ConvexClientHttpSharedLayer));
