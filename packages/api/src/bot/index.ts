import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

// eslint-disable-next-line @typescript-eslint/ban-types
type BotContext = {};

const t = initTRPC.context<BotContext>().create({
	transformer: superjson,
	errorFormatter({ shape }) {
		return shape;
	},
	defaultMeta: {
		tenantAuthAccessible: false,
	},
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const botRouter = router({
	hello: publicProcedure.query(() => 'Hello, world!'),
});

export type BotRouter = typeof botRouter;
