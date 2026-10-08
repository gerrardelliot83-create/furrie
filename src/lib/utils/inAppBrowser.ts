/**
 * Detects the built-in browsers of social apps (VC-1). Pet parents arrive
 * from Instagram and Facebook links; those apps open pages in their own
 * browser, where the camera and microphone often don't work. Pure.
 */

export interface InAppBrowser {
  /** The app's name, or null when it isn't recognised by name. */
  app: string | null;
  platform: 'android' | 'ios' | 'other';
}

const APPS: Array<[RegExp, string]> = [
  [/Instagram/i, 'Instagram'],
  [/FBAN|FBAV|FB_IAB|FB4A|FBIOS/, 'Facebook'],
  [/LinkedInApp/i, 'LinkedIn'],
  [/Snapchat/i, 'Snapchat'],
  [/\bLine\//, 'LINE'],
  [/MicroMessenger/i, 'WeChat'],
];

/** The in-app browser `userAgent` belongs to, or null for a normal browser. */
export function detectInAppBrowser(userAgent: string | null | undefined): InAppBrowser | null {
  const ua = userAgent ?? '';
  if (!ua) return null;
  const platform: InAppBrowser['platform'] = /Android/i.test(ua)
    ? 'android'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'ios'
      : 'other';

  for (const [pattern, app] of APPS) {
    if (pattern.test(ua)) return { app, platform };
  }
  // Any other Android app's web view ("; wv)"): Chrome itself never says wv.
  if (platform === 'android' && /;\s*wv\)/.test(ua)) return { app: null, platform };
  return null;
}

/**
 * An Android link that opens `url` in Chrome instead of the app's browser.
 * Only for https URLs; returns null otherwise.
 */
export function chromeIntentUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  const rest = `${parsed.host}${parsed.pathname}${parsed.search}`;
  return `intent://${rest}#Intent;scheme=https;package=com.android.chrome;end`;
}
