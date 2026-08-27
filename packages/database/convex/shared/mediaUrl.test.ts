import { describe, expect, test } from "vitest";
import {
	cdnUrlForAttachment,
	parseDiscordAttachmentUrl,
	rewriteDiscordMediaUrlToCdn,
} from "./mediaUrl";

const CDN_DOMAIN = "cdn.answeroverflow.com";

describe("cdnUrlForAttachment", () => {
	test("builds a cdn url from id and filename", () => {
		expect(cdnUrlForAttachment(123n, "image.png", CDN_DOMAIN)).toBe(
			"https://cdn.answeroverflow.com/123/image.png",
		);
	});

	test("accepts string ids", () => {
		expect(cdnUrlForAttachment("456", "file.gif", CDN_DOMAIN)).toBe(
			"https://cdn.answeroverflow.com/456/file.gif",
		);
	});
});

describe("parseDiscordAttachmentUrl", () => {
	test("parses a signed cdn.discordapp.com attachment url", () => {
		expect(
			parseDiscordAttachmentUrl(
				"https://cdn.discordapp.com/attachments/111/222/image.png?ex=68b0&is=68af&hm=abc",
			),
		).toEqual({ id: "222", filename: "image.png" });
	});

	test("parses a media.discordapp.net attachment url", () => {
		expect(
			parseDiscordAttachmentUrl(
				"https://media.discordapp.net/attachments/111/222/image.png",
			),
		).toEqual({ id: "222", filename: "image.png" });
	});

	test("decodes percent-encoded filenames", () => {
		expect(
			parseDiscordAttachmentUrl(
				"https://cdn.discordapp.com/attachments/111/222/my%20image.png",
			),
		).toEqual({ id: "222", filename: "my image.png" });
	});

	test("returns null for non-discord hosts", () => {
		expect(
			parseDiscordAttachmentUrl("https://cdn.answeroverflow.com/222/image.png"),
		).toBeNull();
	});

	test("returns null for non-attachment discord paths", () => {
		expect(
			parseDiscordAttachmentUrl(
				"https://cdn.discordapp.com/avatars/111/abc.png",
			),
		).toBeNull();
	});

	test("returns null for invalid urls", () => {
		expect(parseDiscordAttachmentUrl("not a url")).toBeNull();
		expect(parseDiscordAttachmentUrl("")).toBeNull();
	});
});

describe("rewriteDiscordMediaUrlToCdn", () => {
	test("rewrites a signed discord attachment url to the cdn", () => {
		expect(
			rewriteDiscordMediaUrlToCdn(
				"https://cdn.discordapp.com/attachments/111/222/image.png?ex=68b0&is=68af&hm=abc",
				CDN_DOMAIN,
			),
		).toBe("https://cdn.answeroverflow.com/222/image.png");
	});

	test("leaves already-cdn urls unchanged", () => {
		const url = "https://cdn.answeroverflow.com/222/image.png";
		expect(rewriteDiscordMediaUrlToCdn(url, CDN_DOMAIN)).toBe(url);
	});

	test("leaves non-attachment urls unchanged", () => {
		const url = "https://example.com/image.png";
		expect(rewriteDiscordMediaUrlToCdn(url, CDN_DOMAIN)).toBe(url);
	});

	test("leaves invalid urls unchanged", () => {
		expect(rewriteDiscordMediaUrlToCdn("not a url", CDN_DOMAIN)).toBe(
			"not a url",
		);
	});
});
