import { Button } from "@answeroverflow/reacord";
import React from "react";
import { setMessageHistory } from "../hooks";

export const Router: React.FC<{
  interactionId: string;
  children: React.ReactNode;
}> = ({ interactionId, children }: { interactionId: string; children: React.ReactNode }) => {
  const [history, setHistory] = React.useState<React.ReactNode[]>([]);
  const pushHistory = (node: React.ReactNode) => {
    setHistory([...history, node]);
  };
  const popHistory = () => setHistory(history.slice(0, -1));

  setMessageHistory({
    history,
    key: interactionId,
    popHistory,
    pushHistory,
  });

  const current = history.at(-1);
  if (history.length === 0) {
    return <>{children}</>;
  }
  return (
    <>
      <Button label="Back" onClick={() => popHistory()} />
      {current}
    </>
  );
};
