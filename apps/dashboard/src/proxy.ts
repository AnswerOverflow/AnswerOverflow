import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

const isProtectedRoute = (pathname: string) => {
	return pathname.startsWith("/dashboard");
};

export default function proxy(request: NextRequest, event: NextFetchEvent) {
	const { pathname } = request.nextUrl;

	if (isProtectedRoute(pathname)) {
		// Check for BetterAuth session cookie
		const sessionCookie = request.cookies.get("better-auth.session_token");
		if (!sessionCookie) {
			// Redirect to sign in if not authenticated
			const signInUrl = new URL("/api/auth/sign-in", request.url);
			signInUrl.searchParams.set("redirect", pathname);
			return NextResponse.redirect(signInUrl);
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
