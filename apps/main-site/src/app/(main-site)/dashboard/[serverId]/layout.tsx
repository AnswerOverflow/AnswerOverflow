import { Suspense } from "react";
import { DashboardServerIdBoundary } from "./server-id-context";

export default function ServerIdLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ serverId: string }>;
}) {
	return (
		<Suspense fallback={null}>
			<DashboardServerIdBoundary params={params}>
				{children}
			</DashboardServerIdBoundary>
		</Suspense>
	);
}
