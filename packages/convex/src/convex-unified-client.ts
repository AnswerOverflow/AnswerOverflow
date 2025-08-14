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

export type ConvexClientShared = {
	query: <Query extends FunctionReference<"query", any>>(
		query: Query,
		...args: OptionalRestArgs<Query>
	) => FunctionReturnType<Query>;
	mutation: <Mutation extends FunctionReference<"mutation", any>>(
		mutation: Mutation,
		...args: OptionalRestArgs<Mutation>
	) => FunctionReturnType<Mutation>;
	action: <Action extends FunctionReference<"action", any>>(
		action: Action,
		...args: OptionalRestArgs<Action>
	) => FunctionReturnType<Action>;
};

type WrappedUnifiedClient = Readonly<{
	client: ConvexClientShared;
	use: <A>(
		fn: (
			client: ConvexClientShared,
			convexApi: { api: typeof api; internal: typeof internal },
		) => A,
	) => Effect.Effect<A, ConvexError>;
}>;

export class ConvexClientUnified extends Context.Tag("ConvexClient")<
	ConvexClientUnified,
	WrappedUnifiedClient
>() {}
