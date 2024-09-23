import { cleanupRedis } from '../';
import { config } from 'dotenv-cra';

config({
	path: '../../.env',
});

export async function teardown() {
	await cleanupRedis();
}
