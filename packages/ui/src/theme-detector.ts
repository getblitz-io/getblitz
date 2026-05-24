/** localStorage key for theme preference — shared with ThemeProvider */
export const THEME_MODE_STORAGE_KEY = "theme-mode";

/**
 * Blocking script applied before React hydrates (via next/script beforeInteractive).
 * Keep in sync with updateThemeClass() in theme-provider.tsx.
 */
export const themeDetectorScript = `(function themeFn() {
  const validThemes = ["light", "dark", "auto"];
  const isValidTheme = (theme) => validThemes.includes(theme);

  let storedTheme = "auto";
  try {
    storedTheme = localStorage.getItem("${THEME_MODE_STORAGE_KEY}") ?? "auto";
  } catch {}

  const validTheme = isValidTheme(storedTheme) ? storedTheme : "auto";

  if (validTheme === "auto") {
    const autoTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    document.documentElement.classList.add(autoTheme, "auto");
  } else {
    document.documentElement.classList.add(validTheme);
  }
})();`;
