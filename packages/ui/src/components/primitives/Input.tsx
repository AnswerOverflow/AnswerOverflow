import type React from "react";

interface BaseInputProps {
  placeholder?: string;
  fill?: boolean;
  onChange: (text: string) => void;
}

// Add children if type is buttonInput
interface ButtonInputProps extends BaseInputProps {
  type: "buttonInput";
  children: React.ReactNode;
}

// Add type if type is not buttonInput
interface NormalInputProps extends BaseInputProps {
  type?: "text";
}

// Distriminated union
type InputProps = ButtonInputProps | NormalInputProps;

const InputText = ({ placeholder, fill, onChange }: InputProps) => {
  return (
    <input
      type="text"
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-standard border-1 border-[#525A66] bg-[#D8DAE0] py-3 font-body font-normal text-ao-black focus:border-transparent focus:outline-transparent focus:ring-2 focus:ring-ao-blue dark:bg-[#181B1F] dark:text-ao-white ${
        fill ? "w-full" : ""
      }`}
    />
  );
};

const InputButton = ({ children }: { children: React.ReactNode }) => {
  return (
    <button className="absolute right-5 top-1/2 -translate-y-1/2 rounded-standard px-4 py-1 font-body font-semibold dark:bg-[#272C33] dark:text-ao-white">
      {children}
    </button>
  );
};

export const Input = ({ placeholder, fill, onChange, type }: InputProps) => {
  return (
    <>
      {type === "buttonInput" ? (
        <div className={`relative inline-block ${fill ? "w-full" : ""}`}>
          <InputText onChange={onChange} placeholder={placeholder} fill={fill} />
          <InputButton>
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
          </InputButton>
        </div>
      ) : (
        <InputText onChange={onChange} placeholder={placeholder} fill={fill} />
      )}
    </>
  );
};
