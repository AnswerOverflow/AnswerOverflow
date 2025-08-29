import { DiscordREST, Ix, Perms } from "dfx";
import * as MemoryTTL from "dfx/Cache/memoryTTL";
import { CachePrelude, InteractionsRegistry } from "dfx/gateway";
import * as Discord from "dfx/types";
import { ChannelTypes } from "dfx/types";
import { Duration, Effect, Layer } from "effect";
import { DiscordGatewayLayer } from "./framework/discord-gateway";
import { DiscordRestLayer } from "./framework/discord-rest";

// Create a roles cache with TTL memory driver
const rolesCache = CachePrelude.roles(
	MemoryTTL.createWithParent({
		ttl: Duration.minutes(30), // Cache for 30 minutes
		strategy: "usage", // Reset TTL on access
	}),
);

const make = Effect.gen(function* () {
	const registry = yield* InteractionsRegistry;
	const rest = yield* DiscordREST;
	const cache = yield* rolesCache;
	const hello = Ix.global(
		{
			name: "hello",
			description: "A basic command",
		},
		Effect.gen(function* () {
			const _context = yield* Ix.Interaction;
			if (_context.channel?.id) {
				const channel = yield* rest.getChannel(_context.channel?.id);
				const member = yield* rest.getGuildMember(
					_context.guild_id!,
					_context.member?.user.id!,
				);
				if (
					channel.type === ChannelTypes.GUILD_TEXT &&
					_context.member &&
					_context.member.pending !== undefined
				) {
					const hasPerms = yield* Perms.hasInChannel(
						cache,
						Discord.Permissions.SendMessages,
					)(channel, member);
					console.log("has perms", hasPerms);
					yield* rest
						.createMessage(_context.channel?.id, {
							content: "Creating a message",
						})
						.pipe(
							Effect.catchTag("ErrorResponse", (e) =>
								Effect.gen(function* () {
									yield* Effect.logError("There was an error", e.cause.code);
								}),
							),
						);
				}
			}
			return {
				type: Discord.InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: "Hello, world!",
				},
			} satisfies Discord.CreateInteractionResponseRequest;
		}),
	);

	yield* registry.register(
		Ix.builder.add(hello).catchAllCause(Effect.logError),
	);
});

export const HelloLayer = Layer.scopedDiscard(make).pipe(
	Layer.provide(DiscordGatewayLayer),
	Layer.provide(DiscordRestLayer),
);
