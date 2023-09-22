/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NextApiRequest, NextApiResponse } from 'next';
import { parseStringPromise } from 'xml2js';
export default function handler(req: NextApiRequest, res: NextApiResponse) {
	void fetchSitemap();
}

async function fetchSitemap() {
	// fetching answeroverflow sitemap
	const startTime = new Date();
	const sitemapResponse = await fetch('https://Answeroverflow.com/sitemap.xml');
	const endTime = new Date();
	console.log(
		`Time taken to fetch https://Answeroverflow.com/sitemap.xml: ${
			endTime.getTime() - startTime.getTime()
		}ms`,
	);

	// parsing answeroverflow sitemap's xml to js
	const sitemapText = await sitemapResponse.text();
	const data = await parseStringPromise(sitemapText);

	// Fetching and parsing each sitemap then retrieving all urls from each sitemap
	let sitemapCount = 0;
	let urlCount = 0;
	const startTime2 = new Date();
	console.log('Fetching and parsing each sitemap...');
	for (const sitemap of data.sitemapindex.sitemap) {
		const resp = await fetch(sitemap.loc[0]);
		const textData = await resp.text();
		const xmlDoc = await parseStringPromise(textData);
		for (const urlobj of xmlDoc.urlset.url) {
			// console.log(urlobj.loc[0]);  this is gives the url we want
			urlCount++;
		}
		sitemapCount++;
	}
	const endTime2 = new Date();
	console.log(`Total number of sitemap fetched ${sitemapCount}`);
	console.log(
		`Total number of urls fetched from each sitemap combined ${urlCount}`,
	);
	console.log(
		`Total time taken to fetch all sitemaps: ${
			endTime2.getTime() - startTime2.getTime()
		}ms`,
	);
}
