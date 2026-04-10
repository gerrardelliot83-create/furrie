/**
 * ConsultationRequestModal — offline request form for more consultations.
 *
 * Shown when a customer has zero credits and clicks "Request more" on the
 * dashboard's ConsultationBalanceCard or is redirected via ?requestCredits=true.
 *
 * Fields: quantity (chip + custom), contact preference, phone, note.
 * On submit: POSTs to /api/consultation-requests. Shows success state.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import styles from './ConsultationRequestModal.module.css';

interface Props {
  prefillPhone?: string | null;
  onClose: () => void;
  onSubmitted?: () => void;
}

const QUANTITY_OPTIONS = [3, 5, 10] as const;

export function ConsultationRequestModal({ prefillPhone, onClose, onSubmitted }: Props) {
  const [quantity, setQuantity] = useState<number>(3);
  const [customQty, setCustomQty] = useState<string>('');
  const [preferredContact, setPreferredContact] = useState<string>('whatsapp');
  const [contactPhone, setContactPhone] = useState<string>(prefillPhone || '');
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const effectiveQuantity = customQty.trim() ? parseInt(customQty, 10) : quantity;
  const isValidQty =
    Number.isInteger(effectiveQuantity) && effectiveQuantity >= 1 && effectiveQuantity <= 50;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!isValidQty) {
      setError('Please select a valid number of consultations (1–50).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/consultation-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: effectiveQuantity,
          preferredContact,
          contactPhone: contactPhone.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit request');
      }

      setSuccess(true);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.successState}>
            <h2 className={styles.successTitle}>Request Submitted</h2>
            <p className={styles.successText}>
              We received your request for {effectiveQuantity} consultation
              {effectiveQuantity === 1 ? '' : 's'}. Our team will reach out
              to you shortly to coordinate.
            </p>
            <Button variant="primary" onClick={onClose}>
              Got it
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Request More Consultations</h2>
        <p className={styles.subtitle}>
          Select the number of consultations you&apos;d like and our team will
          coordinate the payment with you offline.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Quantity chips */}
          <div className={styles.quantityChips}>
            {QUANTITY_OPTIONS.map((q) => (
              <button
                key={q}
                type="button"
                className={`${styles.chip} ${
                  !customQty.trim() && quantity === q ? styles.chipActive : ''
                }`}
                onClick={() => {
                  setQuantity(q);
                  setCustomQty('');
                }}
              >
                {q}
              </button>
            ))}
            <input
              className={styles.chip}
              style={{ width: 60, textAlign: 'center' }}
              placeholder="Other"
              value={customQty}
              onChange={(e) => setCustomQty(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>How should we reach you?</label>
            <select
              className={styles.select}
              value={preferredContact}
              onChange={(e) => setPreferredContact(e.target.value)}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Phone call</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Phone / WhatsApp number</label>
            <input
              className={styles.input}
              value={contactPhone}
              placeholder="+91 98765 43210"
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Notes (optional)</label>
            <textarea
              className={styles.textarea}
              value={note}
              placeholder="Anything you'd like us to know"
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading} disabled={!isValidQty}>
              Submit Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
