"use client";

import { Button } from "./button";
import { useDevAuth } from "./convex-client-provider";

const PROD_URL =
	process.env.NEXT_PUBLIC_PROD_SITE_URL || "https://answeroverflow.com";

export function DevLoginButton({
	className,
	variant = "outline",
}: {
	className?: string;
	variant?: "outline" | "default" | "secondary" | "ghost" | "link";
}) {
	const { isDevMode, devToken, clearToken } = useDevAuth();

	if (!isDevMode) return null;

	if (devToken) {
		return (
			<Button variant={variant} className={className} onClick={clearToken}>
				Clear Dev Auth
			</Button>
		);
	}

	const handleDevLogin = () => {
		const currentUrl = window.location.href;
		window.location.href = `${PROD_URL}/dev-auth?redirect=${encodeURIComponent(currentUrl)}`;
	};

	return (
		<Button variant={variant} className={className} onClick={handleDevLogin}>
			Dev Login (Production)
		</Button>
	);
}

export function DevAuthStatus({ className }: { className?: string }) {
	const { isDevMode, devToken, clearToken } = useDevAuth();

	if (!isDevMode) return null;

	if (devToken) {
		return (
			<div className={className}>
				<span className="text-xs text-muted-foreground">
					Using production auth
				</span>
				<Button variant="ghost" size="sm" onClick={clearToken}>
					Clear
				</Button>
			</div>
		);
	}

	return null;
}
