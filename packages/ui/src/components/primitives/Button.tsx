export interface ButtonProps {
  className: string;
  children: React.ReactNode;
}

export function Button({ children, className }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500
      focus:ring-offset-2
      ${className}`}
    >
      {children}
    </button>
  );
}
