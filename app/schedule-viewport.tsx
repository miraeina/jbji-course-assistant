import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export default function ScheduleViewport({ children, minWidth }: { children: ReactNode; minWidth: number }) {
  const viewport = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(minWidth);
  const [height, setHeight] = useState(0);
  const [zoom, setZoom] = useState<number | 'fit'>(1);
  const anchor = useRef<{ x: number; y: number } | null>(null);
  const baseWidth = Math.max(minWidth, width);
  const scale = zoom === 'fit' ? Math.min(1, width / baseWidth) : zoom;

  useLayoutEffect(() => {
    const scroll = viewport.current!, content = canvas.current!;
    const measure = () => {
      // Hidden mobile day views have zero dimensions; retain the last useful size.
      if (scroll.clientWidth) setWidth(scroll.clientWidth);
      if (content.offsetHeight) setHeight(content.offsetHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroll); observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!anchor.current || !viewport.current) return;
    const scroll = viewport.current;
    scroll.scrollLeft = anchor.current.x * scale - scroll.clientWidth / 2;
    scroll.scrollTop = anchor.current.y * scale - scroll.clientHeight / 2;
    anchor.current = null;
  }, [scale]);

  function changeZoom(next: number | 'fit') {
    const scroll = viewport.current!;
    anchor.current = {
      x: (scroll.scrollLeft + scroll.clientWidth / 2) / scale,
      y: (scroll.scrollTop + scroll.clientHeight / 2) / scale,
    };
    setZoom(next === 'fit' ? next : Math.max(.25, Math.min(2, Math.round(next * 100) / 100)));
  }

  return <>
    <div className="scheduleZoomControls" role="group" aria-label="课表缩放" data-export-exclude>
      <div className="scheduleZoomStepper">
        <button aria-label="缩小课表" disabled={scale <= .25} onClick={() => changeZoom(scale - .1)}>−</button>
        <output aria-live="polite" aria-label="课表缩放比例">{Math.round(scale * 100)}%</output>
        <button aria-label="放大课表" disabled={scale >= 2} onClick={() => changeZoom(scale + .1)}>＋</button>
      </div>
      <button aria-pressed={zoom === 'fit'} onClick={() => changeZoom('fit')}>适应宽度</button>
      <button aria-label="恢复课表原始大小" onClick={() => changeZoom(1)}>恢复</button>
    </div>
    <div className="tableScroll scheduleZoomViewport" ref={viewport} tabIndex={0} role="region" aria-label="课表，可滚动查看">
      <div className="scheduleZoomStage" style={{ width: baseWidth * scale, height: height * scale }}>
        <div className="scheduleZoomCanvas" ref={canvas} style={{ width: baseWidth, transform: `scale(${scale})` }}>{children}</div>
      </div>
    </div>
  </>;
}
