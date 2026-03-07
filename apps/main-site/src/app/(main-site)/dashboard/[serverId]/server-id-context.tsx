"use client";

import { createContext, useContext } from "react";

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

export function useDashboardServerId(): string {
	const serverId = useContext(DashboardServerIdContext);

	if (!serverId) {
		throw new Error(
			"useDashboardServerId must be used within DashboardServerIdProvider",
		);
	}

	return serverId;
}
