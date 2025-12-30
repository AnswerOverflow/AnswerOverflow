"use client";

import { useParams, usePathname } from "next/navigation";
import { useFeatureFlagEnabled } from "posthog-js/react";
import type * as React from "react";
import { cn } from "../../lib/utils";
import { AnswerOverflowLogo } from "../answer-overflow-logo";
import { Link } from "../link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../sheet";
import { useDashboardNavbar } from "./dashboard-navbar";

export interface DashboardSidebarProps {
	children?: React.ReactNode;
	homeHref?: string;
}

function SidebarNavigation({ onLinkClick }: { onLinkClick?: () => void }) {
	const params = useParams();
	const pathname = usePathname();
	const serverId = params.serverId as string | undefined;
	const threadsEnabled = useFeatureFlagEnabled("dashboard-threads-list");

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
				...(threadsEnabled
					? [
							{
								label: "Threads",
								href: `/dashboard/${serverId}/threads`,
								icon: null,
							},
						]
					: []),
				{
					label: "Settings",
					href: `/dashboard/${serverId}/settings`,
					icon: null,
				},
			]
		: [];

	if (navItems.length === 0) {
		return null;
	}

	return (
		<nav className="flex-1 space-y-1 overflow-y-auto p-4">
			{navItems.map((item) => {
				const isActive = pathname === item.href;
				return (
					<Link
						key={item.href}
						href={item.href}
						onClick={onLinkClick}
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
	);
}

function SidebarHeader({ homeHref }: { homeHref: string }) {
	return (
		<div className="h-navbar flex items-center px-4 border-b shrink-0">
			<Link href={homeHref} className="flex items-center">
				<AnswerOverflowLogo width={160} />
				<span className="sr-only">Answer Overflow</span>
			</Link>
		</div>
	);
}

export function DashboardSidebar({
	children,
	homeHref = "/",
}: DashboardSidebarProps) {
	const { mobileSidebarOpen, setMobileSidebarOpen } = useDashboardNavbar();

	return (
		<div className="relative flex w-full">
			<aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-50 w-[255.44px] flex-col border-r bg-background">
				<SidebarHeader homeHref={homeHref} />
				<SidebarNavigation />
			</aside>

			<Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
				<SheetContent side="left" className="w-[255.44px] p-0">
					<SheetHeader className="sr-only">
						<SheetTitle>Navigation</SheetTitle>
					</SheetHeader>
					<div className="flex h-full flex-col">
						<SidebarHeader homeHref={homeHref} />
						<SidebarNavigation
							onLinkClick={() => setMobileSidebarOpen(false)}
						/>
					</div>
				</SheetContent>
			</Sheet>

			<div className="lg:ml-[255.44px] flex-1">{children}</div>
		</div>
	);
}
