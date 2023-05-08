import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid';
import { FollowCursor } from './Follow';
import { Avatar, AvatarFallback, AvatarImage, GitHubIcon } from './base';
import Link from 'next/link';

export interface ContributorData {
	name: string;
	description: string;
	avatar: string;
	socials: Record<string, string>;
}

const linkMap = new Map([
	['Github', <GitHubIcon className="h-5 w-5" key={`github-icon`} />],
	['Email', '📧'],
]);

const SocialLogo = (props: { socialKey: string; socialValue: string }) => {
	const found = linkMap.get(props.socialKey);

	if (typeof found === 'object' || typeof found === 'string')
		return <>{found}</>;

	return <ArrowTopRightOnSquareIcon className="h-4 w-4" />;
};

export const Contributor = ({
	name,
	description,
	avatar,
	socials,
}: ContributorData) => (
	<div className="flex h-full w-auto max-w-xs flex-col items-center justify-start rounded-standard border-1 border-ao-black/25 bg-ao-black/[0.03] px-8 py-16 dark:border-0 dark:bg-[#1F2124]">
		<Avatar size="xl">
			<AvatarImage alt={`The profile picture of ${name}`} src={avatar} />
			<AvatarFallback>{name}</AvatarFallback>
		</Avatar>
		<div className="flex flex-col items-center justify-center">
			<h3 className="mt-2 font-header text-2xl font-semibold">{name}</h3>
			<p className="mb-2 text-center font-body">{description}</p>
			<div className="flex flex-col items-center justify-center space-y-2 border-t-2 border-ao-black/20 pt-2 dark:border-ao-white/10">
				{Object.entries(socials).map(([key, value]) => (
					<Link
						key={`${name}-${key}-${value}`}
						href={value}
						target="_blank"
						className="flex flex-row items-center justify-center font-body text-black hover:underline dark:text-white"
					>
						{key}
						<span className="ml-1" aria-hidden>
							<SocialLogo socialKey={key} socialValue={value} />
						</span>
					</Link>
				))}
			</div>
		</div>
	</div>
);

export const Contributors = ({
	contributors,
}: {
	contributors: ContributorData[];
}) => (
	<div className="mx-auto my-16 grid w-max grid-cols-1 gap-8 md:grid-flow-col md:grid-cols-2">
		{contributors.map((contributor) => (
			<FollowCursor key={`${contributor.name}`}>
				<Contributor key={contributor.name} {...contributor} />
			</FollowCursor>
		))}
	</div>
);
