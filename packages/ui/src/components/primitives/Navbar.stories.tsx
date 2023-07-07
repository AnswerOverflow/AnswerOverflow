import type { Story } from '@ladle/react';
import { NavbarRenderer } from './Navbar';

type NavbarRendererProps = React.ComponentPropsWithoutRef<
	typeof NavbarRenderer
>;

const NotSignedIn: Story<NavbarRendererProps> = (props) => (
	<NavbarRenderer {...props} />
);

NotSignedIn.args = {
	path: '/',
};

export const SignedIn = NotSignedIn.bind({});
SignedIn.args = {
	path: '/',
	user: {
		id: '123',
	},
};
