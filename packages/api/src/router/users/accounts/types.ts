import type { zDiscordAccountPublic } from '@answeroverflow/db';
import type { z } from 'zod';

export type DiscordAccountPublic = z.infer<typeof zDiscordAccountPublic>;
