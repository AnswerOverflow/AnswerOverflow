import { appRouter, createContext } from "@answeroverflow/api";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

const handler = (req: Request) =>
  fetchRequestHandler({
    req,
    router: appRouter,
    endpoint: "/api/trpc",
    createContext: createContext,
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
