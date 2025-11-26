import type { Metadata } from "next";

type Props = {
	children: React.ReactNode;
	params: Promise<{ userId: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	return {
		title: `User Posts - Answer Overflow`,
		description: `See posts from this user on Answer Overflow`,
		alternates: {
			canonical: `/u/${params.userId}`,
		},
		robots: {
			index: false,
		},
	};
}

export default async function UserLayout(props: Props) {
	return (
		<main className="flex w-full justify-center pt-4">
			<div className="flex w-full max-w-[850px] flex-col gap-4 px-4">
				{props.children}
			</div>
		</main>
	);
}
