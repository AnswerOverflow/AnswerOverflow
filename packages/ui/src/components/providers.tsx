"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";
import { ConvexClientProvider } from "./convex-client-provider";

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
