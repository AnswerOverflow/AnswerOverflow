"use client";

import { Footer } from "@packages/ui/components/footer";
import { Input } from "@packages/ui/components/input";
import { Navbar } from "@packages/ui/components/navbar";
import { useTenant } from "@packages/ui/components/tenant-context";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export function DomainNavbarFooterWrapper({
	children,
}: {
	children: React.ReactNode;
}) {
	const tenant = useTenant();
	const router = useRouter();
	const pathname = usePathname();
	const [searchQuery, setSearchQuery] = useState("");

	if (pathname?.startsWith("/dashboard")) {
		return <>{children}</>;
	}

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			const searchPath = tenant?.subpath
				? `/${tenant.subpath}/search`
				: "/search";
			router.push(`${searchPath}?q=${encodeURIComponent(searchQuery.trim())}`);
		}
	};

	const searchBar = (
		<form onSubmit={handleSearch} className="w-full">
			<Input
				type="search"
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				placeholder="Search Discord messages..."
				className="w-full"
			/>
		</form>
	);

	const homeHref = tenant?.subpath ? `/${tenant.subpath}` : "/";
	const searchHref = tenant?.subpath ? `/${tenant.subpath}/search` : "/search";

	return (
		<>
			<Navbar
				server={
					tenant
						? {
								discordId: tenant.discordId ?? "",
								name: tenant.name ?? "",
								icon: tenant.icon ?? "",
							}
						: null
				}
				homeHref={homeHref}
				searchBar={searchBar}
				showSearch={true}
				searchHref={searchHref}
			/>
			<div className="pt-16">{children}</div>
			<Footer tenant={tenant} />
		</>
	);
}
