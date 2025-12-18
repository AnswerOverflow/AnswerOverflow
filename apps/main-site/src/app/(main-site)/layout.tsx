import { Providers } from "@packages/ui/components/providers";
import type { Metadata } from "next";
import { NavbarWrapper } from "@/components/navbar-wrapper";

export const metadata: Metadata = {
	title: "Answer Overflow - Discord Content Discovery",
	metadataBase: new URL("https://www.answeroverflow.com/"),
	description:
		"Build the best Discord support server with Answer Overflow. Index your content into Google, answer questions with AI, and gain insights into your community.",
	robots: {
		index: true,
		follow: true,
	},
	openGraph: {
		type: "website",
		title: "Answer Overflow - Discord Content Discovery",
		siteName: "Answer Overflow",
		description:
			"Build the best Discord support server with Answer Overflow. Index your content into Google, answer questions with AI, and gain insights into your community.",
		images: [
			{
				url: "https://www.answeroverflow.com/answer-overflow-banner-v3.png",
				width: 1200,
				height: 630,
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Answer Overflow - Discord Content Discovery",
		description:
			"Build the best Discord support server with Answer Overflow. Index your content into Google, answer questions with AI, and gain insights into your community.",
		images: ["https://www.answeroverflow.com/answer-overflow-banner-v3.png"],
	},
};

export default function MainSiteLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<Providers tenant={null}>
			<NavbarWrapper>{children}</NavbarWrapper>
		</Providers>
	);
}
