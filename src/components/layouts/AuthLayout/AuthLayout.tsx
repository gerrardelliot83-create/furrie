import { type ReactNode } from 'react';
import Link from 'next/link';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/" className={styles.logo}>
            Furrie
          </Link>
          <p className={styles.tagline}>Veterinary care, when you need it</p>
        </header>
        <main className={styles.main}>{children}</main>
        <footer className={styles.footer}>
          <p className={styles.footerText}>
            By continuing, you agree to our{' '}
            <Link href="/terms" className={styles.footerLink}>
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className={styles.footerLink}>
              Privacy Policy
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
