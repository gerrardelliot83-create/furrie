'use client';

import { useState, type FormEvent } from 'react';
import styles from './page.module.css';

export default function AdminSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!currentPassword) {
      setMessage({ type: 'error', text: 'Enter your current password' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change', currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to change password' });
      } else {
        setMessage({ type: 'success', text: 'Password changed successfully' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Settings</h1>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Change Password</h2>
        <p className={styles.sectionDesc}>
          Update your admin account password. You will remain logged in after changing.
          Forgot your current password? Ask another admin to send you a set-password link.
        </p>

        <form onSubmit={handlePasswordChange} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="currentPassword" className={styles.label}>
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              className={styles.input}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="newPassword" className={styles.label}>
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              className={styles.input}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword" className={styles.label}>
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={styles.input}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {message && (
            <div
              className={`${styles.message} ${
                message.type === 'success' ? styles.messageSuccess : styles.messageError
              }`}
            >
              {message.text}
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
