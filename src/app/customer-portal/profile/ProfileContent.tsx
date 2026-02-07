'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { User } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import styles from './ProfileContent.module.css';

interface ProfileContentProps {
  profile: User;
  hasActiveSubscription?: boolean;
}

export function ProfileContent({ profile, hasActiveSubscription = false }: ProfileContentProps) {
  const t = useTranslations('profile');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const tSub = useTranslations('subscription');
  const router = useRouter();
  const { signOut } = useAuth();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [formData, setFormData] = useState({
    fullName: profile.fullName,
    phone: profile.phone || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          phone: formData.phone || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setIsEditOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut();
      router.push('/login');
    } catch {
      setError('Failed to sign out');
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Profile Header */}
      <section className={styles.profileHeader}>
        <Avatar
          src={profile.avatarUrl}
          alt={profile.fullName}
          size="xl"
        />
        <div className={styles.profileInfo}>
          <h2 className={styles.name}>{profile.fullName}</h2>
          <p className={styles.email}>{profile.email}</p>
          {profile.phone && <p className={styles.phone}>{profile.phone}</p>}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setIsEditOpen(true)}>
          {t('editProfile')}
        </Button>
      </section>

      {/* Subscription Status */}
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>{t('subscription')}</h3>
        <div className={styles.subscriptionInfo}>
          <div className={styles.planBadge}>
            {hasActiveSubscription ? (
              <span className={styles.plusBadge}>{tSub('plus')}</span>
            ) : (
              <span className={styles.freeBadge}>{tSub('free')}</span>
            )}
          </div>
          {hasActiveSubscription ? (
            <p className={styles.subscriptionText}>
              Enjoy unlimited follow-ups, priority access, and more.
            </p>
          ) : (
            <>
              <p className={styles.subscriptionText}>
                Upgrade to Furrie Plus for unlimited follow-ups and priority access.
              </p>
              <Button variant="accent" size="sm">
                {tSub('upgrade')}
              </Button>
            </>
          )}
        </div>
      </section>

      {/* Quick Links */}
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Quick Links</h3>
        <nav className={styles.linkList}>
          <Link href="/consultations" className={styles.link}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Consultation History</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
          <Link href="/pets" className={styles.link}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5M14 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.96-1.45-2.344-2.5" />
              <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309" />
            </svg>
            <span>My Pets</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </nav>
      </section>

      {/* Sign Out */}
      <section className={styles.logoutSection}>
        <Button
          variant="ghost"
          onClick={() => setIsLogoutOpen(true)}
          className={styles.logoutButton}
        >
          {tNav('logout')}
        </Button>
      </section>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={t('editProfile')}
      >
        <div className={styles.modalForm}>
          <div className={styles.formGroup}>
            <Input
              label="Full Name"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div className={styles.formGroup}>
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="10-digit mobile number"
              type="tel"
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} disabled={loading}>
              {tCommon('cancel')}
            </Button>
            <Button variant="primary" onClick={handleSaveProfile} loading={loading}>
              {tCommon('save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        title={tNav('logout')}
      >
        <div className={styles.modalForm}>
          <p className={styles.confirmText}>Are you sure you want to sign out?</p>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setIsLogoutOpen(false)} disabled={loading}>
              {tCommon('cancel')}
            </Button>
            <Button variant="danger" onClick={handleLogout} loading={loading}>
              {tNav('logout')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
