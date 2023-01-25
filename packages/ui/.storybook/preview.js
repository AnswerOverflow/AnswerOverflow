import "../src/styles/globals.css";
import { transformer } from "@answeroverflow/api/transformer";
import React, { useState } from "react";
import { trpc } from "../src/utils/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
const storybookTRPC = trpc;
export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}

export const globalTypes = {
  tailwindDarkmode: {
    name: 'Theme',
    description: 'Light/Dark mode for components',
    toolbar: {
      icon: 'mirror',
      dynamicTitle: true,
      items: ['light', 'dark']
    }
  }
};

const withTailwind = (Story, context) => {
  const { tailwindDarkmode } = context.globals;
  const isDark = tailwindDarkmode === 'dark';
  document.querySelector('html').classList.toggle('dark', isDark);
  document.querySelector('body').className = 'dark:bg-neutral-800';
  return Story();
}

export const decorators = [withTailwind,
(story) => {
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
    {story()}
  </QueryClientProvider>
  </storybookTRPC.Provider>

  )
}

];
