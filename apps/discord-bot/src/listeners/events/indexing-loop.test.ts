import { Client, Events } from 'discord.js';
import { delay, emitEvent } from '@answeroverflow/discordjs-mock';
import { indexServers } from '~discord-bot/domains/indexing';
import { setupAnswerOverflowBot } from '~discord-bot/test/sapphire-mock';
/*
  Ref: https://www.chakshunyu.com/blog/how-to-mock-only-one-function-from-a-module-in-jest/
  Spying on the function wasn't working so we ended up with this hacky solution
*/
jest.mock('~discord-bot/domains/indexing', () => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const original = jest.requireActual('~discord-bot/domains/indexing');
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return {
		...original,
		indexServers: jest.fn(),
	};
});

describe('Indexing Loop', () => {
	it('should index all servers', async () => {
		// @ts-ignore
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		indexServers.mockImplementation(async () => {});
		jest.useFakeTimers({
			doNotFake: ['setTimeout'],
		});
		const client = await setupAnswerOverflowBot(false);
		await emitEvent(client, Events.ClientReady, client as Client);
		jest.advanceTimersByTime(86400000); // advance time by 24 hours in ms
		await delay(2000); // doesn't run correctly without this
		expect(indexServers).toHaveBeenCalledTimes(2);
	});
});
