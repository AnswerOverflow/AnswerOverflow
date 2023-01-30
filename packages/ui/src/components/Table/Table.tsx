export interface TableProps {
  // Make sure a thead is present
  children: React.ReactNode;
}

export const Table: React.FC<React.PropsWithChildren> = (props) => {
  return <table className="h-full w-full">{props.children}</table>;
};
