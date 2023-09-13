import { elastic } from '../src/elastic';
void (async () => {
	await elastic.createMessagesIndex();
})();
