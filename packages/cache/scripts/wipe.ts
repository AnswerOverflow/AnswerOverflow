import { getRedisClient } from '../src/client';
void (async () => {
	const client = await getRedisClient();
	await client.flushAll();
	await client.disconnect();
})();
