import Image from 'next/image';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid';
import { FollowCursor } from './Follow';
import { GitHubIcon } from './base';

export interface ContributorData {
	name: string;
	description: string;
	avatar: string;
	socials: Record<string, string>;
}

const linkMap: { [key: string]: string | React.FC<{ className?: string }> } = {
	Github: GitHubIcon,
	Email: '📧',
};

const SocialLogo = (props: { socialKey: string; socialValue: string }) => {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const Found = Object.entries(linkMap).find(
		([linkKey]) => linkKey == props.socialKey,
	)?.[1];

	if (Found instanceof Function) return <Found className="h-5 w-5" />;
	if (typeof Found == 'string') return <>{Found}</>;

	return <ArrowTopRightOnSquareIcon className="h-4 w-4" />;
};

export const Contributor = ({
	name,
	description,
	avatar,
	socials,
}: ContributorData) => (
	<div className="flex h-full w-auto max-w-xs flex-col items-center justify-start rounded-standard bg-[#1F2124] px-8 py-16">
		<Image
			src={avatar}
			alt={`The profile picture of ${name}`}
			width={128}
			height={128}
			className="rounded-full drop-shadow-2xl"
		/>
		<div className="flex flex-col items-center justify-center">
			<h3 className="mt-2 font-header text-2xl font-semibold">{name}</h3>
			<p className="mb-2 text-center font-body">{description}</p>
			<div className="flex flex-col items-center justify-center space-y-2 border-t-2 border-ao-white/10 pt-2">
				{Object.entries(socials).map(([key, value]) => (
					<a
						key={`${name}-${key}-${value}`}
						href={value}
						target="_blank"
						rel="noopener noreferrer"
						className="flex flex-row items-center justify-center font-body text-white hover:underline"
					>
						{key}
						<span className="ml-1" aria-hidden>
							<SocialLogo socialKey={key} socialValue={value} />
						</span>
					</a>
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
	<div className="mx-auto my-16 grid w-max grid-flow-col grid-cols-2 gap-8">
		{contributors.map((contributor) => (
			<FollowCursor key={`${contributor.name}`}>
				<Contributor key={contributor.name} {...contributor} />
			</FollowCursor>
		))}
	</div>
);
