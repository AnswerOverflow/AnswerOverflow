import { ApplyOptions } from '@sapphire/decorators';
import {
	Events,
	Listener,
	type ListenerErrorPayload,
} from '@sapphire/framework';
import { sentryLogger } from '~discord-bot/utils/sentry';

@ApplyOptions<Listener.Options>({
	event: Events.ListenerError,
	name: 'ListenerError',
})
export class ListenerErrorEvent extends Listener<typeof Events.ListenerError> {
	public run(error: Error, payload: ListenerErrorPayload) {
		sentryLogger('Listener error', {
			error,
			payload,
		});
	}
}
