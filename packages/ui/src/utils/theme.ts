type CSSRule = {
  style: {
    color: string;
  };
};
function disableTransitionsTemporarily() {
  document.documentElement.classList.add("[&_*]:!transition-none");
  window.setTimeout(() => {
    document.documentElement.classList.remove("[&_*]:!transition-none");
  }, 0);
}

function changeCodeHighlighting(dark_theme_enabled: boolean) {
  // This is disgusting, but it works for switching the code highlighting
  let darkStyleSheet: CSSStyleSheet | undefined;
  let lightStyleSheet: CSSStyleSheet | undefined;
  [...document.styleSheets].forEach((styleSheet) => {
    try {
      const rule = [...styleSheet.cssRules].find((rule) =>
        rule.cssText.includes("hljs-keyword")
      ) as CSSRule | undefined;

      if (rule) {
        if (rule.style.color === "rgb(255, 123, 114)") {
          darkStyleSheet = styleSheet;
        } else if (rule.style.color === "rgb(215, 58, 73)") {
          lightStyleSheet = styleSheet;
        }
      }
    } catch (error) {
      // let error pass
    }
  });
  if (darkStyleSheet && lightStyleSheet) {
    if (dark_theme_enabled) {
      darkStyleSheet.disabled = false;
      lightStyleSheet.disabled = true;
    } else {
      darkStyleSheet.disabled = true;
      lightStyleSheet.disabled = false;
    }
  }
}
export function toggleDarkTheme(theme_override: boolean | undefined) {
  disableTransitionsTemporarily();

  const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const isSystemDarkMode = darkModeMediaQuery.matches;
  let isDarkMode: boolean;
  if (theme_override !== undefined) {
    const root = window.document.documentElement;
    isDarkMode = theme_override;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  } else {
    isDarkMode = document.documentElement.classList.toggle("dark");
  }
  changeCodeHighlighting(isDarkMode);

  if (isDarkMode === isSystemDarkMode) {
    delete window.localStorage.isDarkMode;
  } else {
    window.localStorage.isDarkMode = isDarkMode;
  }
}
