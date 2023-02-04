import { cva, VariantProps } from "cva";
import { ButtonStyles, convertToCva } from "./ButtonStyles";

export type ButtonVariantProps = Required<VariantProps<typeof buttonStyles>>;
export const buttonStyles = cva(
  "rounded-md px-6 py-2 font-body font-bold transition-all duration-100",
  {
    // We don't need to declare any of these, as all the types are required, we only need to do compound variants
    variants: {
      type: {
        solid: "",
        ghost: "",
      },
      color: {
        red: "",
        blue: "",
        green: "",
        black: "",
        white: "",
      },
      disabled: {
        true: "",
      },
    },
    compoundVariants: [...convertToCva(ButtonStyles)],
    defaultVariants: {
      type: "solid",
      color: "black",
    },
  }
);

export interface ButtonProps extends ButtonVariantProps {
  text: string;
  onClick: () => void;
}

export const Button = ({ text, type, color, disabled, onClick }: ButtonProps) => {
  return (
    <button
      className={buttonStyles({ type, color, disabled: disabled ?? false })}
      onClick={() => onClick()}
      disabled={disabled ?? false}
    >
      {text}
    </button>
  );
};
