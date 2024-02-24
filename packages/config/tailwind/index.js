/** @type {import('tailwindcss').Config} */

// eslint-disable-next-line no-undef
module.exports = {
	content: ['./src/**/*.{ts,tsx}'],
	theme: {
		transparent: 'transparent',
		current: 'currentColor',
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			fontFamily: {
				header: ['var(--font-montserrat)'],
				body: ['var(--font-source-sans-3)'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
				},
				'ao-blue': {
					DEFAULT: 'hsl(var(--ao-blue))',
					foreground: 'hsl(var(--ao-blue))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
					foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
				},
				highlight: {
					DEFAULT: 'hsl(var(--highlight) / <alpha-value>)',
					foreground: 'hsl(var(--highlight-foreground) / <alpha-value>)',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
			},
			keyframes: {
				'accordion-down': {
					from: { height: 0 },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: 0 },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
			},

			borderRadius: {
				standard: '5px',
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
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
				'screen-3xl': '2000px',
			},
			width: {
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
			height: {
				vh10: '10vh',
				vh20: '20vh',
				vh30: '30vh',
				vh40: '40vh',
				vh50: '50vh',
				vh60: '60vh',
				vh70: '70vh',
				vh80: '80vh',
				vh90: '90vh',
				vh100: '100vh',
			},
			maxHeight: {
				vh10: '10vh',
				vh20: '20vh',
				vh30: '30vh',
				vh40: '40vh',
				vh50: '50vh',
				vh60: '60vh',
				vh70: '70vh',
				vh80: '80vh',
				vh90: '90vh',
				vh100: '100vh',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
	darkMode: 'class',
};
