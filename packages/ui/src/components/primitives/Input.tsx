import type React from 'react';

interface BaseInputProps {
	placeholder?: string;
	fill?: boolean;
	onChange: (text: string) => void;
}

// Add children if type is buttonInput
interface ButtonInputProps extends React.PropsWithChildren<BaseInputProps> {
	type: 'buttonInput';
	buttonAria: string;
}

// Add type if type is not buttonInput
interface NormalInputProps extends BaseInputProps {
	type?: 'text';
}

// Discriminated union
type InputProps = ButtonInputProps | NormalInputProps;

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

const InputText = ({ placeholder, fill, onChange }: InputProps) => {
	return (
		<input
			type="text"
			placeholder={placeholder}
			onChange={(e) => onChange(e.target.value)}
			className={`rounded-standard border-1 border-[#889AB2] bg-[#F5F6FA] py-3 font-body font-normal text-ao-black focus:border-transparent focus:outline-transparent focus:ring-2 focus:ring-ao-blue dark:border-[#525A66] dark:bg-[#181B1F] dark:text-ao-white ${
				fill ? 'w-full' : ''
			}`}
		/>
	);
};

const InputButton = ({
	children,
	buttonAria,
}: Omit<ButtonInputProps, 'type'>) => {
	return (
		<button
			className="absolute right-5 top-1/2 -translate-y-1/2 rounded-standard border-1 border-[#889AB2] px-4 py-1 font-body font-semibold hover:bg-[#f1f3f7] dark:border-0 dark:bg-[#272C33] dark:text-ao-white dark:hover:bg-[#2f343b]"
			aria-label={buttonAria}
		>
			{children}
		</button>
	);
};

// It is not suitable to destructure here, due to the discriminated types
export const SearchInput = (props: InputProps) => {
	return (
		<>
			{props.type === 'buttonInput' ? (
				<div className={`relative inline-block ${props.fill ? 'w-full' : ''}`}>
					<InputText
						onChange={props.onChange}
						placeholder={props.placeholder}
						fill={props.fill}
					/>
					<InputButton
						buttonAria={props.buttonAria}
						onChange={function (text: string): void {
							throw new Error('Function not implemented.' + text);
						}}
					>
						<SearchIcon />
					</InputButton>
				</div>
			) : (
				<InputText
					onChange={props.onChange}
					placeholder={props.placeholder}
					fill={props.fill}
				/>
			)}
		</>
	);
};
