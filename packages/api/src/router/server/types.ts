import type { zServerPublic } from '@answeroverflow/db';
import type { z } from 'zod';

export type ServerPublic = z.infer<typeof zServerPublic>;
