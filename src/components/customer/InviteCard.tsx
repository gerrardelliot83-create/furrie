/**
 * InviteCard — dashboard card for the viral invite system.
 *
 * Three states:
 *   1. Available: show code + share buttons (copy link, WhatsApp, email)
 *   2. Redeemed, not yet rewarded: "Used by {name}. You'll get a free
 *      consultation when they complete their first appointment."
 *   3. Redeemed + rewarded: "Your bonus consultation has been added!"
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import styles from './InviteCard.module.css';

interface InviteData {
  id: string;
  code: string;
  status: 'available' | 'redeemed' | 'revoked';
  redeemed_at: string | null;
  referrer_rewarded_at: string | null;
}

export function InviteCard() {
  const { toast } = useToast();
  const t = useTranslations('invite');
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/invites/mine', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const invites = data.invites as InviteData[];
        if (invites?.length > 0) {
          setInvite(invites[0]);
        }
      } catch {
        // Silently fail — card just won't render
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const shareUrl = invite
    ? `https://app.furrie.in/signup?invite=${encodeURIComponent(invite.code)}`
    : '';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast(t('linkCopied'), 'success');
    } catch {
      toast('Could not copy — please copy the link manually', 'error');
    }
  }, [shareUrl, toast, t]);

  const handleWhatsApp = useCallback(() => {
    const text = encodeURIComponent(
      `Here's an invite to Furrie: video consultations with registered vets for dogs and cats. It gives you 1 free consultation: ${shareUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  }, [shareUrl]);

  const handleEmail = useCallback(() => {
    const subject = encodeURIComponent('An invite to Furrie: 1 free vet consultation');
    const body = encodeURIComponent(
      `Hi,\n\nHere's an invite to Furrie. You can book a video consultation with a registered vet for your dog or cat.\n\nThis link gives you 1 free consultation:\n${shareUrl}\n`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
  }, [shareUrl]);

  if (loading || !invite) return null;

  // Revoked invites are hidden
  if (invite.status === 'revoked') return null;

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{t('title')}</h3>

      {invite.status === 'available' && (
        <>
          <p className={styles.subtitle}>
            {t('subtitle')}
          </p>

          <div className={styles.codeRow}>
            <span className={styles.codeBox}>{invite.code}</span>
            <button type="button" className={styles.copyBtn} onClick={handleCopy}>
              {t('copyLink')}
            </button>
          </div>

          <div className={styles.shareRow}>
            <button type="button" className={styles.shareBtn} onClick={handleWhatsApp}>
              {t('shareWhatsApp')}
            </button>
            <button type="button" className={styles.shareBtn} onClick={handleEmail}>
              {t('shareEmail')}
            </button>
          </div>
        </>
      )}

      {invite.status === 'redeemed' && !invite.referrer_rewarded_at && (
        <div className={cn(styles.statusBadge, styles.statusRedeemed)}>
          Your invite was used! You will receive a free consultation when your
          friend completes their first appointment.
        </div>
      )}

      {invite.status === 'redeemed' && invite.referrer_rewarded_at && (
        <div className={cn(styles.statusBadge, styles.statusRewarded)}>
          Your bonus consultation has been added to your account!
        </div>
      )}
    </div>
  );
}
