/** biome-ignore-all lint/suspicious/noExplicitAny: needed for convex */
import type { ConvexClient } from "convex/browser";
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";
import { Context, Data, type Effect } from "effect";
import type { api, internal } from "../convex/_generated/api";

export class ConvexError extends Data.TaggedError("ConvexError")<{
	cause: unknown;
}> {}

// Extract the shared interface from ConvexClient - this is the source of truth
// We pick only the methods we need for our unified interface
// Override mutation to accept both public and internal mutations
export type ConvexClientShared = Pick<
	ConvexClient,
	"query" | "action" | "onUpdate"
> & {
	mutation: <Mutation extends FunctionReference<"mutation", any>>(
		mutation: Mutation,
		args: FunctionArgs<Mutation>,
		options?: Parameters<ConvexClient["mutation"]>[2],
	) => Promise<FunctionReturnType<Mutation>>;
};

export type WrappedUnifiedClient = Readonly<{
	client: ConvexClientShared;
	use: <A>(
		fn: (
			client: ConvexClientShared,
			convexApi: { api: typeof api; internal: typeof internal },
		) => A | Promise<A>,
	) => Effect.Effect<Awaited<A>, ConvexError>;
}>;

export class ConvexClientUnified extends Context.Tag("ConvexClient")<
	ConvexClientUnified,
	WrappedUnifiedClient
>() {}
