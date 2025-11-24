import "@packages/ui/globals.css";
import { Providers } from "@packages/ui/components/providers";
import type { Metadata } from "next";
import Script from "next/script";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { NavbarWrapper } from "../components/navbar-wrapper";

export const metadata: Metadata = {
	title: "Answer Overflow",
	description: "Index Your Discord Content Into Google",
	openGraph: {
		title: "Answer Overflow",
		description: "Index Your Discord Content Into Google",
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{process.env.NODE_ENV === "development" && (
					<Script
						src="//unpkg.com/react-grab/dist/index.global.js"
						crossOrigin="anonymous"
						strategy="beforeInteractive"
						data-enabled="true"
					/>
				)}
			</head>
			<body>
				<NuqsAdapter>
					<Providers tenant={null}>
						<NavbarWrapper>{children}</NavbarWrapper>
					</Providers>
				</NuqsAdapter>
			</body>
		</html>
	);
}
