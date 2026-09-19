export const colorFields = [
  ['accent', '界面主色'], ['uob', '伯大课程'], ['jnu', '暨大课程'],
  ['english', '英语课程'], ['general', '通识课'],
] as const;
export type ColorField = typeof colorFields[number][0];
export type CustomPalette = { version: 1; name: string; colors: Record<ColorField, string> };
export const defaultPalette: CustomPalette = {
  version: 1, name: '我的配色',
  colors: { accent: '#bd570c', uob: '#bb783e', jnu: '#548d86', english: '#758caf', general: '#948367' },
};
export function normalizeColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const color = value.trim().toLowerCase();
  if (/^#[\da-f]{6}$/.test(color)) return color;
  if (/^#[\da-f]{3}$/.test(color)) return '#' + [...color.slice(1)].map(c => c + c).join('');
  return null;
}
export function parsePalette(text: string): CustomPalette {
  if (text.length > 16384) throw new Error('配色文件过大，请选择小于 16 KB 的 JSON 文件。');
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('无法读取 JSON，请使用从「自定义配色」导出的文件。'); }
  if (!data || typeof data !== 'object') throw new Error('配色文件格式不正确。');
  const value = data as Partial<CustomPalette>;
  if (value.version !== 1 || typeof value.name !== 'string' || !value.name.trim() || value.name.trim().length > 24 || !value.colors || typeof value.colors !== 'object') {
    throw new Error('配色文件需要版本、名称和五项颜色。可先导出一份作为模板。');
  }
  const colors = {} as Record<ColorField, string>;
  for (const [key, label] of colorFields) {
    const color = normalizeColor(value.colors[key]);
    if (!color) throw new Error(`${label}需要 #RRGGBB 或 #RGB 格式的色值。`);
    colors[key] = color;
  }
  return { version: 1, name: value.name.trim(), colors };
}
export function serializePalette(palette: CustomPalette): string {
  return JSON.stringify(parsePalette(JSON.stringify(palette)), null, 2) + '\n';
}
function rgb(color: string) { return [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)); }
function mix(color: string, target: number, amount: number): string {
  return '#' + rgb(color).map(c => Math.round(c + (target - c) * amount).toString(16).padStart(2, '0')).join('');
}
export function contrast(first: string, second: string): number {
  const luminance = (color: string) => rgb(color).map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
function readableAccent(color: string): string {
  let next = color;
  while (contrast(next, '#ffffff') < 5) next = mix(next, 0, .06);
  return next;
}
// Only generated, whitelisted values reach CSS. All surfaces remain light.
export function paletteTokens(palette: CustomPalette): Record<string, string> {
  const color = palette.colors.accent, accent = readableAccent(color);
  const tokens: Record<string, string> = {
    '--ink': mix(color, 0, .8), '--muted': mix(accent, 0, .24),
    '--line': mix(color, 255, .82), '--paper': mix(color, 255, .96),
    '--surface': '#ffffff', '--surface-soft': mix(color, 255, .96),
    '--accent': accent, '--accent-hover': mix(accent, 0, .2),
    '--accent-soft': mix(color, 255, .9), '--accent-line': mix(color, 255, .65),
    '--focus': accent, '--brand': accent,
    '--table-head': mix(color, 255, .9), '--table-time': mix(color, 255, .97),
    '--table-break': mix(color, 255, .93),
    '--course-muted': '#535963', '--course-ink': '#303640',
  };
  for (const [key] of colorFields.slice(1)) {
    tokens[`--${key}`] = readableAccent(palette.colors[key]);
    tokens[`--${key}-soft`] = mix(palette.colors[key], 255, .88);
  }
  return tokens;
}
