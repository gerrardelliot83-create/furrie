'use client';

import { type ReactNode, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useVetNotifications } from '@/hooks/useVetNotifications';
import { IncomingCallAlert } from '@/components/vet/IncomingCallAlert';
import styles from './VetLayout.module.css';

interface VetLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/schedule', label: 'Schedule', icon: ScheduleIcon },
  { href: '/consultations', label: 'Consultations', icon: ConsultationsIcon },
];

export function VetLayout({ children }: VetLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [vetId, setVetId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  // CRITICAL: Mark mounted first, synchronously safe
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch vet ID only after mount (browser-only)
  useEffect(() => {
    if (!isMounted) return;

    const fetchVetId = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setVetId(user.id);
      }
    };

    fetchVetId();
  }, [isMounted]);

  // Request notification permission only after mount (browser-only)
  useEffect(() => {
    if (!isMounted) return;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          console.log('Notification permission:', permission);
        });
      }
    }
  }, [isMounted]);

  // Unlock AudioContext on first user interaction
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const unlockAudio = async () => {
      if (window.__furrie_audio_unlocked) return;

      try {
        const AudioContextClass = window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        if (!window.__furrie_audio_context) {
          window.__furrie_audio_context = new AudioContextClass();
        }

        if (window.__furrie_audio_context.state === 'suspended') {
          await window.__furrie_audio_context.resume();
        }

        window.__furrie_audio_unlocked = true;
        console.log('AudioContext unlocked via user interaction');

        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      } catch (error) {
        console.warn('Failed to unlock AudioContext:', error);
      }
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('keydown', unlockAudio);

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Subscribe to vet notifications
  const { incomingNotification, markAsRead, dismissNotification } = useVetNotifications(vetId);

  // Handle accepting a consultation
  const handleAcceptConsultation = useCallback(async () => {
    if (!incomingNotification || isAccepting) return;

    setIsAccepting(true);

    try {
      // Call server-side acceptance API
      const response = await fetch(
        `/api/consultations/${incomingNotification.data.consultationId}/accept`,
        { method: 'POST' }
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (data.code === 'REASSIGNED' || data.code === 'INVALID_STATUS') {
          // Consultation was reassigned to another vet
          console.warn('Consultation no longer available:', data);
          dismissNotification();
          setIsAccepting(false);
          return;
        }
        throw new Error(data.error || 'Failed to accept');
      }

      // Success - mark notification as read
      await markAsRead(incomingNotification.id);

      // Navigate to room
      router.push(`/consultations/${incomingNotification.data.consultationId}/room`);
    } catch (error) {
      console.error('Failed to accept consultation:', error);
      setIsAccepting(false);
      // Could show error toast here
    }
  }, [incomingNotification, isAccepting, markAsRead, router, dismissNotification]);

  // Handle timeout (vet didn't respond in time)
  const handleTimeout = useCallback(() => {
    if (incomingNotification) {
      // Mark as read (the system will reassign to another vet)
      markAsRead(incomingNotification.id);
    }
    dismissNotification();
  }, [incomingNotification, markAsRead, dismissNotification]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.logo}>
            Furrie
          </Link>
          <span className={styles.portalLabel}>Vet Portal</span>
        </div>
        <nav className={styles.sidebarNav}>
          {navItems.map((item) => {
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
        <div className={styles.sidebarFooter}>
          <div className={styles.statusIndicator}>
            <span className={styles.statusDot} />
            <span>Available</span>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={styles.logoutButton}
          >
            <LogoutIcon />
            <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <header className={styles.topBar}>
          <h1 className={styles.pageTitle}>Vet Dashboard</h1>
        </header>
        <div className={styles.content}>{children}</div>
      </main>

      {/* Incoming Consultation Alert - Full screen overlay */}
      {/* CRITICAL: Triple guard for client-only content to prevent React hydration mismatch (Error #418) */}
      {isMounted && vetId && incomingNotification && (
        <IncomingCallAlert
          consultationId={incomingNotification.data.consultationId}
          customerName={incomingNotification.data.customerName || 'Pet Parent'}
          petName={incomingNotification.data.petName}
          petSpecies={incomingNotification.data.petSpecies}
          petBreed={incomingNotification.data.petBreed}
          concern={incomingNotification.body}
          symptoms={incomingNotification.data.symptoms || []}
          onAccept={handleAcceptConsultation}
          onTimeout={handleTimeout}
          timeoutSeconds={30}
          isAccepting={isAccepting}
        />
      )}
    </div>
  );
}

function DashboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function ScheduleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ConsultationsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
