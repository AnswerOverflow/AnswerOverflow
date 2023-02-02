import type { Meta, StoryFn } from "@storybook/react";
import { Button, ButtonProps } from "./Button";

export default {
  component: Button,
  // Custom story name
  title: "newComps/Button",
} as Meta<typeof Button>;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof Button> = (props: ButtonProps) => <Button {...props} />;

export const ButtonPrimary = Template.bind({});
ButtonPrimary.args = {
  text: "Primary",
  type: "solid",
  color: "black",
};
