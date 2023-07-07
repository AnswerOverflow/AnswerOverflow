import type { Story } from '@ladle/react';
import { ServerIcon } from './ServerIcon';
import { mockServer } from '~ui/test/props';

type ServerIconProps = React.ComponentPropsWithoutRef<typeof ServerIcon>;

export const Primary: Story<ServerIconProps> = (props) => (
	<ServerIcon {...props} />
);
Primary.args = {
	server: mockServer(),
};

export const WithImage = Primary.bind({});

WithImage.args = {
	server: mockServer({
		name: 'AnswerOverflow',
		id: '952724385238761475',
		icon: '4e610bdea5aacf259013ed8cada0bc1d',
	}),
};
