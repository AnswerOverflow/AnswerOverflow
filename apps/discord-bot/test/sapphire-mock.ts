import { assert } from 'console';
import { type ClientOptions, Options, Events, Client } from 'discord.js';
import { applyClientMocks, emitEvent } from '@answeroverflow/discordjs-mock';
import { basename, extname } from 'path';
import { createClient, login } from '~discord-bot/utils/bot';

export function mockSapphireClient(
	override: Partial<ClientOptions> = {
		// Cache everything is used to simulate API responses, removes the limit
		makeCache: Options.cacheEverything(),
	},
) {
	// TODO: This is so ugly please fix this
	const client = createClient(override);
	client.stores.forEach((store) => {
		// @ts-expect-error
		// replace the functionality of adding to the store to use a function that adds everything that doesn't include the /dist folder, along with that ignore any test files as those shouldn't be loaded
		store.registerPath = (path) => {
			// @ts-expect-error
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
			if (!path.includes('/dist')) {
				store.paths.add(path.toString());
			}
		};

		// Add the source path to the store
		const path = process.cwd();
		store.paths.add(path + `/src/${store.name}`);

		// Add the typescript extensions to be able to be parsed
		// @ts-expect-error
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
		store.strategy.supportedExtensions.push('.ts', '.cts', '.mts', '.tsx');

		// Filter out type files
		// @ts-expect-error
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
		store.strategy.filterDtsFiles = true;

		// @ts-ignore
		store.strategy.filter = jest.fn((filePath) => {
			// Retrieve the file extension.
			const extension = extname(filePath);
			// @ts-expect-error
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
			if (!store.strategy.supportedExtensions.includes(extension)) return null;

			// @ts-expect-error
			if (store.strategy.filterDtsFiles && filePath.endsWith('.d.ts'))
				return null;

			if (filePath.includes('.test')) return null;

			// Retrieve the name of the file, return null if empty.
			const name = basename(filePath, extension);
			if (name === '') return null;

			// Return the name and extension.
			return { extension, path: filePath, name };
		});
	});

	applyClientMocks(client);
	assert(client.user !== null, 'Client user is null');
	client.id = client.user!.id;
	return client;
}

export async function setupAnswerOverflowBot(autoLogin = true) {
	const client = mockSapphireClient();
	await login(client);
	if (autoLogin) await emitEvent(client, Events.ClientReady, client as Client);
	return client;
}
