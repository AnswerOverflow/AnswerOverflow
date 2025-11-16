import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

const isProtectedRoute = (pathname: string) => {
	return pathname.startsWith("/dashboard") || pathname.startsWith("/notes");
};

export default function proxy(request: NextRequest, _event: NextFetchEvent) {
	const { pathname } = request.nextUrl;

	if (isProtectedRoute(pathname)) {
		const sessionCookie = request.cookies.get("better-auth.session_token");
		if (!sessionCookie) {
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
