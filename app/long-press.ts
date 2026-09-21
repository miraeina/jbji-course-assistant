// Keep gesture timing independent of React so cancellation and click suppression are testable.
export function createLongPress() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let origin: { pointerId: number; x: number; y: number } | null = null;
  let consumed = false;
  const cancel = () => { clearTimeout(timer); timer = undefined; origin = null; };
  return {
    cancel,
    start(pointerId: number, x: number, y: number, action: () => void) {
      cancel(); consumed = false;
      origin = { pointerId, x, y };
      timer = setTimeout(() => { timer = undefined; origin = null; consumed = true; action(); }, 600);
    },
    move(pointerId: number, x: number, y: number) {
      if (origin && (pointerId !== origin.pointerId || Math.hypot(x - origin.x, y - origin.y) > 10)) cancel();
    },
    newGesture() { cancel(); consumed = false; },
    suppressClick() { return consumed; },
  };
}
