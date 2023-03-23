/** @type {import('tailwindcss').Config} */

// eslint-disable-next-line no-undef
module.exports = {
	content: ['./src/**/*.{ts,tsx}', './src/_app.tsx'],
	plugins: [
		// eslint-disable-next-line no-undef
		require('@tailwindcss/forms'),
		// eslint-disable-next-line no-undef
		require('tailwind-scrollbar-hide'),
		// eslint-disable-next-line no-undef
		require('tailwind-scrollbar'),
	],
	theme: {
		extend: {
			fontFamily: {
				mono: ['var(--font-poppins)'],
				discord: ['Noto Sans', 'sans-serif'],
				header: ['Montserrat', 'sans-serif'],
				body: ['Source Sans Pro', 'sans-serif'],
			},
			colors: {
				ao: {
					white: '#F5F8FF',
					black: '#141619',
					blue: '#396FF8',
					green: '#4BB543',
					yellow: '#DECB33',
					red: '#DE3D33',
				},
			},
			borderWidth: {
				1: '1px',
			},
			visibility: ['group-hover'],
			// Custom linear gradient
			backgroundImage: () => ({
				'gradient-to-br-dark-glass':
					'linear-gradient(145.98deg, rgba(14, 18, 26, 0.75) -3.49%, rgba(17, 20, 28, 0.75) 108.92%);',
				'gradient-to-br-light-glass':
					'linear-gradient(145.98deg, rgba(183, 190, 206, 0.37) -3.49%, rgba(183, 190, 206, 0.1591) 108.92%);',
			}),
			borderRadius: {
				standard: '5px',
			},
			maxWidth: {
				vw10: '10vw',
				vw20: '20vw',
				vw30: '30vw',
				vw40: '40vw',
				vw50: '50vw',
				vw60: '60vw',
				vw70: '70vw',
				vw80: '80vw',
				vw90: '90vw',
				vw100: '100vw',
			},
		},
	},

	darkMode: 'class',
};
