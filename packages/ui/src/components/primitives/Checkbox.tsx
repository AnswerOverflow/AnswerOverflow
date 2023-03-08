import type { ChangeEvent } from "react";

export type CheckboxProps = {
  disabled?: boolean;
  checked?: boolean;
  className?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  name?: string;
};

export const Checkbox: React.FC<CheckboxProps> = ({
  disabled,
  checked,
  className,
  onChange,
  name,
}) => {
  return (
    <input
      type="checkbox"
      disabled={disabled ?? false}
      defaultChecked={checked ?? false}
      className={`${className ?? ""} ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      } h-5 w-5 rounded-sm bg-gray-300 accent-[#396FF8] dark:bg-black`}
      onChange={onChange}
      name={name}
    />
  );
};
