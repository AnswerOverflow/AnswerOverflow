import type { Metadata } from "next";

type Props = {
	searchParams?: Promise<{ q?: string }>;
	children: React.ReactNode;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const searchParams = await props.searchParams;
	const query = searchParams?.q;

	const title = query
		? `Search Results for "${query}" - Answer Overflow`
		: "Search - Answer Overflow";
	const description =
		"Search for answers to your questions on Answer Overflow. Find indexed Discord messages and discussions.";

	return {
		title,
		description,
		robots: {
			index: false,
			follow: true,
		},
		openGraph: {
			title,
			description,
		},
		twitter: {
			card: "summary",
			title,
			description,
		},
	};
}

export default function SearchLayout({ children }: Props) {
	return children;
}
