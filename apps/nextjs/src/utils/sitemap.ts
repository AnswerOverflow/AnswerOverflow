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
	constructor(private baseUrl: string, private sitemap: SitemapEntry[] = []) {}

	add(entry: SitemapEntry) {
		this.sitemap.push(entry);
	}

	toXml() {
		const clamp = (num: number, min: number, max: number) =>
			Math.min(Math.max(num, min), max);
		const urls = this.sitemap.map(
			(entry) => `
    <url>
      <loc>${
				entry.loc.startsWith('http') ? entry.loc : this.baseUrl + entry.loc
			}</loc>
      ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}
      ${entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : ''}
      ${
				entry.priority
					? `<priority>${clamp(entry.priority, 0, 1)}</priority>`
					: ''
			}
    </url>
  `,
		);

		return (
			`<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
			urls.join('') +
			`
      </urlset>`
		);
	}

	applyToRes(res: ServerResponse<IncomingMessage>) {
		res.setHeader('Content-Type', 'text/xml');
		// we send the XML to the browser
		res.write(this.toXml());
		res.end();
	}
}
