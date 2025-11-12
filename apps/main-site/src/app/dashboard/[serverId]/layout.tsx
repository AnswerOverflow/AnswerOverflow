"use client";

import { DashboardSidebar } from "@packages/ui/components/navbar";

export default function DashboardServerLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// The navbar is handled by the parent dashboard layout
	// This layout only adds the sidebar for server-specific pages
	return (
		<DashboardSidebar>
			<main className="p-6 lg:p-8 mx-auto">
				<div className="max-w-[2000px] w-full flex flex-col items-center">
					{children}
				</div>
			</main>
		</DashboardSidebar>
	);
}
