// Device pixels per game pixel, so the canvas is as sharp as the screen. `globalThis` is read instead
// of `window` because the e2e helpers import `ui/text.ts` in Node, where there is no window.

/**
 * Between 1 and 2. A phone with 3 device pixels per pixel is drawn at 2 and scaled by the browser:
 * that is already sharp, and the canvas has about half the pixels to fill every frame.
 */
export const pixelRatio = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
