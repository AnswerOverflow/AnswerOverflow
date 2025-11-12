"use client";

import { usePathname } from "next/navigation";
import { SiteNavbar } from "./site-navbar";

export function NavbarWrapper({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const showNavbar = !pathname?.startsWith("/dashboard");

	return (
		<>
			<SiteNavbar />
			<div className={showNavbar ? "pt-16" : ""}>{children}</div>
		</>
	);
}
