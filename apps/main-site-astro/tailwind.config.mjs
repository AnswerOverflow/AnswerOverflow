/** @type {import("tailwindcss").Config} */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const data = require('@answeroverflow/tailwind-config');
module.exports = {
	...data,
	content: [
		...data.content,
		'../../packages/ui/src/**/*.{js,ts,jsx,tsx}', // Transpile breaks without this for tailwind styles
		'./content/**/*.mdx',
		'./**/*.astro',
	],
	plugins: [require('@tailwindcss/typography')],
};
