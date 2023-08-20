import type { Story } from '@ladle/react';
import { Contributors } from './Contributors';
import { StoryDefault } from '@ladle/react/typings-for-build/app/exports';
export default {
	title: '!Pages / Contributors',
} satisfies StoryDefault;
type ContributorsProps = React.ComponentPropsWithoutRef<typeof Contributors>;

export const ContributorsStory: Story<ContributorsProps> = (props) => (
	<Contributors {...props} />
);

ContributorsStory.args = {
	contributors: [
		{
			avatar: 'https://avatars.githubusercontent.com/u/9919?s=200&v=4',
			description: 'User description',
			name: 'User name',
			links: ['http://localhost:3000/contributors'],
		},
	],
};
