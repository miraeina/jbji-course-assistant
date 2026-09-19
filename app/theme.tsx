import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';

const themes = [
  {id:'jbji',label:'暨伯橙',description:'默认配色',swatches:['#bd570c','#fff0e2','#f7eae0']},
  {id:'jnu',label:'暨南青绿',description:'清爽柔和',swatches:['#216e73','#e8f3f2','#edf1f9']},
  {id:'blue',label:'静蓝',description:'简洁沉静',swatches:['#395e9b','#edf2fb','#f0edf8']},
  {id:'violet',label:'暮紫',description:'柔和雅致',swatches:['#70549a','#f1ebf8','#eef3f7']},
  {id:'rose',label:'玫瑰',description:'温暖轻盈',swatches:['#a34e69','#fbedf2','#f8f2e9']},
  {id:'forest',label:'松林绿',description:'自然清新',swatches:['#376749','#e9f3e6','#edf1f8']},
  {id:'cream',label:'奶油米',description:'暖纸质感',swatches:['#86602f','#f6edd8','#eef4e9']},
  {id:'cherry',label:'樱桃红',description:'明快复古',swatches:['#a5413d','#fbe9e3','#edf5f0']},
  {id:'graphite',label:'石墨灰',description:'克制简洁',swatches:['#4b5969','#eaf0f5','#edf4f0']},
] as const;
type Theme = typeof themes[number]['id'];
const themeKey = 'jbji-color-theme';
const isTheme = (value:unknown):value is Theme => themes.some(theme=>theme.id===value);

function readTheme():Theme {
  try { const saved=localStorage.getItem(themeKey); return isTheme(saved)?saved:'jbji'; }
  catch { return 'jbji'; }
}

// Apply before React renders so a saved palette is visible on the first frame.
export function initializeTheme(){ document.documentElement.dataset.theme=readTheme(); }
const ThemeContext=createContext<{theme:Theme;chooseTheme:(theme:Theme)=>void}>({theme:'jbji',chooseTheme:()=>{}});

export function ThemeProvider({children}:{children:ReactNode}){
  const [theme,setTheme]=useState<Theme>(readTheme);
  function chooseTheme(next:Theme){
    document.documentElement.dataset.theme=next;
    setTheme(next);
    try { localStorage.setItem(themeKey,next); } catch { /* The current session still keeps the selection. */ }
  }
  useEffect(()=>{
    const sync=(event:StorageEvent)=>{
      if(event.key!==themeKey&&event.key!==null)return;
      const next=readTheme();
      document.documentElement.dataset.theme=next; setTheme(next);
    };
    window.addEventListener('storage',sync);
    return ()=>window.removeEventListener('storage',sync);
  },[]);
  return <ThemeContext.Provider value={{theme,chooseTheme}}>{children}</ThemeContext.Provider>;
}

export function ThemePicker(){
  const {theme,chooseTheme}=useContext(ThemeContext);
  const [open,setOpen]=useState(false);
  const container=useRef<HTMLDivElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const panelId=useId();
  useEffect(()=>{
    if(!open)return;
    const dismiss=(event:PointerEvent)=>{if(!container.current?.contains(event.target as Node))setOpen(false)};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus()}};
    document.addEventListener('pointerdown',dismiss);
    document.addEventListener('keydown',escape);
    return ()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape)};
  },[open]);
  return <div className="themePicker" ref={container} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}}>
    <button className="themeTrigger" ref={trigger} aria-expanded={open} aria-controls={panelId} aria-label={`切换配色，当前${themes.find(item=>item.id===theme)?.label}`} onClick={()=>setOpen(!open)}><span className="themeDot" aria-hidden="true"/>配色<span aria-hidden="true">⌄</span></button>
    {open&&<div className="themeOptions" id={panelId} role="group" aria-label="选择网站配色">{themes.map(item=><button key={item.id} aria-pressed={theme===item.id} onClick={()=>{chooseTheme(item.id);setOpen(false);trigger.current?.focus()}}>
      <span className="themeSwatches" aria-hidden="true">{item.swatches.map(color=><i key={color} style={{background:color}}/>)}</span>
      <span><strong>{item.label}</strong><small>{item.description}</small></span><span className="themeCheck" aria-hidden="true">{theme===item.id?'✓':''}</span>
    </button>)}<p>自动记住选择，导出沿用此配色</p></div>}
  </div>;
}
