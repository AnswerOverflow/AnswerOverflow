#!/usr/bin/env bun

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const TEST_URLS = [
	"https://vapi.ai/community",
	"https://vapi.ai/community/m/1455484549139005490",
	"https://vapi.ai/community/m/1454982035578945568",
	"https://discord-questions.convex.dev/m/1453096705447821426",
	"https://discord-questions.convex.dev/m/1326036360045269012",
	"https://www.answeroverflow.com/",
	"https://www.answeroverflow.com/m/1455487534527152148",
	"https://www.answeroverflow.com/browse",
	"https://www.answeroverflow.com/c/679875946597056683",
];

const KNOWN_ISSUES: Record<string, string[]> = {
	"https://www.answeroverflow.com/": ["Missing canonical URL"],
	"https://www.answeroverflow.com/browse": [
		"Missing og:image",
		"Missing canonical URL",
	],
};

const SNAPSHOT_PATH = "scripts/metadata-snapshots.json";

interface PageMetadata {
	url: string;
	title: string | null;
	canonical: string | null;
	description: string | null;
	ogTitle: string | null;
	ogDescription: string | null;
	ogImage: string | null;
	ogUrl: string | null;
	twitterCard: string | null;
	twitterTitle: string | null;
	twitterDescription: string | null;
	robots: string | null;
}

interface Snapshot {
	generatedAt: string;
	metadata: Record<string, PageMetadata>;
}

async function fetchPageMetadata(url: string): Promise<PageMetadata> {
	const response = await fetch(url, {
		headers: {
			"User-Agent":
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			Accept:
				"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
			"Accept-Language": "en-US,en;q=0.5",
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.status}`);
	}

	const html = await response.text();
	const dom = new JSDOM(html);
	const document = dom.window.document;

	const getMetaContent = (selector: string): string | null => {
		const element = document.querySelector(selector);
		return element?.getAttribute("content") ?? null;
	};

	const canonical = document.querySelector('link[rel="canonical"]');

	return {
		url,
		title: document.querySelector("title")?.textContent ?? null,
		canonical: canonical?.getAttribute("href") ?? null,
		description: getMetaContent('meta[name="description"]'),
		ogTitle: getMetaContent('meta[property="og:title"]'),
		ogDescription: getMetaContent('meta[property="og:description"]'),
		ogImage: getMetaContent('meta[property="og:image"]'),
		ogUrl: getMetaContent('meta[property="og:url"]'),
		twitterCard: getMetaContent('meta[name="twitter:card"]'),
		twitterTitle: getMetaContent('meta[name="twitter:title"]'),
		twitterDescription: getMetaContent('meta[name="twitter:description"]'),
		robots: getMetaContent('meta[name="robots"]'),
	};
}

function validateCanonical(metadata: PageMetadata): string[] {
	const errors: string[] = [];
	const urlObj = new URL(metadata.url);

	if (!metadata.canonical) {
		errors.push(`Missing canonical URL for ${metadata.url}`);
	} else {
		try {
			const canonicalObj = new URL(metadata.canonical);
			if (canonicalObj.pathname !== urlObj.pathname) {
				const normalizedCanonical = canonicalObj.pathname.replace(/\/$/, "");
				const normalizedUrl = urlObj.pathname.replace(/\/$/, "");
				if (normalizedCanonical !== normalizedUrl) {
					errors.push(
						`Canonical pathname mismatch for ${metadata.url}: expected "${urlObj.pathname}", got "${canonicalObj.pathname}"`,
					);
				}
			}
		} catch {
			errors.push(
				`Invalid canonical URL for ${metadata.url}: ${metadata.canonical}`,
			);
		}
	}

	if (
		metadata.ogUrl &&
		metadata.canonical &&
		metadata.ogUrl !== metadata.canonical
	) {
		errors.push(
			`og:url doesn't match canonical for ${metadata.url}: og:url="${metadata.ogUrl}", canonical="${metadata.canonical}"`,
		);
	}

	return errors;
}

function validateMetadata(metadata: PageMetadata): string[] {
	const errors: string[] = [];

	if (!metadata.title) {
		errors.push(`Missing title for ${metadata.url}`);
	}

	if (!metadata.description) {
		errors.push(`Missing description for ${metadata.url}`);
	}

	if (!metadata.ogTitle) {
		errors.push(`Missing og:title for ${metadata.url}`);
	}

	if (!metadata.ogImage) {
		errors.push(`Missing og:image for ${metadata.url}`);
	}

	errors.push(...validateCanonical(metadata));

	return errors;
}

function isKnownIssue(url: string, error: string): boolean {
	const knownForUrl = KNOWN_ISSUES[url];
	if (!knownForUrl) return false;
	return knownForUrl.some((known) => error.includes(known));
}

function loadSnapshot(): Snapshot | null {
	if (!existsSync(SNAPSHOT_PATH)) {
		return null;
	}
	const content = readFileSync(SNAPSHOT_PATH, "utf-8");
	return JSON.parse(content);
}

function saveSnapshot(metadata: Record<string, PageMetadata>): void {
	const snapshot: Snapshot = {
		generatedAt: new Date().toISOString(),
		metadata,
	};
	writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
}

function compareSnapshots(
	current: PageMetadata,
	previous: PageMetadata,
): string[] {
	const changes: string[] = [];
	const keysToCompare: (keyof PageMetadata)[] = [
		"title",
		"canonical",
		"ogTitle",
		"ogUrl",
		"ogImage",
	];

	for (const key of keysToCompare) {
		if (current[key] !== previous[key]) {
			changes.push(`  ${key}: "${previous[key]}" -> "${current[key]}"`);
		}
	}

	return changes;
}

async function runTests(updateSnapshots = false, strict = false) {
	console.log("Fetching page metadata...\n");

	const results: {
		metadata: PageMetadata;
		errors: string[];
		warnings: string[];
	}[] = [];
	const metadataMap: Record<string, PageMetadata> = {};
	let hasFailures = false;
	let hasSnapshotChanges = false;

	const previousSnapshot = loadSnapshot();

	for (const url of TEST_URLS) {
		try {
			process.stdout.write(`Testing ${url}... `);
			const metadata = await fetchPageMetadata(url);
			metadataMap[url] = metadata;
			const allErrors = validateMetadata(metadata);

			const errors: string[] = [];
			const warnings: string[] = [];

			for (const error of allErrors) {
				if (isKnownIssue(url, error)) {
					warnings.push(error);
				} else {
					errors.push(error);
				}
			}

			results.push({ metadata, errors, warnings });

			if (errors.length > 0) {
				hasFailures = true;
				console.log("FAIL");
				for (const error of errors) {
					console.log(`  - ${error}`);
				}
			} else if (warnings.length > 0) {
				console.log("WARN (known issues)");
				for (const warning of warnings) {
					console.log(`  - ${warning}`);
				}
			} else {
				console.log("OK");
			}

			if (previousSnapshot && !updateSnapshots) {
				const previous = previousSnapshot.metadata[url];
				if (previous) {
					const changes = compareSnapshots(metadata, previous);
					if (changes.length > 0) {
						hasSnapshotChanges = true;
						console.log("  Snapshot changes detected:");
						for (const change of changes) {
							console.log(change);
						}
					}
				} else {
					console.log("  (new URL, not in previous snapshot)");
				}
			}
		} catch (error) {
			hasFailures = true;
			console.log("ERROR");
			console.log(
				`  - ${error instanceof Error ? error.message : String(error)}`,
			);
			results.push({
				metadata: {
					url,
					title: null,
					canonical: null,
					description: null,
					ogTitle: null,
					ogDescription: null,
					ogImage: null,
					ogUrl: null,
					twitterCard: null,
					twitterTitle: null,
					twitterDescription: null,
					robots: null,
				},
				errors: [error instanceof Error ? error.message : String(error)],
				warnings: [],
			});
		}
	}

	if (updateSnapshots) {
		saveSnapshot(metadataMap);
		console.log(`\nSnapshot saved to ${SNAPSHOT_PATH}`);
	}

	console.log("\n--- Metadata Summary ---\n");

	for (const { metadata } of results) {
		if (metadata.title) {
			console.log(`${metadata.url}`);
			console.log(`  Title: ${metadata.title}`);
			console.log(`  Canonical: ${metadata.canonical}`);
			console.log(`  Description: ${metadata.description?.slice(0, 80)}...`);
			console.log("");
		}
	}

	if (hasSnapshotChanges && strict) {
		console.log(
			"\nSnapshot changes detected! Run with --update-snapshots to update.",
		);
		hasFailures = true;
	}

	if (hasFailures) {
		console.log("\nSome tests failed!");
		process.exit(1);
	} else {
		console.log("\nAll tests passed!");
		process.exit(0);
	}
}

if (import.meta.main) {
	const updateSnapshots = process.argv.includes("--update-snapshots");
	const strict = process.argv.includes("--strict");
	runTests(updateSnapshots, strict);
}

export {
	fetchPageMetadata,
	validateMetadata,
	validateCanonical,
	TEST_URLS,
	loadSnapshot,
	saveSnapshot,
	KNOWN_ISSUES,
};
export type { PageMetadata, Snapshot };
