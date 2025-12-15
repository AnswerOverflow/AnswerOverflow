import { redirect } from "next/navigation";

export async function GET(
	_req: Request,
	props: {
		params: Promise<{
			userId: string;
		}>;
	},
) {
	const params = await props.params;
	redirect(`/u/${params.userId}`);
}
