import { type Message, MessageReferenceType } from "discord.js";
import { describe, expect, it } from "vitest";
import { extractSnapshotMediaToUpload } from "./snapshot-media";

function mockForwardMessage(snapshot: unknown): Message {
	return {
		reference: { type: MessageReferenceType.Forward },
		messageSnapshots: { first: () => snapshot },
	} as unknown as Message;
}

describe("extractSnapshotMediaToUpload", () => {
	it("collects attachments from a forwarded message snapshot", () => {
		const message = mockForwardMessage({
			attachments: new Map([
				[
					"222",
					{
						id: "222",
						url: "https://cdn.discordapp.com/attachments/111/222/image.png?ex=68b0&is=68af&hm=abc",
						name: "image.png",
						contentType: "image/png",
					},
				],
			]),
			embeds: [],
		});

		expect(extractSnapshotMediaToUpload(message)).toEqual([
			{
				id: "222",
				url: "https://cdn.discordapp.com/attachments/111/222/image.png?ex=68b0&is=68af&hm=abc",
				filename: "image.png",
				contentType: "image/png",
			},
		]);
	});

	it("collects snapshot embed images hosted on the discord cdn", () => {
		const message = mockForwardMessage({
			attachments: new Map(),
			embeds: [
				{
					image: {
						url: "https://media.discordapp.net/attachments/111/333/embed.png?ex=68b0",
					},
					thumbnail: {
						url: "https://example.com/external.png",
					},
				},
			],
		});

		expect(extractSnapshotMediaToUpload(message)).toEqual([
			{
				id: "333",
				url: "https://media.discordapp.net/attachments/111/333/embed.png?ex=68b0",
				filename: "embed.png",
			},
		]);
	});

	it("dedupes embed images that duplicate a snapshot attachment", () => {
		const url =
			"https://cdn.discordapp.com/attachments/111/222/image.png?ex=68b0";
		const message = mockForwardMessage({
			attachments: new Map([
				[
					"222",
					{ id: "222", url, name: "image.png", contentType: "image/png" },
				],
			]),
			embeds: [{ image: { url } }],
		});

		expect(extractSnapshotMediaToUpload(message)).toHaveLength(1);
	});

	it("returns nothing for a normal message", () => {
		const message = {
			reference: null,
			messageSnapshots: { first: () => undefined },
		} as unknown as Message;

		expect(extractSnapshotMediaToUpload(message)).toEqual([]);
	});

	it("returns nothing for a reply reference", () => {
		const message = {
			reference: { type: MessageReferenceType.Default },
			messageSnapshots: { first: () => undefined },
		} as unknown as Message;

		expect(extractSnapshotMediaToUpload(message)).toEqual([]);
	});

	it("returns nothing for a forward without a snapshot", () => {
		expect(extractSnapshotMediaToUpload(mockForwardMessage(undefined))).toEqual(
			[],
		);
	});
});
