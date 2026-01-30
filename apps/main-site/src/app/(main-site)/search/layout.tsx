import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Search - Answer Overflow",
	description:
		"Search for answers to your questions on Answer Overflow. Find indexed Discord messages and discussions.",
	robots: {
		index: false,
		follow: true,
	},
	openGraph: {
		title: "Search - Answer Overflow",
		description:
			"Search for answers to your questions on Answer Overflow. Find indexed Discord messages and discussions.",
	},
	twitter: {
		card: "summary",
		title: "Search - Answer Overflow",
		description:
			"Search for answers to your questions on Answer Overflow. Find indexed Discord messages and discussions.",
	},
};

export default function SearchLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
