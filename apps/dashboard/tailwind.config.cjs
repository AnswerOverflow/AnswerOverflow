const data = require('@answeroverflow/ui/tailwind-config');

/** @type {import("tailwindcss").Config} */
module.exports = {
	...data,
	content: [
		...data.content,
		'../../packages/ui/src/**/*.{js,ts,jsx,tsx}', // Transpile breaks without this for tailwind styles
		'../../node_modules/@tremor/**/*.{js,ts,jsx,tsx}', // Tremor module
	],
	theme: {
		...data.theme,
		extend: {
			...data.theme.extend,
			colors: {
				...data.theme.extend.colors,
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
						DEFAULT: 'hsl(var(--primary))',
						emphasis: '#60a5fa', // blue-400
						inverted: '#030712', // gray-950
					},
					background: {
						muted: 'hsl(var(--muted))',
						subtle: 'hsl(var(--muted-foreground))',
						DEFAULT: 'hsl(var(--background))',
						emphasis: '#d1d5db', // gray-300
					},
					border: {
						DEFAULT: 'hsl(var(--border))',
					},
					ring: {
						DEFAULT: 'hsl(var(--ring))',
					},
					content: {
						subtle: 'hsl(var(--muted-foreground))',
						DEFAULT: 'hsl(var(--foreground))',
						emphasis: 'hsl(var(--foreground))',
						strong: 'hsl(var(--foreground))',
						inverted: '#000000', // black
					},
				},
			},
			boxShadow: {
				...data.theme.extend.boxShadow,
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
				...data.theme.extend.borderRadius,
				'tremor-small': '0.375rem',
				'tremor-default': '0.5rem',
				'tremor-full': '9999px',
				standard: '5px',
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
			fontSize: {
				...data.theme.extend.fontSize,
				'tremor-label': ['0.75rem'],
				'tremor-default': ['0.875rem', { lineHeight: '1.25rem' }],
				'tremor-title': ['1.125rem', { lineHeight: '1.75rem' }],
				'tremor-metric': ['1.875rem', { lineHeight: '2.25rem' }],
			},
		},
	},
	plugins: [...data.plugins, require('@headlessui/tailwindcss')],
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
};
