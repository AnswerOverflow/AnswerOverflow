import { Heading, LinkButton } from '../primitives';

export const CommitBanner = () => {
	if (
		process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' &&
		process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
	)
		return (
			<CommitBannerRenderer
				commitSha={process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA}
			/>
		);
	else return null;
};

export const CommitBannerRenderer = ({ commitSha }: { commitSha: string }) => {
	return (
		<div className="flex w-full flex-row justify-between bg-black px-4 md:px-10">
			<Heading.H2 className="font-body text-sm md:text-lg">
				<span className="text-white">Commit: </span>
				<span className="text-ao-white/75">{commitSha}</span>
			</Heading.H2>
			<Heading.H3 className="hidden font-body text-lg md:block">
				<LinkButton href="https://vercel.com" variant="subtle">
					Currently running on Vercel Preview
				</LinkButton>
			</Heading.H3>
		</div>
	);
};
