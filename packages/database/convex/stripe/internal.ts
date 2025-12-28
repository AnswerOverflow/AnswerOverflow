import { Effect, Option, Schema } from "effect";
import {
	ConfectMutationCtx,
	ConfectQueryCtx,
	internalMutation,
	internalQuery,
} from "../confect";
import { PlanSchema, ServerSchema, ServerPreferencesSchema } from "../schema";

const DEFAULT_PLAN = "FREE" as const;

const ServerWithStripeInfo = Schema.Struct({
	...ServerSchema.fields,
	stripeCustomerId: Schema.optional(Schema.String),
	stripeSubscriptionId: Schema.optional(Schema.String),
	plan: Schema.String,
});

export const getServerForStripe = internalQuery({
	args: Schema.Struct({
		discordServerId: Schema.BigIntFromSelf,
	}),
	returns: Schema.NullOr(ServerWithStripeInfo),
	handler: ({ discordServerId }) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectQueryCtx;

			const serverOption = yield* db
				.query("servers")
				.withIndex("by_discordId", (q) => q.eq("discordId", discordServerId))
				.first();

			if (Option.isNone(serverOption)) {
				return null;
			}

			const server = serverOption.value;

			const preferencesOption = yield* db
				.query("serverPreferences")
				.withIndex("by_serverId", (q) => q.eq("serverId", discordServerId))
				.first();

			const preferences = Option.getOrNull(preferencesOption);

			return {
				...server,
				stripeCustomerId: preferences?.stripeCustomerId,
				stripeSubscriptionId: preferences?.stripeSubscriptionId,
				plan: preferences?.plan ?? DEFAULT_PLAN,
			};
		}),
});

export const updateServerStripeCustomer = internalMutation({
	args: Schema.Struct({
		serverId: Schema.BigIntFromSelf,
		stripeCustomerId: Schema.String,
	}),
	returns: Schema.Null,
	handler: ({ serverId, stripeCustomerId }) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectMutationCtx;

			const existingOption = yield* db
				.query("serverPreferences")
				.withIndex("by_serverId", (q) => q.eq("serverId", serverId))
				.first();

			if (Option.isSome(existingOption)) {
				yield* db.patch(existingOption.value._id, { stripeCustomerId });
			} else {
				yield* db.insert("serverPreferences", {
					serverId,
					stripeCustomerId,
					plan: DEFAULT_PLAN,
				});
			}

			return null;
		}),
});

export const updateServerSubscription = internalMutation({
	args: Schema.Struct({
		stripeCustomerId: Schema.String,
		stripeSubscriptionId: Schema.NullOr(Schema.String),
		plan: PlanSchema,
	}),
	returns: Schema.Null,
	handler: ({ stripeCustomerId, stripeSubscriptionId, plan }) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectMutationCtx;

			const preferencesOption = yield* db
				.query("serverPreferences")
				.withIndex("by_stripeCustomerId", (q) =>
					q.eq("stripeCustomerId", stripeCustomerId),
				)
				.first();

			if (Option.isNone(preferencesOption)) {
				return yield* Effect.die(
					new Error(
						`Server preferences not found for stripe customer ${stripeCustomerId}`,
					),
				);
			}

			yield* db.patch(preferencesOption.value._id, {
				stripeSubscriptionId: stripeSubscriptionId ?? undefined,
				plan,
			});

			return null;
		}),
});
