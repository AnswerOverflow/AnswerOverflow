import * as Sentry from "@sentry/nextjs";

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	enableLogs: true,
	sendDefaultPii: true,
	sampleRate: 0.25,
	tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});
