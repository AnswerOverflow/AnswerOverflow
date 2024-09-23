import { elastic } from '../src/elastic';
void (async () => {
	console.log('Wiping elastic search index');
	await elastic.createMessagesIndex();
	console.log('Elastic search index wiped');
})();
