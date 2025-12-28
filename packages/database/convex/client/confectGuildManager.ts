import type { DefaultFunctionArgs } from "convex/server";
import { Context, Data, Effect, Layer, Schema } from "effect";
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
import { internal } from "../_generated/api";
import { confectSchema } from "../schema";
import {
	mutation as triggerMutation,
	internalMutation as triggerInternalMutation,
} from "../triggers";
import { getDiscordAccountWithToken } from "../shared/auth";
import {
	createDataAccessCache,
	type DataAccessCache,
} from "../shared/dataAccess";
import {
	assertGuildManagerPermission,
	checkGuildManagerPermissions,
} from "../shared/guildManagerPermissions";

type ConfectSchema = typeof confectSchema;
type ConfectDataModel =
	ConfectDataModelFromConfectSchemaDefinition<ConfectSchema>;

export const ConfectQueryCtx = ConfectQueryCtxService<ConfectDataModel>();
export type ConfectQueryCtx = ConfectQueryCtxType<ConfectDataModel>;

export const ConfectMutationCtx = ConfectMutationCtxService<ConfectDataModel>();
export type ConfectMutationCtx = ConfectMutationCtxType<ConfectDataModel>;

export const ConfectActionCtx = ConfectActionCtxService<ConfectDataModel>();
export type ConfectActionCtx = ConfectActionCtxType<ConfectDataModel>;

export class NotAuthenticatedError extends Data.TaggedError(
	"NotAuthenticatedError",
)<{
	readonly message: string;
}> {}

export class InsufficientPermissionsError extends Data.TaggedError(
	"InsufficientPermissionsError",
)<{
	readonly message: string;
}> {}

export const NotAuthenticatedErrorSchema = Schema.Struct({
	_tag: Schema.Literal("NotAuthenticatedError"),
	message: Schema.String,
});

export const InsufficientPermissionsErrorSchema = Schema.Struct({
	_tag: Schema.Literal("InsufficientPermissionsError"),
	message: Schema.String,
});

export const GuildManagerErrorSchema = Schema.Union(
	NotAuthenticatedErrorSchema,
	InsufficientPermissionsErrorSchema,
);

export type GuildManagerError =
	| NotAuthenticatedError
	| InsufficientPermissionsError;

class GuildManagerContextService extends Context.Tag("GuildManagerContext")<
	GuildManagerContextService,
	{
		discordAccountId: bigint;
		serverId: bigint;
	}
>() {}

export const GuildManagerContext = GuildManagerContextService;

export class DataCache extends Context.Tag("DataCache")<
	DataCache,
	DataAccessCache
>() {}

import type { QueryCtxWithCache } from "../shared/dataAccess";

export const getQueryCtxWithCache = Effect.gen(function* () {
	const { ctx } = yield* ConfectQueryCtx;
	const cache = yield* DataCache;
	return { ...ctx, cache } as QueryCtxWithCache;
});

export const getMutationCtxWithCache = Effect.gen(function* () {
	const { ctx } = yield* ConfectMutationCtx;
	const cache = yield* DataCache;
	return { ...ctx, cache } as QueryCtxWithCache;
});

const baseFunctions = makeFunctions(confectSchema, {
	mutationBuilder: triggerMutation,
	internalMutationBuilder: triggerInternalMutation,
});

const GuildManagerArgsSchema = Schema.Struct({
	serverId: Schema.BigIntFromSelf,
});

const getDiscordAccountId = (
	ctx: ConfectQueryCtx | ConfectMutationCtx | ConfectActionCtx,
): Effect.Effect<bigint, NotAuthenticatedError> =>
	Effect.gen(function* () {
		const account = yield* Effect.promise(() =>
			getDiscordAccountWithToken(ctx.ctx),
		);
		if (!account) {
			return yield* Effect.fail(
				new NotAuthenticatedError({
					message: "Not authenticated or Discord account not linked",
				}),
			);
		}
		return account.accountId;
	});

const checkPermissions = (
	ctx: ConfectQueryCtx | ConfectMutationCtx,
	discordAccountId: bigint,
	serverId: bigint,
): Effect.Effect<void, InsufficientPermissionsError> =>
	Effect.gen(function* () {
		const result = yield* Effect.promise(() =>
			checkGuildManagerPermissions(ctx.ctx, discordAccountId, serverId),
		);
		if (!result.hasPermission) {
			return yield* Effect.fail(
				new InsufficientPermissionsError({
					message: result.errorMessage,
				}),
			);
		}
	});

const checkPermissionsViaQuery = (
	ctx: ConfectActionCtx,
	discordAccountId: bigint,
	serverId: bigint,
): Effect.Effect<void, InsufficientPermissionsError> =>
	Effect.gen(function* () {
		const result = yield* Effect.promise(() =>
			ctx.ctx.runQuery(
				internal.client.guildManager.checkGuildManagerPermissionsInternal,
				{
					discordAccountId,
					serverId,
				},
			),
		);
		if (!result.hasPermission) {
			return yield* Effect.fail(
				new InsufficientPermissionsError({
					message: result.errorMessage,
				}),
			);
		}
	});

export function guildManagerQuery<
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
		a: ConfectArgs & { serverId: bigint; discordAccountId: bigint },
	) => Effect.Effect<
		ConfectReturns,
		GuildManagerError,
		ConfectQueryCtx | GuildManagerContextService | DataCache
	>;
}) {
	return baseFunctions.query({
		args: Schema.extend(GuildManagerArgsSchema, args),
		success: returns,
		error: GuildManagerErrorSchema,
		handler: (a: ConfectArgs & { serverId: bigint }) =>
			Effect.gen(function* () {
				const confectCtx = yield* ConfectQueryCtx;
				const discordAccountId = yield* getDiscordAccountId(confectCtx);
				yield* checkPermissions(confectCtx, discordAccountId, a.serverId);

				const cache = createDataAccessCache(confectCtx.ctx);
				const cacheLayer = Layer.succeed(DataCache, cache);
				const guildManagerLayer = Layer.succeed(GuildManagerContext, {
					discordAccountId,
					serverId: a.serverId,
				});

				return yield* handler({ ...a, discordAccountId }).pipe(
					Effect.provide(cacheLayer),
					Effect.provide(guildManagerLayer),
				);
			}),
	});
}

export function guildManagerMutation<
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
		a: ConfectArgs & { serverId: bigint; discordAccountId: bigint },
	) => Effect.Effect<
		ConfectReturns,
		GuildManagerError,
		ConfectMutationCtx | GuildManagerContextService | DataCache
	>;
}) {
	return baseFunctions.mutation({
		args: Schema.extend(GuildManagerArgsSchema, args),
		success: returns,
		error: GuildManagerErrorSchema,
		handler: (a: ConfectArgs & { serverId: bigint }) =>
			Effect.gen(function* () {
				const confectCtx = yield* ConfectMutationCtx;
				const discordAccountId = yield* getDiscordAccountId(confectCtx);
				yield* checkPermissions(confectCtx, discordAccountId, a.serverId);

				const cache = createDataAccessCache(confectCtx.ctx);
				const cacheLayer = Layer.succeed(DataCache, cache);
				const guildManagerLayer = Layer.succeed(GuildManagerContext, {
					discordAccountId,
					serverId: a.serverId,
				});

				return yield* handler({ ...a, discordAccountId }).pipe(
					Effect.provide(cacheLayer),
					Effect.provide(guildManagerLayer),
				);
			}),
	});
}

export function guildManagerAction<
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
		a: ConfectArgs & { serverId: bigint; discordAccountId: bigint },
	) => Effect.Effect<
		ConfectReturns,
		GuildManagerError,
		ConfectActionCtx | GuildManagerContextService
	>;
}) {
	return baseFunctions.action({
		args: Schema.extend(GuildManagerArgsSchema, args),
		success: returns,
		error: GuildManagerErrorSchema,
		handler: (a: ConfectArgs & { serverId: bigint }) =>
			Effect.gen(function* () {
				const confectCtx = yield* ConfectActionCtx;
				const discordAccountId = yield* getDiscordAccountId(confectCtx);
				yield* checkPermissionsViaQuery(
					confectCtx,
					discordAccountId,
					a.serverId,
				);

				const guildManagerLayer = Layer.succeed(GuildManagerContext, {
					discordAccountId,
					serverId: a.serverId,
				});

				return yield* handler({ ...a, discordAccountId }).pipe(
					Effect.provide(guildManagerLayer),
				);
			}),
	});
}

export const manageGuildAction = guildManagerAction;
