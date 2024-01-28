// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getMainSiteHostname } from '@answeroverflow/constants/src/links';

function dataUnlockerRouteHandler(req: NextRequest) {
	const rewrite = NextResponse.rewrite(
		new URL(
			`${req.nextUrl.pathname}${req.nextUrl.search}`,
			`https://oemf7z50uh7w.ddns.dataunlocker.com/`,
		),
	);
	rewrite.headers.set('host', getMainSiteHostname());
	rewrite.headers.set('x-forwarded-for', req.ip!);
	return rewrite;
}

export function middleware(req: NextRequest) {
	const url = req.nextUrl;
	const path = url.pathname + url.search;

	if (path.startsWith('/oemf7z50uh7w/')) {
		return dataUnlockerRouteHandler(req);
	}
	return NextResponse.next();
}
// See "Matching Paths" below to learn more
export const config = {
	matcher: [
		// Data Unlocker
		'/oemf7z50uh7w/:path*',
	],
};
