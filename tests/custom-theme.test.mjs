import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeColor, parsePalette, serializePalette, defaultPalette, paletteTokens, contrast, colorFields } from '../app/custom-theme.ts';

test('palette files normalize HEX and round-trip only supported fields', () => {
  const imported = { ...defaultPalette, name: ' 我的颜色 ', colors: { ...defaultPalette.colors, accent: '#AbC', extra: 'url(https://example.com)' }, arbitrary: 'ignored' };
  const result = parsePalette(JSON.stringify(imported));
  assert.equal(result.name, '我的颜色');
  assert.equal(result.colors.accent, '#aabbcc');
  assert.deepEqual(Object.keys(result.colors), colorFields.map(([key]) => key));
  assert.deepEqual(parsePalette(serializePalette(result)), result);
});
test('malformed or unsupported imports never produce a palette', () => {
  for (const data of [null, [], {}, { ...defaultPalette, version: 2 }, { ...defaultPalette, name: '' }, { ...defaultPalette, name: 'a'.repeat(25) }, { ...defaultPalette, colors: { accent: '#abc' } }, { ...defaultPalette, colors: { ...defaultPalette.colors, uob: 'red;display:none' } }]) {
    assert.throws(() => parsePalette(JSON.stringify(data)));
  }
  assert.throws(() => parsePalette('{'));
  assert.throws(() => parsePalette(' '.repeat(16385)));
  for (const value of ['red', '#00000000', '#12', 'url(test)', null, 123]) assert.equal(normalizeColor(value), null);
});
test('extreme custom colors retain readable buttons, text and category cards', () => {
  for (const color of ['#ffffff', '#000000', '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff0000', '#0000ff', '#777777', '#bd570c']) {
    const palette = { ...defaultPalette, colors: Object.fromEntries(colorFields.map(([key]) => [key, color])) };
    const tokens = paletteTokens(palette);
    assert.ok(contrast(tokens['--accent'], '#ffffff') >= 4.5, color);
    assert.ok(contrast(tokens['--ink'], tokens['--paper']) >= 4.5, color);
    assert.ok(contrast(tokens['--accent-hover'], tokens['--accent-soft']) >= 4.5, color);
    for (const [key] of colorFields.slice(1)) assert.ok(contrast(tokens['--course-ink'], tokens[`--${key}-soft`]) >= 4.5, `${key}: ${color}`);
    for (const value of Object.values(tokens)) assert.match(value, /^#[\da-f]{6}$/);
  }
});
