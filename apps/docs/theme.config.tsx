import React from "react";
import type { DocsThemeConfig } from "nextra-theme-docs";
import { AnswerOverflowLogo, Footer } from "@answeroverflow/ui";
import {
  CREATE_NEW_DOCS_ISSUE_LINK,
  DISCORD_LINK,
  DOCS_LINK_BASE,
  GITHUB_LINK,
} from "@answeroverflow/constants";

// https://nextra.site/docs/docs-theme/theme-configuration
const config: DocsThemeConfig = {
  logo: <AnswerOverflowLogo />,
  project: {
    link: GITHUB_LINK,
  },
  chat: {
    link: DISCORD_LINK,
  },
  feedback: {
    // TODO: Add properties that Nextra passes and add to url
    useLink: () => CREATE_NEW_DOCS_ISSUE_LINK,
  },
  useNextSeoProps() {
    return {
      titleTemplate: "%s - AnswerOverflow",
    };
  },
  docsRepositoryBase: DOCS_LINK_BASE,
  footer: {
    component: <Footer />,
  },
};

export default config;
