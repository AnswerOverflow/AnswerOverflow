/* eslint-disable tailwindcss/no-custom-classname */
import { cva, type VariantProps } from 'cva';
import { Poppins } from 'next/font/google';
import { classNames, cn } from '~ui/utils/styling';
export const GitHubIcon = (props: React.SVGProps<SVGSVGElement>) => (
	<svg fill="currentColor" viewBox="0 0 24 24" {...props}>
		<path
			fillRule="evenodd"
			d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
			clipRule="evenodd"
		/>
	</svg>
);
const discordIconStyles = cva('', {
	variants: {
		color: {
			blurple:
				'dark:text-blue-400 text-[#5865F2] hover:text-[#7289DA] dark:hover:text-blue-300 transition-all',
			inherit: 'text-inherit',
			primary:
				'dark:text-neutral-200 dark:hover:text-neutral-400 text-neutral-800 hover:text-neutral-700 transition-all',
		},
		defaultVariants: {
			color: 'inherit',
		},
	},
});
export function DiscordIcon(
	props: React.SVGProps<SVGSVGElement> & VariantProps<typeof discordIconStyles>,
) {
	return (
		<svg
			fill="currentColor"
			viewBox="0 0 127.14 96.36"
			className={`${discordIconStyles({ color: props.color })} ${
				props.className ?? ''
			}`}
		>
			<path
				fillRule="evenodd"
				d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
				clipRule="evenodd"
			/>
		</svg>
	);
}
import * as React from 'react';

const poppins = Poppins({
	weight: ['400', '600'],
	subsets: ['latin'],
});
export function AnswerOverflowLogo({
	className,
	...props
}: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) {
	const Svg = () => (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 889.87 240.34"
			className={cn(
				`w-full fill-black stroke-black dark:fill-white dark:stroke-white`,
				className,
			)}
		>
			<defs>
				<style>{'.cls-3{letter-spacing:-.02em}'}</style>
			</defs>
			<g id="TEXT">
				<text
					transform="translate(41.82 122.17)"
					className={`${poppins.className} text-[98.04px]`}
				>
					<tspan x={0} y={0}>
						{'Answer'}
					</tspan>
				</text>
				<text
					transform="translate(407.69 124.15)"
					className={`${poppins.className} text-[100.71px] font-semibold`}
				>
					<tspan className="cls-3" x={0} y={0}>
						{'Ove'}
					</tspan>
					<tspan
						x={193.06}
						y={0}
						style={{
							letterSpacing: '.01em',
						}}
					>
						{'rf'}
					</tspan>
					<tspan className="cls-3" x={267.18} y={0}>
						{'low'}
					</tspan>
				</text>
			</g>
			<path
				d="M420.66 135.02v16.75c0 3.44-1.15 6.79-3.27 9.5a31.015 31.015 0 0 1-13.79 10.03c-3.01 1.1-6.19 1.66-9.4 1.66H162.01c-3.03 0-5.99.9-8.51 2.57L65.53 233.8c-.15.1-.35 0-.35-.19l.68-61.09s-.02-.04-.04-.04H32.46c-4.65 0-9.26-.84-13.62-2.48a21.612 21.612 0 0 1-9.61-7.18 13.548 13.548 0 0 1-2.73-8.15V29.42c0-4.23 1.19-8.37 3.42-11.96l.49-.79c2.29-3.67 5.76-6.44 9.84-7.87l.79-.28c3.87-1.35 7.94-2.04 12.05-2.04h363.14c2.64 0 5.28.32 7.84.95l1.91.47a19.34 19.34 0 0 1 10.86 7.16c2.43 3.22 3.75 7.15 3.78 11.18l.07 12.22"
				style={{
					strokeMiterlimit: 10,
					strokeWidth: 13,
					fill: 'none',
				}}
				id="Layer_4"
			/>
		</svg>
	);
	return (
		<div
			className={classNames(`max-h-sm w-40  md:w-56`, className ?? '')}
			{...props}
		>
			<Svg />
		</div>
	);
}
export const ExternalLinkIcon = () => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			className="h-4 w-4"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
			/>
		</svg>
	);
};
export const CloseIcon = () => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			className="h-6 w-6"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M6 18L18 6M6 6l12 12"
			/>
		</svg>
	);
};

import styles from './loading-dots.module.css';

interface LoadingDotsProps {
	color?: string;
}

export const LoadingDots = ({ color = '#000' }: LoadingDotsProps) => {
	return (
		<span className={styles.loading}>
			<span style={{ backgroundColor: color }} />
			<span style={{ backgroundColor: color }} />
			<span style={{ backgroundColor: color }} />
		</span>
	);
};
