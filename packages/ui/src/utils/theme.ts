type CSSRule = {
  style: {
    color: string;
  };
};

export function toggleDarkTheme(dark_theme_enabled: boolean) {
  const root = window.document.documentElement;

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

  if (dark_theme_enabled) {
    darkStyleSheet!.disabled = false;
    lightStyleSheet!.disabled = true;
    root.classList.add("dark");
  } else {
    darkStyleSheet!.disabled = true;
    lightStyleSheet!.disabled = false;
    root.classList.remove("dark");
  }

  localStorage.setItem("theme", "dark");
  return true;
}
