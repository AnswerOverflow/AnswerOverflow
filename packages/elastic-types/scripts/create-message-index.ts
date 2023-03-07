import { elastic } from "../src/elastic";
import {} from "../index";
void (async () => {
  await elastic.createMessagesIndex();
})();
