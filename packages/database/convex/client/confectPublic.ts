import type {
	DefaultFunctionArgs,
	RegisteredQuery,
	RegisteredMutation,
	RegisteredAction,
} from "convex/server";
import { Context, Effect, Layer, Schema } from "effect";
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
	createDataAccessCache,
	type DataAccessCache,
} from "../shared/dataAccess";
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

export class DataCache extends Context.Tag("DataCache")<
	DataCache,
	DataAccessCache
>() {}

const baseFunctions = makeFunctions(confectSchema, {
	mutationBuilder: triggerMutation,
	internalMutationBuilder: triggerInternalMutation,
});

const PublicQueryArgsSchema = Schema.Struct({
	discordAccountId: Schema.optional(Schema.String),
	anonymousSessionId: Schema.optional(Schema.String),
	publicBackendAccessToken: Schema.optional(Schema.String),
	backendAccessToken: Schema.optional(Schema.String),
	type: Schema.optional(
		Schema.Union(
			Schema.Literal("signed-in"),
			Schema.Literal("anonymous"),
			Schema.Literal("admin"),
		),
	),
	rateLimitKey: Schema.optional(Schema.String),
});

const PublicMutationArgsSchema = Schema.Struct({
	discordAccountId: Schema.optional(Schema.String),
	publicBackendAccessToken: Schema.optional(Schema.String),
	type: Schema.optional(
		Schema.Union(Schema.Literal("signed-in"), Schema.Literal("admin")),
	),
});

const PublicActionArgsSchema = Schema.Struct({
	discordAccountId: Schema.optional(Schema.String),
	publicBackendAccessToken: Schema.optional(Schema.String),
	type: Schema.optional(
		Schema.Union(Schema.Literal("signed-in"), Schema.Literal("admin")),
	),
});

function validatePublicBackendAccessToken(token: string | undefined): boolean {
	const expectedToken = process.env.PUBLIC_BACKEND_ACCESS_TOKEN;
	if (!token || !expectedToken) {
		return false;
	}
	return token === expectedToken;
}

function validateBackendAccessToken(token: string | undefined): boolean {
	const expectedToken = process.env.BACKEND_ACCESS_TOKEN;
	if (!token || !expectedToken) {
		return false;
	}
	return token === expectedToken;
}

export const publicQuery = <
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
	) => Effect.Effect<ConfectReturns, never, ConfectQueryCtx | DataCache>;
}): RegisteredQuery<
	"public",
	ConvexArgs & Schema.Schema.Encoded<typeof PublicQueryArgsSchema>,
	Promise<ConvexReturns>
> =>
	baseFunctions.query({
		args: Schema.extend(PublicQueryArgsSchema, args),
		returns,
		handler: (
			a: ConfectArgs & Schema.Schema.Type<typeof PublicQueryArgsSchema>,
		) =>
			Effect.gen(function* () {
				const { ctx } = yield* ConfectQueryCtx;
				const cache = createDataAccessCache(ctx);

				const isBackendRequest = validatePublicBackendAccessToken(
					a.publicBackendAccessToken,
				);
				const isLegacyBackendRequest = validateBackendAccessToken(
					a.backendAccessToken,
				);

				const {
					discordAccountId: _d,
					anonymousSessionId: _a,
					publicBackendAccessToken: _p,
					backendAccessToken: _b,
					type: _t,
					rateLimitKey: _r,
					...rest
				} = a;

				const cacheLayer = Layer.succeed(DataCache, cache);

				return yield* handler(rest as ConfectArgs).pipe(
					Effect.provide(cacheLayer),
				);
			}).pipe(Effect.orDie),
	});

export const publicMutation = <
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
	) => Effect.Effect<ConfectReturns, never, ConfectMutationCtx | DataCache>;
}): RegisteredMutation<
	"public",
	ConvexArgs & Schema.Schema.Encoded<typeof PublicMutationArgsSchema>,
	Promise<ConvexReturns>
> =>
	baseFunctions.mutation({
		args: Schema.extend(PublicMutationArgsSchema, args),
		returns,
		handler: (
			a: ConfectArgs & Schema.Schema.Type<typeof PublicMutationArgsSchema>,
		) =>
			Effect.gen(function* () {
				const { ctx } = yield* ConfectMutationCtx;
				const cache = createDataAccessCache(ctx);

				const {
					discordAccountId: _d,
					publicBackendAccessToken: _p,
					type: _t,
					...rest
				} = a;

				const cacheLayer = Layer.succeed(DataCache, cache);

				return yield* handler(rest as ConfectArgs).pipe(
					Effect.provide(cacheLayer),
				);
			}).pipe(Effect.orDie),
	});

export const publicAction = <
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
	ConvexArgs & Schema.Schema.Encoded<typeof PublicActionArgsSchema>,
	Promise<ConvexReturns>
> =>
	baseFunctions.action({
		args: Schema.extend(PublicActionArgsSchema, args),
		returns,
		handler: (
			a: ConfectArgs & Schema.Schema.Type<typeof PublicActionArgsSchema>,
		) =>
			Effect.gen(function* () {
				const {
					discordAccountId: _d,
					publicBackendAccessToken: _p,
					type: _t,
					...rest
				} = a;

				return yield* handler(rest as ConfectArgs);
			}).pipe(Effect.orDie),
	});
