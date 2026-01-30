"use client";

import { CompactStickyFooter } from "@packages/ui/components/footer";
import { MainSiteNavbar as MainSiteNavbarBase } from "@packages/ui/components/navbar";
import { usePathname } from "next/navigation";

export function MainSiteNavbar({
	githubStars,
}: {
	githubStars?: number | null;
}) {
	const pathname = usePathname();
	const isDashboard = pathname?.startsWith("/dashboard");

	if (isDashboard) {
		return null;
	}

	return <MainSiteNavbarBase githubStars={githubStars} />;
}

export function MainSiteFooter() {
	const pathname = usePathname();
	const isChat = pathname?.startsWith("/chat");
	const isDashboard = pathname?.startsWith("/dashboard");

	if (isDashboard || isChat) {
		return null;
	}

	return <CompactStickyFooter />;
}
