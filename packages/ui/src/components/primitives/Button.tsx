import { cva, VariantProps } from "cva";
import type { Merge, SetNonNullable } from "type-fest";
import { buttonStyles as buttonStylesData, convertToCva } from "./button-styles";

export type ButtonVariantProps = Merge<
	SetNonNullable<Required<VariantProps<typeof buttonStyles>>>,
	Pick<VariantProps<typeof buttonStyles>, "disabled">
>;

export const buttonStyles = cva(
	"rounded-md px-8 py-2 font-body font-bold transition-all duration-100",
	{
		// We don't need to declare any of these, as all the types are required, we only need to do compound variants
		variants: {
			type: {
				solid: "",
				ghost: ""
			},
			color: {
				red: "",
				blue: "",
				green: "",
				black: "",
				white: ""
			},
			disabled: {
				true: ""
			}
		},
		compoundVariants: [...convertToCva(buttonStylesData)]
	}
);

export interface ButtonProps extends ButtonVariantProps {
	onClick?: () => void;
	className?: string;
}

export const Button: React.FC<React.PropsWithChildren<ButtonProps>> = ({
	type,
	color,
	disabled,
	onClick,
	children,
	className
}) => {
	return (
		<button
			className={buttonStyles({ type, color, disabled: disabled ?? false, className })}
			onClick={() => onClick?.()}
			disabled={disabled ?? false}
		>
			{children}
		</button>
	);
};
