import React from "react";
import type { UserServerSettingsWithFlags } from "@answeroverflow/db";

export function ManageAccountMenu({
  initalSettings,
}: {
  initalSettings: UserServerSettingsWithFlags;
}) {
  return <>hello {initalSettings.bitfield}</>;
}
