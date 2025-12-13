"use client";

import { Footer } from "@packages/ui/components/footer";
import { useTenant } from "@packages/ui/components/tenant-context";
import { isOnMainSite } from "@packages/ui/utils/links";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { SiteNavbar } from "./site-navbar";

function useHostname() {
	return useSyncExternalStore(
		() => () => {},
		() => window.location.hostname,
		() => null,
	);
}

export function NavbarWrapper({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const tenant = useTenant();
	const hostname = useHostname();
	const isDashboard = pathname?.startsWith("/dashboard");
	const isTenantSite = hostname !== null && !isOnMainSite(hostname);
	const showNavbar = !isDashboard && !isTenantSite;
	const showFooter = !isDashboard && !isTenantSite;

	return (
		<>
			{showNavbar && <SiteNavbar />}
			<div className={showNavbar ? "pt-navbar" : ""}>{children}</div>
			{showFooter && <Footer tenant={tenant} />}
		</>
	);
}
