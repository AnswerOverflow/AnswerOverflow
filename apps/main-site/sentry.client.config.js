// This file configures the initialization of Sentry on the browser.
// The config you add here will be used whenever a page is visited.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { webClientEnv } from '@answeroverflow/env/web-schema.mjs';

Sentry.init({
	dsn: webClientEnv.NEXT_PUBLIC_SENTRY_DSN,
	// Adjust this value in production, or use tracesSampler for greater control
	tracesSampleRate: 0.1,
	// ...
	// Note: if you want to override the automatic release value, do not set a
	// `release` value here - use the environment variable `SENTRY_RELEASE`, so
	// that it will also get attached to your source maps
});
