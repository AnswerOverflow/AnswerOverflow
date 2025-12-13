"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "../input";
import { Link } from "../link";
import { LinkButton } from "../link-button";
import { ServerIcon } from "../server-icon";
import { useTenant } from "../tenant-context";
import { NavbarBase } from "./navbar-base";
import { UserSection } from "./user-section";

export function TenantNavbar() {
	const tenant = useTenant();
	const router = useRouter();
	const pathname = usePathname();
	const [searchQuery, setSearchQuery] = useState("");

	const isOnTenantHomepage = pathname === "/" || pathname.startsWith("/c/");

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			const searchPath = tenant?.subpath
				? `/${tenant.subpath}/search`
				: "/search";
			router.push(`${searchPath}?q=${encodeURIComponent(searchQuery.trim())}`);
		}
	};

	const homeHref = tenant?.subpath ? `/${tenant.subpath}` : "/";
	const searchHref = tenant?.subpath ? `/${tenant.subpath}/search` : "/search";

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

	const leftContent = !isOnTenantHomepage ? (
		<Link
			href={homeHref}
			className="text-foreground hover:text-foreground no-underline hover:no-underline"
		>
			{tenant?.discordId ? (
				<div className="flex items-center space-x-2">
					<ServerIcon
						server={{
							discordId: tenant.discordId,
							name: tenant.name ?? "",
							icon: tenant.icon ?? "",
						}}
						size={48}
					/>
					<span className="font-semibold">{tenant.name}</span>
				</div>
			) : (
				<div className="w-32 md:w-40">
					<span className="text-xl font-bold">Community</span>
				</div>
			)}
		</Link>
	) : null;

	const rightContent = (
		<>
			<LinkButton
				variant="ghost"
				size="icon"
				href={searchHref}
				className="flex items-center justify-center 2xl:hidden"
			>
				<Search className="h-5 w-5" />
				<span className="sr-only">Search</span>
			</LinkButton>
			<UserSection showSignIn={false} />
		</>
	);

	return (
		<NavbarBase
			leftContent={leftContent}
			centerContent={searchBar}
			rightContent={rightContent}
		/>
	);
}
