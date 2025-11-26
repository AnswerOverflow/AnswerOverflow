import { DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { ConfigProvider, Layer, ManagedRuntime } from "effect";

const OtelLayer = createOtelLayer("main-site");
const ConfigProviderLayer = Layer.setConfigProvider(ConfigProvider.fromEnv());

console.log("access token", process.env.BACKEND_ACCESS_TOKEN);

export const runtime = ManagedRuntime.make(
	Layer.mergeAll(DatabaseLayer, OtelLayer, ConfigProviderLayer),
);
