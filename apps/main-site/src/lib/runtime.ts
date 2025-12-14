import { DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { ConfigProvider, Layer, ManagedRuntime } from "effect";

const OtelLayer = createOtelLayer("main-site");
const ConfigProviderLayer = Layer.setConfigProvider(ConfigProvider.fromEnv());

export const runtime = ManagedRuntime.make(
	Layer.mergeAll(DatabaseLayer, OtelLayer, ConfigProviderLayer),
);
