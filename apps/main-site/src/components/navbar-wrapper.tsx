"use client";

import {
	CompactStickyFooter,
	MainSiteFooter,
} from "@packages/ui/components/footer";
import { MainSiteNavbar } from "@packages/ui/components/navbar";
import {
	ScrollContainerProvider,
	useIsNavbarHidden,
} from "@packages/ui/hooks/use-scroll-container";
import { cn } from "@packages/ui/lib/utils";
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
	const isNavbarHidden = useIsNavbarHidden();

	return (
		<>
			<MainSiteNavbar githubStars={githubStars} />
			<div
				className={cn(
					"transition-[padding-top] duration-300",
					isNavbarHidden ? "pt-0" : "pt-navbar",
				)}
			>
				{children}
			</div>
			{!isChat && (
				<>
					<div className="sm:hidden">
						<MainSiteFooter />
					</div>
					<CompactStickyFooter />
				</>
			)}
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
