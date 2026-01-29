"use client";

import { CompactStickyFooter } from "@packages/ui/components/footer";
import { MainSiteNavbar } from "@packages/ui/components/navbar";
import { ScrollContainerProvider } from "@packages/ui/hooks/use-scroll-container";
import { usePathname } from "next/navigation";

function NavbarContent({
	children,
	githubStars,
}: {
	children: React.ReactNode;
	githubStars?: number | null;
}) {
	const pathname = usePathname();
	const isChat = pathname?.startsWith("/chat");

	return (
		<>
			<MainSiteNavbar githubStars={githubStars} />
			<div className="pt-navbar">{children}</div>
			{!isChat && <CompactStickyFooter />}
		</>
	);
}

export function NavbarWrapper({
	children,
	githubStars,
}: {
	children: React.ReactNode;
	githubStars?: number | null;
}) {
	const pathname = usePathname();
	const isDashboard = pathname?.startsWith("/dashboard");

	if (isDashboard) {
		return <>{children}</>;
	}

	return (
		<ScrollContainerProvider>
			<NavbarContent githubStars={githubStars}>{children}</NavbarContent>
		</ScrollContainerProvider>
	);
}
