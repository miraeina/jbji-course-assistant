import { useEffect, useRef } from 'react';
import { ThemePicker } from './theme';

function DownloadIcon() {
  return <svg className="downloadIcon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>;
}

function ResourceLinks() {
  return <><a href="#materials">原始资料</a><a href="#help">帮助</a><a href="https://github.com/miraeina/jbji-course-assistant" target="_blank" rel="noreferrer">GitHub ↗</a></>;
}

function MascotLinks() {
  return <>
    <a className="mascotDownload" href={`${import.meta.env.BASE_URL}jbji-nailong-guardian.png`} download="暨伯奶龙.png" title="下载JBJI奶龙">根本就没有这样的生物！ <DownloadIcon/></a>
    <a className="mascotDownload" href={`${import.meta.env.BASE_URL}conflict-nailong.png`} download="惊鸿一瞥.png" title="下载JBJI奶蛙">你只是怕了！ <DownloadIcon/></a>
  </>;
}

export default function SiteHeader() {
  const more = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (more.current?.open && !more.current.contains(event.target as Node)) more.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && more.current?.open) {
        more.current.open = false;
        more.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  return <header className="topbar scheduleHeader" id="top">
    <a className="brand" href="#top" aria-label="JBJI课表助手首页">
      <span className="brandMark"><img className="brandLogo" src="./jbji-logo.webp" fetchPriority="high" loading="eager" alt="暨南大学与伯明翰大学院徽"/></span>
      <span className="brandCopy"><strong>JBJI 课表助手</strong><small>2026–27 第一学期</small></span>
    </a>
    <nav className="topLinks" aria-label="网站工具">
      <ThemePicker/>
      <div className="desktopNavLinks"><ResourceLinks/><MascotLinks/></div>
      <details className="compactNav" ref={more} onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false;
      }}>
        <summary>更多<span aria-hidden="true">⌄</span></summary>
        <div className="compactNavPanel" onClick={event => {
          if ((event.target as HTMLElement).closest('a') && more.current) more.current.open = false;
        }}>
          <span className="navSectionLabel">资料与帮助</span><ResourceLinks/>
          <span className="navSectionLabel">校园彩蛋 · 原图下载</span><MascotLinks/>
        </div>
      </details>
    </nav>
  </header>;
}
