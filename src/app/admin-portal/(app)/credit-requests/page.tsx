'use client';

/**
 * Admin → Credit requests (L1, 2026-09-25).
 *
 * Customers buy consultations by UPI to the founder's UPI ID and tap "I've
 * paid" (or send the details on WhatsApp). Here an admin finds the payment in
 * the bank / UPI app and grants the consultations in one step — or closes the
 * order when the payment can't be found. Opening /credit-requests?ref=FP…
 * (the link in WhatsApp messages and ops emails) shows just that order.
 */

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatInr, packLabel } from '@/lib/pricing/packs';
import { Spinner } from '@/components/ui/Spinner';
import styles from './page.module.css';

type Tab = 'claimed' | 'awaiting' | 'fulfilled' | 'cancelled' | 'all';

interface CreditRequest {
  id: string;
  customer_id: string;
  requested_quantity: number;
  preferred_contact: string | null;
  contact_phone: string | null;
  note: string | null;
  status: string;
  pack_size: number | null;
  price_inr: number | string | null;
  gst_inr: number | string | null;
  amount_inr: number | string | null;
  reference_code: string | null;
  payment_claimed_at: string | null;
  payer_utr: string | null;
  bank_reference: string | null;
  cancel_reason: string | null;
  fulfilled_at: string | null;
  created_at: string;
  profiles: { id: string; full_name: string | null; email: string | null; phone: string | null } | null;
}

const TABS: { value: Tab; label: string }[] = [
  { value: 'claimed', label: 'Customer says paid' },
  { value: 'awaiting', label: 'Awaiting payment' },
  { value: 'fulfilled', label: 'Granted' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
];

const CANCEL_REASONS = [
  { value: 'payment_not_found', label: 'Payment not found' },
  { value: 'customer_asked', label: 'Customer asked to cancel' },
  { value: 'duplicate', label: 'Duplicate order' },
  { value: 'other', label: 'Other' },
];

function ist(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function statusLabel(r: CreditRequest): { text: string; cls: string } {
  if (r.status === 'fulfilled') return { text: 'Granted', cls: styles.badgeFulfilled };
  if (r.status === 'cancelled')
    return { text: r.cancel_reason === 'replaced' ? 'Replaced by customer' : 'Cancelled', cls: styles.badgeCancelled };
  if (!r.reference_code) return { text: r.status === 'contacted' ? 'Legacy · contacted' : 'Legacy request', cls: styles.badgeContacted };
  if (r.payment_claimed_at) return { text: 'Customer says paid', cls: styles.badgePending };
  return { text: 'Awaiting payment', cls: styles.badgeContacted };
}

function CreditRequestsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const refParam = searchParams.get('ref');

  const [tab, setTab] = useState<Tab>('claimed');
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [granting, setGranting] = useState<CreditRequest | null>(null);
  const [cancelling, setCancelling] = useState<CreditRequest | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (refParam) params.set('ref', refParam);
      else params.set('tab', tab);
      if (search.trim()) params.set('q', search.trim());
      const response = await fetch(`/api/admin/consultation-requests?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch requests');
      setRequests(data.requests);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [tab, search, refParam]);

  useEffect(() => {
    const t = setTimeout(fetchRequests, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchRequests, search]);

  const onDone = async (message: string) => {
    setGranting(null);
    setCancelling(null);
    setNotice(message);
    await fetchRequests();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Credit requests
          {!loading && <span className={styles.count}> ({requests.length})</span>}
        </h1>
      </div>

      {refParam ? (
        <div className={styles.filters}>
          <span className={styles.refChip}>Order {refParam.toUpperCase()}</span>
          <button type="button" className={styles.filterButton} onClick={() => router.push('/credit-requests')}>
            Show all requests
          </button>
        </div>
      ) : (
        <div className={styles.filters}>
          {TABS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(styles.filterButton, tab === option.value && styles.filterButtonActive)}
              onClick={() => setTab(option.value)}
            >
              {option.label}
            </button>
          ))}
          <input
            type="search"
            className={styles.search}
            placeholder="Search reference, UPI ID, name, email, phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {notice && (
        <div className={styles.notice} role="status">
          {notice}
          <button type="button" className={styles.noticeClose} onClick={() => setNotice(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className={styles.emptyState}>
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className={styles.emptyState}>
          <p>{error}</p>
        </div>
      ) : requests.length === 0 ? (
        <div className={styles.emptyState}>
          <p>{refParam ? `No order ${refParam.toUpperCase()} found.` : 'Nothing here.'}</p>
        </div>
      ) : (
        <div className={styles.cards}>
          {requests.map((r) => {
            const st = statusLabel(r);
            const open = r.status === 'pending' || r.status === 'contacted';
            const priced = !!r.reference_code;
            const grantable =
              priced && (open || (r.status === 'cancelled' && r.cancel_reason === 'replaced'));
            return (
              <article key={r.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <div className={styles.customerName}>{r.profiles?.full_name || 'Unknown'}</div>
                    <div className={styles.customerEmail}>{r.profiles?.email || '—'}</div>
                    {(r.contact_phone || r.profiles?.phone) && (
                      <div className={styles.customerPhone}>{r.contact_phone || r.profiles?.phone}</div>
                    )}
                  </div>
                  <span className={cn(styles.badge, st.cls)}>{st.text}</span>
                </div>

                <dl className={styles.details}>
                  {priced ? (
                    <>
                      <dt>Reference</dt>
                      <dd className={styles.mono}>{r.reference_code}</dd>
                      <dt>Amount</dt>
                      <dd>
                        <strong>{formatInr(Number(r.amount_inr))}</strong>{' '}
                        <span className={styles.muted}>
                          ({formatInr(Number(r.price_inr))} + {formatInr(Number(r.gst_inr))} GST)
                        </span>
                      </dd>
                      <dt>Pack</dt>
                      <dd>{packLabel(r.pack_size ?? r.requested_quantity)}</dd>
                      <dt>UPI transaction ID</dt>
                      <dd className={styles.mono}>{r.payer_utr || '—'}</dd>
                    </>
                  ) : (
                    <>
                      <dt>Asked for</dt>
                      <dd>
                        {packLabel(r.requested_quantity)}{' '}
                        <span className={styles.muted}>(request from before online payment; no price)</span>
                      </dd>
                      {r.note && (
                        <>
                          <dt>Note</dt>
                          <dd>{r.note}</dd>
                        </>
                      )}
                    </>
                  )}
                  <dt>Ordered</dt>
                  <dd>{ist(r.created_at)}</dd>
                  <dt>Marked paid</dt>
                  <dd>{ist(r.payment_claimed_at)}</dd>
                  {r.status === 'fulfilled' && (
                    <>
                      <dt>Granted</dt>
                      <dd>
                        {ist(r.fulfilled_at)}
                        {r.bank_reference ? ` · bank ref ${r.bank_reference}` : ''}
                      </dd>
                    </>
                  )}
                </dl>

                <div className={styles.actions}>
                  {grantable && (
                    <button
                      type="button"
                      className={cn(styles.actionButton, styles.fulfillButton)}
                      onClick={() => setGranting(r)}
                    >
                      Payment received → grant
                    </button>
                  )}
                  {open && (
                    <button
                      type="button"
                      className={cn(styles.actionButton, styles.cancelButton)}
                      onClick={() => setCancelling(r)}
                    >
                      {priced ? 'Payment not found → close' : 'Close request'}
                    </button>
                  )}
                  {!priced && open && (
                    <span className={styles.muted}>If they paid offline, use Users → Assign Pack.</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {granting && (
        <GrantDialog request={granting} onClose={() => setGranting(null)} onDone={onDone} />
      )}
      {cancelling && (
        <CancelDialog request={cancelling} onClose={() => setCancelling(null)} onDone={onDone} />
      )}
    </div>
  );
}

function GrantDialog({
  request,
  onClose,
  onDone,
}: {
  request: CreditRequest;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [bankRef, setBankRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = formatInr(Number(request.amount_inr));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/consultation-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id, action: 'grant', bankReference: bankRef.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not grant');
      onDone(data.message || 'Granted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not grant');
      setBusy(false);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="grant-title">
      <div className={styles.dialog}>
        <h2 id="grant-title" className={styles.dialogTitle}>
          Grant {packLabel(request.pack_size ?? request.requested_quantity)}?
        </h2>
        <p className={styles.dialogText}>
          To <strong>{request.profiles?.full_name || 'Unknown'}</strong> ({request.profiles?.email || '—'}).
        </p>
        <p className={styles.dialogText}>
          Look in the bank or UPI app for <strong>{amount}</strong> with the note{' '}
          <strong className={styles.mono}>{request.reference_code}</strong>
          {request.payer_utr ? (
            <>
              {' '}or transaction ID <strong className={styles.mono}>{request.payer_utr}</strong>
            </>
          ) : null}
          .
        </p>
        <label className={styles.checkRow}>
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          <span>
            I found {amount} for {request.reference_code} in the bank / UPI app.
          </span>
        </label>
        <label className={styles.fieldLabel} htmlFor="bankref">
          Bank reference (optional)
        </label>
        <input
          id="bankref"
          className={styles.field}
          value={bankRef}
          onChange={(e) => setBankRef(e.target.value)}
          maxLength={100}
          placeholder="e.g. the UPI reference shown in your bank app"
        />
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.filterButton} onClick={onClose} disabled={busy}>
            Back
          </button>
          <button
            type="button"
            className={cn(styles.actionButton, styles.fulfillButton)}
            onClick={submit}
            disabled={!confirmed || busy}
          >
            {busy ? 'Granting…' : 'Grant now'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelDialog({
  request,
  onClose,
  onDone,
}: {
  request: CreditRequest;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const priced = !!request.reference_code;
  const [reason, setReason] = useState(priced ? 'payment_not_found' : 'other');
  const [notify, setNotify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/consultation-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id, action: 'cancel', reason, notifyCustomer: notify }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not close');
      onDone(data.notified ? 'Closed, and the customer was emailed.' : 'Closed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not close');
      setBusy(false);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="cancel-title">
      <div className={styles.dialog}>
        <h2 id="cancel-title" className={styles.dialogTitle}>
          Close {priced ? `order ${request.reference_code}` : 'this request'}?
        </h2>
        <p className={styles.dialogText}>
          {request.profiles?.full_name || 'Unknown'} ({request.profiles?.email || '—'}). Nothing is granted.
        </p>
        <label className={styles.fieldLabel} htmlFor="reason">
          Reason
        </label>
        <select id="reason" className={styles.field} value={reason} onChange={(e) => setReason(e.target.value)}>
          {CANCEL_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {priced && reason === 'payment_not_found' && (
          <label className={styles.checkRow}>
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            <span>Email the customer that we couldn&apos;t find the payment</span>
          </label>
        )}
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.filterButton} onClick={onClose} disabled={busy}>
            Back
          </button>
          <button
            type="button"
            className={cn(styles.actionButton, styles.cancelButton)}
            onClick={submit}
            disabled={busy}
          >
            {busy ? 'Closing…' : 'Close it'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CreditRequestsPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.emptyState}>
          <Spinner size="lg" />
        </div>
      }
    >
      <CreditRequestsInner />
    </Suspense>
  );
}
