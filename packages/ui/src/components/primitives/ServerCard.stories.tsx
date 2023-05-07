import type { Meta, StoryFn } from '@storybook/react';
import { mockServer } from '~ui/test/props';
import { ServerCard, ViewServerCard, type ServerCardProps } from './ServerCard';
export default {
	component: ServerCard,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof ServerCard> = (args: ServerCardProps) => (
	<ServerCard {...args} />
);

export const BaseCard = Template.bind({});
BaseCard.args = {
	server: mockServer({
		name: 'AnswerOverflow',
		id: '952724385238761475',
		icon: '4e610bdea5aacf259013ed8cada0bc1d',
	}),
};

const ViewTemplate: StoryFn<typeof ViewServerCard> = (args) => (
	<ViewServerCard {...args} />
);

export const ViewCard = ViewTemplate.bind({});
ViewCard.args = {
	server: mockServer({
		name: 'AnswerOverflow',
		id: '952724385238761475',
		icon: '4e610bdea5aacf259013ed8cada0bc1d',
	}),
};
