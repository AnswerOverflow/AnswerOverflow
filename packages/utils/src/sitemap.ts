import type { IncomingMessage, ServerResponse } from 'http';

export type SitemapEntry = {
	loc: string;
	lastmod?: Date;
	changefreq?:
		| 'always'
		| 'hourly'
		| 'daily'
		| 'weekly'
		| 'monthly'
		| 'yearly'
		| 'never';
	priority?: number;
};

export class Sitemap {
	constructor(
		private baseUrl: string,
		private type: 'url' | 'sitemap',
		public entries: SitemapEntry[] = [],
	) {}

	add(...entries: SitemapEntry[]) {
		this.entries.push(...entries);
	}

	addMany(entries: SitemapEntry[]) {
		this.entries.push(...entries);
	}

	toXml() {
		if (this.entries.length > 50000)
			throw new Error('Sitemap cannot have more than 50,000 entries');

		const urls = this.entries.map((entry) => {
			let data = '';
			data += this.type === 'sitemap' ? '<sitemap>' : '<url>';
			data += `<loc>${
				entry.loc.startsWith('http') ? entry.loc : this.baseUrl + entry.loc
			}</loc>`;
			if (entry.lastmod)
				data += `<lastmod>${entry.lastmod.toISOString()}</lastmod>`;
			if (entry.changefreq && this.type === 'url')
				data += `<changefreq>${entry.changefreq}</changefreq>`;
			data += this.type === 'sitemap' ? '</sitemap>' : '</url>';
			return data;
		});

		if (this.type === 'url') {
			return (
				`<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
				urls.join('') +
				`
        </urlset>`
			);
		} else {
			return (
				`<?xml version="1.0" encoding="UTF-8"?>
        <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
				urls.join('') +
				`
        </sitemapindex>`
			);
		}
	}

	applyToRes(res: ServerResponse<IncomingMessage>) {
		res.setHeader('Content-Type', 'text/xml');

		// we cache the sitemap for 6 hours and revalidate it every 24 hours

		res.setHeader(
			'Cache-Control',
			'public, s-maxage=21600, stale-while-revalidate=86400',
		);
		res.write(this.toXml());
		res.end();
	}
}
