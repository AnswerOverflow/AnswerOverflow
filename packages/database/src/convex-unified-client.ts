/** biome-ignore-all lint/suspicious/noExplicitAny: needed for convex */
import type { ConvexClient } from "convex/browser";
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";
import { Context, Data, type Effect } from "effect";
import type { api } from "../convex/_generated/api";

export class ConvexError extends Data.TaggedError("ConvexError")<{
	cause: unknown;
}> {}

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
	createAuthenticatedClient: (token: string) => ConvexClientShared;
	use: <A>(
		fn: (
			client: ConvexClientShared,
			convexApi: { api: typeof api },
		) => A | Promise<A>,
	) => Effect.Effect<Awaited<A>, ConvexError>;
}>;

export class ConvexClientUnified extends Context.Tag("ConvexClient")<
	ConvexClientUnified,
	WrappedUnifiedClient
>() {}
