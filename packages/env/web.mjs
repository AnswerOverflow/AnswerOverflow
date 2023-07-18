import { sharedEnvs, nodeEnv, sharedClientEnvs } from './shared.mjs';
import { createEnv } from '@t3-oss/env-nextjs';
import {z} from "zod";

export const webServerEnv = {
	...sharedEnvs,
};

export const webClientEnv = createEnv({
  client: {
    ...sharedClientEnvs,
    NEXT_PUBLIC_NODE_ENV: nodeEnv,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: z.string()
  },
  runtimeEnv: {
    ...process.env,
    NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV,
  },
})
