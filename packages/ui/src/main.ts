import path from 'path'; // 👈 import path
import type { StorybookConfig } from '@storybook/nextjs'; // or whatever framework you're using
import postcss from 'postcss';
const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
	addons: [
		'@storybook/addon-links',
		'@storybook/addon-essentials',
		'@storybook/addon-interactions',
		'@storybook/addon-a11y',
		{
			name: '@storybook/addon-styling',
			options: {
				postCss: {
					implementation: postcss,
				},
			},
		},
	],
	framework: {
		name: '@storybook/nextjs',
		// Add this
		options: {},
	},
	webpackFinal: (config) => {
		config.resolve!.alias = {
			...config.resolve!.alias,
			'~ui/test': path.resolve(__dirname, '../test/'),
			'~ui': path.resolve(__dirname, '../src/'),
		};
		return config;
	},
	staticDirs: ['../../../apps/main-site/public'],
	typescript: {
		check: false,
		checkOptions: {},
		reactDocgen: false,
		reactDocgenTypescriptOptions: {
			shouldExtractLiteralValuesFromEnum: true,
			propFilter: (prop) =>
				prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
		},
	},
	docs: {
		autodocs: false,
	},
};
export default config;
