'use client';

import { useEffect, useState } from 'react';
import { chromeIntentUrl, detectInAppBrowser, type InAppBrowser } from '@/lib/utils/inAppBrowser';
import styles from './InAppBrowserNotice.module.css';

/**
 * "Open in Chrome / Safari" when the page is inside Instagram's, Facebook's
 * or another app's browser, where the camera and microphone often don't work
 * (VC-1). Advice only: joining is not blocked.
 */
export function InAppBrowserNotice() {
  const [found, setFound] = useState<{ browser: InAppBrowser; href: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Only known after mount: the server can't see the browser.
    const browser = detectInAppBrowser(navigator.userAgent);
    if (browser) setFound({ browser, href: window.location.href }); // eslint-disable-line react-hooks/set-state-in-effect -- read once on mount
  }, []);

  if (!found) return null;
  const { browser, href } = found;

  const appName = browser.app ? `${browser.app}’s browser` : 'an app’s browser';
  const intent = browser.platform === 'android' ? chromeIntentUrl(href) : null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={styles.notice} role="note">
      <p className={styles.title}>Open this page in {browser.platform === 'ios' ? 'Safari' : 'Chrome'}</p>
      <p className={styles.text}>
        You&apos;re in {appName}. The camera and microphone often don&apos;t work here.
        {browser.platform === 'ios'
          ? ' Tap ••• (or the share icon) and choose “Open in Safari”, or copy the link and paste it into Safari.'
          : ' Tap the button below, or copy the link and paste it into Chrome.'}
      </p>
      <div className={styles.actions}>
        {intent && (
          <a className={styles.primary} href={intent}>
            Open in Chrome
          </a>
        )}
        <button type="button" className={styles.secondary} onClick={copyLink}>
          {copied ? 'Link copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
