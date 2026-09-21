import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { createLongPress } from './long-press';

export default function useCourseLongPress(identity: string) {
  const gesture = useRef(createLongPress());
  const touch = useRef(false);
  useEffect(() => {
    const current = gesture.current;
    const begin = (event: PointerEvent) => { touch.current = ['touch', 'pen'].includes(event.pointerType); current.newGesture(); };
    const move = (event: PointerEvent) => current.move(event.pointerId, event.clientX, event.clientY);
    const cancel = () => current.cancel();
    // Removal unmounts the card; swallow its trailing click before it can hit a card underneath.
    const click = (event: MouseEvent) => {
      if (event.detail !== 0 && current.suppressClick()) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    const context = (event: MouseEvent) => { if (current.suppressClick()) event.preventDefault(); };
    document.addEventListener('pointerdown', begin, true);
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', cancel, true);
    document.addEventListener('pointercancel', cancel, true);
    document.addEventListener('scroll', cancel, true);
    document.addEventListener('click', click, true);
    document.addEventListener('contextmenu', context, true);
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', cancel);
    return () => {
      current.newGesture();
      document.removeEventListener('pointerdown', begin, true);
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', cancel, true);
      document.removeEventListener('pointercancel', cancel, true);
      document.removeEventListener('scroll', cancel, true);
      document.removeEventListener('click', click, true);
      document.removeEventListener('contextmenu', context, true);
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', cancel);
    };
  }, [identity]);
  return (remove: (() => void) | undefined) => remove ? {
    'data-long-press-remove': true,
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (!event.isPrimary || !['touch', 'pen'].includes(event.pointerType) || event.button !== 0) return;
      gesture.current.start(event.pointerId, event.clientX, event.clientY, remove);
    },
    onContextMenu: (event: ReactMouseEvent<HTMLElement>) => { if (touch.current) event.preventDefault(); },
  } : {};
}
