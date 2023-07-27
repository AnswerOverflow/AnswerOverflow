/** @type {import('tailwindcss').Config} */

// eslint-disable-next-line no-undef
module.exports = {
	content: [
		'./src/**/*.{ts,tsx}',
		'./src/_app.tsx',
		'./node_modules/@tremor/**/*.{js,ts,jsx,tsx}', // Tremor module
		'../../node_modules/@tremor/**/*.{js,ts,jsx,tsx}', // Tremor module
	],
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
				discord: ['Noto Sans', 'sans-serif'],
				header: ['Montserrat', 'sans-serif'],
				body: ['Source Sans Pro', 'sans-serif'],
			},
			colors: {
				border: 'var(--border)',
				input: 'var(--input)',
				ring: 'var(--ring)',
				background: 'var(--background)',
				foreground: 'var(--foreground)',
				primary: {
					DEFAULT: 'var(--primary)',
					foreground: 'var(--primary-foreground)',
				},
				secondary: {
					DEFAULT: 'var(--secondary)',
					foreground: 'var(--secondary-foreground)',
				},
				destructive: {
					DEFAULT: 'var(--destructive) / <alpha-value>',
					foreground: 'var(--destructive-foreground) / <alpha-value>',
				},
				muted: {
					DEFAULT: 'var(--muted)',
					foreground: 'var(--muted-foreground)',
				},
				accent: {
					DEFAULT: 'var(--accent)',
					foreground: 'var(--accent-foreground)',
				},
				highlight: {
					DEFAULT: 'var(--highlight)',
					foreground: 'var(--highlight-foreground)',
				},
				popover: {
					DEFAULT: 'var(--popover)',
					foreground: 'var(--popover-foreground)',
				},
				card: {
					DEFAULT: 'var(--card)',
					foreground: 'var(--card-foreground)',
				},
				// light mode
				tremor: {
					brand: {
						faint: '#eff6ff', // blue-50
						muted: '#bfdbfe', // blue-200
						subtle: '#60a5fa', // blue-400
						DEFAULT: '#3b82f6', // blue-500
						emphasis: '#1d4ed8', // blue-700
						inverted: '#ffffff', // white
					},
					background: {
						muted: '#f9fafb', // gray-50
						subtle: '#f3f4f6', // gray-100
						DEFAULT: '#ffffff', // white
						emphasis: '#374151', // gray-700
					},
					border: {
						DEFAULT: '#e5e7eb', // gray-200
					},
					ring: {
						DEFAULT: '#e5e7eb', // gray-200
					},
					content: {
						subtle: '#9ca3af', // gray-400
						DEFAULT: '#6b7280', // gray-500
						emphasis: '#374151', // gray-700
						strong: '#111827', // gray-900
						inverted: '#ffffff', // white
					},
				},
				// dark mode
				'dark-tremor': {
					brand: {
						faint: '#0B1229', // custom
						muted: '#172554', // blue-950
						subtle: '#1e40af', // blue-800
						DEFAULT: 'var(--primary)',
						emphasis: '#60a5fa', // blue-400
						inverted: '#030712', // gray-950
					},
					background: {
						muted: 'var(--muted)',
						subtle: 'var(--foreground)',
						DEFAULT: 'var(--background)',
						emphasis: '#d1d5db', // gray-300
					},
					border: {
						DEFAULT: 'var(--border)',
					},
					ring: {
						DEFAULT: 'var(--ring)',
					},
					content: {
						subtle: '#4b5563', // gray-600
						DEFAULT: '#6b7280', // gray-600
						emphasis: '#e5e7eb', // gray-200
						strong: '#f9fafb', // gray-50
						inverted: '#000000', // black
					},
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
			boxShadow: {
				// light
				'tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
				'tremor-card':
					'0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
				'tremor-dropdown':
					'0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
				// dark
				'dark-tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
				'dark-tremor-card':
					'0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
				'dark-tremor-dropdown':
					'0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
			},
			borderRadius: {
				'tremor-small': '0.375rem',
				'tremor-default': '0.5rem',
				'tremor-full': '9999px',
				standard: '5px',
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
			fontSize: {
				'tremor-label': ['0.75rem'],
				'tremor-default': ['0.875rem', { lineHeight: '1.25rem' }],
				'tremor-title': ['1.125rem', { lineHeight: '1.75rem' }],
				'tremor-metric': ['1.875rem', { lineHeight: '2.25rem' }],
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
	plugins: [
		// eslint-disable-next-line no-undef
		require('@tailwindcss/forms'),
		// eslint-disable-next-line no-undef
		require('tailwind-scrollbar-hide'),
		require('@headlessui/tailwindcss'),
		require('tailwindcss-animate'),
	],
	safelist: [
		{
			pattern:
				/^(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
			variants: ['hover', 'ui-selected'],
		},
		{
			pattern:
				/^(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
			variants: ['hover', 'ui-selected'],
		},
		{
			pattern:
				/^(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
			variants: ['hover', 'ui-selected'],
		},
		{
			pattern:
				/^(ring-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
		},
		{
			pattern:
				/^(stroke-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
		},
		{
			pattern:
				/^(fill-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
		},
	],

	darkMode: 'class',
};
