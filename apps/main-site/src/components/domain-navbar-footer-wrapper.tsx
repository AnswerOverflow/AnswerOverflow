"use client";

import { TenantFooter } from "@packages/ui/components/footer";
import { TenantNavbar } from "@packages/ui/components/navbar";
import { useTenant } from "@packages/ui/components/tenant-context";
import { usePathname } from "next/navigation";

export function DomainNavbar() {
	const pathname = usePathname();
	const tenant = useTenant();

	const isOverviewPage = pathname === "/" || pathname?.startsWith("/c/");
	const showServerInNavbar = !isOverviewPage;

	const server =
		showServerInNavbar && tenant?.discordId && tenant?.name
			? {
					discordId: tenant.discordId,
					name: tenant.name,
					icon: tenant.icon ?? null,
				}
			: null;

	return <TenantNavbar showBorder={!isOverviewPage} server={server} />;
}

export function DomainFooter() {
	return <TenantFooter />;
}
