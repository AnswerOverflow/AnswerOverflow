import "@packages/ui/globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const isProduction = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production";

export const metadata: Metadata = {
	robots: {
		index: isProduction,
		follow: isProduction,
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body>
				<NuqsAdapter>{children}</NuqsAdapter>
				<SpeedInsights sampleRate={0.1} />
			</body>
		</html>
	);
}
