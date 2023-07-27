import type { Story } from '@ladle/react';
import { ServerIcon } from './ServerIcon';
import { mockPublicServer } from '~ui/test/props';

type ServerIconProps = React.ComponentPropsWithoutRef<typeof ServerIcon>;

export const Primary: Story<ServerIconProps> = (props) => (
	<ServerIcon {...props} />
);
Primary.args = {
	server: mockPublicServer({
    name: 'AnswerOverflow',
  }),
};

export const WithImage = Primary.bind({});

WithImage.args = {
	server: mockPublicServer({
		name: 'AnswerOverflow',
		id: '952724385238761475',
		icon: '528d997ddc414ff316c4c61014d38f8b',
	}),
  size: 64
};
