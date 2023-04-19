// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(req: NextRequest) {
	const url = req.nextUrl;
	const hostname = req.headers.get('host') || 'www.answeroverflow.com'; // fallback to www.answeroverflow.com
	const path = url.pathname;
	if (path.startsWith('/oemf7z50uh7w/')) {
		const rewrite = NextResponse.rewrite(
			new URL(
				`${req.nextUrl.pathname}${req.nextUrl.search}`,
				`https://oemf7z50uh7w.ddns.dataunlocker.com/`,
			),
		);
		rewrite.headers.set('host', 'www.answeroverflow.com');
		rewrite.headers.set('x-forwarded-for', req.ip!);
		return rewrite;
	}
	const isMainSite = hostname === 'www.answeroverflow.com';
	if (isMainSite) {
		return NextResponse.next();
	}

	// Redirect the homepage to their community page
	const isHomepage = path === '/';
	if (isHomepage) {
		return NextResponse.rewrite(
			new URL(`/c/1081235771270369380`, `https://www.answeroverflow.com/`),
		);
	}
}
// See "Matching Paths" below to learn more
export const config = {
	matcher: ['/oemf7z50uh7w/:path*', '/m/:path*', '/c/:path*', '/'],
};
