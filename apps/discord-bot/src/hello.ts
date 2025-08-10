import { Discord, DiscordREST, Ix } from "dfx";
import { InteractionsRegistry } from "dfx/gateway";
import { Cause, Effect, Layer, pipe } from "effect";
import { DiscordGatewayLayer } from "./framework/discord-gateway";
import {
	createEntry,
	getEntries,
	onEntriesUpdated,
	type Entry,
} from "@packages/convex/client";
import { DiscordApplication } from "./framework/discord-rest";
import type { DiscordRestService } from "dfx/DiscordREST";

function formatEntry(entry: Entry, index: number) {
	return `**Message ${index + 1}**: ${entry.content}`;
}

// this is bad effect code, just getting it working for now
const updateSentMessageWithNewEntries = (
	rest: DiscordRestService,
	application: DiscordApplication,
	context: Discord.APIInteraction,
) =>
	Effect.gen(function* () {
		yield* Effect.try(() =>
			onEntriesUpdated((entries) => {
				Effect.runPromise(
					Effect.gen(function* () {
						const entriesString = entries.map(formatEntry).join("\n\n");
						yield* rest.updateOriginalWebhookMessage(
							application.id,
							context.token,
							{
								payload: {
									content: entriesString,
								},
							},
						);
					}),
				);
			}),
		);
	});

export const HelloLayer = Layer.effectDiscard(
	Effect.gen(function* () {
		const registry = yield* InteractionsRegistry;
		const rest = yield* DiscordREST;
		const application = yield* DiscordApplication;

		const followUpResponse = (context: Discord.APIInteraction) =>
			pipe(
				updateSentMessageWithNewEntries(rest, application, context),
				Effect.catchAllCause((cause) =>
					rest.updateOriginalWebhookMessage(application.id, context.token, {
						payload: {
							content:
								"Could not create summary. Here are the full error details:\n\n```" +
								Cause.pretty(cause) +
								"\n```",
						},
					}),
				),
			);

		const hello = Ix.global(
			{
				name: "hello",
				description: "A basic command",
			},
			Effect.gen(function* () {
				const context = yield* Ix.Interaction;
				const entries = yield* Effect.tryPromise(() => getEntries());
				yield* Effect.fork(followUpResponse(context));
				return {
					type: 4,
					data: {
						content: entries.map(formatEntry).join("\n\n"),
					},
				};
			}),
		);

		yield* registry.register(
			Ix.builder.add(hello).catchAllCause(Effect.logError),
		);
	}),
).pipe(Layer.provide(DiscordGatewayLayer));
