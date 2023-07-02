/* eslint-disable @typescript-eslint/no-unused-vars */
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { NextURL } from 'next/dist/server/web/next-url';

const mainSiteHostName =
	process.env.NODE_ENV === 'production'
		? 'www.answeroverflow.com'
		: 'localhost:3000';

const mainSiteBase =
	process.env.NODE_ENV === 'production'
		? `https://${mainSiteHostName}`
		: `http://${mainSiteHostName}`;

const redirectCode = process.env.NODE_ENV === 'production' ? 308 : 302;

/*
  Middleware Notes:
  1. Data Unlocker
  Rewrite requests to the data unlocker domain to capture analytics, doesn't matter what the hostname is
  TODO: Duplication of work in redirection, flow is: main site -> redirect to tenant site -> rewrite to main site. could optimize?
  2. Tenant Routes, (/c/, /m/, /)
   a. /m/
      - If the hostname is the main site, redirect to the tenant site
    b. /c/
      - If the hostname is the main site, redirect to the tenant site homepage
    c. /
      - If the hostname is the main site, keep the path the same
      - If the hostname is the tenant site, rewrite to the tenant site community page
*/

type PathHandler = {
	url: NextURL;
	req: NextRequest;
	origin: string;
	path: string;
	params: string;
	isRequestFromMainSite: boolean;
};

export function rewriteToMainSite(input: PathHandler) {
	const { req } = input;
	return NextResponse.rewrite(
		new URL(`${req.nextUrl.pathname}${req.nextUrl.search}`, mainSiteBase),
	);
}

function dataUnlockerRouteHandler(req: NextRequest) {
	const rewrite = NextResponse.rewrite(
		new URL(
			`${req.nextUrl.pathname}${req.nextUrl.search}`,
			`https://oemf7z50uh7w.ddns.dataunlocker.com/`,
		),
	);
	rewrite.headers.set('host', mainSiteHostName);
	rewrite.headers.set('x-forwarded-for', req.ip!);
	return rewrite;
}

export function middleware(req: NextRequest) {
	const url = req.nextUrl;
	const path = url.pathname;
	if (path.startsWith('/oemf7z50uh7w/')) {
		return dataUnlockerRouteHandler(req);
	}
	const host = req.headers.get('host')!;
	if (host === mainSiteHostName) {
		return NextResponse.next();
	}
	// rewrite everything else to `/[domain]/[path] dynamic route
	const newUrl = new URL(`/${host}${path}`, req.url);
	return NextResponse.rewrite(newUrl);
}
// See "Matching Paths" below to learn more
export const config = {
	matcher: [
		// Data Unlocker
		'/oemf7z50uh7w/:path*',
		/*
		 * Match all paths except for:
		 * 1. /api routes
		 * 2. /_next (Next.js internals)
		 * 3. /examples (inside /public)
		 * 4. all root files inside /public (e.g. /favicon.ico)
		 */
		'/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)',
		'/sitemap.xml',
	],
};
