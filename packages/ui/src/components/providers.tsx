"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";
import { ConvexClientProvider } from "./convex-client-provider";
import { HydrationProvider } from "./hydration-context";
import { ImpersonationBanner } from "./impersonation-banner";
import { type Tenant, TenantProvider } from "./tenant-context";
import { VercelToolbar } from "./vercel-toolbar";

export function Providers({
	children,
	tenant = null,
}: {
	children: React.ReactNode;
	tenant?: Tenant | null;
}) {
	return (
		<TenantProvider tenant={tenant}>
			<HydrationProvider>
				<NextThemesProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					enableColorScheme
				>
					<ConvexClientProvider tenant={tenant}>
						<ImpersonationBanner />
						<VercelToolbar />
						{children}
					</ConvexClientProvider>
				</NextThemesProvider>
			</HydrationProvider>
		</TenantProvider>
	);
}
