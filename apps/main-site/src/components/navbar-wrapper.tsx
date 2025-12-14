"use client";

import { MainSiteFooter } from "@packages/ui/components/footer";
import { MainSiteNavbar } from "@packages/ui/components/navbar";
import { usePathname } from "next/navigation";

export function NavbarWrapper({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const isDashboard = pathname?.startsWith("/dashboard");

	if (isDashboard) {
		return <>{children}</>;
	}

	return (
		<>
			<MainSiteNavbar />
			<div className="pt-navbar">{children}</div>
			<MainSiteFooter />
		</>
	);
}
