import { cleanupRedis } from '@answeroverflow/cache';
import { db } from '@answeroverflow/db';

afterAll(async () => {
	await cleanupRedis();
	// TODO: It doesn't appear that we can close the db connection (prisma -> drizzle)
});
