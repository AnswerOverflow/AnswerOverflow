import "@packages/ui/globals.css";
import { Providers } from "@packages/ui/components/providers";
import ConvexClientProvider from "./ConvexClientProvider";

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body>
				<ConvexClientProvider>
					<Providers>{children}</Providers>
				</ConvexClientProvider>
			</body>
		</html>
	);
}
