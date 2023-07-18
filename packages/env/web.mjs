import { sharedEnvs, nodeEnv } from './shared.mjs';
import { createEnv } from '@t3-oss/env-nextjs';

export const webServerEnv = {
	...sharedEnvs,
};

export const webClientEnv = createEnv({
  client: {
    NEXT_PUBLIC_NODE_ENV: nodeEnv,
  },
  runtimeEnv: {
    ...process.env,
    NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV,
  },
})
