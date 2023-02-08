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
  let dark_style_sheet: CSSStyleSheet | undefined;
  let light_style_sheet: CSSStyleSheet | undefined;
  [...document.styleSheets].forEach((styleSheet) => {
    try {
      const rule = [...styleSheet.cssRules].find((rule) =>
        rule.cssText.includes("hljs-keyword")
      ) as CSSRule | undefined;

      if (rule) {
        if (rule.style.color === "rgb(255, 123, 114)") {
          dark_style_sheet = styleSheet;
        } else if (rule.style.color === "rgb(215, 58, 73)") {
          light_style_sheet = styleSheet;
        }
      }
    } catch (error) {
      // let error pass
    }
  });
  if (dark_style_sheet && light_style_sheet) {
    if (dark_theme_enabled) {
      dark_style_sheet.disabled = false;
      light_style_sheet.disabled = true;
    } else {
      dark_style_sheet.disabled = true;
      light_style_sheet.disabled = false;
    }
  }
}
export function toggleDarkTheme(theme_override?: boolean) {
  disableTransitionsTemporarily();

  const dark_mode_media_query = window.matchMedia("(prefers-color-scheme: dark)");
  const is_system_dark_mode = dark_mode_media_query.matches;
  let is_dark_mode: boolean;
  if (theme_override !== undefined) {
    const root = window.document.documentElement;
    is_dark_mode = theme_override;
    if (is_dark_mode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  } else {
    is_dark_mode = document.documentElement.classList.toggle("dark");
  }
  changeCodeHighlighting(is_dark_mode);

  if (is_dark_mode === is_system_dark_mode) {
    delete window.localStorage.isDarkMode;
  } else {
    window.localStorage.isDarkMode = is_dark_mode;
  }
}
