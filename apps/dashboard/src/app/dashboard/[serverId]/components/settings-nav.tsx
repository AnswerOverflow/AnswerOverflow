"use client";

import { cn } from "@packages/ui/lib/utils";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

export function SettingsNav() {
	const params = useParams();
	const pathname = usePathname();
	const serverId = params.serverId as string;

	const navItems = [
		{
			label: "Overview",
			href: `/dashboard/${serverId}`,
		},
		{
			label: "Channels",
			href: `/dashboard/${serverId}/channels`,
		},
		{
			label: "Settings",
			href: `/dashboard/${serverId}/settings`,
		},
	];

	return (
		<nav className="flex items-center gap-6 border-b">
			{navItems.map((item) => {
				const isActive = pathname === item.href;
				return (
					<Link
						key={item.href}
						href={item.href}
						className={cn(
							"border-b-2 border-transparent pb-3 text-sm font-medium transition-colors hover:text-foreground",
							isActive
								? "border-foreground text-foreground"
								: "text-muted-foreground",
						)}
					>
						{item.label}
					</Link>
				);
			})}
		</nav>
	);
}
