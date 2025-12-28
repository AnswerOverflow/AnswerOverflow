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
import { confectSchema } from "../schema";
import {
	mutation as triggerMutation,
	internalMutation as triggerInternalMutation,
} from "../triggers";
import { authComponent } from "../shared/betterAuth";
import {
	BetterAuthAccounts,
	BetterAuthAccountsLive,
} from "../shared/auth/betterAuthService";

export { BetterAuthAccounts };

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

export const NotAuthenticatedErrorSchema = Schema.Struct({
	_tag: Schema.Literal("NotAuthenticatedError"),
	message: Schema.String,
});

export const UserSchema = Schema.Struct({
	_id: Schema.String,
	name: Schema.String,
	email: Schema.String,
	emailVerified: Schema.Boolean,
	image: Schema.NullishOr(Schema.String),
	createdAt: Schema.Number,
	updatedAt: Schema.Number,
	userId: Schema.NullishOr(Schema.String),
	isAnonymous: Schema.NullishOr(Schema.Boolean),
	role: Schema.NullishOr(Schema.String),
	banned: Schema.NullishOr(Schema.Boolean),
	banReason: Schema.NullishOr(Schema.String),
	banExpires: Schema.NullishOr(Schema.Number),
}).pipe(
	Schema.annotations({
		identifier: "User",
		parseOptions: { onExcessProperty: "ignore" },
	}),
);

export type User = Schema.Schema.Type<typeof UserSchema>;

class AuthenticatedUserService extends Context.Tag("AuthenticatedUser")<
	AuthenticatedUserService,
	User
>() {}

export const AuthenticatedUser = AuthenticatedUserService;

const baseFunctions = makeFunctions(confectSchema, {
	mutationBuilder: triggerMutation,
	internalMutationBuilder: triggerInternalMutation,
});

const getUser = (
	ctx: ConfectQueryCtx | ConfectMutationCtx | ConfectActionCtx,
): Effect.Effect<User, NotAuthenticatedError> =>
	Effect.gen(function* () {
		const rawUser = yield* Effect.promise(() =>
			authComponent.getAuthUser(ctx.ctx),
		);
		if (!rawUser) {
			return yield* Effect.fail(
				new NotAuthenticatedError({ message: "Not authenticated" }),
			);
		}
		const decoded = yield* Schema.decodeUnknown(UserSchema)(rawUser).pipe(
			Effect.mapError(
				() => new NotAuthenticatedError({ message: "Invalid user data" }),
			),
		);
		return decoded;
	});

export function authenticatedQuery<
	ConvexArgs extends DefaultFunctionArgs,
	ConfectArgs,
	ConvexReturns,
	ConfectReturns,
>(config: {
	args: Schema.Schema<ConfectArgs, ConvexArgs>;
	returns: Schema.Schema<ConfectReturns, ConvexReturns>;
	handler: (
		a: ConfectArgs,
	) => Effect.Effect<
		ConfectReturns,
		NotAuthenticatedError,
		ConfectQueryCtx | AuthenticatedUserService | BetterAuthAccounts
	>;
}): ReturnType<
	typeof baseFunctions.query<
		ConvexArgs,
		ConfectArgs,
		ConvexReturns | { _tag: "NotAuthenticatedError"; message: string },
		ConfectReturns | NotAuthenticatedError,
		{ _tag: "NotAuthenticatedError"; message: string },
		NotAuthenticatedError
	>
>;
export function authenticatedQuery<
	ConvexArgs extends DefaultFunctionArgs,
	ConfectArgs,
	ConvexSuccess,
	ConfectSuccess,
	ConvexError,
	ConfectError extends { readonly _tag: string },
>(config: {
	args: Schema.Schema<ConfectArgs, ConvexArgs>;
	success: Schema.Schema<ConfectSuccess, ConvexSuccess>;
	error: Schema.Schema<ConfectError, ConvexError>;
	handler: (
		a: ConfectArgs,
	) => Effect.Effect<
		ConfectSuccess,
		ConfectError,
		ConfectQueryCtx | AuthenticatedUserService | BetterAuthAccounts
	>;
}): ReturnType<
	typeof baseFunctions.query<
		ConvexArgs,
		ConfectArgs,
		ConvexSuccess,
		ConfectSuccess,
		ConvexError | { _tag: "NotAuthenticatedError"; message: string },
		ConfectError | NotAuthenticatedError
	>
>;
export function authenticatedQuery<
	ConvexArgs extends DefaultFunctionArgs,
	ConfectArgs,
	ConvexSuccess,
	ConfectSuccess,
	ConvexError,
	ConfectError extends { readonly _tag: string },
>(
	config:
		| {
				args: Schema.Schema<ConfectArgs, ConvexArgs>;
				returns: Schema.Schema<ConfectSuccess, ConvexSuccess>;
				handler: (
					a: ConfectArgs,
				) => Effect.Effect<
					ConfectSuccess,
					NotAuthenticatedError,
					ConfectQueryCtx | AuthenticatedUserService | BetterAuthAccounts
				>;
		  }
		| {
				args: Schema.Schema<ConfectArgs, ConvexArgs>;
				success: Schema.Schema<ConfectSuccess, ConvexSuccess>;
				error: Schema.Schema<ConfectError, ConvexError>;
				handler: (
					a: ConfectArgs,
				) => Effect.Effect<
					ConfectSuccess,
					ConfectError,
					ConfectQueryCtx | AuthenticatedUserService | BetterAuthAccounts
				>;
		  },
) {
	if ("returns" in config) {
		return baseFunctions.query({
			args: config.args,
			success: config.returns,
			error: NotAuthenticatedErrorSchema,
			handler: (a: ConfectArgs) =>
				Effect.gen(function* () {
					const confectCtx = yield* ConfectQueryCtx;
					const user = yield* getUser(confectCtx);
					return yield* config
						.handler(a)
						.pipe(
							Effect.provideService(AuthenticatedUser, user),
							Effect.provide(BetterAuthAccountsLive(confectCtx.ctx)),
						);
				}),
		});
	}
	return baseFunctions.query({
		args: config.args,
		success: config.success,
		error: Schema.Union(config.error, NotAuthenticatedErrorSchema),
		handler: (a: ConfectArgs) =>
			Effect.gen(function* () {
				const confectCtx = yield* ConfectQueryCtx;
				const user = yield* getUser(confectCtx);
				return yield* config
					.handler(a)
					.pipe(
						Effect.provideService(AuthenticatedUser, user),
						Effect.provide(BetterAuthAccountsLive(confectCtx.ctx)),
					);
			}),
	});
}

export function authenticatedMutation<
	ConvexArgs extends DefaultFunctionArgs,
	ConfectArgs,
	ConvexReturns,
	ConfectReturns,
>(config: {
	args: Schema.Schema<ConfectArgs, ConvexArgs>;
	returns: Schema.Schema<ConfectReturns, ConvexReturns>;
	handler: (
		a: ConfectArgs,
	) => Effect.Effect<
		ConfectReturns,
		NotAuthenticatedError,
		ConfectMutationCtx | AuthenticatedUserService | BetterAuthAccounts
	>;
}): ReturnType<
	typeof baseFunctions.mutation<
		ConvexArgs,
		ConfectArgs,
		ConvexReturns | { _tag: "NotAuthenticatedError"; message: string },
		ConfectReturns | NotAuthenticatedError,
		{ _tag: "NotAuthenticatedError"; message: string },
		NotAuthenticatedError
	>
>;
export function authenticatedMutation<
	ConvexArgs extends DefaultFunctionArgs,
	ConfectArgs,
	ConvexSuccess,
	ConfectSuccess,
	ConvexError,
	ConfectError extends { readonly _tag: string },
>(config: {
	args: Schema.Schema<ConfectArgs, ConvexArgs>;
	success: Schema.Schema<ConfectSuccess, ConvexSuccess>;
	error: Schema.Schema<ConfectError, ConvexError>;
	handler: (
		a: ConfectArgs,
	) => Effect.Effect<
		ConfectSuccess,
		ConfectError,
		ConfectMutationCtx | AuthenticatedUserService | BetterAuthAccounts
	>;
}): ReturnType<
	typeof baseFunctions.mutation<
		ConvexArgs,
		ConfectArgs,
		ConvexSuccess,
		ConfectSuccess,
		ConvexError | { _tag: "NotAuthenticatedError"; message: string },
		ConfectError | NotAuthenticatedError
	>
>;
export function authenticatedMutation<
	ConvexArgs extends DefaultFunctionArgs,
	ConfectArgs,
	ConvexSuccess,
	ConfectSuccess,
	ConvexError,
	ConfectError extends { readonly _tag: string },
>(
	config:
		| {
				args: Schema.Schema<ConfectArgs, ConvexArgs>;
				returns: Schema.Schema<ConfectSuccess, ConvexSuccess>;
				handler: (
					a: ConfectArgs,
				) => Effect.Effect<
					ConfectSuccess,
					NotAuthenticatedError,
					ConfectMutationCtx | AuthenticatedUserService | BetterAuthAccounts
				>;
		  }
		| {
				args: Schema.Schema<ConfectArgs, ConvexArgs>;
				success: Schema.Schema<ConfectSuccess, ConvexSuccess>;
				error: Schema.Schema<ConfectError, ConvexError>;
				handler: (
					a: ConfectArgs,
				) => Effect.Effect<
					ConfectSuccess,
					ConfectError,
					ConfectMutationCtx | AuthenticatedUserService | BetterAuthAccounts
				>;
		  },
) {
	if ("returns" in config) {
		return baseFunctions.mutation({
			args: config.args,
			success: config.returns,
			error: NotAuthenticatedErrorSchema,
			handler: (a: ConfectArgs) =>
				Effect.gen(function* () {
					const confectCtx = yield* ConfectMutationCtx;
					const user = yield* getUser(confectCtx);
					return yield* config
						.handler(a)
						.pipe(
							Effect.provideService(AuthenticatedUser, user),
							Effect.provide(BetterAuthAccountsLive(confectCtx.ctx)),
						);
				}),
		});
	}
	return baseFunctions.mutation({
		args: config.args,
		success: config.success,
		error: Schema.Union(config.error, NotAuthenticatedErrorSchema),
		handler: (a: ConfectArgs) =>
			Effect.gen(function* () {
				const confectCtx = yield* ConfectMutationCtx;
				const user = yield* getUser(confectCtx);
				return yield* config
					.handler(a)
					.pipe(
						Effect.provideService(AuthenticatedUser, user),
						Effect.provide(BetterAuthAccountsLive(confectCtx.ctx)),
					);
			}),
	});
}

export function authenticatedAction<
	ConvexArgs extends DefaultFunctionArgs,
	ConfectArgs,
	ConvexReturns,
	ConfectReturns,
>(config: {
	args: Schema.Schema<ConfectArgs, ConvexArgs>;
	returns: Schema.Schema<ConfectReturns, ConvexReturns>;
	handler: (
		a: ConfectArgs,
	) => Effect.Effect<
		ConfectReturns,
		NotAuthenticatedError,
		ConfectActionCtx | AuthenticatedUserService | BetterAuthAccounts
	>;
}): ReturnType<
	typeof baseFunctions.action<
		ConvexArgs,
		ConfectArgs,
		ConvexReturns | { _tag: "NotAuthenticatedError"; message: string },
		ConfectReturns | NotAuthenticatedError,
		{ _tag: "NotAuthenticatedError"; message: string },
		NotAuthenticatedError
	>
>;
export function authenticatedAction<
	ConvexArgs extends DefaultFunctionArgs,
	ConfectArgs,
	ConvexSuccess,
	ConfectSuccess,
	ConvexError,
	ConfectError extends { readonly _tag: string },
>(config: {
	args: Schema.Schema<ConfectArgs, ConvexArgs>;
	success: Schema.Schema<ConfectSuccess, ConvexSuccess>;
	error: Schema.Schema<ConfectError, ConvexError>;
	handler: (
		a: ConfectArgs,
	) => Effect.Effect<
		ConfectSuccess,
		ConfectError,
		ConfectActionCtx | AuthenticatedUserService | BetterAuthAccounts
	>;
}): ReturnType<
	typeof baseFunctions.action<
		ConvexArgs,
		ConfectArgs,
		ConvexSuccess,
		ConfectSuccess,
		ConvexError | { _tag: "NotAuthenticatedError"; message: string },
		ConfectError | NotAuthenticatedError
	>
>;
export function authenticatedAction<
	ConvexArgs extends DefaultFunctionArgs,
	ConfectArgs,
	ConvexSuccess,
	ConfectSuccess,
	ConvexError,
	ConfectError extends { readonly _tag: string },
>(
	config:
		| {
				args: Schema.Schema<ConfectArgs, ConvexArgs>;
				returns: Schema.Schema<ConfectSuccess, ConvexSuccess>;
				handler: (
					a: ConfectArgs,
				) => Effect.Effect<
					ConfectSuccess,
					NotAuthenticatedError,
					ConfectActionCtx | AuthenticatedUserService | BetterAuthAccounts
				>;
		  }
		| {
				args: Schema.Schema<ConfectArgs, ConvexArgs>;
				success: Schema.Schema<ConfectSuccess, ConvexSuccess>;
				error: Schema.Schema<ConfectError, ConvexError>;
				handler: (
					a: ConfectArgs,
				) => Effect.Effect<
					ConfectSuccess,
					ConfectError,
					ConfectActionCtx | AuthenticatedUserService | BetterAuthAccounts
				>;
		  },
) {
	if ("returns" in config) {
		return baseFunctions.action({
			args: config.args,
			success: config.returns,
			error: NotAuthenticatedErrorSchema,
			handler: (a: ConfectArgs) =>
				Effect.gen(function* () {
					const confectCtx = yield* ConfectActionCtx;
					const user = yield* getUser(confectCtx);
					return yield* config
						.handler(a)
						.pipe(
							Effect.provideService(AuthenticatedUser, user),
							Effect.provide(BetterAuthAccountsLive(confectCtx.ctx)),
						);
				}),
		});
	}
	return baseFunctions.action({
		args: config.args,
		success: config.success,
		error: Schema.Union(config.error, NotAuthenticatedErrorSchema),
		handler: (a: ConfectArgs) =>
			Effect.gen(function* () {
				const confectCtx = yield* ConfectActionCtx;
				const user = yield* getUser(confectCtx);
				return yield* config
					.handler(a)
					.pipe(
						Effect.provideService(AuthenticatedUser, user),
						Effect.provide(BetterAuthAccountsLive(confectCtx.ctx)),
					);
			}),
	});
}
