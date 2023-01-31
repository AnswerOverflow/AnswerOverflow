import type { PropsWithChildren } from "react";

/**
 * Note: Use th directly inside of thead
 */
export const Thead: React.FC<PropsWithChildren> = (props) => {
  return (
    <thead className="border-b-[0.5px] border-neutral-300 p-2 dark:border-neutral-700 dark:bg-[#2C2C2C]">
      <tr>{props.children}</tr>
    </thead>
  );
};

export const Tbody: React.FC<PropsWithChildren> = (props) => {
  return <tbody>{props.children}</tbody>;
};

export const Th: React.FC<PropsWithChildren> = (props) => {
  return <th className="p-1 text-neutral-900 dark:text-neutral-300">{props.children}</th>;
};

export const Tr: React.FC<PropsWithChildren> = (props) => {
  return (
    <tr className="odd:bg-neutral-100 even:bg-neutral-200 dark:odd:bg-[#252525] dark:even:bg-[#2C2C2C]">
      {props.children}
    </tr>
  );
};

export const Td: React.FC<PropsWithChildren> = (props) => {
  return (
    <td className="py-2 text-center font-normal text-black dark:text-[#E6E6E6]">
      {props.children}
    </td>
  );
};

export const TableButtonWrapper: React.FC<PropsWithChildren> = (props) => {
  return <div className="flex justify-center gap-2">{props.children}</div>;
};

export interface TableButtonProps {
  backgroundColor: string;
  onClick?: () => void;
}

export const TableButton: React.FC<PropsWithChildren<TableButtonProps>> = (props) => {
  return (
    <button
      className={`h-7 w-7 rounded-md p-[0.15rem]`}
      style={{
        backgroundColor: props.backgroundColor,
      }}
      onClick={() => props.onClick?.()}
    >
      {props.children}
    </button>
  );
};
