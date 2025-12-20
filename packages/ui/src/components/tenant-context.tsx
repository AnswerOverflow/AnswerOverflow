"use client";

import type React from "react";
import { createContext, useContext } from "react";

export type Tenant = {
	name: string;
	icon: string | undefined;
	description: string;
	customDomain?: string | null;
	subpath?: string | null;
	discordId: bigint;
};

const TenantContext = createContext<Tenant | null>(null);

export function TenantProvider(props: {
	tenant: Tenant | null;
	children: React.ReactNode;
}) {
	return (
		<TenantContext.Provider value={props.tenant}>
			{props.children}
		</TenantContext.Provider>
	);
}

export function useTenant() {
	return useContext(TenantContext);
}
