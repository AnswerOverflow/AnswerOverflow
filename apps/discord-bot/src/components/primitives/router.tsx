import { ActionRow, Button, useInstance } from "@answeroverflow/discordjs-react";
import { container } from "@sapphire/framework";
import React, { useEffect } from "react";
import { OpenSupportMenuButton, SupportMenu } from "./support";

function popHistory(key: string) {
  const data = container.messageHistory.get(key);
  if (!data) {
    return;
  }
  const { history, setHistory } = data;
  const newHistory = [...history];
  newHistory.pop();
  container.messageHistory.set(key, {
    history: newHistory,
    setHistory,
  });
  setHistory(newHistory);
}

function pushHistory(key: string, node: React.ReactNode) {
  const data = container.messageHistory.get(key);
  if (!data) {
    return;
  }
  const { history, setHistory } = data;
  const newHistory = [...history, node];
  container.messageHistory.set(key, {
    history: newHistory,
    setHistory,
  });
  setHistory(newHistory);
}

export function useHistory() {
  const instance = useInstance();
  return {
    pushHistory: (node: React.ReactNode) => pushHistory(instance.rendererId, node),
    popHistory: () => popHistory(instance.rendererId),
  };
}

export const Router: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [history, setHistory] = React.useState<React.ReactNode[]>([]);
  const instance = useInstance();

  useEffect(() => {
    return () => {
      container.messageHistory.delete(instance.rendererId);
    };
  }, []);

  container.messageHistory.set(instance.rendererId, {
    history,
    setHistory,
  });

  const current = history[history.length - 1];
  if (!current) {
    pushHistory(instance.rendererId, children);
  }
  // TODO: This is disgusting
  const isSupportMenu =
    current instanceof Object &&
    "type" in current &&
    current.type.toString().includes(SupportMenu.toString());

  const shouldShowActionRow = history.length > 1 || !isSupportMenu;
  return (
    <>
      {current}
      {shouldShowActionRow && (
        <ActionRow>
          {history.length > 1 && (
            <Button
              label="Back"
              onClick={() => {
                popHistory(instance.rendererId);
              }}
            />
          )}
          {!isSupportMenu && <OpenSupportMenuButton />}
        </ActionRow>
      )}
    </>
  );
};
