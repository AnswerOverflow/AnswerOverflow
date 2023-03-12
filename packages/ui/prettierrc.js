/** @type {import("prettier").Config} */
// eslint-disable-next-line no-undef
module.exports = {
	...require("@answeroverflow/prettier-config"),
	plugins: ["prettier-plugin-tailwindcss"],
	tailwindConfig: __dirname + "/tailwind.config.cjs"
};
