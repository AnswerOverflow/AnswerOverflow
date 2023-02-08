import type { ReactRenderer } from "@storybook/react";
import type { Args, PartialStoryFn, StoryContext } from "@storybook/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { transformer } from "@answeroverflow/api/transformer";
import React, { useEffect, useState } from "react";
import { trpc, StorybookTRPC } from "./trpc";
import hljs from "highlight.js";
import { toggleDarkTheme } from "./theme";

const storybook_trpc = trpc as StorybookTRPC;
type Globals = {
  tailwind_theme: "dark" | "light" | "both";
  auth_state: "signed_in" | "signed_out";
};

export function WithTailwindTheme(
  Story: PartialStoryFn<ReactRenderer, Args>,
  context: StoryContext<ReactRenderer, Args>
) {
  function Flex(props: any) {
    return (
      <div
        {...props}
        style={{
          flexDirection: "center",
          padding: "2rem 0 2rem",
        }}
      />
    );
  }

  const { tailwind_theme } = context.globals as Globals;
  toggleDarkTheme(tailwind_theme === "dark");
  const Dark = () => (
    // eslint-disable-next-line tailwindcss/no-custom-classname
    <Flex className="dark bg-neutral-800">
      <Story />
    </Flex>
  );

  if (tailwind_theme === "dark") {
    return <Dark />;
  }

  const Light = () => (
    <Flex className="bg-white">
      <Story />
    </Flex>
  );

  if (tailwind_theme === "light") {
    return <Light />;
  }
  return (
    <div>
      <Dark />
      <Light />
    </div>
  );
}

export function WithAuth(
  Story: PartialStoryFn<ReactRenderer, Args>,
  context: StoryContext<ReactRenderer, Args>
) {
  const { auth_state } = context.globals as Globals;
  const [query_client] = useState(() => new QueryClient());
  const [trpc_client, setTRPCClient] = useState(
    storybook_trpc.createClient({
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
  useEffect(() => {
    query_client.clear();
    const trpc_client = storybook_trpc.createClient({
      links: [
        httpBatchLink({
          url: "http://localhost:3000/api/trpc",
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: auth_state === "signed_in" ? "include" : "omit",
            });
          },
        }),
      ],
      transformer,
    });
    console.log("auth_state", auth_state);
    setTRPCClient(trpc_client);
  }, [auth_state, setTRPCClient, query_client]);
  return (
    <storybook_trpc.Provider client={trpc_client} queryClient={query_client}>
      <QueryClientProvider client={query_client}>{Story()}</QueryClientProvider>
    </storybook_trpc.Provider>
  );
}

export function WithHighlightJS(Story: PartialStoryFn<ReactRenderer, Args>) {
  useEffect(() => {
    hljs.highlightAll();
  }, []);
  return <Story />;
}
