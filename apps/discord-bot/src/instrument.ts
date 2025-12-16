import { initSentry } from "@packages/observability/sentry";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

initSentry({
	dsn: process.env.SENTRY_DSN,
	environment: process.env.NODE_ENV ?? "development",
	release: process.env.SENTRY_RELEASE,
	tracesSampleRate: 1.0,
	profilesSampleRate: 1.0,
});

Sentry.addIntegration(nodeProfilingIntegration());
