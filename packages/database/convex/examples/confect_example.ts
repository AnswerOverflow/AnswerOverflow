import { Effect, Schema } from "effect";
import {
	ConfectQueryCtx,
	ConfectMutationCtx,
	query,
	internalQuery,
	internalMutation,
} from "../confect";
import { MessageSchema, ServerSchema } from "../confectSchema";
import { Id } from "@packages/confect/server";

export const getServerByDiscordId = query({
	args: Schema.Struct({
		discordId: Schema.BigIntFromSelf,
	}),
	returns: Schema.Option(ServerSchema),
	handler: ({ discordId }) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectQueryCtx;
			return yield* db
				.query("servers")
				.withIndex("by_discordId", (q) => q.eq("discordId", discordId))
				.first();
		}),
});

export const getMessageById = internalQuery({
	args: Schema.Struct({
		id: Schema.BigIntFromSelf,
	}),
	returns: Schema.Option(MessageSchema),
	handler: ({ id }) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectQueryCtx;
			return yield* db
				.query("messages")
				.withIndex("by_messageId", (q) => q.eq("id", id))
				.first();
		}),
});

export const deleteMessageById = internalMutation({
	args: Schema.Struct({
		id: Schema.BigIntFromSelf,
	}),
	returns: Schema.Null,
	handler: ({ id }) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectMutationCtx;
			const message = yield* db
				.query("messages")
				.withIndex("by_messageId", (q) => q.eq("id", id))
				.first();

			if (message._tag === "Some") {
				yield* db.delete(message.value._id);
			}

			return null;
		}),
});
