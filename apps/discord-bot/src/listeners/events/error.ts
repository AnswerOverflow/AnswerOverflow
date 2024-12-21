import { ApplyOptions } from '@sapphire/decorators';
import {
	Events,
	Listener,
	type ListenerErrorPayload,
} from '@sapphire/framework';
import { sentryLogger } from '../../utils/sentry';

@ApplyOptions<Listener.Options>({
	event: Events.ListenerError,
	name: 'ListenerError',
})
export class ListenerErrorEvent extends Listener<typeof Events.ListenerError> {
	public run(error: Error, payload: ListenerErrorPayload) {
		try {
			console.error('Listener Error:', error);
			console.error('Payload:', payload);

			sentryLogger('Listener error', {
				error,
				payload,
			});
		} catch (e) {
			console.error('Failed to handle listener error:', e);
		}
	}
}
