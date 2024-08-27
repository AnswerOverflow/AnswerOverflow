// uno.config.ts
import { defineConfig, presetWind } from 'unocss';
import transformerDirectives from '@unocss/transformer-directives';

export default defineConfig({
	presets: [presetWind({})],
	transformers: [
		transformerDirectives({
			applyVariable: ['--at-apply', '--uno-apply', '--uno'],
		}),
	],
	content: {
		filesystem: [
			'../../packages/ui/src/**/*.{js,ts,jsx,tsx}', // Transpile breaks without this for tailwind styles
			'./node_modules/@tremor/**/*.{js,ts,jsx,tsx}', // Tremor module,
		],
	},
	theme: {
		fontFamily: {
			header: 'var(--font-montserrat)',
			body: 'var(--font-source-sans-3)',
		},
		borderColor: {
			DEFAULT: 'hsl(var(--border))',
			border: 'hsl(var(--border))',
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
				background: 'hsl(var(--muted-background))',
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
		animation: {
			keyframes: {
				'accordion-down': `
          0% {
          height: 0;
          },
          100% {
          height: var(--radix-accordion-content-height);
          }
        `,
				'accordion-up': `
        0% {
        height: var(--radix-accordion-content-height);
        },
        100% {
        height: 0;
        }
        `,
			},
			durations: {
				'accordion-down': '0.2s',
				'accordion-up': '0.2s',
			},
			timingFns: {
				'accordion-down': 'ease-out',
				'accordion-up': 'ease-out',
			},
		},
		borderRadius: {
			standard: '5px',
			lg: 'var(--radius)',
			md: 'calc(var(--radius) - 2px)',
			sm: 'calc(var(--radius) - 4px)',
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
		container: {
			center: true,
			padding: '2rem',
		},
	},
});

/*
I couldn't find a way to add the following to the uno config.
visibility: ['group-hover'],
backgroundImage: () => ({
  'gradient-to-br-dark-glass':
    'linear-gradient(145.98deg, rgba(14, 18, 26, 0.75) -3.49%, rgba(17, 20, 28, 0.75) 108.92%);',
  'gradient-to-br-light-glass':
    'linear-gradient(145.98deg, rgba(183, 190, 206, 0.37) -3.49%, rgba(183, 190, 206, 0.1591) 108.92%);',
}),

container ->       screens: {
  '2xl': '1400px',
},

theme -> transparent: 'transparent',
theme -> current: 'currentColor',
*/
