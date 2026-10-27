import { useEffect, type RefObject } from 'react';
// Move focus off the background trigger before MUI marks that region aria-hidden.
// Keep the trigger for explicit restoration; do not disable MUI focus trapping.
export function captureOverlayTrigger(): HTMLElement | null {
  const target = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  target?.blur();
  return target;
}
export function restoreOverlayTrigger(target: HTMLElement | null | undefined) {
  queueMicrotask(() => {
    const overlays = document.querySelectorAll<HTMLElement>('[data-rb-overlay-active="true"]');
    const top = overlays[overlays.length - 1];
    // A form may close into a request drawer. Never move focus behind that drawer.
    if (top && (!target || !top.contains(target))) return;
    if (target?.isConnected && !target.closest('[data-rb-overlay-active="false"]')) target.focus();
    else if (!top) document.getElementById('workspace')?.focus();
  });
}
export function useOverlayReturnFocus(ref: RefObject<HTMLElement | null>, target: HTMLElement | null | undefined) {
  useEffect(() => {
    const node = ref.current;
    return () => {
      // StrictMode runs effect cleanup while mounted; restore only after removal.
      queueMicrotask(() => { if (!node?.isConnected) restoreOverlayTrigger(target); });
    };
  }, [ref, target]);
}
