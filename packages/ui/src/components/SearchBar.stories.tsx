import type { StoryFn, Meta } from "@storybook/react";

import { SearchBar, SearchBarProps } from "./SearchBar";
export default {
  component: SearchBar,
} as Meta;

//👇 Each story then reuses that template
const defaultMessage: SearchBarProps = {
  placeholder: "Search for anything",
};

export const Primary = {
  args: defaultMessage,
};
