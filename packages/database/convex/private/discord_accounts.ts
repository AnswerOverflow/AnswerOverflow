import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Effect, Predicate, Schema } from "effect";
import { Id } from "@packages/confect/server";
import { DiscordAccountSchema } from "../schema";
import {
	privateQuery,
	privateMutation,
	ConfectQueryCtx,
	ConfectMutationCtx,
} from "../client/confectPrivate";
import {
	deleteMessageInternalLogic,
	deleteUserServerSettingsByUserIdLogic,
	getDiscordAccountById as getDiscordAccountByIdShared,
	upsertIgnoredDiscordAccountInternalLogic,
} from "../shared/shared";

const DiscordAccountWithSystemFields = Schema.extend(
	DiscordAccountSchema,
	Schema.Struct({
		_id: Id.Id("discordAccounts"),
		_creationTime: Schema.Number,
	}),
);

export const upsertDiscordAccount = privateMutation({
	args: Schema.Struct({
		account: DiscordAccountSchema,
	}),
	returns: DiscordAccountSchema,
	handler: ({ account }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectMutationCtx;

			const existing = yield* Effect.promise(() =>
				getOneFrom(
					ctx.db,
					"discordAccounts",
					"by_discordAccountId",
					account.id,
					"id",
				),
			);

			if (existing) {
				yield* Effect.promise(() => ctx.db.patch(existing._id, account));
				const updated = yield* Effect.promise(() =>
					getOneFrom(
						ctx.db,
						"discordAccounts",
						"by_discordAccountId",
						account.id,
						"id",
					),
				);
				if (!updated) {
					return yield* Effect.die(new Error("Failed to update account"));
				}
				return {
					id: updated.id,
					name: updated.name,
					avatar: updated.avatar,
				};
			}

			const ignored = yield* Effect.promise(() =>
				getOneFrom(
					ctx.db,
					"ignoredDiscordAccounts",
					"by_discordAccountId",
					account.id,
					"id",
				),
			);

			if (ignored) {
				return {
					id: account.id,
					name: account.name,
					avatar: undefined,
				};
			}

			yield* Effect.promise(() => ctx.db.insert("discordAccounts", account));
			const created = yield* Effect.promise(() =>
				getOneFrom(
					ctx.db,
					"discordAccounts",
					"by_discordAccountId",
					account.id,
					"id",
				),
			);
			if (!created) {
				return yield* Effect.die(new Error("Failed to create account"));
			}
			return {
				id: created.id,
				name: created.name,
				avatar: created.avatar,
			};
		}).pipe(Effect.orDie),
});

export const deleteDiscordAccount = privateMutation({
	args: Schema.Struct({
		id: Schema.BigIntFromSelf,
	}),
	returns: Schema.Boolean,
	handler: ({ id }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectMutationCtx;

			const existing = yield* Effect.promise(() =>
				getOneFrom(ctx.db, "discordAccounts", "by_discordAccountId", id, "id"),
			);

			if (existing) {
				yield* Effect.promise(() => ctx.db.delete(existing._id));
			}

			yield* Effect.promise(() =>
				upsertIgnoredDiscordAccountInternalLogic(ctx, id),
			);

			const messages = yield* Effect.promise(() =>
				getManyFrom(ctx.db, "messages", "by_authorId", id),
			);

			for (const message of messages) {
				yield* Effect.promise(() =>
					deleteMessageInternalLogic(ctx, message.id),
				);
			}

			yield* Effect.promise(() =>
				deleteUserServerSettingsByUserIdLogic(ctx, id),
			);

			return true;
		}).pipe(Effect.orDie),
});

export const findManyDiscordAccountsByIds = privateQuery({
	args: Schema.Struct({
		ids: Schema.Array(Schema.BigIntFromSelf),
	}),
	returns: Schema.Array(DiscordAccountWithSystemFields),
	handler: ({ ids }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectQueryCtx;

			const accounts = yield* Effect.promise(() =>
				Promise.all(ids.map((id) => getDiscordAccountByIdShared(ctx, id))),
			);
			return Arr.filter(accounts, Predicate.isNotNullable);
		}),
});

export const upsertManyDiscordAccounts = privateMutation({
	args: Schema.Struct({
		accounts: Schema.Array(DiscordAccountSchema),
	}),
	returns: Schema.Array(DiscordAccountSchema),
	handler: ({ accounts }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectMutationCtx;

			if (accounts.length === 0) return [];

			const results: Array<Schema.Schema.Type<typeof DiscordAccountSchema>> =
				[];

			for (const account of accounts) {
				const existing = yield* Effect.promise(() =>
					getOneFrom(
						ctx.db,
						"discordAccounts",
						"by_discordAccountId",
						account.id,
						"id",
					),
				);

				if (existing) {
					yield* Effect.promise(() => ctx.db.patch(existing._id, account));
					results.push({
						id: account.id,
						name: account.name,
						avatar: account.avatar,
					});
				} else {
					const ignored = yield* Effect.promise(() =>
						getOneFrom(
							ctx.db,
							"ignoredDiscordAccounts",
							"by_discordAccountId",
							account.id,
							"id",
						),
					);

					if (ignored) {
						results.push({
							id: account.id,
							name: account.name,
							avatar: undefined,
						});
					} else {
						yield* Effect.promise(() =>
							ctx.db.insert("discordAccounts", account),
						);
						results.push({
							id: account.id,
							name: account.name,
							avatar: account.avatar,
						});
					}
				}
			}

			return results;
		}).pipe(Effect.orDie),
});

const UserHeaderResult = Schema.Struct({
	user: Schema.Struct({
		id: Schema.String,
		name: Schema.String,
		avatar: Schema.optional(Schema.String),
	}),
	servers: Schema.Array(Schema.Unknown),
});

export const getUserPageHeaderData = privateQuery({
	args: Schema.Struct({
		userId: Schema.BigIntFromSelf,
	}),
	returns: Schema.NullOr(UserHeaderResult),
	handler: ({ userId }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectQueryCtx;

			const user = yield* Effect.promise(() =>
				getDiscordAccountByIdShared(ctx, userId),
			);
			if (!user) {
				return null;
			}

			return {
				user: {
					id: user.id.toString(),
					name: user.name,
					avatar: user.avatar,
				},
				servers: [],
			};
		}),
});
