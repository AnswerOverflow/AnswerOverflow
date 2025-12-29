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
import type { DefaultFunctionArgs } from "convex/server";
import { Context, Data, Effect, Schema } from "effect";
import { confectSchema } from "../schema";
import {
	BetterAuthAccounts,
	BetterAuthAccountsLive,
} from "../shared/auth/betterAuthService";
import { authComponent } from "../shared/betterAuth";
import {
	internalMutation as triggerInternalMutation,
	mutation as triggerMutation,
} from "../triggers";

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

export const authenticatedQuery = <
	ConvexArgs extends DefaultFunctionArgs,
	ConfectArgs,
	ConvexSuccess,
	ConfectSuccess,
	ConvexError,
	ConfectError extends { readonly _tag: string },
>({
	args,
	success,
	error,
	handler,
}: {
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
}) =>
	baseFunctions.query({
		args,
		success,
		error: Schema.Union(error, NotAuthenticatedErrorSchema),
		handler: (a: ConfectArgs) =>
			Effect.gen(function* () {
				const confectCtx = yield* ConfectQueryCtx;
				const user = yield* getUser(confectCtx);
				return yield* handler(a).pipe(
					Effect.provideService(AuthenticatedUser, user),
					Effect.provide(BetterAuthAccountsLive(confectCtx.ctx)),
				);
			}),
	});

export const authenticatedMutation = <
	ConvexArgs extends DefaultFunctionArgs,
	ConfectArgs,
	ConvexSuccess,
	ConfectSuccess,
	ConvexError,
	ConfectError extends { readonly _tag: string },
>({
	args,
	success,
	error,
	handler,
}: {
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
}) =>
	baseFunctions.mutation({
		args,
		success,
		error: Schema.Union(error, NotAuthenticatedErrorSchema),
		handler: (a: ConfectArgs) =>
			Effect.gen(function* () {
				const confectCtx = yield* ConfectMutationCtx;
				const user = yield* getUser(confectCtx);
				return yield* handler(a).pipe(
					Effect.provideService(AuthenticatedUser, user),
					Effect.provide(BetterAuthAccountsLive(confectCtx.ctx)),
				);
			}),
	});

export const authenticatedAction = <
	ConvexArgs extends DefaultFunctionArgs,
	ConfectArgs,
	ConvexSuccess,
	ConfectSuccess,
	ConvexError,
	ConfectError extends { readonly _tag: string },
>({
	args,
	success,
	error,
	handler,
}: {
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
}) =>
	baseFunctions.action({
		args,
		success,
		error: Schema.Union(error, NotAuthenticatedErrorSchema),
		handler: (a: ConfectArgs) =>
			Effect.gen(function* () {
				const confectCtx = yield* ConfectActionCtx;
				const user = yield* getUser(confectCtx);
				return yield* handler(a).pipe(
					Effect.provideService(AuthenticatedUser, user),
					Effect.provide(BetterAuthAccountsLive(confectCtx.ctx)),
				);
			}),
	});
