import {
	isOnMainSite,
	makeMainSiteLink,
} from '@answeroverflow/constants/links';
import { AuthEdge } from '@answeroverflow/core/auth-edge';
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// for supporting subpaths, they are coming in from the content domain
// if the 'X-AnswerOverflow-Skip-Subpath-Redirect' header is set, just pass on the request
// otherwise, redirect them to the rewrite domain
const subpathCustomers = [
	// {
	//   contentDomain: "migaku.com",
	//   rewriteDomain: "community.migaku.com",
	//   subpath: "community",
	// },
	{
		contentDomain: 'community.rhys.ltd',
		rewriteDomain: 'rhys.ltd',
		subpath: 'community',
	},
];

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
	const subpathCustomer = subpathCustomers.find((customer) =>
		host.includes(customer.contentDomain),
	);
	if (subpathCustomer) {
		const bypass = req.headers.get('X-AnswerOverflow-Skip-Subpath-Redirect');
		// if (!bypass) {
		// 	return NextResponse.redirect(
		// 		new URL(
		// 			`https://${subpathCustomer.rewriteDomain}/${subpathCustomer.subpath}${path}`,
		// 			req.url,
		// 		),
		// 	);
		// }
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
