export const CODE_STYLE_IDS = [
  "Absolutely",
  "Ayu",
  "Catppuccin",
  "Codex",
  "Dracula",
  "Everforest",
  "GitHub",
  "Gruvbox",
  "Linear",
  "Lobster",
  "Material",
  "Matrix",
  "Monokai",
  "Night Owl",
  "Nord",
  "Notion",
  "One",
  "Oscurance",
  "Rose Pine",
  "Sentry",
  "Solarized",
  "Temple",
  "Tokyo Night",
  "VS Code Plus",
] as const;

export type CodeStyleId = (typeof CODE_STYLE_IDS)[number];

export interface CodeStyleTheme {
  readonly badgeBackground: string;
  readonly badgeForeground: string;
  readonly border: string;
  readonly comment: string;
  readonly gutter: string;
  readonly gutterBorder: string;
  readonly id: CodeStyleId;
  readonly keyword: string;
  readonly lineNumber: string;
  readonly number: string;
  readonly punctuation: string;
  readonly slug: string;
  readonly string: string;
  readonly surface: string;
  readonly surfaceElevated: string;
  readonly text: string;
  readonly title: string;
}

export const DEFAULT_CODE_STYLE: CodeStyleId = "Codex";

const CODE_STYLE_THEMES: Readonly<Record<CodeStyleId, CodeStyleTheme>> = Object.freeze({
  "Absolutely": { id: "Absolutely", slug: "absolutely", badgeBackground: "#6f6256", badgeForeground: "#f6d7a7", surface: "#171311", surfaceElevated: "#221a16", border: "#3d312a", gutter: "#1b1512", gutterBorder: "#322822", lineNumber: "#8e7a69", text: "#f3e8dd", comment: "#8f7b6a", keyword: "#ffb454", string: "#ffd29d", number: "#fab387", title: "#f6c177", punctuation: "#d5c2b3" },
  Ayu: { id: "Ayu", slug: "ayu", badgeBackground: "#1f2430", badgeForeground: "#ffcc66", surface: "#0f1419", surfaceElevated: "#17202a", border: "#2d3640", gutter: "#111a23", gutterBorder: "#25303b", lineNumber: "#6c7a89", text: "#eef6ff", comment: "#708090", keyword: "#ffcc66", string: "#bbe67e", number: "#ffad66", title: "#73d0ff", punctuation: "#c5d1dd" },
  Catppuccin: { id: "Catppuccin", slug: "catppuccin", badgeBackground: "#585b70", badgeForeground: "#f5c2e7", surface: "#1e1e2e", surfaceElevated: "#302d41", border: "#45475a", gutter: "#181825", gutterBorder: "#313244", lineNumber: "#6c7086", text: "#cdd6f4", comment: "#6c7086", keyword: "#cba6f7", string: "#a6e3a1", number: "#fab387", title: "#89b4fa", punctuation: "#bac2de" },
  Codex: { id: "Codex", slug: "codex", badgeBackground: "#172333", badgeForeground: "#12b5ff", surface: "#0f1720", surfaceElevated: "#162230", border: "#26384a", gutter: "#111c27", gutterBorder: "#203142", lineNumber: "#5f7186", text: "#e7eef7", comment: "#6b7f95", keyword: "#7cc7ff", string: "#8ce4a5", number: "#f6c177", title: "#b39dfb", punctuation: "#9fb2c7" },
  Dracula: { id: "Dracula", slug: "dracula", badgeBackground: "#5b5f97", badgeForeground: "#ffbdf2", surface: "#282a36", surfaceElevated: "#343746", border: "#4d5166", gutter: "#232533", gutterBorder: "#3a3d4f", lineNumber: "#6272a4", text: "#f8f8f2", comment: "#6272a4", keyword: "#ff79c6", string: "#f1fa8c", number: "#bd93f9", title: "#8be9fd", punctuation: "#f8f8f2" },
  Everforest: { id: "Everforest", slug: "everforest", badgeBackground: "#708089", badgeForeground: "#d3e6d1", surface: "#2b3339", surfaceElevated: "#374247", border: "#4f5b58", gutter: "#232a2f", gutterBorder: "#404a4e", lineNumber: "#7a8478", text: "#d3c6aa", comment: "#7a8478", keyword: "#e67e80", string: "#a7c080", number: "#dbbc7f", title: "#7fbbb3", punctuation: "#d3c6aa" },
  GitHub: { id: "GitHub", slug: "github", badgeBackground: "#1f6feb", badgeForeground: "#dbeafe", surface: "#f6f8fa", surfaceElevated: "#ffffff", border: "#d0d7de", gutter: "#f3f4f6", gutterBorder: "#d8dee4", lineNumber: "#8c959f", text: "#24292f", comment: "#6e7781", keyword: "#cf222e", string: "#0a3069", number: "#953800", title: "#8250df", punctuation: "#57606a" },
  Gruvbox: { id: "Gruvbox", slug: "gruvbox", badgeBackground: "#665c54", badgeForeground: "#8ec07c", surface: "#282828", surfaceElevated: "#32302f", border: "#504945", gutter: "#1d2021", gutterBorder: "#3c3836", lineNumber: "#928374", text: "#ebdbb2", comment: "#928374", keyword: "#fb4934", string: "#b8bb26", number: "#d79921", title: "#83a598", punctuation: "#d5c4a1" },
  Linear: { id: "Linear", slug: "linear", badgeBackground: "#24283a", badgeForeground: "#7aa2ff", surface: "#0f1117", surfaceElevated: "#171923", border: "#2a3040", gutter: "#0d1016", gutterBorder: "#202637", lineNumber: "#6b7385", text: "#f5f7fb", comment: "#7a8192", keyword: "#8ab4ff", string: "#93e5ab", number: "#ffb86c", title: "#c29bff", punctuation: "#b7bfd1" },
  Lobster: { id: "Lobster", slug: "lobster", badgeBackground: "#3e2552", badgeForeground: "#ff8ab6", surface: "#1c1020", surfaceElevated: "#28142d", border: "#43213f", gutter: "#160c1a", gutterBorder: "#351b32", lineNumber: "#8d6a87", text: "#fdeff8", comment: "#8d6a87", keyword: "#ff6b9d", string: "#ffd166", number: "#9bf6ff", title: "#c792ea", punctuation: "#f0d3e5" },
  Material: { id: "Material", slug: "material", badgeBackground: "#465a69", badgeForeground: "#ffd180", surface: "#263238", surfaceElevated: "#31424a", border: "#455a64", gutter: "#1f2a30", gutterBorder: "#394a52", lineNumber: "#7b8c96", text: "#eeffff", comment: "#546e7a", keyword: "#c792ea", string: "#c3e88d", number: "#f78c6c", title: "#82aaff", punctuation: "#89a1b0" },
  Matrix: { id: "Matrix", slug: "matrix", badgeBackground: "#083b18", badgeForeground: "#49ff6c", surface: "#041a0b", surfaceElevated: "#062412", border: "#0d421d", gutter: "#031207", gutterBorder: "#0a2c16", lineNumber: "#2d8247", text: "#b6ffca", comment: "#2f8f4b", keyword: "#34d058", string: "#7ee787", number: "#3fb950", title: "#58a6ff", punctuation: "#7ee787" },
  Monokai: { id: "Monokai", slug: "monokai", badgeBackground: "#75715e", badgeForeground: "#f8f8f2", surface: "#272822", surfaceElevated: "#33352b", border: "#49483e", gutter: "#1f201b", gutterBorder: "#3e3d32", lineNumber: "#75715e", text: "#f8f8f2", comment: "#75715e", keyword: "#f92672", string: "#a6e22e", number: "#fd971f", title: "#66d9ef", punctuation: "#f8f8f2" },
  "Night Owl": { id: "Night Owl", slug: "night-owl", badgeBackground: "#123b60", badgeForeground: "#7fdbff", surface: "#011627", surfaceElevated: "#08203a", border: "#14304b", gutter: "#01111d", gutterBorder: "#0e2841", lineNumber: "#5f7e97", text: "#d6deeb", comment: "#637777", keyword: "#c792ea", string: "#ecc48d", number: "#f78c6c", title: "#82aaff", punctuation: "#7fdbca" },
  Nord: { id: "Nord", slug: "nord", badgeBackground: "#5e81ac", badgeForeground: "#e5f0ff", surface: "#2e3440", surfaceElevated: "#3b4252", border: "#4c566a", gutter: "#242933", gutterBorder: "#434c5e", lineNumber: "#6f7b8b", text: "#d8dee9", comment: "#616e88", keyword: "#81a1c1", string: "#a3be8c", number: "#b48ead", title: "#88c0d0", punctuation: "#cfd8e3" },
  Notion: { id: "Notion", slug: "notion", badgeBackground: "#dfe4ea", badgeForeground: "#3b82f6", surface: "#f7f6f3", surfaceElevated: "#ffffff", border: "#e6e2da", gutter: "#f1eee8", gutterBorder: "#e3ddd2", lineNumber: "#a39b8e", text: "#37352f", comment: "#9b9488", keyword: "#9a3412", string: "#0f766e", number: "#7c3aed", title: "#2563eb", punctuation: "#78716c" },
  One: { id: "One", slug: "one", badgeBackground: "#3b4252", badgeForeground: "#9ecbff", surface: "#282c34", surfaceElevated: "#323844", border: "#4b5263", gutter: "#21252b", gutterBorder: "#3a404d", lineNumber: "#636d83", text: "#abb2bf", comment: "#5c6370", keyword: "#c678dd", string: "#98c379", number: "#d19a66", title: "#61afef", punctuation: "#abb2bf" },
  Oscurance: { id: "Oscurance", slug: "oscurance", badgeBackground: "#2a2433", badgeForeground: "#f8d7da", surface: "#161518", surfaceElevated: "#1f1d22", border: "#34313a", gutter: "#111015", gutterBorder: "#28252d", lineNumber: "#756d7c", text: "#f3edf7", comment: "#7b7285", keyword: "#ff8ba7", string: "#f9e2af", number: "#fab387", title: "#c4a7e7", punctuation: "#d9d4de" },
  "Rose Pine": { id: "Rose Pine", slug: "rose-pine", badgeBackground: "#524f67", badgeForeground: "#c4a7e7", surface: "#191724", surfaceElevated: "#26233a", border: "#403d52", gutter: "#16141f", gutterBorder: "#312e45", lineNumber: "#6e6a86", text: "#e0def4", comment: "#6e6a86", keyword: "#eb6f92", string: "#9ccfd8", number: "#f6c177", title: "#c4a7e7", punctuation: "#908caa" },
  Sentry: { id: "Sentry", slug: "sentry", badgeBackground: "#5b4a86", badgeForeground: "#e9ddff", surface: "#1c1528", surfaceElevated: "#2a2138", border: "#43365b", gutter: "#17111f", gutterBorder: "#35284a", lineNumber: "#80739b", text: "#f4efff", comment: "#7b6e91", keyword: "#f973ff", string: "#7dd3fc", number: "#fdba74", title: "#a78bfa", punctuation: "#d7d1e4" },
  Solarized: { id: "Solarized", slug: "solarized", badgeBackground: "#0b4f5f", badgeForeground: "#ef4444", surface: "#002b36", surfaceElevated: "#073642", border: "#2a4a54", gutter: "#00232d", gutterBorder: "#17414c", lineNumber: "#657b83", text: "#93a1a1", comment: "#586e75", keyword: "#859900", string: "#2aa198", number: "#d33682", title: "#268bd2", punctuation: "#839496" },
  Temple: { id: "Temple", slug: "temple", badgeBackground: "#31402a", badgeForeground: "#f0d879", surface: "#1a1f17", surfaceElevated: "#23291f", border: "#374031", gutter: "#141912", gutterBorder: "#2a3325", lineNumber: "#7b876f", text: "#f4eed7", comment: "#818b74", keyword: "#e8a34a", string: "#8fcf7a", number: "#d9c97a", title: "#7dd3c7", punctuation: "#d7d2bf" },
  "Tokyo Night": { id: "Tokyo Night", slug: "tokyo-night", badgeBackground: "#2f3d67", badgeForeground: "#7aa2ff", surface: "#1a1b26", surfaceElevated: "#24283b", border: "#3b4261", gutter: "#16161e", gutterBorder: "#2d3250", lineNumber: "#565f89", text: "#c0caf5", comment: "#565f89", keyword: "#bb9af7", string: "#9ece6a", number: "#ff9e64", title: "#7aa2f7", punctuation: "#a9b1d6" },
  "VS Code Plus": { id: "VS Code Plus", slug: "vs-code-plus", badgeBackground: "#2d2d30", badgeForeground: "#18a0fb", surface: "#1e1e1e", surfaceElevated: "#252526", border: "#333842", gutter: "#181818", gutterBorder: "#2a2d2e", lineNumber: "#6e7681", text: "#d4d4d4", comment: "#6a9955", keyword: "#569cd6", string: "#ce9178", number: "#b5cea8", title: "#4ec9b0", punctuation: "#d4d4d4" },
});

export const CODE_STYLE_OPTIONS = CODE_STYLE_IDS.map(
  (id) => CODE_STYLE_THEMES[id],
) as ReadonlyArray<CodeStyleTheme>;

export function getCodeStyleTheme(codeStyle: CodeStyleId): CodeStyleTheme {
  return CODE_STYLE_THEMES[codeStyle];
}

export function isCodeStyleId(value: unknown): value is CodeStyleId {
  return typeof value === "string" && CODE_STYLE_IDS.includes(value as CodeStyleId);
}

