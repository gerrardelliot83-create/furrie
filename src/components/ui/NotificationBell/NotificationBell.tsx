'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Popover, PopoverTrigger, PopoverContent } from '../popover';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string> | null;
  is_read: boolean;
  created_at: string | null;
}

const POLL_INTERVAL = 30_000; // 30 seconds

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';

  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Poll for unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?count_only=true');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      // Silent — polling failure is non-critical
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch full notifications when dropdown opens
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch {
      // Silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) {
        fetchNotifications();
      }
    },
    [fetchNotifications]
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true }))
        );
      }
    } catch {
      // Silent
    }
  }, []);

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      // Mark as read
      if (!notification.is_read) {
        try {
          await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: notification.id }),
          });
          setUnreadCount((prev) => Math.max(0, prev - 1));
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id ? { ...n, is_read: true } : n
            )
          );
        } catch {
          // Silent
        }
      }

      // Navigate if consultation link present
      if (notification.data?.consultationId) {
        setIsOpen(false);
        router.push(`/consultations/${notification.data.consultationId}`);
      }
    },
    [router]
  );

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-full border-none bg-transparent text-muted-foreground [-webkit-tap-highlight-color:transparent] transition-[background-color,color] duration-150 hover:bg-muted hover:text-foreground active:scale-95"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <BellIcon />
          {unreadCount > 0 && (
            <span className="absolute right-0.5 top-0.5 min-w-[18px] rounded-full bg-error px-1 text-center text-[11px] font-bold leading-[18px] text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="flex w-80 max-h-[420px] flex-col max-[374px]:w-[calc(100vw-32px)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-base font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <button
              className="rounded-sm border-none bg-transparent px-2 py-1 text-sm font-medium text-furrie-blue transition-colors duration-150 hover:bg-muted"
              onClick={handleMarkAllRead}
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && notifications.length === 0 && (
            <div className="flex items-center justify-center px-4 py-8 text-sm text-muted-foreground/60">
              Loading...
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="flex items-center justify-center px-4 py-8 text-sm text-muted-foreground/60">
              No notifications
            </div>
          )}

          {notifications.slice(0, 10).map((notification) => (
            <button
              key={notification.id}
              className={`flex w-full items-start gap-3 border-b border-border/50 bg-transparent px-4 py-3 text-left transition-colors duration-150 last:border-b-0 hover:bg-muted/50 ${
                !notification.is_read ? 'bg-info-light hover:bg-[#cfe0f8]' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2 text-sm font-semibold leading-tight text-foreground">
                  {!notification.is_read && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-furrie-blue" />
                  )}
                  {notification.title}
                </span>
                <span className="line-clamp-2 text-xs leading-normal text-muted-foreground">
                  {notification.body.length > 80
                    ? `${notification.body.slice(0, 80)}...`
                    : notification.body}
                </span>
              </div>
              <span className="shrink-0 pt-0.5 text-[11px] whitespace-nowrap text-muted-foreground/50">
                {formatRelativeTime(notification.created_at)}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BellIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
