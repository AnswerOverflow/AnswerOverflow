/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable no-undef */
// 🤮
const { getStoryContext } = require('@storybook/test-runner');
const { injectAxe, checkA11y, configureAxe } = require('axe-playwright');

module.exports = {
	setup() {
		jest.setTimeout(15000);
	},

	async preRender(page) {
		await injectAxe(page);
	},
	async postRender(page, context) {
		// Get entire context of a story, including parameters, args, argTypes, etc.
		const storyContext = await getStoryContext(page, context);

		// Do not test a11y for stories that disable a11y
		if (storyContext.parameters?.a11y?.disable) {
			return;
		}

		// Apply story-level a11y rules
		await configureAxe(page, {
			rules: storyContext.parameters?.a11y?.config?.rules,
		});

		// from Storybook 7.0 onwards, the selector should be #storybook-root
		await checkA11y(page, '#storybook-root', {
			detailedReport: true,
			detailedReportOptions: {
				html: true,
			},
			// pass axe options defined in @storybook/addon-a11y
			axeOptions: storyContext.parameters?.a11y?.options,
		});
	},
};
