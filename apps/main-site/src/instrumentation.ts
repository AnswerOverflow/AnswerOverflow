import * as Sentry from "@sentry/nextjs";

export function register() {
	Sentry.init({
		dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
		sendDefaultPii: true,
		sampleRate: 0.25,
		tracesSampleRate: 0,
	});
}

export const onRequestError = Sentry.captureRequestError;
