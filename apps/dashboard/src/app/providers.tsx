"use client";

import { ConvexClientProvider } from "@packages/ui/components/convex-client-provider";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<NextThemesProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
			enableColorScheme
		>
			<ConvexClientProvider>{children}</ConvexClientProvider>
		</NextThemesProvider>
	);
}
