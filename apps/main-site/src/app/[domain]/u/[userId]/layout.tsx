import type { Metadata } from "next";

type Props = {
	children: React.ReactNode;
	params: Promise<{ domain: string; userId: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const _params = await props.params;
	return {
		title: "User Posts",
		description: "See posts from this user",
		robots: {
			index: false,
		},
	};
}

export default async function TenantUserLayout(props: Props) {
	return (
		<main className="flex w-full justify-center pt-4">
			<div className="flex w-full max-w-[850px] flex-col gap-4 px-4">
				{props.children}
			</div>
		</main>
	);
}
