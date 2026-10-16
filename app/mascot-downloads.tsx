import { useEffect, useRef } from 'react';

const pictures = [
  {name:'JBJI奶龙',file:'jbji-nailong-guardian.png',preview:'jbji-nailong-guardian.webp'},
  {name:'奶蛙 · 惊鸿一瞥',file:'conflict-nailong.png',preview:'conflict-nailong.webp'},
  {name:'暨伯奶察',file:'jbji-nailong-campus-patrol.png',preview:'conflict-campus-patrol.webp'},
  {name:'伯大奶察 · 剃刀党风格',file:'jbji-nailong-birmingham-gangster.png',preview:'conflict-birmingham-gangster.webp'},
  {name:'雨中奶龙',file:'jbji-nailong-next-chapter.png',preview:'jbji-nailong-rain-original.webp'},
];

function DownloadIcon() {
  return <svg className="downloadIcon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>;
}

export default function MascotDownloads() {
  const menu=useRef<HTMLDetailsElement>(null);
  useEffect(()=>{
    const outside=(event:PointerEvent)=>{
      if(menu.current?.open&&!menu.current.contains(event.target as Node))menu.current.open=false;
    };
    const escape=(event:KeyboardEvent)=>{
      if(event.key==='Escape'&&menu.current?.open){
        menu.current.open=false;
        menu.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',escape);
    return ()=>{
      document.removeEventListener('pointerdown',outside);
      document.removeEventListener('keydown',escape);
    };
  },[]);
  return <details className="mascotDownloadMenu" ref={menu} onBlur={event=>{
    if(!event.currentTarget.contains(event.relatedTarget as Node|null))event.currentTarget.open=false;
  }}>
    <summary className="mascotDownload">根本没有这样的生物！ <DownloadIcon/><span aria-hidden="true">⌄</span></summary>
    <div className="mascotDownloadOptions">
      <p>选择图片下载 <small>PNG 原图</small></p>
      {pictures.map(picture=><a key={picture.file} href={`${import.meta.env.BASE_URL}${picture.file}`} download={`${picture.name}.png`} aria-label={`下载${picture.name}图片`}>
        <img src={`${import.meta.env.BASE_URL}${picture.preview}`} alt="" width="112" height="80" loading="lazy"/>
        <DownloadIcon/>
      </a>)}
    </div>
  </details>;
}
