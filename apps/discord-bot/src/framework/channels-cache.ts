import { Cache } from "dfx";
import { CachePrelude } from "dfx/gateway";
import { Duration, Effect } from "effect";
import { DiscordGatewayLayer } from "./discord-gateway";

export class ChannelsCache extends Effect.Service<ChannelsCache>()(
	"app/ChannelsCache",
	{
		scoped: CachePrelude.channels(
			Cache.memoryTTLParentDriver({
				ttl: Duration.minutes(30),
				strategy: "activity",
			}),
		),
		dependencies: [DiscordGatewayLayer],
	},
) {}
