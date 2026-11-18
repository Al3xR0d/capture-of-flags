type HideBadgeCallback = ((hide: boolean) => void) | null;
let callback: HideBadgeCallback = null;

export function setFirstBloodBadgeCallback(cb: HideBadgeCallback) {
  callback = cb;
}

export function callHideFirstBloodBadge(hide: boolean) {
  callback?.(hide);
}
