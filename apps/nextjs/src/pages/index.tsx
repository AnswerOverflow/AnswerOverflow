import type { NextPage } from "next";
import Head from "next/head";
import { signIn, signOut } from "next-auth/react";
import { trpc } from "../utils/trpc";
import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@answeroverflow/api";
import { ServerInvite } from "@answeroverflow/ui";
const ServerCard: React.FC<{
  server: Exclude<inferProcedureOutput<AppRouter["auth"]["getServers"]>, null | undefined>[0];
}> = ({ server }) => {
  return <ServerInvite server={server} is_user_in_server={false} />;
};

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Answer Overflow</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex h-screen flex-col items-center  text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-8">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Answer <span className="text-[hsl(280,100%,70%)]">Overflow</span>
          </h1>
          <AuthShowcase />
        </div>
      </main>
    </>
  );
};

export default Home;

const AuthShowcase: React.FC = () => {
  const { data: session } = trpc.auth.getSession.useQuery();

  const { data: secretMessage } = trpc.auth.getSecretMessage.useQuery(
    undefined, // no input
    { enabled: !!session?.user }
  );

  const { data: servers } = trpc.auth.getServers.useQuery();
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {session?.user && (
        <p className="text-center text-2xl text-white">
          {session && <span>Logged in as {session?.user?.name}</span>}
          {secretMessage && <span> - {secretMessage}</span>}
        </p>
      )}
      <button
        className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onClick={session ? () => signOut() : () => signIn()}
      >
        {session ? "Sign out" : "Sign in"}
      </button>
      <div className="grid max-h-[70vh] grid-cols-4 gap-4 overflow-y-scroll">
        {servers?.map((server) => {
          return <ServerCard server={server} key={server.id} />;
        })}
      </div>
    </div>
  );
};
