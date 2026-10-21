import { PostHogCaptureClientLayer } from "@packages/database/analytics/server";
import { type Database, DatabaseHttpLayer } from "@packages/database/database";
import type { Storage } from "@packages/database/storage";
import { type Effect, Layer, ManagedRuntime } from "effect";
import { BotLayers } from "../bot";
import { PlatformLayer, sharedMemoMap } from "./atom-runtime";
import { DiscordClientLayer } from "./discord-client-service";
import { DiscordLayerInternal } from "./discord-service";
import { ReacordLayer } from "./reacord-layer";

export { atomRuntime } from "./atom-runtime";

export const createAppLayer = (
	storageLayer: Layer.Layer<Storage, never, Database>,
) => {
	const StorageWithDatabase = storageLayer.pipe(
		Layer.provide(DatabaseHttpLayer),
	);

	const DiscordLayers = Layer.mergeAll(
		DiscordClientLayer,
		DiscordLayerInternal,
		ReacordLayer,
	).pipe(Layer.provide(DiscordClientLayer));

	const InfraLayer = Layer.mergeAll(
		PlatformLayer,
		DiscordLayers,
		StorageWithDatabase,
		PostHogCaptureClientLayer,
	);

	return BotLayers.pipe(Layer.provideMerge(InfraLayer));
};

export const runMain = <A, E, R, EL>(
	effect: Effect.Effect<A, E, R>,
	appLayer: Layer.Layer<R, EL, never>,
) => {
	const runtime = ManagedRuntime.make(appLayer, sharedMemoMap);

	const controller = new AbortController();

	const program = runtime.runPromise(effect, { signal: controller.signal });

	let shuttingDown = false;
	const shutdown = async () => {
		if (shuttingDown) return;
		shuttingDown = true;
		console.log("Shutting down gracefully...");
		// Interrupt the program first and wait for its finalizers, which close
		// the Discord gateway, before tearing down the services it used.
		controller.abort();
		await program.catch(() => undefined);
		try {
			await runtime.dispose();
			console.log("Runtime disposed successfully");
		} catch (error) {
			console.error("Error during runtime disposal:", error);
		}
		process.exit(0);
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);

	return program.catch((error) => {
		if (shuttingDown) return;
		console.error("Fatal error:", error);
		process.exit(1);
	});
};
