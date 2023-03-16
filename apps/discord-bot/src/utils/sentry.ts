import { container } from '@sapphire/framework';
import * as Sentry from '@sentry/node';

export function sentryLogger(
	message: string,
	payload: Record<string, unknown>,
) {
	container.logger.error(message, payload);
	Sentry.withScope((scope) => {
		scope.setExtras(payload);
		Sentry.captureMessage(message);
	});
}
