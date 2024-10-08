/** @type {import("tailwindcss").Config} */

const data = require('@answeroverflow/tailwind-config');
module.exports = {
	...data,
	content: [
		...data.content,
		'../../packages/ui/src/**/*.{js,ts,jsx,tsx}', // Transpile breaks without this for tailwind styles
		'./content/**/*.mdx',
	],
	plugins: [require('@tailwindcss/typography')],
};
