import { createTRPCReact } from '@trpc/react-query';

import { type AppRouter } from '@answeroverflow/api';

export const trpc = createTRPCReact<AppRouter>({});
