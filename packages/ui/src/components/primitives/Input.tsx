import * as React from 'react';
import { cn } from '~ui/utils/styling';
import { Button } from './Button';
export interface InputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, ...props }, ref) => {
		return (
			<input
				className={cn(
					'flex h-10 w-full rounded-md border border-slate-300 bg-transparent py-2 px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-50 dark:focus:ring-slate-400 dark:focus:ring-offset-slate-900',
					className,
				)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Input.displayName = 'Input';

export { Input };

const SearchIcon = () => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			className="h-5 w-5"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
			/>
		</svg>
	);
};

export function SearchInput(props: InputProps) {
	const { className, ...inputProps } = props;
	return (
		<div className={cn('flex w-full items-center space-x-2', className)}>
			<Input className="bg-inherit" {...inputProps} />
			<Button aria-label="Search" className="bg-inherit">
				<SearchIcon />
			</Button>
		</div>
	);
}
