"use client";

import type * as React from "react";
import { ConvexClientProvider } from "./convex-client-provider";
import { TenantProvider, type Tenant } from "./tenant-context";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function Providers({
	children,
	tenant = null,
}: {
	children: React.ReactNode;
	tenant?: Tenant | null;
}) {
	return (
		<NextThemesProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
			enableColorScheme
		>
			<TenantProvider tenant={tenant}>
				<ConvexClientProvider>{children}</ConvexClientProvider>
			</TenantProvider>
		</NextThemesProvider>
	);
}
