import { botEnv } from '@answeroverflow/env/bot';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, Store } from '@sapphire/framework';
import {
	blue,
	gray,
	green,
	magenta,
	magentaBright,
	white,
	yellow,
} from 'colorette';

const dev = botEnv.NODE_ENV !== 'production';

@ApplyOptions<Listener.Options>({ once: true })
export class UserEvent extends Listener {
	private readonly style = dev ? yellow : blue;

	public run() {
		try {
			this.printBanner();
			this.printStoreDebugInformation();
		} catch (error) {
			this.container.logger.error('Error in ready listener:', error);
		}
	}

	private printBanner() {
		const success = green('+');

		const llc = dev ? magentaBright : white;
		const blc = dev ? magenta : blue;

		const line01 = llc('');
		const line02 = llc('');
		const line03 = llc('');

		// Offset Pad
		const pad = ' '.repeat(7);

		this.container.logger.info(
			String.raw`
      ${line01} ${pad}${blc('1.0.0')}
      ${line02} ${pad}[${success}] Gateway
      ${line03}${
				dev
					? ` ${pad}${blc('<')}${llc('/')}${blc('>')} ${llc(
							'DEVELOPMENT MODE',
						)}`
					: ''
			}
		`.trim(),
		);
	}

	private printStoreDebugInformation() {
		try {
			const { client, logger } = this.container;
			const stores = [...client.stores.values()];
			const last = stores.pop()!;

			for (const store of stores) logger.info(this.styleStore(store, false));
			logger.info(this.styleStore(last, true));
		} catch (error) {
			this.container.logger.error('Error printing store information:', error);
		}
	}

	private styleStore(store: Store<any>, last: boolean) {
		return gray(
			`${last ? '└─' : '├─'} Loaded ${this.style(
				store.size.toString().padEnd(3, ' '),
			)} ${store.name}.`,
		);
	}
}
