import { DatabaseHttpLayer } from "@packages/database/database";
import { type Effect, Layer, ManagedRuntime } from "effect";
import { SelfbotLayer } from "./selfbot-service";

export const E2ELayer = Layer.mergeAll(SelfbotLayer, DatabaseHttpLayer);

let runtimeInstance: ManagedRuntime.ManagedRuntime<
	Layer.Layer.Success<typeof E2ELayer>,
	never
> | null = null;

export const getRuntime = () => {
	if (!runtimeInstance) {
		runtimeInstance = ManagedRuntime.make(E2ELayer);
	}
	return runtimeInstance;
};

export const disposeRuntime = async () => {
	if (runtimeInstance) {
		await runtimeInstance.dispose();
		runtimeInstance = null;
	}
};

export const runMain = <A, E>(
	effect: Effect.Effect<A, E, Layer.Layer.Success<typeof E2ELayer>>,
) => {
	const runtime = getRuntime();
	return runtime.runPromise(effect);
};

export const runMainExit = <A, E>(
	effect: Effect.Effect<A, E, Layer.Layer.Success<typeof E2ELayer>>,
) => {
	const runtime = getRuntime();
	return runtime.runPromiseExit(effect);
};
