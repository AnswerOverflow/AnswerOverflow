import type { Story } from '@ladle/react';
import { GooglePage } from './GooglePage/GooglePage';

type GooglePageProps = React.ComponentPropsWithoutRef<typeof GooglePage>;

export const GooglePageStory: Story<GooglePageProps> = (props) => (
	<GooglePage {...props} />
);

GooglePageStory.args = {
	result: {
		url: 'https://www.answeroverflow.com > ...',
		title: 'How do I index my discord channels into google?',
		description: `How do I index my discord channels into google? How do I index my discord channels into google? How do I index my discord channels into google?`,
	},
};
