/* eslint-disable tailwindcss/no-custom-classname */
import * as React from 'react';
import { classNames } from '~ui/utils/styling';

export function AnswerOverflowLogo({
	className,
	...props
}: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) {
	const Svg = () => (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 889.87 240.34"
			className={`w-full fill-black stroke-black dark:fill-white dark:stroke-white`}
		>
			<defs>
				<style>{'.cls-3{letter-spacing:-.02em}'}</style>
			</defs>
			<g id="TEXT">
				<text
					transform="translate(41.82 122.17)"
					style={{
						fontFamily: 'Poppins-Regular,Poppins',
						fontSize: '98.04px',
					}}
				>
					<tspan x={0} y={0}>
						{'Answer'}
					</tspan>
				</text>
				<text
					transform="translate(407.69 124.15)"
					style={{
						fontFamily: 'Poppins-Medium,Poppins',
						fontSize: '100.71px',
						fontWeight: 'bold',
					}}
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
