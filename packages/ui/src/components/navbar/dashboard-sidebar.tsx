"use client";

import type * as React from "react";
import Link from "next/link";
import { cn } from "../../lib/utils";
import { useParams, usePathname } from "next/navigation";

export interface DashboardSidebarProps {
	/** Children to render in main content area */
	children?: React.ReactNode;
}

export function DashboardSidebar({ children }: DashboardSidebarProps) {
	const params = useParams();
	const pathname = usePathname();
	const serverId = params.serverId as string | undefined;

	const navItems = serverId
		? [
				{
					label: "Overview",
					href: `/dashboard/${serverId}`,
					icon: null,
				},
				{
					label: "Channels",
					href: `/dashboard/${serverId}/channels`,
					icon: null,
				},
			]
		: [];

	return (
		<div className="relative flex min-h-screen w-full">
			{/* Sidebar - Fixed on left */}
			<aside className="hidden lg:flex fixed left-0 top-[60px] bottom-0 z-40 w-[255.44px] flex-col border-r bg-background">
				{/* Navigation */}
				{navItems.length > 0 && (
					<nav className="flex-1 space-y-1 overflow-y-auto p-4">
						{navItems.map((item) => {
							const isActive = pathname === item.href;
							return (
								<Link
									key={item.href}
									href={item.href}
									className={cn(
										"flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
										isActive
											? "bg-accent text-accent-foreground"
											: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
									)}
								>
									{item.label}
								</Link>
							);
						})}
					</nav>
				)}
			</aside>

			{/* Main Content - Offset for sidebar */}
			<div className="lg:ml-[255.44px] flex-1 overflow-auto">{children}</div>
		</div>
	);
}
