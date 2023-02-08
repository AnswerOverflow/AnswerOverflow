import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import { unstable_getServerSession } from "next-auth";

import { auth_options } from "./auth-options";

export const GetServerSession = async (
  ctx:
    | {
        req: GetServerSidePropsContext["req"];
        res: GetServerSidePropsContext["res"];
      }
    | { req: NextApiRequest; res: NextApiResponse }
) => {
  return await unstable_getServerSession(ctx.req, ctx.res, auth_options);
};
