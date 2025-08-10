import { BunRuntime } from "@effect/platform-bun";
import { Layer } from "effect";
import { GuildParityLive } from "./src/guild-parity";
import { HelloLayer } from "./src/hello";
import { IndexingLive } from "./src/indexing";
import { ReadyLive } from "./src/ready";

const MainLive = Layer.mergeAll(
	HelloLayer,
	ReadyLive,
	IndexingLive,
	GuildParityLive,
);

BunRuntime.runMain(Layer.launch(MainLive));
