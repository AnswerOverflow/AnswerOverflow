import type { Meta, StoryFn } from "@storybook/react";
import { ServerIcon, ServerIconProps } from "./ServerIcon";
import { mockServer } from "~ui/test/props";
export default {
  component: ServerIcon,
} as Meta;

export const Primary = {
  args: {
    server: mockServer(),
  },
};

export const WithImage = {
  args: {
    server: mockServer({
      name: "AnswerOverflow",
      id: "952724385238761475",
      icon: "4e610bdea5aacf259013ed8cada0bc1d",
    }),
  },
};

export const Tertiary = {
  args: {
    ...Primary.args,
  },
};
