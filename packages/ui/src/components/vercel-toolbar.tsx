"use client";

import { VercelToolbar as VT } from "@vercel/toolbar/next";
import { useSession } from "./convex-client-provider";

export function VercelToolbar() {
	const { data: session } = useSession();
	const isDev = process.env.NODE_ENV === "development";
	const isAdmin = session?.user?.role === "admin";
	const shouldShowToolbar = isDev || isAdmin;

	if (!shouldShowToolbar) {
		return null;
	}

	return <VT />;
}
