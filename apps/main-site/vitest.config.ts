// eslint-disable-next-line no-restricted-imports
import { createVitestConfig } from '../../scripts/vitest.config';

export default createVitestConfig({
	envDir: '../../',
	test: {
		environment: 'edge-runtime',
		globalSetup: './__tests__/setup.ts',
	},
});
