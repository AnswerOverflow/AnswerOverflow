import React from "react";
import type { DocsThemeConfig } from "nextra-theme-docs";
import { AnswerOverflowLogo, Footer } from "@answeroverflow/ui";
import {
  CREATE_NEW_DOCS_ISSUE_LINK,
  DISCORD_LINK,
  DOCS_LINK_BASE,
  GITHUB_LINK,
  ANSWER_OVERFLOW_BLUE_HEX,
} from "@answeroverflow/constants";
import { useRouter } from "next/router";

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
    const { asPath } = useRouter();
    return {
      titleTemplate: asPath === "/" ? "%s" : "%s - Answer Overflow",
      themeColor: ANSWER_OVERFLOW_BLUE_HEX,
      description: "Improve & index your Discord help channels into Google with Answer Overflow",
    };
  },
  docsRepositoryBase: DOCS_LINK_BASE,
  footer: {
    component: <Footer />,
  },
};

export default config;
