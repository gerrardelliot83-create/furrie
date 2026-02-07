'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { Pet } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import styles from './ConsultationSummary.module.css';

interface ConsultationSummaryProps {
  pet: Pet;
  concernText: string;
  symptoms: string[];
  isPlusUser?: boolean;
  onSubmit: () => void;
  onBack: () => void;
  loading?: boolean;
  className?: string;
}

export function ConsultationSummary({
  pet,
  concernText,
  symptoms,
  isPlusUser = false,
  onSubmit,
  onBack,
  loading = false,
  className,
}: ConsultationSummaryProps) {
  const t = useTranslations('consultation');
  const tSymptoms = useTranslations('symptoms');
  const tCommon = useTranslations('common');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // TODO: Phase 5 - Replace with actual pricing calculation
  const consultationFee = 499;
  const taxAmount = Math.round(consultationFee * 0.18);
  const totalAmount = consultationFee + taxAmount;

  const primaryPhoto = pet.photoUrls?.[0];

  return (
    <div className={cn(styles.container, className)}>
      <h2 className={styles.title}>{t('reviewAndPay')}</h2>
      <p className={styles.subtitle}>Please review your consultation request</p>

      {/* Pet Summary Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.petInfo}>
            <div className={styles.petAvatar}>
              {primaryPhoto ? (
                <Image
                  src={primaryPhoto}
                  alt={pet.name}
                  width={48}
                  height={48}
                  className={styles.petImage}
                />
              ) : (
                <div className={styles.petFallback}>
                  {pet.species === 'dog' ? (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5M14 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.96-1.45-2.344-2.5" />
                      <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309" />
                    </svg>
                  ) : (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3.1-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5z" />
                    </svg>
                  )}
                </div>
              )}
            </div>
            <div>
              <h3 className={styles.petName}>{pet.name}</h3>
              <p className={styles.petDetails}>
                {pet.breed} ({pet.species === 'dog' ? 'Dog' : 'Cat'})
              </p>
            </div>
          </div>
        </div>

        {concernText && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Concern</h4>
            <p className={styles.concernText}>{concernText}</p>
          </div>
        )}

        {symptoms.length > 0 && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Symptoms</h4>
            <div className={styles.symptomTags}>
              {symptoms.map((symptom) => (
                <span key={symptom} className={styles.symptomTag}>
                  {tSymptoms(symptom)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pricing Card */}
      <div className={styles.pricingCard}>
        {isPlusUser ? (
          <div className={styles.plusBadge}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Included in your Furrie Plus plan</span>
          </div>
        ) : (
          <>
            <div className={styles.priceRow}>
              <span>Consultation Fee</span>
              <span>{formatCurrency(consultationFee)}</span>
            </div>
            <div className={styles.priceRow}>
              <span>GST (18%)</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className={styles.divider} />
            <div className={cn(styles.priceRow, styles.total)}>
              <span>Total</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </>
        )}
      </div>

      {/* Terms Checkbox */}
      <label className={styles.termsLabel}>
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className={styles.checkbox}
        />
        <span className={styles.termsText}>
          I agree to the{' '}
          <a href="/terms" target="_blank" className={styles.link}>
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" target="_blank" className={styles.link}>
            Privacy Policy
          </a>
          . I understand this is a teleconsultation and not a substitute for
          in-person veterinary care.
        </span>
      </label>

      {/* Actions */}
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onBack} disabled={loading}>
          {tCommon('back')}
        </Button>
        <Button
          variant="primary"
          onClick={onSubmit}
          disabled={!agreedToTerms || loading}
          loading={loading}
        >
          {isPlusUser ? 'Connect Now' : 'Pay & Connect'}
        </Button>
      </div>
    </div>
  );
}
