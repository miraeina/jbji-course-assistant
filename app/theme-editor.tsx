import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { colorFields, normalizeColor, paletteTokens, parsePalette, serializePalette, type CustomPalette } from './custom-theme';

export function ThemeEditor({ initial, onSave, onClose }: { initial: CustomPalette; onSave: (palette: CustomPalette) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(initial);
  const [message, setMessage] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const id = useId();
  const valid = draft.name.trim().length > 0 && colorFields.every(([key]) => normalizeColor(draft.colors[key]));
  const previewColors = Object.fromEntries(colorFields.map(([key]) => [key, normalizeColor(draft.colors[key]) ?? initial.colors[key]])) as CustomPalette['colors'];
  const preview = paletteTokens({ ...draft, colors: previewColors });
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element.showModal(); document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  function normalized() { return parsePalette(JSON.stringify(draft)); }
  async function importFile(selected?: File) {
    if (!selected) return;
    try {
      if (selected.size > 16384) throw new Error('配色文件过大，请选择小于 16 KB 的 JSON 文件。');
      const palette = parsePalette(await selected.text());
      setDraft(palette); setMessage('已导入预览，点击「应用配色」后生效。');
    } catch (error) { setMessage(error instanceof Error ? error.message : '读取文件失败，请重新选择。'); }
  }
  function exportFile() {
    try {
      const palette = normalized();
      const url = URL.createObjectURL(new Blob([serializePalette(palette)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'JBJI-自定义配色.json'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('配色文件已导出，可在其他设备导入。');
    } catch (error) { setMessage((error as Error).message); }
  }
  return <dialog className="paletteEditor" ref={dialog} aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="paletteHeader"><div><h2 id={`${id}-title`}>自定义配色</h2><p>调整主色与课程颜色，底色和文字会自动适配。</p></div><button aria-label="关闭自定义配色" onClick={onClose}>×</button></header>
    <div className="paletteBody">
      <label className="paletteName">配色名称<input maxLength={24} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })}/></label>
      <div className="paletteFields">{colorFields.map(([key, label]) => <div className="paletteField" key={key}>
        <label htmlFor={`${id}-${key}`}>{label}</label>
        <input type="color" aria-label={`${label}取色器`} value={previewColors[key]} onChange={event => setDraft({ ...draft, colors: { ...draft.colors, [key]: event.target.value } })}/>
        <input id={`${id}-${key}`} aria-invalid={!normalizeColor(draft.colors[key])} maxLength={7} spellCheck={false} value={draft.colors[key]} onChange={event => setDraft({ ...draft, colors: { ...draft.colors, [key]: event.target.value } })}/>
      </div>)}</div>
      <section className="palettePreview" aria-label="配色预览" style={preview as CSSProperties}>
        <div className="palettePreviewHead"><strong>{draft.name || '配色预览'}</strong><span>已选班级</span></div>
        <div className="palettePreviewCourses">{colorFields.slice(1).map(([key, label]) => <div key={key} style={{ background: preview[`--${key}-soft`], borderColor: preview[`--${key}`] }}><strong>{label}</strong><small>教师 · 教室 · 第 1–16 周</small></div>)}</div>
      </section>
      <div className="paletteFileActions"><button onClick={() => file.current?.click()}>导入配色 JSON</button><button disabled={!valid} onClick={exportFile}>导出配色 JSON</button><input ref={file} type="file" accept=".json,application/json" hidden onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ''; }}/></div>
      <p className="paletteHint">支持 #RRGGBB / #RGB。浅色会自动调深，保证按钮和文字清晰。只保存在当前浏览器，课表导出沿用此配色。</p>
      <p className="paletteMessage" role="status">{message || (!valid ? '请填写配色名称和有效的 HEX 色值。' : '')}</p>
    </div>
    <footer className="paletteFooter"><button onClick={onClose}>取消</button><button className="primary" disabled={!valid} onClick={() => { onSave(normalized()); onClose(); }}>应用配色</button></footer>
  </dialog>;
}
