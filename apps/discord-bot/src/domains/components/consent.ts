import { ButtonBuilder } from "@discordjs/builders";
import { APIButtonComponent, ButtonStyle, ComponentType } from "discord.js";

export const CONSENT_BUTTON_LABEL = "Publicly display my messages on Answer Overflow";
export const CONSENT_BUTTON_ID = "consent_button";
export const CONSENT_BUTTON_DATA = {
  label: CONSENT_BUTTON_LABEL,
  style: ButtonStyle.Success,
  custom_id: CONSENT_BUTTON_ID,
  type: ComponentType.Button,
} as APIButtonComponent;
export const makeConsentButton = () => new ButtonBuilder(CONSENT_BUTTON_DATA);
