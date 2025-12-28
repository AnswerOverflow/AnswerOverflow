import { getManyFrom } from "convex-helpers/server/relationships";
import { Effect, Schema } from "effect";
import { Id } from "@packages/confect/server";
import { UserServerSettingsSchema } from "../schema";
import {
	privateQuery,
	privateMutation,
	ConfectQueryCtx,
	ConfectMutationCtx,
} from "../client/confectPrivate";
import {
	deleteMessageInternalLogic,
	findUserServerSettingsById as findUserServerSettingsByIdShared,
} from "../shared/shared";

const UserServerSettingsWithSystemFields = Schema.extend(
	UserServerSettingsSchema,
	Schema.Struct({
		_id: Id.Id("userServerSettings"),
		_creationTime: Schema.Number,
	}),
);

const UserServerSettingsLookup = Schema.Struct({
	userId: Schema.BigIntFromSelf,
	serverId: Schema.BigIntFromSelf,
});

export const findUserServerSettingsById = privateQuery({
	args: UserServerSettingsLookup,
	returns: Schema.NullOr(UserServerSettingsWithSystemFields),
	handler: ({ userId, serverId }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectQueryCtx;
			const settings = yield* Effect.promise(() =>
				findUserServerSettingsByIdShared(ctx, userId, serverId),
			);
			return settings;
		}),
});

export const findManyUserServerSettings = privateQuery({
	args: Schema.Struct({
		settings: Schema.Array(UserServerSettingsLookup),
	}),
	returns: Schema.Array(UserServerSettingsWithSystemFields),
	handler: ({ settings }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectQueryCtx;
			if (settings.length === 0) return [];

			const results: Array<
				Schema.Schema.Type<typeof UserServerSettingsWithSystemFields>
			> = [];
			for (const setting of settings) {
				const found = yield* Effect.promise(() =>
					findUserServerSettingsByIdShared(
						ctx,
						setting.userId,
						setting.serverId,
					),
				);
				if (found) {
					results.push(found);
				}
			}
			return results;
		}),
});

export const upsertUserServerSettings = privateMutation({
	args: Schema.Struct({
		settings: UserServerSettingsSchema,
	}),
	returns: UserServerSettingsWithSystemFields,
	handler: ({ settings }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectMutationCtx;

			const existing = yield* Effect.promise(() =>
				findUserServerSettingsByIdShared(
					ctx,
					settings.userId,
					settings.serverId,
				),
			);

			if (existing) {
				const updatedSettings = { ...settings };
				if (updatedSettings.messageIndexingDisabled) {
					updatedSettings.canPubliclyDisplayMessages = false;
				}

				if (
					updatedSettings.messageIndexingDisabled &&
					!existing.messageIndexingDisabled
				) {
					const allMessages = yield* Effect.promise(() =>
						getManyFrom(ctx.db, "messages", "by_authorId", settings.userId),
					);
					const messages = allMessages.filter(
						(m) => m.serverId === settings.serverId,
					);

					for (const message of messages) {
						yield* Effect.promise(() =>
							deleteMessageInternalLogic(ctx, message.id),
						);
					}
				}

				yield* Effect.promise(() =>
					ctx.db.patch(existing._id, updatedSettings),
				);
				const updated = yield* Effect.promise(() =>
					findUserServerSettingsByIdShared(
						ctx,
						settings.userId,
						settings.serverId,
					),
				);
				if (!updated) {
					return yield* Effect.die(
						new Error("Failed to update user server settings"),
					);
				}
				return updated;
			}

			const newSettings = { ...settings };
			if (newSettings.messageIndexingDisabled) {
				newSettings.canPubliclyDisplayMessages = false;
			}

			yield* Effect.promise(() =>
				ctx.db.insert("userServerSettings", newSettings),
			);
			const created = yield* Effect.promise(() =>
				findUserServerSettingsByIdShared(
					ctx,
					settings.userId,
					settings.serverId,
				),
			);
			if (!created) {
				return yield* Effect.die(
					new Error("Failed to create user server settings"),
				);
			}
			return created;
		}).pipe(Effect.orDie),
});

export const upsertManyBotUserServerSettings = privateMutation({
	args: Schema.Struct({
		settings: Schema.Array(UserServerSettingsSchema),
	}),
	returns: Schema.Array(UserServerSettingsSchema),
	handler: ({ settings }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectMutationCtx;
			if (settings.length === 0) return [];

			for (const setting of settings) {
				const existing = yield* Effect.promise(() =>
					findUserServerSettingsByIdShared(
						ctx,
						setting.userId,
						setting.serverId,
					),
				);

				if (existing) {
					yield* Effect.promise(() => ctx.db.patch(existing._id, setting));
				} else {
					yield* Effect.promise(() =>
						ctx.db.insert("userServerSettings", setting),
					);
				}
			}

			return [...settings];
		}).pipe(Effect.orDie),
});

export const upsertManyUserServerSettings = privateMutation({
	args: Schema.Struct({
		settings: Schema.Array(UserServerSettingsSchema),
	}),
	returns: Schema.Null,
	handler: ({ settings }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectMutationCtx;

			for (const setting of settings) {
				try {
					yield* Effect.promise(() =>
						ctx.db.insert("userServerSettings", setting),
					);
				} catch {
					const existing = yield* Effect.promise(() =>
						findUserServerSettingsByIdShared(
							ctx,
							setting.userId,
							setting.serverId,
						),
					);
					if (!existing) {
						return null;
					}
					yield* Effect.promise(() => ctx.db.replace(existing._id, setting));
				}
			}
			return null;
		}).pipe(Effect.orDie),
});
