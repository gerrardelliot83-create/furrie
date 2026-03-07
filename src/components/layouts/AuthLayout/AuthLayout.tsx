import { type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
            <Image
              src="/assets/logo/furrie-logo-dark-blue.png"
              alt="Furrie"
              width={240}
              height={75}
              className={styles.logoImage}
              priority
            />
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
