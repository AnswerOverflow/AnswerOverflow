"use client";

import { Button } from "./button";
import { useDevAuth, PROD_AUTH_URL } from "./convex-client-provider";

export function DevLoginButton({
	className,
	variant = "outline",
}: {
	className?: string;
	variant?: "outline" | "default" | "secondary" | "ghost" | "link";
}) {
	const { isDevMode, devSession, clearSession } = useDevAuth();

	if (!isDevMode) return null;

	if (devSession) {
		return (
			<Button variant={variant} className={className} onClick={clearSession}>
				Clear Dev Auth
			</Button>
		);
	}

	const handleDevLogin = () => {
		const currentUrl = window.location.href;
		window.location.href = `${PROD_AUTH_URL}/dev-auth?redirect=${encodeURIComponent(currentUrl)}`;
	};

	return (
		<Button variant={variant} className={className} onClick={handleDevLogin}>
			Dev Login (Production)
		</Button>
	);
}

export function DevAuthStatus({ className }: { className?: string }) {
	const { isDevMode, devSession, clearSession } = useDevAuth();

	if (!isDevMode) return null;

	if (devSession) {
		return (
			<div className={className}>
				<span className="text-xs text-muted-foreground">
					Using production auth
				</span>
				<Button variant="ghost" size="sm" onClick={clearSession}>
					Clear
				</Button>
			</div>
		);
	}

	return null;
}
