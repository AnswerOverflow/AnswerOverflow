"use client";

import { DashboardSidebar } from "@packages/ui/components/navbar";
import { useDashboardServerId } from "../server-id-context";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const serverId = useDashboardServerId();

	return (
		<DashboardSidebar serverId={serverId}>
			<main className="p-6 lg:p-8 mx-auto">
				<div className="max-w-[2000px] w-full flex flex-col items-center">
					{children}
				</div>
			</main>
		</DashboardSidebar>
	);
}
