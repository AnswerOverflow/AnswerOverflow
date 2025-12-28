import { getOneFrom } from "convex-helpers/server/relationships";
import { Effect, Schema } from "effect";
import { Id } from "@packages/confect/server";
import { IgnoredDiscordAccountSchema } from "../schema";
import {
	privateQuery,
	privateMutation,
	ConfectQueryCtx,
	ConfectMutationCtx,
} from "../client/confectPrivate";
import { findIgnoredDiscordAccountById as findIgnoredDiscordAccountByIdShared } from "../shared/shared";

const IgnoredDiscordAccountWithSystemFields = Schema.extend(
	IgnoredDiscordAccountSchema,
	Schema.Struct({
		_id: Id.Id("ignoredDiscordAccounts"),
		_creationTime: Schema.Number,
	}),
);

export const findIgnoredDiscordAccountById = privateQuery({
	args: Schema.Struct({
		id: Schema.BigIntFromSelf,
	}),
	returns: Schema.NullOr(IgnoredDiscordAccountWithSystemFields),
	handler: ({ id }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectQueryCtx;
			const account = yield* Effect.promise(() =>
				findIgnoredDiscordAccountByIdShared(ctx, id),
			);
			return account;
		}),
});

export const deleteIgnoredDiscordAccount = privateMutation({
	args: Schema.Struct({
		id: Schema.BigIntFromSelf,
	}),
	returns: Schema.Boolean,
	handler: ({ id }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectMutationCtx;

			const existing = yield* Effect.promise(() =>
				getOneFrom(
					ctx.db,
					"ignoredDiscordAccounts",
					"by_discordAccountId",
					id,
					"id",
				),
			);

			if (existing) {
				yield* Effect.promise(() => ctx.db.delete(existing._id));
			}

			const deleted = yield* Effect.promise(() =>
				getOneFrom(
					ctx.db,
					"ignoredDiscordAccounts",
					"by_discordAccountId",
					id,
					"id",
				),
			);

			if (deleted) {
				return yield* Effect.die(new Error("Failed to delete account"));
			}

			return true;
		}).pipe(Effect.orDie),
});
