/** @type {import("tailwindcss").Config} */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const data = require('@answeroverflow/tailwind-config');
module.exports = {
	...data,
	content: [
		...data.content,
		'../../node_modules/@tremor/**/*.{js,ts,jsx,tsx}', // Tremor module
	],
};
