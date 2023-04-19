// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const mainSiteHostName =
	process.env.NODE_ENV === 'production'
		? 'www.answeroverflow.com'
		: 'localhost:3000';

const mainSiteBase =
	process.env.NODE_ENV === 'production'
		? `https://${mainSiteHostName}`
		: `http://${mainSiteHostName}`;

// This function can be marked `async` if using `await` inside
export function middleware(req: NextRequest) {
	const url = req.nextUrl;
	const hostname = req.headers.get('host') || mainSiteHostName; // fallback to www.answeroverflow.com
	const path = url.pathname;
	const params = req.nextUrl.search;

	// Data Unlocker
	if (path.startsWith('/oemf7z50uh7w/')) {
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
	return NextResponse.next();

	// const isMessageRoute = path.startsWith('/m/');
	// if (isMessageRoute && hostname === mainSiteHostName) {
	// 	return NextResponse.redirect(
	// 		new URL(`${req.nextUrl.pathname}${params}`, `http://localhost:3001/`),
	// 	);
	// }

	// // Don't do anything if the hostname is the main site
	// const isMainSiteHostname = hostname === mainSiteHostName;
	// if (isMainSiteHostname) {
	// 	// TODO: Can we just return NextResponse.next() here?
	// 	return NextResponse.next();
	// }

	// // TODO: Look up what server this is for

	// // Redirect the homepage to their community page
	// const isHomepage = path === '/';
	// if (isHomepage) {
	// 	return NextResponse.rewrite(
	// 		new URL(`/c/1037547185492996207`, mainSiteBase),
	// 	);
	// }
	// url.hostname = mainSiteHostName;
	// return NextResponse.rewrite(url);
}
// See "Matching Paths" below to learn more
export const config = {
	matcher: [
		'/oemf7z50uh7w/:path*',
		/*
		 * Match all paths except for:
		 * 1. /api routes
		 * 2. /_next (Next.js internals)
		 * 3. /examples (inside /public)
		 * 4. all root files inside /public (e.g. /favicon.ico)
		 */
		'/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)',
	],
};
