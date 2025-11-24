import { DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { Layer, ManagedRuntime } from "effect";

const OtelLayer = createOtelLayer("main-site");
export const runtime = ManagedRuntime.make(
	Layer.mergeAll(DatabaseLayer, OtelLayer),
);
