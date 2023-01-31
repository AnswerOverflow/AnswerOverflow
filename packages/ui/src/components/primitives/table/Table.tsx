export interface TableProps {
  // Make sure a thead is present
  children: React.ReactNode;
}

export const Table: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="overflow-auto border-[0.5px] border-[#D0D0D0] drop-shadow-xl dark:border-neutral-700">
      <table className="h-full w-full border-hidden">{children}</table>
    </div>
  );
};
