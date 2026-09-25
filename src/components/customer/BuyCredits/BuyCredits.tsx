'use client';

/**
 * BuyCredits — the customer's UPI purchase flow (L1, 2026-09-25).
 *
 *   choose → pay → checking
 *
 * choose:   1 / 3 / 5 / 10 consultations with price + GST (from the server's
 *           price list, passed in as quotes).
 * pay:      the server's order (amount, reference, UPI link, QR code). Phone:
 *           "Pay with a UPI app" button; computer: QR code; always: copy
 *           buttons for UPI ID, amount and reference. Then "I've paid"
 *           (optional 12-digit UPI transaction ID), or "Send payment details
 *           on WhatsApp", which marks it paid and opens WhatsApp.
 * checking: we're verifying; credits arrive after an admin finds the payment.
 *
 * Nothing here grants credits: that only happens when an admin verifies the
 * payment in the admin portal.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PackQuote } from '@/lib/pricing/packs';
import { formatInr, packLabel } from '@/lib/pricing/packs';
import type { PaymentRequestView } from '@/lib/credits/paymentView';
import { Button } from '@/components/ui/Button';
import styles from './BuyCredits.module.css';

type Step = 'choose' | 'pay' | 'checking';

interface BuyCreditsProps {
  quotes: readonly PackQuote[];
  initialRequest: PaymentRequestView | null;
  /** Open request from before L1 (no price); shown as a note only. */
  legacyQuantity?: number | null;
  promise: string;
  /** Heading shown above the pack choice. */
  heading?: string;
  intro?: string;
}

function istDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function CopyRow({ label, value, display }: { label: string; value: string; display?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className={styles.copyRow}>
      <span className={styles.copyLabel}>{label}</span>
      <span className={styles.copyValue}>{display ?? value}</span>
      <button type="button" className={styles.copyButton} onClick={copy} aria-label={`Copy ${label}`}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export function BuyCredits({
  quotes,
  initialRequest,
  legacyQuantity = null,
  promise,
  heading = 'Buy consultations',
  intro = 'Choose how many consultations you want. You pay by UPI; we add them to your account once we have checked the payment.',
}: BuyCreditsProps) {
  const router = useRouter();
  const [order, setOrder] = useState<PaymentRequestView | null>(initialRequest);
  const [step, setStep] = useState<Step>(
    initialRequest ? (initialRequest.claimedAt ? 'checking' : 'pay') : 'choose'
  );
  const [selected, setSelected] = useState<number | null>(initialRequest?.packSize ?? null);
  const [utr, setUtr] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startOrder = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/consultation-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packSize: selected }),
      });
      const data = await res.json();
      if (res.status === 409 && data.code === 'PAYMENT_BEING_CHECKED' && data.request) {
        setOrder(data.request);
        setStep('checking');
        return;
      }
      if (!res.ok || !data.request) {
        throw new Error(data.error || 'Could not start your order. Please try again.');
      }
      setOrder(data.request);
      setStep('pay');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const claimPaid = async () => {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/consultation-requests/${order.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utr: utr.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.request) {
        throw new Error(data.error || 'Could not save that. Please try again.');
      }
      setOrder(data.request);
      setStep('checking');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  // WhatsApp: mark the order as paid in the background (keepalive survives
  // the navigation) and let the link open WhatsApp in the same tap.
  const onWhatsApp = () => {
    if (!order || order.claimedAt) return;
    void fetch(`/api/consultation-requests/${order.id}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ utr: /^[0-9]{12}$/.test(utr.replace(/\s+/g, '')) ? utr : undefined }),
      keepalive: true,
    }).catch(() => undefined);
    setOrder({ ...order, claimedAt: new Date().toISOString() });
    setStep('checking');
  };

  if (step === 'checking' && order) {
    return (
      <section className={styles.panel} aria-live="polite">
        <h2 className={styles.heading}>We&apos;re checking your payment</h2>
        <p className={styles.text}>{promise}</p>
        <div className={styles.summary}>
          <CopyRow label="Reference" value={order.reference} />
          <div className={styles.copyRow}>
            <span className={styles.copyLabel}>Amount</span>
            <span className={styles.copyValue}>{formatInr(order.total)}</span>
          </div>
          <div className={styles.copyRow}>
            <span className={styles.copyLabel}>Pack</span>
            <span className={styles.copyValue}>{packLabel(order.packSize)}</span>
          </div>
          {order.claimedAt && (
            <div className={styles.copyRow}>
              <span className={styles.copyLabel}>Marked paid</span>
              <span className={styles.copyValue}>{istDateTime(order.claimedAt)} IST</span>
            </div>
          )}
        </div>
        <p className={styles.textSmall}>
          Questions about this payment? Message us on WhatsApp with your payment screenshot, or call{' '}
          <a href={order.callUrl} className={styles.inlineLink}>{order.supportDisplay}</a>.
        </p>
        <div className={styles.actions}>
          <a href={order.whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.secondaryLink}>
            WhatsApp us
          </a>
          <Link href="/dashboard" className={styles.secondaryLink}>
            Back to dashboard
          </Link>
        </div>
      </section>
    );
  }

  if (step === 'pay' && order) {
    return (
      <section className={styles.panel}>
        <h2 className={styles.heading}>Pay {formatInr(order.total)} by UPI</h2>
        <p className={styles.text}>
          {packLabel(order.packSize)} · {formatInr(order.price)} + {formatInr(order.gst)} GST
        </p>

        <ol className={styles.steps}>
          <li>
            <strong>Pay from any UPI app</strong> (Google Pay, PhonePe, Paytm, BHIM).
            <a href={order.upiLink} className={styles.upiButton}>
              Pay {formatInr(order.total)} with a UPI app
            </a>
            <div className={styles.qrDesktop}>
              {/* eslint-disable-next-line @next/next/no-img-element -- server-rendered SVG data URI */}
              <img src={order.qrDataUri} alt={`UPI QR code to pay ${formatInr(order.total)}`} className={styles.qr} />
              <p className={styles.founderNote}>This is our founder&apos;s personal UPI.</p>
            </div>
            <details className={styles.qrMobile}>
              <summary>Show the QR code (to scan from another phone)</summary>
              {/* eslint-disable-next-line @next/next/no-img-element -- server-rendered SVG data URI */}
              <img src={order.qrDataUri} alt={`UPI QR code to pay ${formatInr(order.total)}`} className={styles.qr} />
            </details>
            <p className={`${styles.founderNote} ${styles.founderNoteMobile}`}>
              This is our founder&apos;s personal UPI.
            </p>
            <div className={styles.summary}>
              <CopyRow label="UPI ID" value={order.vpa} />
              <CopyRow label="Amount" value={String(order.total)} display={formatInr(order.total)} />
              <CopyRow label="Reference" value={order.reference} />
            </div>
            <p className={styles.textSmall}>
              If your app doesn&apos;t fill them in, pay the exact amount and add the reference{' '}
              <strong>{order.reference}</strong> in the payment note.
            </p>
          </li>
          <li>
            <strong>Tell us you&apos;ve paid.</strong>
            <label className={styles.utrLabel} htmlFor="utr">
              UPI transaction ID (optional — the 12-digit number in your UPI app)
            </label>
            <input
              id="utr"
              className={styles.utrInput}
              inputMode="numeric"
              autoComplete="off"
              maxLength={16}
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="e.g. 427812345678"
            />
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.actions}>
              <Button variant="primary" onClick={claimPaid} loading={busy} disabled={busy}>
                I&apos;ve paid
              </Button>
              <a
                href={order.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.secondaryLink}
                onClick={onWhatsApp}
              >
                Send payment details on WhatsApp
              </a>
              <a href={order.callUrl} className={styles.secondaryLink}>
                Call {order.supportDisplay}
              </a>
            </div>
          </li>
        </ol>

        <p className={styles.textSmall}>{promise}</p>
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => {
            setStep('choose');
            setError(null);
          }}
        >
          Choose a different pack
        </button>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <h2 className={styles.heading}>{heading}</h2>
      <p className={styles.text}>{intro}</p>
      {legacyQuantity ? (
        <p className={styles.notice}>
          You asked us earlier for {packLabel(legacyQuantity)}. You can now buy directly below.
        </p>
      ) : null}
      <div className={styles.packGrid} role="radiogroup" aria-label="Number of consultations">
        {quotes.map((q) => (
          <button
            key={q.size}
            type="button"
            role="radio"
            aria-checked={selected === q.size}
            className={`${styles.packCard} ${selected === q.size ? styles.packCardSelected : ''}`}
            onClick={() => setSelected(q.size)}
          >
            <span className={styles.packSize}>{packLabel(q.size)}</span>
            <span className={styles.packPrice}>{formatInr(q.price)}</span>
            <span className={styles.packGst}>+ {formatInr(q.gst)} GST = {formatInr(q.total)}</span>
            <span className={styles.packPer}>
              {q.size === 1 ? 'Single consultation' : `${formatInr(q.perConsultation)} each · save ${formatInr(q.savingVsSingle)}`}
            </span>
          </button>
        ))}
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <Button variant="primary" onClick={startOrder} loading={busy} disabled={!selected || busy}>
          {selected
            ? `Continue to pay ${formatInr(quotes.find((q) => q.size === selected)?.total ?? 0)}`
            : 'Choose a pack'}
        </Button>
      </div>
    </section>
  );
}
