import prettierConfig from '@answeroverflow/prettier-config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("prettier").Config} */
export default {
	...prettierConfig,
	plugins: ['prettier-plugin-tailwindcss'],
	tailwindConfig: __dirname + '/tailwind.config.cjs',
};
