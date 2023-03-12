/** @type {import("prettier").Config} */
// eslint-disable-next-line no-undef, @typescript-eslint/no-unsafe-assignment
module.exports = {
	// eslint-disable-next-line no-undef
	...require("@answeroverflow/prettier-config"),
	plugins: ["prettier-plugin-tailwindcss"],
	tailwindConfig: __dirname + "/tailwind.config.cjs"
};
