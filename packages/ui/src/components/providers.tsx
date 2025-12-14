"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";
import { Suspense } from "react";
import {
	AnalyticsProvider,
	PostHogIdentify,
	PostHogPageview,
} from "../analytics/client";
import { ConvexClientProvider, useSession } from "./convex-client-provider";
import { HydrationProvider } from "./hydration-context";
import { SignInIfAnon } from "./sign-in-if-anon";
import { type Tenant, TenantProvider } from "./tenant-context";

function IdentifyUser() {
	const { data } = useSession();

	return (
		<PostHogIdentify
			user={
				data?.user
					? {
							id: data.user.id,
							isAnonymous: data.user.isAnonymous ?? undefined,
							email: data.user.email,
							name: data.user.name,
						}
					: null
			}
		/>
	);
}

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
				<AnalyticsProvider>
					<Suspense fallback={null}>
						<PostHogPageview />
					</Suspense>
					<NextThemesProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						disableTransitionOnChange
						enableColorScheme
					>
						<ConvexClientProvider tenant={tenant}>
							<SignInIfAnon />
							<IdentifyUser />
							{children}
						</ConvexClientProvider>
					</NextThemesProvider>
				</AnalyticsProvider>
			</HydrationProvider>
		</TenantProvider>
	);
}
