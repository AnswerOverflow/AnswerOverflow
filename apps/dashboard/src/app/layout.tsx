import "@packages/ui/globals.css";
import { Providers } from "@packages/ui/components/providers";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body>
				<NuqsAdapter>
					<Providers>{children}</Providers>
				</NuqsAdapter>
			</body>
		</html>
	);
}
