import { container } from '@sapphire/framework';

export function sentryLogger<T extends object>(message: string, payload: T) {
	container.logger.error(message, payload);
}
