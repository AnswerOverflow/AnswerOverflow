import * as Sentry from "@sentry/node";

// Importing @sentry/tracing patches the global hub for tracing to work.
import "@sentry/tracing";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 0.1,
});

import { createClient, login } from "./utils/bot";
import { SapphireClient } from "@sapphire/framework";
// make TypeScript happy
declare global {
  var client: SapphireClient;
}

if (!global.client) {
  global.client = createClient();
  await login(global.client);
}
