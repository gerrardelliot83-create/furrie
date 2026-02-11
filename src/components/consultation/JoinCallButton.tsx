'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import styles from './JoinCallButton.module.css';

interface JoinCallButtonProps {
  consultationId: string;
  scheduledAt: string;
  status: string;
  userRole: 'customer' | 'vet';
}

export function JoinCallButton({
  consultationId,
  scheduledAt,
  status,
  userRole,
}: JoinCallButtonProps) {
  const [canJoin, setCanJoin] = useState(false);
  const [timeUntilJoin, setTimeUntilJoin] = useState('');

  useEffect(() => {
    const checkJoinWindow = () => {
      const now = new Date();
      const scheduled = new Date(scheduledAt);

      // Vet can join anytime after booking, customer 5 min before scheduled time
      const joinWindowStart =
        userRole === 'vet'
          ? new Date(0) // Vet can always join
          : new Date(scheduled.getTime() - 5 * 60 * 1000); // Customer: 5 min before

      const joinWindowEnd = new Date(scheduled.getTime() + 45 * 60 * 1000); // 45 min after

      if (now >= joinWindowStart && now <= joinWindowEnd) {
        setCanJoin(true);
        setTimeUntilJoin('');
      } else if (now < joinWindowStart) {
        setCanJoin(false);
        const diffMs = joinWindowStart.getTime() - now.getTime();
        const diffMins = Math.ceil(diffMs / 60000);

        if (diffMins > 60) {
          const hours = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          setTimeUntilJoin(
            `You can join in ${hours}h ${mins}m`
          );
        } else {
          setTimeUntilJoin(
            `You can join in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`
          );
        }
      } else {
        setCanJoin(false);
        setTimeUntilJoin('This consultation has expired');
      }
    };

    checkJoinWindow();
    const interval = setInterval(checkJoinWindow, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [scheduledAt, userRole]);

  const roomPath = `/consultations/${consultationId}/room`;

  // Active call - show rejoin button
  if (status === 'active') {
    return (
      <div className={styles.container}>
        <div className={styles.statusIndicator}>
          <span className={styles.liveIndicator} />
          Call in progress
        </div>
        <Link href={roomPath}>
          <Button variant="primary" fullWidth>
            Rejoin Call
          </Button>
        </Link>
      </div>
    );
  }

  // Scheduled - show join button with time check
  return (
    <div className={styles.container}>
      {canJoin ? (
        <>
          <p className={styles.readyText}>Your consultation is ready</p>
          <Link href={roomPath}>
            <Button variant="primary" fullWidth>
              Join Call
            </Button>
          </Link>
        </>
      ) : (
        <>
          <Button variant="secondary" fullWidth disabled>
            Join Call
          </Button>
          {timeUntilJoin && (
            <p className={styles.countdown}>{timeUntilJoin}</p>
          )}
        </>
      )}
    </div>
  );
}
