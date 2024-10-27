import {
	isOnMainSite,
	makeMainSiteLink,
} from '@answeroverflow/constants/links';
import { AuthEdge } from '@answeroverflow/core/auth-edge';
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
	const url = req.nextUrl;
	const path = url.pathname + url.search;

	const host = req.headers.get('host')!;
	if (path.startsWith('/og') || path.startsWith('/ingest')) {
		return NextResponse.next();
	}

	if (isOnMainSite(host) || path.includes('/discord')) {
		const authedRoutes = ['/dashboard'];
		const authToken = req.cookies.get(AuthEdge.getNextAuthCookieName());
		if (authedRoutes.some((route) => path.startsWith(route))) {
			if (!authToken) {
				return NextResponse.redirect(makeMainSiteLink('/api/auth/signin'));
			}
		}
		if (path.startsWith('/m/')) {
			if (authToken) {
				return NextResponse.rewrite(makeMainSiteLink(`${path}/dynamic`));
			}
		}
		return NextResponse.next();
	}
	// rewrite everything else to `/[domain]/[path] dynamic route
	const tenantAuthToken = req.cookies.get(AuthEdge.getTenantCookieName());
	let pathPostFix = '';
	if (path.startsWith('/m/')) {
		if (tenantAuthToken) {
			pathPostFix += '/dynamic';
		}
	}
	const newUrl = new URL(`/${host}${path}${pathPostFix}`, req.url);
	return NextResponse.rewrite(newUrl);
}
// See "Matching Paths" below to learn more
export const config = {
	matcher: [
		'/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)',
		'/sitemap.xml',
		'/robots.txt',
	],
};
