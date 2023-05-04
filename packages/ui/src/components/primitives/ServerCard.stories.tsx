import type { Meta, StoryFn } from '@storybook/react';
import { mockServer } from '~ui/test/props';
import { ServerCard, type ManageServerCardProps } from './ServerCard';
export default {
	component: ServerCard,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof ServerCard> = (args: ManageServerCardProps) => (
	<ServerCard {...args} />
);

export const WithImageManageCard = Template.bind({});
WithImageManageCard.args = {
	server: mockServer({
		name: 'AnswerOverflow',
		id: '952724385238761475',
		icon: '4e610bdea5aacf259013ed8cada0bc1d',
	}),
	role: 'Test Role',
	type: 'manage',
};

export const JoinServerNoVanity = Template.bind({});
JoinServerNoVanity.args = {
	server: mockServer({
		name: 'AnswerOverflow',
		id: '952724385238761475',
		icon: '4e610bdea5aacf259013ed8cada0bc1d',
	}),
	type: 'join',
};

export const JoinServerWithVanity = Template.bind({});
JoinServerWithVanity.args = {
	server: mockServer({
		name: 'AnswerOverflow',
		id: '952724385238761475',
		icon: '4e610bdea5aacf259013ed8cada0bc1d',
		vanityUrl: 'answeroverflow',
	}),
	type: 'join',
};
