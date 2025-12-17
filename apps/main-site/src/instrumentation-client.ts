import * as Sentry from "@sentry/nextjs";
import { initBotId } from "botid/client/core";

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	sendDefaultPii: true,
	sampleRate: 0.25,
	tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
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
