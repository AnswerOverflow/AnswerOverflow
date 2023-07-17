import { cn } from "~ui/utils/styling";
import * as React from "react";

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const TextArea: React.FC<TextAreaProps> = (props) => {
  const { children, className, ...remainingProps } = props;

  return (
    <textarea
      className={cn(
        "flex w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-50 dark:focus:ring-slate-400 dark:focus:ring-offset-slate-900",
        className
      )}
      {...remainingProps}
    >
      {children}
    </textarea>
  );
};
