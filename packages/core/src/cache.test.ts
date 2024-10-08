import { describe, expect, it } from 'bun:test';
import { Cache } from './cache';

const { getRedisClient } = Cache;

describe('Client', () => {
	it('should be able to connect to redis', async () => {
		const client = await getRedisClient();
		const pingResponse = await client.ping();
		expect(pingResponse).toBe('PONG');
	});
});
