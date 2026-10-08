'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { joinWindowState } from '@/lib/scheduling/joinWindow';
import styles from './JoinCallButton.module.css';

interface JoinCallButtonProps {
  consultationId: string;
  scheduledAt: string;
  status: string;
  /** Both roles share the join API's window (lib/scheduling/joinWindow). */
  userRole: 'customer' | 'vet';
}

export function JoinCallButton({
  consultationId,
  scheduledAt,
  status,
}: JoinCallButtonProps) {
  const [canJoin, setCanJoin] = useState(false);
  const [timeUntilJoin, setTimeUntilJoin] = useState('');

  useEffect(() => {
    const checkJoinWindow = () => {
      // The same window the join API enforces, for the vet too (it used to
      // show the vet a Join button the server then refused).
      const joinWindow = joinWindowState(scheduledAt, Date.now());

      if (joinWindow.phase === 'open') {
        setCanJoin(true);
        setTimeUntilJoin('');
      } else if (joinWindow.phase === 'early') {
        setCanJoin(false);
        const diffMins = Math.ceil(joinWindow.opensInMs / 60000);

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
  }, [scheduledAt]);

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
