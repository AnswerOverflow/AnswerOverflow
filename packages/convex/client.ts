import { ConvexClient, ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";
import type { Doc } from "./convex/_generated/dataModel.js";
// HTTP client
const httpClient = new ConvexHttpClient(process.env.CONVEX_URL!);
const client = new ConvexClient(process.env.CONVEX_URL!);
// Example usage
// httpClient.query(api.messages.list).then((messages) => {
//   console.log(messages);
// });

// // Subscription client
// const client = new ConvexClient(process.env.CONVEX_URL);
// const unsubscribe = client.onUpdate(api.messages.list, {}, (messages) =>
//   console.log(messages),
// );
// await Bun.sleep(1000);
// client.mutate(api.messages.send, {}, { body: "hello!", author: "me" });
// await Bun.sleep(1000);

export function getEntries() {
	return httpClient.query(api.functions.getEntries);
}

export function createEntry(content: string) {
	return httpClient.mutation(api.functions.createEntry, { content });
}

export type Entry = Doc<"entries">;

export function onEntriesUpdated(
	callback: (entries: Doc<"entries">[]) => void,
) {
	client.onUpdate(api.functions.getEntries, {}, (entries) => {
		callback(entries);
	});
}
