"use client";

import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";

// biome-ignore lint/style/noNonNullAssertion: Setup
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const queryClient = new QueryClient();
export default function ConvexClientProvider({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<ClerkProvider
			// biome-ignore lint/style/noNonNullAssertion: Setup
			publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
		>
			<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}
