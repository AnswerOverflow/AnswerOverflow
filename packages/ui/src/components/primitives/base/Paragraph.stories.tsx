import type { Meta, StoryObj } from '@storybook/react';

import { Paragraph } from './Paragraph';
const meta = {
	component: Paragraph,
} as Meta<typeof Paragraph>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ParagraphStory: Story = {
	args: {},
	render: () => (
		<Paragraph>
			Paragraph Lorem ipsum, dolor sit amet consectetur adipisicing elit. Iusto,
			maiores! Ipsum odit, facere molestiae labore voluptate accusamus tempora
			quidem voluptatibus eius! Esse soluta ipsa, beatae minima animi obcaecati?
			Fuga, doloribus! Vitae reiciendis provident temporibus dolores
			necessitatibus error ex iusto quam fugit quod architecto, ratione ea
			numquam, explicabo sed? Modi inventore provident dolores tempore
			reiciendis excepturi assumenda qui repellendus a! Labore?
		</Paragraph>
	),
};
