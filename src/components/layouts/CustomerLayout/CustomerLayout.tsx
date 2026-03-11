'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/ui/NotificationBell/NotificationBell';
import styles from './CustomerLayout.module.css';

interface CustomerLayoutProps {
  children: ReactNode;
}

// Desktop sidebar shows all nav items including Care Plans
const sidebarItems = [
  { href: '/dashboard', label: 'Home', icon: HomeIcon },
  { href: '/pets', label: 'My Pets', icon: PetsIcon },
  { href: '/connect', label: 'Connect', icon: ConnectIcon },
  { href: '/consultations', label: 'Consultations', icon: HistoryIcon },
  { href: '/care-plans', label: 'Care Plans', icon: CarePlansIcon },
];

// Mobile bottom nav: left pair and right pair (center is Connect)
const mobileNavLeft = [
  { href: '/dashboard', label: 'Home', icon: HomeIcon },
  { href: '/pets', label: 'My Pets', icon: PetsIcon },
];
const mobileNavRight = [
  { href: '/consultations', label: 'Consults', icon: HistoryIcon },
  { href: '/care-plans', label: 'Care Plans', icon: CarePlansIcon },
];

export function CustomerLayout({ children }: CustomerLayoutProps) {
  const pathname = usePathname();

  return (
    <div className={styles.layout}>
      {/* Mobile Header - Logo + Notification Bell + Profile */}
      <header className={styles.mobileHeader}>
        <Link href="/dashboard" className={styles.mobileLogoLink}>
          <Image
            src="/assets/logo/furrie-logo-dark-blue.png"
            alt="Furrie"
            width={240}
            height={75}
            className={styles.logoImage}
            priority
          />
        </Link>
        <div className={styles.mobileHeaderRight}>
          <NotificationBell />
          <Link href="/profile" className={styles.mobileProfileButton} aria-label="Profile">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="5" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Sidebar - visible on desktop only (768px+), controlled by CSS */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.logoLink}>
            <Image
              src="/assets/logo/furrie-logo-dark-blue.png"
              alt="Furrie"
              width={240}
              height={75}
              className={styles.logoImage}
            />
          </Link>
        </div>
        <nav className={styles.sidebarNav}>
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(styles.sidebarLink, isActive && styles.sidebarLinkActive)}
              >
                <Icon />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <Link href="/profile" className={styles.sidebarFooter}>
          <div className={styles.profileAvatar}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="5" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
          </div>
          <span className={styles.profileName}>Profile</span>
        </Link>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Desktop Top Bar */}
        <div className={styles.topBar}>
          <NotificationBell />
        </div>
        <div className={styles.content}>{children}</div>
      </main>

      {/* Mobile Bottom Navigation — notched center design */}
      <nav className={styles.bottomNav}>
        {/* Left pair: Home, My Pets */}
        <div className={styles.navSide}>
          {mobileNavLeft.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(styles.navItem, isActive && styles.navItemActive)}
              >
                {isActive && <span className={styles.navIndicator} />}
                <Icon />
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Center: notched Connect button */}
        <div className={styles.navCenter}>
          <Link
            href="/connect"
            className={cn(
              styles.connectButton,
              (pathname === '/connect' || pathname.startsWith('/connect/')) && styles.connectButtonActive
            )}
            aria-label="Connect with a vet"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </Link>
        </div>

        {/* Right pair: Consultations, Care Plans */}
        <div className={styles.navSide}>
          {mobileNavRight.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(styles.navItem, isActive && styles.navItemActive)}
              >
                {isActive && <span className={styles.navIndicator} />}
                <Icon />
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// Simple icon components - NO emojis
function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function PetsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <circle cx="6" cy="8" r="2" />
      <circle cx="18" cy="8" r="2" />
      <circle cx="6" cy="16" r="2" />
      <circle cx="18" cy="16" r="2" />
    </svg>
  );
}

function ConnectIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CarePlansIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  );
}

