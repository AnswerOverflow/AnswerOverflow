"use client";

import { DashboardSidebar } from "@packages/ui/components/navbar";

export default function DashboardServerLayout({
	children,
}: {
	children: React.ReactNode;
}) {
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
