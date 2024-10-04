/* eslint-disable @typescript-eslint/naming-convention */
export interface ContributorData {
	name: string;
	description: string;
	avatar: string;
	links: string[];
}
export const coreTeamContributors: ContributorData[] = [
	{
		name: 'Rhys',
		description: 'Project Founder and Lead',
		avatar: 'https://avatars.githubusercontent.com/u/39114868',
		links: [
			'https://github.com/RhysSullivan',
			'https://www.linkedin.com/in/rhyssullivan/',
			'https://twitter.com/RhysSullivan',
			'mailto:rhys.sullivan@answeroverflow.com',
		],
	},
];

export const openSourceContributors: ContributorData[] = [
	{
		name: 'Jolt',
		description: 'Frontend development and design',
		avatar: 'https://avatars.githubusercontent.com/u/46378904',
		links: ['https://github.com/JoltCode', 'mailto:joe@joecc.dev'],
	},
	{
		name: 'Kyle',
		description: 'Checkmarks on solution messages',
		avatar: 'https://avatars.githubusercontent.com/u/38047633',
		links: ['https://github.com/uerk-io'],
	},
	{
		name: 'Cole Heigis',
		description: 'Frontend server cards',
		avatar: 'https://avatars.githubusercontent.com/u/123331535',
		links: ['https://github.com/Cole-Heigis'],
	},
	{
		name: 'Ellie Sage',
		description:
			'Answer Overflow logo (the one you see in the top left corner!)',
		avatar: './ellie-sage.png',
		links: [
			'https://www.linkedin.com/in/ellie-sage-3051ab219/',
			'https://www.instagram.com/helloelliesage/',
			'https://elliesage.co.uk',
		],
	},
	// {
	// 	name: 'Orion Tether',
	// 	description: 'Icon creation',
	// 	avatar: 'https://avatars.githubusercontent.com/u/46378904',
	// 	links: ['https://www.artstation.com/huntertether'],
	// },
];
