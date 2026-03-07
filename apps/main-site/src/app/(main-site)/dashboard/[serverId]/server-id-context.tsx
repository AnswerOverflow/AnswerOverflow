"use client";

import { createContext, use, useContext } from "react";

const DashboardServerIdContext = createContext<string | null>(null);

export function DashboardServerIdProvider({
	serverId,
	children,
}: {
	serverId: string;
	children: React.ReactNode;
}) {
	return (
		<DashboardServerIdContext.Provider value={serverId}>
			{children}
		</DashboardServerIdContext.Provider>
	);
}

export function DashboardServerIdBoundary({
	params,
	children,
}: {
	params: Promise<{ serverId: string }>;
	children: React.ReactNode;
}) {
	const { serverId } = use(params);

	return (
		<DashboardServerIdProvider serverId={serverId}>
			{children}
		</DashboardServerIdProvider>
	);
}

export function useDashboardServerId(): string {
	const serverId = useContext(DashboardServerIdContext);

	if (!serverId) {
		throw new Error(
			"useDashboardServerId must be used within DashboardServerIdProvider",
		);
	}

	return serverId;
}
