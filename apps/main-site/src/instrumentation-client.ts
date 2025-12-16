import * as Sentry from "@sentry/nextjs";
import { initBotId } from "botid/client/core";

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	sendDefaultPii: true,
	tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,
	integrations: [Sentry.replayIntegration()],
});

initBotId({
	protect: [
		{
			path: "/api/auth/anonymous-session",
			method: "GET",
		},
	],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
