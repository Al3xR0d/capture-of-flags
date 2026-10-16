/** Module-level callback для управления состоянием 3D-оверлея первой крови.
 *  Используется для синхронизации с движком борды (скрытие/показ бейджа). */

type HideBadgeCallback = ((hide: boolean) => void) | null;
let callback: HideBadgeCallback = null;

export function setFirstBloodBadgeCallback(cb: HideBadgeCallback) {
  callback = cb;
}

export function callHideFirstBloodBadge(hide: boolean) {
  callback?.(hide);
}
