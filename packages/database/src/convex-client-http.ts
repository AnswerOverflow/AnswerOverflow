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
  type WrappedUnifiedClient,
} from "./convex-unified-client";

type HttpConvexClient = ConvexClientShared & ConvexClient;

const createHttpService = Effect.gen(function* () {
  const convexUrl = yield* Config.string("CONVEX_URL");

  const client = new ConvexClient(convexUrl);

  // Create a wrapper that implements ConvexClientShared
  const sharedClient: ConvexClientShared = {
    query: <Query extends FunctionReference<"query">>(
      query: Query,
      ...args: OptionalRestArgs<Query>
    ) => {
      const queryArgs = (args[0] ?? {}) as FunctionArgs<Query>;
      return client.query(query, queryArgs) as FunctionReturnType<Query>;
    },
    mutation: <Mutation extends FunctionReference<"mutation">>(
      mutation: Mutation,
      ...args: OptionalRestArgs<Mutation>
    ) => {
      const mutationArgs = (args[0] ?? {}) as FunctionArgs<Mutation>;
      return client.mutation(mutation, mutationArgs) as FunctionReturnType<Mutation>;
    },
    action: <Action extends FunctionReference<"action">>(
      action: Action,
      ...args: OptionalRestArgs<Action>
    ) => {
      const actionArgs = (args[0] ?? {}) as FunctionArgs<Action>;
      return client.action(action, actionArgs) as FunctionReturnType<Action>;
    },
    onUpdate: <Query extends FunctionReference<"query">>(
      query: Query,
      args: FunctionArgs<Query>,
      callback: (result: FunctionReturnType<Query>) => void
    ) => {
      return client.onUpdate(query, args, callback);
    },
  };

  const use = <A>(
    fn: (
      client: HttpConvexClient,
      convexApi: {
        api: typeof api;
        internal: typeof internal;
      }
    ) => A | Promise<A>
  ) => {
    return Effect.tryPromise({
      async try(): Promise<Awaited<A>> {
        // Merge sharedClient methods with the original client
        const mergedClient = Object.assign(
          client,
          sharedClient
        ) as HttpConvexClient;
        const result = await fn(mergedClient, { api, internal });
        return result as Awaited<A>;
      },
      catch(cause) {
        return new ConvexError({ cause });
      },
    }).pipe(Effect.withSpan("use_convex_http_client")) as Effect.Effect<Awaited<A>, ConvexError>;
  };

  return { use, client: sharedClient };
});

export class ConvexClientHttp extends Context.Tag("ConvexClientHttp")<
  ConvexClientHttp,
  Effect.Effect.Success<typeof createHttpService>
>() {}

const ConvexClientHttpSharedLayer = Layer.effectContext(
  Effect.gen(function* () {
    const service = yield* createHttpService;
    // Ensure the service matches WrappedUnifiedClient type
    const unifiedService: WrappedUnifiedClient = {
      client: service.client,
      use: service.use,
    };
    return Context.make(ConvexClientHttp, service).pipe(
      Context.add(ConvexClientUnified, unifiedService)
    );
  })
);

export const ConvexClientHttpLayer = Layer.service(ConvexClientHttp).pipe(
  Layer.provide(ConvexClientHttpSharedLayer)
);

export const ConvexClientHttpUnifiedLayer = Layer.service(
  ConvexClientUnified
).pipe(Layer.provide(ConvexClientHttpSharedLayer));
