import { createNextApiHandler } from '@trpc/server/adapters/next';
import { createContext } from '@answeroverflow/api';
import { appRouter } from '@answeroverflow/api';
import type { NextApiRequest, NextApiResponse } from 'next';
import { finishAnalyticsCollection } from '@answeroverflow/analytics';

// create the API handler, but don't return it yet
const nextApiHandler = createNextApiHandler({
	router: appRouter,
	createContext,
});

// @see https://nextjs.org/docs/api-routes/introduction
export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	// pass the (modified) req/res to the handler
	const trpcOutput = await nextApiHandler(req, res);
	await finishAnalyticsCollection();
	return trpcOutput;
}
