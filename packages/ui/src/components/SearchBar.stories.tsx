import type { Meta, StoryObj } from "@storybook/react";

import { SearchBar, SearchBarProps } from "./SearchBar";
const meta = {
	component: SearchBar
} as Meta<typeof SearchBar>;

export default meta;

type Story = StoryObj<typeof meta>;

//👇 Each story then reuses that template
const defaultMessage: SearchBarProps = {
	placeholder: "Search for anything"
};

export const Primary: Story = {
	args: defaultMessage
};
