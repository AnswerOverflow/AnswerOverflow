import type { Meta, StoryFn } from "@storybook/react";
import { mockServer } from "~ui/test/props";
import { ManageServerCard, ManageServerCardProps } from "./ManageServerCard";
export default {
  component: ManageServerCard,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof ManageServerCard> = (args: ManageServerCardProps) => (
  <ManageServerCard {...args} />
);

//👇 Each story then reuses that template
export const Primary = Template.bind({});
Primary.args = {
  server: mockServer(),
  role: "Test Role",
};

export const WithImage = Template.bind({});
WithImage.args = {
  server: mockServer({
    name: "AnswerOverflow",
    id: "952724385238761475",
    icon: "4e610bdea5aacf259013ed8cada0bc1d",
  }),
  role: "Test Role",
};
