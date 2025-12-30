import { Database } from "@packages/database/database";
import { Storage } from "@packages/database/storage";
import { Sitemap } from "@packages/ui/utils/sitemap";
import {
	Array as Arr,
	BigInt as BigIntEffect,
	Clock,
	Duration,
	Effect,
	Layer,
	Option,
	Order,
	Schedule,
} from "effect";
import { Discord } from "../core/discord-service";
import {
	catchAllCauseWithReport,
	catchAllWithReport,
} from "../utils/error-reporting";

const SITEMAP_CONFIG = {
	cronExpression: "0 4 * * *",
	cronTimezone: "America/Los_Angeles",
	threadsPerChunk: 10000,
	serverProcessDelay: Duration.seconds(1),
} as const;

const collectServerThreads = Effect.fn("sitemap.collect_server_threads")(
	function* (serverId: bigint) {
		const database = yield* Database;

		yield* Effect.annotateCurrentSpan({
			"server.id": serverId.toString(),
		});

		return yield* database.private.sitemap.collectThreadsForServer({
			serverId,
		});
	},
);

function generateSitemapXml(
	threads: Array<{ id: bigint; lastmod: number }>,
	baseUrl: string,
) {
	const sitemap = new Sitemap(baseUrl, "url");
	sitemap.addMany(
		Arr.map(threads, (thread) => ({
			loc: `/m/${thread.id}`,
			lastmod: new Date(thread.lastmod),
			priority: 0.9,
		})),
	);
	return sitemap.toXml();
}

const processServer = Effect.fn("sitemap.process_server")(function* (
	server: { discordId: bigint },
	includeInGlobal: boolean,
) {
	const storage = yield* Storage;

	yield* Effect.annotateCurrentSpan({
		"server.id": server.discordId.toString(),
		include_in_global: includeInGlobal.toString(),
	});

	const threads = yield* collectServerThreads(server.discordId).pipe(
		catchAllWithReport(() =>
			Effect.logError(
				`Failed to collect threads for server ${server.discordId}`,
			).pipe(Effect.as([])),
		),
	);

	if (threads.length > 0) {
		const xml = generateSitemapXml(threads, "https://www.answeroverflow.com");
		yield* storage.uploadSitemap({
			filename: `servers-v2/${server.discordId}.xml`,
			content: xml,
		});
		yield* Effect.logInfo(
			`Uploaded sitemap for server ${server.discordId} with ${threads.length} threads`,
		);
	}

	yield* Effect.sleep(SITEMAP_CONFIG.serverProcessDelay);

	return includeInGlobal ? threads : [];
});

const generateGlobalSitemaps = Effect.fn("sitemap.generate_global")(function* (
	allThreads: Array<{ id: bigint; lastmod: number }>,
) {
	const storage = yield* Storage;

	yield* Effect.logInfo(
		`Generating global sitemaps for ${allThreads.length} threads`,
	);

	const sortedThreads = Arr.sort(
		allThreads,
		Order.reverse(
			Order.mapInput(
				BigIntEffect.Order,
				(t: { id: bigint; lastmod: number }) => t.id,
			),
		),
	);

	const chunks = Arr.chunksOf(sortedThreads, SITEMAP_CONFIG.threadsPerChunk);

	yield* Effect.forEach(
		Arr.map(chunks, (chunk, i) => ({ chunk, index: i })),
		({ chunk, index }) =>
			Effect.gen(function* () {
				const xml = generateSitemapXml(chunk, "https://www.answeroverflow.com");
				yield* storage.uploadSitemap({
					filename: `sitemap-${index}.xml`,
					content: xml,
				});
				yield* Effect.logDebug(
					`Uploaded sitemap-${index}.xml with ${chunk.length} entries`,
				);
			}),
		{ concurrency: 1 },
	);

	const sitemapIndex = new Sitemap("https://www.answeroverflow.com", "sitemap");
	for (let i = 0; i < chunks.length; i++) {
		sitemapIndex.add({ loc: `/sitemap${i}.xml` });
	}
	yield* storage.uploadSitemap({
		filename: "sitemap.xml",
		content: sitemapIndex.toXml(),
	});

	yield* Effect.logInfo(`Uploaded sitemap index with ${chunks.length} chunks`);
});

type ServerForSitemap = {
	_id: string;
	discordId: bigint;
	hasCustomDomain: boolean;
	hasSubpath: boolean;
	isKicked: boolean;
};

const runSitemapGenerationCore = Effect.fn("sitemap.run_core")(function* () {
	const database = yield* Database;
	const startTime = yield* Clock.currentTimeMillis;

	const servers: Array<ServerForSitemap> =
		yield* database.private.sitemap.getServersForSitemap({});

	const regularServers = Arr.filter(
		servers,
		(s) => !s.hasCustomDomain && !s.hasSubpath && !s.isKicked,
	);
	const customDomainServers = Arr.filter(
		servers,
		(s) => (s.hasCustomDomain || s.hasSubpath) && !s.isKicked,
	);

	yield* Effect.logInfo(
		`Found ${regularServers.length} regular servers, ${customDomainServers.length} with custom domains`,
	);

	const regularThreads = yield* Effect.forEach(
		regularServers,
		(server) => processServer(server, true),
		{ concurrency: 1 },
	).pipe(Effect.map(Arr.flatten));

	yield* Effect.forEach(
		customDomainServers,
		(server) => processServer(server, false),
		{ concurrency: 1 },
	);

	yield* generateGlobalSitemaps(regularThreads);

	const endTime = yield* Clock.currentTimeMillis;
	const durationSecs = Math.round((endTime - startTime) / 1000);
	yield* Effect.logInfo(
		`Sitemap generation complete in ${durationSecs}s (${regularThreads.length} threads)`,
	);
});

export const sitemapLock = Effect.unsafeMakeSemaphore(1);

const runSitemapGeneration = Effect.fn("sitemap.run")(function* () {
	const acquired = yield* sitemapLock.withPermitsIfAvailable(1)(
		Effect.as(runSitemapGenerationCore(), true),
	);
	if (Option.isNone(acquired)) {
		yield* Effect.logInfo(
			"Skipping sitemap generation - previous run in progress",
		);
	}
});

const startSitemapLoop = Effect.fn("sitemap.start_loop")(function* () {
	yield* Effect.logInfo(
		`Sitemap scheduled: ${SITEMAP_CONFIG.cronExpression} (${SITEMAP_CONFIG.cronTimezone})`,
	);

	const schedule = Schedule.cron(
		SITEMAP_CONFIG.cronExpression,
		SITEMAP_CONFIG.cronTimezone,
	);

	yield* Effect.forkDaemon(
		Effect.schedule(runSitemapGeneration(), schedule).pipe(
			catchAllCauseWithReport(() =>
				Effect.logError("Error in sitemap generation"),
			),
		),
	);
});

export const SitemapHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("clientReady", () =>
			startSitemapLoop().pipe(
				catchAllCauseWithReport(() =>
					Effect.logError("Error starting sitemap loop"),
				),
			),
		);

		yield* Effect.addFinalizer(() =>
			Effect.gen(function* () {
				yield* Effect.logInfo("Shutdown - waiting for sitemap generation...");
				yield* sitemapLock.withPermits(1)(
					Effect.logInfo("Sitemap lock released"),
				);
			}),
		);
	}),
);

export { runSitemapGenerationCore };
