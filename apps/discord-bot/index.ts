import { BunRuntime } from "@effect/platform-bun";
import { Layer } from "effect";
import { ReadyLive } from "./src/ready";
import { HelloLayer } from "./src/hello";

const MainLive = Layer.mergeAll(HelloLayer, ReadyLive);

BunRuntime.runMain(Layer.launch(MainLive));
