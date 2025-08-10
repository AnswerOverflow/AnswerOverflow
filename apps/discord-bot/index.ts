import { BunRuntime } from "@effect/platform-bun";
import { Layer } from "effect";
import { ReadyLive } from "./src/ready";
import { HelloLayer } from "./src/hello";
import { IndexingLive } from "./src/indexing";
import { GuildParityLive } from "./src/guild-parity";

const MainLive = Layer.mergeAll(
	HelloLayer,
	ReadyLive,
	IndexingLive,
	GuildParityLive,
);

BunRuntime.runMain(Layer.launch(MainLive));
