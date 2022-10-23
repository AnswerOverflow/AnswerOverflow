// src/pages/_app.tsx
import "../styles/globals.css";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { AppType } from "next/app";
import { trpc } from "../utils/trpc";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  const AnyComponent = Component as any; // Fix type errors on component, TODO: Revisit and see why failing
  return (
    <SessionProvider session={session}>
      <AnyComponent {...pageProps} />
    </SessionProvider>
  );
};

export default trpc.withTRPC(MyApp);
