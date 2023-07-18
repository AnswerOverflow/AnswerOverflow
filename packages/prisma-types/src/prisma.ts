import { PrismaClient } from '@prisma/client';
import { sharedEnvs } from '@answeroverflow/env/shared';

declare global {
	// eslint-disable-next-line no-var, no-unused-vars
	var prisma: PrismaClient | undefined;
}

export const prisma =
	global.prisma ||
	new PrismaClient({
		log: sharedEnvs.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
		datasources: {
			db: {
				url: sharedEnvs.DATABASE_URL,
			},
		},
	});

if (sharedEnvs.NODE_ENV !== 'production') {
	global.prisma = prisma;
} else {
	if (sharedEnvs.ENVIRONMENT === 'discord-bot') {
		global.prisma = prisma;
	}
}
