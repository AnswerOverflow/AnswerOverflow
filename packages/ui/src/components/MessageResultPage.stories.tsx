import type { StoryFn, Meta } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { mockChannel, mockMessageWithDiscordAccount, mockServer } from "~ui/test/props";
import { StorybookTRPC, trpc } from "../utils";
import React, { useState } from "react";
import { MessageResultPage, MessageResultPageProps } from "./MessageResultPage";
export default {
  component: MessageResultPage,
} as Meta;
import { transformer } from "@answeroverflow/api/transformer";
const storybookTRPC = trpc as StorybookTRPC;
//👇 We create a “template” of how args map to rendering
const Template: StoryFn<typeof MessageResultPage> = (args: MessageResultPageProps) => {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    storybookTRPC.createClient({
      links: [
        httpBatchLink({
          url: "http://localhost:3000/api/trpc",
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
        }),
      ],
      transformer,
    })
  );
  return (
    <storybookTRPC.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <MessageResultPage {...args} />
      </QueryClientProvider>
    </storybookTRPC.Provider>
  );
};

//👇 Each story then reuses that template
const default_message: MessageResultPageProps = {
  messages: [
    mockMessageWithDiscordAccount(),
    mockMessageWithDiscordAccount(),
    mockMessageWithDiscordAccount(),
    mockMessageWithDiscordAccount(),
    mockMessageWithDiscordAccount(),
    mockMessageWithDiscordAccount(),
    mockMessageWithDiscordAccount(),
    mockMessageWithDiscordAccount(),
  ],
  channel: mockChannel(),
  server: mockServer(),
};

export const Primary = Template.bind({});
Primary.args = default_message;
