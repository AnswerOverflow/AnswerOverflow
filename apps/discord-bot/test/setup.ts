import { cleanupRedis } from '@answeroverflow/cache';
import { prisma } from '@answeroverflow/db';

afterAll(async () => {
	await cleanupRedis();
	await prisma.$disconnect();
});
