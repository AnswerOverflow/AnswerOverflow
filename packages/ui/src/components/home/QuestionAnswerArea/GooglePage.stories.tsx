import type { Meta, StoryFn } from "@storybook/react";

import { GooglePage, GooglePageProps } from "./GooglePage/GooglePage";
export default {
  component: GooglePage,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof GooglePage> = (props: GooglePageProps) => <GooglePage {...props} />;

//👇 Each story then reuses that template

export const Primary = Template.bind({});
Primary.args = {
  result: {
    url: "https://www.answeroverflow.com > ...",
    title: "How do I index my discord channels into google?",
    description: `How do I index my discord channels into google? How do I index my discord channels into google? How do I index my discord channels into google?`,
  },
};
