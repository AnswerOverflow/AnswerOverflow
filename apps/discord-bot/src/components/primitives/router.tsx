import { ActionRow, Button } from "@answeroverflow/reacord";
import { container } from "@sapphire/framework";
import React, { useEffect } from "react";
import { OpenSupportMenuButton, SupportMenu } from "./support";
export function setMessageHistory({
  key,
  ...data
}: {
  key: string;
  history: React.ReactNode[];
  pushHistory: (message: React.ReactNode) => void;
  popHistory: () => void;
}) {
  container.messageHistory.set(key, data);
}

export function getMessageHistory(key: string) {
  const history = container.messageHistory.get(key);
  if (!history) {
    throw new Error("No history found for key: " + key);
  }
  return history;
}

export const Router: React.FC<{
  interactionId: string;
  children: React.ReactNode;
}> = ({ interactionId, children }: { interactionId: string; children: React.ReactNode }) => {
  const [history, setHistory] = React.useState<React.ReactNode[]>([]);
  const pushHistory = (node: React.ReactNode) => {
    setHistory([...history, node]);
  };
  const popHistory = () => setHistory(history.slice(0, -1));

  // TODO: Swap for use context when Reacord supports it
  setMessageHistory({
    history,
    key: interactionId,
    popHistory,
    pushHistory,
  });

  useEffect(() => {
    return () => {
      container.messageHistory.delete(interactionId);
    };
  }, []);

  const current = history.at(-1);
  if (history.length === 0) {
    pushHistory(children);
  }

  // TODO: This is disgusting
  const isSupportMenu =
    current instanceof Object &&
    "type" in current &&
    current.type.toString().includes(SupportMenu.toString());

  return (
    <>
      {current}
      <ActionRow>
        {history.length > 1 && (
          <Button
            label="Back"
            onClick={() => {
              popHistory();
            }}
          />
        )}
        {!isSupportMenu && <OpenSupportMenuButton interactionId={interactionId} />}
      </ActionRow>
    </>
  );
};
