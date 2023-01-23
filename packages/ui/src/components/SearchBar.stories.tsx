import type { ComponentStory, Meta } from "@storybook/react";

import { SearchBar, SearchBarProps } from "./SearchBar";
export default {
  component: SearchBar,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: ComponentStory<typeof SearchBar> = (args: SearchBarProps) => (
  <SearchBar {...args} />
);

//👇 Each story then reuses that template
const default_message: SearchBarProps = {
  placeholder: "Search for anything",
};

export const Primary = Template.bind({});
Primary.args = default_message;
