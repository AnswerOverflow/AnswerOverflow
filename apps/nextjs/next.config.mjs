// @ts-check
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
// @ts-ignore
!process.env.SKIP_ENV_VALIDATION && (await import('./src/env/server.mjs'));
const nextJSMDX = await import('@next/mdx');
import remarkGfm from 'remark-gfm';

const withMDX = nextJSMDX.default({
	extension: /\.mdx?$/,
	options: {
		// If you use remark-gfm, you'll need to use next.config.mjs
		// as the package is ESM only
		// https://github.com/remarkjs/remark-gfm#install
		remarkPlugins: [remarkGfm],
		rehypePlugins: [],
		// If you use `MDXProvider`, uncomment the following line.
		providerImportSource: '@mdx-js/react',
	},
});

/** @type {import("next").NextConfig} */
const config = {
	reactStrictMode: true,
	swcMinify: true,
	pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
	transpilePackages: [
		'@answeroverflow/api',
		'@answeroverflow/auth',
		'@answeroverflow/db',
		'@answeroverflow/tailwind-config',
		'@answeroverflow/ui',
	],
	images: {
		domains: ['cdn.discordapp.com'],
	},
	// We already do linting on GH actions
	eslint: {
		ignoreDuringBuilds: !!process.env.CI,
	},
};

export default withMDX(config);
