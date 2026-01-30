import { redirect } from "next/navigation";

type Props = {
	params: Promise<{
		domain: string;
		repo: string;
	}>;
};

export async function generateStaticParams(): Promise<
	Array<{ domain: string; repo: string }>
> {
	return [{ domain: "answeroverflow", repo: "answeroverflow" }];
}

export default async function RepoPage(props: Props) {
	const params = await props.params;
	redirect(
		`https://www.answeroverflow.com/chat/${params.domain}/${params.repo}`,
	);
}
