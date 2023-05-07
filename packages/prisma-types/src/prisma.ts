import { PrismaClient } from '@prisma/client';
declare global {
	// eslint-disable-next-line no-var, no-unused-vars
	var prisma: PrismaClient | undefined;
}

export const prisma =
	global.prisma ||
	new PrismaClient({
		log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
		datasources: {
			db: {
				url: process.env.DATABASE_URL,
			},
		},
	});

if (process.env.NODE_ENV !== 'production') {
	global.prisma = prisma;
}
