import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@packages/ui/components/avatar";
import { SocialIcon } from "react-social-icons"; // TODO: use our own social icon component
import { FollowCursor } from "../../../../components/follow";

export interface ContributorData {
	name: string;
	description: string;
	avatar: string;
	links: string[];
}
export const coreTeamContributors: ContributorData[] = [
	{
		name: "Rhys",
		description: "Project Founder and Lead",
		avatar: "https://avatars.githubusercontent.com/u/39114868",
		links: [
			"https://github.com/RhysSullivan",
			"https://www.linkedin.com/in/rhyssullivan/",
			"https://twitter.com/RhysSullivan",
			"mailto:rhys.sullivan@answeroverflow.com",
		],
	},
];

export const openSourceContributors: ContributorData[] = [
	{
		name: "Jolt",
		description: "Frontend development and design",
		avatar: "https://avatars.githubusercontent.com/u/46378904",
		links: ["https://github.com/JoltCode", "mailto:joe@joecc.dev"],
	},
	{
		name: "Ellie Sage",
		description: "Answer Overflow logo & icon",
		avatar: "./ellie-sage.png",
		links: [
			"https://www.linkedin.com/in/ellie-sage-3051ab219/",
			"https://www.instagram.com/helloelliesage/",
			"https://elliesage.co.uk",
		],
	},
];

export const Contributor = ({
	name,
	description,
	avatar,
	links,
}: ContributorData) => (
	<div className="flex h-full w-64 flex-col items-center justify-start rounded-standard border-2 px-8 py-16">
		<Avatar className={"h-20 w-20"}>
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
		<div className="flex h-20 flex-row gap-4 border-t-2 pt-4">
			{Object.entries(links).map(([key, value]) => (
				<SocialIcon
					url={value}
					key={`${name}-${key}-${value}`}
					className="dark:invert"
					style={{
						height: "32px",
						width: "32px",
					}}
					bgColor="inherit"
				/>
			))}
		</div>
	</div>
);

export const CoreContributors = () => (
	<div className="mx-auto my-16 grid w-max grid-cols-1 gap-8 md:mx-0 md:mr-auto md:grid-flow-col md:grid-cols-2">
		{coreTeamContributors.map((contributor) => (
			<FollowCursor key={`${contributor.name}`} intensity={25}>
				<Contributor {...contributor} />
			</FollowCursor>
		))}
	</div>
);

export const OpenSourceContributors = () => (
	<div className="mx-auto my-16 grid w-max grid-cols-1 gap-8 md:mx-0 md:mr-auto md:grid-flow-col md:grid-cols-2">
		{openSourceContributors.map((contributor) => (
			<FollowCursor key={`${contributor.name}`} intensity={25}>
				<Contributor {...contributor} />
			</FollowCursor>
		))}
	</div>
);
