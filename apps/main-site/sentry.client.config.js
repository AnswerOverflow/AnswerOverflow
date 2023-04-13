// This file configures the initialization of Sentry on the browser.
// The config you add here will be used whenever a page is visited.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
	dsn:
		process.env.NEXT_PUBLIC_SENTRY_DSN ??
		'https://1d27b71c90a54ad082f4877e89b3aafa@o4504844325683200.ingest.sentry.io/4504925278896128',
	// Adjust this value in production, or use tracesSampler for greater control
	tracesSampleRate: 0.1,
	// ...
	// Note: if you want to override the automatic release value, do not set a
	// `release` value here - use the environment variable `SENTRY_RELEASE`, so
	// that it will also get attached to your source maps
});
