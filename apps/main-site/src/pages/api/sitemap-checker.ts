import { NextApiRequest, NextApiResponse } from 'next';
import { parseStringPromise } from 'xml2js';
type SitemapDataProps = {
	sitemapindex: {
		$: {
			xmlns: string;
		};
		sitemap: {
			loc: string[];
		}[];
	};
};
type UrlObjProps = {
	loc: string[];
	changefreq: string[];
	priority: string[] | number[];
};
type XmlDocProps = {
	urlset: {
		url: UrlObjProps[];
	};
};
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
	const data: SitemapDataProps = (await parseStringPromise(
		sitemapText,
	)) as SitemapDataProps;
	// Fetching and parsing each sitemap then retrieving all urls from each sitemap
	let sitemapCount = 0;
	let urlCount = 0;
	const startTime2 = new Date();
	console.log('Fetching and parsing each sitemap...');
	const promises = data.sitemapindex.sitemap.map(async (sitemap) => {
		try {
			const url = sitemap.loc[0];
			if (url) {
				const parsedUrl = new URL(url);
				const resp = await fetch(parsedUrl);
				const textData = await resp.text();
				const xmlDoc: XmlDocProps = (await parseStringPromise(
					textData,
				)) as XmlDocProps;

				await Promise.all(
					xmlDoc.urlset.url.map((urlobj: UrlObjProps) => {
						if (urlobj.loc[0]) {
							urlCount++;
						}
					}),
				);

				sitemapCount++;
			}
		} catch (error) {
			console.error('Error processing sitemap or parsing Url:', error);
			// Handle the error here as needed
		}
	});

	await Promise.all(promises);

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
