import { cva, VariantProps } from "cva";

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
    },
    compoundVariants: [
      {
        type: "solid",
        color: "black",
        className:
          "bg-ao-black text-white hover:bg-[#151D26] focus:ring-2 focus:ring-[#52BAFF] dark:focus:ring-[#4E8BB5] focus:outline-none",
      },
    ],
    defaultVariants: {
      type: "solid",
    },
  }
);

export interface ButtonProps extends ButtonVariantProps {
  text: string;
  onClick: () => void;
}

export const Button = ({ text, type, color, onClick }: ButtonProps) => {
  return (
    <button className={buttonStyles({ type, color })} onClick={() => onClick()}>
      {text}
    </button>
  );
};
