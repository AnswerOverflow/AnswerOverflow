import type {
	DefaultFunctionArgs,
	RegisteredQuery,
	RegisteredMutation,
	RegisteredAction,
} from "convex/server";
import { Data, Effect, Schema } from "effect";
import {
	ConfectActionCtx as ConfectActionCtxService,
	type ConfectActionCtx as ConfectActionCtxType,
	type ConfectDataModelFromConfectSchemaDefinition,
	ConfectMutationCtx as ConfectMutationCtxService,
	type ConfectMutationCtx as ConfectMutationCtxType,
	ConfectQueryCtx as ConfectQueryCtxService,
	type ConfectQueryCtx as ConfectQueryCtxType,
	makeFunctions,
} from "@packages/confect/server";
import { confectSchema } from "../schema";
import {
	mutation as triggerMutation,
	internalMutation as triggerInternalMutation,
} from "../triggers";

type ConfectSchema = typeof confectSchema;
type ConfectDataModel =
	ConfectDataModelFromConfectSchemaDefinition<ConfectSchema>;

export const ConfectQueryCtx = ConfectQueryCtxService<ConfectDataModel>();
export type ConfectQueryCtx = ConfectQueryCtxType<ConfectDataModel>;

export const ConfectMutationCtx = ConfectMutationCtxService<ConfectDataModel>();
export type ConfectMutationCtx = ConfectMutationCtxType<ConfectDataModel>;

export const ConfectActionCtx = ConfectActionCtxService<ConfectDataModel>();
export type ConfectActionCtx = ConfectActionCtxType<ConfectDataModel>;

export class InvalidBackendTokenError extends Data.TaggedError(
	"InvalidBackendTokenError",
)<{
	readonly message: string;
}> {}

export const InvalidBackendTokenErrorSchema = Schema.Struct({
	_tag: Schema.Literal("InvalidBackendTokenError"),
	message: Schema.String,
});

const baseFunctions = makeFunctions(confectSchema, {
	mutationBuilder: triggerMutation,
	internalMutationBuilder: triggerInternalMutation,
});

const BackendAccessTokenArg = Schema.Struct({
	backendAccessToken: Schema.String,
});

const validateBackendAccessToken = (
	token: string,
): Effect.Effect<void, InvalidBackendTokenError> =>
	Effect.gen(function* () {
		const expectedToken = process.env.BACKEND_ACCESS_TOKEN;

		if (!expectedToken) {
			return yield* Effect.fail(
				new InvalidBackendTokenError({
					message: "BACKEND_ACCESS_TOKEN is not configured",
				}),
			);
		}

		if (token !== expectedToken) {
			return yield* Effect.fail(
				new InvalidBackendTokenError({
					message: "Invalid BACKEND_ACCESS_TOKEN",
				}),
			);
		}
	});

export const privateQuery = <
	ConvexArgs extends DefaultFunctionArgs,
	ConfectArgs,
	ConvexReturns,
	ConfectReturns,
>({
	args,
	returns,
	handler,
}: {
	args: Schema.Schema<ConfectArgs, ConvexArgs>;
	returns: Schema.Schema<ConfectReturns, ConvexReturns>;
	handler: (
		a: ConfectArgs,
	) => Effect.Effect<ConfectReturns, never, ConfectQueryCtx>;
}): RegisteredQuery<
	"public",
	ConvexArgs & { backendAccessToken: string },
	Promise<ConvexReturns>
> =>
	baseFunctions.query({
		args: Schema.extend(BackendAccessTokenArg, args),
		returns,
		handler: (a: ConfectArgs & { backendAccessToken: string }) =>
			Effect.gen(function* () {
				yield* validateBackendAccessToken(a.backendAccessToken);
				const { backendAccessToken: _, ...rest } = a;
				return yield* handler(rest as ConfectArgs);
			}).pipe(Effect.orDie),
	});

export const privateMutation = <
	ConvexArgs extends DefaultFunctionArgs,
	ConfectArgs,
	ConvexReturns,
	ConfectReturns,
>({
	args,
	returns,
	handler,
}: {
	args: Schema.Schema<ConfectArgs, ConvexArgs>;
	returns: Schema.Schema<ConfectReturns, ConvexReturns>;
	handler: (
		a: ConfectArgs,
	) => Effect.Effect<ConfectReturns, never, ConfectMutationCtx>;
}): RegisteredMutation<
	"public",
	ConvexArgs & { backendAccessToken: string },
	Promise<ConvexReturns>
> =>
	baseFunctions.mutation({
		args: Schema.extend(BackendAccessTokenArg, args),
		returns,
		handler: (a: ConfectArgs & { backendAccessToken: string }) =>
			Effect.gen(function* () {
				yield* validateBackendAccessToken(a.backendAccessToken);
				const { backendAccessToken: _, ...rest } = a;
				return yield* handler(rest as ConfectArgs);
			}).pipe(Effect.orDie),
	});

export const privateAction = <
	ConvexArgs extends DefaultFunctionArgs,
	ConfectArgs,
	ConvexReturns,
	ConfectReturns,
>({
	args,
	returns,
	handler,
}: {
	args: Schema.Schema<ConfectArgs, ConvexArgs>;
	returns: Schema.Schema<ConfectReturns, ConvexReturns>;
	handler: (
		a: ConfectArgs,
	) => Effect.Effect<ConfectReturns, never, ConfectActionCtx>;
}): RegisteredAction<
	"public",
	ConvexArgs & { backendAccessToken: string },
	Promise<ConvexReturns>
> =>
	baseFunctions.action({
		args: Schema.extend(BackendAccessTokenArg, args),
		returns,
		handler: (a: ConfectArgs & { backendAccessToken: string }) =>
			Effect.gen(function* () {
				yield* validateBackendAccessToken(a.backendAccessToken);
				const { backendAccessToken: _, ...rest } = a;
				return yield* handler(rest as ConfectArgs);
			}).pipe(Effect.orDie),
	});
