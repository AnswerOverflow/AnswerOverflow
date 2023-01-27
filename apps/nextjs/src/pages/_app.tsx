// src/pages/_app.tsx
import "../styles/globals.css";
import "highlight.js/styles/github.css";
import "highlight.js/styles/github-dark.css";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { AppType } from "next/app";
import hljs from "highlight.js";

import { NextTRPC, trpc } from "@answeroverflow/ui";
import { Footer, Navbar } from "@answeroverflow/ui";
import { useEffect } from "react";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  useEffect(() => {
    hljs.configure({
      ignoreUnescapedHTML: true, // TODO: Revisit this, discord-markdown escapes the HTML so it should be safe
    });
    hljs.highlightAll();
  }, []);
  return (
    <SessionProvider session={session}>
      <Navbar />
      {/* eslint-disable-next-line prettier/prettier */}
      <div className="scrollbar-hide mx-auto w-full max-w-screen-xl overflow-x-hidden overflow-y-scroll sm:px-4">
        <Component {...pageProps} />
      </div>

      <Footer />
    </SessionProvider>
  );
};
export default (trpc as NextTRPC).withTRPC(MyApp);
