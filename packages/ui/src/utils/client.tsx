import { createTRPCReact } from '@trpc/react-query';

import { type AppRouter } from '@answeroverflow/api/index';

export const trpc = createTRPCReact<AppRouter>({});
