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

export const Primary = {
  args: primaryArgs,
};

const primaryArgs: StatsCardProps = {
  title: "Questions asked",
  stat: "123",
  percentageChange: "12.52%",
  changeType: "decrease",
  changeCount: "12",
  changeDuration: "15 days",
};
