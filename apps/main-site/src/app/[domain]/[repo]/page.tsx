import { redirect } from "next/navigation";

type Props = {
	params: Promise<{
		domain: string;
		repo: string;
	}>;
};

export async function generateStaticParams() {
	return [];
}

export default async function RepoPage(props: Props) {
	"use cache";
	const params = await props.params;
	redirect(
		`https://www.answeroverflow.com/chat/${params.domain}/${params.repo}`,
	);
}
