import type { Meta, StoryFn } from "@storybook/react";

import { GooglePage, GooglePageProps } from "./GooglePage/GooglePage";
export default {
  component: GooglePage,
} as Meta;

export const Primary = {
  args: {
    result: {
      url: "https://www.answeroverflow.com > ...",
      title: "How do I index my discord channels into google?",
      description: `How do I index my discord channels into google? How do I index my discord channels into google? How do I index my discord channels into google?`,
    },
  },
};
