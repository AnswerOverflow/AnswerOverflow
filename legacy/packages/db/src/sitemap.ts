import { eq } from 'drizzle-orm';
import { chunk } from 'lodash';
import { findManyChannelsById } from './channel';
import { dbReplica } from './db';
import { findManyMessagesWithAuthors } from './message';
import { Channel, dbChannels } from './schema';
import { ChannelType } from 'discord-api-types/v10';
import { Sitemap } from '@answeroverflow/utils/src/sitemap';
import { uploadFile } from './files';
import { findManyServersById } from './server';
export async function listPublicThreads(opts: {
	offset: number;
	limit?: number;
}) {
	const { limit = 50000 } = opts;

	let start = Date.now();
	const threads = await dbReplica.query.dbChannels.findMany({
		where: eq(dbChannels.type, ChannelType.PublicThread),
		offset: limit * opts.offset,
		limit: limit,
	});
	let end = Date.now();
	console.log(`findAllThreadsForSitemap took ${end - start}ms`);

	const parents = await findManyChannelsById(
		threads.filter((t) => t.parentId !== null).map((t) => t.parentId!),
	);
	const parentLookup = new Map(parents.map((p) => [p.id, p]));
	const filterThreads = threads.filter(
		(t) => parentLookup.get(t.parentId ?? '')?.flags.indexingEnabled,
	);

	const questionIds = filterThreads.map((c) => c.id);

	start = Date.now();
	const questions =
		questionIds.length > 0
			? await findManyMessagesWithAuthors(questionIds, {
					excludePrivateMessages: true,
				})
			: [];
	const questionLookup = new Map(questions.map((q) => [q.id, q]));

	const servers = await findManyServersById(
		filterThreads.map((c) => c.serverId),
	);
	const serverLookup = new Map(servers.map((s) => [s.id, s]));
	end = Date.now();
	console.log(`findAllThreadsForSitemap messages took ${end - start}ms`);

	return {
		threads: filterThreads.filter(
			(t) =>
				questionLookup.has(t.id) &&
				!serverLookup.get(t.serverId)?.customDomain &&
				!serverLookup.get(t.serverId)?.kickedTime,
		),
		hasMore: threads.length === limit,
	};
}

// todo: deduplicate
type Snowflake = string;

const EPOCH = BigInt(1420070400000);
function getTimestamp(snowflake: Snowflake) {
	return Number((BigInt(snowflake) >> BigInt(22)) + EPOCH);
}
function getDate(snowflake: Snowflake) {
	return new Date(getTimestamp(snowflake));
}
export async function generateSitemap() {
	let hasMore;
	let offset = 0;
	const safetyLimit = 200;
	const limit = 10000;
	const allThreads: Channel[] = [];
	do {
		// eslint-disable-next-line no-await-in-loop
		const { threads, hasMore: hm } = await listPublicThreads({
			offset,
			limit,
		});
		allThreads.push(...threads);
		hasMore = hm;
		offset++;
		console.log(`Gathered ${allThreads.length} threads`);
	} while (hasMore && offset < safetyLimit);
	console.log(`Finished collecting ${allThreads.length} threads`);

	// Go from newest to oldest
	const chunks = chunk(allThreads, limit).reverse();
	if (chunks.length == 0 || allThreads.length == 0) {
		return;
	}
	let i = 0;
	for await (const chunk of chunks) {
		const sitemap = new Sitemap('https://www.answeroverflow.com', 'url');
		sitemap.addMany(
			chunk.map((thread) => ({
				loc: `/m/${thread.id}`,
				// We really don't expect archived threads to be updated
				priority: 0.9,
				lastmod: thread.archivedTimestamp
					? new Date(Number(thread.archivedTimestamp))
					: getDate(thread.id),
			})),
		);
		await uploadFile({
			contentType: 'text/xml',
			filename: `sitemaps/sitemap-${i}.xml`,
			stream: sitemap.toXml(),
		});
		console.log(
			`Uploaded sitemaps/sitemap-${i}.xml with ${chunk.length} entries`,
		);
		i++;
	}
	const sitemapIndex = new Sitemap('https://www.answeroverflow.com', 'sitemap');
	for (let j = 0; j < i; j++) {
		sitemapIndex.add({
			loc: `/sitemap${j}.xml`,
		});
	}
	await uploadFile({
		contentType: 'text/xml',
		filename: 'sitemaps/sitemap.xml',
		stream: sitemapIndex.toXml(),
	});
	console.log(`Finished uploading ${i} sitemaps`);
}
