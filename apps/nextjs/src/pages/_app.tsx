// src/pages/_app.tsx
import "../styles/globals.css";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { AppType } from "next/app";

import { NextTRPC, trpc } from "@answeroverflow/ui";
import { Footer, Navbar } from "@answeroverflow/ui";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <SessionProvider session={session}>
      <Navbar />
      <div className="mx-auto w-full max-w-screen-2xl px-4">
        <Component {...pageProps} />
      </div>

      <Footer />
    </SessionProvider>
  );
};
export default (trpc as NextTRPC).withTRPC(MyApp);
