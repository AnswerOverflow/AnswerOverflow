import type { Channel, ClientEvents, Guild } from "discord.js";
import { Context, Data, type Effect } from "effect";

export class DiscordError extends Data.TaggedError("DiscordError")<{
	cause: unknown;
}> {}

export type DiscordClientService = {
	login: () => Effect.Effect<void, DiscordError>;
	// Guild operations
	getGuild: (id: string) => Effect.Effect<Guild | null, DiscordError>;
	getGuilds: () => Effect.Effect<ReadonlyArray<Guild>, DiscordError>;

	// Channel operations
	getChannel: (id: string) => Effect.Effect<Channel | null, DiscordError>;
	getChannels: (
		guildId: string,
	) => Effect.Effect<ReadonlyArray<Channel>, DiscordError>;

	// Event subscription
	on: <E extends keyof ClientEvents, Err = never, Req = never>(
		event: E,
		handler: (...args: ClientEvents[E]) => Effect.Effect<void, Err, Req>,
	) => Effect.Effect<() => void, DiscordError, Req>;
};

export class DiscordClient extends Context.Tag("DiscordClient")<
	DiscordClient,
	DiscordClientService
>() {}
