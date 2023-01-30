import { cva, VariantProps } from "cva";

export const buttonStyles = cva(
  "inline-flex items-center justify-center rounded-md border border-transparent  px-6 py-3 text-base font-medium text-white shadow-sm  focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      intent: {
        primary: "bg-blue-500 text-white border-transparent hover:bg-blue-600",
        secondary: "bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
        danger: "bg-red-500 text-white border-transparent hover:bg-red-600",
        success: "bg-green-500 text-white border-transparent hover:bg-green-600",
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
  visual_only?: boolean;
}

export function Button({ intent, size, children, visual_only }: ButtonProps) {
  return (
    <button
      type="button"
      className={buttonStyles({ intent, size })}
      tabIndex={visual_only ? -1 : undefined}
    >
      {children}
    </button>
  );
}
