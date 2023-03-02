import { container } from "@sapphire/framework";
import type React from "react";

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
