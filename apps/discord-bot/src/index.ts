/* eslint-disable @typescript-eslint/naming-convention */
import * as Sentry from '@sentry/node';

// Importing @sentry/tracing patches the global hub for tracing to work.
import '@sentry/tracing';
import { sharedEnvs } from '@answeroverflow/env/shared';

Sentry.init({
	dsn: sharedEnvs.NEXT_PUBLIC_SENTRY_DSN,

	// Set tracesSampleRate to 1.0 to capture 100%
	// of transactions for performance monitoring.
	// We recommend adjusting this value in production
	tracesSampleRate: 0.1,
});

import { createClient, login } from './utils/bot';

const client = createClient();
void login(client);
