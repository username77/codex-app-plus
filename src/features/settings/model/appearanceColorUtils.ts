type RgbColor = readonly [number, number, number];

export function clampUnit(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function parseHexColor(value: string): RgbColor | null {
  const normalized = value.trim();
  if (!/^#[\da-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
}

function formatHexColor(value: number): string {
  return value.toString(16).padStart(2, "0").toUpperCase();
}

function formatAlpha(value: number): string {
  return Number.parseFloat(clampUnit(value).toFixed(2)).toString();
}

export function mixHexColors(tint: string, base: string, weight: number): string {
  const tintRgb = parseHexColor(tint);
  const baseRgb = parseHexColor(base);
  if (tintRgb === null || baseRgb === null) {
    return base;
  }
  const alpha = clampUnit(weight);
  const channels = tintRgb.map((channel, index) =>
    Math.round(channel * alpha + baseRgb[index]! * (1 - alpha)),
  );
  return `#${channels.map(formatHexColor).join("")}`;
}

export function rgbaString(color: string, alpha: number): string {
  const rgb = parseHexColor(color);
  if (rgb === null) {
    return `rgba(0, 0, 0, ${formatAlpha(alpha)})`;
  }
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${formatAlpha(alpha)})`;
}
