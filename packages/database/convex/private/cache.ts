import { Effect, Schema } from "effect";
import { components } from "../_generated/api";
import {
	privateQuery,
	privateMutation,
	ConfectQueryCtx,
	ConfectMutationCtx,
} from "../client/confectPrivate";

const DiscordOAuthAccountResult = Schema.NullOr(
	Schema.Struct({
		accountId: Schema.String,
	}),
);

export const findDiscordOAuthAccountByDiscordId = privateQuery({
	args: Schema.Struct({
		discordId: Schema.String,
	}),
	returns: DiscordOAuthAccountResult,
	handler: ({ discordId }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectQueryCtx;

			const account = yield* Effect.promise(() =>
				ctx.runQuery(components.betterAuth.adapter.findOne, {
					model: "account",
					where: [
						{
							field: "accountId",
							operator: "eq",
							value: discordId,
						},
						{
							field: "providerId",
							operator: "eq",
							value: "discord",
						},
					],
				}),
			);

			if (
				!account ||
				typeof account !== "object" ||
				!("accountId" in account) ||
				typeof account.accountId !== "string"
			) {
				return null;
			}

			return {
				accountId: account.accountId,
			};
		}),
});

export const invalidateUserGuildsCache = privateMutation({
	args: Schema.Struct({
		discordAccountId: Schema.BigIntFromSelf,
	}),
	returns: Schema.Null,
	handler: ({ discordAccountId }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectMutationCtx;

			yield* Effect.promise(() =>
				ctx.runMutation(components.actionCache.lib.remove, {
					name: "discordGuilds",
					args: { discordAccountId },
				}),
			);
			return null;
		}).pipe(Effect.orDie),
});
