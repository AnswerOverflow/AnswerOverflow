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

const PrimaryArgs: StatsCardProps = {
  subtitle: "Questions asked",
  stat: "123",
  percentage_change: "12.52%",
  change_type: "decrease",
  change_count: "12",
  change_duration: "15 days",
};

Primary.args = PrimaryArgs;
