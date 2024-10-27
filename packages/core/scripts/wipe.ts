import { clearDatabase } from '../src/utils';
import { Cache } from '../src/cache';
import * as Search from '../src/search';
void (async () => {
	await clearDatabase();
	console.log('Wiping Redis...');
	const client = await Cache.getRedisClient();
	await client.flushAll();
	await client.disconnect();
	console.log('Redis wiped successfully');
	console.log('Wiping Elasticsearch...');
	await Search.elastic.createMessagesIndex();
	console.log('Elasticsearch wiped successfully');
	process.exit(0);
})();
