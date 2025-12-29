import type {
	GenericActionCtx,
	GenericMutationCtx,
	GenericQueryCtx,
} from "convex/server";
import { Context, Effect, Layer, type Option, Schema } from "effect";
import { components } from "../../_generated/api";
import type { DataModel } from "../../_generated/dataModel";

type ConvexCtx =
	| GenericQueryCtx<DataModel>
	| GenericMutationCtx<DataModel>
	| GenericActionCtx<DataModel>;

type MutationOrActionCtx =
	| GenericMutationCtx<DataModel>
	| GenericActionCtx<DataModel>;

const DiscordAccountSchema = Schema.Struct({
	_id: Schema.String,
	accountId: Schema.String,
	providerId: Schema.Literal("discord"),
	userId: Schema.String,
	accessToken: Schema.optionalWith(Schema.NullishOr(Schema.String), {
		exact: true,
	}),
	refreshToken: Schema.optionalWith(Schema.NullishOr(Schema.String), {
		exact: true,
	}),
	accessTokenExpiresAt: Schema.optionalWith(Schema.NullishOr(Schema.Number), {
		exact: true,
	}),
	scope: Schema.optionalWith(Schema.NullishOr(Schema.String), { exact: true }),
}).pipe(Schema.annotations({ parseOptions: { onExcessProperty: "ignore" } }));

const GitHubAccountSchema = Schema.Struct({
	_id: Schema.String,
	accountId: Schema.String,
	providerId: Schema.Literal("github"),
	userId: Schema.String,
	accessToken: Schema.optionalWith(Schema.NullishOr(Schema.String), {
		exact: true,
	}),
	refreshToken: Schema.optionalWith(Schema.NullishOr(Schema.String), {
		exact: true,
	}),
	accessTokenExpiresAt: Schema.optionalWith(Schema.NullishOr(Schema.Number), {
		exact: true,
	}),
	scope: Schema.optionalWith(Schema.NullishOr(Schema.String), { exact: true }),
}).pipe(Schema.annotations({ parseOptions: { onExcessProperty: "ignore" } }));

export type DiscordAccount = Schema.Schema.Type<typeof DiscordAccountSchema>;
export type GitHubAccount = Schema.Schema.Type<typeof GitHubAccountSchema>;

export class BetterAuthAccounts extends Context.Tag("BetterAuthAccounts")<
	BetterAuthAccounts,
	{
		findDiscordAccountByDiscordId(
			discordId: bigint,
		): Effect.Effect<Option.Option<DiscordAccount>>;
		findDiscordAccountByUserId(
			userId: string,
		): Effect.Effect<Option.Option<DiscordAccount>>;
		findGitHubAccountByUserId(
			userId: string,
		): Effect.Effect<Option.Option<GitHubAccount>>;
		updateAccount(
			providerId: "discord" | "github",
			accountId: string,
			update: Record<string, unknown>,
		): Effect.Effect<void>;
	}
>() {}

const makeBetterAuthAccountsImpl = (
	ctx: ConvexCtx,
): Context.Tag.Service<BetterAuthAccounts> => ({
	findDiscordAccountByDiscordId: (discordId: bigint) =>
		Effect.gen(function* () {
			const result = yield* Effect.promise(() =>
				ctx.runQuery(components.betterAuth.adapter.findOne, {
					model: "account",
					where: [
						{ field: "accountId", operator: "eq", value: discordId.toString() },
						{ field: "providerId", operator: "eq", value: "discord" },
					],
				}),
			);
			return Schema.decodeUnknownOption(DiscordAccountSchema)(result);
		}),

	findDiscordAccountByUserId: (userId: string) =>
		Effect.gen(function* () {
			const result = yield* Effect.promise(() =>
				ctx.runQuery(components.betterAuth.adapter.findOne, {
					model: "account",
					where: [
						{ field: "userId", operator: "eq", value: userId },
						{ field: "providerId", operator: "eq", value: "discord" },
					],
				}),
			);
			return Schema.decodeUnknownOption(DiscordAccountSchema)(result);
		}),

	findGitHubAccountByUserId: (userId: string) =>
		Effect.gen(function* () {
			const result = yield* Effect.promise(() =>
				ctx.runQuery(components.betterAuth.adapter.findOne, {
					model: "account",
					where: [
						{ field: "userId", operator: "eq", value: userId },
						{ field: "providerId", operator: "eq", value: "github" },
					],
				}),
			);
			return Schema.decodeUnknownOption(GitHubAccountSchema)(result);
		}),

	updateAccount: (
		providerId: "discord" | "github",
		accountId: string,
		update: Record<string, unknown>,
	) =>
		Effect.promise(() =>
			(ctx as MutationOrActionCtx).runMutation(
				components.betterAuth.adapter.updateOne,
				{
					input: {
						model: "account",
						where: [
							{ field: "accountId", operator: "eq", value: accountId },
							{ field: "providerId", operator: "eq", value: providerId },
						],
						update: {
							...update,
							updatedAt: Date.now(),
						},
					},
				},
			),
		),
});

export const BetterAuthAccountsLive = (ctx: ConvexCtx) =>
	Layer.succeed(BetterAuthAccounts, makeBetterAuthAccountsImpl(ctx));
