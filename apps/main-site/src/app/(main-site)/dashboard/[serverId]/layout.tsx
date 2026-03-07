"use client";

import { Suspense, use } from "react";
import { DashboardServerIdProvider } from "./server-id-context";

function ServerIdLayoutContent({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ serverId: string }>;
}) {
	const { serverId } = use(params);

	return (
		<DashboardServerIdProvider serverId={serverId}>
			{children}
		</DashboardServerIdProvider>
	);
}

export default function ServerIdLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ serverId: string }>;
}) {
	return (
		<Suspense fallback={null}>
			<ServerIdLayoutContent params={params}>{children}</ServerIdLayoutContent>
		</Suspense>
	);
}
