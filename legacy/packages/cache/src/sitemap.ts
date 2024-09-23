import { findQuestionsForSitemap } from '@answeroverflow/db';
import { getRedisClient } from './client';
import {
	JSONParse,
	JSONStringify,
} from '@answeroverflow/db/src/utils/json-big';
// this whole thing is ugly. i'll fix it eventually
export async function findQuestionsForSitemapCached(
	serverId: string,
): ReturnType<typeof findQuestionsForSitemap> {
	const client = await getRedisClient();
	const cachedQuestions = await client.get(`questions:${serverId}`);
	if (cachedQuestions) {
		return JSONParse(cachedQuestions) as ReturnType<
			typeof findQuestionsForSitemap
		>;
	}
	return null;
}

export async function cacheQuestionsForSitemap(serverId: string) {
	const questions = await findQuestionsForSitemap(serverId);
	const client = await getRedisClient();
	if (!questions) return null;
	await client.set(`questions:${serverId}`, JSONStringify(questions));
	return questions;
}
