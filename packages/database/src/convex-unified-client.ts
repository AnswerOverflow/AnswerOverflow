/** biome-ignore-all lint/suspicious/noExplicitAny: needed for convex */
import type {
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server";
import { Context, Data, type Effect } from "effect";
import type { api, internal } from "../convex/_generated/api";

export class ConvexError extends Data.TaggedError("ConvexError")<{
  cause: unknown;
}> {}

export interface Watch<T> {
  onUpdate(callback: () => void): () => void;
  localQueryResult(): T | undefined;
}

export type ConvexClientShared = {
  query: <Query extends FunctionReference<"query">>(
    query: Query,
    ...args: OptionalRestArgs<Query>
  ) => FunctionReturnType<Query>;
  mutation: <Mutation extends FunctionReference<"mutation">>(
    mutation: Mutation,
    ...args: OptionalRestArgs<Mutation>
  ) => FunctionReturnType<Mutation>;
  action: <Action extends FunctionReference<"action">>(
    action: Action,
    ...args: OptionalRestArgs<Action>
  ) => FunctionReturnType<Action>;
  watchQuery: <Query extends FunctionReference<"query">>(
    query: Query,
    ...args: OptionalRestArgs<Query>
  ) => Watch<FunctionReturnType<Query>>;
};

type WrappedUnifiedClient = Readonly<{
  client: ConvexClientShared;
  use: <A>(
    fn: (
      client: ConvexClientShared,
      convexApi: { api: typeof api; internal: typeof internal }
    ) => A
  ) => Effect.Effect<A, ConvexError>;
}>;

export class ConvexClientUnified extends Context.Tag("ConvexClient")<
  ConvexClientUnified,
  WrappedUnifiedClient
>() {}
