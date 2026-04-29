import { defaultTheme, extendTheme, type Theme } from "@inkjs/ui";

type Palette = {
  primary: string;
  accent: string;
  positive: string;
  negative: string;
  warning: string;
  muted: string;
  border: string;
  text: string;
  default: string;
};

const DARK: Palette = {
  primary: "#FFD700",
  accent: "#FFBF00",
  positive: "#7CCB6F",
  negative: "#E06B6B",
  warning: "#FFB347",
  muted: "#6E6E6E",
  border: "#3A3A3A",
  text: "#F5F5DC",
  default: "#F5F5DC",
};

const LIGHT: Palette = {
  primary: "#8B6914",
  accent: "#A0651C",
  positive: "#2E7D32",
  negative: "#B22222",
  warning: "#B8860B",
  muted: "#9E9E9E",
  border: "#C0C0C0",
  text: "#1A1A1A",
  default: "#1A1A1A",
};

const parseHex = (hex: string): [number, number, number] | null => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m || !m[1]) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
};

const luminance = (hex: string): number | null => {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

export const detectLightMode = (
  env: NodeJS.ProcessEnv = process.env,
): boolean => {
  if (env.FINANCE_TUI_LIGHT === "1") return true;
  if (env.FINANCE_TUI_LIGHT === "0") return false;
  if (env.FINANCE_TUI_THEME === "light") return true;
  if (env.FINANCE_TUI_THEME === "dark") return false;
  if (env.FINANCE_TUI_BACKGROUND) {
    const lum = luminance(env.FINANCE_TUI_BACKGROUND);
    if (lum !== null) return lum >= 0.6;
  }
  if (env.COLORFGBG) {
    const parts = env.COLORFGBG.split(";");
    const bg = parts[parts.length - 1];
    if (bg === "7" || bg === "15") return true;
  }
  return false;
};

export const palette: Palette = detectLightMode() ? LIGHT : DARK;

const overrides: Theme = { components: {} };

export const theme = extendTheme(defaultTheme, overrides);
