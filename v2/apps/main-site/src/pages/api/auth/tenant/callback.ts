import type { NextApiRequest, NextApiResponse } from "next";
// eslint-disable-next-line no-restricted-imports
import { setCookie } from "../../../../../../../node_modules/next-auth/next/utils";
import { Auth } from "@answeroverflow/core/auth";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const redirect = (req.query.redirect as string) ?? "/";
  // ?code=...
  const token = req.query.code;
  if (!token) {
    res.status(400);
    return;
  }
  // set the answeroverflow.tenant.token cookie
  setCookie(res, {
    name: Auth.getTenantCookieName(),
    options: Auth.getTenantCookieOptions(),
    value: token as string,
  });
  // redirect to the original redirect
  res.redirect(redirect);
  return;
}
