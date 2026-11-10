import { DatabaseHttpLayer } from "@packages/database/database";
import { Atom } from "@packages/reacord";
import { Effect, Layer, Logger, LogLevel } from "effect";

const LoggerLayer =
	process.env.NODE_ENV === "development"
		? Logger.minimumLogLevel(LogLevel.Debug)
		: Logger.minimumLogLevel(LogLevel.Info);

export const PlatformLayer = Layer.mergeAll(LoggerLayer, DatabaseHttpLayer);

export const sharedMemoMap = Effect.runSync(Layer.makeMemoMap);

export const atomRuntime = Atom.context({ memoMap: sharedMemoMap })(
	PlatformLayer,
);
