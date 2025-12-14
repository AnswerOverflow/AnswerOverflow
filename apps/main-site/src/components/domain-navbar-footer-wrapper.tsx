"use client";

import { TenantFooter } from "@packages/ui/components/footer";
import { TenantNavbar } from "@packages/ui/components/navbar";
import { usePathname } from "next/navigation";

export function DomainNavbarFooterWrapper({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();

	if (pathname?.startsWith("/dashboard")) {
		return <>{children}</>;
	}

	return (
		<>
			<TenantNavbar />
			<div className="pt-16">{children}</div>
			<TenantFooter />
		</>
	);
}
