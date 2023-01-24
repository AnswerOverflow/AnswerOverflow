import { createNextApiHandler } from "@trpc/server/adapters/next";
import { createContext } from "@answeroverflow/api";
import { appRouter } from "@answeroverflow/api";
import type { NextApiRequest, NextApiResponse } from "next";

// create the API handler, but don't return it yet
const nextApiHandler = createNextApiHandler({
  router: appRouter,
  createContext,
});

// @see https://nextjs.org/docs/api-routes/introduction
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Modify `req` and `res` objects here
  // In this case, we are enabling CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Request-Method", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    return res.end();
  }

  // pass the (modified) req/res to the handler
  return nextApiHandler(req, res);
}
