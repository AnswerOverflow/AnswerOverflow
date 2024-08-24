/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
import { NextConfig } from 'next';

const config: NextConfig = {
	reactStrictMode: true,
	i18n: {
		locales: ['en'],
		defaultLocale: 'en',
	},
};
export default config;
