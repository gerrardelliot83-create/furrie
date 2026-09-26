import 'server-only';

import { renderSVG } from 'uqr';

/**
 * Render a UPI link as an SVG QR code, on the server, as a data URI the page
 * can put straight into an <img>. Medium error correction survives a phone
 * camera at an angle; a 4-module quiet zone is what scanners expect.
 */
export function upiQrDataUri(upiLink: string): string {
  const svg = renderSVG(upiLink, {
    ecc: 'M',
    border: 4,
    pixelSize: 8,
    whiteColor: '#ffffff',
    blackColor: '#0e1a2b',
  });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
