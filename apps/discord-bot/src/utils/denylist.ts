import { container } from '@sapphire/framework';
import type { Guild } from 'discord.js';

export const DENYLIST = {
	SERVER_IDS: new Set([
		'1133324597534654484',
		'1133132039466528818',
		'1154298795182526484',
		'1395122494486085715',
		'1406148988029239376',
	]),
	USER_IDS: new Set([
		'1073171830216589352',
		'1405204138203283527',
		'825434035076464710',
		'684918626192851032',
	]),
} as const;

export async function leaveServerIfNecessary(server: Guild) {
	const isServerInDenylist = DENYLIST.SERVER_IDS.has(server.id);
	const isServerOwnerInDenylist = DENYLIST.USER_IDS.has(server.ownerId);
	const doesNameHaveGrowAGarden = server.name
		.toLowerCase()
		.includes('grow a garden');
	const isMemberCountTooLow = server.memberCount < 10 && server.memberCount > 0;
	if (
		isServerInDenylist ||
		isServerOwnerInDenylist ||
		doesNameHaveGrowAGarden ||
		isMemberCountTooLow
	) {
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
