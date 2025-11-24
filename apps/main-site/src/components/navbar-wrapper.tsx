"use client";

import { Footer } from "@packages/ui/components/footer";
import { useTenant } from "@packages/ui/components/tenant-context";
import { usePathname } from "next/navigation";
import { SiteNavbar } from "./site-navbar";

function isDomainRoute(pathname: string | null): boolean {
	if (!pathname) return false;
	const firstSegment = pathname.split("/")[1];
	return firstSegment?.includes(".") ?? false;
}

export function NavbarWrapper({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const tenant = useTenant();
	const isDashboard = pathname?.startsWith("/dashboard");
	const isDomain = isDomainRoute(pathname);
	const showNavbar = !isDashboard && !isDomain;
	const showFooter = !isDashboard && !isDomain;

	return (
		<>
			{showNavbar && <SiteNavbar />}
			<div className={showNavbar ? "pt-16" : ""}>{children}</div>
			{showFooter && <Footer tenant={tenant} />}
		</>
	);
}
