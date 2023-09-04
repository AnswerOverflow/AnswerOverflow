import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { connect } from '@planetscale/database';
import { sharedEnvs } from '@answeroverflow/env/shared';
import * as schema from './src/schema';

const connection = connect({
	url: sharedEnvs.DATABASE_URL,
});

export const db = drizzle(connection, {
	schema,
});

export * from './src/schema';
export * from './src/channel';
export * from './src/server';
export * from './src/user-server-settings';
export * from './src/message';

// Zod Schemas
export * from './src/zodSchemas/channelSchemas';
export * from './src/zodSchemas/serverSchemas';
export * from './src/zodSchemas/discordAccountSchemas';
export * from './src/zodSchemas/userServerSettingsSchemas';

// Utils
export * from './src/utils/anonymization';
export * from './src/utils/bitfieldUtils';
export * from './src/utils/channelUtils';
export * from './src/utils/discordAccountUtils';
export * from './src/utils/error';
export * from './src/utils/operations';
export * from './src/utils/serverUtils';
export * from './src/utils/userServerSettingsUtils';
