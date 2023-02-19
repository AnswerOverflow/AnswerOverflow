import { cva, VariantProps } from "cva";

export const buttonStyles = cva(
  "inline-flex items-center justify-center rounded-md border border-transparent  px-6 py-3 text-base font-medium text-white shadow-sm  focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      intent: {
        primary: "bg-blue-700 text-white border-transparent hover:bg-blue-800 ",
        secondary: "bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
        danger: "bg-red-600 text-white border-transparent hover:bg-red-700",
        success: "bg-green-700 text-white border-transparent hover:bg-green-800",
      },
      size: {
        small: ["text-sm", "py-1", "px-2"],
        medium: ["text-base", "py-2", "px-4"],
      },
    },
    defaultVariants: {
      size: "medium",
      intent: "primary",
    },
  }
);

export interface ButtonProps extends VariantProps<typeof buttonStyles> {
  children: React.ReactNode;
  visualOnly?: boolean;
  onClick?: () => void;
}

export function Button({
  intent,
  size,
  children,
  visualOnly,
  ...props
}: ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={buttonStyles({ intent, size })}
      tabIndex={visualOnly ? -1 : undefined}
      {...props}
    >
      {children}
    </button>
  );
}
