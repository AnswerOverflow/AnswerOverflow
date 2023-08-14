import type { IncomingMessage, ServerResponse } from 'http';

export type SitemapEntry = {
	loc: string;
	lastmod?: string;
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

		const clamp = (num: number, min: number, max: number) =>
			Math.min(Math.max(num, min), max);
		const urls = this.entries.map(
			(entry) => `
    ${this.type === 'sitemap' ? '<sitemap>' : '<url>'}
      <loc>${
				entry.loc.startsWith('http') ? entry.loc : this.baseUrl + entry.loc
			}</loc>
      ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}
      ${
				entry.changefreq && this.type === 'url'
					? `<changefreq>${entry.changefreq}</changefreq>`
					: ''
			}
      ${
				entry.priority && this.type === 'url'
					? `<priority>${clamp(entry.priority, 0, 1)}</priority>`
					: ''
			}
    ${this.type === 'sitemap' ? '</sitemap>' : '</url>'}
  `,
		);

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
