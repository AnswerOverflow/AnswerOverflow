import { DatabaseHttpLayer } from "@packages/database/database";
import { ConfigProvider, Layer, ManagedRuntime } from "effect";

const ConfigProviderLayer = Layer.setConfigProvider(ConfigProvider.fromEnv());

export const runtime = ManagedRuntime.make(
	Layer.mergeAll(DatabaseHttpLayer, ConfigProviderLayer),
);
