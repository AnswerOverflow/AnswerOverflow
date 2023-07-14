import { prisma } from '@answeroverflow/prisma-types';
import { elastic } from '@answeroverflow/elastic-types';
export async function clearDatabase() {
	if (process.env.NODE_ENV !== 'test') {
		throw new Error('clearDatabase can only be used in test environment');
	}

	if (
		process.env.NEXT_PUBLIC_DEPLOYMENT_ENV !== 'local' &&
		process.env.NEXT_PUBLIC_DEPLOYMENT_ENV !== 'ci'
	) {
		throw new Error('clearDatabase can only be used in local environment');
	}

	console.log('Wiping database...');

	await prisma.userServerSettings.deleteMany({});
	await prisma.channel.deleteMany({
		where: {
			parentId: {
				not: null,
			},
		},
	});
	await prisma.tenantSession.deleteMany({});
	await prisma.channel.deleteMany({});
	await prisma.server.deleteMany({});
	await prisma.account.deleteMany({});
	await prisma.discordAccount.deleteMany({});
	await prisma.session.deleteMany({});
	await prisma.user.deleteMany({});
	await prisma.ignoredDiscordAccount.deleteMany({});
	await elastic.createMessagesIndex();
	console.log('Database wiped successfully');
}
