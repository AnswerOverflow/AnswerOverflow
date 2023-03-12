import type { Meta, StoryObj } from "@storybook/react";
import { StatsCard, StatsCardProps } from "./StatsCard";
const meta = {
	component: StatsCard,
	argTypes: {
		changeType: {
			control: "radio",
			options: ["increase", "decrease"]
		}
	}
} as Meta<typeof StatsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

const primaryArgs: StatsCardProps = {
	title: "Questions asked",
	stat: "123",
	percentageChange: "12.52%",
	changeType: "decrease",
	changeCount: "12",
	changeDuration: "15 days"
};
export const Primary: Story = {
	args: primaryArgs
};
