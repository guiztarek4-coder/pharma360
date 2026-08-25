// Replicates the EXACT theme algorithm used by the pharma360benak.com website so the
// mobile app's colours follow whatever theme the admin sets — automatically.

export type Preset = { id: string; name: string; accent: string; bg: string };

function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || "#000000").replace("#", "");
  const s = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [Math.round(360 * h), Math.round(100 * s), Math.round(100 * l)];
}

// HSL -> hex (mirror of the site's `Vl`)
export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (k: number) => (k + h / 30) % 12;
  const kk = (s /= 100) * Math.min(l, 1 - l);
  const f = (n: number) => {
    const t = l - kk * Math.max(-1, Math.min(a(n) - 3, Math.min(9 - a(n), 1)));
    return Math.round(255 * t);
  };
  const hex = (x: number) => x.toString(16).padStart(2, "0");
  return "#" + hex(f(0)) + hex(f(8)) + hex(f(4));
}

const SEASONAL: Record<string, [number, number, number]> = {
  spring: [142, 71, 45],
  summer: [192, 91, 36],
  autumn: [21, 90, 48],
  winter: [217, 91, 60],
  rose: [330, 81, 60],
  mauve: [262, 83, 58],
  gold: [40, 74, 40],
  noir: [240, 6, 15],
};

export type Palette = {
  primary: string;
  primaryDark: string;
  onPrimary: string;
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  textLight: string;
  border: string;
  tintSoft: string;
  tintMed: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  star: string;
  bronze: string;
  silver: string;
  gold: string;
  hue: number;
  sat: number;
};

function build(hue: number, sat0: number, bg: string): Palette {
  const sat = Math.min(95, Math.max(45, sat0 + 12));
  return {
    primary: hslToHex(hue, sat, 43),
    primaryDark: hslToHex(hue, sat, 33),
    onPrimary: "#FFFFFF",
    bg,
    surface: "#FFFFFF",
    surfaceAlt: hslToHex(hue, Math.min(sat, 40), 96),
    text: "#171A1C",
    textMuted: "#6B7280",
    textLight: "#9AA1A9",
    border: "#ECE7DD",
    tintSoft: hslToHex(hue, Math.min(sat, 55), 94),
    tintMed: hslToHex(hue, Math.min(sat, 55), 86),
    danger: "#DC2626",
    dangerSoft: "#FCE8E6",
    success: "#0E9F6E",
    successSoft: "#DEF3E9",
    star: "#F59E0B",
    bronze: "#CD7F32",
    silver: "#AEB4BC",
    gold: "#D4AF37",
    hue,
    sat,
  };
}

function currentSeason(): string {
  const m = new Date().getMonth() + 1;
  return m >= 3 && m <= 5 ? "spring" : m >= 6 && m <= 8 ? "summer" : m >= 9 && m <= 11 ? "autumn" : "winter";
}

export const DEFAULT_PALETTE = build(203, 34, "#FAF6EF"); // bleu_creme fallback

export function buildPalette(settings: any): Palette {
  try {
    const mode = settings?.theme_mode || "auto";
    const id = mode === "manual" ? settings?.theme_manual || "spring" : currentSeason();
    if (SEASONAL[id]) {
      const [h, s] = SEASONAL[id];
      return build(h, s, id === "noir" ? "#F4F4F5" : "#FFFFFF");
    }
    const preset: Preset | undefined = (settings?.theme_presets || []).find((p: Preset) => p.id === id);
    if (preset) {
      const [h, s] = rgbToHsl(...hexToRgb(preset.accent));
      return build(h, s, preset.bg || "#FFFFFF");
    }
  } catch {}
  return DEFAULT_PALETTE;
}
