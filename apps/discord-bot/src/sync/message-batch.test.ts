import { describe, expect, it } from "@effect/vitest";
import { Database } from "@packages/database/database";
import { DatabaseTestLayer } from "@packages/database/database-test";
import { Storage } from "@packages/database/storage";
import {
	createAuthor,
	createChannel,
	createServer,
} from "@packages/database/test/fixtures";
import { Effect, Layer } from "effect";
import { toUpsertMessageArgs } from "../utils/conversions";
import { persistMessageBatch } from "./message-batch";

const fixture = Effect.gen(function* () {
	const database = yield* Database;
	const server = yield* createServer();
	const channel = yield* createChannel(server.discordId);
	const author = yield* createAuthor();
	const base = {
		id: 900n,
		authorId: author.id,
		serverId: server.discordId,
		channelId: channel.id,
		content: "Synthetic embed message",
	};
	const uploads: string[] = [];
	const storage = Layer.succeed(Storage, {
		uploadFileFromUrl: () => Effect.void,
		uploadSitemap: () => Effect.void,
		uploadEmbedImage: (input) =>
			database.private.messages
				.updateEmbedS3Key({
					messageId: input.messageId,
					embedIndex: input.embedIndex,
					field: input.field,
					s3Key: `synthetic/${input.field}.png`,
				})
				.pipe(
					Effect.tap(() => Effect.sync(() => uploads.push(input.field))),
					Effect.asVoid,
				),
	});
	return { database, base, storage, uploads };
});

describe("message batch embed uploads", () => {
	it.scoped("persists a new message before linking its uploaded image", () =>
		Effect.gen(function* () {
			const { database, base, storage, uploads } = yield* fixture;
			yield* persistMessageBatch([
				toUpsertMessageArgs({
					...base,
					embeds: [{ image: { url: "https://example.com/image.png" } }],
				}),
			]).pipe(Effect.provide(storage));
			const stored = yield* database.private.messages.getMessageById({
				id: base.id,
			});
			expect(stored?.embeds?.[0]?.image?.s3Key).toBe("synthetic/image.png");
			expect(uploads).toEqual(["image"]);
		}).pipe(Effect.provide(DatabaseTestLayer)),
	);

	it.scoped("replaces an old empty snapshot before linking a new footer", () =>
		Effect.gen(function* () {
			const { database, base, storage, uploads } = yield* fixture;
			yield* database.private.messages.upsertMessage({ message: base });
			yield* persistMessageBatch([
				toUpsertMessageArgs({
					...base,
					embeds: [
						{ title: "First embed" },
						{
							footer: {
								text: "Synthetic",
								proxyIconUrl: "https://example.com/footer.png",
							},
						},
					],
				}),
			]).pipe(Effect.provide(storage));
			const stored = yield* database.private.messages.getMessageById({
				id: base.id,
			});
			expect(stored?.embeds?.[1]?.footer?.iconS3Key).toBe(
				"synthetic/footerIcon.png",
			);
			expect(uploads).toEqual(["footerIcon"]);
		}).pipe(Effect.provide(DatabaseTestLayer)),
	);

	it.scoped(
		"uploads only the final snapshot when one batch contains repeated updates",
		() =>
			Effect.gen(function* () {
				const { database, base, storage, uploads } = yield* fixture;
				yield* persistMessageBatch([
					toUpsertMessageArgs({
						...base,
						embeds: [{ image: { url: "https://example.com/old.png" } }],
					}),
					toUpsertMessageArgs({
						...base,
						embeds: [
							{
								author: {
									name: "Synthetic",
									proxyIconUrl: "https://example.com/new.png",
								},
							},
						],
					}),
				]).pipe(Effect.provide(storage));
				const stored = yield* database.private.messages.getMessageById({
					id: base.id,
				});
				expect(stored?.embeds?.[0]?.author?.iconS3Key).toBe(
					"synthetic/authorIcon.png",
				);
				expect(stored?.embeds?.[0]?.image).toBeUndefined();
				expect(uploads).toEqual(["authorIcon"]);
			}).pipe(Effect.provide(DatabaseTestLayer)),
	);

	it.scoped(
		"does not upload media for an author rejected by indexing privacy checks",
		() =>
			Effect.gen(function* () {
				const { database, base, storage, uploads } = yield* fixture;
				yield* database.private.discord_accounts.deleteDiscordAccount({
					id: base.authorId,
				});
				yield* persistMessageBatch([
					toUpsertMessageArgs({
						...base,
						embeds: [{ image: { url: "https://example.com/ignored.png" } }],
					}),
				]).pipe(Effect.provide(storage));
				expect(
					yield* database.private.messages.getMessageById({ id: base.id }),
				).toBeNull();
				expect(uploads).toEqual([]);
			}).pipe(Effect.provide(DatabaseTestLayer)),
	);
});
