"use client";

import dynamic from "next/dynamic";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";
import { Suspense } from "react";
import {
	AnalyticsProvider,
	PostHogIdentify,
	PostHogPageview,
} from "../analytics/client";
import { useSession } from "./convex-client-provider";
import { HydrationProvider } from "./hydration-context";
import { ImpersonationBanner } from "./impersonation-banner";
import { type Tenant, TenantProvider } from "./tenant-context";
import { VercelToolbar } from "./vercel-toolbar";

const ConvexClientProvider = dynamic(
	() =>
		import("./convex-client-provider").then((mod) => mod.ConvexClientProvider),
	{ ssr: false },
);

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
				<AnalyticsProvider subpath={tenant?.subpath}>
					<Suspense fallback={null}>
						<PostHogPageview />
					</Suspense>
					<NextThemesProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						enableColorScheme
					>
						<ConvexClientProvider tenant={tenant}>
							<IdentifyUser />
							<ImpersonationBanner />
							<VercelToolbar />
							{children}
						</ConvexClientProvider>
					</NextThemesProvider>
				</AnalyticsProvider>
			</HydrationProvider>
		</TenantProvider>
	);
}
