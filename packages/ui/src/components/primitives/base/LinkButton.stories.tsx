import type { Story } from '@ladle/react';
import { LinkButton } from './LinkButton';

type LinkButtonProps = React.ComponentPropsWithoutRef<typeof LinkButton>;

export const LinkButtonStory: Story<LinkButtonProps> = (props) => (
	<LinkButton {...props} />
);

LinkButtonStory.args = {
	variant: 'default',
	href: 'https://answeroverflow.com',
};
