/* eslint-disable @typescript-eslint/no-unused-vars */
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { NextURL } from 'next/dist/server/web/next-url';
import { getNextAuthCookieName } from '@answeroverflow/auth/src/tenant-cookie';
import { makeMainSiteLink } from '@answeroverflow/constants';

const mainSiteHostName =
	process.env.NODE_ENV === 'production'
		? 'www.answeroverflow.com'
		: 'localhost:3000';

const redirectCode = process.env.NODE_ENV === 'production' ? 308 : 302;

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
		const authedRoutes = new Set(['/dashboard']);
		if (authedRoutes.has(path)) {
			const authToken = req.cookies.get(getNextAuthCookieName());
			if (!authToken) {
				return NextResponse.redirect(makeMainSiteLink('/api/auth/signin'));
			}
		}
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
		'/robots.txt',
	],
};
