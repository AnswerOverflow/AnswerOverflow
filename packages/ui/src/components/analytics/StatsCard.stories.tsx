import type { Meta, StoryFn } from "@storybook/react";
import { StatsCard, StatsCardProps } from "./StatsCard";
export default {
  component: StatsCard,
  argTypes: {
    changeType: {
      control: "radio",
      options: ["increase", "decrease"],
    },
  },
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof StatsCard> = (args: StatsCardProps) => <StatsCard {...args} />;

//👇 Each story then reuses that template
export const Primary = Template.bind({});

const primaryArgs: StatsCardProps = {
  title: "Questions asked",
  stat: "123",
  percentageChange: "12.52%",
  changeType: "decrease",
  changeCount: "12",
  changeDuration: "15 days",
};

Primary.args = primaryArgs;
