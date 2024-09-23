import { container } from '@sapphire/framework';
import * as Sentry from '@sentry/node';

export function sentryLogger<T extends object>(message: string, payload: T) {
	container.logger.error(message, payload);
	Sentry.withScope((scope) => {
		// @ts-expect-error
		scope.setExtras(payload);
		Sentry.captureMessage(message);
	});
}
