"use client";

/**
 * The pages visited in this tab since the app opened. "Πίσω" uses the browser history only
 * when the previous page was inside the app; otherwise it goes to the page's natural parent.
 */
const trail: string[] = [];

export function trackVisit(path: string) {
  const base = path.split("?")[0];
  const last = trail.at(-1)?.split("?")[0];
  if (base === last) {
    trail[trail.length - 1] = path;
    return;
  }
  // Going back pops the previous entry instead of growing the trail.
  if (trail.length > 1 && trail.at(-2)?.split("?")[0] === base) trail.pop();
  else trail.push(path);
  if (trail.length > 50) trail.shift();
}

export function canGoBack(): boolean {
  return trail.length > 1;
}
