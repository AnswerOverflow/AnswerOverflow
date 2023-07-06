import type { Story } from '@ladle/react';
import { Command } from './Command';

type CommandProps = React.ComponentPropsWithoutRef<typeof Command>;

export const CommandPrimary: Story<CommandProps> = (props) => (
	<Command {...props} />
);

CommandPrimary.args = {
	command: 'answeroverflow',
};
