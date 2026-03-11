'use client';

import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import styles from './DetailPanel.module.css';

export interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'default' | 'maximized';
  onToggleSize?: () => void;
  headerActions?: ReactNode;
}

export function DetailPanel({
  isOpen,
  onClose,
  title,
  children,
  size = 'default',
  onToggleSize,
  headerActions,
}: DetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect -- Standard mounted pattern to avoid hydration mismatch
  }, []);

  // Track desktop breakpoint for min/max button visibility
  useEffect(() => {
    if (!mounted) return;

    const mql = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mql.matches); // eslint-disable-line react-hooks/set-state-in-effect -- Need initial sync

    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [mounted]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus trap and body scroll lock
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';

      setTimeout(() => {
        panelRef.current?.focus();
      }, 0);
    } else {
      document.body.style.overflow = '';

      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen || !mounted) return null;

  const panelContent = (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div
        ref={panelRef}
        className={cn(
          styles.panel,
          size === 'maximized' && isDesktop && styles.panelMaximized
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'detail-panel-title' : undefined}
        tabIndex={-1}
      >
        {/* Panel Header */}
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderLeft}>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close panel"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6L18 18" />
              </svg>
            </button>
            {title && (
              <h2 id="detail-panel-title" className={styles.panelTitle}>
                {title}
              </h2>
            )}
          </div>
          <div className={styles.panelHeaderRight}>
            {headerActions}
            {isDesktop && onToggleSize && (
              <button
                type="button"
                className={styles.sizeToggle}
                onClick={onToggleSize}
                aria-label={size === 'maximized' ? 'Minimize panel' : 'Maximize panel'}
              >
                {size === 'maximized' ? (
                  // Minimize icon (shrink)
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 14 10 14 10 20" />
                    <polyline points="20 10 14 10 14 4" />
                    <line x1="14" y1="10" x2="21" y2="3" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                ) : (
                  // Maximize icon (expand)
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Panel Body — scrollable content */}
        <div className={styles.panelBody}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(panelContent, document.body);
}
