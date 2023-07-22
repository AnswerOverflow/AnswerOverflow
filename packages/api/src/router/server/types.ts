import type { zServerPublic } from '@answeroverflow/db';
import { inferProcedureOutput } from '@trpc/server';
import type { z } from 'zod';
import { serverRouter } from './server';

export type ServerPublic = z.infer<typeof zServerPublic>;
export type ServerDashboard = inferProcedureOutput<
	(typeof serverRouter)['fetchDashboardById']
>;
