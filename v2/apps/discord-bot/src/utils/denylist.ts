import { Guild } from 'discord.js';
import { container } from '@sapphire/framework';

export const DENYLIST = {
	SERVER_IDS: new Set([
		'1133324597534654484',
		'1133132039466528818',
		'1154298795182526484',
	]),
	USER_IDS: new Set(['1073171830216589352']),
} as const;

export async function leaveServerIfNecessary(server: Guild) {
	const isServerInDenylist = DENYLIST.SERVER_IDS.has(server.id);
	const isServerOwnerInDenylist = DENYLIST.USER_IDS.has(server.ownerId);
	if (isServerInDenylist || isServerOwnerInDenylist) {
		await server.leave();
		container.logger.info(
			`Left server ${server.name} (${server.id}) because the ${
				isServerInDenylist ? 'server' : 'owner'
			} is in the denylist`,
		);
		return true;
	}
	return false;
}
