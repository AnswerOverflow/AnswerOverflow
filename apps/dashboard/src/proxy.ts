import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

const isProtectedRoute = (pathname: string) => {
	return pathname.startsWith("/dashboard");
};

export default function proxy(request: NextRequest, event: NextFetchEvent) {
	const { pathname } = request.nextUrl;

	if (isProtectedRoute(pathname)) {
		// Allow the request through - client will handle auth state
		return NextResponse.next();
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
