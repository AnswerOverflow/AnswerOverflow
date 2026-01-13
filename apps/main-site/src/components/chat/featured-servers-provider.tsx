"use client";

import { createContext, useContext } from "react";
import type { DiscordServerContext } from "@/lib/discord-server-types";

const FeaturedServersContext = createContext<Array<DiscordServerContext>>([]);

export function useFeaturedServers() {
	return useContext(FeaturedServersContext);
}

export function FeaturedServersProvider({
	children,
	servers,
}: {
	children: React.ReactNode;
	servers: Array<DiscordServerContext>;
}) {
	return (
		<FeaturedServersContext.Provider value={servers}>
			{children}
		</FeaturedServersContext.Provider>
	);
}
