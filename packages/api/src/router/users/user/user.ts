import { z } from "zod";
import { MergeRouters, publicProcedure, router } from "~api/router/trpc";

export const userCreateInput = z.object({ name: z.string(), id: z.string() });

const userModifyRouter = router({
	create: publicProcedure.input(userCreateInput).mutation(({ ctx, input }) => {
		return ctx.prisma.user.create({
			data: {
				...input
			}
		});
	}),
	update: publicProcedure
		.input(z.object({ name: z.string(), id: z.string() }))
		.mutation(({ ctx, input }) => {
			return ctx.prisma.user.update({
				where: { id: input.id },
				data: {
					name: input.name
				}
			});
		})
});

const userFindRouter = router({
	all: publicProcedure.query(({ ctx }) => {
		return ctx.prisma.user.findMany();
	}),
	byId: publicProcedure.input(z.string()).query(({ ctx, input }) => {
		return ctx.prisma.user.findFirst({ where: { id: input } });
	})
});

const userUpsertRouter = router({
	upsert: publicProcedure.input(userCreateInput).mutation(async ({ ctx, input }) => {
		const userFetch = userFindRouter.createCaller(ctx);
		const userUpdateCreate = userModifyRouter.createCaller(ctx);
		let existingUser = await userFetch.byId(input.id);
		if (!existingUser) {
			existingUser = await userUpdateCreate.create(input);
		}
		return userUpdateCreate.update({ id: existingUser.id, name: input.name });
	})
});

export const userRouter = MergeRouters(userFindRouter, userUpsertRouter);
