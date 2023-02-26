import React from "react";
import type { DocsThemeConfig } from "nextra-theme-docs";
import { AnswerOverflowLogo } from "@answeroverflow/ui";
const config: DocsThemeConfig = {
  logo: <AnswerOverflowLogo />,
  project: {
    link: "https://contribute.answeroverflow.com",
  },
  chat: {
    link: "https://discord.answeroverflow.com",
  },
  docsRepositoryBase: "https://github.com/shuding/nextra-docs-template",
  footer: {
    text: "Nextra Docs Template",
  },
};

export default config;
