// src/pages/_app.tsx
import "../styles/globals.css";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { AppType } from "next/app";

import { trpc } from "../utils/trpc";
import { Footer, Navbar } from "@answeroverflow/ui";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <SessionProvider session={session}>
      <Navbar />
      <div className="mx-auto w-full max-w-screen-xl px-4">
        <Component {...pageProps} />
      </div>

      <Footer />
    </SessionProvider>
  );
};
export default trpc.withTRPC(MyApp);
