import { cleanupRedis } from '@answeroverflow/cache';
import { config } from 'dotenv-cra';

config({
	path: '../../.env',
});

export async function teardown() {
	await cleanupRedis();
}
