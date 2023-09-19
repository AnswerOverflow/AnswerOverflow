import { getRedisClient } from '../src/client';
void (async () => {
	console.log('Wiping redis cache');
	const client = await getRedisClient();
	await client.flushAll();
	await client.disconnect();
	console.log('Redis cache wiped');
})();
