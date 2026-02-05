import { DatabaseHttpLayer } from "@packages/database/database";
import { type Effect, Layer, ManagedRuntime } from "effect";
import { Pushover } from "./pushover-service";
import { SelfbotLayer } from "./selfbot-service";

export const E2ELayer = Layer.mergeAll(
	SelfbotLayer,
	DatabaseHttpLayer,
	Pushover.Default,
);

const runtimeInstance = ManagedRuntime.make(E2ELayer);

export const disposeRuntime = () => runtimeInstance.dispose();

export const runMain = <A, E>(
	effect: Effect.Effect<A, E, Layer.Layer.Success<typeof E2ELayer>>,
) => runtimeInstance.runPromise(effect);

export const runMainExit = <A, E>(
	effect: Effect.Effect<A, E, Layer.Layer.Success<typeof E2ELayer>>,
) => runtimeInstance.runPromiseExit(effect);
