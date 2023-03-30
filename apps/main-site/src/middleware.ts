// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
	const rewrite = NextResponse.rewrite(
		new URL(
			`${request.nextUrl.pathname}${request.nextUrl.search}`,
			`https://oemf7z50uh7w.ddns.dataunlocker.com/`,
		),
	);
	rewrite.headers.set('host', 'www.answeroverflow.com');
	rewrite.headers.set('x-forwarded-for', request.ip!);
	return rewrite;
}
// See "Matching Paths" below to learn more
export const config = {
	matcher: '/oemf7z50uh7w/:path*',
};
