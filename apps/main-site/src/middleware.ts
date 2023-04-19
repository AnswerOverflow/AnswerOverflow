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
	hostname: string;
	path: string;
	params: string;
	isMainSiteHostname: boolean;
};

function rewriteToMainSite(input: PathHandler) {
	const { req } = input;
	return NextResponse.rewrite(
		new URL(`${req.nextUrl.pathname}${req.nextUrl.search}`, mainSiteBase),
	);
}

function dataUnlockerRouteHandler(input: PathHandler) {
	const { req } = input;
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

function messageRouteHandler(input: PathHandler) {
	const { req, params, isMainSiteHostname } = input;
	if (isMainSiteHostname) {
		// TODO: Get the server id from the database
		return NextResponse.redirect(
			new URL(`${req.nextUrl.pathname}${params}`, `http://localhost:3001/`),
			{
				status: 308,
			},
		);
	} else {
		return rewriteToMainSite(input);
	}
}

function communityPageRouteHandler(input: PathHandler) {
	const { req, params, isMainSiteHostname } = input;
	if (isMainSiteHostname) {
		// TODO: Get the server id from the database
		return NextResponse.redirect(
			new URL(`${req.nextUrl.pathname}${params}`, `http://localhost:3001/`),
			{
				status: 308,
			},
		);
	} else {
		// Redirect back to homepage, tenant sites only have one community
		return NextResponse.redirect(new URL(`/`, mainSiteBase), {
			status: 308,
		});
	}
}

function homePageRouteHandler(input: PathHandler) {
	const { isMainSiteHostname } = input;
	if (!isMainSiteHostname) {
		return NextResponse.rewrite(
			new URL(`/c/1037547185492996207`, mainSiteBase),
		);
	} else {
		return NextResponse.next();
	}
}

export function middleware(req: NextRequest) {
	const url = req.nextUrl;
	const hostname = req.headers.get('host') || mainSiteHostName; // fallback to www.answeroverflow.com
	const path = url.pathname;
	const params = req.nextUrl.search;
	const isMainSiteHostname = hostname === mainSiteHostName;
	const input: PathHandler = {
		url,
		req,
		hostname,
		path,
		params,
		isMainSiteHostname,
	};
	if (path.startsWith('/oemf7z50uh7w/')) {
		return dataUnlockerRouteHandler(input);
	} else if (path.startsWith('/m/')) {
		return messageRouteHandler(input);
	} else if (path.startsWith('/c/')) {
		return communityPageRouteHandler(input);
	} else if (path === '/') {
		return homePageRouteHandler(input);
	} else if (!isMainSiteHostname) {
		return rewriteToMainSite(input);
	} else {
		return NextResponse.next();
	}
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
		'/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)',
	],
};
