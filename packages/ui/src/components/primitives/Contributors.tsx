import { FollowCursor } from './Follow';
import { SocialIcon } from 'react-social-icons';
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '~ui/components/primitives/ui/avatar';

export interface ContributorData {
	name: string;
	description: string;
	avatar: string;
	links: string[];
}

export const Contributor = ({
	name,
	description,
	avatar,
	links,
}: ContributorData) => (
	<div className="flex h-full w-64 flex-col items-center justify-start rounded-standard border-1 border-ao-black/25 bg-ao-black/[0.03] px-8 py-16 dark:border-0 dark:bg-[#1F2124]">
		<Avatar>
			<AvatarImage alt={`The profile picture of ${name}`} src={avatar} />
			<AvatarFallback>{name}</AvatarFallback>
		</Avatar>
		<div className="grow">
			<div className="flex flex-col items-center justify-between text-black dark:text-white">
				<h3 className="mt-2 font-header text-2xl font-semibold">{name}</h3>
				<p className="mb-2 text-center font-body text-black/90 dark:text-white/75">
					{description}
				</p>
			</div>
		</div>
		<div className="flex h-20 flex-row gap-4 border-t-2 border-ao-black/20 pt-4 dark:border-ao-white/10">
			{Object.entries(links).map(([key, value]) => (
				<SocialIcon
					url={value}
					key={`${name}-${key}-${value}`}
					className="fill-black dark:fill-white"
					style={{
						height: '32px',
						width: '32px',
					}}
					bgColor="inherit"
				/>
			))}
		</div>
	</div>
);

export const Contributors = ({
	contributors,
}: {
	contributors: ContributorData[];
}) => (
	<div className="mx-auto my-16 grid w-max grid-cols-1 gap-8 md:mx-0 md:mr-auto md:grid-flow-col md:grid-cols-2">
		{contributors.map((contributor) => (
			<FollowCursor key={`${contributor.name}`} intensity={25}>
				<Contributor key={contributor.name} {...contributor} />
			</FollowCursor>
		))}
	</div>
);
