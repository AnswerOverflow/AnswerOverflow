import React from "react";

const messageHistory = new Map<string, React.ReactNode[]>();

export function useMenuHistory(messageId: string) {
  const [, setHistory] = React.useState<React.ReactNode[]>(messageHistory.get(messageId) || []);
  const getHistory = React.useCallback(() => messageHistory.get(messageId) || [], [messageId]);
  const history = getHistory();
  React.useEffect(() => {
    if (messageHistory.has(messageId)) {
      setHistory(messageHistory.get(messageId) || []);
    }
  }, [messageId]);
  const addHistory = React.useCallback(
    (node: React.ReactNode) => {
      const newHistory = [...(messageHistory.get(messageId) || []), node];
      console.log("newHistory", newHistory.length);
      messageHistory.set(messageId, newHistory);
      setHistory(newHistory);
    },
    [history, messageId]
  );
  const popHistory = React.useCallback(() => {
    const history = getHistory();
    const newHistory = history.slice(0, -1);
    messageHistory.set(messageId, newHistory);
    setHistory(newHistory);
  }, [history, messageId]);

  return {
    getHistory,
    addHistory,
    popHistory,
  };
}
