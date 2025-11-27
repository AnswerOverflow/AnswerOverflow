"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";
import { ConvexClientProvider } from "./convex-client-provider";
import { SignInIfAnon } from "./sign-in-if-anon";
import { type Tenant, TenantProvider } from "./tenant-context";

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
				<ConvexClientProvider>
					<SignInIfAnon />
					{children}
				</ConvexClientProvider>
			</TenantProvider>
		</NextThemesProvider>
	);
}
