"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "./convex-client-provider";

function DevAuthHandlerInner() {
	const searchParams = useSearchParams();

	useEffect(() => {
		const handleAuthCookie = () => {
			const authCookie = searchParams.get("auth-cookie");
			if (!authCookie) return;

			try {
				const decodedCookie = decodeURIComponent(authCookie);
				localStorage.setItem("better-auth_cookie", decodedCookie);

				authClient.updateSession();

				const url = new URL(window.location.href);
				url.searchParams.delete("auth-cookie");
				window.history.replaceState({}, "", url.toString());
			} catch (err) {
				console.error("Failed to set auth cookie:", err);
			}
		};

		handleAuthCookie();
	}, [searchParams]);

	return null;
}

export function DevAuthHandler() {
	return (
		<Suspense fallback={null}>
			<DevAuthHandlerInner />
		</Suspense>
	);
}
