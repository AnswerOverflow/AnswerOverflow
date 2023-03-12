import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({ once: true, event: 'messageCreate' })
export class OnMessage extends Listener {
	public async run() {}
}
