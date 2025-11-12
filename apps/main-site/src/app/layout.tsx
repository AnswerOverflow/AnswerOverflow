import "@packages/ui/globals.css";
import { Providers } from "@packages/ui/components/providers";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { NavbarWrapper } from "../components/navbar-wrapper";

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body>
				<NuqsAdapter>
					<Providers>
						<NavbarWrapper>{children}</NavbarWrapper>
					</Providers>
				</NuqsAdapter>
			</body>
		</html>
	);
}
